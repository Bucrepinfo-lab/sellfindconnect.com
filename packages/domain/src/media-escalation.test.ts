import { describe, expect, it } from 'vitest';

import {
  mediaEscalationRequiresPlaybook,
  resolveMediaEscalationPlaybook,
  toMediaEscalationAuditMetadata,
} from './media-escalation';

const occurredAt = '2026-08-21T12:00:00.000Z';

describe('media escalation playbooks', () => {
  it('requires a playbook for escalations and severe confirmed blocks', () => {
    expect(mediaEscalationRequiresPlaybook('ESCALATED', 'MEDIUM')).toBe(true);
    expect(mediaEscalationRequiresPlaybook('CONFIRMED_BLOCK', 'CRITICAL')).toBe(true);
    expect(mediaEscalationRequiresPlaybook('CONFIRMED_BLOCK', 'HIGH')).toBe(true);
    expect(mediaEscalationRequiresPlaybook('CONFIRMED_BLOCK', 'MEDIUM')).toBe(false);
    expect(mediaEscalationRequiresPlaybook('DISMISSED', 'CRITICAL')).toBe(false);
    expect(mediaEscalationRequiresPlaybook('RESTORED', 'HIGH')).toBe(false);
  });

  it('fail-closes without an approved country playbook', () => {
    expect(
      resolveMediaEscalationPlaybook({
        severity: 'CRITICAL',
        jobType: 'MALWARE_SCAN',
        occurredAt,
      }),
    ).toEqual({
      ok: false,
      reason: 'A tenant country is required before legal reporting can be escalated.',
    });
    expect(
      resolveMediaEscalationPlaybook({
        countryCode: 'UG',
        severity: 'CRITICAL',
        jobType: 'MALWARE_SCAN',
        occurredAt,
      }),
    ).toEqual({
      ok: false,
      reason: 'No approved legal reporting playbook exists for this country.',
    });
  });

  it('routes Kenya scanner blocks to KE-CIRT and hosting abuse', () => {
    const decision = resolveMediaEscalationPlaybook({
      countryCode: 'KE',
      severity: 'CRITICAL',
      jobType: 'MALWARE_SCAN',
      reason: 'SCAN_BLOCKED',
      occurredAt,
    });

    expect(decision).toMatchObject({
      ok: true,
      snapshot: {
        playbookCode: 'KE-MEDIA-2026-08',
        countryCode: 'KE',
        kind: 'CYBER_INCIDENT',
        channelCodes: ['INTERNAL_LEGAL_HOLD', 'KE_CIRT_INCIDENT', 'HOSTING_ABUSE'],
        reportDueAt: '2026-08-22T12:00:00.000Z',
        legalHoldUntil: '2026-11-19T12:00:00.000Z',
        preserveEvidence: true,
      },
    });
  });

  it('routes Kenya youth-protection cases to NCMEC and KE-CIRT', () => {
    const decision = resolveMediaEscalationPlaybook({
      countryCode: 'ke',
      severity: 'CRITICAL',
      jobType: 'CONTENT_MODERATION',
      reason: 'ZT-CHILD-001',
      occurredAt,
    });

    expect(decision.ok).toBe(true);
    if (!decision.ok) {
      return;
    }

    expect(decision.snapshot.kind).toBe('CHILD_SAFETY');
    expect(decision.snapshot.channelCodes).toEqual([
      'INTERNAL_LEGAL_HOLD',
      'NCMEC_CYBERTIPLINE',
      'KE_CIRT_CHILD_RELATED',
      'HOSTING_ABUSE',
    ]);
    expect(decision.snapshot.reportDueAt).toBe('2026-08-22T12:00:00.000Z');
    expect(decision.snapshot.legalHoldUntil).toBe('2027-08-21T12:00:00.000Z');
    expect(decision.snapshot.channels.map((channel) => channel.reportUrl)).toEqual([
      undefined,
      'https://report.cybertip.org/',
      'https://ke-cirt.go.ke/child-related-cyber-incident-reporting-form/',
      'https://www.digitalocean.com/company/contact/abuse',
    ]);
  });

  it('keeps transform failures on an internal hold for Kenya', () => {
    const decision = resolveMediaEscalationPlaybook({
      countryCode: 'KE',
      severity: 'MEDIUM',
      jobType: 'IMAGE_TRANSFORM',
      reason: 'CDN_UNREACHABLE',
      occurredAt,
    });

    expect(decision).toMatchObject({
      ok: true,
      snapshot: {
        kind: 'INTERNAL',
        channelCodes: ['INTERNAL_LEGAL_HOLD'],
        reportDueAt: '2026-08-28T12:00:00.000Z',
        legalHoldUntil: '2026-09-20T12:00:00.000Z',
      },
    });
  });

  it('omits report URLs and contact details from audit metadata', () => {
    const decision = resolveMediaEscalationPlaybook({
      countryCode: 'KE',
      severity: 'CRITICAL',
      jobType: 'CONTENT_MODERATION',
      reason: 'ZT-CHILD-001',
      occurredAt,
    });
    expect(decision.ok).toBe(true);
    if (!decision.ok) {
      return;
    }

    const audit = JSON.stringify(toMediaEscalationAuditMetadata(decision.snapshot));
    expect(audit).toContain('KE-MEDIA-2026-08');
    expect(audit).toContain('NCMEC_CYBERTIPLINE');
    expect(audit).not.toContain('http');
    expect(audit).not.toContain('@');
    expect(audit).not.toContain('secret');
  });
});
