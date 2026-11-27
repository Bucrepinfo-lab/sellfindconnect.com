import { describe, expect, it } from 'vitest';

import { cleanPersonName, contactEmail, hideEmail, phoneChangeProblem } from './my-profile';

describe('my profile rules', () => {
  it('accepts real names and tidies spaces', () => {
    expect(cleanPersonName('  Amina   Wanjiru ')).toEqual({ ok: true, name: 'Amina Wanjiru' });
    expect(cleanPersonName("Ng'ang'a Otieno-Okello").ok).toBe(true);
  });

  it('refuses numbers, signs, websites and names that are too short or long', () => {
    for (const bad of ['A', '0712345678', 'Buy at shop.com', 'Amina <b>', 'x'.repeat(81), '']) {
      expect(cleanPersonName(bad).ok, bad).toBe(false);
    }
    expect(cleanPersonName(null).ok).toBe(false);
  });

  it('a new number must be given and differ from the current one', () => {
    expect(phoneChangeProblem('+254712345678', '+254722000111')).toBeNull();
    expect(phoneChangeProblem('+254712345678', '+254712345678')).toMatch(/already/);
    expect(phoneChangeProblem('+254712345678', null)).toMatch(/full new phone number/);
  });
});

describe('my email (owner 27/11/26)', () => {
  it('is optional, lower-cased, and an empty box removes it', () => {
    expect(contactEmail(' Amina@Gmail.com ')).toEqual({ ok: true, email: 'amina@gmail.com' });
    expect(contactEmail('')).toEqual({ ok: true, email: null });
    expect(contactEmail('amina').ok).toBe(false);
    expect(contactEmail('2547@phone.sellfindconnect.invalid').ok).toBe(false);
  });
  it('is hidden on screen until Show', () => {
    expect(hideEmail('amina@gmail.com')).toBe('am•••@gmail.com');
    expect(hideEmail(undefined)).toBe('—');
  });
});
