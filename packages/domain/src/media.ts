export const mediaAssetKinds = ['IMAGE', 'VIDEO'] as const;

export type MediaAssetKind = (typeof mediaAssetKinds)[number];

export const mediaOwnerTypes = ['PROFILE_DRAFT', 'PUBLISHED_PROFILE', 'ADVERT', 'CONVERSATION'] as const;

export type MediaOwnerType = (typeof mediaOwnerTypes)[number];

export const mediaAssetStatuses = ['READY_FOR_PREVIEW', 'LIVE', 'ARCHIVED', 'BLOCKED'] as const;

export type MediaAssetStatus = (typeof mediaAssetStatuses)[number];

export const mediaVisibilityStates = ['PUBLIC', 'TENANT_ONLY'] as const;

export type MediaVisibility = (typeof mediaVisibilityStates)[number];

export const mediaModerationStatuses = ['PASSED', 'PENDING', 'BLOCKED'] as const;

export type MediaModerationStatus = (typeof mediaModerationStatuses)[number];

export const mediaTransformStatuses = ['PENDING', 'READY', 'FAILED', 'NOT_REQUIRED'] as const;

export type MediaTransformStatus = (typeof mediaTransformStatuses)[number];

export const mediaPolicy = {
  maxItemsPerOwner: 10,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxVideoDurationSeconds: 60,
  allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  allowedVideoMimeTypes: ['video/mp4', 'video/quicktime'],
} as const;

export type MediaAssetInput = {
  sourceUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  caption?: string;
  altText?: string;
  displayOrder?: number;
  visibility?: MediaVisibility;
};

export type MediaCdnVariant = {
  label: string;
  url: string;
  width?: number;
  height?: number;
};

export type MediaAsset = Omit<MediaAssetInput, 'displayOrder' | 'visibility'> & {
  id: string;
  tenantId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  kind: MediaAssetKind;
  status: MediaAssetStatus;
  displayOrder: number;
  visibility: MediaVisibility;
  moderationStatus: MediaModerationStatus;
  moderationReason?: string;
  storageProvider?: string;
  objectKey?: string;
  cdnUrl?: string;
  transformStatus?: MediaTransformStatus;
  variants?: MediaCdnVariant[];
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaUploadPreparationInput = {
  tenantId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export type PreparedMediaUpload = {
  provider: string;
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  thumbnailUrl?: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
};

export type MediaPolicyDecision =
  | { allowed: true; kind: MediaAssetKind; reasons: [] }
  | { allowed: false; kind?: MediaAssetKind; reasons: string[] };

export function detectMediaKind(mimeType: string): MediaAssetKind | undefined {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  if (
    mediaPolicy.allowedImageMimeTypes.includes(
      normalizedMimeType as (typeof mediaPolicy.allowedImageMimeTypes)[number],
    )
  ) {
    return 'IMAGE';
  }

  if (
    mediaPolicy.allowedVideoMimeTypes.includes(
      normalizedMimeType as (typeof mediaPolicy.allowedVideoMimeTypes)[number],
    )
  ) {
    return 'VIDEO';
  }

  return undefined;
}

export function evaluateMediaAssetInput(input: MediaAssetInput): MediaPolicyDecision {
  const reasons: string[] = [];
  const kind = detectMediaKind(input.mimeType);

  if (!kind) {
    reasons.push('UNSUPPORTED_MEDIA_TYPE');
  }

  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    reasons.push('INVALID_FILE_SIZE');
  } else if (kind === 'IMAGE' && input.fileSizeBytes > mediaPolicy.maxImageBytes) {
    reasons.push('IMAGE_TOO_LARGE');
  } else if (kind === 'VIDEO' && input.fileSizeBytes > mediaPolicy.maxVideoBytes) {
    reasons.push('VIDEO_TOO_LARGE');
  }

  if (kind === 'VIDEO') {
    if (!input.durationSeconds || input.durationSeconds <= 0) {
      reasons.push('VIDEO_DURATION_REQUIRED');
    } else if (input.durationSeconds > mediaPolicy.maxVideoDurationSeconds) {
      reasons.push('VIDEO_TOO_LONG');
    }
  }

  if (
    input.displayOrder !== undefined &&
    (input.displayOrder < 0 || input.displayOrder >= mediaPolicy.maxItemsPerOwner)
  ) {
    reasons.push('DISPLAY_ORDER_OUT_OF_RANGE');
  }

  return reasons.length > 0
    ? { allowed: false, kind, reasons }
    : { allowed: true, kind: kind!, reasons: [] };
}

export function evaluateMediaUploadPreparationInput(
  input: MediaUploadPreparationInput,
): MediaPolicyDecision {
  const reasons: string[] = [];
  const kind = detectMediaKind(input.mimeType);

  if (!kind) {
    reasons.push('UNSUPPORTED_MEDIA_TYPE');
  }

  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    reasons.push('INVALID_FILE_SIZE');
  } else if (kind === 'IMAGE' && input.fileSizeBytes > mediaPolicy.maxImageBytes) {
    reasons.push('IMAGE_TOO_LARGE');
  } else if (kind === 'VIDEO' && input.fileSizeBytes > mediaPolicy.maxVideoBytes) {
    reasons.push('VIDEO_TOO_LARGE');
  }

  return reasons.length > 0
    ? { allowed: false, kind, reasons }
    : { allowed: true, kind: kind!, reasons: [] };
}
