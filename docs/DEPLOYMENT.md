# Telpen Adverts Deployment Plan

Status: Deployment migration paused; Railway remains current fallback; DigitalOcean is the leading candidate to evaluate after coding completion
Date: 2026-06-15
Last updated: 2026-06-18

## Proposed Production Domains

- Brand domain target: `SellFindConnect.com`
- Web application: `adverts.telpen.net`
- API: `api.adverts.telpen.net`
- API documentation: `api.adverts.telpen.net/docs`

`SellFindConnect.com` is the intended public brand domain and was purchased
through GoDaddy on 2026-06-16. Keep `adverts.telpen.net` as the
internal/technical deployment domain if the Railway plan allows multiple custom
domains on the web service.

## DNS Provider

`telpen.net` currently uses GoDaddy DNS:

- `ns33.domaincontrol.com`
- `ns34.domaincontrol.com`

`SellFindConnect.com` is managed through GoDaddy after purchase on 2026-06-16.

## Deployment Direction

Do not start a new deployment migration now. Finish the core product coding
first, then activate the final production platform before onboarding paying
subscribers.

DigitalOcean is now the leading candidate to evaluate because the first country
launch needs excellent Africa latency and a Cape Town/South Africa deployment
location would be valuable if the required products are available there.

DigitalOcean planning file:

- `docs/DIGITALOCEAN_DEPLOYMENT.md`

Database release readiness now uses checked-in Prisma migrations and repeatable
seed data. Run these root commands only against the chosen target database when
deployment resumes:

- `npm run db:validate`
- `npm run db:generate`
- `npm run db:migrate:status`
- `npm run db:migrate:deploy`
- `npm run db:seed`

Railway remains the current proven fallback/staging deployment because it
already supports and has successfully run:

- Next.js
- NestJS
- PostgreSQL
- Redis
- Monorepo deployments
- Persistent API processes
- Custom domains
- Automatically provisioned and renewed SSL certificates

Keep the Railway deployment available until the final provider is selected,
configured, tested, and DNS cutover is complete.

Official reference:
https://docs.railway.com/networking/public-networking

## Deployment Services

Railway project:

- Project: `telpen-adverts`
- Project ID: `84794ef4-c31c-41cd-8048-089f59040f1f`
- Environment: `production`
- GitHub repository: `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`
- Temporary web URL: `https://web-production-32b7d.up.railway.app`
- Temporary API URL: `https://api-production-ae5f.up.railway.app`
- API documentation: `https://api-production-ae5f.up.railway.app/docs`

GitHub-connected Railway project currently visible to `bucrepinfo@gmail.com`:

- Project: `resplendent-fulfillment`
- Project ID: `42716fff-95b0-4755-b0b2-59faf081eb86`
- Environment: `production`
- Environment ID: `bc3f4b4e-0101-4f70-b346-3df2b8e5405b`
- GitHub repository: `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`
- API service: `@telpen/api`
- API service ID: `99fb3c7e-487c-4a77-ba08-369a83ac7e0d`
- Web service: `@telpen/web`
- Web service ID: `9b5a1466-f105-44e1-a16e-0b5c45f04ace`
- Latest API deployment: `aac5638a-5012-499f-a109-b46637411d81` (`SUCCESS`)
- Latest web deployment: `f09e31bf-e14b-4acb-9293-48e90e4969c2` (`SUCCESS`)
- Advert lifecycle deployment on 2026-06-16:
  - API deployment: `960bafd5-c445-4c6f-90b1-e68181e20162` (`SUCCESS`)
  - Web deployment: `e9b5d4ee-f2f3-4c76-a59b-f3b83065616f` (`SUCCESS`)
- Protected advert lifecycle sweep deployment on 2026-06-16:
  - API deployment: `e0301a63-e739-4eff-af26-c73781aa657c` (`SUCCESS`)
  - Commit: `3453dd3` (`Add protected advert lifecycle sweep`)
  - Web deployment was unchanged because the commit only touched API/docs/env files.
