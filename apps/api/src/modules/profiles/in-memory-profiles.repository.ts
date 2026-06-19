import { Injectable } from '@nestjs/common';
import type { ProfileDraft, PublishedProfile } from '@telpen/domain';

import type { ProfilePublishRecords, ProfilesRepository } from './profiles.repository';

@Injectable()
export class InMemoryProfilesRepository implements ProfilesRepository {
  private readonly drafts = new Map<string, ProfileDraft>();
  private readonly publishedProfiles = new Map<string, PublishedProfile>();
  private readonly liveProfileByTenant = new Map<string, string>();

  createDraft(draft: ProfileDraft): void {
    this.drafts.set(this.key(draft.tenantId, draft.id), draft);
  }

  findDraft(tenantId: string, id: string): ProfileDraft | undefined {
    return this.drafts.get(this.key(tenantId, id));
  }

  updateDraft(draft: ProfileDraft): void {
    this.drafts.set(this.key(draft.tenantId, draft.id), draft);
  }

  listDraftsPendingReview(tenantId: string): ProfileDraft[] {
    return Array.from(this.drafts.values())
      .filter((draft) => draft.tenantId === tenantId && draft.status === 'PENDING_REVIEW')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  publishProfile(records: ProfilePublishRecords): void {
    if (records.previousLiveProfile) {
      this.publishedProfiles.set(
        this.key(records.tenantId, records.previousLiveProfile.id),
        records.previousLiveProfile,
      );
    }

    this.publishedProfiles.set(this.key(records.tenantId, records.published.id), records.published);
    this.liveProfileByTenant.set(records.tenantId, records.published.id);
    this.drafts.set(this.key(records.tenantId, records.draft.id), records.draft);
  }

  findLiveProfile(tenantId: string): PublishedProfile | undefined {
    const liveProfileId = this.liveProfileByTenant.get(tenantId);
    return liveProfileId
      ? this.publishedProfiles.get(this.key(tenantId, liveProfileId))
      : undefined;
  }

  listPublishedProfiles(tenantId: string): PublishedProfile[] {
    return Array.from(this.publishedProfiles.values())
      .filter((profile) => profile.tenantId === tenantId)
      .sort((a, b) => b.version - a.version);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
