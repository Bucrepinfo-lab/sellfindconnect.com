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
  type AdvertPost,
  type MediaAsset,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  type MediaAdapters,
} from '../media/media.adapters';
import type {
  CreateAdvertDto,
  CreateAdvertMediaDto,
  PrepareAdvertMediaUploadDto,
  RunAdvertLifecycleDto,
} from './dto/create-advert.dto';

type AdvertNotification = {
  id: string;
  tenantId: string;
  advertId: string;
  title: string;
  message: string;
  scheduledFor: string;
  day: number;
  createdAt: string;
};

type MediaSlots = { used: number; max: number; remaining: number };
type AdvertPostWithMedia = AdvertPost & {
  media: MediaAsset[];
  mediaSlots: MediaSlots;
};

@Injectable()
export class AdvertsService {
  private readonly adverts = new Map<string, AdvertPost>();
  private readonly notifications = new Map<string, AdvertNotification>();
  private readonly mediaAssets = new Map<string, MediaAsset>();

  constructor(
    @Optional() private readonly auth?: AuthService,
    @Optional()
    @Inject(MEDIA_ADAPTERS)
    private readonly mediaAdapters: MediaAdapters = createDefaultMediaAdapters(),
  ) {}

  createAdvert(tenantId: string, input: CreateAdvertDto): AdvertPost {
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

    const now = new Date().toISOString();
    const publishedAt = input.publishedAt ?? now;
    const lifecycle = calculateAdvertLifecycle(publishedAt, now);
    const advert: AdvertPost = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: lifecycle.shouldAutoDelete ? 'AUTO_DELETED' : 'LIVE',
      publishedAt,
      expiresAt: lifecycle.expiresAt,
      renewalAlertsSent: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: lifecycle.shouldAutoDelete ? now : undefined,
    };