- Finance/tax command slice deployment on 2026-06-17:
  - API deployment: `2187c01e-7204-4660-be68-742ef6ba22bc` (`SUCCESS`)
  - Web deployment: `e4947ac7-018c-4096-a00e-7abbe1bf1595` (`SUCCESS`)
  - Commit: `d848b2e` (`Add finance tax command slice`)
- Finance invoice/receipt continuation on 2026-06-23:
  - Local only; deployment is still paused while core coding continues.
  - Adds protected invoice and receipt finance API commands backed by the
    existing in-memory finance service.
- Finance refund/chargeback/dunning continuation on 2026-06-24:
  - Local only; deployment remains paused.
  - Adds protected refund, chargeback, adjustment listing, dunning run, and
    dunning notice finance API commands backed by the existing in-memory
    finance service.
- Explainable Source Finder deployment on 2026-06-17:
  - API deployment: `c1ace549-e96d-4a97-b564-12cef6161997` (`SUCCESS`)
  - Web deployment: `3ca76bbf-78e2-45cd-8b34-dd0f865eb0ed` (`SUCCESS`)
  - Commit: `e6303f5` (`Add explainable source finder`)
- Lead conversion workflow deployment on 2026-06-17:
  - API deployment: `e339094d-305f-4398-a517-9f021075ae9c` (`SUCCESS`)
  - Web deployment: `2783a9ef-e0a1-4aad-a4be-f4d05e50599d` (`SUCCESS`)
  - Commit: `e970d2a` (`Add lead conversion workflow`)
- Conversation SLA workspace deployment on 2026-06-17:
  - API deployment: `95f24983-4c69-46a0-a610-f2983e467c99` (`SUCCESS`)
  - Web deployment: `d8140bfc-3140-4498-8515-9a1b483a4f37` (`SUCCESS`)
  - Commit: `761ba5d` (`Add conversation SLA workspace`)
- Notification orchestration deployment on 2026-06-18:
  - API deployment: `41529428-eb92-493d-9299-adbc44b504b4` (`SUCCESS`)
  - Web deployment: `07fb8e7e-d991-466f-bab5-7edfde26dece` (`SUCCESS`)
  - Commit: `ca20996` (`Add notification orchestration`)
- Access hierarchy foundation deployment on 2026-06-18:
  - API deployment: `440f6ac0-e7ca-4a26-a8ac-c4d62023df70` (`SUCCESS`)
  - Web deployment: `c03183fa-b11a-40bc-b407-586b3d042eeb` (`SUCCESS`)
  - Commit: `fc509ce` (`Add access hierarchy foundation`)
- Owner onboarding/auth tenancy deployment on 2026-06-18:
  - API deployment: `19de73b0-2c4e-4e60-b78f-66035fca8857` (`SUCCESS`)
  - Web deployment: `f09e31bf-e14b-4acb-9293-48e90e4969c2` (`SUCCESS`)
  - Commit: `79d1f55` (`Add owner onboarding auth slice`)
- Auth persistence boundary hardening deployment on 2026-06-18:
  - API deployment: `39391f4d-9fa3-498f-9eb9-0f63974f1df4` (`SUCCESS`)
  - Web deployment: skipped because no watched web files changed.
  - Commit: `84b0a67` (`Harden auth persistence boundary`)
- Prisma auth repository and session guard deployment on 2026-06-18:
  - API deployment: `aac5638a-5012-499f-a109-b46637411d81` (`SUCCESS`)
  - Web deployment: skipped because no watched web files changed.
  - Commit: `df71904` (`Add Prisma auth repository and session guard`)
- Next.js prerender hardening:
  - Keep `apps/web/src/app/global-error.tsx` and `apps/web/src/app/not-found.tsx`
    committed so Railway/Next does not rely on auto-generated error pages.
  - Keep the web build script forcing `NODE_ENV=production`.

