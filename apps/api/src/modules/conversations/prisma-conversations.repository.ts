import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type Conversation as PrismaConversation,
  type ConversationMessage as PrismaConversationMessage,
  type ConversationNotification as PrismaConversationNotification,
  type ConversationNotificationType as PrismaConversationNotificationType,
  type ConversationParticipantRole as PrismaParticipantRole,
  type ConversationStatus as PrismaConversationStatus,
} from '@prisma/client';
import {
  conversationNotificationTypes,
  conversationParticipantRoles,
  conversationStatuses,
  inquiryTypes,
  messageDeliveryStatuses,
  type ConversationMessage,
  type ConversationNotification,
  type ConversationNotificationType,
  type ConversationParticipantRole,
  type ConversationRecord,
  type ConversationStatus,
  type InquiryType,
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
}
