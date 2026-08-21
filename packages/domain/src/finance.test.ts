import { describe, expect, it } from 'vitest';

import {
  assertFilingApproverSeparation,
  assertTaxReturnPeriodUnlocked,
  assertTaxReturnTransition,
  buildTaxReturnExport,
  calculateFinanceAdjustmentBreakdown,
  calculatePaymentBalance,
  calculateTaxSnapshotAmounts,
  canExportCountryTaxReport,
  canOperateTaxReturnWorkbench,
  createFinanceDocumentNumber,
  evaluateTaxPeriodCompletion,
  getDunningNoticeDecision,
  getRemittanceAlertDecision,
  requiresSeparateFilingApprover,
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

  it('enforces tax-return transitions, dual approval, and period completeness', () => {
    expect(() => assertTaxReturnTransition('DRAFT', 'IN_REVIEW')).not.toThrow();
    expect(() => assertTaxReturnTransition('DRAFT', 'LOCKED')).toThrow(
      'Tax return cannot move from DRAFT to LOCKED.',
    );
    expect(() => assertTaxReturnPeriodUnlocked('REMITTED')).not.toThrow();
    expect(() => assertTaxReturnPeriodUnlocked('LOCKED')).toThrow(
      'Locked tax periods cannot be changed except through a controlled correction workflow.',
    );

    expect(requiresSeparateFilingApprover(1.3793)).toBe(false);
    expect(requiresSeparateFilingApprover(10_000)).toBe(true);
    expect(() =>
      assertFilingApproverSeparation({
        computedTaxDue: 10_000,
        reviewApprovedBy: 'country-finance-admin',
        filingApprovedBy: 'country-finance-admin',
      }),
    ).toThrow('Filing approval above the dual-control threshold requires a different approver');
    expect(() =>
      assertFilingApproverSeparation({
        computedTaxDue: 10_000,
        reviewApprovedBy: 'country-finance-admin',
        filingApprovedBy: 'global-finance-admin',
      }),
    ).not.toThrow();

    expect(
      evaluateTaxPeriodCompletion({
        status: 'REMITTED',
        evidenceKinds: ['FILING_CONFIRMATION', 'REMITTANCE_RECEIPT', 'AUTHORITY_REFERENCE'],
        reviewApprovedBy: 'country-finance-admin',
        filingApprovedBy: 'global-finance-admin',
        remittedAt: '2026-07-31T09:00:00.000Z',
      }).complete,
    ).toBe(true);
    expect(
      evaluateTaxPeriodCompletion({
        status: 'FILED',
        evidenceKinds: ['FILING_CONFIRMATION'],
      }).missing,
    ).toEqual([
      'status',
      'REMITTANCE_RECEIPT',
      'reviewApprovedBy',
      'filingApprovedBy',
      'remittedAt',
    ]);
  });

  it('lets finance admins operate the workbench and export country tax reports', () => {
    expect(canOperateTaxReturnWorkbench('GLOBAL_FINANCE_ADMIN')).toBe(true);
    expect(canOperateTaxReturnWorkbench('COUNTRY_FINANCE_ADMIN')).toBe(true);
    expect(canExportCountryTaxReport('COUNTRY_FINANCE_ADMIN')).toBe(true);
    expect(canOperateTaxReturnWorkbench('BILLING_MANAGER')).toBe(false);
    expect(canExportCountryTaxReport('BILLING_MANAGER')).toBe(false);
    expect(canOperateTaxReturnWorkbench('OWNER')).toBe(false);
  });

  it('exports a country tax return without accountant notes', () => {
    const exported = buildTaxReturnExport(
      {
        id: 'return-1',
        countryCode: 'KE',
        taxType: 'VAT',
        periodStart: '2026-06-01T00:00:00.000Z',
        periodEnd: '2026-06-30T23:59:59.999Z',
        filingDeadline: '2026-07-20T00:00:00.000Z',
        paymentDeadline: '2026-07-31T00:00:00.000Z',
        filingCurrency: 'KES',
        computedTaxDue: 1.3793,
        status: 'LOCKED',
        reviewApprovedBy: 'country-finance-admin',
        filingApprovedBy: 'global-finance-admin',
        filedAt: '2026-07-18T09:00:00.000Z',
        remittedAt: '2026-07-31T09:00:00.000Z',
        lockedAt: '2026-07-31T09:05:00.000Z',
        evidence: [
          {
            kind: 'FILING_CONFIRMATION',
            reference: 'KRA-VAT-2026-06',
            attachedAt: '2026-07-18T09:00:00.000Z',
            attachedBy: 'country-finance-admin',
          },
          {
            kind: 'REMITTANCE_RECEIPT',
            reference: 'PAY-8891',
            attachedAt: '2026-07-31T09:00:00.000Z',
            attachedBy: 'global-finance-admin',
          },
        ],
      },
      'CSV',
    );

    expect(exported.fileName).toBe('tax-return-ke-vat-2026-06-01-2026-06-30.csv');
    expect(exported.contentType).toBe('text/csv');
    expect(exported.content).toContain('FILING_CONFIRMATION|REMITTANCE_RECEIPT');
    expect(exported.content).toContain('KRA-VAT-2026-06|PAY-8891');
    expect(exported.content).not.toContain('accountant');
  });
});
