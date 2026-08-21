import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AuthService } from '../auth/auth.service';
import type { PlatformAccessSession } from '../auth/auth.records';
import { InMemoryMediaReviewCaseRepository } from './in-memory-media-review-case.repository';
import type { MediaReviewCaseRecord } from './media-review-case.repository';
import { MediaReviewService } from './media-review.service';

describe('MediaReviewService', () => {
  it('lists only cases inside the moderator platform scope', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(
      reviewCase({ id: 'case-ke', tenantId: 'tenant-ke', mediaId: 'media-ke' }),
    );
    repository.createCase(
      reviewCase({ id: 'case-ug', tenantId: 'tenant-ug', mediaId: 'media-ug' }),
    );
    const service = new MediaReviewService(repository, authService());

    const cases = await service.listCases({}, platformSession());

    expect(cases.map((reviewCase) => reviewCase.id)).toEqual(['case-ke']);
  });

  it('resolves open media review cases and records moderation audit context', async () => {
    const auditLogs: unknown[] = [];
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'case-ke', tenantId: 'tenant-ke' }));
    const service = new MediaReviewService(repository, authService(auditLogs));

    const resolved = await service.resolveCase(
      'case-ke',
      {
        resolution: 'CONFIRMED_BLOCK',
        notes: 'Confirmed unsafe media and kept the asset blocked.',
      },
      platformSession(),
    );

    expect(resolved).toMatchObject({
      id: 'case-ke',
      status: 'RESOLVED',
      resolvedBy: 'country-mod-1',
      resolution: 'CONFIRMED_BLOCK',
      reviewerRole: 'COUNTRY_MODERATOR',
      escalation: {
        playbookCode: 'KE-MEDIA-2026-08',
        countryCode: 'KE',
        kind: 'CYBER_INCIDENT',
        channelCodes: ['INTERNAL_LEGAL_HOLD', 'KE_CIRT_INCIDENT', 'HOSTING_ABUSE'],
        preserveEvidence: true,
      },
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-ke',
        actorUserId: 'country-mod-1',
        action: 'MEDIA_REVIEW_CASE_RESOLVED',
        entityType: 'MEDIA_REVIEW_CASE',
        entityId: 'case-ke',
        metadata: expect.objectContaining({
          mediaId: 'media-1',
          resolution: 'CONFIRMED_BLOCK',
          role: 'COUNTRY_MODERATOR',
          notesProvided: true,
          playbookCode: 'KE-MEDIA-2026-08',
          kind: 'CYBER_INCIDENT',
          channelCodes: 'INTERNAL_LEGAL_HOLD,KE_CIRT_INCIDENT,HOSTING_ABUSE',
        }),
      }),
    ]);
    expect(JSON.stringify(auditLogs)).not.toContain('http');
    expect(JSON.stringify(auditLogs)).not.toContain('@');
  });

  it('assigns open media review cases to the moderator queue and records audit context', async () => {
    const auditLogs: unknown[] = [];
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'case-ke', tenantId: 'tenant-ke' }));
    const service = new MediaReviewService(repository, authService(auditLogs));

    const assigned = await service.assignCase(
      'case-ke',
      { note: 'Assign to Kenya moderation queue.' },
      platformSession(),
    );

    expect(assigned).toMatchObject({
      id: 'case-ke',
      status: 'OPEN',
      assignedTo: 'country-mod-1',
      assignmentNote: 'Assign to Kenya moderation queue.',
      reviewerRole: 'COUNTRY_MODERATOR',
    });
    expect(assigned.assignedAt).toBeDefined();
    expect(auditLogs).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-ke',
        actorUserId: 'country-mod-1',
        action: 'MEDIA_REVIEW_CASE_ASSIGNED',
        entityType: 'MEDIA_REVIEW_CASE',
        entityId: 'case-ke',
        metadata: expect.objectContaining({
          mediaId: 'media-1',
          assignedTo: 'country-mod-1',
          role: 'COUNTRY_MODERATOR',
          noteProvided: true,
        }),
      }),
    ]);
  });

  it('filters moderator queues by assigned and unassigned cases', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'assigned-ke', tenantId: 'tenant-ke' }));
    repository.createCase(reviewCase({ id: 'unassigned-ke', tenantId: 'tenant-ke' }));
    const service = new MediaReviewService(repository, authService());

    await service.assignCase('assigned-ke', { assignedTo: 'country-mod-1' }, platformSession());

    const assignedCases = await service.listCases(
      { assignedTo: 'country-mod-1' },
      platformSession(),
    );
    const unassignedCases = await service.listCases({ unassignedOnly: true }, platformSession());

    expect(assignedCases.map((reviewCase) => reviewCase.id)).toEqual(['assigned-ke']);
    expect(unassignedCases.map((reviewCase) => reviewCase.id)).toEqual(['unassigned-ke']);
  });

  it('blocks unsafe moderator notes before resolving a case', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'case-ke', tenantId: 'tenant-ke' }));
    const service = new MediaReviewService(repository, authService());

    await expect(
      service.resolveCase(
        'case-ke',
        {
          resolution: 'DISMISSED',
          notes: 'This upload promotes illegal weapons trafficking.',
        },
        platformSession(),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    await expect(repository.findCase('case-ke')).toMatchObject({
      status: 'OPEN',
      resolvedAt: undefined,
    });
  });

  it('attaches the Kenya reporting playbook when a case is escalated', async () => {
    const auditLogs: unknown[] = [];
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(
      reviewCase({
        id: 'case-ke',
        tenantId: 'tenant-ke',
        jobType: 'CONTENT_MODERATION',
        reason: 'ZT-CHILD-001',
      }),
    );
    const service = new MediaReviewService(repository, authService(auditLogs));

    const resolved = await service.resolveCase(
      'case-ke',
      { resolution: 'ESCALATED', notes: 'Escalated to the approved Kenya reporting path.' },
      platformSession(),
    );

    expect(resolved).toMatchObject({
      status: 'ESCALATED',
      resolution: 'ESCALATED',
      escalation: {
        playbookCode: 'KE-MEDIA-2026-08',
        kind: 'CHILD_SAFETY',
        channelCodes: [
          'INTERNAL_LEGAL_HOLD',
          'NCMEC_CYBERTIPLINE',
          'KE_CIRT_CHILD_RELATED',
          'HOSTING_ABUSE',
        ],
      },
    });
    expect(JSON.stringify(auditLogs)).toContain('NCMEC_CYBERTIPLINE');
    expect(JSON.stringify(auditLogs)).not.toContain('http');
  });

  it('fail-closes escalation when the tenant country has no approved playbook', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'case-ug', tenantId: 'tenant-ug' }));
    const service = new MediaReviewService(repository, globalAuthService());

    await expect(
      service.resolveCase('case-ug', { resolution: 'ESCALATED' }, globalSession()),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(repository.findCase('case-ug')).toMatchObject({ status: 'OPEN' });
  });

  it('presents SLA fields and returns a case by id', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    const openedAt = new Date().toISOString();
    repository.createCase(reviewCase({ id: 'case-sla', openedAt }));
    const service = new MediaReviewService(repository, authService());

    const presented = await service.getCase('case-sla', platformSession());

    expect(presented).toMatchObject({
      id: 'case-sla',
      slaHours: 24,
      dueAt: new Date(Date.parse(openedAt) + 24 * 3_600_000).toISOString(),
      overdue: false,
    });
    repository.createCase(reviewCase({ id: 'case-ug', tenantId: 'tenant-ug', openedAt }));
    await expect(service.getCase('case-ug', platformSession())).rejects.toThrow('scope denied');
  });

  it('filters the queue by job type and overdue SLA', async () => {
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(
      reviewCase({
        id: 'case-overdue',
        jobType: 'VIDEO_TRANSCODE',
        openedAt: '2026-06-01T09:00:00.000Z',
      }),
    );
    repository.createCase(
      reviewCase({
        id: 'case-fresh',
        jobType: 'MALWARE_SCAN',
        openedAt: new Date().toISOString(),
      }),
    );
    const service = new MediaReviewService(repository, authService());

    await expect(
      service.listCases({ jobType: 'VIDEO_TRANSCODE' }, platformSession()),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'case-overdue', jobType: 'VIDEO_TRANSCODE' }),
    ]);
    await expect(service.listCases({ overdueOnly: true }, platformSession())).resolves.toEqual([
      expect.objectContaining({ id: 'case-overdue', overdue: true }),
    ]);
  });

  it('requires a mistaken-classification flag and note to restore HIGH or CRITICAL cases', async () => {
    const auditLogs: unknown[] = [];
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(reviewCase({ id: 'case-restore' }));
    const service = new MediaReviewService(repository, authService(auditLogs));

    await expect(
      service.resolveCase(
        'case-restore',
        { resolution: 'RESTORED', notes: 'False positive after hash collision review.' },
        platformSession(),
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    const restored = await service.resolveCase(
      'case-restore',
      {
        resolution: 'RESTORED',
        notes: 'False positive after hash collision review.',
        mistakenClassification: true,
      },
      platformSession(),
    );
    expect(restored).toMatchObject({
      status: 'RESOLVED',
      resolution: 'RESTORED',
    });
    expect(auditLogs).toEqual([
      expect.objectContaining({
        action: 'MEDIA_REVIEW_CASE_RESOLVED',
        metadata: expect.objectContaining({
          resolution: 'RESTORED',
          mistakenClassification: true,
        }),
      }),
    ]);
    expect(JSON.stringify(auditLogs)).not.toContain('False positive');
  });

  it('reopens dismissed cases and refuses escalated ones', async () => {
    const auditLogs: unknown[] = [];
    const repository = new InMemoryMediaReviewCaseRepository();
    repository.createCase(
      reviewCase({
        id: 'case-reopen',
        severity: 'HIGH',
        reason: 'POLICY_REVIEW',
        evidence: { verdict: 'needs_review' },
      }),
    );
    const service = new MediaReviewService(repository, authService(auditLogs));
    await service.resolveCase(
      'case-reopen',
      {
        resolution: 'DISMISSED',
        notes: 'False positive after hash collision review.',
        mistakenClassification: true,
      },
      platformSession(),
    );

    const reopened = await service.reopenCase('case-reopen', platformSession());
    expect(reopened).toMatchObject({
      status: 'OPEN',
      resolution: undefined,
    });
    expect(reopened.resolvedAt).toBeUndefined();
    expect(auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'MEDIA_REVIEW_CASE_REOPENED',
          entityId: 'case-reopen',
          metadata: expect.objectContaining({
            previousStatus: 'DISMISSED',
          }),
        }),
      ]),
    );

    repository.createCase(reviewCase({ id: 'case-escalated' }));
    await service.resolveCase(
      'case-escalated',
      { resolution: 'ESCALATED', notes: 'Escalated to the approved Kenya reporting path.' },
      platformSession(),
    );
    await expect(service.reopenCase('case-escalated', platformSession())).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('previews the Kenya playbook for in-scope moderators', async () => {
    const service = new MediaReviewService(new InMemoryMediaReviewCaseRepository(), authService());

    await expect(
      service.previewEscalationPlaybook(
        { countryCode: 'KE', severity: 'CRITICAL', jobType: 'MALWARE_SCAN' },
        platformSession(),
      ),
    ).resolves.toMatchObject({
      playbookCode: 'KE-MEDIA-2026-08',
      kind: 'CYBER_INCIDENT',
      channelCodes: ['INTERNAL_LEGAL_HOLD', 'KE_CIRT_INCIDENT', 'HOSTING_ABUSE'],
    });
    await expect(
      service.previewEscalationPlaybook(
        { countryCode: 'UG', severity: 'CRITICAL', jobType: 'MALWARE_SCAN' },
        platformSession(),
      ),
    ).rejects.toThrow('scope denied');
  });
});

