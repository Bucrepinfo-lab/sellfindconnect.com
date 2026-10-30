# Owner standing rules — SellFindConnect.com / Telpen Adverts

Adopted 25/10/26 from the Telpen Edu standing rules (owner, 24/10/26), adapted to
this repo. They bind every contributor and every agent (human-run or scheduled).
Where a repo skill is more specific, the skill decides *how*; these rules decide
*whether*.

## 1. Live stays live — fix forward
A live country, tenant, advertiser profile or listing is never taken offline because a check, test or audit fails. Do not
switch off a country's tax profile, a tenant's subscription state, or a listing's publish state to make a check pass. A failure is escalated to the
responsible agent, who identifies the bug, fixes it, retests and redeploys.

## 2. Fix once, fix everywhere
A bug fixed in one place is fixed and confirmed in every country (own currency, tax profile and wording) and tenant, web/PWA and API. Add or adjust a
regression test that would have caught it, and make sure the fix does not change
any other country's or tenant's output.

## 3. Escalate, don't fix
Stop and ask the owner instead of fixing when a fix would touch any of:

- payments, billing, tax and finance: `apps/api/src/modules/{payments,finance}/`, `packages/domain/src/{payments,finance,kenya-tax-profile,stripe-tax-rate,tax-operating-model}.ts`
- sign-in, MFA and tenancy: `apps/api/src/modules/{auth,tenant,access}/`, `packages/domain/src/{auth-tenancy,access-control,totp}.ts`
- zero-tolerance safety and policy: `packages/domain/src/{safety,sanitization,ugc-moderation,community-standards,media-review-policy,privacy}.ts`, `apps/web/src/app/terms/`
- approvals: any change to a tax profile `status`/`approvedBy`, or a policy version id
- database and persistence switch: `packages/database/`, `apps/api/src/persistence.ts`
- deploy config and secrets: `.github/`, `fly.*.toml`, `deploy/`, `compose.yaml`, any `Dockerfile`, any `.env*`

…or a policy or approval decision, a risky (non-additive) database change, or
after **three** failed fix attempts. Automated fixes go on a
`fix/health-audit-<dd-mm-yy>` branch, and the **Health audit guard** check
(`.github/workflows/health-audit-guard.yml`) fails the PR if it touches a
protected area or weakens a test. A red guard is never worked around: no branch
rename, no splitting the change, no editing the guard in the same PR. Leave the PR
open and escalate.

## 4. Tests are never weakened
Never delete, skip (`.skip`, `.todo`, `xit`), or narrow (`.only`) a test to get a
pass. Fix the code, or escalate.

## 5. Ship small, ship proven
- One fix per PR; P0 (safety, money, data) before P1. No line-ending-only churn.
- Merge only when every check is green **at the exact head SHA**.
- Deploy: `.github/workflows/deploy-api.yml` and `deploy-web.yml` deploy Fly apps `sellfindconnect-api` / `sellfindconnect-web` (dispatched by hand). Confirm it is serving: `https://api.sellfindconnect.com/v1/health`. A skipped deploy is not
  "shipped" — say so plainly.
- Name the exact screens a human should retest (and at 375 px phone width).
- Update `Product_Memory.md` (plus the PRD and `docs/IMPLEMENTATION_BACKLOG.md`, per CLAUDE.md) in the same change.
- The owner authorises merges and manual deploys unless a written rule delegates it.

## 6. Money is human-authorised only
Agents and automation prepare, propose and reconcile; they never move money,
trigger a charge, payout or refund, or change pricing. See `finance-tax-reference`.

## 7. Data is protected
Schema changes are additive Prisma migrations only (`npm run db:migrate:deploy`); never `migrate reset` or a destructive migration on production. Never use `--accept-data-loss`, `--force-reset` or
a reset against a shared or production database.

## 8. Secrets stay secret
Never print, paste, log or commit a secret, token or key (or a URL containing
one). A leaked one is revoked and reminted by the owner.

## 9. Each country is its own
Every country keeps its own currency, wording, compliance rules and clock: no
country mixing, nothing unapproved leaking in, tenant isolation always holds.
Schedules, reminders and escalation alerts run on the country's own time zone and
escalate when unresolved.

## 10. Screens work on phones
Key screens have no crashes, error pages or console errors, and work at 375 px.

## 11. Owner-facing reports
Owner reports and alerts use dd/mm/yy dates in Africa/Nairobi time, lead with what
needs a decision, and never include customer names, phones or emails. Existing
logs keep their own date format.

## 12. Schedules cost minutes
Each scheduled workflow states why its frequency is needed; prefer the least
frequent schedule that meets the need (GitHub Actions minutes are a budget).
