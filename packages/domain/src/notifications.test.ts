import { describe, expect, it } from 'vitest';

import {
  buildNotificationDeliveryPlan,
  defaultFallbackChannels,
  defaultNotificationPreferences,
} from './notifications';

describe('notification delivery policy', () => {
  it('always includes in-app delivery for an allowed notification', () => {
    const plan = buildNotificationDeliveryPlan({
      eventType: 'CONVERSATION_MESSAGE',
      severity: 'LOW',
      title: 'New message',
      message: 'A new message arrived.',
      recipient: {
        countryCode: 'KE',
        locale: 'en-KE',
        timezone: 'Africa/Nairobi',
        preferences: defaultNotificationPreferences,
      },
    });

    expect(plan.selectedChannels).toContain('IN_APP');
    expect(plan.selectedChannels).toContain('EMAIL');
  });

  it('suppresses channels that still require consent', () => {
    const plan = buildNotificationDeliveryPlan({
      eventType: 'CONVERSATION_SLA_BREACHED',
      severity: 'CRITICAL',
      title: 'SLA breached',
      message: 'A conversation response SLA was breached.',
      recipient: {
        countryCode: 'KE',
        locale: 'en-KE',
        timezone: 'Africa/Nairobi',
        preferences: defaultNotificationPreferences,
      },
    });

    expect(plan.selectedChannels).toEqual(['IN_APP', 'EMAIL']);
    expect(plan.suppressedChannels.map((item) => item.channel)).toEqual(['PUSH', 'SMS', 'WHATSAPP']);
    expect(plan.requiresImmediateAttention).toBe(true);
  });

  it('uses broader fallback channels for higher severity notifications', () => {
    expect(defaultFallbackChannels('LOW')).toEqual(['EMAIL']);
    expect(defaultFallbackChannels('HIGH')).toEqual(['EMAIL', 'PUSH', 'SMS']);
    expect(defaultFallbackChannels('CRITICAL')).toEqual(['EMAIL', 'PUSH', 'SMS', 'WHATSAPP']);
  });
});
