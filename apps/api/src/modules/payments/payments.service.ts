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
  localMethodFor,
  subscriptionRails,
  verifyPaddleSignature,
  type SubscriptionRail,
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
import {
  localPaymentCovers,
  pawapayCallbackDepositId,
  pawapayCheck,
  pawapayDeposit,
  pawapayOn,
  paystackEventReference,
  paystackInitialize,
  paystackOn,
  paystackVerify,
  verifyPaystackSignature,
  type LocalStatus,
} from './local-providers';
import type { PaymentTxnRecord } from './payments.records';
import { PAYMENTS_REPOSITORY, type PaymentsRepository } from './payments.repository';
import type { CheckoutDto, PayoutDto } from './dto/payments.dto';

export type CheckoutResult =
  | { ok: true; txnId: string; providerTxnId: string | null; redirectUrl?: string }
  | {
      ok: false;
      reason: 'no_phone' | 'invalid_amount' | 'no_price' | 'use_card' | 'provider_error' | 'tax_profile' | 'terms';
      txnId?: string;
    };

type SessionTenant = { countryCode: string; trialStartedAt: string; status: string; plan?: string } | undefined;

export type SubscriptionOption = {
  plan: SubscriptionPlan;
  name: string;
  summary: string;
  maxMediaPerListing: number;
  /** M-Pesa price in KES, or null where M-Pesa is not the way to pay (the card price shows at Paddle's checkout). */
  monthly: number | null;
  yearly: number | null;
  locked: boolean;
};

