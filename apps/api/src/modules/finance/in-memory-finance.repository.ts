import { Injectable } from '@nestjs/common';

import type {
  CountryTaxProfileRecord,
  DunningNoticeRecord,
  FinanceAdjustmentRecord,
  FinanceAlertRecord,
  FinanceInvoiceRecord,
  FinanceReceiptRecord,
  InvoiceRecord,
  PaymentRecord,
  ReceiptRecord,
  ReconciliationRunRecord,
  TaxCalculationSnapshotRecord,
  TaxLedgerEntryRecord,
  TaxReturnRecord,
  TaxRuleRecord,
} from './finance.records';
import type { FinanceRepository } from './finance.repository';

@Injectable()
export class InMemoryFinanceRepository implements FinanceRepository {
  private readonly countryProfiles = new Map<string, CountryTaxProfileRecord>();
  private readonly taxRules = new Map<string, TaxRuleRecord>();
  private readonly snapshots = new Map<string, TaxCalculationSnapshotRecord>();
  private readonly ledgerEntries = new Map<string, TaxLedgerEntryRecord>();
  private readonly taxReturns = new Map<string, TaxReturnRecord>();
  private readonly invoices = new Map<string, FinanceInvoiceRecord>();
  private readonly receipts = new Map<string, FinanceReceiptRecord>();
  private readonly adjustments = new Map<string, FinanceAdjustmentRecord>();
  private readonly dunningNotices = new Map<string, DunningNoticeRecord>();
  private readonly financeAlerts = new Map<string, FinanceAlertRecord>();
  private readonly documentSequences = new Map<string, number>();
  private readonly paymentInvoices = new Map<string, InvoiceRecord>();
  private readonly payments = new Map<string, PaymentRecord>();
  private readonly paymentReceipts = new Map<string, ReceiptRecord>();
  private readonly paymentInvoiceSequences = new Map<string, number>();
  private readonly reconciliationRuns = new Map<string, ReconciliationRunRecord>();

  getCountryProfile(countryCode: string) {
    return this.clone(this.countryProfiles.get(countryCode));
  }

  saveCountryProfile(profile: CountryTaxProfileRecord) {
    this.countryProfiles.set(profile.countryCode, this.clone(profile)!);
  }

  listCountryProfiles() {
    return this.values(this.countryProfiles);
  }

  saveTaxRule(rule: TaxRuleRecord) {
    this.taxRules.set(rule.id, this.clone(rule)!);
  }

  listTaxRules() {
    return this.values(this.taxRules);
  }

  getSnapshot(id: string) {
    return this.clone(this.snapshots.get(id));
  }

  saveSnapshot(snapshot: TaxCalculationSnapshotRecord) {
    this.snapshots.set(snapshot.id, this.clone(snapshot)!);
  }

  listSnapshots() {
    return this.values(this.snapshots);
  }

  saveLedgerEntry(entry: TaxLedgerEntryRecord) {
    this.ledgerEntries.set(entry.id, this.clone(entry)!);
  }

  listLedgerEntries() {
    return this.values(this.ledgerEntries);
  }

  getTaxReturn(id: string) {
    return this.clone(this.taxReturns.get(id));
  }

  saveTaxReturn(record: TaxReturnRecord) {
    this.taxReturns.set(record.id, this.clone(record)!);
  }

  listTaxReturns() {
    return this.values(this.taxReturns);
  }

  getInvoice(id: string) {
    return this.clone(this.invoices.get(id));
  }

  saveInvoice(invoice: FinanceInvoiceRecord) {
    this.invoices.set(invoice.id, this.clone(invoice)!);
  }

  listInvoices() {
    return this.values(this.invoices);
  }

  saveReceipt(receipt: FinanceReceiptRecord) {
    this.receipts.set(receipt.id, this.clone(receipt)!);
  }

  listReceipts() {
    return this.values(this.receipts);
  }

  saveAdjustment(adjustment: FinanceAdjustmentRecord) {
    this.adjustments.set(adjustment.id, this.clone(adjustment)!);
  }

  listAdjustments() {
    return this.values(this.adjustments);
  }

  saveDunningNotice(notice: DunningNoticeRecord) {
    this.dunningNotices.set(notice.id, this.clone(notice)!);
  }

  listDunningNotices() {
    return this.values(this.dunningNotices);
  }

  saveFinanceAlert(alert: FinanceAlertRecord) {
    this.financeAlerts.set(alert.id, this.clone(alert)!);
  }

  listFinanceAlerts() {
    return this.values(this.financeAlerts);
  }

  nextDocumentSequence(key: string) {
    const next = (this.documentSequences.get(key) ?? 0) + 1;
    this.documentSequences.set(key, next);
    return next;
  }

  getPaymentInvoice(id: string) {
    return this.clone(this.paymentInvoices.get(id));
  }

  savePaymentInvoice(invoice: InvoiceRecord) {
    this.paymentInvoices.set(invoice.id, this.clone(invoice)!);
  }

  listPaymentInvoices() {
    return this.values(this.paymentInvoices);
  }

  savePayment(payment: PaymentRecord) {
    this.payments.set(payment.id, this.clone(payment)!);
  }

  listPayments() {
    return this.values(this.payments);
  }

  savePaymentReceipt(receipt: ReceiptRecord) {
    this.paymentReceipts.set(receipt.id, this.clone(receipt)!);
  }

  listPaymentReceipts() {
    return this.values(this.paymentReceipts);
  }

  nextPaymentInvoiceSequence(countryCode: string) {
    const next = (this.paymentInvoiceSequences.get(countryCode) ?? 0) + 1;
    this.paymentInvoiceSequences.set(countryCode, next);
    return next;
  }

  saveReconciliationRun(run: ReconciliationRunRecord) {
    this.reconciliationRuns.set(run.id, this.clone(run)!);
  }

  listReconciliationRuns() {
    return this.values(this.reconciliationRuns);
  }

  private values<T>(store: Map<string, T>): T[] {
    return Array.from(store.values()).map((item) => this.clone(item)!);
  }

  private clone<T>(value: T | undefined): T | undefined {
    return value === undefined ? undefined : (structuredClone(value) as T);
  }
}
