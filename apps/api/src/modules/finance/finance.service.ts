import {
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  buildInvoiceNumber,
  calculateTaxSnapshotAmounts,
  evaluateSafetyFields,
  getCountry,
  getRemittanceAlertDecision,
  reconcileSettlement,
  roundMoney,
  summarizeInvoiceLines,
  type FilingFrequency,
  type FinanceAlertType,
  type InvoiceLine,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ReconciliationSummary,
  type TaxProfileStatus,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CreateTaxRuleDto,
  GenerateTaxReturnDto,
  IssueInvoiceDto,
  PayInvoiceDto,
  ReconcileSettlementDto,
  RefundInvoiceDto,
  RunFinanceAlertsDto,
} from './dto/finance.dto';
import {
  buildPaymentIdempotencyKey,
  createConfiguredPaymentAdapter,
  type PaymentAdapter,
} from './payment.adapter';

type CountryTaxProfileRecord = {
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

type TaxRuleRecord = {
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

type TaxCalculationSnapshotRecord = {
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

type TaxLedgerEntryRecord = {
  id: string;
  taxCalculationSnapshotId: string;
  entryType: 'TAX_LIABILITY' | 'PLATFORM_REVENUE';
  amount: number;
  currencyCode: string;
  occurredAt: string;
  createdAt: string;
};

type TaxReturnRecord = {
  id: string;
  countryCode: string;
  taxType: string;
  periodStart: string;
  periodEnd: string;
  filingDeadline: string;
  paymentDeadline: string;
  filingCurrency: string;
  computedTaxDue: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'FILED' | 'REMITTED' | 'LOCKED';
  createdAt: string;
  updatedAt: string;
};

type FinanceAlertRecord = {
  id: string;
  dedupeKey: string;
  countryCode: string;
  taxReturnId?: string;
  alertType: FinanceAlertType;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  dueAt: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'OVERDUE';
  createdAt: string;
};

type InvoiceRecord = {
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

type PaymentRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  failureReason?: string;
  capturedAt?: string;
  createdAt: string;
};

type ReceiptRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  paymentId: string;
  receiptNumber: string;
  amount: number;
  currencyCode: string;
  issuedAt: string;
};

type ReconciliationRunRecord = {
  id: string;
  provider: string;
  statementReference: string;
  countryCode?: string;
  currencyCode?: string;
  summary: ReconciliationSummary;
  createdAt: string;
};

@Injectable()
export class FinanceService {
  private readonly countryProfiles = new Map<string, CountryTaxProfileRecord>();
  private readonly taxRules = new Map<string, TaxRuleRecord>();
  private readonly snapshots = new Map<string, TaxCalculationSnapshotRecord>();
  private readonly ledgerEntries = new Map<string, TaxLedgerEntryRecord>();
  private readonly taxReturns = new Map<string, TaxReturnRecord>();
  private readonly financeAlerts = new Map<string, FinanceAlertRecord>();
  private readonly invoices = new Map<string, InvoiceRecord>();
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly receipts = new Map<string, ReceiptRecord>();
  private readonly reconciliationRuns = new Map<string, ReconciliationRunRecord>();
  private readonly invoiceSequences = new Map<string, number>();
  private readonly paymentAdapter: PaymentAdapter;

  constructor(@Optional() paymentAdapter?: PaymentAdapter) {
    this.paymentAdapter =
      paymentAdapter ??
      createConfiguredPaymentAdapter({ get: (key) => process.env[key] });
  }

  configureCountryTaxProfile(input: ConfigureCountryTaxProfileDto): CountryTaxProfileRecord {
    this.assertSafe(input, 'Country tax profile contains blocked content.');

    const country = getCountry(input.countryCode);
    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    const now = new Date().toISOString();
    const existing = this.countryProfiles.get(input.countryCode);
    const approvedBy = input.approvedBy ?? existing?.approvedBy;
    const profile: CountryTaxProfileRecord = {
      id: existing?.id ?? randomUUID(),
      countryCode: input.countryCode,
      taxAuthorityName: input.taxAuthorityName,
      taxRegistrationStatus: input.taxRegistrationStatus,
      filingPortalUrl: input.filingPortalUrl,
      localFinanceOwner: input.localFinanceOwner,
      filingFrequency: input.filingFrequency,
      recordRetentionYears: input.recordRetentionYears,
      taxInclusivePricing: input.taxInclusivePricing ?? true,
      status: approvedBy ? 'APPROVED' : 'DRAFT',
      approvedAt: input.approvedBy ? now : existing?.approvedAt,
      approvedBy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.countryProfiles.set(profile.countryCode, profile);
    return profile;
  }

  listCountryTaxProfiles(): CountryTaxProfileRecord[] {
    return Array.from(this.countryProfiles.values()).sort((a, b) =>
      a.countryCode.localeCompare(b.countryCode),
    );
  }

  createTaxRule(input: CreateTaxRuleDto): TaxRuleRecord {
    this.assertSafe(input, 'Tax rule contains blocked content.');

    const profile = this.countryProfiles.get(input.countryCode);
    if (!profile) {
      throw new UnprocessableEntityException('Create the country tax profile before adding rules.');
    }

    const now = new Date().toISOString();
    const rule: TaxRuleRecord = {
      ...input,
      taxType: input.taxType.toUpperCase(),
      productTaxCode: input.productTaxCode.toUpperCase(),
      id: randomUUID(),
      createdAt: now,
    };

    this.taxRules.set(rule.id, rule);
    return rule;
  }

  listTaxRules(countryCode?: string): TaxRuleRecord[] {
    return Array.from(this.taxRules.values())
      .filter((rule) => !countryCode || rule.countryCode === countryCode)
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  calculateTax(tenantId: string, input: CalculateTaxDto) {
    this.assertSafe(input, 'Tax calculation contains blocked content.');

    const transactionAt = input.transactionAt ?? new Date().toISOString();
    const profile = this.requireApprovedProfile(input.countryCode);
    const rule = this.findActiveRule(input, transactionAt);
    const amounts = calculateTaxSnapshotAmounts({
      amount: input.grossAmount,
      taxRate: rule.taxRate,
      taxInclusivePricing: profile.taxInclusivePricing,
    });
    const now = new Date().toISOString();
    const snapshot: TaxCalculationSnapshotRecord = {
      id: randomUUID(),
      tenantId,
      countryCode: input.countryCode,
      taxRuleVersionId: rule.id,
      taxType: rule.taxType,
      provider: input.provider ?? 'MANUAL_RULE',
      providerReference: input.providerReference,
      grossAmount: amounts.grossAmount,
      taxableAmount: amounts.taxableAmount,
      taxAmount: amounts.taxAmount,
      netRevenueAmount: amounts.netRevenueAmount,
      presentmentCurrency: input.presentmentCurrency.toUpperCase(),
      filingCurrency: (input.filingCurrency ?? input.presentmentCurrency).toUpperCase(),
      exchangeRate: input.exchangeRate ?? 1,
      customerEvidence: input.customerEvidence,
      calculationReason: `${rule.taxType} ${rule.productTaxCode} rule active at ${transactionAt}`,
      transactionAt,
      createdAt: now,
    };
    const ledgerEntries = this.createLedgerEntries(snapshot, now);

    this.snapshots.set(snapshot.id, snapshot);
    for (const entry of ledgerEntries) {
      this.ledgerEntries.set(entry.id, entry);
    }

    return { snapshot, ledgerEntries };
  }

  listTaxCalculations(tenantId: string): TaxCalculationSnapshotRecord[] {
    return Array.from(this.snapshots.values())
      .filter((snapshot) => snapshot.tenantId === tenantId)
      .sort((a, b) => b.transactionAt.localeCompare(a.transactionAt));
  }

  generateTaxReturn(input: GenerateTaxReturnDto) {
    const profile = this.requireApprovedProfile(input.countryCode);
    if (profile.status !== 'APPROVED') {
      throw new UnprocessableEntityException('Country tax profile is not approved.');
    }

    const snapshots = Array.from(this.snapshots.values()).filter((snapshot) => {
      if (snapshot.countryCode !== input.countryCode) return false;
      if (snapshot.taxType !== input.taxType.toUpperCase()) return false;
      return snapshot.transactionAt >= input.periodStart && snapshot.transactionAt <= input.periodEnd;
    });
    const computedTaxDue = snapshots.reduce((sum, snapshot) => sum + snapshot.taxAmount, 0);
    const now = new Date().toISOString();
    const taxReturn: TaxReturnRecord = {
      id: randomUUID(),
      countryCode: input.countryCode,
      taxType: input.taxType.toUpperCase(),
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      filingDeadline: input.filingDeadline,
      paymentDeadline: input.paymentDeadline,
      filingCurrency: input.filingCurrency.toUpperCase(),
      computedTaxDue: Math.round((computedTaxDue + Number.EPSILON) * 10000) / 10000,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    this.taxReturns.set(taxReturn.id, taxReturn);
    const alertsCreated = [
      this.createReturnAlert(taxReturn, 'RETURN_READY_FOR_REVIEW', input.filingDeadline, now),
      this.createReturnAlert(taxReturn, 'APPROVAL_REQUIRED', input.paymentDeadline, now),
    ];

    return { taxReturn, sourceSnapshotCount: snapshots.length, alertsCreated };
  }

  listTaxReturns(): TaxReturnRecord[] {
    return Array.from(this.taxReturns.values()).sort((a, b) =>
      b.periodEnd.localeCompare(a.periodEnd),
    );
  }

  runFinanceAlerts(input: RunFinanceAlertsDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alertsCreated: FinanceAlertRecord[] = [];

    for (const taxReturn of this.taxReturns.values()) {
      if (['FILED', 'REMITTED', 'LOCKED'].includes(taxReturn.status)) continue;

      const decision = getRemittanceAlertDecision(taxReturn.paymentDeadline, now);
      if (!decision) continue;

      const dedupeKey = [
        taxReturn.id,
        decision.alertType,
        decision.daysUntilDue,
      ].join(':');
      if (this.hasAlertDedupeKey(dedupeKey)) continue;

      const alert = this.createFinanceAlert({
        countryCode: taxReturn.countryCode,
        taxReturnId: taxReturn.id,
        alertType: decision.alertType,
        message: this.remittanceMessage(taxReturn, decision.daysUntilDue),
        severity: decision.severity,
        dueAt: taxReturn.paymentDeadline,
        createdAt: now,
        dedupeKey,
      });
      alertsCreated.push(alert);
    }

    return {
      checkedAt: now,
      alertsCreated,
      openAlerts: this.listFinanceAlerts(),
    };
  }

  listFinanceAlerts(): FinanceAlertRecord[] {
    return Array.from(this.financeAlerts.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  issueInvoice(tenantId: string, input: IssueInvoiceDto): InvoiceRecord {
    this.assertSafe(input, 'Invoice contains blocked content.');

    // Validates the country has an APPROVED tax profile before any invoice is
    // issued; throws otherwise.
    this.requireApprovedProfile(input.countryCode);
    const issuedAt = input.issuedAt ?? new Date().toISOString();

    let taxAmount = input.taxAmount ?? 0;
    let currencyCode = input.currencyCode.toUpperCase();
    let taxCalculationSnapshotId: string | undefined;

    if (input.taxCalculationSnapshotId) {
      const snapshot = this.snapshots.get(input.taxCalculationSnapshotId);
      if (!snapshot || snapshot.tenantId !== tenantId) {
        throw new NotFoundException('Tax calculation snapshot not found for this tenant.');
      }
      taxAmount = snapshot.taxAmount;
      currencyCode = snapshot.presentmentCurrency;
      taxCalculationSnapshotId = snapshot.id;
    }

    const summary = summarizeInvoiceLines(input.lines, taxAmount);
    const sequence = this.nextInvoiceSequence(input.countryCode);
    const now = new Date().toISOString();
    const invoice: InvoiceRecord = {
      id: randomUUID(),
      tenantId,
      invoiceNumber: buildInvoiceNumber({
        countryCode: input.countryCode,
        sequence,
        issuedAtIso: issuedAt,
      }),
      countryCode: input.countryCode,
      currencyCode,
      status: 'ISSUED',
      lines: summary.lines,
      subtotal: summary.totals.subtotal,
      taxAmount: summary.totals.taxAmount,
      total: summary.totals.total,
      amountPaid: 0,
      amountRefunded: 0,
      taxCalculationSnapshotId,
      issuedAt,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  listInvoices(tenantId: string): InvoiceRecord[] {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async payInvoice(tenantId: string, input: PayInvoiceDto) {
    this.assertSafe(input, 'Payment contains blocked content.');

    const invoice = this.requireTenantInvoice(tenantId, input.invoiceId);

    // Idempotency is checked first so a replay with the same key returns the
    // original result instead of tripping the "already paid" guard below.
    const attempt = this.countInvoicePayments(invoice.id) + 1;
    const idempotencyKey =
      input.idempotencyKey ??
      buildPaymentIdempotencyKey({ tenantId, invoiceId: invoice.id, attempt });
    const existing = Array.from(this.payments.values()).find(
      (payment) => payment.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      return {
        invoice: this.invoices.get(existing.invoiceId) ?? invoice,
        payment: existing,
        receipt: this.findReceiptForPayment(existing.id),
        idempotentReplay: true,
      };
    }

    if (invoice.status === 'PAID') {
      throw new UnprocessableEntityException('Invoice is already fully paid.');
    }
    if (['VOID', 'UNCOLLECTIBLE', 'REFUNDED'].includes(invoice.status)) {
      throw new UnprocessableEntityException(`Invoice in ${invoice.status} state cannot be paid.`);
    }

    const outstanding = roundMoney(invoice.total - invoice.amountPaid);
    const result = await this.paymentAdapter.capture({
      tenantId,
      invoiceId: invoice.id,
      amount: outstanding,
      currencyCode: invoice.currencyCode,
      method: input.method,
      idempotencyKey,
      customerReference: input.customerReference,
    });
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: randomUUID(),
      tenantId,
      invoiceId: invoice.id,
      provider: result.provider,
      providerPaymentId: result.providerPaymentId,
      method: input.method,
      status: result.status,
      amount: result.status === 'CAPTURED' ? result.capturedAmount : outstanding,
      currencyCode: invoice.currencyCode,
      idempotencyKey,
      failureReason: result.failureReason,
      capturedAt: result.status === 'CAPTURED' ? now : undefined,
      createdAt: now,
    };
    this.payments.set(payment.id, payment);

    if (result.status !== 'CAPTURED') {
      throw new UnprocessableEntityException({
        message: 'Payment capture failed.',
        payment,
      });
    }

    const amountPaid = roundMoney(invoice.amountPaid + result.capturedAmount);
    const paidInvoice: InvoiceRecord = {
      ...invoice,
      amountPaid,
      status: amountPaid >= invoice.total ? 'PAID' : invoice.status,
      updatedAt: now,
    };
    this.invoices.set(invoice.id, paidInvoice);

    const receipt: ReceiptRecord = {
      id: randomUUID(),
      tenantId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      receiptNumber: `${paidInvoice.invoiceNumber}-R${this.countInvoiceReceipts(invoice.id) + 1}`,
      amount: result.capturedAmount,
      currencyCode: invoice.currencyCode,
      issuedAt: now,
    };
    this.receipts.set(receipt.id, receipt);

    return { invoice: paidInvoice, payment, receipt, idempotentReplay: false };
  }

  async refundInvoice(tenantId: string, input: RefundInvoiceDto) {
    this.assertSafe(input, 'Refund contains blocked content.');

    const invoice = this.requireTenantInvoice(tenantId, input.invoiceId);
    const capturedPayments = Array.from(this.payments.values()).filter(
      (payment) => payment.invoiceId === invoice.id && payment.status === 'CAPTURED',
    );
    const source = capturedPayments[capturedPayments.length - 1];
    if (!source) {
      throw new UnprocessableEntityException('Invoice has no captured payment to refund.');
    }

    const refundable = roundMoney(invoice.amountPaid - invoice.amountRefunded);
    const requested = roundMoney(input.amount ?? refundable);
    if (requested <= 0 || requested > refundable) {
      throw new UnprocessableEntityException('Refund amount must be between zero and the refundable balance.');
    }
    const result = await this.paymentAdapter.refund({
      provider: source.provider,
      providerPaymentId: source.providerPaymentId,
      amount: requested,
      currencyCode: invoice.currencyCode,
      reason: input.reason,
    });
    const now = new Date().toISOString();
    const refundPayment: PaymentRecord = {
      id: randomUUID(),
      tenantId,
      invoiceId: invoice.id,
      provider: result.provider,
      providerPaymentId: result.providerRefundId,
      method: source.method,
      status: result.status === 'FAILED' ? 'FAILED' : 'REFUNDED',
      amount: -roundMoney(result.refundedAmount || requested),
      currencyCode: invoice.currencyCode,
      idempotencyKey: `${source.idempotencyKey}:refund:${this.countInvoiceRefunds(invoice.id) + 1}`,
      failureReason: result.failureReason,
      createdAt: now,
    };
    this.payments.set(refundPayment.id, refundPayment);

    if (result.status === 'FAILED') {
      throw new UnprocessableEntityException({ message: 'Refund failed.', payment: refundPayment });
    }

    const amountRefunded = roundMoney(invoice.amountRefunded + result.refundedAmount);
    const refundedInvoice: InvoiceRecord = {
      ...invoice,
      amountRefunded,
      status: amountRefunded >= invoice.amountPaid ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      updatedAt: now,
    };
    this.invoices.set(invoice.id, refundedInvoice);

    return { invoice: refundedInvoice, refund: refundPayment };
  }

  listPayments(tenantId: string): PaymentRecord[] {
    return Array.from(this.payments.values())
      .filter((payment) => payment.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listReceipts(tenantId: string): ReceiptRecord[] {
    return Array.from(this.receipts.values())
      .filter((receipt) => receipt.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  reconcileProviderSettlement(input: ReconcileSettlementDto) {
    this.assertSafe(input, 'Reconciliation input contains blocked content.');

    const currencyFilter = input.currencyCode?.toUpperCase();
    const ledgerLines = Array.from(this.payments.values())
      .filter((payment) => payment.status === 'CAPTURED')
      .filter((payment) => !input.provider || payment.provider === input.provider)
      .filter((payment) => !currencyFilter || payment.currencyCode === currencyFilter)
      .map((payment) => ({
        reference: payment.providerPaymentId,
        amount: payment.amount,
        currencyCode: payment.currencyCode,
      }));
    const settlementLines = input.settlementLines.map((line) => ({
      reference: line.reference,
      amount: line.amount,
      currencyCode: line.currencyCode.toUpperCase(),
    }));

    const summary = reconcileSettlement(ledgerLines, settlementLines, input.toleranceAmount ?? 0);
    const now = new Date().toISOString();
    const run: ReconciliationRunRecord = {
      id: randomUUID(),
      provider: input.provider ?? 'ALL_PROVIDERS',
      statementReference: input.statementReference,
      countryCode: input.countryCode,
      currencyCode: currencyFilter,
      summary,
      createdAt: now,
    };
    this.reconciliationRuns.set(run.id, run);

    if (summary.hasVariance) {
      this.createFinanceAlert({
        countryCode: input.countryCode ?? 'GLOBAL',
        alertType: 'RECONCILIATION_VARIANCE',
        message: `Settlement ${input.statementReference} has ${summary.varianceCount} amount variance(s), ${summary.missingInLedgerCount} missing in ledger, ${summary.missingInSettlementCount} missing in settlement. Total absolute variance: ${summary.totalVarianceAmount} ${currencyFilter ?? ''}.`.trim(),
        severity: 'WARNING',
        dueAt: now,
        createdAt: now,
        dedupeKey: `reconciliation:${input.statementReference}`,
      });
    }

    return { run, openAlerts: this.listFinanceAlerts() };
  }

  listReconciliationRuns(): ReconciliationRunRecord[] {
    return Array.from(this.reconciliationRuns.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  private requireTenantInvoice(tenantId: string, invoiceId: string): InvoiceRecord {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found for this tenant.');
    }
    return invoice;
  }

  private nextInvoiceSequence(countryCode: string): number {
    const next = (this.invoiceSequences.get(countryCode) ?? 0) + 1;
    this.invoiceSequences.set(countryCode, next);
    return next;
  }

  private countInvoicePayments(invoiceId: string): number {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.invoiceId === invoiceId && payment.amount > 0,
    ).length;
  }

  private countInvoiceRefunds(invoiceId: string): number {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.invoiceId === invoiceId && payment.amount < 0,
    ).length;
  }

  private countInvoiceReceipts(invoiceId: string): number {
    return Array.from(this.receipts.values()).filter(
      (receipt) => receipt.invoiceId === invoiceId,
    ).length;
  }

  private findReceiptForPayment(paymentId: string): ReceiptRecord | undefined {
    return Array.from(this.receipts.values()).find((receipt) => receipt.paymentId === paymentId);
  }

  private requireApprovedProfile(countryCode: string): CountryTaxProfileRecord {
    const profile = this.countryProfiles.get(countryCode);
    if (!profile) {
      throw new NotFoundException('Country tax profile not found.');
    }

    if (profile.status !== 'APPROVED') {
      throw new UnprocessableEntityException('Country tax profile must be approved before paid use.');
    }

    return profile;
  }

  private findActiveRule(input: CalculateTaxDto, transactionAt: string): TaxRuleRecord {
    const taxType = input.taxType?.toUpperCase();
    const productTaxCode = input.productTaxCode?.toUpperCase();
    const candidates = Array.from(this.taxRules.values())
      .filter((rule) => rule.countryCode === input.countryCode)
      .filter((rule) => !taxType || rule.taxType === taxType)
      .filter((rule) => !productTaxCode || rule.productTaxCode === productTaxCode)
      .filter((rule) => rule.effectiveFrom <= transactionAt)
      .filter((rule) => !rule.effectiveTo || rule.effectiveTo >= transactionAt)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    const rule = candidates[0];
    if (!rule) {
      throw new UnprocessableEntityException('No active tax rule matches this transaction.');
    }

    return rule;
  }

  private createLedgerEntries(
    snapshot: TaxCalculationSnapshotRecord,
    now: string,
  ): TaxLedgerEntryRecord[] {
    return [
      {
        id: randomUUID(),
        taxCalculationSnapshotId: snapshot.id,
        entryType: 'TAX_LIABILITY',
        amount: snapshot.taxAmount,
        currencyCode: snapshot.filingCurrency,
        occurredAt: snapshot.transactionAt,
        createdAt: now,
      },
      {
        id: randomUUID(),
        taxCalculationSnapshotId: snapshot.id,
        entryType: 'PLATFORM_REVENUE',
        amount: snapshot.netRevenueAmount,
        currencyCode: snapshot.presentmentCurrency,
        occurredAt: snapshot.transactionAt,
        createdAt: now,
      },
    ];
  }

  private createReturnAlert(
    taxReturn: TaxReturnRecord,
    alertType: Extract<FinanceAlertType, 'RETURN_READY_FOR_REVIEW' | 'APPROVAL_REQUIRED'>,
    dueAt: string,
    now: string,
  ): FinanceAlertRecord {
    return this.createFinanceAlert({
      countryCode: taxReturn.countryCode,
      taxReturnId: taxReturn.id,
      alertType,
      message:
        alertType === 'RETURN_READY_FOR_REVIEW'
          ? `${taxReturn.taxType} return for ${taxReturn.countryCode} is ready. Computed tax to remit: ${taxReturn.computedTaxDue} ${taxReturn.filingCurrency}. Review by ${taxReturn.filingDeadline}.`
          : `${taxReturn.countryCode} ${taxReturn.taxType} remittance needs approval. Computed amount: ${taxReturn.computedTaxDue} ${taxReturn.filingCurrency}. Payment due: ${taxReturn.paymentDeadline}.`,
      severity: alertType === 'APPROVAL_REQUIRED' ? 'WARNING' : 'INFO',
      dueAt,
      createdAt: now,
      dedupeKey: `${taxReturn.id}:${alertType}`,
    });
  }

  private createFinanceAlert(input: {
    countryCode: string;
    taxReturnId?: string;
    alertType: FinanceAlertType;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    dueAt: string;
    createdAt: string;
    dedupeKey: string;
  }): FinanceAlertRecord {
    const existing = Array.from(this.financeAlerts.values()).find(
      (alert) => alert.dedupeKey === input.dedupeKey,
    );
    if (existing) return existing;

    const alert: FinanceAlertRecord = {
      id: randomUUID(),
      dedupeKey: input.dedupeKey,
      countryCode: input.countryCode,
      taxReturnId: input.taxReturnId,
      alertType: input.alertType,
      message: input.message,
      severity: input.severity,
      dueAt: input.dueAt,
      status: input.alertType === 'OVERDUE_REMITTANCE' ? 'OVERDUE' : 'OPEN',
      createdAt: input.createdAt,
    };

    this.financeAlerts.set(alert.id, alert);
    return alert;
  }

  private hasAlertDedupeKey(dedupeKey: string): boolean {
    return Array.from(this.financeAlerts.values()).some((alert) => alert.dedupeKey === dedupeKey);
  }

  private remittanceMessage(taxReturn: TaxReturnRecord, daysUntilDue: number): string {
    if (daysUntilDue < 0) {
      return `${taxReturn.countryCode} ${taxReturn.taxType} remittance is overdue since ${taxReturn.paymentDeadline}. Amount: ${taxReturn.computedTaxDue} ${taxReturn.filingCurrency}. Escalated to Global Finance.`;
    }

    if (daysUntilDue === 0) {
      return `${taxReturn.countryCode} ${taxReturn.taxType} remittance is due today. Amount: ${taxReturn.computedTaxDue} ${taxReturn.filingCurrency}. Submit filing and attach payment receipt.`;
    }

    return `${taxReturn.taxType} remittance due in ${daysUntilDue} days for ${taxReturn.countryCode}. Amount to remit: ${taxReturn.computedTaxDue} ${taxReturn.filingCurrency}. Filing deadline: ${taxReturn.filingDeadline}. Payment deadline: ${taxReturn.paymentDeadline}.`;
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }
}
