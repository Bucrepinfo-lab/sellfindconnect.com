import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { RequireTenantPermission } from '../../common/tenant-permission.guard';
import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { AdvertDescriptionService } from './advert-description.service';
import { AdvertsService } from './adverts.service';
import {
  BoostAdvertDto,
  CreateAdvertDto,
  CreateAdvertMediaDto,
  CreateSavedAdvertSearchDto,
  DraftAdvertDescriptionDto,
  DuplicateAdvertDto,
  PrepareAdvertMediaUploadDto,
  PublicAdvertSearchDto,
  PublishAdvertDraftDto,
  RecordAdvertDiscoveryEventDto,
  RecordPublicListingEventDto,
  RenewAdvertDto,
  RunAdvertLifecycleDto,
  RunSavedAdvertSearchAlertsDto,
  UpdateAdvertDraftDto,
} from './dto/create-advert.dto';

@ApiTags('adverts')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued owner session token. MFA must be verified before advert routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('adverts')
export class AdvertsController {
  constructor(
    private readonly adverts: AdvertsService,
    private readonly descriptions: AdvertDescriptionService,
  ) {}

  /** "Write it for me": a draft title and description; the business edits before publishing. */
  @Post('description-draft')
  @RequireTenantPermission('MANAGE_LISTINGS')
  draftDescription(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: DraftAdvertDescriptionDto,
  ) {
    return this.descriptions.draft(tenantId, session.userId, body);
  }

