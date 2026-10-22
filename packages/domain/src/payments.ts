/**
 * Payments — PURE & UNIT-TESTABLE. Status FSM, amount validation and provider
 * status mapping shared by the API payment service and the Africa's Talking
 * callback reconciliation. (No I/O.)
 */
export const PAYMENT_STATUSES = ['REQUESTED', 'PENDING', 'SUCCESS', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const NEXT: Record<PaymentStatus, PaymentStatus[]> = {
  REQUESTED: ['PENDING', 'FAILED'],
  PENDING: ['SUCCESS', 'FAILED'],
  SUCCESS: [],
  FAILED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

export function isTerminalPayment(status: PaymentStatus): boolean {
  return status === 'SUCCESS' || status === 'FAILED';
}

/** Whole KES units (no cents), at least 1, within a sane ceiling. */
export function isValidPaymentAmount(
  amount: number,
  options: { min?: number; max?: number } = {},
): boolean {
  const min = options.min ?? 1;
  const max = options.max ?? 999_999;
  return Number.isFinite(amount) && Number.isInteger(amount) && amount >= min && amount <= max;
}

/** Map an Africa's Talking payment status string to our ledger status. */
export function mapAtPaymentStatus(atStatus: string): PaymentStatus {
  const value = atStatus.trim().toLowerCase();
  if (value === 'success') return 'SUCCESS';
  if (value === 'failed') return 'FAILED';
  return 'PENDING';
}
