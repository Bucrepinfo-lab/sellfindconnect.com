import { describe, expect, it } from 'vitest';

import {
  buildOpportunityAlert,
  createSavedSourceFinderSearch,
  createSourceFinderOutcomeFeedback,
  applySourceFinderOutcomes,
  applySourceFinderFullTextRanking,
  attachSourceFinderEmbeddingRanks,
  cosineSimilarity,
  buildSourceFinderHierarchyReport,
  buildSourceFinderIndexDocument,
  buildSourceFinderTsQuery,
  rankSourceFinderWithFullText,
  resolveSourceFinderSearchMode,
  scoreSourceFinderFullText,
  searchSourceFinderIndexDocuments,
  isOpportunityAlertDue,
  searchSourceFinderRecords,
  selectOpportunityMatches,
  toSourceFinderRecord,
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

  it('builds a searchable index document from a Source Finder record', () => {
    const record = searchSourceFinderRecords({ query: 'fresh produce', countryCode: 'KE' })[0];
    expect(record).toBeDefined();
    const indexed = buildSourceFinderIndexDocument(record!, '2026-08-21T12:00:00.000Z');

    expect(indexed.searchText).toContain('nairobi');
    expect(indexed.searchText).toContain('tomato');
    expect(indexed.tokenVector.fresh).toBeGreaterThan(0);
    expect(toSourceFinderRecord(indexed)).toMatchObject({
      id: record!.id,
      name: record!.name,
      offers: record!.offers,
    });
    expect(toSourceFinderRecord(indexed)).not.toHaveProperty('searchText');
  });

  it('scores Source Finder full-text matches and boosts ranked results', () => {
    const record = searchSourceFinderRecords({ query: 'fresh produce', countryCode: 'KE' })[0];
    const indexed = buildSourceFinderIndexDocument(record!);
    const ftsScore = scoreSourceFinderFullText(indexed, 'fresh produce');

    expect(buildSourceFinderTsQuery('fresh produce')).toBe('fresh:* & produce:*');
    expect(ftsScore).toBeGreaterThan(0);
    expect(scoreSourceFinderFullText(indexed, 'ammunition')).toBe(0);

    const boosted = applySourceFinderFullTextRanking(
      searchSourceFinderRecords({ query: 'fresh produce', countryCode: 'KE' }),
      new Map([[record!.id, ftsScore]]),
    );
    expect(boosted[0]?.reasonCodes).toContain('KEYWORD_MATCH');
    expect(boosted.find((item) => item.id === record!.id)?.reasons).toContain(
      'Full-text index matched the search keywords.',
    );

    const belowCap = searchSourceFinderRecords({ query: 'fresh produce', countryCode: 'KE' }).find(
      (item) => item.score < 100,
    );
    expect(belowCap).toBeDefined();
    const belowCapBoost = applySourceFinderFullTextRanking(
      [belowCap!],
      new Map([
        [belowCap!.id, scoreSourceFinderFullText(buildSourceFinderIndexDocument(belowCap!), 'fresh produce')],
      ]),
    );
    expect(belowCapBoost[0]?.score).toBeGreaterThan(belowCap!.score);

    const indexedCatalog = searchSourceFinderRecords({ query: '', countryCode: 'KE' }).map((item) =>
      buildSourceFinderIndexDocument(item),
    );
    const hits = searchSourceFinderIndexDocuments(indexedCatalog, {
      query: 'fresh produce',
      countryCode: 'KE',
    });
    expect(hits.every((hit) => hit.ftsRank > 0)).toBe(true);
    expect(
      searchSourceFinderIndexDocuments(indexedCatalog, { query: 'fresh ammunition', countryCode: 'KE' }),
    ).toHaveLength(0);

    const hybrid = rankSourceFinderWithFullText(
      { query: 'fresh produce', countryCode: 'KE', sortBy: 'RELEVANCE' },
      searchSourceFinderRecords({ query: '', countryCode: 'KE' }),
      hits,
    );
    expect(hybrid[0]?.reasonCodes).toContain('KEYWORD_MATCH');
    expect(
      resolveSourceFinderSearchMode({
        indexedDocumentCount: indexedCatalog.length,
        query: 'fresh produce',
        ftsHitCount: hits.length,
      }),
    ).toBe('HYBRID');
    expect(
      resolveSourceFinderSearchMode({
        indexedDocumentCount: 0,
        query: 'fresh produce',
        ftsHitCount: 0,
      }),
    ).toBe('RULES');
  });

  it('boosts Source Finder results with embedding similarity and reports SEMANTIC mode', () => {
    const record = searchSourceFinderRecords({ query: 'fresh produce', countryCode: 'KE' })[0];
    expect(record).toBeDefined();
    const indexed = {
      ...buildSourceFinderIndexDocument(record!),
      embedding: [1, 0],
    };
    const hits = attachSourceFinderEmbeddingRanks([], [indexed], [0.99, 0.1]);

    expect(cosineSimilarity([1, 0], [0.99, 0.1])).toBeGreaterThan(0.9);
    expect(hits[0]?.embeddingRank).toBeGreaterThan(0.9);
    expect(toSourceFinderRecord(indexed)).not.toHaveProperty('embedding');

    const ranked = rankSourceFinderWithFullText(
      { query: 'fresh produce', countryCode: 'KE', sortBy: 'RELEVANCE' },
      searchSourceFinderRecords({ query: '', countryCode: 'KE' }),
      hits,
    );
    expect(ranked[0]?.reasonCodes).toContain('SEMANTIC_MATCH');
    expect(ranked[0]?.reasons).toContain('Semantic embedding matched the search intent.');
    expect(
      resolveSourceFinderSearchMode({
        indexedDocumentCount: 1,
        query: 'fresh produce',
        ftsHitCount: 0,
        embeddingHitCount: 1,
      }),
    ).toBe('SEMANTIC');
    expect(
      resolveSourceFinderSearchMode({
        indexedDocumentCount: 1,
        query: 'fresh produce',
        ftsHitCount: 2,
        embeddingHitCount: 1,
      }),
    ).toBe('HYBRID');
  });

  it('rolls Source Finder catalog records into country, industry, and role hierarchy buckets', () => {
    const report = buildSourceFinderHierarchyReport(searchSourceFinderRecords({ query: '', countryCode: 'KE' }));
    const kenyaScoped = buildSourceFinderHierarchyReport(
      searchSourceFinderRecords({ query: 'fresh produce' }),
      { countryCode: 'KE', role: 'BUYER' },
    );

    expect(report.totals.sources).toBeGreaterThanOrEqual(4);
    expect(report.byCountry[0]?.key).toBe('KE');
    expect(report.byRole.map((bucket) => bucket.key)).toEqual(
      expect.arrayContaining(['SUPPLIER', 'BUYER', 'LOGISTICS_PROVIDER']),
    );
    expect(report.topSources[0]?.id).toBe('r1');
    expect(kenyaScoped.totals.sources).toBe(1);
    expect(kenyaScoped.byRole).toEqual([
      expect.objectContaining({ key: 'BUYER', sources: 1 }),
    ]);
  });
});
