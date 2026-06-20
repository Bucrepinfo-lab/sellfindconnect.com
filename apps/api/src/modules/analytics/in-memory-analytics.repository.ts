import { Injectable } from '@nestjs/common';
import type { AnalyticsEvent } from '@telpen/domain';

import type {
  AnalyticsRepository,
  ListAnalyticsEventsInput,
  ListAnalyticsEventsForScopeInput,
  PruneAnalyticsEventsInput,
} from './analytics.repository';

@Injectable()
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly events = new Map<string, AnalyticsEvent>();

  createEvent(event: AnalyticsEvent): void {
    this.events.set(this.key(event.tenantId, event.id), event);
  }

  listEvents(input: ListAnalyticsEventsInput): AnalyticsEvent[] {
    return this.filterEvents(input);
  }

  listEventsForScope(input: ListAnalyticsEventsForScopeInput): AnalyticsEvent[] {
    return this.filterEvents(input);
  }

  private filterEvents(
    input: ListAnalyticsEventsInput | ListAnalyticsEventsForScopeInput,
  ): AnalyticsEvent[] {
    const countryCodes =
      'countryCodes' in input
        ? input.countryCodes
        : 'countryCode' in input && input.countryCode
          ? [input.countryCode]
          : undefined;

    return Array.from(this.events.values())
      .filter((event) => !input.tenantId || event.tenantId === input.tenantId)
      .filter((event) => event.occurredAt >= input.from && event.occurredAt <= input.to)
      .filter((event) => !countryCodes?.length || countryCodes.includes(event.countryCode))
      .filter((event) => !input.industryCode || event.industryCode === input.industryCode)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }

  pruneEvents(input: PruneAnalyticsEventsInput): number {
    const matchingKeys = Array.from(this.events.entries())
      .filter(
        ([, event]) =>
          (!input.tenantId || event.tenantId === input.tenantId) && event.occurredAt < input.before,
      )
      .map(([key]) => key);

    if (!input.dryRun) {
      for (const key of matchingKeys) {
        this.events.delete(key);
      }
    }

    return matchingKeys.length;
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
