import { describe, expect, it } from 'vitest';

import { buildLeadConversionIntelligence } from './lead-conversion';
import { searchSourceFinderRecords } from './source-finder';

describe('lead conversion intelligence', () => {
  it('creates high-priority intelligence from a strong source finder result', () => {
    const [result] = searchSourceFinderRecords({
      query: 'fresh produce',
      countryCode: 'KE',
      sortBy: 'RELEVANCE',
    });

    expect(result).toBeDefined();
    const intelligence = buildLeadConversionIntelligence(result!);

    expect(intelligence.priority).toBe('HIGH');
    expect(intelligence.confidence).toBeGreaterThanOrEqual(80);
    expect(intelligence.responseSlaHours).toBe(4);
    expect(intelligence.nextBestActions.length).toBeGreaterThan(0);
  });

  it('keeps lower-fit matches below high-priority handling', () => {
    const [result] = searchSourceFinderRecords({
      query: 'packaging',
      countryCode: 'KE',
      role: 'BUYER',
    });

    expect(result).toBeDefined();
    const intelligence = buildLeadConversionIntelligence(result!);

    expect(['LOW', 'MEDIUM']).toContain(intelligence.priority);
    expect(intelligence.responseSlaHours).toBeGreaterThanOrEqual(12);
  });
});
