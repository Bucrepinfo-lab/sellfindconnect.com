import type { AnalyticsEvent } from '@telpen/domain';

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
  dryRun?: boolean;
};

export interface AnalyticsRepository {
  createEvent(event: AnalyticsEvent): RepositoryResult<void>;
  listEvents(input: ListAnalyticsEventsInput): RepositoryResult<AnalyticsEvent[]>;
  listEventsForScope(input: ListAnalyticsEventsForScopeInput): RepositoryResult<AnalyticsEvent[]>;
  pruneEvents(input: PruneAnalyticsEventsInput): RepositoryResult<number>;
}
