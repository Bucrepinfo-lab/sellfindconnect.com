import type { AdvertDraft, AdvertPost, MediaAsset, MediaOwnerType } from '@telpen/domain';

export const ADVERTS_REPOSITORY = Symbol('ADVERTS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export type AdvertNotification = {
  id: string;
  tenantId: string;
  advertId: string;
  title: string;
  message: string;
  scheduledFor: string;
  day: number;
  createdAt: string;
};

export type AdvertPublishRecords = {
  tenantId: string;
  draft: AdvertDraft;
  published: AdvertPost;
  publishedMediaAssets?: MediaAsset[];
};

export interface AdvertsRepository {
  createDraft(draft: AdvertDraft): RepositoryResult<void>;
  findDraft(tenantId: string, id: string): RepositoryResult<AdvertDraft | undefined>;
  updateDraft(draft: AdvertDraft): RepositoryResult<void>;
  listDrafts(tenantId: string): RepositoryResult<AdvertDraft[]>;
  createMediaAsset(asset: MediaAsset): RepositoryResult<void>;
  listMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
  ): RepositoryResult<MediaAsset[]>;
  archiveMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
    archivedAt: string,
  ): RepositoryResult<void>;
  publishAdvert(records: AdvertPublishRecords): RepositoryResult<void>;
  findPublishedAdvert(tenantId: string, id: string): RepositoryResult<AdvertPost | undefined>;
  updatePublishedAdvert(advert: AdvertPost): RepositoryResult<void>;
  listPublishedAdverts(tenantId: string): RepositoryResult<AdvertPost[]>;
  listAllPublishedAdverts(): RepositoryResult<AdvertPost[]>;
  createNotification(notification: AdvertNotification): RepositoryResult<void>;
  listNotifications(tenantId: string): RepositoryResult<AdvertNotification[]>;
}
