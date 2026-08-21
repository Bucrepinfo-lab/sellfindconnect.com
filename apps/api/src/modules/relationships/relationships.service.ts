import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  createRelationshipClaim,
  decideRelationshipClaim,
  isPublicGraphClaim,
  isTenantVisibleClaim,
  RelationshipClaimError,
  removeRelationshipClaim,
  type RelationshipClaim,
  type RelationshipClaimActor,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import type {
  CreateRelationshipClaimDto,
  DecideRelationshipClaimDto,
  RemoveRelationshipClaimDto,
} from './dto/relationships.dto';
import { InMemoryRelationshipsRepository } from './in-memory-relationships.repository';
import { RELATIONSHIPS_REPOSITORY, type RelationshipsRepository } from './relationships.repository';

@Injectable()
export class RelationshipsService {
  constructor(
    @Optional()
    @Inject(RELATIONSHIPS_REPOSITORY)
    private readonly repository: RelationshipsRepository = new InMemoryRelationshipsRepository(),
    @Optional() private readonly auth?: AuthService,
  ) {}

  async createClaim(
    tenantId: string,
    userId: string,
    input: CreateRelationshipClaimDto,
  ): Promise<RelationshipClaim> {
    const claim = this.runDomain(() =>
      createRelationshipClaim(input, { tenantId, userId }, randomUUID()),
    );
    await this.repository.create(claim);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId: userId,
      action: 'RELATIONSHIP_CLAIM_CREATED',
      entityType: 'RELATIONSHIP_CLAIM',
      entityId: claim.id,
      metadata: {
        relationship: claim.relationship,
        visibility: claim.visibility,
        status: claim.status,
      },
    });
    return claim;
  }

  async listClaims(tenantId: string): Promise<RelationshipClaim[]> {
    const claims = await this.repository.listByTenant(tenantId);
    return claims.filter((claim) => isTenantVisibleClaim(claim, tenantId));
  }

  async listInbox(tenantId: string): Promise<RelationshipClaim[]> {
    return this.repository.listInbox(tenantId);
  }

  async listGraph(): Promise<RelationshipClaim[]> {
    return this.repository.listGraphClaims();
  }

  async listAllForModeration(): Promise<RelationshipClaim[]> {
    return this.repository.listAll();
  }

  async decideClaim(
    tenantId: string,
    userId: string,
    id: string,
    input: DecideRelationshipClaimDto,
    isModerator = false,
  ): Promise<RelationshipClaim> {
    const existing = await this.requireClaim(id);
    const updated = this.runDomain(() =>
      decideRelationshipClaim(existing, input.decision, this.actor(tenantId, userId, isModerator), input.decisionNote),
    );
    await this.repository.update(updated);
    await this.auth?.recordTenantAudit({
      tenantId: existing.tenantId,
      actorUserId: userId,
      action: `RELATIONSHIP_CLAIM_${input.decision}`,
      entityType: 'RELATIONSHIP_CLAIM',
      entityId: updated.id,
      metadata: {
        visibility: updated.visibility,
        status: updated.status,
      },
    });
    return updated;
  }

  async removeClaim(
    tenantId: string,
    userId: string,
    id: string,
    input: RemoveRelationshipClaimDto,
    isModerator = false,
  ): Promise<RelationshipClaim> {
    const existing = await this.requireClaim(id);
    const updated = this.runDomain(() =>
      removeRelationshipClaim(existing, this.actor(tenantId, userId, isModerator), input.reason),
    );
    await this.repository.update(updated);
    await this.auth?.recordTenantAudit({
      tenantId: existing.tenantId,
      actorUserId: userId,
      action: 'RELATIONSHIP_CLAIM_REMOVED',
      entityType: 'RELATIONSHIP_CLAIM',
      entityId: updated.id,
      metadata: {
        reason: updated.removalReason,
        moderator: isModerator,
      },
    });
    return updated;
  }

  isGraphVisible(claim: RelationshipClaim): boolean {
    return isPublicGraphClaim(claim);
  }

  private actor(tenantId: string, userId: string, isModerator: boolean): RelationshipClaimActor {
    return { tenantId, userId, isModerator };
  }

  private async requireClaim(id: string): Promise<RelationshipClaim> {
    const claim = await this.repository.findById(id);
    if (!claim) {
      throw new NotFoundException('Relationship claim not found.');
    }
    return claim;
  }

  private runDomain<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof RelationshipClaimError) {
        if (error.message.includes('Only the')) {
          throw new ForbiddenException({ message: error.message, safety: error.safety });
        }
        throw new UnprocessableEntityException({ message: error.message, safety: error.safety });
      }
      throw error;
    }
  }
}
