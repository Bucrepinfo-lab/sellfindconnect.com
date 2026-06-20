import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  advertLifecyclePolicy,
  calculateAdvertLifecycle,
  evaluateMediaAssetInput,
  evaluateMediaUploadPreparationInput,
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  mediaPolicy,
  type AdvertDraft,
  type AdvertPost,
  type MediaAsset,
  type MediaOwnerType,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  enqueueMediaProcessingJobs,
  type MediaAdapters,
  type MediaProcessingJob,
} from '../media/media.adapters';
import {
  ADVERTS_REPOSITORY,
  type AdvertNotification,
  type AdvertsRepository,
} from './adverts.repository';
import type {
  CreateAdvertDto,
  CreateAdvertMediaDto,
  PrepareAdvertMediaUploadDto,
  PublishAdvertDraftDto,
  RenewAdvertDto,
  RunAdvertLifecycleDto,
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
        lifecycle.status === 'RENEWAL_DUE'
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
    await this.auditAdvertControl(tenantId, actorUserId, renewed, 'ADVERT_RENEWED');
    return this.withMedia(renewed);
  }

  async runLifecycle(tenantId: string, input: RunAdvertLifecycleDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alerts: AdvertNotification[] = [];
    const deleted: AdvertPost[] = [];
    const adverts = await this.repository.listPublishedAdverts(tenantId);

    for (const advert of adverts) {
      if (advert.status === 'AUTO_DELETED' || advert.status === 'ARCHIVED') continue;

      const lifecycle = calculateAdvertLifecycle(advert.publishedAt, now);
      if (lifecycle.shouldAutoDelete) {
        const deletedAdvert: AdvertPost = {
          ...advert,
          status: 'AUTO_DELETED',
          deletedAt: now,
          updatedAt: now,
        };
        await this.repository.updatePublishedAdvert(deletedAdvert);
        await this.repository.archiveMediaAssets(tenantId, 'ADVERT', advert.id, now);
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
