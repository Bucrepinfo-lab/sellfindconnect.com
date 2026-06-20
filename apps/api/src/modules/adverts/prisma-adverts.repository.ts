import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type AdvertDraft as PrismaAdvertDraft,
  type AdvertLifecycleNotification as PrismaAdvertLifecycleNotification,
  type MediaAsset as PrismaMediaAsset,
  type PublishedAdvert as PrismaPublishedAdvert,
} from '@prisma/client';
import {
  advertDraftStatuses,
  advertStatuses,
  mediaAssetKinds,
  mediaAssetStatuses,
  mediaModerationStatuses,
  mediaOwnerTypes,
  mediaTransformStatuses,
  mediaVisibilityStates,
  type AdvertDraft,
  type AdvertDraftStatus,
  type AdvertPost,
  type AdvertStatus,
  type MediaAsset,
  type MediaAssetKind,
  type MediaAssetStatus,
  type MediaCdnVariant,
  type MediaModerationStatus,
  type MediaOwnerType,
  type MediaTransformStatus,
  type MediaVisibility,
  type SupplyChainRole,
} from '@telpen/domain';

import type {
  AdvertNotification,
  AdvertPublishRecords,
  AdvertsRepository,
} from './adverts.repository';

export function createAdvertsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaAdvertsRepository implements AdvertsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraft(draft: AdvertDraft): Promise<void> {
    await this.prisma.advertDraft.create({
      data: this.mapDraftToPrisma(draft),
    });
  }

  async findDraft(tenantId: string, id: string): Promise<AdvertDraft | undefined> {
    const draft = await this.prisma.advertDraft.findFirst({ where: { id, tenantId } });
    return draft ? this.mapDraft(draft) : undefined;
  }

  async updateDraft(draft: AdvertDraft): Promise<void> {
    await this.prisma.advertDraft.update({
      where: { id: draft.id },
      data: {
        countryCode: draft.countryCode,
        industryCode: draft.industryCode,
        role: draft.role,
        title: draft.title,
        displayName: draft.displayName,
        description: draft.description,
        phone: draft.phone ?? null,
        email: draft.email ?? null,
        website: draft.website ?? null,
        status: draft.status,
        publishedAt: draft.publishedAt ? new Date(draft.publishedAt) : null,
        updatedAt: new Date(draft.updatedAt),
      },
    });
  }

  async listDrafts(tenantId: string): Promise<AdvertDraft[]> {
    const drafts = await this.prisma.advertDraft.findMany({
      where: { tenantId },
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
        status: { notIn: ['BLOCKED', 'ARCHIVED'] },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return assets.map((asset) => this.mapMediaAsset(asset));
  }

  async archiveMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
    archivedAt: string,
  ): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { tenantId, ownerType, ownerId },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date(archivedAt),
      },
    });
  }

  async publishAdvert(records: AdvertPublishRecords): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.advertDraft.update({
        where: { id: records.draft.id },
        data: {
          status: records.draft.status,
          publishedAt: records.draft.publishedAt ? new Date(records.draft.publishedAt) : null,
          updatedAt: new Date(records.draft.updatedAt),
        },
      }),
      this.prisma.publishedAdvert.create({
        data: this.mapPublishedAdvertToPrisma(records.published),
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

  async findPublishedAdvert(tenantId: string, id: string): Promise<AdvertPost | undefined> {
    const advert = await this.prisma.publishedAdvert.findFirst({ where: { id, tenantId } });
    return advert ? this.mapPublishedAdvert(advert) : undefined;
  }

  async updatePublishedAdvert(advert: AdvertPost): Promise<void> {
    await this.prisma.publishedAdvert.update({
      where: { id: advert.id },
      data: {
        status: advert.status,
        publishedAt: new Date(advert.publishedAt),
        expiresAt: new Date(advert.expiresAt),
        boostedAt: advert.boostedAt ? new Date(advert.boostedAt) : null,
        boostExpiresAt: advert.boostExpiresAt ? new Date(advert.boostExpiresAt) : null,
        boostWeight: advert.boostWeight ?? null,
        renewalAlertsSent: this.mapOptionalJsonToPrisma(advert.renewalAlertsSent),
        pausedAt: advert.pausedAt ? new Date(advert.pausedAt) : null,
        archivedAt: advert.archivedAt ? new Date(advert.archivedAt) : null,
        deletedAt: advert.deletedAt ? new Date(advert.deletedAt) : null,
        updatedAt: new Date(advert.updatedAt),
      },
    });
  }

  async listPublishedAdverts(tenantId: string): Promise<AdvertPost[]> {
    const adverts = await this.prisma.publishedAdvert.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: 'desc' }, { publishedAt: 'desc' }],
    });
    return adverts.map((advert) => this.mapPublishedAdvert(advert));
  }

  async listAllPublishedAdverts(): Promise<AdvertPost[]> {
    const adverts = await this.prisma.publishedAdvert.findMany({
      orderBy: [{ updatedAt: 'desc' }, { publishedAt: 'desc' }],
    });
    return adverts.map((advert) => this.mapPublishedAdvert(advert));
  }

  async createNotification(notification: AdvertNotification): Promise<void> {
    await this.prisma.advertLifecycleNotification.create({
      data: {
        id: notification.id,
        tenantId: notification.tenantId,
        advertId: notification.advertId,
        title: notification.title,
        message: notification.message,
        scheduledFor: new Date(notification.scheduledFor),
        day: notification.day,
        createdAt: new Date(notification.createdAt),
      },
    });
  }

  async listNotifications(tenantId: string): Promise<AdvertNotification[]> {
    const notifications = await this.prisma.advertLifecycleNotification.findMany({
      where: { tenantId },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    });
    return notifications.map((notification) => this.mapNotification(notification));
  }

  private mapDraftToPrisma(draft: AdvertDraft): Prisma.AdvertDraftUncheckedCreateInput {
    return {
      id: draft.id,
      tenantId: draft.tenantId,
      countryCode: draft.countryCode,
      industryCode: draft.industryCode,
      role: draft.role,
      title: draft.title,
      displayName: draft.displayName,
      description: draft.description,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      status: draft.status,
      publishedAt: draft.publishedAt ? new Date(draft.publishedAt) : undefined,
      createdAt: new Date(draft.createdAt),
      updatedAt: new Date(draft.updatedAt),
    };
  }

  private mapPublishedAdvertToPrisma(
    advert: AdvertPost,
  ): Prisma.PublishedAdvertUncheckedCreateInput {
    return {
      id: advert.id,
      tenantId: advert.tenantId,
      sourceDraftId: advert.sourceDraftId,
      countryCode: advert.countryCode,
      industryCode: advert.industryCode,
      role: advert.role,
      title: advert.title,
      displayName: advert.displayName,
      description: advert.description,
      phone: advert.phone,
      email: advert.email,
      website: advert.website,
      status: advert.status,
      version: advert.version,
      publishedAt: new Date(advert.publishedAt),
      expiresAt: new Date(advert.expiresAt),
      boostedAt: advert.boostedAt ? new Date(advert.boostedAt) : undefined,
      boostExpiresAt: advert.boostExpiresAt ? new Date(advert.boostExpiresAt) : undefined,
      boostWeight: advert.boostWeight,
      renewalAlertsSent: this.mapOptionalJsonToPrisma(advert.renewalAlertsSent),
      pausedAt: advert.pausedAt ? new Date(advert.pausedAt) : undefined,
      archivedAt: advert.archivedAt ? new Date(advert.archivedAt) : undefined,
      deletedAt: advert.deletedAt ? new Date(advert.deletedAt) : undefined,
      createdAt: new Date(advert.createdAt),
      updatedAt: new Date(advert.updatedAt),
    };
  }

  private mapDraft(draft: PrismaAdvertDraft): AdvertDraft {
    return {
      id: draft.id,
      tenantId: draft.tenantId,
      title: draft.title,
      displayName: draft.displayName,
      industryCode: draft.industryCode,
      role: draft.role as SupplyChainRole,
      description: draft.description,
      countryCode: draft.countryCode,
      publishedAt: draft.publishedAt?.toISOString(),
      phone: draft.phone ?? undefined,
      email: draft.email ?? undefined,
      website: draft.website ?? undefined,
      status: this.mapDraftStatus(draft.status),
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  private mapPublishedAdvert(advert: PrismaPublishedAdvert): AdvertPost {
    return {
      id: advert.id,
      tenantId: advert.tenantId,
      sourceDraftId: advert.sourceDraftId ?? undefined,
      title: advert.title,
      displayName: advert.displayName,
      industryCode: advert.industryCode,
      role: advert.role as SupplyChainRole,
      description: advert.description,
      countryCode: advert.countryCode,
      phone: advert.phone ?? undefined,
      email: advert.email ?? undefined,
      website: advert.website ?? undefined,
      status: this.mapAdvertStatus(advert.status),
      version: advert.version,
      publishedAt: advert.publishedAt.toISOString(),
      expiresAt: advert.expiresAt.toISOString(),
      boostedAt: advert.boostedAt?.toISOString(),
      boostExpiresAt: advert.boostExpiresAt?.toISOString(),
      boostWeight: advert.boostWeight ?? undefined,
      renewalAlertsSent: this.mapRenewalAlerts(advert.renewalAlertsSent),
      pausedAt: advert.pausedAt?.toISOString(),
      archivedAt: advert.archivedAt?.toISOString(),
      deletedAt: advert.deletedAt?.toISOString(),
      createdAt: advert.createdAt.toISOString(),
      updatedAt: advert.updatedAt.toISOString(),
    };
  }

  private mapNotification(notification: PrismaAdvertLifecycleNotification): AdvertNotification {
    return {
      id: notification.id,
      tenantId: notification.tenantId,
      advertId: notification.advertId,
      title: notification.title,
      message: notification.message,
      scheduledFor: notification.scheduledFor.toISOString(),
      day: notification.day,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private mapDraftStatus(value: string): AdvertDraftStatus {
    return advertDraftStatuses.includes(value as AdvertDraftStatus)
      ? (value as AdvertDraftStatus)
      : 'DRAFT';
  }

  private mapAdvertStatus(value: string): AdvertStatus {
    return advertStatuses.includes(value as AdvertStatus) ? (value as AdvertStatus) : 'LIVE';
  }

  private mapRenewalAlerts(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is number => Number.isInteger(item));
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
      storageProvider: asset.storageProvider ?? undefined,
      objectKey: asset.objectKey ?? undefined,
      cdnUrl: asset.cdnUrl ?? undefined,
      transformStatus: this.mapMediaTransformStatus(asset.transformStatus),
      variants: this.mapMediaVariantsFromPrisma(asset.variants),
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
      storageProvider: asset.storageProvider,
      objectKey: asset.objectKey,
      cdnUrl: asset.cdnUrl,
      transformStatus: asset.transformStatus,
      variants: this.mapOptionalJsonToPrisma(asset.variants),
      uploadedAt: new Date(asset.uploadedAt),
      createdAt: new Date(asset.createdAt),
      updatedAt: new Date(asset.updatedAt),
    };
  }

  private mapMediaOwnerType(value: string): MediaOwnerType {
    return mediaOwnerTypes.includes(value as MediaOwnerType) ? (value as MediaOwnerType) : 'ADVERT';
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

  private mapMediaTransformStatus(value: string | null): MediaTransformStatus | undefined {
    return mediaTransformStatuses.includes(value as MediaTransformStatus)
      ? (value as MediaTransformStatus)
      : undefined;
  }

  private mapMediaVariantsFromPrisma(value: unknown): MediaCdnVariant[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const variants = value
      .filter(
        (item): item is { label: string; url: string; width?: unknown; height?: unknown } =>
          this.isRecord(item) && typeof item.label === 'string' && typeof item.url === 'string',
      )
      .map((item) => {
        const variant: MediaCdnVariant = {
          label: item.label,
          url: item.url,
        };

        if (typeof item.width === 'number') {
          variant.width = item.width;
        }

        if (typeof item.height === 'number') {
          variant.height = item.height;
        }

        return variant;
      });

    return variants.length > 0 ? variants : undefined;
  }

  private mapOptionalJsonToPrisma(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
