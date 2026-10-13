import { describe, expect, it } from 'vitest';

import {
  templateMatchExplanation,
  matchExplanationPrompt,
  parseMatchExplanation,
  MATCH_EXPLANATION_MAX_CHARS,
  type MatchExplanationInput,
} from './match-explanation';

const base: MatchExplanationInput = {
  query: 'who packages avocados for export in Kenya',
  name: 'Rift Valley Pack House',
  role: 'PROCESSOR',
  location: 'Nakuru, Kenya',
  offers: ['Avocado packing', 'Cold storage', 'Export documentation'],
  verified: true,
  reasonCodes: ['OFFER_MATCH', 'COUNTRY_MATCH', 'VERIFIED_PROFILE'],
  reasons: [
    'Offers avocado packing which matches the search.',
    'Located in the searched country (Kenya).',
    'Verified profile.',
  ],
};

describe('templateMatchExplanation', () => {
  it('joins the matcher reasons into a readable line with the name', () => {
    const out = templateMatchExplanation(base);
    expect(out.startsWith('Rift Valley Pack House matched because:')).toBe(true);
    expect(out).toContain('avocado packing');
    expect(out).toContain('Verified profile.');
  });

  it('falls back to bare facts when no reasons are supplied', () => {
    const out = templateMatchExplanation({ ...base, reasons: [] });
    expect(out).toContain('processor in Nakuru, Kenya');
    expect(out).toContain('Avocado packing');
    expect(out).toContain('Verified profile.');
  });

  it('respects the character cap', () => {
    const out = templateMatchExplanation({
      ...base,
      reasons: ['x'.repeat(1000)],
    });
    expect(out.length).toBeLessThanOrEqual(MATCH_EXPLANATION_MAX_CHARS);
  });
});

describe('matchExplanationPrompt', () => {
  it('carries the query, facts, forbids invention, and seeds with the template', () => {
    const p = matchExplanationPrompt(base);
    expect(p).toContain('Never invent');
    expect(p).toContain(JSON.stringify(base.query));
    expect(p).toContain('Rift Valley Pack House');
    expect(p).toContain(templateMatchExplanation(base));
  });
});

describe('parseMatchExplanation', () => {
  it('cleans and returns a safe line', () => {
    expect(parseMatchExplanation('  "A good match for your avocado search."  ')).toBe(
      'A good match for your avocado search.',
    );
  });

  it('returns null on empty input', () => {
    expect(parseMatchExplanation('')).toBeNull();
    expect(parseMatchExplanation('   ')).toBeNull();
  });

  it('clamps overlong output', () => {
    const out = parseMatchExplanation('y'.repeat(1000));
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(MATCH_EXPLANATION_MAX_CHARS);
  });
});
