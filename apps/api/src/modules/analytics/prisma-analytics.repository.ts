import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type AnalyticsDailyRollup as PrismaAnalyticsDailyRollup,
  type AnalyticsEvent as PrismaAnalyticsEvent,
} from '@prisma/client';
import {
  analyticsRollupDay,
  emptyAnalyticsTotals,
  unspecifiedAnalyticsIndustryCode,
  type AnalyticsDailyRollup,
  type AnalyticsEvent,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

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

export function createAnalyticsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvent(event: AnalyticsEvent): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        id: event.id,
        tenantId: event.tenantId,
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        countryCode: event.countryCode,
        industryCode: event.industryCode ?? null,
        consentState: event.consentState,
        metadata: this.mapOptionalJsonToPrisma(event.metadata),
        occurredAt: new Date(event.occurredAt),
        createdAt: new Date(event.createdAt),
      },
    });
  }

  async listEvents(input: ListAnalyticsEventsInput): Promise<AnalyticsEvent[]> {
    return this.listEventsForScope({
      from: input.from,
      to: input.to,
      tenantId: input.tenantId,
      countryCodes: input.countryCode ? [input.countryCode] : undefined,
      industryCode: input.industryCode,
    });
  }

  async listEventsForScope(input: ListAnalyticsEventsForScopeInput): Promise<AnalyticsEvent[]> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        occurredAt: {
          gte: new Date(input.from),
          lte: new Date(input.to),
        },
        ...(input.countryCodes?.length ? { countryCode: { in: input.countryCodes } } : {}),
        ...(input.industryCode ? { industryCode: input.industryCode } : {}),
      },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });

    return events.map((event) => this.mapEvent(event));
  }

  async pruneEvents(input: PruneAnalyticsEventsInput): Promise<number> {
    const where = {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.countryCode ? { countryCode: input.countryCode } : {}),
      occurredAt: {
        lt: new Date(input.before),
      },
    };

    if (input.dryRun) {
      return this.prisma.analyticsEvent.count({ where });
    }

    const result = await this.prisma.analyticsEvent.deleteMany({ where });
    return result.count;
  }

  async deleteEventsForPrivacyRequest(
    input: DeleteAnalyticsEventsForPrivacyRequestInput,
  ): Promise<number> {
    const where = {
      tenantId: input.tenantId,
      ...(input.countryCode ? { countryCode: input.countryCode } : {}),
      occurredAt: {
        gte: new Date(input.from),
        lte: new Date(input.to),
      },
    };

    if (input.dryRun) {
      return this.prisma.analyticsEvent.count({ where });
    }

    const result = await this.prisma.analyticsEvent.deleteMany({ where });
    return result.count;
  }

  async listDailyRollups(
    input: ListAnalyticsDailyRollupsInput,
  ): Promise<AnalyticsDailyRollup[]> {
    const rollups = await this.prisma.analyticsDailyRollup.findMany({
      where: this.dailyRollupWhere(input),
      orderBy: [
        { day: 'asc' },
        { tenantId: 'asc' },
        { countryCode: 'asc' },
        { industryCode: 'asc' },
        { entityType: 'asc' },
        { entityId: 'asc' },
      ],
    });

    return rollups.map((rollup) => this.mapDailyRollup(rollup));
  }

  async countDailyRollups(input: ListAnalyticsDailyRollupsInput): Promise<number> {
    return this.prisma.analyticsDailyRollup.count({
      where: this.dailyRollupWhere(input),
    });
  }

  async replaceDailyRollups(
    input: ReplaceAnalyticsDailyRollupsInput,
  ): Promise<ReplaceAnalyticsDailyRollupsResult> {
    return this.prisma.$transaction(async (transaction) => {
      const deleted = await transaction.analyticsDailyRollup.deleteMany({
        where: this.dailyRollupWhere(input),
      });

      if (input.rollups.length > 0) {
        await transaction.analyticsDailyRollup.createMany({
          data: input.rollups.map((rollup) => this.mapDailyRollupToPrisma(rollup)),
        });
      }

      return {
        deleted: deleted.count,
        upserted: input.rollups.length,
      };
    });
  }

  private mapEvent(event: PrismaAnalyticsEvent): AnalyticsEvent {
    return {
      id: event.id,
      tenantId: event.tenantId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      countryCode: event.countryCode,
      industryCode: event.industryCode ?? undefined,
      consentState: event.consentState,
      metadata: this.mapMetadata(event.metadata),
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
    };
  }

  private dailyRollupWhere(
    input: ListAnalyticsDailyRollupsInput | ReplaceAnalyticsDailyRollupsInput,
  ): Prisma.AnalyticsDailyRollupWhereInput {
    return {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.countryCodes?.length ? { countryCode: { in: input.countryCodes } } : {}),
      ...('industryCode' in input && input.industryCode
        ? { industryCode: input.industryCode }
        : {}),
      day: {
        gte: this.rollupDayDate(input.from),
        lte: this.rollupDayDate(input.to),
      },
    };
  }

  private mapDailyRollup(rollup: PrismaAnalyticsDailyRollup): AnalyticsDailyRollup {
    const totals = emptyAnalyticsTotals();
    totals.IMPRESSION = rollup.impressions;
    totals.VIEW = rollup.views;
    totals.CLICK = rollup.clicks;
    totals.INQUIRY = rollup.inquiries;
    totals.SHARE = rollup.shares;
    totals.DOWNLOAD = rollup.downloads;
    totals.SAVE = rollup.saves;
    totals.SEARCH = rollup.searches;
    totals.MATCH = rollup.matches;
    totals.CHAT_MESSAGE = rollup.chatMessages;
    totals.RESPONSE_TIME = rollup.responseTime;

    return {
      day: analyticsRollupDay(rollup.day.toISOString()),
      tenantId: rollup.tenantId,
      countryCode: rollup.countryCode,
      industryCode:
        rollup.industryCode === unspecifiedAnalyticsIndustryCode
          ? undefined
          : rollup.industryCode,
      entityType: rollup.entityType,
      entityId: rollup.entityId,
      consentState: rollup.consentState,
      totals,
      eventCount: rollup.eventCount,
      lastEventAt: rollup.lastEventAt.toISOString(),
      refreshedAt: rollup.refreshedAt.toISOString(),
    };
  }

  private mapDailyRollupToPrisma(rollup: AnalyticsDailyRollup) {
    return {
      id: randomUUID(),
      day: this.rollupDayDate(rollup.day),
      tenantId: rollup.tenantId,
      countryCode: rollup.countryCode,
      industryCode: rollup.industryCode ?? unspecifiedAnalyticsIndustryCode,
      entityType: rollup.entityType,
      entityId: rollup.entityId,
      consentState: rollup.consentState,
      impressions: rollup.totals.IMPRESSION,
      views: rollup.totals.VIEW,
      clicks: rollup.totals.CLICK,
      inquiries: rollup.totals.INQUIRY,
      shares: rollup.totals.SHARE,
      downloads: rollup.totals.DOWNLOAD,
      saves: rollup.totals.SAVE,
      searches: rollup.totals.SEARCH,
      matches: rollup.totals.MATCH,
      chatMessages: rollup.totals.CHAT_MESSAGE,
      responseTime: rollup.totals.RESPONSE_TIME,
      eventCount: rollup.eventCount,
      lastEventAt: new Date(rollup.lastEventAt),
      refreshedAt: new Date(rollup.refreshedAt),
    };
  }

  private rollupDayDate(value: string): Date {
    return new Date(`${analyticsRollupDay(value)}T00:00:00.000Z`);
  }

  private mapMetadata(value: Prisma.JsonValue): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private mapOptionalJsonToPrisma(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}
