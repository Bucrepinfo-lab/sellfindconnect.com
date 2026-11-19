import { describe, expect, it, vi } from 'vitest';

import type { AuthService } from '../auth/auth.service';
import type { FinanceService } from '../finance/finance.service';
import { InMemoryPaymentsRepository } from './in-memory-payments.repository';
import { PaymentsService } from './payments.service';

function approvedFinance(): FinanceService {
  return {
    getPaidLaunchReadiness: async () => ({
      countryCode: 'KE',
      allowed: true,
      status: 'APPROVED',
      reason: null,
    }),
  } as unknown as FinanceService;
}

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('PaymentsService product audit', () => {
  it('records checkout evidence without phone numbers or payout reasons', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const repository = new InMemoryPaymentsRepository();
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
        }),
        hasCurrentTermsAcceptance: async () => true,
        recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
          audits.push(record);
        },
      } as unknown as AuthService,
      repository,
      {
        mobileCheckout: async () => ({
          ok: true,
          transactionId: 'at-txn-1',
          raw: { phone: '+254700000001' },
        }),
        mobileB2C: async () => ({ ok: true, raw: {} }),
      },
      undefined,
      approvedFinance(),
    );

    const result = await service.requestCheckout('session-token', {
      amount: 1500,
      reason: 'Ad campaign top-up for owner@example.com',
    });

    expect(result).toMatchObject({ ok: true, txnId: expect.any(String) });
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'PAYMENT_CHECKOUT_REQUESTED',
        entityType: 'PAYMENT',
        tenantId,
        metadata: expect.objectContaining({
          kind: 'CHECKOUT',
          amount: 1500,
          ok: true,
        }),
      }),
    ]);
    expect(JSON.stringify(audits)).not.toContain('+254700000001');
    expect(JSON.stringify(audits)).not.toContain('owner@example.com');
    expect(JSON.stringify(audits)).not.toContain('Ad campaign');
  });

  it('refuses checkout when the login phone is missing', async () => {
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: {},
        }),
        recordTenantAudit: async () => undefined,
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
    );

    await expect(service.requestCheckout('session-token', { amount: 1500 })).resolves.toEqual({
      ok: false,
      reason: 'no_phone',
    });
  });

  it('refuses checkout when the login phone was never verified', async () => {
    const mobileCheckout = vi.fn();
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001' },
        }),
        recordTenantAudit: async () => undefined,
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
      { mobileCheckout } as never,
    );

    await expect(service.requestCheckout('session-token', { amount: 1500 })).resolves.toEqual({
      ok: false,
      reason: 'no_phone',
    });
    expect(mobileCheckout).not.toHaveBeenCalled();
  });

  it('refuses checkout when the Kenya tax profile is not approved', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
        }),
        recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
          audits.push(record);
        },
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
    );

    await expect(service.requestCheckout('session-token', { amount: 1500 })).resolves.toEqual({
      ok: false,
      reason: 'tax_profile',
    });
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'PAYMENT_CHECKOUT_BLOCKED',
        metadata: expect.objectContaining({ reason: 'tax_profile', ok: false }),
      }),
    ]);
    expect(JSON.stringify(audits)).not.toContain('+254700000001');
  });

  it('refuses checkout when stored terms acceptance is stale', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
        }),
        hasCurrentTermsAcceptance: async () => false,
        recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
          audits.push(record);
        },
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
      undefined,
      undefined,
      approvedFinance(),
    );

    await expect(service.requestCheckout('session-token', { amount: 1500 })).resolves.toEqual({
      ok: false,
      reason: 'terms',
    });
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'PAYMENT_CHECKOUT_BLOCKED',
        metadata: expect.objectContaining({ reason: 'terms', ok: false }),
      }),
    ]);
    expect(JSON.stringify(audits)).not.toContain('+254700000001');
  });

  it('pays out only to a member of the same tenant', async () => {
    const calls: string[] = [];
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'owner-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
        }),
        hasCurrentTermsAcceptance: async () => true,
        recordTenantAudit: async () => undefined,
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
      {
        mobileCheckout: async () => ({ ok: true, transactionId: null, raw: {} }),
        mobileB2C: async () => {
          calls.push('b2c');
          return { ok: true, raw: {} };
        },
      },
      {
        findMembershipForUserAndTenant: async (userId: string, scopeTenantId: string) =>
          userId === 'member-1' && scopeTenantId === tenantId
            ? { userId, tenantId: scopeTenantId }
            : undefined,
        findUserById: async (userId: string) =>
          userId === 'member-1' ? { id: userId, phone: '+254700000002' } : { id: userId, phone: '+254799999999' },
      } as never,
    );

    await expect(
      service.requestPayout('session-token', { toUserId: 'outsider', amount: 500 }),
    ).resolves.toEqual({ ok: false, reason: 'forbidden' });
    expect(calls).toEqual([]);

    await expect(
      service.requestPayout('session-token', { toUserId: 'member-1', amount: 500 }),
    ).resolves.toMatchObject({ ok: true });
    expect(calls).toEqual(['b2c']);
  });
});

