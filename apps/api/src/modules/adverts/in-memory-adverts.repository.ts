import { Injectable } from '@nestjs/common';
import type { AdvertDraft, AdvertPost, MediaAsset, MediaOwnerType } from '@telpen/domain';

import type {
  AdvertNotification,
  AdvertPublishRecords,
  AdvertsRepository,
} from './adverts.repository';

@Injectable()
export class InMemoryAdvertsRepository implements AdvertsRepository {
  private readonly drafts = new Map<string, AdvertDraft>();
  private readonly publishedAdverts = new Map<string, AdvertPost>();
  private readonly mediaAssets = new Map<string, MediaAsset>();
  private readonly notifications = new Map<string, AdvertNotification>();

  createDraft(draft: AdvertDraft): void {
    this.drafts.set(this.key(draft.tenantId, draft.id), draft);
  }

  findDraft(tenantId: string, id: string): AdvertDraft | undefined {
    return this.drafts.get(this.key(tenantId, id));
  }

  updateDraft(draft: AdvertDraft): void {
    this.drafts.set(this.key(draft.tenantId, draft.id), draft);
  }

  listDrafts(tenantId: string): AdvertDraft[] {
    return Array.from(this.drafts.values())
      .filter((draft) => draft.tenantId === tenantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  createMediaAsset(asset: MediaAsset): void {
    this.mediaAssets.set(this.key(asset.tenantId, asset.id), asset);
  }

  listMediaAssets(tenantId: string, ownerType: MediaOwnerType, ownerId: string): MediaAsset[] {
    return Array.from(this.mediaAssets.values())
      .filter(
        (asset) =>
          asset.tenantId === tenantId &&
          asset.ownerType === ownerType &&
          asset.ownerId === ownerId &&
          asset.status !== 'BLOCKED' &&
          asset.status !== 'ARCHIVED',
      )
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt),
      );
  }

  archiveMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
    archivedAt: string,
  ): void {
    for (const asset of this.mediaAssets.values()) {
      if (
        asset.tenantId !== tenantId ||
        asset.ownerType !== ownerType ||
        asset.ownerId !== ownerId
      ) {
        continue;
      }

      this.mediaAssets.set(this.key(tenantId, asset.id), {
        ...asset,
        status: 'ARCHIVED',
        updatedAt: archivedAt,
      });
    }
  }

  publishAdvert(records: AdvertPublishRecords): void {
    this.drafts.set(this.key(records.tenantId, records.draft.id), records.draft);
    this.publishedAdverts.set(this.key(records.tenantId, records.published.id), records.published);

    for (const asset of records.publishedMediaAssets ?? []) {
      this.mediaAssets.set(this.key(records.tenantId, asset.id), asset);
    }
  }

  findPublishedAdvert(tenantId: string, id: string): AdvertPost | undefined {
    return this.publishedAdverts.get(this.key(tenantId, id));
  }

  updatePublishedAdvert(advert: AdvertPost): void {
    this.publishedAdverts.set(this.key(advert.tenantId, advert.id), advert);
  }

  listPublishedAdverts(tenantId: string): AdvertPost[] {
    return Array.from(this.publishedAdverts.values())
      .filter((advert) => advert.tenantId === tenantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listAllPublishedAdverts(): AdvertPost[] {
    return Array.from(this.publishedAdverts.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  createNotification(notification: AdvertNotification): void {
    this.notifications.set(notification.id, notification);
  }

  listNotifications(tenantId: string): AdvertNotification[] {
    return Array.from(this.notifications.values())
      .filter((notification) => notification.tenantId === tenantId)
      .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
