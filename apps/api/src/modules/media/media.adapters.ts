import type {
  MediaAsset,
  MediaAssetInput,
  MediaCdnVariant,
  MediaTransformStatus,
  MediaUploadPreparationInput,
  PreparedMediaUpload,
} from '@telpen/domain';
import { createHash, createHmac, randomUUID } from 'node:crypto';

import { overlayApprovedMediaJobProcessors } from './media-scanners';
import { overlayCdnPublicationVerification } from './media-cdn-verification';

export type MediaModerationResult =
  | {
      allowed: true;
      moderationStatus: 'PASSED' | 'PENDING';
      moderationReason?: string;
    }
  | {
      allowed: false;
      moderationStatus: 'BLOCKED';
      moderationReason: string;
    };

export type MediaTransformResult = {
  transformStatus: MediaTransformStatus;
  cdnUrl?: string;
  thumbnailUrl?: string;
  variants?: MediaCdnVariant[];
};

export interface MediaStorageAdapter {
  prepareUpload(input: MediaUploadPreparationInput): Promise<PreparedMediaUpload> | PreparedMediaUpload;
}

export interface MediaModerationAdapter {
  review(input: MediaAssetInput): Promise<MediaModerationResult> | MediaModerationResult;
}

export interface MediaTransformAdapter {
  plan(input: MediaAsset): Promise<MediaTransformResult> | MediaTransformResult;
}

export const mediaProcessingJobTypes = [
  'MALWARE_SCAN',
  'CONTENT_MODERATION',
  'IMAGE_TRANSFORM',
  'VIDEO_TRANSCODE',
] as const;

export type MediaProcessingJobType = (typeof mediaProcessingJobTypes)[number];

export type MediaProcessingJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type MediaProcessingJobMetadataValue =
  | string
  | number
  | boolean
  | null
  | MediaProcessingJobMetadataValue[]
  | { [key: string]: MediaProcessingJobMetadataValue };

export type MediaProcessingJobMetadata = Record<string, MediaProcessingJobMetadataValue>;

export type MediaProcessingJob = {
  id: string;
  type: MediaProcessingJobType;
  tenantId: string;
  mediaId: string;
  ownerType: MediaAsset['ownerType'];
  ownerId: string;
  objectKey?: string;
  sourceUrl: string;
  status: MediaProcessingJobStatus;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  lockedAt?: string;
  lockedBy?: string;
  completedAt?: string;
  failedAt?: string;
  lastError?: string;
  requestedAt: string;
  metadata?: MediaProcessingJobMetadata;
  result?: MediaProcessingJobMetadata;
};

export type ClaimMediaProcessingJobsInput = {
  workerId: string;
  limit: number;
  now?: string;
  lockSeconds?: number;
  jobTypes?: MediaProcessingJobType[];
};

export type CompleteMediaProcessingJobInput = {
  jobId: string;
  workerId: string;
  completedAt?: string;
  result?: MediaProcessingJobMetadata;
};

export type FailMediaProcessingJobInput = {
  jobId: string;
  workerId: string;
  reason: string;
  failedAt?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
};

export interface MediaProcessingQueueAdapter {
  enqueueScanJobs(input: MediaAsset): Promise<MediaProcessingJob[]> | MediaProcessingJob[];
  enqueueTransformJobs(input: MediaAsset): Promise<MediaProcessingJob[]> | MediaProcessingJob[];
  claimQueuedJobs(input: ClaimMediaProcessingJobsInput): Promise<MediaProcessingJob[]> | MediaProcessingJob[];
  completeJob(input: CompleteMediaProcessingJobInput): Promise<MediaProcessingJob | undefined> | MediaProcessingJob | undefined;
  failJob(input: FailMediaProcessingJobInput): Promise<MediaProcessingJob | undefined> | MediaProcessingJob | undefined;
}

export type MediaJobProcessorResult =
  | {
      ok: true;
      result?: MediaProcessingJobMetadata;
    }
  | {
      ok: false;
      reason: string;
      retryable: boolean;
      result?: MediaProcessingJobMetadata;
    };

