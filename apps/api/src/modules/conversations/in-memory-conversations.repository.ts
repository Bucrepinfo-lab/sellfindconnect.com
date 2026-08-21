import { Injectable } from '@nestjs/common';
import type {
  ConversationMessage,
  ConversationNotification,
  ConversationNotificationType,
  ConversationRecord,
} from '@telpen/domain';

import type { ConversationsRepository } from './conversations.repository';

@Injectable()
export class InMemoryConversationsRepository implements ConversationsRepository {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, ConversationMessage[]>();
  private readonly notifications = new Map<string, ConversationNotification>();
  private readonly slaAlertKeys = new Set<string>();

  createConversation(conversation: ConversationRecord): void {
    this.conversations.set(this.key(conversation.tenantId, conversation.id), conversation);
  }

  updateConversation(conversation: ConversationRecord): void {
    this.conversations.set(this.key(conversation.tenantId, conversation.id), conversation);
  }

  findConversation(tenantId: string, id: string): ConversationRecord | undefined {
    return this.conversations.get(this.key(tenantId, id));
  }

  listConversations(tenantId: string): ConversationRecord[] {
    return Array.from(this.conversations.values())
      .filter((conversation) => conversation.tenantId === tenantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listAllConversations(): ConversationRecord[] {
    return Array.from(this.conversations.values());
  }

  createMessage(message: ConversationMessage): void {
    const key = this.messageKey(message.tenantId, message.conversationId);
    const existing = this.messages.get(key) ?? [];
    existing.push(message);
    this.messages.set(key, existing);
  }

  updateMessage(message: ConversationMessage): void {
    const key = this.messageKey(message.tenantId, message.conversationId);
    const existing = this.messages.get(key) ?? [];
    this.messages.set(
      key,
      existing.map((item) => (item.id === message.id ? message : item)),
    );
  }

  findMessage(
    tenantId: string,
    conversationId: string,
    messageId: string,
  ): ConversationMessage | undefined {
    return this.listMessages(tenantId, conversationId).find((item) => item.id === messageId);
  }

  listMessages(tenantId: string, conversationId: string): ConversationMessage[] {
    return [...(this.messages.get(this.messageKey(tenantId, conversationId)) ?? [])].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  createNotification(notification: ConversationNotification): void {
    this.notifications.set(this.key(notification.tenantId, notification.id), notification);
  }

  listNotifications(tenantId: string): ConversationNotification[] {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  hasSlaAlert(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): boolean {
    return this.slaAlertKeys.has(this.slaKey(tenantId, conversationId, type, dueAt));
  }

  rememberSlaAlert(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): void {
    this.slaAlertKeys.add(this.slaKey(tenantId, conversationId, type, dueAt));
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private messageKey(tenantId: string, conversationId: string): string {
    return `${tenantId}:conversation:${conversationId}`;
  }

  private slaKey(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): string {
    return `${tenantId}:${conversationId}:${type}:${dueAt}`;
  }
}
