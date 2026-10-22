import { Injectable } from '@nestjs/common';
import {
  ConversationPresenceRegistry,
  buildConversationRealtimeEvent,
  conversationRealtimeRoom,
  emptyConversationPresenceSnapshot,
  httpConversationPresenceConnectionId,
  tenantPresenceRoom,
  type ConversationParticipantRole,
  type ConversationPresenceSnapshot,
  type ConversationRealtimeEvent,
  type ConversationRealtimeEventType,
} from '@telpen/domain';

export type ConversationsRealtimeEmitter = {
  emitToRoom(room: string, event: string, payload: unknown): void;
};

@Injectable()
export class ConversationsRealtimeService {
  private emitter: ConversationsRealtimeEmitter | undefined;
  private readonly presence = new ConversationPresenceRegistry();

  attachEmitter(emitter: ConversationsRealtimeEmitter): void {
    this.emitter = emitter;
  }

  connect(input: {
    connectionId: string;
    userId: string;
    tenantId: string;
    conversationId?: string;
    participantRole: ConversationParticipantRole;
    nowIso?: string;
  }) {
    const connection = this.presence.connect(input);
    this.publishPresence(connection.tenantId, connection.conversationId, input.nowIso);
    return connection;
  }

  heartbeat(connectionId: string, nowIso?: string) {
    const connection = this.presence.heartbeat(connectionId, nowIso);
    this.publishPresence(connection.tenantId, connection.conversationId, nowIso);
    return connection;
  }

  disconnect(connectionId: string, nowIso?: string) {
    const connection = this.presence.disconnect(connectionId);
    if (connection) {
      this.publishPresence(connection.tenantId, connection.conversationId, nowIso);
    }
    return connection;
  }

  snapshot(
    tenantId: string,
    conversationId: string,
    nowIso?: string,
  ): ConversationPresenceSnapshot {
    return this.presence.snapshot(tenantId, conversationId, nowIso);
  }

  emptySnapshot(tenantId: string, conversationId: string): ConversationPresenceSnapshot {
    return emptyConversationPresenceSnapshot(tenantId, conversationId);
  }

  httpConnectionId(userId: string, conversationId: string): string {
    return httpConversationPresenceConnectionId(userId, conversationId);
  }

  publish<T>(event: ConversationRealtimeEvent<T>): ConversationRealtimeEvent<T> {
    if (event.conversationId) {
      this.emitter?.emitToRoom(
        conversationRealtimeRoom(event.tenantId, event.conversationId),
        event.type,
        event,
      );
    }

    if (event.type === 'conversation.presence' || event.type === 'conversation.connected') {
      this.emitter?.emitToRoom(tenantPresenceRoom(event.tenantId), event.type, event);
    }

    return event;
  }

  publishEvent<T>(input: {
    type: ConversationRealtimeEventType;
    tenantId: string;
    conversationId?: string;
    payload: T;
    occurredAt?: string;
  }): ConversationRealtimeEvent<T> {
    return this.publish(buildConversationRealtimeEvent(input));
  }

  private publishPresence(tenantId: string, conversationId?: string, nowIso?: string) {
    if (!conversationId) {
      this.publishEvent({
        type: 'conversation.presence',
        tenantId,
        occurredAt: nowIso,
        payload: { tenantId, online: true },
      });
      return;
    }

    this.publishEvent({
      type: 'conversation.presence',
      tenantId,
      conversationId,
      occurredAt: nowIso,
      payload: this.snapshot(tenantId, conversationId, nowIso),
    });
  }
}
