import { Injectable } from '@nestjs/common';
import type { MediaAsset, MediaOwnerType, ProfileDraft, PublishedProfile } from '@telpen/domain';

import type { ProfilePublishRecords, ProfilesRepository } from './profiles.repository';

@Injectable()
export class InMemoryProfilesRepository implements ProfilesRepository {
  private readonly drafts = new Map<string, ProfileDraft>();
  private readonly publishedProfiles = new Map<string, PublishedProfile>();
  private readonly mediaAssets = new Map<string, MediaAsset>();
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

  listAllDraftsPendingReview(): ProfileDraft[] {
    return Array.from(this.drafts.values())
      .filter((draft) => draft.status === 'PENDING_REVIEW')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
          asset.status !== 'BLOCKED',
      )
      .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt));
  }

  publishProfile(records: ProfilePublishRecords): void {
    if (records.previousLiveProfile) {
      this.publishedProfiles.set(
        this.key(records.tenantId, records.previousLiveProfile.id),
        records.previousLiveProfile,
      );
    }

    this.publishedProfiles.set(this.key(records.tenantId, records.published.id), records.published);
    for (const asset of records.publishedMediaAssets ?? []) {
      this.mediaAssets.set(this.key(records.tenantId, asset.id), asset);
    }
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

  eraseTenantHoldings(tenantId: string): { profiles: number; media: number } {
    let profiles = 0;
    let media = 0;
    for (const [key, draft] of this.drafts) {
      if (draft.tenantId === tenantId) {
        this.drafts.delete(key);
        profiles += 1;
      }
    }
    for (const [key, profile] of this.publishedProfiles) {
      if (profile.tenantId === tenantId) {
        this.publishedProfiles.delete(key);
        profiles += 1;
      }
    }
    for (const [key, asset] of this.mediaAssets) {
      if (asset.tenantId === tenantId) {
        this.mediaAssets.delete(key);
        media += 1;
      }
    }
    this.liveProfileByTenant.delete(tenantId);
    return { profiles, media };
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
