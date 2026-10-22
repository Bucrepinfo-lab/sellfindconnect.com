export const mediaReviewSlaHoursBySeverity = {
  CRITICAL: 24,
  HIGH: 72,
  MEDIUM: 168,
} as const;

export type MediaReviewResolutionDecision =
  | { ok: true }
  | { ok: false; reason: string };

export type MediaReviewSla = {
  slaHours: number;
  dueAt: string;
  overdue: boolean;
};

export function mediaReviewSlaHours(severity: string): number {
  const level = severity.trim().toUpperCase();
  if (level === 'CRITICAL') {
    return mediaReviewSlaHoursBySeverity.CRITICAL;
  }
  if (level === 'HIGH') {
    return mediaReviewSlaHoursBySeverity.HIGH;
  }
  return mediaReviewSlaHoursBySeverity.MEDIUM;
}

export function presentMediaReviewSla(input: {
  openedAt: string;
  severity: string;
  now?: string;
}): MediaReviewSla {
  const slaHours = mediaReviewSlaHours(input.severity);
  const dueAt = new Date(Date.parse(input.openedAt) + slaHours * 3_600_000).toISOString();
  const now = input.now ?? new Date().toISOString();
  return {
    slaHours,
    dueAt,
    overdue: now > dueAt,
  };
}

export function mediaReviewRequiresMistakenClassification(
  resolution: string,
  severity: string,
): boolean {
  if (resolution !== 'RESTORED' && resolution !== 'DISMISSED') {
    return false;
  }

  const level = severity.trim().toUpperCase();
  return level === 'HIGH' || level === 'CRITICAL';
}

export function evaluateMediaReviewResolution(input: {
  resolution: string;
  severity: string;
  mistakenClassification?: boolean;
  notes?: string;
}): MediaReviewResolutionDecision {
  if (!mediaReviewRequiresMistakenClassification(input.resolution, input.severity)) {
    return { ok: true };
  }

  if (!input.mistakenClassification) {
    return {
      ok: false,
      reason:
        'HIGH and CRITICAL restore or dismiss actions require an explicit mistaken-classification confirmation.',
    };
  }

  if (!input.notes?.trim()) {
    return {
      ok: false,
      reason: 'Mistaken-classification restore or dismiss actions require a reviewer note.',
    };
  }

  return { ok: true };
}

export function canReopenMediaReviewCase(status: string): boolean {
  return status === 'DISMISSED';
}
