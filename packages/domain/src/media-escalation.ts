export const approvedMediaEscalationCountries = ['KE'] as const;

export const mediaEscalationKinds = [
  'CHILD_SAFETY',
  'CYBER_INCIDENT',
  'CONTENT_ABUSE',
  'INTERNAL',
] as const;

export type MediaEscalationKind = (typeof mediaEscalationKinds)[number];

export const mediaEscalationChannelCodes = [
  'KE_CIRT_INCIDENT',
  'KE_CIRT_CHILD_RELATED',
  'NCMEC_CYBERTIPLINE',
  'HOSTING_ABUSE',
  'INTERNAL_LEGAL_HOLD',
] as const;

export type MediaEscalationChannelCode = (typeof mediaEscalationChannelCodes)[number];

export type MediaEscalationChannel = {
  code: MediaEscalationChannelCode;
  label: string;
  reportUrl?: string;
};

export type MediaEscalationPlaybookInput = {
  countryCode?: string;
  severity: string;
  jobType: string;
  reason?: string;
  occurredAt?: string;
};

export type MediaEscalationSnapshot = {
  playbookCode: string;
  countryCode: string;
  kind: MediaEscalationKind;
  channelCodes: MediaEscalationChannelCode[];
  channels: MediaEscalationChannel[];
  reportDueAt: string;
  legalHoldUntil: string;
  preserveEvidence: true;
  requiredActions: string[];
};

export type MediaEscalationDecision =
  | { ok: true; snapshot: MediaEscalationSnapshot }
  | { ok: false; reason: string };

const KE_PLAYBOOK_CODE = 'KE-MEDIA-2026-08';

const CHANNELS: Record<MediaEscalationChannelCode, MediaEscalationChannel> = {
  KE_CIRT_INCIDENT: {
    code: 'KE_CIRT_INCIDENT',
    label: 'Kenya KE-CIRT incident report',
    reportUrl: 'https://ke-cirt.go.ke/report-an-incident/',
  },
  KE_CIRT_CHILD_RELATED: {
    code: 'KE_CIRT_CHILD_RELATED',
    label: 'Kenya KE-CIRT youth-protection incident report',
    reportUrl: 'https://ke-cirt.go.ke/child-related-cyber-incident-reporting-form/',
  },
  NCMEC_CYBERTIPLINE: {
    code: 'NCMEC_CYBERTIPLINE',
    label: 'NCMEC CyberTipline',
    reportUrl: 'https://report.cybertip.org/',
  },
  HOSTING_ABUSE: {
    code: 'HOSTING_ABUSE',
    label: 'Hosting provider abuse desk',
    reportUrl: 'https://www.digitalocean.com/company/contact/abuse',
  },
  INTERNAL_LEGAL_HOLD: {
    code: 'INTERNAL_LEGAL_HOLD',
    label: 'Internal evidence preservation',
  },
};

const REQUIRED_ACTIONS = [
  'Preserve the original object, job evidence, and account identifiers.',
  'File every listed report before the due timestamp.',
  'Keep the asset unpublished until legal releases the hold.',
] as const;

export function mediaEscalationRequiresPlaybook(resolution: string, severity: string): boolean {
  if (resolution === 'ESCALATED') {
    return true;
  }

  if (resolution === 'CONFIRMED_BLOCK') {
    const level = severity.trim().toUpperCase();
    return level === 'HIGH' || level === 'CRITICAL';
  }

  return false;
}

export function resolveMediaEscalationPlaybook(
  input: MediaEscalationPlaybookInput,
): MediaEscalationDecision {
  const countryCode = input.countryCode?.trim().toUpperCase();
  if (!countryCode) {
    return {
      ok: false,
      reason: 'A tenant country is required before legal reporting can be escalated.',
    };
  }

  if (!approvedMediaEscalationCountries.includes(countryCode as (typeof approvedMediaEscalationCountries)[number])) {
    return {
      ok: false,
      reason: 'No approved legal reporting playbook exists for this country.',
    };
  }

  const kind = classifyEscalationKind(input);
  const channelCodes = channelsForKind(kind);
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const reportDueHours = kind === 'CONTENT_ABUSE' ? 72 : kind === 'INTERNAL' ? 168 : 24;
  const legalHoldDays = kind === 'CHILD_SAFETY' ? 365 : kind === 'INTERNAL' ? 30 : 90;

  return {
    ok: true,
    snapshot: {
      playbookCode: KE_PLAYBOOK_CODE,
      countryCode,
      kind,
      channelCodes,
      channels: channelCodes.map((code) => CHANNELS[code]),
      reportDueAt: addHours(occurredAt, reportDueHours),
      legalHoldUntil: addDaysIso(occurredAt, legalHoldDays),
      preserveEvidence: true,
      requiredActions: [...REQUIRED_ACTIONS],
    },
  };
}

export function toMediaEscalationAuditMetadata(snapshot: MediaEscalationSnapshot) {
  return {
    playbookCode: snapshot.playbookCode,
    countryCode: snapshot.countryCode,
    kind: snapshot.kind,
    channelCodes: snapshot.channelCodes.join(','),
    reportDueAt: snapshot.reportDueAt,
    legalHoldUntil: snapshot.legalHoldUntil,
    preserveEvidence: snapshot.preserveEvidence,
  };
}

function classifyEscalationKind(input: MediaEscalationPlaybookInput): MediaEscalationKind {
  const haystack = `${input.jobType} ${input.reason ?? ''}`.toUpperCase();
  if (
    haystack.includes('CHILD') ||
    haystack.includes('CSAM') ||
    haystack.includes('GROOM') ||
    haystack.includes('TRAFFICK') ||
    haystack.includes('ENDANGER')
  ) {
    return 'CHILD_SAFETY';
  }

  if (input.jobType === 'MALWARE_SCAN' || haystack.includes('MALWARE') || haystack.includes('INFECT')) {
    return 'CYBER_INCIDENT';
  }

  if (input.jobType === 'CONTENT_MODERATION') {
    return 'CONTENT_ABUSE';
  }

  return 'INTERNAL';
}

function channelsForKind(kind: MediaEscalationKind): MediaEscalationChannelCode[] {
  switch (kind) {
    case 'CHILD_SAFETY':
      return ['INTERNAL_LEGAL_HOLD', 'NCMEC_CYBERTIPLINE', 'KE_CIRT_CHILD_RELATED', 'HOSTING_ABUSE'];
    case 'CYBER_INCIDENT':
      return ['INTERNAL_LEGAL_HOLD', 'KE_CIRT_INCIDENT', 'HOSTING_ABUSE'];
    case 'CONTENT_ABUSE':
      return ['INTERNAL_LEGAL_HOLD', 'KE_CIRT_INCIDENT'];
    case 'INTERNAL':
      return ['INTERNAL_LEGAL_HOLD'];
  }
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}