export interface MediaJobProcessorAdapter {
  process(input: MediaProcessingJob): Promise<MediaJobProcessorResult> | MediaJobProcessorResult;
}

export type MediaJobProcessorMap = Partial<Record<MediaProcessingJobType, MediaJobProcessorAdapter>>;

export type MediaAdapters = {
  storage: MediaStorageAdapter;
  moderation: MediaModerationAdapter;
  transforms: MediaTransformAdapter;
  jobs?: MediaProcessingQueueAdapter;
  processors?: MediaJobProcessorMap;
};

export const MEDIA_ADAPTERS = Symbol('MEDIA_ADAPTERS');

const defaultMediaBaseUrl = 'https://media.local.sellfindconnect.test';

export class DevelopmentMediaStorageAdapter implements MediaStorageAdapter {
  constructor(private readonly baseUrl = defaultMediaBaseUrl) {}

  prepareUpload(input: MediaUploadPreparationInput): PreparedMediaUpload {
    const objectKey = this.objectKey(input);
    const publicUrl = `${this.baseUrl}/public/${objectKey}`;

    return {
      provider: 'development-s3-compatible',
      objectKey,
      uploadUrl: `${this.baseUrl}/upload/${objectKey}?token=${this.uploadToken(input, objectKey)}`,
      publicUrl,
      thumbnailUrl: `${this.baseUrl}/thumb/${objectKey}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      requiredHeaders: {
        'content-type': input.mimeType.trim().toLowerCase(),
        'x-media-owner-type': input.ownerType,
      },
    };
  }

  private objectKey(input: MediaUploadPreparationInput): string {
    return buildMediaObjectKey(input);
  }

  private uploadToken(input: MediaUploadPreparationInput, objectKey: string): string {
    return createHash('sha256')
      .update(`${input.tenantId}:${input.ownerType}:${input.ownerId}:${objectKey}`)
      .digest('base64url')
      .slice(0, 32);
  }
}

export type S3CompatibleMediaStorageOptions = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  providerName?: string;
  forcePathStyle?: boolean;
  expiresSeconds?: number;
  now?: () => Date;
  idFactory?: () => string;
};

export class S3CompatibleMediaStorageAdapter implements MediaStorageAdapter {
  constructor(private readonly options: S3CompatibleMediaStorageOptions) {}

  prepareUpload(input: MediaUploadPreparationInput): PreparedMediaUpload {
    const objectKey = buildMediaObjectKey(input, this.options.idFactory);
    const now = this.options.now?.() ?? new Date();
    const expiresSeconds = this.expiresSeconds();
    const endpoint = new URL(this.options.endpoint);
    const { host, canonicalUri, uploadUrl } = this.uploadUrl(endpoint, objectKey);
    const signedHeaders = 'content-type;host';
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.options.region}/s3/aws4_request`;
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.options.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    };
    const canonicalHeaders = `content-type:${input.mimeType.trim().toLowerCase()}\nhost:${host}\n`;
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString(queryParams),
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = hmacHex(
      signingKey(this.options.secretAccessKey, dateStamp, this.options.region),
      stringToSign,
    );

    for (const [key, value] of Object.entries(queryParams)) {
      uploadUrl.searchParams.set(key, value);
    }
    uploadUrl.searchParams.set('X-Amz-Signature', signature);

    return {
      provider: this.options.providerName ?? 's3-compatible',
      objectKey,
      uploadUrl: uploadUrl.toString(),
      publicUrl: this.publicUrl(objectKey),
      thumbnailUrl: this.publicUrl(objectKey),
      expiresAt: new Date(now.getTime() + expiresSeconds * 1000).toISOString(),
      requiredHeaders: {
        'content-type': input.mimeType.trim().toLowerCase(),
      },
    };
  }

  private expiresSeconds(): number {
    const requested = this.options.expiresSeconds ?? 900;
    return Math.min(604_800, Math.max(60, requested));
  }

