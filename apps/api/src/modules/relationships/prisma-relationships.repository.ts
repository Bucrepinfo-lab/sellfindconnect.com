import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type RelationshipClaim as PrismaRelationshipClaim } from '@prisma/client';
import {
  relationshipClaimStatuses,
  relationshipKinds,
  relationshipVisibilities,
  supplyChainRoles,
  type RelationshipClaim,
  type RelationshipClaimStatus,
  type RelationshipKind,
  type RelationshipVisibility,
  type SupplyChainRole,
} from '@telpen/domain';

import type { RelationshipsRepository } from './relationships.repository';

export function createRelationshipsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaRelationshipsRepository implements RelationshipsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(claim: RelationshipClaim): Promise<void> {
    await this.prisma.relationshipClaim.create({ data: this.toPrisma(claim) });
  }

  async update(claim: RelationshipClaim): Promise<void> {
    const data = this.toPrisma(claim);
    await this.prisma.relationshipClaim.update({
      where: { id: claim.id },
      data: {
        status: data.status,
        visibility: data.visibility,
        note: data.note,
        decidedByUserId: data.decidedByUserId,
        decidedAt: data.decidedAt,
        decisionNote: data.decisionNote,
        removedByUserId: data.removedByUserId,
        removedAt: data.removedAt,
        removalReason: data.removalReason,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<RelationshipClaim | undefined> {
    const record = await this.prisma.relationshipClaim.findUnique({ where: { id } });
    return record ? this.fromPrisma(record) : undefined;
  }

  async listByTenant(tenantId: string): Promise<RelationshipClaim[]> {
    const records = await this.prisma.relationshipClaim.findMany({
      where: {
        OR: [{ tenantId }, { counterpartTenantId: tenantId }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listInbox(tenantId: string): Promise<RelationshipClaim[]> {
    const records = await this.prisma.relationshipClaim.findMany({
      where: { counterpartTenantId: tenantId, status: 'PENDING' },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listGraphClaims(): Promise<RelationshipClaim[]> {
    const records = await this.prisma.relationshipClaim.findMany({
      where: {
        status: 'APPROVED',
        visibility: { in: ['PUBLIC', 'VERIFIED'] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listAll(): Promise<RelationshipClaim[]> {
    const records = await this.prisma.relationshipClaim.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => this.fromPrisma(record));
  }

  private toPrisma(claim: RelationshipClaim) {
    return {
      id: claim.id,
      tenantId: claim.tenantId,
      sourceLabel: claim.sourceLabel,
      sourceRole: claim.sourceRole,
      counterpartLabel: claim.counterpartLabel,
      counterpartRole: claim.counterpartRole,
      counterpartTenantId: claim.counterpartTenantId ?? null,
      relationship: claim.relationship,
      visibility: claim.visibility,
      status: claim.status,
      note: claim.note ?? null,
      createdByUserId: claim.createdByUserId,
      createdAt: new Date(claim.createdAt),
      updatedAt: new Date(claim.updatedAt),
      decidedByUserId: claim.decidedByUserId ?? null,
      decidedAt: claim.decidedAt ? new Date(claim.decidedAt) : null,
      decisionNote: claim.decisionNote ?? null,
      removedByUserId: claim.removedByUserId ?? null,
      removedAt: claim.removedAt ? new Date(claim.removedAt) : null,
      removalReason: claim.removalReason ?? null,
    };
  }

  private fromPrisma(record: PrismaRelationshipClaim): RelationshipClaim {
    return {
      id: record.id,
      tenantId: record.tenantId,
      sourceLabel: record.sourceLabel,
      sourceRole: this.role(record.sourceRole),
      counterpartLabel: record.counterpartLabel,
      counterpartRole: this.role(record.counterpartRole),
      counterpartTenantId: record.counterpartTenantId ?? undefined,
      relationship: relationshipKinds.includes(record.relationship as RelationshipKind)
        ? (record.relationship as RelationshipKind)
        : 'PARTNERS_WITH',
      visibility: relationshipVisibilities.includes(record.visibility as RelationshipVisibility)
        ? (record.visibility as RelationshipVisibility)
        : 'PRIVATE',
      status: relationshipClaimStatuses.includes(record.status as RelationshipClaimStatus)
        ? (record.status as RelationshipClaimStatus)
        : 'PENDING',
      note: record.note ?? undefined,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      decidedByUserId: record.decidedByUserId ?? undefined,
      decidedAt: record.decidedAt?.toISOString(),
      decisionNote: record.decisionNote ?? undefined,
      removedByUserId: record.removedByUserId ?? undefined,
      removedAt: record.removedAt?.toISOString(),
      removalReason: record.removalReason ?? undefined,
    };
  }

  private role(value: string): SupplyChainRole {
    return supplyChainRoles.includes(value as SupplyChainRole)
      ? (value as SupplyChainRole)
      : 'SUPPLIER';
  }
}
