import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { ConversationsService } from './conversations.service';
import {
  AssignConversationDto,
  ConversationPresenceHeartbeatDto,
  ConversationReceiptDto,
  ConversationTypingDto,
  CreateConversationDto,
  CreateConversationMediaDto,
  PrepareConversationMediaUploadDto,
  RunConversationSlaDto,
  SendConversationMessageDto,
  UpdateConversationStatusDto,
} from './dto/conversations.dto';

@ApiTags('conversations')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before conversation routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  createConversation(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateConversationDto,
  ) {
    return this.conversations.createConversation(tenantId, body, session.userId);
  }

  @Get()
  listConversations(@TenantId() tenantId: string) {
    return this.conversations.listConversations(tenantId);
  }

  @Get('notifications')
  listNotifications(@TenantId() tenantId: string) {
    return this.conversations.listNotifications(tenantId);
  }

  @Post('sla/run')
  runSlaChecks(@TenantId() tenantId: string, @Body() body: RunConversationSlaDto) {
    return this.conversations.runSlaChecks(tenantId, body);
  }

  @Get(':conversationId')
  getConversation(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.getConversation(tenantId, conversationId);
  }

  @Get(':conversationId/messages')
  listMessages(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.listMessages(tenantId, conversationId);
  }

  @Get(':conversationId/media')
  listMedia(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.listMedia(tenantId, conversationId);
  }

  @Post(':conversationId/media/prepare')
  prepareMediaUpload(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: PrepareConversationMediaUploadDto,
  ) {
    return this.conversations.prepareMediaUpload(tenantId, conversationId, body);
  }

  @Post(':conversationId/media')
  addMedia(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: CreateConversationMediaDto,
  ) {
    return this.conversations.addMedia(tenantId, conversationId, body);
  }

  @Post(':conversationId/messages')
  sendMessage(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Body() body: SendConversationMessageDto,
  ) {
    return this.conversations.sendMessage(tenantId, conversationId, body, session.userId);
  }

  @Post(':conversationId/messages/:messageId/delivered')
  markDelivered(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.conversations.markDelivered(tenantId, conversationId, messageId, session.userId);
  }

  @Post(':conversationId/messages/:messageId/read')
  markRead(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: ConversationReceiptDto,
  ) {
    return this.conversations.markRead(
      tenantId,
      conversationId,
      messageId,
      body.readerRole,
      session.userId,
    );
  }

  @Post(':conversationId/receipts/delivered')
  markThreadDelivered(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversations.markThreadDelivered(tenantId, conversationId);
  }

  @Post(':conversationId/receipts/read')
  markThreadRead(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: ConversationReceiptDto,
  ) {
    return this.conversations.markThreadRead(tenantId, conversationId, body.readerRole);
  }

  @Post(':conversationId/typing')
  recordTyping(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: ConversationTypingDto,
  ) {
    return this.conversations.recordTyping(tenantId, conversationId, body.typingRole);
  }

  @Get(':conversationId/presence')
  getPresence(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.getPresence(tenantId, conversationId);
  }

  @Post(':conversationId/presence')
  recordPresence(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Body() body: ConversationPresenceHeartbeatDto,
  ) {
    return this.conversations.recordPresence(tenantId, conversationId, {
      userId: session.userId,
      participantRole: body.participantRole,
      now: body.now,
    });
  }

  @Patch(':conversationId/assignment')
  assignConversation(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: AssignConversationDto,
  ) {
    return this.conversations.assignConversation(tenantId, conversationId, body);
  }

  @Patch(':conversationId/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: UpdateConversationStatusDto,
  ) {
    return this.conversations.updateStatus(tenantId, conversationId, body);
  }
}
