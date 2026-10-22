import { describe, expect, it } from 'vitest';

import {
  STRIPE_TAX_DIGITAL_SOFTWARE_CODE,
  describeStripeTaxReconcileFailure,
  reconcileFinanceAndStripeTax,
  stripeTaxQuoteFromCalculation,
} from './stripe-tax-rate';

describe('Stripe Tax rate engine', () => {
  it('parses an inclusive Kenya VAT quote and matches the finance-module 16% amount', () => {
    const quote = stripeTaxQuoteFromCalculation(
      {
        id: 'taxcalc_ke_16',
        tax_amount_exclusive: 0,
        tax_amount_inclusive: 138,
        tax_breakdown: [{ tax_rate_details: { percentage_decimal: '16.0' } }],
      },
      'KES',
    );
    expect(quote).toMatchObject({
      id: 'taxcalc_ke_16',
      currencyCode: 'KES',
      taxAmount: 1.38,
      percentageDecimal: 16,
    });
    expect(STRIPE_TAX_DIGITAL_SOFTWARE_CODE).toBe('txcd_10103000');
    expect(
      reconcileFinanceAndStripeTax({
        financeTaxAmount: 1.3793,
        stripeTaxAmount: 1.38,
        currencyCode: 'KES',
      }),
    ).toEqual({ ok: true });
  });

  it('fail-closes when Stripe Tax returns zero or a different rate', () => {
    expect(
      reconcileFinanceAndStripeTax({
        financeTaxAmount: 1.3793,
        stripeTaxAmount: 0,
        currencyCode: 'KES',
      }),
    ).toEqual({ ok: false, reason: 'zero_tax' });
    expect(
      reconcileFinanceAndStripeTax({
        financeTaxAmount: 1.3793,
        stripeTaxAmount: 2.5,
        currencyCode: 'KES',
      }),
    ).toEqual({ ok: false, reason: 'mismatch' });
    expect(stripeTaxQuoteFromCalculation({}, 'KES')).toEqual({ error: 'invalid_quote' });
    expect(describeStripeTaxReconcileFailure('zero_tax')).toMatch(/unset TAX_RATE_PROVIDER/);
  });
});
