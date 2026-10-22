import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAuthSession } from '../access/platform-access.decorator';
import { PlatformModerationGuard } from '../access/platform-moderation.guard';
import type { PlatformAccessSession } from '../auth/auth.records';
import { ReviewProfileDraftDto } from './dto/create-profile-draft.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profile-moderation')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active MODERATE_CONTENT platform access assignment. MFA is required.',
})
@UseGuards(PlatformModerationGuard)
@Controller('platform/profiles')
export class ProfileModerationController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('reviews/pending')
  listPendingReviews(@PlatformAuthSession() session: PlatformAccessSession) {
    return this.profiles.listPlatformPendingReviews(session);
  }

  @Post('tenants/:tenantId/drafts/:id/review')
  reviewDraft(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: ReviewProfileDraftDto,
  ) {
    return this.profiles.platformReviewDraft(tenantId, id, body, session);
  }
}
