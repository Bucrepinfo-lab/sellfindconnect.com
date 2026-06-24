import type { AnalyticsDailyRollup, AnalyticsEvent } from '@telpen/domain';

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export type ListAnalyticsEventsInput = {
  tenantId: string;
  from: string;
  to: string;
  countryCode?: string;
  industryCode?: string;
};

export type ListAnalyticsEventsForScopeInput = {
  from: string;
  to: string;
  tenantId?: string;
  countryCodes?: string[];
  industryCode?: string;
};

export type PruneAnalyticsEventsInput = {
  before: string;
  tenantId?: string;
  countryCode?: string;
  dryRun?: boolean;
};

export type ListAnalyticsDailyRollupsInput = {
  from: string;
  to: string;
  tenantId?: string;
  countryCodes?: string[];
  industryCode?: string;
};

export type ReplaceAnalyticsDailyRollupsInput = {
  from: string;
  to: string;
  tenantId?: string;
  countryCodes?: string[];
  rollups: AnalyticsDailyRollup[];
};

export type ReplaceAnalyticsDailyRollupsResult = {
  deleted: number;
  upserted: number;
};

export interface AnalyticsRepository {
  createEvent(event: AnalyticsEvent): RepositoryResult<void>;
  listEvents(input: ListAnalyticsEventsInput): RepositoryResult<AnalyticsEvent[]>;
  listEventsForScope(input: ListAnalyticsEventsForScopeInput): RepositoryResult<AnalyticsEvent[]>;
  pruneEvents(input: PruneAnalyticsEventsInput): RepositoryResult<number>;
  listDailyRollups(input: ListAnalyticsDailyRollupsInput): RepositoryResult<AnalyticsDailyRollup[]>;
  countDailyRollups(input: ListAnalyticsDailyRollupsInput): RepositoryResult<number>;
  replaceDailyRollups(
    input: ReplaceAnalyticsDailyRollupsInput,
  ): RepositoryResult<ReplaceAnalyticsDailyRollupsResult>;
}
