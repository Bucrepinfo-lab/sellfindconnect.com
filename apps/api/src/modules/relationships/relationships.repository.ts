import type { RelationshipClaim } from '@telpen/domain';

export const RELATIONSHIPS_REPOSITORY = Symbol('RELATIONSHIPS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface RelationshipsRepository {
  create(claim: RelationshipClaim): RepositoryResult<void>;
  update(claim: RelationshipClaim): RepositoryResult<void>;
  findById(id: string): RepositoryResult<RelationshipClaim | undefined>;
  listByTenant(tenantId: string): RepositoryResult<RelationshipClaim[]>;
  listInbox(tenantId: string): RepositoryResult<RelationshipClaim[]>;
  listGraphClaims(): RepositoryResult<RelationshipClaim[]>;
  listAll(): RepositoryResult<RelationshipClaim[]>;
}
