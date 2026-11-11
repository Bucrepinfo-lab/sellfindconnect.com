import { describe, expect, it } from 'vitest';

import {
  ADVERT_DRAFT_AUDIT_ACTION,
  advertDraftPrompt,
  aiAdvertDraftsUsed,
  draftMonthKey,
  parseAdvertDraft,
  templateAdvertDraft,
} from './advert-description-draft';

const input = {
  title: 'Fresh sukuma wiki and cabbages',
  notes: 'Daily harvest, sold by the crate',
  businessName: 'Kamau Farm Fresh',
  roleLabel: 'Producer',
  industryLabel: 'Agriculture',
  place: 'Kiambu',
};

describe('templateAdvertDraft', () => {
  it('writes factual copy from the details only', () => {
    const draft = templateAdvertDraft(input);
    expect(draft.title).toBe('Fresh sukuma wiki and cabbages');
    expect(draft.description).toContain('Kamau Farm Fresh is a producer in agriculture, based in Kiambu.');
    expect(draft.description).toContain('Daily harvest, sold by the crate.');
    expect(draft.description.length).toBeGreaterThanOrEqual(20);
  });

  it('still works with almost nothing given', () => {
    const draft = templateAdvertDraft({ businessName: '', roleLabel: '', industryLabel: '' });
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.description.length).toBeGreaterThanOrEqual(20);
  });
});

describe('advertDraftPrompt', () => {
  it('forbids invented claims and contact details and includes the facts', () => {
    const prompt = advertDraftPrompt(input);
    expect(prompt).toContain('Never invent prices');
    expect(prompt).toContain('Do not include phone numbers');
    expect(prompt).toContain('Kamau Farm Fresh');
  });
});

describe('parseAdvertDraft', () => {
  it('accepts clean JSON, even wrapped in prose', () => {
    expect(
      parseAdvertDraft('Here: {"title":"Fresh sukuma wiki","description":"Crisp greens harvested daily in Kiambu for shops and hotels."}'),
    ).toEqual({ title: 'Fresh sukuma wiki', description: 'Crisp greens harvested daily in Kiambu for shops and hotels.' });
  });

  it('refuses broken shapes, contact details and blocked content', () => {
    expect(parseAdvertDraft('not json')).toBeNull();
    expect(parseAdvertDraft('{"title":"x"}')).toBeNull();
    expect(parseAdvertDraft('{"title":"Greens","description":"Call 0712 345 678 for fresh greens daily."}')).toBeNull();
    expect(parseAdvertDraft('{"title":"Greens","description":"Order at www.example.com for fresh greens."}')).toBeNull();
    expect(parseAdvertDraft('{"title":"Greens","description":"We also sell ammunition with every crate."}')).toBeNull();
  });
});

describe('monthly AI draft count', () => {
  it('counts only AI drafts in the current Nairobi month', () => {
    const now = '2026-11-11T16:00:00.000Z';
    const records = [
      { action: ADVERT_DRAFT_AUDIT_ACTION, createdAt: '2026-11-02T08:00:00.000Z', metadata: { usedModel: true } },
      { action: ADVERT_DRAFT_AUDIT_ACTION, createdAt: '2026-11-03T08:00:00.000Z', metadata: { usedModel: false } },
      { action: ADVERT_DRAFT_AUDIT_ACTION, createdAt: '2026-10-31T22:30:00.000Z', metadata: { usedModel: true } },
      { action: ADVERT_DRAFT_AUDIT_ACTION, createdAt: '2026-10-31T20:00:00.000Z', metadata: { usedModel: true } },
      { action: 'ADVERT_PUBLISHED', createdAt: '2026-11-04T08:00:00.000Z', metadata: { usedModel: true } },
    ];
    // 31/10 22:30 UTC is already 01/11 in Nairobi, so it counts.
    expect(aiAdvertDraftsUsed(records, now)).toBe(2);
    expect(draftMonthKey('2026-10-31T22:30:00.000Z')).toBe('2026-11');
  });
});
