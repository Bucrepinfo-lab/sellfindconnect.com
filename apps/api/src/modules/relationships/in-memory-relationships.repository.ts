import { Injectable } from '@nestjs/common';
import { isPublicGraphClaim, type RelationshipClaim } from '@telpen/domain';

import type { RelationshipsRepository } from './relationships.repository';

@Injectable()
export class InMemoryRelationshipsRepository implements RelationshipsRepository {
  private readonly claims = new Map<string, RelationshipClaim>();

  create(claim: RelationshipClaim): void {
    this.claims.set(claim.id, claim);
  }

  update(claim: RelationshipClaim): void {
    this.claims.set(claim.id, claim);
  }

  findById(id: string): RelationshipClaim | undefined {
    return this.claims.get(id);
  }

  listByTenant(tenantId: string): RelationshipClaim[] {
    return this.sort(
      Array.from(this.claims.values()).filter(
        (claim) => claim.tenantId === tenantId || claim.counterpartTenantId === tenantId,
      ),
    );
  }

  listInbox(tenantId: string): RelationshipClaim[] {
    return this.sort(
      Array.from(this.claims.values()).filter(
        (claim) => claim.counterpartTenantId === tenantId && claim.status === 'PENDING',
      ),
    );
  }

  listGraphClaims(): RelationshipClaim[] {
    return this.sort(Array.from(this.claims.values()).filter(isPublicGraphClaim));
  }

  listAll(): RelationshipClaim[] {
    return this.sort(Array.from(this.claims.values()));
  }

  private sort(claims: RelationshipClaim[]): RelationshipClaim[] {
    return claims.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}
