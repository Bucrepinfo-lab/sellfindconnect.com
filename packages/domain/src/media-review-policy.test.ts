import { describe, expect, it } from 'vitest';

import {
  canReopenMediaReviewCase,
  evaluateMediaReviewResolution,
  mediaReviewRequiresMistakenClassification,
  presentMediaReviewSla,
} from './media-review-policy';

describe('media review case policy', () => {
  it('computes severity SLAs and overdue state', () => {
    expect(
      presentMediaReviewSla({
        openedAt: '2026-08-21T12:00:00.000Z',
        severity: 'CRITICAL',
        now: '2026-08-21T18:00:00.000Z',
      }),
    ).toEqual({
      slaHours: 24,
      dueAt: '2026-08-22T12:00:00.000Z',
      overdue: false,
    });
    expect(
      presentMediaReviewSla({
        openedAt: '2026-08-21T12:00:00.000Z',
        severity: 'HIGH',
        now: '2026-08-25T12:00:00.000Z',
      }).overdue,
    ).toBe(true);
    expect(
      presentMediaReviewSla({
        openedAt: '2026-08-21T12:00:00.000Z',
        severity: 'MEDIUM',
        now: '2026-08-21T12:00:00.000Z',
      }).slaHours,
    ).toBe(168);
  });

  it('fail-closes HIGH/CRITICAL restore and dismiss without mistaken classification', () => {
    expect(mediaReviewRequiresMistakenClassification('RESTORED', 'CRITICAL')).toBe(true);
    expect(mediaReviewRequiresMistakenClassification('DISMISSED', 'HIGH')).toBe(true);
    expect(mediaReviewRequiresMistakenClassification('CONFIRMED_BLOCK', 'CRITICAL')).toBe(false);
    expect(mediaReviewRequiresMistakenClassification('RESTORED', 'MEDIUM')).toBe(false);
    expect(
      evaluateMediaReviewResolution({
        resolution: 'RESTORED',
        severity: 'CRITICAL',
      }),
    ).toEqual({
      ok: false,
      reason:
        'HIGH and CRITICAL restore or dismiss actions require an explicit mistaken-classification confirmation.',
    });
    expect(
      evaluateMediaReviewResolution({
        resolution: 'DISMISSED',
        severity: 'HIGH',
        mistakenClassification: true,
      }),
    ).toMatchObject({ ok: false });
    expect(
      evaluateMediaReviewResolution({
        resolution: 'RESTORED',
        severity: 'CRITICAL',
        mistakenClassification: true,
        notes: 'Wrong file matched the scan queue.',
      }),
    ).toEqual({ ok: true });
  });

  it('only reopens dismissed cases', () => {
    expect(canReopenMediaReviewCase('DISMISSED')).toBe(true);
    expect(canReopenMediaReviewCase('ESCALATED')).toBe(false);
    expect(canReopenMediaReviewCase('RESOLVED')).toBe(false);
    expect(canReopenMediaReviewCase('OPEN')).toBe(false);
  });
});
