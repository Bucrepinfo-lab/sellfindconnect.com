import { describe, expect, it } from 'vitest';

import {
  InMemoryMediaProcessingQueueAdapter,
  S3CompatibleMediaStorageAdapter,
  createConfiguredMediaAdapters,
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
