/**
 * "Where can I get it?" (owner 28/11/26, precision): while someone types what
 * they need, show the counties that really have a live advert for it, with
 * counts, before they choose a place. Built only from real search results —
 * nothing is guessed: a county appears only if a matching business is there.
 */

export type AvailabilityInput = {
  location?: { county?: string | null } | null;
};

export type AvailabilityPlace = { county: string; count: number };

export type AvailabilitySummary = {
  /** All matching live adverts, wherever they are. */
  total: number;
  /** Counties that have at least one match, most matches first, then A–Z. */
  places: AvailabilityPlace[];
  /** Matches whose business has not set a county yet. */
  unplaced: number;
};

export function summarizeAvailability(results: readonly AvailabilityInput[]): AvailabilitySummary {
  const counts = new Map<string, number>();
  let unplaced = 0;
  for (const item of results) {
    const county = item.location?.county?.trim();
    if (!county) {
      unplaced += 1;
      continue;
    }
    counts.set(county, (counts.get(county) ?? 0) + 1);
  }
  const places = [...counts.entries()]
    .map(([county, count]) => ({ county, count }))
    .sort((left, right) => right.count - left.count || left.county.localeCompare(right.county));
  return { total: results.length, places, unplaced };
}

/** One plain sentence for the summary, e.g. "Beans: 5 businesses in 3 counties." */
export function availabilityHeadline(query: string, summary: AvailabilitySummary): string {
  const what = query.trim();
  if (summary.total === 0) return `No business has “${what}” yet.`;
  const businesses = `${summary.total} ${summary.total === 1 ? 'business' : 'businesses'}`;
  if (summary.places.length === 0) return `“${what}”: ${businesses} in Kenya.`;
  const counties = `${summary.places.length} ${summary.places.length === 1 ? 'county' : 'counties'}`;
  return `“${what}”: ${businesses} in ${counties}.`;
}
