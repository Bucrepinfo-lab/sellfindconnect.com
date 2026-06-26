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
  'DUNNING_NOTICE',
  'REFUND_ISSUED',
  'CHARGEBACK_OPENED',
  'RECONCILIATION_VARIANCE',
  'FILING_COMPLETED',
] as const;

export type FinanceAlertType = (typeof financeAlertTypes)[number];

export const financeDocumentTypes = ['INVOICE', 'RECEIPT', 'CREDIT_NOTE'] as const;

export type FinanceDocumentType = (typeof financeDocumentTypes)[number];

export const invoicePaymentStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'] as const;

export type InvoicePaymentStatus = (typeof invoicePaymentStatuses)[number];

export const financeAdjustmentTypes = ['REFUND', 'CHARGEBACK'] as const;

export type FinanceAdjustmentType = (typeof financeAdjustmentTypes)[number];

export const financeAdjustmentStatuses = [
  'REQUESTED',
  'APPROVED',
  'SUBMITTED',
  'SETTLED',
  'DECLINED',
] as const;

export type FinanceAdjustmentStatus = (typeof financeAdjustmentStatuses)[number];

export const dunningNoticeStages = ['GRACE_PERIOD', 'FIRST_NOTICE', 'FINAL_NOTICE'] as const;

export type DunningNoticeStage = (typeof dunningNoticeStages)[number];

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

export type FinanceDocumentNumberInput = {
  countryCode: string;
  documentType: FinanceDocumentType;
  issuedAt: string;
  sequence: number;
};

export type PaymentBalanceInput = {
  totalAmount: number;
  amountPaid?: number;
};

export type PaymentBalance = {
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: InvoicePaymentStatus;
};

export type FinanceAdjustmentBreakdownInput = {
  grossAmount: number;
  taxAmount: number;
  netRevenueAmount: number;
  adjustmentAmount: number;
};

export type FinanceAdjustmentBreakdown = {
  grossAmount: number;
  taxAmount: number;
  netRevenueAmount: number;
};

export type DunningNoticeDecision = {
  stage: DunningNoticeStage;
  daysOverdue: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
};

const dayMs = 24 * 60 * 60 * 1000;
const financeDocumentTypeCodes = {
  INVOICE: 'INV',
  RECEIPT: 'RCT',
  CREDIT_NOTE: 'CRN',
} satisfies Record<FinanceDocumentType, string>;

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

export function createFinanceDocumentNumber(input: FinanceDocumentNumberInput): string {
  if (input.sequence < 1 || !Number.isInteger(input.sequence)) {
    throw new Error('Finance document sequence must be a positive integer.');
  }

  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('Finance document country code must be ISO alpha-2.');
  }

  const issuedAt = new Date(input.issuedAt);
  if (Number.isNaN(issuedAt.getTime())) {
    throw new Error('Finance document issuedAt must be a valid ISO date.');
  }

  const year = issuedAt.getUTCFullYear();
  const sequence = String(input.sequence).padStart(6, '0');
  return `${countryCode}-${year}-${financeDocumentTypeCodes[input.documentType]}-${sequence}`;
}

export function calculatePaymentBalance(input: PaymentBalanceInput): PaymentBalance {
  if (input.totalAmount < 0) {
    throw new Error('Payment balance total amount must be zero or greater.');
  }

  const amountPaid = input.amountPaid ?? 0;
  if (amountPaid < 0) {
    throw new Error('Payment balance amount paid must be zero or greater.');
  }

  const totalAmount = roundMoney(input.totalAmount);
  const paid = roundMoney(amountPaid);
  const amountDue = roundMoney(Math.max(totalAmount - paid, 0));
  let paymentStatus: InvoicePaymentStatus = 'UNPAID';

  if (paid > totalAmount) {
    paymentStatus = 'OVERPAID';
  } else if (paid === totalAmount) {
    paymentStatus = 'PAID';
  } else if (paid > 0) {
    paymentStatus = 'PARTIALLY_PAID';
  }

  return {
    totalAmount,
    amountPaid: paid,
    amountDue,
    paymentStatus,
  };
}

export function calculateFinanceAdjustmentBreakdown(
  input: FinanceAdjustmentBreakdownInput,
): FinanceAdjustmentBreakdown {
  if (input.adjustmentAmount <= 0) {
    throw new Error('Finance adjustment amount must be greater than zero.');
  }

  if (input.grossAmount <= 0) {
    throw new Error('Finance adjustment gross amount must be greater than zero.');
  }

  if (input.adjustmentAmount > input.grossAmount) {
    throw new Error('Finance adjustment amount cannot exceed the source gross amount.');
  }

  const ratio = input.adjustmentAmount / input.grossAmount;
  return {
    grossAmount: roundMoney(input.adjustmentAmount),
    taxAmount: roundMoney(input.taxAmount * ratio),
    netRevenueAmount: roundMoney(input.netRevenueAmount * ratio),
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

export function getDunningNoticeDecision(
  dueAtIso: string,
  nowIso = new Date().toISOString(),
): DunningNoticeDecision | null {
  const dueAt = new Date(dueAtIso);
  const now = new Date(nowIso);
  const daysOverdue = Math.floor((now.getTime() - dueAt.getTime()) / dayMs);

  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(now.getTime()) || daysOverdue < 1) {
    return null;
  }

  if (daysOverdue <= 3) {
    return {
      stage: 'GRACE_PERIOD',
      daysOverdue,
      severity: 'INFO',
    };
  }

  if (daysOverdue <= 14) {
    return {
      stage: 'FIRST_NOTICE',
      daysOverdue,
      severity: 'WARNING',
    };
  }

  return {
    stage: 'FINAL_NOTICE',
    daysOverdue,
    severity: 'CRITICAL',
  };
}
