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

export function emptyAnalyticsTotals(): Record<AnalyticsEventType, number> {
  return analyticsEventTypes.reduce(
    (memo, eventType) => ({
      ...memo,
      [eventType]: 0,
    }),
    {} as Record<AnalyticsEventType, number>,
  );
}
