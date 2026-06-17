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
});
