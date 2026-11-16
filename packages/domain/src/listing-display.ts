/**
 * How a public listing is presented in search results: badges, the "days
 * left" countdown and the sort order. Pure and clock-injected so web and API
 * agree and tests are stable. Every badge comes from real listing data.
 */
export type ListingSortMode = 'BEST' | 'NEWEST' | 'MOST_VIEWED' | 'MOST_ASKED' | 'ENDING_SOON';

export const listingSortModes: Array<{ mode: ListingSortMode; label: string }> = [
  { mode: 'BEST', label: 'Best match' },
  { mode: 'NEWEST', label: 'Newest' },
  { mode: 'MOST_VIEWED', label: 'Most viewed' },
  { mode: 'MOST_ASKED', label: 'Most asked' },
  { mode: 'ENDING_SOON', label: 'Ending soon' },
];

export type ListingForDisplay = {
  publishedAt: string;
  expiresAt: string;
  boosted?: boolean;
  media?: ReadonlyArray<unknown>;
  stats?: { views: number; enquiries: number };
};

export type ListingBadgeKind = 'FEATURED' | 'NEW' | 'PHOTOS' | 'ENDING';
export type ListingBadge = { kind: ListingBadgeKind; label: string };

const DAY_MS = 24 * 60 * 60 * 1000;
export const LISTING_NEW_DAYS = 7;
export const LISTING_ENDING_DAYS = 7;

const time = (value: string): number | undefined => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Whole days until the listing ends (rounded up, never below 0); undefined for a bad date. */
export function listingDaysLeft(expiresAt: string, now: Date | string = new Date()): number | undefined {
  const end = time(expiresAt);
  const current = typeof now === 'string' ? time(now) : now.getTime();
  if (end === undefined || current === undefined) return undefined;
  return Math.max(0, Math.ceil((end - current) / DAY_MS));
}

export function listingCountdownLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Ends today';
  return daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
}

export function isListingNew(publishedAt: string, now: Date | string = new Date()): boolean {
  const start = time(publishedAt);
  const current = typeof now === 'string' ? time(now) : now.getTime();
  if (start === undefined || current === undefined) return false;
  const age = current - start;
  return age >= 0 && age <= LISTING_NEW_DAYS * DAY_MS;
}

/** Badges in display order: Featured, New, Photos, then the countdown when the end is near. */
export function listingBadges(listing: ListingForDisplay, now: Date | string = new Date()): ListingBadge[] {
  const badges: ListingBadge[] = [];
  if (listing.boosted) badges.push({ kind: 'FEATURED', label: 'Featured' });
  if (isListingNew(listing.publishedAt, now)) badges.push({ kind: 'NEW', label: 'New' });
  const photos = listing.media?.length ?? 0;
  if (photos > 0) badges.push({ kind: 'PHOTOS', label: photos === 1 ? '1 photo' : `${photos} photos` });
  const daysLeft = listingDaysLeft(listing.expiresAt, now);
  if (daysLeft !== undefined && daysLeft <= LISTING_ENDING_DAYS) {
    badges.push({ kind: 'ENDING', label: listingCountdownLabel(daysLeft) });
  }
  return badges;
}

/**
 * BEST keeps the order the search returned (already ranked). NEWEST puts the
 * latest first; MOST_VIEWED and MOST_ASKED the highest public view or
 * enquiry count first; ENDING_SOON the nearest end date first. Bad dates go last.
 * Returns a new array.
 */
export function sortListings<T extends ListingForDisplay>(listings: ReadonlyArray<T>, mode: ListingSortMode): T[] {
  const copy = [...listings];
  if (mode === 'NEWEST') {
    return copy.sort((left, right) => (time(right.publishedAt) ?? -Infinity) - (time(left.publishedAt) ?? -Infinity));
  }
  if (mode === 'MOST_VIEWED' || mode === 'MOST_ASKED') {
    const count = (item: ListingForDisplay) =>
      (mode === 'MOST_VIEWED' ? item.stats?.views : item.stats?.enquiries) ?? 0;
    // Stable: ties keep the best-match order.
    return copy
      .map((item, index) => ({ item, index }))
      .sort((left, right) => count(right.item) - count(left.item) || left.index - right.index)
      .map(({ item }) => item);
  }
  if (mode === 'ENDING_SOON') {
    return copy.sort((left, right) => (time(left.expiresAt) ?? Infinity) - (time(right.expiresAt) ?? Infinity));
  }
  return copy;
}

export function parseListingSortMode(value: string | undefined | null): ListingSortMode {
  const wanted = (value ?? '').trim().toUpperCase().replace(/-/g, '_');
  return listingSortModes.some((item) => item.mode === wanted) ? (wanted as ListingSortMode) : 'BEST';
}
