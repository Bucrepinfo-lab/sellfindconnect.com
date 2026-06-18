import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsSummaryQueryDto,
  CreateAnalyticsEventDto,
} from './dto/create-analytics-event.dto';

@ApiTags('analytics')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before analytics routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  recordEvent(@TenantId() tenantId: string, @Body() body: CreateAnalyticsEventDto) {
    return this.analytics.recordEvent(tenantId, body);
  }

  @Get('summary')
  summarizeTenant(@TenantId() tenantId: string, @Query() query: AnalyticsSummaryQueryDto) {
    return this.analytics.summarizeTenant(tenantId, query);
  }
}
