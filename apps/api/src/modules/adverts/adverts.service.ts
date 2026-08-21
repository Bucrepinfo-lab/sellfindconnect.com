import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  advertLifecyclePolicy,
  buildDiscoveryIndexDocument,
  calculateAdvertLifecycle,
  evaluateMediaAssetInput,
  evaluateMediaUploadPreparationInput,
  evaluateSafetyFields,
  getCountry,
  inferDesiredDiscoveryRoles,
  industryCategories,
  mediaPolicy,
  scoreDiscoveryVector,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type AdvertDraft,
  type AdvertPost,
  type DiscoveryRelationshipSignal,
  type MediaAsset,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  enqueueMediaProcessingJobs,
  type MediaAdapters,
  type MediaProcessingJob,
} from '../media/media.adapters';
import {
  ADVERTS_REPOSITORY,
  type AdvertDiscoveryAlertRecord,
  type AdvertDiscoveryIndexRecord,
  type AdvertNotification,
  type AdvertsRepository,
  type SavedAdvertSearchRecord,
} from './adverts.repository';
import type {
  BoostAdvertDto,
  CreateAdvertDto,
  CreateAdvertMediaDto,
  CreateSavedAdvertSearchDto,
  DuplicateAdvertDto,
  PrepareAdvertMediaUploadDto,
  PublicAdvertSearchDto,
  PublishAdvertDraftDto,
  RecordAdvertDiscoveryEventDto,
  RenewAdvertDto,
  RunAdvertLifecycleDto,
  RunSavedAdvertSearchAlertsDto,
  UpdateAdvertDraftDto,
} from './dto/create-advert.dto';
import { InMemoryAdvertsRepository } from './in-memory-adverts.repository';

type MediaSlots = { used: number; max: number; remaining: number };
type AdvertDraftWithPreview = AdvertDraft & {
  preview: {
    country: ReturnType<typeof getCountry>;
    industry: (typeof industryCategories)[number] | undefined;
    media: MediaAsset[];
    mediaSlots: MediaSlots;
    lifecycle?: ReturnType<typeof calculateAdvertLifecycle>;
  };
};
type AdvertPostWithMedia = AdvertPost & {
  media: MediaAsset[];
  mediaSlots: MediaSlots;
  daysLive: number;
  daysRemaining: number;
};
type PublicAdvertSearchResult = AdvertPostWithMedia & {
  rankScore: number;
  rankReasons: string[];
  boosted: boolean;
  matchedTerms: string[];
  relationshipSignals: DiscoveryRelationshipSignal[];
};

@Injectable()
export class AdvertsService {
  constructor(
    @Optional()
    @Inject(ADVERTS_REPOSITORY)
    private readonly repository: AdvertsRepository = new InMemoryAdvertsRepository(),
    @Optional() private readonly auth?: AuthService,
    @Optional()
    @Inject(MEDIA_ADAPTERS)
    private readonly mediaAdapters: MediaAdapters = createDefaultMediaAdapters(),
    @Optional() private readonly analytics: AnalyticsService = new AnalyticsService(),
  ) {}

  async createAdvert(
    tenantId: string,
    input: CreateAdvertDto,
    actorUserId?: string,
  ): Promise<AdvertPost> {
    const draft = await this.createDraft(tenantId, input, actorUserId);
    return this.publishDraft(
      tenantId,
      draft.id,
      { acceptedTerms: true, publishedAt: input.publishedAt },
      actorUserId,
    );
  }

