import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type MediaProcessingJob as PrismaMediaProcessingJob,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type {
  ClaimMediaProcessingJobsInput,
  CompleteMediaProcessingJobInput,
  FailMediaProcessingJobInput,
  MediaProcessingJob,
  MediaProcessingJobMetadata,
  MediaProcessingJobStatus,
  MediaProcessingJobType,
  MediaProcessingQueueAdapter,
} from './media.adapters';
import type { MediaAsset } from '@telpen/domain';

export function createMediaProcessingPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaMediaProcessingQueueAdapter implements MediaProcessingQueueAdapter {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueueScanJobs(input: MediaAsset): Promise<MediaProcessingJob[]> {
    return this.enqueueMany(input, ['MALWARE_SCAN', 'CONTENT_MODERATION']);
  }

  async enqueueTransformJobs(input: MediaAsset): Promise<MediaProcessingJob[]> {
    return this.enqueueMany(input, [input.kind === 'VIDEO' ? 'VIDEO_TRANSCODE' : 'IMAGE_TRANSFORM']);
  }

  async claimQueuedJobs(input: ClaimMediaProcessingJobsInput): Promise<MediaProcessingJob[]> {
    const now = input.now ? new Date(input.now) : new Date();
    const candidates = await this.prisma.mediaProcessingJob.findMany({
      where: {
        status: 'QUEUED',
        availableAt: { lte: now },
        ...(input.jobTypes?.length ? { type: { in: input.jobTypes } } : {}),
      },
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      take: Math.max(1, input.limit),
    });
    const claimed: MediaProcessingJob[] = [];

    for (const candidate of candidates) {
      const updated = await this.prisma.mediaProcessingJob.updateMany({
        where: { id: candidate.id, status: 'QUEUED' },
        data: {
          status: 'RUNNING',
          lockedAt: now,
          lockedBy: input.workerId,
          attempts: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        continue;
      }

      const record = await this.prisma.mediaProcessingJob.findUnique({
        where: { id: candidate.id },
      });
      if (record) {
        claimed.push(this.mapJob(record));
      }
    }

    return claimed;
  }

  async completeJob(input: CompleteMediaProcessingJobInput): Promise<MediaProcessingJob | undefined> {
    const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
    const updated = await this.prisma.mediaProcessingJob.updateMany({
      where: {
        id: input.jobId,
        status: 'RUNNING',
        lockedBy: input.workerId,
      },
      data: {
        status: 'SUCCEEDED',
        completedAt,
        lockedAt: null,
        lockedBy: null,
        result: this.mapOptionalJsonToPrisma(input.result),
      },
    });

    if (updated.count === 0) {
      return undefined;
    }

    return this.findJob(input.jobId);
  }

  async failJob(input: FailMediaProcessingJobInput): Promise<MediaProcessingJob | undefined> {
    const failedAt = input.failedAt ? new Date(input.failedAt) : new Date();
    const existing = await this.prisma.mediaProcessingJob.findFirst({
      where: { id: input.jobId, status: 'RUNNING', lockedBy: input.workerId },
    });

    if (!existing) {
      return undefined;
    }

    const shouldRetry = Boolean(input.retryable) && existing.attempts < existing.maxAttempts;
    const updated = await this.prisma.mediaProcessingJob.updateMany({
      where: {
        id: input.jobId,
        status: 'RUNNING',
        lockedBy: input.workerId,
      },
      data: {
        status: shouldRetry ? 'QUEUED' : 'FAILED',
        availableAt: shouldRetry
          ? new Date(failedAt.getTime() + (input.retryAfterSeconds ?? 300) * 1000)
          : existing.availableAt,
        lockedAt: null,
        lockedBy: null,
        failedAt: shouldRetry ? null : failedAt,
        lastError: input.reason,
      },
    });

    if (updated.count === 0) {
      return undefined;
    }

    return this.findJob(input.jobId);
  }

  private async enqueueMany(
    input: MediaAsset,
    types: MediaProcessingJobType[],
  ): Promise<MediaProcessingJob[]> {
    const now = new Date();
    const records = types.map((type) => this.buildCreateInput(input, type, now));
    const created = await this.prisma.$transaction(
      records.map((record) => this.prisma.mediaProcessingJob.create({ data: record })),
    );

    return created.map((record) => this.mapJob(record));
  }

  private buildCreateInput(
    input: MediaAsset,
    type: MediaProcessingJobType,
    now: Date,
  ): Prisma.MediaProcessingJobUncheckedCreateInput {
    return {
      id: randomUUID(),
      tenantId: input.tenantId,
      mediaId: input.id,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      type,
      status: 'QUEUED',
      objectKey: input.objectKey,
      sourceUrl: input.cdnUrl ?? input.sourceUrl,
      attempts: 0,
      maxAttempts: 3,
      availableAt: now,
      requestedAt: now,
      metadata: this.mapOptionalJsonToPrisma({
        kind: input.kind,
        mimeType: input.mimeType,
      }),
      createdAt: now,
    };
  }

  private async findJob(jobId: string): Promise<MediaProcessingJob | undefined> {
    const record = await this.prisma.mediaProcessingJob.findUnique({ where: { id: jobId } });
    return record ? this.mapJob(record) : undefined;
  }

  private mapJob(record: PrismaMediaProcessingJob): MediaProcessingJob {
    return {
      id: record.id,
      type: this.mapJobType(record.type),
      tenantId: record.tenantId,
      mediaId: record.mediaId,
      ownerType: this.mapOwnerType(record.ownerType),
      ownerId: record.ownerId,
      objectKey: record.objectKey ?? undefined,
      sourceUrl: record.sourceUrl,
      status: this.mapJobStatus(record.status),
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      availableAt: record.availableAt.toISOString(),
      lockedAt: record.lockedAt?.toISOString(),
      lockedBy: record.lockedBy ?? undefined,
      completedAt: record.completedAt?.toISOString(),
      failedAt: record.failedAt?.toISOString(),
      lastError: record.lastError ?? undefined,
      requestedAt: record.requestedAt.toISOString(),
      metadata: this.mapMetadata(record.metadata),
      result: this.mapMetadata(record.result),
    };
  }

  private mapJobType(value: string): MediaProcessingJobType {
    const allowed: MediaProcessingJobType[] = [
      'MALWARE_SCAN',
      'CONTENT_MODERATION',
      'IMAGE_TRANSFORM',
      'VIDEO_TRANSCODE',
    ];
    return allowed.includes(value as MediaProcessingJobType)
      ? (value as MediaProcessingJobType)
      : 'MALWARE_SCAN';
  }

  private mapJobStatus(value: string): MediaProcessingJobStatus {
    const allowed: MediaProcessingJobStatus[] = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'];
    return allowed.includes(value as MediaProcessingJobStatus)
      ? (value as MediaProcessingJobStatus)
      : 'QUEUED';
  }

  private mapOwnerType(value: string): MediaAsset['ownerType'] {
    if (value === 'PUBLISHED_PROFILE' || value === 'ADVERT') {
      return value;
    }

    return 'PROFILE_DRAFT';
  }

  private mapMetadata(value: unknown): MediaProcessingJobMetadata | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const entries = Object.entries(value).filter((entry): entry is [string, string | number | boolean] =>
      ['string', 'number', 'boolean'].includes(typeof entry[1]),
    );
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  private mapOptionalJsonToPrisma(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
