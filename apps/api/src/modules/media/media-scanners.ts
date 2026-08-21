import type {
  MediaJobProcessorAdapter,
  MediaJobProcessorMap,
  MediaJobProcessorResult,
  MediaProcessingJob,
  MediaProcessingJobType,
} from './media.adapters';

type ConfigReader = {
  get(key: string): string | undefined;
};

type FetchLike = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

function optionalConfig(config: ConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

function firstConfig(config: ConfigReader | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = optionalConfig(config, key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function numberAt(record: Record<string, unknown>, path: string[]): number {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) {
      return 0;
    }
    current = current[key];
  }
  return typeof current === 'number' ? current : 0;
}

export class ClamAvMediaJobProcessorAdapter implements MediaJobProcessorAdapter {
  readonly name = 'clamav';

  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async process(input: MediaProcessingJob): Promise<MediaJobProcessorResult> {
    try {
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          jobId: input.id,
          type: input.type,
          sourceUrl: input.sourceUrl,
          objectKey: input.objectKey,
        }),
      });
      const body = parseJson(await response.text());
      const infected =
        body.infected === true ||
        body.malware === true ||
        String(body.Status ?? body.status ?? '').toUpperCase() === 'FOUND';

      if (!response.ok || body.ok === false || infected) {
        return {
          ok: false,
          retryable: false,
          reason:
            (typeof body.reason === 'string' && body.reason) ||
            (typeof body.message === 'string' && body.message) ||
            'ClamAV blocked the media as infected or unscannable.',
          result: {
            provider: this.name,
            verdict: 'infected',
          },
        };
      }

      return {
        ok: true,
        result: {
          provider: this.name,
          verdict: 'clean',
        },
      };
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        reason: error instanceof Error ? `ClamAV failed: ${error.message}` : 'ClamAV failed.',
      };
    }
  }
}

export class SightengineMediaJobProcessorAdapter implements MediaJobProcessorAdapter {
  readonly name = 'sightengine';

  constructor(
    private readonly apiUser: string,
    private readonly apiSecret: string,
    private readonly models = 'nudity-2.0,wad,offensive,gore-2.0',
    private readonly threshold = 0.5,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async process(input: MediaProcessingJob): Promise<MediaJobProcessorResult> {
    try {
      const url = new URL('https://api.sightengine.com/1.0/check.json');
      url.searchParams.set('url', input.sourceUrl);
      url.searchParams.set('models', this.models);
      url.searchParams.set('api_user', this.apiUser);
      url.searchParams.set('api_secret', this.apiSecret);

      const response = await this.fetcher(url);
      const body = parseJson(await response.text());
      if (!response.ok || body.status === 'failure') {
        return {
          ok: false,
          retryable: response.status >= 500,
          reason:
            (isRecord(body.error) && typeof body.error.message === 'string' && body.error.message) ||
            'Sightengine moderation request failed.',
          result: { provider: this.name, verdict: 'failed' },
        };
      }

      const scores = {
        sexualActivity: numberAt(body, ['nudity', 'sexual_activity']),
        sexualDisplay: numberAt(body, ['nudity', 'sexual_display']),
        weapon: Math.max(numberAt(body, ['weapon']), numberAt(body, ['weapon', 'prob'])),
        drugs: Math.max(numberAt(body, ['drugs']), numberAt(body, ['drugs', 'prob'])),
        offensive: numberAt(body, ['offensive', 'prob']),
        gore: numberAt(body, ['gore', 'prob']),
      };
      const blocked = Object.values(scores).some((score) => score >= this.threshold);
      if (blocked) {
        return {
          ok: false,
          retryable: false,
          reason: 'Sightengine blocked the media for a prohibited visual category.',
          result: {
            provider: this.name,
            verdict: 'blocked',
            ...scores,
          },
        };
      }

      return {
        ok: true,
        result: {
          provider: this.name,
          verdict: 'passed',
        },
      };
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        reason:
          error instanceof Error ? `Sightengine failed: ${error.message}` : 'Sightengine failed.',
      };
    }
  }
}

export function overlayApprovedMediaJobProcessors(
  processors: MediaJobProcessorMap,
  config?: ConfigReader,
  fetcher: FetchLike = fetch,
): MediaJobProcessorMap {
  const next: MediaJobProcessorMap = { ...processors };
  const malwareProvider = optionalConfig(config, 'MEDIA_MALWARE_SCAN_PROVIDER')?.toLowerCase();
  const moderationProvider = optionalConfig(config, 'MEDIA_CONTENT_MODERATION_PROVIDER')?.toLowerCase();
  const clamAvUrl =
    firstConfig(config, ['CLAMAV_SCAN_URL']) ??
    (malwareProvider === 'clamav' ? firstConfig(config, ['MEDIA_MALWARE_SCAN_ENDPOINT']) : undefined);
  const sightengineUser = optionalConfig(config, 'SIGHTENGINE_API_USER');
  const sightengineSecret = optionalConfig(config, 'SIGHTENGINE_API_SECRET');

  if (malwareProvider === 'clamav' && !clamAvUrl) {
    throw new Error('CLAMAV_SCAN_URL is required when MEDIA_MALWARE_SCAN_PROVIDER=clamav.');
  }
  if (moderationProvider === 'sightengine' && (!sightengineUser || !sightengineSecret)) {
    throw new Error(
      'SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET are required when MEDIA_CONTENT_MODERATION_PROVIDER=sightengine.',
    );
  }

  if (malwareProvider === 'clamav' || (clamAvUrl && malwareProvider !== 'http')) {
    if (clamAvUrl) {
      next.MALWARE_SCAN = new ClamAvMediaJobProcessorAdapter(
        clamAvUrl,
        firstConfig(config, ['MEDIA_MALWARE_SCAN_API_KEY', 'MEDIA_PROCESSOR_API_KEY']),
        fetcher,
      );
    }
  }

  if (moderationProvider === 'sightengine' || (sightengineUser && sightengineSecret && moderationProvider !== 'http')) {
    if (sightengineUser && sightengineSecret) {
      next.CONTENT_MODERATION = new SightengineMediaJobProcessorAdapter(
        sightengineUser,
        sightengineSecret,
        optionalConfig(config, 'SIGHTENGINE_MODELS') ?? 'nudity-2.0,wad,offensive,gore-2.0',
        Number.parseFloat(optionalConfig(config, 'MEDIA_CONTENT_MODERATION_THRESHOLD') ?? '') || 0.5,
        fetcher,
      );
    }
  }

  return next;
}

export function approvedProcessorName(
  processors: MediaJobProcessorMap,
  type: MediaProcessingJobType,
): string | undefined {
  const processor = processors[type] as { name?: string } | undefined;
  return processor?.name;
}
