import { describe, expect, it } from 'vitest';

import { SourceFinderService } from './source-finder.service';

describe('SourceFinderService', () => {
  it('returns explainable ranked results', async () => {
    const service = new SourceFinderService();
    const response = await service.search({
      query: 'fresh produce',
      countryCode: 'KE',
      sortBy: 'RELEVANCE',
    });

    expect(response.total).toBeGreaterThan(0);
    expect(response.results[0]?.id).toBe('r1');
    expect(response.results[0]?.reasonCodes).toContain('OFFER_MATCH');
    expect(response.results[0]?.relatedLinks.length).toBeGreaterThan(0);
  });

  it('finds likely buyers through declared needs', async () => {
    const service = new SourceFinderService();
    const response = await service.search({
      query: 'fresh produce',
      role: 'BUYER',
      countryCode: 'KE',
    });

    expect(response.total).toBe(1);
    expect(response.results[0]?.id).toBe('r3');
    expect(response.results[0]?.reasonCodes).toContain('NEED_MATCH');
  });

  it('blocks prohibited source finder searches', async () => {
    const service = new SourceFinderService();

    await expect(
      service.search({
        query: 'ammunition supplier',
        countryCode: 'KE',
      }),
    ).rejects.toThrow();
  });

  it('rejects unsupported countries and industries', async () => {
    const service = new SourceFinderService();

    await expect(service.search({ query: 'fresh produce', countryCode: 'ZZ' })).rejects.toThrow();
    await expect(
      service.search({ query: 'fresh produce', countryCode: 'KE', industryCode: 'UNKNOWN' }),
    ).rejects.toThrow();
  });
});