  private uploadUrl(endpoint: URL, objectKey: string) {
    const encodedKey = encodeObjectKey(objectKey);
    const endpointPath = endpoint.pathname.replace(/\/+$/g, '');

    if (this.options.forcePathStyle) {
      const canonicalUri = `${endpointPath}/${encodeUriPathSegment(this.options.bucket)}/${encodedKey}`;
      const uploadUrl = new URL(endpoint.toString());
      uploadUrl.pathname = canonicalUri;
      uploadUrl.search = '';
      return {
        host: uploadUrl.host,
        canonicalUri,
        uploadUrl,
      };
    }

    const uploadUrl = new URL(endpoint.toString());
    if (!uploadUrl.hostname.startsWith(`${this.options.bucket}.`)) {
      uploadUrl.hostname = `${this.options.bucket}.${uploadUrl.hostname}`;
    }
    const canonicalUri = `${endpointPath}/${encodedKey}`;
    uploadUrl.pathname = canonicalUri;
    uploadUrl.search = '';
    return {
      host: uploadUrl.host,
      canonicalUri,
      uploadUrl,
    };
  }

  private publicUrl(objectKey: string): string {
    if (this.options.publicBaseUrl) {
      const baseUrl = this.options.publicBaseUrl.replace(/\/+$/g, '');
      return `${baseUrl}/${encodeObjectKey(objectKey)}`;
    }

    const endpoint = new URL(this.options.endpoint);
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/g, '')}/${this.options.bucket}/${encodeObjectKey(objectKey)}`;
    endpoint.search = '';
    return endpoint.toString();
  }
}

export class MetadataOnlyMediaModerationAdapter implements MediaModerationAdapter {
  review(_input: MediaAssetInput): MediaModerationResult {
    return { allowed: true, moderationStatus: 'PASSED' };
  }
}

export class DevelopmentMediaTransformAdapter implements MediaTransformAdapter {
  plan(input: MediaAsset): MediaTransformResult {
    if (input.kind === 'VIDEO') {
      return {
        transformStatus: 'PENDING',
        cdnUrl: input.cdnUrl ?? input.sourceUrl,
        thumbnailUrl: input.thumbnailUrl,
        variants: input.variants ?? [],
      };
    }

    const cdnUrl = input.cdnUrl ?? input.sourceUrl;
    const thumbnailUrl = input.thumbnailUrl ?? cdnUrl;
    return {
      transformStatus: 'READY',
      cdnUrl,
      thumbnailUrl,
      variants: input.variants?.length
        ? input.variants
        : [
            { label: 'thumbnail', url: thumbnailUrl, width: 480 },
            { label: 'display', url: cdnUrl, width: input.width },
          ],
    };
  }
}

export class InMemoryMediaProcessingQueueAdapter implements MediaProcessingQueueAdapter {
  private readonly jobs: MediaProcessingJob[] = [];

  enqueueScanJobs(input: MediaAsset): MediaProcessingJob[] {
    return [
      this.enqueue(input, 'MALWARE_SCAN'),
      this.enqueue(input, 'CONTENT_MODERATION'),
    ];
  }

  enqueueTransformJobs(input: MediaAsset): MediaProcessingJob[] {
    if (input.kind === 'VIDEO') {
      return [this.enqueue(input, 'VIDEO_TRANSCODE')];
    }

    return [this.enqueue(input, 'IMAGE_TRANSFORM')];
  }

  listQueuedJobs(): MediaProcessingJob[] {
    return [...this.jobs];
  }

  claimQueuedJobs(input: ClaimMediaProcessingJobsInput): MediaProcessingJob[] {
    const now = input.now ?? new Date().toISOString();
    const limit = Math.max(1, input.limit);
    const jobTypes = input.jobTypes ? new Set(input.jobTypes) : undefined;
    const selected = this.jobs
      .filter(
        (job) =>
          job.status === 'QUEUED' &&
          job.availableAt <= now &&
          (!jobTypes || jobTypes.has(job.type)),
      )
      .sort((a, b) => a.availableAt.localeCompare(b.availableAt))
      .slice(0, limit);

    for (const job of selected) {
      this.replaceJob(job.id, {
        ...job,
        status: 'RUNNING',
        attempts: job.attempts + 1,
        lockedAt: now,
        lockedBy: input.workerId,
      });
    }

    return selected.map((job) => this.findJob(job.id)!);
  }

  completeJob(input: CompleteMediaProcessingJobInput): MediaProcessingJob | undefined {
    const completedAt = input.completedAt ?? new Date().toISOString();
    const job = this.findJob(input.jobId);
    if (!job || job.status !== 'RUNNING' || job.lockedBy !== input.workerId) {
      return undefined;
    }

    const completed: MediaProcessingJob = {
      ...job,
      status: 'SUCCEEDED',
      completedAt,
      lockedAt: undefined,
      lockedBy: undefined,
      result: input.result,
    };
    this.replaceJob(job.id, completed);
    return completed;
  }

  failJob(input: FailMediaProcessingJobInput): MediaProcessingJob | undefined {
    const failedAt = input.failedAt ?? new Date().toISOString();
    const job = this.findJob(input.jobId);
    if (!job || job.status !== 'RUNNING' || job.lockedBy !== input.workerId) {
      return undefined;
    }

    const shouldRetry = Boolean(input.retryable) && job.attempts < job.maxAttempts;
    const failed: MediaProcessingJob = {
      ...job,
      status: shouldRetry ? 'QUEUED' : 'FAILED',
      availableAt: shouldRetry
        ? new Date(Date.parse(failedAt) + (input.retryAfterSeconds ?? 300) * 1000).toISOString()
        : job.availableAt,
      lockedAt: undefined,
      lockedBy: undefined,
      failedAt: shouldRetry ? undefined : failedAt,
      lastError: input.reason,
    };
    this.replaceJob(job.id, failed);
    return failed;
  }

  private enqueue(input: MediaAsset, type: MediaProcessingJobType): MediaProcessingJob {
    const now = new Date().toISOString();
    const job: MediaProcessingJob = {
      id: randomUUID(),
      type,
      tenantId: input.tenantId,
      mediaId: input.id,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      objectKey: input.objectKey,
      sourceUrl: input.cdnUrl ?? input.sourceUrl,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      availableAt: now,
      requestedAt: now,
      metadata: {
        kind: input.kind,
        mimeType: input.mimeType,
      },
    };
    this.jobs.push(job);
    return job;
  }

  private findJob(jobId: string): MediaProcessingJob | undefined {
    return this.jobs.find((job) => job.id === jobId);
  }

  private replaceJob(jobId: string, next: MediaProcessingJob): void {
    const index = this.jobs.findIndex((job) => job.id === jobId);
    if (index >= 0) {
      this.jobs[index] = next;
    }
  }
}

export class DevelopmentMediaJobProcessorAdapter implements MediaJobProcessorAdapter {
  constructor(private readonly type: MediaProcessingJobType) {}

  process(input: MediaProcessingJob): MediaJobProcessorResult {
    switch (this.type) {
      case 'MALWARE_SCAN':
        return {
          ok: true,
          result: {
            provider: 'development-malware-scanner',
            verdict: 'clean',
            objectKeyPresent: Boolean(input.objectKey),
          },
        };
      case 'CONTENT_MODERATION':
        return {
          ok: true,
          result: {
            provider: 'development-content-moderator',
            verdict: 'passed',
            sourceUrlChecked: Boolean(input.sourceUrl),
          },
        };
      case 'IMAGE_TRANSFORM':
        return {
          ok: true,
          result: {
            provider: 'development-image-transformer',
            transformStatus: 'READY',
            cdnPublished: true,
          },
        };
      case 'VIDEO_TRANSCODE':
        return {
          ok: true,
          result: {
            provider: 'development-video-transcoder',
            transformStatus: 'READY',
            streamPrepared: true,
          },
        };
    }
  }
}

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

export type HttpMediaJobProcessorOptions = {
  endpoint: string;
  providerName: string;
  apiKey?: string;
  timeoutMs?: number;
  fetcher?: FetchLike;
};

export class HttpMediaJobProcessorAdapter implements MediaJobProcessorAdapter {
  private readonly fetcher: FetchLike;

  constructor(private readonly options: HttpMediaJobProcessorOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async process(input: MediaProcessingJob): Promise<MediaJobProcessorResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs());

    try {
      const response = await this.fetcher(this.options.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          jobId: input.id,
          type: input.type,
          tenantId: input.tenantId,
          mediaId: input.mediaId,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          objectKey: input.objectKey,
          sourceUrl: input.sourceUrl,
          metadata: input.metadata,
        }),
        signal: controller.signal,
      });
      const body = parseProviderResponse(await response.text());

      if (!response.ok) {
        return {
          ok: false,
          retryable: isRetryableStatus(response.status),
          reason: body.reason ?? `Provider ${this.options.providerName} returned HTTP ${response.status}.`,
          result: body.result,
        };
      }

      if (body.ok === false) {
        return {
          ok: false,
          retryable: body.retryable ?? false,
          reason: body.reason ?? `Provider ${this.options.providerName} rejected the media job.`,
          result: body.result,
        };
      }

      return {
        ok: true,
        result: {
          provider: this.options.providerName,
          ...body.result,
        },
      };
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        reason:
          error instanceof Error
            ? `Provider ${this.options.providerName} failed: ${error.message}`
            : `Provider ${this.options.providerName} failed.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private timeoutMs(): number {
    return Math.min(120_000, Math.max(1_000, this.options.timeoutMs ?? 30_000));
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };

    if (this.options.apiKey) {
      headers.authorization = `Bearer ${this.options.apiKey}`;
    }

    return headers;
  }
}

