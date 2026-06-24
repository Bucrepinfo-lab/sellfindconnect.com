import { describe, expect, it } from 'vitest';

import {
  buildInvoiceNumber,
  calculateTaxSnapshotAmounts,
  getRemittanceAlertDecision,
  reconcileSettlement,
  summarizeInvoiceLines,
} from './finance';

describe('finance domain helpers', () => {
  it('splits tax-inclusive pricing into net revenue and tax', () => {
    const amounts = calculateTaxSnapshotAmounts({
      amount: 10,
      taxRate: 0.16,
      taxInclusivePricing: true,
    });

    expect(amounts).toEqual({
      grossAmount: 10,
      taxableAmount: 8.6207,
      taxAmount: 1.3793,
      netRevenueAmount: 8.6207,
    });
  });

  it('adds tax to tax-exclusive pricing', () => {
    const amounts = calculateTaxSnapshotAmounts({
      amount: 10,
      taxRate: 0.16,
      taxInclusivePricing: false,
    });

    expect(amounts).toEqual({
      grossAmount: 11.6,
      taxableAmount: 10,
      taxAmount: 1.6,
      netRevenueAmount: 10,
    });
  });

  it('classifies remittance alert timing', () => {
    expect(
      getRemittanceAlertDecision('2026-07-31T00:00:00.000Z', '2026-07-24T00:00:00.000Z'),
    ).toMatchObject({ alertType: 'UPCOMING_REMITTANCE', daysUntilDue: 7 });

    expect(
      getRemittanceAlertDecision('2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'),
    ).toMatchObject({ alertType: 'DUE_TODAY', daysUntilDue: 0 });

    expect(
      getRemittanceAlertDecision('2026-07-31T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
    ).toMatchObject({ alertType: 'OVERDUE_REMITTANCE', daysUntilDue: -2 });
  });

  it('summarizes invoice line items and totals', () => {
    const summary = summarizeInvoiceLines(
      [
        { description: 'Monthly subscription', quantity: 1, unitAmount: 10 },
        { description: 'Boosted listing', quantity: 2, unitAmount: 2.5 },
      ],
      2.4,
    );

    expect(summary.totals).toEqual({ subtotal: 15, taxAmount: 2.4, total: 17.4 });
    expect(summary.lines[1]?.lineTotal).toBe(5);
  });

  it('builds zero-padded, country-scoped invoice numbers', () => {
    expect(
      buildInvoiceNumber({ countryCode: 'ke', sequence: 42, issuedAtIso: '2026-06-23T00:00:00.000Z' }),
    ).toBe('SFC-KE-2026-000042');
  });

  it('reconciles settlement lines against the ledger and flags variances', () => {
    const summary = reconcileSettlement(
      [
        { reference: 'pay-1', amount: 10, currencyCode: 'KES' },
        { reference: 'pay-2', amount: 20, currencyCode: 'KES' },
        { reference: 'pay-3', amount: 30, currencyCode: 'KES' },
      ],
      [
        { reference: 'pay-1', amount: 10, currencyCode: 'KES' },
        { reference: 'pay-2', amount: 18, currencyCode: 'KES' },
        { reference: 'pay-4', amount: 5, currencyCode: 'KES' },
      ],
    );

    expect(summary.matchedCount).toBe(1);
    expect(summary.varianceCount).toBe(1);
    expect(summary.missingInSettlementCount).toBe(1);
    expect(summary.missingInLedgerCount).toBe(1);
    expect(summary.hasVariance).toBe(true);
    expect(summary.totalVarianceAmount).toBe(37);
  });
});
