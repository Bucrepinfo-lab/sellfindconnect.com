import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  calculateTaxSnapshotAmounts,
  evaluateSafetyFields,
  getCountry,
  getRemittanceAlertDecision,
  type FilingFrequency,
  type FinanceAlertType,
  type TaxProfileStatus,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CalculateTaxDto,
  ConfigureCountryTaxProfileDto,
  CreateTaxRuleDto,
  GenerateTaxReturnDto,
  RunFinanceAlertsDto,
} from './dto/finance.dto';

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

@Injectable()
export class FinanceService {
  private readonly countryProfiles = new Map<string, CountryTaxProfileRecord>();
  private readonly taxRules = new Map<string, TaxRuleRecord>();
  private readonly snapshots = new Map<string, TaxCalculationSnapshotRecord>();
  private readonly ledgerEntries = new Map<string, TaxLedgerEntryRecord>();
  private readonly taxReturns = new Map<string, TaxReturnRecord>();
  private readonly financeAlerts = new Map<string, FinanceAlertRecord>();

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
