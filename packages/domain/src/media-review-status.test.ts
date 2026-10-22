import { describe, expect, it } from 'vitest';

import type { MediaAsset } from './media';
import {
  presentPublicMediaAssets,
  presentTenantMediaAsset,
  presentUserFacingMediaReview,
} from './media-review-status';

describe('user-facing media review status', () => {
  it('keeps pending scans off the public surface', () => {
    expect(
      presentUserFacingMediaReview({
        status: 'READY_FOR_PREVIEW',
        moderationStatus: 'PENDING',
        transformStatus: 'READY',
      }),
    ).toEqual({
      status: 'UNDER_REVIEW',
      message: 'This file is still being checked. It is not public yet.',
      canPublish: false,
      canReplace: false,
    });
  });

  it('marks passed and transformed media as ready', () => {
    expect(
      presentUserFacingMediaReview({
        status: 'LIVE',
        moderationStatus: 'PASSED',
        transformStatus: 'READY',
      }),
    ).toMatchObject({ status: 'READY', canPublish: true, canReplace: false });
  });

  it('uses a generic blocked message and redacts internal reasons', () => {
    const presented = presentTenantMediaAsset(
      mediaAsset({
        status: 'BLOCKED',
        moderationStatus: 'BLOCKED',
        moderationReason: 'SCAN_BLOCKED',
      }),
    );

    expect(presented.review).toEqual({
      status: 'BLOCKED',
      message: 'This file cannot be published. Replace it with a different file.',
      canPublish: false,
      canReplace: true,
    });
    expect(presented).not.toHaveProperty('moderationReason');
    expect(JSON.stringify(presented)).not.toContain('SCAN_BLOCKED');
    expect(JSON.stringify(presented.review)).not.toContain('secret');
  });

  it('treats failed transforms as replaceable and hides them from public display', () => {
    const failed = mediaAsset({
      moderationStatus: 'PASSED',
      transformStatus: 'FAILED',
      moderationReason: 'CDN_UNREACHABLE',
    });

    expect(presentTenantMediaAsset(failed).review.status).toBe('PROCESSING_FAILED');
    expect(presentPublicMediaAssets([failed, mediaAsset({ moderationStatus: 'PASSED' })])).toHaveLength(
      1,
    );
  });
});

function mediaAsset(input: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'media-1',
    tenantId: 'tenant-1',
    ownerType: 'ADVERT',
    ownerId: 'advert-1',
    kind: 'IMAGE',
    status: 'LIVE',
    displayOrder: 0,
    visibility: 'PUBLIC',
    moderationStatus: 'PASSED',
    sourceUrl: 'https://cdn.example.test/media.jpg',
    fileName: 'stall.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 800_000,
    uploadedAt: '2026-08-21T12:00:00.000Z',
    createdAt: '2026-08-21T12:00:00.000Z',
    updatedAt: '2026-08-21T12:00:00.000Z',
    ...input,
  };
}
