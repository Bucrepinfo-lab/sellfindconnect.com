import type { BusinessReview } from '@telpen/domain';

export const REVIEWS_REPOSITORY = Symbol('REVIEWS_REPOSITORY');

export type ReviewsRepository = {
  save(review: BusinessReview): Promise<void>;
  findById(id: string): Promise<BusinessReview | undefined>;
  findByReviewer(tenantId: string, reviewerTenantId: string): Promise<BusinessReview | undefined>;
  delete(id: string): Promise<void>;
  listForBusiness(tenantId: string): Promise<BusinessReview[]>;
  listByReviewer(reviewerTenantId: string): Promise<BusinessReview[]>;
  listForBusinesses(tenantIds: string[]): Promise<BusinessReview[]>;
  listRecent(limit: number): Promise<BusinessReview[]>;
};
