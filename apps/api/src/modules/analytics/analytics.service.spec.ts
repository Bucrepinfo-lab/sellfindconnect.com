import { describe, expect, it } from 'vitest';

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
});
