import type {
  MediaJobProcessorAdapter,
  MediaJobProcessorMap,
  MediaJobProcessorResult,
  MediaProcessingJob,
  MediaProcessingJobMetadata,
} from './media.adapters';

type ConfigReader = {
  get(key: string): string | undefined;
};

type FetchLike = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
}>;

const TRANSFORM_JOB_TYPES = new Set(['IMAGE_TRANSFORM', 'VIDEO_TRANSCODE']);
const MAX_URLS = 8;
const VERIFY_TIMEOUT_MS = 5_000;
const ACCEPTED_STATUSES = new Set([200, 204, 206]);

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

function httpsOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveAllowedCdnOrigins(config?: ConfigReader): string[] {
  const origins = new Set<string>();
  const configured = [
    firstConfig(config, ['SPACES_CDN_ENDPOINT', 'MEDIA_S3_PUBLIC_BASE_URL']),
    firstConfig(config, ['SPACES_ENDPOINT', 'MEDIA_S3_ENDPOINT']),
    ...(optionalConfig(config, 'MEDIA_CDN_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  ];
  for (const value of configured) {
    if (!value) {
      continue;
    }
    const origin = httpsOrigin(value);
    if (origin) {
      origins.add(origin);
    }
  }
  return [...origins];
}

export function collectPublicationUrls(
  job: Pick<MediaProcessingJob, 'sourceUrl'>,
  result: MediaProcessingJobMetadata = {},
): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || urls.includes(trimmed) || urls.length >= MAX_URLS) {
      return;
    }
    urls.push(trimmed);
  };

  add(result.cdnUrl);
  add(result.thumbnailUrl);
  if (Array.isArray(result.variants)) {
    for (const variant of result.variants) {
      if (variant && typeof variant === 'object' && !Array.isArray(variant)) {
        add(variant.url);
      }
    }
  }
  if (urls.length === 0) {
    add(job.sourceUrl);
  }
  return urls;
}

export type CdnPublicationCheck = {
  ok: boolean;
  retryable: boolean;
  reason?: string;
  verifiedCount: number;
};

export interface CdnPublicationVerifier {
  readonly name: string;
  verifyUrls(urls: string[]): Promise<CdnPublicationCheck>;
}

export class HttpCdnPublicationVerifier implements CdnPublicationVerifier {
  readonly name = 'http';

  constructor(
    private readonly allowedOrigins: string[],
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = VERIFY_TIMEOUT_MS,
  ) {}

  async verifyUrls(urls: string[]): Promise<CdnPublicationCheck> {
    if (urls.length === 0) {
      return {
        ok: false,
        retryable: false,
        reason: 'CDN publication verification requires at least one public URL.',
        verifiedCount: 0,
      };
    }

    let verifiedCount = 0;
    for (const url of urls) {
      const origin = httpsOrigin(url);
      if (!origin) {
        return {
          ok: false,
          retryable: false,
          reason: 'CDN publication URLs must use https.',
          verifiedCount,
        };
      }
      if (!this.allowedOrigins.includes(origin)) {
        return {
          ok: false,
          retryable: false,
          reason: 'CDN publication URL is outside the allowed public origins.',
          verifiedCount,
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(url, {
          method: 'GET',
          headers: {
            Range: 'bytes=0-0',
            Accept: '*/*',
            'User-Agent': 'SellFindConnect-Media/1.0 (+https://sellfindconnect.com)',
          },
          signal: controller.signal,
        });
        if (!ACCEPTED_STATUSES.has(response.status)) {
          return {
            ok: false,
            retryable: response.status >= 500 || response.status === 408 || response.status === 429,
            reason: `CDN publication was not reachable (HTTP ${response.status}).`,
            verifiedCount,
          };
        }
        verifiedCount += 1;
      } catch (error) {
        return {
          ok: false,
          retryable: true,
          reason:
            error instanceof Error
              ? `CDN publication verification failed: ${error.message}`
              : 'CDN publication verification failed.',
          verifiedCount,
        };
      } finally {
        clearTimeout(timer);
      }
    }

    return { ok: true, retryable: false, verifiedCount };
  }
}

export class CdnVerifiedMediaJobProcessorAdapter implements MediaJobProcessorAdapter {
  readonly name = 'cdn-verification';

  constructor(
    private readonly inner: MediaJobProcessorAdapter,
    private readonly verifier: CdnPublicationVerifier,
  ) {}

  async process(input: MediaProcessingJob): Promise<MediaJobProcessorResult> {
    const decision = await this.inner.process(input);
    if (!decision.ok || !TRANSFORM_JOB_TYPES.has(input.type)) {
      return decision;
    }

    const urls = collectPublicationUrls(input, decision.result ?? {});
    const verification = await this.verifier.verifyUrls(urls);
    if (!verification.ok) {
      return {
        ok: false,
        retryable: verification.retryable,
        reason: verification.reason ?? 'CDN publication was not reachable.',
        result: {
          ...(decision.result ?? {}),
          provider: this.name,
          transformStatus: 'FAILED',
          cdnVerified: false,
        },
      };
    }

    return {
      ok: true,
      result: {
        ...(decision.result ?? {}),
        cdnVerified: true,
        cdnVerificationProvider: this.verifier.name,
        cdnVerifiedUrlCount: verification.verifiedCount,
      },
    };
  }
}

export function overlayCdnPublicationVerification(
  processors: MediaJobProcessorMap,
  config?: ConfigReader,
  fetcher: FetchLike = fetch,
): MediaJobProcessorMap {
  const provider = optionalConfig(config, 'MEDIA_CDN_VERIFICATION_PROVIDER')?.toLowerCase() ?? '';
  if (['development', 'off', 'none', 'skip'].includes(provider)) {
    return processors;
  }

  const origins = resolveAllowedCdnOrigins(config);
  if (['live', 'http', 'cdn', 'spaces'].includes(provider) && origins.length === 0) {
    throw new Error(
      'SPACES_CDN_ENDPOINT or MEDIA_S3_PUBLIC_BASE_URL is required when MEDIA_CDN_VERIFICATION_PROVIDER=live.',
    );
  }
  if (!origins.length) {
    return processors;
  }

  const verifier = new HttpCdnPublicationVerifier(origins, fetcher);
  const next: MediaJobProcessorMap = { ...processors };
  for (const type of TRANSFORM_JOB_TYPES) {
    const inner = next[type as 'IMAGE_TRANSFORM' | 'VIDEO_TRANSCODE'];
    if (inner) {
      next[type as 'IMAGE_TRANSFORM' | 'VIDEO_TRANSCODE'] = new CdnVerifiedMediaJobProcessorAdapter(
        inner,
        verifier,
      );
    }
  }
  return next;
}
