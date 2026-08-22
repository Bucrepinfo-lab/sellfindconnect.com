import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  evaluateMediaAssetInput,
  evaluateMediaUploadPreparationInput,
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  mediaPolicy,
  presentTenantMediaAsset,
  presentTenantMediaAssets,
  type MediaAsset,
  type PresentedMediaAsset,
  type ProfileDraft,
  type ProfileReviewReason,
  type PublishedProfile,
  type TenantAccessRole,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { PlatformAccessSession } from '../auth/auth.records';
import type {
  CreateProfileDraftDto,
  PublishProfileDraftDto,
  ReviewProfileDraftDto,
  UpdateProfileDraftDto,
} from './dto/create-profile-draft.dto';
import type { CreateProfileMediaDto, PrepareProfileMediaUploadDto } from './dto/profile-media.dto';
import { InMemoryProfilesRepository } from './in-memory-profiles.repository';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  enqueueMediaProcessingJobs,
  type MediaAdapters,
  type MediaProcessingJob,
} from '../media/media.adapters';
import { PROFILES_REPOSITORY, type ProfilesRepository } from './profiles.repository';

const highRiskProfileIndustryCodes = new Set(['EXTRACTIVES', 'FINANCE', 'HEALTH', 'LOGISTICS']);
const highReviewRoles = new Set<string>(['FINANCIER', 'CERTIFIER', 'LOGISTICS_PROVIDER']);

type ProfileReviewComparable = Pick<ProfileDraft, 'countryCode' | 'industryCode' | 'role'>;
type MediaSlots = { used: number; max: number; remaining: number };
type PublishedProfileWithMedia = PublishedProfile & {
  media: PresentedMediaAsset[];
  mediaSlots: MediaSlots;
  daysLive: number;
};

@Injectable()
export class ProfilesService {
  constructor(
    @Optional()
    @Inject(PROFILES_REPOSITORY)
    private readonly repository: ProfilesRepository = new InMemoryProfilesRepository(),
    @Optional() private readonly auth?: AuthService,
    @Optional()
    @Inject(MEDIA_ADAPTERS)
    private readonly mediaAdapters: MediaAdapters = createDefaultMediaAdapters(),
  ) {}

  async createDraft(tenantId: string, input: CreateProfileDraftDto): Promise<ProfileDraft> {
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
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const draft: ProfileDraft = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createDraft(draft);
    return draft;
  }

