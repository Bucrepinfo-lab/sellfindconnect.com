import {
  STRIPE_TAX_DIGITAL_SOFTWARE_CODE,
  assertSelfMerchantOfRecordProvider,
  stripeTaxQuoteFromCalculation,
  toPaymentProviderMinorUnits,
  type StripeTaxQuote,
} from '@telpen/domain';

export type TaxRateAdapterConfigReader = {
  get(key: string): string | undefined;
};

export type TaxRateAdapterFetch = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type TaxRateQuoteRequest = {
  countryCode: string;
  billingCountry: string;
  currencyCode: string;
  grossAmount: number;
  taxInclusivePricing: boolean;
  productTaxCode: string;
  idempotencyKey: string;
};

export interface TaxRateAdapter {
  readonly provider: string;
  quote(request: TaxRateQuoteRequest): Promise<StripeTaxQuote>;
}

function optionalConfig(config: TaxRateAdapterConfigReader | undefined, key: string): string | undefined {
  const value = config?.get(key)?.trim();
  return value ? value : undefined;
}

function requiredConfig(config: TaxRateAdapterConfigReader, key: string, context: string): string {
  const value = optionalConfig(config, key);
  if (!value) {
    throw new Error(`${key} is required when ${context}.`);
  }
  return value;
}

/**
 * Stripe Tax Calculations API. Quotes a rate; never captures money, never
 * files iTax, and never approves a country tax profile.
 */
export class StripeTaxRateAdapter implements TaxRateAdapter {
  readonly provider = 'STRIPE_TAX';

  constructor(
    private readonly config: TaxRateAdapterConfigReader,
    private readonly fetchImpl: TaxRateAdapterFetch = fetch as TaxRateAdapterFetch,
  ) {
    requiredConfig(config, 'STRIPE_SECRET_KEY', 'TAX_RATE_PROVIDER=stripe_tax');
  }

  async quote(request: TaxRateQuoteRequest): Promise<StripeTaxQuote> {
    const secret = requiredConfig(this.config, 'STRIPE_SECRET_KEY', 'TAX_RATE_PROVIDER=stripe_tax');
    const base = optionalConfig(this.config, 'STRIPE_API_BASE') ?? 'https://api.stripe.com';
    const taxCode =
      optionalConfig(this.config, 'STRIPE_TAX_CODE') ?? STRIPE_TAX_DIGITAL_SOFTWARE_CODE;
    const country = request.billingCountry.trim().toUpperCase() || request.countryCode.trim().toUpperCase();
    const currency = request.currencyCode.trim().toUpperCase();

    const response = await this.fetchImpl(`${base.replace(/\/$/, '')}/v1/tax/calculations`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        'idempotency-key': request.idempotencyKey,
      },
      body: new URLSearchParams({
        currency: currency.toLowerCase(),
        'line_items[0][amount]': String(toPaymentProviderMinorUnits(request.grossAmount, currency)),
        'line_items[0][reference]': request.productTaxCode,
        'line_items[0][tax_code]': taxCode,
        'line_items[0][tax_behavior]': request.taxInclusivePricing ? 'inclusive' : 'exclusive',
        'customer_details[address][country]': country,
        'customer_details[address_source]': 'billing',
      }).toString(),
    });

    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error('STRIPE_TAX_UNAVAILABLE');
    }
    const quote = stripeTaxQuoteFromCalculation(body, currency);
    if ('error' in quote) {
      throw new Error('STRIPE_TAX_UNAVAILABLE');
    }
    return quote;
  }
}

export function createConfiguredTaxRateAdapter(
  config?: TaxRateAdapterConfigReader,
  fetchImpl: TaxRateAdapterFetch = fetch as TaxRateAdapterFetch,
): TaxRateAdapter | undefined {
  const provider = optionalConfig(config, 'TAX_RATE_PROVIDER')?.toLowerCase() ?? '';
  if (!provider || provider === 'manual' || provider === 'off' || provider === 'none' || provider === 'finance') {
    return undefined;
  }

  assertSelfMerchantOfRecordProvider(provider);

  if (provider === 'stripe_tax' || provider === 'stripe') {
    return new StripeTaxRateAdapter(config ?? { get: () => undefined }, fetchImpl);
  }

  throw new Error(
    `Unsupported TAX_RATE_PROVIDER "${provider}". Use stripe_tax (rate engine) or unset to keep finance-module rules.`,
  );
}
