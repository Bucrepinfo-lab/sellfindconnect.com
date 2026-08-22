# Fly.io production runbook

Status: Active — Fly.io Frankfurt (`fra`) is the live production host
Date: 2026-08-22
Verified: 2026-08-22

## Current production (probed 2026-08-22)

| Surface | URL | Result |
| --- | --- | --- |
| Web (apex) | https://sellfindconnect.com/ | HTTP 200, Next.js, `server: Fly` |
| Web (www) | https://www.sellfindconnect.com/ | HTTP 200, Fly |
| API health | https://api.sellfindconnect.com/v1/health | HTTP 200 JSON `service: sellfindconnect-api`, `persistence.mode: prisma`, `databaseConfigured: true` |
| API docs | https://api.sellfindconnect.com/docs | HTTP 200 |
| Privacy policy | https://sellfindconnect.com/privacy | HTTP 200 |
| Terms of Service | https://sellfindconnect.com/terms | HTTP 200 after this web image |
| Subscription terms | https://sellfindconnect.com/subscription | HTTP 200 after this web image |
| Account deletion | https://sellfindconnect.com/account/delete | HTTP 200 |
| Path-routed API | https://sellfindconnect.com/api/v1/health | HTTP 404 (Next.js HTML — there is no `/api` path route) |
| Historical Railway web | https://web-production-32b7d.up.railway.app/ | HTTP 404 Application not found |
| Historical Railway API | https://api-production-ae5f.up.railway.app/v1/health | HTTP 404 Application not found |
| `adverts.telpen.net` | DNS | Does not resolve |

`DATABASE_URL` is already set on `sellfindconnect-api`. Persistence stays
**memory** until this runbook's hosted Prisma deploy completes and
`GET /v1/health` reports `persistence.mode: "prisma"`.

## Apps and config

Configs in this repository:

- `fly.web.toml` — app `sellfindconnect-web`, health `GET /`
- `fly.api.toml` — app `sellfindconnect-api`, health `GET /v1/health`
- Dockerfiles: `deploy/web.Dockerfile`, `deploy/api.Dockerfile`
- Region: `fra` (Frankfurt) for Africa/Europe latency until a closer PoP exists

Deploy from the **Telpen Adverts** repository root (not `Desktop\Advert`).
Requires `flyctl` authenticated as the owner. If the Desktop clone is behind
or conflicted, reset it to GitHub before deploying:

```
cd C:\Users\user\Desktop\Adverts\Telpen Adverts
git fetch origin
git reset --hard origin/main
fly deploy --config fly.web.toml --remote-only
fly deploy --config fly.api.toml --remote-only
```

There is no `fly.toml`. Always pass `--config`.

`NEXT_PUBLIC_API_URL` is a **build-time** web arg and is already set to
`https://api.sellfindconnect.com/v1`. Changing the API host requires a web
rebuild, not only a secret change.

## Hosted Prisma (do this before scheduled jobs)

The API image now copies Prisma schema/migrations and the Prisma CLI.
`fly.api.toml` sets `PERSISTENCE_DRIVER=prisma` and runs
`sh /app/deploy/api-release.sh` as `release_command` **before** new machines
receive traffic.

That script fail-closes without `DATABASE_URL`, then:

1. Mark known failed Prisma rows rolled back when present
   (`finance_durability` BOM; `search_hardening` used `""` as a string),
   then `npm run db:migrate:deploy`.
2. `node packages/database/prisma/seed.mjs` (idempotent continents, countries,
   industry categories). Set `SKIP_DB_SEED=true` only if you must skip seed.

Do **not** set `PERSISTENCE_DRIVER=prisma` on the currently running memory
image. Deploy this image so migrate runs first. If migrate fails, Fly keeps
the previous machines.

After a successful API deploy:

```
curl -sS https://api.sellfindconnect.com/v1/health
```

Expect `persistence.mode` to be `"prisma"` and `databaseConfigured` true. If
mode is `"misconfigured"`, `DATABASE_URL` is missing. If mode is `"memory"`,
the new image is not live yet (or a Fly secret is overriding the toml env
with `memory` — `fly secrets unset PERSISTENCE_DRIVER -a sellfindconnect-api`).

## Scheduled jobs

`.github/workflows/scheduled-jobs.yml` cron is enabled on `main`:

- every 15 minutes: conversation SLA, notification dispatch, media processing,
  Source Finder opportunity alerts
- 02:00 UTC daily: advert lifecycle, account-deletion grace sweep, analytics
  rollups, finance remittance alerts
- 03:00 UTC Sundays: analytics retention

Jobs call `https://api.sellfindconnect.com/v1/operations/...` with
`x-internal-job-key`. They fail closed without `INTERNAL_JOB_KEY` on the API.

Set the Fly key once (print the value, then store it in GitHub; Fly will not
show it again):

```
fly secrets set INTERNAL_JOB_KEY="PASTE_A_LONG_RANDOM_SECRET" -a sellfindconnect-api
```

GitHub → repository **Settings → Secrets and variables → Actions**:

- `API_BASE_URL` = `https://api.sellfindconnect.com/v1`
- `INTERNAL_JOB_KEY` = the same value

Then run **Actions → Scheduled jobs → Run workflow → all** to smoke-test.
Cron only fires after this workflow file is on `main`.

## Other secrets

Set on the API app via `fly secrets` (never commit values):

- `WEB_ORIGIN=https://sellfindconnect.com` (apex/www are paired in code)
- `DATABASE_URL` (already present when health reports `databaseConfigured: true`)
- `INTERNAL_JOB_KEY` before relying on scheduled jobs
- Payment / SMS / email / media secrets only after finance and safety approval
- `TAX_RATE_PROVIDER=stripe_tax` only after a Kenya tax registration exists in
  the Stripe Dashboard **and** `STRIPE_SECRET_KEY` is set. Unset keeps
  finance-module rates. Stripe Tax does not file iTax.

Do not onboard paying subscribers until:

- API health returns `service: "sellfindconnect-api"` and
  `persistence.mode: "prisma"`
- Web `/privacy` and `/account/delete` return HTTP 200
- Web `/terms` and `/subscription` return HTTP 200
- A manual **Scheduled jobs** workflow_dispatch succeeds
- STK Push uses the login phone only (`PAYMENT_PROVIDER` live credentials
  reviewed)
- A human approves the Kenya country tax profile after remote iTax simplified
  VAT registration (or a Kenyan tax representative). eTIMS is not required
  for that non-resident path. Seed writes the profile as DRAFT (KRA 16% VAT).
  Checkout returns `tax_profile` until `approvedBy` is set.
  `GET /v1/finance/launch-readiness?country=KE` must report `allowed: true`.
  The operator stays merchant of record; `PAYMENT_PROVIDER` must not be a
  merchant-of-record checkout. See `docs/GROUP_TAX_OPERATING_MODEL.md`.

## DigitalOcean and Railway

DigitalOcean App Platform remains a documented **candidate**
(`docs/DIGITALOCEAN_DEPLOYMENT.md`, `deploy/digitalocean/app.yaml`) with
path-routed `/api`. That layout is **not** what is live. The same
`deploy/api-release.sh` path is the DigitalOcean pre-deploy job.

Railway temporary URLs and `adverts.telpen.net` are historical fallbacks and are
no longer serving this product. See `docs/GIT_RAILWAY_RUNBOOK.md` (archived).
