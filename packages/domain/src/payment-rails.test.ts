import { describe, expect, it } from 'vitest';

import { PADDLE_BLOCKED_COUNTRIES, paddleSellsIn, subscriptionRail, subscriptionRails } from './payment-rails';

describe('payment rails by country (owner rules 19/11/26)', () => {
  it('Kenya: M-Pesa leads, Paddle second for card payers', () => {
    expect(subscriptionRails({ country: 'KE', paddleOn: true })).toEqual(['MPESA', 'PADDLE']);
    expect(subscriptionRail({ country: 'KE', paddleOn: true })).toBe('MPESA');
    expect(subscriptionRails({ country: 'KE', paddleOn: false })).toEqual(['MPESA']);
  });

  it('Paddle leads where no local method can be charged', () => {
    expect(subscriptionRails({ country: 'ng', paddleOn: true })).toEqual(['PADDLE']);
    expect(subscriptionRail({ country: 'US', paddleOn: true })).toBe('PADDLE');
  });

  it('no way to pay yet where Paddle is blocked and no local method is available', () => {
    expect(subscriptionRail({ country: 'SO', paddleOn: true })).toBe('NONE');
    expect(subscriptionRail({ country: 'UG', paddleOn: false })).toBe('NONE');
    expect(subscriptionRails({ country: '', paddleOn: true })).toEqual([]);
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