function reviewCase(input: Partial<MediaReviewCaseRecord>): MediaReviewCaseRecord {
  const now = '2026-06-20T09:00:00.000Z';
  return {
    id: input.id ?? 'case-1',
    tenantId: input.tenantId ?? 'tenant-ke',
    mediaId: input.mediaId ?? 'media-1',
    ownerType: input.ownerType ?? 'ADVERT',
    ownerId: input.ownerId ?? 'advert-1',
    sourceJobId: input.sourceJobId ?? 'job-1',
    jobType: input.jobType ?? 'MALWARE_SCAN',
    severity: input.severity ?? 'CRITICAL',
    status: input.status ?? 'OPEN',
    reason: input.reason ?? 'MALWARE_DETECTED',
    provider: input.provider ?? 'unit-test-scanner',
    evidence: input.evidence ?? { verdict: 'malware' },
    openedAt: input.openedAt ?? now,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    resolvedAt: input.resolvedAt,
    resolvedBy: input.resolvedBy,
    resolution: input.resolution,
    notes: input.notes,
    assignedTo: input.assignedTo,
    assignedAt: input.assignedAt,
    assignmentNote: input.assignmentNote,
  };
}

function platformSession(): PlatformAccessSession {
  return {
    sessionId: 'session-1',
    sessionTenantId: 'platform-home-tenant',
    userId: 'country-mod-1',
    mfaVerified: true,
    assignments: [
      {
        id: 'assignment-1',
        userId: 'country-mod-1',
        role: 'COUNTRY_MODERATOR',
        scopeLevel: 'COUNTRY',
        countryCode: 'KE',
        mfaRequired: true,
        assignedBy: 'global-admin',
        createdAt: '2026-06-20T08:00:00.000Z',
        updatedAt: '2026-06-20T08:00:00.000Z',
      },
    ],
  };
}

