# Telpen Adverts Product Memory

Date started: 2026-06-15
Last updated: 2026-11-23
Purpose: Persistent decision log and strategic memory for the Telpen Adverts multi-tenant advertising SaaS.

This file must be updated whenever product strategy, pricing, compliance, architecture, market positioning, or execution decisions change.

## 26/11/26 — Wording: nothing suggests a code is sent (owner: "correct wording even from others")
- The phone sign-in's "Sign in with email instead" link (staff email sign-in, which uses an emailed code and an authenticator) now reads "SellFindConnect staff? Sign in with email", so testers and business owners are not led into a code step.
- Docs: `PLAY-APP-CONTENT-REVIEW.md` (support clears a PIN, no reset code), `PLAY_STORE.md` (no SMS OTP; phone + PIN), and the `issuePhoneVerifiedSession` comment.

## 26/11/26 — Sign-in with no codes at all (owner: "correct the login ... just the way we have agreed")
- A tester was asked for a code: a number with an account but no PIN (opened in the SMS days), or a forgotten PIN, went to "enter the 6-digit reset code". The owner's agreed model (HarvestHub, 25/11/26, now every app): phone, then the person's own 4-digit PIN; nothing sent, nothing typed but the PIN.
- `start`: `pin` · `register` (new number) · `set` (account with no PIN: a 30-minute ticket, then `POST /auth/phone/pin/first` chooses the PIN; refused whenever a PIN exists) · `locked` (5 wrong PINs: "ask support to clear your PIN").
- Support staff (email + authenticator) clear a forgotten/locked PIN with `POST /auth/phone/pin/clear` (MFA staff only, never a staff number); the person then chooses a new one. Removed: `/auth/phone/reset`, `/auth/phone/reset-code`, the reset-code screen.
- No schema change: the first-PIN ticket is stored as a `REGISTRATION_TICKET` row hashed in its own namespace (`phone-first-pin:`), so it can never register and a registration ticket can never set a PIN (tested). The `RESET_CODE` enum value stays in the database, unused.
- Risk the owner accepted for HarvestHub, same here: an account with no PIN can be claimed by whoever first sets one for that number (only SMS-era accounts, or ones support cleared on purpose).

## 26/11/26 — Fonts self-hosted (build no longer needs Google Fonts)
- After PR #111 merged, the main build failed: `next/font/google` could not reach Google Fonts (`queries have exactly one entry`). The rerun passed, but the build should never depend on it. Bricolage Grotesque and Plus Jakarta Sans (OFL-1.1, variable, Latin) now live in `apps/web/src/app/fonts/` and load through `next/font/local`; same CSS variables, same look.

## 26/11/26 — Seen by Google: robots.txt and sitemap.xml
- Audit: sellfindconnect.com, www and api resolve to Fly with Issued certificates; assetlinks live. `/robots.txt` and `/sitemap.xml` were 404. Added `apps/web/src/app/robots.ts` (public pages allowed; api, admin, dashboard, account, onboarding kept out) and `sitemap.ts` (home, subscription, community, terms, privacy, prohibited). Search Console domain property to be verified by a GoDaddy TXT record.

## Current Product Definition

Telpen Adverts is a multi-tenant advertising, discovery, and matchmaking SaaS for web, PWA, Android, and iOS. It is not only a directory or classifieds product. Its market niche is commercial relationship intelligence: helping people quickly find who produces, supplies, buys, consumes, installs, repairs, ships, finances, certifies, or distributes an item or service in a country.

## Locked Decisions

