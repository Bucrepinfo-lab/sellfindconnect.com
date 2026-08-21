import { roleHasPermission, type AccessRole } from './access-control';

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

export const paymentMethods = [
  'CARD',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'WALLET',
  'MANUAL',
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export const financePaymentStatuses = [
  'REQUIRES_CAPTURE',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export type FinancePaymentStatus = (typeof financePaymentStatuses)[number];

export type PaymentCaptureRequest = {
  tenantId: string;
  invoiceId: string;
  amount: number;
  currencyCode: string;
  method: PaymentMethod;
  idempotencyKey: string;
  customerReference?: string;
};

export type PaymentCaptureResult = {
  provider: string;
  providerPaymentId: string;
  status: Extract<FinancePaymentStatus, 'CAPTURED' | 'REQUIRES_CAPTURE' | 'FAILED'>;
  capturedAmount: number;
  currencyCode: string;
  failureReason?: string;
};

export type PaymentRefundRequest = {
  provider: string;
  providerPaymentId: string;
  amount: number;
  currencyCode: string;
  reason?: string;
};

export type PaymentRefundResult = {
  provider: string;
  providerRefundId: string;
  status: Extract<FinancePaymentStatus, 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED'>;
  refundedAmount: number;
  currencyCode: string;
  failureReason?: string;
};

export const invoiceStatuses = [
  'DRAFT',
  'ISSUED',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'VOID',
  'UNCOLLECTIBLE',
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitAmount: number;
};

export type InvoiceLine = InvoiceLineInput & {
  lineTotal: number;
};

export type InvoiceTotals = {
  subtotal: number;
  taxAmount: number;
  total: number;
};

export type InvoiceSummary = {
  lines: InvoiceLine[];
  totals: InvoiceTotals;
};

export function summarizeInvoiceLines(
  lines: InvoiceLineInput[],
  taxAmount = 0,
): InvoiceSummary {
  if (lines.length === 0) {
    throw new Error('An invoice requires at least one line item.');
  }

  const computedLines = lines.map((line) => {
    if (line.quantity < 0 || line.unitAmount < 0) {
      throw new Error('Invoice line quantity and unit amount must be zero or greater.');
    }

    return {
      ...line,
      lineTotal: roundMoney(line.quantity * line.unitAmount),
    };
  });

  const subtotal = roundMoney(computedLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const tax = roundMoney(Math.max(0, taxAmount));

  return {
    lines: computedLines,
    totals: {
      subtotal,
      taxAmount: tax,
      total: roundMoney(subtotal + tax),
    },
  };
}

export function buildInvoiceNumber(input: {
  countryCode: string;
  sequence: number;
  issuedAtIso?: string;
  prefix?: string;
}): string {
  const year = new Date(input.issuedAtIso ?? new Date().toISOString()).getUTCFullYear();
  const sequence = Math.max(1, Math.trunc(input.sequence)).toString().padStart(6, '0');
  const prefix = (input.prefix ?? 'SFC').toUpperCase();
  return `${prefix}-${input.countryCode.toUpperCase()}-${year}-${sequence}`;
}

export const reconciliationLineStatuses = [
  'MATCHED',
  'AMOUNT_VARIANCE',
  'MISSING_IN_LEDGER',
  'MISSING_IN_SETTLEMENT',
] as const;

export type ReconciliationLineStatus = (typeof reconciliationLineStatuses)[number];

export type ReconciliationInputLine = {
  reference: string;
  amount: number;
  currencyCode: string;
};

export type ReconciliationLine = {
  reference: string;
  status: ReconciliationLineStatus;
  ledgerAmount: number | null;
  settlementAmount: number | null;
  variance: number;
  currencyCode: string;
};

export type ReconciliationSummary = {
  matchedCount: number;
  varianceCount: number;
  missingInLedgerCount: number;
  missingInSettlementCount: number;
  totalVarianceAmount: number;
  hasVariance: boolean;
  lines: ReconciliationLine[];
};

export function reconcileSettlement(
  ledgerLines: ReconciliationInputLine[],
  settlementLines: ReconciliationInputLine[],
  toleranceAmount = 0,
): ReconciliationSummary {
  const tolerance = Math.max(0, toleranceAmount);
  const ledger = new Map(ledgerLines.map((line) => [line.reference, line]));
  const settlement = new Map(settlementLines.map((line) => [line.reference, line]));
  const references = Array.from(new Set([...ledger.keys(), ...settlement.keys()])).sort((a, b) =>
    a.localeCompare(b),
  );

  const lines: ReconciliationLine[] = references.map((reference) => {
    const ledgerLine = ledger.get(reference);
    const settlementLine = settlement.get(reference);

    if (ledgerLine && settlementLine) {
      const variance = roundMoney(settlementLine.amount - ledgerLine.amount);
      const status: ReconciliationLineStatus =
        Math.abs(variance) <= tolerance ? 'MATCHED' : 'AMOUNT_VARIANCE';
      return {
        reference,
        status,
        ledgerAmount: ledgerLine.amount,
        settlementAmount: settlementLine.amount,
        variance,
        currencyCode: settlementLine.currencyCode,
      };
    }

    if (ledgerLine) {
      return {
        reference,
        status: 'MISSING_IN_SETTLEMENT',
        ledgerAmount: ledgerLine.amount,
        settlementAmount: null,
        variance: roundMoney(-ledgerLine.amount),
        currencyCode: ledgerLine.currencyCode,
      };
    }

    const onlySettlement = settlementLine as ReconciliationInputLine;
    return {
      reference,
      status: 'MISSING_IN_LEDGER',
      ledgerAmount: null,
      settlementAmount: onlySettlement.amount,
      variance: roundMoney(onlySettlement.amount),
      currencyCode: onlySettlement.currencyCode,
    };
  });

  const matchedCount = lines.filter((line) => line.status === 'MATCHED').length;
  const varianceCount = lines.filter((line) => line.status === 'AMOUNT_VARIANCE').length;
  const missingInLedgerCount = lines.filter((line) => line.status === 'MISSING_IN_LEDGER').length;
  const missingInSettlementCount = lines.filter(
    (line) => line.status === 'MISSING_IN_SETTLEMENT',
  ).length;

  return {
    matchedCount,
    varianceCount,
    missingInLedgerCount,
    missingInSettlementCount,
    totalVarianceAmount: roundMoney(
      lines.reduce((sum, line) => sum + Math.abs(line.variance), 0),
    ),
    hasVariance: varianceCount + missingInLedgerCount + missingInSettlementCount > 0,
    lines,
  };
}

export const taxReturnStatuses = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'FILED',
  'REMITTED',
  'LOCKED',
] as const;

export type TaxReturnStatus = (typeof taxReturnStatuses)[number];

export const taxReturnEvidenceKinds = [
  'FILING_CONFIRMATION',
  'REMITTANCE_RECEIPT',
  'AUTHORITY_REFERENCE',
  'ACCOUNTANT_NOTES',
  'BOARD_APPROVAL',
  'PERIOD_CORRECTION',
] as const;

export type TaxReturnEvidenceKind = (typeof taxReturnEvidenceKinds)[number];

export const taxReportExportFormats = ['CSV', 'JSON'] as const;

export type TaxReportExportFormat = (typeof taxReportExportFormats)[number];

export const defaultDualApprovalThresholdAmount = 10_000;

const taxReturnTransitions: Record<TaxReturnStatus, readonly TaxReturnStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED'],
  APPROVED: ['FILED'],
  FILED: ['REMITTED'],
  REMITTED: ['LOCKED'],
  LOCKED: [],
};

export function assertTaxReturnTransition(from: TaxReturnStatus, to: TaxReturnStatus): void {
  if (!taxReturnTransitions[from].includes(to)) {
    throw new Error(`Tax return cannot move from ${from} to ${to}.`);
  }
}

export function isTaxReturnPeriodLocked(status: TaxReturnStatus): boolean {
  return status === 'LOCKED';
}

export function assertTaxReturnPeriodUnlocked(status: TaxReturnStatus): void {
  if (isTaxReturnPeriodLocked(status)) {
    throw new Error(
      'Locked tax periods cannot be changed except through a controlled correction workflow.',
    );
  }
}

export const taxReturnCorrectionReasons = [
  'UNDER_REMITTED',
  'OVER_REMITTED',
  'CLASSIFICATION',
  'EXCHANGE_RATE',
  'AUTHORITY_ASSESSMENT',
] as const;

export type TaxReturnCorrectionReason = (typeof taxReturnCorrectionReasons)[number];

export function assertTaxReturnCorrectionAllowed(status: TaxReturnStatus): void {
  if (status !== 'LOCKED') {
    throw new Error('Correction entries are only allowed after the tax period is locked.');
  }
}

export function applyTaxReturnCorrection(input: {
  computedTaxDue: number;
  adjustmentAmount: number;
}): { previousComputedTaxDue: number; nextComputedTaxDue: number } {
  if (!Number.isFinite(input.adjustmentAmount) || input.adjustmentAmount === 0) {
    throw new Error('Correction amount must be a non-zero number.');
  }

  const previousComputedTaxDue = roundMoney(input.computedTaxDue);
  const nextComputedTaxDue = roundMoney(previousComputedTaxDue + input.adjustmentAmount);
  if (nextComputedTaxDue < 0) {
    throw new Error('Correction would make computed tax due negative.');
  }

  return { previousComputedTaxDue, nextComputedTaxDue };
}

export function assertTaxReturnCorrectionApproverSeparation(input: {
  adjustmentAmount: number;
  filingApprovedBy?: string;
  correctionApprovedBy: string;
  thresholdAmount?: number;
}): void {
  if (!requiresSeparateFilingApprover(Math.abs(input.adjustmentAmount), input.thresholdAmount)) {
    return;
  }

  const filingApprovedBy = input.filingApprovedBy?.trim().toLowerCase() ?? '';
  const correctionApprovedBy = input.correctionApprovedBy.trim().toLowerCase();
  if (!filingApprovedBy || filingApprovedBy === correctionApprovedBy) {
    throw new Error(
      'Post-lock corrections above the dual-control threshold require a different approver than filing.',
    );
  }
}

export function requiresSeparateFilingApprover(
  computedTaxDue: number,
  thresholdAmount = defaultDualApprovalThresholdAmount,
): boolean {
  return computedTaxDue >= thresholdAmount;
}

export function assertFilingApproverSeparation(input: {
  computedTaxDue: number;
  reviewApprovedBy: string;
  filingApprovedBy: string;
  thresholdAmount?: number;
}): void {
  if (!requiresSeparateFilingApprover(input.computedTaxDue, input.thresholdAmount)) {
    return;
  }

  if (input.reviewApprovedBy.trim().toLowerCase() === input.filingApprovedBy.trim().toLowerCase()) {
    throw new Error(
      'Filing approval above the dual-control threshold requires a different approver than review.',
    );
  }
}

export type TaxPeriodCompletionInput = {
  status: TaxReturnStatus;
  evidenceKinds: readonly TaxReturnEvidenceKind[];
  reviewApprovedBy?: string;
  filingApprovedBy?: string;
  remittedAt?: string;
};

export type TaxPeriodCompletion = {
  complete: boolean;
  missing: string[];
};

export function evaluateTaxPeriodCompletion(input: TaxPeriodCompletionInput): TaxPeriodCompletion {
  const missing: string[] = [];

  if (input.status !== 'REMITTED' && input.status !== 'LOCKED') {
    missing.push('status');
  }
  if (!input.evidenceKinds.includes('FILING_CONFIRMATION')) {
    missing.push('FILING_CONFIRMATION');
  }
  if (!input.evidenceKinds.includes('REMITTANCE_RECEIPT')) {
    missing.push('REMITTANCE_RECEIPT');
  }
  if (!input.reviewApprovedBy?.trim()) {
    missing.push('reviewApprovedBy');
  }
  if (!input.filingApprovedBy?.trim()) {
    missing.push('filingApprovedBy');
  }
  if (!input.remittedAt?.trim()) {
    missing.push('remittedAt');
  }

  return { complete: missing.length === 0, missing };
}

export function canOperateTaxReturnWorkbench(role: AccessRole): boolean {
  return roleHasPermission(role, 'MANAGE_FINANCE');
}

export function canExportCountryTaxReport(role: AccessRole): boolean {
  return roleHasPermission(role, 'MANAGE_FINANCE');
}

export type TaxReturnEvidenceExport = {
  kind: TaxReturnEvidenceKind;
  reference: string;
  attachedAt: string;
  attachedBy: string;
};

export type TaxReturnExportSource = {
  id: string;
  countryCode: string;
  taxType: string;
  periodStart: string;
  periodEnd: string;
  filingDeadline: string;
  paymentDeadline: string;
  filingCurrency: string;
  computedTaxDue: number;
  status: TaxReturnStatus;
  reviewApprovedBy?: string;
  filingApprovedBy?: string;
  filedAt?: string;
  remittedAt?: string;
  lockedAt?: string;
  evidence: TaxReturnEvidenceExport[];
};

export type TaxReturnExportResult = {
  format: TaxReportExportFormat;
  fileName: string;
  contentType: string;
  encoding: 'utf8';
  content: string;
};

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildTaxReturnExport(
  source: TaxReturnExportSource,
  format: TaxReportExportFormat = 'CSV',
): TaxReturnExportResult {
  const fileName = `tax-return-${source.countryCode.toLowerCase()}-${source.taxType.toLowerCase()}-${source.periodStart.slice(0, 10)}-${source.periodEnd.slice(0, 10)}.${format.toLowerCase()}`;

  if (format === 'JSON') {
    return {
      format,
      fileName,
      contentType: 'application/json',
      encoding: 'utf8',
      content: JSON.stringify(
        {
          countryCode: source.countryCode,
          taxType: source.taxType,
          periodStart: source.periodStart,
          periodEnd: source.periodEnd,
          filingDeadline: source.filingDeadline,
          paymentDeadline: source.paymentDeadline,
          filingCurrency: source.filingCurrency,
          computedTaxDue: source.computedTaxDue,
          status: source.status,
          reviewApprovedBy: source.reviewApprovedBy ?? null,
          filingApprovedBy: source.filingApprovedBy ?? null,
          filedAt: source.filedAt ?? null,
          remittedAt: source.remittedAt ?? null,
          lockedAt: source.lockedAt ?? null,
          evidence: source.evidence.map((item) => ({
            kind: item.kind,
            reference: item.reference,
            attachedAt: item.attachedAt,
            attachedBy: item.attachedBy,
          })),
        },
        null,
        2,
      ),
    };
  }

  const header = [
    'countryCode',
    'taxType',
    'periodStart',
    'periodEnd',
    'filingCurrency',
    'computedTaxDue',
    'status',
    'reviewApprovedBy',
    'filingApprovedBy',
    'filedAt',
    'remittedAt',
    'lockedAt',
    'evidenceKinds',
    'evidenceReferences',
  ];
  const row = [
    source.countryCode,
    source.taxType,
    source.periodStart,
    source.periodEnd,
    source.filingCurrency,
    String(source.computedTaxDue),
    source.status,
    source.reviewApprovedBy ?? '',
    source.filingApprovedBy ?? '',
    source.filedAt ?? '',
    source.remittedAt ?? '',
    source.lockedAt ?? '',
    source.evidence.map((item) => item.kind).join('|'),
    source.evidence.map((item) => item.reference).join('|'),
  ];

  return {
    format,
    fileName,
    contentType: 'text/csv',
    encoding: 'utf8',
    content: `${header.join(',')}\n${row.map(csvCell).join(',')}\n`,
  };
}
