import type {
  MediaAssetStatus,
  MediaCdnVariant,
  MediaModerationStatus,
  MediaTransformStatus,
} from '@telpen/domain';

import type {
  MediaAdapterConfigReader,
  MediaProcessingJob,
  MediaProcessingJobMetadata,
  MediaProcessingJobMetadataValue,
} from './media.adapters';

export const MEDIA_ASSET_RESULT_PUBLISHER = Symbol('MEDIA_ASSET_RESULT_PUBLISHER');

export type MediaAssetResultPublicationInput = {
  job: MediaProcessingJob;
  outcome: 'SUCCEEDED' | 'FAILED';
  occurredAt: string;
  reason?: string;
};

export type MediaAssetPublicationPatch = {
  status?: MediaAssetStatus;
  moderationStatus?: MediaModerationStatus;
  moderationReason?: string | null;
  transformStatus?: MediaTransformStatus;
  cdnUrl?: string;
  thumbnailUrl?: string;
  variants?: MediaCdnVariant[];
  updatedAt: string;
};

export type MediaAssetPublicationResult = {
  mediaId: string;
  published: boolean;
  reason?: string;
  patch?: MediaAssetPublicationPatch;
};

export interface MediaAssetResultPublisherAdapter {
  publish(input: MediaAssetResultPublicationInput): Promise<MediaAssetPublicationResult> | MediaAssetPublicationResult;
}

export class NoopMediaAssetResultPublisherAdapter implements MediaAssetResultPublisherAdapter {
  publish(input: MediaAssetResultPublicationInput): MediaAssetPublicationResult {
    const patch = buildMediaAssetPublicationPatch(input);
    return {
      mediaId: input.job.mediaId,
      published: false,
      reason: 'No media asset result publisher is configured.',
      patch,
    };
  }
}

export async function createConfiguredMediaAssetResultPublisherAsync(
  config?: MediaAdapterConfigReader,
): Promise<MediaAssetResultPublisherAdapter> {
  const explicitDriver = normalizeConfigString(
    config?.get('MEDIA_ASSET_RESULT_PUBLISHER_DRIVER') ??
      config?.get('MEDIA_ASSET_PUBLICATION_DRIVER'),
  );
  const queueDriver = normalizeConfigString(
    config?.get('MEDIA_JOB_QUEUE_DRIVER') ?? config?.get('MEDIA_PROCESSING_QUEUE_DRIVER'),
  );
  const databaseUrl = normalizeOptionalConfigString(config?.get('DATABASE_URL'));
  const prismaDrivers = ['prisma', 'postgres', 'database'];
  const shouldUsePrisma =
    (explicitDriver !== undefined && prismaDrivers.includes(explicitDriver)) ||
    (!explicitDriver &&
      queueDriver !== undefined &&
      prismaDrivers.includes(queueDriver) &&
      Boolean(databaseUrl));

  if (!shouldUsePrisma) {
    return new NoopMediaAssetResultPublisherAdapter();
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when MEDIA_ASSET_RESULT_PUBLISHER_DRIVER=prisma.');
  }

  const { PrismaMediaAssetResultPublisherAdapter, createMediaAssetPublisherPrismaClient } =
    await import('./prisma-media-asset-result-publisher.adapter.js');
  return new PrismaMediaAssetResultPublisherAdapter(
    createMediaAssetPublisherPrismaClient(databaseUrl),
  );
}

export function buildMediaAssetPublicationPatch(
  input: MediaAssetResultPublicationInput,
): MediaAssetPublicationPatch | undefined {
  if (input.outcome === 'FAILED') {
    return buildFailedPatch(input);
  }

  const result = input.job.result ?? {};
  switch (input.job.type) {
    case 'MALWARE_SCAN':
      return buildScanPatch(result, input.occurredAt);
    case 'CONTENT_MODERATION':
      return buildModerationPatch(result, input.occurredAt);
    case 'IMAGE_TRANSFORM':
    case 'VIDEO_TRANSCODE':
      return buildTransformPatch(result, input.occurredAt);
  }
}

