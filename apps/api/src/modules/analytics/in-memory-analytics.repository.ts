import { Injectable } from '@nestjs/common';
import type { AnalyticsEvent } from '@telpen/domain';

import type { AnalyticsRepository, ListAnalyticsEventsInput } from './analytics.repository';

@Injectable()
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly events = new Map<string, AnalyticsEvent>();

  createEvent(event: AnalyticsEvent): void {
    this.events.set(this.key(event.tenantId, event.id), event);
  }

  listEvents(input: ListAnalyticsEventsInput): AnalyticsEvent[] {
    return Array.from(this.events.values())
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => event.occurredAt >= input.from && event.occurredAt <= input.to)
      .filter((event) => !input.countryCode || event.countryCode === input.countryCode)
      .filter((event) => !input.industryCode || event.industryCode === input.industryCode)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
