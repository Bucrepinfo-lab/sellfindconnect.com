import { Inject, Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  NotificationAdapterRegistry,
  buildNotificationDeliveryPlan,
  defaultNotificationPreferences,
  evaluateSafetyFields,
  getCountry,
  notificationDispatchIdempotencyKey,
  resolveNotificationDispatchAddress,
  shouldRetryNotificationChannel,
  type NotificationChannel,
  type NotificationDestination,
  type NotificationPreference,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CreateNotificationPlanDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { InMemoryNotificationsRepository } from './in-memory-notifications.repository';
import { createDefaultNotificationAdapters } from './notification-adapters';
import { NotificationDispatchService } from './notification-dispatch.service';
import { AuthService } from '../auth/auth.service';
import type {
  NotificationChannelStatus,
  NotificationOutboxRecord,
} from './notifications.records';
import { NOTIFICATIONS_REPOSITORY, type NotificationsRepository } from './notifications.repository';

export type {
  NotificationChannelStatus,
  NotificationDeliveryAttemptRecord,
  NotificationOutboxRecord,
} from './notifications.records';

@Injectable()
export class NotificationsService {
  private readonly dispatch: NotificationDispatchService;
  private readonly auth?: AuthService;
  private readonly repository: NotificationsRepository;

  constructor(
    @Optional()
    @Inject(NotificationAdapterRegistry)
    registry?: NotificationAdapterRegistry,
    @Optional()
    dispatch?: NotificationDispatchService,
    @Optional()
    auth?: AuthService,
    @Optional()
    @Inject(NOTIFICATIONS_REPOSITORY)
    repository?: NotificationsRepository,
  ) {
    const adapters = registry ?? createDefaultNotificationAdapters();
    this.dispatch = dispatch ?? new NotificationDispatchService(adapters);
    this.auth = auth;
    this.repository = repository ?? new InMemoryNotificationsRepository();
  }

  async getPreferences(tenantId: string): Promise<NotificationPreference[]> {
    const stored = await this.repository.getPreferences(tenantId);
    return stored.length > 0 ? stored : defaultNotificationPreferences;
  }

  availableAdapters(): NotificationChannel[] {
    return this.dispatch.availableChannels();
  }

  async updatePreferences(tenantId: string, input: UpdateNotificationPreferencesDto) {
    this.assertSafe(input, 'Notification preferences contain blocked content.');

    const normalized = input.preferences.map((preference) => ({ ...preference }));
    await this.repository.replacePreferences(tenantId, normalized);

    return {
      tenantId,
      preferences: normalized,
      adapters: this.availableAdapters(),
      updatedAt: new Date().toISOString(),
    };
  }

  async planAndQueue(tenantId: string, input: CreateNotificationPlanDto): Promise<NotificationOutboxRecord> {
    this.assertSafe(input, 'Notification content contains blocked content.');

    const country = getCountry('KE');
    if (!country) {
      throw new UnprocessableEntityException('Notification country is not configured.');
    }

    const now = new Date().toISOString();
    const preferences = await this.getPreferences(tenantId);
    const destination = this.destinationFrom(input);
    const plan = buildNotificationDeliveryPlan({
      eventType: input.eventType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      requiredChannels: input.requiredChannels,
      fallbackChannels: input.fallbackChannels,
      recipient: {
        userId: destination.userId,
        countryCode: country.code,
        locale: country.locale,
        timezone: country.timezone,
        preferences,
      },
    });
    const channelStatuses: NotificationChannelStatus[] = [
      ...plan.selectedChannels.map((channel) => ({
        channel,
        status: 'QUEUED' as const,
      })),
      ...plan.suppressedChannels.map((item) => ({
        channel: item.channel,
        status: 'SUPPRESSED' as const,
        reason: item.reason,
      })),
    ];
    const record: NotificationOutboxRecord = {
      id: randomUUID(),
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      destination,
      plan,
      channelStatuses,
      deliveryAttempts: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveOutbox(record);
    const dispatched = await this.dispatchRecord(record);
    await this.auditProduct({
      tenantId,
      actorUserId: input.recipientUserId,
      action: 'NOTIFICATION_PLANNED',
      entityId: dispatched.id,
      metadata: {
        eventType: dispatched.plan.eventType,
        severity: dispatched.plan.severity,
        selectedCount: dispatched.plan.selectedChannels.length,
        suppressedCount: dispatched.plan.suppressedChannels.length,
      },
    });
    await this.auditProduct({
      tenantId,
      actorUserId: input.recipientUserId,
      action: 'NOTIFICATION_DISPATCHED',
      entityId: dispatched.id,
      metadata: {
        sentCount: dispatched.channelStatuses.filter((item) => item.status === 'SENT').length,
        failedCount: dispatched.channelStatuses.filter((item) => item.status === 'FAILED').length,
        adapterCount: this.availableAdapters().length,
      },
    });
    return dispatched;
  }

  async listOutbox(tenantId: string): Promise<NotificationOutboxRecord[]> {
    return this.repository.listOutbox(tenantId);
  }

  async dispatchOutbox(tenantId: string, outboxId: string) {
    const record = await this.repository.findOutbox(tenantId, outboxId);
    if (!record) {
      throw new UnprocessableEntityException('Notification outbox record was not found.');
    }

    return this.dispatchRecord(record);
  }

  async runAllDispatch(input: { tenantId?: string; limit?: number } = {}) {
    const candidates = await this.repository.listRetryableOutbox({
      tenantId: input.tenantId,
      limit: input.limit ?? 100,
    });

    const dispatched = [];
    for (const record of candidates) {
      dispatched.push(await this.dispatchRecord(record));
    }

    return {
      checked: candidates.length,
      dispatched: dispatched.length,
      adapters: this.availableAdapters(),
      records: dispatched,
    };
  }

  private async dispatchRecord(record: NotificationOutboxRecord): Promise<NotificationOutboxRecord> {
    const now = new Date().toISOString();

    for (const status of record.channelStatuses) {
      if (status.status === 'SUPPRESSED' || !shouldRetryNotificationChannel(status.status)) {
        continue;
      }

      const address = resolveNotificationDispatchAddress(
        status.channel,
        record.destination,
        record.tenantId,
      );
      if ('skippedReason' in address) {
        status.status = 'FAILED';
        status.reason = address.skippedReason;
        record.deliveryAttempts.push({
          id: randomUUID(),
          channel: status.channel,
          status: 'FAILED',
          failureReason: address.skippedReason,
          attemptedAt: now,
        });
        continue;
      }

      const result = await this.dispatch.dispatch({
        outboxRecordId: record.id,
        tenantId: record.tenantId,
        userId: record.destination?.userId,
        channel: status.channel,
        to: address.to,
        eventType: record.plan.eventType,
        title: record.plan.title,
        message: record.plan.message,
        idempotencyKey: notificationDispatchIdempotencyKey(record.id, status.channel),
        metadata: {
          entityType: record.entityType,
          entityId: record.entityId,
        },
      });

      const attemptStatus = result.status === 'SENT' ? 'SENT' : 'FAILED';
      status.status = attemptStatus;
      status.provider = result.provider || undefined;
      status.providerReference = result.providerRef || undefined;
      status.reason = result.failureReason;
      record.deliveryAttempts.push({
        id: randomUUID(),
        channel: status.channel,
        status: attemptStatus,
        provider: result.provider || undefined,
        providerReference: result.providerRef || undefined,
        failureReason: result.failureReason,
        attemptedAt: now,
      });
    }

    record.updatedAt = now;
    await this.repository.updateOutbox(record);
    return record;
  }

  private destinationFrom(input: CreateNotificationPlanDto): NotificationDestination {
    return {
      userId: input.recipientUserId?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      pushToken: input.pushToken?.trim() || undefined,
    };
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }

  private async auditProduct(input: {
    tenantId: string;
    actorUserId?: string;
    action: 'NOTIFICATION_PLANNED' | 'NOTIFICATION_DISPATCHED';
    entityId: string;
    metadata?: Record<string, string | number | boolean | null>;
  }) {
    await this.auth?.recordTenantAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'NOTIFICATION',
      entityId: input.entityId,
      metadata: input.metadata,
    });
  }
}
