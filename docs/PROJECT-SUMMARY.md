# SellFindConnect - Project Summary
Date: 2026-08-22 | Status: Core product coded; Fly.io live; hosted Prisma + scheduled jobs ready to deploy

## What it is
Multi-tenant B2B advertising + discovery + matchmaking SaaS. Tagline: "Sell it. Find it. Connect."
Repo: Bucrepinfo-lab/sellfindconnect.com
Domain: sellfindconnect.com (GoDaddy DNS → Fly.io)
Stack: NestJS API + Next.js/PWA + Prisma/Postgres overlay + Redis-ready
Live host: Fly.io Frankfurt (`fly.web.toml`, `fly.api.toml`) — see `docs/FLY_DEPLOYMENT.md`
Play constraints: `docs/PLAY_STORE.md` (native Android out of scope)

## Pricing (locked)
First month free. From month two, 10 units of the subscriber country's local currency / month, with documented floors for weak currencies.
Payment identity: the verified **login phone is the STK Push phone**. Checkout does not accept a different number.
Web/PWA rails: Stripe and/or Africa's Talking M-Pesa. A Google Play APK would need Play Billing for the SaaS subscription.

## What is built (on GitHub `main`)
- Epics 1-8 vertical slices: auth+RBAC+MFA+phone OTP, profiles+media, adverts+lifecycle, Source Finder, leads+conversations, analytics, finance/tax, notifications
- `PERSISTENCE_DRIVER=prisma` overlay; in-memory remains the test default
- Fly API `release_command` migrates and seeds before flipping the driver
- Product audit for analytics, invoices, and payment writes (no raw phones)
- Privacy policy page + signed-in account deletion API (`/v1/privacy`)
- Health: `GET /v1/health` reports persistence without leaking `DATABASE_URL`
- GitHub Actions scheduled jobs (SLA, media, privacy deletions, finance alerts)

## Live vs `main` (probed 2026-08-22)
- `https://sellfindconnect.com` and `www` → HTTP 200 (Fly, Next.js)
- `/privacy` and `/account/delete` → HTTP 200
- `https://api.sellfindconnect.com/v1/health` → HTTP 200, `sellfindconnect-api`, `persistence.driver: memory`, `databaseConfigured: true`
- Railway temp URLs → 404; `adverts.telpen.net` DNS missing

## Next (do not onboard paying subscribers until)
1. `fly deploy --config fly.api.toml` from Telpen Adverts so migrate/seed run, then confirm `persistence.mode: prisma`
2. Set Fly `INTERNAL_JOB_KEY` and GitHub Actions `API_BASE_URL` / `INTERNAL_JOB_KEY`
3. Smoke-test **Scheduled jobs** via workflow_dispatch after merge to `main`
