import type {
  MediaAsset,
  MediaAssetStatus,
  MediaModerationStatus,
  MediaTransformStatus,
} from './media';

export const userFacingMediaReviewStatuses = [
  'UNDER_REVIEW',
  'READY',
  'BLOCKED',
  'PROCESSING_FAILED',
] as const;

export type UserFacingMediaReviewStatus = (typeof userFacingMediaReviewStatuses)[number];

export type UserFacingMediaReview = {
  status: UserFacingMediaReviewStatus;
  message: string;
  canPublish: boolean;
  canReplace: boolean;
};

export type MediaReviewStatusInput = {
  status?: MediaAssetStatus;
  moderationStatus: MediaModerationStatus;
  transformStatus?: MediaTransformStatus;
};

export type PresentedMediaAsset = Omit<MediaAsset, 'moderationReason'> & {
  review: UserFacingMediaReview;
};

const MESSAGES: Record<UserFacingMediaReviewStatus, string> = {
  UNDER_REVIEW: 'This file is still being checked. It is not public yet.',
  READY: 'This file is ready to display.',
  BLOCKED: 'This file cannot be published. Replace it with a different file.',
  PROCESSING_FAILED: 'This file could not be prepared for display. Upload it again.',
};

export function presentUserFacingMediaReview(input: MediaReviewStatusInput): UserFacingMediaReview {
  if (input.status === 'BLOCKED' || input.moderationStatus === 'BLOCKED') {
    return review('BLOCKED');
  }

  if (input.transformStatus === 'FAILED') {
    return review('PROCESSING_FAILED');
  }

  if (
    input.status === 'ARCHIVED' ||
    input.moderationStatus === 'PENDING' ||
    input.transformStatus === 'PENDING'
  ) {
    return review('UNDER_REVIEW');
  }

  return review('READY');
}

export function presentTenantMediaAsset(asset: MediaAsset): PresentedMediaAsset {
  const { moderationReason: _omitted, ...rest } = asset;
  return {
    ...rest,
    review: presentUserFacingMediaReview(asset),
  };
}

export function presentTenantMediaAssets(assets: MediaAsset[]): PresentedMediaAsset[] {
  return assets.map(presentTenantMediaAsset);
}

export function presentPublicMediaAssets(assets: MediaAsset[]): PresentedMediaAsset[] {
  return presentTenantMediaAssets(assets).filter((asset) => asset.review.canPublish);
}

function review(status: UserFacingMediaReviewStatus): UserFacingMediaReview {
  return {
    status,
    message: MESSAGES[status],
    canPublish: status === 'READY',
    canReplace: status !== 'READY' && status !== 'UNDER_REVIEW',
  };
}
