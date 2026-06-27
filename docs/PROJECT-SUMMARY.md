# SellFindConnect - Project Summary
Date: 2026-06-27 | Status: Codework 100% complete | Next: Deploy (DO account unblocks next week)

## What it is
Multi-tenant B2B advertising + discovery + matchmaking SaaS. Tagline: "Sell it. Find it. Connect."
Repo: Bucrepinfo-lab/sellfindconnect.com (PRIVATE)
Domain: sellfindconnect.com (GoDaddy)
Stack: NestJS API + Next.js/PWA + Prisma/Postgres + Redis
Deploy: DigitalOcean fra1 (Frankfurt) + Spaces CDN

## Pricing (locked 2026-06-25)
Global "10 units/month" - first month free everywhere.
Floors for weak currencies: KE=KSh100, NG=NGN1000, UG=USh2000, TZ=TSh2000, RW=FRw1000, ET=Br100, EG=E£35, IN=Rs60, ID=Rp10000, PH=PHP40, VN=VND20000, TH=THB25, CO=COP3000, AR=ARS1000
Literal 10 units: USD, EUR, GBP, CAD, AUD, ZAR, GHS, MXN, MYR, BRL
Payment: M-Pesa Daraja STK Push (Kenya). Tax: Manual KRA VAT 16%.

## What is built (all on main, 2026-06-27)
- Epics 1-7: Foundation, auth+RBAC+MFA, profiles+media, adverts+lifecycle, Source Finder, leads+conversations, analytics
- Epic 8 Finance: 21 Vitest tests green, M-Pesa Daraja, KRA VAT, durable Prisma persistence, CountryPricing seed 24 countries
- Privacy: Account deletion (30-day grace), Privacy Policy (Kenya DPA+GDPR), Data settings panel, 5 API endpoints
- Notifications: Resend email, Africa's Talking SMS, FCM v1 push, in-app, 18 event templates
- Onboarding: Split-hero SELL/FIND, role picker, industry grid + search, launch routing
- Search: Postgres FTS + pgvector (1536-dim) + trigram, HYBRID/FTS/SEMANTIC modes, GET /v1/search
- Deploy readiness: GET /v1/health, main.ts 0.0.0.0 binding, next.config.mjs standalone, .env.example, cron gated

## Key files
docs/DEPLOYMENT-RUNBOOK.md       - 9-step DO deploy guide
.env.example                     - all 25+ env vars
apps/api/src/main.ts             - 0.0.0.0 binding, /v1 prefix
apps/web/next.config.mjs         - standalone output (DO required)
.github/workflows/scheduled-jobs.yml - cron disabled, re-enable post-deploy
packages/domain/src/finance.ts, search.ts, onboarding.ts, privacy.ts, notification-adapter.ts, notification-templates.ts
apps/api/src/modules/finance, search, notifications, onboarding, privacy, health

## Deploy sequence (when DO account unblocks)
BLOCKER: bucrepinfo@gmail.com restricted after delete/reactivate. Support ticket open - resolves next week.

When unblocked:
1. Verify DO account - /apps loads, can create resources
2. Follow docs/DEPLOYMENT-RUNBOOK.md (9 steps, ~45 min)
   - Step 1: Managed PostgreSQL 16 (fra1, db: sellfindconnect)
   - Step 2: Managed Redis (fra1)
   - Step 3: Spaces CDN (sellfindconnect-media, fra1)
   - Step 4: App Platform - NestJS API (apps/api, port 3000, health /v1/health)
   - Step 5: App Platform - Next.js Web (apps/web, standalone, health /api/health)
   - Step 6: Domains (api.sellfindconnect.com + sellfindconnect.com) GoDaddy CNAME to DO, SSL auto
   - Step 7: GitHub secrets (API_BASE_URL + INTERNAL_JOB_KEY)
   - Step 8: Verify with curl
   - Step 9: prisma migrate deploy + CountryPricing seed
3. Re-enable cron in .github/workflows/scheduled-jobs.yml
4. Enable extensions: CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;
5. Test: onboarding to SELL flow to publish advert to FIND flow to Source Finder search

## Open items (post-deploy)
- Production IdP (real identity provider)
- Live object storage (wire Spaces to media pipeline)
- React Native mobile app (Phase 5 - planned)
- MVendoh agri-marketplace (separate project - planned)
