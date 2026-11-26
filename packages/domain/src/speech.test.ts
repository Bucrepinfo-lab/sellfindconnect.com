import { describe, expect, it } from 'vitest';

import { appendSpoken, isAppLanguage, speechLanguageFor, speechLanguages, speechWord, speechWords } from './speech';

describe('speak instead of type', () => {
  it('offers only languages a phone can write down', () => {
    expect(speechLanguages.map((l) => l.id)).toEqual(['sw-KE', 'en-KE']);
    expect(speechLanguageFor('sw')).toBe('sw-KE');
    expect(speechLanguageFor(undefined)).toBe('en-KE');
    expect(isAppLanguage('sw')).toBe(true);
    expect(isAppLanguage('ki')).toBe(false);
    expect(speechWords.gap.en).toMatch(/Kikuyu/);
  });

  it('has every screen word in English and Kiswahili', () => {
    for (const [key, words] of Object.entries(speechWords)) {
      expect(words.en.trim(), key).not.toBe('');
      expect(words.sw.trim(), key).not.toBe('');
      expect(words.sw, key).not.toBe(words.en);
    }
    expect(speechWord('sw', 'tap')).toBe('Bonyeza uongee');
    expect(speechWord(null, 'tap')).toBe('Tap and speak');
  });

  it('adds spoken words to the box and respects its limit', () => {
    expect(appendSpoken('', '  fresh   tomatoes ', 100)).toBe('fresh tomatoes');
    expect(appendSpoken('Fresh tomatoes.\n', 'twenty crates a week', 100)).toBe('Fresh tomatoes. twenty crates a week');
    expect(appendSpoken('abc', '   ', 100)).toBe('abc');
    expect(appendSpoken('abcdef', 'ghij', 8)).toBe('abcdef g');
  });
});
