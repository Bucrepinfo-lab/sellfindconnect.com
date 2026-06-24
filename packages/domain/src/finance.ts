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

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const paymentMethods = [
  'CARD',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'WALLET',
  'MANUAL',
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentStatuses = [
  'REQUIRES_CAPTURE',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

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
  status: Extract<PaymentStatus, 'CAPTURED' | 'REQUIRES_CAPTURE' | 'FAILED'>;
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
  status: Extract<PaymentStatus, 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED'>;
  refundedAmount: number;
  currencyCode: string;
  failureReason?: string;
};

// ---------------------------------------------------------------------------
// Invoices and receipts
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider/bank reconciliation
// ---------------------------------------------------------------------------

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
