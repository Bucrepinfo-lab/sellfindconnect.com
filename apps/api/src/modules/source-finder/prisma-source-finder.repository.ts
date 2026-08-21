import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type SavedSourceFinderSearch as PrismaSavedSearch,
  type SourceFinderOpportunityAlert as PrismaOpportunityAlert,
  type SourceFinderOutcomeFeedback as PrismaOutcomeFeedback,
} from '@prisma/client';
import {
  opportunityAlertFrequencies,
  sourceFinderOutcomeActions,
  sourceFinderReasonCodes,
  sourceFinderSortOptions,
  supplyChainRoles,
  type OpportunityAlertFrequency,
  type SavedSourceFinderSearch,
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
}
