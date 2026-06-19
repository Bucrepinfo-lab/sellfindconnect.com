import type {
  MediaAsset,
  MediaAssetInput,
  MediaCdnVariant,
  MediaTransformStatus,
  MediaUploadPreparationInput,
  PreparedMediaUpload,
} from '@telpen/domain';
import { createHash, createHmac, randomUUID } from 'node:crypto';

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

export type MediaProcessingJobType =
  | 'MALWARE_SCAN'
  | 'CONTENT_MODERATION'
  | 'IMAGE_TRANSFORM'
  | 'VIDEO_TRANSCODE';

export type MediaProcessingJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type MediaProcessingJobMetadata = Record<string, string | number | boolean>;

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

export type MediaAdapters = {
  storage: MediaStorageAdapter;
  moderation: MediaModerationAdapter;
  transforms: MediaTransformAdapter;
  jobs?: MediaProcessingQueueAdapter;
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
    uploadUrl.hostname = `${this.options.bucket}.${uploadUrl.hostname}`;
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

export type MediaAdapterConfigReader = {
  get(key: string): string | undefined;
};

export function createConfiguredMediaAdapters(config?: MediaAdapterConfigReader): MediaAdapters {
  const storageDriver = normalizeConfigString(
    config?.get('MEDIA_STORAGE_DRIVER') ?? config?.get('MEDIA_STORAGE_PROVIDER'),
  );
  const storage =
    storageDriver === 's3' || storageDriver === 's3-compatible'
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

function createS3CompatibleStorageAdapter(config?: MediaAdapterConfigReader): S3CompatibleMediaStorageAdapter {
  const options = {
    endpoint: requiredConfig(config, 'MEDIA_S3_ENDPOINT'),
    region: requiredConfig(config, 'MEDIA_S3_REGION'),
    bucket: requiredConfig(config, 'MEDIA_S3_BUCKET'),
    accessKeyId: requiredConfig(config, 'MEDIA_S3_ACCESS_KEY_ID'),
    secretAccessKey: requiredConfig(config, 'MEDIA_S3_SECRET_ACCESS_KEY'),
    publicBaseUrl: normalizeOptionalConfigString(config?.get('MEDIA_S3_PUBLIC_BASE_URL')),
    providerName: normalizeOptionalConfigString(config?.get('MEDIA_S3_PROVIDER_NAME')),
    forcePathStyle: normalizeConfigBoolean(config?.get('MEDIA_S3_FORCE_PATH_STYLE')),
    expiresSeconds: normalizeConfigInt(config?.get('MEDIA_UPLOAD_URL_TTL_SECONDS')),
  };
  return new S3CompatibleMediaStorageAdapter(options);
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

function requiredConfig(config: MediaAdapterConfigReader | undefined, key: string): string {
  const value = normalizeOptionalConfigString(config?.get(key));
  if (!value) {
    throw new Error(`${key} is required when MEDIA_STORAGE_DRIVER=s3.`);
  }

  return value;
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
