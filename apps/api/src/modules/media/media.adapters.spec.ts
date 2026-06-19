import { describe, expect, it } from 'vitest';

import {
  InMemoryMediaProcessingQueueAdapter,
  S3CompatibleMediaStorageAdapter,
  createConfiguredMediaAdapters,
  createConfiguredMediaAdaptersAsync,
  enqueueMediaProcessingJobs,
  type MediaAdapters,
} from './media.adapters';
import type { MediaAsset } from '@telpen/domain';

describe('media adapters', () => {
  it('creates S3-compatible presigned upload URLs', () => {
    const adapter = new S3CompatibleMediaStorageAdapter({
      endpoint: 'https://sfo3.digitaloceanspaces.com',
      region: 'sfo3',
      bucket: 'sellfindconnect-media',
      accessKeyId: 'TESTACCESSKEY',
      secretAccessKey: 'test-secret',
      publicBaseUrl: 'https://cdn.sellfindconnect.test',
      now: () => new Date('2026-06-19T12:00:00.000Z'),
      idFactory: () => 'media-id-1',
    });

    const upload = adapter.prepareUpload({
      tenantId: 'tenant-1',
      ownerType: 'ADVERT',
      ownerId: 'advert-1',
      fileName: 'Fresh Stall.JPG',
      mimeType: 'IMAGE/JPEG',
      fileSizeBytes: 800_000,
    });
    const uploadUrl = new URL(upload.uploadUrl);

    expect(upload).toMatchObject({
      provider: 's3-compatible',
      objectKey: 'advert/tenant-1/advert-1/media-id-1-fresh-stall.jpg',
      publicUrl:
        'https://cdn.sellfindconnect.test/advert/tenant-1/advert-1/media-id-1-fresh-stall.jpg',
      requiredHeaders: {
        'content-type': 'image/jpeg',
      },
      expiresAt: '2026-06-19T12:15:00.000Z',
    });
    expect(uploadUrl.hostname).toBe('sellfindconnect-media.sfo3.digitaloceanspaces.com');
    expect(uploadUrl.pathname).toBe('/advert/tenant-1/advert-1/media-id-1-fresh-stall.jpg');
    expect(uploadUrl.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(uploadUrl.searchParams.get('X-Amz-Credential')).toBe(
      'TESTACCESSKEY/20260619/sfo3/s3/aws4_request',
    );
    expect(uploadUrl.searchParams.get('X-Amz-Date')).toBe('20260619T120000Z');
    expect(uploadUrl.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(uploadUrl.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(uploadUrl.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('selects S3-compatible storage only when explicitly configured', () => {
    const configured = createConfiguredMediaAdapters({
      get: (key: string) =>
        ({
          MEDIA_STORAGE_DRIVER: 's3',
          MEDIA_S3_ENDPOINT: 'https://storage.example.test',
          MEDIA_S3_REGION: 'auto',
          MEDIA_S3_BUCKET: 'media',
          MEDIA_S3_ACCESS_KEY_ID: 'access-key',
          MEDIA_S3_SECRET_ACCESS_KEY: 'secret-key',
          MEDIA_S3_FORCE_PATH_STYLE: 'true',
        })[key],
    });
    const development = createConfiguredMediaAdapters();

    expect(configured.storage).toBeInstanceOf(S3CompatibleMediaStorageAdapter);
    expect(development.storage).not.toBeInstanceOf(S3CompatibleMediaStorageAdapter);
  });

  it('requires a database URL when durable Prisma queueing is enabled', async () => {
    await expect(
      createConfiguredMediaAdaptersAsync({
        get: (key: string) =>
          ({
            MEDIA_JOB_QUEUE_DRIVER: 'prisma',
          })[key],
      }),
    ).rejects.toThrow('DATABASE_URL is required when MEDIA_JOB_QUEUE_DRIVER=prisma.');
  });

  it('queues scan and transform jobs through the media processing interface', async () => {
    const queue = new InMemoryMediaProcessingQueueAdapter();
    const media = mediaAsset({ kind: 'IMAGE' });
    const adapters: MediaAdapters = {
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
      jobs: queue,
    };

    const jobs = await enqueueMediaProcessingJobs(adapters, media);

    expect(jobs.map((job) => job.type)).toEqual([
      'MALWARE_SCAN',
      'CONTENT_MODERATION',
      'IMAGE_TRANSFORM',
    ]);
    expect(queue.listQueuedJobs()).toHaveLength(3);
    expect(jobs.every((job) => job.mediaId === media.id && job.status === 'QUEUED')).toBe(true);
  });

  it('claims, completes, and retries processing jobs for worker execution', async () => {
    const queue = new InMemoryMediaProcessingQueueAdapter();
    const media = mediaAsset({ kind: 'IMAGE' });
    const jobs = [...queue.enqueueScanJobs(media), ...queue.enqueueTransformJobs(media)];
    const claimAt = new Date(Date.parse(jobs[0]!.availableAt) + 1000).toISOString();

    const claimed = queue.claimQueuedJobs({
      workerId: 'media-worker-1',
      limit: 2,
      now: claimAt,
    });

    expect(claimed).toHaveLength(2);
    expect(claimed.every((job) => job.status === 'RUNNING')).toBe(true);
    expect(claimed.every((job) => job.lockedBy === 'media-worker-1')).toBe(true);
    expect(claimed.map((job) => job.attempts)).toEqual([1, 1]);

    const completed = queue.completeJob({
      jobId: claimed[0]!.id,
      workerId: 'media-worker-1',
      completedAt: '2026-06-19T12:05:00.000Z',
      result: { thumbnailGenerated: true },
    });
    const retried = queue.failJob({
      jobId: claimed[1]!.id,
      workerId: 'media-worker-1',
      reason: 'scanner timeout',
      failedAt: '2026-06-19T12:05:00.000Z',
      retryable: true,
      retryAfterSeconds: 60,
    });

    expect(completed).toMatchObject({
      status: 'SUCCEEDED',
      completedAt: '2026-06-19T12:05:00.000Z',
      result: { thumbnailGenerated: true },
    });
    expect(completed?.lockedBy).toBeUndefined();
    expect(retried).toMatchObject({
      status: 'QUEUED',
      availableAt: '2026-06-19T12:06:00.000Z',
      lastError: 'scanner timeout',
    });
    expect(retried?.lockedBy).toBeUndefined();
    expect(retried?.failedAt).toBeUndefined();

    const earlyClaim = queue.claimQueuedJobs({
      workerId: 'media-worker-2',
      limit: 10,
      now: '2026-06-19T12:05:30.000Z',
    });
    const retryClaim = queue.claimQueuedJobs({
      workerId: 'media-worker-3',
      limit: 10,
      now: '2026-06-19T12:06:00.000Z',
    });

    expect(earlyClaim.some((job) => job.id === retried?.id)).toBe(false);
    expect(retryClaim.some((job) => job.id === retried?.id)).toBe(true);
  });
});

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
