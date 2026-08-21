import type { SupplyChainRole } from './industries';
import { evaluateSafetyFields, type SafetyDecision } from './safety';
import type { RelationshipLink, SourceFinderRecord } from './source-finder';

export const relationshipKinds = [
  'SUPPLIES_TO',
  'BUYS_FROM',
  'PRODUCES',
  'DISTRIBUTES',
  'CONSUMES',
  'INSTALLS',
  'REPAIRS',
  'FINANCES',
  'CERTIFIES',
  'SHIPS',
  'WHOLESALES',
  'RETAILS',
  'PARTNERS_WITH',
] as const;

export type RelationshipKind = (typeof relationshipKinds)[number];

export const relationshipVisibilities = ['PUBLIC', 'PRIVATE', 'REQUEST_ONLY', 'VERIFIED'] as const;

export type RelationshipVisibility = (typeof relationshipVisibilities)[number];

export const relationshipClaimStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED'] as const;

export type RelationshipClaimStatus = (typeof relationshipClaimStatuses)[number];

export const relationshipClaimDecisions = ['APPROVED', 'REJECTED'] as const;

export type RelationshipClaimDecision = (typeof relationshipClaimDecisions)[number];

export type RelationshipClaimInput = {
  sourceLabel: string;
  sourceRole: SupplyChainRole;
  counterpartLabel: string;
  counterpartRole: SupplyChainRole;
  counterpartTenantId?: string;
  relationship: RelationshipKind;
  visibility: RelationshipVisibility;
  note?: string;
  acceptedTerms: true;
};

export type RelationshipClaim = {
  id: string;
  tenantId: string;
  sourceLabel: string;
  sourceRole: SupplyChainRole;
  counterpartLabel: string;
  counterpartRole: SupplyChainRole;
  counterpartTenantId?: string;
  relationship: RelationshipKind;
  visibility: RelationshipVisibility;
  status: RelationshipClaimStatus;
  note?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  decidedByUserId?: string;
  decidedAt?: string;
  decisionNote?: string;
  removedByUserId?: string;
  removedAt?: string;
  removalReason?: string;
};

export type RelationshipClaimActor = {
  tenantId: string;
  userId: string;
  now?: string;
  isModerator?: boolean;
};

export class RelationshipClaimError extends Error {
  readonly safety?: SafetyDecision;

  constructor(message: string, safety?: SafetyDecision) {
    super(message);
    this.name = 'RelationshipClaimError';
    this.safety = safety;
  }
}

const graphRelationshipByKind: Record<RelationshipKind, RelationshipLink['relationship']> = {
  SUPPLIES_TO: 'SUPPLIES',
  BUYS_FROM: 'BUYS_FROM',
  PRODUCES: 'SUPPLIES',
  DISTRIBUTES: 'DISTRIBUTES',
  CONSUMES: 'BUYS_FROM',
  INSTALLS: 'SERVES',
  REPAIRS: 'SERVES',
  FINANCES: 'FINANCES',
  CERTIFIES: 'CERTIFIES',
  SHIPS: 'SERVES',
  WHOLESALES: 'DISTRIBUTES',
  RETAILS: 'DISTRIBUTES',
  PARTNERS_WITH: 'SERVES',
};

export function createRelationshipClaim(
  input: RelationshipClaimInput,
  actor: RelationshipClaimActor,
  id: string,
): RelationshipClaim {
  if (!input.acceptedTerms) {
    throw new RelationshipClaimError(
      'Current terms acceptance is required before creating a relationship claim.',
    );
  }

  const sourceLabel = normalizeLabel(input.sourceLabel);
  const counterpartLabel = normalizeLabel(input.counterpartLabel);
  const note = input.note?.trim() || undefined;
  const counterpartTenantId = input.counterpartTenantId?.trim() || undefined;

  if (!sourceLabel || sourceLabel.length < 2) {
    throw new RelationshipClaimError('A source business name is required.');
  }

  if (!counterpartLabel || counterpartLabel.length < 2) {
    throw new RelationshipClaimError('A counterpart business name is required.');
  }

  if (labelsMatch(sourceLabel, counterpartLabel) && counterpartTenantId === actor.tenantId) {
    throw new RelationshipClaimError('A tenant cannot claim a relationship with itself.');
  }

  if (input.visibility !== 'PRIVATE' && !counterpartTenantId && !actor.isModerator) {
    throw new RelationshipClaimError(
      'Public, request-only, and verified relationship claims need a counterpart tenant or moderator review.',
    );
  }

  const safety = evaluateSafetyFields({
    sourceLabel,
    counterpartLabel,
    note,
    relationship: input.relationship,
    visibility: input.visibility,
  });
  if (!safety.allowed) {
    throw new RelationshipClaimError(
      'Relationship claim matches a zero-tolerance blocked category.',
      safety,
    );
  }

  const now = actor.now ?? new Date().toISOString();
  const privateClaim = input.visibility === 'PRIVATE';

  return {
    id,
    tenantId: actor.tenantId,
    sourceLabel,
    sourceRole: input.sourceRole,
    counterpartLabel,
    counterpartRole: input.counterpartRole,
    counterpartTenantId,
    relationship: input.relationship,
    visibility: input.visibility,
    status: privateClaim ? 'APPROVED' : 'PENDING',
    note,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
    decidedByUserId: privateClaim ? actor.userId : undefined,
    decidedAt: privateClaim ? now : undefined,
  };
}

