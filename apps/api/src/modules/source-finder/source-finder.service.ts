import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SourceFinderSearchError,
  applySourceFinderOutcomes,
  attachApprovedRelationshipClaims,
  buildNotificationDeliveryPlan,
  buildOpportunityAlert,
  buildSourceFinderHierarchyReport,
  buildSourceFinderIndexDocument,
  attachSourceFinderEmbeddingRanks,
  createSavedSourceFinderSearch,
  createSourceFinderOutcomeFeedback,
  defaultNotificationPreferences,
  evaluateSafetyFields,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  isOpportunityAlertDue,
  pilotSourceFinderRecords,
  rankSourceFinderWithFullText,
  resolveSourceFinderSearchMode,
  searchSourceFinderRecords,
  selectOpportunityMatches,
  toSourceFinderRecord,
  type SavedSourceFinderSearch,
  type SourceFinderIndexDocument,
  type SourceFinderOpportunityAlert,
  type SourceFinderOutcomeFeedback,
  type SourceFinderRecord,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RelationshipsService } from '../relationships/relationships.service';
import type {
  CreateSavedSourceFinderSearchDto,
  RecordSourceFinderOutcomeDto,
  RebuildSourceFinderIndexDto,
  RunSourceFinderOpportunityAlertsDto,
  SearchSourceFinderDto,
  SourceFinderHierarchyQueryDto,
} from './dto/search-source-finder.dto';
import { InMemorySourceFinderRepository } from './in-memory-source-finder.repository';
import { SOURCE_FINDER_REPOSITORY, type SourceFinderRepository } from './source-finder.repository';
import {
  SOURCE_FINDER_EMBEDDER,
  type SourceFinderEmbedder,
} from './openai-embeddings';

@Injectable()
export class SourceFinderService {
  private readonly repository: SourceFinderRepository;
  private readonly embedder?: SourceFinderEmbedder;

  constructor(
    @Optional()
    @Inject(SOURCE_FINDER_REPOSITORY)
    repository?: SourceFinderRepository,
    @Optional() private readonly relationships?: RelationshipsService,
    @Optional() private readonly auth?: AuthService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional()
    @Inject(SOURCE_FINDER_EMBEDDER)
    embedder?: SourceFinderEmbedder | null,
  ) {
    this.repository = repository ?? new InMemorySourceFinderRepository();
    this.embedder = embedder ?? undefined;
  }

  async search(input: SearchSourceFinderDto, tenantId?: string) {
    const records = await this.safeRecords(input);
    const indexedDocuments = await this.repository.listIndexDocuments();
    const hits =
      indexedDocuments.length > 0
        ? await this.repository.searchIndexDocuments({
            query: input.query,
            countryCode: input.countryCode,
            industryCode: input.industryCode,
            role: input.role,
          })
        : [];
    const queryEmbedding = await this.embedQuery(input.query);
    const rankedHits = attachSourceFinderEmbeddingRanks(hits, indexedDocuments, queryEmbedding);
    const ranked = rankSourceFinderWithFullText(input, records, rankedHits);
    const feedback = tenantId ? await this.repository.listOutcomeFeedback(tenantId) : [];
    const results = applySourceFinderOutcomes(ranked, feedback, {
      behavioralMatchingConsent: input.behavioralMatchingConsent === true,
    });
    const ftsHitCount = rankedHits.filter((hit) => hit.ftsRank > 0).length;
    const embeddingHitCount = rankedHits.filter((hit) => (hit.embeddingRank ?? 0) > 0).length;
    const searchMode = resolveSourceFinderSearchMode({
      indexedDocumentCount: indexedDocuments.length,
      query: input.query,
      ftsHitCount,
      embeddingHitCount,
    });

    return {
      query: input.query,
      sortBy: input.sortBy ?? 'RELEVANCE',
      searchMode,
      behavioralMatchingConsent: input.behavioralMatchingConsent === true,
      filters: {
        countryCode: input.countryCode ?? null,
        industryCode: input.industryCode ?? null,
        role: input.role ?? null,
      },
      indexedDocuments: indexedDocuments.length,
      total: results.length,
      results,
    };
  }

  async rebuildIndex(
    input: RebuildSourceFinderIndexDto = {},
    actorUserId?: string,
    tenantId?: string,
  ) {
    const now = input.now ?? new Date().toISOString();
    const sources = input.includePilot === false ? [] : [...pilotSourceFinderRecords];
    const documents = sources.map((record) => {
      this.assertSafe(record, 'Source Finder index document contains blocked content.');
      return buildSourceFinderIndexDocument(record, now);
    });
    const embeddedDocuments = await this.embedIndexDocuments(documents);
    await this.repository.replaceIndexDocuments(embeddedDocuments, tenantId);
    if (tenantId) {
      await this.auth?.recordTenantAudit({
        tenantId,
        actorUserId,
        action: 'SOURCE_FINDER_INDEX_REBUILT',
        entityType: 'SOURCE_FINDER_INDEX',
        entityId: tenantId,
        metadata: {
          indexed: embeddedDocuments.length,
          embedded: embeddedDocuments.filter((document) => Boolean(document.embedding?.length)).length,
          embeddingProvider: this.embedder?.provider ?? 'none',
          includePilot: input.includePilot !== false,
        },
      });
    }

    return {
      indexedAt: now,
      indexed: embeddedDocuments.length,
      embedded: embeddedDocuments.filter((document) => Boolean(document.embedding?.length)).length,
      documents: embeddedDocuments.map((document) => this.indexSummary(document)),
    };
  }

