# SellFindConnect.com / Telpen Adverts — repo guide

"Sell it. Find it. Connect." A multi-tenant advertising + discovery +
matchmaking SaaS. Niche: **commercial relationship intelligence** — the Source
Finder lets a searcher find who produces / supplies / buys / consumes / installs
/ repairs / ships / finances / certifies / distributes an item or service in a
country. Advertisers build rich profiles + media listings; a precision-matching
engine with explainable reason codes + in-app chat/RFQ closes the loop.
Business model: first month free, then Basic KES 499/month (KES 4,990/year) or
Pro KES 1,499/month (KES 14,990/year), founding price locked
(`packages/domain/src/subscription-pricing.ts`, owner decision 18/11/26). Kenya-first (M-Pesa STK via Africa's Talking; cards through Paddle as merchant of record).

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
- **Finance/legal gates.** M-Pesa leads in Kenya (the most convenient local
  method), Paddle second there and first wherever else it sells
  (`subscriptionRails`); Paddle is merchant of record and remits the tax.
  M-Pesa is a direct sale with no VAT until the
  company is VAT-registered, after which (`SELLER_VAT_REGISTERED=true`) M-Pesa
  needs an APPROVED Kenya tax profile (`approvedBy` set by a human). Owner
  decision 19/11/26, `docs/GROUP_TAX_OPERATING_MODEL.md`. No
  publish/upload/chat/pay without current terms acceptance + zero-tolerance
  clearance.
- **LF / encoding.** UTF-8, LF line endings only (`.gitattributes` enforces
  `eol=lf`). Never introduce CRLF or line-ending-only churn in a diff.
- **Commits** small, coherent, reviewable; update the PRD, backlog, and the
  dated `Product_Memory.md` log in the same change. Push only when asked.

## Owner standing rules
`docs/STANDING_RULES.md` binds every contributor and agent: live stays live (fix
forward, never switch a live country/tenant off to pass a check); fix once, fix
everywhere (every country, tenant, web and API); escalate, don't fix, in protected
areas (payments, finance/tax, auth/MFA/tenancy, zero-tolerance safety and policy,
tax-profile approvals, database, deploy config, secrets) or after three failed
attempts — enforced on `fix/health-audit-*` PRs by `health-audit-guard`; never
weaken a test; merge only green at the exact head SHA, then confirm
`https://api.sellfindconnect.com/v1/health`.

## Where the personas and skills live
- Canonical agent personas: `.claude/agents/` — `research-agent`, `sales-agent`,
  `support-agent`, `operation-agent`, `finance-agent`, `legal-agent`.
- Skills: `.claude/skills/` — `ads-domain`, `repo-conventions`, `ship-workflow`,
  `tenancy-guard`, `finance-tax-reference`, `legal-policy-reference`.
- The original source skills in `.agents/skills/` are kept for reference.
