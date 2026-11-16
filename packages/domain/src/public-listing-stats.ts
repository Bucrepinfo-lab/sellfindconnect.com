/**
 * Anonymous, public counts for a listing: how many visitors opened it and how
 * many tapped to contact the business. Counted once per visitor per listing
 * per window; nothing that identifies the visitor is stored.
 */
export const publicListingEventTypes = ['VIEW', 'INQUIRY'] as const;
export type PublicListingEventType = (typeof publicListingEventTypes)[number];

export type PublicListingStats = { views: number; enquiries: number };

/** Counts cover this many days, so old listings do not dominate. */
export const PUBLIC_LISTING_STATS_DAYS = 90;
/** The same visitor counts again for the same listing only after this long. */
export const PUBLIC_LISTING_DEDUPE_MINUTES = 30;
/** Most public events one visitor may send per minute, across all listings. */
export const PUBLIC_LISTING_MAX_EVENTS_PER_MINUTE = 60;

type Clock = () => number;

/**
 * In-memory guard for public counters: drops repeats from the same visitor
 * and caps bursts. Keys are hashed by the caller and kept only in memory.
 */
export class PublicListingEventGate {
  private readonly seen = new Map<string, number>();
  private readonly bursts = new Map<string, { start: number; count: number }>();

  constructor(private readonly now: Clock = () => Date.now()) {}

  /** True when this event should be counted. */
  allow(visitorKey: string, listingId: string, eventType: PublicListingEventType): boolean {
    const now = this.now();
    this.sweep(now);
    const burst = this.bursts.get(visitorKey);
    if (!burst || now - burst.start >= 60_000) {
      this.bursts.set(visitorKey, { start: now, count: 1 });
    } else {
      burst.count += 1;
      if (burst.count > PUBLIC_LISTING_MAX_EVENTS_PER_MINUTE) return false;
    }
    const key = `${visitorKey}|${listingId}|${eventType}`;
    const last = this.seen.get(key);
    if (last !== undefined && now - last < PUBLIC_LISTING_DEDUPE_MINUTES * 60_000) return false;
    this.seen.set(key, now);
    return true;
  }

  private sweep(now: number): void {
    if (this.seen.size < 5000) return;
    for (const [key, at] of this.seen) {
      if (now - at >= PUBLIC_LISTING_DEDUPE_MINUTES * 60_000) this.seen.delete(key);
    }
    for (const [key, burst] of this.bursts) {
      if (now - burst.start >= 60_000) this.bursts.delete(key);
    }
  }
}

/** "1.2k views": short, plain counts for cards. */
export function formatPublicCount(value: number, singular: string, plural: string): string {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const word = safe === 1 ? singular : plural;
  if (safe < 1000) return `${safe} ${word}`;
  const thousands = safe / 1000;
  return `${thousands >= 10 ? Math.floor(thousands) : Math.floor(thousands * 10) / 10}k ${word}`;
}
