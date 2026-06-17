import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantContextGuard } from '../tenant/tenant-context.guard';
import { CreateInquiryDto, CreateMatchFeedbackDto, UpdateLeadStatusDto } from './dto/leads.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID. Temporary local-development tenant scope until auth is added.',
})
@UseGuards(TenantContextGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('match-feedback')
  recordMatchFeedback(@TenantId() tenantId: string, @Body() body: CreateMatchFeedbackDto) {
    return this.leads.recordMatchFeedback(tenantId, body);
  }

  @Get('match-feedback')
  listMatchFeedback(@TenantId() tenantId: string) {
    return this.leads.listMatchFeedback(tenantId);
  }

  @Post('inquiries')
  createInquiry(@TenantId() tenantId: string, @Body() body: CreateInquiryDto) {
    return this.leads.createInquiry(tenantId, body);
  }

  @Get()
  listLeads(@TenantId() tenantId: string) {
    return this.leads.listLeads(tenantId);
  }

  @Patch(':leadId/status')
  updateLeadStatus(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() body: UpdateLeadStatusDto,
  ) {
    return this.leads.updateLeadStatus(tenantId, leadId, body);
  }
}
