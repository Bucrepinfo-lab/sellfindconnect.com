import { describe, expect, it } from 'vitest';

import { SanitizeInputPipe } from './sanitize-input.pipe';

describe('SanitizeInputPipe', () => {
  const pipe = new SanitizeInputPipe();

  it('sanitizes request body strings before validation', () => {
    expect(
      pipe.transform(
        {
          displayName: '  Nairobi\u0000 Produce\u202e  ',
          password: '  do not trim me  ',
        },
        { type: 'body' },
      ),
    ).toEqual({
      displayName: 'Nairobi Produce',
      password: '  do not trim me  ',
    });
  });

  it('leaves non-body values untouched', () => {
    const value = { tenantId: '  tenant  ' };

    expect(pipe.transform(value, { type: 'param' })).toBe(value);
  });
});
