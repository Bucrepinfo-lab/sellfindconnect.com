import { Inject, Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  emptyAnalyticsTotals,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  type AnalyticsEntityType,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type TenantAnalyticsSummary,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  AnalyticsSummaryQueryDto,
  CreateAnalyticsEventDto,
} from './dto/create-analytics-event.dto';
import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from './analytics.repository';
import { InMemoryAnalyticsRepository } from './in-memory-analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    @Optional()
    @Inject(ANALYTICS_REPOSITORY)
    private readonly repository: AnalyticsRepository = new InMemoryAnalyticsRepository(),
  ) {}

  async recordEvent(tenantId: string, input: CreateAnalyticsEventDto): Promise<AnalyticsEvent> {
    const country = getCountry(input.countryCode);
    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (
      input.industryCode &&
      !industryCategories.some((item) => item.code === input.industryCode)
    ) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const safetyText = this.extractSafetyText(input);
    const safety = evaluateSafetyText(safetyText);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This analytics event contains blocked content and cannot be stored.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const occurredAt = input.occurredAt ?? now;
    const event: AnalyticsEvent = {
      ...input,
      tenantId,
      id: randomUUID(),
      occurredAt,
      createdAt: now,
    };

    await this.repository.createEvent(event);
    return event;
  }

  async summarizeTenant(
    tenantId: string,
    query: AnalyticsSummaryQueryDto = {},
  ): Promise<TenantAnalyticsSummary> {
    const periodEnd = query.to ?? new Date().toISOString();
    const periodStart =
      query.from ?? new Date(Date.parse(periodEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();

    const events = await this.repository.listEvents({
      tenantId,
      from: periodStart,
      to: periodEnd,
      countryCode: query.countryCode,
      industryCode: query.industryCode,
    });

    const totals = emptyAnalyticsTotals();
    for (const event of events) {
      totals[event.eventType] += 1;
    }

    return {
      tenantId,
      periodStart,
      periodEnd,
      totals,
      topEntities: this.topEntities(events),
      mostVisited: this.topEntities(events)
        .filter((entity) => entity.views > 0)
        .map(({ entityId, entityType, views }) => ({ entityId, entityType, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
    };
  }

  private topEntities(events: AnalyticsEvent[]): TenantAnalyticsSummary['topEntities'] {
    const summaries = new Map<
      string,
      {
        entityId: string;
        entityType: AnalyticsEntityType;
        views: number;
        clicks: number;
        inquiries: number;
        shares: number;
        downloads: number;
        lastEventAt: string;
      }
    >();

    for (const event of events) {
      const key = `${event.entityType}:${event.entityId}`;
      const current = summaries.get(key) ?? {
        entityId: event.entityId,
        entityType: event.entityType,
        views: 0,
        clicks: 0,
        inquiries: 0,
        shares: 0,
        downloads: 0,
        lastEventAt: event.occurredAt,
      };

      if (event.eventType === 'VIEW' || event.eventType === 'IMPRESSION') current.views += 1;
      if (event.eventType === 'CLICK') current.clicks += 1;
      if (event.eventType === 'INQUIRY') current.inquiries += 1;
      if (event.eventType === 'SHARE') current.shares += 1;
      if (event.eventType === 'DOWNLOAD') current.downloads += 1;
      if (event.occurredAt > current.lastEventAt) current.lastEventAt = event.occurredAt;

      summaries.set(key, current);
    }

    return Array.from(summaries.values())
      .sort((a, b) => {
        const bScore = b.views + b.clicks * 2 + b.inquiries * 4 + b.shares + b.downloads;
        const aScore = a.views + a.clicks * 2 + a.inquiries * 4 + a.shares + a.downloads;
        return bScore - aScore;
      })
      .slice(0, 10);
  }

  private extractSafetyText(input: CreateAnalyticsEventDto): string {
    const metadataText = this.flattenMetadata(input.metadata).join(' ');
    return [input.eventType, input.entityType, input.entityId, input.industryCode, metadataText]
      .filter(Boolean)
      .join(' ');
  }

  private flattenMetadata(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) return value.flatMap((item) => this.flattenMetadata(item));
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, item]) => [key, ...this.flattenMetadata(item)]);
    }
    return [];
  }
}
