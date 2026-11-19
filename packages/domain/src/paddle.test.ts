import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { paddleConfig, paddlePublicConfig, paidPlanFromPaddleEvent, verifyPaddleSignature } from './paddle';

const env = {
  PADDLE_ENABLED: 'true',
  PADDLE_CLIENT_TOKEN: 'test_client',
  PADDLE_WEBHOOK_SECRET: 'whsec',
  PADDLE_PRICE_BASIC_MONTH: 'pri_bm',
  PADDLE_PRICE_BASIC_YEAR: 'pri_by',
  PADDLE_PRICE_PRO_MONTH: 'pri_pm',
  PADDLE_PRICE_PRO_YEAR: 'pri_py',
};

function event(priceId: string, overrides: Record<string, unknown> = {}) {
  return {
    event_type: 'transaction.completed',
    data: {
      id: 'txn_1',
      status: 'completed',
      custom_data: { tenantId: 'tenant-1' },
      items: [{ price: { id: priceId } }],
      currency_code: 'USD',
      details: { totals: { grand_total: '1199' } },
      ...overrides,
    },
  };
}

describe('Paddle card checkout', () => {
  it('stays off unless enabled with every key set', () => {
    expect(paddleConfig({})).toBeNull();
    expect(paddleConfig({ ...env, PADDLE_ENABLED: 'false' })).toBeNull();
    expect(paddleConfig({ ...env, PADDLE_PRICE_PRO_YEAR: '' })).toBeNull();
    expect(paddleConfig(env)?.environment).toBe('sandbox');
    expect(paddleConfig({ ...env, PADDLE_ENV: 'production' })?.environment).toBe('production');
  });

  it('never sends the webhook secret to the browser', () => {
    expect(JSON.stringify(paddlePublicConfig(paddleConfig(env)))).not.toContain('whsec');
  });

  it('accepts only a fresh, correctly signed notification', () => {
    const body = '{"a":1}';
    const now = 1_800_000_000_000;
    const ts = String(now / 1000);
    const h1 = createHmac('sha256', 'whsec').update(`${ts}:${body}`).digest('hex');
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'whsec', now)).toBe(true);
    expect(verifyPaddleSignature(body + ' ', `ts=${ts};h1=${h1}`, 'whsec', now)).toBe(false);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'other', now)).toBe(false);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'whsec', now + 600_000)).toBe(false);
    expect(verifyPaddleSignature(body, null, 'whsec', now)).toBe(false);
  });

  it('reads the plan from our price id, with the tenant from custom data', () => {
    const cfg = paddleConfig(env)!;
    expect(paidPlanFromPaddleEvent(event('pri_pm'), cfg.priceIds)).toEqual({
      transactionId: 'txn_1',
      tenantId: 'tenant-1',
      plan: 'PRO',
      period: 'MONTH',
      amount: 11.99,
      currency: 'USD',
    });
    expect(paidPlanFromPaddleEvent(event('pri_by'), cfg.priceIds)).toMatchObject({ plan: 'BASIC', period: 'YEAR' });
  });

  it('ignores other events, unknown prices, unpaid or tenant-less transactions', () => {
    const { priceIds } = paddleConfig(env)!;
    expect(paidPlanFromPaddleEvent({ ...event('pri_pm'), event_type: 'transaction.created' }, priceIds)).toBeNull();
    expect(paidPlanFromPaddleEvent(event('pri_someone_else'), priceIds)).toBeNull();
    expect(paidPlanFromPaddleEvent(event('pri_pm', { status: 'billed' }), priceIds)).toBeNull();
    expect(paidPlanFromPaddleEvent(event('pri_pm', { custom_data: null }), priceIds)).toBeNull();
    expect(paidPlanFromPaddleEvent(null, priceIds)).toBeNull();
  });
});
