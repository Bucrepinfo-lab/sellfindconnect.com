import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ProfileStatus,
  type ProfileDraft as PrismaProfileDraft,
  type PublishedProfile as PrismaPublishedProfile,
} from '@prisma/client';
import type { ProfileDraft, PublishedProfile, SupplyChainRole } from '@telpen/domain';

import type { ProfilePublishRecords, ProfilesRepository } from './profiles.repository';

export function createProfilesPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraft(draft: ProfileDraft): Promise<void> {
    await this.prisma.profileDraft.create({
      data: {
        id: draft.id,
        tenantId: draft.tenantId,
        countryCode: draft.countryCode,
        industryCode: draft.industryCode,
        role: draft.role,
        displayName: draft.displayName,
        description: draft.description,
        phone: draft.phone,
        email: draft.email,
        website: draft.website,
        status: this.mapDraftStatusToPrisma(draft.status),
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt),
      },
    });
  }

  async findDraft(tenantId: string, id: string): Promise<ProfileDraft | undefined> {
    const draft = await this.prisma.profileDraft.findFirst({
      where: { id, tenantId },
    });
    return draft ? this.mapDraft(draft) : undefined;
  }

  async publishProfile(records: ProfilePublishRecords): Promise<void> {
    await this.prisma.$transaction([
      ...(records.previousLiveProfile
        ? [
            this.prisma.publishedProfile.update({
              where: { id: records.previousLiveProfile.id },
              data: {
                status: ProfileStatus.ARCHIVED,
                archivedAt: records.previousLiveProfile.archivedAt
                  ? new Date(records.previousLiveProfile.archivedAt)
                  : null,
                updatedAt: new Date(records.previousLiveProfile.updatedAt),
              },
            }),
          ]
        : []),
      this.prisma.publishedProfile.create({
        data: {
          id: records.published.id,
          tenantId: records.published.tenantId,
          sourceDraftId: records.published.sourceDraftId,
          countryCode: records.published.countryCode,
          industryCode: records.published.industryCode,
          role: records.published.role,
          displayName: records.published.displayName,
          description: records.published.description,
          phone: records.published.phone,
          email: records.published.email,
          website: records.published.website,
          status: ProfileStatus.LIVE,
          version: records.published.version,
          publishedAt: new Date(records.published.publishedAt),
          archivedAt: records.published.archivedAt
            ? new Date(records.published.archivedAt)
            : undefined,
          createdAt: new Date(records.published.createdAt),
          updatedAt: new Date(records.published.updatedAt),
        },
      }),
      this.prisma.profileDraft.update({
        where: { id: records.draft.id },
        data: {
          status: this.mapDraftStatusToPrisma(records.draft.status),
          updatedAt: new Date(records.draft.updatedAt),
        },
      }),
    ]);
  }

  async findLiveProfile(tenantId: string): Promise<PublishedProfile | undefined> {
    const profile = await this.prisma.publishedProfile.findFirst({
      where: { tenantId, status: ProfileStatus.LIVE, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return profile ? this.mapPublishedProfile(profile) : undefined;
  }

  async listPublishedProfiles(tenantId: string): Promise<PublishedProfile[]> {
    const profiles = await this.prisma.publishedProfile.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
    return profiles.map((profile) => this.mapPublishedProfile(profile));
  }

  private mapDraft(draft: PrismaProfileDraft): ProfileDraft {
    return {
      id: draft.id,
      tenantId: draft.tenantId,
      displayName: draft.displayName,
      industryCode: draft.industryCode,
      role: draft.role as SupplyChainRole,
      description: draft.description,
      countryCode: draft.countryCode,
      phone: draft.phone ?? undefined,
      email: draft.email ?? undefined,
      website: draft.website ?? undefined,
      status: draft.status === ProfileStatus.DRAFT ? 'DRAFT' : 'PUBLISHED',
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  private mapPublishedProfile(profile: PrismaPublishedProfile): PublishedProfile {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      sourceDraftId: profile.sourceDraftId ?? profile.id,
      displayName: profile.displayName,
      industryCode: profile.industryCode,
      role: profile.role as SupplyChainRole,
      description: profile.description,
      countryCode: profile.countryCode,
      phone: profile.phone ?? undefined,
      email: profile.email ?? undefined,
      website: profile.website ?? undefined,
      status: profile.status === ProfileStatus.ARCHIVED ? 'ARCHIVED' : 'LIVE',
      version: profile.version,
      publishedAt: profile.publishedAt.toISOString(),
      archivedAt: profile.archivedAt?.toISOString(),
      daysLive: this.daysBetween(
        profile.publishedAt.toISOString(),
        (profile.archivedAt ?? new Date()).toISOString(),
      ),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private mapDraftStatusToPrisma(status: ProfileDraft['status']): ProfileStatus {
    return status === 'DRAFT' ? ProfileStatus.DRAFT : ProfileStatus.LIVE;
  }

  private daysBetween(start: string, end: string): number {
    const diffMs = Math.max(0, Date.parse(end) - Date.parse(start));
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
