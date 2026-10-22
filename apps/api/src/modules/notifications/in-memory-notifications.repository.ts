import { Injectable } from '@nestjs/common';
import { shouldRetryNotificationChannel, type NotificationPreference } from '@telpen/domain';

import type { NotificationOutboxRecord } from './notifications.records';
import type { NotificationsRepository } from './notifications.repository';

@Injectable()
export class InMemoryNotificationsRepository implements NotificationsRepository {
  private readonly preferences = new Map<string, NotificationPreference[]>();
  private readonly outbox = new Map<string, NotificationOutboxRecord>();

  getPreferences(tenantId: string): NotificationPreference[] {
    return (this.preferences.get(tenantId) ?? []).map((preference) => ({ ...preference }));
  }

  replacePreferences(tenantId: string, preferences: NotificationPreference[]): void {
    this.preferences.set(
      tenantId,
      preferences.map((preference) => ({ ...preference })),
    );
  }

  saveOutbox(record: NotificationOutboxRecord): void {
    this.outbox.set(this.key(record.tenantId, record.id), this.clone(record));
  }

  updateOutbox(record: NotificationOutboxRecord): void {
    this.outbox.set(this.key(record.tenantId, record.id), this.clone(record));
  }

  findOutbox(tenantId: string, id: string): NotificationOutboxRecord | undefined {
    const record = this.outbox.get(this.key(tenantId, id));
    return record ? this.clone(record) : undefined;
  }

  listOutbox(tenantId: string): NotificationOutboxRecord[] {
    return Array.from(this.outbox.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((record) => this.clone(record));
  }

  listRetryableOutbox(input: { tenantId?: string; limit?: number } = {}): NotificationOutboxRecord[] {
    const limit = input.limit ?? 100;
    return Array.from(this.outbox.values())
      .filter((record) => !input.tenantId || record.tenantId === input.tenantId)
      .filter((record) =>
        record.channelStatuses.some((item) => shouldRetryNotificationChannel(item.status)),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit)
      .map((record) => this.clone(record));
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private clone(record: NotificationOutboxRecord): NotificationOutboxRecord {
    return {
      ...record,
      destination: record.destination ? { ...record.destination } : undefined,
      plan: {
        ...record.plan,
        selectedChannels: [...record.plan.selectedChannels],
        suppressedChannels: record.plan.suppressedChannels.map((item) => ({ ...item })),
      },
      channelStatuses: record.channelStatuses.map((item) => ({ ...item })),
      deliveryAttempts: record.deliveryAttempts.map((item) => ({ ...item })),
    };
  }
}
