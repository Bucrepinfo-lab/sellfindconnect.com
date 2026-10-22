import { Injectable } from '@nestjs/common';
import type { AdvertDraft, AdvertPost, MediaAsset, MediaOwnerType } from '@telpen/domain';

import type {
  AdvertDiscoveryAlertRecord,
  AdvertDiscoveryIndexRecord,
  AdvertNotification,
  AdvertPublishRecords,
  AdvertsRepository,
  ListAdvertDiscoveryIndexInput,
  SavedAdvertSearchRecord,
} from './adverts.repository';

@Injectable()
export class InMemoryAdvertsRepository implements AdvertsRepository {
  private readonly drafts = new Map<string, AdvertDraft>();
  private readonly publishedAdverts = new Map<string, AdvertPost>();
  private readonly mediaAssets = new Map<string, MediaAsset>();
  private readonly notifications = new Map<string, AdvertNotification>();
  private readonly discoveryIndex = new Map<string, AdvertDiscoveryIndexRecord>();
  private readonly savedSearches = new Map<string, SavedAdvertSearchRecord>();
  private readonly discoveryAlerts = new Map<string, AdvertDiscoveryAlertRecord>();

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

  upsertDiscoveryIndex(record: AdvertDiscoveryIndexRecord): void {
    this.discoveryIndex.set(this.key(record.tenantId, record.advertId), record);
  }

  listDiscoveryIndex(input: ListAdvertDiscoveryIndexInput = {}): AdvertDiscoveryIndexRecord[] {
    return Array.from(this.discoveryIndex.values())
      .filter((record) => !input.countryCode || record.countryCode === input.countryCode)
      .filter((record) => !input.industryCode || record.industryCode === input.industryCode)
      .filter((record) => !input.role || record.role === input.role)
      .filter((record) => !input.statuses?.length || input.statuses.includes(record.status))
      .sort((left, right) => right.indexedAt.localeCompare(left.indexedAt));
  }

  deleteDiscoveryIndex(tenantId: string, advertId: string): void {
    this.discoveryIndex.delete(this.key(tenantId, advertId));
  }

  createSavedSearch(record: SavedAdvertSearchRecord): void {
    this.savedSearches.set(this.key(record.tenantId, record.id), record);
  }

  findSavedSearch(tenantId: string, id: string): SavedAdvertSearchRecord | undefined {
    return this.savedSearches.get(this.key(tenantId, id));
  }

  listSavedSearches(tenantId: string): SavedAdvertSearchRecord[] {
    return Array.from(this.savedSearches.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  updateSavedSearch(record: SavedAdvertSearchRecord): void {
    this.savedSearches.set(this.key(record.tenantId, record.id), record);
  }

  createDiscoveryAlert(record: AdvertDiscoveryAlertRecord): void {
    this.discoveryAlerts.set(
      this.alertKey(record.tenantId, record.savedSearchId, record.advertId),
      record,
    );
  }

  findDiscoveryAlert(
    tenantId: string,
    savedSearchId: string,
    advertId: string,
  ): AdvertDiscoveryAlertRecord | undefined {
    return this.discoveryAlerts.get(this.alertKey(tenantId, savedSearchId, advertId));
  }

  listDiscoveryAlerts(tenantId: string): AdvertDiscoveryAlertRecord[] {
    return Array.from(this.discoveryAlerts.values())
      .filter((record) => record.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  eraseTenantHoldings(tenantId: string): { adverts: number; media: number } {
    let adverts = 0;
    let media = 0;
    for (const [key, draft] of this.drafts) {
      if (draft.tenantId === tenantId) {
        this.drafts.delete(key);
        adverts += 1;
      }
    }
    for (const [key, advert] of this.publishedAdverts) {
      if (advert.tenantId === tenantId) {
        this.publishedAdverts.delete(key);
        adverts += 1;
      }
    }
    for (const [key, asset] of this.mediaAssets) {
      if (asset.tenantId === tenantId) {
        this.mediaAssets.delete(key);
        media += 1;
      }
    }
    for (const [key, notification] of this.notifications) {
      if (notification.tenantId === tenantId) {
        this.notifications.delete(key);
      }
    }
    for (const [key, record] of this.discoveryIndex) {
      if (record.tenantId === tenantId) {
        this.discoveryIndex.delete(key);
      }
    }
    for (const [key, record] of this.savedSearches) {
      if (record.tenantId === tenantId) {
        this.savedSearches.delete(key);
      }
    }
    for (const [key, record] of this.discoveryAlerts) {
      if (record.tenantId === tenantId) {
        this.discoveryAlerts.delete(key);
      }
    }
    return { adverts, media };
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private alertKey(tenantId: string, savedSearchId: string, advertId: string): string {
    return `${tenantId}:${savedSearchId}:${advertId}`;
  }
}
