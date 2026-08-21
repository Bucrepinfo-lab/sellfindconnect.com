import type {
  AccessRole,
  DunningNoticeStage,
  FinanceAdjustmentStatus,
  FinanceAdjustmentType,
  FinanceAlertType,
  FinancePaymentStatus,
  FilingFrequency,
  InvoiceLine,
  InvoicePaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  ReconciliationSummary,
  TaxProfileStatus,
  TaxReturnEvidenceKind,
  TaxReturnStatus,
  TenantAccessRole,
} from '@telpen/domain';

export type CountryTaxProfileRecord = {
  id: string;
  countryCode: string;
  taxAuthorityName: string;
  taxRegistrationStatus: string;
  filingPortalUrl?: string;
  localFinanceOwner: string;
  filingFrequency: FilingFrequency;
  recordRetentionYears: number;
  taxInclusivePricing: boolean;
  status: TaxProfileStatus;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxRuleRecord = {
  id: string;
  countryCode: string;
  taxType: string;
  taxRate: number;
  productTaxCode: string;
  registrationThreshold?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
};

export type TaxCalculationSnapshotRecord = {
  id: string;
  tenantId: string;
  countryCode: string;
  taxRuleVersionId: string;
  taxType: string;
  provider: string;
  providerReference?: string;
  grossAmount: number;
  taxableAmount: number;
  taxAmount: number;
  netRevenueAmount: number;
  presentmentCurrency: string;
  filingCurrency: string;
  exchangeRate: number;
  customerEvidence: Record<string, unknown>;
  calculationReason: string;
  transactionAt: string;
  createdAt: string;
};

export type TaxLedgerEntryRecord = {
  id: string;
  taxCalculationSnapshotId?: string;
  entryType:
    | 'TAX_LIABILITY'
    | 'PLATFORM_REVENUE'
    | 'REFUND_TAX_REVERSAL'
    | 'REFUND_REVENUE_REVERSAL'
    | 'CHARGEBACK_TAX_REVERSAL'
    | 'CHARGEBACK_REVENUE_REVERSAL'
    | 'TAX_PERIOD_CORRECTION';
  amount: number;
  currencyCode: string;
  occurredAt: string;
  createdAt: string;
};

export type TaxReturnEvidenceRecord = {
  id: string;
  kind: TaxReturnEvidenceKind;
  reference: string;
  note?: string;
  attachedBy: string;
  attachedAt: string;
};

export type TaxReturnCorrectionRecord = {
  id: string;
  amount: number;
  previousComputedTaxDue: number;
  nextComputedTaxDue: number;
  reason: string;
  reference: string;
  note?: string;
  approvedBy: string;
  createdAt: string;
};

export type TaxReturnRecord = {
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
  evidence: TaxReturnEvidenceRecord[];
  corrections: TaxReturnCorrectionRecord[];
  reviewApprovedBy?: string;
  reviewApprovedAt?: string;
  filingApprovedBy?: string;
  filingApprovedAt?: string;
  filedAt?: string;
  remittedAt?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceWorkbenchContext = {
  tenantId?: string;
  actorUserId?: string;
  actorRole?: AccessRole;
  sessionRole?: TenantAccessRole;
};

export type FinanceInvoiceLineItemRecord = {
  description: string;
  quantity: number;
  unitAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grossAmount: number;
  currencyCode: string;
};

export type FinanceInvoiceRecord = {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  countryCode: string;
  customerName: string;
  customerEmail?: string;
  billingReference?: string;
  taxCalculationSnapshotId: string;
  lineItems: FinanceInvoiceLineItemRecord[];
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  refundedAmount: number;
  chargebackAmount: number;
  netCollectedAmount: number;
  paymentStatus: InvoicePaymentStatus;
  presentmentCurrency: string;
  filingCurrency: string;
  status: 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE' | 'REFUNDED' | 'DISPUTED';
  issuedAt: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceReceiptRecord = {
  id: string;
  tenantId: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  countryCode: string;
  taxCalculationSnapshotId: string;
  amountPaid: number;
  currencyCode: string;
  paymentProvider: string;
  paymentReference: string;
  paidAt: string;
  issuedAt: string;
  createdAt: string;
};

export type FinanceAdjustmentRecord = {
  id: string;
  tenantId: string;
  adjustmentType: FinanceAdjustmentType;
  creditNoteNumber?: string;
  invoiceId: string;
  invoiceNumber: string;
  countryCode: string;
  taxCalculationSnapshotId: string;
  amount: number;
  taxAmount: number;
  netRevenueAmount: number;
  currencyCode: string;
  filingCurrency: string;
  reason: string;
  paymentProvider?: string;
  providerReference?: string;
  evidenceUrl?: string;
  status: FinanceAdjustmentStatus;
  requestedBy?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
};

export type DunningNoticeRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  countryCode: string;
  stage: DunningNoticeStage;
  daysOverdue: number;
  amountDue: number;
  currencyCode: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'OPEN' | 'SENT' | 'SUPPRESSED' | 'RESOLVED';
  dueAt: string;
  createdAt: string;
  dedupeKey: string;
};

export type FinanceAlertRecord = {
  id: string;
  dedupeKey: string;
  tenantId?: string;
  countryCode: string;
  taxReturnId?: string;
  invoiceId?: string;
  alertType: FinanceAlertType;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  dueAt: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'OVERDUE';
  createdAt: string;
};

export type InvoiceRecord = {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  countryCode: string;
  currencyCode: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountRefunded: number;
  taxCalculationSnapshotId?: string;
  issuedAt: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId: string;
  method: PaymentMethod;
  status: FinancePaymentStatus;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  customerReference?: string;
  failureReason?: string;
  capturedAt?: string;
  createdAt: string;
};

export type ReceiptRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  paymentId: string;
  receiptNumber: string;
  amount: number;
  currencyCode: string;
  issuedAt: string;
};

export type ReconciliationRunRecord = {
  id: string;
  tenantId: string;
  provider: string;
  statementReference: string;
  countryCode?: string;
  currencyCode?: string;
  summary: ReconciliationSummary;
  createdAt: string;
};