Both production deployments completed successfully on 2026-06-15. The
temporary web URL returned HTTP 200, the API health endpoint returned `ok`, and
the API documentation returned HTTP 200.

The zero-tolerance enforcement update was deployed successfully on 2026-06-15:

- Web deployment: `fbb99e6d-bd9c-4652-b0ee-3ba4d994fe34`
- API deployment: `3dd9fe1d-d5d9-4ff8-b56c-df54e6d1249c`
- Public web verification: zero-tolerance policy catalogue present.
- Public API verification: obfuscated prohibited text returned `BLOCK` with a
  zero-tolerance policy code.

The terms acceptance gate and Railway idle-sleeping update was deployed on
2026-06-16:

- Web deployment: `017aaf0e-3295-47c7-b7e3-716b819ca0ee`
- API sleeping redeploy: `1daa72f5-150f-4437-ad03-b355ea9b9363`
- Web service `sleepApplication`: `true`
- API service `sleepApplication`: `true`
- Railway Serverless/App Sleeping is enabled for both services. Containers
  scale down to zero during idle periods, then Railway queues requests while
  waking the container on traffic.
- Note from latest 2026-06-17 deployment metadata: both GitHub-connected
  service manifests currently report `sleepApplication: false`. Re-enable
  Railway Serverless/App Sleeping in the Railway service settings if the
  setting was reset; the current Railway CLI exposes status/listing but not a
  safe settings mutation command for this flag.
- Local app verification passed for the terms gate: safe drafts stay locked
  until terms are accepted, accepting terms unlocks safe publishing, and adding
  prohibited content locks publishing again.
- Public URL verification from this workstation was blocked by local DNS
  resolution errors for `*.up.railway.app`; Railway deployment manifests show
  both services `SUCCESS` and running.

The production service settings were further optimized on 2026-06-16:

- Web redeploy: `bd15cdb7-7104-4de3-939b-f9715c4563fe`
- API redeploy: `166e93db-1eca-41d5-8d27-9d7824d4de50`
- Web healthcheck path: `/`
- API healthcheck path: `/v1/health`
- Both services still have Railway Serverless/App Sleeping enabled.
- Restart policy remains `ON_FAILURE` with 10 retries, which matches the
  current Railway trial-plan limit.
- Cron schedules are intentionally disabled because serverless services do not
  support cron schedules in this configuration.
- The API exposes a protected lifecycle sweep endpoint for future scheduling:
  `POST /v1/operations/adverts/lifecycle/run` with the `x-internal-job-key`
  header. Configure `INTERNAL_JOB_KEY` before enabling Railway Cron or an
  external scheduler. Run it daily to create day-35/day-39 renewal alerts and
  auto-delete day-40 adverts.
- The API exposes a protected conversation SLA sweep endpoint for future
  scheduling: `POST /v1/operations/conversations/sla/run` with the same
  `x-internal-job-key` header. Run it frequently enough to create due-soon and
  breached response-time alerts.
- The API exposes a protected Source Finder opportunity-alert sweep:
  `POST /v1/operations/source-finder/alerts/run` with the same
  `x-internal-job-key` header. Run it at least daily so DAILY/WEEKLY saved
  searches can emit de-duplicated match alerts.
- The API exposes a protected analytics retention endpoint for future
  scheduling: `POST /v1/operations/analytics/retention/run` with the same
  `x-internal-job-key` header. Start with `dryRun: true`; pass `countryCode`
  for country-scoped policy resolution. Passing `retentionDays` requires an
  `approvalReference`; use overrides only for approved emergency retention
  windows.
- The API exposes a protected analytics rollup endpoint for future scheduling:
  `POST /v1/operations/analytics/rollups/run` with the same
  `x-internal-job-key` header. Start with `dryRun: true`; schedule it after
  raw events settle for the period and pass `tenantId` or `countryCode` when
  rebuilding a narrower slice.
