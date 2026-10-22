import { Injectable } from '@nestjs/common';
import type {
  ConversationMessage,
  ConversationNotification,
  ConversationNotificationType,
  ConversationRecord,
  MediaAsset,
} from '@telpen/domain';

import type { ConversationsRepository } from './conversations.repository';

@Injectable()
export class InMemoryConversationsRepository implements ConversationsRepository {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, ConversationMessage[]>();
  private readonly notifications = new Map<string, ConversationNotification>();
  private readonly slaAlertKeys = new Set<string>();
  private readonly mediaAssets = new Map<string, MediaAsset>();

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

  createMediaAsset(asset: MediaAsset): void {
    this.mediaAssets.set(this.key(asset.tenantId, asset.id), asset);
  }

  findMediaAsset(
    tenantId: string,
    conversationId: string,
    mediaId: string,
  ): MediaAsset | undefined {
    const asset = this.mediaAssets.get(this.key(tenantId, mediaId));
    if (!asset || asset.ownerType !== 'CONVERSATION' || asset.ownerId !== conversationId) {
      return undefined;
    }

    return asset;
  }

  listMediaAssets(tenantId: string, conversationId: string): MediaAsset[] {
    return Array.from(this.mediaAssets.values())
      .filter(
        (asset) =>
          asset.tenantId === tenantId &&
          asset.ownerType === 'CONVERSATION' &&
          asset.ownerId === conversationId &&
          asset.status !== 'BLOCKED' &&
          asset.status !== 'ARCHIVED',
      )
      .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt));
  }

  eraseTenantHoldings(tenantId: string): { conversations: number; media: number } {
    let conversations = 0;
    let media = 0;
    for (const [key, conversation] of this.conversations) {
      if (conversation.tenantId === tenantId) {
        this.conversations.delete(key);
        conversations += 1;
      }
    }
    for (const key of this.messages.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.messages.delete(key);
      }
    }
    for (const [key, notification] of this.notifications) {
      if (notification.tenantId === tenantId) {
        this.notifications.delete(key);
      }
    }
    for (const [key, asset] of this.mediaAssets) {
      if (asset.tenantId === tenantId) {
        this.mediaAssets.delete(key);
        media += 1;
      }
    }
    for (const key of [...this.slaAlertKeys]) {
      if (key.startsWith(`${tenantId}:`)) {
        this.slaAlertKeys.delete(key);
      }
    }
    return { conversations, media };
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
