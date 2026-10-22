import { describe, expect, it } from 'vitest';

import {
  StripeTaxRateAdapter,
  createConfiguredTaxRateAdapter,
  type TaxRateAdapterFetch,
} from './tax-rate.adapter';

function configReader(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] };
}

function jsonFetch(
  handler: (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    status: number;
    body: unknown;
  },
): TaxRateAdapterFetch {
  return async (input, init) => {
    const result = handler(input, init);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  };
}

describe('tax rate adapter factory', () => {
  it('keeps finance-module rules unless TAX_RATE_PROVIDER names Stripe Tax', () => {
    expect(createConfiguredTaxRateAdapter()).toBeUndefined();
    expect(createConfiguredTaxRateAdapter(configReader({ TAX_RATE_PROVIDER: 'manual' }))).toBeUndefined();
    expect(() =>
      createConfiguredTaxRateAdapter(configReader({ TAX_RATE_PROVIDER: 'stripe_tax' })),
    ).toThrow('STRIPE_SECRET_KEY is required when TAX_RATE_PROVIDER=stripe_tax.');
    expect(() =>
      createConfiguredTaxRateAdapter(configReader({ TAX_RATE_PROVIDER: 'paddle' })),
    ).toThrow(/seller of record/);
  });
});

describe('StripeTaxRateAdapter', () => {
  it('quotes Kenya VAT through the Tax Calculations API without remitting', async () => {
    const adapter = new StripeTaxRateAdapter(
      configReader({ STRIPE_SECRET_KEY: 'sk_test_123' }),
      jsonFetch((url, init) => {
        expect(url).toBe('https://api.stripe.com/v1/tax/calculations');
        expect(init?.headers).toMatchObject({
          authorization: 'Bearer sk_test_123',
          'idempotency-key': 'tax-ke-1',
        });
        const body = decodeURIComponent(init?.body ?? '');
        expect(body).toContain('currency=kes');
        expect(body).toContain('line_items[0][amount]=1000');
        expect(body).toContain('line_items[0][tax_behavior]=inclusive');
        expect(body).toContain('customer_details[address][country]=KE');
        expect(body).toContain('txcd_10103000');
        return {
          status: 200,
          body: {
            id: 'taxcalc_ke_16',
            tax_amount_exclusive: 0,
            tax_amount_inclusive: 138,
            tax_breakdown: [{ tax_rate_details: { percentage_decimal: '16.0' } }],
          },
        };
      }),
    );

    await expect(
      adapter.quote({
        countryCode: 'KE',
        billingCountry: 'KE',
        currencyCode: 'KES',
        grossAmount: 10,
        taxInclusivePricing: true,
        productTaxCode: 'SFC_SUBSCRIPTION',
        idempotencyKey: 'tax-ke-1',
      }),
    ).resolves.toMatchObject({
      id: 'taxcalc_ke_16',
      taxAmount: 1.38,
      percentageDecimal: 16,
    });
  });

  it('fail-closes when Stripe Tax is unavailable', async () => {
    const adapter = new StripeTaxRateAdapter(
      configReader({ STRIPE_SECRET_KEY: 'sk_test_123' }),
      jsonFetch(() => ({ status: 500, body: { error: { message: 'sk_test_123' } } })),
    );

    await expect(
      adapter.quote({
        countryCode: 'KE',
        billingCountry: 'KE',
        currencyCode: 'KES',
        grossAmount: 10,
        taxInclusivePricing: true,
        productTaxCode: 'SFC_SUBSCRIPTION',
        idempotencyKey: 'tax-ke-fail',
      }),
    ).rejects.toThrow('STRIPE_TAX_UNAVAILABLE');
  });
});
