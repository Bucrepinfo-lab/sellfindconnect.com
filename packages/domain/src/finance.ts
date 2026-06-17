export const filingFrequencies = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;

export type FilingFrequency = (typeof filingFrequencies)[number];

export const taxProfileStatuses = ['DRAFT', 'APPROVED', 'SUSPENDED'] as const;

export type TaxProfileStatus = (typeof taxProfileStatuses)[number];

export const financeAlertMilestones = [30, 14, 7, 3, 1] as const;

export const financeAlertTypes = [
  'TAX_THRESHOLD_WARNING',
  'RETURN_READY_FOR_REVIEW',
  'APPROVAL_REQUIRED',
  'UPCOMING_REMITTANCE',
  'DUE_TODAY',
  'OVERDUE_REMITTANCE',
  'RECONCILIATION_VARIANCE',
  'FILING_COMPLETED',
] as const;

export type FinanceAlertType = (typeof financeAlertTypes)[number];

export type TaxCalculationAmounts = {
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  netRevenueAmount: number;
};

export type TaxCalculationAmountInput = {
  amount: number;
  taxRate: number;
  taxInclusivePricing: boolean;
};

export type RemittanceAlertDecision = {
  alertType: Extract<FinanceAlertType, 'UPCOMING_REMITTANCE' | 'DUE_TODAY' | 'OVERDUE_REMITTANCE'>;
  daysUntilDue: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
};

const dayMs = 24 * 60 * 60 * 1000;

export function roundMoney(value: number, precision = 4): number {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function calculateTaxSnapshotAmounts(
  input: TaxCalculationAmountInput,
): TaxCalculationAmounts {
  if (input.amount < 0) {
    throw new Error('Tax calculation amount must be zero or greater.');
  }

  if (input.taxRate < 0) {
    throw new Error('Tax rate must be zero or greater.');
  }

  if (input.taxInclusivePricing) {
    const taxableAmount = input.taxRate === 0 ? input.amount : input.amount / (1 + input.taxRate);
    const taxAmount = input.amount - taxableAmount;

    return {
      grossAmount: roundMoney(input.amount),
      taxableAmount: roundMoney(taxableAmount),
      taxAmount: roundMoney(taxAmount),
      netRevenueAmount: roundMoney(taxableAmount),
    };
  }

  const taxAmount = input.amount * input.taxRate;

  return {
    grossAmount: roundMoney(input.amount + taxAmount),
    taxableAmount: roundMoney(input.amount),
    taxAmount: roundMoney(taxAmount),
    netRevenueAmount: roundMoney(input.amount),
  };
}

export function getRemittanceAlertDecision(
  paymentDeadlineIso: string,
  nowIso = new Date().toISOString(),
): RemittanceAlertDecision | null {
  const paymentDeadline = new Date(paymentDeadlineIso);
  const now = new Date(nowIso);
  const daysUntilDue = Math.ceil((paymentDeadline.getTime() - now.getTime()) / dayMs);

  if (daysUntilDue < 0) {
    return {
      alertType: 'OVERDUE_REMITTANCE',
      daysUntilDue,
      severity: 'CRITICAL',
    };
  }

  if (daysUntilDue === 0) {
    return {
      alertType: 'DUE_TODAY',
      daysUntilDue,
      severity: 'CRITICAL',
    };
  }

  if (financeAlertMilestones.some((day) => day === daysUntilDue)) {
    return {
      alertType: 'UPCOMING_REMITTANCE',
      daysUntilDue,
      severity: daysUntilDue <= 3 ? 'WARNING' : 'INFO',
    };
  }

  return null;
}
