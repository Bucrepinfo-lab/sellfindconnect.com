import { describe, expect, it } from 'vitest';

import {
  aggregateAnalyticsDailyRollups,
  defaultAnalyticsRetentionPolicy,
  emptyAnalyticsTotals,
  resolveAnalyticsRetentionPolicy,
} from './analytics';

describe('analytics domain helpers', () => {
  it('creates empty totals for every analytics event type', () => {
    const totals = emptyAnalyticsTotals();

    expect(totals.VIEW).toBe(0);
    expect(totals.CLICK).toBe(0);
    expect(totals.RESPONSE_TIME).toBe(0);
  });

  it('resolves country retention policies with default fallback', () => {
    expect(resolveAnalyticsRetentionPolicy('KE')).toMatchObject({
      countryCode: 'KE',
      legalBasis: 'KE_DATA_PROTECTION_OPERATIONAL_ANALYTICS',
      retentionDays: 395,
    });

    expect(resolveAnalyticsRetentionPolicy('UG')).toMatchObject({
      countryCode: 'UG',
      legalBasis: defaultAnalyticsRetentionPolicy.legalBasis,
      retentionDays: defaultAnalyticsRetentionPolicy.retentionDays,
    });
  });

  it('aggregates daily warehouse rollups without raw metadata', () => {
    const rollups = aggregateAnalyticsDailyRollups(
      [
        {
          id: 'event_1',
          tenantId: 'tenant_1',
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
          createdAt: '2026-06-16T10:00:01.000Z',
        },
        {
          id: 'event_2',
          tenantId: 'tenant_1',
          eventType: 'CLICK',
          entityType: 'LISTING',
          entityId: 'advert_1',
          countryCode: 'KE',
          industryCode: 'AGRICULTURE',
          consentState: 'GRANTED',
          occurredAt: '2026-06-16T10:05:00.000Z',
          createdAt: '2026-06-16T10:05:01.000Z',
        },
      ],
      '2026-06-17T00:00:00.000Z',
    );

    expect(rollups).toHaveLength(1);
    expect(rollups[0]).toMatchObject({
      day: '2026-06-16',
      tenantId: 'tenant_1',
      countryCode: 'KE',
      industryCode: 'AGRICULTURE',
      eventCount: 2,
      lastEventAt: '2026-06-16T10:05:00.000Z',
      refreshedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(rollups[0]?.totals.VIEW).toBe(1);
    expect(rollups[0]?.totals.CLICK).toBe(1);
    expect(JSON.stringify(rollups)).not.toContain('private buyer note');
  });
});
