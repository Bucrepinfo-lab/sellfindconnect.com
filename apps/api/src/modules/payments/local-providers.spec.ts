import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  localPaymentCovers,
  mapPawapayStatus,
  pawapayCallbackDepositId,
  pawapayCheck,
  pawapayDeposit,
  paystackChannelsFor,
  paystackEventReference,
  paystackInitialize,
  paystackVerify,
  verifyPaystackSignature,
  type FetchLike,
} from './local-providers';

const pawaEnv = { PAWAPAY_ENABLED: 'true', PAWAPAY_API_TOKEN: 'tok' };
const stackEnv = { PAYSTACK_ENABLED: 'true', PAYSTACK_SECRET_KEY: 'sk_test' };

function fakeFetch(replies: Record<string, unknown>, calls: Array<{ url: string; body?: string }> = []): FetchLike {
  return async (url, init) => {
    calls.push({ url, body: init?.body });
    const key = Object.keys(replies).find((k) => url.includes(k));
    return { ok: key !== undefined, json: async () => (key ? replies[key] : {}) };
  };
}

describe('pawaPay mobile money', () => {
  it('stays off without its keys', async () => {
    const res = await pawapayDeposit({ env: {}, amount: 14000, currency: 'UGX', phone: '+256700000000', message: 'Plan', reference: 'r' });
    expect(res).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('prompts the payer phone through its own wallet provider', async () => {
    const calls: Array<{ url: string; body?: string }> = [];
    const f = fakeFetch({ 'predict-provider': { provider: 'MTN_MOMO_UGA' }, '/v2/deposits': { status: 'ACCEPTED' } }, calls);
    const res = await pawapayDeposit({ env: pawaEnv, fetchImpl: f, amount: 14000, currency: 'ugx', phone: '+256 700 000000', message: 'SellFindConnect plan', reference: 'ref1', newId: () => 'dep-1' });
    expect(res).toEqual({ ok: true, depositId: 'dep-1' });
    const body = JSON.parse(calls[1]!.body!);
    expect(body).toMatchObject({ depositId: 'dep-1', amount: '14000', currency: 'UGX', payer: { accountDetails: { phoneNumber: '256700000000', provider: 'MTN_MOMO_UGA' } } });
  });

  it('a number with no wallet is refused', async () => {
    const f = fakeFetch({});
    expect(await pawapayDeposit({ env: pawaEnv, fetchImpl: f, amount: 1, currency: 'UGX', phone: '1', message: 'x', reference: 'r' })).toEqual({ ok: false, reason: 'no_wallet' });
  });

  it('trusts only the re-read deposit, not the callback', async () => {
    expect(pawapayCallbackDepositId('{"depositId":"dep-1","status":"COMPLETED"}')).toBe('dep-1');
    expect(pawapayCallbackDepositId('not json')).toBeNull();
    const f = fakeFetch({ '/v2/deposits/dep-1': { data: { depositId: 'dep-1', status: 'COMPLETED', amount: '14000', currency: 'UGX' } } });
    expect(await pawapayCheck({ env: pawaEnv, fetchImpl: f, depositId: 'dep-1' })).toEqual({ status: 'success', amount: 14000, currency: 'UGX' });
    expect(mapPawapayStatus('REJECTED')).toBe('failed');
    expect(mapPawapayStatus('SUBMITTED')).toBe('pending');
  });
});

describe('Paystack bank transfer / USSD / EFT', () => {
  it('offers bank transfer and USSD first in Nigeria, EFT in South Africa', () => {
    expect(paystackChannelsFor('NG')[0]).toBe('bank_transfer');
    expect(paystackChannelsFor('ZA')[0]).toBe('eft');
  });

  it('starts a checkout in minor units and returns Paystack page', async () => {
    const calls: Array<{ url: string; body?: string }> = [];
    const f = fakeFetch({ '/transaction/initialize': { status: true, data: { authorization_url: 'https://checkout.paystack.com/x' } } }, calls);
    const res = await paystackInitialize({ env: stackEnv, fetchImpl: f, email: 'a@b.c', amount: 6000, currency: 'ngn', reference: 'ref', country: 'NG', metadata: { tenantId: 't' } });
    expect(res).toEqual({ ok: true, url: 'https://checkout.paystack.com/x' });
    expect(JSON.parse(calls[0]!.body!)).toMatchObject({ amount: 600000, currency: 'NGN', channels: ['bank_transfer', 'ussd', 'bank', 'card'] });
  });

  it('accepts only a correctly signed charge event, then re-verifies', async () => {
    const body = '{"event":"charge.success","data":{"reference":"ref"}}';
    const sig = createHmac('sha512', 'sk_test').update(body).digest('hex');
    expect(verifyPaystackSignature(body, sig, 'sk_test')).toBe(true);
    expect(verifyPaystackSignature(`${body} `, sig, 'sk_test')).toBe(false);
    expect(verifyPaystackSignature(body, null, 'sk_test')).toBe(false);
    expect(paystackEventReference(body)).toBe('ref');
    expect(paystackEventReference('{"event":"transfer.success","data":{"reference":"x"}}')).toBeNull();
    const f = fakeFetch({ '/transaction/verify/ref': { status: true, data: { status: 'success', amount: 600000, currency: 'NGN' } } });
    expect(await paystackVerify({ env: stackEnv, fetchImpl: f, reference: 'ref' })).toEqual({ status: 'success', amount: 6000, currency: 'NGN' });
  });

  it('only a full payment counts', () => {
    expect(localPaymentCovers(6000, 6000)).toBe(true);
    expect(localPaymentCovers(5999, 6000)).toBe(false);
    expect(localPaymentCovers(null, 6000)).toBe(false);
  });
});
