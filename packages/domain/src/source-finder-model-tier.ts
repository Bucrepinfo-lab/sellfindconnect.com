// Source Finder explanation model TIER selector — PURE, framework-free core.
//
// The Source Finder match EXPLAINER (apps/api/.../anthropic-explainer.ts) runs on
// the cheapest suitable model by default (`claude-haiku-5-5`). Claude Fable 5.2
// (launched 09/11/26) is a far more capable — and far pricier ($8/$40 per MTok
// vs the Haiku tier) — flagship. So it is NOT a default swap: making it the
// default would raise provider cost and HURT margin. Its right place is an
// opt-in PREMIUM tier, offered as a paid add-on and rolled out gradually.
//
// This module is the smallest safe, reusable primitive for that: it validates
// which models the explainer may use, classifies each by tier, and decides —
// purely and fail-closed — whether a given request routes to the premium model
// or stays on the default. It holds NO secrets, makes NO network call, moves NO
// money, and sets NO margin (markup stays the owner's `priceAiUnits` parameter).
// The same shape is intended to be replicated across the portfolio's AI add-ons.
//
// House rules mirrored: default to the cheap/safe path, and fail closed — any
// missing, mismatched or malformed input routes to the default model.

export const explanationModelTiers = ['CHEAP', 'STANDARD', 'PREMIUM'] as const;

export type ExplanationModelTier = (typeof explanationModelTiers)[number];

/**
 * The models the Source Finder explainer is approved to call, each mapped to a
 * cost/capability tier. Extend deliberately — an unknown model is rejected
 * (fail closed), never silently billed. Prices referenced in comments are
 * Anthropic list prices as of 09/11/26 and are documentation only; the spend
 * cap + markup live in `ai-capability.ts`.
 */
export const EXPLANATION_MODEL_TIERS: Readonly<Record<string, ExplanationModelTier>> = {
  'claude-haiku-5-5': 'CHEAP', // default; cheapest suitable tier
  'claude-sonnet-5-5': 'STANDARD',
  'claude-opus-5-5': 'PREMIUM',
  'claude-fable-5-1': 'PREMIUM',
  'claude-fable-5-2': 'PREMIUM', // 09/11/26 flagship; $8/$40 per MTok
};

/** Default (cheapest) explanation model. Must match MATCH_EXPLANATION_MODEL. */
export const DEFAULT_EXPLANATION_MODEL = 'claude-haiku-5-5';

/** The premium add-on model this pilot introduces. */
export const PREMIUM_EXPLANATION_MODEL = 'claude-fable-5-2';

/** True when `model` is on the approved allow-list. */
export function isSupportedExplanationModel(model: string | undefined | null): boolean {
  return (
    typeof model === 'string' &&
    Object.prototype.hasOwnProperty.call(EXPLANATION_MODEL_TIERS, model)
  );
}

/** The tier for an approved model, or undefined when the model is not approved. */
export function explanationModelTier(
  model: string | undefined | null,
): ExplanationModelTier | undefined {
  return typeof model === 'string' ? EXPLANATION_MODEL_TIERS[model] : undefined;
}

export const AI_ROLLOUT_BPS_MAX = 10_000;

export interface SelectExplanationModelInput {
  /** The always-safe default model (should be CHEAP). */
  defaultModel: string;
  /** The premium model to route eligible traffic to, when set. */
  premiumModel?: string;
  /**
   * Share of ELIGIBLE traffic routed to the premium model, in basis points
   * (0..10000). 0 (or unset) keeps everyone on the default; 10000 routes all
   * eligible traffic. Out-of-range or non-integer values fail closed to 0.
   */
  rolloutBps?: number;
  /**
   * Whether this request is eligible for the premium tier at all (e.g. a Pro
   * plan with the add-on enabled). Defaults to false — the premium tier is
   * never reached without an explicit eligibility decision made elsewhere.
   */
  eligible?: boolean;
  /**
   * Stable key for A/B bucketing (e.g. tenant id). The same key always lands in
   * the same bucket, so a tenant's experience is consistent across requests.
   */
  assignmentKey?: string;
}

export interface ExplanationModelSelection {
  model: string;
  tier: ExplanationModelTier;
  premium: boolean;
  /** Why the default was kept, or that premium was selected. */
  reason:
    | 'PREMIUM_SELECTED'
    | 'NOT_ELIGIBLE'
    | 'ROLLOUT_ZERO'
    | 'NOT_IN_ROLLOUT'
    | 'PREMIUM_UNAVAILABLE'
    | 'DEFAULT_INVALID';
}

/** FNV-1a 32-bit hash → stable bucket in [0, 10000). */
function bucketOf(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 to unsigned, then fold into the basis-point range.
  return (h >>> 0) % AI_ROLLOUT_BPS_MAX;
}

function cleanBps(bps: number | undefined): number {
  if (typeof bps !== 'number' || !Number.isInteger(bps) || bps <= 0) return 0;
  return Math.min(bps, AI_ROLLOUT_BPS_MAX);
}

/**
 * Decide which model an explanation request should use. PURE and fail-closed:
 * the premium model is reached only when it is approved, eligibility is true,
 * the rollout is positive, and the request's stable bucket falls inside it.
 * Any other case returns the default model.
 */
export function selectExplanationModel(
  input: SelectExplanationModelInput,
): ExplanationModelSelection {
  const defaultModel = input.defaultModel;
  const defaultTier = explanationModelTier(defaultModel);
  // The default must itself be approved; if not, we still return it (callers
  // rely on a model string) but flag it so the explainer can reject it.
  const baseTier: ExplanationModelTier = defaultTier ?? 'CHEAP';

  const keep = (reason: ExplanationModelSelection['reason']): ExplanationModelSelection => ({
    model: defaultModel,
    tier: baseTier,
    premium: false,
    reason: defaultTier ? reason : 'DEFAULT_INVALID',
  });

  const premiumModel = input.premiumModel;
  if (!premiumModel || !isSupportedExplanationModel(premiumModel)) {
    return keep('PREMIUM_UNAVAILABLE');
  }
  if (!input.eligible) {
    return keep('NOT_ELIGIBLE');
  }
  const rolloutBps = cleanBps(input.rolloutBps);
  if (rolloutBps === 0) {
    return keep('ROLLOUT_ZERO');
  }
  const bucket = bucketOf(input.assignmentKey ?? '');
  if (bucket >= rolloutBps) {
    return keep('NOT_IN_ROLLOUT');
  }
  return {
    model: premiumModel,
    tier: explanationModelTier(premiumModel) ?? 'PREMIUM',
    premium: true,
    reason: 'PREMIUM_SELECTED',
  };
}
