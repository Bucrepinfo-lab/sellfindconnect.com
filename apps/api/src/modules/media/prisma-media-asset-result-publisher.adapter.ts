import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

import {
  buildMediaAssetPublicationPatch,
  type MediaAssetPublicationResult,
  type MediaAssetResultPublicationInput,
  type MediaAssetResultPublisherAdapter,
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

    return {
      mediaId: input.job.mediaId,
      published: updated.count > 0,
      reason: updated.count > 0 ? undefined : 'Media asset was not found for publication.',
      patch,
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
}
