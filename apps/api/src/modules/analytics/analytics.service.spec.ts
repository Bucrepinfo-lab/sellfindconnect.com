import { describe, expect, it } from 'vitest';

import { AnalyticsService } from './analytics.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const otherTenantId = '22222222-2222-4222-8222-222222222222';

describe('AnalyticsService', () => {
  it('records and summarizes tenant-scoped events', () => {
    const service = new AnalyticsService();

    service.recordEvent(tenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'profile_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:00:00.000Z',
    });
    service.recordEvent(tenantId, {
      eventType: 'CLICK',
      entityType: 'PROFILE',
      entityId: 'profile_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:01:00.000Z',
    });
    service.recordEvent(otherTenantId, {
      eventType: 'VIEW',
      entityType: 'PROFILE',
      entityId: 'profile_2',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      consentState: 'GRANTED',
      occurredAt: '2026-06-16T10:02:00.000Z',
    });

    const summary = service.summarizeTenant(tenantId, {
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

  it('blocks unsafe analytics metadata', () => {
    const service = new AnalyticsService();

    expect(() =>
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
    ).toThrow();
  });
});
