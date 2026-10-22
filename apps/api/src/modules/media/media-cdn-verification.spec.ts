import { describe, expect, it, vi } from 'vitest';

import {
  CdnVerifiedMediaJobProcessorAdapter,
  HttpCdnPublicationVerifier,
  collectPublicationUrls,
  overlayCdnPublicationVerification,
  resolveAllowedCdnOrigins,
} from './media-cdn-verification';
import { createDevelopmentMediaJobProcessors, type MediaProcessingJob } from './media.adapters';

const job: MediaProcessingJob = {
  id: 'job-1',
  type: 'IMAGE_TRANSFORM',
  tenantId: 'tenant-1',
  mediaId: 'media-1',
  ownerType: 'ADVERT',
  ownerId: 'advert-1',
  objectKey: 'advert/tenant-1/advert-1/media.jpg',
  sourceUrl: 'https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com/advert/media.jpg',
  status: 'RUNNING',
  attempts: 1,
  maxAttempts: 3,
  availableAt: '2026-08-21T12:00:00.000Z',
  requestedAt: '2026-08-21T12:00:00.000Z',
};

function statusFetch(status: number) {
  return vi.fn(async () => ({ ok: status >= 200 && status < 300, status }));
}

describe('CDN publication verification', () => {
  it('collects public URLs and resolves allowed Spaces CDN origins', () => {
    expect(
      collectPublicationUrls(job, {
        cdnUrl: 'https://cdn.sellfindconnect.test/display.jpg',
        thumbnailUrl: 'https://cdn.sellfindconnect.test/thumb.jpg',
        variants: [{ label: 'display', url: 'https://cdn.sellfindconnect.test/display.jpg' }],
      }),
    ).toEqual([
      'https://cdn.sellfindconnect.test/display.jpg',
      'https://cdn.sellfindconnect.test/thumb.jpg',
    ]);
    expect(
      resolveAllowedCdnOrigins({
        get: (key: string) =>
          ({
            SPACES_CDN_ENDPOINT: 'https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com',
            SPACES_ENDPOINT: 'https://sellfindconnect-media.fra1.digitaloceanspaces.com',
          })[key],
      }),
    ).toEqual([
      'https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com',
      'https://sellfindconnect-media.fra1.digitaloceanspaces.com',
    ]);
  });

  it('accepts a reachable CDN object and fail-closes on 404', async () => {
    const okFetch = statusFetch(206);
    const verifier = new HttpCdnPublicationVerifier(
      ['https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com'],
      okFetch,
    );
    await expect(verifier.verifyUrls([job.sourceUrl])).resolves.toEqual({
      ok: true,
      retryable: false,
      verifiedCount: 1,
    });
    expect(okFetch).toHaveBeenCalledWith(
      job.sourceUrl,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Range: 'bytes=0-0' }),
      }),
    );

    const missing = new HttpCdnPublicationVerifier(
      ['https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com'],
      statusFetch(404),
    );
    await expect(missing.verifyUrls([job.sourceUrl])).resolves.toMatchObject({
      ok: false,
      retryable: false,
      reason: expect.stringContaining('HTTP 404'),
    });
  });

  it('marks 5xx CDN failures retryable', async () => {
    const inner = {
      async process() {
        return {
          ok: true as const,
          result: { cdnUrl: job.sourceUrl },
        };
      },
    };
    const processor = new CdnVerifiedMediaJobProcessorAdapter(
      inner,
      new HttpCdnPublicationVerifier(
        ['https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com'],
        statusFetch(503),
      ),
    );

    await expect(processor.process(job)).resolves.toMatchObject({
      ok: false,
      retryable: true,
      result: { transformStatus: 'FAILED', cdnVerified: false },
    });
  });

  it('rejects hosts outside the allowlist and http URLs', async () => {
    const verifier = new HttpCdnPublicationVerifier(
      ['https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com'],
      statusFetch(200),
    );
    await expect(
      verifier.verifyUrls(['https://evil.example/media.jpg']),
    ).resolves.toMatchObject({ ok: false, retryable: false });
    await expect(verifier.verifyUrls(['http://cdn.sellfindconnect.test/media.jpg'])).resolves.toMatchObject({
      ok: false,
      retryable: false,
    });
  });

  it('overlays transform processors from CDN origins and fail-closes without them', async () => {
    const fetcher = statusFetch(206);
    const processors = overlayCdnPublicationVerification(createDevelopmentMediaJobProcessors(), {
      get: (key: string) =>
        ({
          SPACES_CDN_ENDPOINT: 'https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com',
        })[key],
    }, fetcher);

    expect(processors.IMAGE_TRANSFORM).toBeInstanceOf(CdnVerifiedMediaJobProcessorAdapter);
    expect(processors.VIDEO_TRANSCODE).toBeInstanceOf(CdnVerifiedMediaJobProcessorAdapter);
    expect(processors.MALWARE_SCAN).not.toBeInstanceOf(CdnVerifiedMediaJobProcessorAdapter);
    await expect(processors.IMAGE_TRANSFORM?.process(job)).resolves.toMatchObject({
      ok: true,
      result: { cdnVerified: true, cdnVerificationProvider: 'http' },
    });
    expect(JSON.stringify(await processors.IMAGE_TRANSFORM?.process(job))).not.toContain('secret');

    expect(() =>
      overlayCdnPublicationVerification(createDevelopmentMediaJobProcessors(), {
        get: (key: string) => ({ MEDIA_CDN_VERIFICATION_PROVIDER: 'live' })[key],
      }),
    ).toThrow('SPACES_CDN_ENDPOINT or MEDIA_S3_PUBLIC_BASE_URL is required when MEDIA_CDN_VERIFICATION_PROVIDER=live.');
    expect(
      overlayCdnPublicationVerification(createDevelopmentMediaJobProcessors(), {
        get: (key: string) =>
          ({
            MEDIA_CDN_VERIFICATION_PROVIDER: 'development',
            SPACES_CDN_ENDPOINT: 'https://sellfindconnect-media.fra1.cdn.digitaloceanspaces.com',
          })[key],
      }).IMAGE_TRANSFORM,
    ).not.toBeInstanceOf(CdnVerifiedMediaJobProcessorAdapter);
  });
});
