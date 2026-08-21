import { describe, expect, it } from 'vitest';

import { InMemoryNotificationsRepository } from './in-memory-notifications.repository';
import type { NotificationOutboxRecord } from './notifications.records';

const tenantId = '11111111-1111-4111-8111-111111111111';

function outbox(overrides: Partial<NotificationOutboxRecord> = {}): NotificationOutboxRecord {
  return {
    id: 'outbox-1',
    tenantId,
    destination: { email: 'owner@sellfindconnect.com' },
    plan: {
      eventType: 'CONVERSATION_MESSAGE',
      severity: 'HIGH',
      selectedChannels: ['IN_APP', 'EMAIL'],
      suppressedChannels: [],
      requiresImmediateAttention: false,
      title: 'New message',
      message: 'A matched inquiry has a new reply.',
    },
    channelStatuses: [
      { channel: 'IN_APP', status: 'SENT' },
      { channel: 'EMAIL', status: 'FAILED', reason: 'No email destination is configured.' },
    ],
    deliveryAttempts: [],
    createdAt: '2026-08-21T20:00:00.000Z',
    updatedAt: '2026-08-21T20:00:00.000Z',
    ...overrides,
  };
}

describe('InMemoryNotificationsRepository', () => {
  it('clones preferences and outbox records so callers cannot mutate stored state', () => {
    const repository = new InMemoryNotificationsRepository();
    repository.replacePreferences(tenantId, [
      { channel: 'IN_APP', enabled: true, consentState: 'NOT_REQUIRED' },
    ]);
    repository.saveOutbox(outbox());

    const preferences = repository.getPreferences(tenantId);
    preferences[0]!.enabled = false;
    const stored = repository.findOutbox(tenantId, 'outbox-1');
    stored!.channelStatuses[1]!.status = 'SENT';

    expect(repository.getPreferences(tenantId)[0]?.enabled).toBe(true);
    expect(repository.findOutbox(tenantId, 'outbox-1')?.channelStatuses[1]?.status).toBe('FAILED');
  });

  it('lists retryable outbox records in created order and isolates tenants', () => {
    const repository = new InMemoryNotificationsRepository();
    repository.saveOutbox(
      outbox({
        id: 'later',
        createdAt: '2026-08-21T21:00:00.000Z',
        channelStatuses: [{ channel: 'EMAIL', status: 'FAILED' }],
      }),
    );
    repository.saveOutbox(
      outbox({
        id: 'earlier',
        createdAt: '2026-08-21T19:00:00.000Z',
        channelStatuses: [{ channel: 'EMAIL', status: 'QUEUED' }],
      }),
    );
    repository.saveOutbox(
      outbox({
        id: 'sent',
        channelStatuses: [{ channel: 'IN_APP', status: 'SENT' }],
      }),
    );
    repository.saveOutbox(
      outbox({
        id: 'other-tenant',
        tenantId: '22222222-2222-4222-8222-222222222222',
        channelStatuses: [{ channel: 'EMAIL', status: 'FAILED' }],
      }),
    );

    expect(repository.listRetryableOutbox({ tenantId }).map((record) => record.id)).toEqual([
      'earlier',
      'later',
    ]);
    expect(repository.listRetryableOutbox({ limit: 1 }).map((record) => record.id)).toEqual([
      'earlier',
    ]);
  });
});
