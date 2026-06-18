import { describe, expect, it } from 'vitest';

import { NotificationsService } from './notifications.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('NotificationsService', () => {
  it('returns default tenant notification preferences', () => {
    const service = new NotificationsService();

    expect(service.getPreferences(tenantId).map((item) => item.channel)).toEqual([
      'IN_APP',
      'EMAIL',
      'SMS',
      'PUSH',
      'WHATSAPP',
    ]);
  });

  it('updates notification preferences for a tenant', () => {
    const service = new NotificationsService();

    const result = service.updatePreferences(tenantId, {
      preferences: [
        { channel: 'IN_APP', enabled: true, consentState: 'NOT_REQUIRED' },
        { channel: 'EMAIL', enabled: false, consentState: 'DENIED' },
      ],
    });

    expect(result.preferences).toHaveLength(2);
    expect(service.getPreferences(tenantId)[1]?.enabled).toBe(false);
  });

  it('plans and queues consent-aware delivery attempts', () => {
    const service = new NotificationsService();
    const record = service.planAndQueue(tenantId, {
      eventType: 'CONVERSATION_SLA_BREACHED',
      severity: 'CRITICAL',
      title: 'SLA breached',
      message: 'A high-priority conversation has missed its response SLA.',
      entityType: 'conversation',
      entityId: 'conversation-123',
    });

    expect(record.plan.selectedChannels).toEqual(['IN_APP', 'EMAIL']);
    expect(record.channelStatuses.some((item) => item.status === 'SUPPRESSED')).toBe(true);
    expect(service.listOutbox(tenantId)).toHaveLength(1);
  });

  it('blocks prohibited notification content before queueing', () => {
    const service = new NotificationsService();

    expect(() =>
      service.planAndQueue(tenantId, {
        eventType: 'CONVERSATION_MESSAGE',
        severity: 'HIGH',
        title: 'Blocked',
        message: 'Can you arrange ammunition delivery?',
      }),
    ).toThrow();
  });
});
