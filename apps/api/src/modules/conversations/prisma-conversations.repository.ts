import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type Conversation as PrismaConversation,
  type ConversationMessage as PrismaConversationMessage,
  type ConversationNotification as PrismaConversationNotification,
  type ConversationNotificationType as PrismaConversationNotificationType,
  type ConversationParticipantRole as PrismaParticipantRole,
  type ConversationStatus as PrismaConversationStatus,
  type MediaAsset as PrismaMediaAsset,
} from '@prisma/client';
import {
  conversationNotificationTypes,
  conversationParticipantRoles,
  conversationStatuses,
  inquiryTypes,
  mediaAssetKinds,
  mediaAssetStatuses,
  mediaModerationStatuses,
  mediaOwnerTypes,
  mediaTransformStatuses,
  mediaVisibilityStates,
  messageDeliveryStatuses,
  type ConversationMessage,
  type ConversationMessageAttachment,
  type ConversationNotification,
  type ConversationNotificationType,
  type ConversationParticipantRole,
  type ConversationRecord,
  type ConversationStatus,
  type InquiryType,
  type MediaAsset,
  type MediaAssetKind,
  type MediaAssetStatus,
  type MediaModerationStatus,
  type MediaOwnerType,
  type MediaTransformStatus,
  type MediaVisibility,
  type MessageDeliveryStatus,
} from '@telpen/domain';

import type { ConversationsRepository } from './conversations.repository';