function globalSession(): PlatformAccessSession {
  return {
    sessionId: 'session-global',
    sessionTenantId: 'platform-home-tenant',
    userId: 'global-mod-1',
    mfaVerified: true,
    assignments: [
      {
        id: 'assignment-global',
        userId: 'global-mod-1',
        role: 'GLOBAL_MODERATOR_LEAD',
        scopeLevel: 'GLOBAL',
        mfaRequired: true,
        assignedBy: 'global-admin',
        createdAt: '2026-06-20T08:00:00.000Z',
        updatedAt: '2026-06-20T08:00:00.000Z',
      },
    ],
  };
}

function globalAuthService(): AuthService {
  const base = authService();
  return {
    listTenants: base.listTenants.bind(base),
    recordTenantAudit: base.recordTenantAudit.bind(base),
    canPlatformAccess: () => true,
    requirePlatformAccess: async () => ({
      allowed: true,
      permission: 'MODERATE_CONTENT',
      role: 'GLOBAL_MODERATOR_LEAD',
      scopeLevel: 'GLOBAL',
      reason: 'ACCESS_GRANTED',
    }),
  } as Pick<
    AuthService,
    'listTenants' | 'canPlatformAccess' | 'requirePlatformAccess' | 'recordTenantAudit'
  > as AuthService;
}

