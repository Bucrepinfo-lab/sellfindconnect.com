import { describe, expect, it } from 'vitest';

import { ReviewsService } from './reviews.service';

const reviewer = '11111111-1111-4111-8111-111111111111';
const otherReviewer = '33333333-3333-4333-8333-333333333333';
const business = '22222222-2222-4222-8222-222222222222';

describe('ReviewsService', () => {
  it('writes, updates and summarises one review per reviewing business', async () => {
    const service = new ReviewsService();
    const first = await service.writeReview(reviewer, 'owner-1', {
      businessTenantId: business,
      rating: 3,
      comment: 'Slow reply but good stock.',
      acceptedTerms: true,
    });
    const updated = await service.writeReview(reviewer, 'owner-1', {
      businessTenantId: business,
      rating: 5,
      acceptedTerms: true,
    });
    await service.writeReview(otherReviewer, 'owner-2', {
      businessTenantId: business,
      rating: 4,
      acceptedTerms: true,
    });

    expect(updated.id).toBe(first.id);
    const shown = await service.getPublicReviews(business);
    expect(shown.summary).toMatchObject({ average: 4.5, count: 2 });
    expect(JSON.stringify(shown.reviews)).not.toContain(reviewer);
    expect((await service.summariesFor([business, 'not-a-uuid'])).get(business)).toEqual({
      average: 4.5,
      count: 2,
    });
    expect((await service.listWritten(reviewer)).map((review) => review.rating)).toEqual([5]);
  });

  it('refuses self-reviews, unknown ids and blocked words', async () => {
    const service = new ReviewsService();
    await expect(
      service.writeReview(business, 'owner-1', {
        businessTenantId: business,
        rating: 5,
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/own business/);
    await expect(
      service.writeReview(reviewer, 'owner-1', {
        businessTenantId: 'nope',
        rating: 5,
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/not found/);
    await expect(
      service.writeReview(reviewer, 'owner-1', {
        businessTenantId: business,
        rating: 1,
        comment: 'They sell ammunition.',
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/blocked content/);
  });

  it('lets moderators hide and restore, and the writer withdraw', async () => {
    const service = new ReviewsService();
    const review = await service.writeReview(reviewer, 'owner-1', {
      businessTenantId: business,
      rating: 1,
      comment: 'Rude.',
      acceptedTerms: true,
    });

    await service.hideReview(review.id, 'mod-1', 'Reported and confirmed');
    expect((await service.getPublicReviews(business)).summary.count).toBe(0);
    expect((await service.summariesFor([business])).has(business)).toBe(false);

    // Editing does not bring a hidden review back.
    const edited = await service.writeReview(reviewer, 'owner-1', {
      businessTenantId: business,
      rating: 2,
      acceptedTerms: true,
    });
    expect(edited.status).toBe('HIDDEN');

    await service.restoreReview(review.id, 'mod-1');
    expect((await service.getPublicReviews(business)).summary.count).toBe(1);

    await service.withdrawReview(reviewer, 'owner-1', business);
    expect((await service.getPublicReviews(business)).summary.count).toBe(0);
    await expect(service.withdrawReview(reviewer, 'owner-1', business)).rejects.toThrow(/not found/);
    await expect(service.hideReview('missing', 'mod-1', 'x')).rejects.toThrow(/not found/);
  });
});
