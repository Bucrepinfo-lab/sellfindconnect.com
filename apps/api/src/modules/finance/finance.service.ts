import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  applyTaxReturnCorrection,
  assertFilingApproverSeparation,
  assertTaxReturnCorrectionAllowed,
  assertTaxReturnCorrectionApproverSeparation,
  assertTaxReturnPeriodUnlocked,
  assertTaxReturnTransition,
  buildInvoiceNumber,
  buildTaxReturnExport,
  calculateFinanceAdjustmentBreakdown,
  calculatePaymentBalance,
  calculateTaxSnapshotAmounts,
  canExportCountryTaxReport,
  canOperateTaxReturnWorkbench,
  createFinanceDocumentNumber,
  evaluateSafetyFields,
  evaluateTaxPeriodCompletion,
  getDunningNoticeDecision,
  getCountry,
  looksLikeCardPan,
  getRemittanceAlertDecision,
  reconcileSettlement,
  roundMoney,
  summarizeInvoiceLines,
  type AccessRole,
  type DunningNoticeStage,
  type FinanceAdjustmentStatus,
  type FinanceAdjustmentType,
  type FinanceDocumentType,
  type FinanceAlertType,
  type ProductAuditAction,
  type TaxReportExportFormat,
  type TaxReturnEvidenceKind,
  type TaxReturnStatus,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type {
  ApproveTaxReturnDto,
  AttachTaxReturnEvidenceDto,
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CorrectTaxReturnDto,
  CreateInvoiceDto,
  CreateTaxRuleDto,
  ExportTaxReturnQueryDto,
  FileTaxReturnDto,
  GenerateTaxReturnDto,
  IssueInvoiceDto,
  IssueReceiptDto,
  LockTaxReturnDto,
  OpenChargebackDto,
  PayInvoiceDto,
  ReconcileSettlementDto,
  SettleProviderCaptureDto,
  RefundInvoiceDto,
  RemitTaxReturnDto,
  RequestRefundDto,
  RunDunningDto,
  RunFinanceAlertsDto,
  SubmitTaxReturnDto,
} from './dto/finance.dto';
import {
  buildPaymentIdempotencyKey,
  createConfiguredPaymentAdapter,
  type PaymentAdapter,
} from './payment.adapter';
import type {
  CountryTaxProfileRecord,
  DunningNoticeRecord,
  FinanceAdjustmentRecord,
  FinanceAlertRecord,
  FinanceInvoiceRecord,
  FinanceReceiptRecord,
  FinanceWorkbenchContext,
  InvoiceRecord,
  PaymentRecord,
  ReceiptRecord,
  ReconciliationRunRecord,
  TaxCalculationSnapshotRecord,
  TaxLedgerEntryRecord,
  TaxReturnEvidenceRecord,
  TaxReturnRecord,
  TaxRuleRecord,
} from './finance.records';
import { InMemoryFinanceRepository } from './in-memory-finance.repository';
import type { FinanceRepository } from './finance.repository';

@Injectable()
export class FinanceService {
  private readonly paymentAdapter: PaymentAdapter;
  private readonly auth?: AuthService;
  private readonly repository: FinanceRepository;

  constructor(
    paymentAdapter?: PaymentAdapter,
    auth?: AuthService,
    repository?: FinanceRepository,
  ) {
    this.paymentAdapter =
      paymentAdapter ??
      createConfiguredPaymentAdapter({ get: (key) => process.env[key] });
    this.auth = auth;
    this.repository = repository ?? new InMemoryFinanceRepository();
  }

  async configureCountryTaxProfile(input: ConfigureCountryTaxProfileDto): Promise<CountryTaxProfileRecord> {
    this.assertSafe(input, 'Country tax profile contains blocked content.');

    const country = getCountry(input.countryCode);
    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    const now = new Date().toISOString();
    const existing = await this.repository.getCountryProfile(input.countryCode);
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

    await this.repository.saveCountryProfile(profile);
    return profile;
  }

  async listCountryTaxProfiles(): Promise<CountryTaxProfileRecord[]> {
    return (await this.repository.listCountryProfiles()).sort((a, b) =>
      a.countryCode.localeCompare(b.countryCode),
    );
  }

  async createTaxRule(input: CreateTaxRuleDto): Promise<TaxRuleRecord> {
    this.assertSafe(input, 'Tax rule contains blocked content.');

    const profile = await this.repository.getCountryProfile(input.countryCode);
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

    await this.repository.saveTaxRule(rule);
    return rule;
  }

  async listTaxRules(countryCode?: string): Promise<TaxRuleRecord[]> {
    return (await this.repository.listTaxRules())
      .filter((rule) => !countryCode || rule.countryCode === countryCode)
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  async calculateTax(tenantId: string, input: CalculateTaxDto) {
    this.assertSafe(input, 'Tax calculation contains blocked content.');

    const transactionAt = input.transactionAt ?? new Date().toISOString();
    const profile = await this.requireApprovedProfile(input.countryCode);
    const rule = await this.findActiveRule(input, transactionAt);
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

    await this.repository.saveSnapshot(snapshot);
    for (const entry of ledgerEntries) {
      await this.repository.saveLedgerEntry(entry);
    }

    return { snapshot, ledgerEntries };
  }

  async listTaxCalculations(tenantId: string): Promise<TaxCalculationSnapshotRecord[]> {
    return (await this.repository.listSnapshots())
      .filter((snapshot) => snapshot.tenantId === tenantId)
      .sort((a, b) => b.transactionAt.localeCompare(a.transactionAt));
  }

  async generateTaxReturn(input: GenerateTaxReturnDto, context?: FinanceWorkbenchContext) {
    this.requireWorkbenchOperator(context);
    const profile = await this.requireApprovedProfile(input.countryCode);
    if (profile.status !== 'APPROVED') {
      throw new UnprocessableEntityException('Country tax profile is not approved.');
    }

    const snapshots = (await this.repository.listSnapshots()).filter((snapshot) => {
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
      evidence: [],
      corrections: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveTaxReturn(taxReturn);
    const alertsCreated = [
      await this.createReturnAlert(taxReturn, 'RETURN_READY_FOR_REVIEW', input.filingDeadline, now),
      await this.createReturnAlert(taxReturn, 'APPROVAL_REQUIRED', input.paymentDeadline, now),
    ];
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: context?.actorUserId,
      action: 'TAX_RETURN_GENERATED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        taxType: taxReturn.taxType,
        computedTaxDue: taxReturn.computedTaxDue,
        status: taxReturn.status,
      },
    });

    return { taxReturn, sourceSnapshotCount: snapshots.length, alertsCreated };
  }

