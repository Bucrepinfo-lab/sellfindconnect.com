import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { ConversationsService } from './conversations.service';
import {
  AssignConversationDto,
  CreateConversationDto,
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
  createConversation(@TenantId() tenantId: string, @Body() body: CreateConversationDto) {
    return this.conversations.createConversation(tenantId, body);
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

  @Post(':conversationId/messages')
  sendMessage(
    @TenantId() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: SendConversationMessageDto,
  ) {
    return this.conversations.sendMessage(tenantId, conversationId, body);
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
