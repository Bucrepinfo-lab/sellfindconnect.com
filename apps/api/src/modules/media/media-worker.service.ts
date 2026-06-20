import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  MEDIA_ADAPTERS,
  createDefaultMediaAdapters,
  createDevelopmentMediaJobProcessors,
  type MediaAdapters,
  type MediaJobProcessorResult,
  type MediaProcessingJob,
  type MediaProcessingJobMetadata,
  type MediaProcessingJobType,
} from './media.adapters';
import {
  MEDIA_ASSET_RESULT_PUBLISHER,
  NoopMediaAssetResultPublisherAdapter,
  type MediaAssetPublicationResult,
  type MediaAssetResultPublisherAdapter,
} from './media-result-publisher';

export type RunMediaProcessingJobsInput = {
  workerId?: string;
  limit?: number;
  now?: string;
  retryAfterSeconds?: number;
  jobTypes?: MediaProcessingJobType[];
};

export type MediaWorkerJobStatus = 'SUCCEEDED' | 'RETRY_QUEUED' | 'FAILED' | 'SKIPPED';

export type MediaWorkerJobResult = {
  jobId: string;
  mediaId: string;
  type: MediaProcessingJobType;
  status: MediaWorkerJobStatus;
  attempts: number;
  reason?: string;
  result?: MediaProcessingJobMetadata;
  publication?: MediaAssetPublicationResult;
};

export type MediaWorkerRunResult = {
  workerId: string;
  requestedAt: string;
  claimed: number;
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
  published: number;
  results: MediaWorkerJobResult[];
};

@Injectable()
export class MediaWorkerService {
  private readonly developmentProcessors = createDevelopmentMediaJobProcessors();

  constructor(
    @Optional()
    @Inject(MEDIA_ADAPTERS)
    private readonly mediaAdapters: MediaAdapters = createDefaultMediaAdapters(),
    @Optional()
    @Inject(MEDIA_ASSET_RESULT_PUBLISHER)
    private readonly resultPublisher: MediaAssetResultPublisherAdapter =
      new NoopMediaAssetResultPublisherAdapter(),
  ) {}

  async runOnce(input: RunMediaProcessingJobsInput = {}): Promise<MediaWorkerRunResult> {
    const workerId = normalizeWorkerId(input.workerId);
    const requestedAt = input.now ?? new Date().toISOString();
    const retryAfterSeconds = clampInteger(input.retryAfterSeconds, 30, 86_400, 300);
    const queue = this.mediaAdapters.jobs;

    if (!queue) {
      return emptyRun(workerId, requestedAt);
    }

    const jobs = await queue.claimQueuedJobs({
      workerId,
      limit: clampInteger(input.limit, 1, 100, 10),
      now: requestedAt,
      jobTypes: input.jobTypes,
    });
    const results: MediaWorkerJobResult[] = [];

    for (const job of jobs) {
      const processor = this.mediaAdapters.processors?.[job.type] ?? this.developmentProcessors[job.type];
      if (!processor) {
        results.push(await this.failJob(job, workerId, requestedAt, retryAfterSeconds, {
          ok: false,
          retryable: false,
          reason: `No processor is configured for media job type ${job.type}.`,
        }));
        continue;
      }

      try {
        const decision = await processor.process(job);
        results.push(await this.applyDecision(job, workerId, requestedAt, retryAfterSeconds, decision));
      } catch (error) {
        results.push(
          await this.failJob(job, workerId, requestedAt, retryAfterSeconds, {
            ok: false,
            retryable: true,
            reason: error instanceof Error ? error.message : 'Media processor failed.',
          }),
        );
      }
    }

    return summarizeRun(workerId, requestedAt, jobs.length, results);
  }

  private async applyDecision(
    job: MediaProcessingJob,
    workerId: string,
    requestedAt: string,
    retryAfterSeconds: number,
    decision: MediaJobProcessorResult,
  ): Promise<MediaWorkerJobResult> {
    if (!decision.ok) {
      return this.failJob(job, workerId, requestedAt, retryAfterSeconds, decision);
    }

    const completed = await this.mediaAdapters.jobs?.completeJob({
      jobId: job.id,
      workerId,
      completedAt: requestedAt,
      result: decision.result,
    });

    if (!completed) {
      return skippedJob(job, 'Job lock was lost before completion.');
    }

    const publication = await this.resultPublisher.publish({
      job: completed,
      outcome: 'SUCCEEDED',
      occurredAt: requestedAt,
    });

    return {
      jobId: completed.id,
      mediaId: completed.mediaId,
      type: completed.type,
      status: 'SUCCEEDED',
      attempts: completed.attempts,
      result: completed.result,
      publication,
    };
  }

  private async failJob(
    job: MediaProcessingJob,
    workerId: string,
    requestedAt: string,
    retryAfterSeconds: number,
    decision: Extract<MediaJobProcessorResult, { ok: false }>,
  ): Promise<MediaWorkerJobResult> {
    const failed = await this.mediaAdapters.jobs?.failJob({
      jobId: job.id,
      workerId,
      reason: decision.reason,
      failedAt: requestedAt,
      retryable: decision.retryable,
      retryAfterSeconds,
    });

    if (!failed) {
      return skippedJob(job, 'Job lock was lost before failure handling.');
    }

    const status = failed.status === 'QUEUED' ? 'RETRY_QUEUED' : 'FAILED';
    const publication =
      status === 'FAILED'
        ? await this.resultPublisher.publish({
            job: failed,
            outcome: 'FAILED',
            occurredAt: requestedAt,
            reason: decision.reason,
          })
        : undefined;

    return {
      jobId: failed.id,
      mediaId: failed.mediaId,
      type: failed.type,
      status,
      attempts: failed.attempts,
      reason: decision.reason,
      result: decision.result,
      publication,
    };
  }
}

function normalizeWorkerId(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : 'api-media-worker';
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function emptyRun(workerId: string, requestedAt: string): MediaWorkerRunResult {
  return {
    workerId,
    requestedAt,
    claimed: 0,
    succeeded: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
    published: 0,
    results: [],
  };
}

function skippedJob(job: MediaProcessingJob, reason: string): MediaWorkerJobResult {
  return {
    jobId: job.id,
    mediaId: job.mediaId,
    type: job.type,
    status: 'SKIPPED',
    attempts: job.attempts,
    reason,
  };
}

function summarizeRun(
  workerId: string,
  requestedAt: string,
  claimed: number,
  results: MediaWorkerJobResult[],
): MediaWorkerRunResult {
  return {
    workerId,
    requestedAt,
    claimed,
    succeeded: results.filter((result) => result.status === 'SUCCEEDED').length,
    retried: results.filter((result) => result.status === 'RETRY_QUEUED').length,
    failed: results.filter((result) => result.status === 'FAILED').length,
    skipped: results.filter((result) => result.status === 'SKIPPED').length,
    published: results.filter((result) => result.publication?.published).length,
    results,
  };
}
