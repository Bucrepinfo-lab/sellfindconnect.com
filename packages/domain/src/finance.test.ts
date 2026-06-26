import { describe, expect, it } from 'vitest';

import {
  calculateFinanceAdjustmentBreakdown,
  calculatePaymentBalance,
  calculateTaxSnapshotAmounts,
  createFinanceDocumentNumber,
  getDunningNoticeDecision,
  getRemittanceAlertDecision,
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

  it('creates country-scoped finance document numbers', () => {
    expect(
      createFinanceDocumentNumber({
        countryCode: 'ke',
        documentType: 'INVOICE',
        issuedAt: '2026-06-23T12:00:00.000Z',
        sequence: 42,
      }),
    ).toBe('KE-2026-INV-000042');

    expect(
      createFinanceDocumentNumber({
        countryCode: 'UG',
        documentType: 'RECEIPT',
        issuedAt: '2026-01-01T00:00:00.000Z',
        sequence: 1,
      }),
    ).toBe('UG-2026-RCT-000001');

    expect(
      createFinanceDocumentNumber({
        countryCode: 'KE',
        documentType: 'CREDIT_NOTE',
        issuedAt: '2026-06-23T12:00:00.000Z',
        sequence: 7,
      }),
    ).toBe('KE-2026-CRN-000007');
  });

  it('classifies invoice payment balances', () => {
    expect(calculatePaymentBalance({ totalAmount: 10 })).toMatchObject({
      amountDue: 10,
      paymentStatus: 'UNPAID',
    });
    expect(calculatePaymentBalance({ totalAmount: 10, amountPaid: 4 })).toMatchObject({
      amountDue: 6,
      paymentStatus: 'PARTIALLY_PAID',
    });
    expect(calculatePaymentBalance({ totalAmount: 10, amountPaid: 10 })).toMatchObject({
      amountDue: 0,
      paymentStatus: 'PAID',
    });
  });

  it('splits refund and chargeback adjustments proportionally', () => {
    expect(
      calculateFinanceAdjustmentBreakdown({
        grossAmount: 10,
        taxAmount: 1.3793,
        netRevenueAmount: 8.6207,
        adjustmentAmount: 5,
      }),
    ).toEqual({
      grossAmount: 5,
      taxAmount: 0.6897,
      netRevenueAmount: 4.3104,
    });
  });

  it('classifies overdue invoice dunning stages', () => {
    expect(
      getDunningNoticeDecision('2026-06-20T00:00:00.000Z', '2026-06-21T00:00:00.000Z'),
    ).toMatchObject({ stage: 'GRACE_PERIOD', daysOverdue: 1, severity: 'INFO' });

    expect(
      getDunningNoticeDecision('2026-06-20T00:00:00.000Z', '2026-06-27T00:00:00.000Z'),
    ).toMatchObject({ stage: 'FIRST_NOTICE', daysOverdue: 7, severity: 'WARNING' });

    expect(
      getDunningNoticeDecision('2026-06-20T00:00:00.000Z', '2026-07-10T00:00:00.000Z'),
    ).toMatchObject({ stage: 'FINAL_NOTICE', daysOverdue: 20, severity: 'CRITICAL' });
  });
});
