import type {
  MediaAssetStatus,
  MediaCdnVariant,
  MediaModerationStatus,
  MediaTransformStatus,
} from '@telpen/domain';

import { requireDatabaseUrl, resolvePersistenceMode } from '../../persistence';
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
  reviewCase?: MediaReviewCaseDraft;
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
      reviewCase: buildMediaReviewCaseDraft(input, patch),
    };
  }
}

export async function createConfiguredMediaAssetResultPublisherAsync(
  config?: MediaAdapterConfigReader,
): Promise<MediaAssetResultPublisherAdapter> {
  if (
    resolvePersistenceMode(config, [
      'MEDIA_ASSET_RESULT_PUBLISHER_DRIVER',
      'MEDIA_ASSET_PUBLICATION_DRIVER',
      'MEDIA_JOB_QUEUE_DRIVER',
      'MEDIA_PROCESSING_QUEUE_DRIVER',
    ]) === 'memory'
  ) {
    return new NoopMediaAssetResultPublisherAdapter();
  }

  const databaseUrl = requireDatabaseUrl(config, 'MEDIA_ASSET_RESULT_PUBLISHER_DRIVER');

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

export type MediaReviewCaseSeverity = 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MediaReviewCaseDraft = {
  tenantId: string;
  mediaId: string;
  ownerType: string;
  ownerId: string;
  sourceJobId: string;
  jobType: string;
  severity: MediaReviewCaseSeverity;
  status: 'OPEN';
  reason: string;
  provider?: string;
  evidence: MediaProcessingJobMetadata;
  openedAt: string;
};

export function buildMediaReviewCaseDraft(
  input: MediaAssetResultPublicationInput,
  patch = buildMediaAssetPublicationPatch(input),
): MediaReviewCaseDraft | undefined {
  if (!patch || !requiresMediaReviewCase(input, patch)) {
    return undefined;
  }

  return {
    tenantId: input.job.tenantId,
    mediaId: input.job.mediaId,
    ownerType: input.job.ownerType,
    ownerId: input.job.ownerId,
    sourceJobId: input.job.id,
    jobType: input.job.type,
    severity: reviewCaseSeverity(input),
    status: 'OPEN',
    reason: reviewCaseReason(input, patch),
    provider: readString(input.job.result ?? {}, 'provider'),
    evidence: reviewCaseEvidence(input, patch),
    openedAt: input.occurredAt,
  };
}

function requiresMediaReviewCase(
  input: MediaAssetResultPublicationInput,
  patch: MediaAssetPublicationPatch,
): boolean {
  return (
    input.outcome === 'FAILED' ||
    patch.status === 'BLOCKED' ||
    patch.moderationStatus === 'BLOCKED' ||
    patch.transformStatus === 'FAILED'
  );
}

function reviewCaseSeverity(input: MediaAssetResultPublicationInput): MediaReviewCaseSeverity {
  if (input.job.type === 'MALWARE_SCAN') {
    return 'CRITICAL';
  }

  if (input.job.type === 'CONTENT_MODERATION') {
    return 'HIGH';
  }

  return 'MEDIUM';
}

function reviewCaseReason(
  input: MediaAssetResultPublicationInput,
  patch: MediaAssetPublicationPatch,
): string {
  return truncateReviewReason(
    input.reason ??
      patch.moderationReason ??
      input.job.lastError ??
      readString(input.job.result ?? {}, 'reason') ??
      `${input.job.type}_REQUIRES_REVIEW`,
  );
}

function reviewCaseEvidence(
  input: MediaAssetResultPublicationInput,
  patch: MediaAssetPublicationPatch,
): MediaProcessingJobMetadata {
  return {
    outcome: input.outcome,
    jobId: input.job.id,
    jobType: input.job.type,
    attempts: input.job.attempts,
    sourceUrl: input.job.sourceUrl,
    objectKey: input.job.objectKey ?? null,
    lastError: input.job.lastError ?? null,
    result: input.job.result ?? {},
    patch: patch as unknown as MediaProcessingJobMetadata,
  };
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

function truncateReviewReason(value: string): string {
  return value.trim().slice(0, 240) || 'MEDIA_REVIEW_REQUIRED';
}