function buildFailedPatch(input: MediaAssetResultPublicationInput): MediaAssetPublicationPatch {
  if (input.job.type === 'IMAGE_TRANSFORM' || input.job.type === 'VIDEO_TRANSCODE') {
    return {
      transformStatus: 'FAILED',
      updatedAt: input.occurredAt,
    };
  }

  return {
    status: 'BLOCKED',
    moderationStatus: 'BLOCKED',
    moderationReason: truncateReason(input.reason ?? input.job.lastError ?? 'MEDIA_PROCESSING_FAILED'),
    updatedAt: input.occurredAt,
  };
}

function buildScanPatch(
  result: MediaProcessingJobMetadata,
  updatedAt: string,
): MediaAssetPublicationPatch | undefined {
  const verdict = normalizeVerdict(readString(result, 'verdict') ?? readString(result, 'status'));
  if (isUnsafeVerdict(verdict)) {
    return {
      status: 'BLOCKED',
      moderationStatus: 'BLOCKED',
      moderationReason: truncateReason(readString(result, 'reason') ?? 'MALWARE_SCAN_BLOCKED'),
      updatedAt,
    };
  }

  if (isPassingVerdict(verdict)) {
    return {
      moderationReason: 'MALWARE_SCAN_PASSED',
      updatedAt,
    };
  }

  return undefined;
}

function buildModerationPatch(
  result: MediaProcessingJobMetadata,
  updatedAt: string,
): MediaAssetPublicationPatch | undefined {
  const verdict = normalizeVerdict(readString(result, 'verdict') ?? readString(result, 'status'));
  if (isUnsafeVerdict(verdict)) {
    return {
      status: 'BLOCKED',
      moderationStatus: 'BLOCKED',
      moderationReason: truncateReason(readString(result, 'reason') ?? 'CONTENT_MODERATION_BLOCKED'),
      updatedAt,
    };
  }

  if (isPassingVerdict(verdict)) {
    return {
      moderationStatus: 'PASSED',
      moderationReason: null,
      updatedAt,
    };
  }

  return undefined;
}

function buildTransformPatch(
  result: MediaProcessingJobMetadata,
  updatedAt: string,
): MediaAssetPublicationPatch {
  return {
    transformStatus: readTransformStatus(result) ?? 'READY',
    cdnUrl: readString(result, 'cdnUrl'),
    thumbnailUrl: readString(result, 'thumbnailUrl'),
    variants: readVariants(result.variants),
    updatedAt,
  };
}

function readTransformStatus(result: MediaProcessingJobMetadata): MediaTransformStatus | undefined {
  const status = readString(result, 'transformStatus');
  if (status === 'PENDING' || status === 'READY' || status === 'FAILED' || status === 'NOT_REQUIRED') {
    return status;
  }

  return undefined;
}

function readString(result: MediaProcessingJobMetadata, key: string): string | undefined {
  const value = result[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readVariants(value: MediaProcessingJobMetadataValue | undefined): MediaCdnVariant[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const variants = value
    .filter((item): item is Record<string, MediaProcessingJobMetadataValue> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
    .filter((item) => typeof item.label === 'string' && typeof item.url === 'string')
    .map((item) => {
      const variant: MediaCdnVariant = {
        label: String(item.label),
        url: String(item.url),
      };

      if (typeof item.width === 'number') {
        variant.width = item.width;
      }

      if (typeof item.height === 'number') {
        variant.height = item.height;
      }

      return variant;
    });

  return variants.length ? variants : undefined;
}

function normalizeVerdict(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function isUnsafeVerdict(value: string | undefined): boolean {
  return ['blocked', 'unsafe', 'malware', 'infected', 'rejected', 'failed'].includes(value ?? '');
}

function isPassingVerdict(value: string | undefined): boolean {
  return ['clean', 'passed', 'safe', 'approved', 'ready'].includes(value ?? '');
}

function truncateReason(value: string): string {
  return value.trim().slice(0, 120) || 'MEDIA_PROCESSING_FAILED';
}

function normalizeConfigString(value: string | undefined): string | undefined {
  return normalizeOptionalConfigString(value)?.toLowerCase();
}

function normalizeOptionalConfigString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
