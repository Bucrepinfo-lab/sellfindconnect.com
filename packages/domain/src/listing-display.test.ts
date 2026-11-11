import { describe, expect, it } from 'vitest';

import {
  isListingNew,
  listingBadges,
  listingCountdownLabel,
  listingDaysLeft,
  parseListingSortMode,
  sortListings,
} from './listing-display';

const NOW = '2026-11-11T09:00:00.000Z';

describe('listing display', () => {
  it('counts whole days left, rounded up and never negative', () => {
    expect(listingDaysLeft('2026-11-14T09:00:00.000Z', NOW)).toBe(3);
    expect(listingDaysLeft('2026-11-11T21:00:00.000Z', NOW)).toBe(1);
    expect(listingDaysLeft('2026-11-01T09:00:00.000Z', NOW)).toBe(0);
    expect(listingDaysLeft('not a date', NOW)).toBeUndefined();
  });

  it('words the countdown plainly', () => {
    expect(listingCountdownLabel(0)).toBe('Ends today');
    expect(listingCountdownLabel(1)).toBe('1 day left');
    expect(listingCountdownLabel(5)).toBe('5 days left');
  });

  it('calls a listing new for its first 7 days only', () => {
    expect(isListingNew('2026-11-05T09:00:00.000Z', NOW)).toBe(true);
    expect(isListingNew('2026-11-03T09:00:00.000Z', NOW)).toBe(false);
    expect(isListingNew('2026-11-12T09:00:00.000Z', NOW)).toBe(false);
  });

  it('builds badges only from real listing data, in a fixed order', () => {
    expect(
      listingBadges(
        { publishedAt: '2026-11-10T09:00:00.000Z', expiresAt: '2026-11-13T09:00:00.000Z', boosted: true, media: [1, 2] },
        NOW,
      ),
    ).toEqual([
      { kind: 'FEATURED', label: 'Featured' },
      { kind: 'NEW', label: 'New' },
      { kind: 'PHOTOS', label: '2 photos' },
      { kind: 'ENDING', label: '2 days left' },
    ]);
    expect(listingBadges({ publishedAt: '2026-10-01T09:00:00.000Z', expiresAt: '2026-12-30T09:00:00.000Z' }, NOW)).toEqual([]);
  });

  it('sorts without changing the input', () => {
    const a = { id: 'a', publishedAt: '2026-11-01T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z' };
    const b = { id: 'b', publishedAt: '2026-11-09T00:00:00.000Z', expiresAt: '2026-11-20T00:00:00.000Z' };
    const c = { id: 'c', publishedAt: 'bad', expiresAt: 'bad' };
    const input = [a, b, c];
    expect(sortListings(input, 'BEST').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sortListings(input, 'NEWEST').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(sortListings(input, 'ENDING_SOON').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(input.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to best match for an unknown sort', () => {
    expect(parseListingSortMode('newest')).toBe('NEWEST');
    expect(parseListingSortMode('ending-soon')).toBe('ENDING_SOON');
    expect(parseListingSortMode('popular')).toBe('BEST');
    expect(parseListingSortMode(undefined)).toBe('BEST');
  });
});