export function decideRelationshipClaim(
  claim: RelationshipClaim,
  decision: RelationshipClaimDecision,
  actor: RelationshipClaimActor,
  decisionNote?: string,
): RelationshipClaim {
  assertMutableClaim(claim);
  const note = decisionNote?.trim() || undefined;
  const safety = evaluateSafetyFields({ decisionNote: note });
  if (!safety.allowed) {
    throw new RelationshipClaimError(
      'Relationship decision note matches a zero-tolerance blocked category.',
      safety,
    );
  }

  const isCounterpart = Boolean(
    claim.counterpartTenantId && claim.counterpartTenantId === actor.tenantId,
  );
  if (!isCounterpart && !actor.isModerator) {
    throw new RelationshipClaimError(
      'Only the linked counterpart or a moderator can approve or reject this claim.',
    );
  }

  const now = actor.now ?? new Date().toISOString();
  const verified =
    decision === 'APPROVED' && (claim.visibility === 'VERIFIED' || actor.isModerator);

  return {
    ...claim,
    status: decision,
    visibility: verified ? 'VERIFIED' : claim.visibility,
    decidedByUserId: actor.userId,
    decidedAt: now,
    decisionNote: note,
    updatedAt: now,
  };
}

export function removeRelationshipClaim(
  claim: RelationshipClaim,
  actor: RelationshipClaimActor,
  removalReason: string,
): RelationshipClaim {
  if (claim.status === 'REMOVED') {
    throw new RelationshipClaimError('Relationship claim has already been removed.');
  }

  const reason = removalReason.trim();
  if (reason.length < 4) {
    throw new RelationshipClaimError('A removal reason is required.');
  }

  const isOwner = claim.tenantId === actor.tenantId;
  const isCounterpart = Boolean(
    claim.counterpartTenantId && claim.counterpartTenantId === actor.tenantId,
  );
  if (!isOwner && !isCounterpart && !actor.isModerator) {
    throw new RelationshipClaimError(
      'Only the claiming tenant, linked counterpart, or a moderator can remove this claim.',
    );
  }

  const safety = evaluateSafetyFields({ removalReason: reason });
  if (!safety.allowed) {
    throw new RelationshipClaimError(
      'Relationship removal reason matches a zero-tolerance blocked category.',
      safety,
    );
  }

  const now = actor.now ?? new Date().toISOString();
  return {
    ...claim,
    status: 'REMOVED',
    removedByUserId: actor.userId,
    removedAt: now,
    removalReason: reason,
    updatedAt: now,
  };
}

export function isPublicGraphClaim(claim: RelationshipClaim): boolean {
  return (
    claim.status === 'APPROVED' &&
    (claim.visibility === 'PUBLIC' || claim.visibility === 'VERIFIED')
  );
}

export function isTenantVisibleClaim(claim: RelationshipClaim, tenantId: string): boolean {
  if (claim.status === 'REMOVED') {
    return false;
  }

  const isOwner = claim.tenantId === tenantId;
  const isCounterpart = claim.counterpartTenantId === tenantId;
  if (!isOwner && !isCounterpart) {
    return false;
  }

  if (claim.visibility === 'PRIVATE') {
    return isOwner;
  }

  return true;
}

export function toSourceFinderRelationshipLink(
  claim: RelationshipClaim,
  perspective: 'SOURCE' | 'COUNTERPART' = 'SOURCE',
): RelationshipLink {
  const counterpart = perspective === 'SOURCE';
  return {
    id: claim.id,
    label: counterpart ? claim.counterpartLabel : claim.sourceLabel,
    role: counterpart ? claim.counterpartRole : claim.sourceRole,
    relationship: graphRelationshipByKind[claim.relationship],
    confidence: claim.visibility === 'VERIFIED' ? 0.96 : 0.84,
  };
}

export function attachApprovedRelationshipClaims<T extends SourceFinderRecord>(
  records: T[],
  claims: RelationshipClaim[],
): T[] {
  const graphClaims = claims.filter(isPublicGraphClaim);
  if (graphClaims.length === 0) {
    return records;
  }

  return records.map((record) => {
    const extraLinks = graphClaims.flatMap((claim) => {
      if (labelsMatch(record.name, claim.sourceLabel)) {
        return [toSourceFinderRelationshipLink(claim, 'SOURCE')];
      }
      if (labelsMatch(record.name, claim.counterpartLabel)) {
        return [toSourceFinderRelationshipLink(claim, 'COUNTERPART')];
      }
      return [];
    });

    if (extraLinks.length === 0) {
      return record;
    }

    const existingIds = new Set(record.relatedLinks.map((link) => link.id));
    const relatedLinks = [
      ...record.relatedLinks,
      ...extraLinks.filter((link) => !existingIds.has(link.id)),
    ];
    return { ...record, relatedLinks };
  });
}

function assertMutableClaim(claim: RelationshipClaim): void {
  if (claim.status !== 'PENDING') {
    throw new RelationshipClaimError('Only pending relationship claims can be decided.');
  }
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function labelsMatch(left: string, right: string): boolean {
  return normalizeLabel(left).toLocaleLowerCase() === normalizeLabel(right).toLocaleLowerCase();
}
