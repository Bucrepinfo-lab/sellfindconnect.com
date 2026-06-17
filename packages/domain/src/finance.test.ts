import { describe, expect, it } from 'vitest';

import { calculateTaxSnapshotAmounts, getRemittanceAlertDecision } from './finance';

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
});
