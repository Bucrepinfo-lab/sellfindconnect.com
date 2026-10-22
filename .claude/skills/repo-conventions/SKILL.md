---
name: repo-conventions
description: Use when writing or reviewing code in the SellFindConnect.com / Telpen Adverts monorepo — to follow the house style for repositories (in-memory default, opt-in Prisma), provider-neutral adapters, the domain safety core, LF enforcement, and the @telpen/* package scope.
---

# Repo conventions — monorepo house style

## Purpose
Keep every change consistent with how this codebase is built so the default
(no-secrets, in-memory) build always runs, tests stay green, and provider swaps
stay clean.

## When to use
- Starting any code change in `apps/*` or `packages/*`.
- Adding a new module, repository, or external-provider integration.
- Reviewing a PR for house-style compliance.

## Workspace layout (scope `@telpen/*`)
- `apps/web` (`@telpen/web`) — Next.js 16 / React 19 + PWA.
- `apps/api` (`@telpen/api`) — NestJS, modules in `apps/api/src/modules/*`.
- `packages/domain` (`@telpen/domain`) — framework-free logic + safety core.
- `packages/database` (`@telpen/database`) — Prisma schema/migrations/seed.
Import shared logic from `@telpen/domain`; never reach across workspace
internals by relative path.

## In-memory default, opt-in Prisma overlay
- Every module ships an `in-memory-*.repository.ts` (the default) and a
  `prisma-*.repository.ts`. Example: `apps/api/src/modules/finance/`.
- Selection lives in `apps/api/src/persistence.ts`
  (`resolvePersistenceMode`): memory unless `PERSISTENCE_DRIVER=prisma`
  (aliases `postgres`/`database`/`live`) or a named per-repo var like
  `AUTH_REPOSITORY=prisma` / `PROFILE_REPOSITORY=prisma`.
- **Fail closed:** a prisma selection without `DATABASE_URL` throws
  (`DATABASE_URL is required when …=prisma`). An unsupported driver throws.
- New persisted modules must provide both repositories behind one interface and
  default to in-memory. Env var *names* only — never commit secret values.

## Adapter / provider-neutral pattern
External providers sit behind adapters so domain logic stays pure and the
default build needs no vendor keys:
- Payments: `apps/api/src/modules/finance/payment.adapter.ts`
  (`PaymentAdapter`; `PAYMENT_PROVIDER=stripe|africastalking|live`, manual/dev
  default). M-Pesa STK via Africa's Talking, Stripe PaymentIntents.
- Tax rates: `tax-rate.adapter.ts` (`TAX_RATE_PROVIDER=stripe_tax`; unset keeps
  finance-module rules — Stripe Tax is a rate engine, not the remitter).
- Search embeddings: `source-finder/openai-embeddings.ts`.
- Notifications: `packages/domain/src/notification-adapter.ts`.
- Chat/conversations: `apps/api/src/modules/conversations/*`.
Default to the manual/dev adapter; put the vendor call only in the adapter.

## Zero-tolerance / assertSafe checkpoints
- Safety core: `packages/domain/src/safety.ts`
  (`evaluateSafetyFields`, `evaluateSafetyText`, 28 prohibited categories).
- Enforcement helper `assertSafeFields` in
  `packages/domain/src/ugc-moderation.ts`; services wrap it in a private
  `assertSafe(...)` (e.g. `leads.service.ts`, `source-finder.service.ts`,
  `conversations.service.ts`, `notifications.service.ts`, `finance.service.ts`).
- Run safety checks on all user/tenant-supplied text and metadata; fail closed.
- Pure logic goes in `packages/domain` with a colocated `*.test.ts` (vitest).

## LF / encoding
UTF-8, LF only. `.gitattributes` sets `* text=auto eol=lf` and pins `.ts/.tsx/
.js/.json/.md/.prisma/.sql/...` to `eol=lf`; binaries marked `binary`. Never
introduce CRLF or line-ending-only churn in a diff. Prettier config:
`.prettierrc.json`.

## Steps for a change
1. Read the target module + its domain helpers; mirror the existing structure.
2. Keep business rules in `@telpen/domain`; keep Nest wiring thin.
3. Provide both repositories for new persisted data; default in-memory.
4. Put provider calls behind an adapter; gate with an env var *name*.
5. Add/extend tests; run the gate (`npm run typecheck && npm test &&
   npm run lint && npm run build`). See `ship-workflow`.

## Guardrails
- No secrets in code or docs — env var names only.
- Don't break the no-secrets default build. Don't bypass the safety core.
- Respect tenant isolation (see `tenancy-guard`).
