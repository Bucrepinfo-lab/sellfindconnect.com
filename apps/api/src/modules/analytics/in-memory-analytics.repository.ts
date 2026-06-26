import { Injectable } from '@nestjs/common';
import {
  analyticsRollupDay,
  unspecifiedAnalyticsIndustryCode,
  type AnalyticsDailyRollup,
  type AnalyticsEvent,
} from '@telpen/domain';

import type {
  AnalyticsRepository,
  DeleteAnalyticsEventsForPrivacyRequestInput,
  ListAnalyticsDailyRollupsInput,
  ListAnalyticsEventsInput,
  ListAnalyticsEventsForScopeInput,
  PruneAnalyticsEventsInput,
  ReplaceAnalyticsDailyRollupsInput,
  ReplaceAnalyticsDailyRollupsResult,
} from './analytics.repository';

@Injectable()
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly events = new Map<string, AnalyticsEvent>();
  private readonly dailyRollups = new Map<string, AnalyticsDailyRollup>();

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
          (!input.tenantId || event.tenantId === input.tenantId) &&
          (!input.countryCode || event.countryCode === input.countryCode) &&
          event.occurredAt < input.before,
      )
      .map(([key]) => key);

    if (!input.dryRun) {
      for (const key of matchingKeys) {
        this.events.delete(key);
      }
    }

    return matchingKeys.length;
  }

  deleteEventsForPrivacyRequest(input: DeleteAnalyticsEventsForPrivacyRequestInput): number {
    const matchingKeys = Array.from(this.events.entries())
      .filter(
        ([, event]) =>
          event.tenantId === input.tenantId &&
          event.occurredAt >= input.from &&
          event.occurredAt <= input.to &&
          (!input.countryCode || event.countryCode === input.countryCode),
      )
      .map(([key]) => key);

    if (!input.dryRun) {
      for (const key of matchingKeys) {
        this.events.delete(key);
      }
    }

    return matchingKeys.length;
  }

  listDailyRollups(input: ListAnalyticsDailyRollupsInput): AnalyticsDailyRollup[] {
    return this.filterDailyRollups(input);
  }

  countDailyRollups(input: ListAnalyticsDailyRollupsInput): number {
    return this.filterDailyRollups(input).length;
  }

  replaceDailyRollups(
    input: ReplaceAnalyticsDailyRollupsInput,
  ): ReplaceAnalyticsDailyRollupsResult {
    const matchingKeys = this.filterDailyRollupEntries(input).map(([key]) => key);
    for (const key of matchingKeys) {
      this.dailyRollups.delete(key);
    }

    for (const rollup of input.rollups) {
      this.dailyRollups.set(this.rollupKey(rollup), rollup);
    }

    return {
      deleted: matchingKeys.length,
      upserted: input.rollups.length,
    };
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private filterDailyRollups(input: ListAnalyticsDailyRollupsInput): AnalyticsDailyRollup[] {
    return this.filterDailyRollupEntries(input)
      .map(([, rollup]) => rollup)
      .sort(
        (left, right) =>
          left.day.localeCompare(right.day) ||
          left.tenantId.localeCompare(right.tenantId) ||
          left.countryCode.localeCompare(right.countryCode) ||
          (left.industryCode ?? unspecifiedAnalyticsIndustryCode).localeCompare(
            right.industryCode ?? unspecifiedAnalyticsIndustryCode,
          ) ||
          left.entityType.localeCompare(right.entityType) ||
          left.entityId.localeCompare(right.entityId),
      );
  }

  private filterDailyRollupEntries(
    input: ListAnalyticsDailyRollupsInput | ReplaceAnalyticsDailyRollupsInput,
  ): Array<[string, AnalyticsDailyRollup]> {
    const fromDay = analyticsRollupDay(input.from);
    const toDay = analyticsRollupDay(input.to);

    return Array.from(this.dailyRollups.entries()).filter(
      ([, rollup]) =>
        rollup.day >= fromDay &&
        rollup.day <= toDay &&
        (!input.tenantId || rollup.tenantId === input.tenantId) &&
        (!input.countryCodes?.length || input.countryCodes.includes(rollup.countryCode)) &&
        (!('industryCode' in input) ||
          !input.industryCode ||
          rollup.industryCode === input.industryCode),
    );
  }

  private rollupKey(rollup: AnalyticsDailyRollup): string {
    return [
      rollup.day,
      rollup.tenantId,
      rollup.countryCode,
      rollup.industryCode ?? unspecifiedAnalyticsIndustryCode,
      rollup.entityType,
      rollup.entityId,
      rollup.consentState,
    ].join('|');
  }
}
