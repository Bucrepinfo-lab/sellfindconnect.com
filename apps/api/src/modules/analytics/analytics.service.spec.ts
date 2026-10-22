import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';

import type { PlatformAccessSession } from '../auth/auth.records';
import type { AuthService } from '../auth/auth.service';
import { AnalyticsService } from './analytics.service';
import { InMemoryAnalyticsRepository } from './in-memory-analytics.repository';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

describe('AnalyticsService', () => {
  it('records and summarizes tenant-scoped events', async () => {
    const service = new AnalyticsService();

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'profile_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:00:00.000Z',
    });
    await service.recordEvent(tenantId, {
      eventType: 'CLICK',
      entityType: 'PROFILE',
      entityId: 'profile_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:01:00.000Z',
    });
    await service.recordEvent(otherTenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'profile_2',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:02:00.000Z',
    });

    const summary = await service.summarizeTenant(tenantId, {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });

    expect(summary.totals.VIEW).toBe(1);
    expect(summary.totals.CLICK).toBe(1);
    expect(summary.topEntities[0]).toMatchObject({
      entityId: 'profile_1',
      views: 1,
      clicks: 1,
    });
    expect(summary.mostVisited).toHaveLength(1);
  });

  it('blocks unsafe analytics metadata', async () => {
    const service = new AnalyticsService();

    await expect(
      service.recordEvent(tenantId, {
        eventType: 'SEARCH',
        entityType: 'SEARCH_RESULT',
        entityId: 'query_1',
        countryCode: 'KE',
        consentState: 'GRANTED',
        metadata: {
          query: 'ammunition supplier',
        },
      }),
    ).rejects.toThrow();
  });

  it('stores events through the configured repository', async () => {
    const repository = new InMemoryAnalyticsRepository();
    const service = new AnalyticsService(repository);

    const event = await service.recordEvent(tenantId, {
      eventType: 'DOWNLOAD',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:03:00.000Z',
      metadata: {
        query: 'fresh vegetables',
      },
    });

    expect(
      repository.listEvents({
        tenantId,
        from: '2026-06-16T00:00:00.000Z',
        to: '2026-06-17T00:00:00.000Z',
      }),
    ).toEqual([event]);
  });

  it('exports aggregated tenant analytics without raw event metadata', async () => {
    const service = new AnalyticsService();

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:00:00.000Z',
      metadata: {
        query: 'private buyer note',
      },
    });
    await service.recordEvent(tenantId, {
      eventType: 'INQUIRY',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:05:00.000Z',
    });

    const report = await service.buildTenantReport(tenantId, {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });
    const csv = await service.exportTenantReport(tenantId, {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'CSV',
    });

    expect(report.breakdowns.eventTypes).toEqual(
      expect.arrayContaining([
        { label: 'VIEW', value: 1 },
        { label: 'INQUIRY', value: 1 },
      ]),
    );
    expect(csv.contentType).toBe('text/csv');
    expect(csv.encoding).toBe('utf8');
    expect(csv.content).toContain('top_entities,advert_1,2,LISTING');
    expect(csv.content).not.toContain('private buyer note');

    const pdf = await service.exportTenantReport(tenantId, {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'PDF',
    });
    const pdfText = Buffer.from(pdf.content, 'base64').toString('latin1');
    expect(pdf.contentType).toBe('application/pdf');
    expect(pdf.encoding).toBe('base64');
    expect(pdf.fileName).toMatch(/\.pdf$/);
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('Tenant Analytics Report');
    expect(pdfText).not.toContain('private buyer note');
  });

  it('records product audit evidence for exports and privacy jobs without raw metadata', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new AnalyticsService(undefined, {
      recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
        audits.push(record);
      },
    } as unknown as AuthService);

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:00:00.000Z',
      metadata: { note: 'private buyer note' },
    });

    await service.exportTenantReport(tenantId, {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'CSV',
    });
    await service.runPrivacyRequest({
      requestId: 'dsr_audit',
      requestType: 'ACCESS',
      tenantId,
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });

    expect(audits.map((record) => record.action)).toEqual([
      'ANALYTICS_REPORT_EXPORTED',
      'ANALYTICS_PRIVACY_REQUEST_RUN',
    ]);
    expect(audits[0]?.metadata).toMatchObject({ format: 'CSV' });
    expect(JSON.stringify(audits)).not.toContain('private buyer note');
  });

  it('supports dry-run retention before pruning old events', async () => {
    const service = new AnalyticsService();

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'old_profile',
      countryCode: 'KE',
      consentState: 'GRANTED',
      occurredAt: '2025-01-01T00:00:00.000Z',
    });
    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'current_profile',
      countryCode: 'KE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T00:00:00.000Z',
    });

    const dryRun = await service.runRetention({
      before: '2026-01-01T00:00:00.000Z',
      tenantId,
      countryCode: 'KE',
      dryRun: true,
    });
    expect(dryRun.countryCode).toBe('KE');
    expect(dryRun.policy).toMatchObject({
      countryCode: 'KE',
      legalBasis: 'KE_DATA_PROTECTION_OPERATIONAL_ANALYTICS',
      approvalStatus: 'PENDING_LEGAL_APPROVAL',
      legalApprovalRequired: true,
      overrideApplied: false,
    });
    expect(dryRun.eventsMatched).toBe(1);
    expect(dryRun.eventsDeleted).toBe(0);

    const deleted = await service.runRetention({
      before: '2026-01-01T00:00:00.000Z',
      tenantId,
      countryCode: 'KE',
    });
    expect(deleted.eventsMatched).toBe(1);
    expect(deleted.eventsDeleted).toBe(1);

    const summary = await service.summarizeTenant(tenantId, {
      from: '2025-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
    });
    expect(summary.totals.VIEW).toBe(1);
    expect(summary.topEntities[0]?.entityId).toBe('current_profile');

    await expect(
      service.runRetention({
        countryCode: 'KE',
        retentionDays: 30,
        dryRun: true,
      }),
    ).rejects.toThrow('approvalReference');
    const override = await service.runRetention({
      countryCode: 'KE',
      retentionDays: 30,
      approvalReference: 'LEGAL-APPROVAL-2026-001',
      dryRun: true,
    });
    expect(override.retentionDays).toBe(30);
    expect(override.policy.overrideApplied).toBe(true);
    expect(override.policy.overrideApprovalReference).toBe('LEGAL-APPROVAL-2026-001');
    await expect(service.runRetention({ countryCode: 'UG', dryRun: true })).rejects.toThrow(
      'Unsupported country',
    );
  });

  it('rebuilds daily analytics warehouse rollups by period and scope', async () => {
    const repository = new InMemoryAnalyticsRepository();
    const service = new AnalyticsService(repository);

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      metadata: {
        note: 'private buyer note',
      },
      occurredAt: '2026-06-16T10:00:00.000Z',
    });
    await service.recordEvent(tenantId, {
      eventType: 'CLICK',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:05:00.000Z',
    });
    await service.recordEvent(otherTenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_2',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:10:00.000Z',
    });

    const period = {
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      tenantId,
      countryCode: 'KE',
    };
    const dryRun = await service.runRollupRefresh({
      ...period,
      dryRun: true,
    });
    expect(dryRun).toMatchObject({
      dryRun: true,
      sourceEvents: 2,
      rollupsBuilt: 1,
      existingRollupsMatched: 0,
      rollupsDeleted: 0,
      rollupsUpserted: 0,
      warehouse: {
        grain: 'DAY',
        rawEventMetadataIncluded: false,
        rebuildStrategy: 'REPLACE_PERIOD_SCOPE',
      },
    });
    expect(
      repository.listDailyRollups({
        from: period.from,
        to: period.to,
        tenantId,
        countryCodes: ['KE'],
      }),
    ).toHaveLength(0);

    const firstRun = await service.runRollupRefresh(period);
    expect(firstRun).toMatchObject({
      dryRun: false,
      sourceEvents: 2,
      rollupsBuilt: 1,
      existingRollupsMatched: 0,
      rollupsDeleted: 0,
      rollupsUpserted: 1,
    });
    const rollups = repository.listDailyRollups({
      from: period.from,
      to: period.to,
      tenantId,
      countryCodes: ['KE'],
    });
    expect(rollups).toHaveLength(1);
    expect(rollups[0]).toMatchObject({
      day: '2026-06-16',
      tenantId,
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      eventCount: 2,
      lastEventAt: '2026-06-16T10:05:00.000Z',
    });
    expect(rollups[0]?.totals.VIEW).toBe(1);
    expect(rollups[0]?.totals.CLICK).toBe(1);
    expect(JSON.stringify(rollups)).not.toContain('private buyer note');

    const rollupReport = await service.buildTenantReport(tenantId, {
      ...period,
      dataSource: 'ROLLUP',
    });
    expect(rollupReport.warehouse).toMatchObject({
      requestedDataSource: 'ROLLUP',
      dataSource: 'DAILY_ROLLUPS',
      rollupRows: 1,
    });
    expect(rollupReport.totals.VIEW).toBe(1);
    expect(rollupReport.totals.CLICK).toBe(1);
    expect(rollupReport.totals.INQUIRY).toBe(0);

    await service.recordEvent(tenantId, {
      eventType: 'INQUIRY',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:15:00.000Z',
    });
    const rawReport = await service.buildTenantReport(tenantId, {
      ...period,
      dataSource: 'RAW',
    });
    expect(rawReport.warehouse).toMatchObject({
      requestedDataSource: 'RAW',
      dataSource: 'RAW_EVENTS',
      fallbackReason: 'RAW_REQUESTED',
    });
    expect(rawReport.totals.INQUIRY).toBe(1);

    const autoReport = await service.buildTenantReport(tenantId, {
      ...period,
      dataSource: 'AUTO',
    });
    expect(autoReport.warehouse).toMatchObject({
      requestedDataSource: 'AUTO',
      dataSource: 'DAILY_ROLLUPS',
      rollupRows: 1,
    });
    expect(autoReport.totals.INQUIRY).toBe(0);

    const secondRun = await service.runRollupRefresh(period);
    expect(secondRun).toMatchObject({
      existingRollupsMatched: 1,
      rollupsDeleted: 1,
      rollupsUpserted: 1,
    });
    await expect(service.runRollupRefresh({ countryCode: 'UG' })).rejects.toThrow(
      'Unsupported country',
    );
  });

  it('automates tenant-scoped analytics privacy access and erasure requests', async () => {
    const repository = new InMemoryAnalyticsRepository();
    const service = new AnalyticsService(repository);

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      metadata: {
        note: 'private buyer note',
      },
      occurredAt: '2026-06-16T10:00:00.000Z',
    });
    await service.recordEvent(tenantId, {
      eventType: 'CLICK',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:05:00.000Z',
    });
    await service.runRollupRefresh({
      tenantId,
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });

    const access = await service.runPrivacyRequest({
      requestId: 'dsr_1',
      requestType: 'ACCESS',
      tenantId,
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });
    expect(access).toMatchObject({
      requestId: 'dsr_1',
      requestType: 'ACCESS',
      dryRun: true,
      rawEventMetadataIncluded: false,
      eventsMatched: 2,
      eventsDeleted: 0,
      rollupsMatched: 1,
      rollupRebuild: {
        requested: false,
        performed: false,
      },
    });
    expect(access.exportSummary.totals.VIEW).toBe(1);
    expect(access.exportSummary.totals.CLICK).toBe(1);
    expect(JSON.stringify(access)).not.toContain('private buyer note');

    const dryRunErasure = await service.runPrivacyRequest({
      requestType: 'ERASURE',
      tenantId,
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });
    expect(dryRunErasure).toMatchObject({
      requestType: 'ERASURE',
      dryRun: true,
      eventsMatched: 2,
      eventsDeleted: 0,
      rollupsMatched: 1,
      rollupsDeleted: 0,
    });
    expect(
      repository.listEvents({
        tenantId,
        from: '2026-06-16T00:00:00.000Z',
        to: '2026-06-17T00:00:00.000Z',
        countryCode: 'KE',
      }),
    ).toHaveLength(2);

    const erasure = await service.runPrivacyRequest({
      requestType: 'ERASURE',
      tenantId,
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      dryRun: false,
    });
    expect(erasure).toMatchObject({
      requestType: 'ERASURE',
      dryRun: false,
      eventsMatched: 2,
      eventsDeleted: 2,
      rollupsMatched: 1,
      rollupsDeleted: 1,
      rollupsUpserted: 0,
      rollupRebuild: {
        requested: true,
        performed: true,
      },
    });
    expect(
      repository.listEvents({
        tenantId,
        from: '2026-06-16T00:00:00.000Z',
        to: '2026-06-17T00:00:00.000Z',
        countryCode: 'KE',
      }),
    ).toHaveLength(0);
    expect(
      repository.listDailyRollups({
        tenantId,
        countryCodes: ['KE'],
        from: '2026-06-16T00:00:00.000Z',
        to: '2026-06-17T00:00:00.000Z',
      }),
    ).toHaveLength(0);
    await expect(
      service.runPrivacyRequest({
        requestType: 'ACCESS',
        tenantId,
        countryCode: 'UG',
      }),
    ).rejects.toThrow('Unsupported country');
  });

  it('builds scope-checked hierarchy analytics reports', async () => {
    const accessChecks: Array<{ permission: string; resource: Record<string, unknown> }> = [];
    const auth = {
      requirePlatformAccess: async (
        _session: PlatformAccessSession,
        permission: string,
        resource: Record<string, unknown>,
      ) => {
        accessChecks.push({ permission, resource });
        return {
          allowed: true,
          permission: 'VIEW_ANALYTICS',
          role: 'COUNTRY_ADMIN',
          scopeLevel: 'COUNTRY',
          reason: 'ACCESS_GRANTED',
        };
      },
    };
    const service = new AnalyticsService(undefined, auth as unknown as AuthService);
    const session: PlatformAccessSession = {
      sessionId: 'session_1',
      sessionTenantId: tenantId,
      userId: 'platform-user',
      mfaVerified: true,
      assignments: [],
    };

    await service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'LISTING',
      entityId: 'advert_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:00:00.000Z',
      metadata: {
        note: 'private buyer note',
      },
    });
    await service.recordEvent(otherTenantId, {
      eventType: 'CLICK',
      entityType: 'LISTING',
      entityId: 'advert_2',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:05:00.000Z',
    });

    const report = await service.buildHierarchyReport(session, {
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });

    expect(accessChecks).toEqual([
      {
        permission: 'VIEW_ANALYTICS',
        resource: { countryCode: 'KE' },
      },
    ]);
    expect(report.scope).toMatchObject({
      scopeLevel: 'COUNTRY',
      label: 'Kenya',
      countryCode: 'KE',
    });
    expect(report.eventCount).toBe(2);
    expect(report.totals.VIEW).toBe(1);
    expect(report.totals.CLICK).toBe(1);
    expect(report.topTenants).toEqual(
      expect.arrayContaining([
        { label: tenantId, value: 1 },
        { label: otherTenantId, value: 1 },
      ]),
    );
    expect(report.access).toMatchObject({ role: 'COUNTRY_ADMIN', reason: 'ACCESS_GRANTED' });

    const csvExport = await service.exportHierarchyReport(session, {
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'CSV',
    });
    expect(csvExport.contentType).toBe('text/csv');
    expect(csvExport.encoding).toBe('utf8');
    expect(csvExport.fileName).toContain('platform-analytics-country-KE');
    expect(csvExport.content).toContain(`top_tenants,${tenantId},1`);
    expect(csvExport.content).not.toContain('private buyer note');

    const jsonExport = await service.exportHierarchyReport(session, {
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'JSON',
    });
    expect(jsonExport.contentType).toBe('application/json');
    expect(jsonExport.encoding).toBe('utf8');
    expect(JSON.parse(jsonExport.content)).toMatchObject({
      scope: {
        scopeLevel: 'COUNTRY',
        countryCode: 'KE',
      },
      privacy: {
        rawEventMetadataIncluded: false,
      },
    });

    await service.runRollupRefresh({
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });
    const rollupReport = await service.buildHierarchyReport(session, {
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      dataSource: 'ROLLUP',
    });
    expect(rollupReport.warehouse).toMatchObject({
      requestedDataSource: 'ROLLUP',
      dataSource: 'DAILY_ROLLUPS',
      rollupRows: 2,
    });
    expect(rollupReport.eventCount).toBe(2);
    expect(rollupReport.topTenants).toEqual(
      expect.arrayContaining([
        { label: tenantId, value: 1 },
        { label: otherTenantId, value: 1 },
      ]),
    );

    const pdfExport = await service.exportHierarchyReport(session, {
      countryCode: 'KE',
      from: '2026-06-16T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
      format: 'PDF',
    });
    const pdfText = Buffer.from(pdfExport.content, 'base64').toString('latin1');
    expect(pdfExport.contentType).toBe('application/pdf');
    expect(pdfExport.encoding).toBe('base64');
    expect(pdfExport.fileName).toContain('platform-analytics-country-KE');
    expect(pdfText).toContain('%PDF-1.4');
    expect(pdfText).toContain('Platform Hierarchy Analytics Report');
    expect(pdfText).not.toContain('private buyer note');
  });
});
