import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import {
  PLAN_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  isValidPaymentAmount,
  mapAtPaymentStatus,
  mpesaSaleNeedsApprovedTaxProfile,
  normalizePlan,
  paddleConfig,
  paddlePublicConfig,
  paidPlanFromPaddleEvent,
  quoteSubscription,
  verifyPaddleSignature,
  type PaddlePublicConfig,
  type BillingPeriod,
  type PlanQuote,
  type SubscriptionPlan,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AUTH_REPOSITORY, type AuthRepository } from '../auth/auth.repository';
import { AuthService } from '../auth/auth.service';
import { FinanceService } from '../finance/finance.service';
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
  | {
      ok: false;
      reason: 'no_phone' | 'invalid_amount' | 'no_price' | 'provider_error' | 'tax_profile' | 'terms';
      txnId?: string;
    };

type SessionTenant = { countryCode: string; trialStartedAt: string; status: string; plan?: string } | undefined;

export type SubscriptionOption = {
  plan: SubscriptionPlan;
  name: string;
  summary: string;
  maxMediaPerListing: number;
  monthly: number;
  yearly: number;
  locked: boolean;
};

export type SubscriptionOptions = {
  currentPlan: SubscriptionPlan;
  currencyCode: string | null;
  /** False when this country has no approved M-Pesa price (KES). */
  payable: boolean;
  plans: SubscriptionOption[];
  /** Paddle card checkout (Paddle is the seller and remits the tax), or null when off. */
  card: (PaddlePublicConfig & { customData: { tenantId: string } }) | null;
};

export type PaddleWebhookResult =
  | { ok: true; applied?: boolean; ignored?: boolean; duplicate?: boolean }
  | { ok: false; status: 401 | 404 | 400; error: string };

