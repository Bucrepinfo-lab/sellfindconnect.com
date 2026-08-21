import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import {
  CreateSavedSourceFinderSearchDto,
  RecordSourceFinderOutcomeDto,
  RebuildSourceFinderIndexDto,
  RunSourceFinderOpportunityAlertsDto,
  SearchSourceFinderDto,
} from './dto/search-source-finder.dto';
import { SourceFinderService } from './source-finder.service';

@ApiTags('source-finder')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued owner session token. MFA must be verified before Source Finder routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('source-finder')
export class SourceFinderController {
  constructor(private readonly sourceFinder: SourceFinderService) {}

  @Post('search')
  search(@TenantId() tenantId: string, @Body() body: SearchSourceFinderDto) {
    return this.sourceFinder.search(body, tenantId);
  }

  @Post('index/reindex')
  rebuildIndex(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: RebuildSourceFinderIndexDto,
  ) {
    return this.sourceFinder.rebuildIndex(body, session.userId, tenantId);
  }

  @Get('index')
  listIndex() {
    return this.sourceFinder.listIndex();
  }

  @Post('saved-searches')
  createSavedSearch(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateSavedSourceFinderSearchDto,
  ) {
    return this.sourceFinder.createSavedSearch(tenantId, body, session.userId);
  }

  @Get('saved-searches')
  listSavedSearches(@TenantId() tenantId: string) {
    return this.sourceFinder.listSavedSearches(tenantId);
  }

  @Get('alerts')
  listOpportunityAlerts(@TenantId() tenantId: string) {
    return this.sourceFinder.listOpportunityAlerts(tenantId);
  }

  @Post('alerts/run')
  runOpportunityAlerts(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: RunSourceFinderOpportunityAlertsDto,
  ) {
    return this.sourceFinder.runOpportunityAlerts(tenantId, body, session.userId);
  }

  @Post('outcomes')
  recordOutcome(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: RecordSourceFinderOutcomeDto,
  ) {
    return this.sourceFinder.recordOutcome(tenantId, body, session.userId);
  }

  @Get('outcomes')
  listOutcomeFeedback(@TenantId() tenantId: string) {
    return this.sourceFinder.listOutcomeFeedback(tenantId);
  }
}
