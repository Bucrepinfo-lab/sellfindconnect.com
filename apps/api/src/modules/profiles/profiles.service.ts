import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import { InMemoryProfilesRepository } from './in-memory-profiles.repository';
import { PROFILES_REPOSITORY, type ProfilesRepository } from './profiles.repository';

@Injectable()
export class ProfilesService {
  constructor(
    @Optional()
    @Inject(PROFILES_REPOSITORY)
    private readonly repository: ProfilesRepository = new InMemoryProfilesRepository(),
    @Optional() private readonly auth?: AuthService,
  ) {}

  async createDraft(tenantId: string, input: CreateProfileDraftDto): Promise<ProfileDraft> {
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

    await this.repository.createDraft(draft);
    return draft;
  }

  async getDraft(tenantId: string, id: string): Promise<ProfileDraft> {
    const draft = await this.repository.findDraft(tenantId, id);
    if (!draft) {
      throw new NotFoundException('Profile draft not found.');
    }

    return draft;
  }

  async previewDraft(tenantId: string, id: string) {
    const draft = await this.getDraft(tenantId, id);
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
    const draft = await this.getDraft(tenantId, id);
    const safety = evaluateSafetyFields(draft);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const previousLiveProfile = await this.repository.findLiveProfile(tenantId);
    const archivedPreviousProfile = previousLiveProfile
      ? {
          ...previousLiveProfile,
          status: 'ARCHIVED' as const,
          archivedAt: now,
          updatedAt: now,
          daysLive: this.daysBetween(previousLiveProfile.publishedAt, now),
        }
      : undefined;

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
      version: await this.nextVersion(tenantId),
      publishedAt: now,
      daysLive: 0,
      createdAt: now,
      updatedAt: now,
    };
    const publishedDraft: ProfileDraft = {
      ...draft,
      status: 'PUBLISHED',
      updatedAt: now,
    };

    await this.repository.publishProfile({
      tenantId,
      draft: publishedDraft,
      published,
      previousLiveProfile: archivedPreviousProfile,
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
        previousLiveProfileId: previousLiveProfile?.id ?? null,
        countryCode: published.countryCode,
        industryCode: published.industryCode,
      },
    });

    return published;
  }

  async getLiveProfile(tenantId: string): Promise<PublishedProfile> {
    const profile = await this.repository.findLiveProfile(tenantId);
    if (!profile) {
      throw new NotFoundException('Published profile not found.');
    }

    return {
      ...profile,
      daysLive: this.daysBetween(profile.publishedAt, new Date().toISOString()),
    };
  }

  async listPublishedProfiles(tenantId: string): Promise<PublishedProfile[]> {
    const profiles = await this.repository.listPublishedProfiles(tenantId);
    return profiles
      .map((profile) => ({
        ...profile,
        daysLive: this.daysBetween(
          profile.publishedAt,
          profile.archivedAt ?? new Date().toISOString(),
        ),
      }))
      .sort((a, b) => b.version - a.version);
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

  private async nextVersion(tenantId: string): Promise<number> {
    const versions = (await this.repository.listPublishedProfiles(tenantId)).map(
      (profile) => profile.version,
    );

    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  private daysBetween(start: string, end: string): number {
    const diffMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
