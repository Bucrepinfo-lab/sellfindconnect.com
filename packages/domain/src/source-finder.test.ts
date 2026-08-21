import { describe, expect, it } from 'vitest';

import {
  buildOpportunityAlert,
  createSavedSourceFinderSearch,
  createSourceFinderOutcomeFeedback,
  applySourceFinderOutcomes,
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

describe('source finder outcome feedback', () => {
  it('hides reported matches and boosts consented acceptances', () => {
    const results = searchSourceFinderRecords({
      query: 'fresh produce',
      countryCode: 'KE',
      sortBy: 'RELEVANCE',
    });
    const hidden = applySourceFinderOutcomes(results, [
      createSourceFinderOutcomeFeedback(
        { sourceRecordId: 'r2', action: 'HIDE' },
        { tenantId: 'tenant-1', id: 'fb-hide' },
        '2026-08-21T09:00:00.000Z',
      ),
    ]);
    const boosted = applySourceFinderOutcomes(
      results,
      [
        createSourceFinderOutcomeFeedback(
          {
            sourceRecordId: 'r3',
            action: 'ACCEPT',
            behavioralMatchingConsent: true,
          },
          { tenantId: 'tenant-1', id: 'fb-accept' },
          '2026-08-21T09:00:00.000Z',
        ),
      ],
      { behavioralMatchingConsent: true },
    );
    const withoutConsent = applySourceFinderOutcomes(
      results,
      [
        createSourceFinderOutcomeFeedback(
          {
            sourceRecordId: 'r3',
            action: 'ACCEPT',
            behavioralMatchingConsent: true,
          },
          { tenantId: 'tenant-1', id: 'fb-accept-2' },
          '2026-08-21T09:00:00.000Z',
        ),
      ],
      { behavioralMatchingConsent: false },
    );

    expect(hidden.map((result) => result.id)).not.toContain('r2');
    expect(boosted.find((result) => result.id === 'r3')?.reasonCodes).toContain('OUTCOME_FEEDBACK');
    expect(boosted.find((result) => result.id === 'r3')?.score).toBeGreaterThan(
      results.find((result) => result.id === 'r3')?.score ?? 0,
    );
    expect(withoutConsent.find((result) => result.id === 'r3')?.reasonCodes).not.toContain(
      'OUTCOME_FEEDBACK',
    );
  });

  it('uses the latest outcome per source record', () => {
    const results = searchSourceFinderRecords({
      query: 'fresh produce',
      countryCode: 'KE',
    });
    const adjusted = applySourceFinderOutcomes(results, [
      createSourceFinderOutcomeFeedback(
        { sourceRecordId: 'r1', action: 'SAVE', behavioralMatchingConsent: true },
        { tenantId: 'tenant-1', id: 'fb-save' },
        '2026-08-21T09:00:00.000Z',
      ),
      createSourceFinderOutcomeFeedback(
        { sourceRecordId: 'r1', action: 'REPORT' },
        { tenantId: 'tenant-1', id: 'fb-report' },
        '2026-08-21T10:00:00.000Z',
      ),
    ]);

    expect(adjusted.map((result) => result.id)).not.toContain('r1');
  });
});
