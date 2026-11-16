// Provider-neutral AI capability metering + spend cap (safety/finance core).
//
// This is the smallest safe foundation for metered AI add-ons across the
// portfolio. It is pure, framework-free, needs no secrets, and MOVES NO MONEY:
// it decides whether an AI request is allowed under a per-tenant spend cap and
// prices the add-on at a margin markup, nothing more. Wiring a real provider
// (e.g. an AI usage/cost API) and any invoice/billing integration are separate,
// human-approved changes that sit behind an adapter (see AiUsageMeterAdapter)
// and the finance module's APPROVED-tax-profile gate.
//
// Design rules mirrored from the house style:
//  - Money is always integer MINOR units of a single currency (never floats).
//  - Fail closed: anything missing, mismatched, or malformed => DENY.
//  - Default to a dev/no-op adapter; the vendor call lives only in an adapter.

/** The add-on AI capabilities the portfolio meters. Provider-neutral names. */
export const aiCapabilities = [
  'MATCH_EXPLANATION',
  'LISTING_DRAFT',
  'RFQ_REPLY_DRAFT',
  'SUPPORT_REPLY_DRAFT',
  'MODERATION_ASSIST',
] as const;

export type AiCapability = (typeof aiCapabilities)[number];

export const aiSpendPeriods = ['DAY', 'MONTH'] as const;

export type AiSpendPeriod = (typeof aiSpendPeriods)[number];

export const aiSpendReasonCodes = [
  'ALLOWED',
  'NO_CAP',
  'INVALID_CAP',
  'INVALID_ESTIMATE',
  'TENANT_MISMATCH',
  'CURRENCY_MISMATCH',
  'PERIOD_MISMATCH',
  'CAPABILITY_DISABLED',
  'CAP_EXCEEDED',
] as const;

export type AiSpendReasonCode = (typeof aiSpendReasonCodes)[number];

/** Per-tenant spend cap for AI add-on usage within one billing period. */
export interface AiSpendCap {
  tenantId: string;
  currency: string;
  period: AiSpendPeriod;
  /** Hard ceiling for the period, in integer minor units (> 0). */
  periodLimitMinor: number;
  /**
   * Capabilities enabled for this tenant. Omit/empty => all capabilities
   * allowed (cap still applies). A non-empty list acts as an allow-list.
   */
  enabledCapabilities?: readonly AiCapability[];
}

/** What a tenant has already consumed in the current period. */
export interface AiUsageSnapshot {
  tenantId: string;
  currency: string;
  period: AiSpendPeriod;
  /** Already-consumed cost for the period, in integer minor units (>= 0). */
  periodUsedMinor: number;
  asOf: string; // ISO-8601 instant the snapshot was taken.
}

/** A single AI request asking to spend against the cap. */
export interface AiSpendRequest {
  tenantId: string;
  capability: AiCapability;
  currency: string;
  /** Estimated provider cost of this request, in integer minor units (>= 0). */
  estimatedCostMinor: number;
}

export interface AiSpendDecision {
  allowed: boolean;
  reasonCode: AiSpendReasonCode;
  /** Remaining headroom after this request if allowed; 0 when denied. */
  remainingMinor: number;
}

function isNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function deny(reasonCode: AiSpendReasonCode): AiSpendDecision {
  return { allowed: false, reasonCode, remainingMinor: 0 };
}

/**
 * Decide whether an AI request may proceed under a tenant's spend cap.
 * Pure and fail-closed: any missing/mismatched/malformed input denies.
 */
