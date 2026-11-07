import { describe, expect, it } from 'vitest';

import { isSameAdvertText, uniqueAdvertDrafts } from './advert-drafts';

const text = { title: 'Fresh vegetables', description: 'Weekly supply to hotels and shops in Nairobi.' };

describe('uniqueAdvertDrafts', () => {
  it('shows the same advert draft only once, keeping the newest', () => {
    const drafts = [
      { id: 'a', ...text, updatedAt: '2026-11-01T08:00:00.000Z' },
      { id: 'b', ...text, title: 'Copy of Fresh vegetables', updatedAt: '2026-11-03T08:00:00.000Z' },
      { id: 'c', ...text, updatedAt: '2026-11-02T08:00:00.000Z' },
      { id: 'd', title: 'Cold room hire', description: 'Cold rooms by the week in Nairobi.', updatedAt: '2026-11-01T09:00:00.000Z' },
    ];

    expect(uniqueAdvertDrafts(drafts).map((draft) => draft.id)).toEqual(['b', 'd']);
  });

  it('drops a repeated id', () => {
    const draft = { id: 'a', ...text, updatedAt: '2026-11-01T08:00:00.000Z' };
    expect(uniqueAdvertDrafts([draft, draft])).toHaveLength(1);
  });

  it('keeps drafts whose text differs', () => {
    const drafts = [
      { id: 'a', ...text, updatedAt: '2026-11-01T08:00:00.000Z' },
      { id: 'b', ...text, description: 'Daily supply to hotels and shops in Nairobi.', updatedAt: '2026-11-01T08:00:00.000Z' },
    ];
    expect(uniqueAdvertDrafts(drafts)).toHaveLength(2);
  });
});

describe('isSameAdvertText', () => {
  it('ignores the "Copy of " prefix and surrounding spaces', () => {
    expect(isSameAdvertText(text, { title: 'Copy of Fresh vegetables ', description: ` ${text.description}` })).toBe(true);
    expect(isSameAdvertText(text, { ...text, title: 'Fresh fruit' })).toBe(false);
  });
});
