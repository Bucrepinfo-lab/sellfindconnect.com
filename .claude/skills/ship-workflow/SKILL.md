---
name: ship-workflow
description: Use when preparing to deliver a change in the SellFindConnect.com / Telpen Adverts repo — to run the gate commands in the right order, keep one feature per PR, keep packages/domain tests green, update Product_Memory.md, and honour the launch gate (no paying subscribers until Kenya tax_profile is APPROVED).
---

# Ship workflow — the delivery loop

## Purpose
A repeatable loop that keeps the build green, changes reviewable, and the
product's truth docs current, without tripping the finance/legal launch gates.

## When to use
- Finishing any code slice, before committing.
- Preparing a PR or a deployment.

## The gate — run from repo root, in this order
```
npm run typecheck   # domain + api + web
npm test            # domain + api (vitest)
npm run lint        # web ESLint
npm run build       # production build of api + web
```
One line to run all four:
`npm run typecheck && npm test && npm run lint && npm run build`.
A sandbox with mounted Windows `node_modules` may fail to run these; the host
runs them. **`packages/domain` tests must be green** — it is the safety and
finance core. Database when schema changes: `npm run db:generate`, then
`npm run db:migrate:deploy`, `npm run db:seed`.

## Steps
1. **One feature per PR / commit.** Keep it a single vertical slice; small,
   coherent, well-described. Exclude line-ending-only churn (`.gitattributes`
   enforces LF — see `repo-conventions`).
2. **Tests first-class.** Add/extend `*.test.ts` in `packages/domain` for new
   logic and the module `*.spec.ts` in `apps/api` for wiring.
3. **Run the full gate** above; fix until green.
4. **Document in the same change:**
   - `Advertising_SaaS_PRD.md` — epic/feature scope if it changed.
   - `docs/IMPLEMENTATION_BACKLOG.md` — move the slice to "Progress"/done.
   - `Product_Memory.md` — append a dated decision-log entry (absolute dates).
5. **Commit** with a clear message; **push only when the owner asks** (default
   remote per the owner). Don't force-push or rewrite history.

## CI
Pipeline order mirrors the gate: typecheck → test → lint → build. Deploy targets
are Fly.io Frankfurt (`fly.api.toml`, `fly.web.toml`). Don't merge red.

## Launch gate — hard stop
**Do not onboard paying subscribers until the Kenya `tax_profile` is APPROVED.**
Paid checkout fails closed with reason `tax_profile` until a human sets
`approvedBy` on the country tax profile; invoice generation throws
"Country tax profile is not approved." See `finance-tax-reference`. Shipping
code is fine; enabling paid use before APPROVED is not.

## Guardrails
- Never skip the gate or merge with `packages/domain` red.
- Keep the no-secrets, in-memory default build working.
- Honour tenant isolation, zero-tolerance, terms acceptance, and finance/tax
  controls as acceptance criteria — see `tenancy-guard`, `ads-domain`,
  `legal-policy-reference`, `finance-tax-reference`.
- Propose a push/deploy; don't move money or launch paid use autonomously.
