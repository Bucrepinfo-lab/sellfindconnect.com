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

  it('saves a Source Finder search and delivers de-duplicated opportunity alerts', async () => {
    const service = new SourceFinderService();
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const saved = await service.createSavedSearch(tenantId, {
      name: 'Fresh produce buyers',
      query: 'fresh produce',
      role: 'BUYER',
      countryCode: 'KE',
      alertFrequency: 'DAILY',
    });

    const firstRun = await service.runOpportunityAlerts(tenantId, {
      savedSearchId: saved.id,
      now: '2026-08-21T08:00:00.000Z',
    });
    const secondRun = await service.runOpportunityAlerts(tenantId, {
      savedSearchId: saved.id,
      now: '2026-08-21T12:00:00.000Z',
    });
    const nextDay = await service.runOpportunityAlerts(tenantId, {
      savedSearchId: saved.id,
      now: '2026-08-22T08:00:00.000Z',
    });

    expect(firstRun.alertsCreated.length).toBeGreaterThan(0);
    expect(firstRun.deliveryPlans[0]?.eventType).toBe('SOURCE_FINDER_OPPORTUNITY');
    expect(firstRun.deliveryPlans[0]?.selectedChannels).toContain('IN_APP');
    expect(secondRun.alertsCreated).toHaveLength(0);
    expect(nextDay.alertsCreated).toHaveLength(0);
    await expect(service.listSavedSearches(tenantId)).resolves.toEqual([
      expect.objectContaining({ id: saved.id, lastAlertedAt: '2026-08-22T08:00:00.000Z' }),
    ]);
    await expect(service.listOpportunityAlerts(tenantId)).resolves.toHaveLength(
      firstRun.alertsCreated.length,
    );
  });

  it('records outcome feedback and applies consented ranking without exposing notes', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new SourceFinderService(undefined, undefined, {
      recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
        audits.push(record);
      },
    } as never);
    const tenantId = '11111111-1111-4111-8111-111111111111';

    const hidden = await service.recordOutcome(tenantId, {
      sourceRecordId: 'r2',
      action: 'HIDE',
      note: 'Not a hotel-produce fit this week.',
    });
    await service.recordOutcome(tenantId, {
      sourceRecordId: 'r3',
      action: 'ACCEPT',
      query: 'fresh produce',
      behavioralMatchingConsent: true,
    });

    const consented = await service.search(
      {
        query: 'fresh produce',
        countryCode: 'KE',
        behavioralMatchingConsent: true,
      },
      tenantId,
    );
    const denied = await service.search(
      {
        query: 'fresh produce',
        countryCode: 'KE',
        behavioralMatchingConsent: false,
      },
      tenantId,
    );

    expect(hidden.note).toBe('Not a hotel-produce fit this week.');
    expect(consented.results.map((result) => result.id)).not.toContain('r2');
    expect(consented.results.find((result) => result.id === 'r3')?.reasonCodes).toContain(
      'OUTCOME_FEEDBACK',
    );
    expect(denied.results.find((result) => result.id === 'r3')?.reasonCodes).not.toContain(
      'OUTCOME_FEEDBACK',
    );
    expect(audits.map((record) => record.action)).toEqual([
      'SOURCE_FINDER_OUTCOME_RECORDED',
      'SOURCE_FINDER_OUTCOME_RECORDED',
    ]);
    expect(JSON.stringify(audits)).not.toContain('hotel-produce');
    await expect(service.listOutcomeFeedback(tenantId)).resolves.toHaveLength(2);
  });

  it('blocks prohibited saved-search queries', async () => {
    const service = new SourceFinderService();

    await expect(
      service.createSavedSearch('11111111-1111-4111-8111-111111111111', {
        name: 'Weapons sourcing',
        query: 'ammunition supplier',
        countryCode: 'KE',
      }),
    ).rejects.toThrow();
  });

  it('blocks prohibited outcome notes', async () => {
    const service = new SourceFinderService();

    await expect(
      service.recordOutcome('11111111-1111-4111-8111-111111111111', {
        sourceRecordId: 'r1',
        action: 'REPORT',
        note: 'This seller is offering ammunition.',
      }),
    ).rejects.toThrow();
  });

  it('rebuilds a persisted Source Finder index and searches indexed documents', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new SourceFinderService(undefined, undefined, {
      recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
        audits.push(record);
      },
    } as never);
    const tenantId = '11111111-1111-4111-8111-111111111111';

    const rebuilt = await service.rebuildIndex(
      { now: '2026-08-21T12:00:00.000Z' },
      'owner-1',
      tenantId,
    );
    const listed = await service.listIndex();
    const search = await service.search({ query: 'fresh produce', countryCode: 'KE' }, tenantId);

    expect(rebuilt.indexed).toBe(4);
    expect(listed.documents.map((document) => document.id)).toEqual(
      expect.arrayContaining(['r1', 'r2', 'r3', 'r4']),
    );
    expect(search.indexedDocuments).toBe(4);
    expect(search.results[0]?.id).toBe('r1');
    expect(audits.map((record) => record.action)).toEqual(['SOURCE_FINDER_INDEX_REBUILT']);
    expect(JSON.stringify(listed)).not.toContain('tokenVector');

    const cleared = await service.rebuildIndex({ includePilot: false }, 'owner-1', tenantId);
    expect(cleared.indexed).toBe(0);
    await expect(
      service.search({ query: 'fresh produce', countryCode: 'KE' }, tenantId),
    ).resolves.toMatchObject({ indexedDocuments: 0, results: expect.arrayContaining([
      expect.objectContaining({ id: 'r1' }),
    ]) });
  });

  it('summarizes catalog records into a Source Finder hierarchy dashboard', async () => {
    const service = new SourceFinderService();
    const report = await service.hierarchy({ countryCode: 'KE' });

    expect(report.totals.sources).toBeGreaterThanOrEqual(4);
    expect(report.byCountry).toEqual([expect.objectContaining({ key: 'KE' })]);
    expect(report.topSources[0]?.id).toBe('r1');
    expect(report.byRelationship.length).toBeGreaterThan(0);

    await expect(service.hierarchy({ countryCode: 'ZZ' })).rejects.toThrow();
  });
});
