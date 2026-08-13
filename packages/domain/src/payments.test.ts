import { describe, expect, it } from 'vitest';

import {
  canTransitionPayment,
  isTerminalPayment,
  isValidPaymentAmount,
  mapAtPaymentStatus,
} from './payments';

describe('payment FSM', () => {
  it('allows only legal transitions', () => {
    expect(canTransitionPayment('REQUESTED', 'PENDING')).toBe(true);
    expect(canTransitionPayment('PENDING', 'SUCCESS')).toBe(true);
    expect(canTransitionPayment('REQUESTED', 'SUCCESS')).toBe(false);
    expect(canTransitionPayment('SUCCESS', 'FAILED')).toBe(false);
  });

  it('knows terminal states', () => {
    expect(isTerminalPayment('SUCCESS')).toBe(true);
    expect(isTerminalPayment('PENDING')).toBe(false);
  });
});

describe('isValidPaymentAmount', () => {
  it('requires whole KES within bounds', () => {
    expect(isValidPaymentAmount(1)).toBe(true);
    expect(isValidPaymentAmount(0)).toBe(false);
    expect(isValidPaymentAmount(10.5)).toBe(false);
    expect(isValidPaymentAmount(10_000_000)).toBe(false);
  });
});

describe('mapAtPaymentStatus', () => {
  it('maps AT statuses', () => {
    expect(mapAtPaymentStatus('Success')).toBe('SUCCESS');
    expect(mapAtPaymentStatus('Failed')).toBe('FAILED');
    expect(mapAtPaymentStatus('PendingConfirmation')).toBe('PENDING');
  });
});
