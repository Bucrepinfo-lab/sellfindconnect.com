import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { isValidPaymentAmount, mapAtPaymentStatus } from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AUTH_REPOSITORY, type AuthRepository } from '../auth/auth.repository';
import { AuthService } from '../auth/auth.service';
import {
  AT_PAYMENTS,
  AfricasTalkingPaymentsProvider,
  type AtPaymentsProvider,
} from './africastalking-payments';
import { InMemoryPaymentsRepository } from './in-memory-payments.repository';
import type { PaymentTxnRecord } from './payments.records';
import { PAYMENTS_REPOSITORY, type PaymentsRepository } from './payments.repository';
import type { CheckoutDto, PayoutDto } from './dto/payments.dto';

export type CheckoutResult =
  | { ok: true; txnId: string; providerTxnId: string | null }
  | { ok: false; reason: 'no_phone' | 'invalid_amount' | 'provider_error'; txnId?: string };

export type PayoutResult =
  | { ok: true; txnId: string }
  | {
      ok: false;
      reason: 'forbidden' | 'invalid_amount' | 'no_phone' | 'provider_error';
      txnId?: string;
    };

/**
 * Payment service — the API's entry point to M-Pesa/mobile money via Africa's
 * Talking. Every request is recorded to the `PaymentTxn` ledger and later
 * reconciled by /payments/at/callback.
 *
 * MONEY-BLOCK: only these explicit, session-authorised functions move money. No
 * agent imports this (Finance is advisory/read-only).
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly auth: AuthService,
    @Optional()
    @Inject(PAYMENTS_REPOSITORY)
    private readonly repository: PaymentsRepository = new InMemoryPaymentsRepository(),
    @Optional()
    @Inject(AT_PAYMENTS)
    private readonly provider: AtPaymentsProvider = new AfricasTalkingPaymentsProvider(),
    @Optional()
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository?: AuthRepository,
  ) {}

  /** STK push to the signed-in user's OWN phone (their login number = payer). */
  async requestCheckout(sessionToken: string, input: CheckoutDto): Promise<CheckoutResult> {
    const context = await this.auth.getSession(sessionToken); // throws 401 if invalid
    const phone = context.user?.phone;
    if (!phone) {
      return { ok: false, reason: 'no_phone' };
    }
    if (!isValidPaymentAmount(input.amount)) {
      return { ok: false, reason: 'invalid_amount' };
    }

    const txn = this.newTxn({
      kind: 'CHECKOUT',
      phone,
      amount: input.amount,
      reason: input.reason,
      userId: context.session.userId,
      tenantId: context.session.tenantId,
    });
    await this.repository.createPaymentTxn(txn);

    const result = await this.provider.mobileCheckout({
      phoneNumber: phone,
      amount: input.amount,
      metadata: { ledgerId: txn.id },
    });

    await this.repository.updatePaymentTxn({
      ...txn,
      status: result.ok ? 'PENDING' : 'FAILED',
      providerTxnId: result.transactionId ?? undefined,
      rawCallback: result.raw,
      updatedAt: new Date().toISOString(),
    });

    return result.ok
      ? { ok: true, txnId: txn.id, providerTxnId: result.transactionId }
      : { ok: false, reason: 'provider_error', txnId: txn.id };
  }

  /** B2C payout to a user's phone — OWNER only (refunds, disbursements). */
  async requestPayout(sessionToken: string, input: PayoutDto): Promise<PayoutResult> {
    const context = await this.auth.getSession(sessionToken);
    if (context.session.role !== 'OWNER') {
      return { ok: false, reason: 'forbidden' };
    }
    if (!isValidPaymentAmount(input.amount)) {
      return { ok: false, reason: 'invalid_amount' };
    }

    const recipient = await this.authRepository?.findUserById(input.toUserId);
    if (!recipient?.phone) {
      return { ok: false, reason: 'no_phone' };
    }

    const txn = this.newTxn({
      kind: 'B2C',
      phone: recipient.phone,
      amount: input.amount,
      reason: input.reason,
      userId: recipient.id,
      tenantId: context.session.tenantId,
    });
    await this.repository.createPaymentTxn(txn);

    const result = await this.provider.mobileB2C([
      { phoneNumber: recipient.phone, amount: input.amount, reason: 'BusinessPayment', metadata: { ledgerId: txn.id } },
    ]);

    await this.repository.updatePaymentTxn({
      ...txn,
      status: result.ok ? 'PENDING' : 'FAILED',
      rawCallback: result.raw,
      updatedAt: new Date().toISOString(),
    });

    return result.ok ? { ok: true, txnId: txn.id } : { ok: false, reason: 'provider_error', txnId: txn.id };
  }

  /**
   * Africa's Talking async result callback. Token-verified; reconciles the ledger
   * row by AT transactionId. Only records results — never initiates a payment.
   */
  async reconcileCallback(
    token: string | undefined,
    body: { transactionId?: string; status?: string },
  ): Promise<{ status: 'Success' } | { error: string }> {
    const expected = process.env.AT_PAYMENTS_CALLBACK_SECRET;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('unauthorized');
    }
    if (!body.transactionId) {
      return { error: 'missing transactionId' };
    }

    const txn = await this.repository.findPaymentTxnByProviderTxnId(body.transactionId);
    if (txn) {
      await this.repository.updatePaymentTxn({
        ...txn,
        status: mapAtPaymentStatus(body.status ?? ''),
        rawCallback: body,
        updatedAt: new Date().toISOString(),
      });
    }

    return { status: 'Success' };
  }

  private newTxn(input: {
    kind: PaymentTxnRecord['kind'];
    phone: string;
    amount: number;
    reason?: string;
    userId?: string;
    tenantId?: string;
  }): PaymentTxnRecord {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      provider: 'africastalking',
      kind: input.kind,
      status: 'REQUESTED',
      phone: input.phone,
      amount: input.amount,
      currency: 'KES',
      reason: input.reason,
      userId: input.userId,
      tenantId: input.tenantId,
      createdAt: now,
      updatedAt: now,
    };
  }
}