export type PayoutResult =
  | { ok: true; txnId: string }
  | {
      ok: false;
      reason: 'forbidden' | 'invalid_amount' | 'no_phone' | 'provider_error' | 'terms';
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
    @Optional()
    private readonly finance?: FinanceService,
  ) {}

  /**
   * STK push to the signed-in user's OWN phone. The login number is the payer;
   * CheckoutDto has no phone field and a different number must never be accepted.
   */
  async requestCheckout(sessionToken: string, input: CheckoutDto): Promise<CheckoutResult> {
    const context = await this.auth.getSession(sessionToken); // throws 401 if invalid
    // Only an OTP-verified login phone is a payer; an unverified profile phone never gets STK.
    const phone = context.user?.phoneVerifiedAt ? context.user.phone?.trim() : undefined;
    if (!phone) {
      return { ok: false, reason: 'no_phone' };
    }
    // A subscription checkout is priced by the server from the price list; the
    // client's amount is ignored. Other checkouts keep the client amount.
    let amount = input.amount;
    let subscription: { plan: SubscriptionPlan; period: BillingPeriod } | undefined;
    if (input.plan) {
      const quote = this.payableQuote(context.tenant, input.plan, input.period ?? 'MONTH');
      if (!quote) {
        return { ok: false, reason: 'no_price' };
      }
      amount = quote.amount;
      subscription = { plan: quote.plan, period: quote.period };
    }
    if (amount === undefined || !isValidPaymentAmount(amount)) {
      return { ok: false, reason: 'invalid_amount' };
    }

    // Owner 19/11/26: an M-Pesa sale is a direct sale with no VAT while the
    // company is not VAT-registered; once registered it needs the APPROVED
    // Kenya tax profile (and files on iTax). Cards go through Paddle instead.
    const launch = mpesaSaleNeedsApprovedTaxProfile(process.env)
      ? await this.finance?.getPaidLaunchReadiness('KE')
      : { allowed: true };
    if (!launch?.allowed) {
      await this.auth.recordTenantAudit({
        tenantId: context.session.tenantId,
        actorUserId: context.session.userId,
        action: 'PAYMENT_CHECKOUT_BLOCKED',
        entityType: 'PAYMENT',
        entityId: context.session.tenantId,
        metadata: {
          kind: 'CHECKOUT',
          amount,
          currency: 'KES',
          ok: false,
          status: 'BLOCKED',
          reason: 'tax_profile',
        },
      });
      return { ok: false, reason: 'tax_profile' };
    }

    if (!(await this.auth.hasCurrentTermsAcceptance(context.session.userId, context.session.tenantId))) {
      await this.auth.recordTenantAudit({
        tenantId: context.session.tenantId,
        actorUserId: context.session.userId,
        action: 'PAYMENT_CHECKOUT_BLOCKED',
        entityType: 'PAYMENT',
        entityId: context.session.tenantId,
        metadata: {
          kind: 'CHECKOUT',
          amount,
          currency: 'KES',
          ok: false,
          status: 'BLOCKED',
          reason: 'terms',
        },
      });
      return { ok: false, reason: 'terms' };
    }

    const txn = this.newTxn({
      kind: 'CHECKOUT',
      phone,
      amount,
      reason:
        input.reason ??
        (subscription
          ? `${SUBSCRIPTION_PLANS[subscription.plan].name} plan, ${subscription.period === 'YEAR' ? 'a year' : 'a month'}`
          : undefined),
      userId: context.session.userId,
      tenantId: context.session.tenantId,
      metadata: subscription
        ? { purpose: 'SUBSCRIPTION', plan: subscription.plan, period: subscription.period }
        : undefined,
    });
    await this.repository.createPaymentTxn(txn);

    const result = await this.provider.mobileCheckout({
      phoneNumber: phone,
      amount,
      metadata: { ledgerId: txn.id },
    });

    await this.repository.updatePaymentTxn({
      ...txn,
      status: result.ok ? 'PENDING' : 'FAILED',
      providerTxnId: result.transactionId ?? undefined,
      rawCallback: result.raw,
      updatedAt: new Date().toISOString(),
    });

    await this.auth.recordTenantAudit({
      tenantId: context.session.tenantId,
      actorUserId: context.session.userId,
      action: 'PAYMENT_CHECKOUT_REQUESTED',
      entityType: 'PAYMENT',
      entityId: txn.id,
      metadata: {
        kind: 'CHECKOUT',
        amount,
        currency: 'KES',
        plan: subscription?.plan ?? null,
        period: subscription?.period ?? null,
        ok: result.ok,
        status: result.ok ? 'PENDING' : 'FAILED',
      },
    });

    return result.ok
      ? { ok: true, txnId: txn.id, providerTxnId: result.transactionId }
      : { ok: false, reason: 'provider_error', txnId: txn.id };
  }

  /**
   * The plans this tenant can pay for, priced from the price list (founding
   * price kept while subscribed), plus its current plan. Read-only.
   */
  async getSubscriptionOptions(sessionToken: string): Promise<SubscriptionOptions> {
    const context = await this.auth.getSession(sessionToken);
    const tenant = context.tenant as SessionTenant;
    const plans: SubscriptionOption[] = [];
    let currencyCode: string | null = null;
    for (const plan of ['BASIC', 'PRO'] as const) {
      const month = this.payableQuote(tenant, plan, 'MONTH');
      const year = this.payableQuote(tenant, plan, 'YEAR');
      if (!month || !year) continue;
      currencyCode = month.currencyCode;
      plans.push({
        plan,
        name: SUBSCRIPTION_PLANS[plan].name,
        summary: SUBSCRIPTION_PLANS[plan].summary,
        maxMediaPerListing: PLAN_ENTITLEMENTS[plan].maxMediaPerListing,
        monthly: month.amount,
        yearly: year.amount,
        locked: month.locked,
      });
    }
    const card = paddlePublicConfig(paddleConfig(process.env));
    return {
      currentPlan: normalizePlan(tenant?.plan),
      currencyCode,
      payable: plans.length > 0,
      plans,
      card: card ? { ...card, customData: { tenantId: context.session.tenantId } } : null,
    };
  }

  /**
   * Paddle notification. Records a plan the buyer already paid at Paddle's own
   * checkout; never starts a payment. Signature-checked; each Paddle
   * transaction is applied at most once (ledger row keyed by its id).
   */
  async handlePaddleWebhook(rawBody: string, signature: string | undefined): Promise<PaddleWebhookResult> {
    const cfg = paddleConfig(process.env);
    if (!cfg) return { ok: false, status: 404, error: 'not enabled' };
    if (!verifyPaddleSignature(rawBody, signature, cfg.webhookSecret)) {
      return { ok: false, status: 401, error: 'bad signature' };
    }
    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { ok: false, status: 400, error: 'bad json' };
    }
    const paid = paidPlanFromPaddleEvent(event, cfg.priceIds);
    if (!paid) return { ok: true, ignored: true };
    if (!(await this.auth.tenantExists(paid.tenantId))) return { ok: true, ignored: true };
    if (await this.repository.findPaymentTxnByProviderTxnId(paid.transactionId)) {
      return { ok: true, duplicate: true };
    }

    const now = new Date().toISOString();
    const txn: PaymentTxnRecord = {
      id: randomUUID(),
      provider: 'paddle',
      kind: 'CARD',
      status: 'SUCCESS',
      providerTxnId: paid.transactionId,
      phone: '',
      amount: paid.amount ?? 0,
      currency: paid.currency ?? 'USD',
      reason: `${SUBSCRIPTION_PLANS[paid.plan].name} plan, ${paid.period === 'YEAR' ? 'a year' : 'a month'} (card, Paddle)`,
      tenantId: paid.tenantId,
      metadata: { purpose: 'SUBSCRIPTION', plan: paid.plan, period: paid.period },
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.repository.createPaymentTxn(txn);
    } catch {
      // A concurrent delivery of the same transaction got there first.
      return { ok: true, duplicate: true };
    }
    await this.applySubscription(txn);
    return { ok: true, applied: true };
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
    if (!(await this.auth.hasCurrentTermsAcceptance(context.session.userId, context.session.tenantId))) {
      return { ok: false, reason: 'terms' };
    }
    if (!this.authRepository) {
      return { ok: false, reason: 'forbidden' };
    }
    const membership = await this.authRepository.findMembershipForUserAndTenant(
      input.toUserId,
      context.session.tenantId,
    );
    if (!membership) {
      return { ok: false, reason: 'forbidden' };
    }

    const recipient = await this.authRepository.findUserById(input.toUserId);
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

    await this.auth.recordTenantAudit({
      tenantId: context.session.tenantId,
      actorUserId: context.session.userId,
      action: 'PAYMENT_PAYOUT_REQUESTED',
      entityType: 'PAYMENT',
      entityId: txn.id,
      metadata: {
        kind: 'B2C',
        amount: input.amount,
        currency: 'KES',
        ok: result.ok,
        status: result.ok ? 'PENDING' : 'FAILED',
      },
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
      const status = mapAtPaymentStatus(body.status ?? '');
      await this.repository.updatePaymentTxn({
        ...txn,
        status,
        rawCallback: body,
        updatedAt: new Date().toISOString(),
      });
      // First confirmed success only: a repeated callback changes nothing.
      if (status === 'SUCCESS' && txn.status !== 'SUCCESS') {
        await this.applySubscription(txn);
      }
    }

    return { status: 'Success' };
  }

  /**
   * The plan comes from the ledger row written at checkout, never from the
   * callback body. Only a SUBSCRIPTION checkout changes a tenant's plan.
   */
  private async applySubscription(txn: PaymentTxnRecord): Promise<void> {
    if ((txn.kind !== 'CHECKOUT' && txn.kind !== 'CARD') || txn.metadata?.purpose !== 'SUBSCRIPTION' || !txn.tenantId) {
      return;
    }
    const plan = normalizePlan(txn.metadata.plan);
    await this.auth.setTenantPlan(txn.tenantId, plan);
    await this.auth.recordTenantAudit({
      tenantId: txn.tenantId,
      actorUserId: txn.userId,
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      entityType: 'TENANT',
      entityId: txn.tenantId,
      metadata: { plan, period: txn.metadata.period ?? 'MONTH', paymentId: txn.id, amount: txn.amount },
    });
  }

  /** A price for this tenant's country that can be charged by STK (whole KES), or undefined. */
  private payableQuote(tenant: SessionTenant, plan: SubscriptionPlan, period: BillingPeriod): PlanQuote | undefined {
    if (!tenant) return undefined;
    const quote = quoteSubscription({
      countryCode: tenant.countryCode,
      plan,
      period,
      startedAt: new Date(tenant.trialStartedAt),
      status: tenant.status,
      env: process.env,
    });
    if (!quote || !quote.approved || quote.currencyCode !== 'KES' || !Number.isInteger(quote.amount)) {
      return undefined;
    }
    return quote;
  }

  private newTxn(input: {
    kind: PaymentTxnRecord['kind'];
    phone: string;
    amount: number;
    reason?: string;
    userId?: string;
    tenantId?: string;
    metadata?: Record<string, string>;
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
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }
}
