import type { MediaProcessingJobMetadata } from './media.adapters';

export const MEDIA_REVIEW_CASE_REPOSITORY = Symbol('MEDIA_REVIEW_CASE_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export const mediaReviewCaseStatuses = ['OPEN', 'RESOLVED', 'ESCALATED', 'DISMISSED'] as const;
export type MediaReviewCaseStatus = (typeof mediaReviewCaseStatuses)[number];

export const mediaReviewResolutions = [
  'CONFIRMED_BLOCK',
  'RESTORED',
  'ESCALATED',
  'DISMISSED',
] as const;
export type MediaReviewResolution = (typeof mediaReviewResolutions)[number];

export type MediaReviewCaseRecord = {
  id: string;
  tenantId: string;
  mediaId: string;
  ownerType: string;
  ownerId: string;
  sourceJobId?: string;
  jobType: string;
  severity: string;
  status: MediaReviewCaseStatus;
  reason: string;
  provider?: string;
  evidence?: MediaProcessingJobMetadata;
  openedAt: string;
  assignedTo?: string;
  assignedAt?: string;
  assignmentNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: MediaReviewResolution;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaReviewCaseInput = Omit<
  MediaReviewCaseRecord,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ListMediaReviewCasesInput = {
  status?: MediaReviewCaseStatus;
  tenantId?: string;
  severity?: string;
  assignedTo?: string;
  unassignedOnly?: boolean;
  limit?: number;
};

export type AssignMediaReviewCaseInput = {
  id: string;
  assignedTo: string;
  assignedAt?: string;
  assignmentNote?: string;
};

export type ResolveMediaReviewCaseInput = {
  id: string;
  resolvedBy: string;
  resolution: MediaReviewResolution;
  notes?: string;
  resolvedAt?: string;
};

export interface MediaReviewCaseRepository {
  createCase(input: CreateMediaReviewCaseInput): RepositoryResult<MediaReviewCaseRecord>;
  findCase(id: string): RepositoryResult<MediaReviewCaseRecord | undefined>;
  listCases(input?: ListMediaReviewCasesInput): RepositoryResult<MediaReviewCaseRecord[]>;
  assignCase(
    input: AssignMediaReviewCaseInput,
  ): RepositoryResult<MediaReviewCaseRecord | undefined>;
  resolveCase(
    input: ResolveMediaReviewCaseInput,
  ): RepositoryResult<MediaReviewCaseRecord | undefined>;
}

export function statusForResolution(resolution: MediaReviewResolution): MediaReviewCaseStatus {
  if (resolution === 'ESCALATED') {
    return 'ESCALATED';
  }

  if (resolution === 'DISMISSED') {
    return 'DISMISSED';
  }

  return 'RESOLVED';
}
