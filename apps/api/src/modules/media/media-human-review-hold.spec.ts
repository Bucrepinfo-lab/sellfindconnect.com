import { describe, expect, it } from 'vitest';

import { InMemoryMediaReviewCaseRepository } from './in-memory-media-review-case.repository';
import {
  HUMAN_REVIEW_HOLD_REASON,
  HoldForHumanReviewMediaJobProcessor,
  HoldForHumanReviewModerationAdapter,
  MetadataOnlyMediaModerationAdapter,
  createConfiguredMediaAdapters,
  type MediaProcessingJob,
} from './media.adapters';
import {
  buildMediaAssetPublicationPatch,
  buildMediaReviewCaseDraft,
  type MediaAssetResultPublicationInput,
} from './media-result-publisher';
import { MediaReviewService } from './media-review.service';
import type { AuthService } from '../auth/auth.service';
import type { PlatformAccessSession } from '../auth/auth.records';

function reader(values: Record<string, string>) {
  return { get: (key: string) => values[key] };
}

const sampleMedia = {
  sourceUrl: 'https://cdn.sellfindconnect.test/a.jpg',
  fileName: 'a.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
} as never;

describe('media moderation fails safe without a provider', () => {
  it('holds uploads for a human in production when no moderation provider is set', async () => {
    const adapters = createConfiguredMediaAdapters(reader({ NODE_ENV: 'production' }));

    expect(adapters.moderation).toBeInstanceOf(HoldForHumanReviewModerationAdapter);
    expect(await adapters.moderation.review(sampleMedia)).toEqual({
      allowed: true,
      moderationStatus: 'PENDING',
      moderationReason: HUMAN_REVIEW_HOLD_REASON,
    });
    expect(adapters.processors?.CONTENT_MODERATION).toBeInstanceOf(HoldForHumanReviewMediaJobProcessor);
  });

  it('holds when explicitly asked, and keeps auto-pass only outside production', () => {
    expect(
      createConfiguredMediaAdapters(reader({ MEDIA_CONTENT_MODERATION_PROVIDER: 'human' })).moderation,
    ).toBeInstanceOf(HoldForHumanReviewModerationAdapter);
    expect(createConfiguredMediaAdapters(reader({ NODE_ENV: 'development' })).moderation).toBeInstanceOf(
      MetadataOnlyMediaModerationAdapter,
    );
    expect(createConfiguredMediaAdapters().moderation).toBeInstanceOf(MetadataOnlyMediaModerationAdapter);
  });

  it('uses the automated provider in production when one is configured', () => {
    const adapters = createConfiguredMediaAdapters(
      reader({
        NODE_ENV: 'production',
        MEDIA_CONTENT_MODERATION_PROVIDER: 'sightengine',
        SIGHTENGINE_API_USER: 'user',
        SIGHTENGINE_API_SECRET: 'secret',
      }),
    );

    expect(adapters.moderation).toBeInstanceOf(MetadataOnlyMediaModerationAdapter);
    expect(adapters.processors?.CONTENT_MODERATION).not.toBeInstanceOf(HoldForHumanReviewMediaJobProcessor);
  });

  it('keeps held media pending and opens a MEDIUM review case', async () => {
    const result = await new HoldForHumanReviewMediaJobProcessor().process(job());
    expect(result.ok).toBe(true);
    const input = publication(job({ result: result.ok ? result.result : undefined }));
    const patch = buildMediaAssetPublicationPatch(input);

    expect(patch).toMatchObject({ moderationStatus: 'PENDING', moderationReason: HUMAN_REVIEW_HOLD_REASON });
    expect(buildMediaReviewCaseDraft(input, patch)).toMatchObject({
      jobType: 'CONTENT_MODERATION',
      severity: 'MEDIUM',
      status: 'OPEN',
      reason: HUMAN_REVIEW_HOLD_REASON,
      provider: 'human-review-hold',
    });
  });

  it('publishes held media only when a moderator approves it', async () => {
    const published: MediaAssetResultPublicationInput[] = [];
    const publisher = {
      publish: (input: MediaAssetResultPublicationInput) => {
        published.push(input);
        return { mediaId: input.job.mediaId, published: true, patch: buildMediaAssetPublicationPatch(input) };
      },
    };
    const repository = new InMemoryMediaReviewCaseRepository();
    const now = '2026-11-07T09:00:00.000Z';
    for (const id of ['case-approve', 'case-block']) {
      repository.createCase({
        id,
        tenantId: 'tenant-ke',
        mediaId: `media-${id}`,
        ownerType: 'ADVERT',
        ownerId: 'advert-1',
        sourceJobId: `job-${id}`,
        jobType: 'CONTENT_MODERATION',
        severity: 'MEDIUM',
        status: 'OPEN',
        reason: HUMAN_REVIEW_HOLD_REASON,
        provider: 'human-review-hold',
        openedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    const auth = {
      listTenants: async () => [{ id: 'tenant-ke', countryCode: 'KE' }],
      canPlatformAccess: () => true,
      requirePlatformAccess: async () => ({ role: 'COUNTRY_MODERATOR' }),
      recordTenantAudit: async () => undefined,
    } as unknown as AuthService;
    const service = new MediaReviewService(repository, auth, publisher);
    const session = { sessionId: 's', sessionTenantId: 't', userId: 'mod-1', mfaVerified: true, assignments: [] } as unknown as PlatformAccessSession;

    await service.resolveCase('case-block', { resolution: 'CONFIRMED_BLOCK', notes: 'Not allowed.' }, session);
    expect(published).toHaveLength(0);

    await service.resolveCase('case-approve', { resolution: 'RESTORED', notes: 'Looks fine.' }, session);
    expect(published).toHaveLength(1);
    expect(published[0]?.job).toMatchObject({ mediaId: 'media-case-approve', type: 'CONTENT_MODERATION' });
    expect(buildMediaAssetPublicationPatch(published[0]!)).toMatchObject({ moderationStatus: 'PASSED' });
  });
});

function job(input: Partial<MediaProcessingJob> = {}): MediaProcessingJob {
  return {
    id: 'job-1',
    type: 'CONTENT_MODERATION',
    tenantId: 'tenant-1',
    mediaId: 'media-1',
    ownerType: 'ADVERT',
    ownerId: 'advert-1',
    sourceUrl: 'https://cdn.sellfindconnect.test/a.jpg',
    status: 'SUCCEEDED',
    attempts: 1,
    maxAttempts: 3,
    availableAt: '2026-11-07T09:00:00.000Z',
    requestedAt: '2026-11-07T09:00:00.000Z',
    ...input,
  };
}

function publication(jobInput: MediaProcessingJob): MediaAssetResultPublicationInput {
  return { job: jobInput, outcome: 'SUCCEEDED', occurredAt: '2026-11-07T09:01:00.000Z' };
}