  @Post()
  @RequireTenantPermission('MANAGE_LISTINGS')
  createAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateAdvertDto,
  ) {
    return this.adverts.createAdvert(tenantId, body, session.userId);
  }

  @Post('drafts')
  @RequireTenantPermission('MANAGE_LISTINGS')
  createDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateAdvertDto,
  ) {
    return this.adverts.createDraft(tenantId, body, session.userId);
  }

  @Get('drafts')
  listDrafts(@TenantId() tenantId: string) {
    return this.adverts.listDrafts(tenantId);
  }

  @Get('drafts/:id')
  getDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.getDraft(tenantId, id);
  }

  @Patch('drafts/:id')
  @RequireTenantPermission('MANAGE_LISTINGS')
  updateDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: UpdateAdvertDraftDto,
  ) {
    return this.adverts.updateDraft(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/duplicate')
  @RequireTenantPermission('MANAGE_LISTINGS')
  duplicateDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: DuplicateAdvertDto,
  ) {
    return this.adverts.duplicateDraft(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/preview')
  previewDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.previewDraft(tenantId, id);
  }

  @Post('drafts/:id/publish')
  @RequireTenantPermission('MANAGE_LISTINGS')
  publishDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PublishAdvertDraftDto,
  ) {
    return this.adverts.publishDraft(tenantId, id, body, session.userId);
  }

  @Get()
  listAdverts(@TenantId() tenantId: string) {
    return this.adverts.listAdverts(tenantId);
  }

  @Get('notifications')
  listNotifications(@TenantId() tenantId: string) {
    return this.adverts.listNotifications(tenantId);
  }

  @Post('discovery/reindex')
  @RequireTenantPermission('MANAGE_LISTINGS')
  rebuildDiscoveryIndex(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
  ) {
    return this.adverts.rebuildDiscoveryIndex(tenantId, session.userId);
  }

  @Post('saved-searches')
  @RequireTenantPermission('MANAGE_LEADS')
  createSavedSearch(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateSavedAdvertSearchDto,
  ) {
    return this.adverts.createSavedSearch(tenantId, body, session.userId);
  }

  @Get('saved-searches')
  listSavedSearches(@TenantId() tenantId: string) {
    return this.adverts.listSavedSearches(tenantId);
  }

  @Post('saved-searches/alerts/run')
  @RequireTenantPermission('MANAGE_LEADS')
  runSavedSearchAlerts(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: RunSavedAdvertSearchAlertsDto,
  ) {
    return this.adverts.runSavedSearchAlerts(tenantId, body, session.userId);
  }

  @Get('discovery/alerts')
  listDiscoveryAlerts(@TenantId() tenantId: string) {
    return this.adverts.listDiscoveryAlerts(tenantId);
  }

  @Post('discovery/events')
  recordDiscoveryEvent(@TenantId() tenantId: string, @Body() body: RecordAdvertDiscoveryEventDto) {
    return this.adverts.recordDiscoveryEvent(tenantId, body);
  }

  @Get(':id/media')
  listAdvertMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.listAdvertMedia(tenantId, id);
  }

  @Get('drafts/:id/media')
  listDraftMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.listDraftMedia(tenantId, id);
  }

  @Post('drafts/:id/media/uploads/prepare')
  @RequireTenantPermission('MANAGE_LISTINGS')
  prepareDraftMediaUpload(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PrepareAdvertMediaUploadDto,
  ) {
    return this.adverts.prepareDraftMediaUpload(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/media')
  @RequireTenantPermission('MANAGE_LISTINGS')
  addDraftMedia(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CreateAdvertMediaDto,
  ) {
    return this.adverts.addDraftMedia(tenantId, id, body, session.userId);
  }

  @Post(':id/media/uploads/prepare')
  @RequireTenantPermission('MANAGE_LISTINGS')
  prepareAdvertMediaUpload(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PrepareAdvertMediaUploadDto,
  ) {
    return this.adverts.prepareAdvertMediaUpload(tenantId, id, body, session.userId);
  }

  @Post(':id/media')
  @RequireTenantPermission('MANAGE_LISTINGS')
  addAdvertMedia(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CreateAdvertMediaDto,
  ) {
    return this.adverts.addAdvertMedia(tenantId, id, body, session.userId);
  }

  @Post(':id/pause')
  @RequireTenantPermission('MANAGE_LISTINGS')
  pauseAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.adverts.pauseAdvert(tenantId, id, session.userId);
  }

  @Post(':id/archive')
  @RequireTenantPermission('MANAGE_LISTINGS')
  archiveAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.adverts.archiveAdvert(tenantId, id, session.userId);
  }

  @Post(':id/duplicate')
  @RequireTenantPermission('MANAGE_LISTINGS')
  duplicateAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: DuplicateAdvertDto,
  ) {
    return this.adverts.duplicateAdvert(tenantId, id, body, session.userId);
  }

  @Post(':id/edit')
  @RequireTenantPermission('MANAGE_LISTINGS')
  editAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.adverts.editAdvert(tenantId, id, session.userId);
  }

  @Post(':id/renew')
  @RequireTenantPermission('MANAGE_LISTINGS')
  renewAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: RenewAdvertDto,
  ) {
    return this.adverts.renewAdvert(tenantId, id, body, session.userId);
  }

  @Post(':id/boost')
  @RequireTenantPermission('MANAGE_LISTINGS')
  boostAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: BoostAdvertDto,
  ) {
    return this.adverts.boostAdvert(tenantId, id, body, session.userId);
  }

  @Post('lifecycle/run')
  @RequireTenantPermission('MANAGE_LISTINGS')
  runLifecycle(@TenantId() tenantId: string, @Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runLifecycle(tenantId, body);
  }
}

@ApiTags('public-adverts')
@Controller('public/adverts')
export class PublicAdvertsController {
  constructor(private readonly adverts: AdvertsService) {}

  @Get('search')
  search(@Query() query: PublicAdvertSearchDto) {
    return this.adverts.searchPublicAdverts(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adverts.getPublicAdvert(id);
  }

  /** Anonymous view / contact-tap counter. Always 204; repeats are dropped quietly. */
  @Post(':id/events')
  @HttpCode(204)
  async recordEvent(@Param('id') id: string, @Body() body: RecordPublicListingEventDto, @Req() request: Request) {
    const visitor =
      request.header('fly-client-ip') ??
      request.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.ip ??
      'unknown';
    await this.adverts.recordPublicListingEvent(id, body.eventType, `${visitor}|${request.header('user-agent') ?? ''}`);
  }
}
