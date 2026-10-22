import type { MediaAsset, MediaOwnerType, ProfileDraft, PublishedProfile } from '@telpen/domain';

export const PROFILES_REPOSITORY = Symbol('PROFILES_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export type ProfilePublishRecords = {
  tenantId: string;
  draft: ProfileDraft;
  published: PublishedProfile;
  publishedMediaAssets?: MediaAsset[];
  previousLiveProfile?: PublishedProfile;
};

export interface ProfilesRepository {
  createDraft(draft: ProfileDraft): RepositoryResult<void>;
  findDraft(tenantId: string, id: string): RepositoryResult<ProfileDraft | undefined>;
  updateDraft(draft: ProfileDraft): RepositoryResult<void>;
  listDraftsPendingReview(tenantId: string): RepositoryResult<ProfileDraft[]>;
  listAllDraftsPendingReview(): RepositoryResult<ProfileDraft[]>;
  createMediaAsset(asset: MediaAsset): RepositoryResult<void>;
  listMediaAssets(
    tenantId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
  ): RepositoryResult<MediaAsset[]>;
  publishProfile(records: ProfilePublishRecords): RepositoryResult<void>;
  findLiveProfile(tenantId: string): RepositoryResult<PublishedProfile | undefined>;
  listPublishedProfiles(tenantId: string): RepositoryResult<PublishedProfile[]>;
  eraseTenantHoldings(tenantId: string): RepositoryResult<{ profiles: number; media: number }>;
}
