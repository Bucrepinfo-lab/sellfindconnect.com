import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type SavedSourceFinderSearch as PrismaSavedSearch,
  type SourceFinderIndex as PrismaSourceFinderIndex,
  type SourceFinderOpportunityAlert as PrismaOpportunityAlert,
  type SourceFinderOutcomeFeedback as PrismaOutcomeFeedback,
} from '@prisma/client';
import {
  buildSourceFinderTsQuery,
  opportunityAlertFrequencies,
  searchSourceFinderIndexDocuments,
  sourceFinderOutcomeActions,
  sourceFinderReasonCodes,
  sourceFinderSortOptions,
  supplyChainRoles,
  type OpportunityAlertFrequency,
  type SavedSourceFinderSearch,
  type SourceFinderIndexDocument,
  type SourceFinderIndexSearchHit,
  type SourceFinderIndexSearchInput,
  type SourceFinderOpportunityAlert,
  type SourceFinderOutcomeAction,
  type SourceFinderOutcomeFeedback,
  type SourceFinderReasonCode,
  type SourceFinderSortOption,
  type SupplyChainRole,
} from '@telpen/domain';

import type { SourceFinderRepository } from './source-finder.repository';

export function createSourceFinderPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaSourceFinderRepository implements SourceFinderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSavedSearch(search: SavedSourceFinderSearch): Promise<void> {
    await this.prisma.savedSourceFinderSearch.create({ data: this.toSearchData(search) });
  }

  async updateSavedSearch(search: SavedSourceFinderSearch): Promise<void> {
    const data = this.toSearchData(search);
    await this.prisma.savedSourceFinderSearch.update({
      where: { id: search.id },
      data: {
        name: data.name,
        query: data.query,
        role: data.role,
        industryCode: data.industryCode,
        countryCode: data.countryCode,
        sortBy: data.sortBy,
        alertFrequency: data.alertFrequency,
        isActive: data.isActive,
        lastAlertedAt: data.lastAlertedAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findSavedSearch(
    tenantId: string,
    id: string,
  ): Promise<SavedSourceFinderSearch | undefined> {
    const record = await this.prisma.savedSourceFinderSearch.findFirst({ where: { id, tenantId } });
    return record ? this.fromSearch(record) : undefined;
  }

  async listSavedSearches(tenantId: string): Promise<SavedSourceFinderSearch[]> {
    const records = await this.prisma.savedSourceFinderSearch.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromSearch(record));
  }

  async listAllSavedSearches(): Promise<SavedSourceFinderSearch[]> {
    const records = await this.prisma.savedSourceFinderSearch.findMany();
    return records.map((record) => this.fromSearch(record));
  }

  async createOpportunityAlert(alert: SourceFinderOpportunityAlert): Promise<void> {
    await this.prisma.sourceFinderOpportunityAlert.create({ data: this.toAlertData(alert) });
  }

  async findOpportunityAlert(
    tenantId: string,
    savedSearchId: string,
    sourceRecordId: string,
  ): Promise<SourceFinderOpportunityAlert | undefined> {
    const record = await this.prisma.sourceFinderOpportunityAlert.findFirst({
      where: { tenantId, savedSearchId, sourceRecordId },
    });
    return record ? this.fromAlert(record) : undefined;
  }

  async listOpportunityAlerts(tenantId: string): Promise<SourceFinderOpportunityAlert[]> {
    const records = await this.prisma.sourceFinderOpportunityAlert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromAlert(record));
  }

  async createOutcomeFeedback(feedback: SourceFinderOutcomeFeedback): Promise<void> {
    await this.prisma.sourceFinderOutcomeFeedback.create({
      data: {
        id: feedback.id,
        tenantId: feedback.tenantId,
        sourceRecordId: feedback.sourceRecordId,
        query: feedback.query ?? null,
        action: feedback.action,
        note: feedback.note ?? null,
        behavioralMatchingConsent: feedback.behavioralMatchingConsent,
        createdAt: new Date(feedback.createdAt),
      },
    });
  }

  async listOutcomeFeedback(tenantId: string): Promise<SourceFinderOutcomeFeedback[]> {
    const records = await this.prisma.sourceFinderOutcomeFeedback.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromOutcome(record));
  }

  async upsertIndexDocument(
    document: SourceFinderIndexDocument,
    tenantId?: string,
  ): Promise<void> {
    const data = this.toIndexData(document, tenantId);
    await this.prisma.sourceFinderIndex.upsert({
      where: { sourceRecordId: document.id },
      create: data,
      update: {
        tenantId: data.tenantId,
        name: data.name,
        role: data.role,
        industryCode: data.industryCode,
        countryCode: data.countryCode,
        location: data.location,
        offers: data.offers,
        needs: data.needs,
        relatedLinks: data.relatedLinks,
        verified: data.verified,
        publishedAt: data.publishedAt,
        responseTimeMinutes: data.responseTimeMinutes,
        analytics: data.analytics,
        searchText: data.searchText,
        tokenVector: data.tokenVector,
        indexedAt: data.indexedAt,
        updatedAt: new Date(),
      },
    });
  }

  async replaceIndexDocuments(
    documents: SourceFinderIndexDocument[],
    tenantId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.sourceFinderIndex.deleteMany();
      if (documents.length === 0) {
        return;
      }
      await tx.sourceFinderIndex.createMany({
        data: documents.map((document) => this.toIndexData(document, tenantId)),
      });
    });
  }

  async findIndexDocument(sourceRecordId: string): Promise<SourceFinderIndexDocument | undefined> {
    const record = await this.prisma.sourceFinderIndex.findUnique({
      where: { sourceRecordId },
    });
    return record ? this.fromIndex(record) : undefined;
  }

  async listIndexDocuments(): Promise<SourceFinderIndexDocument[]> {
    const records = await this.prisma.sourceFinderIndex.findMany({
      orderBy: { indexedAt: 'desc' },
    });
    return records.map((record) => this.fromIndex(record));
  }

  async searchIndexDocuments(
    input: SourceFinderIndexSearchInput = {},
  ): Promise<SourceFinderIndexSearchHit[]> {
    const query = input.query?.trim() ?? '';
    if (!query) {
      return searchSourceFinderIndexDocuments(await this.listIndexDocuments(), input);
    }

    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let placeholder = 1;
      if (input.countryCode) {
        conditions.push(`"countryCode" = $${placeholder++}`);
        params.push(input.countryCode);
      }
      if (input.industryCode && input.industryCode !== 'ALL') {
        conditions.push(`"industryCode" = $${placeholder++}`);
        params.push(input.industryCode);
      }
      if (input.role && input.role !== 'ALL') {
        conditions.push(`"role" = $${placeholder++}`);
        params.push(input.role);
      }
      params.push(buildSourceFinderTsQuery(query));
      const tsQueryPlaceholder = placeholder;
      conditions.push(`"searchVector" @@ to_tsquery('english', $${tsQueryPlaceholder})`);
      const sql = `SELECT "id", "sourceRecordId", "tenantId", "name", "role", "industryCode", "countryCode", "location", "offers", "needs", "relatedLinks", "verified", "publishedAt", "responseTimeMinutes", "analytics", "searchText", "tokenVector", "indexedAt", "createdAt", "updatedAt", ts_rank("searchVector", to_tsquery('english', $${tsQueryPlaceholder})) AS "ftsRank" FROM "SourceFinderIndex" WHERE ${conditions.join(' AND ')} ORDER BY "ftsRank" DESC, "indexedAt" DESC`;
      const rows = (await this.prisma.$queryRawUnsafe(sql, ...params)) as Array<
        PrismaSourceFinderIndex & { ftsRank: number | string }
      >;
      return rows.map((row) => ({
        document: this.fromIndex(row),
        ftsRank: Number(row.ftsRank) || 0,
      }));
    } catch {
      return searchSourceFinderIndexDocuments(await this.listIndexDocuments(), input);
    }
  }

  private toSearchData(search: SavedSourceFinderSearch) {
    return {
      id: search.id,
      tenantId: search.tenantId,
      name: search.name,
      query: search.query,
      role: search.role ?? null,
      industryCode: search.industryCode ?? null,
      countryCode: search.countryCode ?? null,
      sortBy: search.sortBy ?? null,
      alertFrequency: search.alertFrequency,
      isActive: search.isActive,
      lastAlertedAt: search.lastAlertedAt ? new Date(search.lastAlertedAt) : null,
      createdAt: new Date(search.createdAt),
      updatedAt: new Date(search.updatedAt),
    };
  }

  private toAlertData(alert: SourceFinderOpportunityAlert) {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      savedSearchId: alert.savedSearchId,
      sourceRecordId: alert.sourceRecordId,
      sourceName: alert.sourceName,
      sourceRole: alert.sourceRole,
      title: alert.title,
      message: alert.message,
      score: alert.score,
      reasonCodes: alert.reasonCodes as Prisma.InputJsonValue,
      createdAt: new Date(alert.createdAt),
    };
  }

  private fromSearch(record: PrismaSavedSearch): SavedSourceFinderSearch {
    const role = record.role as SupplyChainRole | 'ALL' | null;
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      query: record.query,
      role: role === 'ALL' || (role && supplyChainRoles.includes(role)) ? role : undefined,
      industryCode: record.industryCode ?? undefined,
      countryCode: record.countryCode ?? undefined,
      sortBy: sourceFinderSortOptions.includes(record.sortBy as SourceFinderSortOption)
        ? (record.sortBy as SourceFinderSortOption)
        : undefined,
      alertFrequency: opportunityAlertFrequencies.includes(record.alertFrequency as OpportunityAlertFrequency)
        ? (record.alertFrequency as OpportunityAlertFrequency)
        : 'DAILY',
      isActive: record.isActive,
      lastAlertedAt: record.lastAlertedAt?.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private fromAlert(record: PrismaOpportunityAlert): SourceFinderOpportunityAlert {
    const reasonCodes = Array.isArray(record.reasonCodes)
      ? record.reasonCodes.filter((code): code is SourceFinderReasonCode =>
          sourceFinderReasonCodes.includes(code as SourceFinderReasonCode),
        )
      : [];

    return {
      id: record.id,
      tenantId: record.tenantId,
      savedSearchId: record.savedSearchId,
      sourceRecordId: record.sourceRecordId,
      sourceName: record.sourceName,
      sourceRole: supplyChainRoles.includes(record.sourceRole as SupplyChainRole)
        ? (record.sourceRole as SupplyChainRole)
        : 'SUPPLIER',
      title: record.title,
      message: record.message,
      score: record.score,
      reasonCodes,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private fromOutcome(record: PrismaOutcomeFeedback): SourceFinderOutcomeFeedback {
    return {
      id: record.id,
      tenantId: record.tenantId,
      sourceRecordId: record.sourceRecordId,
      query: record.query ?? undefined,
      action: sourceFinderOutcomeActions.includes(record.action as SourceFinderOutcomeAction)
        ? (record.action as SourceFinderOutcomeAction)
        : 'SAVE',
      note: record.note ?? undefined,
      behavioralMatchingConsent: record.behavioralMatchingConsent,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private toIndexData(document: SourceFinderIndexDocument, tenantId?: string) {
    return {
      id: document.id,
      sourceRecordId: document.id,
      tenantId: tenantId ?? null,
      name: document.name,
      role: document.role,
      industryCode: document.industryCode,
      countryCode: document.countryCode,
      location: document.location,
      offers: document.offers as Prisma.InputJsonValue,
      needs: document.needs as Prisma.InputJsonValue,
      relatedLinks: document.relatedLinks as Prisma.InputJsonValue,
      verified: document.verified,
      publishedAt: new Date(document.publishedAt),
      responseTimeMinutes: document.responseTimeMinutes,
      analytics: document.analytics as Prisma.InputJsonValue,
      searchText: document.searchText,
      tokenVector: document.tokenVector as Prisma.InputJsonValue,
      indexedAt: new Date(document.indexedAt),
      createdAt: new Date(document.publishedAt),
      updatedAt: new Date(document.indexedAt),
    };
  }

  private fromIndex(record: PrismaSourceFinderIndex): SourceFinderIndexDocument {
    return {
      id: record.sourceRecordId,
      name: record.name,
      role: supplyChainRoles.includes(record.role as SupplyChainRole)
        ? (record.role as SupplyChainRole)
        : 'SUPPLIER',
      industryCode: record.industryCode,
      countryCode: record.countryCode,
      location: record.location,
      offers: this.stringArray(record.offers),
      needs: this.stringArray(record.needs),
      relatedLinks: this.relatedLinks(record.relatedLinks),
      verified: record.verified,
      publishedAt: this.toIso(record.publishedAt),
      responseTimeMinutes: record.responseTimeMinutes,
      analytics: this.analytics(record.analytics),
      searchText: record.searchText,
      tokenVector:
        record.tokenVector && typeof record.tokenVector === 'object' && !Array.isArray(record.tokenVector)
          ? (record.tokenVector as SourceFinderIndexDocument['tokenVector'])
          : {},
      indexedAt: this.toIso(record.indexedAt),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private relatedLinks(value: Prisma.JsonValue): SourceFinderIndexDocument['relatedLinks'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }
      const link = item as Record<string, unknown>;
      const role = typeof link.role === 'string' && supplyChainRoles.includes(link.role as SupplyChainRole)
        ? (link.role as SupplyChainRole)
        : undefined;
      const relationship = link.relationship;
      if (
        typeof link.id !== 'string' ||
        typeof link.label !== 'string' ||
        !role ||
        (relationship !== 'SUPPLIES' &&
          relationship !== 'BUYS_FROM' &&
          relationship !== 'DISTRIBUTES' &&
          relationship !== 'SERVES' &&
          relationship !== 'FINANCES' &&
          relationship !== 'CERTIFIES') ||
        typeof link.confidence !== 'number'
      ) {
        return [];
      }
      return [
        {
          id: link.id,
          label: link.label,
          role,
          relationship,
          confidence: link.confidence,
        },
      ];
    });
  }

  private analytics(value: Prisma.JsonValue): SourceFinderIndexDocument['analytics'] {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const numbers = record as Record<string, unknown>;
    return {
      views: typeof numbers.views === 'number' ? numbers.views : 0,
      clicks: typeof numbers.clicks === 'number' ? numbers.clicks : 0,
      inquiries: typeof numbers.inquiries === 'number' ? numbers.inquiries : 0,
      shares: typeof numbers.shares === 'number' ? numbers.shares : 0,
      downloads: typeof numbers.downloads === 'number' ? numbers.downloads : 0,
    };
  }
}
