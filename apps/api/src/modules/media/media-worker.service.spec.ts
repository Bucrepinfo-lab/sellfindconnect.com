import { describe, expect, it } from 'vitest';

import {
  InMemoryMediaProcessingQueueAdapter,
  type MediaAdapters,
} from './media.adapters';
import {
  buildMediaAssetPublicationPatch,
  type MediaAssetResultPublicationInput,
  type MediaAssetResultPublisherAdapter,
} from './media-result-publisher';
import { MediaWorkerService } from './media-worker.service';
import type { MediaAsset } from '@telpen/domain';

describe('MediaWorkerService', () => {
  it('claims queued jobs, completes successful work, and retries transient failures', async () => {
    const queue = new InMemoryMediaProcessingQueueAdapter();
    const media = mediaAsset({ kind: 'IMAGE' });
    const jobs = queue.enqueueScanJobs(media);
    const runAt = new Date(Date.parse(jobs[0]!.availableAt) + 1000).toISOString();
    const retryAt = new Date(Date.parse(runAt) + 120_000).toISOString();
    const publisher = collectingPublisher();
    const service = new MediaWorkerService(
      mediaAdapters(queue, {
        MALWARE_SCAN: {
          process: () => ({ ok: true, result: { verdict: 'clean', provider: 'unit-test' } }),
        },
        CONTENT_MODERATION: {
          process: () => ({
            ok: false,
            retryable: true,
            reason: 'moderation provider timeout',
          }),
        },
      }),
      publisher,
    );

    const result = await service.runOnce({
      workerId: 'media-worker-1',
      limit: 10,
      retryAfterSeconds: 120,
      now: runAt,
    });
    const storedJobs = queue.listQueuedJobs();

    expect(result).toMatchObject({
      workerId: 'media-worker-1',
      claimed: 2,
      succeeded: 1,
      retried: 1,
      failed: 0,
      skipped: 0,
      published: 1,
    });
    expect(result.results.map((job) => job.status).sort()).toEqual([
      'RETRY_QUEUED',
      'SUCCEEDED',
    ]);
    expect(storedJobs.find((job) => job.type === 'MALWARE_SCAN')).toMatchObject({
      status: 'SUCCEEDED',
      result: { verdict: 'clean', provider: 'unit-test' },
    });
    expect(storedJobs.find((job) => job.type === 'CONTENT_MODERATION')).toMatchObject({
      status: 'QUEUED',
      availableAt: retryAt,
      lastError: 'moderation provider timeout',
    });
    expect(publisher.publications).toHaveLength(1);
    expect(publisher.publications[0]?.job.type).toBe('MALWARE_SCAN');
    expect(result.results.find((job) => job.type === 'MALWARE_SCAN')?.publication).toMatchObject({
      published: true,
      patch: { moderationReason: 'MALWARE_SCAN_PASSED' },
    });
  });

  it('marks non-retryable processor failures as final failures', async () => {
    const queue = new InMemoryMediaProcessingQueueAdapter();
    const media = mediaAsset({ kind: 'IMAGE' });
    const jobs = queue.enqueueTransformJobs(media);
    const runAt = new Date(Date.parse(jobs[0]!.availableAt) + 1000).toISOString();
    const publisher = collectingPublisher();
    const service = new MediaWorkerService(
      mediaAdapters(queue, {
        IMAGE_TRANSFORM: {
          process: () => ({
            ok: false,
            retryable: false,
            reason: 'unsafe image transform output',
          }),
        },
      }),
      publisher,
    );

    const result = await service.runOnce({
      workerId: 'media-worker-1',
      limit: 1,
      now: runAt,
    });

    expect(result).toMatchObject({
      claimed: 1,
      succeeded: 0,
      retried: 0,
      failed: 1,
      skipped: 0,
      published: 1,
    });
    expect(queue.listQueuedJobs()[0]).toMatchObject({
      status: 'FAILED',
      failedAt: runAt,
      lastError: 'unsafe image transform output',
    });
    expect(publisher.publications).toHaveLength(1);
    expect(result.results[0]?.publication).toMatchObject({
      published: true,
      patch: { transformStatus: 'FAILED' },
    });
  });
});

function collectingPublisher(): MediaAssetResultPublisherAdapter & {
  publications: MediaAssetResultPublicationInput[];
} {
  const publications: MediaAssetResultPublicationInput[] = [];
  return {
    publications,
    publish: (input: MediaAssetResultPublicationInput) => {
      publications.push(input);
      return {
        mediaId: input.job.mediaId,
        published: true,
        patch: buildMediaAssetPublicationPatch(input),
      };
    },
  };
}

function mediaAdapters(
  jobs: InMemoryMediaProcessingQueueAdapter,
  processors: NonNullable<MediaAdapters['processors']>,
): MediaAdapters {
  return {
    storage: {
      prepareUpload: () => {
        throw new Error('storage adapter should not be used');
      },
    },
    moderation: {
      review: () => ({ allowed: true, moderationStatus: 'PASSED' }),
    },
    transforms: {
      plan: () => ({ transformStatus: 'READY' }),
    },
    jobs,
    processors,
  };
}

function mediaAsset(input: Pick<MediaAsset, 'kind'>): MediaAsset {
  const now = '2026-06-19T12:00:00.000Z';
  return {
    id: 'media-1',
    tenantId: 'tenant-1',
    ownerType: 'ADVERT',
    ownerId: 'advert-1',
    kind: input.kind,
    status: 'LIVE',
    sourceUrl: 'https://cdn.example.test/adverts/media.jpg',
    mimeType: input.kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
    fileName: input.kind === 'VIDEO' ? 'media.mp4' : 'media.jpg',
    fileSizeBytes: 800_000,
    displayOrder: 0,
    visibility: 'PUBLIC',
    moderationStatus: 'PASSED',
    objectKey: 'advert/tenant-1/advert-1/media.jpg',
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
