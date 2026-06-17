import { describe, expect, it } from 'vitest';

import { searchSourceFinderRecords } from './source-finder';

describe('source finder ranking', () => {
  it('ranks supplier records by commercial search relevance', () => {
    const results = searchSourceFinderRecords({
      query: 'fresh produce',
      countryCode: 'KE',
      sortBy: 'RELEVANCE',
    });

    expect(results[0]?.id).toBe('r1');
    expect(results[0]?.reasonCodes).toContain('OFFER_MATCH');
    expect(results[0]?.reasonCodes).toContain('RELATIONSHIP_LINKS');
  });

  it('finds likely buyers through needs as well as offers', () => {
    const results = searchSourceFinderRecords({
      query: 'fresh produce',
      role: 'BUYER',
      countryCode: 'KE',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('r3');
    expect(results[0]?.reasonCodes).toContain('NEED_MATCH');
    expect(results[0]?.reasonCodes).toContain('ROLE_MATCH');
  });

  it('sorts by most visited when requested', () => {
    const results = searchSourceFinderRecords({
      query: '',
      countryCode: 'KE',
      sortBy: 'MOST_VISITED',
    });

    expect(results.map((result) => result.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('filters by industry and role', () => {
    const results = searchSourceFinderRecords({
      query: 'packaging',
      countryCode: 'KE',
      industryCode: 'MANUFACTURING',
      role: 'PRODUCER',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('r4');
    expect(results[0]?.score).toBeGreaterThan(50);
  });
});
