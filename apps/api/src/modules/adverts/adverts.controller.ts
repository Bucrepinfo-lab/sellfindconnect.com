import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import { AdvertsService } from './adverts.service';
import {
  CreateAdvertDto,
  CreateAdvertMediaDto,
  PrepareAdvertMediaUploadDto,
  PublishAdvertDraftDto,
  RenewAdvertDto,
  RunAdvertLifecycleDto,
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
  constructor(private readonly adverts: AdvertsService) {}

  @Post()
  createAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateAdvertDto,
  ) {
    return this.adverts.createAdvert(tenantId, body, session.userId);
  }

  @Post('drafts')
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
  updateDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: UpdateAdvertDraftDto,
  ) {
    return this.adverts.updateDraft(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/preview')
  previewDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.previewDraft(tenantId, id);
  }

  @Post('drafts/:id/publish')
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

  @Get(':id/media')
  listAdvertMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.listAdvertMedia(tenantId, id);
  }

  @Get('drafts/:id/media')
  listDraftMedia(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.adverts.listDraftMedia(tenantId, id);
  }

  @Post('drafts/:id/media/uploads/prepare')
  prepareDraftMediaUpload(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PrepareAdvertMediaUploadDto,
  ) {
    return this.adverts.prepareDraftMediaUpload(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/media')
  addDraftMedia(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CreateAdvertMediaDto,
  ) {
    return this.adverts.addDraftMedia(tenantId, id, body, session.userId);
  }

  @Post(':id/media/uploads/prepare')
  prepareAdvertMediaUpload(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PrepareAdvertMediaUploadDto,
  ) {
    return this.adverts.prepareAdvertMediaUpload(tenantId, id, body, session.userId);
  }

  @Post(':id/media')
  addAdvertMedia(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: CreateAdvertMediaDto,
  ) {
    return this.adverts.addAdvertMedia(tenantId, id, body, session.userId);
  }

  @Post(':id/pause')
  pauseAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.adverts.pauseAdvert(tenantId, id, session.userId);
  }

  @Post(':id/archive')
  archiveAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
  ) {
    return this.adverts.archiveAdvert(tenantId, id, session.userId);
  }

  @Post(':id/renew')
  renewAdvert(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: RenewAdvertDto,
  ) {
    return this.adverts.renewAdvert(tenantId, id, body, session.userId);
  }

  @Post('lifecycle/run')
  runLifecycle(@TenantId() tenantId: string, @Body() body: RunAdvertLifecycleDto) {
    return this.adverts.runLifecycle(tenantId, body);
  }
}
