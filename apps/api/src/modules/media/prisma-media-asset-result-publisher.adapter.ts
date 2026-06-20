import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

import {
  buildMediaAssetPublicationPatch,
  buildMediaReviewCaseDraft,
  type MediaAssetPublicationResult,
  type MediaAssetResultPublicationInput,
  type MediaAssetResultPublisherAdapter,
  type MediaReviewCaseDraft,
} from './media-result-publisher';

export function createMediaAssetPublisherPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaMediaAssetResultPublisherAdapter
  implements MediaAssetResultPublisherAdapter
{
  constructor(private readonly prisma: PrismaClient) {}

  async publish(
    input: MediaAssetResultPublicationInput,
  ): Promise<MediaAssetPublicationResult> {
    const patch = buildMediaAssetPublicationPatch(input);
    if (!patch) {
      return {
        mediaId: input.job.mediaId,
        published: false,
        reason: `No media asset fields changed for ${input.job.type}.`,
      };
    }

    const updated = await this.prisma.mediaAsset.updateMany({
      where: {
        id: input.job.mediaId,
        tenantId: input.job.tenantId,
        ownerType: input.job.ownerType,
        ownerId: input.job.ownerId,
      },
      data: this.mapPatchToPrisma(patch),
    });

    const reviewCase = await this.createReviewCase(input, patch);

    return {
      mediaId: input.job.mediaId,
      published: updated.count > 0,
      reason: updated.count > 0 ? undefined : 'Media asset was not found for publication.',
      patch,
      reviewCase,
    };
  }

  private mapPatchToPrisma(
    patch: NonNullable<MediaAssetPublicationResult['patch']>,
  ): Prisma.MediaAssetUpdateManyMutationInput {
    const data: Prisma.MediaAssetUpdateManyMutationInput = {
      updatedAt: new Date(patch.updatedAt),
    };

    if (patch.status !== undefined) {
      data.status = patch.status;
    }

    if (patch.moderationStatus !== undefined) {
      data.moderationStatus = patch.moderationStatus;
    }

    if ('moderationReason' in patch) {
      data.moderationReason = patch.moderationReason;
    }

    if (patch.transformStatus !== undefined) {
      data.transformStatus = patch.transformStatus;
    }

    if (patch.cdnUrl !== undefined) {
      data.cdnUrl = patch.cdnUrl;
    }

    if (patch.thumbnailUrl !== undefined) {
      data.thumbnailUrl = patch.thumbnailUrl;
    }

    if (patch.variants !== undefined) {
      data.variants = patch.variants as Prisma.InputJsonValue;
    }

    return data;
  }

  private async createReviewCase(
    input: MediaAssetResultPublicationInput,
    patch: NonNullable<MediaAssetPublicationResult['patch']>,
  ): Promise<MediaReviewCaseDraft | undefined> {
    const draft = buildMediaReviewCaseDraft(input, patch);
    if (!draft) {
      return undefined;
    }

    const existing = await this.prisma.mediaReviewCase.findFirst({
      where: {
        tenantId: draft.tenantId,
        mediaId: draft.mediaId,
        sourceJobId: draft.sourceJobId,
        jobType: draft.jobType,
        status: 'OPEN',
      },
    });

    if (existing) {
      return draft;
    }

    await this.prisma.mediaReviewCase.create({
      data: {
        tenantId: draft.tenantId,
        mediaId: draft.mediaId,
        ownerType: draft.ownerType,
        ownerId: draft.ownerId,
        sourceJobId: draft.sourceJobId,
        jobType: draft.jobType,
        severity: draft.severity,
        status: draft.status,
        reason: draft.reason,
        provider: draft.provider,
        evidence: draft.evidence as Prisma.InputJsonValue,
        openedAt: new Date(draft.openedAt),
      },
    });

    return draft;
  }
}
