import { describe, expect, it } from 'vitest';

import {
  assertConversationAttachmentsSendable,
  buildSavedReplySuggestions,
  calculateConversationSlaDecision,
  countUnreadMessagesForRole,
  describeMessageDeliveryStatus,
  isConversationTypingActive,
  markMessageDelivered,
  markMessageRead,
  recordConversationTyping,
  shouldCountAsTenantResponse,
  shouldCreateInboundResponseSla,
  toConversationAttachment,
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

describe('conversation receipts and typing', () => {
  const message = {
    id: 'msg-1',
    conversationId: 'convo-1',
    tenantId: 'tenant-1',
    senderRole: 'REQUESTER' as const,
    body: 'Please confirm weekly supply.',
    deliveryStatus: 'SENT' as const,
    createdAt: '2026-08-21T12:00:00.000Z',
  };

  it('advances a sent message to delivered then read by the other party', () => {
    const delivered = markMessageDelivered(message, '2026-08-21T12:00:02.000Z');
    const read = markMessageRead(delivered, 'TENANT_AGENT', '2026-08-21T12:00:08.000Z');

    expect(delivered.deliveryStatus).toBe('DELIVERED');
    expect(read.deliveryStatus).toBe('READ');
    expect(read.readByRole).toBe('TENANT_AGENT');
    expect(read.deliveredAt).toBe('2026-08-21T12:00:02.000Z');
  });

  it('rejects self-read receipts and failed-message transitions', () => {
    expect(() => markMessageRead(message, 'REQUESTER', '2026-08-21T12:00:08.000Z')).toThrow(
      /own message/,
    );
    expect(() =>
      markMessageDelivered(
        { ...message, deliveryStatus: 'FAILED' },
        '2026-08-21T12:00:08.000Z',
      ),
    ).toThrow(/failed message/);
  });

  it('records a typing indicator that expires after the presence window', () => {
    const conversation = recordConversationTyping(
      {
        id: 'convo-1',
        tenantId: 'tenant-1',
        sourceRecordId: 'r1',
        sourceName: 'Nairobi Fresh Produce Cooperative',
        sourceRole: 'SUPPLIER',
        inquiryType: 'RFQ',
        status: 'OPEN',
        priority: 'HIGH',
        matchConfidence: 88,
        responseSlaHours: 4,
        openedAt: '2026-08-21T12:00:00.000Z',
        firstResponseDueAt: '2026-08-21T16:00:00.000Z',
        lastInboundMessageAt: '2026-08-21T12:00:00.000Z',
        lastMessageAt: '2026-08-21T12:00:00.000Z',
        createdAt: '2026-08-21T12:00:00.000Z',
        updatedAt: '2026-08-21T12:00:00.000Z',
      },
      'TENANT_AGENT',
      '2026-08-21T12:00:10.000Z',
    );

    expect(conversation.typingRole).toBe('TENANT_AGENT');
    expect(isConversationTypingActive(conversation.typingAt, '2026-08-21T12:00:20.000Z')).toBe(
      true,
    );
    expect(isConversationTypingActive(conversation.typingAt, '2026-08-21T12:00:30.000Z')).toBe(
      false,
    );
  });

  it('counts unread messages from the opposite conversation side only', () => {
    const inbound = markMessageDelivered(message, '2026-08-21T12:00:02.000Z');
    const outbound = {
      ...message,
      id: 'msg-2',
      senderRole: 'TENANT_AGENT' as const,
      body: 'Thank you. Please share delivery coverage.',
    };

    expect(countUnreadMessagesForRole([inbound, outbound], 'TENANT_AGENT')).toBe(1);
    expect(
      countUnreadMessagesForRole(
        [markMessageRead(inbound, 'TENANT_AGENT', '2026-08-21T12:00:08.000Z'), outbound],
        'TENANT_AGENT',
      ),
    ).toBe(0);
    expect(describeMessageDeliveryStatus(inbound.deliveryStatus)).toBe('Delivered');
  });

  it('only allows scanned and moderated attachments on a chat message', () => {
    const passed = toConversationAttachment({
      id: 'media-1',
      kind: 'IMAGE',
      fileName: 'quote.jpg',
      mimeType: 'image/jpeg',
      moderationStatus: 'PASSED',
      sourceUrl: 'https://cdn.example.test/quote.jpg',
    });

    expect(assertConversationAttachmentsSendable([passed])).toEqual([passed]);
    expect(() =>
      assertConversationAttachmentsSendable([
        { ...passed, moderationStatus: 'PENDING' },
      ]),
    ).toThrow(/malware scan/);
    expect(() =>
      assertConversationAttachmentsSendable([{ ...passed, moderationStatus: 'BLOCKED' }]),
    ).toThrow(/Blocked attachments/);
  });
});
