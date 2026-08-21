import { describe, expect, it } from 'vitest';

import {
  buildOpportunityAlert,
  createSavedSourceFinderSearch,
  isOpportunityAlertDue,
  searchSourceFinderRecords,
  selectOpportunityMatches,
} from './source-finder';

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

describe('source finder saved searches and opportunity alerts', () => {
  const search = createSavedSourceFinderSearch(
    {
      name: 'Fresh produce buyers',
      query: 'fresh produce',
      role: 'BUYER',
      countryCode: 'KE',
      alertFrequency: 'DAILY',
    },
    { tenantId: 'tenant-1', id: 'saved-1' },
    '2026-08-21T08:00:00.000Z',
  );

  it('creates a named saved search and waits for the daily cadence after a run', () => {
    expect(search.query).toBe('fresh produce');
    expect(isOpportunityAlertDue(search, '2026-08-21T08:00:00.000Z')).toBe(true);
    expect(
      isOpportunityAlertDue(
        { ...search, lastAlertedAt: '2026-08-21T08:00:00.000Z' },
        '2026-08-21T12:00:00.000Z',
      ),
    ).toBe(false);
    expect(
      isOpportunityAlertDue(
        { ...search, lastAlertedAt: '2026-08-21T08:00:00.000Z' },
        '2026-08-22T08:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('builds a de-duplicable opportunity alert from a high-scoring match', () => {
    const results = searchSourceFinderRecords({
      query: search.query,
      role: search.role,
      countryCode: search.countryCode,
      sortBy: 'RELEVANCE',
    });
    const matches = selectOpportunityMatches(results, 3);
    const alert = buildOpportunityAlert(
      search,
      matches[0]!,
      'alert-1',
      '2026-08-21T08:01:00.000Z',
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(alert.sourceRecordId).toBe(matches[0]?.id);
    expect(alert.title).toContain('Opportunity');
    expect(alert.score).toBeGreaterThanOrEqual(40);
  });
});
