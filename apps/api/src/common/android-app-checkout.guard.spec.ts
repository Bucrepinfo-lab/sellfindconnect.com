import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AndroidAppCheckoutGuard } from './android-app-checkout.guard';

function contextFor(headers: Record<string, string>, body: unknown = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, body }),
    }),
  } as unknown as ExecutionContext;
}

describe('AndroidAppCheckoutGuard', () => {
  const guard = new AndroidAppCheckoutGuard();

  it('lets web checkout through', () => {
    expect(guard.canActivate(contextFor({}, { amount: 1500 }))).toBe(true);
    expect(guard.canActivate(contextFor({ 'x-sfc-client': 'web' }, { method: 'CARD' }))).toBe(true);
  });

  it('blocks STK / card / mobile-money checkout from the Android app', () => {
    expect(() => guard.canActivate(contextFor({ 'x-sfc-client': 'android-twa' }, { amount: 1500 }))).toThrow(
      ForbiddenException,
    );
    for (const method of ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER']) {
      expect(() =>
        guard.canActivate(contextFor({ 'x-sfc-client': 'android-twa' }, { invoiceId: 'inv-12345678', method })),
      ).toThrow(ForbiddenException);
    }
  });

  it('allows Play Billing (WALLET) from the Android app', () => {
    expect(
      guard.canActivate(contextFor({ 'x-sfc-client': 'android-twa' }, { invoiceId: 'inv-12345678', method: 'WALLET' })),
    ).toBe(true);
  });
});
