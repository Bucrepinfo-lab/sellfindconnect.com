import { Inject, Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  continents,
  countries,
  emptyAnalyticsTotals,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  operationalRegions,
  type AccessDecision,
  type AccessResourceScope,
  type AccessScopeLevel,
  type AnalyticsEntityType,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type TenantAnalyticsSummary,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { PlatformAccessSession } from '../auth/auth.records';
import type {
  AnalyticsExportFormat,
  AnalyticsExportQueryDto,
  AnalyticsSummaryQueryDto,
  CreateAnalyticsEventDto,
  PlatformAnalyticsQueryDto,
  RunAnalyticsRetentionDto,
} from './dto/create-analytics-event.dto';
import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from './analytics.repository';
import { InMemoryAnalyticsRepository } from './in-memory-analytics.repository';

const DEFAULT_ANALYTICS_RETENTION_DAYS = 395;

type AnalyticsBreakdown = Array<{
  label: string;
  value: number;
}>;

export type TenantAnalyticsReport = TenantAnalyticsSummary & {
  generatedAt: string;
  filters: {
    countryCode?: string;
    industryCode?: string;
  };
  breakdowns: {
    eventTypes: AnalyticsBreakdown;
    entityTypes: AnalyticsBreakdown;
    countries: AnalyticsBreakdown;
    industries: AnalyticsBreakdown;
    consentStates: AnalyticsBreakdown;
  };
  privacy: {
    rawEventMetadataIncluded: false;
    exportScope: 'AGGREGATED_TENANT_REPORT';
    consentBasis: 'CONSENT_STATE_REQUIRED_PER_EVENT';
  };
};

export type TenantAnalyticsExport = {
  format: AnalyticsExportFormat;
  fileName: string;
  contentType: string;
  content: string;
  generatedAt: string;
};

export type AnalyticsRetentionRunResult = {
  before: string;
  retentionDays: number;
  tenantId?: string;
  dryRun: boolean;
  eventsMatched: number;
  eventsDeleted: number;
  completedAt: string;
};

type ResolvedAnalyticsHierarchyScope = {
  scopeLevel: AccessScopeLevel;
  label: string;
  resource: AccessResourceScope;
  countryCodes?: string[];
  tenantId?: string;
};

export type PlatformAnalyticsHierarchyReport = {
  scope: {
    scopeLevel: AccessScopeLevel;
    label: string;
    regionCode?: string;
    continentCode?: string;
    countryCode?: string;
    tenantId?: string;
  };
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  eventCount: number;
  totals: Record<AnalyticsEventType, number>;
  topEntities: TenantAnalyticsSummary['topEntities'];
  mostVisited: TenantAnalyticsSummary['mostVisited'];
  topCountries: AnalyticsBreakdown;
  topIndustries: AnalyticsBreakdown;
  topTenants: AnalyticsBreakdown;
  breakdowns: TenantAnalyticsReport['breakdowns'];
  access: {
    role?: string;
    scopeLevel?: AccessScopeLevel;
    reason?: string;
  };
  privacy: {
    rawEventMetadataIncluded: false;
    exportScope: 'AGGREGATED_PLATFORM_HIERARCHY_REPORT';
    consentBasis: 'CONSENT_STATE_REQUIRED_PER_EVENT';
  };
};

@Injectable()
export class AnalyticsService {
  constructor(
    @Optional()
    @Inject(ANALYTICS_REPOSITORY)
    private readonly repository: AnalyticsRepository = new InMemoryAnalyticsRepository(),
    @Optional() private readonly auth?: AuthService,
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
    const { events, periodStart, periodEnd } = await this.listTenantEventsForQuery(tenantId, query);

    return this.summarizeEvents(tenantId, periodStart, periodEnd, events);
  }

  async buildTenantReport(
    tenantId: string,
    query: AnalyticsSummaryQueryDto = {},
  ): Promise<TenantAnalyticsReport> {
    const { events, periodStart, periodEnd } = await this.listTenantEventsForQuery(tenantId, query);
    const summary = this.summarizeEvents(tenantId, periodStart, periodEnd, events);

    return {
      ...summary,
      generatedAt: new Date().toISOString(),
      filters: {
        countryCode: query.countryCode,
        industryCode: query.industryCode,
      },
      breakdowns: {
        eventTypes: this.breakdown(events, (event) => event.eventType),
        entityTypes: this.breakdown(events, (event) => event.entityType),
        countries: this.breakdown(events, (event) => event.countryCode),
        industries: this.breakdown(events, (event) => event.industryCode ?? 'UNSPECIFIED'),
        consentStates: this.breakdown(events, (event) => event.consentState),
      },
      privacy: {
        rawEventMetadataIncluded: false,
        exportScope: 'AGGREGATED_TENANT_REPORT',
        consentBasis: 'CONSENT_STATE_REQUIRED_PER_EVENT',
      },
    };
  }

  async exportTenantReport(
    tenantId: string,
    query: AnalyticsExportQueryDto = {},
  ): Promise<TenantAnalyticsExport> {
    const format = query.format ?? 'CSV';
    const report = await this.buildTenantReport(tenantId, query);
    const fileName = `analytics-${this.safeFileSegment(tenantId)}-${report.periodStart.slice(0, 10)}-${report.periodEnd.slice(0, 10)}.${format.toLowerCase()}`;

    if (format === 'JSON') {
      return {
        format,
        fileName,
        contentType: 'application/json',
        content: JSON.stringify(report, null, 2),
        generatedAt: report.generatedAt,
      };
    }

    return {
      format,
      fileName,
      contentType: 'text/csv',
      content: this.reportToCsv(report),
      generatedAt: report.generatedAt,
    };
  }

  async buildHierarchyReport(
    session: PlatformAccessSession,
    query: PlatformAnalyticsQueryDto = {},
  ): Promise<PlatformAnalyticsHierarchyReport> {
    const scope = this.resolveHierarchyScope(query);
    const decision = await this.requireHierarchyAccess(session, scope.resource);
    const { events, periodStart, periodEnd } = await this.listHierarchyEventsForQuery(scope, query);
    const totals = emptyAnalyticsTotals();
    for (const event of events) {
      totals[event.eventType] += 1;
    }
    const topEntities = this.topEntities(events);

    return {
      scope: {
        scopeLevel: scope.scopeLevel,
        label: scope.label,
        regionCode: scope.resource.regionCode,
        continentCode: scope.resource.continentCode,
        countryCode: scope.resource.countryCode,
        tenantId: scope.tenantId,
      },
      generatedAt: new Date().toISOString(),
      periodStart,
      periodEnd,
      eventCount: events.length,
      totals,
      topEntities,
      mostVisited: topEntities
        .filter((entity) => entity.views > 0)
        .map(({ entityId, entityType, views }) => ({ entityId, entityType, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      topCountries: this.breakdown(events, (event) => event.countryCode),
      topIndustries: this.breakdown(events, (event) => event.industryCode ?? 'UNSPECIFIED'),
      topTenants: this.breakdown(events, (event) => event.tenantId),
      breakdowns: {
        eventTypes: this.breakdown(events, (event) => event.eventType),
        entityTypes: this.breakdown(events, (event) => event.entityType),
        countries: this.breakdown(events, (event) => event.countryCode),
        industries: this.breakdown(events, (event) => event.industryCode ?? 'UNSPECIFIED'),
        consentStates: this.breakdown(events, (event) => event.consentState),
      },
      access: {
        role: decision?.role,
        scopeLevel: decision?.scopeLevel,
        reason: decision?.reason,
      },
      privacy: {
        rawEventMetadataIncluded: false,
        exportScope: 'AGGREGATED_PLATFORM_HIERARCHY_REPORT',
        consentBasis: 'CONSENT_STATE_REQUIRED_PER_EVENT',
      },
    };
  }

  async runRetention(input: RunAnalyticsRetentionDto = {}): Promise<AnalyticsRetentionRunResult> {
    const retentionDays = input.retentionDays ?? DEFAULT_ANALYTICS_RETENTION_DAYS;
    const before =
      input.before ?? new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(before);

    const eventsMatched = await this.repository.pruneEvents({
      before,
      tenantId: input.tenantId,
      dryRun: true,
    });
    const eventsDeleted = input.dryRun
      ? 0
      : await this.repository.pruneEvents({
          before,
          tenantId: input.tenantId,
        });

    return {
      before,
      retentionDays,
      tenantId: input.tenantId,
      dryRun: input.dryRun ?? false,
      eventsMatched,
      eventsDeleted,
      completedAt: new Date().toISOString(),
    };
  }

  private summarizeEvents(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
    events: AnalyticsEvent[],
  ): TenantAnalyticsSummary {
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

  private async listTenantEventsForQuery(
    tenantId: string,
    query: AnalyticsSummaryQueryDto,
  ): Promise<{ events: AnalyticsEvent[]; periodStart: string; periodEnd: string }> {
    const periodEnd = query.to ?? new Date().toISOString();
    const periodStart =
      query.from ?? new Date(Date.parse(periodEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(periodStart);
    this.assertValidIsoDate(periodEnd);

    const events = await this.repository.listEvents({
      tenantId,
      from: periodStart,
      to: periodEnd,
      countryCode: query.countryCode,
      industryCode: query.industryCode,
    });

    return { events, periodStart, periodEnd };
  }

  private async listHierarchyEventsForQuery(
    scope: ResolvedAnalyticsHierarchyScope,
    query: PlatformAnalyticsQueryDto,
  ): Promise<{ events: AnalyticsEvent[]; periodStart: string; periodEnd: string }> {
    const periodEnd = query.to ?? new Date().toISOString();
    const periodStart =
      query.from ?? new Date(Date.parse(periodEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(periodStart);
    this.assertValidIsoDate(periodEnd);

    const events = await this.repository.listEventsForScope({
      from: periodStart,
      to: periodEnd,
      tenantId: scope.tenantId,
      countryCodes: scope.countryCodes,
      industryCode: query.industryCode,
    });

    return { events, periodStart, periodEnd };
  }

  private async requireHierarchyAccess(
    session: PlatformAccessSession,
    resource: AccessResourceScope,
  ): Promise<AccessDecision | undefined> {
    return this.auth?.requirePlatformAccess(session, 'VIEW_ANALYTICS', resource);
  }

  private resolveHierarchyScope(query: PlatformAnalyticsQueryDto): ResolvedAnalyticsHierarchyScope {
    const scopeLevel = query.scopeLevel ?? this.inferHierarchyScopeLevel(query);

    if (scopeLevel === 'GLOBAL') {
      return {
        scopeLevel,
        label: 'Global',
        resource: {},
      };
    }

    if (scopeLevel === 'REGIONAL') {
      const regionCode = query.regionCode?.trim().toUpperCase();
      const region = operationalRegions.find((item) => item.code === regionCode);
      if (!region) {
        throw new UnprocessableEntityException(
          'A valid regionCode is required for regional analytics.',
        );
      }

      return {
        scopeLevel,
        label: region.name,
        resource: { regionCode: region.code },
        countryCodes: region.countryCodes,
      };
    }

    if (scopeLevel === 'CONTINENT') {
      const continentCode = query.continentCode?.trim().toUpperCase();
      const continent = continents.find((item) => item.code === continentCode);
      if (!continent) {
        throw new UnprocessableEntityException(
          'A valid continentCode is required for continental analytics.',
        );
      }

      return {
        scopeLevel,
        label: continent.name,
        resource: { continentCode: continent.code },
        countryCodes: countries
          .filter((country) => country.continentCode === continent.code)
          .map((country) => country.code),
      };
    }

    if (scopeLevel === 'COUNTRY') {
      const country = query.countryCode ? getCountry(query.countryCode) : undefined;
      if (!country) {
        throw new UnprocessableEntityException(
          'A valid countryCode is required for country analytics.',
        );
      }

      return {
        scopeLevel,
        label: country.name,
        resource: { countryCode: country.code },
        countryCodes: [country.code],
      };
    }

    if (!query.tenantId) {
      throw new UnprocessableEntityException(
        'A tenantId is required for tenant hierarchy analytics.',
      );
    }

    const country = query.countryCode ? getCountry(query.countryCode) : undefined;
    if (query.countryCode && !country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    return {
      scopeLevel: 'TENANT',
      label: query.tenantId,
      resource: {
        tenantId: query.tenantId,
        countryCode: country?.code,
      },
      tenantId: query.tenantId,
      countryCodes: country ? [country.code] : undefined,
    };
  }

  private inferHierarchyScopeLevel(query: PlatformAnalyticsQueryDto): AccessScopeLevel {
    if (query.tenantId) return 'TENANT';
    if (query.countryCode) return 'COUNTRY';
    if (query.continentCode) return 'CONTINENT';
    if (query.regionCode) return 'REGIONAL';
    return 'GLOBAL';
  }

  private breakdown(
    events: AnalyticsEvent[],
    labelFor: (event: AnalyticsEvent) => string,
  ): AnalyticsBreakdown {
    const counts = new Map<string, number>();
    for (const event of events) {
      const label = labelFor(event);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  }

  private reportToCsv(report: TenantAnalyticsReport): string {
    const rows: string[][] = [
      ['section', 'label', 'value', 'entityType', 'lastEventAt'],
      ['period', 'tenantId', report.tenantId, '', ''],
      ['period', 'periodStart', report.periodStart, '', ''],
      ['period', 'periodEnd', report.periodEnd, '', ''],
      ['period', 'generatedAt', report.generatedAt, '', ''],
      [
        'privacy',
        'rawEventMetadataIncluded',
        String(report.privacy.rawEventMetadataIncluded),
        '',
        '',
      ],
      ['privacy', 'exportScope', report.privacy.exportScope, '', ''],
    ];

    for (const [eventType, value] of Object.entries(report.totals)) {
      rows.push(['totals', eventType, String(value), '', '']);
    }

    for (const entity of report.topEntities) {
      rows.push([
        'top_entities',
        entity.entityId,
        String(entity.views + entity.clicks + entity.inquiries + entity.shares + entity.downloads),
        entity.entityType,
        entity.lastEventAt,
      ]);
    }

    for (const entity of report.mostVisited) {
      rows.push(['most_visited', entity.entityId, String(entity.views), entity.entityType, '']);
    }

    for (const [section, items] of Object.entries(report.breakdowns)) {
      for (const item of items) {
        rows.push([section, item.label, String(item.value), '', '']);
      }
    }

    return rows.map((row) => row.map((value) => this.csvEscape(value)).join(',')).join('\n');
  }

  private csvEscape(value: string): string {
    if (!/[",\n\r]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  private safeFileSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  }

  private assertValidIsoDate(value: string): void {
    if (Number.isNaN(Date.parse(value))) {
      throw new UnprocessableEntityException('Invalid analytics date range.');
    }
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