- Pricing: first month free. From month two, charge 10 units of the subscriber country's official local currency per month. Countries using shilling-denominated currencies display this as 10 local shillings.
- Country localization: show selected country flag, country name, local currency, local phone/address formats, and country-specific compliance where practical.
- Hierarchy: global head office, multicontinental/regional office, continental office, country office, tenant account, tenant users.
- Media limit: each profile/listing supports a maximum of 10 images/clips.
- Publishing flow: profiles and listings must support draft, preview, and publish.
- Analytics: include views, most visited, sorted, clicks, inquiries, shares, downloads, posting/uploading date, days live, match performance, and conversion metrics.
- Zero-tolerance categories: weapons, pornography, human trafficking/human trade, child exploitation, illegal drugs, violent extremism, hate/threats, graphic violence/self-harm encouragement, criminal services, counterfeit/stolen goods, illegal wildlife trafficking, platform abuse, spam/scams, intellectual-property abuse, and prohibited infrastructure use are blocked entirely across taxonomy, profiles, listings, media, search, matching, relationship links, chat, payment, and analytics exports.
- Terms gate: publishing, media upload, messaging, paid promotion, and payment enablement require current terms/privacy/subscription/prohibited-policy acceptance. Acceptance never overrides zero-tolerance or hosting-provider acceptable-use blocking. User responsibility and indemnity clauses are required, but Telpen cannot waive non-waivable platform, privacy, tax, consumer, app-store, hosting-provider, or safety duties.
- Finance/tax: paid launch in any country requires an approved country tax profile, tax calculation snapshots for every paid transaction, finance ledger, reconciliation dashboard, remittance calendar, computed VAT/GST/sales tax/DST/withholding/levy alerts, approval workflow, filing/remittance evidence, and exportable tax reports.
- Tax operating model (all five owner products' SaaS subscriptions): this platform stays merchant of record (not Paddle / Lemon Squeezy / Dodo). Kenya first via iTax simplified digital-marketplace VAT or one Kenyan tax representative. Keep STK (login phone) plus Stripe. Rates from the finance module and Stripe Tax. Add EU Non-Union OSS later. See `docs/GROUP_TAX_OPERATING_MODEL.md`.

## Competitive Advantage Strategy

- Build a source-to-customer graph, not just ad listings.
- Make Source Finder a flagship experience: search by item/service and discover producers, suppliers, consumers, likely clients, installers, repairers, transporters, financiers, certifiers, and distributors.
- Use precision matching with explainable reason codes.
- Make trust and safety a competitive asset, especially for app-store approval, payment provider confidence, and serious business adoption.
- Use local country context as a moat: flags, currencies, local terms, local payments, local industry categories, and country-level analysis.
- Use the hierarchy model to sell/administer the platform across countries and continents.
- Let the data moat compound through search behavior, relationship links, inquiries, chat outcomes, and match feedback.

## Product Engines to Preserve in the PRD

- Discovery engine: hybrid search, autocomplete, local synonyms, semantic search, visual/voice search later, and search reason codes.
- Relationship graph engine: structured links between producers, suppliers, consumers, distributors, certifiers, financiers, logistics providers, and service providers.
- Matching and lead intelligence engine: rules for MVP, then vector similarity, graph ranking, feedback loops, match confidence, and next best actions.
- Conversion workspace: lead inbox, RFQs, quote requests, chat assignment, SLA tracking, saved replies, and AI-assisted replies after safety review.
- Trust and safety engine: blocked categories, verification, moderation, reports, malware/media checks, fraud detection, and legal escalation.
- Legal policy engine: versioned terms, privacy, community standards, subscription terms, country addenda, acceptance records, re-acceptance workflows, and audit lookup for disputes or investigations.
- Growth and retention engine: saved searches, alerts, opportunity digests, profile improvement tips, referrals, and notifications.
- Analytics command engine: tenant, country, continent, regional, and global dashboards.
- Finance and tax command engine: country tax profiles, VAT/GST/sales tax/DST/withholding/levy rules, invoices, receipts, tax snapshots, remittance calendar, finance alerts, return workbench, reconciliation, and audit evidence.

## Preferred Technology Direction

- Web: Next.js/React/TypeScript.
- Mobile: React Native with Expo unless the team strongly prefers Flutter.
- Backend: NestJS/TypeScript for MVP speed and shared language.
- Database: PostgreSQL with strict tenant isolation.
- Search: start with Typesense/Meilisearch or managed Algolia depending on budget and launch urgency; evaluate OpenSearch/Elasticsearch for advanced scale and vector search.
- Matching: rules first, then embeddings/vector search, then graph ranking and ML ranking as data grows.
- Chat: custom WebSocket/Socket.IO for MVP or Twilio/Stream-style managed chat if speed and cross-channel support matter more.
- Notifications: FCM, APNs, email, SMS, and WhatsApp where compliant.
- Payments: Stripe where supported, Africa's Talking STK / M-Pesa on the verified login phone, app-store billing where a native listing exists. Merchant-of-record checkouts (Paddle, Lemon Squeezy, Dodo) are forbidden.
- Tax automation: finance-module country tax rules plus Stripe Tax for rates; Kenyan iTax or one tax representative files; EU Non-Union OSS later. Stripe Tax does not become the seller.
- Analytics: event pipeline, warehouse, BI dashboard, product analytics, and exportable reports.
- Safety: moderation queue, media scanning, malware scanning, keyword/synonym libraries, evidence preservation, audit logs, and escalation workflow.
- Observability: Sentry/OpenTelemetry/Prometheus/Grafana or equivalent.
- Local development environment: Docker Desktop with WSL 2 for PostgreSQL, Redis, Meilisearch, and Mailpit; Volta with Node.js 24 LTS to keep runtime versions consistent; DBeaver Community recommended for database inspection.
- Deployment posture: Fly.io Frankfurt (`fra`) is the live production host for
  `sellfindconnect.com`, `www.sellfindconnect.com`, and `api.sellfindconnect.com`.
  DigitalOcean App Platform remains a documented candidate. Historical Railway
  URLs and `adverts.telpen.net` no longer serve this product. Do not onboard
  paying subscribers until the live Fly image matches `main`, persistence health
  is configured, and scheduled jobs run.
- Login phone = STK Push phone: the verified E.164 number used for SMS OTP is
  the only Africa's Talking / M-Pesa checkout destination. Checkout must not
  accept a different payer phone. Google Play listings, if ever submitted, must
  use Play Billing for the digital SaaS subscription (`docs/PLAY_STORE.md`).
- Production domains: `SellFindConnect.com`, `www.SellFindConnect.com`, and
  `api.SellFindConnect.com` are the live public surfaces.
- Recommended market domain portfolio: buy `SellFindConnect.com` first; also buy `SellFindConnect.app`, `FindSellConnect.com`, and `FindSellConnect.app` as defensive/app companions if budget allows. Campaign line: "Sell it. Find it. Connect."
- SEO/growth direction: position Sell Find Connect around supplier finder, buyer-seller connection, business advertising app, source finder, local business directory, B2B marketplace, and country/industry business matching. Growth should combine organic SEO, country/industry landing pages, app-store optimization, social video demos, partnerships, referrals, opportunity digests, and safety/trust positioning.
- GitHub repository: use `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git` as the source repository for the Sell Find Connect codebase and future production deployments after the final platform decision.
- Owner portfolio (five products, five Desktop folders). This Cloud Agent
  environment mounts only `github.com/Bucrepinfo-lab/sellfindconnect.com`.
  `.cursor/environment.json` sets `repositoryDependencies` to an empty list.
  Telpen Edu and its Play Store conversation stay in their previous separate
  session and environment. Do not clone that project or continue that session
  from here. The owner's Windows Desktop is not visible here. Folder names as
  given on 2026-08-21:

  | Product | Desktop folder | GitHub today |
  | --- | --- | --- |
  | Sell Find Connect / Telpen Adverts | this repo | `Bucrepinfo-lab/sellfindconnect.com` (write works) |
  | InsurOS | `insurance` | `Bucrepinfo-lab/InsurOS` exists but is a stub README only |
  | Telpen Edu | `telpen-edu` | no GitHub repo under `Bucrepinfo-lab` |
  | Stawi | `Mvendoh` | `Bucrepinfo-lab/Stawi` exists; Cursor push is 403. An older Desktop `Chamaa App` snapshot was already consolidated into that repo. |

  Do not invent remotes for `telpen-edu` or `Mvendoh`. The locked SaaS
  subscription tax model for all five is in `docs/GROUP_TAX_OPERATING_MODEL.md`.
  Paste that file's copy blocks into InsurOS, Telpen Edu, and Stawi on Desktop.

## Open Decisions

- Whether native apps are required on day one or whether web + PWA launches first.
  Current delivery is web + PWA. A Play listing is blocked on Play Billing, durable
  account deletion, and the SMS-permission rules in `docs/PLAY_STORE.md`.
- Which countries need fallback pricing because provider/app-store minimums prevent exactly 10 local currency units.
- Which launch countries require specific legal reporting channels for child safety, trafficking, weapons, drugs, or violent extremist content.
- Whether to include public reviews in MVP or Phase 2.
- Whether to use managed search/chat/analytics providers for speed or self-hosted/open-source components for control.
- Which accounting system the finance module must export to or integrate with.
- Named Country Finance Admin and external Kenyan tax advisor (iTax contact).
  This is a remote role (owner + local tax agent), not a requirement to travel
  or incorporate in that country.
- Approved fallback process where Stripe Tax does not support a country or tax type
  (finance-module rules remain the fail-closed rate source).

## Decision Log

- 2026-11-18: Repriced (owner, "Agreed, go ahead and fix"): Basic KES 499/month or KES 4,990/year; Pro (more media, Source Finder priority, RFQs) KES 1,499/month or KES 14,990/year; first month free; a year ahead = 10 months; founding price locked for tenants that start in the first 12 months while subscribed (CANCELED ends it); other countries indicative until approved; tax-inclusive per the tax profile. Supersedes the 2026-06-15 10-unit rule. Code: `packages/domain/src/subscription-pricing.ts` (`quoteSubscription`) + tests; Kenya `monthlySubscriptionAmount` 499; the Prisma tenant mapping now takes the price from the domain list, not the seeded country column (no DB change). Pro entitlements (media limit, priority, RFQs) are NOT built yet and Pro is not shown publicly. Env after launch: `SFC_FOUNDING_UNTIL`; later prices for new tenants `SFC_PRICES="KE:599/1799"`. `subscriptionTermsVersion` not bumped (forces re-acceptance; owner's call).
- 2026-10-25: Adopted the owner standing rules from Telpen Edu (24/10/26) in `docs/STANDING_RULES.md`: live stays live (fix forward), fix once / fix everywhere, escalate-don't-fix in protected areas (payments, finance/tax, auth/MFA/tenancy, safety/policy, tax-profile approvals, database, deploy config, secrets) or after three failed attempts, never weaken a test, merge only green at the exact head SHA, money human-authorised only, per-country currency/wording/clock. New `health-audit-guard` workflow enforces the escalation rule on `fix/health-audit-*` PRs (read-only, `pull_request_target`).
- 2026-10-13: Added a manual `Deploy API (Fly.io)` GitHub workflow (workflow_dispatch only) running the runbook command `fly deploy --config fly.api.toml --remote-only` with a FLY_API_TOKEN deploy token and a post-deploy /v1/health check. Production deploys stay a deliberate human action; this replaces running flyctl from a laptop.
- 2026-10-13: Added opt-in AI match explanations to Source Finder (`POST source-finder/explain`). Provider-neutral like the embeddings/payment/tax adapters: the default build returns the deterministic template built from the matcher's own reason codes (zero cost, no key); the Anthropic overlay (`MATCH_EXPLANATION_PROVIDER=anthropic`, cheapest tier `claude-haiku-5-5`) is opt-in, fails closed without a key, re-screens every model output through the zero-tolerance safety core, and falls back to the template on any failure. Cost is incurred only when a searcher asks for an explanation.
- 2026-06-15: Created PRD for multi-tenant advertising SaaS with web and downloadable mobile app requirements.
- 2026-06-15: Locked local pricing rule: first month free, then 10 units of each subscriber country's local currency per month. (Superseded 2026-11-18.)
- 2026-06-15: Added zero-tolerance blocked categories covering weapons, pornography, human trafficking/human trade, child exploitation, illegal drugs, violent extremism, hate/threats, graphic violence/self-harm encouragement, criminal services, counterfeit/stolen goods, and illegal wildlife trafficking.
- 2026-06-15: Defined competitive niche as commercial relationship intelligence, centered on Source Finder, precision matching, relationship graph, trust/safety, country localization, and hierarchy analytics.
- 2026-06-15: Expanded key risks into an operational risk register and locked a complete finance/tax module covering country tax profiles, VAT/GST/sales tax/DST/withholding/levy computation, remittance calendars, timed finance alerts, reconciliation, approval workflow, filing evidence, and tax reports.
- 2026-06-15: Selected Docker Desktop with WSL 2 and Volta/Node.js 24 LTS as the recommended executable development environment. Added PostgreSQL, Redis, Meilisearch, and Mailpit local services.
- 2026-06-15: Began implementation with a Next.js/NestJS/Prisma TypeScript monorepo, Source Finder dashboard, shared industry/geography data, zero-tolerance safety validation, tenant-scoped profile draft API, finance/tax database entities, and Docker Compose service definitions.
- 2026-06-15: Prepared the production deployment plan for `adverts.telpen.net` and `api.adverts.telpen.net`; confirmed GoDaddy DNS and selected Railway as the recommended initial host, pending Railway and GoDaddy sign-in.
- 2026-06-15: Created the Railway project `telpen-adverts` with separate `web` and `api` services and added deterministic Node.js 24 Dockerfiles for both services.
- 2026-06-15: Deployed the web and API services successfully to Railway. Verified the temporary web URL with HTTP 200, API health status `ok`, and live API documentation.
- 2026-06-15: Registered `adverts.telpen.net` and `api.adverts.telpen.net` as Railway custom domains. Railway generated exact CNAME and TXT verification records; GoDaddy DNS record creation remains pending account sign-in.
- 2026-06-15: Aligned the highlighted zero-tolerance policy with executable controls. Expanded the shared prohibited-content catalogue, added obfuscation-resistant and recursive field checks, blocked prohibited Source Finder searches, disabled publishing for unsafe drafts, and exposed consistent public category summaries in the advertiser interface.
- 2026-06-15: Deployed the aligned zero-tolerance controls to Railway web deployment `fbb99e6d-bd9c-4652-b0ee-3ba4d994fe34` and API deployment `3dd9fe1d-d5d9-4ff8-b56c-df54e6d1249c`. Verified the public web policy panel and a production API `BLOCK` decision for obfuscated prohibited text. Media, audio, OCR, attachment, and link scanning remain mandatory launch gates before those upload or messaging surfaces are enabled.
- 2026-06-16: Added the first web terms-and-conditions gate. Publish is locked until terms are accepted and a safe draft is present; prohibited content remains blocked even after terms acceptance. Updated the PRD/backlog with legal responsibility, indemnity, non-waivable platform duties, versioned acceptance records, and policy re-acceptance requirements.
- 2026-06-16: Enabled Railway Serverless/App Sleeping for both production services. Web deployment `017aaf0e-3295-47c7-b7e3-716b819ca0ee` and API redeploy `1daa72f5-150f-4437-ad03-b355ea9b9363` both report `sleepApplication: true` and `SUCCESS` in Railway. Local browser verification passed for the terms gate; this workstation still cannot resolve `*.up.railway.app` DNS directly.
- 2026-06-16: Optimized Railway production service settings by adding healthcheck paths. Web redeploy `bd15cdb7-7104-4de3-939b-f9715c4563fe` uses `/`; API redeploy `166e93db-1eca-41d5-8d27-9d7824d4de50` uses `/v1/health`. Kept Serverless/App Sleeping on, kept restart policy at `ON_FAILURE` with 10 retries, and intentionally left CDN caching, Under Attack Mode, cron schedules, and outbound IPv6 off until the product has the required cache, incident-response, schedule, or integration need.
- 2026-06-16: Optimized production container images. Web deployment `1abfb5e4-f80b-46d8-a840-45006677730f` uses Next standalone output in a runtime-only container. API deployment `daab20f9-411d-463f-8977-bb74593f47be` uses a runtime-only container with production dependencies scoped to `@telpen/api` and `@telpen/domain`. Docker build context now excludes local caches, coverage, TypeScript build info, local build output, logs, and `node_modules`.
- 2026-06-16: Completed domain-name research around "sell it", "find it here", and "connect". Recommended `SellFindConnect.com` as the primary domain because it is memorable, descriptive, campaign-ready, and directly matches the platform promise. RDAP checks returned 404/not found signals for `SellFindConnect.com`, `SellFindConnect.app`, `FindSellConnect.com`, and `FindSellConnect.app`; trademark review is still required before public launch.
- 2026-06-16: Started and completed the GoDaddy purchase flow for `SellFindConnect.com`. The cart was changed from 3 years to 1 year at the owner's request. Before payment, GoDaddy showed 1-year domain registration plus Full Domain Protection for a subtotal of GBP 17.98 before taxes/fees; domain registration alone was shown as GBP 9.99 and renewal in June 2027 as GBP 18.99.
- 2026-06-16: Attempted to add `sellfindconnect.com` to the Railway `web` service. The local Railway CLI domain mutation was blocked by authorization refresh, and the Railway web UI showed the Trial-plan custom-domain limit is already reached by `adverts.telpen.net`. Next decision: upgrade Railway/increase custom-domain capacity to keep `adverts.telpen.net` as fallback, or replace `adverts.telpen.net` with `SellFindConnect.com` and use the Railway-provided URL as the temporary technical fallback.
- 2026-06-16: Added the Sell Find Connect SEO and growth strategy. Core marketable keyword themes include supplier finder, product sourcing, find customers, advertise business online, business directory app, B2B marketplace, buyer-seller connection app, country business directory, industry business matching, and commercial relationship intelligence. Growth channels include SEO landing pages, app-store optimization, social video, partnerships, referrals, opportunity digests, press, and trust/safety marketing.
- 2026-06-16: Configured the local Git remote as `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`, created the initial `main` commit for the Sell Find Connect platform, and prepared it for Railway GitHub deployment.
- 2026-06-16: Pushed local `main` to `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git`. Attempted to connect Railway web service source with `railway service source connect --repo Bucrepinfo-lab/sellfindconnect.com --branch main --service web`, but Railway returned `User does not have access to the repo`. The remaining blocker is GitHub/Railway authorization for the `Bucrepinfo-lab` repo owner.
- 2026-06-16: Repeated Railway source connection attempts after GitHub App authorization changes still returned `User does not have access to the repo`. Likely cause: Railway's connected GitHub identity/workspace has not refreshed against the `Bucrepinfo-lab` installation, or the Railway App was installed for a different GitHub account/owner than the Railway-connected identity. Next action is to reconnect GitHub from Railway's account/source selector after confirming the Railway App is installed under `Bucrepinfo-lab` with access to `sellfindconnect.com`.
- 2026-06-16: Polished the web terms gate and shared input guard to align with Railway-style acceptable-use restrictions. Added executable blocking for platform abuse, spam/scams, intellectual-property abuse, and prohibited infrastructure use, including phishing, malware, DDoS, botnets, unauthorized access, spam, abusive scraping, piracy, crypto mining, torrenting, proxies/anonymizers, and compute resale. Updated PRD, backlog, security notes, tests, and product memory accordingly.
- 2026-06-16: Deployed the Railway acceptable-use terms and input-guard update. Web deployment `45d70d4c-bc08-42a9-88b3-501a101e8331` and API deployment `1e720ddd-fa0d-4e51-882a-e88291b322dd` both completed with `SUCCESS` in Railway while keeping Serverless/App Sleeping enabled.
- 2026-06-16: Diagnosed push/deployment friction. GitHub push requires approved network/auth flow from this desktop environment, while Railway GitHub source connection fails because Railway's connected GitHub installation does not have access to `Bucrepinfo-lab/sellfindconnect.com`. Added durable Railway CLI deployment scripts and `docs/GIT_RAILWAY_RUNBOOK.md` so production deploys can proceed reliably from the local workspace until GitHub autodeploy access is fixed.
- 2026-06-16: Standardized Railway-safe workspace build commands. The web service must build `@telpen/domain` before `@telpen/web` because the web app resolves compiled domain exports from `packages/domain/dist`; use `npm run build:web` or the expanded `npm run build -w @telpen/domain && npm run build -w @telpen/web` in Railway's build-command field when not using the checked-in Dockerfile. The API service uses `npm run build:api`.
- 2026-06-16: Railway's config preview returned an unsafe delete-services plan, so it was not applied. Added a stronger repository-level guard instead: the `@telpen/web` workspace build script now builds `@telpen/domain` before `next build`, and the `@telpen/api` build script builds `@telpen/domain` plus generates the database client before `nest build`. This makes Railway's auto-detected workspace commands safe even before dashboard build-command settings are corrected.
- 2026-06-16: Deployed the self-sufficient web workspace build fix to Railway. Web deployment `76cf2156-dff3-4a87-8589-0034278ece27` completed with `SUCCESS`, confirming the deployment path no longer fails when the web build needs `@telpen/domain` compiled first.
- 2026-06-16: Updated Railway web-service dashboard settings so the build command compiles `@telpen/domain` before `@telpen/web`, and added `/packages/domain/**` to watch patterns so shared domain-package changes trigger web rebuilds.
- 2026-06-16: Started Epic 7 analytics implementation. Added shared analytics event/consent models, a Prisma `AnalyticsEvent` schema, tenant-scoped analytics API endpoints for event capture and summaries, safety blocking for analytics metadata, and a web Analytics Command panel showing most visited, sorted, click rate, enquiries, shares, downloads, and average age.
- 2026-06-16: Railway GitHub deployment for the new web project compiled `@telpen/domain` correctly, then exposed a separate non-standard `NODE_ENV` issue during Next.js prerendering. Added `cross-env` and forced `NODE_ENV=production` for the web build script so Railway and Windows builds use the same production mode.
- 2026-06-16: Railway CLI is now authenticated as `bucrepinfo@gmail.com` and linked locally to the GitHub-connected project `resplendent-fulfillment` (`42716fff-95b0-4755-b0b2-59faf081eb86`) in production (`bc3f4b4e-0101-4f70-b346-3df2b8e5405b`). Active services are `@telpen/api` (`99fb3c7e-487c-4a77-ba08-369a83ac7e0d`) and `@telpen/web` (`9b5a1466-f105-44e1-a16e-0b5c45f04ace`), both sourced from `Bucrepinfo-lab/sellfindconnect.com`.
- 2026-06-16: Deployed the analytics vertical slice successfully through Railway GitHub autodeploy. API deployment `c3478884-b803-4d8a-be05-ceeb7e67c6e6` is `SUCCESS` on commit `b199a8f`; web deployment `6a837a7e-b421-408c-b804-520b26a3f0f9` is `SUCCESS` on commit `a32fb88`.
- 2026-06-16: Added the advert/post lifecycle requirement and MVP implementation: every advert lives for 40 days unless renewed, renewal alerts are generated on days 35 and 39, and expired adverts are auto-deleted on day 40. Added shared lifecycle policy logic, tenant-scoped advert lifecycle API, notification schema fields, tests, and web lifecycle indicators. Durable scheduler/queue persistence remains the next hardening step.
- 2026-06-16: Deployed the 40-day advert lifecycle feature through Railway GitHub autodeploy. API deployment `960bafd5-c445-4c6f-90b1-e68181e20162` and web deployment `e9b5d4ee-f2f3-4c76-a59b-f3b83065616f` both completed with `SUCCESS`.
- 2026-06-16: Confirmed the intermittent Next.js prerender failure on generated error-boundary pages is mitigated by explicit `apps/web/src/app/global-error.tsx` and `apps/web/src/app/not-found.tsx` files, plus the forced `NODE_ENV=production` web build. Local web build and lint pass with these hardening files present.
- 2026-06-16: Added a protected internal operations endpoint for advert lifecycle sweeps: `POST /v1/operations/adverts/lifecycle/run`, guarded by `x-internal-job-key` and `INTERNAL_JOB_KEY`. This prepares Railway Cron or an external scheduler to run day-35/day-39 renewal alerts and day-40 auto-deletion daily once the durable repository/scheduler is enabled.
- 2026-06-16: Deployed the protected advert lifecycle sweep through Railway GitHub autodeploy. API deployment `e0301a63-e739-4eff-af26-c73781aa657c` completed with `SUCCESS` on commit `3453dd3`; the web deployment was unchanged because no watched web files changed.
- 2026-06-17: Started Epic 8 finance/tax implementation. Added shared configured-rate tax calculation helpers, a tenant-scoped finance API for country tax profiles, effective-dated rules, immutable tax snapshots, ledger entries, draft tax returns, and timed remittance alerts, plus a web Finance Readiness panel. This does not hard-code live country tax rates; country finance admins must approve rule configuration before paid launch.
- 2026-06-17: Deployed the Epic 8 finance/tax command slice through Railway GitHub autodeploy. API deployment `2187c01e-7204-4660-be68-742ef6ba22bc` and web deployment `e4947ac7-018c-4096-a00e-7abbe1bf1595` both completed with `SUCCESS` on commit `d848b2e`.
- 2026-06-17: Started Epic 5 Source Finder implementation. Added shared rules-based ranking with explainable reason codes, sort modes, relationship links, and pilot graph records; exposed `POST /v1/source-finder/search`; and updated the web Source Finder to show match reasons and related supplier/buyer/service links. Prohibited searches remain blocked server-side and client-side.
- 2026-06-17: Deployed the explainable Source Finder slice through Railway GitHub autodeploy. API deployment `c1ace549-e96d-4a97-b564-12cef6161997` and web deployment `3ca76bbf-78e2-45cd-8b34-dd0f865eb0ed` both completed with `SUCCESS` on commit `e6303f5`.
- 2026-06-17: Started Epic 6 matching and lead conversion. Added shared lead intelligence for confidence, priority, response SLA, and next-best actions; exposed lead APIs for match feedback, terms-gated inquiries/RFQs, lead inbox, and lead status updates; and added a web Lead Conversion panel. Realtime chat, assignment, notifications, and durable lead persistence remain next.
- 2026-06-17: Deployed the lead conversion workflow through Railway GitHub autodeploy. API deployment `e339094d-305f-4398-a517-9f021075ae9c` and web deployment `2783a9ef-e0a1-4aad-a4be-f4d05e50599d` both completed with `SUCCESS` on commit `e970d2a`.
- 2026-06-17: Continued Epic 6 into the messaging/SLA phase. Added shared conversation states, saved replies, SLA decisions, tenant-scoped conversation APIs for safe terms-gated chat, assignment, notifications, SLA checks, Prisma conversation/message/notification models, and a web Conversation Workspace. Live websocket delivery, read receipts, typing/presence, attachments, provider-backed delivery, audit logs, and repository persistence remain next.
- 2026-06-17: Deployed the conversation SLA workspace through Railway GitHub autodeploy. API deployment `95f24983-4c69-46a0-a610-f2983e467c99` and web deployment `d8140bfc-3140-4498-8515-9a1b483a4f37` both completed with `SUCCESS` on commit `761ba5d`. Latest deployment metadata reports `sleepApplication: false` for both services, so Railway Serverless/App Sleeping should be re-enabled in the service settings if the toggle was reset.
- 2026-06-18: Started the notification orchestration phase. Added consent-aware notification delivery planning for in-app, email, SMS, push, and WhatsApp; tenant notification preferences; an API outbox; database models for preferences/outbox/delivery attempts; a protected all-tenant conversation SLA sweep endpoint; and a web Notification Delivery readiness panel. Actual provider adapters and durable repositories remain next.
- 2026-06-18: Deployed notification orchestration through Railway GitHub autodeploy. API deployment `41529428-eb92-493d-9299-adbc44b504b4` and web deployment `07fb8e7e-d991-466f-bab5-7edfde26dece` both completed with `SUCCESS` on commit `ca20996`.
- 2026-06-18: Started Epic 2 access foundation. Added shared hierarchy/RBAC rules for global, regional, continental, country, and tenant scopes; MFA-required role decisions; access evaluation/audit API; web Hierarchy Access controls; and database models for MFA state, access assignments, and access decision audit evidence. Production auth/session provider and database-backed guards remain next.
- 2026-06-18: Deployed the access hierarchy foundation through Railway GitHub autodeploy. API deployment `440f6ac0-e7ca-4a26-a8ac-c4d62023df70` and web deployment `c03183fa-b11a-40bc-b407-586b3d042eeb` both completed with `SUCCESS` on commit `fc509ce`.
- 2026-06-18: Started the owner onboarding/auth tenancy slice. Added shared password/trial/terms evidence helpers, an MVP auth API for tenant-owner registration, PBKDF2 password hashing, login sessions, MFA verification, tenant-session checks, database auth/session/terms evidence models, and a web Owner Onboarding readiness panel. Production identity provider, email verification, password reset, real OTP/authenticator MFA, invite flows, session-backed route guards, and database repositories remain next.
- 2026-06-18: Deployed the owner onboarding/auth tenancy slice through Railway GitHub autodeploy. API deployment `19de73b0-2c4e-4e60-b78f-66035fca8857` and web deployment `f09e31bf-e14b-4acb-9293-48e90e4969c2` both completed with `SUCCESS` on commit `79d1f55`.
- 2026-06-18: Continued Epic 2 persistence hardening. Added an auth repository interface plus in-memory adapter, refactored AuthService behind the repository boundary, and changed session lookup to use SHA-256 token hashes so raw bearer tokens are only returned at issuance. Prisma-backed repository wiring remains the next persistence step.
- 2026-06-18: Deployed the auth persistence boundary hardening through Railway GitHub autodeploy. API deployment `39391f4d-9fa3-498f-9eb9-0f63974f1df4` completed with `SUCCESS` on commit `84b0a67`; the web deployment skipped because no watched web files changed.
- 2026-06-18: Continued the Prisma/session guard phase. Added an opt-in Prisma auth repository selected by `AUTH_REPOSITORY=prisma`, added explicit API Prisma dependencies and Docker generated-client copy support, converted AuthService to async repository operations, and added a reusable tenant session guard that validates `x-session-token` against `x-tenant-id` and requires MFA. Controller-by-controller migration to the strict guard remains next.
- 2026-06-18: Deployed the Prisma auth repository and session guard phase through Railway GitHub autodeploy. API deployment `aac5638a-5012-499f-a109-b46637411d81` completed with `SUCCESS` on commit `df71904`; the web deployment skipped because no watched web files changed.
- 2026-06-18: Paused the new deployment migration process at the owner's direction so the team can finish core coding work first. DigitalOcean is now the leading candidate to evaluate before subscriber onboarding because a Cape Town/South Africa deployment location may provide better first-country launch latency. Removed the active Render blueprint direction from the current working head and added `docs/DIGITALOCEAN_DEPLOYMENT.md` as the deployment candidate runbook. Railway remains the current proven fallback/staging deployment.
- 2026-06-18: Continued database readiness without deployment. Added a checked-in baseline Prisma migration, repeatable migration/status scripts, and a seed workflow that loads continents, pilot country configuration, and industry categories from the shared domain package. Hosted migration/seed execution remains paused until the final deployment platform is selected.
- 2026-06-18: Continued sanitising and security hardening without deployment. Removed the local Railway CLI dependency and root deploy scripts while deployment is paused, added shared input sanitisation helpers, wired a global API sanitising pipe before validation, tightened URL validation to HTTP/HTTPS only, prevented validation errors from echoing submitted values, and hardened recursive safety checks against cyclic or deeply nested payloads. npm audit remains partially blocked by latest NestJS, Next.js, and Prisma transitive advisories until upstream packages publish patched release lines.
- 2026-06-18: Continued tenant-route hardening without deployment. Migrated profile draft/preview routes and advert listing/lifecycle routes from temporary `x-tenant-id` header trust to the MFA-verified tenant session guard, and added OpenAPI documentation for the required `x-session-token` header. Remaining tenant modules still need the same strict-guard migration.
- 2026-06-18: Continued tenant-route hardening without deployment. Migrated lead conversion and conversation/chat routes from temporary `x-tenant-id` header trust to the MFA-verified tenant session guard, covering match feedback, inquiry/RFQ, lead inbox, lead status, conversation, message, assignment, notification, and SLA endpoints.
- 2026-06-18: Completed the current tenant-controller guard migration without deployment. Migrated Source Finder, notification, analytics, and finance routes to the MFA-verified tenant session guard, added required session-token API documentation, and removed the obsolete header-only tenant context guard. Production identity provider, real MFA provider, invite flows, and hosted Prisma enablement remain future hardening work.
- 2026-06-18: Continued auth hardening without deployment. Replaced the fixed MFA verification code with generated six-digit challenge codes that are stored only as session-scoped hashes, expire after 10 minutes, lock after repeated failures, and can be persisted through the Prisma auth repository. Non-production can display the development code for local testing; production provider-backed email/SMS/authenticator delivery remains future work.
- 2026-06-18: Continued account security hardening without deployment. Added hashed, expiring account challenges for email verification and password reset, exposed request/confirm auth endpoints, and made completed password resets revoke active user sessions. Non-production can display development tokens for local testing; production email delivery remains future work.
- 2026-06-18: Continued tenant access hardening without deployment. Added MVP tenant invite tokens so MFA-verified owners can invite non-owner tenant roles, invite acceptance creates a verified invited user with terms evidence and role-aware membership, and invited users receive role-aware sessions. Existing-account invite linking and production email delivery remain future work.
- 2026-06-19: Continued auth audit hardening without deployment. Added repository-backed audit logs for owner registration, login success/failure, email verification, password reset, MFA success/failure, tenant invite creation, and tenant invite acceptance, with an owner/MFA-protected tenant audit lookup endpoint. Audit metadata avoids raw secrets, tokens, MFA codes, invite links, and raw email addresses.
- 2026-06-19: Continued tenant invite hardening without deployment. Existing accounts can now accept tenant invites only when they provide an active session for the same invited user, creating a role-aware membership and terms evidence without duplicating the user account.
- 2026-06-19: Continued Epic 3 profile publishing without deployment. Added tenant-session protected profile publish/live/history routes, in-memory draft-to-live profile versioning, previous-live archiving, days-live tracking, and profile publish audit evidence. Durable Prisma profile repositories, edit/update endpoints, terms re-acceptance at publish, and moderation review gates remain next.
- 2026-06-19: Continued Epic 3 profile persistence without deployment. Added a profile repository boundary with in-memory default storage and opt-in Prisma persistence through `PROFILE_REPOSITORY=prisma`, including persisted source-draft linkage for published profiles. Profile edit/update endpoints, terms re-acceptance at publish, moderation review gates, and media/contact enrichment remain next.
- 2026-06-19: Continued Epic 3 profile edit and publish control without deployment. Added tenant-session protected draft editing, edit audit evidence, publish-time request and stored current-terms checks, and review-pending gates for high-risk industry, role, or country changes. Moderator approval workflow, richer review reason persistence, service-area fields, and media/contact enrichment remain next.
- 2026-06-19: Continued Epic 3 profile review workflow without deployment. Added persisted profile review reasons, review-request timestamps, approve/reject decisions, review notes, reviewed-by metadata, an MVP owner/admin pending-review queue, and publish blocking for rejected drafts. Platform-level moderator access and richer review case management remain next.
- 2026-06-19: Continued Epic 3 profile enrichment without deployment. Added optional WhatsApp, physical address, map URL, social/contact links, structured service-area coverage, preview exposure, safety checks for nested enrichment fields, Prisma persistence, and live publish carry-over. Platform-level moderator access, media upload/display, and richer review case management remain next.
- 2026-06-19: Continued Epic 3 platform moderation without deployment. Added MFA-required `MODERATE_CONTENT` platform access sessions backed by access assignments, country/tenant-scoped pending profile review filtering, platform profile review endpoints, shared review decision persistence, and access-decision audit writes. Media upload/display and richer review case management remain next.
- 2026-06-19: Continued media upload/display foundation without deployment. Added shared media policy, profile draft media metadata routes, current-terms enforcement for authenticated media upload, 10-item display cap, metadata safety checks, preview media slots, Prisma `MediaAsset` persistence, and publish-time media carry-over into live profiles. Provider upload URLs, malware scanning, CDN transforms, video transcoding, listing media, and richer review case management remain next.
- 2026-06-19: Continued the profile media provider foundation without deployment. Added provider-neutral upload preparation, storage/moderation/CDN transform adapter hooks, and persisted provider object keys, CDN URLs, transform status, and variant metadata for profile media. Real object-storage credentials/signed URLs, provider malware/media scanning, background media workers, listing media, and richer review case management remain next.
- 2026-06-19: Continued Listing and Media without deployment. Promoted media adapters into a shared API media foundation, then added advert media upload preparation, media attach/list routes, ten-item display slots, safety/moderation/transform handling, tenant audit hooks, and advert-media auto-archive when day-40 advert auto-deletion runs. Persisted advert repositories, draft/preview advert versions, provider-backed storage/scanning workers, and richer review case management remain next.
- 2026-06-19: Continued media provider hardening without deployment. Added S3-compatible presigned PUT upload support using env-configured Signature V4 signing, plus shared media processing job contracts for malware scan, content moderation, image transform, and video transcode work. Added `docs/MEDIA_PIPELINE.md` with storage env vars and upload/worker contracts. Live object-storage credentials, durable queues, provider scanners, and media workers remain next.
- 2026-06-19: Continued durable media worker readiness without deployment. Added a Prisma/PostgreSQL media processing job outbox selected with `MEDIA_JOB_QUEUE_DRIVER=prisma`, database migration/model support, and worker claim/complete/retry/fail lifecycle methods so scan/transform jobs survive API restarts. Provider-backed scanners, image/video worker entrypoints, CDN publication, and live storage credentials remain next.
- 2026-06-19: Continued media worker execution without deployment. Added a shared `MediaModule`, development media job processors, a `MediaWorkerService`, and the protected `POST /v1/operations/media/processing/run` endpoint so internal workers can claim persisted scan/transform jobs and mark them succeeded, retryable, or failed. Real provider scanners/transcoders, media asset result publication, unsafe-media escalation, and live credentials remain next.
- 2026-06-20: Continued provider-backed media processing without deployment. Added generic HTTP processor adapters for malware scan, content moderation, image transform, and video transcode endpoints, plus Prisma media asset result publication so completed/final worker jobs update moderation state, blocked fail-closed state, transform status, CDN URLs, thumbnails, and responsive variants. Approved live vendors, CDN publication verification, unsafe-media escalation, and live credentials remain next.
- 2026-06-20: Continued unsafe-media escalation without deployment. Added durable Prisma `MediaReviewCase` records and migration, plus escalation drafting from media result publication so blocked/final-failed scan, moderation, image, or video jobs open severity-ranked review cases with source job, provider, reason, media reference, and evidence. Moderator assignment/resolution actions, country/legal escalation playbooks, and live provider credentials remain next.
- 2026-06-20: Continued media moderation operations without deployment. Added a protected platform media review API with scoped case listing, confirmed-block/restored/escalated/dismissed resolution actions, unsafe moderator-note blocking, Prisma and in-memory review-case repositories, and tenant audit evidence for moderator decisions. Moderator assignment queues, country/legal escalation playbooks, live provider credentials, and user-facing review status remain next.
- 2026-06-20: Continued advert persistence without deployment. Added in-memory and Prisma advert repositories, Prisma `AdvertDraft`, `PublishedAdvert`, and `AdvertLifecycleNotification` models/migration, tenant-session protected draft/preview/publish routes, publish-to-live versioning, persisted advert media carry-over, persisted lifecycle alerts, and pause/archive/renew controls. Remaining listing work includes duplicate/boost controls, public discovery ranking, approved live media vendors, and richer moderator assignment queues.
- 2026-06-20: Continued listing growth and moderation queues without deployment. Added draft/live advert duplication, boost metadata and controls, public advert discovery ranking with blocked-search safety, live/renewal-due visibility, active boost/freshness/media scoring, plus media review assignment queues with assigned/unassigned filters, assignment notes, scoped platform access, and tenant audit evidence. Remaining work includes approved live media vendors, full-text/vector discovery indexing, saved searches, relationship graph ranking, and user-facing review status.
- 2026-06-20: Continued discovery foundation without deployment. Added domain discovery helpers for full-text tokenization, sparse vector scoring, desired-role inference, and relationship graph signals; added persisted advert discovery index, saved advert searches, de-duplicated discovery alerts, index rebuild controls, and Prisma migration support. Remaining work includes typo tolerance/synonyms, Postgres full-text/pgvector or external search provider hardening, discovery analytics counters, relationship claim approval, and web/mobile saved-search UX.
- 2026-06-20: Continued discovery conversion and analytics without deployment. Added typo-tolerant query correction, synonym expansion dictionaries, expanded buyer/supplier role inference, saved-search save/search/match analytics events, protected advert discovery interaction counters for view/click/inquiry/share/download, and web/PWA saved-search controls with cadence, blocked-search handling, search restore, and alert candidate previews. Remaining work includes production search provider or Postgres full-text/pgvector hardening, persisted analytics rollups, external notification delivery, relationship claim approval, native mobile saved-search screens, and privacy/consent refinements.
- 2026-06-20: Continued analytics durability without deployment. Added an analytics repository boundary, in-memory analytics repository, Prisma/PostgreSQL analytics repository selected with `ANALYTICS_REPOSITORY=prisma`, async tenant summary reads from the configured repository, awaited saved-search/discovery event writes, and updated env/deployment docs. Remaining work includes analytics warehouse/rollups, exports, hierarchy dashboards, retention automation, and privacy request workflows.
- 2026-06-20: Continued analytics reporting without deployment. Added tenant analytics report/export endpoints for aggregated CSV/JSON output without raw event metadata, an internal analytics retention sweep with dry-run support and a 395-day default raw-event window, repository pruning for in-memory and Prisma analytics stores, and a web analytics readiness signal. Remaining work includes full analytics warehouse/rollups, PDF exports, hierarchy dashboards, configurable country/legal retention policies, and privacy request automation.
- 2026-06-20: Continued hierarchy analytics without deployment. Added a platform analytics guard for `VIEW_ANALYTICS`, scope-filtered analytics repository reads, a platform hierarchy report endpoint for global/regional/continent/country/tenant views, service-level scope authorization using platform access assignments, top-country/top-tenant/top-entity breakdowns, and web analytics hierarchy readiness copy. Remaining work includes full hierarchy dashboard screens, PDF exports, rollup tables/warehouse, configurable retention policy, and privacy request automation.
- 2026-06-20: Continued hierarchy analytics UX without deployment. Added web/PWA Analytics Command controls for hierarchy scope selection, CSV/JSON export choice, `VIEW_ANALYTICS` grant/block state, hierarchy aggregate metrics, top country/industry/tenant previews, and export filename readiness. Remaining work includes API-backed dashboard screens, PDF exports, analytics warehouse/rollups, configurable retention policy, and privacy request automation.
- 2026-06-22: Continued hierarchy analytics API backing without deployment. Added protected platform hierarchy CSV/JSON exports through `GET /v1/platform/analytics/hierarchy/export`, reused `VIEW_ANALYTICS` scope checks for export generation, excluded raw event metadata from hierarchy export payloads, and surfaced protected report/export API routes in the web/PWA Analytics Command panel. Remaining work includes live dashboard data loading with platform session tokens, PDF exports, analytics warehouse/rollups, configurable retention policy, and privacy request automation.
- 2026-06-22: Continued hierarchy analytics live loading without deployment. Added web/PWA Analytics Command platform session token input, protected live report fetches against `GET /v1/platform/analytics/hierarchy`, preview fallback reset on scope/format/industry changes, live/blocked/error status handling, and live report metric projection for totals, top country, top industry, top tenant, and most-visited rows. Remaining work includes first-party platform auth/session UX, PDF exports, analytics warehouse/rollups, configurable retention policy, and privacy request automation.
- 2026-06-22: Continued hierarchy analytics platform auth UX without deployment. Added Analytics Command platform email/password sign-in, session lookup for pasted or managed tokens, MFA verification, session summary/error state, automatic token reuse for protected report loading, and report reset when the auth session changes. Remaining work includes PDF exports, analytics warehouse/rollups, configurable retention policy, and privacy request automation.
- 2026-06-22: Continued analytics retention policy without deployment. Added shared analytics retention policy resolution, Kenya/default policy metadata, country-scoped retention pruning for in-memory and Prisma analytics repositories, `countryCode` support on the protected retention job, policy legal-basis output, and explicit retention-day override reporting. Remaining work includes PDF exports, analytics warehouse/rollups, deeper country retention approvals, and privacy request automation.
- 2026-06-22: Continued analytics export hardening without deployment. Added PDF as a tenant and platform hierarchy analytics export format, returned PDF payloads as base64 with explicit encoding metadata, kept CSV/JSON exports as UTF-8 payloads, surfaced PDF export readiness in the web/PWA Analytics Command panel, and verified exported content still excludes raw event metadata. Remaining work includes analytics warehouse/rollups, privacy request automation, and deeper country retention approvals.
- 2026-06-22: Continued analytics warehouse hardening without deployment. Added shared daily analytics rollup aggregation, Prisma `AnalyticsDailyRollup` persistence and migration, in-memory repository parity, a protected `POST /v1/operations/analytics/rollups/run` rebuild job with dry-run and tenant/country scoping, and tests proving aggregate rows exclude raw metadata. Remaining work includes rollup-backed dashboard read optimization, privacy request automation, and deeper country retention approvals.
- 2026-06-23: Continued analytics dashboard read optimization without deployment. Added `AUTO`/`RAW`/`ROLLUP` report data-source selection, rollup-backed tenant and platform hierarchy report construction, warehouse metadata in JSON/CSV/PDF exports, and web/PWA Analytics Command controls that show the resolved raw-event or daily-rollup source. Remaining work includes privacy request automation and deeper country retention approvals.
- 2026-06-23: Continued analytics privacy automation without deployment. Added protected `POST /v1/operations/analytics/privacy-requests/run` support for tenant-scoped analytics access summaries and erasure workflows, dry-run-by-default deletion, optional country/date scoping, raw event deletion through in-memory and Prisma repositories, rollup cleanup/rebuild after erasure, and tests proving returned summaries exclude raw metadata. Remaining work includes deeper country retention approvals.
- 2026-06-23: Continued analytics retention approval hardening without deployment. Added legal approval status and review metadata to analytics retention policies, surfaced legal-approval-required state in retention results, and required `approvalReference` for emergency retention-day overrides. Remaining work is operational: obtain external legal approvals before marking country schedules approved.
- 2026-06-23: Continued Epic 8 finance without deployment. Added shared invoice numbering and payment-balance helpers, protected tenant finance endpoints for invoice creation and receipt issuance, in-memory invoice/receipt records, and tests proving a paid transaction creates an invoice, receipt, tax snapshot, and ledger entries. Remaining work includes durable finance persistence, payment-provider adapters/idempotency, refunds, chargebacks, dunning, reconciliation, filing/remittance evidence, period locks, and exports.
- 2026-06-24: Continued Epic 8 finance without deployment. Added shared credit-note numbering, proportional refund/chargeback reversal helpers, dunning stage selection, protected refund and chargeback endpoints, adjustment listing, duplicate-safe invoice dunning runs, and tests proving refund credit notes, reversal ledger entries, disputed-balance reopening, and overdue dunning notices. Remaining work includes durable finance persistence, payment-provider adapters/idempotency, reconciliation, approval workflow, evidence attachments, period locks, and exports.
- 2026-08-21: Closed the remaining PRD 7.7 relationship-claim gap and PRD 7.4 scheduled-publish gap. Relationship claims now use structured kinds, visibility, counterpart or moderator approval, zero-tolerance/terms gating, opt-in Prisma persistence, and Source Finder graph attachment. Future advert `publishedAt` values stay `SCHEDULED` and out of public discovery until the lifecycle sweep promotes them to `LIVE`. The owner's local Desktop `Advert` folder was not present in this cloud workspace; product truth remains `Advertising_SaaS_PRD.md`.
- 2026-08-21: Continued Epic 6 / PRD 7.8 messaging. Added SENT/DELIVERED/READ/FAILED receipts, counterpart-only read rules, a 15-second typing window, tenant conversation receipt/typing APIs, unread counts, opt-in Prisma conversation persistence through `CONVERSATIONS_REPOSITORY=prisma`, and Conversation Workspace receipt/typing controls. Live websocket delivery, attachments, and provider-backed adapters remain next.
- 2026-08-21: Continued Epic 5 / PRD 7.5 Source Finder saved searches. Named searches now persist with INSTANT/DAILY/WEEKLY cadence, blocked-query gating, de-duplicated opportunity alerts, consent-aware IN_APP/email delivery plans, opt-in Prisma persistence through `SOURCE_FINDER_REPOSITORY=prisma`, and a protected operations sweep. Native mobile screens and provider-backed push/SMS/WhatsApp remain next.
- 2026-08-21: Continued PRD 7.8 live chat delivery. Added a session-authenticated Socket.IO namespace at `/v1/conversations`, in-process online presence, HTTP presence heartbeat/snapshot routes, and Conversation Workspace live-channel controls. Message, typing, and receipt HTTP writes now fan out to tenant conversation rooms. Provider-backed notification adapters and audit logs remain next.
- 2026-08-21: Wired PRD 7.8 notification delivery. Outbox records now dispatch through memory adapters by default, with Resend, Africa's Talking, and FCM overlay when credentials are present. Conversation SLA and Source Finder alerts enqueue into the outbox, delivery attempts are recorded, and `POST /v1/operations/notifications/dispatch/run` retries queued or failed channels. Product audit logs remain next.
- 2026-08-21: Closed the remaining PRD 7.8 product-audit gap. Conversation create/send/assign/status/receipt/media and notification plan/dispatch writes now append tenant audit records with chat copy, emails, and secrets stripped. Owner/admin lookup is `GET /v1/audit`.
- 2026-08-21: Continued Epic 8 tax return workbench. Draft returns now submit for review, require a clear provider reconciliation before approval, require a second filing approver above 10,000 filing-currency units, attach filing/remittance/authority evidence, lock the period after remittance, and export CSV/JSON country tax reports. `COUNTRY_FINANCE_ADMIN` can operate the workbench; tenant billing managers cannot. Product audit records the actions without notes or receipt references. Durable finance persistence and post-lock corrections remain next.
- 2026-08-21: Continued Epic 5 Source Finder outcome feedback. Tenants can accept, save, dismiss, hide, or report matches. Hide/report always suppress that tenant's results; accept/save ranking boosts apply only when behavioral matching consent is granted. Opt-in Prisma persistence reuses `SOURCE_FINDER_REPOSITORY=prisma`. Native mobile screens, persisted search index, and hierarchy dashboards remain next.
- 2026-08-21: Continued PRD 7.8 notification durability. Preferences and outbox dispatch state now persist through an in-memory repository by default, with opt-in PostgreSQL via `NOTIFICATIONS_REPOSITORY=prisma`. Retry sweeps read queued or failed channels from that store. Live WhatsApp provider credentials remain next.
- 2026-08-21: Continued Epic 8 finance durability. Tax profiles, snapshots, invoices, receipts, adjustments, tax returns, payments, and reconciliation runs now persist through an in-memory repository by default, with opt-in PostgreSQL via `FINANCE_REPOSITORY=prisma`. Live payment-provider adapters and post-lock corrections remain next.
- 2026-08-21: Continued Epic 8 post-lock tax corrections. Locked periods stay locked. Finance admins can post signed correction entries with `PERIOD_CORRECTION` evidence, ledger impact, and dual-control above 10,000 filing-currency units. Product audit omits notes and authority references. Live payment-provider adapters remain next.
- 2026-08-21: Continued Epic 8 live payment-provider adapters. Invoice capture stays on the manual development adapter by default. `PAYMENT_PROVIDER=stripe`, `africastalking`, or `live` selects Stripe PaymentIntents and/or Africa's Talking M-Pesa checkout, rejects raw card numbers, keeps pending STK/3DS captures as `REQUIRES_CAPTURE` until settlement, and fail-closes without credentials. App-store billing and a persisted Source Finder search index remain next.
- 2026-08-21: Continued Epic 5 Source Finder search index. Catalog documents now persist search text and sparse token vectors through the Source Finder repository. `POST /v1/source-finder/index/reindex` rebuilds from the pilot catalog, search uses indexed documents when present, and opt-in Prisma persistence reuses `SOURCE_FINDER_REPOSITORY=prisma`. Hierarchy dashboards and Postgres full-text/pgvector remain next.
- 2026-08-21: Continued Epic 5 Source Finder hierarchy dashboards. Catalog records now roll up by country, industry, role, and relationship link. `GET /v1/source-finder/hierarchy` returns the dashboard, and the Relationship Graph panel shows source, verified, and top-bucket counts. Postgres full-text/pgvector remains next.
- 2026-08-21: Continued Epic 5 Source Finder full-text ranking. Indexed catalog documents now score with token overlap in memory and Postgres `tsvector` search when Prisma is enabled. Search reports `RULES`/`FTS`/`HYBRID` and adds `KEYWORD_MATCH` without requiring live OpenAI embeddings. Live object-storage/media scanners and a WhatsApp provider remain next.
- 2026-08-21: Continued PRD 7.8 WhatsApp notification delivery. Memory remains the default WhatsApp adapter. WhatsApp Cloud overlays when `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are present; `WHATSAPP_PROVIDER=africastalking` uses Africa's Talking with `AT_WHATSAPP_FROM`. Explicit provider selection fail-closes without credentials, and destinations that are not E.164 numbers are rejected. Live object-storage/media scanners remain next.
- 2026-08-21: Continued Listing and Media live storage. DigitalOcean `SPACES_*` credentials now overlay the S3-compatible upload signer, ClamAV scans malware, and Sightengine moderates visuals. Named providers fail-close without credentials, and scanner results omit API secrets. CDN publication verification remains next.
- 2026-08-21: Continued Epic 2 auth email delivery. Verification, password-reset, tenant-invite, and email MFA messages overlay through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set. `AUTH_EMAIL_PROVIDER=resend` fail-closes without credentials; development tokens stay in non-production when no live sender is configured. Authenticator/TOTP MFA remains next.
- 2026-08-21: Continued Epic 2 authenticator MFA. RFC 6238 TOTP enrollment issues an otpauth URI once, confirmation stores the secret, later logins use `AUTHENTICATOR` delivery, and reused time-steps are rejected. Recovery codes and a hosted identity provider remain next.
- 2026-08-21: Continued Epic 2 MFA recovery codes. TOTP confirmation now issues 10 hashed single-use codes, login MFA accepts a recovery code when an authenticator is enrolled, reuse is rejected, and regenerate replaces the prior set. Audit metadata omits the codes. A hosted identity provider remains next.
- 2026-08-21: Continued Epic 2 hosted identity overlay. Auth0, Clerk, or generic OIDC ID tokens verify through JWKS and exchange at `POST /v1/auth/identity/session` for an existing tenant session. Named providers fail-close without issuer and audience. Unverified emails and unknown accounts are rejected. New tenants still accept terms through owner signup. Hosted Prisma enablement remains next.
- 2026-08-21: Continued Epic 5 Source Finder embeddings. OpenAI `text-embedding-3-small` overlays when `OPENAI_API_KEY` is set, stores vectors on reindex, and adds `SEMANTIC_MATCH` at search time. `SOURCE_FINDER_EMBEDDING_PROVIDER=openai` fail-closes without the key; tests mock fetch and do not require live secrets. Hosted Prisma enablement remains next.
- 2026-08-21: Continued Listing and Media CDN publication verification. `IMAGE_TRANSFORM` and `VIDEO_TRANSCODE` jobs now confirm public HTTPS URLs with a Range GET before succeeding. The overlay activates when `SPACES_CDN_ENDPOINT` or `MEDIA_S3_PUBLIC_BASE_URL` is set; `MEDIA_CDN_VERIFICATION_PROVIDER=live` fail-closes without a public origin. Unreachable objects fail closed; 5xx stays retryable. Legal/reporting escalation playbooks remain next.
- 2026-08-21: Continued Listing and Media legal/reporting playbooks. Kenya is the first approved country profile: escalate and HIGH/CRITICAL confirmed-block decisions attach KE-CIRT, NCMEC CyberTipline, and hosting-abuse channels with evidence preservation. Other countries fail closed until a playbook is approved. Audit metadata stores codes and deadlines only. User-facing review status remains next.
- 2026-08-21: Continued Listing and Media user-facing review status. Tenant profile, advert, and conversation media now return `review` (`UNDER_REVIEW` / `READY` / `BLOCKED` / `PROCESSING_FAILED`) and omit internal moderation reasons. Public discovery only includes ready files. Richer review-case management remains next.
- 2026-08-21: Continued Listing and Media review-case management. Cases now present computed SLAs (CRITICAL 24h, HIGH 72h, MEDIUM 168h), support GET by id, job-type and overdue filters, and reopen of dismissed cases only. HIGH/CRITICAL restore or dismiss requires mistaken-classification confirmation plus a reviewer note. Audit metadata stores the flag and omits note bodies. Production identity remains next.
- 2026-08-21: Continued hosted Prisma enablement. `PERSISTENCE_DRIVER=prisma` overlays PostgreSQL for repositories and media queues when `DATABASE_URL` is set, and fail-closes without it. Per-repository `memory` overrides still win. Unset driver keeps the in-memory default even if `DATABASE_URL` exists. `GET /v1/health` reports driver and `databaseConfigured` without the URL. Broader non-auth product audit coverage remains next.
- 2026-08-21: Continued broader non-auth product audit coverage. Analytics exports, privacy/retention/rollup jobs, invoice create/receipt/capture/refund, provider capture settlement, and mobile checkout/payout now append tenant audit records. Metadata omits emails, phones, invoice numbers, payment references, and secrets. `GET /v1/audit` filters by action or entity type. Native mobile and app-store billing remain out of scope.
- 2026-08-21: Reviewed live deployment and Google Play constraints. Fly.io Frankfurt serves `sellfindconnect.com` / `www` (HTTP 200) and `api.sellfindconnect.com/v1/health` (HTTP 200). The live API image still reports `telpen-api` without persistence health, and `/privacy` plus `/account/delete` 404 until web is redeployed. Railway URLs 404; `adverts.telpen.net` does not resolve. CORS now pairs apex and www. Privacy routes are mounted at `/v1/privacy` behind the tenant session guard. Locked rule: the verified login phone is the only STK Push destination; a Play Android listing would need Google Play Billing for the SaaS subscription and must not request `READ_SMS` or `READ_CALL_LOG`. See `docs/FLY_DEPLOYMENT.md` and `docs/PLAY_STORE.md`.
- 2026-08-22: Added the durable account-deletion worker. After the 30-day grace period, `POST /v1/operations/privacy/deletions/run` (internal job key) completes due requests: erase tenant profile/adverts/conversations/media, revoke sessions, retain billing/analytics/auth-audit, and write `ACCOUNT_DELETION_COMPLETED` without the user's reason. Memory remains the default store; Prisma overlays the existing `AccountDeletionRequest` tables via `PRIVACY_REPOSITORY` or `PERSISTENCE_DRIVER`. The daily scheduled-jobs workflow now includes this sweep. Fly still needs a redeploy before `/privacy` and `/account/delete` are live.
- 2026-08-22: Enabled hosted Prisma on Fly deploy. The API image now includes Prisma CLI, schema, and migrations. `fly.api.toml` `release_command` runs `deploy/api-release.sh` (migrate, then idempotent country/industry seed) before traffic shifts, then sets `PERSISTENCE_DRIVER=prisma`. GitHub Actions scheduled-job cron is on for `https://api.sellfindconnect.com/v1` once `INTERNAL_JOB_KEY` is set on Fly and in repository secrets. Live health still reports memory until that API image is deployed.
- 2026-08-22: First hosted Prisma Fly release failed on `20260625000000_finance_durability` because three checked-in SQL files started with a UTF-8 BOM (`U+FEFF`). Postgres rejected the file at byte 0, so no statements ran. The BOM is stripped; the release command marks that failed Prisma row rolled back and retries migrate. Production stays on memory until that image deploys.
- 2026-08-22: The BOM-fix image then failed with Prisma P3009 (failed `finance_durability` row still present; recovery only handled P3018). Release now runs `migrate resolve --rolled-back` for that migration before `migrate deploy`. Production still stays on memory until this image deploys.
- 2026-08-22: After finance/privacy applied, `20260627000000_search_hardening` failed because `to_tsvector("english", coalesce(...,""))` and `" "` are identifiers in Postgres, not strings. SQL now uses `'english'` / `''` / `' '`. Release also rolls back that failed row before migrate. Production stays on memory until this image deploys.
- 2026-08-22: Prepared the Kenya paid-launch tax gate. Seed writes a DRAFT
  Kenya Revenue Authority profile (16% VAT, monthly iTax, digital-marketplace
  threshold 0) into the finance workbench store and never overwrites an
  APPROVED row. STK checkout fail-closes with `tax_profile` and
  `PAYMENT_CHECKOUT_BLOCKED` until a human sets `approvedBy`.
- 2026-08-22: Researched remote multi-country tax remittance. Digital-service
  competitors (Google/Meta/Netflix-style and Stripe Tax SaaS) register on
  non-resident portals and file online; they do not travel or open an office
  per customer country. Kenya: iTax simplified DMS VAT or a tax representative;
  eTIMS is not required for that path (KRA DMS FAQ). Jumia/Jiji local-entity
  models are for on-the-ground marketplaces. Merchant-of-Record (Paddle)
  remits Kenya 16% VAT but conflicts with login-phone STK as seller of record.
- 2026-08-22: Locked the group tax operating model for all five owner-product
  SaaS subscriptions: stay merchant of record, Kenya first on iTax (or one
  Kenyan agent), keep STK, finance module + Stripe Tax for rates, EU OSS later.
  Executable in this repo (`packages/domain/src/tax-operating-model.ts`);
  `PAYMENT_PROVIDER=paddle|lemonsqueezy|dodo` fail-closes. Copy-paste blocks
  for InsurOS, Telpen Edu, and Stawi are in `docs/GROUP_TAX_OPERATING_MODEL.md`.
  This does not auto-approve the Kenya tax profile.
- 2026-08-22: Wired Stripe Tax as an optional rate overlay.
  `TAX_RATE_PROVIDER=stripe_tax` requires `STRIPE_SECRET_KEY`, quotes
  `POST /v1/tax/calculations` for digital software (`txcd_10103000`), and
  fail-closes on a zero or mismatched quote. Finance-module rules remain the
  source of truth. Stripe Tax does not become the seller and does not file iTax.
- 2026-08-22: Published public Terms of Service and subscription terms at
  `/terms` and `/subscription`, versions `terms-2026-08-22` and
  `subscription-2026-08-22`. Existing tenants must re-accept before gated
  actions. Counsel signed off on 09/10/26 (SFC-01). A web deploy is required before the
  live URLs leave 404.
- 2026-08-22: Published public prohibited-content policy at `/prohibited`
  from the shared zero-tolerance summaries, and redirected `/dashboard`
  routes into the home workspace so onboarding sell/find launches no longer
  404. Onboarding now links to terms, subscription, privacy, and prohibited
  policies.
- 2026-08-22: Home workspace now reads `view`, `q`, `industry`, and `role`
  from those dashboard redirects. Find onboarding maps AGRI-style quick
  codes onto catalog industries and focuses Source Finder; sell onboarding
  focuses Advertiser Setup. This is a web deploy.
- 2026-08-22: Published public community standards at `/community`
  (`community-2026-08-22`) from shared domain summaries. The page is the
  Play UGC user policy: report/block, harassment, not-for-children, and
  sexual content fully prohibited (not incidental). Counsel signed off on
  09/10/26 (SFC-01). Live `/community` is HTTP 200.
- 2026-08-22: Added UGC report and block. Tenants can report or block a
  Source Finder target after terms acceptance. Blocked ids leave that
  tenant’s results. `POST /v1/ugc/reports` and `POST /v1/ugc/blocks` persist
  in memory by default and Prisma when `PERSISTENCE_DRIVER=prisma`.
  Moderators use `GET/POST /v1/platform/ugc/reports`. Audit stores reason
  and target id, never report details. API then web deploy.
- 2026-08-22: Tenant blocks now stop conversation create/send/media/typing,
  lead inquiry, Source Finder search, opportunity alerts, and outcome
  writes. Existing threads present as `BLOCKED` with paused SLA until the
  tenant unblocks. No new Prisma migration. API then web deploy.
- 2026-08-24: Added a UGC moderator queue. Report reasons map to severity and
  SLA (prohibited 24h, harassment/impersonation 72h). `GET /v1/platform/ugc/reports`
  returns `{ openCount, overdueCount, reports }` sorted open/overdue/critical
  first. Home loads and resolves the queue with an MFA `MODERATE_CONTENT`
  session token. Audit still omits report details. API then web deploy.
- 2026-08-24: Added legal/support lookup of accepted policy versions.
  `GET /v1/platform/legal/terms-acceptances?tenantId=&userId=` requires an MFA
  `VIEW_TENANT` platform assignment, marks current vs stale policies, and
  records `TERMS_ACCEPTANCE_LOOKED_UP` without emails or hashes. Home loads
  it from the Policy Lookup panel. API then web deploy.
- 2026-08-24: Forced re-acceptance after material policy version changes.
  `GET /v1/auth/session` returns `termsGate`. Stale stored versions lock
  publish, chat, inquiry, UGC report/block, relationship claims, and checkout
  (`reason: terms`). `POST /v1/auth/terms/accept` writes `REACCEPTANCE`
  evidence after MFA and records `TERMS_REACCEPTED` without emails. Home Terms
  Gate can re-accept with the session token. API then web deploy.
- 2026-09-24: Locked this Cloud Agent environment to
  `github.com/Bucrepinfo-lab/sellfindconnect.com` only. Empty
  `repositoryDependencies` in `.cursor/environment.json`. Telpen Edu remains
  in its previous separate session and environment.
- 2026-10-15: Recorded signed SFC-02 (Kenya tax profile approval) in
  `docs/SIGN_OFF_RECORDS.md`: director signed 05/10/26, tax agent 07/10/26,
  production approval ticked. Kenya profile stays DRAFT and `approvedBy`
  unset until the agent resolves the resident-vs-non-resident contradiction
  (eTIMS and SEP rows) and the blank KRA PIN and `approvedBy` fields. The
  legal policy sign-off PDF arrived in the same email but is not yet
  recorded, so the policy pages remain "not counsel sign-off".
- 2026-10-15: Recorded signed SFC-01 (legal policy review) in
  `docs/SIGN_OFF_RECORDS.md`. Counsel (Advocate of the High Court of Kenya)
  signed 09/10/26 and the director 05/10/26: all five policies approved as
  published at their current versions, no changes requested. They are now
  the production contract; no version bump or re-acceptance needed. Removed
  the "not a counsel sign-off" line from `/community` (web deploy).
- 2026-10-15: Started the Google Play listing (Android TWA,
  `com.sellfindconnect.app`, built with PWABuilder). Added public sign-up
  (Create a business account), PWA icons and manifest, an offline service
  worker, env-driven `/.well-known/assetlinks.json`
  (`ANDROID_CERT_FINGERPRINTS`), a Play reviewer MFA code for one non-staff
  account (`PLAY_REVIEW_EMAIL` / `PLAY_REVIEW_MFA_CODE`), and a fuller public
  deletion page. The web image now ships `apps/web/public` (icons and
  `onboarding.css` were 404). Live sign-in still needs `RESEND_API_KEY` and
  `EMAIL_FROM` on the API: without them no MFA code is delivered. Paste packs:
  `docs/PLAY-STORE-LISTING.md`, `docs/PLAY-APP-CONTENT-REVIEW.md`.
- 2026-10-15: Built the Android package with PWABuilder
  (`com.sellfindconnect.app`, notifications/location/Play Billing off; the
  owner holds the signing key) and created the app in Play Console (id
  4974683027202673741). Most App content cards and the store listing are
  saved; Data safety is a draft imported from `docs/data_safety_export.csv`.
  Remaining: reviewer account and App access, Target audience, phone
  screenshots, `.aab` upload, assetlinks fingerprints, closed test.
- 2026-10-19: Rebased PR #55 (policy audit fixes from 2026-09-24) onto main.
  Community standards (`community-2026-08-22`) join the terms gate (migration
  `20261019120000_add_community_standards_acceptance`, additive, backfills
  rows on `terms-2026-08-22`). Invoice mobile-money pay rejects a
  caller-supplied phone and sends STK only to the verified login phone. Owner
  payouts require current terms and a same-tenant recipient. A missing
  `x-session-token` returns 401. Legal pages share one `PolicyNav` footer.
  Server-side Play purchase-token verification (`PAYMENT_PROVIDER=play`) is
  opt-in and off by default. The PR's placeholder icons, `deploy/twa` and
  Play listing pack were dropped as superseded by #64/#65.
- 2026-11-07: Hid every subscription price / checkout / payment entry point
  inside the Google Play Android app (TWA). Detection lives in
  `packages/domain/src/android-app-context.ts`: launch referrer
  `android-app://com.sellfindconnect.app`, a `?source=twa` start flag, a
  per-tab sessionStorage flag (never a cookie: a TWA shares Chrome's cookie
  jar), and Android + `display-mode: standalone` as a fail-safe hint. The web
  hides those blocks while the context is unknown, so they never flash in the
  app. Inside the app API calls carry `x-sfc-client: android-twa`, and
  `AndroidAppCheckoutGuard` refuses `POST /v1/payments/checkout` and any
  non-`WALLET` (non-Play Billing) `POST /v1/finance/payment-invoices/pay` with
  403. Web and browser users keep checkout.
- 2026-11-07: Removed DigitalOcean (owner dropped it): `deploy/digitalocean/`,
  `docs/DIGITALOCEAN_DEPLOYMENT.md`, the `SPACES_*` storage aliases, the
  `spaces` storage driver name, DO image hosts in `next.config.mjs` and DO
  wording in docs. Live object storage reads `MEDIA_S3_*` only. Legacy
  `SPACES_*` settings are ignored with a boot warning (never a crash). The
  media escalation playbook's hosting abuse desk is now Fly.io
  (`mailto:abuse@fly.io`).
- 2026-11-07: Media moderation fails safe. In production with no automated
  content-moderation provider, uploaded images/videos are held as PENDING
  (`AWAITING_HUMAN_REVIEW`, never public) and the CONTENT_MODERATION job opens
  a MEDIUM review case in the moderator queue. Approving (RESTORED/DISMISSED)
  publishes the file as PASSED; other resolutions keep it hidden. No paid
  provider added.
- 2026-11-07: Play reviewer sweep. Home sidebar now links Privacy and Delete
  account without sign-in; the hero's "free for the first month" line is
  hidden in the Android app; Report/Block explain why they are disabled when
  signed out and confirm (or show the API error) after sending instead of
  failing silently; `/account/delete` follows the shared session store, drops
  to the signed-out steps on a 401, explains an already-scheduled deletion,
  and shows dates as dd/mm/yy (also on Data and privacy).
- 2026-11-07: API for the real business path. `GET /v1/profiles/drafts` lists
  the tenant's own profile drafts; `GET /v1/public/adverts/:id` returns one
  discoverable advert (LIVE/RENEWAL_DUE/started SCHEDULED, moderator-cleared
  media only; paused, archived, expired or unknown ids are 404). Profile and
  advert write routes now require `EDIT_PROFILE` / `MANAGE_LISTINGS` on the
  server (`TenantPermissionGuard`): owners, admins and editors only.
  Requesting account deletion now takes the business's adverts out of search
  straight away (as the deletion page promises), and only the account owner
  (`MANAGE_ACCESS`) can request or cancel deletion of the business account.
- 2026-11-07: Real business path in the web/PWA. The dashboard leads with
  `BusinessManager` (create/edit/publish the business profile with contacts,
  service area and logo; create, publish, edit, unpublish, republish and
  delete adverts; terms re-accept on a stale gate). The home page searches
  real published adverts (`GET /v1/public/adverts/search`) and "Open" goes to
  `/listing/[id]` (contact by call/WhatsApp/email/website, report, block).
  Inside the Android app the preview/demo panels and their no-op buttons are
  hidden; the dead "Publish Draft" and notifications buttons are gone.
- 2026-11-07: Owner standing rule (07/11/26) applied: sign-in is the phone
  number. New device = 6-digit SMS code via Africa's Talking (5 minutes, single
  use, burnt after 5 wrong tries, max 3 codes per number per 10 minutes and 10
  per day, per-IP limits); that code satisfies tenant-session MFA. The device
  then gets an httpOnly trusted-device cookie (180 days, hash stored,
  revocable) and the user sets a 4-digit PIN (scrypt hash, weak PINs refused).
  PIN sign-in needs that device cookie; 5 wrong PINs lock it until a new SMS
  code. New numbers go through a registration ticket; email is optional
  (phone-only accounts get a non-routable `.invalid` placeholder that is never
  shown or emailed). Email + password + email code stays as "Sign in with email
  instead". Staff accounts cannot use the phone/PIN path. Reviewer:
  `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_CODE` (only when set, never staff), and
  the email review login still works. Migration
  `20261107120000_add_phone_pin_sign_in` adds three tables (additive). Data
  safety: phone now required, email optional.
- 2026-11-07: Portfolio audit carried over from Telpen Edu (owner, 07/11/26:
  "find out and fix in other portfolios"). Least privilege is now enforced on
  the server for every tenant write route, not only profile/adverts: leads
  (`MANAGE_LEADS`; sending an inquiry `CHAT_WITH_LEADS`), conversations
  (`CHAT_WITH_LEADS`; assignment and SLA runs `MANAGE_LEADS`), relationship
  claims (`EDIT_PROFILE`), notification settings/dispatch (`MANAGE_TENANT`),
  tenant analytics summary/report/export (`VIEW_ANALYTICS`), advert
  lifecycle/reindex (`MANAGE_LISTINGS`) and saved-search alerts
  (`MANAGE_LEADS`). The tenant route that rebuilt the platform-wide Source
  Finder index is closed to every business role (staff use the internal
  operations job). A spec fails if a new tenant write route names no
  permission. Adverts are bound to the tenant's own live business profile:
  the API rejects an advert or draft that claims another business's name,
  industry, role or country, and stamps the current profile identity on
  publish. Editing a live advert publishes the copy with `replacesAdvertId`;
  the API checks the original is the tenant's own before publishing and
  archives it in the same call, so a listing never shows twice; repeated
  "Edit" clicks reuse the open copy and the drafts list shows each draft once.
  AuthService is now a value import in the adverts, leads, relationships,
  source-finder and UGC services: as a type-only import Nest injected nothing,
  so stored-terms checks and tenant audit records on those paths were skipped
  in production. One shared day-first formatter (`formatDayFirstDate`,
  `formatDayFirstDateTime` in `@telpen/domain`, Nairobi clock) backs the web
  `formatDmy`; the staff console trial date and analytics PDF dates use it
  (dd/mm/yy, never device locale). Analytics CSV/PDF exports now state the
  filters they were built with, and the hierarchy report carries its industry
  filter. Home search keeps q/industry/role in the URL and drops unknown codes.
  The staff analytics scope picker offers only the scopes the signed-in role
  can reach.
- 2026-11-07: Owner-approved follow-ups to the portfolio audit (auth and
  database touched for these items only). Conversations can only be assigned
  (or opened assigned) to a member of the same tenant whose role can chat with
  leads; the API checks membership through `AuthService.findTenantMembership`.
  Sign-in, reset, invite and MFA emails show expiry times as dd/mm/yy HH:mm
  EAT via the shared `formatDayFirstDateTime`; token expiry logic is
  unchanged. Advert drafts gain a nullable `sourceAdvertId` (additive migration
  `20261107180000_add_advert_draft_source_advert`). `POST /v1/adverts/:id/edit`
  returns the open edit draft for that advert from any device or creates one
  linked to it; publishing a linked draft archives the original in the same
  call (or just goes live if the original was already removed). Drafts made
  before the column keep the device-local fallback and the explicit
  `replacesAdvertId` on publish.
- 2026-11-11: Owner request (11/11/26): research competitors' user complaints
  and restructure the public home around them. Findings and plan are in
  `docs/MVP_RESTRUCTURE_RESEARCH.md`. Shipped: Kenya places (47 counties, 290
  constituencies, 1,450 wards, Legal Notice 14 of 2012) and a starter list of
  well-known markets, malls and chains in `@telpen/domain`; listing badges
  (Featured, New, photos, days-left) and sorts (Best match, Newest, Ending
  soon); a new public home (logo mark, search hero with county, role and
  industry chips, collapsed "More filters" with constituency and ward, result
  cards, markets, "Why", "How it works", seller band, share and copy link on
  home and listings). The area filter matches place names in listing text
  until listings carry a structured location. Home copy states only what the
  product does; the onboarding "thousands of verified suppliers" line is
  removed. Not done, awaiting owner approval: structured location (database),
  ratings and reviews (database, policy), public view counts, GPS, new app
  icons.
- 2026-11-11: Owner asked (11/11/26) for a logo that describes the slogan and
  works for a global market, not a Kenyan niche, and does not look like a
  snake. New mark: a price tag (Sell it) seen through a magnifying glass (Find
  it), whose handle joins a second point (Connect). Green #1d4f45, gold
  #e0b040, white. Replaces the S-curve mark. Master art and the Play listing
  icon are in `docs/brand/`; web/PWA icons regenerated in
  `apps/web/public/icons/`. The Play app icon changes only with the next .aab.
- 2026-11-11: Owner (11/11/26) asked to fix two caveats of the home
  restructure. (1) Area search is now exact: a business sets county,
  constituency, ward and nearest landmark on its profile ("Where buyers find
  you"), stored in the existing `serviceArea` JSON (no migration). Kenyan
  places are saved with official spellings; an unknown county is refused.
  `GET /v1/public/adverts/search` takes `county`, `constituency`, `ward`,
  matches the set location exactly, and falls back to the advert text for
  businesses that have not set one; results and the listing page carry
  `location`. (2) The home pricing promise no longer commits to "no sales
  calls" or "one flat price": it says searching is free, the monthly listing
  fee is shown before paying, and extras are optional and priced upfront.
- 2026-11-11: Owner approved the logo and home page (PR #82 merged) and asked
  to fix the remaining follow-ups. Added: anonymous public listing counts
  (`POST /v1/public/adverts/:id/events`, VIEW or INQUIRY, always 204; one
  count per visitor per listing per 30 minutes, 60 events a minute cap; the
  visitor key is a SHA-256 of IP and user agent held in memory only) recorded
  as LISTING analytics events with consent NOT_REQUIRED; search results and
  the listing page carry `stats` (last 90 days); web sorts "Most viewed" and
  "Most asked". "Use my location" suggests the county on the device from
  county headquarters coordinates (`nearestKenyaCounty`); nothing is sent.
  Onboarding shows three "why" points. Ratings and reviews follow in a
  separate PR (new table, moderation).
- 2026-11-11: Owner decision (11/11/26): deploys are automatic. Deploy API
  (Fly.io) runs when CI passes on a push to main, checking out the exact
  commit CI tested; Deploy Web runs when Deploy API succeeds, on the same
  commit. Both keep their health checks and can still be run by hand.
- 2026-11-11: Owner decision (11/11/26): ratings and reviews. A signed-in,
  MFA-verified business with current terms can rate another business 1–5
  stars with an optional comment (600 characters, zero-tolerance checked);
  one review per reviewing business per business, editable or withdrawable by
  its writer; self-reviews are refused and the business must have a live
  profile. Public views carry no reviewer identity. Anyone signed in can
  report a review (UGC target `REVIEW`); moderators hide or restore it at
  `/v1/platform/reviews` (hidden, never deleted; editing never un-hides).
  Search cards show the average and count; the listing page shows the
  breakdown, the list and the write form. New table `BusinessReview`
  (additive migration `20261111160000_add_business_reviews`).
- 2026-11-11: Owner request (11/11/26): "make icons real and original". Public
  screens (home, search cards, listing, reviews, share, onboarding) now use
  the product's own icon set, `SfcIcon` (38 icons, logo language, one gold
  accent each) instead of emoji and stock icons; role and industry chips carry
  icons. Sheet in `docs/brand/icon-sheet.png`. The staff console keeps its
  existing icons.
- 2026-11-11: Owner request (11/11/26): improved photo filters with a preview
  before posting. Shared rules in `photo-filters.ts`: screening on every
  upload section (type/name match, minimum size, shape, repeats) and an
  on-device tidy-up (rotate, scale to 1600 px, gentle levels and colour).
  The logo upload now shows "Preview before posting". AI-written item
  descriptions are not built yet: they need a paid provider key and the
  owner's decision on a cost cap, given the locked subscription price.
- 2026-11-11: Owner request (11/11/26): project audit and clean-up. Removed
  dead code that nothing loaded (`apps/api/src/modules/search`,
  `apps/api/src/modules/prisma`), the archived Railway runbook, and the
  duplicate Play icon; `docs/store-assets/app-icon-512.png` is now the current
  mark. Stripped UTF-8 byte-order marks from 18 files. Bug fix: the service
  worker cache moved to `sfc-shell-v2` so installed apps stop serving the old
  logo icons from cache. Left as they are: `packages/config` (empty workspace
  kept so the lockfile stays valid), country flag characters in
  `geography.ts` (data), the staff console's icons, and the Play feature
  graphic and screenshots, which still show the old look and need the owner
  to re-upload once new ones are taken.
- 2026-11-11: Owner decision (11/11/26): "Write it for me" advert drafts, same
  design as HarvestHub's "Enhance listing". A free template from the
  business's own details always works; the AI overlay (cheapest Anthropic
  tier, `ADVERT_DRAFT_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`) is off until
  set, re-screens output (safety core, no contact details), and is capped at
  `ADVERT_AI_DRAFTS_PER_MONTH` (default 5) per business per Nairobi month,
  counted from `ADVERT_DESCRIPTION_DRAFTED` audit records. Five drafts cost a
  small fraction of the 10-unit monthly price. Nothing is published until the
  business presses Publish.

## 14/11/26 — SMS is transactional only (TELPEN sender)
- Owner: the "TELPEN" Africa's Talking sender ID was applied for transactional use only. `smsTransactionalEvents` / `smsAllowedFor` in `packages/domain/src/notifications.ts`: the delivery plan drops SMS for any event type not on the list (today: Source Finder opportunity matches), even with consent; promotion reaches subscribed members in-app (and email/push where agreed). Tests in notifications.test.ts.
- 2026-11-11: Added a provider-neutral AI-capability metering + spend-cap core
  to `@telpen/domain` (`ai-capability.ts`), the first safe foundation for
  metered AI add-ons across the portfolio. Pure, framework-free, no secrets,
  moves no money: `evaluateAiSpend` decides ALLOW/DENY under a per-tenant
  period spend cap and fails closed on any missing/mismatched/malformed input
  (no cap, no snapshot, tenant/currency/period mismatch, capability not in the
  tenant allow-list, projected spend over the cap); `priceAiUnits` prices usage
  at a margin markup in basis points (integer minor units) so the add-on raises
  margin. A `AiUsageMeterAdapter` port keeps the real usage/cost source behind
  an adapter; the default `DevInMemoryAiUsageMeter` needs no vendor keys so the
  no-secrets build is unchanged. 23 colocated vitest cases. NOT wired into the
  API, finance/billing, or any provider yet — provider wiring (env-var-named
  adapter + API key) and invoice integration are separate, human-authorised
  changes gated by the finance module's APPROVED-tax-profile path. No repo
  deployed; opened as a draft PR for owner review.

## 16/11/26 — Source Finder: nearest first, distance and directions (owner request)
- Owner asked to study a "find it near me" stock app (Dawascope) and do better where it fits. Businesses keep county / constituency / ward / landmark (no coordinates, no schema change), so distance is county-headquarters to county-headquarters: `packages/domain/src/kenya-nearby.ts` (`countyDistanceKm`, `countiesByDistance`, `sortByNearestCounty`, `nearbyDistanceLabel`, `businessDirectionsUrl`; vitest in `kenya-nearby.test.ts`).
- Web Source Finder: a "Nearest" sort (from the searcher's county from "Use my location", or the county searched), "In Nairobi" / "About 15 km from Nairobi" on each card, and a Directions link built from the business's public place only (the searcher's position never goes into a link). An empty county is no longer a dead end: it names the three nearest counties and "Show the nearest businesses" searches all of Kenya closest first.
- Exact metre-level distance needs a business map pin (a new profile field) — a database change, so it is escalated to the owner rather than done here.
- Same day, owner follow-up ("would constituency level improve precision?"): constituency was already captured (profile, onboarding, filter, API), but nearest-first only compared counties, so a shop in the searcher's ward ranked level with one at the far end of the county, and an empty constituency was a dead end. Now `placeProximity` / `sortByNearestPlace` / `placeProximityLabel` rank same ward, then same constituency, then the rest of the county, then other counties by km; cards say "In Kongowea ward" / "In Nyali constituency"; an empty ward or constituency widens to the whole county closest first, an empty county to all of Kenya. GPS still suggests only the county (no constituency coordinates are held); the page invites picking the constituency.
- 2026-11-19: Plan entitlements (owner: "research, decide and fix appropriately"). Decided: media per listing Basic 10 (unchanged, so no tenant loses anything) / Pro 20; RFQs on every plan, since buyers send RFQs free and Basic advertisers keep receiving and answering them (B2B norm, e.g. Alibaba buyers post RFQs free and sellers pay for reach; gating RFQs would leave buyers unanswered and break the match → chat/RFQ loop); Source Finder priority stays Pro-only but is not applied to ranking yet. Code: `planEntitlements` / `normalizePlan` in `packages/domain/src/subscription-pricing.ts` (unknown plan = BASIC), `mediaPolicy.maxItemsPerOwnerTopPlan` 20, adverts/profiles services enforce the tenant's limit via `AuthService.tenantPlan`; chat attachments stay at 10. DB: additive column `Tenant.subscriptionPlan VARCHAR(16) NOT NULL DEFAULT 'BASIC'` (migration 20261119150000). Nothing sets PRO yet: checkout plan choice is the next step (payments area, needs owner approval).
- 2026-11-19: Plan choice at checkout (owner: "go ahead"). `GET /payments/subscription-options` (both plans, month/year price, founding lock, current plan; approved KES countries only); `POST /payments/checkout {plan, period}` prices from `quoteSubscription` and ignores the client amount, stores `{purpose: SUBSCRIPTION, plan, period}` on the ledger row; the AT callback sets `Tenant.subscriptionPlan` on the first SUCCESS only (repeat callbacks and FAILED change nothing; plan taken from our ledger row, never the callback body) and audits `SUBSCRIPTION_PLAN_CHANGED`. Web "Your plan" card on the business page, hidden in the Android app (Play billing). Paid checkout still stays blocked until the Kenya tax profile is APPROVED. Not built: renewal date / expiry of a paid period (a Pro tenant stays Pro until changed).
- 2026-11-19: Tax/payment model changed by the owner ("we had agreed we use firms like Paddle that do an auto remittance of the tax"; chose Paddle + M-Pesa). Supersedes the 2026-08-22 self-merchant-of-record rule. Cards: Paddle is the merchant of record and remits the tax; `packages/domain/src/paddle.ts` (config off unless `PADDLE_ENABLED=true` + `PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_{BASIC,PRO}_{MONTH,YEAR}`, `PADDLE_ENV`), signed webhook `POST /v1/payments/paddle/webhook` (raw body; applied once per Paddle transaction via a `CARD` ledger row; plan from our price id, tenant from `custom_data.tenantId`). M-Pesa: direct sale, no VAT while not VAT-registered, so STK no longer waits for the Kenya tax profile unless `SELLER_VAT_REGISTERED=true`. Paddle has no M-Pesa and probably no KES, so the card catalog is likely USD. Web plan card gains "Pay by card". Owner steps: Paddle approval for sellfindconnect.com, four prices in the Paddle catalog, notification destination, Fly secrets.
- 2026-11-19: Paddle first everywhere it sells (owner, after the merge of #98: "If you find a country where the paddle is workable, then the paddle takes the first priority", even in Kenya; else another merchant of record that remits the tax; else the most popular local method). Researched: Paddle blocks 23 countries plus occupied Ukraine (African: CF, CD, LY, ML, SO, SS, SD, ZW); no merchant of record takes M-Pesa/mobile money (Dodo Payments checked). `packages/domain/src/payment-rails.ts` (`PADDLE_BLOCKED_COUNTRIES`, `paddleSellsIn`, `subscriptionRail`) + tests. `subscription-options` returns `rail`; card only when rail is PADDLE; M-Pesa plan checkout refused with `use_card` where Paddle is the way; M-Pesa stays for Kenya while Paddle is off. Web plan card shows one way to pay.
- 2026-11-19 (evening): Owner refined the rule: "in such instances, M-Pesa or most convenient mode of payment takes the lead than Paddle". Researched: M-Pesa holds 89.1% of Kenya's 53.4 million mobile money subscriptions (CA Kenya Q3 FY 2025/26). Now `subscriptionRails` returns every way, best first: Kenya `['MPESA','PADDLE']`, other Paddle countries `['PADDLE']`, blocked countries none. M-Pesa plan checkout allowed wherever M-Pesa is a way; the card is offered wherever Paddle is. Paddle account verified 09/11/26 (only app.telpen.net approved as a website so far).
- 2026-11-19 (night): Owner standing order: "Always we go for the most convenient mode of payment. Anything to do with the card comes later", in every country incl. developed ones; card payments go through Paddle. Accepted the VAT trade-off of local direct sales. Built: `payment-rails.ts` v4 (`LOCAL_METHOD` per country: Kenya M-Pesa; 15 mobile money countries via pawaPay; Nigeria bank transfer/USSD and South Africa EFT via Paystack; Paddle second), `apps/api/src/modules/payments/local-providers.ts` (pawaPay deposit + status re-read; Paystack initialize + HMAC-SHA512 webhook + verify), `POST /v1/payments/pawapay/callback`, `POST /v1/payments/paystack/webhook`; plan only changes on a re-verified full payment, once. A local way opens only with its provider's keys (`PAWAPAY_ENABLED`/`PAWAPAY_API_TOKEN`, `PAYSTACK_ENABLED`/`PAYSTACK_SECRET_KEY`) AND an approved price for that country (price table sent for approval).
- 2026-11-20: Owner approved all local prices ("approve all prices", on the Africa Local Prices table). `FOUNDING_SUBSCRIPTION_PRICES` now marks Uganda UGX 14,000/42,000, Tanzania TZS 10,000/30,000, Rwanda RWF 5,000/15,000, Nigeria NGN 6,000/18,000, Ghana GHS 50/150 and South Africa ZAR 70/210 (Basic/Pro a month; year = 10 months) as approved, beside Kenya. The USD row stays unapproved (card only, through Paddle). Local payment in those countries still stays off until the pawaPay (UG, TZ, RW, GH) or Paystack (NG, ZA) keys are set; VAT in Uganda and Tanzania applies from the first local sale. Not yet changed: the subscription terms page still says other countries are indicative (a terms change needs a new policy version and re-acceptance).
- 2026-11-20: pawaPay coverage checked 20/11/26 (docs.pawapay.io/v2/docs/providers, 21 countries): `LOCAL_METHOD` gains DR Congo (CDF), Lesotho (LSL), Zimbabwe (EcoCash, USD) and Ethiopia (ETB); Senegal adds Free Money; Sierra Leone is Orange Money only. pawaPay does not cover Mali, Liberia or South Sudan. Paddle does not sell in DR Congo or Zimbabwe, so mobile money is the only way there. Prices for the second-round countries await owner approval.
- 2026-11-20 (noon): Owner approved the second-round prices ("approve the second-round prices"). Approved Basic/Pro a month: Zambia ZMW 80/240, Malawi MWK 6,700/20,000, Mozambique MZN 250/750, Cameroon, Congo and Gabon XAF 2,200/6,600, Côte d'Ivoire, Senegal, Benin and Burkina Faso XOF 2,200/6,600, DR Congo CDF 8,900/27,000, Lesotho LSL 65/190, Sierra Leone SLE 90/270, Zimbabwe USD 3.99/11.99 (EcoCash runs in US dollars), Ethiopia ETB 630/1,900. Worked out from the Kenya prices at KRA's 2–8/11/26 rates (ZMW, CDF, SLE from XE). Every pawaPay country now has an approved price; mobile money opens there once the pawaPay keys are set.
- 2026-11-20 (evening): Owner approved sign-in WITHOUT SMS (Africa's Talking is not global, codes cost money) and no codes or alerts from Africa's Talking; the app's own messaging instead. Supersedes the 07/11/26 SMS-code rule. Phone sign-in is now: `POST /v1/auth/phone/start` (next = pin, reset or register with a ticket) → `pin/sign-in` with phone + the owner's own 4-digit PIN on any device (5 wrong = locked; same answer for an unknown number and a wrong PIN) → new numbers `register` with business details and a PIN. A forgotten or locked PIN is reset with a 6-digit code from support staff (`POST /v1/auth/phone/reset-code`, staff with an MFA-verified session only; one phone, once, 48 h, 5 tries; hashed, purpose `RESET_CODE` in the existing table, no migration) → `reset` → set a new PIN. Play reviewer: `PLAY_REVIEW_PHONE` + `PLAY_REVIEW_PIN`. Removed the AT SMS sender, the SMS notification adapter, the code/request + code/verify routes and the old `phone-otp/*` routes; specs rewritten for the new flow. Africa's Talking stays only for M-Pesa checkout and the optional WhatsApp overlay. Owner/Chrome after merge: Fly secret `PLAY_REVIEW_PIN`; unset `PLAY_REVIEW_CODE`, `AT_SENDER_ID`; Play App access text.
- 2026-11-23: Claude tools watch (weekly briefing) — adopted Claude Fable 5.2 (Anthropic flagship, launched 09/11/26; $8/$40 per MTok, ~20% cheaper than Fable 5.1 but far pricier than the Haiku tier) as an OPT-IN PREMIUM model tier for the Source Finder match explainer, NOT a default swap: the default stays `claude-haiku-5-5` to protect margin, since a flagship on a templated one-liner would raise provider cost. Added `packages/domain/src/source-finder-model-tier.ts` (pure, 19 tests): an approved-model allow-list + tier map (`claude-fable-5-2` = PREMIUM), and `selectExplanationModel()` — a fail-closed add-on/A-B gate (eligibility + rollout in basis points + stable per-tenant bucketing). `MATCH_EXPLANATION_MODEL` is now validated in the explainer factory (`anthropic-explainer.ts`); an unknown model fails closed instead of being billed silently. Premium spend stays bounded by the existing `AiSpendCap` + `priceAiUnits` margin markup in `ai-capability.ts` — no margin set here, no money moved. Delivered on branch `feat/source-finder-fable-5-2-tier` as a DRAFT PR; not merged, not deployed. Gate in this env: domain typecheck/build/tests green (297) and the explainer + tier specs green; full `api`/`web` typecheck+build could not run here because the Prisma engine host is blocked by the sandbox proxy — CI must confirm. Follow-up (owner review; touches the subscription/tenant surface, so proposed not done): wire per-tenant Pro-only eligibility + rollout into `SourceFinderService.explainMatch` so the A/B runs per request. Portfolio: replicate the same tier/selector pattern across Telpen Edu, HarvestHub, InsurOS and Stawi AI add-ons once this pattern is approved.
- 2026-11-24: UI polish (owner: "review the tabs and the icons … make it responsive, attractive"). `apps/web/src/app/globals.css` closing block: the current menu section now differs from hover (maize bar and maize icon, bold label; before, hover and current looked the same); menu icons lift and turn maize on hover; on phones (≤760px) the sideways menu strip has no scrollbar, a soft right fade, snap and 44px targets, with the current-section bar at the bottom; no grey tap flash; buttons press in slightly; a keyboard-only focus ring on every control; reduced motion turns motion off. CSS only. Found, not fixed: the current-section mark is fixed on the first link of each area (`className="nav-item active"`) and does not follow the section being viewed; a small scroll-follow would fix it (proposed to the owner).
- 2026-11-24: Menu mark follows the page (owner: "fix all these appropriately", after the UI polish flagged it). The 11 in-page menu links no longer hard-code `active` on the first one: `useSectionFollow` (`apps/web/src/lib/use-section-follow.ts`) measures the sections the menu's #links point at on scroll, resize and #hash change, and `pickCurrentSection` (`packages/domain/src/section-follow.ts`, 6 tests) picks the one crossing a reading line 120px from the top; at the very end of the page the last section on screen wins; before any section reaches the line, the first one. The current link gets `active` and `aria-current="location"`. Route links (Terms, Privacy, Account, Find businesses) are unchanged.
- 2026-11-24: Standing rule 13 added to `docs/STANDING_RULES.md` (owner: "Take this recommendation as a standing rule to apply to all other projects"): menu and tab pictures are our own drawings or the one icon set (Lucide here), never emoji; words stay with the picture; new pictures are tested with real users. The menu already complies (Lucide icons with labels).
- 2026-11-24: New visual identity, "Sell. Find. Connect." (owner: "the colour is completely out of order with what we are doing… full permission… when you're talking of the sell, the find and the connect, come up with colours and context which are communicating"). Each verb owns a colour with one meaning everywhere: SELL tangerine `#ff6a3d` (List your business, seller band; always ink text), FIND cobalt `#2b4cf0` (search, links, primary buttons), CONNECT berry `#d1246b` (Call/WhatsApp/Email/Website on a listing, match reasons); base indigo ink `#161a3d` on paper `#fbfaf7`; sun `#ffc23d` for ratings and active marks. Replaces forest green and gold, which collided with Safaricom/M-Pesa, Jiji and HarvestHub greens. Hero: ink with berry/cobalt/tangerine glows, a faint connection map and a three-band stripe. Fonts: Bricolage Grotesque + Plus Jakarta Sans, now really loaded (a `:root` rule had overridden the display font since launch). Onboarding and privacy screens moved from black/acid-green onto the same ink and tangerine. Mark, web/PWA icons and the Play icon file regenerated in the new colours. Full rationale and contrast figures: `docs/brand/README.md`. The installed Android app's icon changes only with a new `.aab`; the Play listing icon/feature graphic need a Play Console update.
- 2026-11-24 (later): Yellow added as light on the dark areas (owner: "illuminating or crystalline"): hero sunrise, light shafts, golden crystal nodes, "anywhere in Kenya." in a crystal-gold gradient, gold halo on the search card, gold "Use my location"; business sidebar sunrise and gold-lit current section; onboarding and privacy sunrise. Yellow is light, not a fourth verb. See docs/brand/README.md.
- 2026-11-25: Photo tools (owner standing rule, all projects: "Filerobot-class editor, looks, OCR, enough sizes that grow with the plan + auto-fit"). `packages/domain/src/photo-filters.ts`: one-tap looks As taken / Fresh (default) / Bright / Warm / Crisp, each capped by `photoLookCaps` (a test fails past "true to life"), and `MAX_ORIGINAL_PHOTO_BYTES` 40 MB: big phone photos are accepted and shrunk on the phone. `PhotoPreview` has look chips (replacing the on/off tidy-up) and "Crop and rotate" (`PhotoCropper`, react-easy-crop 6.2.5, MIT): 4:3 or square, logos square, rotate, zoom; no text, drawing or blur. Filerobot itself was not used here: its stable 4.x relies on function-component defaultProps, which React 19 removed, and its React 19 line is a beta. OCR `ReadTextButton` (Tesseract.js 7, English + Kiswahili compact models, self-hosted at /ocr by `apps/web/scripts/copy-ocr-assets.mjs`, photo never leaves the phone, the person checks the words first) on the business description ("Read a flyer, card or price list"). `mediaPolicy` sizes raised (photo 10→15 MB, video 100→150 MB). Media COUNTS stay Basic 10 / Pro 20: they are pricing entitlements pinned by plan tests, raised only with the owner's yes.
- 2026-11-25 (afternoon): Owner "fix" on four items. (1) Photo limits raised: Basic 15 / Pro 30 per listing (were 10 / 20); `mediaPolicy`, plan summaries, PRD and pinned tests updated. Chat attachments follow the Basic number. (2) Dark theme: every light surface and line is now a token (`--surface-2`, `--line-2`, `--find-line`, `--connect-line`, `--sun-line`, `--band`). A dark set follows the phone's setting, or the Light / Dark / Auto switch in the sidebar and home footer (`ThemeToggle`, `lib/theme.ts`), with a pre-paint script so a saved choice never flashes. (3) Play pictures redone in the new identity: feature graphic and four 1080×1920 screenshots (search, community standards, sign-in, dark). These were made from a local run, so no live data shows. (4) Found while making them and fixed: on phones the sidebar pushed the page wider than the screen (the `1fr` grid column grew to fit its content). The column is now `minmax(0, 1fr)` and the menu pictures scroll sideways. The installed icon needs a new `.aab` from PWABuilder with the existing signing key; the steps are in `docs/PLAY-STORE-LISTING.md`.
- 2026-11-25 (evening): Owner "go ahead and restructure" with lazy registration. Visitors can browse every tab with no account. Signed out, "Your business" becomes a guest tour (`GuestBusinessTour`): bright cards for Business profile, Create an advert, Leads, Messages, Connections and Saved searches, each saying what it does. An advert can be written straight away; the account step (phone, name, PIN, policies) appears only at Publish, with the business name, industry and role already filled in (`PhoneSignIn prefill`). The advert is kept on the device (`lib/pending-advert.ts`). Once signed in, `BusinessManager` publishes it automatically, and if there's no live profile yet it makes a simple one from what was typed (`lib/quick-publish.ts`), so a new seller never meets "publish your profile first". Found the same evening: the owner's number had no SellFindConnect account and the live site had no published adverts, which is why search found nothing. Landing page: value banners for sellers, buyers and transport/services; a "What you get" band; reasons shown as cards. Advert cards are coloured by kind of business (sellers tangerine, buyers cobalt, transport/services berry, finance/certifiers sun). The empty search state invites the first advert. Corrected the reason text: listings are tied to a phone number and PIN, not a one-time code.
