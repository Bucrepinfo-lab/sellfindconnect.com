import { describe, expect, it } from 'vitest';

import { isInsideKenya, kenyaCountyHeadquarters, nearestKenyaCounty } from './kenya-county-locator';
import { findKenyaCounty, kenyaCounties } from './kenya-places';

describe('nearest county from a position', () => {
  it('has one headquarters for each of the 47 counties', () => {
    expect(kenyaCountyHeadquarters).toHaveLength(47);
    expect(new Set(kenyaCountyHeadquarters.map((item) => item.county)).size).toBe(47);
    for (const item of kenyaCountyHeadquarters) {
      expect(findKenyaCounty(item.county), item.county).toBeDefined();
      expect(isInsideKenya(item.lat, item.lon), item.county).toBe(true);
    }
    expect(kenyaCounties.every((county) => kenyaCountyHeadquarters.some((item) => item.county === county.name))).toBe(true);
  });

  it('finds the county for positions in well-known towns', () => {
    expect(nearestKenyaCounty(-1.2864, 36.8172)?.name).toBe('Nairobi');
    expect(nearestKenyaCounty(-4.0435, 39.6682)?.name).toBe('Mombasa');
    expect(nearestKenyaCounty(-0.0917, 34.768)?.name).toBe('Kisumu');
    expect(nearestKenyaCounty(0.5143, 35.2698)?.name).toBe('Uasin Gishu');
    expect(nearestKenyaCounty(-0.3031, 36.08)?.name).toBe('Nakuru');
  });

  it('returns nothing outside Kenya', () => {
    expect(nearestKenyaCounty(-6.79, 39.21)).toBeUndefined();
    expect(nearestKenyaCounty(0.3476, 32.5825)).toBeUndefined();
    expect(nearestKenyaCounty(Number.NaN, 36.8)).toBeUndefined();
  });
});