  async createDraft(
    tenantId: string,
    input: CreateAdvertDto,
    actorUserId?: string,
  ): Promise<AdvertDraft> {
    this.assertValidAdvert(input);

    const now = new Date().toISOString();
    const draft: AdvertDraft = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createDraft(draft);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DRAFT_CREATED',
      entityType: 'ADVERT_DRAFT',
      entityId: draft.id,
      metadata: {
        countryCode: draft.countryCode,
        industryCode: draft.industryCode,
        role: draft.role,
      },
    });

    return draft;
  }

  async listDrafts(tenantId: string): Promise<AdvertDraft[]> {
    return this.repository.listDrafts(tenantId);
  }

  async getDraft(tenantId: string, id: string): Promise<AdvertDraft> {
    const draft = await this.repository.findDraft(tenantId, id);
    if (!draft) {
      throw new NotFoundException('Advert draft not found.');
    }

    return draft;
  }

  async updateDraft(
    tenantId: string,
    id: string,
    input: UpdateAdvertDraftDto,
    actorUserId?: string,
  ): Promise<AdvertDraft> {
    const existing = await this.getDraft(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new UnprocessableEntityException('Published advert drafts cannot be edited.');
    }

    const updated: AdvertDraft = {
      ...existing,
      ...this.onlyDefined(input),
      updatedAt: new Date().toISOString(),
    };
    this.assertValidAdvert(updated);

    await this.repository.updateDraft(updated);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DRAFT_UPDATED',
      entityType: 'ADVERT_DRAFT',
      entityId: updated.id,
      metadata: {
        changedFields: this.changedFields(existing, updated).join(','),
      },
    });

    return updated;
  }

  async duplicateDraft(
    tenantId: string,
    id: string,
    input: DuplicateAdvertDto = {},
    actorUserId?: string,
  ): Promise<AdvertDraft> {
    const source = await this.getDraft(tenantId, id);
    const duplicate = await this.createDuplicateDraft(tenantId, source, input.title, actorUserId);
    await this.copyAdvertMedia(tenantId, source.id, duplicate.id, 'READY_FOR_PREVIEW');
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DRAFT_DUPLICATED',
      entityType: 'ADVERT_DRAFT',
      entityId: duplicate.id,
      metadata: {
        sourceDraftId: source.id,
      },
    });
    return duplicate;
  }

  async duplicateAdvert(
    tenantId: string,
    id: string,
    input: DuplicateAdvertDto = {},
    actorUserId?: string,
  ): Promise<AdvertDraft> {
    const source = await this.getMutableAdvert(tenantId, id);
    const duplicate = await this.createDuplicateDraft(tenantId, source, input.title, actorUserId);
    await this.copyAdvertMedia(tenantId, source.id, duplicate.id, 'READY_FOR_PREVIEW');
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DUPLICATED_TO_DRAFT',
      entityType: 'ADVERT_DRAFT',
      entityId: duplicate.id,
      metadata: {
        sourceAdvertId: source.id,
        sourceVersion: source.version,
      },
    });
    return duplicate;
  }

  async previewDraft(tenantId: string, id: string): Promise<AdvertDraftWithPreview> {
    const draft = await this.getDraft(tenantId, id);
    const media = await this.repository.listMediaAssets(tenantId, 'ADVERT', draft.id);
    const country = getCountry(draft.countryCode);
    const industry = industryCategories.find((item) => item.code === draft.industryCode);

    return {
      ...draft,
      preview: {
        country,
        industry,
        media,
        mediaSlots: this.mediaSlots(media),
        lifecycle: draft.publishedAt ? calculateAdvertLifecycle(draft.publishedAt) : undefined,
      },
    };
  }

  async publishDraft(
    tenantId: string,
    id: string,
    input: PublishAdvertDraftDto,
    actorUserId?: string,
  ): Promise<AdvertPost> {
    const draft = await this.getDraft(tenantId, id);
    if (draft.status !== 'DRAFT') {
      throw new UnprocessableEntityException('Advert draft has already been published.');
    }

    await this.requireCurrentTermsAcceptance(tenantId, actorUserId, input.acceptedTerms);
    this.assertValidAdvert(draft);

    const draftMedia = await this.repository.listMediaAssets(tenantId, 'ADVERT', draft.id);
    const mediaSafety = evaluateSafetyFields(draftMedia);
    if (!mediaSafety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media metadata matches a zero-tolerance blocked category.',
        safety: mediaSafety,
      });
    }

    const now = new Date().toISOString();
    const publishedAt = input.publishedAt ?? draft.publishedAt ?? now;
    const lifecycle = calculateAdvertLifecycle(publishedAt, now);
    const published: AdvertPost = {
      ...draft,
      id: randomUUID(),
      sourceDraftId: draft.id,
      status:
        lifecycle.isScheduled
          ? 'SCHEDULED'
          : lifecycle.status === 'RENEWAL_DUE'
            ? 'RENEWAL_DUE'
            : lifecycle.shouldAutoDelete
              ? 'AUTO_DELETED'
              : 'LIVE',
      version: await this.nextVersion(tenantId),
      publishedAt: lifecycle.publishedAt,
      expiresAt: lifecycle.expiresAt,
      renewalAlertsSent: [],
      deletedAt: lifecycle.shouldAutoDelete ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };
    const publishedDraft: AdvertDraft = {
      ...draft,
      status: 'PUBLISHED',
      publishedAt: lifecycle.publishedAt,
      updatedAt: now,
    };
    const publishedMediaAssets = draftMedia.map(
      (asset): MediaAsset => ({
        ...asset,
        id: randomUUID(),
        ownerType: 'ADVERT',
        ownerId: published.id,
        status: 'LIVE',
        createdAt: now,
        updatedAt: now,
      }),
    );

    await this.repository.publishAdvert({
      tenantId,
      draft: publishedDraft,
      published,
      publishedMediaAssets,
    });
    if (published.status !== 'SCHEDULED') {
      await this.syncDiscoveryIndex(published);
    }
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_PUBLISHED',
      entityType: 'ADVERT',
      entityId: published.id,
      metadata: {
        sourceDraftId: draft.id,
        version: published.version,
        countryCode: published.countryCode,
        industryCode: published.industryCode,
      },
    });

    return published;
  }

  async listAdverts(tenantId: string): Promise<AdvertPostWithMedia[]> {
    const adverts = await this.repository.listPublishedAdverts(tenantId);
    const visible = adverts.filter(
      (advert) => advert.status !== 'AUTO_DELETED' && advert.status !== 'ARCHIVED',
    );
    return Promise.all(visible.map((advert) => this.withMedia(advert)));
  }

  async listNotifications(tenantId: string): Promise<AdvertNotification[]> {
    return this.repository.listNotifications(tenantId);
  }

  async listDraftMedia(tenantId: string, id: string): Promise<MediaAsset[]> {
    const draft = await this.getDraft(tenantId, id);
    return this.repository.listMediaAssets(tenantId, 'ADVERT', draft.id);
  }

  async listAdvertMedia(tenantId: string, id: string): Promise<MediaAsset[]> {
    const advert = await this.getMutableAdvert(tenantId, id);
    return this.repository.listMediaAssets(tenantId, 'ADVERT', advert.id);
  }

  async prepareDraftMediaUpload(
    tenantId: string,
    id: string,
    input: PrepareAdvertMediaUploadDto,
    actorUserId?: string,
  ) {
    const draft = await this.getDraft(tenantId, id);
    if (draft.status !== 'DRAFT') {
      throw new UnprocessableEntityException('Published advert drafts cannot accept new media.');
    }

    return this.prepareMediaUpload({
      tenantId,
      ownerId: draft.id,
      input,
      actorUserId,
      auditEntityId: draft.id,
    });
  }

  async prepareAdvertMediaUpload(
    tenantId: string,
    id: string,
    input: PrepareAdvertMediaUploadDto,
    actorUserId?: string,
  ) {
    const advert = await this.getMutableAdvert(tenantId, id);
    return this.prepareMediaUpload({
      tenantId,
      ownerId: advert.id,
      input,
      actorUserId,
      auditEntityId: advert.id,
    });
  }

  async addDraftMedia(
    tenantId: string,
    id: string,
    input: CreateAdvertMediaDto,
    actorUserId?: string,
  ): Promise<{ media: MediaAsset; mediaSlots: MediaSlots; processingJobs: MediaProcessingJob[] }> {
    const draft = await this.getDraft(tenantId, id);
    if (draft.status !== 'DRAFT') {
      throw new UnprocessableEntityException('Published advert drafts cannot accept new media.');
    }

    const result = await this.addMedia({
      tenantId,
      ownerId: draft.id,
      input,
      actorUserId,
      auditEntityId: draft.id,
      action: 'ADVERT_DRAFT_MEDIA_ADDED',
      status: 'READY_FOR_PREVIEW',
    });
    await this.repository.updateDraft({ ...draft, updatedAt: new Date().toISOString() });
    return result;
  }

  async addAdvertMedia(
    tenantId: string,
    id: string,
    input: CreateAdvertMediaDto,
    actorUserId?: string,
  ): Promise<{ media: MediaAsset; mediaSlots: MediaSlots; processingJobs: MediaProcessingJob[] }> {
    const advert = await this.getMutableAdvert(tenantId, id);
    const result = await this.addMedia({
      tenantId,
      ownerId: advert.id,
      input,
      actorUserId,
      auditEntityId: advert.id,
      action: 'ADVERT_MEDIA_ADDED',
      status: 'LIVE',
    });
    await this.repository.updatePublishedAdvert({ ...advert, updatedAt: new Date().toISOString() });
    return result;
  }

  async pauseAdvert(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<AdvertPostWithMedia> {
    const advert = await this.getMutableAdvert(tenantId, id);
    if (advert.status === 'PAUSED') {
      return this.withMedia(advert);
    }

    const now = new Date().toISOString();
    const paused: AdvertPost = {
      ...advert,
      status: 'PAUSED',
      pausedAt: now,
      updatedAt: now,
    };
    await this.repository.updatePublishedAdvert(paused);
    await this.syncDiscoveryIndex(paused);
    await this.auditAdvertControl(tenantId, actorUserId, paused, 'ADVERT_PAUSED');
    return this.withMedia(paused);
  }

  async archiveAdvert(tenantId: string, id: string, actorUserId?: string): Promise<AdvertPost> {
    const advert = await this.getMutableAdvert(tenantId, id);
    const now = new Date().toISOString();
    const archived: AdvertPost = {
      ...advert,
      status: 'ARCHIVED',
      archivedAt: now,
      updatedAt: now,
    };
    await this.repository.updatePublishedAdvert(archived);
    await this.repository.archiveMediaAssets(tenantId, 'ADVERT', advert.id, now);
    await this.repository.deleteDiscoveryIndex(tenantId, advert.id);
    await this.auditAdvertControl(tenantId, actorUserId, archived, 'ADVERT_ARCHIVED');
    return archived;
  }

  async renewAdvert(
    tenantId: string,
    id: string,
    input: RenewAdvertDto,
    actorUserId?: string,
  ): Promise<AdvertPostWithMedia> {
    const advert = await this.getMutableAdvert(tenantId, id);
    await this.requireCurrentTermsAcceptance(tenantId, actorUserId, input.acceptedTerms);

    const now = new Date().toISOString();
    const renewedAt = input.renewedAt ?? now;
    const lifecycle = calculateAdvertLifecycle(renewedAt, now);
    const renewed: AdvertPost = {
      ...advert,
      status: lifecycle.shouldAutoDelete ? 'AUTO_DELETED' : 'LIVE',
      publishedAt: lifecycle.publishedAt,
      expiresAt: lifecycle.expiresAt,
      renewalAlertsSent: [],
      pausedAt: undefined,
      deletedAt: lifecycle.shouldAutoDelete ? now : undefined,
      updatedAt: now,
    };
    await this.repository.updatePublishedAdvert(renewed);
    await this.syncDiscoveryIndex(renewed);
    await this.auditAdvertControl(tenantId, actorUserId, renewed, 'ADVERT_RENEWED');
    return this.withMedia(renewed);
  }

  async boostAdvert(
    tenantId: string,
    id: string,
    input: BoostAdvertDto,
    actorUserId?: string,
  ): Promise<AdvertPostWithMedia> {
    const advert = await this.getMutableAdvert(tenantId, id);
    if (advert.status === 'PAUSED') {
      throw new UnprocessableEntityException(
        'Paused adverts must be renewed or unpaused before boosting.',
      );
    }

    await this.requireCurrentTermsAcceptance(tenantId, actorUserId, input.acceptedTerms);
    const now = new Date().toISOString();
    const boostedAt = input.boostedAt ?? now;
    const boostedAtMs = Date.parse(boostedAt);
    if (!Number.isFinite(boostedAtMs)) {
      throw new UnprocessableEntityException('Boost dates must be valid ISO-8601 timestamps.');
    }

    const boostExpiresAt =
      input.boostExpiresAt ?? new Date(boostedAtMs + 7 * 24 * 60 * 60 * 1000).toISOString();
    const boostExpiresAtMs = Date.parse(boostExpiresAt);

    if (!Number.isFinite(boostExpiresAtMs)) {
      throw new UnprocessableEntityException('Boost dates must be valid ISO-8601 timestamps.');
    }

    if (boostExpiresAtMs <= boostedAtMs) {
      throw new UnprocessableEntityException('Boost expiry must be after the boost start time.');
    }

    const maxBoostExpiresAt = boostedAtMs + 30 * 24 * 60 * 60 * 1000;
    if (boostExpiresAtMs > maxBoostExpiresAt) {
      throw new UnprocessableEntityException('Boost duration cannot exceed 30 days.');
    }

    const boosted: AdvertPost = {
      ...advert,
      boostedAt,
      boostExpiresAt,
      boostWeight: input.boostWeight ?? 3,
      updatedAt: now,
    };
    await this.repository.updatePublishedAdvert(boosted);
    await this.syncDiscoveryIndex(boosted);
    await this.auditAdvertControl(tenantId, actorUserId, boosted, 'ADVERT_BOOSTED');
    return this.withMedia(boosted);
  }

  async searchPublicAdverts(input: PublicAdvertSearchDto = {}): Promise<{
    query?: string;
    filters: Pick<PublicAdvertSearchDto, 'countryCode' | 'industryCode' | 'role'>;
    results: PublicAdvertSearchResult[];
  }> {
    this.assertValidPublicSearch(input);
    const now = input.now ?? new Date().toISOString();
    const query = input.q?.trim();
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const terms = this.searchTerms(query);
    const entries = await this.repository.listDiscoveryIndex({
      countryCode: input.countryCode?.toUpperCase(),
      industryCode: input.industryCode,
      role: input.role,
      statuses: ['LIVE', 'RENEWAL_DUE'],
    });
    const candidates = entries.filter((entry) =>
      this.isDiscoveryEntryDiscoverable(entry, input, now),
    );
    const ranked = await Promise.all(
      candidates.map(async (entry) => this.rankPublicAdvert(entry, query, terms, now)),
    );

    return {
      query,
      filters: {
        countryCode: input.countryCode,
        industryCode: input.industryCode,
        role: input.role,
      },
      results: ranked
        .filter((result): result is PublicAdvertSearchResult => Boolean(result))
        .filter(
          (result) =>
            !terms.length ||
            result.rankReasons.some(
              (reason) =>
                reason.startsWith('MATCH_') ||
                reason === 'VECTOR_MATCH' ||
                reason.startsWith('RELATIONSHIP_GRAPH'),
            ),
        )
        .sort(
          (left, right) =>
            right.rankScore - left.rankScore || right.publishedAt.localeCompare(left.publishedAt),
        )
        .slice(0, limit),
    };
  }

  async createSavedSearch(
    tenantId: string,
    input: CreateSavedAdvertSearchDto,
    actorUserId?: string,
  ): Promise<SavedAdvertSearchRecord> {
    const normalized = this.normalizeSavedSearchInput(input);
    const now = new Date().toISOString();
    const record: SavedAdvertSearchRecord = {
      id: randomUUID(),
      tenantId,
      name: normalized.name,
      query: normalized.q,
      countryCode: normalized.countryCode,
      industryCode: normalized.industryCode,
      role: normalized.role,
      alertFrequency: normalized.alertFrequency ?? 'DAILY',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createSavedSearch(record);
    await this.recordDiscoveryAnalytics(tenantId, {
      eventType: 'SAVE',
      entityType: 'SEARCH_RESULT',
      entityId: record.id,
      countryCode: record.countryCode ?? 'KE',
      industryCode: record.industryCode,
      consentState: 'GRANTED',
      metadata: {
        query: record.query,
        alertFrequency: record.alertFrequency,
        role: record.role ?? null,
      },
      occurredAt: now,
    });
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_SAVED_SEARCH_CREATED',
      entityType: 'ADVERT_SAVED_SEARCH',
      entityId: record.id,
      metadata: {
        countryCode: record.countryCode ?? null,
        industryCode: record.industryCode ?? null,
        role: record.role ?? null,
        alertFrequency: record.alertFrequency,
      },
    });

    return record;
  }

  async listSavedSearches(tenantId: string): Promise<SavedAdvertSearchRecord[]> {
    return this.repository.listSavedSearches(tenantId);
  }

  async listDiscoveryAlerts(tenantId: string): Promise<AdvertDiscoveryAlertRecord[]> {
    return this.repository.listDiscoveryAlerts(tenantId);
  }

  async runSavedSearchAlerts(
    tenantId: string,
    input: RunSavedAdvertSearchAlertsDto = {},
    actorUserId?: string,
  ): Promise<{
    checkedAt: string;
    savedSearchesChecked: number;
    alertsCreated: AdvertDiscoveryAlertRecord[];
  }> {
    const now = input.now ?? new Date().toISOString();
    const limit = Math.min(20, Math.max(1, input.limit ?? 5));
    const searches = input.savedSearchId
      ? [await this.getSavedSearch(tenantId, input.savedSearchId)]
      : (await this.repository.listSavedSearches(tenantId)).filter((search) => search.isActive);
    const alertsCreated: AdvertDiscoveryAlertRecord[] = [];

    for (const search of searches) {
      await this.recordDiscoveryAnalytics(tenantId, {
        eventType: 'SEARCH',
        entityType: 'SEARCH_RESULT',
        entityId: search.id,
        countryCode: search.countryCode ?? 'KE',
        industryCode: search.industryCode,
        consentState: 'GRANTED',
        metadata: {
          query: search.query,
          role: search.role ?? null,
          frequency: search.alertFrequency,
        },
        occurredAt: now,
      });
      const results = await this.searchPublicAdverts({
        q: search.query,
        countryCode: search.countryCode,
        industryCode: search.industryCode,
        role: search.role,
        limit,
        now,
      });

      for (const result of results.results) {
        const existing = await this.repository.findDiscoveryAlert(tenantId, search.id, result.id);
        if (existing) {
          continue;
        }

        const alert: AdvertDiscoveryAlertRecord = {
          id: randomUUID(),
          tenantId,
          savedSearchId: search.id,
          advertId: result.id,
          title: `New discovery match: ${result.title}`,
          message: `${result.displayName} matches "${search.query}" with score ${result.rankScore}.`,
          rankScore: result.rankScore,
          reasonCodes: result.rankReasons,
          createdAt: now,
        };
        await this.repository.createDiscoveryAlert(alert);
        await this.recordDiscoveryAnalytics(tenantId, {
          eventType: 'MATCH',
          entityType: 'LISTING',
          entityId: result.id,
          countryCode: result.countryCode,
          industryCode: result.industryCode,
          consentState: 'GRANTED',
          metadata: {
            savedSearchId: search.id,
            query: search.query,
            rankScore: result.rankScore,
            reasonCodes: result.rankReasons,
          },
          occurredAt: now,
        });
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
      action: 'ADVERT_SAVED_SEARCH_ALERTS_RUN',
      entityType: 'ADVERT_SAVED_SEARCH',
      metadata: {
        savedSearchesChecked: searches.length,
        alertsCreated: alertsCreated.length,
      },
    });

    return {
      checkedAt: now,
      savedSearchesChecked: searches.length,
      alertsCreated,
    };
  }

  async rebuildDiscoveryIndex(
    tenantId: string,
    actorUserId?: string,
  ): Promise<{ tenantId: string; indexed: number; removed: number }> {
    const adverts = await this.repository.listPublishedAdverts(tenantId);
    let indexed = 0;
    let removed = 0;

    for (const advert of adverts) {
      if (advert.status === 'AUTO_DELETED' || advert.status === 'ARCHIVED') {
        await this.repository.deleteDiscoveryIndex(tenantId, advert.id);
        removed += 1;
        continue;
      }

      await this.syncDiscoveryIndex(advert);
      indexed += 1;
    }

    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DISCOVERY_INDEX_REBUILT',
      entityType: 'ADVERT_DISCOVERY_INDEX',
      metadata: { indexed, removed },
    });

    return { tenantId, indexed, removed };
  }

  async recordDiscoveryEvent(
    tenantId: string,
    input: RecordAdvertDiscoveryEventDto,
  ): Promise<AnalyticsEvent> {
    const eventTypes: AnalyticsEventType[] = ['VIEW', 'CLICK', 'INQUIRY', 'SHARE', 'DOWNLOAD'];
    if (!eventTypes.includes(input.eventType)) {
      throw new UnprocessableEntityException(
        'Discovery event type must be VIEW, CLICK, INQUIRY, SHARE, or DOWNLOAD.',
      );
    }

    const advert = await this.getMutableAdvert(tenantId, input.advertId);
    if (advert.status !== 'LIVE' && advert.status !== 'RENEWAL_DUE') {
      throw new UnprocessableEntityException(
        'Only discoverable live adverts can record discovery events.',
      );
    }

    return this.recordDiscoveryAnalytics(tenantId, {
      eventType: input.eventType,
      entityType: 'LISTING',
      entityId: advert.id,
      countryCode: advert.countryCode,
      industryCode: advert.industryCode,
      consentState: input.consentState,
      occurredAt: input.occurredAt,
      metadata: {
        surface: 'advert_discovery',
        query: input.query?.trim(),
        position: input.position,
        ...(input.metadata ?? {}),
      },
    });
  }

  async runLifecycle(tenantId: string, input: RunAdvertLifecycleDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alerts: AdvertNotification[] = [];
    const deleted: AdvertPost[] = [];
    const activated: AdvertPost[] = [];
    const adverts = await this.repository.listPublishedAdverts(tenantId);

    for (const advert of adverts) {
      if (advert.status === 'AUTO_DELETED' || advert.status === 'ARCHIVED') continue;

      const lifecycle = calculateAdvertLifecycle(advert.publishedAt, now);
      if (advert.status === 'SCHEDULED' || lifecycle.isScheduled) {
        if (lifecycle.isScheduled) continue;

        const liveAdvert: AdvertPost = {
          ...advert,
          status: 'LIVE',
          updatedAt: now,
        };
        await this.repository.updatePublishedAdvert(liveAdvert);
        await this.syncDiscoveryIndex(liveAdvert);
        activated.push(liveAdvert);
        continue;
      }

      if (lifecycle.shouldAutoDelete) {
        const deletedAdvert: AdvertPost = {
          ...advert,
          status: 'AUTO_DELETED',
          deletedAt: now,
          updatedAt: now,
        };
        await this.repository.updatePublishedAdvert(deletedAdvert);
        await this.repository.archiveMediaAssets(tenantId, 'ADVERT', advert.id, now);
        await this.repository.deleteDiscoveryIndex(tenantId, advert.id);
        deleted.push(deletedAdvert);
        continue;
      }

      const dueDays = lifecycle.renewalAlertDaysDue.filter(
        (day) => !advert.renewalAlertsSent.includes(day),
      );
      if (dueDays.length > 0) {
        const updatedAdvert: AdvertPost = {
          ...advert,
          status: advert.status === 'PAUSED' ? 'PAUSED' : 'RENEWAL_DUE',
          renewalAlertsSent: [...advert.renewalAlertsSent, ...dueDays].sort((a, b) => a - b),
          updatedAt: now,
        };
        await this.repository.updatePublishedAdvert(updatedAdvert);
        await this.syncDiscoveryIndex(updatedAdvert);

        for (const day of dueDays) {
          const notification = this.createRenewalNotification(tenantId, updatedAdvert, day, now);
          await this.repository.createNotification(notification);
          alerts.push(notification);
        }
      }
    }

    return {
      policy: advertLifecyclePolicy,
      checkedAt: now,
      alertsCreated: alerts,
      autoDeleted: deleted,
      activatedScheduled: activated,
      activeAdverts: await this.listAdverts(tenantId),
    };
  }

  async runAllLifecycles(input: RunAdvertLifecycleDto = {}) {
    const adverts = await this.repository.listAllPublishedAdverts();
    const tenantIds = [...new Set(adverts.map((advert) => advert.tenantId))];
    const checkedAt = input.now ?? new Date().toISOString();
    return {
      checkedAt,
      policy: advertLifecyclePolicy,
      tenantsChecked: tenantIds.length,
      results: await Promise.all(
        tenantIds.map(async (tenantId) => ({
          tenantId,
          ...(await this.runLifecycle(tenantId, { ...input, now: checkedAt })),
        })),
      ),
    };
  }

  private async prepareMediaUpload(input: {
    tenantId: string;
    ownerId: string;
    input: PrepareAdvertMediaUploadDto;
    actorUserId?: string;
    auditEntityId: string;
  }) {
    await this.requireStoredTermsAcceptance(
      input.tenantId,
      input.actorUserId,
      'Current stored terms acceptance is required before preparing advert media upload.',
    );
    const existingMedia = await this.repository.listMediaAssets(
      input.tenantId,
      'ADVERT',
      input.ownerId,
    );

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `An advert can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const uploadInput = {
      tenantId: input.tenantId,
      ownerType: 'ADVERT' as const,
      ownerId: input.ownerId,
      fileName: input.input.fileName.trim(),
      mimeType: input.input.mimeType.trim().toLowerCase(),
      fileSizeBytes: input.input.fileSizeBytes,
    };
    const mediaDecision = evaluateMediaUploadPreparationInput(uploadInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media upload violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    const safety = evaluateSafetyFields(uploadInput);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media upload metadata matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const upload = await this.mediaAdapters.storage.prepareUpload(uploadInput);
    await this.auth?.recordTenantAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: 'ADVERT_MEDIA_UPLOAD_PREPARED',
      entityType: 'ADVERT',
      entityId: input.auditEntityId,
      metadata: {
        provider: upload.provider,
        objectKey: upload.objectKey,
        mimeType: uploadInput.mimeType,
        fileSizeBytes: uploadInput.fileSizeBytes,
        mediaCount: existingMedia.length,
      },
    });

    return {
      upload,
      mediaSlots: this.mediaSlots(existingMedia),
      expiresAt: upload.expiresAt,
    };
  }

  private async createDuplicateDraft(
    tenantId: string,
    source: AdvertDraft | AdvertPost,
    title: string | undefined,
    actorUserId: string | undefined,
  ): Promise<AdvertDraft> {
    const now = new Date().toISOString();
    const draft: AdvertDraft = {
      title: this.duplicateTitle(title ?? source.title),
      displayName: source.displayName,
      industryCode: source.industryCode,
      role: source.role,
      description: source.description,
      countryCode: source.countryCode,
      phone: source.phone,
      email: source.email,
      website: source.website,
      id: randomUUID(),
      tenantId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    this.assertValidAdvert(draft);
    await this.repository.createDraft(draft);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_DUPLICATE_DRAFT_CREATED',
      entityType: 'ADVERT_DRAFT',
      entityId: draft.id,
      metadata: {
        sourceId: source.id,
      },
    });
    return draft;
  }

  private async copyAdvertMedia(
    tenantId: string,
    sourceOwnerId: string,
    targetOwnerId: string,
    status: MediaAsset['status'],
  ): Promise<void> {
    const sourceMedia = await this.repository.listMediaAssets(tenantId, 'ADVERT', sourceOwnerId);
    const now = new Date().toISOString();
    for (const source of sourceMedia) {
      await this.repository.createMediaAsset({
        ...source,
        id: randomUUID(),
        ownerType: 'ADVERT',
        ownerId: targetOwnerId,
        status,
        uploadedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  private duplicateTitle(title: string): string {
    const copied = title.startsWith('Copy of ') ? title : `Copy of ${title}`;
    return copied.slice(0, 160);
  }

  private async addMedia(input: {
    tenantId: string;
    ownerId: string;
    input: CreateAdvertMediaDto;
    actorUserId?: string;
    auditEntityId: string;
    action: string;
    status: MediaAsset['status'];
  }): Promise<{ media: MediaAsset; mediaSlots: MediaSlots; processingJobs: MediaProcessingJob[] }> {
    await this.requireStoredTermsAcceptance(
      input.tenantId,
      input.actorUserId,
      'Current stored terms acceptance is required before uploading advert media.',
    );
    const existingMedia = await this.repository.listMediaAssets(
      input.tenantId,
      'ADVERT',
      input.ownerId,
    );

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `An advert can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const displayOrder = input.input.displayOrder ?? this.nextMediaDisplayOrder(existingMedia);
    if (existingMedia.some((asset) => asset.displayOrder === displayOrder)) {
      throw new UnprocessableEntityException('This advert media display position is already used.');
    }

    const visibility = input.input.visibility ?? 'PUBLIC';
    const mediaInput = {
      ...input.input,
      sourceUrl: input.input.sourceUrl.trim(),
      thumbnailUrl: input.input.thumbnailUrl?.trim(),
      fileName: input.input.fileName.trim(),
      mimeType: input.input.mimeType.trim().toLowerCase(),
      caption: input.input.caption?.trim(),
      altText: input.input.altText?.trim(),
      displayOrder,
      visibility,
    };
    const mediaDecision = evaluateMediaAssetInput(mediaInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media metadata violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    const safety = evaluateSafetyFields(mediaInput);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media metadata matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const moderation = await this.mediaAdapters.moderation.review(mediaInput);
    if (!moderation.allowed) {
      throw new UnprocessableEntityException({
        message: 'Advert media failed moderation review.',
        moderation,
      });
    }

    const now = new Date().toISOString();
    const baseMedia: MediaAsset = {
      ...mediaInput,
      id: randomUUID(),
      tenantId: input.tenantId,
      ownerType: 'ADVERT',
      ownerId: input.ownerId,
      kind: mediaDecision.kind,
      status: input.status,
      moderationStatus: moderation.moderationStatus,
      moderationReason: moderation.moderationReason,
      storageProvider: mediaInput.storageProvider,
      objectKey: mediaInput.objectKey,
      cdnUrl: mediaInput.cdnUrl,
      transformStatus: mediaInput.transformStatus,
      variants: mediaInput.variants,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const transform = await this.mediaAdapters.transforms.plan(baseMedia);
    const media: MediaAsset = {
      ...baseMedia,
      cdnUrl: transform.cdnUrl ?? baseMedia.cdnUrl,
      thumbnailUrl: transform.thumbnailUrl ?? baseMedia.thumbnailUrl,
      transformStatus: transform.transformStatus,
      variants: transform.variants ?? baseMedia.variants,
    };

    await this.repository.createMediaAsset(media);
    const processingJobs = await enqueueMediaProcessingJobs(this.mediaAdapters, media);
    await this.auth?.recordTenantAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'ADVERT',
      entityId: input.auditEntityId,
      metadata: {
        mediaId: media.id,
        kind: media.kind,
        mimeType: media.mimeType,
        displayOrder: media.displayOrder,
        mediaCount: existingMedia.length + 1,
        processingJobTypes: processingJobs.map((job) => job.type).join(','),
      },
    });

    return {
      media,
      mediaSlots: this.mediaSlots([...existingMedia, media]),
      processingJobs,
    };
  }

  private createRenewalNotification(
    tenantId: string,
    advert: AdvertPost,
    day: number,
    now: string,
  ): AdvertNotification {
    return {
      id: randomUUID(),
      tenantId,
      advertId: advert.id,
      day,
      title: `Renew advert: ${advert.title}`,
      message: `Your advert has been live for ${day} days and will be automatically deleted on day ${advertLifecyclePolicy.liveDays}. Renew it to keep it visible.`,
      scheduledFor: now,
      createdAt: now,
    };
  }

  private async getMutableAdvert(tenantId: string, id: string): Promise<AdvertPost> {
    const advert = await this.repository.findPublishedAdvert(tenantId, id);
    if (!advert || advert.status === 'AUTO_DELETED' || advert.status === 'ARCHIVED') {
      throw new NotFoundException('Advert not found.');
    }

    return advert;
  }

  private async withMedia(advert: AdvertPost): Promise<AdvertPostWithMedia> {
    const media = await this.repository.listMediaAssets(advert.tenantId, 'ADVERT', advert.id);
    const lifecycle = calculateAdvertLifecycle(advert.publishedAt);
    return {
      ...advert,
      media,
      mediaSlots: this.mediaSlots(media),
      daysLive: lifecycle.daysLive,
      daysRemaining: lifecycle.daysRemaining,
    };
  }

  private async rankPublicAdvert(
    entry: AdvertDiscoveryIndexRecord,
    query: string | undefined,
    terms: string[],
    now: string,
  ): Promise<PublicAdvertSearchResult | undefined> {
    const advert = await this.repository.findPublishedAdvert(entry.tenantId, entry.advertId);
    if (!advert || advert.status === 'AUTO_DELETED' || advert.status === 'ARCHIVED') {
      return undefined;
    }

    const withMedia = await this.withMedia(advert);
    const searchable = entry.searchText;
    const rankReasons: string[] = [];
    let rankScore = 0;

    for (const term of terms) {
      if (!searchable.includes(term)) {
        continue;
      }

      if (this.normalizeSearchText(advert.title).includes(term)) {
        rankScore += 50;
        rankReasons.push(`MATCH_TITLE:${term}`);
      } else if (this.normalizeSearchText(advert.displayName).includes(term)) {
        rankScore += 35;
        rankReasons.push(`MATCH_ADVERTISER:${term}`);
      } else {
        rankScore += 20;
        rankReasons.push(`MATCH_BODY:${term}`);
      }
    }

    const vectorScore = query
      ? scoreDiscoveryVector(query, entry.tokenVector)
      : { score: 0, matchedTerms: [] };
    if (vectorScore.score > 0) {
      rankScore += vectorScore.score;
      rankReasons.push('VECTOR_MATCH');
    }

    const desiredRoles = query ? inferDesiredDiscoveryRoles(query) : [];
    const matchingRelationshipSignals = entry.relationshipSignals.filter((signal) =>
      desiredRoles.includes(signal.role),
    );
    if (matchingRelationshipSignals.length > 0) {
      rankScore += Math.round(
        matchingRelationshipSignals.reduce((sum, signal) => sum + signal.weight, 0) * 70,
      );
      for (const signal of matchingRelationshipSignals.slice(0, 3)) {
        rankReasons.push(`RELATIONSHIP_GRAPH:${signal.role}`);
      }
    } else if (!desiredRoles.length && entry.relationshipSignals.length > 0) {
      rankScore += Math.min(
        18,
        Math.round(entry.relationshipSignals.reduce((sum, signal) => sum + signal.weight, 0) * 5),
      );
      rankReasons.push('RELATIONSHIP_GRAPH');
    }

    const boosted = this.isBoostActive(advert, now);
    if (boosted) {
      rankScore += (advert.boostWeight ?? 1) * 100;
      rankReasons.push('ACTIVE_BOOST');
    }

    const lifecycle = calculateAdvertLifecycle(advert.publishedAt, now);
    rankScore += Math.max(0, lifecycle.daysRemaining);
    if (lifecycle.daysLive <= 7) {
      rankScore += 20;
      rankReasons.push('RECENTLY_POSTED');
    }

    if (withMedia.media.length > 0) {
      rankScore += Math.min(20, withMedia.media.length * 4);
      rankReasons.push('HAS_MEDIA');
    }

    if (!rankReasons.length) {
      rankReasons.push('ACTIVE_LISTING');
    }

    return {
      ...withMedia,
      rankScore,
      rankReasons,
      boosted,
      matchedTerms: vectorScore.matchedTerms,
      relationshipSignals: entry.relationshipSignals,
    };
  }

  private isDiscoveryEntryDiscoverable(
    entry: AdvertDiscoveryIndexRecord,
    input: PublicAdvertSearchDto,
    now: string,
  ): boolean {
    if (entry.status !== 'LIVE' && entry.status !== 'RENEWAL_DUE') {
      return false;
    }

    if (Date.parse(entry.expiresAt) <= Date.parse(now)) {
      return false;
    }

    return (
      (!input.countryCode || entry.countryCode === input.countryCode.toUpperCase()) &&
      (!input.industryCode || entry.industryCode === input.industryCode) &&
      (!input.role || entry.role === input.role)
    );
  }

  private async syncDiscoveryIndex(advert: AdvertPost): Promise<void> {
    if (
      advert.status === 'AUTO_DELETED' ||
      advert.status === 'ARCHIVED' ||
      advert.status === 'SCHEDULED'
    ) {
      await this.repository.deleteDiscoveryIndex(advert.tenantId, advert.id);
      return;
    }

    const now = new Date().toISOString();
    const document = buildDiscoveryIndexDocument({
      title: advert.title,
      displayName: advert.displayName,
      description: advert.description,
      industryCode: advert.industryCode,
      countryCode: advert.countryCode,
      role: advert.role,
    });
    await this.repository.upsertDiscoveryIndex({
      id: randomUUID(),
      tenantId: advert.tenantId,
      advertId: advert.id,
      countryCode: advert.countryCode,
      industryCode: advert.industryCode,
      role: advert.role,
      status: advert.status,
      title: advert.title,
      displayName: advert.displayName,
      description: advert.description,
      searchText: document.searchText,
      tokenVector: document.tokenVector,
      relationshipSignals: document.relationshipSignals,
      publishedAt: advert.publishedAt,
      expiresAt: advert.expiresAt,
      boostedAt: advert.boostedAt,
      boostExpiresAt: advert.boostExpiresAt,
      boostWeight: advert.boostWeight,
      indexedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async getSavedSearch(tenantId: string, id: string): Promise<SavedAdvertSearchRecord> {
    const search = await this.repository.findSavedSearch(tenantId, id);
    if (!search) {
      throw new NotFoundException('Saved advert search not found.');
    }

    return search;
  }

  private recordDiscoveryAnalytics(
    tenantId: string,
    input: Parameters<AnalyticsService['recordEvent']>[1],
  ): Promise<AnalyticsEvent> {
    return this.analytics.recordEvent(tenantId, input);
  }

  private normalizeSavedSearchInput(input: CreateSavedAdvertSearchDto): CreateSavedAdvertSearchDto {
    const normalized: CreateSavedAdvertSearchDto = {
      name: input.name.trim(),
      q: input.q.trim(),
      countryCode: input.countryCode?.trim().toUpperCase(),
      industryCode: input.industryCode?.trim(),
      role: input.role,
      alertFrequency: input.alertFrequency,
    };
    this.assertValidPublicSearch(normalized);
    return normalized;
  }

  private assertValidPublicSearch(input: PublicAdvertSearchDto | CreateSavedAdvertSearchDto): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Public advert discovery matches a zero-tolerance blocked category.',
        safety,
      });
    }

    if (input.countryCode && !getCountry(input.countryCode.toUpperCase())) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (
      input.industryCode &&
      !industryCategories.some((industry) => industry.code === input.industryCode)
    ) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }
  }

  private isBoostActive(advert: AdvertPost, now: string): boolean {
    return Boolean(
      advert.boostWeight &&
      advert.boostWeight > 0 &&
      advert.boostedAt &&
      advert.boostExpiresAt &&
      Date.parse(advert.boostedAt) <= Date.parse(now) &&
      Date.parse(advert.boostExpiresAt) > Date.parse(now),
    );
  }

  private searchTerms(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return [
      ...new Set(
        this.normalizeSearchText(value)
          .split(' ')
          .filter((term) => term.length >= 2),
      ),
    ];
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private mediaSlots(media: MediaAsset[]): MediaSlots {
    return {
      used: media.length,
      max: mediaPolicy.maxItemsPerOwner,
      remaining: Math.max(0, mediaPolicy.maxItemsPerOwner - media.length),
    };
  }

  private nextMediaDisplayOrder(media: MediaAsset[]): number {
    const usedOrders = new Set(media.map((asset) => asset.displayOrder));
    for (let index = 0; index < mediaPolicy.maxItemsPerOwner; index += 1) {
      if (!usedOrders.has(index)) {
        return index;
      }
    }

    return media.length;
  }

  private async nextVersion(tenantId: string): Promise<number> {
    const versions = (await this.repository.listPublishedAdverts(tenantId)).map(
      (advert) => advert.version,
    );
    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  private async requireCurrentTermsAcceptance(
    tenantId: string,
    actorUserId: string | undefined,
    acceptedTerms: boolean,
  ): Promise<void> {
    if (!acceptedTerms) {
      throw new UnprocessableEntityException(
        'Current terms acceptance is required before publishing.',
      );
    }

    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before publishing or renewing adverts.',
    );
  }

  private async requireStoredTermsAcceptance(
    tenantId: string,
    actorUserId: string | undefined,
    message: string,
  ): Promise<void> {
    if (!this.auth || !actorUserId) {
      return;
    }

    if (!(await this.auth.hasCurrentTermsAcceptance(actorUserId, tenantId))) {
      throw new UnprocessableEntityException(message);
    }
  }

  private assertValidAdvert(input: CreateAdvertDto | AdvertDraft): void {
    const country = getCountry(input.countryCode);
    const industry = industryCategories.find((item) => item.code === input.industryCode);

    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (!industry) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This advert matches a zero-tolerance blocked category.',
        safety,
      });
    }
  }

  private async auditAdvertControl(
    tenantId: string,
    actorUserId: string | undefined,
    advert: AdvertPost,
    action: string,
  ): Promise<void> {
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action,
      entityType: 'ADVERT',
      entityId: advert.id,
      metadata: {
        status: advert.status,
        version: advert.version,
        sourceDraftId: advert.sourceDraftId ?? null,
      },
    });
  }

  private changedFields(previous: AdvertDraft, next: AdvertDraft): string[] {
    const fields: Array<keyof UpdateAdvertDraftDto> = [
      'title',
      'displayName',
      'industryCode',
      'role',
      'description',
      'countryCode',
      'publishedAt',
      'phone',
      'email',
      'website',
    ];
    return fields.filter((field) => previous[field] !== next[field]);
  }

  private onlyDefined(input: UpdateAdvertDraftDto): Partial<CreateAdvertDto> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<CreateAdvertDto>;
  }
}
