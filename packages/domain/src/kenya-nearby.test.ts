import { describe, expect, it } from 'vitest';

import {
  businessDirectionsUrl,
  countiesByDistance,
  countyDistanceKm,
  nearbyDistanceLabel,
  placeProximity,
  placeProximityLabel,
  sortByNearestCounty,
  sortByNearestPlace,
} from './kenya-nearby';

describe('county-to-county distance', () => {
  it('is zero within a county and unknown for an unknown county', () => {
    expect(countyDistanceKm('Nairobi', 'nairobi')).toBe(0);
    expect(countyDistanceKm('Nairobi', 'Atlantis')).toBeUndefined();
    expect(countyDistanceKm(undefined, 'Nairobi')).toBeUndefined();
  });

  it('puts Kiambu nearer Nairobi than Mombasa', () => {
    const kiambu = countyDistanceKm('Nairobi', 'Kiambu') ?? Infinity;
    const mombasa = countyDistanceKm('Nairobi', 'Mombasa') ?? 0;
    expect(kiambu).toBeLessThan(40);
    expect(mombasa).toBeGreaterThan(400);
  });

  it('lists the other 46 counties nearest first', () => {
    const list = countiesByDistance('Nairobi');
    expect(list).toHaveLength(46);
    expect(list[0]?.county).toBe('Kiambu');
    expect(list.every((item, i) => i === 0 || (list[i - 1]?.km ?? 0) <= item.km)).toBe(true);
    expect(countiesByDistance('Atlantis')).toEqual([]);
  });
});

describe('nearest first', () => {
  it('same county first, then by distance, unknown places last, ties keep best match', () => {
    const rows = [
      { id: 'msa', location: { county: 'Mombasa' } },
      { id: 'none' },
      { id: 'nbo-1', location: { county: 'Nairobi' } },
      { id: 'kbu', location: { county: 'Kiambu' } },
      { id: 'nbo-2', location: { county: 'Nairobi' } },
    ];
    const sorted = sortByNearestCounty(rows, 'Nairobi');
    expect(sorted.map((row) => row.id)).toEqual(['nbo-1', 'nbo-2', 'kbu', 'msa', 'none']);
    expect(sorted[0]?.distanceKm).toBe(0);
    expect(sorted[4]?.distanceKm).toBeUndefined();
    expect(rows[0]?.id).toBe('msa'); // input untouched
  });
});

describe('labels and directions', () => {
  it('labels distance honestly (county-level, rounded)', () => {
    expect(nearbyDistanceLabel(0, 'Nairobi')).toBe('In Nairobi');
    expect(nearbyDistanceLabel(2, 'Nairobi')).toBe('About 5 km from Nairobi');
    expect(nearbyDistanceLabel(43, 'Nairobi')).toBe('About 45 km from Nairobi');
    expect(nearbyDistanceLabel(undefined, 'Nairobi')).toBeUndefined();
    expect(nearbyDistanceLabel(10, '')).toBeUndefined();
  });

  it('builds directions from the business place only', () => {
    const url = businessDirectionsUrl({ county: 'Nairobi', constituency: 'Starehe', ward: 'Nairobi Central', landmark: 'Gikomba Market' });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Gikomba%20Market%2C%20Nairobi%20Central%2C%20Starehe%2C%20Nairobi%2C%20Kenya',
    );
    expect(businessDirectionsUrl({ landmark: 'Somewhere' })).toBeUndefined();
    expect(businessDirectionsUrl(undefined)).toBeUndefined();
  });
});

describe('constituency and ward precision', () => {
  const me = { county: 'Mombasa', constituency: 'Nyali', ward: 'Kongowea' };

  it('tiers: same ward, same constituency, same county, other county, unknown', () => {
    expect(placeProximity(me, { county: 'mombasa', constituency: 'NYALI', ward: 'kongowea' }).tier).toBe(0);
    expect(placeProximity(me, { county: 'Mombasa', constituency: 'Nyali', ward: 'Frere Town' }).tier).toBe(1);
    expect(placeProximity(me, { county: 'Mombasa', constituency: 'Kisauni' }).tier).toBe(2);
    expect(placeProximity(me, { county: 'Kilifi' }).tier).toBe(3);
    expect(placeProximity(me, undefined).tier).toBe(4);
  });

  it('a ward name only counts inside the same constituency', () => {
    // Searcher without a ward: same constituency is tier 1, never 0.
    expect(placeProximity({ county: 'Mombasa', constituency: 'Nyali' }, { county: 'Mombasa', constituency: 'Nyali', ward: 'Kongowea' }).tier).toBe(1);
  });

  it('ranks the shop next door above one across the county, ties keep best match', () => {
    const rows = [
      { id: 'kilifi', location: { county: 'Kilifi' } },
      { id: 'kisauni', location: { county: 'Mombasa', constituency: 'Kisauni' } },
      { id: 'nyali-other', location: { county: 'Mombasa', constituency: 'Nyali', ward: 'Frere Town' } },
      { id: 'none' },
      { id: 'next-door', location: { county: 'Mombasa', constituency: 'Nyali', ward: 'Kongowea' } },
      { id: 'county-only', location: { county: 'Mombasa' } },
    ];
    expect(sortByNearestPlace(rows, me).map((row) => row.id)).toEqual([
      'next-door',
      'nyali-other',
      'kisauni',
      'county-only',
      'kilifi',
      'none',
    ]);
    // County-only sort keeps all Mombasa rows level (the old behaviour).
    expect(sortByNearestCounty(rows, 'Mombasa').slice(0, 4).map((row) => row.id)).toEqual([
      'kisauni',
      'nyali-other',
      'next-door',
      'county-only',
    ]);
  });

  it('labels name the most specific shared place', () => {
    expect(placeProximityLabel({ tier: 0, distanceKm: 0 }, me)).toBe('In Kongowea ward');
    expect(placeProximityLabel({ tier: 1, distanceKm: 0 }, me)).toBe('In Nyali constituency');
    expect(placeProximityLabel({ tier: 2, distanceKm: 0 }, me)).toBe('In Mombasa');
    expect(placeProximityLabel({ tier: 3, distanceKm: 61 }, me)).toBe('About 60 km from Mombasa');
    expect(placeProximityLabel({ tier: 4, distanceKm: undefined }, me)).toBeUndefined();
  });
});

