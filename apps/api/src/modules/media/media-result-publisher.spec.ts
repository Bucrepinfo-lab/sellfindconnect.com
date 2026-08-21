import { describe, expect, it } from 'vitest';

import {
  NoopMediaAssetResultPublisherAdapter,
  buildMediaAssetPublicationPatch,
  buildMediaReviewCaseDraft,
  createConfiguredMediaAssetResultPublisherAsync,
  type MediaAssetResultPublicationInput,
} from './media-result-publisher';
import type { MediaProcessingJob } from './media.adapters';

describe('media result publisher', () => {
  it('builds a critical review case for blocked malware scan results', () => {
    const input = publicationInput({
      type: 'MALWARE_SCAN',
      result: {
        verdict: 'malware',
        reason: 'MALWARE_DETECTED',
        provider: 'unit-test-scanner',
      },
    });
    const patch = buildMediaAssetPublicationPatch(input);
    const reviewCase = buildMediaReviewCaseDraft(input, patch);

    expect(patch).toMatchObject({
      status: 'BLOCKED',
      moderationStatus: 'BLOCKED',
      moderationReason: 'MALWARE_DETECTED',
    });
    expect(reviewCase).toMatchObject({
      tenantId: 'tenant-1',
      mediaId: 'media-1',
      sourceJobId: 'job-1',
      jobType: 'MALWARE_SCAN',
      severity: 'CRITICAL',
      status: 'OPEN',
      reason: 'MALWARE_DETECTED',
      provider: 'unit-test-scanner',
    });
    expect(reviewCase?.evidence).toMatchObject({
      outcome: 'SUCCEEDED',
      jobId: 'job-1',
      jobType: 'MALWARE_SCAN',
      objectKey: 'advert/tenant-1/advert-1/media.jpg',
    });
  });

  it('builds a high-severity review case for final content moderation failures', () => {
    const input = publicationInput({
      type: 'CONTENT_MODERATION',
      outcome: 'FAILED',
      lastError: 'moderation provider rejected the upload',
      reason: 'moderation provider rejected the upload',
    });
    const patch = buildMediaAssetPublicationPatch(input);
    const reviewCase = buildMediaReviewCaseDraft(input, patch);

    expect(patch).toMatchObject({
      status: 'BLOCKED',
      moderationStatus: 'BLOCKED',
      moderationReason: 'moderation provider rejected the upload',
    });
    expect(reviewCase).toMatchObject({
      jobType: 'CONTENT_MODERATION',
      severity: 'HIGH',
      reason: 'moderation provider rejected the upload',
    });
  });

  it('does not open a review case for passing moderation results', () => {
    const input = publicationInput({
      type: 'CONTENT_MODERATION',
      result: {
        verdict: 'passed',
        provider: 'unit-test-moderator',
      },
    });
    const patch = buildMediaAssetPublicationPatch(input);

    expect(patch).toMatchObject({
      moderationStatus: 'PASSED',
      moderationReason: null,
    });
    expect(buildMediaReviewCaseDraft(input, patch)).toBeUndefined();
  });

  it('keeps in-memory publication unless Prisma is selected with DATABASE_URL', async () => {
    await expect(
      createConfiguredMediaAssetResultPublisherAsync({
        get: () => undefined,
      }),
    ).resolves.toBeInstanceOf(NoopMediaAssetResultPublisherAdapter);
    await expect(
      createConfiguredMediaAssetResultPublisherAsync({
        get: (key: string) =>
          ({
            MEDIA_ASSET_RESULT_PUBLISHER_DRIVER: 'prisma',
          })[key],
      }),
    ).rejects.toThrow('DATABASE_URL is required when MEDIA_ASSET_RESULT_PUBLISHER_DRIVER=prisma.');
    await expect(
      createConfiguredMediaAssetResultPublisherAsync({
        get: (key: string) =>
          ({
            PERSISTENCE_DRIVER: 'prisma',
          })[key],
      }),
    ).rejects.toThrow('DATABASE_URL is required when PERSISTENCE_DRIVER=prisma.');
  });
});

function publicationInput(
  input: Partial<MediaProcessingJob> & {
    outcome?: MediaAssetResultPublicationInput['outcome'];
    reason?: string;
  },
): MediaAssetResultPublicationInput {
  return {
    outcome: input.outcome ?? 'SUCCEEDED',
    occurredAt: '2026-06-20T09:00:00.000Z',
    reason: input.reason,
    job: {
      id: input.id ?? 'job-1',
      type: input.type ?? 'MALWARE_SCAN',
      tenantId: input.tenantId ?? 'tenant-1',
      mediaId: input.mediaId ?? 'media-1',
      ownerType: input.ownerType ?? 'ADVERT',
      ownerId: input.ownerId ?? 'advert-1',
      objectKey: input.objectKey ?? 'advert/tenant-1/advert-1/media.jpg',
      sourceUrl: input.sourceUrl ?? 'https://cdn.example.test/media.jpg',
      status: input.status ?? 'SUCCEEDED',
      attempts: input.attempts ?? 1,
      maxAttempts: input.maxAttempts ?? 3,
      availableAt: input.availableAt ?? '2026-06-20T08:59:00.000Z',
      requestedAt: input.requestedAt ?? '2026-06-20T08:58:00.000Z',
      lastError: input.lastError,
      result: input.result,
    },
  };
}
