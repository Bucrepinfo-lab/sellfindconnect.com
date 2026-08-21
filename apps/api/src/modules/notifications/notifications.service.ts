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
  type NotificationDeliveryPlan,
  type NotificationDestination,
  type NotificationPreference,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CreateNotificationPlanDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { createDefaultNotificationAdapters } from './notification-adapters';
import { NotificationDispatchService } from './notification-dispatch.service';

export type NotificationChannelStatus = {
  channel: NotificationChannel;
  status: 'QUEUED' | 'SUPPRESSED' | 'SENT' | 'FAILED';
  reason?: string;
  provider?: string;
  providerReference?: string;
};

export type NotificationDeliveryAttemptRecord = {
  id: string;
  channel: NotificationChannel;
  status: 'SENT' | 'FAILED' | 'SUPPRESSED';
  provider?: string;
  providerReference?: string;
  failureReason?: string;
  attemptedAt: string;
};

export type NotificationOutboxRecord = {
  id: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  destination?: NotificationDestination;
  plan: NotificationDeliveryPlan;
  channelStatuses: NotificationChannelStatus[];
  deliveryAttempts: NotificationDeliveryAttemptRecord[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class NotificationsService {
  private readonly preferences = new Map<string, NotificationPreference[]>();
  private readonly outbox = new Map<string, NotificationOutboxRecord>();
  private readonly dispatch: NotificationDispatchService;

  constructor(
    @Optional()
    @Inject(NotificationAdapterRegistry)
    registry?: NotificationAdapterRegistry,
    @Optional()
    dispatch?: NotificationDispatchService,
  ) {
    const adapters = registry ?? createDefaultNotificationAdapters();
    this.dispatch = dispatch ?? new NotificationDispatchService(adapters);
  }

  getPreferences(tenantId: string): NotificationPreference[] {
    return this.preferences.get(tenantId) ?? defaultNotificationPreferences;
  }

  availableAdapters(): NotificationChannel[] {
    return this.dispatch.availableChannels();
  }

  updatePreferences(tenantId: string, input: UpdateNotificationPreferencesDto) {
    this.assertSafe(input, 'Notification preferences contain blocked content.');

    const normalized = input.preferences.map((preference) => ({ ...preference }));
    this.preferences.set(tenantId, normalized);

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
    const preferences = this.getPreferences(tenantId);
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

    this.outbox.set(this.key(tenantId, record.id), record);
    return this.dispatchRecord(record);
  }

  listOutbox(tenantId: string): NotificationOutboxRecord[] {
    return Array.from(this.outbox.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async dispatchOutbox(tenantId: string, outboxId: string) {
    const record = this.outbox.get(this.key(tenantId, outboxId));
    if (!record) {
      throw new UnprocessableEntityException('Notification outbox record was not found.');
    }

    return this.dispatchRecord(record);
  }

  async runAllDispatch(input: { tenantId?: string; limit?: number } = {}) {
    const limit = input.limit ?? 100;
    const candidates = Array.from(this.outbox.values())
      .filter((record) => !input.tenantId || record.tenantId === input.tenantId)
      .filter((record) =>
        record.channelStatuses.some((item) => shouldRetryNotificationChannel(item.status)),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);

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
    this.outbox.set(this.key(record.tenantId, record.id), record);
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

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
