/**
 * Locked tax operating model for every owner product that charges a
 * subscription (Sell Find Connect, InsurOS, Telpen Edu, Stawi, and the
 * historical Chamaa App snapshot now inside Stawi).
 *
 * This product stays the merchant of record. Kenya is first, filed on iTax
 * (or through one Kenyan tax representative). STK stays the local rail.
 * Rates come from the finance module and Stripe Tax. EU Non-Union OSS is
 * later expansion, not the Kenya pilot.
 *
 * Stripe Tax calculates rates. It does not become the seller, does not file
 * iTax, and does not replace STK. Paddle / Lemon Squeezy / Dodo are forbidden
 * because they take merchant-of-record and conflict with login-phone STK.
 *
 * Canonical narrative: `docs/GROUP_TAX_OPERATING_MODEL.md`.
 * Research: `docs/TAX_COMPLIANCE_RESEARCH.md`.
 */
export const TAX_OPERATING_MODEL = {
  merchantOfRecord: 'self',
  firstCountryCode: 'KE',
  kenyaCompliancePath: 'itax_simplified_or_tax_representative',
  paymentRails: ['africastalking_stk', 'stripe'] as const,
  rateEngine: 'finance_module_and_stripe_tax',
  laterExpansion: 'eu_oss',
  stripeTaxRole: 'rate_engine_not_remitter',
  etimsRequiredForNonResidentDigitalVat: false,
} as const;

export type TaxOperatingModel = typeof TAX_OPERATING_MODEL;

export const FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS = [
  'paddle',
  'paddle_billing',
  'lemonsqueezy',
  'lemon_squeezy',
  'dodo',
  'dodo_payments',
  'dodopayments',
] as const;

export type ForbiddenMerchantOfRecordProvider =
  (typeof FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS)[number];

export function normalizePaymentProviderName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isForbiddenMerchantOfRecordProvider(name: string): boolean {
  const normalized = normalizePaymentProviderName(name);
  return (FORBIDDEN_MERCHANT_OF_RECORD_PROVIDERS as readonly string[]).includes(normalized);
}

export function merchantOfRecordProviderError(provider: string): string {
  return (
    `PAYMENT_PROVIDER "${provider}" is a merchant-of-record checkout. ` +
    'This product stays the seller of record so STK and the finance module ' +
    'remain the tax path. Use stripe, africastalking, or live.'
  );
}

export function assertSelfMerchantOfRecordProvider(provider: string): void {
  if (isForbiddenMerchantOfRecordProvider(provider)) {
    throw new Error(merchantOfRecordProviderError(provider));
  }
}

export function describeTaxOperatingModel(): string {
  return 'This platform — not Paddle';
}
