# SellFindConnect.com / Telpen Adverts — repo guide

"Sell it. Find it. Connect." A multi-tenant advertising + discovery +
matchmaking SaaS. Niche: **commercial relationship intelligence** — the Source
Finder lets a searcher find who produces / supplies / buys / consumes / installs
/ repairs / ships / finances / certifies / distributes an item or service in a
country. Advertisers build rich profiles + media listings; a precision-matching
engine with explainable reason codes + in-app chat/RFQ closes the loop.
Business model: first month free, then 10 units of the subscriber country's
local currency / month. Kenya-first (M-Pesa STK via Africa's Talking + Stripe).

## Repo map (npm-workspaces monorepo, scope `@telpen/*`)
- `apps/web` — Next.js 16 / React 19 web + PWA (`@telpen/web`).
- `apps/api` — NestJS API (`@telpen/api`), 24 modules under
  `apps/api/src/modules/*`; OpenAPI at `/docs`.
- `packages/domain` — framework-free business logic + zero-tolerance safety
  core (`@telpen/domain`); tests are `*.test.ts` beside each source file.
- `packages/database` — Prisma schema, migrations, seed (`@telpen/database`).
- Truth docs: `Advertising_SaaS_PRD.md`, `Product_Memory.md` (dated decision
  log), `docs/*` (backlog, architecture, `GROUP_TAX_OPERATING_MODEL.md`).

## The gate — run from repo root, in order, before every commit
```
npm run typecheck && npm test && npm run lint && npm run build
```
Keep `packages/domain` tests green: it is the safety and finance core. Database:
`npm run db:generate` / `db:migrate:deploy` / `db:seed`.

## House rules
- **In-memory by default, opt-in Prisma.** Repositories default to in-memory;
  Prisma overlays only when `PERSISTENCE_DRIVER=prisma` (named per-repo vars like
  `AUTH_REPOSITORY=prisma` also work). A prisma selection without `DATABASE_URL`
  fails closed. See `apps/api/src/persistence.ts`.
- **Adapter / provider-neutral pattern.** External providers sit behind
  adapters so the default build runs with no secrets: payments
  (`PaymentAdapter`, `PAYMENT_PROVIDER=stripe|africastalking|live`), tax rates
  (`TAX_RATE_PROVIDER=stripe_tax`), plus search/chat/notifications. Default to
  the manual/dev adapter; never hard-wire a vendor into domain logic.
- **Zero-tolerance safety is non-negotiable.** Use the `packages/domain`
  safety helpers (`evaluateSafetyFields`, `evaluateSafetyText`,
  `assertSafeFields`) on user/tenant text; 28 prohibited-category summaries live
  in `packages/domain/src/safety.ts`. Fail closed on safety/moderation paths.
- **Tenant isolation.** Tenant routes require `x-tenant-id` + `x-session-token`
  with MFA (`apps/api/src/modules/tenant/tenant-session.guard.ts`).
- **Finance/legal gates.** No paid use in a country without an APPROVED tax
  profile (`approvedBy` set by a human); no publish/upload/chat/pay without
  current terms acceptance + zero-tolerance clearance. Do not onboard paying
  subscribers until Kenya `tax_profile` is APPROVED.
- **LF / encoding.** UTF-8, LF line endings only (`.gitattributes` enforces
  `eol=lf`). Never introduce CRLF or line-ending-only churn in a diff.
- **Commits** small, coherent, reviewable; update the PRD, backlog, and the
  dated `Product_Memory.md` log in the same change. Push only when asked.

## Where the personas and skills live
- Canonical agent personas: `.claude/agents/` — `research-agent`, `sales-agent`,
  `support-agent`, `operation-agent`, `finance-agent`, `legal-agent`.
- Skills: `.claude/skills/` — `ads-domain`, `repo-conventions`, `ship-workflow`,
  `tenancy-guard`, `finance-tax-reference`, `legal-policy-reference`.
- The original source skills in `.agents/skills/` are kept for reference.