- The API exposes a protected analytics privacy request endpoint:
  `POST /v1/operations/analytics/privacy-requests/run` with the same
  `x-internal-job-key` header. Use `requestType: "ACCESS"` for aggregate
  tenant analytics summaries and `requestType: "ERASURE"` for deletion.
  Erasure defaults to dry-run; pass `dryRun: false` only after approval, and
  keep `rebuildRollups` enabled so aggregate rows are cleaned up after raw
  analytics deletion.
- CDN caching was not enabled yet. The current app will become tenant-aware and
  authenticated, so edge caching should wait until cache-control headers clearly
  separate public static assets from tenant or user-specific pages.
- Under Attack Mode was not enabled because it is an incident-response control,
  not a default production setting.
- Outbound IPv6 was not enabled because the current integrations do not require
  IPv6-only destinations.

The production container images were optimized on 2026-06-16:

- Web optimized-image deployment: `1abfb5e4-f80b-46d8-a840-45006677730f`
- API optimized-image deployment: `daab20f9-411d-463f-8977-bb74593f47be`
- Web now uses Next.js standalone output and runs `node apps/web/server.js`
  inside a runtime-only container.
- API now uses a runtime-only container, installs production dependencies only
  for `@telpen/api` and `@telpen/domain`, and runs `node apps/api/dist/main.js`.
- Docker build context excludes local caches, coverage, TypeScript build info,
  logs, local `dist`, local `.next`, and `node_modules` folders.
- Docker is not installed on the local workstation, so local validation used
  `npm` build/test/typecheck/lint plus Railway Docker builder validation.

The Railway acceptable-use terms and input-guard update was deployed on
2026-06-16:

- Web deployment: `45d70d4c-bc08-42a9-88b3-501a101e8331`
- API deployment: `1e720ddd-fa0d-4e51-882a-e88291b322dd`
- Web deployment status: `SUCCESS`
- API deployment status: `SUCCESS`
- Web keeps healthcheck path `/`, runtime `V2`, Dockerfile
  `deploy/web.Dockerfile`, and Serverless/App Sleeping enabled.
- API keeps healthcheck path `/v1/health`, runtime `V2`, Dockerfile
  `deploy/api.Dockerfile`, and Serverless/App Sleeping enabled.

GitHub source connection status on 2026-06-16:

- Local Git remote is `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`.
- Local `main` is pushed and tracking `origin/main`.
- Railway CLI source connection attempt:
  `railway service source connect --repo Bucrepinfo-lab/sellfindconnect.com --branch main --service web`
- Result: blocked with `User does not have access to the repo`.
- Required next action: authorize the Railway account/GitHub App for the
  `Bucrepinfo-lab` owner or grant the Railway-connected GitHub user access to
  `Bucrepinfo-lab/sellfindconnect.com`.
- Repeated attempts after GitHub-side authorization still returned the same
  access error. If the GitHub App is already installed under `Bucrepinfo-lab`,
  refresh or reconnect GitHub from Railway's source selector/account settings so
  Railway re-reads the installation.
- Historical deployment workaround: Railway CLI local-workspace deploys worked
  before deployment was paused. The root deploy scripts and local
  `@railway/cli` dependency were removed on 2026-06-18 to keep normal installs
  focused on product coding and reduce deploy-only dependency risk.
- If Railway deployment resumes, use a transient or separately installed
  Railway CLI after reviewing `docs/GIT_RAILWAY_RUNBOOK.md`; do not re-add a
  deployment CLI to the application dependency tree without a security review.
- Full runbook: `docs/GIT_RAILWAY_RUNBOOK.md`.

### Web Service

- Workspace: `@telpen/web`
- Dockerfile: `deploy/web.Dockerfile`
- Railway/Nixpacks build command if not using the Dockerfile:
  `npm run build -w @telpen/domain && npm run build -w @telpen/web`
