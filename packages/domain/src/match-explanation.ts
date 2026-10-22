import { evaluateSafetyText } from './safety';
import type { SourceFinderReasonCode } from './source-finder';

/**
 * Source Finder match explanation — PURE, framework-free core.
 *
 * Turns a match's structured reason codes + deterministic `reasons` into a short
 * plain-English "why this match" line for the searcher. Same provider-neutral
 * discipline as the payment / tax / search adapters: the deterministic
 * `templateMatchExplanation` is the always-on, ZERO-COST fallback (used with no
 * key, provider disabled, or on any failure), and every model output is run
 * through the zero-tolerance safety core before it is trusted.
 *
 * The network call lives in the app layer behind the SourceFinderExplainer
 * adapter (apps/api) — this module stays pure and unit-testable.
 */

/** The facts an explanation is built from (all already produced by the matcher). */
export type MatchExplanationInput = {
  /** The searcher's query, e.g. "who packages avocados for export in Kenya". */
  query: string;
  /** Candidate advertiser name. */
  name: string;
  /** Supply-chain role label, e.g. "PRODUCER", "DISTRIBUTOR". */
  role: string;
  /** Human location, e.g. "Nakuru, Kenya". */
  location: string;
  /** What the candidate offers (short list). */
  offers: string[];
  /** Whether the profile is verified. */
  verified: boolean;
  /** Reason codes the matcher attached. */
  reasonCodes: SourceFinderReasonCode[];
  /** The matcher's deterministic human-readable reasons (the seed/fallback). */
  reasons: string[];
};

/** Keep explanations short (for buyers, and to keep token cost tiny). */
export const MATCH_EXPLANATION_MAX_CHARS = 320;

/** Cheapest suitable tier; override with MATCH_EXPLANATION_MODEL. */
export const MATCH_EXPLANATION_MODEL = 'claude-haiku-5-5';
/**
 * Output ceiling. Current (5.x) models emit a `thinking` block before the text,
 * so a tight budget leaves no room for the sentence. 1024 is ample, and
 * `max_tokens` only caps output — billing is per token actually produced, so
 * this does not raise cost. Override with MATCH_EXPLANATION_MAX_TOKENS.
 */
export const MATCH_EXPLANATION_MAX_TOKENS = 1024;

function clamp(value: string, max: number): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The deterministic explanation: the matcher's own reasons, joined into a
 * readable line. Always available, costs nothing, never invents a claim.
 */
export function templateMatchExplanation(input: MatchExplanationInput): string {
  const reasons = input.reasons.map((r) => r.trim()).filter(Boolean);
  if (reasons.length > 0) {
    return clamp(`${input.name} matched because: ${reasons.join(' ')}`, MATCH_EXPLANATION_MAX_CHARS);
  }
  // No reasons supplied — fall back to the bare facts.
  const offers = input.offers.filter(Boolean).slice(0, 3).join(', ');
  const parts = [`${input.name} is a ${input.role.toLowerCase()} in ${input.location}.`];
  if (offers) {
    parts.push(`Offers: ${offers}.`);
  }
  if (input.verified) {
    parts.push('Verified profile.');
  }
  return clamp(parts.join(' '), MATCH_EXPLANATION_MAX_CHARS);
}

/**
 * The instruction handed to the model. The matcher's reasons are the seed, so
 * the model rephrases rather than inventing: use ONLY the given reasons/facts,
 * never fabricate capabilities, certifications or relationships.
 */
export function matchExplanationPrompt(input: MatchExplanationInput): string {
  return [
    'You explain, in one or two plain-English sentences, why a business matched a buyer\'s search on a B2B sourcing platform.',
    'Rules:',
    `- At most ${MATCH_EXPLANATION_MAX_CHARS} characters. Plain text only, no markdown, no lists.`,
    '- Use ONLY the reasons and facts provided. Never invent capabilities, certifications, volumes, prices or relationships.',
    '- Neutral, factual, professional. Do not overstate or add a sales pitch.',
    '',
    `Buyer's search: ${JSON.stringify(input.query)}`,
    'Match facts:',
    JSON.stringify(
      {
        name: input.name,
        role: input.role,
        location: input.location,
        offers: input.offers,
        verified: input.verified,
        reasonCodes: input.reasonCodes,
        reasons: input.reasons,
      },
      null,
      0,
    ),
    '',
    'A correct baseline (improve its wording, keep its facts):',
    templateMatchExplanation(input),
  ].join('\n');
}

/**
 * Clean the model's reply into a single safe line. Returns null when the output
 * is empty or trips the zero-tolerance safety core, so the caller falls back to
 * the deterministic template.
 */
export function parseMatchExplanation(text: string): string | null {
  if (!text) {
    return null;
  }
  const cleaned = clamp(text.replace(/^["'\s]+|["'\s]+$/g, ''), MATCH_EXPLANATION_MAX_CHARS);
  if (!cleaned) {
    return null;
  }
  // Never surface model text that trips the prohibited-content policy.
  if (!evaluateSafetyText(cleaned).allowed) {
    return null;
  }
  return cleaned;
}
