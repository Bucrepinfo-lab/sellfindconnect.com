import { describe, expect, it } from 'vitest';

import { UgcService } from './ugc.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('UgcService', () => {
  it('records a report and a block, then hides the blocked target', async () => {
    const service = new UgcService();
    const report = await service.createReport(tenantId, 'owner-1', {
      targetType: 'USER',
      targetId: 'r2',
      reason: 'HARASSMENT',
      details: 'Unwanted messages after I declined the quote.',
      acceptedTerms: true,
    });
    const block = await service.createBlock(tenantId, 'owner-1', {
      blockedTargetId: 'r2',
      reason: 'HARASSMENT',
      acceptedTerms: true,
    });

    expect(report.status).toBe('OPEN');
    expect((await service.listReports(tenantId))[0]?.id).toBe(report.id);
    expect((await service.listBlocks(tenantId)).map((item) => item.blockedTargetId)).toEqual(['r2']);
    expect(block.blockedTargetId).toBe('r2');
    expect(await service.isBlocked(tenantId, 'r2')).toBe(true);
    expect(await service.isBlocked(tenantId, 'r1')).toBe(false);
    await expect(service.requireUnblocked(tenantId, 'r2')).rejects.toThrow(/blocked/);
    await expect(service.requireUnblocked(tenantId, 'r1')).resolves.toBeUndefined();
  });

  it('rejects missing terms, self-blocks, and duplicate blocks', async () => {
    const service = new UgcService();

    await expect(
      service.createReport(tenantId, 'owner-1', {
        targetType: 'USER',
        targetId: 'r1',
        reason: 'SPAM_SCAMS',
        acceptedTerms: false as true,
      }),
    ).rejects.toThrow();

    await expect(
      service.createBlock(tenantId, 'owner-1', {
        blockedTargetId: tenantId,
        reason: 'OTHER',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();

    await service.createBlock(tenantId, 'owner-1', {
      blockedTargetId: 'r3',
      reason: 'SPAM_SCAMS',
      acceptedTerms: true,
    });
    await expect(
      service.createBlock(tenantId, 'owner-1', {
        blockedTargetId: 'r3',
        reason: 'SPAM_SCAMS',
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/already blocked/);
  });

  it('lets a moderator close a report and omits details from audit metadata', async () => {
    const auditLogs: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
    const auth = {
      recordTenantAudit: async (input: {
        action: string;
        metadata?: Record<string, unknown>;
      }) => {
        auditLogs.push(input);
      },
      requireCurrentStoredTerms: async () => undefined,
    };
    const service = new UgcService(undefined, auth as never);
    const report = await service.createReport(tenantId, 'owner-1', {
      targetType: 'ADVERT',
      targetId: 'ad-9',
      reason: 'IMPERSONATION',
      details: 'Copied our company name and phone.',
      acceptedTerms: true,
    });
    const closed = await service.resolveReport(report.id, 'mod-1', { resolution: 'RESOLVED' });

    expect(closed.status).toBe('RESOLVED');
    expect(closed.open).toBe(false);
    expect(JSON.stringify(auditLogs)).not.toContain('Copied our company');
    expect(auditLogs.map((item) => item.action)).toEqual([
      'USER_CONTENT_REPORTED',
      'USER_CONTENT_REPORT_RESOLVED',
    ]);

    const queue = await service.listModeratorQueue('2026-08-22T18:00:00.000Z');
    expect(queue.openCount).toBe(0);
    expect(queue.reports[0]).toMatchObject({
      id: report.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      open: false,
    });
  });

  it('refuses reports when stored terms acceptance is stale', async () => {
    const service = new UgcService(undefined, {
      requireCurrentStoredTerms: async () => {
        throw new Error('Current stored terms acceptance is required before reporting.');
      },
    } as never);

    await expect(
      service.createReport(tenantId, 'owner-1', {
        targetType: 'USER',
        targetId: 'r2',
        reason: 'HARASSMENT',
        acceptedTerms: true,
      }),
    ).rejects.toThrow('Current stored terms acceptance is required before reporting.');
  });
});