export type MediaAdapterConfigReader = {
  get(key: string): string | undefined;
};

export function createConfiguredMediaAdapters(config?: MediaAdapterConfigReader): MediaAdapters {
  const storageDriver = resolveMediaStorageDriver(config);
  const storage =
    storageDriver === 's3'
      ? createS3CompatibleStorageAdapter(config)
      : new DevelopmentMediaStorageAdapter(
          normalizeOptionalConfigString(config?.get('MEDIA_DEVELOPMENT_BASE_URL')) ??
            defaultMediaBaseUrl,
        );

  return {
    storage,
    moderation: new MetadataOnlyMediaModerationAdapter(),
    transforms: new DevelopmentMediaTransformAdapter(),
    jobs: new InMemoryMediaProcessingQueueAdapter(),
    processors: createConfiguredMediaJobProcessors(config),
  };
}

export async function createConfiguredMediaAdaptersAsync(
  config?: MediaAdapterConfigReader,
): Promise<MediaAdapters> {
  const adapters = createConfiguredMediaAdapters(config);
  const queueDriver = normalizeConfigString(
    config?.get('MEDIA_JOB_QUEUE_DRIVER') ?? config?.get('MEDIA_PROCESSING_QUEUE_DRIVER'),
  );

  if (!['prisma', 'postgres', 'database'].includes(queueDriver)) {
    return adapters;
  }

  const databaseUrl = normalizeOptionalConfigString(config?.get('DATABASE_URL'));
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when MEDIA_JOB_QUEUE_DRIVER=prisma.');
  }

  const { PrismaMediaProcessingQueueAdapter, createMediaProcessingPrismaClient } = await import(
    './prisma-media-processing-queue.adapter.js'
  );

  return {
    ...adapters,
    jobs: new PrismaMediaProcessingQueueAdapter(createMediaProcessingPrismaClient(databaseUrl)),
  };
}

