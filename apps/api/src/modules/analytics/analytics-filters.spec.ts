import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';

import type { PlatformAccessSession } from '../auth/auth.records';
import type { AuthService } from '../auth/auth.service';
import { AnalyticsService } from './analytics.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const period = { from: '2026-06-16T00:00:00.000Z', to: '2026-06-17T00:00:00.000Z' };

async function seed(service: AnalyticsService) {
  await service.recordEvent(tenantId, {
    eventType: 'VIEW',
    entityType: 'LISTING',
    entityId: 'advert_agri',
    countryCode: 'KE',
    industryCode: 'AGRICULTURE',
    consentState: 'GRANTED',
    occurredAt: '2026-06-16T10:00:00.000Z',
  });
  await service.recordEvent(tenantId, {
    eventType: 'VIEW',
    entityType: 'LISTING',
    entityId: 'advert_logistics',
    countryCode: 'KE',
    industryCode: 'LOGISTICS',
    consentState: 'GRANTED',
    occurredAt: '2026-06-16T11:00:00.000Z',
  });
}

describe('analytics filters reach totals and every export the same way', () => {
  it('applies the industry filter to the summary, the report and the CSV, and states it in the CSV', async () => {
    const service = new AnalyticsService();
    await seed(service);
    const query = { ...period, industryCode: 'AGRICULTURE' };

    const summary = await service.summarizeTenant(tenantId, query);
    const report = await service.buildTenantReport(tenantId, query);
    const csv = await service.exportTenantReport(tenantId, { ...query, format: 'CSV' });

    expect(summary.totals.VIEW).toBe(1);
    expect(report.totals.VIEW).toBe(1);
    expect(csv.content).toContain('totals,VIEW,1');
    expect(csv.content).toContain('filter,industryCode,AGRICULTURE');
    expect(csv.content).toContain('filter,countryCode,ALL');
    expect(csv.content).not.toContain('advert_logistics');
  });

  it('shows report dates day-first (dd/mm/yy) in the PDF, not ISO', async () => {
    const service = new AnalyticsService();
    await seed(service);

    const pdf = await service.exportTenantReport(tenantId, { ...period, format: 'PDF' });
    const pdfText = Buffer.from(pdf.content, 'base64').toString('latin1');

    expect(pdfText).toContain('Period: 16/06/26 03:00 EAT to 17/06/26 03:00 EAT');
    expect(pdfText).not.toContain('Period: 2026-06-16');
  });

  it('carries the industry filter into the hierarchy report, CSV and PDF', async () => {
    const auth = {
      requirePlatformAccess: async () => ({
        allowed: true,
        permission: 'VIEW_ANALYTICS',
        role: 'COUNTRY_ADMIN',
        scopeLevel: 'COUNTRY',
        reason: 'ACCESS_GRANTED',
      }),
    };
    const service = new AnalyticsService(undefined, auth as unknown as AuthService);
    const session: PlatformAccessSession = {
      sessionId: 'session_1',
      sessionTenantId: tenantId,
      userId: 'platform-user',
      mfaVerified: true,
      assignments: [],
    };
    await seed(service);
    const query = { ...period, countryCode: 'KE', industryCode: 'LOGISTICS' };

    const report = await service.buildHierarchyReport(session, query);
    const csv = await service.exportHierarchyReport(session, { ...query, format: 'CSV' });
    const pdf = await service.exportHierarchyReport(session, { ...query, format: 'PDF' });
    const pdfText = Buffer.from(pdf.content, 'base64').toString('latin1');

    expect(report.filters).toEqual({ industryCode: 'LOGISTICS' });
    expect(report.eventCount).toBe(1);
    expect(csv.content).toContain('filter,industryCode,LOGISTICS');
    expect(csv.content).toContain('filter,countryCode,KE');
    expect(pdfText).toContain('industry=LOGISTICS');
  });
});