export function evaluateAiSpend(
  cap: AiSpendCap | null | undefined,
  snapshot: AiUsageSnapshot | null | undefined,
  request: AiSpendRequest,
): AiSpendDecision {
  if (!cap) return deny('NO_CAP');

  // Validate the cap itself.
  if (
    !cap.tenantId ||
    !cap.currency ||
    !aiSpendPeriods.includes(cap.period) ||
    !isPositiveInt(cap.periodLimitMinor)
  ) {
    return deny('INVALID_CAP');
  }

  // Validate the request.
  if (
    !request ||
    !request.tenantId ||
    !request.currency ||
    !aiCapabilities.includes(request.capability) ||
    !isNonNegativeInt(request.estimatedCostMinor)
  ) {
    return deny('INVALID_ESTIMATE');
  }

  if (request.tenantId !== cap.tenantId) return deny('TENANT_MISMATCH');
  if (request.currency !== cap.currency) return deny('CURRENCY_MISMATCH');

  // A missing snapshot is treated as "unknown usage" => fail closed.
  if (
    !snapshot ||
    snapshot.tenantId !== cap.tenantId ||
    !isNonNegativeInt(snapshot.periodUsedMinor)
  ) {
    return deny('INVALID_ESTIMATE');
  }
  if (snapshot.currency !== cap.currency) return deny('CURRENCY_MISMATCH');
  if (snapshot.period !== cap.period) return deny('PERIOD_MISMATCH');

  // Allow-list check (only when the tenant restricts capabilities).
  const enabled = cap.enabledCapabilities;
  if (enabled && enabled.length > 0 && !enabled.includes(request.capability)) {
    return deny('CAPABILITY_DISABLED');
  }

  const projected = snapshot.periodUsedMinor + request.estimatedCostMinor;
  if (projected > cap.periodLimitMinor) return deny('CAP_EXCEEDED');

  return {
    allowed: true,
    reasonCode: 'ALLOWED',
    remainingMinor: cap.periodLimitMinor - projected,
  };
}

/**
 * Price metered AI usage for the subscriber at a margin markup, so the add-on
 * raises margin rather than passing provider cost through at break-even.
 *
 * Pure integer math. This only computes a billable amount; it never creates an
 * invoice or moves money (that is the finance module's human-authorised path).
 *
 * @param providerCostMinor integer minor units of raw provider cost (>= 0)
 * @param markupBps margin markup in basis points (>= 0; 2000 = +20%)
 * @returns billable amount in integer minor units, rounded up
 */
export function priceAiUnits(providerCostMinor: number, markupBps: number): number {
  if (!isNonNegativeInt(providerCostMinor)) {
    throw new Error('providerCostMinor must be a non-negative integer (minor units)');
  }
  if (!isNonNegativeInt(markupBps)) {
    throw new Error('markupBps must be a non-negative integer (basis points)');
  }
  return Math.ceil((providerCostMinor * (10_000 + markupBps)) / 10_000);
}

// --- Provider-neutral metering port -----------------------------------------
// The real usage/cost source (an AI provider's analytics API, a database, etc.)
// sits behind this adapter, gated by an env var *name* in the API layer. The
// default is a dev/no-op meter so the no-secrets build runs unchanged.

export interface AiUsageEvent {
  tenantId: string;
  capability: AiCapability;
  currency: string;
  costMinor: number;
  at: string; // ISO-8601
}

export interface AiUsageMeterAdapter {
  readonly name: string;
  snapshot(tenantId: string, period: AiSpendPeriod): Promise<AiUsageSnapshot>;
  record(event: AiUsageEvent): Promise<void>;
}

/**
 * Default dev meter: no secrets, no network. Accumulates usage in memory so the
 * cap logic is exercisable in tests and the default build, and reports it back
 * as snapshots. Not for production accounting.
 */
export class DevInMemoryAiUsageMeter implements AiUsageMeterAdapter {
  readonly name = 'dev-in-memory';
  private readonly totals = new Map<string, { used: number; currency: string }>();

  private key(tenantId: string, period: AiSpendPeriod): string {
    return `${tenantId}::${period}`;
  }

  async snapshot(tenantId: string, period: AiSpendPeriod): Promise<AiUsageSnapshot> {
    const entry = this.totals.get(this.key(tenantId, period));
    return {
      tenantId,
      currency: entry?.currency ?? 'KES',
      period,
      periodUsedMinor: entry?.used ?? 0,
      asOf: new Date().toISOString(),
    };
  }

  async record(event: AiUsageEvent): Promise<void> {
    if (!isNonNegativeInt(event.costMinor)) {
      throw new Error('AiUsageEvent.costMinor must be a non-negative integer (minor units)');
    }
    for (const period of aiSpendPeriods) {
      const k = this.key(event.tenantId, period);
      const prev = this.totals.get(k);
      this.totals.set(k, {
        used: (prev?.used ?? 0) + event.costMinor,
        currency: event.currency,
      });
    }
  }
}

export class AiUsageMeterRegistry {
  private adapter: AiUsageMeterAdapter | null = null;
  register(adapter: AiUsageMeterAdapter) {
    this.adapter = adapter;
  }
  /** Returns the registered meter, or a fresh dev meter (fail-safe default). */
  get(): AiUsageMeterAdapter {
    return this.adapter ?? new DevInMemoryAiUsageMeter();
  }
}
