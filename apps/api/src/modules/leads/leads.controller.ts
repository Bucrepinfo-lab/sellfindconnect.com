import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { RequireTenantPermission } from '../../common/tenant-permission.guard';
import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { CreateInquiryDto, CreateMatchFeedbackDto, UpdateLeadStatusDto } from './dto/leads.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before lead routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('match-feedback')
  @RequireTenantPermission('MANAGE_LEADS')
  recordMatchFeedback(@TenantId() tenantId: string, @Body() body: CreateMatchFeedbackDto) {
    return this.leads.recordMatchFeedback(tenantId, body);
  }

  @Get('match-feedback')
  @RequireTenantPermission('MANAGE_LEADS')
  listMatchFeedback(@TenantId() tenantId: string) {
    return this.leads.listMatchFeedback(tenantId);
  }

  @Post('inquiries')
  @RequireTenantPermission('CHAT_WITH_LEADS')
  createInquiry(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateInquiryDto,
  ) {
    return this.leads.createInquiry(tenantId, body, session.userId);
  }

  @Get()
  @RequireTenantPermission('MANAGE_LEADS')
  listLeads(@TenantId() tenantId: string) {
    return this.leads.listLeads(tenantId);
  }

  @Patch(':leadId/status')
  @RequireTenantPermission('MANAGE_LEADS')
  updateLeadStatus(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() body: UpdateLeadStatusDto,
  ) {
    return this.leads.updateLeadStatus(tenantId, leadId, body);
  }
}
