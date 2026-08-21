import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SourceFinderSearchError,
  attachApprovedRelationshipClaims,
  buildNotificationDeliveryPlan,
  buildOpportunityAlert,
  createSavedSourceFinderSearch,
  defaultNotificationPreferences,
  evaluateSafetyFields,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  isOpportunityAlertDue,
  pilotSourceFinderRecords,
  searchSourceFinderRecords,
  selectOpportunityMatches,
  type SavedSourceFinderSearch,
  type SourceFinderOpportunityAlert,
  type SourceFinderRecord,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import { RelationshipsService } from '../relationships/relationships.service';
import type {
  CreateSavedSourceFinderSearchDto,
  RunSourceFinderOpportunityAlertsDto,
  SearchSourceFinderDto,
} from './dto/search-source-finder.dto';
import { InMemorySourceFinderRepository } from './in-memory-source-finder.repository';
import { SOURCE_FINDER_REPOSITORY, type SourceFinderRepository } from './source-finder.repository';

@Injectable()
export class SourceFinderService {
  private readonly records: SourceFinderRecord[] = pilotSourceFinderRecords;
  private readonly repository: SourceFinderRepository;

  constructor(
    @Optional()
    @Inject(SOURCE_FINDER_REPOSITORY)
    repository?: SourceFinderRepository,
    @Optional() private readonly relationships?: RelationshipsService,
    @Optional() private readonly auth?: AuthService,
  ) {
    this.repository = repository ?? new InMemorySourceFinderRepository();
  }

  async search(input: SearchSourceFinderDto) {
    const records = await this.safeRecords(input);
    const results = searchSourceFinderRecords(input, records);

    return {
      query: input.query,
      sortBy: input.sortBy ?? 'RELEVANCE',
      filters: {
        countryCode: input.countryCode ?? null,
        industryCode: input.industryCode ?? null,
        role: input.role ?? null,
      },
      total: results.length,
      results,
    };
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
      deliveryPlans: alertsCreated.map((alert) => this.planDelivery(alert)),
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
    return attachApprovedRelationshipClaims(this.records, graphClaims);
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
