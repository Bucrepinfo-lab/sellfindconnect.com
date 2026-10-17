---
name: finance-tax-reference
description: Use when working on billing, tax profiles, invoices, payments, or the paid-launch gate for SellFindConnect.com / Telpen Adverts — the reference for the tax_profile DRAFT→APPROVED flow, the approvedBy gate, checkout behaviour, and the "prepare, don't move money" rule, with real module paths.
---

# Finance & tax reference

## Purpose
Single reference for how paid use is gated and how the finance module is wired,
so no change enables paying subscribers before a country is compliant. Owns
Epic 8.

## When to use
- Touching billing, invoices, tax profiles/rules/returns, reconciliation.
- Reasoning about why checkout is blocked, or wiring the paid path.

## Real paths
- Domain (pure logic): `packages/domain/src/finance.ts`,
  `kenya-tax-profile.ts`, `tax-operating-model.ts`, `stripe-tax-rate.ts`.
- API: `apps/api/src/modules/finance/` — `finance.service.ts`,
  `finance.controller.ts` (`@Controller('finance')`), `dto/finance.dto.ts`,
  `payment.adapter.ts`, `tax-rate.adapter.ts`, `in-memory-finance.repository.ts`
  (default) / `prisma-finance.repository.ts`.
- Checkout gate: `apps/api/src/modules/payments/payments.service.ts`.

## tax_profile DRAFT → APPROVED flow
- Statuses: `taxProfileStatuses = ['DRAFT','APPROVED','SUSPENDED']`
  (`packages/domain/src/finance.ts`).
- A human must set `approvedBy`. In `finance.service.ts` (~L132–145) the saved
  profile is `status: approvedBy ? 'APPROVED' : 'DRAFT'`, with `approvedAt`/
  `approvedBy` recorded. No `approvedBy` → stays DRAFT.
- Kenya ships DRAFT until an iTax packet exists:
  `packages/domain/src/kenya-tax-profile.ts` (`status: 'DRAFT'`), with
  `assertPaidLaunchReadiness` returning not-allowed unless status is `APPROVED`.
- Configure/read profiles: `POST /finance/country-tax-profiles` (body
  `ConfigureCountryTaxProfileDto` with `countryCode`, optional `approvedBy`),
  `GET /finance/country-tax-profiles`, and `GET /finance/launch-readiness`.

## How the gate fails closed
- Invoice generation throws
  `UnprocessableEntityException('Country tax profile is not approved.')` /
  `'... must be approved before paid use.'` (`finance.service.ts` ~L293, L1382)
  unless the profile is `APPROVED`.
- Checkout: `payments.service.ts` calls `finance.getPaidLaunchReadiness('KE')`
  and, if not allowed, records a `PAYMENT_CHECKOUT_BLOCKED` audit and returns
  `{ ok: false, reason: 'tax_profile' }`. If terms acceptance is not current it
  returns `{ ok: false, reason: 'terms' }` (see `legal-policy-reference`).
- Every paid transaction must produce a tax snapshot + ledger entry.

## Tax-return workbench & RBAC
Routes under `/finance/tax-returns`: `POST /tax-returns`, `GET /tax-returns`,
`GET /tax-returns/:id`, `GET /tax-returns/:id/export`, and
`POST /tax-returns/:id/{submit,approve,evidence,file,remit,lock,corrections}`.
Status flow `DRAFT → IN_REVIEW → APPROVED → FILED` (then remit/lock).
Reconciliation-gated approval; **dual filing approval above 10,000 units**;
period lock; CSV/JSON exports. RBAC (`packages/domain/src/access-control.ts`):
`COUNTRY_FINANCE_ADMIN` (has `MANAGE_FINANCE`) can operate it; `BILLING_MANAGER`
cannot. Also `POST /finance/{invoices,receipts,refunds,chargebacks}`,
`POST /finance/reconciliation/run` (raises `RECONCILIATION_VARIANCE`),
`POST /finance/alerts/run` (T-30/T-14/T-7/T-3/T-1/due/overdue).

## Locked operating model (`docs/GROUP_TAX_OPERATING_MODEL.md`)
Self merchant of record. Kenya first on iTax (or one Kenyan agent). Keep M-Pesa
STK (Africa's Talking) + Stripe. Rates from the finance module; Stripe Tax is a
**rate engine only** (`TAX_RATE_PROVIDER=stripe_tax`, enabled after Kenya is
registered; iTax / the agent files). EU OSS later. **Never** enable
Paddle / Lemon Squeezy / Dodo or any merchant-of-record checkout. Pricing:
first month free, then 10 local-currency units/month.

## Guardrails — prepare, don't move money
- The finance role **analyses and prepares**; filing, remittance, and refunds
  require explicit owner approval. No autonomous money movement.
- No paid use in a country without an APPROVED tax profile. Fail closed on an
  unapproved profile or a failed capture.
- Provide factual figures, not financial advice — the owner/CPA decides.
- Zero-tolerance checks apply to finance text/metadata (safety core).
- Env var *names* only; never commit provider secrets.
