import { describe, expect, it } from 'vitest';

import {
  buildNotificationDeliveryPlan,
  defaultFallbackChannels,
  defaultNotificationPreferences,
  smsAllowedFor,
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

describe('SMS is transactional only (owner 14/11/26)', () => {
  const smsOn = defaultNotificationPreferences.map((p) =>
    p.channel === 'SMS' ? { ...p, enabled: true, consentState: 'GRANTED' as const } : p,
  );
  const plan = (eventType: Parameters<typeof buildNotificationDeliveryPlan>[0]['eventType']) =>
    buildNotificationDeliveryPlan({
      eventType,
      severity: 'CRITICAL',
      title: 't',
      message: 'm',
      recipient: { countryCode: 'KE', locale: 'en-KE', timezone: 'Africa/Nairobi', preferences: smsOn },
    });

  it('a security alert may go by SMS when the person agreed', () => {
    expect(smsAllowedFor('SECURITY_ALERT')).toBe(true);
    expect(plan('SECURITY_ALERT').selectedChannels).toContain('SMS');
  });

  it('an opportunity match never goes by SMS, even with consent', () => {
    expect(smsAllowedFor('SOURCE_FINDER_OPPORTUNITY')).toBe(false);
    const p = plan('SOURCE_FINDER_OPPORTUNITY');
    expect(p.selectedChannels).not.toContain('SMS');
    expect(p.selectedChannels).toContain('IN_APP');
    expect(p.suppressedChannels).toContainEqual({ channel: 'SMS', reason: 'SMS is for transactional messages only.' });
  });
});
