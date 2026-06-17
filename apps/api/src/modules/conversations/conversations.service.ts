import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  buildLeadConversionIntelligence,
  buildSavedReplySuggestions,
  calculateConversationSlaDecision,
  evaluateSafetyFields,
  evaluateSafetyText,
  pilotSourceFinderRecords,
  searchSourceFinderRecords,
  shouldCountAsTenantResponse,
  shouldCreateInboundResponseSla,
  type ConversationMessage,
  type ConversationNotification,
  type ConversationRecord,
  type SourceFinderSearchResult,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  AssignConversationDto,
  CreateConversationDto,
  RunConversationSlaDto,
  SendConversationMessageDto,
  UpdateConversationStatusDto,
} from './dto/conversations.dto';

@Injectable()
export class ConversationsService {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, ConversationMessage[]>();
  private readonly notifications = new Map<string, ConversationNotification>();
  private readonly slaAlertKeys = new Set<string>();

  createConversation(tenantId: string, input: CreateConversationDto) {
    this.requireTerms(input.acceptedTerms);
    this.assertSafe(input, 'Conversation contains blocked content.');

    const source = this.getSourceResult(input.sourceRecordId, input.query);
    const intelligence = buildLeadConversionIntelligence(source);
    const now = new Date().toISOString();
    const firstResponseDueAt = new Date(
      Date.parse(now) + intelligence.responseSlaHours * 60 * 60 * 1000,
    ).toISOString();
    const conversation: ConversationRecord = {
      id: randomUUID(),
      tenantId,
      sourceRecordId: source.id,
      sourceName: source.name,
      sourceRole: source.role,
      inquiryType: input.inquiryType,
      status: input.assigneeUserId ? 'ASSIGNED' : 'OPEN',
      priority: intelligence.priority,
      matchConfidence: intelligence.confidence,
      responseSlaHours: intelligence.responseSlaHours,
      assigneeUserId: input.assigneeUserId,
      assigneeDisplayName: input.assigneeDisplayName,
      openedAt: now,
      firstResponseDueAt,
      lastInboundMessageAt: now,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(this.key(tenantId, conversation.id), conversation);
    this.messages.set(this.messageKey(tenantId, conversation.id), [
      {
        id: randomUUID(),
        conversationId: conversation.id,
        tenantId,
        senderRole: 'REQUESTER',
        body: input.message,
        createdAt: now,
      },
    ]);
    this.createNotification(tenantId, conversation, 'NEW_CONVERSATION', now);

    if (input.assigneeUserId) {
      this.createNotification(tenantId, conversation, 'ASSIGNMENT', now);
    }

    return this.presentConversation(conversation);
  }

  listConversations(tenantId: string) {
    return Array.from(this.conversations.values())
      .filter((conversation) => conversation.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((conversation) => this.presentConversation(conversation));
  }

  getConversation(tenantId: string, conversationId: string) {
    return this.presentConversation(this.requireConversation(tenantId, conversationId));
  }

  listMessages(tenantId: string, conversationId: string): ConversationMessage[] {
    this.requireConversation(tenantId, conversationId);
    return [...(this.messages.get(this.messageKey(tenantId, conversationId)) ?? [])].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  sendMessage(tenantId: string, conversationId: string, input: SendConversationMessageDto) {
    this.requireTerms(input.acceptedTerms);
    this.assertSafe(input, 'Message contains blocked content.');

    const conversation = this.requireConversation(tenantId, conversationId);
    if (conversation.status === 'BLOCKED' || conversation.status === 'RESOLVED') {
      throw new UnprocessableEntityException('Conversation is closed for new messages.');
    }

    const now = new Date().toISOString();
    const message: ConversationMessage = {
      id: randomUUID(),
      conversationId,
      tenantId,
      senderRole: input.senderRole,
      body: input.body,
      createdAt: now,
    };

    const messages = this.messages.get(this.messageKey(tenantId, conversationId)) ?? [];
    messages.push(message);
    this.messages.set(this.messageKey(tenantId, conversationId), messages);

    let updated: ConversationRecord = {
      ...conversation,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (shouldCreateInboundResponseSla(input.senderRole)) {
      updated = {
        ...updated,
        status: 'WAITING_ON_ADVERTISER',
        lastInboundMessageAt: now,
      };
    }

    if (shouldCountAsTenantResponse(input.senderRole)) {
      updated = {
        ...updated,
        status: 'WAITING_ON_REQUESTER',
        firstResponseAt: updated.firstResponseAt ?? now,
      };
    }

    this.conversations.set(this.key(tenantId, conversationId), updated);
    this.createNotification(tenantId, updated, 'NEW_MESSAGE', now);

    return {
      conversation: this.presentConversation(updated),
      message,
    };
  }

  assignConversation(tenantId: string, conversationId: string, input: AssignConversationDto) {
    this.assertSafe(input, 'Assignment contains blocked content.');

    const conversation = this.requireConversation(tenantId, conversationId);
    const now = new Date().toISOString();
    const updated: ConversationRecord = {
      ...conversation,
      assigneeUserId: input.assigneeUserId,
      assigneeDisplayName: input.assigneeDisplayName,
      status: conversation.status === 'OPEN' ? 'ASSIGNED' : conversation.status,
      updatedAt: now,
    };

    this.conversations.set(this.key(tenantId, conversationId), updated);
    this.createNotification(tenantId, updated, 'ASSIGNMENT', now);
    return this.presentConversation(updated);
  }

  updateStatus(tenantId: string, conversationId: string, input: UpdateConversationStatusDto) {
    const conversation = this.requireConversation(tenantId, conversationId);
    const now = new Date().toISOString();
    const updated: ConversationRecord = {
      ...conversation,
      status: input.status,
      resolvedAt: input.status === 'RESOLVED' ? now : conversation.resolvedAt,
      blockedAt: input.status === 'BLOCKED' ? now : conversation.blockedAt,
      updatedAt: now,
    };

    this.conversations.set(this.key(tenantId, conversationId), updated);
    return this.presentConversation(updated);
  }

  listNotifications(tenantId: string): ConversationNotification[] {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  runSlaChecks(tenantId: string, input: RunConversationSlaDto = {}) {
    const checkedAt = input.now ?? new Date().toISOString();
    const notificationsCreated: ConversationNotification[] = [];

    for (const conversation of Array.from(this.conversations.values())) {
      if (conversation.tenantId !== tenantId) continue;

      const decision = calculateConversationSlaDecision(
        {
          openedAt: conversation.openedAt,
          lastInboundMessageAt: conversation.lastInboundMessageAt,
          firstResponseAt: conversation.firstResponseAt,
          responseSlaHours: conversation.responseSlaHours,
          priority: conversation.priority,
          status: conversation.status,
        },
        checkedAt,
      );

      if (!decision.alertType) continue;

      const alertKey = `${tenantId}:${conversation.id}:${decision.alertType}:${decision.dueAt}`;
      if (this.slaAlertKeys.has(alertKey)) continue;

      this.slaAlertKeys.add(alertKey);
      notificationsCreated.push(
        this.createNotification(tenantId, conversation, decision.alertType, checkedAt, decision.message),
      );
    }

    return {
      checkedAt,
      notificationsCreated,
      conversations: this.listConversations(tenantId),
    };
  }

  private presentConversation(conversation: ConversationRecord) {
    const sla = calculateConversationSlaDecision({
      openedAt: conversation.openedAt,
      lastInboundMessageAt: conversation.lastInboundMessageAt,
      firstResponseAt: conversation.firstResponseAt,
      responseSlaHours: conversation.responseSlaHours,
      priority: conversation.priority,
      status: conversation.status,
    });
    const savedReplies = buildSavedReplySuggestions({
      sourceName: conversation.sourceName,
      inquiryType: conversation.inquiryType,
    });

    return {
      ...conversation,
      sla,
      savedReplies,
    };
  }

  private createNotification(
    tenantId: string,
    conversation: ConversationRecord,
    type: ConversationNotification['type'],
    now: string,
    overrideMessage?: string,
  ): ConversationNotification {
    const titleByType: Record<ConversationNotification['type'], string> = {
      NEW_CONVERSATION: `New conversation: ${conversation.sourceName}`,
      NEW_MESSAGE: `New message: ${conversation.sourceName}`,
      ASSIGNMENT: `Assigned conversation: ${conversation.sourceName}`,
      SLA_DUE_SOON: `SLA due soon: ${conversation.sourceName}`,
      SLA_BREACHED: `SLA breached: ${conversation.sourceName}`,
    };
    const messageByType: Record<ConversationNotification['type'], string> = {
      NEW_CONVERSATION: 'A matched inquiry has entered the conversation workspace.',
      NEW_MESSAGE: 'A new message was added to the conversation.',
      ASSIGNMENT: conversation.assigneeDisplayName
        ? `Conversation assigned to ${conversation.assigneeDisplayName}.`
        : 'Conversation assignment changed.',
      SLA_DUE_SOON: 'The conversation response SLA is due soon.',
      SLA_BREACHED: 'The conversation response SLA has been breached.',
    };
    const notification: ConversationNotification = {
      id: randomUUID(),
      tenantId,
      conversationId: conversation.id,
      type,
      title: titleByType[type],
      message: overrideMessage ?? messageByType[type],
      scheduledFor: now,
      createdAt: now,
    };

    this.notifications.set(this.key(tenantId, notification.id), notification);
    return notification;
  }

  private getSourceResult(sourceRecordId: string, query?: string): SourceFinderSearchResult {
    const source = this.requireSource(sourceRecordId);
    const queryText = query?.trim() || source.offers[0] || source.name;
    const result =
      searchSourceFinderRecords({
        query: queryText,
        countryCode: source.countryCode,
        sortBy: 'RELEVANCE',
      }).find((item) => item.id === sourceRecordId) ??
      searchSourceFinderRecords({
        query: '',
        countryCode: source.countryCode,
        sortBy: 'RELEVANCE',
      }).find((item) => item.id === sourceRecordId);

    if (!result) {
      throw new NotFoundException('Source Finder match not found.');
    }

    return result;
  }

  private requireSource(sourceRecordId: string) {
    const source = pilotSourceFinderRecords.find((record) => record.id === sourceRecordId);
    if (!source) {
      throw new NotFoundException('Source Finder match not found.');
    }

    return source;
  }

  private requireConversation(tenantId: string, conversationId: string): ConversationRecord {
    const conversation = this.conversations.get(this.key(tenantId, conversationId));
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  private requireTerms(acceptedTerms: boolean): void {
    if (!acceptedTerms) {
      throw new UnprocessableEntityException('Current terms acceptance is required before messaging.');
    }
  }

  private assertSafe(input: object, message: string): void {
    const fieldSafety = evaluateSafetyFields(input);
    const textSafety = 'message' in input ? evaluateSafetyText(String(input.message)) : fieldSafety;
    const bodySafety = 'body' in input ? evaluateSafetyText(String(input.body)) : textSafety;
    const safety = fieldSafety.allowed ? bodySafety : fieldSafety;

    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private messageKey(tenantId: string, conversationId: string): string {
    return `${tenantId}:conversation:${conversationId}`;
  }
}
