# Fly.io production runbook

Status: Active — Fly.io Frankfurt (`fra`) is the live production host
Date: 2026-08-22
Verified: 2026-08-22

## Current production (probed 2026-08-22)

| Surface | URL | Result |
| --- | --- | --- |
| Web (apex) | https://sellfindconnect.com/ | HTTP 200, Next.js, `server: Fly` |
| Web (www) | https://www.sellfindconnect.com/ | HTTP 200, Fly |
| API health | https://api.sellfindconnect.com/v1/health | HTTP 200 JSON `service: sellfindconnect-api`, `persistence.mode: prisma`, `persistence.driver: prisma`, `databaseConfigured: true` |
| API docs | https://api.sellfindconnect.com/docs | HTTP 200 |
| Privacy policy | https://sellfindconnect.com/privacy | HTTP 200 |
| Account deletion | https://sellfindconnect.com/account/delete | HTTP 200 |
| Path-routed API | https://sellfindconnect.com/api/v1/health | HTTP 404 (Next.js HTML — there is no `/api` path route) |
| Historical Railway web | https://web-production-32b7d.up.railway.app/ | HTTP 404 Application not found |
| Historical Railway API | https://api-production-ae5f.up.railway.app/v1/health | HTTP 404 Application not found |
| `adverts.telpen.net` | DNS | Does not resolve |

`DATABASE_URL` is set on `sellfindconnect-api`. Hosted Prisma is live:
`GET /v1/health` reports `persistence.mode: "prisma"` and `databaseConfigured: true`.

Scheduled jobs are live: GitHub Actions cron on `main`, `INTERNAL_JOB_KEY` on
Fly and in repository secrets. A manual **Scheduled jobs → Run workflow → all**
run on 2026-08-22 succeeded (SLA, notifications, media, Source Finder alerts,
advert lifecycle, account-deletion sweep, analytics rollups, finance alerts,
retention).

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

In PowerShell, health checks must use `curl.exe`, not `curl`
(`curl` is `Invoke-WebRequest` and rejects `-sS`).

## Hosted Prisma (live)

The API image copies Prisma schema/migrations and the Prisma CLI.
`fly.api.toml` sets `PERSISTENCE_DRIVER=prisma` and runs
`sh /app/deploy/api-release.sh` as `release_command` **before** new machines
receive traffic.

That script fail-closes without `DATABASE_URL`, then:

1. Marks known failed Prisma rows rolled back when present
   (`finance_durability` BOM; `search_hardening` identifier quotes), then
   `npm run db:migrate:deploy`.
2. `node packages/database/prisma/seed.mjs` (idempotent continents, countries,
   industry categories). Set `SKIP_DB_SEED=true` only if you must skip seed.

Future API deploys must keep that `release_command` so migrate/seed run before
traffic shifts. If migrate fails, Fly keeps the previous machines.

After an API deploy:

```
curl.exe -sS https://api.sellfindconnect.com/v1/health
```

Expect `persistence.mode` to be `"prisma"` and `databaseConfigured` true. If
mode is `"misconfigured"`, `DATABASE_URL` is missing. If mode is `"memory"`,
a Fly secret may be overriding the toml env (`fly secrets unset PERSISTENCE_DRIVER -a sellfindconnect-api`).

## Scheduled jobs

`.github/workflows/scheduled-jobs.yml` cron is enabled on `main`:

- every 15 minutes: conversation SLA, notification dispatch, media processing,
  Source Finder opportunity alerts
- 02:00 UTC daily: advert lifecycle, account-deletion grace sweep, analytics
  rollups, finance remittance alerts
- 03:00 UTC Sundays: analytics retention

Jobs call `https://api.sellfindconnect.com/v1/operations/...` with
`x-internal-job-key`. They fail closed without `INTERNAL_JOB_KEY` on the API.

`INTERNAL_JOB_KEY` is set on Fly and in GitHub Actions secrets (`API_BASE_URL`
= `https://api.sellfindconnect.com/v1`). The two values must match. After
rotating the key, re-run **Actions → Scheduled jobs → Run workflow → all**.

## Other secrets

Set on the API app via `fly secrets` (never commit values):

- `WEB_ORIGIN=https://sellfindconnect.com` (apex/www are paired in code)
- `DATABASE_URL`
- `INTERNAL_JOB_KEY`
- Payment / SMS / email / media secrets only after finance and safety approval

Do not onboard paying subscribers until:

- API health returns `service: "sellfindconnect-api"` and
  `persistence.mode: "prisma"` (live)
- Web `/privacy` and `/account/delete` return HTTP 200 (live)
- Scheduled jobs verified (cron enabled; manual workflow_dispatch green)
- STK Push uses the login phone only (`PAYMENT_PROVIDER` live credentials
  reviewed)
- An approved country tax profile and finance gates pass

## DigitalOcean and Railway

DigitalOcean App Platform remains a documented **candidate**
(`docs/DIGITALOCEAN_DEPLOYMENT.md`, `deploy/digitalocean/app.yaml`) with
path-routed `/api`. That layout is **not** what is live. The same
`deploy/api-release.sh` path is the DigitalOcean pre-deploy job.

Railway temporary URLs and `adverts.telpen.net` are archived. They are not a
fallback or recovery path. See `docs/GIT_RAILWAY_RUNBOOK.md`.
