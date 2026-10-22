import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAnalyticsGuard } from '../access/platform-analytics.guard';
import { PlatformAuthSession } from '../access/platform-access.decorator';
import type { PlatformAccessSession } from '../auth/auth.records';
import { TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard } from '../tenant/tenant-session.guard';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsExportQueryDto,
  AnalyticsSummaryQueryDto,
  CreateAnalyticsEventDto,
  PlatformAnalyticsQueryDto,
} from './dto/create-analytics-event.dto';

@ApiTags('analytics')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued owner session token. MFA must be verified before analytics routes are available.',
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

  @Get('report')
  buildTenantReport(@TenantId() tenantId: string, @Query() query: AnalyticsSummaryQueryDto) {
    return this.analytics.buildTenantReport(tenantId, query);
  }

  @Get('export')
  exportTenantReport(@TenantId() tenantId: string, @Query() query: AnalyticsExportQueryDto) {
    return this.analytics.exportTenantReport(tenantId, query);
  }
}

@ApiTags('platform-analytics')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active VIEW_ANALYTICS platform access assignment. MFA is required when the assigned role requires it.',
})
@UseGuards(PlatformAnalyticsGuard)
@Controller('platform/analytics')
export class PlatformAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('hierarchy')
  buildHierarchyReport(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Query() query: PlatformAnalyticsQueryDto,
  ) {
    return this.analytics.buildHierarchyReport(session, query);
  }

  @Get('hierarchy/export')
  exportHierarchyReport(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Query() query: PlatformAnalyticsQueryDto,
  ) {
    return this.analytics.exportHierarchyReport(session, query);
  }
}
