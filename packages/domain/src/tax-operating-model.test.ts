import { describe, expect, it } from 'vitest';

import {
  TAX_OPERATING_MODEL,
  assertSelfMerchantOfRecordProvider,
  describeTaxOperatingModel,
  isForbiddenMerchantOfRecordProvider,
} from './tax-operating-model';

describe('group tax operating model', () => {
  it('locks self merchant of record, Kenya iTax, STK, finance+Stripe Tax, EU OSS later', () => {
    expect(TAX_OPERATING_MODEL).toMatchObject({
      merchantOfRecord: 'self',
      firstCountryCode: 'KE',
      kenyaCompliancePath: 'itax_simplified_or_tax_representative',
      paymentRails: ['africastalking_stk', 'stripe'],
      rateEngine: 'finance_module_and_stripe_tax',
      laterExpansion: 'eu_oss',
      stripeTaxRole: 'rate_engine_not_remitter',
      etimsRequiredForNonResidentDigitalVat: false,
    });
    expect(describeTaxOperatingModel()).toBe('This platform — not Paddle');
  });

  it('rejects Paddle, Lemon Squeezy, and Dodo as merchant-of-record checkouts', () => {
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
