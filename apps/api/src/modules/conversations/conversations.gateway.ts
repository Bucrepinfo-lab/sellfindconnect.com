import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  ConversationRealtimeError,
  assertConversationRealtimeSession,
  conversationRealtimeNamespace,
  conversationRealtimeRoom,
  readConversationRealtimeHandshake,
  tenantPresenceRoom,
  type ConversationParticipantRole,
} from '@telpen/domain';
import type { Server, Socket } from 'socket.io';

import { AuthService } from '../auth/auth.service';
import { ConversationsRealtimeService } from './conversations.realtime.service';
import { ConversationsService } from './conversations.service';

type ConversationSocket = Socket & {
  data: Socket['data'] & {
    realtime?: {
      tenantId: string;
      userId: string;
      conversationId?: string;
      participantRole: Exclude<ConversationParticipantRole, 'SYSTEM'>;
    };
  };
};

@WebSocketGateway({
  namespace: conversationRealtimeNamespace,
  transports: ['websocket'],
  cors: { origin: true, credentials: true },
})
export class ConversationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ConversationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly conversations: ConversationsService,
    private readonly realtime: ConversationsRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attachEmitter({
      emitToRoom: (room, event, payload) => {
        server.to(room).emit(event, payload);
      },
    });
  }

  async handleConnection(client: ConversationSocket): Promise<void> {
    try {
      const handshake = readConversationRealtimeHandshake(client.handshake);
      const session = await this.auth.checkTenantSession({
        tenantId: handshake.tenantId,
        sessionToken: handshake.sessionToken,
      });
      assertConversationRealtimeSession(session);

      if (handshake.conversationId) {
        await this.conversations.getConversation(handshake.tenantId, handshake.conversationId);
      }

      client.data.realtime = {
        tenantId: handshake.tenantId,
        userId: session.userId,
        conversationId: handshake.conversationId,
        participantRole: handshake.participantRole,
      };

      await client.join(tenantPresenceRoom(handshake.tenantId));
      if (handshake.conversationId) {
        await client.join(conversationRealtimeRoom(handshake.tenantId, handshake.conversationId));
      }

      this.realtime.connect({
        connectionId: client.id,
        userId: session.userId,
        tenantId: handshake.tenantId,
        conversationId: handshake.conversationId,
        participantRole: handshake.participantRole,
      });
      this.realtime.publishEvent({
        type: 'conversation.connected',
        tenantId: handshake.tenantId,
        conversationId: handshake.conversationId,
        payload: {
          userId: session.userId,
          participantRole: handshake.participantRole,
        },
      });
    } catch (error) {
      const message =
        error instanceof ConversationRealtimeError || error instanceof Error
          ? error.message
          : 'Conversation socket authorization failed.';
      this.logger.warn(`Rejected conversation socket ${client.id}: ${message}`);
      client.emit('conversation.error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ConversationSocket): void {
    this.realtime.disconnect(client.id);
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: ConversationSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const session = this.requireSocketSession(client);
    const conversationId = body.conversationId?.trim();
    if (!conversationId) {
      throw new WsException('A conversation id is required.');
    }

    await this.conversations.getConversation(session.tenantId, conversationId);
    await client.join(conversationRealtimeRoom(session.tenantId, conversationId));
    session.conversationId = conversationId;
    return this.realtime.connect({
      connectionId: client.id,
      userId: session.userId,
      tenantId: session.tenantId,
      conversationId,
      participantRole: session.participantRole,
    });
  }

  @SubscribeMessage('conversation.heartbeat')
  heartbeat(@ConnectedSocket() client: ConversationSocket) {
    this.requireSocketSession(client);
    return this.realtime.heartbeat(client.id);
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(@ConnectedSocket() client: ConversationSocket) {
    const session = this.requireSocketSession(client);
    if (session.conversationId) {
      await client.leave(conversationRealtimeRoom(session.tenantId, session.conversationId));
    }
    session.conversationId = undefined;
    return this.realtime.connect({
      connectionId: client.id,
      userId: session.userId,
      tenantId: session.tenantId,
      participantRole: session.participantRole,
    });
  }

  private requireSocketSession(client: ConversationSocket) {
    const session = client.data.realtime;
    if (!session) {
      throw new WsException('Conversation socket is not authenticated.');
    }

    return session;
  }
}
