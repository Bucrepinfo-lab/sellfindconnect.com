import { describe, expect, it } from 'vitest';

import type { AuthService } from '../auth/auth.service';
import { UgcService } from '../ugc/ugc.service';
import { ConversationsRealtimeService } from './conversations.realtime.service';
import { ConversationsService } from './conversations.service';
import { InMemoryConversationsRepository } from './in-memory-conversations.repository';

const tenantId = '11111111-1111-4111-8111-111111111111';

const opener = {
  sourceRecordId: 'r1',
  query: 'fresh produce',
  inquiryType: 'RFQ' as const,
  message: 'Please confirm weekly supply availability for tomatoes and kale.',
  quantity: '100 crates per week',
  urgency: 'This week',
  acceptedTerms: true as const,
};

describe('ConversationsService', () => {
  it('creates a terms-gated conversation with SLA intelligence and saved replies', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, opener);

    expect(conversation.status).toBe('OPEN');
    expect(conversation.priority).toBe('HIGH');
    expect(conversation.sla.responseSlaHours).toBe(4);
    expect(conversation.savedReplies.length).toBeGreaterThan(0);
    expect(conversation.unreadCount).toBe(1);
    expect(await service.listMessages(tenantId, conversation.id)).toHaveLength(1);
  });

  it('requires current terms acceptance before starting a conversation', async () => {
    const service = new ConversationsService();

    await expect(
      service.createConversation(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'GENERAL',
        message: 'Can we talk about weekly supply?',
        acceptedTerms: false as true,
      }),
    ).rejects.toThrow();
  });

  it('blocks prohibited chat content before persistence', async () => {
    const service = new ConversationsService();

    await expect(
      service.createConversation(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'GENERAL',
        message: 'Can you hide ammunition in produce delivery?',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();
  });

  it('assigns a conversation and creates an assignment notification', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });

    const assigned = await service.assignConversation(tenantId, conversation.id, {
      assigneeUserId: 'sales-agent-1',
      assigneeDisplayName: 'Mary, Sales Desk',
    });

    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.assigneeDisplayName).toBe('Mary, Sales Desk');
    expect((await service.listNotifications(tenantId)).some((item) => item.type === 'ASSIGNMENT')).toBe(
      true,
    );
  });

  it('records the first tenant response and moves the conversation to requester wait state', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });

    const response = await service.sendMessage(tenantId, conversation.id, {
      senderRole: 'TENANT_AGENT',
      body: 'Thank you. Please share delivery coverage and price terms.',
      acceptedTerms: true,
    });

    expect(response.conversation.status).toBe('WAITING_ON_REQUESTER');
    expect(response.conversation.firstResponseAt).toBeDefined();
    expect(response.message.deliveryStatus).toBe('SENT');
    expect(await service.listMessages(tenantId, conversation.id)).toHaveLength(2);
  });

  it('creates SLA notifications for overdue conversations', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });
    const dueAt = new Date(Date.parse(conversation.firstResponseDueAt) + 60_000).toISOString();

    const result = await service.runSlaChecks(tenantId, { now: dueAt });

    expect(result.notificationsCreated).toHaveLength(1);
    expect(result.notificationsCreated[0]?.type).toBe('SLA_BREACHED');
  });

  it('runs SLA checks across all tenants for scheduler jobs', async () => {
    const service = new ConversationsService();
    const otherTenantId = '22222222-2222-4222-8222-222222222222';
    const firstConversation = await service.createConversation(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please confirm weekly supply availability.',
      acceptedTerms: true,
    });
    const secondConversation = await service.createConversation(otherTenantId, {
      sourceRecordId: 'r2',
      query: 'cold transport',
      inquiryType: 'GENERAL',
      message: 'Please confirm refrigerated transport availability.',
      acceptedTerms: true,
    });
    const checkedAt = new Date(
      Math.max(
        Date.parse(firstConversation.firstResponseDueAt),
        Date.parse(secondConversation.firstResponseDueAt),
      ) + 60_000,
    ).toISOString();

    const result = await service.runAllSlaChecks({ now: checkedAt });

    expect(result.tenantsChecked).toBe(2);
    expect(result.results.every((item) => item.notificationsCreated.length === 1)).toBe(true);
  });

  it('records delivery, read receipts, and typing without allowing self-read', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, opener);
    const [openerMessage] = await service.listMessages(tenantId, conversation.id);
    expect(openerMessage).toBeDefined();

    const delivered = await service.markDelivered(tenantId, conversation.id, openerMessage!.id);
    expect(delivered.deliveryStatus).toBe('DELIVERED');

    const read = await service.markRead(
      tenantId,
      conversation.id,
      openerMessage!.id,
      'TENANT_AGENT',
    );
    expect(read.deliveryStatus).toBe('READ');
    expect(read.readByRole).toBe('TENANT_AGENT');
    expect((await service.getConversation(tenantId, conversation.id)).unreadCount).toBe(0);

    await expect(
      service.markRead(tenantId, conversation.id, openerMessage!.id, 'REQUESTER'),
    ).rejects.toThrow(/own message/);

    const typing = await service.recordTyping(tenantId, conversation.id, 'TENANT_AGENT');
    expect(typing.typingRole).toBe('TENANT_AGENT');
    expect(typing.typingActive).toBe(true);
  });

  it('publishes websocket events and HTTP presence for an authenticated tenant agent', async () => {
    const realtime = new ConversationsRealtimeService();
    const events: Array<{ type: string; conversationId?: string }> = [];
    realtime.attachEmitter({
      emitToRoom: (_room, event, payload) => {
        const body = payload as { type?: string; conversationId?: string };
        events.push({ type: body.type ?? event, conversationId: body.conversationId });
      },
    });
    const service = new ConversationsService(undefined, undefined, realtime);
    const conversation = await service.createConversation(tenantId, opener);

    const now = new Date().toISOString();
    const presence = await service.recordPresence(tenantId, conversation.id, {
      userId: 'agent-1',
      participantRole: 'TENANT_AGENT',
      now,
    });
    expect(presence.presence.onlineCount).toBe(1);
    expect((await service.getConversation(tenantId, conversation.id)).presence.onlineCount).toBe(1);

    await service.sendMessage(tenantId, conversation.id, {
      senderRole: 'TENANT_AGENT',
      body: 'Thank you. Please share delivery coverage and price terms.',
      acceptedTerms: true,
    });
    await service.recordTyping(tenantId, conversation.id, 'TENANT_AGENT');

    expect(events.some((event) => event.type === 'conversation.presence')).toBe(true);
    expect(events.some((event) => event.type === 'conversation.message')).toBe(true);
    expect(events.some((event) => event.type === 'conversation.typing')).toBe(true);
    expect(
      (await service.getPresence(tenantId, conversation.id, now)).participants[0]
        ?.userId,
    ).toBe('agent-1');
  });

  it('marks inbound thread receipts in bulk when a conversation is opened', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, opener);

    const delivered = await service.markThreadDelivered(tenantId, conversation.id);
    expect(delivered.updatedCount).toBe(1);
    expect(delivered.messages[0]?.deliveryStatus).toBe('DELIVERED');

    const read = await service.markThreadRead(tenantId, conversation.id, 'TENANT_AGENT');
    expect(read.updatedCount).toBe(1);
    expect(read.messages[0]?.deliveryStatus).toBe('READ');
    expect((await service.getConversation(tenantId, conversation.id)).unreadCount).toBe(0);
  });

  it('attaches scanned conversation media and sends it only after moderation passes', async () => {
    const service = new ConversationsService();
    const conversation = await service.createConversation(tenantId, opener);
    const prepared = await service.prepareMediaUpload(tenantId, conversation.id, {
      fileName: 'quote-sheet.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });
    const attached = await service.addMedia(tenantId, conversation.id, {
      sourceUrl: 'https://cdn.example.test/chat/quote-sheet.jpg',
      fileName: 'quote-sheet.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
    });

    expect(prepared.upload.requiredHeaders['x-media-owner-type']).toBe('CONVERSATION');
    expect(attached.media.ownerType).toBe('CONVERSATION');
    expect(attached.sendable).toBe(true);
    expect(attached.media.review).toMatchObject({ status: 'READY', canPublish: true });
    expect(attached.media).not.toHaveProperty('moderationReason');
    expect(attached.processingJobs.length).toBeGreaterThan(0);

    const sent = await service.sendMessage(tenantId, conversation.id, {
      senderRole: 'TENANT_AGENT',
      body: 'Please see the attached quote sheet.',
      acceptedTerms: true,
      mediaAssetIds: [attached.media.id],
    });

    expect(sent.message.attachments).toEqual([
      expect.objectContaining({
        mediaAssetId: attached.media.id,
        fileName: 'quote-sheet.jpg',
        moderationStatus: 'PASSED',
      }),
    ]);
  });

  it('rejects blocked conversation media before it can be attached', async () => {
    const service = new ConversationsService(undefined, {
      storage: {
        prepareUpload: () => {
          throw new Error('storage adapter should not be used');
        },
      },
      moderation: {
        review: () => ({
          allowed: false,
          moderationStatus: 'BLOCKED',
          moderationReason: 'MALWARE',
        }),
      },
      transforms: {
        plan: () => ({ transformStatus: 'NOT_REQUIRED' }),
      },
    });
    const conversation = await service.createConversation(tenantId, opener);

    await expect(
      service.addMedia(tenantId, conversation.id, {
        sourceUrl: 'https://cdn.example.test/chat/payload.jpg',
        fileName: 'payload.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 800_000,
      }),
    ).rejects.toThrow(/moderation review/);
  });

  it('records product audit evidence without storing chat text', async () => {
    const auditLogs: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new ConversationsService(undefined, undefined, undefined, undefined, {
      recordTenantAudit: async (record) => {
        auditLogs.push(record);
      },
    } as Pick<AuthService, 'recordTenantAudit'> as AuthService);
    const conversation = await service.createConversation(tenantId, opener, 'actor-1');
    await service.sendMessage(
      tenantId,
      conversation.id,
      {
        senderRole: 'TENANT_AGENT',
        body: 'Thank you. Please share delivery coverage and price terms.',
        acceptedTerms: true,
      },
      'actor-1',
    );

    expect(auditLogs.some((record) => record.action === 'CONVERSATION_CREATED')).toBe(true);
    expect(auditLogs.some((record) => record.action === 'CONVERSATION_MESSAGE_SENT')).toBe(true);
    expect(JSON.stringify(auditLogs)).not.toContain(opener.message);
    expect(JSON.stringify(auditLogs)).not.toContain('Please share delivery coverage');
  });

  it('refuses create, send, and SLA for a blocked Source Finder target', async () => {
    const ugc = new UgcService();
    await ugc.createBlock(tenantId, 'owner-1', {
      blockedTargetId: 'r1',
      reason: 'HARASSMENT',
      acceptedTerms: true,
    });
    const service = new ConversationsService(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ugc,
    );

    await expect(service.createConversation(tenantId, opener)).rejects.toThrow(/blocked/);

    const repository = new InMemoryConversationsRepository();
    const openService = new ConversationsService(repository);
    const conversation = await openService.createConversation(tenantId, opener);
    const blockedThread = new ConversationsService(
      repository,
      undefined,
      undefined,
      undefined,
      undefined,
      ugc,
    );

    await expect(
      blockedThread.sendMessage(tenantId, conversation.id, {
        senderRole: 'TENANT_AGENT',
        body: 'Thank you. Please share delivery coverage and price terms.',
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/blocked/);
    await expect(
      blockedThread.recordTyping(tenantId, conversation.id, 'TENANT_AGENT'),
    ).rejects.toThrow(/blocked/);

    const presented = await blockedThread.getConversation(tenantId, conversation.id);
    expect(presented.userBlocked).toBe(true);
    expect(presented.status).toBe('BLOCKED');
    expect(presented.sla.state).toBe('PAUSED');

    const dueAt = new Date(Date.parse(conversation.firstResponseDueAt) + 60_000).toISOString();
    const sla = await blockedThread.runSlaChecks(tenantId, { now: dueAt });
    expect(sla.notificationsCreated).toHaveLength(0);
  });
});
