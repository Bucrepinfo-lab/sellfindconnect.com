import { Inject, Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  aggregateAnalyticsDailyRollups,
  continents,
  countries,
  emptyAnalyticsTotals,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  operationalRegions,
  resolveAnalyticsRetentionPolicy,
  unspecifiedAnalyticsIndustryCode,
  type AccessDecision,
  type AccessResourceScope,
  type AccessScopeLevel,
  type AnalyticsDailyRollup,
  type AnalyticsRetentionPolicy,
  type AnalyticsEntityType,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type TenantAnalyticsSummary,
} from '@telpen/domain';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { PlatformAccessSession } from '../auth/auth.records';
import type {
  AnalyticsExportFormat,
  AnalyticsPrivacyRequestType,
  AnalyticsReportDataSource,
  AnalyticsExportQueryDto,
  AnalyticsSummaryQueryDto,
  CreateAnalyticsEventDto,
  PlatformAnalyticsQueryDto,
  RunAnalyticsPrivacyRequestDto,
  RunAnalyticsRollupDto,
  RunAnalyticsRetentionDto,
} from './dto/create-analytics-event.dto';
import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from './analytics.repository';
import { InMemoryAnalyticsRepository } from './in-memory-analytics.repository';

type AnalyticsBreakdown = Array<{
  label: string;
  value: number;
}>;

type AnalyticsResolvedDataSource = 'RAW_EVENTS' | 'DAILY_ROLLUPS';

type AnalyticsReportWarehouse = {
  requestedDataSource: AnalyticsReportDataSource;
  dataSource: AnalyticsResolvedDataSource;
  rollupRows: number;
  fallbackReason?: string;
};

type AnalyticsReportDataset =
  | {
      periodStart: string;
      periodEnd: string;
      warehouse: AnalyticsReportWarehouse;
      events: AnalyticsEvent[];
      rollups?: undefined;
    }
  | {
      periodStart: string;
      periodEnd: string;
      warehouse: AnalyticsReportWarehouse;
      events?: undefined;
      rollups: AnalyticsDailyRollup[];
    };

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
  warehouse: AnalyticsReportWarehouse;
};

export type TenantAnalyticsExport = {
  format: AnalyticsExportFormat;
  fileName: string;
  contentType: string;
  encoding: 'utf8' | 'base64';
  content: string;
  generatedAt: string;
};

export type AnalyticsRetentionRunResult = {
  before: string;
  retentionDays: number;
  tenantId?: string;
  countryCode?: string;
  dryRun: boolean;
  policy: AnalyticsRetentionPolicy & {
    overrideApplied: boolean;
    overrideApprovalReference?: string;
    legalApprovalRequired: boolean;
  };
  eventsMatched: number;
  eventsDeleted: number;
  completedAt: string;
};

export type AnalyticsRollupRefreshResult = {
  periodStart: string;
  periodEnd: string;
  tenantId?: string;
  countryCode?: string;
  dryRun: boolean;
  sourceEvents: number;
  rollupsBuilt: number;
  existingRollupsMatched: number;
  rollupsDeleted: number;
  rollupsUpserted: number;
  warehouse: {
    grain: 'DAY';
    rawEventMetadataIncluded: false;
    rebuildStrategy: 'REPLACE_PERIOD_SCOPE';
  };
  completedAt: string;
};

export type AnalyticsPrivacyRequestRunResult = {
  requestId?: string;
  requestType: AnalyticsPrivacyRequestType;
  tenantId: string;
  countryCode?: string;
  periodStart: string;
  periodEnd: string;
  dryRun: boolean;
  rawEventMetadataIncluded: false;
  eventsMatched: number;
  eventsDeleted: number;
  rollupsMatched: number;
  rollupsDeleted: number;
  rollupsUpserted: number;
  rollupRebuild: {
    requested: boolean;
    performed: boolean;
  };
  exportSummary: {
    eventCount: number;
    totals: Record<AnalyticsEventType, number>;
    breakdowns: {
      eventTypes: AnalyticsBreakdown;
      countries: AnalyticsBreakdown;
      industries: AnalyticsBreakdown;
      consentStates: AnalyticsBreakdown;
    };
  };
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
  warehouse: AnalyticsReportWarehouse;
};

