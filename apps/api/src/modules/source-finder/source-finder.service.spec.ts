import { describe, expect, it } from 'vitest';

import { SourceFinderService } from './source-finder.service';

describe('SourceFinderService', () => {
  it('returns explainable ranked results', () => {
    const service = new SourceFinderService();
    const response = service.search({
      query: 'fresh produce',
      countryCode: 'KE',
      sortBy: 'RELEVANCE',
    });

    expect(response.total).toBeGreaterThan(0);
    expect(response.results[0]?.id).toBe('r1');
    expect(response.results[0]?.reasonCodes).toContain('OFFER_MATCH');
    expect(response.results[0]?.relatedLinks.length).toBeGreaterThan(0);
  });

  it('finds likely buyers through declared needs', () => {
    const service = new SourceFinderService();
    const response = service.search({
      query: 'fresh produce',
      role: 'BUYER',
      countryCode: 'KE',
    });

    expect(response.total).toBe(1);
    expect(response.results[0]?.id).toBe('r3');
    expect(response.results[0]?.reasonCodes).toContain('NEED_MATCH');
  });

  it('blocks prohibited source finder searches', () => {
    const service = new SourceFinderService();

    expect(() =>
      service.search({
        query: 'ammunition supplier',
        countryCode: 'KE',
      }),
    ).toThrow();
  });

  it('rejects unsupported countries and industries', () => {
    const service = new SourceFinderService();

    expect(() => service.search({ query: 'fresh produce', countryCode: 'ZZ' })).toThrow();
    expect(() =>
      service.search({ query: 'fresh produce', countryCode: 'KE', industryCode: 'UNKNOWN' }),
    ).toThrow();
  });
});
