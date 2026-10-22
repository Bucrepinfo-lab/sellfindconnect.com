import { Injectable } from '@nestjs/common';

import type { PaymentTxnRecord } from './payments.records';
import type { PaymentsRepository } from './payments.repository';

@Injectable()
export class InMemoryPaymentsRepository implements PaymentsRepository {
  private readonly byId = new Map<string, PaymentTxnRecord>();

  createPaymentTxn(txn: PaymentTxnRecord): void {
    this.byId.set(txn.id, txn);
  }

  updatePaymentTxn(txn: PaymentTxnRecord): void {
    this.byId.set(txn.id, txn);
  }

  findPaymentTxnById(id: string): PaymentTxnRecord | undefined {
    return this.byId.get(id);
  }

  findPaymentTxnByProviderTxnId(providerTxnId: string): PaymentTxnRecord | undefined {
    return Array.from(this.byId.values()).find((txn) => txn.providerTxnId === providerTxnId);
  }
}
