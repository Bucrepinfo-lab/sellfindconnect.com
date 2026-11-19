import { describe, expect, it } from 'vitest';

import {
  TAX_OPERATING_MODEL,
  assertSelfMerchantOfRecordProvider,
  describeTaxOperatingModel,
  isForbiddenMerchantOfRecordProvider,
  mpesaSaleNeedsApprovedTaxProfile,
  sellerVatRegistered,
} from './tax-operating-model';

describe('group tax operating model', () => {
  it('cards through Paddle as merchant of record, M-Pesa direct with no VAT until registered (owner 19/11/26)', () => {
    expect(TAX_OPERATING_MODEL).toMatchObject({
      cardMerchantOfRecord: 'paddle',
      mpesaMerchantOfRecord: 'self',
      firstCountryCode: 'KE',
      paymentRails: ['africastalking_stk', 'paddle'],
      mpesaVat: 'none_until_vat_registered',
      vatRegistrationThresholdKes: 5_000_000,
    });
    expect(describeTaxOperatingModel()).toContain('Paddle');
  });

  it('an M-Pesa sale needs the approved tax profile only once VAT-registered', () => {
    expect(sellerVatRegistered({})).toBe(false);
    expect(mpesaSaleNeedsApprovedTaxProfile({})).toBe(false);
    expect(mpesaSaleNeedsApprovedTaxProfile({ SELLER_VAT_REGISTERED: 'false' })).toBe(false);
    expect(mpesaSaleNeedsApprovedTaxProfile({ SELLER_VAT_REGISTERED: 'TRUE' })).toBe(true);
  });

  it('rejects Paddle, Lemon Squeezy, and Dodo as an STK payment provider', () => {
    expect(isForbiddenMerchantOfRecordProvider('paddle')).toBe(true);
    expect(isForbiddenMerchantOfRecordProvider('Paddle Billing')).toBe(true);
    expect(isForbiddenMerchantOfRecordProvider('lemon-squeezy')).toBe(true);
    expect(isForbiddenMerchantOfRecordProvider('Lemon Squeezy')).toBe(true);
    expect(isForbiddenMerchantOfRecordProvider('dodo_payments')).toBe(true);
    expect(isForbiddenMerchantOfRecordProvider('stripe')).toBe(false);
    expect(isForbiddenMerchantOfRecordProvider('africastalking')).toBe(false);

    expect(() => assertSelfMerchantOfRecordProvider('paddle')).toThrow(/seller of record/);
    expect(() => assertSelfMerchantOfRecordProvider('stripe')).not.toThrow();
  });
});
