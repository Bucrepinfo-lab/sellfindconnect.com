import { describe, expect, it } from 'vitest';

import { detectMediaKind, evaluateMediaAssetInput, mediaPolicy } from './media';

describe('media policy', () => {
  it('detects supported image and video types', () => {
    expect(detectMediaKind('image/png')).toBe('IMAGE');
    expect(detectMediaKind('video/mp4')).toBe('VIDEO');
    expect(detectMediaKind('application/pdf')).toBeUndefined();
  });

  it('allows compliant image metadata', () => {
    const decision = evaluateMediaAssetInput({
      sourceUrl: 'https://cdn.example.test/profile.jpg',
      fileName: 'profile.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 800_000,
      width: 1200,
      height: 900,
      displayOrder: 0,
    });

    expect(decision).toMatchObject({ allowed: true, kind: 'IMAGE' });
  });

  it('blocks unsupported and oversized media metadata', () => {
    const decision = evaluateMediaAssetInput({
      sourceUrl: 'https://cdn.example.test/file.pdf',
      fileName: 'file.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: mediaPolicy.maxImageBytes + 1,
      displayOrder: mediaPolicy.maxItemsPerOwner,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain('UNSUPPORTED_MEDIA_TYPE');
    expect(decision.reasons).toContain('DISPLAY_ORDER_OUT_OF_RANGE');
  });

  it('requires short duration metadata for videos', () => {
    const missingDuration = evaluateMediaAssetInput({
      sourceUrl: 'https://cdn.example.test/clip.mp4',
      fileName: 'clip.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 5_000_000,
    });
    const longVideo = evaluateMediaAssetInput({
      sourceUrl: 'https://cdn.example.test/clip.mp4',
      fileName: 'clip.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: 5_000_000,
      durationSeconds: mediaPolicy.maxVideoDurationSeconds + 1,
    });

    expect(missingDuration.reasons).toContain('VIDEO_DURATION_REQUIRED');
    expect(longVideo.reasons).toContain('VIDEO_TOO_LONG');
  });
});
