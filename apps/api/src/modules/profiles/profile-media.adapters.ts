import type {
  MediaAsset,
  MediaAssetInput,
  MediaCdnVariant,
  MediaTransformStatus,
  MediaUploadPreparationInput,
  PreparedMediaUpload,
} from '@telpen/domain';
import { createHash, randomUUID } from 'node:crypto';

export type MediaModerationResult =
  | {
      allowed: true;
      moderationStatus: 'PASSED' | 'PENDING';
      moderationReason?: string;
    }
  | {
      allowed: false;
      moderationStatus: 'BLOCKED';
      moderationReason: string;
    };

export type MediaTransformResult = {
  transformStatus: MediaTransformStatus;
  cdnUrl?: string;
  thumbnailUrl?: string;
  variants?: MediaCdnVariant[];
};

export interface MediaStorageAdapter {
  prepareUpload(input: MediaUploadPreparationInput): Promise<PreparedMediaUpload> | PreparedMediaUpload;
}

export interface MediaModerationAdapter {
  review(input: MediaAssetInput): Promise<MediaModerationResult> | MediaModerationResult;
}

export interface MediaTransformAdapter {
  plan(input: MediaAsset): Promise<MediaTransformResult> | MediaTransformResult;
}

export type ProfileMediaAdapters = {
  storage: MediaStorageAdapter;
  moderation: MediaModerationAdapter;
  transforms: MediaTransformAdapter;
};

export const PROFILE_MEDIA_ADAPTERS = Symbol('PROFILE_MEDIA_ADAPTERS');

const defaultMediaBaseUrl = 'https://media.local.sellfindconnect.test';

export class DevelopmentMediaStorageAdapter implements MediaStorageAdapter {
  constructor(private readonly baseUrl = defaultMediaBaseUrl) {}

  prepareUpload(input: MediaUploadPreparationInput): PreparedMediaUpload {
    const objectKey = this.objectKey(input);
    const publicUrl = `${this.baseUrl}/public/${objectKey}`;

    return {
      provider: 'development-s3-compatible',
      objectKey,
      uploadUrl: `${this.baseUrl}/upload/${objectKey}?token=${this.uploadToken(input, objectKey)}`,
      publicUrl,
      thumbnailUrl: `${this.baseUrl}/thumb/${objectKey}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      requiredHeaders: {
        'content-type': input.mimeType.trim().toLowerCase(),
        'x-media-owner-type': input.ownerType,
      },
    };
  }

  private objectKey(input: MediaUploadPreparationInput): string {
    const safeFileName = input.fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${input.ownerType.toLowerCase()}/${input.tenantId}/${input.ownerId}/${randomUUID()}-${safeFileName}`;
  }

  private uploadToken(input: MediaUploadPreparationInput, objectKey: string): string {
    return createHash('sha256')
      .update(`${input.tenantId}:${input.ownerType}:${input.ownerId}:${objectKey}`)
      .digest('base64url')
      .slice(0, 32);
  }
}

export class MetadataOnlyMediaModerationAdapter implements MediaModerationAdapter {
  review(_input: MediaAssetInput): MediaModerationResult {
    return { allowed: true, moderationStatus: 'PASSED' };
  }
}

export class DevelopmentMediaTransformAdapter implements MediaTransformAdapter {
  plan(input: MediaAsset): MediaTransformResult {
    if (input.kind === 'VIDEO') {
      return {
        transformStatus: 'PENDING',
        cdnUrl: input.cdnUrl ?? input.sourceUrl,
        thumbnailUrl: input.thumbnailUrl,
        variants: input.variants ?? [],
      };
    }

    const cdnUrl = input.cdnUrl ?? input.sourceUrl;
    const thumbnailUrl = input.thumbnailUrl ?? cdnUrl;
    return {
      transformStatus: 'READY',
      cdnUrl,
      thumbnailUrl,
      variants: input.variants?.length
        ? input.variants
        : [
            { label: 'thumbnail', url: thumbnailUrl, width: 480 },
            { label: 'display', url: cdnUrl, width: input.width },
          ],
    };
  }
}

export function createDefaultProfileMediaAdapters(): ProfileMediaAdapters {
  return {
    storage: new DevelopmentMediaStorageAdapter(),
    moderation: new MetadataOnlyMediaModerationAdapter(),
    transforms: new DevelopmentMediaTransformAdapter(),
  };
}