  async updateDraft(
    tenantId: string,
    id: string,
    input: UpdateProfileDraftDto,
    actorUserId?: string,
  ): Promise<ProfileDraft> {
    const existing = await this.getDraft(tenantId, id);
    const now = new Date().toISOString();
    const reviewBaseline = await this.reviewBaseline(tenantId, existing);
    const updatedCandidate: ProfileDraft = {
      ...existing,
      ...this.onlyDefined(input),
      updatedAt: now,
      status: 'DRAFT',
    };

    this.assertValidProfile(updatedCandidate);
    const reviewReasons = this.reviewReasons(reviewBaseline, updatedCandidate);
    const updated: ProfileDraft = {
      ...updatedCandidate,
      status: reviewReasons.length > 0 ? 'PENDING_REVIEW' : 'DRAFT',
      reviewReasons,
      reviewRequestedAt: reviewReasons.length > 0 ? now : undefined,
      reviewDecision: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
      reviewNote: undefined,
    };

    await this.repository.updateDraft(updated);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_DRAFT_UPDATED',
      entityType: 'PROFILE_DRAFT',
      entityId: updated.id,
      metadata: {
        status: updated.status,
        changedFields: this.changedFields(existing, updated).join(','),
        reviewRequired: updated.status === 'PENDING_REVIEW',
        reviewReasons: reviewReasons.join(','),
      },
    });

    return updated;
  }

  async listPendingReviews(
    tenantId: string,
    actorUserId: string | undefined,
    role: TenantAccessRole,
  ): Promise<ProfileDraft[]> {
    this.assertCanReviewProfile(role);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_REVIEW_QUEUE_VIEWED',
      entityType: 'PROFILE_DRAFT',
      metadata: { role },
    });
    return this.repository.listDraftsPendingReview(tenantId);
  }

  async reviewDraft(
    tenantId: string,
    id: string,
    input: ReviewProfileDraftDto,
    actorUserId: string | undefined,
    role: TenantAccessRole,
  ): Promise<ProfileDraft> {
    this.assertCanReviewProfile(role);
    const draft = await this.getDraft(tenantId, id);
    return this.completeReview({
      tenantId,
      draft,
      input,
      actorUserId,
      reviewerRole: role,
    });
  }

  async listPlatformPendingReviews(session: PlatformAccessSession): Promise<ProfileDraft[]> {
    const drafts = await this.repository.listAllDraftsPendingReview();
    return drafts.filter((draft) =>
      this.auth?.canPlatformAccess(session, 'MODERATE_CONTENT', this.profileAccessResource(draft)),
    );
  }

  async platformReviewDraft(
    tenantId: string,
    id: string,
    input: ReviewProfileDraftDto,
    session: PlatformAccessSession,
  ): Promise<ProfileDraft> {
    const draft = await this.getDraft(tenantId, id);
    const decision = await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.profileAccessResource(draft),
    );

    return this.completeReview({
      tenantId,
      draft,
      input,
      actorUserId: session.userId,
      reviewerRole: decision?.role ?? 'GLOBAL_MODERATOR_LEAD',
    });
  }

  private async completeReview(input: {
    tenantId: string;
    draft: ProfileDraft;
    input: ReviewProfileDraftDto;
    actorUserId: string | undefined;
    reviewerRole: string;
  }): Promise<ProfileDraft> {
    const { tenantId, draft, actorUserId, reviewerRole } = input;
    if (draft.status !== 'PENDING_REVIEW') {
      throw new UnprocessableEntityException('Profile draft is not pending review.');
    }

    if (input.input.note) {
      const safety = evaluateSafetyFields({ note: input.input.note });
      if (!safety.allowed) {
        throw new UnprocessableEntityException({
          message: 'Review note matches a zero-tolerance blocked category.',
          safety,
        });
      }
    }

    const now = new Date().toISOString();
    const reviewed: ProfileDraft = {
      ...draft,
      status: input.input.decision === 'APPROVED' ? 'DRAFT' : 'REJECTED',
      reviewDecision: input.input.decision,
      reviewedAt: now,
      reviewedBy: actorUserId,
      reviewNote: input.input.note,
      updatedAt: now,
    };

    await this.repository.updateDraft(reviewed);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_DRAFT_REVIEWED',
      entityType: 'PROFILE_DRAFT',
      entityId: reviewed.id,
      metadata: {
        decision: input.input.decision,
        role: reviewerRole,
        reviewReasons: (reviewed.reviewReasons ?? []).join(','),
        noteProvided: Boolean(input.input.note),
      },
    });

    return reviewed;
  }

  async getDraft(tenantId: string, id: string): Promise<ProfileDraft> {
    const draft = await this.repository.findDraft(tenantId, id);
    if (!draft) {
      throw new NotFoundException('Profile draft not found.');
    }

    return draft;
  }

  async previewDraft(tenantId: string, id: string) {
    const draft = await this.getDraft(tenantId, id);
    const media = presentTenantMediaAssets(
      await this.repository.listMediaAssets(tenantId, 'PROFILE_DRAFT', draft.id),
    );
    const country = getCountry(draft.countryCode);
    const industry = industryCategories.find((item) => item.code === draft.industryCode);

    return {
      ...draft,
      preview: {
        country,
        industry,
        completenessScore: this.completenessScore(draft),
        reviewRequired: draft.status === 'PENDING_REVIEW',
        reviewReasons: draft.reviewReasons ?? [],
        reviewRequestedAt: draft.reviewRequestedAt ?? null,
        reviewDecision: draft.reviewDecision ?? null,
        reviewedAt: draft.reviewedAt ?? null,
        reviewNote: draft.reviewNote ?? null,
        media,
        mediaSlots: this.mediaSlots(media),
        publicContacts: {
          phone: draft.phone ?? null,
          whatsapp: draft.whatsapp ?? null,
          email: draft.email ?? null,
          website: draft.website ?? null,
          physicalAddress: draft.physicalAddress ?? null,
          mapsUrl: draft.mapsUrl ?? null,
          socialLinks: draft.socialLinks ?? [],
        },
        serviceArea: {
          primaryCity: draft.serviceArea?.primaryCity ?? null,
          regions: draft.serviceArea?.regions ?? [],
          radiusKm: draft.serviceArea?.radiusKm ?? null,
          remoteAvailable: draft.serviceArea?.remoteAvailable ?? false,
          operatingCountries: draft.serviceArea?.operatingCountries ?? [draft.countryCode],
        },
      },
    };
  }

  async listDraftMedia(tenantId: string, id: string): Promise<PresentedMediaAsset[]> {
    const draft = await this.getDraft(tenantId, id);
    return presentTenantMediaAssets(
      await this.repository.listMediaAssets(tenantId, 'PROFILE_DRAFT', draft.id),
    );
  }

  async prepareDraftMediaUpload(
    tenantId: string,
    id: string,
    input: PrepareProfileMediaUploadDto,
    actorUserId?: string,
  ) {
    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before preparing profile media upload.',
    );
    const draft = await this.getDraft(tenantId, id);
    const existingMedia = await this.repository.listMediaAssets(tenantId, 'PROFILE_DRAFT', draft.id);

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `A profile can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const uploadInput = {
      tenantId,
      ownerType: 'PROFILE_DRAFT' as const,
      ownerId: draft.id,
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      fileSizeBytes: input.fileSizeBytes,
    };
    const mediaDecision = evaluateMediaUploadPreparationInput(uploadInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media upload violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    const safety = evaluateSafetyFields(uploadInput);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media upload metadata matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const upload = await this.mediaAdapters.storage.prepareUpload(uploadInput);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_MEDIA_UPLOAD_PREPARED',
      entityType: 'PROFILE_DRAFT',
      entityId: draft.id,
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

  async addDraftMedia(
    tenantId: string,
    id: string,
    input: CreateProfileMediaDto,
    actorUserId?: string,
  ): Promise<{ media: PresentedMediaAsset; mediaSlots: MediaSlots; processingJobs: MediaProcessingJob[] }> {
    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before uploading profile media.',
    );
    const draft = await this.getDraft(tenantId, id);
    const existingMedia = await this.repository.listMediaAssets(tenantId, 'PROFILE_DRAFT', draft.id);

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `A profile can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const displayOrder = input.displayOrder ?? this.nextMediaDisplayOrder(existingMedia);
    if (existingMedia.some((asset) => asset.displayOrder === displayOrder)) {
      throw new UnprocessableEntityException('This profile media display position is already used.');
    }

    const visibility = input.visibility ?? 'PUBLIC';
    const mediaInput = {
      ...input,
      sourceUrl: input.sourceUrl.trim(),
      thumbnailUrl: input.thumbnailUrl?.trim(),
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      caption: input.caption?.trim(),
      altText: input.altText?.trim(),
      displayOrder,
      visibility,
    };
    const mediaDecision = evaluateMediaAssetInput(mediaInput);
    if (!mediaDecision.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media metadata violates media policy.',
        mediaPolicy: mediaDecision,
      });
    }

    const safety = evaluateSafetyFields(mediaInput);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media metadata matches a zero-tolerance blocked category.',
        safety,
      });
    }
    const moderation = await this.mediaAdapters.moderation.review(mediaInput);
    if (!moderation.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media failed moderation review.',
        moderation,
      });
    }

    const now = new Date().toISOString();
    const baseMedia: MediaAsset = {
      ...mediaInput,
      id: randomUUID(),
      tenantId,
      ownerType: 'PROFILE_DRAFT',
      ownerId: draft.id,
      kind: mediaDecision.kind,
      status: 'READY_FOR_PREVIEW',
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
    const updatedDraft = this.mediaEditedDraft(draft, now);

    await this.repository.createMediaAsset(media);
    await this.repository.updateDraft(updatedDraft);
    const processingJobs = await enqueueMediaProcessingJobs(this.mediaAdapters, media);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_MEDIA_ADDED',
      entityType: 'PROFILE_DRAFT',
      entityId: draft.id,
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
      media: presentTenantMediaAsset(media),
      mediaSlots: this.mediaSlots([...existingMedia, media]),
      processingJobs,
    };
  }

  async publishDraft(
    tenantId: string,
    id: string,
    input: PublishProfileDraftDto,
    actorUserId?: string,
  ): Promise<PublishedProfile> {
    const draft = await this.getDraft(tenantId, id);
    await this.requireCurrentTermsAcceptance(tenantId, actorUserId, input.acceptedTerms);

    if (draft.status === 'PENDING_REVIEW') {
      throw new UnprocessableEntityException(
        'Profile draft requires moderation review before publishing.',
      );
    }

    if (draft.status === 'REJECTED') {
      throw new UnprocessableEntityException(
        'Profile draft was rejected and must be edited before publishing.',
      );
    }

    const safety = evaluateSafetyFields(draft);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }
    const draftMedia = await this.repository.listMediaAssets(tenantId, 'PROFILE_DRAFT', draft.id);
    const mediaSafety = evaluateSafetyFields(draftMedia);
    if (!mediaSafety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Profile media metadata matches a zero-tolerance blocked category.',
        safety: mediaSafety,
      });
    }

    const now = new Date().toISOString();
    const previousLiveProfile = await this.repository.findLiveProfile(tenantId);
    const archivedPreviousProfile = previousLiveProfile
      ? {
          ...previousLiveProfile,
          status: 'ARCHIVED' as const,
          archivedAt: now,
          updatedAt: now,
          daysLive: this.daysBetween(previousLiveProfile.publishedAt, now),
        }
      : undefined;

    const published: PublishedProfile = {
      id: randomUUID(),
      tenantId,
      sourceDraftId: draft.id,
      displayName: draft.displayName,
      industryCode: draft.industryCode,
      role: draft.role,
      description: draft.description,
      countryCode: draft.countryCode,
      phone: draft.phone,
      whatsapp: draft.whatsapp,
      email: draft.email,
      website: draft.website,
      physicalAddress: draft.physicalAddress,
      mapsUrl: draft.mapsUrl,
      socialLinks: draft.socialLinks,
      serviceArea: draft.serviceArea,
      status: 'LIVE',
      version: await this.nextVersion(tenantId),
      publishedAt: now,
      daysLive: 0,
      createdAt: now,
      updatedAt: now,
    };
    const publishedDraft: ProfileDraft = {
      ...draft,
      status: 'PUBLISHED',
      updatedAt: now,
    };
    const publishedMediaAssets = draftMedia.map((asset): MediaAsset => ({
      ...asset,
      id: randomUUID(),
      ownerType: 'PUBLISHED_PROFILE',
      ownerId: published.id,
      status: 'LIVE',
      createdAt: now,
      updatedAt: now,
    }));

    await this.repository.publishProfile({
      tenantId,
      draft: publishedDraft,
      published,
      publishedMediaAssets,
      previousLiveProfile: archivedPreviousProfile,
    });

    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_PUBLISHED',
      entityType: 'PROFILE',
      entityId: published.id,
      metadata: {
        sourceDraftId: draft.id,
        version: published.version,
        previousLiveProfileId: previousLiveProfile?.id ?? null,
        countryCode: published.countryCode,
        industryCode: published.industryCode,
      },
    });

    return published;
  }

  async getLiveProfile(tenantId: string): Promise<PublishedProfileWithMedia> {
    const profile = await this.repository.findLiveProfile(tenantId);
    if (!profile) {
      throw new NotFoundException('Published profile not found.');
    }

    const media = presentTenantMediaAssets(
      await this.repository.listMediaAssets(tenantId, 'PUBLISHED_PROFILE', profile.id),
    );
    return {
      ...profile,
      daysLive: this.daysBetween(profile.publishedAt, new Date().toISOString()),
      media,
      mediaSlots: this.mediaSlots(media),
    };
  }

  async listPublishedProfiles(tenantId: string): Promise<PublishedProfile[]> {
    const profiles = await this.repository.listPublishedProfiles(tenantId);
    return profiles
      .map((profile) => ({
        ...profile,
        daysLive: this.daysBetween(
          profile.publishedAt,
          profile.archivedAt ?? new Date().toISOString(),
        ),
      }))
      .sort((a, b) => b.version - a.version);
  }

  private completenessScore(draft: ProfileDraft): number {
    const fields = [
      draft.displayName,
      draft.industryCode,
      draft.role,
      draft.description,
      draft.countryCode,
      draft.phone,
      draft.whatsapp,
      draft.email,
      draft.website,
      draft.physicalAddress,
      draft.mapsUrl,
      draft.socialLinks?.length ? draft.socialLinks : undefined,
      draft.serviceArea?.primaryCity,
      draft.serviceArea?.regions?.length ? draft.serviceArea.regions : undefined,
      draft.serviceArea?.radiusKm,
      draft.serviceArea?.remoteAvailable,
      draft.serviceArea?.operatingCountries?.length ? draft.serviceArea.operatingCountries : undefined,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }

  private async nextVersion(tenantId: string): Promise<number> {
    const versions = (await this.repository.listPublishedProfiles(tenantId)).map(
      (profile) => profile.version,
    );

    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  private daysBetween(start: string, end: string): number {
    const diffMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }

  private assertValidProfile(input: CreateProfileDraftDto | ProfileDraft): void {
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
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }
  }

  private async requireCurrentTermsAcceptance(
    tenantId: string,
    actorUserId: string | undefined,
    acceptedTerms: boolean,
  ): Promise<void> {
    if (!acceptedTerms) {
      throw new UnprocessableEntityException('Current terms acceptance is required before publishing.');
    }

    if (!this.auth || !actorUserId) {
      return;
    }

    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before publishing.',
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

  private reviewReasons(
    previous: ProfileReviewComparable,
    next: ProfileReviewComparable,
  ): ProfileReviewReason[] {
    const reasons: ProfileReviewReason[] = [];

    if (
      previous.industryCode !== next.industryCode &&
      highRiskProfileIndustryCodes.has(next.industryCode)
    ) {
      reasons.push('HIGH_RISK_INDUSTRY_CHANGE');
    }

    if (previous.role !== next.role && highReviewRoles.has(next.role)) {
      reasons.push('HIGH_REVIEW_ROLE_CHANGE');
    }

    if (previous.countryCode !== next.countryCode) {
      reasons.push('COUNTRY_SCOPE_CHANGE');
    }

    return reasons;
  }

  private async reviewBaseline(
    tenantId: string,
    existing: ProfileDraft,
  ): Promise<ProfileReviewComparable> {
    if (existing.status === 'DRAFT' && existing.reviewDecision === 'APPROVED') {
      return existing;
    }

    const live = await this.repository.findLiveProfile(tenantId);
    return live?.sourceDraftId === existing.id ? live : existing;
  }

  private assertCanReviewProfile(role: TenantAccessRole): void {
    if (!['OWNER', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only tenant owners or admins can review profile changes.');
    }
  }

  private profileAccessResource(draft: ProfileDraft) {
    const country = getCountry(draft.countryCode);
    return {
      tenantId: draft.tenantId,
      countryCode: draft.countryCode,
      continentCode: country?.continentCode,
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

  private mediaEditedDraft(draft: ProfileDraft, now: string): ProfileDraft {
    if (draft.status === 'PENDING_REVIEW') {
      return { ...draft, updatedAt: now };
    }

    return {
      ...draft,
      status: 'DRAFT',
      reviewReasons: [],
      reviewRequestedAt: undefined,
      reviewDecision: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
      reviewNote: undefined,
      updatedAt: now,
    };
  }

  private changedFields(previous: ProfileDraft, next: ProfileDraft): string[] {
    const fields: Array<keyof CreateProfileDraftDto> = [
      'displayName',
      'industryCode',
      'role',
      'description',
      'countryCode',
      'phone',
      'whatsapp',
      'email',
      'website',
      'physicalAddress',
      'mapsUrl',
      'socialLinks',
      'serviceArea',
    ];
    return fields.filter((field) => this.fieldChanged(previous[field], next[field]));
  }

  private fieldChanged(previous: unknown, next: unknown): boolean {
    if (
      Array.isArray(previous) ||
      Array.isArray(next) ||
      this.isPlainObject(previous) ||
      this.isPlainObject(next)
    ) {
      return JSON.stringify(previous ?? null) !== JSON.stringify(next ?? null);
    }

    return previous !== next;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private onlyDefined(input: UpdateProfileDraftDto): Partial<CreateProfileDraftDto> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as Partial<CreateProfileDraftDto>;
  }

  async eraseTenantAccountHoldings(tenantId: string) {
    return this.repository.eraseTenantHoldings(tenantId);
  }
}
