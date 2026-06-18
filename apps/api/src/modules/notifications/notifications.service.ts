import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  buildNotificationDeliveryPlan,
  defaultNotificationPreferences,
  evaluateSafetyFields,
  getCountry,
  type NotificationChannel,
  type NotificationDeliveryPlan,
  type NotificationPreference,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CreateNotificationPlanDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';

type NotificationOutboxRecord = {
  id: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  plan: NotificationDeliveryPlan;
  channelStatuses: {
    channel: NotificationChannel;
    status: 'QUEUED' | 'SUPPRESSED';
    reason?: string;
  }[];
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  private readonly preferences = new Map<string, NotificationPreference[]>();
  private readonly outbox = new Map<string, NotificationOutboxRecord>();

  getPreferences(tenantId: string): NotificationPreference[] {
    return this.preferences.get(tenantId) ?? defaultNotificationPreferences;
  }

  updatePreferences(tenantId: string, input: UpdateNotificationPreferencesDto) {
    this.assertSafe(input, 'Notification preferences contain blocked content.');

    const normalized = input.preferences.map((preference) => ({ ...preference }));
    this.preferences.set(tenantId, normalized);

    return {
      tenantId,
      preferences: normalized,
      updatedAt: new Date().toISOString(),
    };
  }

  planAndQueue(tenantId: string, input: CreateNotificationPlanDto): NotificationOutboxRecord {
    this.assertSafe(input, 'Notification content contains blocked content.');

    const country = getCountry('KE');
    if (!country) {
      throw new UnprocessableEntityException('Notification country is not configured.');
    }

    const now = new Date().toISOString();
    const preferences = this.getPreferences(tenantId);
    const plan = buildNotificationDeliveryPlan({
      eventType: input.eventType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      requiredChannels: input.requiredChannels,
      fallbackChannels: input.fallbackChannels,
      recipient: {
        countryCode: country.code,
        locale: country.locale,
        timezone: country.timezone,
        preferences,
      },
    });
    const channelStatuses = [
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
      plan,
      channelStatuses,
      createdAt: now,
    };

    this.outbox.set(this.key(tenantId, record.id), record);
    return record;
  }

  listOutbox(tenantId: string): NotificationOutboxRecord[] {
    return Array.from(this.outbox.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
