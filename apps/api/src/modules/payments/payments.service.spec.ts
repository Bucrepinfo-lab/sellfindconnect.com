import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FOUNDING_SUBSCRIPTION_PRICES } from '@telpen/domain';

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

  it('refuses M-Pesa checkout when VAT-registered and the Kenya tax profile is not approved', async () => {
    // Owner 19/11/26: the approved tax profile is required once the company is VAT-registered.
    vi.stubEnv('SELLER_VAT_REGISTERED', 'true');
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
    vi.unstubAllEnvs();
  });

  it('allows M-Pesa checkout without tax approval while the company is not VAT-registered', async () => {
    vi.stubEnv('SELLER_VAT_REGISTERED', '');
    const charges: number[] = [];
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
        }),
        hasCurrentTermsAcceptance: async () => true,
        recordTenantAudit: async () => undefined,
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
      {
        mobileCheckout: async (input: { amount: number }) => {
          charges.push(input.amount);
          return { ok: true, transactionId: 'at-1', raw: {} };
        },
        mobileB2C: async () => ({ ok: true, raw: {} }),
      },
    );

    await expect(service.requestCheckout('session-token', { amount: 1500 })).resolves.toMatchObject({ ok: true });
    expect(charges).toEqual([1500]);
    vi.unstubAllEnvs();
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
    // Every pawaPay country is approved (20/11/26), so withdraw Zambia's approval for this check.
    const zambia = FOUNDING_SUBSCRIPTION_PRICES.ZM;
    FOUNDING_SUBSCRIPTION_PRICES.ZM = { ...zambia, approved: false };
    try {
      const { service, charges } = subscriptionService('ZM');
      await expect(service.requestCheckout('session-token', { plan: 'BASIC' })).resolves.toEqual({
        ok: false,
        reason: 'no_price',
      });
      expect(charges).toEqual([]);
    } finally {
      FOUNDING_SUBSCRIPTION_PRICES.ZM = zambia;
    }
  });

  it('lists both plans with month and year prices for a Kenyan tenant', async () => {
    const { service } = subscriptionService();
    const options = await service.getSubscriptionOptions('session-token');
    expect(options).toMatchObject({ currentPlan: 'BASIC', currencyCode: 'KES', payable: true });
    expect(options.plans.map((plan) => [plan.plan, plan.monthly, plan.yearly, plan.maxMediaPerListing])).toEqual([
      ['BASIC', 499, 4990, 10],
      ['PRO', 1499, 14990, 20],
    ]);
    expect(options.rail).toBe('MPESA');
  });

  it('with Paddle on, Kenya keeps M-Pesa first and offers the card second (owner 19/11/26)', async () => {
    const paddle = {
      PADDLE_ENABLED: 'true',
      PADDLE_CLIENT_TOKEN: 'test_client',
      PADDLE_WEBHOOK_SECRET: 'whsec',
      PADDLE_PRICE_BASIC_MONTH: 'pri_bm',
      PADDLE_PRICE_BASIC_YEAR: 'pri_by',
      PADDLE_PRICE_PRO_MONTH: 'pri_pm',
      PADDLE_PRICE_PRO_YEAR: 'pri_py',
    };
    for (const [key, value] of Object.entries(paddle)) vi.stubEnv(key, value);
    try {
      const { service, charges } = subscriptionService();
      await expect(service.requestCheckout('session-token', { plan: 'PRO' })).resolves.toMatchObject({ ok: true });
      expect(charges).toEqual([1499]);
      const options = await service.getSubscriptionOptions('session-token');
      expect(options).toMatchObject({ rail: 'MPESA', rails: ['MPESA', 'PADDLE'], payable: true });
      expect(options.card?.priceIds.PRO.MONTH).toBe('pri_pm');
      expect(JSON.stringify(options)).not.toContain('whsec');

      // Outside Kenya, where Paddle sells, the plan is paid by card only.
      const abroad = subscriptionService('NG');
      await expect(abroad.service.requestCheckout('session-token', { plan: 'PRO' })).resolves.toEqual({
        ok: false,
        reason: 'use_card',
      });
      await expect(abroad.service.getSubscriptionOptions('session-token')).resolves.toMatchObject({
        rail: 'PADDLE',
        rails: ['PADDLE'],
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('where Paddle is blocked and there is no M-Pesa, nothing is payable yet', async () => {
    const { service } = subscriptionService('SO');
    const options = await service.getSubscriptionOptions('session-token');
    expect(options).toMatchObject({ rail: 'NONE', payable: false, card: null });
  });
});

describe('PaymentsService Paddle card sales', () => {
  const paddleEnv = {
    PADDLE_ENABLED: 'true',
    PADDLE_CLIENT_TOKEN: 'test_client',
    PADDLE_WEBHOOK_SECRET: 'whsec',
    PADDLE_PRICE_BASIC_MONTH: 'pri_bm',
    PADDLE_PRICE_BASIC_YEAR: 'pri_by',
    PADDLE_PRICE_PRO_MONTH: 'pri_pm',
    PADDLE_PRICE_PRO_YEAR: 'pri_py',
  };

  function signed(body: string) {
    const ts = String(Math.floor(Date.now() / 1000));
    return `ts=${ts};h1=${createHmac('sha256', 'whsec').update(`${ts}:${body}`).digest('hex')}`;
  }

  function service(known = true) {
    const plans: string[] = [];
    const svc = new PaymentsService(
      {
        tenantExists: async () => known,
        setTenantPlan: async (_tenantId: string, plan: string) => {
          plans.push(plan);
        },
        recordTenantAudit: async () => undefined,
      } as unknown as AuthService,
      new InMemoryPaymentsRepository(),
    );
    return { svc, plans };
  }

  const body = JSON.stringify({
    event_type: 'transaction.completed',
    data: {
      id: 'txn_card_1',
      status: 'completed',
      custom_data: { tenantId },
      items: [{ price: { id: 'pri_pm' } }],
      currency_code: 'USD',
      details: { totals: { grand_total: '1199' } },
    },
  });

  it('is off until Paddle is configured', async () => {
    const { svc } = service();
    await expect(svc.handlePaddleWebhook(body, signed(body))).resolves.toMatchObject({ ok: false, status: 404 });
  });

  it('applies a signed card payment once and sets the plan from our price id', async () => {
    for (const [key, value] of Object.entries(paddleEnv)) vi.stubEnv(key, value);
    try {
      const { svc, plans } = service();
      await expect(svc.handlePaddleWebhook(body, 'ts=1;h1=00')).resolves.toMatchObject({ ok: false, status: 401 });
      await expect(svc.handlePaddleWebhook(body, signed(body))).resolves.toEqual({ ok: true, applied: true });
      await expect(svc.handlePaddleWebhook(body, signed(body))).resolves.toEqual({ ok: true, duplicate: true });
      expect(plans).toEqual(['PRO']);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ignores a payment for an unknown tenant', async () => {
    for (const [key, value] of Object.entries(paddleEnv)) vi.stubEnv(key, value);
    try {
      const { svc, plans } = service(false);
      await expect(svc.handlePaddleWebhook(body, signed(body))).resolves.toEqual({ ok: true, ignored: true });
      expect(plans).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('PaymentsService local ways to pay (owner standing order 19/11/26)', () => {
  function localService(countryCode = 'UG') {
    const plans: string[] = [];
    const repository = new InMemoryPaymentsRepository();
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+256700000001', phoneVerifiedAt: '2026-10-01T00:00:00.000Z' },
          tenant: { countryCode, trialStartedAt: '2026-11-01T00:00:00.000Z', status: 'TRIAL_ACTIVE' },
        }),
        hasCurrentTermsAcceptance: async () => true,
        recordTenantAudit: async () => undefined,
        setTenantPlan: async (_tenantId: string, plan: string) => {
          plans.push(plan);
        },
      } as unknown as AuthService,
      repository,
    );
    return { service, repository, plans };
  }

  it('keeps a local way closed until the owner approves that country price', async () => {
    vi.stubEnv('PAWAPAY_ENABLED', 'true');
    vi.stubEnv('PAWAPAY_API_TOKEN', 'tok');
    // Every pawaPay country is approved (20/11/26), so withdraw Zambia's approval for this check.
    const zambia = FOUNDING_SUBSCRIPTION_PRICES.ZM;
    FOUNDING_SUBSCRIPTION_PRICES.ZM = { ...zambia, approved: false };
    try {
      const { service } = localService('ZM');
      const options = await service.getSubscriptionOptions('session-token');
      expect(options.rails).not.toContain('MOBILE_MONEY');
      FOUNDING_SUBSCRIPTION_PRICES.ZM = zambia;
      const { service: open } = localService('ZM');
      expect((await open.getSubscriptionOptions('session-token')).rails[0]).toBe('MOBILE_MONEY');
    } finally {
      FOUNDING_SUBSCRIPTION_PRICES.ZM = zambia;
      vi.unstubAllEnvs();
    }
  });

  it('opens mobile money first in Uganda once pawaPay is on (price approved 20/11/26)', async () => {
    try {
      const { service: closed } = localService('UG');
      expect((await closed.getSubscriptionOptions('session-token')).rails).not.toContain('MOBILE_MONEY');
      vi.stubEnv('PAWAPAY_ENABLED', 'true');
      vi.stubEnv('PAWAPAY_API_TOKEN', 'tok');
      const { service } = localService('UG');
      const options = await service.getSubscriptionOptions('session-token');
      expect(options.rails[0]).toBe('MOBILE_MONEY');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('a pawaPay callback changes the plan only after pawaPay confirms the full amount, once', async () => {
    vi.stubEnv('PAWAPAY_ENABLED', 'true');
    vi.stubEnv('PAWAPAY_API_TOKEN', 'tok');
    let reply: unknown = { data: { depositId: 'dep-1', status: 'COMPLETED', amount: '42000', currency: 'UGX' } };
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => reply }));
    try {
      const { service, repository, plans } = localService('UG');
      const now = new Date().toISOString();
      await repository.createPaymentTxn({
        id: 'txn-1',
        provider: 'pawapay',
        kind: 'CHECKOUT',
        status: 'PENDING',
        providerTxnId: 'dep-1',
        phone: '+256700000001',
        amount: 42000,
        currency: 'UGX',
        tenantId,
        metadata: { purpose: 'SUBSCRIPTION', plan: 'PRO', period: 'MONTH' },
        createdAt: now,
        updatedAt: now,
      });
      await service.handlePawapayCallback('{"depositId":"dep-1","status":"COMPLETED"}');
      await service.handlePawapayCallback('{"depositId":"dep-1","status":"COMPLETED"}');
      expect(plans).toEqual(['PRO']);

      // A short payment unlocks nothing.
      await repository.createPaymentTxn({
        id: 'txn-2',
        provider: 'pawapay',
        kind: 'CHECKOUT',
        status: 'PENDING',
        providerTxnId: 'dep-2',
        phone: '+256700000001',
        amount: 42000,
        currency: 'UGX',
        tenantId,
        metadata: { purpose: 'SUBSCRIPTION', plan: 'PRO', period: 'MONTH' },
        createdAt: now,
        updatedAt: now,
      });
      reply = { data: { depositId: 'dep-2', status: 'COMPLETED', amount: '100', currency: 'UGX' } };
      await service.handlePawapayCallback('{"depositId":"dep-2"}');
      expect(plans).toEqual(['PRO']);
      expect((await repository.findPaymentTxnByProviderTxnId('dep-2'))?.status).toBe('FAILED');
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('a Paystack webhook needs a valid signature', async () => {
    vi.stubEnv('PAYSTACK_ENABLED', 'true');
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test');
    try {
      const { service } = localService('NG');
      const body = '{"event":"charge.success","data":{"reference":"txn-x"}}';
      await expect(service.handlePaystackWebhook(body, 'bad')).resolves.toEqual({ ok: false });
      const sig = createHmac('sha512', 'sk_test').update(body).digest('hex');
      await expect(service.handlePaystackWebhook(body, sig)).resolves.toEqual({ ok: true, status: 'ignored' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
