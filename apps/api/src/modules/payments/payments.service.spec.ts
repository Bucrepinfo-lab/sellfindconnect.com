import { describe, expect, it } from 'vitest';

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
          user: { phone: '+254700000001' },
        }),
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

  it('refuses checkout when the Kenya tax profile is not approved', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new PaymentsService(
      {
        getSession: async () => ({
          session: { userId: 'user-1', tenantId, role: 'OWNER' },
          user: { phone: '+254700000001' },
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
});
