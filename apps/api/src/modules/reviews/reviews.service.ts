import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BusinessReviewError,
  hideBusinessReview,
  publicBusinessReviews,
  restoreBusinessReview,
  summarizeBusinessReviews,
  writeBusinessReview,
  type BusinessRatingSummary,
  type BusinessReview,
  type PublicBusinessReview,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { ProfilesService } from '../profiles/profiles.service';
import type { WriteBusinessReviewDto } from './dto/reviews.dto';
import { InMemoryReviewsRepository } from './in-memory-reviews.repository';
import { REVIEWS_REPOSITORY, type ReviewsRepository } from './reviews.repository';

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublicBusinessReviews = {
  summary: BusinessRatingSummary;
  reviews: PublicBusinessReview[];
};

@Injectable()
export class ReviewsService {
  constructor(
    @Optional()
    @Inject(REVIEWS_REPOSITORY)
    private readonly repository: ReviewsRepository = new InMemoryReviewsRepository(),
    @Optional() private readonly auth?: AuthService,
    @Optional() private readonly profiles?: ProfilesService,
  ) {}

  /** Write or update the signed-in business's review of another business. */
  async writeReview(
    reviewerTenantId: string,
    userId: string,
    input: WriteBusinessReviewDto,
  ): Promise<BusinessReview> {
    const businessTenantId = input.businessTenantId.trim();
    if (!uuidLike.test(businessTenantId)) {
      throw new NotFoundException('Business not found.');
    }
    const existing = await this.repository.findByReviewer(businessTenantId, reviewerTenantId);
    const review = this.runDomain(() =>
      writeBusinessReview(
        { rating: input.rating, comment: input.comment, acceptedTerms: input.acceptedTerms },
        { tenantId: reviewerTenantId, userId },
        businessTenantId,
        randomUUID(),
        existing,
      ),
    );
    if (this.profiles && !(await this.profiles.hasLiveProfile(businessTenantId))) {
      throw new NotFoundException('Business not found.');
    }
    await this.auth?.requireCurrentStoredTerms(
      userId,
      reviewerTenantId,
      'Current stored terms acceptance is required before reviewing.',
    );
    await this.repository.save(review);
    await this.auth?.recordTenantAudit({
      tenantId: reviewerTenantId,
      actorUserId: userId,
      action: 'BUSINESS_REVIEW_WRITTEN',
      entityType: 'BUSINESS_REVIEW',
      entityId: review.id,
      metadata: {
        businessTenantId,
        rating: review.rating,
        commentLength: review.comment?.length ?? 0,
        updated: Boolean(existing),
        status: review.status,
      },
    });
    return review;
  }

  async withdrawReview(
    reviewerTenantId: string,
    userId: string,
    businessTenantId: string,
  ): Promise<{ withdrawn: true }> {
    const existing = await this.repository.findByReviewer(businessTenantId.trim(), reviewerTenantId);
    if (!existing) {
      throw new NotFoundException('Review not found.');
    }
    await this.repository.delete(existing.id);
    await this.auth?.recordTenantAudit({
      tenantId: reviewerTenantId,
      actorUserId: userId,
      action: 'BUSINESS_REVIEW_WITHDRAWN',
      entityType: 'BUSINESS_REVIEW',
      entityId: existing.id,
      metadata: { businessTenantId: existing.tenantId },
    });
    return { withdrawn: true };
  }

  /** Reviews this business has written, with their moderation status. */
  async listWritten(reviewerTenantId: string): Promise<BusinessReview[]> {
    return this.repository.listByReviewer(reviewerTenantId);
  }

  /** Reviews of this business, as the public sees them, plus the summary. */
  async listReceived(tenantId: string): Promise<PublicBusinessReviews> {
    return this.getPublicReviews(tenantId, 50);
  }

  async getPublicReviews(tenantId: string, limit = 20): Promise<PublicBusinessReviews> {
    const id = tenantId.trim();
    if (!uuidLike.test(id)) {
      return { summary: summarizeBusinessReviews([]), reviews: [] };
    }
    const reviews = await this.repository.listForBusiness(id);
    return {
      summary: summarizeBusinessReviews(reviews),
      reviews: publicBusinessReviews(reviews, Math.min(50, Math.max(1, limit))),
    };
  }

  /** Average and count per business, for search results (one query for the page). */
  async summariesFor(
    tenantIds: string[],
  ): Promise<Map<string, Pick<BusinessRatingSummary, 'average' | 'count'>>> {
    const ids = [...new Set(tenantIds.filter((id) => uuidLike.test(id)))];
    const result = new Map<string, Pick<BusinessRatingSummary, 'average' | 'count'>>();
    if (ids.length === 0) return result;
    const reviews = await this.repository.listForBusinesses(ids);
    for (const id of ids) {
      const { average, count } = summarizeBusinessReviews(
        reviews.filter((review) => review.tenantId === id),
      );
      if (count > 0) result.set(id, { average, count });
    }
    return result;
  }

  async findForModeration(id: string): Promise<BusinessReview | undefined> {
    return this.repository.findById(id);
  }

  async listForModeration(limit = 100): Promise<BusinessReview[]> {
    return this.repository.listRecent(Math.min(500, Math.max(1, limit)));
  }

  async hideReview(id: string, moderatorUserId: string, reason: string): Promise<BusinessReview> {
    const existing = await this.requireReview(id);
    const hidden = hideBusinessReview(existing, reason);
    await this.repository.save(hidden);
    await this.auth?.recordTenantAudit({
      tenantId: existing.tenantId,
      actorUserId: moderatorUserId,
      action: 'BUSINESS_REVIEW_HIDDEN',
      entityType: 'BUSINESS_REVIEW',
      entityId: id,
      metadata: { reviewerTenantId: existing.reviewerTenantId, reasonLength: reason.length },
    });
    return hidden;
  }

  async restoreReview(id: string, moderatorUserId: string): Promise<BusinessReview> {
    const existing = await this.requireReview(id);
    const restored = restoreBusinessReview(existing);
    await this.repository.save(restored);
    await this.auth?.recordTenantAudit({
      tenantId: existing.tenantId,
      actorUserId: moderatorUserId,
      action: 'BUSINESS_REVIEW_RESTORED',
      entityType: 'BUSINESS_REVIEW',
      entityId: id,
      metadata: { reviewerTenantId: existing.reviewerTenantId },
    });
    return restored;
  }

  private async requireReview(id: string): Promise<BusinessReview> {
    const review = await this.repository.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found.');
    }
    return review;
  }

  private runDomain<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof BusinessReviewError) {
        throw new UnprocessableEntityException({ message: error.message, safety: error.safety });
      }
      throw error;
    }
  }
}