function authService(auditLogs: unknown[] = []): AuthService {
  return {
    listTenants: async () => [
      {
        id: 'tenant-ke',
        displayName: 'Kenya Tenant',
        countryCode: 'KE',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'BUSINESS',
        status: 'TRIAL_ACTIVE',
        trialStartedAt: '2026-06-01T00:00:00.000Z',
        trialEndsAt: '2026-07-01T00:00:00.000Z',
        nextBillingAt: '2026-07-01T00:00:00.000Z',
        monthlyAmount: 10,
        currencyCode: 'KES',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'tenant-ug',
        displayName: 'Uganda Tenant',
        countryCode: 'UG',
        industryCode: 'AGRICULTURE',
        primaryRole: 'SUPPLIER',
        userType: 'BUSINESS',
        status: 'TRIAL_ACTIVE',
        trialStartedAt: '2026-06-01T00:00:00.000Z',
        trialEndsAt: '2026-07-01T00:00:00.000Z',
        nextBillingAt: '2026-07-01T00:00:00.000Z',
        monthlyAmount: 10,
        currencyCode: 'UGX',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ],
    canPlatformAccess: (_session, _permission, resource) => resource.countryCode === 'KE',
    requirePlatformAccess: async (_session, _permission, resource) => {
      if (resource.countryCode !== 'KE') {
        throw new Error('scope denied');
      }

      return {
        allowed: true,
        permission: 'MODERATE_CONTENT',
        role: 'COUNTRY_MODERATOR',
        scopeLevel: 'COUNTRY',
        reason: 'ACCESS_GRANTED',
      };
    },
    recordTenantAudit: async (input) => {
      auditLogs.push(input);
    },
  } as Pick<
    AuthService,
    'listTenants' | 'canPlatformAccess' | 'requirePlatformAccess' | 'recordTenantAudit'
  > as AuthService;
}
