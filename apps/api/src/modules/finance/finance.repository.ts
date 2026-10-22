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

export const FINANCE_REPOSITORY = Symbol('FINANCE_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface FinanceRepository {
  getCountryProfile(countryCode: string): RepositoryResult<CountryTaxProfileRecord | undefined>;
  saveCountryProfile(profile: CountryTaxProfileRecord): RepositoryResult<void>;
  listCountryProfiles(): RepositoryResult<CountryTaxProfileRecord[]>;

  saveTaxRule(rule: TaxRuleRecord): RepositoryResult<void>;
  listTaxRules(): RepositoryResult<TaxRuleRecord[]>;

  getSnapshot(id: string): RepositoryResult<TaxCalculationSnapshotRecord | undefined>;
  saveSnapshot(snapshot: TaxCalculationSnapshotRecord): RepositoryResult<void>;
  listSnapshots(): RepositoryResult<TaxCalculationSnapshotRecord[]>;

  saveLedgerEntry(entry: TaxLedgerEntryRecord): RepositoryResult<void>;
  listLedgerEntries(): RepositoryResult<TaxLedgerEntryRecord[]>;

  getTaxReturn(id: string): RepositoryResult<TaxReturnRecord | undefined>;
  saveTaxReturn(record: TaxReturnRecord): RepositoryResult<void>;
  listTaxReturns(): RepositoryResult<TaxReturnRecord[]>;

  getInvoice(id: string): RepositoryResult<FinanceInvoiceRecord | undefined>;
  saveInvoice(invoice: FinanceInvoiceRecord): RepositoryResult<void>;
  listInvoices(): RepositoryResult<FinanceInvoiceRecord[]>;

  saveReceipt(receipt: FinanceReceiptRecord): RepositoryResult<void>;
  listReceipts(): RepositoryResult<FinanceReceiptRecord[]>;

  saveAdjustment(adjustment: FinanceAdjustmentRecord): RepositoryResult<void>;
  listAdjustments(): RepositoryResult<FinanceAdjustmentRecord[]>;

  saveDunningNotice(notice: DunningNoticeRecord): RepositoryResult<void>;
  listDunningNotices(): RepositoryResult<DunningNoticeRecord[]>;

  saveFinanceAlert(alert: FinanceAlertRecord): RepositoryResult<void>;
  listFinanceAlerts(): RepositoryResult<FinanceAlertRecord[]>;

  nextDocumentSequence(key: string): RepositoryResult<number>;

  getPaymentInvoice(id: string): RepositoryResult<InvoiceRecord | undefined>;
  savePaymentInvoice(invoice: InvoiceRecord): RepositoryResult<void>;
  listPaymentInvoices(): RepositoryResult<InvoiceRecord[]>;

  savePayment(payment: PaymentRecord): RepositoryResult<void>;
  listPayments(): RepositoryResult<PaymentRecord[]>;

  savePaymentReceipt(receipt: ReceiptRecord): RepositoryResult<void>;
  listPaymentReceipts(): RepositoryResult<ReceiptRecord[]>;

  nextPaymentInvoiceSequence(countryCode: string): RepositoryResult<number>;

  saveReconciliationRun(run: ReconciliationRunRecord): RepositoryResult<void>;
  listReconciliationRuns(): RepositoryResult<ReconciliationRunRecord[]>;
}