export type SubscriptionOptions = {
  currentPlan: SubscriptionPlan;
  currencyCode: string | null;
  /** The leading way to pay here: the way most people pay in the country, else Paddle, else NONE. */
  rail: SubscriptionRail;
  /** Name of the local way (e.g. "M-Pesa", "MTN MoMo or Airtel Money"), when it leads. */
  localMethod: string | null;
  /** Every way to pay here, best first. */
  rails: SubscriptionRail[];
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
    // Owner standing order 19/11/26: the way most people in the country pay
    // leads. Mobile money (pawaPay) and bank transfer/USSD/EFT (Paystack) go
    // through their own flow; M-Pesa continues below.
    if (input.plan) {
      const lead = this.railsFor(context.tenant as SessionTenant).find((rail) => rail !== 'PADDLE');
      if (lead === 'MOBILE_MONEY' || lead === 'BANK_TRANSFER') {
        return this.startLocalCheckout(context, lead, input.plan, input.period ?? 'MONTH');
      }
    }
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
      // Owner rules 19/11/26: M-Pesa where it is the leading local method
      // (Kenya); elsewhere plans are paid by card through Paddle.
      const rails = this.railsFor(context.tenant as SessionTenant);
      if (!rails.includes('MPESA')) {
        return { ok: false, reason: rails.includes('PADDLE') ? 'use_card' : 'no_price' };
      }
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
    const rails = this.railsFor(tenant);
    const rail: SubscriptionRail = rails[0] ?? 'NONE';
    const local = rails.some((r) => r !== 'PADDLE');
    const plans: SubscriptionOption[] = [];
    let currencyCode: string | null = null;
    for (const plan of ['BASIC', 'PRO'] as const) {
      const month = local ? this.localQuote(tenant, plan, 'MONTH') : undefined;
      const year = local ? this.localQuote(tenant, plan, 'YEAR') : undefined;
      if (local && (!month || !year)) continue;
      if (month) currencyCode = month.currencyCode;
      plans.push({
        plan,
        name: SUBSCRIPTION_PLANS[plan].name,
        summary: SUBSCRIPTION_PLANS[plan].summary,
        maxMediaPerListing: PLAN_ENTITLEMENTS[plan].maxMediaPerListing,
        monthly: month?.amount ?? null,
        yearly: year?.amount ?? null,
        locked: month?.locked ?? false,
      });
    }
    const card = rails.includes('PADDLE') ? paddlePublicConfig(paddleConfig(process.env)) : null;
    return {
      currentPlan: normalizePlan(tenant?.plan),
      currencyCode,
      rail,
      localMethod: local ? (localMethodFor(tenant?.countryCode)?.label ?? null) : null,
      rails,
      payable: rails.length > 0 && plans.length > 0,
      plans,
      card: card ? { ...card, customData: { tenantId: context.session.tenantId } } : null,
    };
  }

  /**
   * Ways to pay here, best first (owner standing order 19/11/26): the way most
   * people in the country pay (when its provider is on and the owner approved
   * the price), then the card through Paddle.
   */
  private railsFor(tenant: SessionTenant): SubscriptionRail[] {
    const country = tenant?.countryCode;
    const local = localMethodFor(country);
    const quote = tenant ? quoteSubscription({ countryCode: tenant.countryCode, env: process.env }) : null;
    return subscriptionRails({
      country,
      switches: { pawapay: pawapayOn(process.env), paystack: paystackOn(process.env), paddle: paddleConfig(process.env) !== null },
      localPriceApproved: !!quote && !!local && quote.approved && quote.currencyCode === local.currency,
    });
  }

  /**
   * Mobile money (pawaPay prompt on the payer's own verified phone) or bank
   * transfer / USSD / EFT (Paystack's own page). The price is the server's;
   * the plan only changes once the provider confirms the payment.
   */
  private async startLocalCheckout(
    context: Awaited<ReturnType<AuthService['getSession']>>,
    rail: 'MOBILE_MONEY' | 'BANK_TRANSFER',
    plan: SubscriptionPlan,
    period: BillingPeriod,
  ): Promise<CheckoutResult> {
    const tenant = context.tenant as SessionTenant;
    const quote = this.localQuote(tenant, plan, period);
    if (!quote || !tenant) return { ok: false, reason: 'no_price' };
    if (!(await this.auth.hasCurrentTermsAcceptance(context.session.userId, context.session.tenantId))) {
      return { ok: false, reason: 'terms' };
    }
    const phone = context.user?.phoneVerifiedAt ? context.user.phone?.trim() : undefined;
    if (rail === 'MOBILE_MONEY' && !phone) return { ok: false, reason: 'no_phone' };

    const txn = this.newTxn({
      kind: 'CHECKOUT',
      provider: rail === 'MOBILE_MONEY' ? 'pawapay' : 'paystack',
      phone: phone ?? '',
      amount: quote.amount,
      currency: quote.currencyCode,
      reason: `${SUBSCRIPTION_PLANS[plan].name} plan, ${period === 'YEAR' ? 'a year' : 'a month'}`,
      userId: context.session.userId,
      tenantId: context.session.tenantId,
      metadata: { purpose: 'SUBSCRIPTION', plan, period },
    });
    await this.repository.createPaymentTxn(txn);

    let providerTxnId: string | undefined;
    let redirectUrl: string | undefined;
    if (rail === 'MOBILE_MONEY') {
      const res = await pawapayDeposit({
        env: process.env,
        amount: quote.amount,
        currency: quote.currencyCode,
        phone: phone!,
        message: 'SellFindConnect plan',
        reference: txn.id,
      });
      if (res.ok) providerTxnId = res.depositId;
    } else {
      const email = context.user?.email?.trim() || `${context.session.userId}@payer.sellfindconnect.com`;
      const res = await paystackInitialize({
        env: process.env,
        email,
        amount: quote.amount,
        currency: quote.currencyCode,
        reference: txn.id,
        country: tenant.countryCode,
        callbackUrl: process.env.WEB_ORIGIN ? `${process.env.WEB_ORIGIN.replace(/\/$/, '')}/#plan` : undefined,
        metadata: { tenantId: context.session.tenantId, plan, period },
      });
      if (res.ok) {
        providerTxnId = txn.id;
        redirectUrl = res.url;
      }
    }
    await this.repository.updatePaymentTxn({
      ...txn,
      status: providerTxnId ? 'PENDING' : 'FAILED',
      providerTxnId,
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
        provider: txn.provider,
        amount: quote.amount,
        currency: quote.currencyCode,
        plan,
        period,
        ok: Boolean(providerTxnId),
        status: providerTxnId ? 'PENDING' : 'FAILED',
      },
    });
    return providerTxnId
      ? { ok: true, txnId: txn.id, providerTxnId, redirectUrl }
      : { ok: false, reason: 'provider_error', txnId: txn.id };
  }

  /**
   * pawaPay deposit callback. Never trusted on its own: the deposit is re-read
   * from pawaPay, and only a full, successful payment changes the plan, once.
   */
  async handlePawapayCallback(rawBody: string): Promise<{ ok: boolean; status?: LocalStatus | 'ignored' }> {
    if (!pawapayOn(process.env)) return { ok: false };
    const depositId = pawapayCallbackDepositId(rawBody);
    if (!depositId) return { ok: true, status: 'ignored' };
    const txn = await this.repository.findPaymentTxnByProviderTxnId(depositId);
    if (!txn || txn.provider !== 'pawapay') return { ok: true, status: 'ignored' };
    const checked = await pawapayCheck({ env: process.env, depositId });
    await this.settleLocal(txn, checked);
    return { ok: true, status: checked.status };
  }

  /** Paystack webhook: signed (HMAC-SHA512), then the transaction is re-verified. */
  async handlePaystackWebhook(rawBody: string, signature: string | undefined): Promise<{ ok: boolean; status?: LocalStatus | 'ignored' }> {
    if (!paystackOn(process.env)) return { ok: false };
    if (!verifyPaystackSignature(rawBody, signature, (process.env.PAYSTACK_SECRET_KEY ?? '').trim())) return { ok: false };
    const reference = paystackEventReference(rawBody);
    if (!reference) return { ok: true, status: 'ignored' };
    const txn = await this.repository.findPaymentTxnByProviderTxnId(reference);
    if (!txn || txn.provider !== 'paystack') return { ok: true, status: 'ignored' };
    const checked = await paystackVerify({ env: process.env, reference });
    await this.settleLocal(txn, checked);
    return { ok: true, status: checked.status };
  }

  private async settleLocal(
    txn: PaymentTxnRecord,
    checked: { status: LocalStatus; amount: number | null; currency: string | null },
  ): Promise<void> {
    if (txn.status === 'SUCCESS' || txn.status === 'FAILED') return;
    const paidInFull =
      checked.status === 'success' &&
      (checked.currency ?? '').toUpperCase() === txn.currency.toUpperCase() &&
      localPaymentCovers(checked.amount, txn.amount);
    if (checked.status === 'pending' || checked.status === 'unknown') return;
    await this.repository.updatePaymentTxn({
      ...txn,
      status: paidInFull ? 'SUCCESS' : 'FAILED',
      updatedAt: new Date().toISOString(),
    });
    if (paidInFull) await this.applySubscription(txn);
  }

  /** This tenant's approved price in its country's local currency (the one its local way charges). */
  private localQuote(tenant: SessionTenant, plan: SubscriptionPlan, period: BillingPeriod): PlanQuote | undefined {
    if (!tenant) return undefined;
    const local = localMethodFor(tenant.countryCode);
    if (!local) return undefined;
    if (local.rail === 'MPESA') return this.payableQuote(tenant, plan, period);
    const quote = quoteSubscription({
      countryCode: tenant.countryCode,
      plan,
      period,
      startedAt: new Date(tenant.trialStartedAt),
      status: tenant.status,
      env: process.env,
    });
    if (!quote || !quote.approved || quote.currencyCode !== local.currency) return undefined;
    return quote;
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
    provider?: string;
    currency?: string;
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
      provider: input.provider ?? 'africastalking',
      kind: input.kind,
      status: 'REQUESTED',
      phone: input.phone,
      amount: input.amount,
      currency: input.currency ?? 'KES',
      reason: input.reason,
      userId: input.userId,
      tenantId: input.tenantId,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }
}
