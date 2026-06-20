import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, type AnalyticsEvent as PrismaAnalyticsEvent } from '@prisma/client';
import type { AnalyticsEvent } from '@telpen/domain';

import type {
  AnalyticsRepository,
  ListAnalyticsEventsInput,
  PruneAnalyticsEventsInput,
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
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        tenantId: input.tenantId,
        occurredAt: {
          gte: new Date(input.from),
          lte: new Date(input.to),
        },
        ...(input.countryCode ? { countryCode: input.countryCode } : {}),
        ...(input.industryCode ? { industryCode: input.industryCode } : {}),
      },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });

    return events.map((event) => this.mapEvent(event));
  }

  async pruneEvents(input: PruneAnalyticsEventsInput): Promise<number> {
    const where = {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
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
