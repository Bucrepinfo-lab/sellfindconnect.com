import {
  fromPaymentProviderMinorUnits,
  paymentProviderMinorUnitExponent,
  roundMoney,
} from './finance';

/**
 * Stripe Tax is a rate engine only. It does not become merchant of record,
 * does not file iTax, and does not approve a country tax profile.
 *
 * Digital SaaS uses Stripe product tax code `txcd_10103000` (electronically
 * supplied software) unless `STRIPE_TAX_CODE` overrides it.
 */
export const STRIPE_TAX_DIGITAL_SOFTWARE_CODE = 'txcd_10103000';

export type StripeTaxQuote = {
  id: string;
  currencyCode: string;
  taxAmount: number;
  percentageDecimal?: number;
};

export type StripeTaxReconcileFailure = 'zero_tax' | 'mismatch' | 'invalid_quote';

export function stripeTaxQuoteFromCalculation(
  body: unknown,
  currencyCode: string,
): StripeTaxQuote | { error: 'invalid_quote' } {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid_quote' };
  }
  const record = body as {
    id?: unknown;
    tax_amount_exclusive?: unknown;
    tax_amount_inclusive?: unknown;
    tax_breakdown?: Array<{ tax_rate_details?: { percentage_decimal?: unknown } }>;
  };
  if (typeof record.id !== 'string' || !record.id.trim()) {
    return { error: 'invalid_quote' };
  }
  const exclusive = Number(record.tax_amount_exclusive ?? 0);
  const inclusive = Number(record.tax_amount_inclusive ?? 0);
  if (!Number.isFinite(exclusive) || !Number.isFinite(inclusive)) {
    return { error: 'invalid_quote' };
  }
  const percentageRaw = record.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal;
  const percentageDecimal =
    typeof percentageRaw === 'string' || typeof percentageRaw === 'number'
      ? Number(percentageRaw)
      : undefined;

  return {
    id: record.id.trim(),
    currencyCode: currencyCode.trim().toUpperCase(),
    taxAmount: fromPaymentProviderMinorUnits(exclusive + inclusive, currencyCode),
    percentageDecimal:
      percentageDecimal !== undefined && Number.isFinite(percentageDecimal)
        ? percentageDecimal
        : undefined,
  };
}

export function reconcileFinanceAndStripeTax(input: {
  financeTaxAmount: number;
  stripeTaxAmount: number;
  currencyCode: string;
}): { ok: true } | { ok: false; reason: StripeTaxReconcileFailure } {
  const finance = roundMoney(input.financeTaxAmount);
  const stripe = roundMoney(input.stripeTaxAmount);
  if (finance > 0 && stripe <= 0) {
    return { ok: false, reason: 'zero_tax' };
  }
  const unit = 10 ** -paymentProviderMinorUnitExponent(input.currencyCode);
  if (Math.abs(finance - stripe) > unit) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true };
}

export function describeStripeTaxReconcileFailure(reason: StripeTaxReconcileFailure): string {
  if (reason === 'zero_tax') {
    return (
      'Stripe Tax returned no VAT for this country. Add a tax registration in the Stripe Dashboard ' +
      'or unset TAX_RATE_PROVIDER. Stripe Tax does not file iTax and does not replace the finance rule.'
    );
  }
  if (reason === 'mismatch') {
    return (
      'Stripe Tax quote does not match the approved finance-module rate. ' +
      'The finance rule stays the source of truth; Stripe Tax is a rate engine only.'
    );
  }
  return 'Stripe Tax returned an invalid calculation. Tax calculation fail-closed.';
}
