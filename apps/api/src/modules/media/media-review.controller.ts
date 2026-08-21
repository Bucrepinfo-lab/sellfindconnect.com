import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAuthSession } from '../access/platform-access.decorator';
import { PlatformModerationGuard } from '../access/platform-moderation.guard';
import type { PlatformAccessSession } from '../auth/auth.records';
import {
  AssignMediaReviewCaseDto,
  ListMediaReviewCasesDto,
  PreviewMediaEscalationPlaybookDto,
  ResolveMediaReviewCaseDto,
} from './dto/media-review.dto';
import { MediaReviewService } from './media-review.service';

@ApiTags('media-review')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active MODERATE_CONTENT platform access assignment. MFA is required.',
})
@UseGuards(PlatformModerationGuard)
@Controller('platform/media')
export class MediaReviewController {
  constructor(private readonly reviews: MediaReviewService) {}

  @Get('reviews')
  listCases(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Query() query: ListMediaReviewCasesDto,
  ) {
    return this.reviews.listCases(query, session);
  }

  @Get('reviews/:id')
  getCase(@PlatformAuthSession() session: PlatformAccessSession, @Param('id') id: string) {
    return this.reviews.getCase(id, session);
  }

  @Get('escalation-playbooks')
  previewEscalationPlaybook(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Query() query: PreviewMediaEscalationPlaybookDto,
  ) {
    return this.reviews.previewEscalationPlaybook(query, session);
  }

  @Post('reviews/:id/assign')
  assignCase(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: AssignMediaReviewCaseDto,
  ) {
    return this.reviews.assignCase(id, body, session);
  }

  @Post('reviews/:id/resolve')
  resolveCase(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: ResolveMediaReviewCaseDto,
  ) {
    return this.reviews.resolveCase(id, body, session);
  }

  @Post('reviews/:id/reopen')
  reopenCase(@PlatformAuthSession() session: PlatformAccessSession, @Param('id') id: string) {
    return this.reviews.reopenCase(id, session);
  }
}
