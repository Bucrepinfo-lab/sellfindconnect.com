import { Injectable, NotFoundException, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  type ProfileDraft,
  type PublishedProfile,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { CreateProfileDraftDto } from './dto/create-profile-draft.dto';

@Injectable()
export class ProfilesService {
  constructor(@Optional() private readonly auth?: AuthService) {}

  private readonly drafts = new Map<string, ProfileDraft>();
  private readonly publishedProfiles = new Map<string, PublishedProfile>();
  private readonly liveProfileByTenant = new Map<string, string>();

  createDraft(tenantId: string, input: CreateProfileDraftDto): ProfileDraft {
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
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const draft: ProfileDraft = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    this.drafts.set(this.key(tenantId, draft.id), draft);
    return draft;
  }

  getDraft(tenantId: string, id: string): ProfileDraft {
    const draft = this.drafts.get(this.key(tenantId, id));
    if (!draft) {
      throw new NotFoundException('Profile draft not found.');
    }

    return draft;
  }

  previewDraft(tenantId: string, id: string) {
    const draft = this.getDraft(tenantId, id);
    const country = getCountry(draft.countryCode);
    const industry = industryCategories.find((item) => item.code === draft.industryCode);

    return {
      ...draft,
      preview: {
        country,
        industry,
        completenessScore: this.completenessScore(draft),
        publicContacts: {
          phone: draft.phone ?? null,
          email: draft.email ?? null,
          website: draft.website ?? null,
        },
      },
    };
  }

  async publishDraft(
    tenantId: string,
    id: string,
    actorUserId?: string,
  ): Promise<PublishedProfile> {
    const draft = this.getDraft(tenantId, id);
    const safety = evaluateSafetyFields(draft);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const previousLiveId = this.liveProfileByTenant.get(tenantId);
    if (previousLiveId) {
      const previous = this.publishedProfiles.get(this.key(tenantId, previousLiveId));
      if (previous && previous.status === 'LIVE') {
        this.publishedProfiles.set(this.key(tenantId, previous.id), {
          ...previous,
          status: 'ARCHIVED',
          archivedAt: now,
          updatedAt: now,
          daysLive: this.daysBetween(previous.publishedAt, now),
        });
      }
    }

    const published: PublishedProfile = {
      id: randomUUID(),
      tenantId,
      sourceDraftId: draft.id,
      displayName: draft.displayName,
      industryCode: draft.industryCode,
      role: draft.role,
      description: draft.description,
      countryCode: draft.countryCode,
      phone: draft.phone,
      email: draft.email,
      website: draft.website,
      status: 'LIVE',
      version: this.nextVersion(tenantId),
      publishedAt: now,
      daysLive: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.publishedProfiles.set(this.key(tenantId, published.id), published);
    this.liveProfileByTenant.set(tenantId, published.id);
    this.drafts.set(this.key(tenantId, draft.id), {
      ...draft,
      status: 'PUBLISHED',
      updatedAt: now,
    });

    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId,
      action: 'PROFILE_PUBLISHED',
      entityType: 'PROFILE',
      entityId: published.id,
      metadata: {
        sourceDraftId: draft.id,
        version: published.version,
        previousLiveProfileId: previousLiveId ?? null,
        countryCode: published.countryCode,
        industryCode: published.industryCode,
      },
    });

    return published;
  }

  getLiveProfile(tenantId: string): PublishedProfile {
    const liveProfileId = this.liveProfileByTenant.get(tenantId);
    if (!liveProfileId) {
      throw new NotFoundException('Published profile not found.');
    }

    const profile = this.publishedProfiles.get(this.key(tenantId, liveProfileId));
    if (!profile) {
      throw new NotFoundException('Published profile not found.');
    }

    return {
      ...profile,
      daysLive: this.daysBetween(profile.publishedAt, new Date().toISOString()),
    };
  }

  listPublishedProfiles(tenantId: string): PublishedProfile[] {
    return Array.from(this.publishedProfiles.values())
      .filter((profile) => profile.tenantId === tenantId)
      .map((profile) => ({
        ...profile,
        daysLive: this.daysBetween(
          profile.publishedAt,
          profile.archivedAt ?? new Date().toISOString(),
        ),
      }))
      .sort((a, b) => b.version - a.version);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private completenessScore(draft: ProfileDraft): number {
    const fields = [
      draft.displayName,
      draft.industryCode,
      draft.role,
      draft.description,
      draft.countryCode,
      draft.phone,
      draft.email,
      draft.website,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }

  private nextVersion(tenantId: string): number {
    const versions = Array.from(this.publishedProfiles.values())
      .filter((profile) => profile.tenantId === tenantId)
      .map((profile) => profile.version);

    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  private daysBetween(start: string, end: string): number {
    const diffMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
