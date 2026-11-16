import { describe, expect, it } from 'vitest';

import {
  BusinessReviewError,
  formatRatingSummary,
  hideBusinessReview,
  presentPublicBusinessReview,
  publicBusinessReviews,
  restoreBusinessReview,
  summarizeBusinessReviews,
  writeBusinessReview,
  type BusinessReview,
} from './business-reviews';

const reviewer = { tenantId: '11111111-1111-4111-8111-111111111111', userId: 'owner-1' };
const business = '22222222-2222-4222-8222-222222222222';
const t0 = '2026-11-11T08:00:00.000Z';
const t1 = '2026-11-12T08:00:00.000Z';

function review(rating: number, overrides: Partial<BusinessReview> = {}): BusinessReview {
  return {
    ...writeBusinessReview({ rating, acceptedTerms: true }, reviewer, business, `r${rating}`, undefined, t0),
    ...overrides,
  };
}

describe('writeBusinessReview', () => {
  it('creates a visible review with a cleaned comment', () => {
    const created = writeBusinessReview(
      { rating: 5, comment: '  Fast​ delivery to Nakuru.  ', acceptedTerms: true },
      reviewer,
      business,
      'rev-1',
      undefined,
      t0,
    );
    expect(created).toMatchObject({
      id: 'rev-1',
      tenantId: business,
      reviewerTenantId: reviewer.tenantId,
      rating: 5,
      comment: 'Fast delivery to Nakuru.',
      status: 'VISIBLE',
      createdAt: t0,
      updatedAt: t0,
    });
  });

  it('refuses self-reviews, bad ratings, missing terms and blocked content', () => {
    const write = (input: Parameters<typeof writeBusinessReview>[0], target = business) =>
      writeBusinessReview(input, reviewer, target, 'x', undefined, t0);

    expect(() => write({ rating: 4, acceptedTerms: true }, reviewer.tenantId)).toThrow(/own business/);
    expect(() => write({ rating: 0, acceptedTerms: true })).toThrow(/1 to 5/);
    expect(() => write({ rating: 6, acceptedTerms: true })).toThrow(/1 to 5/);
    expect(() => write({ rating: 3.5, acceptedTerms: true })).toThrow(/whole number/);
    expect(() => write({ rating: 4, acceptedTerms: false as true })).toThrow(/terms acceptance/);
    expect(() =>
      write({ rating: 1, comment: 'They also sell ammunition.', acceptedTerms: true }),
    ).toThrow(BusinessReviewError);
  });

  it('updates the writer’s own review in place and keeps a hidden review hidden', () => {
    const hidden = hideBusinessReview(review(2), 'Off-topic', t0);
    const edited = writeBusinessReview(
      { rating: 4, comment: 'Sorted out after a call.', acceptedTerms: true },
      reviewer,
      business,
      'ignored-new-id',
      hidden,
      t1,
    );
    expect(edited.id).toBe(hidden.id);
    expect(edited.rating).toBe(4);
    expect(edited.status).toBe('HIDDEN');
    expect(edited.createdAt).toBe(t0);
    expect(edited.updatedAt).toBe(t1);

    expect(() =>
      writeBusinessReview(
        { rating: 4, acceptedTerms: true },
        { tenantId: '33333333-3333-4333-8333-333333333333', userId: 'other' },
        business,
        'y',
        hidden,
        t1,
      ),
    ).toThrow(/someone else/);
  });
});

describe('summaries and public views', () => {
  it('averages visible ratings only, to one decimal place', () => {
    const reviews = [
      review(5, { id: 'a' }),
      review(4, { id: 'b' }),
      review(4, { id: 'c' }),
      hideBusinessReview(review(1, { id: 'd' }), 'Spam'),
    ];
    expect(summarizeBusinessReviews(reviews)).toEqual({
      average: 4.3,
      count: 3,
      distribution: [0, 0, 0, 2, 1],
    });
    expect(summarizeBusinessReviews([])).toEqual({
      average: null,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
    });
  });

  it('formats a short label', () => {
    expect(formatRatingSummary({ average: 4.3, count: 12 })).toBe('4.3 (12 reviews)');
    expect(formatRatingSummary({ average: 5, count: 1 })).toBe('5.0 (1 review)');
    expect(formatRatingSummary({ average: null, count: 0 })).toBe('No reviews yet');
  });

  it('hides reviewer identity and moderation notes from the public', () => {
    const shown = presentPublicBusinessReview({ ...review(5), comment: 'Great', updatedAt: t1 });
    expect(shown).toEqual({ id: 'r5', rating: 5, comment: 'Great', createdAt: t0, edited: true });
    expect(JSON.stringify(shown)).not.toContain(reviewer.tenantId);
  });

  it('lists newest visible reviews first and restores hidden ones', () => {
    const older = review(3, { id: 'old' });
    const newer = review(5, { id: 'new', updatedAt: t1 });
    const hidden = hideBusinessReview(review(1, { id: 'gone' }), 'Abuse', t1);
    expect(publicBusinessReviews([older, hidden, newer]).map((item) => item.id)).toEqual([
      'new',
      'old',
    ]);
    const restored = restoreBusinessReview(hidden, t1);
    expect(restored.status).toBe('VISIBLE');
    expect(restored.hiddenReason).toBeUndefined();
  });
});
