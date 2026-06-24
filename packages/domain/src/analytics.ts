export const analyticsEventTypes = [
  'IMPRESSION',
  'VIEW',
  'CLICK',
  'INQUIRY',
  'SHARE',
  'DOWNLOAD',
  'SAVE',
  'SEARCH',
  'MATCH',
  'CHAT_MESSAGE',
  'RESPONSE_TIME',
] as const;

export type AnalyticsEventType = (typeof analyticsEventTypes)[number];

export const analyticsEntityTypes = [
  'PROFILE',
  'LISTING',
  'SEARCH_RESULT',
  'MATCH',
  'CHAT_THREAD',
  'MEDIA_ASSET',
] as const;

export type AnalyticsEntityType = (typeof analyticsEntityTypes)[number];

export const consentStates = ['GRANTED', 'DENIED', 'NOT_REQUIRED', 'UNKNOWN'] as const;

export type ConsentState = (typeof consentStates)[number];

export type AnalyticsEventInput = {
  eventType: AnalyticsEventType;
  entityType: AnalyticsEntityType;
  entityId: string;
  countryCode: string;
  industryCode?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  consentState: ConsentState;
};

export type AnalyticsEvent = AnalyticsEventInput & {
  id: string;
  tenantId: string;
  occurredAt: string;
  createdAt: string;
};

export const unspecifiedAnalyticsIndustryCode = 'UNSPECIFIED';

export type AnalyticsDailyRollup = {
  day: string;
  tenantId: string;
  countryCode: string;
  industryCode?: string;
  entityType: AnalyticsEntityType;
  entityId: string;
  consentState: ConsentState;
  totals: Record<AnalyticsEventType, number>;
  eventCount: number;
  lastEventAt: string;
  refreshedAt: string;
};

export type AnalyticsSummaryMetric = {
  label: string;
  value: number;
};

export type TenantAnalyticsSummary = {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  totals: Record<AnalyticsEventType, number>;
  topEntities: Array<{
    entityId: string;
    entityType: AnalyticsEntityType;
    views: number;
    clicks: number;
    inquiries: number;
    shares: number;
    downloads: number;
    lastEventAt: string;
  }>;
  mostVisited: Array<{
    entityId: string;
    entityType: AnalyticsEntityType;
    views: number;
  }>;
};

export type AnalyticsRetentionPolicy = {
  countryCode?: string;
  retentionDays: number;
  legalBasis: string;
  reason: string;
  effectiveFrom: string;
};

export const defaultAnalyticsRetentionPolicy: AnalyticsRetentionPolicy = {
  retentionDays: 395,
  legalBasis: 'DEFAULT_PLATFORM_RAW_EVENT_RETENTION',
  reason: 'Default platform raw analytics retention pending country-specific policy approval.',
  effectiveFrom: '2026-06-20',
};

export const countryAnalyticsRetentionPolicies: AnalyticsRetentionPolicy[] = [
  {
    countryCode: 'KE',
    retentionDays: 395,
    legalBasis: 'KE_DATA_PROTECTION_OPERATIONAL_ANALYTICS',
    reason:
      'Kenya pilot analytics events use the platform raw-event window until a regulator-reviewed country schedule is approved.',
    effectiveFrom: '2026-06-20',
  },
];

export function emptyAnalyticsTotals(): Record<AnalyticsEventType, number> {
  return analyticsEventTypes.reduce(
    (memo, eventType) => ({
      ...memo,
      [eventType]: 0,
    }),
    {} as Record<AnalyticsEventType, number>,
  );
}

export function analyticsRollupDay(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function aggregateAnalyticsDailyRollups(
  events: AnalyticsEvent[],
  refreshedAt = new Date().toISOString(),
): AnalyticsDailyRollup[] {
  const rollups = new Map<string, AnalyticsDailyRollup>();

  for (const event of events) {
    const day = analyticsRollupDay(event.occurredAt);
    const industryKey = event.industryCode ?? unspecifiedAnalyticsIndustryCode;
    const key = [
      day,
      event.tenantId,
      event.countryCode,
      industryKey,
      event.entityType,
      event.entityId,
      event.consentState,
    ].join('|');
    const rollup =
      rollups.get(key) ??
      ({
        day,
        tenantId: event.tenantId,
        countryCode: event.countryCode,
        industryCode: event.industryCode,
        entityType: event.entityType,
        entityId: event.entityId,
        consentState: event.consentState,
        totals: emptyAnalyticsTotals(),
        eventCount: 0,
        lastEventAt: event.occurredAt,
        refreshedAt,
      } satisfies AnalyticsDailyRollup);

    rollup.totals[event.eventType] += 1;
    rollup.eventCount += 1;
    if (event.occurredAt > rollup.lastEventAt) {
      rollup.lastEventAt = event.occurredAt;
    }
    rollup.refreshedAt = refreshedAt;
    rollups.set(key, rollup);
  }

  return Array.from(rollups.values()).sort(
    (left, right) =>
      left.day.localeCompare(right.day) ||
      left.tenantId.localeCompare(right.tenantId) ||
      left.countryCode.localeCompare(right.countryCode) ||
      (left.industryCode ?? unspecifiedAnalyticsIndustryCode).localeCompare(
        right.industryCode ?? unspecifiedAnalyticsIndustryCode,
      ) ||
      left.entityType.localeCompare(right.entityType) ||
      left.entityId.localeCompare(right.entityId) ||
      left.consentState.localeCompare(right.consentState),
  );
}

export function resolveAnalyticsRetentionPolicy(countryCode?: string): AnalyticsRetentionPolicy {
  if (!countryCode) {
    return defaultAnalyticsRetentionPolicy;
  }

  return (
    countryAnalyticsRetentionPolicies.find(
      (policy) => policy.countryCode?.toUpperCase() === countryCode.toUpperCase(),
    ) ?? {
      ...defaultAnalyticsRetentionPolicy,
      countryCode: countryCode.toUpperCase(),
      reason: `Default platform raw analytics retention applies until ${countryCode.toUpperCase()} has an approved country policy.`,
    }
  );
}