export function createDefaultMediaAdapters(): MediaAdapters {
  return {
    storage: new DevelopmentMediaStorageAdapter(),
    moderation: new MetadataOnlyMediaModerationAdapter(),
    transforms: new DevelopmentMediaTransformAdapter(),
    jobs: new InMemoryMediaProcessingQueueAdapter(),
    processors: createDevelopmentMediaJobProcessors(),
  };
}

export async function enqueueMediaProcessingJobs(
  adapters: MediaAdapters,
  media: MediaAsset,
): Promise<MediaProcessingJob[]> {
  if (!adapters.jobs) {
    return [];
  }

  const [scanJobs, transformJobs] = await Promise.all([
    adapters.jobs.enqueueScanJobs(media),
    adapters.jobs.enqueueTransformJobs(media),
  ]);

  return [...scanJobs, ...transformJobs];
}

export function createDevelopmentMediaJobProcessors(): MediaJobProcessorMap {
  return Object.fromEntries(
    mediaProcessingJobTypes.map((type) => [type, new DevelopmentMediaJobProcessorAdapter(type)]),
  );
}

export function createConfiguredMediaJobProcessors(
  config?: MediaAdapterConfigReader,
): MediaJobProcessorMap {
  const processors = createDevelopmentMediaJobProcessors();
  const timeoutMs = normalizeConfigInt(config?.get('MEDIA_PROCESSOR_TIMEOUT_MS'));

  for (const type of mediaProcessingJobTypes) {
    const endpoint = normalizeOptionalConfigString(config?.get(processorEndpointKey(type)));
    if (!endpoint) {
      continue;
    }

    processors[type] = new HttpMediaJobProcessorAdapter({
      endpoint,
      providerName:
        normalizeOptionalConfigString(config?.get(processorProviderKey(type))) ??
        `${type.toLowerCase().replace(/_/g, '-')}-provider`,
      apiKey:
        normalizeOptionalConfigString(config?.get(processorApiKey(type))) ??
        normalizeOptionalConfigString(config?.get('MEDIA_PROCESSOR_API_KEY')),
      timeoutMs,
    });
  }

  return overlayCdnPublicationVerification(
    overlayApprovedMediaJobProcessors(processors, config),
    config,
  );
}

