import { describe, expect, it } from 'vitest';

import {
  attachApprovedRelationshipClaims,
  createRelationshipClaim,
  decideRelationshipClaim,
  isPublicGraphClaim,
  isTenantVisibleClaim,
  removeRelationshipClaim,
  toSourceFinderRelationshipLink,
} from './relationships';
import { pilotSourceFinderRecords } from './source-finder';

const owner = {
  tenantId: 'tenant-owner',
  userId: 'user-owner',
  now: '2026-08-21T12:00:00.000Z',
};

const counterpart = {
  tenantId: 'tenant-counter',
  userId: 'user-counter',
  now: '2026-08-21T12:05:00.000Z',
};

const moderator = {
  tenantId: 'platform',
  userId: 'moderator-1',
  now: '2026-08-21T12:10:00.000Z',
  isModerator: true,
};

function publicClaimInput() {
  return {
    sourceLabel: 'Nairobi Fresh Produce Cooperative',
    sourceRole: 'SUPPLIER' as const,
    counterpartLabel: 'Rift Valley Cold Chain Logistics',
    counterpartRole: 'LOGISTICS_PROVIDER' as const,
    counterpartTenantId: counterpart.tenantId,
    relationship: 'SHIPS' as const,
    visibility: 'PUBLIC' as const,
    note: 'Weekly cold-chain delivery for hotel produce.',
    acceptedTerms: true as const,
  };
}

describe('relationship claims', () => {
  it('creates a pending public claim and keeps it off the public graph until approved', () => {
    const claim = createRelationshipClaim(publicClaimInput(), owner, 'claim-1');

    expect(claim.status).toBe('PENDING');
    expect(isPublicGraphClaim(claim)).toBe(false);
    expect(isTenantVisibleClaim(claim, owner.tenantId)).toBe(true);
  });

  it('auto-approves private claims without exposing them on the public graph', () => {
    const claim = createRelationshipClaim(
      {
        ...publicClaimInput(),
        visibility: 'PRIVATE',
        counterpartTenantId: undefined,
      },
      owner,
      'claim-private',
    );

    expect(claim.status).toBe('APPROVED');
    expect(isPublicGraphClaim(claim)).toBe(false);
    expect(isTenantVisibleClaim(claim, counterpart.tenantId)).toBe(false);
  });

  it('lets the counterpart approve a public claim onto the Source Finder graph', () => {
    const pending = createRelationshipClaim(publicClaimInput(), owner, 'claim-2');
    const approved = decideRelationshipClaim(pending, 'APPROVED', counterpart);

    expect(approved.status).toBe('APPROVED');
    expect(isPublicGraphClaim(approved)).toBe(true);

    const attached = attachApprovedRelationshipClaims(pilotSourceFinderRecords, [approved]);
    const source = attached.find((record) => record.id === 'r1');
    const logistics = attached.find((record) => record.id === 'r2');

    expect(source?.relatedLinks.some((link) => link.id === 'claim-2')).toBe(true);
    expect(logistics?.relatedLinks.some((link) => link.label === pending.sourceLabel)).toBe(true);
    expect(toSourceFinderRelationshipLink(approved).relationship).toBe('SERVES');
  });

  it('blocks prohibited relationship notes and requires terms', () => {
    expect(() =>
      createRelationshipClaim(
        {
          ...publicClaimInput(),
          note: 'Also arrange ammunition transport.',
        },
        owner,
        'claim-blocked',
      ),
    ).toThrow(/zero-tolerance/);

    expect(() =>
      createRelationshipClaim(
        { ...publicClaimInput(), acceptedTerms: false as true },
        owner,
        'claim-terms',
      ),
    ).toThrow(/terms acceptance/);
  });

  it('lets a moderator remove a fraudulent approved claim', () => {
    const pending = createRelationshipClaim(publicClaimInput(), owner, 'claim-3');
    const approved = decideRelationshipClaim(pending, 'APPROVED', counterpart);
    const removed = removeRelationshipClaim(approved, moderator, 'Impersonation of the logistics partner.');

    expect(removed.status).toBe('REMOVED');
    expect(isPublicGraphClaim(removed)).toBe(false);
    expect(attachApprovedRelationshipClaims(pilotSourceFinderRecords, [removed])[0]?.relatedLinks).toEqual(
      pilotSourceFinderRecords[0]?.relatedLinks,
    );
  });

  it('rejects public claims that have no counterpart unless a moderator creates them', () => {
    expect(() =>
      createRelationshipClaim(
        { ...publicClaimInput(), counterpartTenantId: undefined },
        owner,
        'claim-orphan',
      ),
    ).toThrow(/counterpart tenant or moderator/);

    const moderated = createRelationshipClaim(
      { ...publicClaimInput(), counterpartTenantId: undefined, visibility: 'VERIFIED' },
      moderator,
      'claim-mod',
    );
    expect(moderated.status).toBe('PENDING');
    expect(moderated.visibility).toBe('VERIFIED');
  });
});
