import type {
  AdvertDraft,
  AdvertPost,
  DiscoveryRelationshipSignal,
  DiscoveryVector,
  MediaAsset,
  MediaOwnerType,
  SupplyChainRole,
} from '@telpen/domain';

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

export type AdvertDiscoveryIndexRecord = {
  id: string;
  tenantId: string;
  advertId: string;
  countryCode: string;
  industryCode: string;
  role: SupplyChainRole;
  status: AdvertPost['status'];
  title: string;
  displayName: string;
  description: string;
  searchText: string;
  tokenVector: DiscoveryVector;
  relationshipSignals: DiscoveryRelationshipSignal[];
  publishedAt: string;
  expiresAt: string;
  boostedAt?: string;
  boostExpiresAt?: string;
  boostWeight?: number;
  indexedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAdvertDiscoveryIndexInput = {
  countryCode?: string;
  industryCode?: string;
  role?: SupplyChainRole;
  statuses?: AdvertPost['status'][];
};

export const savedAdvertSearchAlertFrequencies = ['INSTANT', 'DAILY', 'WEEKLY'] as const;
export type SavedAdvertSearchAlertFrequency = (typeof savedAdvertSearchAlertFrequencies)[number];

export type SavedAdvertSearchRecord = {
  id: string;
  tenantId: string;
  name: string;
  query: string;
  countryCode?: string;
  industryCode?: string;
  role?: SupplyChainRole;
  alertFrequency: SavedAdvertSearchAlertFrequency;
  isActive: boolean;
  lastAlertedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdvertDiscoveryAlertRecord = {
  id: string;
  tenantId: string;
  savedSearchId: string;
  advertId: string;
  title: string;
  message: string;
  rankScore: number;
  reasonCodes: string[];
  createdAt: string;
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
  upsertDiscoveryIndex(record: AdvertDiscoveryIndexRecord): RepositoryResult<void>;
  listDiscoveryIndex(
    input?: ListAdvertDiscoveryIndexInput,
  ): RepositoryResult<AdvertDiscoveryIndexRecord[]>;
  deleteDiscoveryIndex(tenantId: string, advertId: string): RepositoryResult<void>;
  createSavedSearch(record: SavedAdvertSearchRecord): RepositoryResult<void>;
  findSavedSearch(
    tenantId: string,
    id: string,
  ): RepositoryResult<SavedAdvertSearchRecord | undefined>;
  listSavedSearches(tenantId: string): RepositoryResult<SavedAdvertSearchRecord[]>;
  updateSavedSearch(record: SavedAdvertSearchRecord): RepositoryResult<void>;
  createDiscoveryAlert(record: AdvertDiscoveryAlertRecord): RepositoryResult<void>;
  findDiscoveryAlert(
    tenantId: string,
    savedSearchId: string,
    advertId: string,
  ): RepositoryResult<AdvertDiscoveryAlertRecord | undefined>;
  listDiscoveryAlerts(tenantId: string): RepositoryResult<AdvertDiscoveryAlertRecord[]>;
  eraseTenantHoldings(tenantId: string): RepositoryResult<{ adverts: number; media: number }>;
}
