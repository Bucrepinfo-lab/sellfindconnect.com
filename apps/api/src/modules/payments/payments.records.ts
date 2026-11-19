import type { PaymentStatus } from '@telpen/domain';

/** CARD = a Paddle card sale (Paddle is the merchant of record). */
export type PaymentKind = 'CHECKOUT' | 'B2C' | 'C2B' | 'CARD';

export type PaymentTxnRecord = {
  id: string;
  provider: string;
  kind: PaymentKind;
  status: PaymentStatus;
  providerTxnId?: string;
  phone: string;
  amount: number;
  currency: string;
  reason?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, string>;
  rawCallback?: unknown;
  createdAt: string;
  updatedAt: string;
};
