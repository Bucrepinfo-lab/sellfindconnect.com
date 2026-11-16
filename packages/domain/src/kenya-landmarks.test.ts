import { describe, expect, it } from 'vitest';

import { kenyaLandmarkKindLabel, kenyaLandmarkKinds, kenyaLandmarks, kenyaLandmarksInCounty } from './kenya-landmarks';
import { findKenyaCounty } from './kenya-places';

describe('Kenya landmarks', () => {
  it('places every landmark in a real county; only chains have none', () => {
    for (const landmark of kenyaLandmarks) {
      if (landmark.kind === 'SUPERMARKET_CHAIN') {
        expect(landmark.county, landmark.name).toBeUndefined();
      } else {
        expect(findKenyaCounty(landmark.county ?? ''), landmark.name).toBeDefined();
      }
      expect(landmark.knownFor.trim().length, landmark.name).toBeGreaterThan(0);
    }
  });

  it('never lists the same name twice in one county', () => {
    const keys = kenyaLandmarks.map((landmark) => `${landmark.county ?? ''}|${landmark.name.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has a label for every kind in use', () => {
    const kinds = new Set(kenyaLandmarkKinds.map((item) => item.kind));
    for (const landmark of kenyaLandmarks) expect(kinds.has(landmark.kind), landmark.name).toBe(true);
    expect(kenyaLandmarkKindLabel('OPEN_MARKET')).toBe('Market');
  });

  it('lists a county\'s landmarks, with chains only on request', () => {
    const mombasa = kenyaLandmarksInCounty('mombasa');
    expect(mombasa.map((item) => item.name)).toContain('Kongowea Market');
    expect(mombasa.some((item) => item.kind === 'SUPERMARKET_CHAIN')).toBe(false);
    expect(kenyaLandmarksInCounty('Mombasa', { includeChains: true }).some((item) => item.name === 'Naivas')).toBe(true);
    expect(kenyaLandmarksInCounty('Nowhere')).toEqual([]);
  });
});