export function hasLiveObjectStorageConfig(config?: MediaAdapterConfigReader): boolean {
  return Boolean(
    firstConfig(config, ['MEDIA_S3_ACCESS_KEY_ID', 'SPACES_ACCESS_KEY']) &&
      firstConfig(config, ['MEDIA_S3_SECRET_ACCESS_KEY', 'SPACES_SECRET_KEY']) &&
      firstConfig(config, ['MEDIA_S3_ENDPOINT', 'SPACES_ENDPOINT']) &&
      firstConfig(config, ['MEDIA_S3_BUCKET', 'SPACES_BUCKET']),
  );
}

export function resolveMediaStorageDriver(config?: MediaAdapterConfigReader): 'development' | 's3' {
  const explicit = normalizeOptionalConfigString(
    config?.get('MEDIA_STORAGE_DRIVER') ?? config?.get('MEDIA_STORAGE_PROVIDER'),
  )?.toLowerCase();
  if (explicit === 'development' || explicit === 'local' || explicit === 'memory') {
    return 'development';
  }
  if (
    explicit === 's3' ||
    explicit === 's3-compatible' ||
    explicit === 'spaces' ||
    explicit === 'digitalocean-spaces'
  ) {
    return 's3';
  }
  return hasLiveObjectStorageConfig(config) ? 's3' : 'development';
}

