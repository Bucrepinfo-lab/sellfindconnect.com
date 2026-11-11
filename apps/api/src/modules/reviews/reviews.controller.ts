import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { PlatformAuthSession } from '../access/platform-access.decorator';
import { PlatformModerationGuard } from '../access/platform-moderation.guard';
import type { PlatformAccessSession } from '../auth/auth.records';
import { TenantAuthSession, TenantId } from '../tenant/tenant-context.decorator';
import { TenantSessionGuard, type TenantSessionDecision } from '../tenant/tenant-session.guard';
import {
  HideBusinessReviewDto,
  PublicReviewListQueryDto,
  WriteBusinessReviewDto,
} from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiHeader({ name: 'x-tenant-id', description: 'Tenant UUID of the reviewing business.' })
@ApiHeader({
  name: 'x-session-token',
  description: 'Issued owner session token. MFA must be verified before writing reviews.',
})
@UseGuards(TenantSessionGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  write(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: WriteBusinessReviewDto,
  ) {
    return this.reviews.writeReview(tenantId, session.userId, body);
  }

  @Get('written')
  listWritten(@TenantId() tenantId: string) {
    return this.reviews.listWritten(tenantId);
  }

  @Get('received')
  listReceived(@TenantId() tenantId: string) {
    return this.reviews.listReceived(tenantId);
  }

  @Delete(':businessTenantId')
  withdraw(
    @TenantId() tenantId: string,
    @TenantAuthSession() session: TenantSessionDecision,
    @Param('businessTenantId') businessTenantId: string,
  ) {
    return this.reviews.withdrawReview(tenantId, session.userId, businessTenantId);
  }
}

@ApiTags('public-reviews')
@Controller('public/businesses')
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':tenantId/reviews')
  list(@Param('tenantId') tenantId: string, @Query() query: PublicReviewListQueryDto) {
    return this.reviews.getPublicReviews(tenantId, query.limit ?? 20);
  }
}

@ApiTags('reviews-moderation')
@ApiHeader({
  name: 'x-session-token',
  description:
    'Issued session token for a user with an active MODERATE_CONTENT platform access assignment. MFA is required.',
})
@UseGuards(PlatformModerationGuard)
@Controller('platform/reviews')
export class ReviewsModerationController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list() {
    return this.reviews.listForModeration();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return (await this.reviews.findForModeration(id)) ?? null;
  }

  @Post(':id/hide')
  hide(
    @PlatformAuthSession() session: PlatformAccessSession,
    @Param('id') id: string,
    @Body() body: HideBusinessReviewDto,
  ) {
    return this.reviews.hideReview(id, session.userId, body.reason);
  }

  @Post(':id/restore')
  restore(@PlatformAuthSession() session: PlatformAccessSession, @Param('id') id: string) {
    return this.reviews.restoreReview(id, session.userId);
  }
}
