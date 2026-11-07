import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { RequireTenantPermission } from '../../common/tenant-permission.guard';
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
  @RequireTenantPermission('CHAT_WITH_LEADS')
  createConversation(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateConversationDto,
  ) {
    return this.conversations.createConversation(tenantId, body, session.userId);
  }

  @Get()
  @RequireTenantPermission('CHAT_WITH_LEADS')
  listConversations(@TenantId() tenantId: string) {
    return this.conversations.listConversations(tenantId);
  }

  @Get('notifications')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  listNotifications(@TenantId() tenantId: string) {
    return this.conversations.listNotifications(tenantId);
  }

  @Post('sla/run')
  @RequireTenantPermission('MANAGE_LEADS')
  runSlaChecks(@TenantId() tenantId: string, @Body() body: RunConversationSlaDto) {
    return this.conversations.runSlaChecks(tenantId, body);
  }

  @Get(':conversationId')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  getConversation(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.getConversation(tenantId, conversationId);
  }

  @Get(':conversationId/messages')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  listMessages(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.listMessages(tenantId, conversationId);
  }

  @Get(':conversationId/media')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  listMedia(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.listMedia(tenantId, conversationId);
  }

  @Post(':conversationId/media/prepare')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  prepareMediaUpload(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: PrepareConversationMediaUploadDto,
  ) {
    return this.conversations.prepareMediaUpload(tenantId, conversationId, body);
  }

  @Post(':conversationId/media')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  addMedia(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: CreateConversationMediaDto,
  ) {
    return this.conversations.addMedia(tenantId, conversationId, body);
  }

  @Post(':conversationId/messages')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  sendMessage(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Body() body: SendConversationMessageDto,
  ) {
    return this.conversations.sendMessage(tenantId, conversationId, body, session.userId);
  }

  @Post(':conversationId/messages/:messageId/delivered')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  markDelivered(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.conversations.markDelivered(tenantId, conversationId, messageId, session.userId);
  }

  @Post(':conversationId/messages/:messageId/read')
  @RequireTenantPermission('CHAT_WITH_LEADS')
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
  @RequireTenantPermission('CHAT_WITH_LEADS')
  markThreadDelivered(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversations.markThreadDelivered(tenantId, conversationId);
  }

  @Post(':conversationId/receipts/read')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  markThreadRead(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: ConversationReceiptDto,
  ) {
    return this.conversations.markThreadRead(tenantId, conversationId, body.readerRole);
  }

  @Post(':conversationId/typing')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  recordTyping(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: ConversationTypingDto,
  ) {
    return this.conversations.recordTyping(tenantId, conversationId, body.typingRole);
  }

  @Get(':conversationId/presence')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  getPresence(@TenantId() tenantId: string, @Param('conversationId') conversationId: string) {
    return this.conversations.getPresence(tenantId, conversationId);
  }

  @Post(':conversationId/presence')
  @RequireTenantPermission('CHAT_WITH_LEADS')
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
  @RequireTenantPermission('MANAGE_LEADS')
  assignConversation(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: AssignConversationDto,
  ) {
    return this.conversations.assignConversation(tenantId, conversationId, body);
  }

  @Patch(':conversationId/status')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: UpdateConversationStatusDto,
  ) {
    return this.conversations.updateStatus(tenantId, conversationId, body);
  }
}
