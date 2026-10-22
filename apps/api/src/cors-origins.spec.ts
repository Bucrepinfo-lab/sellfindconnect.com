import { describe, expect, it } from 'vitest';

import { resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('pairs the apex and www Sell Find Connect hosts', () => {
    expect(resolveCorsOrigins('https://www.sellfindconnect.com')).toEqual(
      expect.arrayContaining(['https://www.sellfindconnect.com', 'https://sellfindconnect.com']),
    );
    expect(resolveCorsOrigins('https://sellfindconnect.com')).toEqual(
      expect.arrayContaining(['https://sellfindconnect.com', 'https://www.sellfindconnect.com']),
    );
  });

  it('keeps local development origins unchanged', () => {
    expect(resolveCorsOrigins('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('merges comma-separated extra origins', () => {
    expect(resolveCorsOrigins('http://localhost:3000', 'https://preview.example.com,')).toEqual([
      'http://localhost:3000',
      'https://preview.example.com',
    ]);
  });
});
