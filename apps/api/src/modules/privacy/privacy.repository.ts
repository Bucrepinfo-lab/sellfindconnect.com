import type { DataExportRequest, DeletionRequest } from '@telpen/domain';

export const PRIVACY_REPOSITORY = Symbol('PRIVACY_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface PrivacyRepository {
  saveDeletion(request: DeletionRequest): RepositoryResult<void>;
  updateDeletion(request: DeletionRequest): RepositoryResult<void>;
  findDeletion(tenantId: string, userId: string): RepositoryResult<DeletionRequest | undefined>;
  listDueDeletions(now: string, input?: { tenantId?: string; limit?: number }): RepositoryResult<
    DeletionRequest[]
  >;
  saveExport(request: DataExportRequest): RepositoryResult<void>;
  findExport(tenantId: string, userId: string): RepositoryResult<DataExportRequest | undefined>;
}
