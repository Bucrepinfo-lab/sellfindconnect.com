import type { PaymentTxnRecord } from './payments.records';

export const PAYMENTS_REPOSITORY = Symbol('PAYMENTS_REPOSITORY');

type RepositoryResult<T> = T | Promise<T>;

export interface PaymentsRepository {
  createPaymentTxn(txn: PaymentTxnRecord): RepositoryResult<void>;
  updatePaymentTxn(txn: PaymentTxnRecord): RepositoryResult<void>;
  findPaymentTxnById(id: string): RepositoryResult<PaymentTxnRecord | undefined>;
  findPaymentTxnByProviderTxnId(providerTxnId: string): RepositoryResult<PaymentTxnRecord | undefined>;
}
