import type { PaymentStatus } from '@telpen/domain';
import type { PaymentTxn, PrismaClient } from '@prisma/client';

import { createAuthPrismaClient } from '../auth/prisma-auth.repository';
import type { PaymentKind, PaymentTxnRecord } from './payments.records';
import type { PaymentsRepository } from './payments.repository';

export { createAuthPrismaClient as createPaymentsPrismaClient };

export class PrismaPaymentsRepository implements PaymentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPaymentTxn(txn: PaymentTxnRecord): Promise<void> {
    await this.prisma.paymentTxn.create({
      data: {
        id: txn.id,
        provider: txn.provider,
        kind: txn.kind,
        status: txn.status,
        providerTxnId: txn.providerTxnId ?? undefined,
        phone: txn.phone,
        amount: txn.amount,
        currency: txn.currency,
        reason: txn.reason ?? undefined,
        userId: txn.userId ?? undefined,
        tenantId: txn.tenantId ?? undefined,
        metadata: (txn.metadata ?? undefined) as object | undefined,
        rawCallback: (txn.rawCallback ?? undefined) as object | undefined,
        createdAt: new Date(txn.createdAt),
        updatedAt: new Date(txn.updatedAt),
      },
    });
  }

  async updatePaymentTxn(txn: PaymentTxnRecord): Promise<void> {
    await this.prisma.paymentTxn.update({
      where: { id: txn.id },
      data: {
        status: txn.status,
        providerTxnId: txn.providerTxnId ?? undefined,
        rawCallback: (txn.rawCallback ?? undefined) as object | undefined,
        updatedAt: new Date(txn.updatedAt),
      },
    });
  }

  async findPaymentTxnById(id: string): Promise<PaymentTxnRecord | undefined> {
    const txn = await this.prisma.paymentTxn.findUnique({ where: { id } });
    return txn ? this.map(txn) : undefined;
  }

  async findPaymentTxnByProviderTxnId(providerTxnId: string): Promise<PaymentTxnRecord | undefined> {
    const txn = await this.prisma.paymentTxn.findFirst({ where: { providerTxnId } });
    return txn ? this.map(txn) : undefined;
  }

  private map(txn: PaymentTxn): PaymentTxnRecord {
    return {
      id: txn.id,
      provider: txn.provider,
      kind: txn.kind as PaymentKind,
      status: txn.status as PaymentStatus,
      providerTxnId: txn.providerTxnId ?? undefined,
      phone: txn.phone,
      amount: Number(txn.amount),
      currency: txn.currency,
      reason: txn.reason ?? undefined,
      userId: txn.userId ?? undefined,
      tenantId: txn.tenantId ?? undefined,
      metadata: (txn.metadata ?? undefined) as Record<string, string> | undefined,
      rawCallback: txn.rawCallback ?? undefined,
      createdAt: txn.createdAt.toISOString(),
      updatedAt: txn.updatedAt.toISOString(),
    };
  }
}
