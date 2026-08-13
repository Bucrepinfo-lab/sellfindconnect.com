import { describe, expect, it } from 'vitest';

import { isE164, toE164 } from './phone';

describe('toE164', () => {
  it('normalizes common Kenyan formats to E.164', () => {
    expect(toE164('0712345678')).toBe('+254712345678');
    expect(toE164('712345678')).toBe('+254712345678');
    expect(toE164('254712345678')).toBe('+254712345678');
    expect(toE164('+254 712 345 678')).toBe('+254712345678');
    expect(toE164('00254712345678')).toBe('+254712345678');
  });

  it('returns null for invalid input', () => {
    expect(toE164('')).toBeNull();
    expect(toE164('abc')).toBeNull();
    expect(toE164('123')).toBeNull();
  });
});

describe('isE164', () => {
  it('validates E.164', () => {
    expect(isE164('+254712345678')).toBe(true);
    expect(isE164('0712345678')).toBe(false);
  });
});
