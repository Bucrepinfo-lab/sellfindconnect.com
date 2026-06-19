import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import {
  CreateProfileDraftDto,
  PublishProfileDraftDto,
  ReviewProfileDraftDto,
  UpdateProfileDraftDto,
} from './dto/create-profile-draft.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant UUID for the authenticated owner session.',
})
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before profile routes are available.',
})
@UseGuards(TenantSessionGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post('drafts')
  createDraft(@TenantId() tenantId: string, @Body() body: CreateProfileDraftDto) {
    return this.profiles.createDraft(tenantId, body);
  }

  @Get('drafts/:id')
  getDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.profiles.getDraft(tenantId, id);
  }

  @Patch('drafts/:id')
  updateDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: UpdateProfileDraftDto,
  ) {
    return this.profiles.updateDraft(tenantId, id, body, session.userId);
  }

  @Post('drafts/:id/preview')
  previewDraft(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.profiles.previewDraft(tenantId, id);
  }

  @Get('reviews/pending')
  listPendingReviews(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
  ) {
    return this.profiles.listPendingReviews(tenantId, session.userId, session.role);
  }

  @Post('drafts/:id/review')
  reviewDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: ReviewProfileDraftDto,
  ) {
    return this.profiles.reviewDraft(tenantId, id, body, session.userId, session.role);
  }

  @Post('drafts/:id/publish')
  publishDraft(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('id') id: string,
    @Body() body: PublishProfileDraftDto,
  ) {
    return this.profiles.publishDraft(tenantId, id, body, session.userId);
  }

  @Get('published/live')
  getLiveProfile(@TenantId() tenantId: string) {
    return this.profiles.getLiveProfile(tenantId);
  }

  @Get('published')
  listPublishedProfiles(@TenantId() tenantId: string) {
    return this.profiles.listPublishedProfiles(tenantId);
  }
}
