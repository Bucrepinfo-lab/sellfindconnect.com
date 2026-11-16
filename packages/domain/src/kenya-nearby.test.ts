import { describe, expect, it } from 'vitest';

import {
  businessDirectionsUrl,
  countiesByDistance,
  countyDistanceKm,
  nearbyDistanceLabel,
  sortByNearestCounty,
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
