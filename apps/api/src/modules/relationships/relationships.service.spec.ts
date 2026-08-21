import { describe, expect, it } from 'vitest';

import { RelationshipsService } from './relationships.service';

const ownerTenant = '11111111-1111-4111-8111-111111111111';
const counterpartTenant = '22222222-2222-4222-8222-222222222222';

function claimInput() {
  return {
    sourceLabel: 'Nairobi Fresh Produce Cooperative',
    sourceRole: 'SUPPLIER' as const,
    counterpartLabel: 'Rift Valley Cold Chain Logistics',
    counterpartRole: 'LOGISTICS_PROVIDER' as const,
    counterpartTenantId: counterpartTenant,
    relationship: 'SHIPS' as const,
    visibility: 'PUBLIC' as const,
    note: 'Weekly cold-chain delivery for hotel produce.',
    acceptedTerms: true as const,
  };
}

describe('RelationshipsService', () => {
  it('creates a pending public claim and exposes it in the counterpart inbox', async () => {
    const service = new RelationshipsService();
    const claim = await service.createClaim(ownerTenant, 'owner-1', claimInput());

    expect(claim.status).toBe('PENDING');
    expect(await service.listInbox(counterpartTenant)).toHaveLength(1);
    expect(await service.listGraph()).toHaveLength(0);
  });

  it('requires terms and blocks prohibited relationship notes', async () => {
    const service = new RelationshipsService();

    await expect(
      service.createClaim(ownerTenant, 'owner-1', {
        ...claimInput(),
        acceptedTerms: false as true,
      }),
    ).rejects.toThrow();

    await expect(
      service.createClaim(ownerTenant, 'owner-1', {
        ...claimInput(),
        note: 'Include ammunition in the weekly delivery.',
      }),
    ).rejects.toThrow();
  });

  it('lets the counterpart approve a claim onto the public graph', async () => {
    const service = new RelationshipsService();
    const claim = await service.createClaim(ownerTenant, 'owner-1', claimInput());
    const approved = await service.decideClaim(counterpartTenant, 'counter-1', claim.id, {
      decision: 'APPROVED',
      decisionNote: 'Confirmed weekly produce deliveries.',
    });

    expect(approved.status).toBe('APPROVED');
    expect(service.isGraphVisible(approved)).toBe(true);
    expect(await service.listGraph()).toHaveLength(1);
  });

  it('prevents the claiming tenant from self-approving a public claim', async () => {
    const service = new RelationshipsService();
    const claim = await service.createClaim(ownerTenant, 'owner-1', claimInput());

    await expect(
      service.decideClaim(ownerTenant, 'owner-1', claim.id, { decision: 'APPROVED' }),
    ).rejects.toThrow();
  });

  it('lets a moderator remove a fraudulent approved claim', async () => {
    const service = new RelationshipsService();
    const claim = await service.createClaim(ownerTenant, 'owner-1', claimInput());
    await service.decideClaim(counterpartTenant, 'counter-1', claim.id, { decision: 'APPROVED' });
    const removed = await service.removeClaim(
      'platform',
      'moderator-1',
      claim.id,
      { reason: 'Impersonation of the logistics partner.' },
      true,
    );

    expect(removed.status).toBe('REMOVED');
    expect(await service.listGraph()).toHaveLength(0);
  });
});