  async listIndex() {
    const documents = await this.repository.listIndexDocuments();
    return {
      total: documents.length,
      documents: documents.map((document) => this.indexSummary(document)),
    };
  }

  async hierarchy(input: SourceFinderHierarchyQueryDto = {}) {
    this.assertSupportedFilters(input);
    const records = await this.graphRecords();
    return buildSourceFinderHierarchyReport(records, input);
  }

  async recordOutcome(
    tenantId: string,
    input: RecordSourceFinderOutcomeDto,
    actorUserId?: string,
  ): Promise<SourceFinderOutcomeFeedback> {
    this.assertSafe(input, 'Source Finder outcome contains blocked content.');
    await this.requireSource(input.sourceRecordId);

    const feedback = this.runDomain(() =>
      createSourceFinderOutcomeFeedback(input, { tenantId, id: randomUUID() }),
    );
    await this.repository.createOutcomeFeedback(feedback);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'SOURCE_FINDER_OUTCOME_RECORDED',
      entityType: 'SOURCE_FINDER_OUTCOME',
      entityId: feedback.id,
      metadata: {
        sourceRecordId: feedback.sourceRecordId,
        action: feedback.action,
        behavioralMatchingConsent: feedback.behavioralMatchingConsent,
        noteLength: feedback.note?.length ?? 0,
      },
    });

    return feedback;
  }

  async listOutcomeFeedback(tenantId: string): Promise<SourceFinderOutcomeFeedback[]> {
    return this.repository.listOutcomeFeedback(tenantId);
  }

  async createSavedSearch(
    tenantId: string,
    input: CreateSavedSourceFinderSearchDto,
    actorUserId?: string,
  ) {
    this.assertSafe(input, 'Saved search contains blocked content.');
    this.assertSupportedFilters(input);

    const search = this.runDomain(() =>
      createSavedSourceFinderSearch(input, { tenantId, id: randomUUID() }),
    );
    await this.repository.createSavedSearch(search);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'SOURCE_FINDER_SAVED_SEARCH_CREATED',
      entityType: 'SOURCE_FINDER_SAVED_SEARCH',
      entityId: search.id,
      metadata: {
        countryCode: search.countryCode ?? null,
        industryCode: search.industryCode ?? null,
        role: search.role ?? null,
        alertFrequency: search.alertFrequency,
      },
    });

    return search;
  }

  async listSavedSearches(tenantId: string): Promise<SavedSourceFinderSearch[]> {
    return this.repository.listSavedSearches(tenantId);
  }

  async listOpportunityAlerts(tenantId: string): Promise<SourceFinderOpportunityAlert[]> {
    return this.repository.listOpportunityAlerts(tenantId);
  }

  async runOpportunityAlerts(
    tenantId: string,
    input: RunSourceFinderOpportunityAlertsDto = {},
    actorUserId?: string,
  ) {
    const now = input.now ?? new Date().toISOString();
    const limit = input.limit ?? 5;
    const searches = input.savedSearchId
      ? [await this.requireSavedSearch(tenantId, input.savedSearchId)]
      : (await this.repository.listSavedSearches(tenantId)).filter((search) => search.isActive);
    const alertsCreated: SourceFinderOpportunityAlert[] = [];
    const records = await this.graphRecords();

    for (const search of searches) {
      if (!isOpportunityAlertDue(search, now)) {
        continue;
      }

      const querySafety = evaluateSafetyText(search.query);
      if (!querySafety.allowed) {
        continue;
      }

      const results = selectOpportunityMatches(
        searchSourceFinderRecords(
          {
            query: search.query,
            role: search.role,
            industryCode: search.industryCode,
            countryCode: search.countryCode,
            sortBy: search.sortBy ?? 'RELEVANCE',
          },
          records,
        ),
        limit,
      );

      for (const result of results) {
        const existing = await this.repository.findOpportunityAlert(
          tenantId,
          search.id,
          result.id,
        );
        if (existing) {
          continue;
        }

        const alert = buildOpportunityAlert(search, result, randomUUID(), now);
        await this.repository.createOpportunityAlert(alert);
        alertsCreated.push(alert);
      }

      await this.repository.updateSavedSearch({
        ...search,
        lastAlertedAt: now,
        updatedAt: now,
      });
    }

    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'SOURCE_FINDER_OPPORTUNITY_ALERTS_RUN',
      entityType: 'SOURCE_FINDER_SAVED_SEARCH',
      metadata: {
        savedSearchesChecked: searches.length,
        alertsCreated: alertsCreated.length,
      },
    });

    return {
      checkedAt: now,
      savedSearchesChecked: searches.length,
      alertsCreated,
      deliveryPlans: await Promise.all(
        alertsCreated.map(async (alert) => {
          const plan = this.planDelivery(alert);
          const outbox = await this.notifications?.planAndQueue(tenantId, {
            eventType: 'SOURCE_FINDER_OPPORTUNITY',
            severity: alert.score >= 80 ? 'HIGH' : 'MEDIUM',
            title: alert.title,
            message: alert.message,
            entityType: 'source-finder-alert',
            entityId: alert.id,
          });
          return {
            ...plan,
            outboxId: outbox?.id,
            dispatchStatuses: outbox?.channelStatuses,
          };
        }),
      ),
    };
  }

  async runAllOpportunityAlerts(input: RunSourceFinderOpportunityAlertsDto = {}) {
    const checkedAt = input.now ?? new Date().toISOString();
    const searches = await this.repository.listAllSavedSearches();
    const tenantIds = [...new Set(searches.map((search) => search.tenantId))];

    return {
      checkedAt,
      tenantsChecked: tenantIds.length,
      results: await Promise.all(
        tenantIds.map(async (tenantId) => ({
          tenantId,
          ...(await this.runOpportunityAlerts(tenantId, { ...input, now: checkedAt })),
        })),
      ),
    };
  }

  private planDelivery(alert: SourceFinderOpportunityAlert) {
    const country = getCountry('KE');
    return buildNotificationDeliveryPlan({
      eventType: 'SOURCE_FINDER_OPPORTUNITY',
      severity: alert.score >= 80 ? 'HIGH' : 'MEDIUM',
      title: alert.title,
      message: alert.message,
      recipient: {
        countryCode: country?.code ?? 'KE',
        locale: country?.locale ?? 'en-KE',
        timezone: country?.timezone ?? 'Africa/Nairobi',
        preferences: defaultNotificationPreferences,
      },
    });
  }

  private async requireSource(sourceRecordId: string): Promise<SourceFinderRecord> {
    const indexed = await this.repository.findIndexDocument(sourceRecordId);
    const record =
      (indexed ? toSourceFinderRecord(indexed) : undefined) ??
      (await this.catalogRecords()).find((item) => item.id === sourceRecordId);
    if (!record) {
      throw new NotFoundException('Source Finder record not found.');
    }

    return record;
  }

  private async requireSavedSearch(
    tenantId: string,
    id: string,
  ): Promise<SavedSourceFinderSearch> {
    const search = await this.repository.findSavedSearch(tenantId, id);
    if (!search) {
      throw new NotFoundException('Saved Source Finder search not found.');
    }

    return search;
  }

  private async safeRecords(input: SearchSourceFinderDto) {
    const safety = evaluateSafetyText(input.query);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This Source Finder search matches a zero-tolerance blocked category.',
        safety,
      });
    }

    this.assertSafe(input, 'This Source Finder request contains blocked content.');
    this.assertSupportedFilters(input);
    return this.graphRecords();
  }

  private async graphRecords(): Promise<SourceFinderRecord[]> {
    const graphClaims = this.relationships ? await this.relationships.listGraph() : [];
    return attachApprovedRelationshipClaims(await this.catalogRecords(), graphClaims);
  }

  private async catalogRecords(): Promise<SourceFinderRecord[]> {
    const indexed = await this.repository.listIndexDocuments();
    if (indexed.length === 0) {
      return pilotSourceFinderRecords;
    }
    return indexed.map((document) => toSourceFinderRecord(document));
  }

  private async embedQuery(query: string): Promise<number[] | undefined> {
    if (!this.embedder || !query.trim()) {
      return undefined;
    }

    try {
      return await this.embedder.embed(query);
    } catch {
      if (this.embedder.required) {
        throw new UnprocessableEntityException('Source Finder embeddings are unavailable.');
      }
      return undefined;
    }
  }

  private async embedIndexDocuments(
    documents: SourceFinderIndexDocument[],
  ): Promise<SourceFinderIndexDocument[]> {
    if (!this.embedder || documents.length === 0) {
      return documents;
    }

    try {
      const embeddings = await this.embedder.embedBatch(documents.map((document) => document.searchText));
      return documents.map((document, index) =>
        embeddings[index]?.length ? { ...document, embedding: embeddings[index] } : document,
      );
    } catch {
      if (this.embedder.required) {
        throw new UnprocessableEntityException('Source Finder embeddings are unavailable.');
      }
      return documents;
    }
  }

  private indexSummary(document: SourceFinderIndexDocument) {
    return {
      id: document.id,
      name: document.name,
      role: document.role,
      industryCode: document.industryCode,
      countryCode: document.countryCode,
      location: document.location,
      indexedAt: document.indexedAt,
      embedded: Boolean(document.embedding?.length),
    };
  }

  private assertSupportedFilters(
    input: Pick<SearchSourceFinderDto, 'countryCode' | 'industryCode'>,
  ): void {
    if (input.countryCode && !getCountry(input.countryCode)) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (
      input.industryCode &&
      input.industryCode !== 'ALL' &&
      !industryCategories.some((industry) => industry.code === input.industryCode)
    ) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }

  private runDomain<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof SourceFinderSearchError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
