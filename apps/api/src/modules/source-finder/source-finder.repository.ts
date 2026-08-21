import type {
  SavedSourceFinderSearch,
  SourceFinderOpportunityAlert,
} from '@telpen/domain';

export const SOURCE_FINDER_REPOSITORY = Symbol('SOURCE_FINDER_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface SourceFinderRepository {
  createSavedSearch(search: SavedSourceFinderSearch): RepositoryResult<void>;
  updateSavedSearch(search: SavedSourceFinderSearch): RepositoryResult<void>;
  findSavedSearch(
    tenantId: string,
    id: string,
  ): RepositoryResult<SavedSourceFinderSearch | undefined>;
  listSavedSearches(tenantId: string): RepositoryResult<SavedSourceFinderSearch[]>;
  listAllSavedSearches(): RepositoryResult<SavedSourceFinderSearch[]>;
  createOpportunityAlert(alert: SourceFinderOpportunityAlert): RepositoryResult<void>;
  findOpportunityAlert(
    tenantId: string,
    savedSearchId: string,
    sourceRecordId: string,
  ): RepositoryResult<SourceFinderOpportunityAlert | undefined>;
  listOpportunityAlerts(tenantId: string): RepositoryResult<SourceFinderOpportunityAlert[]>;
}
