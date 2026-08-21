# Fly.io production runbook

Status: Active — Fly.io Frankfurt (`fra`) is the live production host
Date: 2026-08-21
Verified: 2026-08-21

## Current production (probed 2026-08-21)

| Surface | URL | Result |
| --- | --- | --- |
| Web (apex) | https://sellfindconnect.com/ | HTTP 200, Next.js, `server: Fly` |
| Web (www) | https://www.sellfindconnect.com/ | HTTP 200, Fly |
| API health | https://api.sellfindconnect.com/v1/health | HTTP 200 JSON `{ "status": "ok", "service": "telpen-api" }` |
| API docs | https://api.sellfindconnect.com/docs | HTTP 200 |
| Path-routed API | https://sellfindconnect.com/api/v1/health | HTTP 404 (Next.js HTML — there is no `/api` path route) |
| Privacy policy | https://sellfindconnect.com/privacy | HTTP 404 (stale web image; route exists on `main`) |
| Account deletion | https://sellfindconnect.com/account/delete | HTTP 404 (stale web image; route exists on `main`) |
| Historical Railway web | https://web-production-32b7d.up.railway.app/ | HTTP 404 Application not found |
| Historical Railway API | https://api-production-ae5f.up.railway.app/v1/health | HTTP 404 Application not found |
| `adverts.telpen.net` | DNS | Does not resolve |

The live API health payload does **not** yet include `persistence` and still
names the service `telpen-api`. Current `main` returns `sellfindconnect-api`
plus `persistence: { driver, mode, databaseConfigured }`. Production is therefore
an older Fly image than GitHub `main`.

Live API CORS (2026-08-21) allowed `https://www.sellfindconnect.com` only. Apex
`https://sellfindconnect.com` browsers would be blocked until the API is
redeployed with paired origins.

## Apps and config

Configs in this repository:

- `fly.web.toml` — app `sellfindconnect-web`, health `GET /`
- `fly.api.toml` — app `sellfindconnect-api`, health `GET /v1/health`
- Dockerfiles: `deploy/web.Dockerfile`, `deploy/api.Dockerfile`
- Region: `fra` (Frankfurt) for Africa/Europe latency until a closer PoP exists

Deploy from the repository root (requires `flyctl` authenticated as the owner):

```
fly deploy --config fly.web.toml --remote-only
fly deploy --config fly.api.toml --remote-only
```

`NEXT_PUBLIC_API_URL` is a **build-time** web arg and is already set to
`https://api.sellfindconnect.com/v1`. Changing the API host requires a web
rebuild, not only a secret change.

## Secrets and persistence

Set on the API app via `fly secrets` (never commit values):

- `WEB_ORIGIN=https://sellfindconnect.com` (apex/www are paired in code)
- `DATABASE_URL` when enabling PostgreSQL
- `PERSISTENCE_DRIVER=prisma` only after `DATABASE_URL` is set and
  `npm run db:migrate:deploy` has succeeded
- `INTERNAL_JOB_KEY` before enabling `.github/workflows/scheduled-jobs.yml`
- Payment / SMS / email / media secrets only after finance and safety approval

Do not onboard paying subscribers until:

- Redeployed API health returns `service: "sellfindconnect-api"` and a
  `persistence` object with `mode` other than `misconfigured`
- Web `/privacy` and `/account/delete` return HTTP 200
- Migrations and seed have been applied
- Scheduled jobs are enabled against `https://api.sellfindconnect.com/v1`
- STK Push uses the login phone only (`PAYMENT_PROVIDER` live credentials
  reviewed)

## DigitalOcean and Railway

DigitalOcean App Platform remains a documented **candidate**
(`docs/DIGITALOCEAN_DEPLOYMENT.md`, `deploy/digitalocean/app.yaml`) with
path-routed `/api`. That layout is **not** what is live.

Railway temporary URLs and `adverts.telpen.net` are historical fallbacks and are
no longer serving this product. See `docs/GIT_RAILWAY_RUNBOOK.md` (archived).
