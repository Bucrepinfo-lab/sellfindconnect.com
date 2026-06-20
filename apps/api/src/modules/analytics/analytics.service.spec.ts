import { describe, expect, it } from 'vitest';

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
    expect(csv.content).toContain('top_entities,advert_1,2,LISTING');
    expect(csv.content).not.toContain('private buyer note');
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
      dryRun: true,
    });
    expect(dryRun.eventsMatched).toBe(1);
    expect(dryRun.eventsDeleted).toBe(0);

    const deleted = await service.runRetention({
      before: '2026-01-01T00:00:00.000Z',
      tenantId,
    });
    expect(deleted.eventsMatched).toBe(1);
    expect(deleted.eventsDeleted).toBe(1);

    const summary = await service.summarizeTenant(tenantId, {
      from: '2025-01-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
    });
    expect(summary.totals.VIEW).toBe(1);
    expect(summary.topEntities[0]?.entityId).toBe('current_profile');
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
  });
});
