import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

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

export function createFinancePrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

type Collection =
  | 'countryProfile'
  | 'taxRule'
  | 'snapshot'
  | 'ledgerEntry'
  | 'taxReturn'
  | 'invoice'
  | 'receipt'
  | 'adjustment'
  | 'dunningNotice'
  | 'financeAlert'
  | 'sequence'
  | 'paymentInvoice'
  | 'payment'
  | 'paymentReceipt'
  | 'paymentInvoiceSequence'
  | 'reconciliationRun';

export class PrismaFinanceRepository implements FinanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getCountryProfile(countryCode: string) {
    return this.get<CountryTaxProfileRecord>('countryProfile', countryCode);
  }

  saveCountryProfile(profile: CountryTaxProfileRecord) {
    return this.save('countryProfile', profile.countryCode, profile, {
      countryCode: profile.countryCode,
    });
  }

  listCountryProfiles() {
    return this.list<CountryTaxProfileRecord>('countryProfile');
  }

  saveTaxRule(rule: TaxRuleRecord) {
    return this.save('taxRule', rule.id, rule, { countryCode: rule.countryCode });
  }

  listTaxRules() {
    return this.list<TaxRuleRecord>('taxRule');
  }

  getSnapshot(id: string) {
    return this.get<TaxCalculationSnapshotRecord>('snapshot', id);
  }

  saveSnapshot(snapshot: TaxCalculationSnapshotRecord) {
    return this.save('snapshot', snapshot.id, snapshot, {
      tenantId: snapshot.tenantId,
      countryCode: snapshot.countryCode,
    });
  }

  listSnapshots() {
    return this.list<TaxCalculationSnapshotRecord>('snapshot');
  }

  saveLedgerEntry(entry: TaxLedgerEntryRecord) {
    return this.save('ledgerEntry', entry.id, entry);
  }

  listLedgerEntries() {
    return this.list<TaxLedgerEntryRecord>('ledgerEntry');
  }

  getTaxReturn(id: string) {
    return this.get<TaxReturnRecord>('taxReturn', id);
  }

  saveTaxReturn(record: TaxReturnRecord) {
    return this.save('taxReturn', record.id, record, { countryCode: record.countryCode });
  }

  listTaxReturns() {
    return this.list<TaxReturnRecord>('taxReturn');
  }

  getInvoice(id: string) {
    return this.get<FinanceInvoiceRecord>('invoice', id);
  }

  saveInvoice(invoice: FinanceInvoiceRecord) {
    return this.save('invoice', invoice.id, invoice, {
      tenantId: invoice.tenantId,
      countryCode: invoice.countryCode,
    });
  }

  listInvoices() {
    return this.list<FinanceInvoiceRecord>('invoice');
  }

  saveReceipt(receipt: FinanceReceiptRecord) {
    return this.save('receipt', receipt.id, receipt, {
      tenantId: receipt.tenantId,
      countryCode: receipt.countryCode,
    });
  }

  listReceipts() {
    return this.list<FinanceReceiptRecord>('receipt');
  }

  saveAdjustment(adjustment: FinanceAdjustmentRecord) {
    return this.save('adjustment', adjustment.id, adjustment, {
      tenantId: adjustment.tenantId,
      countryCode: adjustment.countryCode,
    });
  }

  listAdjustments() {
    return this.list<FinanceAdjustmentRecord>('adjustment');
  }

  saveDunningNotice(notice: DunningNoticeRecord) {
    return this.save('dunningNotice', notice.id, notice, {
      tenantId: notice.tenantId,
      countryCode: notice.countryCode,
    });
  }

  listDunningNotices() {
    return this.list<DunningNoticeRecord>('dunningNotice');
  }

  saveFinanceAlert(alert: FinanceAlertRecord) {
    return this.save('financeAlert', alert.id, alert, {
      tenantId: alert.tenantId,
      countryCode: alert.countryCode,
    });
  }

  listFinanceAlerts() {
    return this.list<FinanceAlertRecord>('financeAlert');
  }

  nextDocumentSequence(key: string) {
    return this.nextSequence(key);
  }

  getPaymentInvoice(id: string) {
    return this.get<InvoiceRecord>('paymentInvoice', id);
  }

  savePaymentInvoice(invoice: InvoiceRecord) {
    return this.save('paymentInvoice', invoice.id, invoice, {
      tenantId: invoice.tenantId,
      countryCode: invoice.countryCode,
    });
  }

  listPaymentInvoices() {
    return this.list<InvoiceRecord>('paymentInvoice');
  }

  savePayment(payment: PaymentRecord) {
    return this.save('payment', payment.id, payment, { tenantId: payment.tenantId });
  }

  listPayments() {
    return this.list<PaymentRecord>('payment');
  }

  savePaymentReceipt(receipt: ReceiptRecord) {
    return this.save('paymentReceipt', receipt.id, receipt, { tenantId: receipt.tenantId });
  }

  listPaymentReceipts() {
    return this.list<ReceiptRecord>('paymentReceipt');
  }

  nextPaymentInvoiceSequence(countryCode: string) {
    return this.nextSequence(`paymentInvoice:${countryCode}`);
  }

  saveReconciliationRun(run: ReconciliationRunRecord) {
    return this.save('reconciliationRun', run.id, run, {
      tenantId: run.tenantId,
      countryCode: run.countryCode,
    });
  }

  listReconciliationRuns() {
    return this.list<ReconciliationRunRecord>('reconciliationRun');
  }

  private async get<T>(collection: Collection, recordId: string): Promise<T | undefined> {
    const record = await this.prisma.financeWorkbenchRecord.findUnique({
      where: { collection_recordId: { collection, recordId } },
    });
    return record ? (structuredClone(record.payload) as T) : undefined;
  }

  private async list<T>(collection: Collection): Promise<T[]> {
    const records = await this.prisma.financeWorkbenchRecord.findMany({
      where: { collection },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => structuredClone(record.payload) as T);
  }

  private async save(
    collection: Collection,
    recordId: string,
    payload: object,
    keys: { tenantId?: string; countryCode?: string } = {},
  ): Promise<void> {
    const data = {
      collection,
      recordId,
      tenantId: keys.tenantId ?? null,
      countryCode: keys.countryCode ?? null,
      payload: payload as Prisma.InputJsonValue,
    };
    await this.prisma.financeWorkbenchRecord.upsert({
      where: { collection_recordId: { collection, recordId } },
      create: data,
      update: {
        tenantId: data.tenantId,
        countryCode: data.countryCode,
        payload: data.payload,
      },
    });
  }

  private async nextSequence(recordId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.financeWorkbenchRecord.findUnique({
        where: { collection_recordId: { collection: 'sequence', recordId } },
      });
      const current =
        existing &&
        typeof existing.payload === 'object' &&
        existing.payload !== null &&
        !Array.isArray(existing.payload) &&
        typeof (existing.payload as { value?: unknown }).value === 'number'
          ? (existing.payload as { value: number }).value
          : 0;
      const value = current + 1;
      const payload = { value } as Prisma.InputJsonValue;
      await tx.financeWorkbenchRecord.upsert({
        where: { collection_recordId: { collection: 'sequence', recordId } },
        create: { collection: 'sequence', recordId, payload },
        update: { payload },
      });
      return value;
    });
  }
}
