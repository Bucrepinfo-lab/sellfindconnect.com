import { evaluateSafetyFields, type SafetyDecision } from './safety';
import { sanitizeText } from './sanitization';

export const ugcReportTargetTypes = [
  'PROFILE',
  'ADVERT',
  'USER',
  'CONVERSATION',
  'MEDIA',
] as const;

export type UgcReportTargetType = (typeof ugcReportTargetTypes)[number];

export const ugcReportReasons = [
  'PROHIBITED_CONTENT',
  'HARASSMENT',
  'SPAM_SCAMS',
  'IMPERSONATION',
  'INTELLECTUAL_PROPERTY',
  'OTHER',
] as const;

export type UgcReportReason = (typeof ugcReportReasons)[number];

export const ugcReportStatuses = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;

export type UgcReportStatus = (typeof ugcReportStatuses)[number];

export const ugcReportResolutions = ['RESOLVED', 'DISMISSED'] as const;

export type UgcReportResolution = (typeof ugcReportResolutions)[number];

export type UserContentReportInput = {
  targetType: UgcReportTargetType;
  targetId: string;
  targetTenantId?: string;
  reason: UgcReportReason;
  details?: string;
  acceptedTerms: true;
};

export type UserContentReport = {
  id: string;
  reporterTenantId: string;
  reporterUserId: string;
  targetType: UgcReportTargetType;
  targetId: string;
  targetTenantId?: string;
  reason: UgcReportReason;
  details?: string;
  status: UgcReportStatus;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
};

export type UserBlockInput = {
  blockedTargetId: string;
  blockedTenantId?: string;
  reason: UgcReportReason;
  acceptedTerms: true;
};

export type UserBlock = {
  id: string;
  tenantId: string;
  blockedTargetId: string;
  blockedTenantId?: string;
  createdByUserId: string;
  reason: UgcReportReason;
  createdAt: string;
};

export class UgcModerationError extends Error {
  safety?: SafetyDecision;

  constructor(message: string, safety?: SafetyDecision) {
    super(message);
    this.name = 'UgcModerationError';
    this.safety = safety;
  }
}

export type UgcModerationActor = {
  tenantId: string;
  userId: string;
  countryCode?: string;
};

function requireTerms(accepted: boolean): void {
  if (!accepted) {
    throw new UgcModerationError(
      'Current terms acceptance is required before reporting or blocking.',
    );
  }
}

function normalizeTargetId(value: string): string {
  const targetId = sanitizeText(value, { maxLength: 120 });
  if (targetId.length < 1) {
    throw new UgcModerationError('A target is required.');
  }
  return targetId;
}

function assertSafeFields(fields: object): void {
  const safety = evaluateSafetyFields(fields);
  if (!safety.allowed) {
    throw new UgcModerationError('Report details contain blocked content.', safety);
  }
}

export function createUserContentReport(
  input: UserContentReportInput,
  actor: UgcModerationActor,
  id: string,
  now = new Date().toISOString(),
): UserContentReport {
  requireTerms(input.acceptedTerms);

  const targetId = normalizeTargetId(input.targetId);
  const targetTenantId = input.targetTenantId?.trim() || undefined;
  const details = input.details?.trim()
    ? sanitizeText(input.details, { maxLength: 500 })
    : undefined;

  if (targetTenantId && targetTenantId === actor.tenantId) {
    throw new UgcModerationError('You cannot report your own tenant.');
  }

  assertSafeFields({ targetId, details: details ?? '' });

  return {
    id,
    reporterTenantId: actor.tenantId,
    reporterUserId: actor.userId,
    targetType: input.targetType,
    targetId,
    targetTenantId,
    reason: input.reason,
    details,
    status: 'OPEN',
    countryCode: actor.countryCode?.trim() || 'KE',
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveUserContentReport(
  report: UserContentReport,
  resolution: UgcReportResolution,
  now = new Date().toISOString(),
): UserContentReport {
  if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
    throw new UgcModerationError('This report is already closed.');
  }

  return {
    ...report,
    status: resolution,
    updatedAt: now,
  };
}

export function createUserBlock(
  input: UserBlockInput,
  actor: UgcModerationActor,
  id: string,
  now = new Date().toISOString(),
): UserBlock {
  requireTerms(input.acceptedTerms);

  const blockedTargetId = normalizeTargetId(input.blockedTargetId);
  const blockedTenantId = input.blockedTenantId?.trim() || undefined;

  if (blockedTargetId === actor.tenantId || blockedTenantId === actor.tenantId) {
    throw new UgcModerationError('You cannot block your own tenant.');
  }

  assertSafeFields({ blockedTargetId });

  return {
    id,
    tenantId: actor.tenantId,
    blockedTargetId,
    blockedTenantId,
    createdByUserId: actor.userId,
    reason: input.reason,
    createdAt: now,
  };
}

export const blockedTargetContinueMessage =
  'This account is blocked. Unblock it before continuing.';

export function isTargetBlocked(
  blocks: UserBlock[],
  tenantId: string,
  targetId: string,
): boolean {
  return blocks.some(
    (block) => block.tenantId === tenantId && block.blockedTargetId === targetId,
  );
}

export function assertTargetNotBlocked(
  blocks: UserBlock[],
  tenantId: string,
  targetId: string,
): void {
  if (isTargetBlocked(blocks, tenantId, targetId)) {
    throw new UgcModerationError(blockedTargetContinueMessage);
  }
}

export function filterBlockedSourceFinderResults<T extends { id: string }>(
  results: T[],
  blocks: UserBlock[],
  tenantId: string,
): T[] {
  const blocked = new Set(
    blocks
      .filter((block) => block.tenantId === tenantId)
      .map((block) => block.blockedTargetId),
  );
  return results.filter((result) => !blocked.has(result.id));
}