describe('PaymentsService subscription checkout', () => {
  function subscriptionService(countryCode = 'KE') {
    const charges: number[] = [];
    const plans: string[] = [];
    const audits: string[] = [];
    const repository = new InMemoryPaymentsRepository();
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
          tenant: { countryCode, trialStartedAt: '2026-11-01T00:00:00.000Z', status: 'TRIAL_ACTIVE' },
        }),
        hasCurrentTermsAcceptance: async () => true,
        recordTenantAudit: async (record: { action: string }) => {
          audits.push(record.action);
        },
        setTenantPlan: async (_tenantId: string, plan: string) => {
          plans.push(plan);
        },
      } as unknown as AuthService,
      repository,
      {
        mobileCheckout: async (input: { amount: number }) => {
          charges.push(input.amount);
          return { ok: true, transactionId: `at-sub-${charges.length}`, raw: {} };
        },
        mobileB2C: async () => ({ ok: true, raw: {} }),
      },
      undefined,
      approvedFinance(),
    );
    return { service, repository, charges, plans, audits };
  }

  it('prices a plan from the price list and ignores the client amount', async () => {
    const { service, repository, charges } = subscriptionService();

    const result = await service.requestCheckout('session-token', { plan: 'PRO', amount: 1 });
    expect(result).toMatchObject({ ok: true });
    expect(charges).toEqual([1499]);
    const txn = await repository.findPaymentTxnByProviderTxnId('at-sub-1');
    expect(txn?.metadata).toEqual({ purpose: 'SUBSCRIPTION', plan: 'PRO', period: 'MONTH' });

    await service.requestCheckout('session-token', { plan: 'BASIC', period: 'YEAR' });
    expect(charges).toEqual([1499, 4990]);
  });

  it('switches the plan once, only after the provider confirms success', async () => {
    const previous = process.env.AT_PAYMENTS_CALLBACK_SECRET;
    process.env.AT_PAYMENTS_CALLBACK_SECRET = 'cb-secret';
    try {
      const { service, plans, audits } = subscriptionService();
      await service.requestCheckout('session-token', { plan: 'PRO' });

      await service.reconcileCallback('cb-secret', { transactionId: 'at-sub-1', status: 'Pending' });
      expect(plans).toEqual([]);
      await service.reconcileCallback('cb-secret', { transactionId: 'at-sub-1', status: 'Success' });
      await service.reconcileCallback('cb-secret', { transactionId: 'at-sub-1', status: 'Success' });
      expect(plans).toEqual(['PRO']);
      expect(audits.filter((action) => action === 'SUBSCRIPTION_PLAN_CHANGED')).toHaveLength(1);
    } finally {
      process.env.AT_PAYMENTS_CALLBACK_SECRET = previous;
    }
  });

  it('a failed payment or a plain top-up never changes the plan', async () => {
    const previous = process.env.AT_PAYMENTS_CALLBACK_SECRET;
    process.env.AT_PAYMENTS_CALLBACK_SECRET = 'cb-secret';
    try {
      const { service, plans } = subscriptionService();
      await service.requestCheckout('session-token', { plan: 'PRO' });
      await service.reconcileCallback('cb-secret', { transactionId: 'at-sub-1', status: 'Failed' });
      await service.requestCheckout('session-token', { amount: 1500 });
      await service.reconcileCallback('cb-secret', { transactionId: 'at-sub-2', status: 'Success' });
      expect(plans).toEqual([]);
    } finally {
      process.env.AT_PAYMENTS_CALLBACK_SECRET = previous;
    }
  });

  it('refuses a plan in a country without an approved price', async () => {
    const { service, charges } = subscriptionService('UG');
    await expect(service.requestCheckout('session-token', { plan: 'BASIC' })).resolves.toEqual({
      ok: false,
      reason: 'no_price',
    });
    expect(charges).toEqual([]);
  });

  it('lists both plans with month and year prices for a Kenyan tenant', async () => {
    const { service } = subscriptionService();
    const options = await service.getSubscriptionOptions('session-token');
    expect(options).toMatchObject({ currentPlan: 'BASIC', currencyCode: 'KES', payable: true });
    expect(options.plans.map((plan) => [plan.plan, plan.monthly, plan.yearly, plan.maxMediaPerListing])).toEqual([
      ['BASIC', 499, 4990, 10],
      ['PRO', 1499, 14990, 20],
    ]);
  });
});
