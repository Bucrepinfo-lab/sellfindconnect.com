import { describe, expect, it } from 'vitest';

import {
  buildSavedReplySuggestions,
  calculateConversationSlaDecision,
  shouldCountAsTenantResponse,
  shouldCreateInboundResponseSla,
} from './messaging';

describe('conversation messaging helpers', () => {
  it('marks a high-priority unanswered conversation as due soon inside the alert window', () => {
    const decision = calculateConversationSlaDecision(
      {
        openedAt: '2026-06-17T08:00:00.000Z',
        lastInboundMessageAt: '2026-06-17T08:00:00.000Z',
        responseSlaHours: 4,
        priority: 'HIGH',
        status: 'OPEN',
      },
      '2026-06-17T11:15:00.000Z',
    );

    expect(decision.state).toBe('DUE_SOON');
    expect(decision.alertType).toBe('SLA_DUE_SOON');
    expect(decision.minutesUntilDue).toBe(45);
  });

  it('marks an unanswered conversation as breached after the due time', () => {
    const decision = calculateConversationSlaDecision(
      {
        openedAt: '2026-06-17T08:00:00.000Z',
        lastInboundMessageAt: '2026-06-17T08:00:00.000Z',
        responseSlaHours: 4,
        priority: 'HIGH',
        status: 'OPEN',
      },
      '2026-06-17T13:01:00.000Z',
    );

    expect(decision.state).toBe('BREACHED');
    expect(decision.alertType).toBe('SLA_BREACHED');
  });

  it('pauses SLA alerts for resolved conversations', () => {
    const decision = calculateConversationSlaDecision(
      {
        openedAt: '2026-06-17T08:00:00.000Z',
        lastInboundMessageAt: '2026-06-17T08:00:00.000Z',
        firstResponseAt: '2026-06-17T08:30:00.000Z',
        responseSlaHours: 4,
        priority: 'HIGH',
        status: 'RESOLVED',
      },
      '2026-06-18T08:00:00.000Z',
    );

    expect(decision.state).toBe('PAUSED');
    expect(decision.alertType).toBeUndefined();
  });

  it('builds reusable saved replies with opportunity context', () => {
    const replies = buildSavedReplySuggestions({
      sourceName: 'Nairobi Fresh Produce Cooperative',
      inquiryType: 'RFQ',
      quantity: '100 crates per week',
      urgency: 'This week',
    });

    expect(replies).toHaveLength(4);
    expect(replies[0]?.body).toContain('100 crates per week');
    expect(replies.some((reply) => reply.id === 'reply-compliance')).toBe(true);
  });

  it('classifies requester messages as inbound and tenant agent messages as responses', () => {
    expect(shouldCreateInboundResponseSla('REQUESTER')).toBe(true);
    expect(shouldCreateInboundResponseSla('TENANT_AGENT')).toBe(false);
    expect(shouldCountAsTenantResponse('TENANT_AGENT')).toBe(true);
    expect(shouldCountAsTenantResponse('REQUESTER')).toBe(false);
  });
});
