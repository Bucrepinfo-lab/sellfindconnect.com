import { describe, expect, it } from 'vitest';

import { ConversationsService } from './conversations.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('ConversationsService', () => {
  it('creates a terms-gated conversation with SLA intelligence and saved replies', () => {
    const service = new ConversationsService();
    const conversation = service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability for tomatoes and kale.',
      quantity: '100 crates per week',
      urgency: 'This week',
      acceptedTerms: true,
    });

    expect(conversation.status).toBe('OPEN');
    expect(conversation.priority).toBe('HIGH');
    expect(conversation.sla.responseSlaHours).toBe(4);
    expect(conversation.savedReplies.length).toBeGreaterThan(0);
    expect(service.listMessages(tenantId, conversation.id)).toHaveLength(1);
  });

  it('requires current terms acceptance before starting a conversation', () => {
    const service = new ConversationsService();

    expect(() =>
      service.createConversation(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'GENERAL',
        message: 'Can we talk about weekly supply?',
        acceptedTerms: false as true,
      }),
    ).toThrow();
  });

  it('blocks prohibited chat content before persistence', () => {
    const service = new ConversationsService();

    expect(() =>
      service.createConversation(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'GENERAL',
        message: 'Can you hide ammunition in produce delivery?',
        acceptedTerms: true,
      }),
    ).toThrow();
  });

  it('assigns a conversation and creates an assignment notification', () => {
    const service = new ConversationsService();
    const conversation = service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });

    const assigned = service.assignConversation(tenantId, conversation.id, {
      assigneeUserId: 'sales-agent-1',
      assigneeDisplayName: 'Mary, Sales Desk',
    });

    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.assigneeDisplayName).toBe('Mary, Sales Desk');
    expect(service.listNotifications(tenantId).some((item) => item.type === 'ASSIGNMENT')).toBe(
      true,
    );
  });

  it('records the first tenant response and moves the conversation to requester wait state', () => {
    const service = new ConversationsService();
    const conversation = service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });

    const response = service.sendMessage(tenantId, conversation.id, {
      senderRole: 'TENANT_AGENT',
      body: 'Thank you. Please share delivery coverage and price terms.',
      acceptedTerms: true,
    });

    expect(response.conversation.status).toBe('WAITING_ON_REQUESTER');
    expect(response.conversation.firstResponseAt).toBeDefined();
    expect(service.listMessages(tenantId, conversation.id)).toHaveLength(2);
  });

  it('creates SLA notifications for overdue conversations', () => {
    const service = new ConversationsService();
    const conversation = service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });
    const dueAt = new Date(Date.parse(conversation.firstResponseDueAt) + 60_000).toISOString();

    const result = service.runSlaChecks(tenantId, { now: dueAt });

    expect(result.notificationsCreated).toHaveLength(1);
    expect(result.notificationsCreated[0]?.type).toBe('SLA_BREACHED');
  });
});
