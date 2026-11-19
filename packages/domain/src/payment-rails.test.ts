import { describe, expect, it } from 'vitest';

import { PADDLE_BLOCKED_COUNTRIES, paddleSellsIn, subscriptionRail } from './payment-rails';

describe('payment rail by country (owner rule 19/11/26)', () => {
  it('Paddle first wherever it sells, Kenya included', () => {
    expect(subscriptionRail({ country: 'KE', paddleOn: true })).toBe('PADDLE');
    expect(subscriptionRail({ country: 'ng', paddleOn: true })).toBe('PADDLE');
    expect(subscriptionRail({ country: 'US', paddleOn: true })).toBe('PADDLE');
  });

  it('M-Pesa in Kenya while Paddle is off', () => {
    expect(subscriptionRail({ country: 'KE', paddleOn: false })).toBe('MPESA');
  });

  it('no rail where Paddle is blocked and M-Pesa is not available', () => {
    expect(subscriptionRail({ country: 'SO', paddleOn: true })).toBe('NONE');
    expect(subscriptionRail({ country: 'ZW', paddleOn: true })).toBe('NONE');
    expect(subscriptionRail({ country: 'UG', paddleOn: false })).toBe('NONE');
    expect(subscriptionRail({ country: '', paddleOn: true })).toBe('NONE');
  });

  it('carries Paddle\'s blocked list, African countries included', () => {
    for (const code of ['CF', 'CD', 'LY', 'ML', 'SO', 'SS', 'SD', 'ZW']) {
      expect(PADDLE_BLOCKED_COUNTRIES.has(code)).toBe(true);
      expect(paddleSellsIn(code)).toBe(false);
    }
    expect(paddleSellsIn('KE')).toBe(true);
    expect(paddleSellsIn(null)).toBe(false);
  });
});
