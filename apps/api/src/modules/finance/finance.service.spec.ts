import { describe, expect, it } from 'vitest';

import { FinanceService } from './finance.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

function configuredService() {
  const service = new FinanceService();

  service.configureCountryTaxProfile({
    countryCode: 'KE',
    taxAuthorityName: 'Pilot Tax Authority',
    taxRegistrationStatus: 'REGISTERED',
    localFinanceOwner: 'Country Finance Admin',
    filingFrequency: 'MONTHLY',
    recordRetentionYears: 7,
    taxInclusivePricing: true,
    approvedBy: 'global-finance-admin',
  });
  service.createTaxRule({
    countryCode: 'KE',
    taxType: 'VAT',
    taxRate: 0.16,
    productTaxCode: 'SFC_SUBSCRIPTION',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  });

  return service;
}

describe('FinanceService', () => {
  it('requires an approved country tax profile before calculating tax', () => {
    const service = new FinanceService();

    service.configureCountryTaxProfile({
      countryCode: 'KE',
      taxAuthorityName: 'Pilot Tax Authority',
      taxRegistrationStatus: 'DRAFT',
      localFinanceOwner: 'Country Finance Admin',
      filingFrequency: 'MONTHLY',
      recordRetentionYears: 7,
      taxInclusivePricing: true,
    });
    service.createTaxRule({
      countryCode: 'KE',
      taxType: 'VAT',
      taxRate: 0.16,
      productTaxCode: 'SFC_SUBSCRIPTION',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    });

    expect(() =>
      service.calculateTax(tenantId, {
        countryCode: 'KE',
        grossAmount: 10,
        presentmentCurrency: 'KES',
        productTaxCode: 'SFC_SUBSCRIPTION',
        customerEvidence: { billingCountry: 'KE' },
      }),
    ).toThrow();
  });

  it('creates immutable tax snapshots and ledger entries from approved rules', () => {
    const service = configuredService();
    const result = service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE', customerType: 'BUSINESS' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });

    expect(result.snapshot.taxAmount).toBe(1.3793);
    expect(result.snapshot.netRevenueAmount).toBe(8.6207);
    expect(result.ledgerEntries.map((entry) => entry.entryType)).toEqual([
      'TAX_LIABILITY',
      'PLATFORM_REVENUE',
    ]);
    expect(service.listTaxCalculations(tenantId)).toHaveLength(1);
  });

  it('generates a tax return and approval alerts from stored snapshots', () => {
    const service = configuredService();

    service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });

    const result = service.generateTaxReturn({
      countryCode: 'KE',
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: 'KES',
    });

    expect(result.sourceSnapshotCount).toBe(1);
    expect(result.taxReturn.computedTaxDue).toBe(1.3793);
    expect(result.alertsCreated.map((alert) => alert.alertType)).toEqual([
      'RETURN_READY_FOR_REVIEW',
      'APPROVAL_REQUIRED',
    ]);
  });

  it('creates an invoice, receipt, tax snapshot, and ledger entries for a paid transaction', () => {
    const service = configuredService();

    const result = service.createInvoice(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      provider: 'MANUAL',
      providerReference: 'checkout-session-123',
      customerEvidence: { billingCountry: 'KE', customerType: 'BUSINESS' },
      customerName: 'Acme Supplies Ltd',
      customerEmail: 'billing@example.com',
      billingReference: 'billing-123',
      lineItemDescription: 'Sell Find Connect monthly subscription',
      issueReceipt: true,
      paymentProvider: 'MANUAL',
      paymentReference: 'manual-payment-123',
      paidAt: '2026-06-23T12:05:00.000Z',
    });

    expect(result.invoice.invoiceNumber).toMatch(/^KE-\d{4}-INV-\d{6}$/);
    expect(result.invoice.paymentStatus).toBe('PAID');
    expect(result.invoice.amountDue).toBe(0);
    expect(result.receipt?.receiptNumber).toMatch(/^KE-\d{4}-RCT-\d{6}$/);
    expect(result.receipt?.amountPaid).toBe(10);
    expect(result.taxCalculation.snapshot.taxAmount).toBe(1.3793);
    expect(result.taxCalculation.ledgerEntries).toHaveLength(2);
    expect(service.listInvoices(tenantId)).toHaveLength(1);
    expect(service.listReceipts(tenantId)).toHaveLength(1);
  });

  it('issues receipts against an existing invoice until the balance is paid', () => {
    const service = configuredService();
    const invoiceResult = service.createInvoice(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      customerName: 'Acme Supplies Ltd',
      lineItemDescription: 'Sell Find Connect monthly subscription',
    });

    const partial = service.issueReceipt(tenantId, {
      invoiceId: invoiceResult.invoice.id,
      amountPaid: 4,
      paymentProvider: 'MANUAL',
      paymentReference: 'manual-payment-1',
    });

    expect(partial.invoice.paymentStatus).toBe('PARTIALLY_PAID');
    expect(partial.invoice.amountDue).toBe(6);

    const final = service.issueReceipt(tenantId, {
      invoiceId: invoiceResult.invoice.id,
      paymentProvider: 'MANUAL',
      paymentReference: 'manual-payment-2',
    });

    expect(final.invoice.paymentStatus).toBe('PAID');
    expect(final.receipt.amountPaid).toBe(6);
    expect(service.listReceipts(tenantId)).toHaveLength(2);
    expect(() =>
      service.issueReceipt(tenantId, {
        invoiceId: invoiceResult.invoice.id,
        paymentProvider: 'MANUAL',
        paymentReference: 'manual-payment-2',
      }),
    ).toThrow();
  });

  it('creates refund credit notes and reversal ledger entries against paid invoices', () => {
    const service = configuredService();
    const invoiceResult = service.createInvoice(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      customerName: 'Acme Supplies Ltd',
      lineItemDescription: 'Sell Find Connect monthly subscription',
      issueReceipt: true,
      paymentReference: 'manual-payment-123',
    });

    const result = service.requestRefund(tenantId, {
      invoiceId: invoiceResult.invoice.id,
      amount: 5,
      reason: 'Customer cancelled during support grace period.',
      paymentProvider: 'MANUAL',
      providerReference: 'refund-123',
      requestedBy: 'billing-manager',
    });

    expect(result.adjustment.adjustmentType).toBe('REFUND');
    expect(result.adjustment.creditNoteNumber).toMatch(/^KE-\d{4}-CRN-\d{6}$/);
    expect(result.adjustment.taxAmount).toBe(0.6897);
    expect(result.ledgerEntries.map((entry) => entry.entryType)).toEqual([
      'REFUND_TAX_REVERSAL',
      'REFUND_REVENUE_REVERSAL',
    ]);
    expect(result.ledgerEntries.every((entry) => entry.amount < 0)).toBe(true);
    expect(result.invoice.refundedAmount).toBe(5);
    expect(result.invoice.netCollectedAmount).toBe(5);
    expect(service.listAdjustments(tenantId)).toHaveLength(1);
  });

  it('opens chargebacks and creates dunning notices for reopened balances', () => {
    const service = configuredService();
    const invoiceResult = service.createInvoice(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      customerName: 'Acme Supplies Ltd',
      lineItemDescription: 'Sell Find Connect monthly subscription',
      dueAt: '2026-06-20T00:00:00.000Z',
      issueReceipt: true,
      paymentReference: 'manual-payment-123',
    });

    const chargeback = service.openChargeback(tenantId, {
      invoiceId: invoiceResult.invoice.id,
      amount: 10,
      reason: 'Cardholder dispute received from payment provider.',
      paymentProvider: 'MANUAL',
      providerReference: 'chargeback-123',
      openedBy: 'billing-manager',
      openedAt: '2026-06-24T00:00:00.000Z',
    });

    expect(chargeback.adjustment.adjustmentType).toBe('CHARGEBACK');
    expect(chargeback.invoice.status).toBe('DISPUTED');
    expect(chargeback.invoice.amountDue).toBe(10);
    expect(chargeback.ledgerEntries.map((entry) => entry.entryType)).toEqual([
      'CHARGEBACK_TAX_REVERSAL',
      'CHARGEBACK_REVENUE_REVERSAL',
    ]);

    const firstRun = service.runDunning(tenantId, { now: '2026-06-27T00:00:00.000Z' });
    const secondRun = service.runDunning(tenantId, { now: '2026-06-27T12:00:00.000Z' });

    expect(firstRun.noticesCreated).toHaveLength(1);
    expect(firstRun.noticesCreated[0]?.stage).toBe('FIRST_NOTICE');
    expect(firstRun.noticesCreated[0]?.amountDue).toBe(10);
    expect(secondRun.noticesCreated).toHaveLength(0);
    expect(service.listDunningNotices(tenantId)).toHaveLength(1);
  });

  it('creates remittance alerts on milestone days without duplicating them', () => {
    const service = configuredService();

    service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });
    service.generateTaxReturn({
      countryCode: 'KE',
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: 'KES',
    });

    const firstRun = service.runFinanceAlerts({ now: '2026-07-24T00:00:00.000Z' });
    const secondRun = service.runFinanceAlerts({ now: '2026-07-24T12:00:00.000Z' });

    expect(firstRun.alertsCreated).toHaveLength(1);
    expect(firstRun.alertsCreated[0]?.alertType).toBe('UPCOMING_REMITTANCE');
    expect(secondRun.alertsCreated).toHaveLength(0);
  });

  it('blocks prohibited finance configuration text', () => {
    const service = new FinanceService();

    expect(() =>
      service.configureCountryTaxProfile({
        countryCode: 'KE',
        taxAuthorityName: 'Weapons settlement desk',
        taxRegistrationStatus: 'REGISTERED',
        localFinanceOwner: 'Country Finance Admin',
        filingFrequency: 'MONTHLY',
        recordRetentionYears: 7,
        approvedBy: 'global-finance-admin',
      }),
    ).toThrow();
  });

  it('issues an invoice, captures payment, and produces a receipt', async () => {
    const service = configuredService();

    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
      taxAmount: 1.3793,
      issuedAt: '2026-06-23T10:00:00.000Z',
    });

    expect(invoice.invoiceNumber).toBe('SFC-KE-2026-000001');
    expect(invoice.total).toBe(11.3793);
    expect(invoice.status).toBe('ISSUED');

    const paid = await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });

    expect(paid.idempotentReplay).toBe(false);
    expect(paid.payment.status).toBe('CAPTURED');
    expect(paid.invoice.status).toBe('PAID');
    expect(paid.receipt?.amount).toBe(11.3793);
    expect(service.listPaymentReceipts(tenantId)).toHaveLength(1);
  });

  it('is idempotent when paying with the same idempotency key', async () => {
    const service = configuredService();
    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });

    const first = await service.payInvoice(tenantId, {
      invoiceId: invoice.id,
      method: 'MOBILE_MONEY',
      idempotencyKey: 'idem-001',
    });
    const replay = await service.payInvoice(tenantId, {
      invoiceId: invoice.id,
      method: 'MOBILE_MONEY',
      idempotencyKey: 'idem-001',
    });

    expect(first.idempotentReplay).toBe(false);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.payment.id).toBe(first.payment.id);
    expect(service.listPayments(tenantId)).toHaveLength(1);
  });

  it('refunds a captured invoice and updates its status', async () => {
    const service = configuredService();
    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });
    await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });

    const refunded = await service.refundInvoice(tenantId, { invoiceId: invoice.id });

    expect(refunded.invoice.status).toBe('REFUNDED');
    expect(refunded.refund.amount).toBeLessThan(0);
  });

  it('reconciles a provider settlement and raises a variance alert', async () => {
    const service = configuredService();
    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });
    const paid = await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });

    const reconciliation = service.reconcileProviderSettlement(tenantId, {
      statementReference: 'PROVIDER-2026-06',
      currencyCode: 'KES',
      settlementLines: [
        { reference: paid.payment.providerPaymentId, amount: paid.payment.amount + 1, currencyCode: 'KES' },
      ],
    });

    expect(reconciliation.run.summary.hasVariance).toBe(true);
    expect(
      reconciliation.openAlerts.some((alert) => alert.alertType === 'RECONCILIATION_VARIANCE'),
    ).toBe(true);
  });

  it('files, remits, locks, and exports a tax return after reconciliation', async () => {
    const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const service = new FinanceService(undefined, {
      recordTenantAudit: async (record: { action: string; metadata?: Record<string, unknown> }) => {
        audits.push(record);
      },
    } as never);
    service.configureCountryTaxProfile({
      countryCode: 'KE',
      taxAuthorityName: 'Pilot Tax Authority',
      taxRegistrationStatus: 'REGISTERED',
      localFinanceOwner: 'Country Finance Admin',
      filingFrequency: 'MONTHLY',
      recordRetentionYears: 7,
      taxInclusivePricing: true,
      approvedBy: 'global-finance-admin',
    });
    service.createTaxRule({
      countryCode: 'KE',
      taxType: 'VAT',
      taxRate: 0.16,
      productTaxCode: 'SFC_SUBSCRIPTION',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    });

    service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });
    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });
    const paid = await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });
    service.reconcileProviderSettlement(tenantId, {
      statementReference: 'PROVIDER-KE-2026-06',
      countryCode: 'KE',
      currencyCode: 'KES',
      settlementLines: [
        {
          reference: paid.payment.providerPaymentId,
          amount: paid.payment.amount,
          currencyCode: 'KES',
        },
      ],
    });

    const generated = service.generateTaxReturn(
      {
        countryCode: 'KE',
        taxType: 'VAT',
        periodStart: '2026-06-01T00:00:00.000Z',
        periodEnd: '2026-06-30T23:59:59.999Z',
        filingDeadline: '2026-07-20T00:00:00.000Z',
        paymentDeadline: '2026-07-31T00:00:00.000Z',
        filingCurrency: 'KES',
      },
      { tenantId },
    );
    const id = generated.taxReturn.id;

    expect(service.submitTaxReturn(id, { actorUserId: 'country-finance-admin' }).status).toBe(
      'IN_REVIEW',
    );
    expect(
      service.approveTaxReturn(id, {
        actorRole: 'COUNTRY_FINANCE_ADMIN',
        actorUserId: 'country-finance-admin',
      }).status,
    ).toBe('APPROVED');
    expect(
      service.fileTaxReturn(id, {
        kind: 'FILING_CONFIRMATION',
        reference: 'KRA-VAT-2026-06',
        actorRole: 'GLOBAL_FINANCE_ADMIN',
        actorUserId: 'global-finance-admin',
      }).status,
    ).toBe('FILED');
    const remitted = service.remitTaxReturn(id, {
      reference: 'PAY-8891',
      actorRole: 'GLOBAL_FINANCE_ADMIN',
      actorUserId: 'global-finance-admin',
    });
    expect(remitted.status).toBe('REMITTED');
    expect(remitted.evidence.map((item) => item.kind)).toEqual([
      'FILING_CONFIRMATION',
      'REMITTANCE_RECEIPT',
    ]);

    const locked = service.lockTaxReturn(id, {
      actorRole: 'GLOBAL_FINANCE_ADMIN',
      actorUserId: 'global-finance-admin',
    });
    expect(locked.status).toBe('LOCKED');
    expect(locked.lockedAt).toBeTruthy();

    const exported = service.exportTaxReturn(id, { format: 'CSV' }, { tenantId });
    expect(exported.fileName).toContain('tax-return-ke-vat-2026-06-01');
    expect(exported.content).toContain('KRA-VAT-2026-06|PAY-8891');
    expect(exported.content).not.toContain('Board approved');
    expect(() =>
      service.attachTaxReturnEvidence(id, {
        kind: 'AUTHORITY_REFERENCE',
        reference: 'KRA-REF-99',
      }),
    ).toThrow(/Locked tax periods cannot be changed/);
    expect(audits.map((record) => record.action)).toEqual([
      'TAX_RETURN_GENERATED',
      'TAX_RETURN_SUBMITTED',
      'TAX_RETURN_APPROVED',
      'TAX_RETURN_FILED',
      'TAX_RETURN_REMITTED',
      'TAX_RETURN_LOCKED',
      'TAX_REPORT_EXPORTED',
    ]);
    expect(JSON.stringify(audits)).not.toContain('PAY-8891');
  });

  it('blocks tax-return approval until reconciliation is clear', async () => {
    const service = configuredService();
    service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 10,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });
    const generated = service.generateTaxReturn({
      countryCode: 'KE',
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: 'KES',
    });
    service.submitTaxReturn(generated.taxReturn.id);

    expect(() => service.approveTaxReturn(generated.taxReturn.id)).toThrow(
      /Reconciliation is required before tax return approval/,
    );

    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });
    const paid = await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });
    service.reconcileProviderSettlement(tenantId, {
      statementReference: 'PROVIDER-KE-VARIANCE',
      countryCode: 'KE',
      currencyCode: 'KES',
      settlementLines: [
        {
          reference: paid.payment.providerPaymentId,
          amount: paid.payment.amount + 4,
          currencyCode: 'KES',
        },
      ],
    });

    expect(() => service.approveTaxReturn(generated.taxReturn.id)).toThrow(
      /Reconciliation variance must be cleared/,
    );
  });

  it('requires a different filing approver above the dual-control threshold', async () => {
    const service = configuredService();
    service.calculateTax(tenantId, {
      countryCode: 'KE',
      grossAmount: 100000,
      presentmentCurrency: 'KES',
      productTaxCode: 'SFC_SUBSCRIPTION',
      customerEvidence: { billingCountry: 'KE' },
      transactionAt: '2026-06-17T10:00:00.000Z',
    });
    const invoice = service.issueInvoice(tenantId, {
      countryCode: 'KE',
      currencyCode: 'KES',
      lines: [{ description: 'Monthly subscription', quantity: 1, unitAmount: 10 }],
    });
    const paid = await service.payInvoice(tenantId, { invoiceId: invoice.id, method: 'CARD' });
    service.reconcileProviderSettlement(tenantId, {
      statementReference: 'PROVIDER-KE-THRESHOLD',
      countryCode: 'KE',
      currencyCode: 'KES',
      settlementLines: [
        {
          reference: paid.payment.providerPaymentId,
          amount: paid.payment.amount,
          currencyCode: 'KES',
        },
      ],
    });
    const generated = service.generateTaxReturn({
      countryCode: 'KE',
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: 'KES',
    });
    expect(generated.taxReturn.computedTaxDue).toBeGreaterThanOrEqual(10_000);
    service.submitTaxReturn(generated.taxReturn.id, { actorUserId: 'same-approver' });
    service.approveTaxReturn(generated.taxReturn.id, { actorUserId: 'same-approver' });

    expect(() =>
      service.fileTaxReturn(generated.taxReturn.id, {
        kind: 'FILING_CONFIRMATION',
        reference: 'KRA-VAT-LARGE',
        actorUserId: 'same-approver',
      }),
    ).toThrow(/different approver than review/);
  });

  it('blocks billing managers from country tax reports and workbench actions', () => {
    const service = configuredService();
    const generated = service.generateTaxReturn({
      countryCode: 'KE',
      taxType: 'VAT',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      filingDeadline: '2026-07-20T00:00:00.000Z',
      paymentDeadline: '2026-07-31T00:00:00.000Z',
      filingCurrency: 'KES',
    });

    expect(() =>
      service.exportTaxReturn(generated.taxReturn.id, { format: 'JSON' }, { sessionRole: 'BILLING_MANAGER' }),
    ).toThrow(/Country tax reports require a finance admin role/);
    expect(() =>
      service.submitTaxReturn(generated.taxReturn.id, {}, { sessionRole: 'BILLING_MANAGER' }),
    ).toThrow(/Country tax return workbench requires a finance admin role/);
  });
});
