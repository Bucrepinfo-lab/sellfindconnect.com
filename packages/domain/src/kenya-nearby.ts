import { kenyaCountyHeadquarters } from './kenya-county-locator';
import { findKenyaCounty } from './kenya-places';

/**
 * "Nearest first" for the Source Finder, without storing anyone's position.
 *
 * Businesses set their place as county / constituency / ward / landmark, not
 * coordinates, so distance is measured between county headquarters: the
 * searcher's county (picked, or suggested on the phone from its position)
 * and each business's county. It answers "who is closest to me" across the
 * whole country instead of stopping at a county line, and turns an empty
 * county into "here are the nearest counties that have it".
 */

export type BusinessPlace = { county?: string; constituency?: string; ward?: string; landmark?: string };

function hqOf(county: string | undefined) {
  const name = county ? findKenyaCounty(county)?.name : undefined;
  return name ? kenyaCountyHeadquarters.find((item) => item.county === name) : undefined;
}

function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Kilometres between two counties' headquarters; 0 for the same county; undefined if either is unknown. */
export function countyDistanceKm(from: string | undefined, to: string | undefined): number | undefined {
  const a = hqOf(from);
  const b = hqOf(to);
  if (!a || !b) return undefined;
  if (a.county === b.county) return 0;
  return km(a.lat, a.lon, b.lat, b.lon);
}

/** Every other county, nearest headquarters first. */
export function countiesByDistance(from: string): Array<{ county: string; km: number }> {
  const origin = hqOf(from);
  if (!origin) return [];
  return kenyaCountyHeadquarters
    .filter((item) => item.county !== origin.county)
    .map((item) => ({ county: item.county, km: km(origin.lat, origin.lon, item.lat, item.lon) }))
    .sort((left, right) => left.km - right.km);
}

/**
 * Nearest first from the searcher's county. Same county first, then by
 * distance; businesses with no place set go last. Ties keep the incoming
 * (best-match) order. Returns a new array with `distanceKm` on each item.
 */
export function sortByNearestCounty<T extends { location?: BusinessPlace }>(
  listings: ReadonlyArray<T>,
  fromCounty: string,
): Array<T & { distanceKm: number | undefined }> {
  return listings
    .map((item, index) => ({ item, index, distanceKm: countyDistanceKm(fromCounty, item.location?.county) }))
    .sort(
      (left, right) =>
        (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity) || left.index - right.index,
    )
    .map(({ item, distanceKm }) => ({ ...item, distanceKm }));
}

/**
 * "In Nairobi" / "About 15 km from Nairobi" — measured from the named county
 * (rounded to 5 km; county-to-county, so never exact).
 */
export function nearbyDistanceLabel(distanceKm: number | undefined, fromCounty: string): string | undefined {
  if (distanceKm === undefined || !fromCounty) return undefined;
  if (distanceKm === 0) return `In ${fromCounty}`;
  return `About ${Math.max(5, Math.round(distanceKm / 5) * 5)} km from ${fromCounty}`;
}

/**
 * Directions to a business from its public place (landmark, ward,
 * constituency, county). Opens the searcher's own maps app, which uses the
 * phone's position; the searcher's location is never put in the link.
 * Undefined until the business has set at least a county.
 */
export function businessDirectionsUrl(place: BusinessPlace | undefined): string | undefined {
  if (!place?.county) return undefined;
  const parts = [place.landmark, place.ward, place.constituency, place.county, 'Kenya']
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}
