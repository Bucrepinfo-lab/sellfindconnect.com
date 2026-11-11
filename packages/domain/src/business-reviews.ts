import { evaluateSafetyText, type SafetyDecision } from './safety';
import { sanitizeText } from './sanitization';

/**
 * Ratings and reviews of a business, written by another signed-in business
 * (owner-approved 11/11/26). One review per reviewing business per business,
 * editable by its writer; comments pass the zero-tolerance safety check;
 * moderators can hide a review, and editing never un-hides it.
 */

export const businessReviewStatuses = ['VISIBLE', 'HIDDEN'] as const;
export type BusinessReviewStatus = (typeof businessReviewStatuses)[number];

export const BUSINESS_REVIEW_MIN_RATING = 1;
export const BUSINESS_REVIEW_MAX_RATING = 5;
export const BUSINESS_REVIEW_COMMENT_MAX = 600;

export type BusinessReviewInput = {
  rating: number;
  comment?: string;
  acceptedTerms: true;
};

export type BusinessReview = {
  id: string;
  /** The business being reviewed. */
  tenantId: string;
  reviewerTenantId: string;
  reviewerUserId: string;
  rating: number;
  comment?: string;
  status: BusinessReviewStatus;
  hiddenReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicBusinessReview = {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  edited: boolean;
};

export type BusinessRatingSummary = {
  /** Average of visible ratings, one decimal place; null when there are none. */
  average: number | null;
  count: number;
  /** Counts for 1★ to 5★, in that order. */
  distribution: [number, number, number, number, number];
};

export class BusinessReviewError extends Error {
  safety?: SafetyDecision;

  constructor(message: string, safety?: SafetyDecision) {
    super(message);
    this.name = 'BusinessReviewError';
    this.safety = safety;
  }
}

export type BusinessReviewActor = {
  tenantId: string;
  userId: string;
};

/** Create a review, or update the writer's existing one for the same business. */
export function writeBusinessReview(
  input: BusinessReviewInput,
  actor: BusinessReviewActor,
  businessTenantId: string,
  id: string,
  existing?: BusinessReview,
  now = new Date().toISOString(),
): BusinessReview {
  if (input.acceptedTerms !== true) {
    throw new BusinessReviewError('Current terms acceptance is required before reviewing.');
  }
  const tenantId = businessTenantId.trim();
  if (!tenantId) {
    throw new BusinessReviewError('Choose the business to review.');
  }
  if (tenantId === actor.tenantId) {
    throw new BusinessReviewError('You cannot review your own business.');
  }
  if (
    !Number.isInteger(input.rating) ||
    input.rating < BUSINESS_REVIEW_MIN_RATING ||
    input.rating > BUSINESS_REVIEW_MAX_RATING
  ) {
    throw new BusinessReviewError('Rating must be a whole number from 1 to 5.');
  }
  const comment = input.comment?.trim()
    ? sanitizeText(input.comment, { maxLength: BUSINESS_REVIEW_COMMENT_MAX })
    : undefined;
  if (comment) {
    const safety = evaluateSafetyText(comment);
    if (!safety.allowed) {
      throw new BusinessReviewError('Your review contains blocked content.', safety);
    }
  }

  if (existing) {
    if (existing.tenantId !== tenantId || existing.reviewerTenantId !== actor.tenantId) {
      throw new BusinessReviewError('That review belongs to someone else.');
    }
    return {
      ...existing,
      reviewerUserId: actor.userId,
      rating: input.rating,
      comment,
      updatedAt: now,
    };
  }

  return {
    id,
    tenantId,
    reviewerTenantId: actor.tenantId,
    reviewerUserId: actor.userId,
    rating: input.rating,
    comment,
    status: 'VISIBLE',
    createdAt: now,
    updatedAt: now,
  };
}

export function hideBusinessReview(
  review: BusinessReview,
  reason: string,
  now = new Date().toISOString(),
): BusinessReview {
  const hiddenReason = sanitizeText(reason, { maxLength: 200 }) || 'Hidden by a moderator.';
  return { ...review, status: 'HIDDEN', hiddenReason, updatedAt: now };
}

export function restoreBusinessReview(
  review: BusinessReview,
  now = new Date().toISOString(),
): BusinessReview {
  const restored: BusinessReview = { ...review, status: 'VISIBLE', updatedAt: now };
  delete restored.hiddenReason;
  return restored;
}

export function summarizeBusinessReviews(reviews: readonly BusinessReview[]): BusinessRatingSummary {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let total = 0;
  let count = 0;
  for (const review of reviews) {
    if (review.status !== 'VISIBLE') continue;
    const index = review.rating - 1;
    if (index < 0 || index > 4) continue;
    distribution[index] += 1;
    total += review.rating;
    count += 1;
  }
  return {
    average: count ? Math.round((total / count) * 10) / 10 : null,
    count,
    distribution,
  };
}

/** What anyone may see: no reviewer ids, no moderation notes. */
export function presentPublicBusinessReview(review: BusinessReview): PublicBusinessReview {
  return {
    id: review.id,
    rating: review.rating,
    ...(review.comment ? { comment: review.comment } : {}),
    createdAt: review.createdAt,
    edited: review.updatedAt !== review.createdAt,
  };
}

/** Newest visible reviews first. */
export function publicBusinessReviews(
  reviews: readonly BusinessReview[],
  limit = 20,
): PublicBusinessReview[] {
  return reviews
    .filter((review) => review.status === 'VISIBLE')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, Math.max(0, limit))
    .map(presentPublicBusinessReview);
}

/** "4.5 (12 reviews)" / "No reviews yet". */
export function formatRatingSummary(summary: Pick<BusinessRatingSummary, 'average' | 'count'>): string {
  if (!summary.count || summary.average === null) return 'No reviews yet';
  const noun = summary.count === 1 ? 'review' : 'reviews';
  return `${summary.average.toFixed(1)} (${summary.count} ${noun})`;
}
