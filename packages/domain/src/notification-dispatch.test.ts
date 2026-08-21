import { describe, expect, it } from 'vitest';

import {
  describeNotificationDispatchAttemptStatus,
  notificationDispatchIdempotencyKey,
  planNotificationDispatchAttempts,
  resolveNotificationDispatchAddress,
  shouldRetryNotificationChannel,
} from './notification-dispatch';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('notification dispatch helpers', () => {
  it('sends in-app to the tenant when no user is supplied and skips incomplete destinations', () => {
    expect(resolveNotificationDispatchAddress('IN_APP', undefined, tenantId)).toEqual({
      to: `tenant:${tenantId}`,
    });
    expect(resolveNotificationDispatchAddress('EMAIL', undefined, tenantId)).toEqual({
      skippedReason: 'No email destination is configured.',
    });
    expect(
      resolveNotificationDispatchAddress('SMS', { phone: '+254700000001' }, tenantId),
    ).toEqual({ to: '+254700000001' });
  });

  it('plans send and skip actions for queued channels', () => {
    const plan = planNotificationDispatchAttempts({
      tenantId,
      selectedChannels: ['IN_APP', 'EMAIL', 'PUSH'],
      destination: { email: 'owner@sellfindconnect.com' },
    });

    expect(plan).toEqual([
      { channel: 'IN_APP', action: 'SEND', to: `tenant:${tenantId}` },
      { channel: 'EMAIL', action: 'SEND', to: 'owner@sellfindconnect.com' },
      { channel: 'PUSH', action: 'SKIP', reason: 'No push token is configured.' },
    ]);
    expect(notificationDispatchIdempotencyKey('outbox-1', 'EMAIL')).toBe('outbox-1:EMAIL');
    expect(shouldRetryNotificationChannel('FAILED')).toBe(true);
    expect(shouldRetryNotificationChannel('SENT')).toBe(false);
    expect(describeNotificationDispatchAttemptStatus('SENT')).toBe('Sent');
  });
});
