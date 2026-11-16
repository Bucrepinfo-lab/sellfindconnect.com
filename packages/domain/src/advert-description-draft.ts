import { evaluateSafetyFields } from './safety';
import { sanitizeText } from './sanitization';

/**
 * "Write it for me" for advert descriptions (owner-approved 11/11/26, same
 * design as HarvestHub's "Enhance listing").
 *
 * The deterministic template is the always-on, zero-cost answer. The AI
 * overlay is opt-in per environment, uses the cheapest model tier, only
 * rephrases the facts the business gave, is re-screened by the safety core,
 * and is capped per business per month so cost stays far below the
 * subscription price. Any failure falls back to the template, so a business is
 * never blocked from publishing.
 */

export const ADVERT_DRAFT_MODEL = 'claude-haiku-5-5';
/** Ceiling only (billing is per token produced); room for a thinking block. */
export const ADVERT_DRAFT_MAX_TOKENS = 1024;
export const ADVERT_DRAFT_TITLE_MAX = 120;
export const ADVERT_DRAFT_DESCRIPTION_MAX = 600;
/**
 * AI drafts per business per calendar month. At roughly 1,000 input and 300
 * output tokens on the cheapest tier, five drafts cost a small fraction of
 * the 10-unit monthly price. Template drafts are free and unlimited.
 */
export const MONTHLY_AI_ADVERT_DRAFTS = 5;
export const ADVERT_DRAFT_AUDIT_ACTION = 'ADVERT_DESCRIPTION_DRAFTED';

export type AdvertCopyInput = {
  /** What the advert is about, in the business's words (title so far). */
  title?: string;
  /** Free notes: products, prices, delivery, hours. */
  notes?: string;
  businessName: string;
  roleLabel: string;
  industryLabel: string;
  place?: string;
};

export type AdvertCopy = { title: string; description: string };

function clean(value: string | undefined, max: number): string {
  if (!value) return '';
  const text = sanitizeText(value, { maxLength: max * 2 }).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Plain, factual copy from the details given. Never adds claims. */
export function templateAdvertDraft(input: AdvertCopyInput): AdvertCopy {
  const business = clean(input.businessName, 80) || 'Our business';
  const role = clean(input.roleLabel, 40).toLowerCase();
  const industry = clean(input.industryLabel, 80).toLowerCase();
  const place = clean(input.place, 80);
  const subject = clean(input.title, ADVERT_DRAFT_TITLE_MAX);
  const notes = clean(input.notes, 400);

  const title = subject || clean(`${business}: ${industry}${place ? ` in ${place}` : ''}`, ADVERT_DRAFT_TITLE_MAX);
  const parts = [
    `${business} is a ${role || 'business'} in ${industry || 'Kenya'}${place ? `, based in ${place}` : ''}.`,
  ];
  if (subject) parts.push(`We offer ${subject.replace(/[.!]+$/, '')}.`);
  if (notes) parts.push(/[.!?]$/.test(notes) ? notes : `${notes}.`);
  parts.push('Call or WhatsApp us using the contacts on this listing.');
  return { title, description: clean(parts.join(' '), ADVERT_DRAFT_DESCRIPTION_MAX) };
}

export function advertDraftPrompt(input: AdvertCopyInput): string {
  return [
    'You write short, clear advert copy for a business directory in Kenya.',
    'Rules:',
    '- Return ONLY strict JSON: {"title": string, "description": string}. No markdown, no extra keys.',
    `- title: at most ${ADVERT_DRAFT_TITLE_MAX} characters, specific and scannable.`,
    `- description: 2 to 4 sentences, friendly and professional, at most ${ADVERT_DRAFT_DESCRIPTION_MAX} characters.`,
    '- Use ONLY the facts given. Never invent prices, discounts, certifications, awards, guarantees, delivery promises, health claims or contact details.',
    '- Do not include phone numbers, emails or links.',
    '',
    'Facts:',
    JSON.stringify({
      business: clean(input.businessName, 80),
      role: clean(input.roleLabel, 40),
      industry: clean(input.industryLabel, 80),
      place: clean(input.place, 80) || null,
      about: clean(input.title, ADVERT_DRAFT_TITLE_MAX) || null,
      notes: clean(input.notes, 400) || null,
    }),
    '',
    'A correct baseline (improve its wording, keep its facts):',
    JSON.stringify(templateAdvertDraft(input)),
  ].join('\n');
}

const contactPattern = /(\+?\d[\d\s-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/|www\.)/i;

/**
 * Parse the model's reply: first JSON object, both fields present, lengths
 * capped, no contact details, and cleared by the zero-tolerance safety core.
 * Returns null on anything else so the caller uses the template.
 */
export function parseAdvertDraft(text: string): AdvertCopy | null {
  if (!text) return null;
  let raw = text.trim();
  if (!raw.startsWith('{')) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    raw = raw.slice(start, end + 1);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const { title, description } = value as { title?: unknown; description?: unknown };
  if (typeof title !== 'string' || typeof description !== 'string') return null;
  const draft = {
    title: clean(title, ADVERT_DRAFT_TITLE_MAX),
    description: clean(description, ADVERT_DRAFT_DESCRIPTION_MAX),
  };
  if (draft.title.length < 3 || draft.description.length < 20) return null;
  if (contactPattern.test(`${draft.title} ${draft.description}`)) return null;
  if (!evaluateSafetyFields(draft).allowed) return null;
  return draft;
}

/** Calendar month key in Nairobi time, e.g. "2026-11". */
export function draftMonthKey(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return new Date(time + 3 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** How many AI drafts this business has used this month, from its audit log. */
export function aiAdvertDraftsUsed(
  records: ReadonlyArray<{ action: string; createdAt: string; metadata?: Record<string, unknown> }>,
  now: string = new Date().toISOString(),
): number {
  const month = draftMonthKey(now);
  return records.filter(
    (record) =>
      record.action === ADVERT_DRAFT_AUDIT_ACTION &&
      record.metadata?.usedModel === true &&
      draftMonthKey(record.createdAt) === month,
  ).length;
}