export function createConversationsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaConversationsRepository implements ConversationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createConversation(conversation: ConversationRecord): Promise<void> {
    await this.prisma.conversation.create({ data: this.toConversationData(conversation) });
  }

  async updateConversation(conversation: ConversationRecord): Promise<void> {
    const data = this.toConversationData(conversation);
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: data.status,
        assigneeUserId: data.assigneeUserId,
        assigneeDisplayName: data.assigneeDisplayName,
        firstResponseAt: data.firstResponseAt,
        lastInboundMessageAt: data.lastInboundMessageAt,
        lastMessageAt: data.lastMessageAt,
        typingRole: data.typingRole,
        typingAt: data.typingAt,
        resolvedAt: data.resolvedAt,
        blockedAt: data.blockedAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findConversation(tenantId: string, id: string): Promise<ConversationRecord | undefined> {
    const record = await this.prisma.conversation.findFirst({ where: { id, tenantId } });
    return record ? this.fromConversation(record) : undefined;
  }

  async listConversations(tenantId: string): Promise<ConversationRecord[]> {
    const records = await this.prisma.conversation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromConversation(record));
  }

  async listAllConversations(): Promise<ConversationRecord[]> {
    const records = await this.prisma.conversation.findMany();
    return records.map((record) => this.fromConversation(record));
  }

  async createMessage(message: ConversationMessage): Promise<void> {
    await this.prisma.conversationMessage.create({ data: this.toMessageData(message) });
  }

  async updateMessage(message: ConversationMessage): Promise<void> {
    const data = this.toMessageData(message);
    await this.prisma.conversationMessage.update({
      where: { id: message.id },
      data: {
        deliveryStatus: data.deliveryStatus,
        deliveredAt: data.deliveredAt,
        readAt: data.readAt,
        readByRole: data.readByRole,
      },
    });
  }

  async findMessage(
    tenantId: string,
    conversationId: string,
    messageId: string,
  ): Promise<ConversationMessage | undefined> {
    const record = await this.prisma.conversationMessage.findFirst({
      where: { id: messageId, tenantId, conversationId },
    });
    return record ? this.fromMessage(record) : undefined;
  }

  async listMessages(tenantId: string, conversationId: string): Promise<ConversationMessage[]> {
    const records = await this.prisma.conversationMessage.findMany({
      where: { tenantId, conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.fromMessage(record));
  }

  async createNotification(notification: ConversationNotification): Promise<void> {
    await this.prisma.conversationNotification.create({
      data: {
        id: notification.id,
        tenantId: notification.tenantId,
        conversationId: notification.conversationId,
        type: notification.type as PrismaConversationNotificationType,
        title: notification.title,
        message: notification.message,
        scheduledFor: new Date(notification.scheduledFor),
        createdAt: new Date(notification.createdAt),
      },
    });
  }

  async listNotifications(tenantId: string): Promise<ConversationNotification[]> {
    const records = await this.prisma.conversationNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromNotification(record));
  }

  async hasSlaAlert(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): Promise<boolean> {
    const existing = await this.prisma.conversationNotification.findFirst({
      where: {
        tenantId,
        conversationId,
        type: type as PrismaConversationNotificationType,
        scheduledFor: new Date(dueAt),
      },
    });
    return Boolean(existing);
  }

  async rememberSlaAlert(): Promise<void> {
    return;
  }

  async createMediaAsset(asset: MediaAsset): Promise<void> {
    await this.prisma.mediaAsset.create({
      data: {
        id: asset.id,
        tenantId: asset.tenantId,
        ownerType: asset.ownerType,
        ownerId: asset.ownerId,
        kind: asset.kind,
        status: asset.status,
        sourceUrl: asset.sourceUrl,
        thumbnailUrl: asset.thumbnailUrl,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        fileSizeBytes: asset.fileSizeBytes,
        width: asset.width,
        height: asset.height,
        durationSeconds: asset.durationSeconds,
        caption: asset.caption,
        altText: asset.altText,
        displayOrder: asset.displayOrder,
        visibility: asset.visibility,
        moderationStatus: asset.moderationStatus,
        moderationReason: asset.moderationReason,
        storageProvider: asset.storageProvider,
        objectKey: asset.objectKey,
        cdnUrl: asset.cdnUrl,
        transformStatus: asset.transformStatus,
        variants: asset.variants === undefined ? undefined : (asset.variants as Prisma.InputJsonValue),
        uploadedAt: new Date(asset.uploadedAt),
        createdAt: new Date(asset.createdAt),
        updatedAt: new Date(asset.updatedAt),
      },
    });
  }

  async findMediaAsset(
    tenantId: string,
    conversationId: string,
    mediaId: string,
  ): Promise<MediaAsset | undefined> {
    const record = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaId,
        tenantId,
        ownerType: 'CONVERSATION',
        ownerId: conversationId,
      },
    });
    return record ? this.fromMediaAsset(record) : undefined;
  }

  async listMediaAssets(tenantId: string, conversationId: string): Promise<MediaAsset[]> {
    const records = await this.prisma.mediaAsset.findMany({
      where: {
        tenantId,
        ownerType: 'CONVERSATION',
        ownerId: conversationId,
        status: { notIn: ['BLOCKED', 'ARCHIVED'] },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record) => this.fromMediaAsset(record));
  }

  async eraseTenantHoldings(tenantId: string): Promise<{ conversations: number; media: number }> {
    const [media, notifications, messages, conversations] = await this.prisma.$transaction([
      this.prisma.mediaAsset.deleteMany({ where: { tenantId, ownerType: 'CONVERSATION' } }),
      this.prisma.conversationNotification.deleteMany({ where: { tenantId } }),
      this.prisma.conversationMessage.deleteMany({ where: { tenantId } }),
      this.prisma.conversation.deleteMany({ where: { tenantId } }),
    ]);
    return { conversations: conversations.count, media: media.count };
  }

  private toConversationData(conversation: ConversationRecord) {
    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      sourceRecordId: conversation.sourceRecordId,
      sourceName: conversation.sourceName,
      sourceRole: conversation.sourceRole,
      inquiryType: conversation.inquiryType,
      status: conversation.status as PrismaConversationStatus,
      priority: conversation.priority,
      matchConfidence: conversation.matchConfidence,
      responseSlaHours: conversation.responseSlaHours,
      assigneeUserId: conversation.assigneeUserId ?? null,
      assigneeDisplayName: conversation.assigneeDisplayName ?? null,
      openedAt: new Date(conversation.openedAt),
      firstResponseDueAt: new Date(conversation.firstResponseDueAt),
      firstResponseAt: conversation.firstResponseAt ? new Date(conversation.firstResponseAt) : null,
      lastInboundMessageAt: new Date(conversation.lastInboundMessageAt),
      lastMessageAt: new Date(conversation.lastMessageAt),
      typingRole: (conversation.typingRole as PrismaParticipantRole | undefined) ?? null,
      typingAt: conversation.typingAt ? new Date(conversation.typingAt) : null,
      resolvedAt: conversation.resolvedAt ? new Date(conversation.resolvedAt) : null,
      blockedAt: conversation.blockedAt ? new Date(conversation.blockedAt) : null,
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
    };
  }

  private toMessageData(message: ConversationMessage) {
    return {
      id: message.id,
      tenantId: message.tenantId,
      conversationId: message.conversationId,
      senderRole: message.senderRole as PrismaParticipantRole,
      body: message.body,
      deliveryStatus: message.deliveryStatus,
      deliveredAt: message.deliveredAt ? new Date(message.deliveredAt) : null,
      readAt: message.readAt ? new Date(message.readAt) : null,
      readByRole: (message.readByRole as PrismaParticipantRole | undefined) ?? null,
      attachments: (message.attachments ?? []) as Prisma.InputJsonValue,
      createdAt: new Date(message.createdAt),
    };
  }

  private fromConversation(record: PrismaConversation): ConversationRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      sourceRecordId: record.sourceRecordId,
      sourceName: record.sourceName,
      sourceRole: record.sourceRole,
      inquiryType: inquiryTypes.includes(record.inquiryType as InquiryType)
        ? (record.inquiryType as InquiryType)
        : 'GENERAL',
      status: conversationStatuses.includes(record.status as ConversationStatus)
        ? (record.status as ConversationStatus)
        : 'OPEN',
      priority: record.priority === 'HIGH' || record.priority === 'LOW' || record.priority === 'MEDIUM'
        ? record.priority
        : 'MEDIUM',
      matchConfidence: record.matchConfidence,
      responseSlaHours: record.responseSlaHours,
      assigneeUserId: record.assigneeUserId ?? undefined,
      assigneeDisplayName: record.assigneeDisplayName ?? undefined,
      openedAt: record.openedAt.toISOString(),
      firstResponseDueAt: record.firstResponseDueAt.toISOString(),
      firstResponseAt: record.firstResponseAt?.toISOString(),
      lastInboundMessageAt: record.lastInboundMessageAt.toISOString(),
      lastMessageAt: record.lastMessageAt.toISOString(),
      typingRole: record.typingRole
        ? this.participantRole(record.typingRole)
        : undefined,
      typingAt: record.typingAt?.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString(),
      blockedAt: record.blockedAt?.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private fromMessage(record: PrismaConversationMessage): ConversationMessage {
    return {
      id: record.id,
      tenantId: record.tenantId,
      conversationId: record.conversationId,
      senderRole: this.participantRole(record.senderRole),
      body: record.body,
      deliveryStatus: messageDeliveryStatuses.includes(record.deliveryStatus as MessageDeliveryStatus)
        ? (record.deliveryStatus as MessageDeliveryStatus)
        : 'SENT',
      deliveredAt: record.deliveredAt?.toISOString(),
      readAt: record.readAt?.toISOString(),
      readByRole: record.readByRole ? this.participantRole(record.readByRole) : undefined,
      attachments: this.fromAttachments(record.attachments),
      createdAt: record.createdAt.toISOString(),
    };
  }

  private fromNotification(record: PrismaConversationNotification): ConversationNotification {
    return {
      id: record.id,
      tenantId: record.tenantId,
      conversationId: record.conversationId,
      type: conversationNotificationTypes.includes(record.type as ConversationNotificationType)
        ? (record.type as ConversationNotificationType)
        : 'NEW_MESSAGE',
      title: record.title,
      message: record.message,
      scheduledFor: record.scheduledFor.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };
  }

  private participantRole(value: string): ConversationParticipantRole {
    return conversationParticipantRoles.includes(value as ConversationParticipantRole)
      ? (value as ConversationParticipantRole)
      : 'REQUESTER';
  }

  private fromAttachments(value: Prisma.JsonValue | null): ConversationMessageAttachment[] | undefined {
    if (!Array.isArray(value) || value.length === 0) {
      return undefined;
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !('mediaAssetId' in item)) {
        return [];
      }

      const record = item as Record<string, unknown>;
      const kind = mediaAssetKinds.includes(record.kind as MediaAssetKind)
        ? (record.kind as MediaAssetKind)
        : 'IMAGE';
      const moderationStatus = mediaModerationStatuses.includes(
        record.moderationStatus as MediaModerationStatus,
      )
        ? (record.moderationStatus as MediaModerationStatus)
        : 'PENDING';

      return [
        {
          mediaAssetId: String(record.mediaAssetId),
          kind,
          fileName: String(record.fileName ?? 'attachment'),
          mimeType: String(record.mimeType ?? 'application/octet-stream'),
          moderationStatus,
          sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined,
        },
      ];
    });
  }

  private fromMediaAsset(asset: PrismaMediaAsset): MediaAsset {
    return {
      id: asset.id,
      tenantId: asset.tenantId,
      ownerType: mediaOwnerTypes.includes(asset.ownerType as MediaOwnerType)
        ? (asset.ownerType as MediaOwnerType)
        : 'CONVERSATION',
      ownerId: asset.ownerId,
      kind: mediaAssetKinds.includes(asset.kind as MediaAssetKind)
        ? (asset.kind as MediaAssetKind)
        : 'IMAGE',
      status: mediaAssetStatuses.includes(asset.status as MediaAssetStatus)
        ? (asset.status as MediaAssetStatus)
        : 'READY_FOR_PREVIEW',
      sourceUrl: asset.sourceUrl,
      thumbnailUrl: asset.thumbnailUrl ?? undefined,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSizeBytes: asset.fileSizeBytes,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      durationSeconds: asset.durationSeconds ?? undefined,
      caption: asset.caption ?? undefined,
      altText: asset.altText ?? undefined,
      displayOrder: asset.displayOrder,
      visibility: mediaVisibilityStates.includes(asset.visibility as MediaVisibility)
        ? (asset.visibility as MediaVisibility)
        : 'TENANT_ONLY',
      moderationStatus: mediaModerationStatuses.includes(asset.moderationStatus as MediaModerationStatus)
        ? (asset.moderationStatus as MediaModerationStatus)
        : 'PENDING',
      moderationReason: asset.moderationReason ?? undefined,
      storageProvider: asset.storageProvider ?? undefined,
      objectKey: asset.objectKey ?? undefined,
      cdnUrl: asset.cdnUrl ?? undefined,
      transformStatus: mediaTransformStatuses.includes(asset.transformStatus as MediaTransformStatus)
        ? (asset.transformStatus as MediaTransformStatus)
        : undefined,
      uploadedAt: asset.uploadedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }
}
