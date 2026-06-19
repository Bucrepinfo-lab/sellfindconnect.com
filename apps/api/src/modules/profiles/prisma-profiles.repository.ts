import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  ProfileStatus,
  type MediaAsset as PrismaMediaAsset,
  type ProfileDraft as PrismaProfileDraft,
  type PublishedProfile as PrismaPublishedProfile,
} from '@prisma/client';
import {
  mediaAssetKinds,
  mediaAssetStatuses,
  mediaModerationStatuses,
  mediaOwnerTypes,
  mediaVisibilityStates,
  profileReviewDecisions,
  profileReviewReasons,
  type MediaAsset,
  type MediaAssetKind,
  type MediaAssetStatus,
  type MediaModerationStatus,
  type MediaOwnerType,
  type MediaVisibility,
  type ProfileDraft,
  type ProfileReviewDecision,
  type ProfileReviewReason,
  type ProfileServiceArea,
  type ProfileSocialLink,
  type PublishedProfile,
  type SupplyChainRole,
} from '@telpen/domain';

import type { ProfilePublishRecords, ProfilesRepository } from './profiles.repository';

export function createProfilesPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraft(draft: ProfileDraft): Promise<void> {
    await this.prisma.profileDraft.create({
      data: {
        id: draft.id,
        tenantId: draft.tenantId,
        countryCode: draft.countryCode,
        industryCode: draft.industryCode,
        role: draft.role,
        displayName: draft.displayName,
        description: draft.description,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        email: draft.email,
        website: draft.website,
        physicalAddress: draft.physicalAddress,
        mapsUrl: draft.mapsUrl,
        socialLinks: this.mapOptionalJsonToPrisma(draft.socialLinks),
        serviceArea: this.mapOptionalJsonToPrisma(draft.serviceArea),
        status: this.mapDraftStatusToPrisma(draft.status),
        reviewReasons: this.mapReviewReasonsToPrisma(draft.reviewReasons),
        reviewRequestedAt: draft.reviewRequestedAt ? new Date(draft.reviewRequestedAt) : undefined,
        reviewDecision: draft.reviewDecision,
        reviewedAt: draft.reviewedAt ? new Date(draft.reviewedAt) : undefined,
        reviewedBy: draft.reviewedBy,
        reviewNote: draft.reviewNote,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt),
      },
    });
  }

  async findDraft(tenantId: string, id: string): Promise<ProfileDraft | undefined> {
    const draft = await this.prisma.profileDraft.findFirst({
      where: { id, tenantId },
    });
    return draft ? this.mapDraft(draft) : undefined;
  }

  async updateDraft(draft: ProfileDraft): Promise<void> {
    await this.prisma.profileDraft.update({
      where: { id: draft.id },
      data: {
        countryCode: draft.countryCode,
        industryCode: draft.industryCode,
        role: draft.role,
        displayName: draft.displayName,
        description: draft.description,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        email: draft.email,
        website: draft.website,
        physicalAddress: draft.physicalAddress ?? null,
        mapsUrl: draft.mapsUrl ?? null,
        socialLinks: this.mapOptionalJsonToPrisma(draft.socialLinks),
        serviceArea: this.mapOptionalJsonToPrisma(draft.serviceArea),
        status: this.mapDraftStatusToPrisma(draft.status),
        reviewReasons: this.mapReviewReasonsToPrisma(draft.reviewReasons),
        reviewRequestedAt: draft.reviewRequestedAt ? new Date(draft.reviewRequestedAt) : null,
        reviewDecision: draft.reviewDecision ?? null,
        reviewedAt: draft.reviewedAt ? new Date(draft.reviewedAt) : null,
        reviewedBy: draft.reviewedBy ?? null,
        reviewNote: draft.reviewNote ?? null,
        updatedAt: new Date(draft.updatedAt),
      },
    });
  }

  async listDraftsPendingReview(tenantId: string): Promise<ProfileDraft[]> {
    const drafts = await this.prisma.profileDraft.findMany({
      where: { tenantId, status: ProfileStatus.PENDING_REVIEW },
      orderBy: { updatedAt: 'desc' },
    });
    return drafts.map((draft) => this.mapDraft(draft));
  }

  async listAllDraftsPendingReview(): Promise<ProfileDraft[]> {
    const drafts = await this.prisma.profileDraft.findMany({
      where: { status: ProfileStatus.PENDING_REVIEW },
      orderBy: { updatedAt: 'desc' },
    });
    return drafts.map((draft) => this.mapDraft(draft));
  }

  async createMediaAsset(asset: MediaAsset): Promise<void> {
    await this.prisma.mediaAsset.create({
      data: this.mapMediaAssetToPrisma(asset),
    });
  }

  async listMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
  ): Promise<MediaAsset[]> {
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        tenantId,
        ownerType,
        ownerId,
        status: { not: 'BLOCKED' },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return assets.map((asset) => this.mapMediaAsset(asset));
  }

  async publishProfile(records: ProfilePublishRecords): Promise<void> {
    await this.prisma.$transaction([
      ...(records.previousLiveProfile
        ? [
            this.prisma.publishedProfile.update({
              where: { id: records.previousLiveProfile.id },
              data: {
                status: ProfileStatus.ARCHIVED,
                archivedAt: records.previousLiveProfile.archivedAt
                  ? new Date(records.previousLiveProfile.archivedAt)
                  : null,
                updatedAt: new Date(records.previousLiveProfile.updatedAt),
              },
            }),
          ]
        : []),
      this.prisma.publishedProfile.create({
        data: {
          id: records.published.id,
          tenantId: records.published.tenantId,
          sourceDraftId: records.published.sourceDraftId,
          countryCode: records.published.countryCode,
          industryCode: records.published.industryCode,
          role: records.published.role,
          displayName: records.published.displayName,
          description: records.published.description,
          phone: records.published.phone,
          whatsapp: records.published.whatsapp,
          email: records.published.email,
          website: records.published.website,
          physicalAddress: records.published.physicalAddress,
          mapsUrl: records.published.mapsUrl,
          socialLinks: this.mapOptionalJsonToPrisma(records.published.socialLinks),
          serviceArea: this.mapOptionalJsonToPrisma(records.published.serviceArea),
          status: ProfileStatus.LIVE,
          version: records.published.version,
          publishedAt: new Date(records.published.publishedAt),
          archivedAt: records.published.archivedAt
            ? new Date(records.published.archivedAt)
            : undefined,
          createdAt: new Date(records.published.createdAt),
          updatedAt: new Date(records.published.updatedAt),
        },
      }),
      this.prisma.profileDraft.update({
        where: { id: records.draft.id },
        data: {
          status: this.mapDraftStatusToPrisma(records.draft.status),
          reviewReasons: this.mapReviewReasonsToPrisma(records.draft.reviewReasons),
          reviewRequestedAt: records.draft.reviewRequestedAt
            ? new Date(records.draft.reviewRequestedAt)
            : null,
          reviewDecision: records.draft.reviewDecision ?? null,
          reviewedAt: records.draft.reviewedAt ? new Date(records.draft.reviewedAt) : null,
          reviewedBy: records.draft.reviewedBy ?? null,
          reviewNote: records.draft.reviewNote ?? null,
          updatedAt: new Date(records.draft.updatedAt),
        },
      }),
      ...(records.publishedMediaAssets?.length
        ? [
            this.prisma.mediaAsset.createMany({
              data: records.publishedMediaAssets.map((asset) => this.mapMediaAssetToPrisma(asset)),
            }),
          ]
        : []),
    ]);
  }

  async findLiveProfile(tenantId: string): Promise<PublishedProfile | undefined> {
    const profile = await this.prisma.publishedProfile.findFirst({
      where: { tenantId, status: ProfileStatus.LIVE, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return profile ? this.mapPublishedProfile(profile) : undefined;
  }

  async listPublishedProfiles(tenantId: string): Promise<PublishedProfile[]> {
    const profiles = await this.prisma.publishedProfile.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return profiles.map((profile) => this.mapPublishedProfile(profile));
  }

  private mapDraft(draft: PrismaProfileDraft): ProfileDraft {
    return {
      id: draft.id,
      tenantId: draft.tenantId,
      displayName: draft.displayName,
      industryCode: draft.industryCode,
      role: draft.role as SupplyChainRole,
      description: draft.description,
      countryCode: draft.countryCode,
      phone: draft.phone ?? undefined,
      whatsapp: draft.whatsapp ?? undefined,
      email: draft.email ?? undefined,
      website: draft.website ?? undefined,
      physicalAddress: draft.physicalAddress ?? undefined,
      mapsUrl: draft.mapsUrl ?? undefined,
      socialLinks: this.mapSocialLinksFromPrisma(draft.socialLinks),
      serviceArea: this.mapServiceAreaFromPrisma(draft.serviceArea),
      status: this.mapPrismaDraftStatus(draft.status),
      reviewReasons: this.mapReviewReasonsFromPrisma(draft.reviewReasons),
      reviewRequestedAt: draft.reviewRequestedAt?.toISOString(),
      reviewDecision: this.mapReviewDecisionFromPrisma(draft.reviewDecision),
      reviewedAt: draft.reviewedAt?.toISOString(),
      reviewedBy: draft.reviewedBy ?? undefined,
      reviewNote: draft.reviewNote ?? undefined,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  private mapPublishedProfile(profile: PrismaPublishedProfile): PublishedProfile {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      sourceDraftId: profile.sourceDraftId ?? profile.id,
      displayName: profile.displayName,
      industryCode: profile.industryCode,
      role: profile.role as SupplyChainRole,
      description: profile.description,
      countryCode: profile.countryCode,
      phone: profile.phone ?? undefined,
      whatsapp: profile.whatsapp ?? undefined,
      email: profile.email ?? undefined,
      website: profile.website ?? undefined,
      physicalAddress: profile.physicalAddress ?? undefined,
      mapsUrl: profile.mapsUrl ?? undefined,
      socialLinks: this.mapSocialLinksFromPrisma(profile.socialLinks),
      serviceArea: this.mapServiceAreaFromPrisma(profile.serviceArea),
      status: profile.status === ProfileStatus.ARCHIVED ? 'ARCHIVED' : 'LIVE',
      version: profile.version,
      publishedAt: profile.publishedAt.toISOString(),
      archivedAt: profile.archivedAt?.toISOString(),
      daysLive: this.daysBetween(
        profile.publishedAt.toISOString(),
        (profile.archivedAt ?? new Date()).toISOString(),
      ),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private mapMediaAsset(asset: PrismaMediaAsset): MediaAsset {
    return {
      id: asset.id,
      tenantId: asset.tenantId,
      ownerType: this.mapMediaOwnerType(asset.ownerType),
      ownerId: asset.ownerId,
      kind: this.mapMediaKind(asset.kind),
      status: this.mapMediaStatus(asset.status),
      sourceUrl: asset.sourceUrl,
      thumbnailUrl: asset.thumbnailUrl ?? undefined,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSizeBytes: asset.fileSizeBytes,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      durationSeconds: asset.durationSeconds ?? undefined,
      caption: asset.caption ?? undefined,
      altText: asset.altText ?? undefined,
      displayOrder: asset.displayOrder,
      visibility: this.mapMediaVisibility(asset.visibility),
      moderationStatus: this.mapMediaModerationStatus(asset.moderationStatus),
      moderationReason: asset.moderationReason ?? undefined,
      uploadedAt: asset.uploadedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private mapMediaAssetToPrisma(asset: MediaAsset): Prisma.MediaAssetUncheckedCreateInput {
    return {
      id: asset.id,
      tenantId: asset.tenantId,
      ownerType: asset.ownerType,
      ownerId: asset.ownerId,
      kind: asset.kind,
      status: asset.status,
      sourceUrl: asset.sourceUrl,
      thumbnailUrl: asset.thumbnailUrl,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSizeBytes: asset.fileSizeBytes,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
      caption: asset.caption,
      altText: asset.altText,
      displayOrder: asset.displayOrder,
      visibility: asset.visibility,
      moderationStatus: asset.moderationStatus,
      moderationReason: asset.moderationReason,
      uploadedAt: new Date(asset.uploadedAt),
      createdAt: new Date(asset.createdAt),
      updatedAt: new Date(asset.updatedAt),
    };
  }

  private mapDraftStatusToPrisma(status: ProfileDraft['status']): ProfileStatus {
    if (status === 'DRAFT') {
      return ProfileStatus.DRAFT;
    }

    if (status === 'PENDING_REVIEW') {
      return ProfileStatus.PENDING_REVIEW;
    }

    if (status === 'REJECTED') {
      return ProfileStatus.REJECTED;
    }

    return ProfileStatus.LIVE;
  }

  private mapPrismaDraftStatus(status: ProfileStatus): ProfileDraft['status'] {
    if (status === ProfileStatus.DRAFT) {
      return 'DRAFT';
    }

    if (status === ProfileStatus.PENDING_REVIEW) {
      return 'PENDING_REVIEW';
    }

    if (status === ProfileStatus.REJECTED) {
      return 'REJECTED';
    }

    return 'PUBLISHED';
  }

  private mapReviewReasonsToPrisma(
    reasons: ProfileDraft['reviewReasons'],
  ): Prisma.InputJsonArray | typeof Prisma.JsonNull {
    return reasons?.length ? (reasons as Prisma.InputJsonArray) : Prisma.JsonNull;
  }

  private mapReviewReasonsFromPrisma(value: unknown): ProfileReviewReason[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is ProfileReviewReason =>
      profileReviewReasons.includes(item as ProfileReviewReason),
    );
  }

  private mapReviewDecisionFromPrisma(value: string | null): ProfileReviewDecision | undefined {
    return profileReviewDecisions.includes(value as ProfileReviewDecision)
      ? (value as ProfileReviewDecision)
      : undefined;
  }

  private mapOptionalJsonToPrisma(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private mapSocialLinksFromPrisma(value: unknown): ProfileSocialLink[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const links = value.filter(
      (item): item is ProfileSocialLink =>
        this.isRecord(item) &&
        typeof item.label === 'string' &&
        typeof item.url === 'string',
    );

    return links.length > 0 ? links : undefined;
  }

  private mapServiceAreaFromPrisma(value: unknown): ProfileServiceArea | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    return {
      primaryCity: typeof value.primaryCity === 'string' ? value.primaryCity : undefined,
      regions: this.mapStringArray(value.regions),
      radiusKm: typeof value.radiusKm === 'number' ? value.radiusKm : undefined,
      remoteAvailable:
        typeof value.remoteAvailable === 'boolean' ? value.remoteAvailable : undefined,
      operatingCountries: this.mapStringArray(value.operatingCountries),
    };
  }

  private mapStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const strings = value.filter((item): item is string => typeof item === 'string');
    return strings.length > 0 ? strings : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private mapMediaOwnerType(value: string): MediaOwnerType {
    return mediaOwnerTypes.includes(value as MediaOwnerType)
      ? (value as MediaOwnerType)
      : 'PROFILE_DRAFT';
  }

  private mapMediaKind(value: string): MediaAssetKind {
    return mediaAssetKinds.includes(value as MediaAssetKind) ? (value as MediaAssetKind) : 'IMAGE';
  }

  private mapMediaStatus(value: string): MediaAssetStatus {
    return mediaAssetStatuses.includes(value as MediaAssetStatus)
      ? (value as MediaAssetStatus)
      : 'BLOCKED';
  }

  private mapMediaVisibility(value: string): MediaVisibility {
    return mediaVisibilityStates.includes(value as MediaVisibility)
      ? (value as MediaVisibility)
      : 'PUBLIC';
  }

  private mapMediaModerationStatus(value: string): MediaModerationStatus {
    return mediaModerationStatuses.includes(value as MediaModerationStatus)
      ? (value as MediaModerationStatus)
      : 'PENDING';
  }

  private daysBetween(start: string, end: string): number {
    const diffMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
