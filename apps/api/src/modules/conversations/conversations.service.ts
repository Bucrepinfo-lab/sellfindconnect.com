import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ConversationReceiptError,
  assertConversationAttachmentsSendable,
  buildLeadConversionIntelligence,
  buildSavedReplySuggestions,
  calculateConversationSlaDecision,
  countUnreadMessagesForRole,
  evaluateMediaAssetInput,
  evaluateMediaUploadPreparationInput,
  evaluateSafetyFields,
  evaluateSafetyText,
  isConversationTypingActive,
  isSameConversationSide,
  markMessageDelivered,
  markMessageRead,
  mediaPolicy,
  pilotSourceFinderRecords,
  recordConversationTyping,
  searchSourceFinderRecords,
  shouldCountAsTenantResponse,
  shouldCreateInboundResponseSla,
  toConversationAttachment,
  type ConversationMessage,
  type ConversationMessageAttachment,
  type ConversationNotification,
  type ConversationParticipantRole,
  type ConversationRecord,
  type MediaAsset,
  type SourceFinderSearchResult,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  AssignConversationDto,
  CreateConversationDto,
  CreateConversationMediaDto,
  PrepareConversationMediaUploadDto,
  RunConversationSlaDto,
  SendConversationMessageDto,
  UpdateConversationStatusDto,
} from './dto/conversations.dto';
import { CONVERSATIONS_REPOSITORY, type ConversationsRepository } from './conversations.repository';
import { InMemoryConversationsRepository } from './in-memory-conversations.repository';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  enqueueMediaProcessingJobs,
  type MediaAdapters,
} from '../media/media.adapters';

@Injectable()
export class ConversationsService {
  private readonly repository: ConversationsRepository;
  private readonly mediaAdapters: MediaAdapters;

  constructor(
    @Optional()
    @Inject(CONVERSATIONS_REPOSITORY)
    repository?: ConversationsRepository,
    @Optional()
    @Inject(MEDIA_ADAPTERS)
    mediaAdapters?: MediaAdapters,
  ) {
    this.repository = repository ?? new InMemoryConversationsRepository();
    this.mediaAdapters = mediaAdapters ?? createDefaultMediaAdapters();
  }

  async createConversation(tenantId: string, input: CreateConversationDto) {
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
    const opener: ConversationMessage = {
      id: randomUUID(),
      conversationId: conversation.id,
      tenantId,
      senderRole: 'REQUESTER',
      body: input.message,
      deliveryStatus: 'SENT',
      createdAt: now,
    };

    await this.repository.createConversation(conversation);
    await this.repository.createMessage(opener);
    await this.createNotification(tenantId, conversation, 'NEW_CONVERSATION', now);

    if (input.assigneeUserId) {
      await this.createNotification(tenantId, conversation, 'ASSIGNMENT', now);
    }

    return this.presentConversation(conversation, [opener]);
  }

  async listConversations(tenantId: string) {
    const conversations = await this.repository.listConversations(tenantId);
    return Promise.all(
      conversations.map(async (conversation) =>
        this.presentConversation(
          conversation,
          await this.repository.listMessages(tenantId, conversation.id),
        ),
      ),
    );
  }

  async getConversation(tenantId: string, conversationId: string) {
    const conversation = await this.requireConversation(tenantId, conversationId);
    return this.presentConversation(
      conversation,
      await this.repository.listMessages(tenantId, conversationId),
    );
  }

  async listMessages(tenantId: string, conversationId: string): Promise<ConversationMessage[]> {
    await this.requireConversation(tenantId, conversationId);
    return this.repository.listMessages(tenantId, conversationId);
  }