function createS3CompatibleStorageAdapter(config?: MediaAdapterConfigReader): S3CompatibleMediaStorageAdapter {
  const endpoint = requiredStorageConfig(config, ['MEDIA_S3_ENDPOINT', 'SPACES_ENDPOINT']);
  const usingSpaces = Boolean(firstConfig(config, ['SPACES_ACCESS_KEY', 'SPACES_SECRET_KEY', 'SPACES_ENDPOINT']));
  const options = {
    endpoint,
    region:
      firstConfig(config, ['MEDIA_S3_REGION', 'SPACES_REGION']) ?? deriveObjectStorageRegion(endpoint),
    bucket: requiredStorageConfig(config, ['MEDIA_S3_BUCKET', 'SPACES_BUCKET']),
    accessKeyId: requiredStorageConfig(config, ['MEDIA_S3_ACCESS_KEY_ID', 'SPACES_ACCESS_KEY']),
    secretAccessKey: requiredStorageConfig(config, ['MEDIA_S3_SECRET_ACCESS_KEY', 'SPACES_SECRET_KEY']),
    publicBaseUrl: firstConfig(config, ['MEDIA_S3_PUBLIC_BASE_URL', 'SPACES_CDN_ENDPOINT']),
    providerName:
      firstConfig(config, ['MEDIA_S3_PROVIDER_NAME']) ??
      (usingSpaces ? 'digitalocean-spaces' : undefined),
    forcePathStyle: normalizeConfigBoolean(config?.get('MEDIA_S3_FORCE_PATH_STYLE')),
    expiresSeconds: normalizeConfigInt(config?.get('MEDIA_UPLOAD_URL_TTL_SECONDS')),
  };
  return new S3CompatibleMediaStorageAdapter(options);
}

function requiredStorageConfig(config: MediaAdapterConfigReader | undefined, keys: string[]): string {
  const value = firstConfig(config, keys);
  if (!value) {
    throw new Error(`${keys[0]} is required when MEDIA_STORAGE_DRIVER=s3.`);
  }
  return value;
}

function firstConfig(config: MediaAdapterConfigReader | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeOptionalConfigString(config?.get(key));
    if (value) {
      return value;
    }
  }
  return undefined;
}

function deriveObjectStorageRegion(endpoint: string): string {
  try {
    const host = new URL(endpoint).hostname;
    const spaces = host.match(/(?:^|\.)([a-z0-9]+)\.digitaloceanspaces\.com$/i);
    if (spaces?.[1] && spaces[1] !== 'cdn') {
      return spaces[1];
    }
  } catch {
    // Fall through to the generic S3 default.
  }
  return 'us-east-1';
}

function buildMediaObjectKey(
  input: MediaUploadPreparationInput,
  idFactory: () => string = randomUUID,
): string {
  const safeFileName =
    input.fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'upload';
  return `${input.ownerType.toLowerCase()}/${input.tenantId}/${input.ownerId}/${idFactory()}-${safeFileName}`;
}

function normalizeConfigString(value: string | undefined): string {
  return normalizeOptionalConfigString(value)?.toLowerCase() ?? 'development';
}

function normalizeOptionalConfigString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeConfigBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');
}

function normalizeConfigInt(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function processorEndpointKey(type: MediaProcessingJobType): string {
  return `MEDIA_${type}_ENDPOINT`;
}

function processorProviderKey(type: MediaProcessingJobType): string {
  return `MEDIA_${type}_PROVIDER_NAME`;
}

function processorApiKey(type: MediaProcessingJobType): string {
  return `MEDIA_${type}_API_KEY`;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function parseProviderResponse(value: string): {
  ok?: boolean;
  retryable?: boolean;
  reason?: string;
  result?: MediaProcessingJobMetadata;
} {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return {};
    }

    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : undefined,
      retryable: typeof parsed.retryable === 'boolean' ? parsed.retryable : undefined,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      result: mapMetadata(parsed.result ?? parsed),
    };
  } catch {
    return { reason: value.slice(0, 500) };
  }
}

function mapMetadata(value: unknown): MediaProcessingJobMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([key, item]) => [key, mapMetadataValue(item)] as const)
    .filter((entry): entry is readonly [string, MediaProcessingJobMetadataValue] => entry[1] !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function mapMetadataValue(value: unknown): MediaProcessingJobMetadataValue | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => mapMetadataValue(item))
      .filter((item): item is MediaProcessingJobMetadataValue => item !== undefined);
  }

  if (isRecord(value)) {
    return mapMetadata(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function canonicalQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join('&');
}

function encodeObjectKey(objectKey: string): string {
  return objectKey.split('/').map(encodeUriPathSegment).join('/');
}

function encodeUriPathSegment(value: string): string {
  return encodeRfc3986(value);
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}
