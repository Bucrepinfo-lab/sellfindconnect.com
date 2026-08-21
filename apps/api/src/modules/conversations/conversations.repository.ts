import type {
  ConversationMessage,
  ConversationNotification,
  ConversationNotificationType,
  ConversationRecord,
  MediaAsset,
} from '@telpen/domain';

export const CONVERSATIONS_REPOSITORY = Symbol('CONVERSATIONS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface ConversationsRepository {
  createConversation(conversation: ConversationRecord): RepositoryResult<void>;
  updateConversation(conversation: ConversationRecord): RepositoryResult<void>;
  findConversation(tenantId: string, id: string): RepositoryResult<ConversationRecord | undefined>;
  listConversations(tenantId: string): RepositoryResult<ConversationRecord[]>;
  listAllConversations(): RepositoryResult<ConversationRecord[]>;
  createMessage(message: ConversationMessage): RepositoryResult<void>;
  updateMessage(message: ConversationMessage): RepositoryResult<void>;
  findMessage(
    tenantId: string,
    conversationId: string,
    messageId: string,
  ): RepositoryResult<ConversationMessage | undefined>;
  listMessages(tenantId: string, conversationId: string): RepositoryResult<ConversationMessage[]>;
  createNotification(notification: ConversationNotification): RepositoryResult<void>;
  listNotifications(tenantId: string): RepositoryResult<ConversationNotification[]>;
  hasSlaAlert(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): RepositoryResult<boolean>;
  rememberSlaAlert(
    tenantId: string,
    conversationId: string,
    type: ConversationNotificationType,
    dueAt: string,
  ): RepositoryResult<void>;
  createMediaAsset(asset: MediaAsset): RepositoryResult<void>;
  findMediaAsset(
    tenantId: string,
    conversationId: string,
    mediaId: string,
  ): RepositoryResult<MediaAsset | undefined>;
  listMediaAssets(tenantId: string, conversationId: string): RepositoryResult<MediaAsset[]>;
}
