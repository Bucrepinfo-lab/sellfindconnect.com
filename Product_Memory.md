# Telpen Adverts Product Memory

Date started: 2026-06-15
Last updated: 2026-06-16
Purpose: Persistent decision log and strategic memory for the Telpen Adverts multi-tenant advertising SaaS.

This file must be updated whenever product strategy, pricing, compliance, architecture, market positioning, or execution decisions change.

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
- Finance and tax command engine: country tax profiles, VAT/GST/sales tax/DST/withholding/levy rules, tax snapshots, remittance calendar, finance alerts, return workbench, reconciliation, and audit evidence.

## Preferred Technology Direction

- Web: Next.js/React/TypeScript.
- Mobile: React Native with Expo unless the team strongly prefers Flutter.
- Backend: NestJS/TypeScript for MVP speed and shared language.
- Database: PostgreSQL with strict tenant isolation.
- Search: start with Typesense/Meilisearch or managed Algolia depending on budget and launch urgency; evaluate OpenSearch/Elasticsearch for advanced scale and vector search.
- Matching: rules first, then embeddings/vector search, then graph ranking and ML ranking as data grows.
- Chat: custom WebSocket/Socket.IO for MVP or Twilio/Stream-style managed chat if speed and cross-channel support matter more.
- Notifications: FCM, APNs, email, SMS, and WhatsApp where compliant.
- Payments: Stripe where supported, app-store billing where required, and local mobile money/payment providers per launch country.
- Tax automation: use an adapter layer. Stripe Tax is a preferred candidate where supported; TaxJar, Taxually, Avalara, Marosa, local country providers, or finance-approved manual rules may be needed for unsupported countries/tax types.
- Analytics: event pipeline, warehouse, BI dashboard, product analytics, and exportable reports.
- Safety: moderation queue, media scanning, malware scanning, keyword/synonym libraries, evidence preservation, audit logs, and escalation workflow.
- Observability: Sentry/OpenTelemetry/Prometheus/Grafana or equivalent.
- Local development environment: Docker Desktop with WSL 2 for PostgreSQL, Redis, Meilisearch, and Mailpit; Volta with Node.js 24 LTS to keep runtime versions consistent; DBeaver Community recommended for database inspection.
- Production domains: `adverts.telpen.net` for the web app and `api.adverts.telpen.net` for the API. `telpen.net` DNS is managed through GoDaddy nameservers. Railway is the selected initial full-stack host.
- Brand domain target: `SellFindConnect.com` was purchased through GoDaddy on 2026-06-16 and will be the main public brand domain after DNS connection, SSL issuance, and verification. Keep `adverts.telpen.net` as the internal/technical deployment domain if the Railway plan supports the extra custom domain; otherwise use the Railway-provided web URL as the fallback until the plan is upgraded.
- Recommended market domain portfolio: buy `SellFindConnect.com` first; also buy `SellFindConnect.app`, `FindSellConnect.com`, and `FindSellConnect.app` as defensive/app companions if budget allows. Campaign line: "Sell it. Find it. Connect."
- SEO/growth direction: position Sell Find Connect around supplier finder, buyer-seller connection, business advertising app, source finder, local business directory, B2B marketplace, and country/industry business matching. Growth should combine organic SEO, country/industry landing pages, app-store optimization, social video demos, partnerships, referrals, opportunity digests, and safety/trust positioning.
- GitHub repository: use `https://github.com/Bucrepinfo-lab/sellfindconnect.com.git` as the source repository for the Sell Find Connect codebase and future Railway GitHub deployments.

## Open Decisions

- First launch country or countries.
- Exact payment providers and mobile money rails for launch countries.
- Whether native apps are required on day one or whether web + PWA launches first.
- Which countries need fallback pricing because provider/app-store minimums prevent exactly 10 local currency units.
- Which launch countries require specific legal reporting channels for child safety, trafficking, weapons, drugs, or violent extremist content.
- Whether to include public reviews in MVP or Phase 2.
- Whether to use managed search/chat/analytics providers for speed or self-hosted/open-source components for control.
- Which tax provider or provider combination will be used for each launch country.
- Which accounting system the finance module must export to or integrate with.
- Named Country Finance Admin and external tax advisor for each launch country.
- Approved fallback process where external tax providers do not support a country or tax type.

## Decision Log

- 2026-06-15: Created PRD for multi-tenant advertising SaaS with web and downloadable mobile app requirements.
- 2026-06-15: Locked local pricing rule: first month free, then 10 units of each subscriber country's local currency per month.
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
