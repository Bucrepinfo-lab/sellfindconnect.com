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
        }),
      }),
    ]);
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