  async listTaxReturns(context?: FinanceWorkbenchContext): Promise<TaxReturnRecord[]> {
    this.requireWorkbenchOperator(context);
    return (await this.repository.listTaxReturns()).sort((a, b) =>
      b.periodEnd.localeCompare(a.periodEnd),
    );
  }

  async getTaxReturn(id: string, context?: FinanceWorkbenchContext): Promise<TaxReturnRecord> {
    this.requireWorkbenchOperator(context);
    return await this.requireTaxReturn(id);
  }

  async submitTaxReturn(id: string, input: SubmitTaxReturnDto = {}, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    await this.transitionTaxReturn(taxReturn, 'IN_REVIEW', this.actorName(input, actor));
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_SUBMITTED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        actorRole: actor,
      },
    });
    return taxReturn;
  }

  async approveTaxReturn(id: string, input: ApproveTaxReturnDto = {}, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    await this.assertReconciliationClear(taxReturn.countryCode);
    const approvedBy = this.actorName(input, actor);
    await this.transitionTaxReturn(taxReturn, 'APPROVED', approvedBy);
    taxReturn.reviewApprovedBy = approvedBy;
    taxReturn.reviewApprovedAt = taxReturn.updatedAt;
    await this.repository.saveTaxReturn(taxReturn);
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_APPROVED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        actorRole: actor,
      },
    });
    return taxReturn;
  }

  async attachTaxReturnEvidence(
    id: string,
    input: AttachTaxReturnEvidenceDto,
    context?: FinanceWorkbenchContext,
  ) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    this.assertSafe(input, 'Tax return evidence contains blocked content.');
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    const evidence = await this.addTaxReturnEvidence(taxReturn, input, this.actorName(input, actor));
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_EVIDENCE_ATTACHED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        evidenceKind: evidence.kind,
        noteLength: input.note?.length ?? 0,
        actorRole: actor,
      },
    });
    return { taxReturn, evidence };
  }

  async fileTaxReturn(id: string, input: FileTaxReturnDto, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    this.assertSafe(input, 'Tax return filing contains blocked content.');
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    const filingApprovedBy = this.actorName(input, actor);
    this.runWorkbench(() =>
      assertFilingApproverSeparation({
        computedTaxDue: taxReturn.computedTaxDue,
        reviewApprovedBy: taxReturn.reviewApprovedBy ?? '',
        filingApprovedBy,
        thresholdAmount: input.dualApprovalThresholdAmount,
      }),
    );
    await this.addTaxReturnEvidence(taxReturn, input, filingApprovedBy);
    if (!taxReturn.evidence.some((item) => item.kind === 'FILING_CONFIRMATION')) {
      throw new UnprocessableEntityException('Filing confirmation evidence is required before filing.');
    }
    await this.transitionTaxReturn(taxReturn, 'FILED', filingApprovedBy);
    taxReturn.filingApprovedBy = filingApprovedBy;
    taxReturn.filingApprovedAt = taxReturn.updatedAt;
    taxReturn.filedAt = taxReturn.updatedAt;
    await this.repository.saveTaxReturn(taxReturn);
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_FILED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        actorRole: actor,
      },
    });
    return taxReturn;
  }

  async remitTaxReturn(id: string, input: RemitTaxReturnDto, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    this.assertSafe(input, 'Tax return remittance contains blocked content.');
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    await this.addTaxReturnEvidence(
      taxReturn,
      {
        kind: input.kind ?? 'REMITTANCE_RECEIPT',
        reference: input.reference,
        note: input.note,
      },
      this.actorName(input, actor),
    );
    if (!taxReturn.evidence.some((item) => item.kind === 'REMITTANCE_RECEIPT')) {
      throw new UnprocessableEntityException('Remittance receipt evidence is required before remittance.');
    }
    await this.transitionTaxReturn(taxReturn, 'REMITTED', this.actorName(input, actor));
    taxReturn.remittedAt = taxReturn.updatedAt;
    await this.repository.saveTaxReturn(taxReturn);
    await this.createFinanceAlert({
      countryCode: taxReturn.countryCode,
      taxReturnId: taxReturn.id,
      alertType: 'FILING_COMPLETED',
      message: `${taxReturn.countryCode} ${taxReturn.taxType} return for ${taxReturn.periodStart.slice(0, 7)} marked filed and remitted. Receipt/reference: ${input.reference}.`,
      severity: 'INFO',
      dueAt: taxReturn.updatedAt,
      createdAt: taxReturn.updatedAt,
      dedupeKey: `${taxReturn.id}:FILING_COMPLETED`,
    });
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_REMITTED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        actorRole: actor,
      },
    });
    return taxReturn;
  }

  async lockTaxReturn(id: string, input: LockTaxReturnDto = {}, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    const taxReturn = await this.requireUnlockedTaxReturn(id);
    const completion = evaluateTaxPeriodCompletion({
      status: taxReturn.status,
      evidenceKinds: taxReturn.evidence.map((item) => item.kind),
      reviewApprovedBy: taxReturn.reviewApprovedBy,
      filingApprovedBy: taxReturn.filingApprovedBy,
      remittedAt: taxReturn.remittedAt,
    });
    if (!completion.complete) {
      throw new UnprocessableEntityException(
        `Tax period cannot be locked until filing evidence, remittance evidence, approvers, and timestamps are present. Missing: ${completion.missing.join(', ')}.`,
      );
    }
    await this.transitionTaxReturn(taxReturn, 'LOCKED', this.actorName(input, actor));
    taxReturn.lockedAt = taxReturn.updatedAt;
    await this.repository.saveTaxReturn(taxReturn);
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_LOCKED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        actorRole: actor,
      },
    });
    return taxReturn;
  }

  async correctTaxReturn(id: string, input: CorrectTaxReturnDto, context?: FinanceWorkbenchContext) {
    const actor = this.requireWorkbenchOperator({ ...context, ...input });
    this.assertSafe(input, 'Tax return correction contains blocked content.');
    const taxReturn = await this.requireTaxReturn(id);
    this.runWorkbench(() => assertTaxReturnCorrectionAllowed(taxReturn.status));
    const approvedBy = this.actorName(input, actor);
    this.runWorkbench(() =>
      assertTaxReturnCorrectionApproverSeparation({
        adjustmentAmount: input.amount,
        filingApprovedBy: taxReturn.filingApprovedBy,
        correctionApprovedBy: approvedBy,
        thresholdAmount: input.dualApprovalThresholdAmount,
      }),
    );
    const amounts = this.runWorkbench(() =>
      applyTaxReturnCorrection({
        computedTaxDue: taxReturn.computedTaxDue,
        adjustmentAmount: input.amount,
      }),
    );
    const now = new Date().toISOString();
    const evidence = await this.addTaxReturnEvidence(
      taxReturn,
      {
        kind: 'PERIOD_CORRECTION',
        reference: input.reference,
        note: input.note,
      },
      approvedBy,
    );
    const correction = {
      id: randomUUID(),
      amount: roundMoney(input.amount),
      previousComputedTaxDue: amounts.previousComputedTaxDue,
      nextComputedTaxDue: amounts.nextComputedTaxDue,
      reason: input.reason,
      reference: input.reference.trim(),
      note: input.note?.trim() || undefined,
      approvedBy,
      createdAt: now,
    };
    taxReturn.computedTaxDue = amounts.nextComputedTaxDue;
    taxReturn.corrections = [...taxReturn.corrections, correction];
    taxReturn.updatedAt = now;
    await this.repository.saveTaxReturn(taxReturn);
    const ledgerEntry: TaxLedgerEntryRecord = {
      id: randomUUID(),
      entryType: 'TAX_PERIOD_CORRECTION',
      amount: correction.amount,
      currencyCode: taxReturn.filingCurrency,
      occurredAt: now,
      createdAt: now,
    };
    await this.repository.saveLedgerEntry(ledgerEntry);
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: input.actorUserId ?? context?.actorUserId,
      action: 'TAX_RETURN_CORRECTED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        status: taxReturn.status,
        amount: correction.amount,
        reason: correction.reason,
        actorRole: actor,
      },
    });
    return { taxReturn, correction, evidence, ledgerEntry };
  }

  async exportTaxReturn(id: string, query: ExportTaxReturnQueryDto = {}, context?: FinanceWorkbenchContext) {
    const actor = this.requireExportOperator({ ...context, actorRole: query.actorRole });
    const taxReturn = await this.requireTaxReturn(id);
    const format: TaxReportExportFormat = query.format ?? 'CSV';
    const exported = buildTaxReturnExport(
      {
        id: taxReturn.id,
        countryCode: taxReturn.countryCode,
        taxType: taxReturn.taxType,
        periodStart: taxReturn.periodStart,
        periodEnd: taxReturn.periodEnd,
        filingDeadline: taxReturn.filingDeadline,
        paymentDeadline: taxReturn.paymentDeadline,
        filingCurrency: taxReturn.filingCurrency,
        computedTaxDue: taxReturn.computedTaxDue,
        status: taxReturn.status,
        reviewApprovedBy: taxReturn.reviewApprovedBy,
        filingApprovedBy: taxReturn.filingApprovedBy,
        filedAt: taxReturn.filedAt,
        remittedAt: taxReturn.remittedAt,
        lockedAt: taxReturn.lockedAt,
        evidence: taxReturn.evidence.map((item) => ({
          kind: item.kind,
          reference: item.reference,
          attachedAt: item.attachedAt,
          attachedBy: item.attachedBy,
        })),
      },
      format,
    );
    this.auditProduct({
      tenantId: context?.tenantId,
      actorUserId: context?.actorUserId,
      action: 'TAX_REPORT_EXPORTED',
      entityId: taxReturn.id,
      metadata: {
        countryCode: taxReturn.countryCode,
        format: exported.format,
        actorRole: actor,
      },
    });
    return exported;
  }

  async createInvoice(tenantId: string, input: CreateInvoiceDto) {
    this.assertSafe(input, 'Invoice request contains blocked content.');

    const taxCalculation = await this.calculateTax(tenantId, input);
    const now = new Date().toISOString();
    const invoice = await this.createInvoiceRecord(tenantId, input, taxCalculation.snapshot, now);
    await this.repository.saveInvoice(invoice);

    const receipt = input.issueReceipt
      ? await this.createReceiptForInvoice(
          invoice,
          {
            amountPaid: input.amountPaid ?? invoice.totalAmount,
            paymentProvider: input.paymentProvider ?? input.provider ?? 'MANUAL',
            paymentReference:
              input.paymentReference ?? input.providerReference ?? input.billingReference,
            paidAt: input.paidAt,
          },
          now,
        )
      : undefined;

    return { invoice, receipt, taxCalculation };
  }

  async listInvoices(tenantId: string): Promise<FinanceInvoiceRecord[]> {
    return (await this.repository.listInvoices())
      .filter((invoice) => invoice.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async issueReceipt(tenantId: string, input: IssueReceiptDto) {
    this.assertSafe(input, 'Receipt request contains blocked content.');

    const invoice = await this.repository.getInvoice(input.invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found.');
    }

    const now = new Date().toISOString();
    const receipt = await this.createReceiptForInvoice(invoice, input, now);
    return { invoice, receipt };
  }

  async listReceipts(tenantId: string): Promise<FinanceReceiptRecord[]> {
    return (await this.repository.listReceipts())
      .filter((receipt) => receipt.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async requestRefund(tenantId: string, input: RequestRefundDto) {
    this.assertSafe(input, 'Refund request contains blocked content.');

    const invoice = await this.requireTenantInvoice(tenantId, input.invoiceId);
    const now = new Date().toISOString();
    const adjustment = await this.createAdjustmentRecord(
      invoice,
      {
        adjustmentType: 'REFUND',
        amount: input.amount,
        reason: input.reason,
        paymentProvider: input.paymentProvider,
        providerReference: input.providerReference,
        evidenceUrl: input.evidenceUrl,
        requestedBy: input.requestedBy,
        status: input.providerReference ? 'SETTLED' : 'REQUESTED',
        settledAt: input.settledAt ?? (input.providerReference ? now : undefined),
      },
      now,
    );
    const ledgerEntries = this.createAdjustmentLedgerEntries(adjustment, now);

    await this.repository.saveAdjustment(adjustment);
    for (const entry of ledgerEntries) {
      await this.repository.saveLedgerEntry(entry);
    }
    await this.applyAdjustmentToInvoice(invoice, adjustment, now);

    const financeAlert = await this.createFinanceAlert({
      tenantId,
      countryCode: invoice.countryCode,
      invoiceId: invoice.id,
      alertType: 'REFUND_ISSUED',
      message: `Refund ${adjustment.creditNoteNumber} created for ${invoice.invoiceNumber}. Amount: ${adjustment.amount} ${adjustment.currencyCode}.`,
      severity: 'INFO',
      dueAt: now,
      createdAt: now,
      dedupeKey: `${adjustment.id}:REFUND_ISSUED`,
    });

    return { adjustment, invoice, ledgerEntries, financeAlert };
  }

  async openChargeback(tenantId: string, input: OpenChargebackDto) {
    this.assertSafe(input, 'Chargeback request contains blocked content.');

    const invoice = await this.requireTenantInvoice(tenantId, input.invoiceId);
    const now = input.openedAt ?? new Date().toISOString();
    const adjustment = await this.createAdjustmentRecord(
      invoice,
      {
        adjustmentType: 'CHARGEBACK',
        amount: input.amount,
        reason: input.reason,
        paymentProvider: input.paymentProvider,
        providerReference: input.providerReference,
        evidenceUrl: input.evidenceUrl,
        requestedBy: input.openedBy,
        status: 'SUBMITTED',
      },
      now,
    );
    const ledgerEntries = this.createAdjustmentLedgerEntries(adjustment, now);

    await this.repository.saveAdjustment(adjustment);
    for (const entry of ledgerEntries) {
      await this.repository.saveLedgerEntry(entry);
    }
    await this.applyAdjustmentToInvoice(invoice, adjustment, now);

    const financeAlert = await this.createFinanceAlert({
      tenantId,
      countryCode: invoice.countryCode,
      invoiceId: invoice.id,
      alertType: 'CHARGEBACK_OPENED',
      message: `Chargeback opened for ${invoice.invoiceNumber}. Amount: ${adjustment.amount} ${adjustment.currencyCode}. Evidence and response are required.`,
      severity: 'WARNING',
      dueAt: now,
      createdAt: now,
      dedupeKey: `${adjustment.id}:CHARGEBACK_OPENED`,
    });

    return { adjustment, invoice, ledgerEntries, financeAlert };
  }

  async listAdjustments(tenantId: string): Promise<FinanceAdjustmentRecord[]> {
    return (await this.repository.listAdjustments())
      .filter((adjustment) => adjustment.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async runDunning(tenantId: string, input: RunDunningDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const noticesCreated: DunningNoticeRecord[] = [];

    for (const invoice of await this.repository.listInvoices()) {
      if (invoice.tenantId !== tenantId) continue;
      if (input.invoiceId && invoice.id !== input.invoiceId) continue;
      if (!invoice.dueAt || invoice.amountDue <= 0) continue;
      if (['VOID', 'REFUNDED'].includes(invoice.status)) continue;

      const decision = getDunningNoticeDecision(invoice.dueAt, now);
      if (!decision) continue;

      const dedupeKey = `${invoice.id}:DUNNING:${decision.stage}`;
      if (await this.hasDunningNoticeDedupeKey(dedupeKey)) continue;

      const notice: DunningNoticeRecord = {
        id: randomUUID(),
        tenantId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        countryCode: invoice.countryCode,
        stage: decision.stage,
        daysOverdue: decision.daysOverdue,
        amountDue: invoice.amountDue,
        currencyCode: invoice.presentmentCurrency,
        message: this.dunningMessage(invoice, decision),
        severity: decision.severity,
        status: 'OPEN',
        dueAt: invoice.dueAt,
        createdAt: now,
        dedupeKey,
      };

      invoice.status = 'OVERDUE';
      invoice.updatedAt = now;
      await this.repository.saveInvoice(invoice);
      await this.repository.saveDunningNotice(notice);
      await this.createFinanceAlert({
        tenantId,
        countryCode: invoice.countryCode,
        invoiceId: invoice.id,
        alertType: 'DUNNING_NOTICE',
        message: notice.message,
        severity: notice.severity,
        dueAt: invoice.dueAt,
        createdAt: now,
        dedupeKey,
      });
      noticesCreated.push(notice);
    }

    return {
      checkedAt: now,
      noticesCreated,
      openNotices: await this.listDunningNotices(tenantId),
    };
  }

  async listDunningNotices(tenantId: string): Promise<DunningNoticeRecord[]> {
    return (await this.repository.listDunningNotices())
      .filter((notice) => notice.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async runFinanceAlerts(input: RunFinanceAlertsDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alertsCreated: FinanceAlertRecord[] = [];

    for (const taxReturn of await this.repository.listTaxReturns()) {
      if (['FILED', 'REMITTED', 'LOCKED'].includes(taxReturn.status)) continue;

      const decision = getRemittanceAlertDecision(taxReturn.paymentDeadline, now);
      if (!decision) continue;

      const dedupeKey = [
        taxReturn.id,
        decision.alertType,
        decision.daysUntilDue,
      ].join(':');
      if (await this.hasAlertDedupeKey(dedupeKey)) continue;

      const alert = await this.createFinanceAlert({
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
      openAlerts: await this.listFinanceAlerts(),
    };
  }

  async listFinanceAlerts(): Promise<FinanceAlertRecord[]> {
    return (await this.repository.listFinanceAlerts()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async issueInvoice(tenantId: string, input: IssueInvoiceDto): Promise<InvoiceRecord> {
    this.assertSafe(input, 'Invoice contains blocked content.');

    // Validates the country has an APPROVED tax profile before any invoice is
    // issued; throws otherwise.
    await this.requireApprovedProfile(input.countryCode);
    const issuedAt = input.issuedAt ?? new Date().toISOString();

    let taxAmount = input.taxAmount ?? 0;
    let currencyCode = input.currencyCode.toUpperCase();
    let taxCalculationSnapshotId: string | undefined;

    if (input.taxCalculationSnapshotId) {
      const snapshot = await this.repository.getSnapshot(input.taxCalculationSnapshotId);
      if (!snapshot || snapshot.tenantId !== tenantId) {
        throw new NotFoundException('Tax calculation snapshot not found for this tenant.');
      }
      taxAmount = snapshot.taxAmount;
      currencyCode = snapshot.presentmentCurrency;
      taxCalculationSnapshotId = snapshot.id;
    }

    const summary = summarizeInvoiceLines(input.lines, taxAmount);
    const sequence = await this.nextInvoiceSequence(input.countryCode);
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

    await this.repository.savePaymentInvoice(invoice);
    return invoice;
  }

  async listPaymentInvoices(tenantId: string): Promise<InvoiceRecord[]> {
    return (await this.repository.listPaymentInvoices())
      .filter((invoice) => invoice.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async payInvoice(tenantId: string, input: PayInvoiceDto) {
    this.assertSafe(input, 'Payment contains blocked content.');

    const invoice = await this.requireTenantPaymentInvoice(tenantId, input.invoiceId);

    // Idempotency is checked first so a replay with the same key returns the
    // original result instead of tripping the "already paid" guard below.
    const attempt = (await this.countInvoicePayments(invoice.id)) + 1;
    const idempotencyKey =
      input.idempotencyKey ??
      buildPaymentIdempotencyKey({ tenantId, invoiceId: invoice.id, attempt });
    const existing = (await this.repository.listPayments()).find(
      (payment) => payment.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      return {
        invoice: await this.repository.getPaymentInvoice(existing.invoiceId) ?? invoice,
        payment: existing,
        receipt: await this.findReceiptForPayment(existing.id),
        idempotentReplay: true,
      };
    }

    if (invoice.status === 'PAID') {
      throw new UnprocessableEntityException('Invoice is already fully paid.');
    }
    if (['VOID', 'UNCOLLECTIBLE', 'REFUNDED'].includes(invoice.status)) {
      throw new UnprocessableEntityException(`Invoice in ${invoice.status} state cannot be paid.`);
    }
    const pendingCapture = (await this.repository.listPayments()).find(
      (item) => item.invoiceId === invoice.id && item.status === 'REQUIRES_CAPTURE',
    );
    if (pendingCapture) {
      throw new UnprocessableEntityException('Invoice already has a pending provider capture.');
    }
    if (input.customerReference && looksLikeCardPan(input.customerReference)) {
      throw new UnprocessableEntityException(
        'Card numbers must not be submitted. Use a provider payment-method token or mobile-money phone.',
      );
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
      customerReference: input.customerReference,
      failureReason: result.failureReason,
      capturedAt: result.status === 'CAPTURED' ? now : undefined,
      createdAt: now,
    };
    await this.repository.savePayment(payment);

    if (result.status === 'FAILED') {
      throw new UnprocessableEntityException({
        message: 'Payment capture failed.',
        payment,
      });
    }

    if (result.status === 'REQUIRES_CAPTURE') {
      return { invoice, payment, receipt: null, idempotentReplay: false };
    }

    const amountPaid = roundMoney(invoice.amountPaid + result.capturedAmount);
    const paidInvoice: InvoiceRecord = {
      ...invoice,
      amountPaid,
      status: amountPaid >= invoice.total ? 'PAID' : invoice.status,
      updatedAt: now,
    };
    await this.repository.savePaymentInvoice(paidInvoice);

    const receipt: ReceiptRecord = {
      id: randomUUID(),
      tenantId,
      invoiceId: invoice.id,
      paymentId: payment.id,
      receiptNumber: `${paidInvoice.invoiceNumber}-R${(await this.countInvoiceReceipts(invoice.id)) + 1}`,
      amount: result.capturedAmount,
      currencyCode: invoice.currencyCode,
      issuedAt: now,
    };
    await this.repository.savePaymentReceipt(receipt);

    return { invoice: paidInvoice, payment, receipt, idempotentReplay: false };
  }

  async refundInvoice(tenantId: string, input: RefundInvoiceDto) {
    this.assertSafe(input, 'Refund contains blocked content.');

    const invoice = await this.requireTenantPaymentInvoice(tenantId, input.invoiceId);
    const capturedPayments = (await this.repository.listPayments()).filter(
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
      customerReference: source.customerReference,
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
      idempotencyKey: `${source.idempotencyKey}:refund:${(await this.countInvoiceRefunds(invoice.id)) + 1}`,
      failureReason: result.failureReason,
      createdAt: now,
    };
    await this.repository.savePayment(refundPayment);

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
    await this.repository.savePaymentInvoice(refundedInvoice);

    return { invoice: refundedInvoice, refund: refundPayment };
  }

  async settleProviderCapture(tenantId: string, input: SettleProviderCaptureDto) {
    this.assertSafe(input, 'Payment settlement contains blocked content.');

    const payment = (await this.repository.listPayments()).find(
      (item) => item.tenantId === tenantId && item.providerPaymentId === input.providerPaymentId,
    );
    if (!payment) {
      throw new NotFoundException('Pending provider payment was not found.');
    }

    const invoice = await this.requireTenantPaymentInvoice(tenantId, payment.invoiceId);
    if (payment.status === 'CAPTURED' && input.status === 'CAPTURED') {
      return {
        invoice,
        payment,
        receipt: await this.findReceiptForPayment(payment.id),
        idempotentReplay: true,
      };
    }
    if (payment.status !== 'REQUIRES_CAPTURE') {
      throw new UnprocessableEntityException('Only pending provider captures can be settled.');
    }

    const now = new Date().toISOString();
    if (input.status === 'FAILED') {
      const failed: PaymentRecord = {
        ...payment,
        status: 'FAILED',
        failureReason: input.failureReason ?? 'Provider capture failed.',
      };
      await this.repository.savePayment(failed);
      return { invoice, payment: failed, receipt: null, idempotentReplay: false };
    }

    const capturedAmount = roundMoney(input.capturedAmount ?? payment.amount);
    if (capturedAmount <= 0) {
      throw new UnprocessableEntityException('Settled capture amount must be greater than zero.');
    }

    const captured: PaymentRecord = {
      ...payment,
      status: 'CAPTURED',
      amount: capturedAmount,
      failureReason: undefined,
      capturedAt: now,
    };
    await this.repository.savePayment(captured);

    const amountPaid = roundMoney(invoice.amountPaid + capturedAmount);
    const paidInvoice: InvoiceRecord = {
      ...invoice,
      amountPaid,
      status: amountPaid >= invoice.total ? 'PAID' : invoice.status,
      updatedAt: now,
    };
    await this.repository.savePaymentInvoice(paidInvoice);

    const receipt: ReceiptRecord = {
      id: randomUUID(),
      tenantId,
      invoiceId: invoice.id,
      paymentId: captured.id,
      receiptNumber: `${paidInvoice.invoiceNumber}-R${(await this.countInvoiceReceipts(invoice.id)) + 1}`,
      amount: capturedAmount,
      currencyCode: invoice.currencyCode,
      issuedAt: now,
    };
    await this.repository.savePaymentReceipt(receipt);

    return { invoice: paidInvoice, payment: captured, receipt, idempotentReplay: false };
  }

  async listPayments(tenantId: string): Promise<PaymentRecord[]> {
    return (await this.repository.listPayments())
      .filter((payment) => payment.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listPaymentReceipts(tenantId: string): Promise<ReceiptRecord[]> {
    return (await this.repository.listPaymentReceipts())
      .filter((receipt) => receipt.tenantId === tenantId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async reconcileProviderSettlement(tenantId: string, input: ReconcileSettlementDto) {
    this.assertSafe(input, 'Reconciliation input contains blocked content.');

    const currencyFilter = input.currencyCode?.toUpperCase();
    const ledgerLines = (await this.repository.listPayments())
      .filter((payment) => payment.tenantId === tenantId)
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
      tenantId,
      provider: input.provider ?? 'ALL_PROVIDERS',
      statementReference: input.statementReference,
      countryCode: input.countryCode,
      currencyCode: currencyFilter,
      summary,
      createdAt: now,
    };
    await this.repository.saveReconciliationRun(run);

    if (summary.hasVariance) {
      await this.createFinanceAlert({
        tenantId,
        countryCode: input.countryCode ?? 'GLOBAL',
        alertType: 'RECONCILIATION_VARIANCE',
        message: `Settlement ${input.statementReference} has ${summary.varianceCount} amount variance(s), ${summary.missingInLedgerCount} missing in ledger, ${summary.missingInSettlementCount} missing in settlement. Total absolute variance: ${summary.totalVarianceAmount} ${currencyFilter ?? ''}.`.trim(),
        severity: 'WARNING',
        dueAt: now,
        createdAt: now,
        dedupeKey: `reconciliation:${input.statementReference}`,
      });
    }

    return { run, openAlerts: await this.listFinanceAlerts() };
  }

  async listReconciliationRuns(tenantId: string): Promise<ReconciliationRunRecord[]> {
    return (await this.repository.listReconciliationRuns())
      .filter((run) => run.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async requireTenantPaymentInvoice(tenantId: string, invoiceId: string): Promise<InvoiceRecord> {
    const invoice = await this.repository.getPaymentInvoice(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found for this tenant.');
    }
    return invoice;
  }

  private async nextInvoiceSequence(countryCode: string): Promise<number> {
    return this.repository.nextPaymentInvoiceSequence(countryCode);
  }

  private async countInvoicePayments(invoiceId: string): Promise<number> {
    return (await this.repository.listPayments()).filter(
      (payment) => payment.invoiceId === invoiceId && payment.amount > 0,
    ).length;
  }

  private async countInvoiceRefunds(invoiceId: string): Promise<number> {
    return (await this.repository.listPayments()).filter(
      (payment) => payment.invoiceId === invoiceId && payment.amount < 0,
    ).length;
  }

  private async countInvoiceReceipts(invoiceId: string): Promise<number> {
    return (await this.repository.listPaymentReceipts()).filter(
      (receipt) => receipt.invoiceId === invoiceId,
    ).length;
  }

  private async findReceiptForPayment(paymentId: string): Promise<ReceiptRecord | undefined> {
    return (await this.repository.listPaymentReceipts()).find(
      (receipt) => receipt.paymentId === paymentId,
    );
  }

  private async requireApprovedProfile(countryCode: string): Promise<CountryTaxProfileRecord> {
    const profile = await this.repository.getCountryProfile(countryCode);
    if (!profile) {
      throw new NotFoundException('Country tax profile not found.');
    }

    if (profile.status !== 'APPROVED') {
      throw new UnprocessableEntityException('Country tax profile must be approved before paid use.');
    }

    return profile;
  }

  private async findActiveRule(input: CalculateTaxDto, transactionAt: string): Promise<TaxRuleRecord> {
    const taxType = input.taxType?.toUpperCase();
    const productTaxCode = input.productTaxCode?.toUpperCase();
    const candidates = (await this.repository.listTaxRules())
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

  private async createInvoiceRecord(
    tenantId: string,
    input: CreateInvoiceDto,
    snapshot: TaxCalculationSnapshotRecord,
    now: string,
  ): Promise<FinanceInvoiceRecord> {
    const issuedAt = now;
    const balance = calculatePaymentBalance({
      totalAmount: snapshot.grossAmount,
      amountPaid: 0,
    });

    return {
      id: randomUUID(),
      tenantId,
      invoiceNumber: await this.nextDocumentNumber(input.countryCode, 'INVOICE', issuedAt),
      countryCode: input.countryCode,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      billingReference: input.billingReference ?? input.providerReference,
      taxCalculationSnapshotId: snapshot.id,
      lineItems: [
        {
          description: input.lineItemDescription,
          quantity: 1,
          unitAmount: roundMoney(input.grossAmount),
          taxableAmount: snapshot.taxableAmount,
          taxAmount: snapshot.taxAmount,
          grossAmount: snapshot.grossAmount,
          currencyCode: snapshot.presentmentCurrency,
        },
      ],
      subtotalAmount: snapshot.taxableAmount,
      taxAmount: snapshot.taxAmount,
      totalAmount: balance.totalAmount,
      amountPaid: balance.amountPaid,
      amountDue: balance.amountDue,
      refundedAmount: 0,
      chargebackAmount: 0,
      netCollectedAmount: 0,
      paymentStatus: balance.paymentStatus,
      presentmentCurrency: snapshot.presentmentCurrency,
      filingCurrency: snapshot.filingCurrency,
      status: 'ISSUED',
      issuedAt,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async createReceiptForInvoice(
    invoice: FinanceInvoiceRecord,
    input: {
      amountPaid?: number;
      paymentProvider: string;
      paymentReference?: string;
      paidAt?: string;
    },
    now: string,
  ): Promise<FinanceReceiptRecord> {
    if (invoice.paymentStatus === 'PAID' || invoice.paymentStatus === 'OVERPAID') {
      throw new UnprocessableEntityException('Invoice already has a settled payment balance.');
    }

    if (!input.paymentReference) {
      throw new UnprocessableEntityException('Payment reference is required to issue a receipt.');
    }

    const duplicateReceipt = (await this.repository.listReceipts()).find(
      (receipt) =>
        receipt.paymentProvider === input.paymentProvider &&
        receipt.paymentReference === input.paymentReference,
    );
    if (duplicateReceipt) {
      throw new UnprocessableEntityException('Payment reference already has a receipt.');
    }

    const receiptAmount = input.amountPaid ?? invoice.amountDue;
    if (receiptAmount <= 0) {
      throw new UnprocessableEntityException('Receipt amount must be greater than zero.');
    }

    const paidAt = input.paidAt ?? now;
    const receipt: FinanceReceiptRecord = {
      id: randomUUID(),
      tenantId: invoice.tenantId,
      receiptNumber: await this.nextDocumentNumber(invoice.countryCode, 'RECEIPT', now),
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      countryCode: invoice.countryCode,
      taxCalculationSnapshotId: invoice.taxCalculationSnapshotId,
      amountPaid: roundMoney(receiptAmount),
      currencyCode: invoice.presentmentCurrency,
      paymentProvider: input.paymentProvider,
      paymentReference: input.paymentReference,
      paidAt,
      issuedAt: now,
      createdAt: now,
    };

    const balance = calculatePaymentBalance({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid + receipt.amountPaid,
    });
    invoice.amountPaid = balance.amountPaid;
    invoice.amountDue = balance.amountDue;
    invoice.paymentStatus = balance.paymentStatus;
    invoice.netCollectedAmount = roundMoney(
      invoice.amountPaid - invoice.refundedAmount - invoice.chargebackAmount,
    );
    invoice.status =
      balance.paymentStatus === 'PAID' || balance.paymentStatus === 'OVERPAID'
        ? 'PAID'
        : 'ISSUED';
    invoice.updatedAt = now;

    await this.repository.saveInvoice(invoice);
    await this.repository.saveReceipt(receipt);
    return receipt;
  }

  private async requireTenantInvoice(tenantId: string, invoiceId: string): Promise<FinanceInvoiceRecord> {
    const invoice = await this.repository.getInvoice(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found.');
    }

    return invoice;
  }

  private async createAdjustmentRecord(
    invoice: FinanceInvoiceRecord,
    input: {
      adjustmentType: FinanceAdjustmentType;
      amount: number;
      reason: string;
      paymentProvider?: string;
      providerReference?: string;
      evidenceUrl?: string;
      requestedBy?: string;
      status: FinanceAdjustmentStatus;
      settledAt?: string;
    },
    now: string,
  ): Promise<FinanceAdjustmentRecord> {
    const availableAmount = this.availableAdjustmentAmount(invoice);
    if (input.amount <= 0) {
      throw new UnprocessableEntityException('Adjustment amount must be greater than zero.');
    }

    if (input.amount > availableAmount) {
      throw new UnprocessableEntityException('Adjustment amount exceeds the collected balance.');
    }

    const snapshot = await this.repository.getSnapshot(invoice.taxCalculationSnapshotId);
    if (!snapshot) {
      throw new NotFoundException('Tax calculation snapshot not found for invoice.');
    }

    const breakdown = calculateFinanceAdjustmentBreakdown({
      grossAmount: snapshot.grossAmount,
      taxAmount: snapshot.taxAmount,
      netRevenueAmount: snapshot.netRevenueAmount,
      adjustmentAmount: input.amount,
    });

    return {
      id: randomUUID(),
      tenantId: invoice.tenantId,
      adjustmentType: input.adjustmentType,
      creditNoteNumber:
        input.adjustmentType === 'REFUND'
          ? await this.nextDocumentNumber(invoice.countryCode, 'CREDIT_NOTE', now)
          : undefined,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      countryCode: invoice.countryCode,
      taxCalculationSnapshotId: invoice.taxCalculationSnapshotId,
      amount: breakdown.grossAmount,
      taxAmount: breakdown.taxAmount,
      netRevenueAmount: breakdown.netRevenueAmount,
      currencyCode: invoice.presentmentCurrency,
      filingCurrency: invoice.filingCurrency,
      reason: input.reason,
      paymentProvider: input.paymentProvider,
      providerReference: input.providerReference,
      evidenceUrl: input.evidenceUrl,
      status: input.status,
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: now,
      settledAt: input.settledAt,
    };
  }

  private availableAdjustmentAmount(invoice: FinanceInvoiceRecord): number {
    return roundMoney(invoice.amountPaid - invoice.refundedAmount - invoice.chargebackAmount);
  }

  private createAdjustmentLedgerEntries(
    adjustment: FinanceAdjustmentRecord,
    now: string,
  ): TaxLedgerEntryRecord[] {
    const taxEntryType =
      adjustment.adjustmentType === 'REFUND'
        ? 'REFUND_TAX_REVERSAL'
        : 'CHARGEBACK_TAX_REVERSAL';
    const revenueEntryType =
      adjustment.adjustmentType === 'REFUND'
        ? 'REFUND_REVENUE_REVERSAL'
        : 'CHARGEBACK_REVENUE_REVERSAL';
    return [
      {
        id: randomUUID(),
        taxCalculationSnapshotId: adjustment.taxCalculationSnapshotId,
        entryType: taxEntryType,
        amount: -adjustment.taxAmount,
        currencyCode: adjustment.filingCurrency,
        occurredAt: adjustment.settledAt ?? adjustment.createdAt,
        createdAt: now,
      },
      {
        id: randomUUID(),
        taxCalculationSnapshotId: adjustment.taxCalculationSnapshotId,
        entryType: revenueEntryType,
        amount: -adjustment.netRevenueAmount,
        currencyCode: adjustment.currencyCode,
        occurredAt: adjustment.settledAt ?? adjustment.createdAt,
        createdAt: now,
      },
    ];
  }

  private async applyAdjustmentToInvoice(
    invoice: FinanceInvoiceRecord,
    adjustment: FinanceAdjustmentRecord,
    now: string,
  ): Promise<void> {
    if (adjustment.adjustmentType === 'REFUND') {
      invoice.refundedAmount = roundMoney(invoice.refundedAmount + adjustment.amount);
      invoice.status = invoice.refundedAmount >= invoice.amountPaid ? 'REFUNDED' : invoice.status;
    } else {
      invoice.chargebackAmount = roundMoney(invoice.chargebackAmount + adjustment.amount);
      invoice.status = 'DISPUTED';
    }

    invoice.netCollectedAmount = roundMoney(
      invoice.amountPaid - invoice.refundedAmount - invoice.chargebackAmount,
    );
    const balance = calculatePaymentBalance({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.netCollectedAmount,
    });
    invoice.amountDue = balance.amountDue;
    invoice.paymentStatus = balance.paymentStatus;
    invoice.updatedAt = now;
    await this.repository.saveInvoice(invoice);
  }

  private async nextDocumentNumber(
    countryCode: string,
    documentType: FinanceDocumentType,
    issuedAt: string,
  ): Promise<string> {
    const year = new Date(issuedAt).getUTCFullYear();
    const key = `${countryCode.toUpperCase()}:${documentType}:${year}`;
    const sequence = await this.repository.nextDocumentSequence(key);
    return createFinanceDocumentNumber({ countryCode, documentType, issuedAt, sequence });
  }

  private async createReturnAlert(
    taxReturn: TaxReturnRecord,
    alertType: Extract<FinanceAlertType, 'RETURN_READY_FOR_REVIEW' | 'APPROVAL_REQUIRED'>,
    dueAt: string,
    now: string,
  ): Promise<FinanceAlertRecord> {
    return await this.createFinanceAlert({
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

  private async createFinanceAlert(input: {
    tenantId?: string;
    countryCode: string;
    taxReturnId?: string;
    invoiceId?: string;
    alertType: FinanceAlertType;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    dueAt: string;
    createdAt: string;
    dedupeKey: string;
  }): Promise<FinanceAlertRecord> {
    const existing = (await this.repository.listFinanceAlerts()).find(
      (alert) => alert.dedupeKey === input.dedupeKey,
    );
    if (existing) return existing;

    const alert: FinanceAlertRecord = {
      id: randomUUID(),
      dedupeKey: input.dedupeKey,
      tenantId: input.tenantId,
      countryCode: input.countryCode,
      taxReturnId: input.taxReturnId,
      invoiceId: input.invoiceId,
      alertType: input.alertType,
      message: input.message,
      severity: input.severity,
      dueAt: input.dueAt,
      status: input.alertType === 'OVERDUE_REMITTANCE' ? 'OVERDUE' : 'OPEN',
      createdAt: input.createdAt,
    };

    await this.repository.saveFinanceAlert(alert);
    return alert;
  }

  private async hasAlertDedupeKey(dedupeKey: string): Promise<boolean> {
    return (await this.repository.listFinanceAlerts()).some((alert) => alert.dedupeKey === dedupeKey);
  }

  private async hasDunningNoticeDedupeKey(dedupeKey: string): Promise<boolean> {
    return (await this.repository.listDunningNotices()).some((notice) => notice.dedupeKey === dedupeKey);
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

  private dunningMessage(
    invoice: FinanceInvoiceRecord,
    decision: { stage: DunningNoticeStage; daysOverdue: number },
  ): string {
    if (decision.stage === 'FINAL_NOTICE') {
      return `Final dunning notice for ${invoice.invoiceNumber}. ${invoice.amountDue} ${invoice.presentmentCurrency} is ${decision.daysOverdue} days overdue. Escalate before service suspension.`;
    }

    if (decision.stage === 'FIRST_NOTICE') {
      return `Payment reminder for ${invoice.invoiceNumber}. ${invoice.amountDue} ${invoice.presentmentCurrency} is ${decision.daysOverdue} days overdue. Send retry instructions and support contact.`;
    }

    return `Grace-period dunning notice for ${invoice.invoiceNumber}. ${invoice.amountDue} ${invoice.presentmentCurrency} is ${decision.daysOverdue} day overdue.`;
  }

  private resolveWorkbenchRole(context?: FinanceWorkbenchContext): AccessRole {
    if (context?.sessionRole === 'BILLING_MANAGER') {
      return 'BILLING_MANAGER';
    }

    return context?.actorRole ?? 'GLOBAL_FINANCE_ADMIN';
  }

  private requireWorkbenchOperator(context?: FinanceWorkbenchContext): AccessRole {
    const role = this.resolveWorkbenchRole(context);
    if (!canOperateTaxReturnWorkbench(role)) {
      throw new ForbiddenException('Country tax return workbench requires a finance admin role.');
    }

    return role;
  }

  private requireExportOperator(context?: FinanceWorkbenchContext): AccessRole {
    const role = this.resolveWorkbenchRole(context);
    if (!canExportCountryTaxReport(role)) {
      throw new ForbiddenException('Country tax reports require a finance admin role.');
    }

    return role;
  }

  private async requireTaxReturn(id: string): Promise<TaxReturnRecord> {
    const taxReturn = await this.repository.getTaxReturn(id);
    if (!taxReturn) {
      throw new NotFoundException('Tax return not found.');
    }

    taxReturn.corrections ??= [];
    taxReturn.evidence ??= [];
    return taxReturn;
  }

  private async requireUnlockedTaxReturn(id: string): Promise<TaxReturnRecord> {
    const taxReturn = await this.requireTaxReturn(id);
    this.runWorkbench(() => assertTaxReturnPeriodUnlocked(taxReturn.status));
    return taxReturn;
  }

  private async transitionTaxReturn(taxReturn: TaxReturnRecord, to: TaxReturnStatus, _actor: string): Promise<void> {
    this.runWorkbench(() => assertTaxReturnTransition(taxReturn.status, to));
    taxReturn.status = to;
    taxReturn.updatedAt = new Date().toISOString();
    await this.repository.saveTaxReturn(taxReturn);
  }

  private async addTaxReturnEvidence(
    taxReturn: TaxReturnRecord,
    input: { kind: TaxReturnEvidenceKind; reference: string; note?: string },
    attachedBy: string,
  ): Promise<TaxReturnEvidenceRecord> {
    const evidence: TaxReturnEvidenceRecord = {
      id: randomUUID(),
      kind: input.kind,
      reference: input.reference.trim(),
      note: input.note?.trim() || undefined,
      attachedBy,
      attachedAt: new Date().toISOString(),
    };
    taxReturn.evidence =
      evidence.kind === 'PERIOD_CORRECTION'
        ? [...taxReturn.evidence, evidence]
        : [...taxReturn.evidence.filter((item) => item.kind !== evidence.kind), evidence];
    taxReturn.updatedAt = evidence.attachedAt;
    await this.repository.saveTaxReturn(taxReturn);
    return evidence;
  }

  private async assertReconciliationClear(countryCode: string): Promise<void> {
    const runs = (await this.repository.listReconciliationRuns())
      .filter((run) => !run.countryCode || run.countryCode === countryCode)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (runs.length === 0) {
      throw new UnprocessableEntityException('Reconciliation is required before tax return approval.');
    }

    if (runs[0]?.summary.hasVariance) {
      throw new UnprocessableEntityException(
        'Reconciliation variance must be cleared before tax return approval.',
      );
    }

    const openVariance = (await this.repository.listFinanceAlerts()).find(
      (alert) =>
        alert.alertType === 'RECONCILIATION_VARIANCE' &&
        alert.status === 'OPEN' &&
        (alert.countryCode === countryCode || alert.countryCode === 'GLOBAL'),
    );
    if (openVariance) {
      throw new UnprocessableEntityException(
        'Reconciliation variance must be cleared before tax return approval.',
      );
    }
  }

  private actorName(
    input: { actorUserId?: string },
    role: AccessRole,
  ): string {
    return input.actorUserId?.trim() || role;
  }

  private auditProduct(input: {
    tenantId?: string;
    actorUserId?: string;
    action: ProductAuditAction;
    entityId: string;
    metadata?: Record<string, string | number | boolean | null>;
  }): void {
    void this.auth?.recordTenantAudit({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'TAX_RETURN',
      entityId: input.entityId,
      metadata: input.metadata,
    });
  }

  private runWorkbench<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof Error) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private assertSafe(input: object, message: string): void {
    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }
}
