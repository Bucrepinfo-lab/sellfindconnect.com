import { describe, expect, it } from 'vitest';

import {
  assertTargetNotBlocked,
  blockedTargetContinueMessage,
  createUserBlock,
  createUserContentReport,
  filterBlockedSourceFinderResults,
  isTargetBlocked,
  resolveUserContentReport,
  UgcModerationError,
} from './ugc-moderation';

const actor = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  userId: 'owner-1',
  countryCode: 'KE',
};

describe('UGC report and block', () => {
  it('creates an open report after terms acceptance and strips hidden characters', () => {
    const report = createUserContentReport(
      {
        targetType: 'USER',
        targetId: 'r1',
        reason: 'HARASSMENT',
        details: 'Repeated\u200b insults in chat.',
        acceptedTerms: true,
      },
      actor,
      'report-1',
      '2026-08-22T15:00:00.000Z',
    );

    expect(report).toMatchObject({
      id: 'report-1',
      reporterTenantId: actor.tenantId,
      targetId: 'r1',
      reason: 'HARASSMENT',
      details: 'Repeated insults in chat.',
      status: 'OPEN',
      countryCode: 'KE',
    });
  });

  it('blocks self-reports, missing terms, and prohibited details', () => {
    expect(() =>
      createUserContentReport(
        {
          targetType: 'USER',
          targetId: 'r1',
          targetTenantId: actor.tenantId,
          reason: 'HARASSMENT',
          acceptedTerms: true,
        },
        actor,
        'report-self',
      ),
    ).toThrow(UgcModerationError);

    expect(() =>
      createUserContentReport(
        {
          targetType: 'USER',
          targetId: 'r1',
          reason: 'HARASSMENT',
          acceptedTerms: false as true,
        },
        actor,
        'report-terms',
      ),
    ).toThrow(/terms acceptance/);

    expect(() =>
      createUserContentReport(
        {
          targetType: 'USER',
          targetId: 'r1',
          reason: 'PROHIBITED_CONTENT',
          details: 'This listing sells ammunition.',
          acceptedTerms: true,
        },
        actor,
        'report-unsafe',
      ),
    ).toThrow(/blocked content/);
  });

  it('creates a block and hides that source from discovery', () => {
    const block = createUserBlock(
      {
        blockedTargetId: 'r2',
        reason: 'SPAM_SCAMS',
        acceptedTerms: true,
      },
      actor,
      'block-1',
    );

    expect(isTargetBlocked([block], actor.tenantId, 'r2')).toBe(true);
    expect(
      filterBlockedSourceFinderResults([{ id: 'r1' }, { id: 'r2' }], [block], actor.tenantId).map(
        (item) => item.id,
      ),
    ).toEqual(['r1']);
    expect(() => assertTargetNotBlocked([block], actor.tenantId, 'r2')).toThrow(
      blockedTargetContinueMessage,
    );
    expect(() => assertTargetNotBlocked([block], actor.tenantId, 'r1')).not.toThrow();
  });

  it('lets a moderator close an open report once', () => {
    const report = createUserContentReport(
      {
        targetType: 'ADVERT',
        targetId: 'ad-1',
        reason: 'IMPERSONATION',
        acceptedTerms: true,
      },
      actor,
      'report-2',
    );
    const closed = resolveUserContentReport(report, 'RESOLVED', '2026-08-22T16:00:00.000Z');

    expect(closed.status).toBe('RESOLVED');
    expect(() => resolveUserContentReport(closed, 'DISMISSED')).toThrow(/already closed/);
  });
});