export type PlatformAnalyticsHierarchyExport = {
  format: AnalyticsExportFormat;
  fileName: string;
  contentType: string;
  encoding: 'utf8' | 'base64';
  content: string;
  generatedAt: string;
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
    const dataset = await this.listTenantAnalyticsForQuery(tenantId, query);

    return dataset.rollups
      ? this.summarizeRollups(tenantId, dataset.periodStart, dataset.periodEnd, dataset.rollups)
      : this.summarizeEvents(tenantId, dataset.periodStart, dataset.periodEnd, dataset.events);
  }

  async buildTenantReport(
    tenantId: string,
    query: AnalyticsSummaryQueryDto = {},
  ): Promise<TenantAnalyticsReport> {
    const dataset = await this.listTenantAnalyticsForQuery(tenantId, query);
    const summary = dataset.rollups
      ? this.summarizeRollups(tenantId, dataset.periodStart, dataset.periodEnd, dataset.rollups)
      : this.summarizeEvents(tenantId, dataset.periodStart, dataset.periodEnd, dataset.events);

    return {
      ...summary,
      generatedAt: new Date().toISOString(),
      filters: {
        countryCode: query.countryCode,
        industryCode: query.industryCode,
      },
      breakdowns: dataset.rollups
        ? this.rollupBreakdowns(dataset.rollups)
        : {
            eventTypes: this.breakdown(dataset.events, (event) => event.eventType),
            entityTypes: this.breakdown(dataset.events, (event) => event.entityType),
            countries: this.breakdown(dataset.events, (event) => event.countryCode),
            industries: this.breakdown(
              dataset.events,
              (event) => event.industryCode ?? unspecifiedAnalyticsIndustryCode,
            ),
            consentStates: this.breakdown(dataset.events, (event) => event.consentState),
          },
      privacy: {
        rawEventMetadataIncluded: false,
        exportScope: 'AGGREGATED_TENANT_REPORT',
        consentBasis: 'CONSENT_STATE_REQUIRED_PER_EVENT',
      },
      warehouse: dataset.warehouse,
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
        encoding: 'utf8',
        content: JSON.stringify(report, null, 2),
        generatedAt: report.generatedAt,
      };
    }

    if (format === 'PDF') {
      return {
        format,
        fileName,
        contentType: 'application/pdf',
        encoding: 'base64',
        content: this.reportLinesToPdfBase64(
          'Tenant Analytics Report',
          this.tenantReportToPdfLines(report),
        ),
        generatedAt: report.generatedAt,
      };
    }

    return {
      format,
      fileName,
      contentType: 'text/csv',
      encoding: 'utf8',
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
    const dataset = await this.listHierarchyAnalyticsForQuery(scope, query);
    const totals = dataset.rollups
      ? this.rollupTotals(dataset.rollups)
      : this.eventTotals(dataset.events);
    const topEntities = dataset.rollups
      ? this.topEntitiesFromRollups(dataset.rollups)
      : this.topEntities(dataset.events);

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
      periodStart: dataset.periodStart,
      periodEnd: dataset.periodEnd,
      eventCount: dataset.rollups
        ? dataset.rollups.reduce((sum, rollup) => sum + rollup.eventCount, 0)
        : dataset.events.length,
      totals,
      topEntities,
      mostVisited: topEntities
        .filter((entity) => entity.views > 0)
        .map(({ entityId, entityType, views }) => ({ entityId, entityType, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      topCountries: dataset.rollups
        ? this.rollupBreakdown(dataset.rollups, (rollup) => rollup.countryCode)
        : this.breakdown(dataset.events, (event) => event.countryCode),
      topIndustries: dataset.rollups
        ? this.rollupBreakdown(
            dataset.rollups,
            (rollup) => rollup.industryCode ?? unspecifiedAnalyticsIndustryCode,
          )
        : this.breakdown(
            dataset.events,
            (event) => event.industryCode ?? unspecifiedAnalyticsIndustryCode,
          ),
      topTenants: dataset.rollups
        ? this.rollupBreakdown(dataset.rollups, (rollup) => rollup.tenantId)
        : this.breakdown(dataset.events, (event) => event.tenantId),
      breakdowns: dataset.rollups
        ? this.rollupBreakdowns(dataset.rollups)
        : {
            eventTypes: this.breakdown(dataset.events, (event) => event.eventType),
            entityTypes: this.breakdown(dataset.events, (event) => event.entityType),
            countries: this.breakdown(dataset.events, (event) => event.countryCode),
            industries: this.breakdown(
              dataset.events,
              (event) => event.industryCode ?? unspecifiedAnalyticsIndustryCode,
            ),
            consentStates: this.breakdown(dataset.events, (event) => event.consentState),
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
      warehouse: dataset.warehouse,
    };
  }

  async exportHierarchyReport(
    session: PlatformAccessSession,
    query: PlatformAnalyticsQueryDto = {},
  ): Promise<PlatformAnalyticsHierarchyExport> {
    const format = query.format ?? 'CSV';
    const report = await this.buildHierarchyReport(session, query);
    const scopeSegment =
      report.scope.regionCode ??
      report.scope.continentCode ??
      report.scope.countryCode ??
      report.scope.tenantId ??
      report.scope.label;
    const fileName = `platform-analytics-${report.scope.scopeLevel.toLowerCase()}-${this.safeFileSegment(scopeSegment)}-${report.periodStart.slice(0, 10)}-${report.periodEnd.slice(0, 10)}.${format.toLowerCase()}`;

    if (format === 'JSON') {
      return {
        format,
        fileName,
        contentType: 'application/json',
        encoding: 'utf8',
        content: JSON.stringify(report, null, 2),
        generatedAt: report.generatedAt,
      };
    }

    if (format === 'PDF') {
      return {
        format,
        fileName,
        contentType: 'application/pdf',
        encoding: 'base64',
        content: this.reportLinesToPdfBase64(
          'Platform Hierarchy Analytics Report',
          this.hierarchyReportToPdfLines(report),
        ),
        generatedAt: report.generatedAt,
      };
    }

    return {
      format,
      fileName,
      contentType: 'text/csv',
      encoding: 'utf8',
      content: this.hierarchyReportToCsv(report),
      generatedAt: report.generatedAt,
    };
  }

  async runRetention(input: RunAnalyticsRetentionDto = {}): Promise<AnalyticsRetentionRunResult> {
    const countryCode = input.countryCode?.trim().toUpperCase();
    if (countryCode && !getCountry(countryCode)) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    const resolvedPolicy = resolveAnalyticsRetentionPolicy(countryCode);
    const overrideApplied = input.retentionDays !== undefined;
    if (overrideApplied && !input.approvalReference?.trim()) {
      throw new UnprocessableEntityException(
        'Retention-day overrides require an approvalReference.',
      );
    }

    const retentionDays = input.retentionDays ?? resolvedPolicy.retentionDays;
    const before =
      input.before ?? new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(before);

    const eventsMatched = await this.repository.pruneEvents({
      before,
      tenantId: input.tenantId,
      countryCode,
      dryRun: true,
    });
    const eventsDeleted = input.dryRun
      ? 0
      : await this.repository.pruneEvents({
          before,
          tenantId: input.tenantId,
          countryCode,
        });

    return {
      before,
      retentionDays,
      tenantId: input.tenantId,
      countryCode,
      dryRun: input.dryRun ?? false,
      policy: {
        ...resolvedPolicy,
        retentionDays,
        overrideApplied,
        overrideApprovalReference: input.approvalReference,
        legalApprovalRequired: resolvedPolicy.approvalStatus !== 'APPROVED',
      },
      eventsMatched,
      eventsDeleted,
      completedAt: new Date().toISOString(),
    };
  }

  async runRollupRefresh(input: RunAnalyticsRollupDto = {}): Promise<AnalyticsRollupRefreshResult> {
    const countryCode = input.countryCode?.trim().toUpperCase();
    if (countryCode && !getCountry(countryCode)) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    const periodEnd = input.to ?? new Date().toISOString();
    const periodStart =
      input.from ?? new Date(Date.parse(periodEnd) - 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(periodStart);
    this.assertValidIsoDate(periodEnd);
    if (Date.parse(periodStart) > Date.parse(periodEnd)) {
      throw new UnprocessableEntityException('Invalid analytics date range.');
    }

    const countryCodes = countryCode ? [countryCode] : undefined;
    const events = await this.repository.listEventsForScope({
      from: periodStart,
      to: periodEnd,
      tenantId: input.tenantId,
      countryCodes,
    });
    const completedAt = new Date().toISOString();
    const rollups = aggregateAnalyticsDailyRollups(events, completedAt);
    const existingRollupsMatched = await this.repository.countDailyRollups({
      from: periodStart,
      to: periodEnd,
      tenantId: input.tenantId,
      countryCodes,
    });
    const replacement = input.dryRun
      ? { deleted: 0, upserted: 0 }
      : await this.repository.replaceDailyRollups({
          from: periodStart,
          to: periodEnd,
          tenantId: input.tenantId,
          countryCodes,
          rollups,
        });

    return {
      periodStart,
      periodEnd,
      tenantId: input.tenantId,
      countryCode,
      dryRun: input.dryRun ?? false,
      sourceEvents: events.length,
      rollupsBuilt: rollups.length,
      existingRollupsMatched,
      rollupsDeleted: replacement.deleted,
      rollupsUpserted: replacement.upserted,
      warehouse: {
        grain: 'DAY',
        rawEventMetadataIncluded: false,
        rebuildStrategy: 'REPLACE_PERIOD_SCOPE',
      },
      completedAt,
    };
  }

  async runPrivacyRequest(
    input: RunAnalyticsPrivacyRequestDto,
  ): Promise<AnalyticsPrivacyRequestRunResult> {
    const requestType = input.requestType ?? 'ACCESS';
    const countryCode = input.countryCode?.trim().toUpperCase();
    if (countryCode && !getCountry(countryCode)) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    const periodStart = input.from ?? '1970-01-01T00:00:00.000Z';
    const periodEnd = input.to ?? new Date().toISOString();
    this.assertValidIsoDate(periodStart);
    this.assertValidIsoDate(periodEnd);
    if (Date.parse(periodStart) > Date.parse(periodEnd)) {
      throw new UnprocessableEntityException('Invalid analytics date range.');
    }

    const countryCodes = countryCode ? [countryCode] : undefined;
    const events = await this.repository.listEventsForScope({
      from: periodStart,
      to: periodEnd,
      tenantId: input.tenantId,
      countryCodes,
    });
    const rollupsMatched = await this.repository.countDailyRollups({
      from: periodStart,
      to: periodEnd,
      tenantId: input.tenantId,
      countryCodes,
    });
    const dryRun = requestType === 'ERASURE' ? (input.dryRun ?? true) : true;
    const rebuildRequested = requestType === 'ERASURE' && input.rebuildRollups !== false;
    const eventsDeleted =
      requestType === 'ERASURE'
        ? await this.repository.deleteEventsForPrivacyRequest({
            tenantId: input.tenantId,
            countryCode,
            from: periodStart,
            to: periodEnd,
            dryRun,
          })
        : 0;
    const completedAt = new Date().toISOString();
    const rollupReplacement =
      requestType === 'ERASURE' && !dryRun && rebuildRequested
        ? await this.repository.replaceDailyRollups({
            from: periodStart,
            to: periodEnd,
            tenantId: input.tenantId,
            countryCodes,
            rollups: aggregateAnalyticsDailyRollups(
              await this.repository.listEventsForScope({
                from: periodStart,
                to: periodEnd,
                tenantId: input.tenantId,
                countryCodes,
              }),
              completedAt,
            ),
          })
        : { deleted: 0, upserted: 0 };

    return {
      requestId: input.requestId,
      requestType,
      tenantId: input.tenantId,
      countryCode,
      periodStart,
      periodEnd,
      dryRun,
      rawEventMetadataIncluded: false,
      eventsMatched: events.length,
      eventsDeleted: dryRun ? 0 : eventsDeleted,
      rollupsMatched,
      rollupsDeleted: rollupReplacement.deleted,
      rollupsUpserted: rollupReplacement.upserted,
      rollupRebuild: {
        requested: rebuildRequested,
        performed: requestType === 'ERASURE' && !dryRun && rebuildRequested,
      },
      exportSummary: {
        eventCount: events.length,
        totals: this.eventTotals(events),
        breakdowns: {
          eventTypes: this.breakdown(events, (event) => event.eventType),
          countries: this.breakdown(events, (event) => event.countryCode),
          industries: this.breakdown(
            events,
            (event) => event.industryCode ?? unspecifiedAnalyticsIndustryCode,
          ),
          consentStates: this.breakdown(events, (event) => event.consentState),
        },
      },
      completedAt,
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

  private summarizeRollups(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
    rollups: AnalyticsDailyRollup[],
  ): TenantAnalyticsSummary {
    const topEntities = this.topEntitiesFromRollups(rollups);

    return {
      tenantId,
      periodStart,
      periodEnd,
      totals: this.rollupTotals(rollups),
      topEntities,
      mostVisited: topEntities
        .filter((entity) => entity.views > 0)
        .map(({ entityId, entityType, views }) => ({ entityId, entityType, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
    };
  }

  private async listTenantAnalyticsForQuery(
    tenantId: string,
    query: AnalyticsSummaryQueryDto,
  ): Promise<AnalyticsReportDataset> {
    const { periodStart, periodEnd } = this.resolveAnalyticsPeriod(query);
    const requestedDataSource = query.dataSource ?? 'AUTO';
    const countryCodes = query.countryCode ? [query.countryCode] : undefined;

    if (requestedDataSource !== 'RAW') {
      const rollups = await this.repository.listDailyRollups({
        from: periodStart,
        to: periodEnd,
        tenantId,
        countryCodes,
        industryCode: query.industryCode,
      });

      if (requestedDataSource === 'ROLLUP' || rollups.length > 0) {
        return {
          periodStart,
          periodEnd,
          rollups,
          warehouse: this.reportWarehouse(requestedDataSource, 'DAILY_ROLLUPS', rollups.length),
        };
      }
    }

    const events = await this.repository.listEvents({
      tenantId,
      from: periodStart,
      to: periodEnd,
      countryCode: query.countryCode,
      industryCode: query.industryCode,
    });

    return {
      periodStart,
      periodEnd,
      events,
      warehouse: this.reportWarehouse(
        requestedDataSource,
        'RAW_EVENTS',
        0,
        requestedDataSource === 'AUTO' ? 'NO_ROLLUPS_AVAILABLE' : 'RAW_REQUESTED',
      ),
    };
  }

  private async listHierarchyAnalyticsForQuery(
    scope: ResolvedAnalyticsHierarchyScope,
    query: PlatformAnalyticsQueryDto,
  ): Promise<AnalyticsReportDataset> {
    const { periodStart, periodEnd } = this.resolveAnalyticsPeriod(query);
    const requestedDataSource = query.dataSource ?? 'AUTO';

    if (requestedDataSource !== 'RAW') {
      const rollups = await this.repository.listDailyRollups({
        from: periodStart,
        to: periodEnd,
        tenantId: scope.tenantId,
        countryCodes: scope.countryCodes,
        industryCode: query.industryCode,
      });

      if (requestedDataSource === 'ROLLUP' || rollups.length > 0) {
        return {
          periodStart,
          periodEnd,
          rollups,
          warehouse: this.reportWarehouse(requestedDataSource, 'DAILY_ROLLUPS', rollups.length),
        };
      }
    }

    const events = await this.repository.listEventsForScope({
      from: periodStart,
      to: periodEnd,
      tenantId: scope.tenantId,
      countryCodes: scope.countryCodes,
      industryCode: query.industryCode,
    });

    return {
      periodStart,
      periodEnd,
      events,
      warehouse: this.reportWarehouse(
        requestedDataSource,
        'RAW_EVENTS',
        0,
        requestedDataSource === 'AUTO' ? 'NO_ROLLUPS_AVAILABLE' : 'RAW_REQUESTED',
      ),
    };
  }

  private resolveAnalyticsPeriod(query: AnalyticsSummaryQueryDto): {
    periodStart: string;
    periodEnd: string;
  } {
    const periodEnd = query.to ?? new Date().toISOString();
    const periodStart =
      query.from ?? new Date(Date.parse(periodEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();
    this.assertValidIsoDate(periodStart);
    this.assertValidIsoDate(periodEnd);
    if (Date.parse(periodStart) > Date.parse(periodEnd)) {
      throw new UnprocessableEntityException('Invalid analytics date range.');
    }

    return { periodStart, periodEnd };
  }

  private reportWarehouse(
    requestedDataSource: AnalyticsReportDataSource,
    dataSource: AnalyticsResolvedDataSource,
    rollupRows: number,
    fallbackReason?: string,
  ): AnalyticsReportWarehouse {
    return {
      requestedDataSource,
      dataSource,
      rollupRows,
      fallbackReason,
    };
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

  private eventTotals(events: AnalyticsEvent[]): Record<AnalyticsEventType, number> {
    const totals = emptyAnalyticsTotals();
    for (const event of events) {
      totals[event.eventType] += 1;
    }
    return totals;
  }

  private rollupTotals(rollups: AnalyticsDailyRollup[]): Record<AnalyticsEventType, number> {
    const totals = emptyAnalyticsTotals();
    for (const rollup of rollups) {
      for (const eventType of Object.keys(totals) as AnalyticsEventType[]) {
        totals[eventType] += rollup.totals[eventType];
      }
    }
    return totals;
  }

  private rollupBreakdowns(rollups: AnalyticsDailyRollup[]): TenantAnalyticsReport['breakdowns'] {
    return {
      eventTypes: this.breakdownFromCounts(
        new Map(
          Object.entries(this.rollupTotals(rollups)).filter(([, value]) => value > 0) as Array<
            [string, number]
          >,
        ),
      ),
      entityTypes: this.rollupBreakdown(rollups, (rollup) => rollup.entityType),
      countries: this.rollupBreakdown(rollups, (rollup) => rollup.countryCode),
      industries: this.rollupBreakdown(
        rollups,
        (rollup) => rollup.industryCode ?? unspecifiedAnalyticsIndustryCode,
      ),
      consentStates: this.rollupBreakdown(rollups, (rollup) => rollup.consentState),
    };
  }

  private rollupBreakdown(
    rollups: AnalyticsDailyRollup[],
    labelFor: (rollup: AnalyticsDailyRollup) => string,
  ): AnalyticsBreakdown {
    const counts = new Map<string, number>();
    for (const rollup of rollups) {
      const label = labelFor(rollup);
      counts.set(label, (counts.get(label) ?? 0) + rollup.eventCount);
    }
    return this.breakdownFromCounts(counts);
  }

  private breakdownFromCounts(counts: Map<string, number>): AnalyticsBreakdown {
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  }

  private topEntitiesFromRollups(
    rollups: AnalyticsDailyRollup[],
  ): TenantAnalyticsSummary['topEntities'] {
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

    for (const rollup of rollups) {
      const key = `${rollup.entityType}:${rollup.entityId}`;
      const current = summaries.get(key) ?? {
        entityId: rollup.entityId,
        entityType: rollup.entityType,
        views: 0,
        clicks: 0,
        inquiries: 0,
        shares: 0,
        downloads: 0,
        lastEventAt: rollup.lastEventAt,
      };

      current.views += rollup.totals.VIEW + rollup.totals.IMPRESSION;
      current.clicks += rollup.totals.CLICK;
      current.inquiries += rollup.totals.INQUIRY;
      current.shares += rollup.totals.SHARE;
      current.downloads += rollup.totals.DOWNLOAD;
      if (rollup.lastEventAt > current.lastEventAt) {
        current.lastEventAt = rollup.lastEventAt;
      }

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

  private tenantReportToPdfLines(report: TenantAnalyticsReport): string[] {
    return [
      `Generated at: ${report.generatedAt}`,
      `Period: ${report.periodStart} to ${report.periodEnd}`,
      `Tenant: ${report.tenantId}`,
      `Filters: country=${report.filters.countryCode ?? 'ALL'} industry=${report.filters.industryCode ?? 'ALL'}`,
      `Warehouse: dataSource=${report.warehouse.dataSource}; requested=${report.warehouse.requestedDataSource}; rollupRows=${report.warehouse.rollupRows}; fallback=${report.warehouse.fallbackReason ?? 'NONE'}`,
      `Privacy: raw event metadata included=${report.privacy.rawEventMetadataIncluded}; scope=${report.privacy.exportScope}; consent=${report.privacy.consentBasis}`,
      '',
      ...this.analyticsTotalsToPdfLines(report.totals),
      '',
      ...this.topEntitiesToPdfLines('Top entities', report.topEntities),
      '',
      ...this.mostVisitedToPdfLines(report.mostVisited),
      '',
      ...this.analyticsBreakdownsToPdfLines(report.breakdowns),
    ];
  }

  private hierarchyReportToPdfLines(report: PlatformAnalyticsHierarchyReport): string[] {
    return [
      `Generated at: ${report.generatedAt}`,
      `Period: ${report.periodStart} to ${report.periodEnd}`,
      `Scope: ${report.scope.scopeLevel} ${report.scope.label}`,
      `Filters: region=${report.scope.regionCode ?? 'ALL'} continent=${report.scope.continentCode ?? 'ALL'} country=${report.scope.countryCode ?? 'ALL'} tenant=${report.scope.tenantId ?? 'ALL'}`,
      `Access: role=${report.access.role ?? 'UNSPECIFIED'} scope=${report.access.scopeLevel ?? 'UNSPECIFIED'} reason=${report.access.reason ?? 'UNSPECIFIED'}`,
      `Warehouse: dataSource=${report.warehouse.dataSource}; requested=${report.warehouse.requestedDataSource}; rollupRows=${report.warehouse.rollupRows}; fallback=${report.warehouse.fallbackReason ?? 'NONE'}`,
      `Privacy: raw event metadata included=${report.privacy.rawEventMetadataIncluded}; scope=${report.privacy.exportScope}; consent=${report.privacy.consentBasis}`,
      `Events: ${report.eventCount}`,
      '',
      ...this.analyticsTotalsToPdfLines(report.totals),
      '',
      ...this.topEntitiesToPdfLines('Top entities', report.topEntities),
      '',
      ...this.mostVisitedToPdfLines(report.mostVisited),
      '',
      ...this.breakdownToPdfLines('Top countries', report.topCountries),
      '',
      ...this.breakdownToPdfLines('Top industries', report.topIndustries),
      '',
      ...this.breakdownToPdfLines('Top tenants', report.topTenants),
      '',
      ...this.analyticsBreakdownsToPdfLines(report.breakdowns),
    ];
  }

  private analyticsTotalsToPdfLines(totals: Record<AnalyticsEventType, number>): string[] {
    return ['Totals:', ...Object.entries(totals).map(([label, value]) => `  ${label}: ${value}`)];
  }

  private topEntitiesToPdfLines(
    label: string,
    entities: TenantAnalyticsSummary['topEntities'],
  ): string[] {
    if (entities.length === 0) {
      return [`${label}: none`];
    }

    return [
      `${label}:`,
      ...entities.slice(0, 10).map((entity) => {
        const total =
          entity.views + entity.clicks + entity.inquiries + entity.shares + entity.downloads;
        return `  ${entity.entityType} ${entity.entityId}: ${total} total, ${entity.views} views, ${entity.clicks} clicks, ${entity.inquiries} inquiries, ${entity.shares} shares, ${entity.downloads} downloads, last ${entity.lastEventAt}`;
      }),
    ];
  }

  private mostVisitedToPdfLines(items: TenantAnalyticsSummary['mostVisited']): string[] {
    if (items.length === 0) {
      return ['Most visited: none'];
    }

    return [
      'Most visited:',
      ...items
        .slice(0, 10)
        .map((item) => `  ${item.entityType} ${item.entityId}: ${item.views} views`),
    ];
  }

  private analyticsBreakdownsToPdfLines(
    breakdowns: TenantAnalyticsReport['breakdowns'],
  ): string[] {
    return Object.entries(breakdowns).flatMap(([section, items]) => {
      const label = this.breakdownSectionLabel(section);
      if (items.length === 0) {
        return [`${label}: none`];
      }

      return [`${label}:`, ...items.slice(0, 10).map((item) => `  ${item.label}: ${item.value}`)];
    });
  }

  private breakdownToPdfLines(label: string, items: AnalyticsBreakdown): string[] {
    if (items.length === 0) {
      return [`${label}: none`];
    }

    const heading = label ? [`${label}:`] : [''];
    return [...heading, ...items.slice(0, 10).map((item) => `  ${item.label}: ${item.value}`)];
  }

  private breakdownSectionLabel(section: string): string {
    const labels: Record<string, string> = {
      eventTypes: 'Event types',
      entityTypes: 'Entity types',
      countries: 'Countries',
      industries: 'Industries',
      consentStates: 'Consent states',
    };

    return labels[section] ?? section;
  }

  private reportLinesToPdfBase64(title: string, lines: string[]): string {
    const wrappedLines = [title, '', ...lines].flatMap((line) => this.wrapPdfLine(line));
    const linesPerPage = 46;
    const pages: string[][] = [];
    for (let index = 0; index < wrappedLines.length; index += linesPerPage) {
      pages.push(wrappedLines.slice(index, index + linesPerPage));
    }

    const pageObjectNumber = (index: number) => 4 + index * 2;
    const contentObjectNumber = (index: number) => 5 + index * 2;
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${pages
        .map((_, index) => `${pageObjectNumber(index)} 0 R`)
        .join(' ')}] /Count ${pages.length} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    for (const [index, pageLines] of pages.entries()) {
      const stream = [
        'BT',
        '/F1 11 Tf',
        '50 770 Td',
        '14 TL',
        ...pageLines.map((line, lineIndex) =>
          lineIndex === 0
            ? `(${this.pdfEscape(line)}) Tj`
            : `T* (${this.pdfEscape(line)}) Tj`,
        ),
        'ET',
      ].join('\n');

      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber(index)} 0 R >>`,
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      );
    }

    const offsets: number[] = [0];
    let pdf = '%PDF-1.4\n';
    for (const [index, object] of objects.entries()) {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, 'latin1').toString('base64');
  }

  private wrapPdfLine(value: string, width = 92): string[] {
    const text = this.pdfText(value).replace(/\s+/g, ' ').trim();
    if (!text) {
      return [''];
    }

    const lines: string[] = [];
    let current = '';
    for (const word of text.split(' ')) {
      for (const part of this.splitPdfWord(word, width)) {
        if (!current) {
          current = part;
        } else if (current.length + part.length + 1 <= width) {
          current = `${current} ${part}`;
        } else {
          lines.push(current);
          current = part;
        }
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  private splitPdfWord(value: string, width: number): string[] {
    const parts: string[] = [];
    for (let index = 0; index < value.length; index += width) {
      parts.push(value.slice(index, index + width));
    }
    return parts.length > 0 ? parts : [''];
  }

  private pdfEscape(value: string): string {
    return this.pdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private pdfText(value: string): string {
    return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
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
      ['warehouse', 'dataSource', report.warehouse.dataSource, '', ''],
      ['warehouse', 'requestedDataSource', report.warehouse.requestedDataSource, '', ''],
      ['warehouse', 'rollupRows', String(report.warehouse.rollupRows), '', ''],
      ['warehouse', 'fallbackReason', report.warehouse.fallbackReason ?? '', '', ''],
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

  private hierarchyReportToCsv(report: PlatformAnalyticsHierarchyReport): string {
    const rows: string[][] = [
      ['section', 'label', 'value', 'entityType', 'lastEventAt'],
      ['period', 'scopeLevel', report.scope.scopeLevel, '', ''],
      ['period', 'scopeLabel', report.scope.label, '', ''],
      ['period', 'periodStart', report.periodStart, '', ''],
      ['period', 'periodEnd', report.periodEnd, '', ''],
      ['period', 'generatedAt', report.generatedAt, '', ''],
      ['period', 'eventCount', String(report.eventCount), '', ''],
      [
        'privacy',
        'rawEventMetadataIncluded',
        String(report.privacy.rawEventMetadataIncluded),
        '',
        '',
      ],
      ['privacy', 'exportScope', report.privacy.exportScope, '', ''],
      ['access', 'role', report.access.role ?? '', '', ''],
      ['access', 'scopeLevel', report.access.scopeLevel ?? '', '', ''],
      ['access', 'reason', report.access.reason ?? '', '', ''],
      ['warehouse', 'dataSource', report.warehouse.dataSource, '', ''],
      ['warehouse', 'requestedDataSource', report.warehouse.requestedDataSource, '', ''],
      ['warehouse', 'rollupRows', String(report.warehouse.rollupRows), '', ''],
      ['warehouse', 'fallbackReason', report.warehouse.fallbackReason ?? '', '', ''],
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

    for (const item of report.topCountries) {
      rows.push(['top_countries', item.label, String(item.value), '', '']);
    }

    for (const item of report.topIndustries) {
      rows.push(['top_industries', item.label, String(item.value), '', '']);
    }

    for (const item of report.topTenants) {
      rows.push(['top_tenants', item.label, String(item.value), '', '']);
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