  async sendMessage(tenantId: string, conversationId: string, input: SendConversationMessageDto) {
    this.requireTerms(input.acceptedTerms);
    this.assertSafe(input, 'Message contains blocked content.');

    const conversation = await this.requireConversation(tenantId, conversationId);
    if (conversation.status === 'BLOCKED' || conversation.status === 'RESOLVED') {
      throw new UnprocessableEntityException('Conversation is closed for new messages.');
    }

    const now = new Date().toISOString();
    const attachments = await this.requireSendableAttachments(
      tenantId,
      conversationId,
      input.mediaAssetIds,
    );
    const message: ConversationMessage = {
      id: randomUUID(),
      conversationId,
      tenantId,
      senderRole: input.senderRole,
      body: input.body,
      deliveryStatus: 'SENT',
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: now,
    };

    let updated: ConversationRecord = {
      ...conversation,
      lastMessageAt: now,
      typingAt: undefined,
      typingRole: undefined,
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

    await this.repository.createMessage(message);
    await this.repository.updateConversation(updated);
    await this.createNotification(tenantId, updated, 'NEW_MESSAGE', now);

    return {
      conversation: this.presentConversation(updated, [
        ...(await this.repository.listMessages(tenantId, conversationId)),
      ]),
      message,
    };
  }

  async markDelivered(tenantId: string, conversationId: string, messageId: string) {
    await this.requireConversation(tenantId, conversationId);
    const message = await this.requireMessage(tenantId, conversationId, messageId);
    const updated = this.runReceipt(() => markMessageDelivered(message));
    await this.repository.updateMessage(updated);
    return updated;
  }

  async markRead(
    tenantId: string,
    conversationId: string,
    messageId: string,
    readerRole: ConversationParticipantRole,
  ) {
    await this.requireConversation(tenantId, conversationId);
    const message = await this.requireMessage(tenantId, conversationId, messageId);
    const updated = this.runReceipt(() => markMessageRead(message, readerRole));
    await this.repository.updateMessage(updated);
    return updated;
  }

  async recordTyping(
    tenantId: string,
    conversationId: string,
    typingRole: ConversationParticipantRole,
  ) {
    const conversation = await this.requireConversation(tenantId, conversationId);
    const updated = this.runReceipt(() => recordConversationTyping(conversation, typingRole));
    await this.repository.updateConversation(updated);
    return this.presentConversation(
      updated,
      await this.repository.listMessages(tenantId, conversationId),
    );
  }

  async prepareMediaUpload(
    tenantId: string,
    conversationId: string,
    input: PrepareConversationMediaUploadDto,
  ) {
    await this.requireConversation(tenantId, conversationId);
    const existingMedia = await this.repository.listMediaAssets(tenantId, conversationId);
    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `A conversation can hold a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const uploadInput = {
      tenantId,
      ownerType: 'CONVERSATION' as const,
      ownerId: conversationId,
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      fileSizeBytes: input.fileSizeBytes,
    };
    const mediaDecision = evaluateMediaUploadPreparationInput(uploadInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Conversation media upload violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    this.assertSafe(uploadInput, 'Conversation media upload metadata contains blocked content.');
    const upload = await this.mediaAdapters.storage.prepareUpload(uploadInput);
    return {
      upload,
      mediaSlots: {
        used: existingMedia.length,
        max: mediaPolicy.maxItemsPerOwner,
        remaining: mediaPolicy.maxItemsPerOwner - existingMedia.length,
      },
    };
  }

  async addMedia(tenantId: string, conversationId: string, input: CreateConversationMediaDto) {
    await this.requireConversation(tenantId, conversationId);
    const existingMedia = await this.repository.listMediaAssets(tenantId, conversationId);
    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `A conversation can hold a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const mediaInput = {
      sourceUrl: input.sourceUrl.trim(),
      thumbnailUrl: input.thumbnailUrl?.trim(),
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      fileSizeBytes: input.fileSizeBytes,
      caption: input.caption?.trim(),
      displayOrder: existingMedia.length,
      visibility: 'TENANT_ONLY' as const,
    };
    const mediaDecision = evaluateMediaAssetInput(mediaInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Conversation media metadata violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    this.assertSafe(mediaInput, 'Conversation media metadata contains blocked content.');
    const moderation = await this.mediaAdapters.moderation.review(mediaInput);
    if (!moderation.allowed) {
      throw new UnprocessableEntityException({
        message: 'Conversation media failed malware scan or moderation review.',
        moderation,
      });
    }

    const now = new Date().toISOString();
    const baseMedia: MediaAsset = {
      ...mediaInput,
      id: randomUUID(),
      tenantId,
      ownerType: 'CONVERSATION',
      ownerId: conversationId,
      kind: mediaDecision.kind,
      status: 'READY_FOR_PREVIEW',
      moderationStatus: moderation.moderationStatus,
      moderationReason: moderation.moderationReason,
      storageProvider: input.storageProvider,
      objectKey: input.objectKey,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const transform = await this.mediaAdapters.transforms.plan(baseMedia);
    const media: MediaAsset = {
      ...baseMedia,
      cdnUrl: transform.cdnUrl ?? baseMedia.cdnUrl,
      thumbnailUrl: transform.thumbnailUrl ?? baseMedia.thumbnailUrl,
      transformStatus: transform.transformStatus,
      variants: transform.variants ?? baseMedia.variants,
    };
    await this.repository.createMediaAsset(media);
    const processingJobs = await enqueueMediaProcessingJobs(this.mediaAdapters, media);

    return {
      media,
      processingJobs,
      sendable: media.moderationStatus === 'PASSED',
    };
  }

  async listMedia(tenantId: string, conversationId: string) {
    await this.requireConversation(tenantId, conversationId);
    return this.repository.listMediaAssets(tenantId, conversationId);
  }

  async markThreadDelivered(tenantId: string, conversationId: string) {
    await this.requireConversation(tenantId, conversationId);
    const messages = await this.repository.listMessages(tenantId, conversationId);
    let updatedCount = 0;

    for (const message of messages) {
      if (message.deliveryStatus !== 'SENT') {
        continue;
      }

      const updated = this.runReceipt(() => markMessageDelivered(message));
      await this.repository.updateMessage(updated);
      updatedCount += 1;
    }

    return {
      updatedCount,
      messages: await this.repository.listMessages(tenantId, conversationId),
    };
  }

  async markThreadRead(
    tenantId: string,
    conversationId: string,
    readerRole: ConversationParticipantRole,
  ) {
    await this.requireConversation(tenantId, conversationId);
    const messages = await this.repository.listMessages(tenantId, conversationId);
    let updatedCount = 0;

    for (const message of messages) {
      if (
        message.senderRole === 'SYSTEM' ||
        isSameConversationSide(message.senderRole, readerRole)
      ) {
        continue;
      }

      const updated = this.runReceipt(() => markMessageRead(message, readerRole));
      await this.repository.updateMessage(updated);
      updatedCount += 1;
    }

    return {
      updatedCount,
      messages: await this.repository.listMessages(tenantId, conversationId),
    };
  }

  async assignConversation(tenantId: string, conversationId: string, input: AssignConversationDto) {
    this.assertSafe(input, 'Assignment contains blocked content.');

    const conversation = await this.requireConversation(tenantId, conversationId);
    const now = new Date().toISOString();
    const updated: ConversationRecord = {
      ...conversation,
      assigneeUserId: input.assigneeUserId,
      assigneeDisplayName: input.assigneeDisplayName,
      status: conversation.status === 'OPEN' ? 'ASSIGNED' : conversation.status,
      updatedAt: now,
    };

    await this.repository.updateConversation(updated);
    await this.createNotification(tenantId, updated, 'ASSIGNMENT', now);
    return this.presentConversation(
      updated,
      await this.repository.listMessages(tenantId, conversationId),
    );
  }

  async updateStatus(tenantId: string, conversationId: string, input: UpdateConversationStatusDto) {
    const conversation = await this.requireConversation(tenantId, conversationId);
    const now = new Date().toISOString();
    const updated: ConversationRecord = {
      ...conversation,
      status: input.status,
      resolvedAt: input.status === 'RESOLVED' ? now : conversation.resolvedAt,
      blockedAt: input.status === 'BLOCKED' ? now : conversation.blockedAt,
      updatedAt: now,
    };

    await this.repository.updateConversation(updated);
    return this.presentConversation(
      updated,
      await this.repository.listMessages(tenantId, conversationId),
    );
  }

  async listNotifications(tenantId: string): Promise<ConversationNotification[]> {
    return this.repository.listNotifications(tenantId);
  }

  async runSlaChecks(tenantId: string, input: RunConversationSlaDto = {}) {
    const checkedAt = input.now ?? new Date().toISOString();
    const notificationsCreated: ConversationNotification[] = [];
    const conversations = await this.repository.listConversations(tenantId);

    for (const conversation of conversations) {
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

      if (
        await this.repository.hasSlaAlert(
          tenantId,
          conversation.id,
          decision.alertType,
          decision.dueAt,
        )
      ) {
        continue;
      }

      await this.repository.rememberSlaAlert(
        tenantId,
        conversation.id,
        decision.alertType,
        decision.dueAt,
      );
      notificationsCreated.push(
        await this.createNotification(
          tenantId,
          conversation,
          decision.alertType,
          decision.dueAt,
          decision.message,
        ),
      );
    }

    return {
      checkedAt,
      notificationsCreated,
      conversations: await this.listConversations(tenantId),
    };
  }

  async runAllSlaChecks(input: RunConversationSlaDto = {}) {
    const checkedAt = input.now ?? new Date().toISOString();
    const conversations = await this.repository.listAllConversations();
    const tenantIds = [...new Set(conversations.map((item) => item.tenantId))];

    return {
      checkedAt,
      tenantsChecked: tenantIds.length,
      results: await Promise.all(
        tenantIds.map(async (tenantId) => ({
          tenantId,
          ...(await this.runSlaChecks(tenantId, { ...input, now: checkedAt })),
        })),
      ),
    };
  }

  private presentConversation(
    conversation: ConversationRecord,
    messages: ConversationMessage[] = [],
  ) {
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
    const unreadCount = countUnreadMessagesForRole(messages, 'TENANT_AGENT');

    return {
      ...conversation,
      sla,
      savedReplies,
      unreadCount,
      typingActive: isConversationTypingActive(conversation.typingAt),
    };
  }

  private async createNotification(
    tenantId: string,
    conversation: ConversationRecord,
    type: ConversationNotification['type'],
    now: string,
    overrideMessage?: string,
  ): Promise<ConversationNotification> {
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

    await this.repository.createNotification(notification);
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

  private async requireConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationRecord> {
    const conversation = await this.repository.findConversation(tenantId, conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  private async requireMessage(
    tenantId: string,
    conversationId: string,
    messageId: string,
  ): Promise<ConversationMessage> {
    const message = await this.repository.findMessage(tenantId, conversationId, messageId);
    if (!message) {
      throw new NotFoundException('Conversation message not found.');
    }

    return message;
  }

  private async requireSendableAttachments(
    tenantId: string,
    conversationId: string,
    mediaAssetIds: string[] | undefined,
  ) {
    if (!mediaAssetIds?.length) {
      return [];
    }

    const attachments: ConversationMessageAttachment[] = [];
    for (const mediaId of mediaAssetIds) {
      const asset = await this.repository.findMediaAsset(tenantId, conversationId, mediaId);
      if (!asset) {
        throw new NotFoundException('Conversation attachment not found.');
      }
      attachments.push(toConversationAttachment(asset));
    }

    return this.runReceipt(() => assertConversationAttachmentsSendable(attachments));
  }

  private requireTerms(acceptedTerms: boolean): void {
    if (!acceptedTerms) {
      throw new UnprocessableEntityException(
        'Current terms acceptance is required before messaging.',
      );
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

  private runReceipt<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof ConversationReceiptError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