- Equivalent repository script:
  `npm run build:web`
- Watch patterns must include `/packages/domain/**` so domain-package changes
  trigger web rebuilds.
- Public domain: `adverts.telpen.net`
- Health check: `/`
- Environment:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL=https://api.adverts.telpen.net/v1`

### API Service

- Workspace: `@telpen/api`
- Dockerfile: `deploy/api.Dockerfile`
- Railway/Nixpacks build command if not using the Dockerfile:
  `npm run build:api`
- Public domain: `api.adverts.telpen.net`
- Health check: `/v1/health`
- Environment:
  - `NODE_ENV=production`
  - `WEB_ORIGIN=https://adverts.telpen.net`
  - `DATABASE_URL` supplied by the production PostgreSQL service
  - `ANALYTICS_REPOSITORY=prisma` after migrations are deployed

### Data Services

- PostgreSQL for application, tenant, safety, finance, and tax records.
- Redis for caching, queues, rate limits, notifications, and multi-instance
  chat presence fan-out. The API process currently hosts Socket.IO on the same
  HTTP port at `/v1/conversations` with in-memory presence.

## DNS Changes

### Brand Domain Transition

`SellFindConnect.com` has been purchased, but Railway currently blocks adding
it to the `web` service because the Trial plan custom-domain limit has already
been reached by `adverts.telpen.net`.

Preferred path:

1. Upgrade Railway or otherwise increase the custom-domain limit for the web
   service.
2. Add `SellFindConnect.com` as a custom domain on the Railway web service.
3. Copy the exact CNAME/TXT records Railway generates for the new domain.
4. Add those records in GoDaddy DNS for `SellFindConnect.com`.
5. Wait for DNS propagation and Railway certificate issuance.
6. Verify HTTPS on `https://sellfindconnect.com`.
7. Keep `https://adverts.telpen.net` live as the technical fallback.
8. Only switch user-facing links, app metadata, and marketing copy to
   `SellFindConnect.com` after the new domain is verified.

Budget path:

1. Remove or replace `adverts.telpen.net` on the Railway web service.
2. Add `SellFindConnect.com` in the freed custom-domain slot.
3. Use `https://web-production-32b7d.up.railway.app` as the temporary technical
   fallback while the brand domain is verified.
4. Re-add `adverts.telpen.net` later after the Railway plan supports additional
   custom domains.

Railway generated the following exact GoDaddy records:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `adverts` | `iuqqjuwo.up.railway.app` |
| TXT | `_railway-verify.adverts` | `railway-verify=31d6e8c7c1206a194fb272ecc9699572b9d49353af88ecc4fa5ebb249dcfd5eb` |
| CNAME | `api.adverts` | `gguqa2z8.up.railway.app` |
| TXT | `_railway-verify.api.adverts` | `railway-verify=b15f6d0009ed7c462c4461d22bdb2d6eabea807ee96397a7b676b0cb0bf9a320` |

Railway custom-domain registration is complete. GoDaddy DNS login and record
creation are the remaining steps before certificate issuance and public-domain
verification.

## Required Access

- A Railway account authorized to create a project and services.
- Access to the GoDaddy account managing `telpen.net`.
- Access to the GoDaddy account managing `SellFindConnect.com`.
- A billing method if the selected Railway usage exceeds its free trial/credits.
- Railway plan capacity for more than one web-service custom domain, unless
  `adverts.telpen.net` is replaced by `SellFindConnect.com`.

## Verification Checklist

- [x] Railway deployments are healthy.
- [x] API `/v1/health` returns HTTP 200.
- [x] Web app is built with the production API URL.
- CNAME and TXT records resolve publicly.
- HTTPS certificate is active on both domains.
- HTTP redirects to HTTPS.
- [x] CORS is configured for `https://adverts.telpen.net`.
- Profile safety-blocking API works publicly.
- [x] No deployment secrets appear in client-side bundles or repository files.
