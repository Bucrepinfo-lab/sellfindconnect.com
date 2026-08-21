import type { NotificationPreference } from '@telpen/domain';

import type { NotificationOutboxRecord } from './notifications.records';

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface NotificationsRepository {
  getPreferences(tenantId: string): RepositoryResult<NotificationPreference[]>;
  replacePreferences(
    tenantId: string,
    preferences: NotificationPreference[],
  ): RepositoryResult<void>;
  saveOutbox(record: NotificationOutboxRecord): RepositoryResult<void>;
  updateOutbox(record: NotificationOutboxRecord): RepositoryResult<void>;
  findOutbox(tenantId: string, id: string): RepositoryResult<NotificationOutboxRecord | undefined>;
  listOutbox(tenantId: string): RepositoryResult<NotificationOutboxRecord[]>;
  listRetryableOutbox(input?: {
    tenantId?: string;
    limit?: number;
  }): RepositoryResult<NotificationOutboxRecord[]>;
}
