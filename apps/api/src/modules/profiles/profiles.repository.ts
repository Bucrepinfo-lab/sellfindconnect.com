import type { ProfileDraft, PublishedProfile } from '@telpen/domain';

export const PROFILES_REPOSITORY = Symbol('PROFILES_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export type ProfilePublishRecords = {
  tenantId: string;
  draft: ProfileDraft;
  published: PublishedProfile;
  previousLiveProfile?: PublishedProfile;
};

export interface ProfilesRepository {
  createDraft(draft: ProfileDraft): RepositoryResult<void>;
  findDraft(tenantId: string, id: string): RepositoryResult<ProfileDraft | undefined>;
  updateDraft(draft: ProfileDraft): RepositoryResult<void>;
  listDraftsPendingReview(tenantId: string): RepositoryResult<ProfileDraft[]>;
  publishProfile(records: ProfilePublishRecords): RepositoryResult<void>;
  findLiveProfile(tenantId: string): RepositoryResult<PublishedProfile | undefined>;
  listPublishedProfiles(tenantId: string): RepositoryResult<PublishedProfile[]>;
}
