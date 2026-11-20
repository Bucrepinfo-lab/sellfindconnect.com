import { describe, expect, it } from 'vitest';

import { PADDLE_BLOCKED_COUNTRIES, localMethodFor, paddleSellsIn, subscriptionRail, subscriptionRails } from './payment-rails';

const allOn = { pawapay: true, paystack: true, paddle: true };

describe('the way most people pay leads; the card comes later (owner standing order 19/11/26)', () => {
  it('Kenya: M-Pesa first, Paddle card second', () => {
    expect(subscriptionRails({ country: 'KE', switches: allOn })).toEqual(['MPESA', 'PADDLE']);
    expect(subscriptionRails({ country: 'KE', switches: { pawapay: false, paystack: false, paddle: false } })).toEqual(['MPESA']);
  });

  it('mobile money countries: mobile money first, card second', () => {
    expect(subscriptionRails({ country: 'ug', switches: allOn })).toEqual(['MOBILE_MONEY', 'PADDLE']);
    expect(subscriptionRails({ country: 'GH', switches: allOn })).toEqual(['MOBILE_MONEY', 'PADDLE']);
    expect(localMethodFor('CI')?.currency).toBe('XOF');
  });

  it('pawaPay-only countries (20/11/26): DR Congo and Zimbabwe pay by mobile money, Paddle does not sell there', () => {
    expect(subscriptionRails({ country: 'CD', switches: allOn })).toEqual(['MOBILE_MONEY']);
    expect(subscriptionRails({ country: 'ZW', switches: allOn })).toEqual(['MOBILE_MONEY']);
    expect(localMethodFor('ZW')?.currency).toBe('USD');
    expect(subscriptionRails({ country: 'LS', switches: allOn })).toEqual(['MOBILE_MONEY', 'PADDLE']);
    expect(localMethodFor('ET')?.currency).toBe('ETB');
    expect(localMethodFor('ML')).toBeNull();
  });

  it('Nigeria and South Africa: bank transfer / EFT first, card second', () => {
    expect(subscriptionRails({ country: 'NG', switches: allOn })).toEqual(['BANK_TRANSFER', 'PADDLE']);
    expect(subscriptionRails({ country: 'ZA', switches: allOn })).toEqual(['BANK_TRANSFER', 'PADDLE']);
  });

  it('a local way opens only when its provider is on and its price is approved', () => {
    expect(subscriptionRails({ country: 'UG', switches: { ...allOn, pawapay: false } })).toEqual(['PADDLE']);
    expect(subscriptionRails({ country: 'UG', switches: allOn, localPriceApproved: false })).toEqual(['PADDLE']);
  });

  it('elsewhere Paddle (its checkout shows local methods too); nothing where it is blocked', () => {
    expect(subscriptionRail({ country: 'US', switches: allOn })).toBe('PADDLE');
    expect(subscriptionRail({ country: 'SO', switches: allOn })).toBe('NONE');
    expect(subscriptionRails({ country: '', switches: allOn })).toEqual([]);
  });

  it("carries Paddle's blocked list, African countries included", () => {
    for (const code of ['CF', 'CD', 'LY', 'ML', 'SO', 'SS', 'SD', 'ZW']) {
      expect(PADDLE_BLOCKED_COUNTRIES.has(code)).toBe(true);
      expect(paddleSellsIn(code)).toBe(false);
    }
    expect(paddleSellsIn('KE')).toBe(true);
  });
});