    this.adverts.set(this.key(tenantId, advert.id), advert);
    return advert;
  }

  listAdverts(tenantId: string): AdvertPostWithMedia[] {
    return Array.from(this.adverts.values())
      .filter((advert) => advert.tenantId === tenantId && advert.status !== 'AUTO_DELETED')
      .map((advert) => this.withMedia(advert));
  }

  listNotifications(tenantId: string): AdvertNotification[] {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.tenantId === tenantId,
    );
  }

  listAdvertMedia(tenantId: string, id: string): MediaAsset[] {
    const advert = this.getActiveAdvert(tenantId, id);
    return this.listMediaAssets(tenantId, advert.id);
  }

  async prepareAdvertMediaUpload(
    tenantId: string,
    id: string,
    input: PrepareAdvertMediaUploadDto,
    actorUserId?: string,
  ) {
    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before preparing advert media upload.',
    );
    const advert = this.getActiveAdvert(tenantId, id);
    const existingMedia = this.listMediaAssets(tenantId, advert.id);

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `An advert can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const uploadInput = {
      tenantId,
      ownerType: 'ADVERT' as const,
      ownerId: advert.id,
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      fileSizeBytes: input.fileSizeBytes,
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
      tenantId,
      actorUserId,
      action: 'ADVERT_MEDIA_UPLOAD_PREPARED',
      entityType: 'ADVERT',
      entityId: advert.id,
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

  async addAdvertMedia(
    tenantId: string,
    id: string,
    input: CreateAdvertMediaDto,
    actorUserId?: string,
  ): Promise<{ media: MediaAsset; mediaSlots: MediaSlots }> {
    await this.requireStoredTermsAcceptance(
      tenantId,
      actorUserId,
      'Current stored terms acceptance is required before uploading advert media.',
    );
    const advert = this.getActiveAdvert(tenantId, id);
    const existingMedia = this.listMediaAssets(tenantId, advert.id);

    if (existingMedia.length >= mediaPolicy.maxItemsPerOwner) {
      throw new UnprocessableEntityException(
        `An advert can display a maximum of ${mediaPolicy.maxItemsPerOwner} media items.`,
      );
    }

    const displayOrder = input.displayOrder ?? this.nextMediaDisplayOrder(existingMedia);
    if (existingMedia.some((asset) => asset.displayOrder === displayOrder)) {
      throw new UnprocessableEntityException('This advert media display position is already used.');
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
      tenantId,
      ownerType: 'ADVERT',
      ownerId: advert.id,
      kind: mediaDecision.kind,
      status: 'LIVE',
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

    this.mediaAssets.set(this.key(tenantId, media.id), media);
    this.adverts.set(this.key(tenantId, advert.id), { ...advert, updatedAt: now });
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'ADVERT_MEDIA_ADDED',
      entityType: 'ADVERT',
      entityId: advert.id,
      metadata: {
        mediaId: media.id,
        kind: media.kind,
        mimeType: media.mimeType,
        displayOrder: media.displayOrder,
        mediaCount: existingMedia.length + 1,
      },
    });

    return {
      media,
      mediaSlots: this.mediaSlots([...existingMedia, media]),
    };
  }

  runLifecycle(tenantId: string, input: RunAdvertLifecycleDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alerts: AdvertNotification[] = [];
    const deleted: AdvertPost[] = [];

    for (const advert of Array.from(this.adverts.values())) {
      if (advert.tenantId !== tenantId || advert.status === 'AUTO_DELETED') continue;

      const lifecycle = calculateAdvertLifecycle(advert.publishedAt, now);
      if (lifecycle.shouldAutoDelete) {
        const deletedAdvert: AdvertPost = {
          ...advert,
          status: 'AUTO_DELETED',
          deletedAt: now,
          updatedAt: now,
        };
        this.adverts.set(this.key(tenantId, advert.id), deletedAdvert);
        this.archiveAdvertMedia(tenantId, advert.id, now);
        deleted.push(deletedAdvert);
        continue;
      }

      const dueDays = lifecycle.renewalAlertDaysDue.filter(
        (day) => !advert.renewalAlertsSent.includes(day),
      );
      if (dueDays.length > 0) {
        const updatedAdvert: AdvertPost = {
          ...advert,
          status: 'RENEWAL_DUE',
          renewalAlertsSent: [...advert.renewalAlertsSent, ...dueDays].sort((a, b) => a - b),
          updatedAt: now,
        };
        this.adverts.set(this.key(tenantId, advert.id), updatedAdvert);

        for (const day of dueDays) {
          const notification = this.createRenewalNotification(tenantId, updatedAdvert, day, now);
          this.notifications.set(notification.id, notification);
          alerts.push(notification);
        }
      }
    }

    return {
      policy: advertLifecyclePolicy,
      checkedAt: now,
      alertsCreated: alerts,
      autoDeleted: deleted,
      activeAdverts: this.listAdverts(tenantId),
    };
  }

  runAllLifecycles(input: RunAdvertLifecycleDto = {}) {
    const tenantIds = [...new Set(Array.from(this.adverts.values()).map((advert) => advert.tenantId))];
    const checkedAt = input.now ?? new Date().toISOString();
    return {
      checkedAt,
      policy: advertLifecyclePolicy,
      tenantsChecked: tenantIds.length,
      results: tenantIds.map((tenantId) => ({
        tenantId,
        ...this.runLifecycle(tenantId, { ...input, now: checkedAt }),
      })),
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

  private getActiveAdvert(tenantId: string, id: string): AdvertPost {
    const advert = this.adverts.get(this.key(tenantId, id));
    if (!advert || advert.status === 'AUTO_DELETED') {
      throw new NotFoundException('Advert not found.');
    }

    return advert;
  }

  private listMediaAssets(tenantId: string, advertId: string): MediaAsset[] {
    return Array.from(this.mediaAssets.values())
      .filter(
        (asset) =>
          asset.tenantId === tenantId &&
          asset.ownerType === 'ADVERT' &&
          asset.ownerId === advertId &&
          asset.status !== 'BLOCKED' &&
          asset.status !== 'ARCHIVED',
      )
      .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt));
  }

  private archiveAdvertMedia(tenantId: string, advertId: string, now: string): void {
    for (const asset of this.mediaAssets.values()) {
      if (asset.tenantId !== tenantId || asset.ownerType !== 'ADVERT' || asset.ownerId !== advertId) {
        continue;
      }

      this.mediaAssets.set(this.key(tenantId, asset.id), {
        ...asset,
        status: 'ARCHIVED',
        updatedAt: now,
      });
    }
  }

  private withMedia(advert: AdvertPost): AdvertPostWithMedia {
    const media = this.listMediaAssets(advert.tenantId, advert.id);
    return {
      ...advert,
      media,
      mediaSlots: this.mediaSlots(media),
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

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
