# Deployment index

Status: Live on Fly.io Frankfurt. DigitalOcean is a candidate only. Railway is archived.
Date: 2026-06-15
Last updated: 2026-08-22

| Host | Role | File |
| --- | --- | --- |
| **Fly.io Frankfurt** | **Live production** | `docs/FLY_DEPLOYMENT.md` |
| DigitalOcean App Platform | Candidate only — do not cut DNS | `docs/DIGITALOCEAN_DEPLOYMENT.md` |
| Railway | Archived — URLs 404 | `docs/GIT_RAILWAY_RUNBOOK.md` |

Play Store constraints: `docs/PLAY_STORE.md`  
Spec: `deploy/digitalocean/app.yaml` (unused until a written host change)

## Live production (verified 2026-08-22)

- Web: `https://sellfindconnect.com` and `https://www.sellfindconnect.com` — HTTP 200, Fly
- API: `https://api.sellfindconnect.com/v1/health` — HTTP 200, `service: sellfindconnect-api`, `persistence.mode: prisma`, `databaseConfigured: true`
- Docs: `https://api.sellfindconnect.com/docs` — HTTP 200
- `/privacy` and `/account/delete` — HTTP 200
- Scheduled jobs: GitHub Actions cron on `main`; manual workflow_dispatch green
- `INTERNAL_JOB_KEY` set on Fly and in GitHub Actions; `API_BASE_URL=https://api.sellfindconnect.com/v1`
- Path-routed `https://sellfindconnect.com/api/v1/health` is **not** used (Next.js 404)
- Railway temp URLs: HTTP 404
- `adverts.telpen.net` / `api.adverts.telpen.net`: DNS missing

Deploy from `C:\Users\user\Desktop\Adverts\Telpen Adverts` (not `Desktop\Advert`):

```
git fetch origin
git reset --hard origin/main
fly deploy --config fly.web.toml --remote-only
fly deploy --config fly.api.toml --remote-only
```

There is no `fly.toml`. Always pass `--config`.

PowerShell health check: `curl.exe -sS https://api.sellfindconnect.com/v1/health`
(`curl` is `Invoke-WebRequest` and rejects `-sS`).

## Domains and DNS

Live public names (GoDaddy → Fly):

- `sellfindconnect.com`
- `www.sellfindconnect.com`
- `api.sellfindconnect.com`

`SellFindConnect.com` was purchased on GoDaddy on 2026-06-16. `telpen.net`
nameservers remain `ns33.domaincontrol.com` / `ns34.domaincontrol.com` for
unrelated Telpen DNS. Do not add Railway CNAME/TXT records for `adverts` or
`api.adverts`.

## Persistence

In-memory repositories are the local/test default. Production Fly uses
`PERSISTENCE_DRIVER=prisma` after `deploy/api-release.sh` migrates and seeds.
`GET /v1/health` reports `driver`, `mode`, and `databaseConfigured` without the
URL. Named `live` fail-closes without `DATABASE_URL`. Per-repository `memory`
overrides still win.

Manual commands (only against the intended database):

- `npm run db:validate`
- `npm run db:generate`
- `npm run db:migrate:status`
- `npm run db:migrate:deploy`
- `npm run db:seed`

## Jobs

`.github/workflows/scheduled-jobs.yml` POSTs to
`https://api.sellfindconnect.com/v1/operations/...` with `x-internal-job-key`.
Fly and GitHub must share the same `INTERNAL_JOB_KEY`.

## Paying subscribers

Infra cutover is done. Do not onboard paying subscribers until:

- approved country tax profile
- live `PAYMENT_PROVIDER` / STK review (login phone only)
- finance gates in `docs/FLY_DEPLOYMENT.md`

Native Play / APK remains out of scope until Play Billing exists.

## Historical Railway (do not use)

See `docs/GIT_RAILWAY_RUNBOOK.md` for dead URLs and old project IDs only.
Do not run Railway CLI, do not reconnect the Railway GitHub App, and do not
treat `adverts.telpen.net` as a fallback.
