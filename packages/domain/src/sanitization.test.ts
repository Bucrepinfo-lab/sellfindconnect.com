import { describe, expect, it } from 'vitest';

import {
  sanitizeEmailAddress,
  sanitizeHttpUrl,
  sanitizeInputFields,
  sanitizeText,
} from './sanitization';

describe('sanitization', () => {
  it('normalizes and trims plain text while removing hidden control characters', () => {
    expect(sanitizeText('  Fresh\u0000 produce\u202e supplier  ')).toBe('Fresh produce supplier');
  });

  it('preserves meaningful newlines when requested', () => {
    expect(sanitizeText('Line 1\r\n\r\n\r\nLine 2', { preserveNewlines: true })).toBe(
      'Line 1\n\nLine 2',
    );
  });

  it('normalizes email casing and spacing', () => {
    expect(sanitizeEmailAddress('  SALES@Example.CO.KE  ')).toBe('sales@example.co.ke');
  });

  it('accepts only http and https URLs without embedded credentials', () => {
    expect(sanitizeHttpUrl(' https://example.co.ke/path ')).toBe('https://example.co.ke/path');
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeHttpUrl('https://user:pass@example.co.ke')).toBeNull();
  });

  it('sanitizes nested input while leaving secrets untouched', () => {
    expect(
      sanitizeInputFields({
        displayName: '  Nairobi\u202e Produce  ',
        password: '  keep exact spacing  ',
        tags: [' fresh\u0000vegetables '],
      }),
    ).toEqual({
      displayName: 'Nairobi Produce',
      password: '  keep exact spacing  ',
      tags: ['fresh vegetables'],
    });
  });

  it('limits deeply nested payload traversal', () => {
    const input = {
      a: {
        b: {
          c: 'safe',
        },
      },
    };

    expect(sanitizeInputFields(input, { maxDepth: 2 })).toEqual({ a: { b: {} } });
  });
});
