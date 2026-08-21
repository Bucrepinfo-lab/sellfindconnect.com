import { describe, expect, it, vi } from 'vitest';

import {
  ClamAvMediaJobProcessorAdapter,
  SightengineMediaJobProcessorAdapter,
  overlayApprovedMediaJobProcessors,
} from './media-scanners';
import { createDevelopmentMediaJobProcessors, type MediaProcessingJob } from './media.adapters';

const job: MediaProcessingJob = {
  id: 'job-1',
  type: 'MALWARE_SCAN',
  tenantId: 'tenant-1',
  mediaId: 'media-1',
  ownerType: 'ADVERT',
  ownerId: 'advert-1',
  objectKey: 'advert/tenant-1/advert-1/media.jpg',
  sourceUrl: 'https://cdn.sellfindconnect.test/media.jpg',
  status: 'RUNNING',
  attempts: 1,
  maxAttempts: 3,
  availableAt: '2026-08-21T12:00:00.000Z',
  requestedAt: '2026-08-21T12:00:00.000Z',
};

function jsonFetch(status: number, body: unknown) {
  return vi.fn(async (_input: string | URL, _init?: { method?: string; headers?: Record<string, string>; body?: string }) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }));
}

describe('approved media scanners', () => {
  it('marks ClamAV infected media as a final failure', async () => {
    const fetcher = jsonFetch(200, { Status: 'FOUND', reason: 'Win.Test.EICAR' });
    const adapter = new ClamAvMediaJobProcessorAdapter(
      'https://clamav.sellfindconnect.test/scan',
      'scan-key',
      fetcher,
    );

    await expect(adapter.process(job)).resolves.toMatchObject({
      ok: false,
      retryable: false,
      result: { provider: 'clamav', verdict: 'infected' },
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://clamav.sellfindconnect.test/scan',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer scan-key' }),
      }),
    );
  });

  it('blocks Sightengine matches above the prohibited-visual threshold', async () => {
    const fetcher = jsonFetch(200, {
      status: 'success',
      nudity: { sexual_activity: 0.91, sexual_display: 0.02 },
      weapon: 0.01,
      drugs: 0.01,
      offensive: { prob: 0.02 },
      gore: { prob: 0.01 },
    });
    const adapter = new SightengineMediaJobProcessorAdapter(
      'user-1',
      'secret-1',
      'nudity-2.0,wad',
      0.5,
      fetcher,
    );

    const result = await adapter.process({ ...job, type: 'CONTENT_MODERATION' });
    expect(result).toMatchObject({
      ok: false,
      retryable: false,
      result: { provider: 'sightengine', verdict: 'blocked' },
    });
    expect(JSON.stringify(result)).not.toContain('secret-1');
    const calledUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('api.sightengine.com/1.0/check.json');
    expect(fetcher.mock.calls[0]?.[1]).toBeUndefined();
  });

  it('overlays approved scanners from env and fail-closes without credentials', () => {
    const processors = overlayApprovedMediaJobProcessors(createDevelopmentMediaJobProcessors(), {
      get: (key: string) =>
        ({
          CLAMAV_SCAN_URL: 'https://clamav.sellfindconnect.test/scan',
          SIGHTENGINE_API_USER: 'user-1',
          SIGHTENGINE_API_SECRET: 'secret-1',
        })[key],
    });

    expect(processors.MALWARE_SCAN).toBeInstanceOf(ClamAvMediaJobProcessorAdapter);
    expect(processors.CONTENT_MODERATION).toBeInstanceOf(SightengineMediaJobProcessorAdapter);
    expect(() =>
      overlayApprovedMediaJobProcessors(createDevelopmentMediaJobProcessors(), {
        get: (key: string) => ({ MEDIA_MALWARE_SCAN_PROVIDER: 'clamav' })[key],
      }),
    ).toThrow('CLAMAV_SCAN_URL is required when MEDIA_MALWARE_SCAN_PROVIDER=clamav.');
    expect(() =>
      overlayApprovedMediaJobProcessors(createDevelopmentMediaJobProcessors(), {
        get: (key: string) => ({ MEDIA_CONTENT_MODERATION_PROVIDER: 'sightengine' })[key],
      }),
    ).toThrow('SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET are required');
  });
});
