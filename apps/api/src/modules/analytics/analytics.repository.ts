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

export interface AnalyticsRepository {
  createEvent(event: AnalyticsEvent): RepositoryResult<void>;
  listEvents(input: ListAnalyticsEventsInput): RepositoryResult<AnalyticsEvent[]>;
}
