import { describe, expect, it } from 'vitest';

import type { AuthService } from '../auth/auth.service';
import { createDefaultNotificationAdapters } from './notification-adapters';
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
    expect(result.adapters).toEqual(['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP']);
    expect(service.getPreferences(tenantId)[1]?.enabled).toBe(false);
  });

  it('plans and queues consent-aware delivery attempts', async () => {
    const service = new NotificationsService();
    const record = await service.planAndQueue(tenantId, {
      eventType: 'CONVERSATION_SLA_BREACHED',
      severity: 'CRITICAL',
      title: 'SLA breached',
      message: 'A high-priority conversation has missed its response SLA.',
      entityType: 'conversation',
      entityId: 'conversation-123',
    });

    expect(record.plan.selectedChannels).toEqual(['IN_APP', 'EMAIL']);
    expect(record.channelStatuses.some((item) => item.status === 'SUPPRESSED')).toBe(true);
    expect(record.channelStatuses.find((item) => item.channel === 'IN_APP')?.status).toBe('SENT');
    expect(record.channelStatuses.find((item) => item.channel === 'EMAIL')?.status).toBe('FAILED');
    expect(service.listOutbox(tenantId)).toHaveLength(1);
  });

  it('dispatches selected channels through adapters when destinations exist', async () => {
    const service = new NotificationsService();
    const record = await service.planAndQueue(tenantId, {
      eventType: 'CONVERSATION_MESSAGE',
      severity: 'HIGH',
      title: 'New message',
      message: 'A matched inquiry has a new reply.',
      email: 'owner@sellfindconnect.com',
      phone: '+254700000001',
      pushToken: 'fcm-device-token',
    });

    expect(record.channelStatuses.find((item) => item.channel === 'IN_APP')?.provider).toBe('memory');
    expect(record.channelStatuses.find((item) => item.channel === 'EMAIL')?.status).toBe('SENT');
    expect(record.deliveryAttempts.some((item) => item.channel === 'EMAIL' && item.status === 'SENT')).toBe(
      true,
    );
    expect((await service.runAllDispatch({ tenantId })).dispatched).toBe(0);
  });

  it('blocks prohibited notification content before queueing', async () => {
    const service = new NotificationsService();

    await expect(
      service.planAndQueue(tenantId, {
        eventType: 'CONVERSATION_MESSAGE',
        severity: 'HIGH',
        title: 'Blocked',
        message: 'Can you arrange ammunition delivery?',
      }),
    ).rejects.toThrow();
  });

  it('records dispatch audit without storing notification copy', async () => {
    const auditLogs: Array<{ action: string }> = [];
    const service = new NotificationsService(undefined, undefined, {
      recordTenantAudit: async (record) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'recordTenantAudit'> as AuthService);
    const copy = 'A high-priority conversation has missed its response SLA.';
    await service.planAndQueue(tenantId, {
      eventType: 'CONVERSATION_SLA_BREACHED',
      severity: 'CRITICAL',
      title: 'SLA breached',
      message: copy,
      entityType: 'conversation',
      entityId: 'conversation-123',
    });

    expect(auditLogs.map((record) => record.action)).toEqual([
      'NOTIFICATION_PLANNED',
      'NOTIFICATION_DISPATCHED',
    ]);
    expect(JSON.stringify(auditLogs)).not.toContain(copy);
  });
});

describe('notification adapter factory', () => {
  it('uses memory adapters by default and overlays Resend when configured', () => {
    const memory = createDefaultNotificationAdapters({});
    expect(memory.get('EMAIL')?.name).toBe('memory');
    expect(memory.available()).toEqual(['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP']);

    const live = createDefaultNotificationAdapters({
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'alerts@sellfindconnect.com',
    });
    expect(live.get('EMAIL')?.name).toBe('resend');
    expect(live.get('IN_APP')?.name).toBe('memory');
  });
});
