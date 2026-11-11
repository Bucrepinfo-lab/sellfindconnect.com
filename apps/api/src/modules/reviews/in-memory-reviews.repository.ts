import type { BusinessReview } from '@telpen/domain';

import type { ReviewsRepository } from './reviews.repository';

export class InMemoryReviewsRepository implements ReviewsRepository {
  private readonly reviews = new Map<string, BusinessReview>();

  async save(review: BusinessReview): Promise<void> {
    this.reviews.set(review.id, review);
  }

  async findById(id: string): Promise<BusinessReview | undefined> {
    return this.reviews.get(id);
  }

  async findByReviewer(
    tenantId: string,
    reviewerTenantId: string,
  ): Promise<BusinessReview | undefined> {
    return [...this.reviews.values()].find(
      (review) => review.tenantId === tenantId && review.reviewerTenantId === reviewerTenantId,
    );
  }

  async delete(id: string): Promise<void> {
    this.reviews.delete(id);
  }

  async listForBusiness(tenantId: string): Promise<BusinessReview[]> {
    return this.newestFirst([...this.reviews.values()].filter((review) => review.tenantId === tenantId));
  }

  async listByReviewer(reviewerTenantId: string): Promise<BusinessReview[]> {
    return this.newestFirst(
      [...this.reviews.values()].filter((review) => review.reviewerTenantId === reviewerTenantId),
    );
  }

  async listForBusinesses(tenantIds: string[]): Promise<BusinessReview[]> {
    const wanted = new Set(tenantIds);
    return [...this.reviews.values()].filter((review) => wanted.has(review.tenantId));
  }

  async listRecent(limit: number): Promise<BusinessReview[]> {
    return this.newestFirst([...this.reviews.values()]).slice(0, limit);
  }

  private newestFirst(reviews: BusinessReview[]): BusinessReview[] {
    return reviews.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}
