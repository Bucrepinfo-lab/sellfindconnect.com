# Telpen Adverts MVP Implementation Backlog

Status: Execution backlog
Date: 2026-06-15
Last updated: 2026-08-22

## Delivery Principles

- Build vertical slices that can be demonstrated.
- Treat tenant isolation, safety, privacy, and finance controls as acceptance
  criteria rather than later hardening.
- Require every user-content and discovery endpoint to call the shared,
  versioned zero-tolerance evaluator before persistence, indexing, matching,
  messaging, sharing, downloading, payment, or export. Client-only warnings do
  not satisfy acceptance criteria.
- Require every user-content and discovery endpoint to also enforce
  hosting-provider acceptable-use restrictions aligned with Railway-style
  rules: no illegal activity, child exploitation, terrorism or violent
  extremism, human trafficking, nonconsensual intimate imagery, fraud,
  phishing, impersonation, malware, unauthorized access, DDoS, botnets, spam,
  abusive scraping, copyright piracy, crypto mining, torrenting, open proxies,
  anonymizers, compute resale, or infrastructure abuse.
- Require explicit acceptance of the active terms, privacy, subscription, and
  prohibited-content policy versions before publishing, media upload, messaging,
  paid promotion, or payment enablement.
- Launch one country only after its operational readiness gate passes.
- Start matching with explainable rules and improve with outcome data.

## Epic 0: Repository and Engineering Foundation

- Create npm-workspaces monorepo.
- Add Next.js web, NestJS API, shared domain package, and Prisma database package.
- Add environment validation, formatting, linting, type checks, and tests.
- Add health endpoint and local development instructions.
- Add CI workflow after the first green local build.
- Add provider deployment configuration and cutover runbook after core coding
  reaches the production-readiness checkpoint.

Exit: clean install, type check, tests, and production builds pass.

Progress:

- Deployment: Fly.io Frankfurt is live (`docs/FLY_DEPLOYMENT.md`). DigitalOcean
  remains a candidate runbook (`docs/DIGITALOCEAN_DEPLOYMENT.md`,
  `deploy/digitalocean/app.yaml`) — same Dockerfiles and Prisma release as Fly;
  do not cut DNS while Fly is live. Railway is archived
  (`docs/GIT_RAILWAY_RUNBOOK.md`); those URLs 404 and are not a fallback.
- Added `docs/DIGITALOCEAN_DEPLOYMENT.md` as a candidate runbook for
  DigitalOcean evaluation, with Cape Town/South Africa latency as the main
  driver and service-availability verification as a required gate.
- Added a checked-in baseline Prisma migration plus root database commands for
  validation, client generation, deployable migrations, migration status, and
  repeatable seed data.
- Removed the local Railway CLI dependency and root deploy scripts while
  deployment is paused, reducing normal install exposure to deploy-only
  transitive vulnerabilities.

## Epic 1: Geography and Industry Foundation

- Seed continents and Kenya as the pilot country.
- Model country flag, currency, locale, timezone, and subscription price.
- Seed the 21 top-level industry categories.
- Model supply-chain roles.
- Add zero-tolerance category and synonym policy rules.
- Add hosting-provider acceptable-use category and synonym policy rules.
- Expose public geography and industry APIs.

Exit: web onboarding can select a permitted industry and Kenya/local currency.

Progress:

- Added repeatable Prisma seed data sourced from the shared domain package for
  continents, pilot country configuration, and industry categories.
- Added shared input sanitisation helpers for Unicode normalization, hidden
  character removal, URL/email normalization support, recursion limits, and
  secret-field preservation.

## Epic 2: Authentication, Tenancy, and Roles

- Add user registration and secure authentication.
- Create tenant and assign owner.
- Add global, regional, continental, country, and tenant roles.
- Add tenant and administrative scope middleware/guards.
- Add MFA requirement for privileged administration roles.
- Add audit log.

Exit: automated tests prove users cannot read or mutate another tenant.

Progress:

- Added shared hierarchy and RBAC rules for global, regional, continental,
  country, and tenant scopes.
- Added MFA-required decisions for privileged roles.
- Added permission checks for platform, access, analytics, finance,
  moderation, country, tenant, listing, lead, chat, billing, and read-only
  actions.
- Added an access API for role matrices, access evaluation, and MVP access
  decision audit records.
- Added web Hierarchy Access controls for role, scope, permission, MFA, and
  grant/block state.
- Added database fields/models for MFA state, access assignments, and access
  decision audit evidence.
- Added shared onboarding/auth policy helpers for password strength,
  first-month-free trial windows, active policy versions, and terms acceptance
  evidence.
- Added an MVP auth API for tenant-owner registration, secure PBKDF2 password
  hashing, login, opaque sessions, MFA verification, tenant-session checks, and
  tenant listing.
- Added an auth repository boundary with an in-memory adapter for tests/demo
  mode, preparing the service for a Prisma-backed repository without changing
  controller contracts.
- Changed session persistence to store token hashes instead of raw bearer
  tokens, and only present raw session tokens at issuance time.
- Replaced the fixed development MFA code with generated, hashed,
  time-limited challenge records linked to the session, user, and tenant.
- Added generated, hashed, expiring account challenge records for email
  verification and password reset, with password reset revoking active user
  sessions after completion.
- Added MVP tenant invite flows so an MFA-verified owner can invite non-owner
  tenant roles, and invited users can accept with current terms acceptance,
  verified email, role-aware membership, and a fresh session.
- Added auth audit logging for owner registration, login, email verification,
  password reset, MFA, tenant invite creation, and tenant invite acceptance,
  plus an owner/MFA-protected tenant audit lookup endpoint.
- Added existing-account tenant invite acceptance: an invited existing user can
  join another tenant only with an active session belonging to that same user,
  preventing invite-token-only account linking.
- Added an opt-in Prisma-backed auth repository selected with
  `AUTH_REPOSITORY=prisma`, using `DATABASE_URL` and the generated Prisma
  client to persist users, tenants, memberships, auth sessions, MFA
  challenges, account challenges, tenant invites, and terms acceptance evidence.
- Added a reusable tenant session guard that validates `x-session-token`
  against `x-tenant-id`, attaches authenticated tenant session context, and
  blocks tenant routes until MFA is verified.
- Migrated profile draft/preview routes and advert lifecycle/listing routes
  from temporary tenant-header trust to the MFA-verified tenant session guard.
- Migrated lead conversion and conversation/chat routes from temporary
  tenant-header trust to the MFA-verified tenant session guard.
- Migrated Source Finder, notification, analytics, and finance routes from
  temporary tenant-header trust to the MFA-verified tenant session guard, then
  removed the obsolete header-only tenant context guard.
- Added web Owner Onboarding readiness controls for owner email, tenant name,
  password policy, trial dates, terms versions, and signup lock state.
- Added Resend overlay for auth email verification, password reset, tenant
  invites, and email MFA. `AUTH_EMAIL_PROVIDER=resend` fail-closes without
  `RESEND_API_KEY` and `EMAIL_FROM`. Development tokens stay in non-production
  when no live sender is configured.
- Added RFC 6238 authenticator TOTP enrollment for MFA-verified sessions.
  Later logins use `AUTHENTICATOR` delivery, replay of the same time-step is
  rejected, and audit metadata omits secrets and otpauth URIs.
- Added hashed single-use recovery codes at TOTP confirmation (10 codes, shown
  once). Login MFA accepts a recovery code when TOTP is enrolled; reuse and
  regenerate both invalidate prior codes. Audit metadata omits the codes.
- Added hosted identity overlay for Auth0, Clerk, or generic OIDC. Verified
  RS256 ID tokens with `email_verified` exchange for an existing tenant
  session at `POST /v1/auth/identity/session`. Named providers fail-close
  without `AUTH_OIDC_ISSUER` and `AUTH_OIDC_AUDIENCE`. New tenants still
  register through terms-gated owner signup. Audit stores issuer and subject
  hash only.
- Added database fields/models for password metadata, auth sessions, tenant
  onboarding attributes, and terms acceptance evidence.
- Added the initial Prisma migration and seed workflow required before enabling
  production Prisma persistence against a hosted PostgreSQL database.
- Added `PERSISTENCE_DRIVER=prisma` overlay so hosted PostgreSQL can be selected
  for repositories and media queues with one env var. Named `live` fail-closes
  without `DATABASE_URL`. Per-repository `memory` overrides still win. Tests
  stay on the in-memory default. `GET /v1/health` reports driver and
  `databaseConfigured` without the URL.
- Fly `sellfindconnect-api` now copies Prisma schema/migrations into the image
  and runs `deploy/api-release.sh` as `release_command` (migrate, then
  idempotent seed) before traffic shifts. `fly.api.toml` sets
  `PERSISTENCE_DRIVER=prisma`. GitHub Actions cron for scheduled jobs is on.
- Broader non-auth product audit coverage now includes analytics exports,
  privacy/retention/rollup jobs, invoices, and payment checkout/payout.
  `GET /v1/audit` filters by action or entity type. Native mobile and Play
  Billing remain out of scope; see `docs/PLAY_STORE.md`.
- Account deletion and privacy policy routes are mounted: `GET /privacy`,
  `/account/delete`, and tenant-session `/v1/privacy/*`. A grace-period worker
  at `POST /v1/operations/privacy/deletions/run` now completes due deletions:
  erase profile/adverts/conversations/media, revoke sessions, retain
  billing/analytics/auth-audit. Default store is in-memory; Prisma overlays
  the existing `AccountDeletionRequest` tables.

## Epic 3: Advertiser Profile Vertical Slice

- Create profile draft.
- Edit identity, industry, role, description, contacts, and service area.
- Validate zero-tolerance text and links.
- Show profile completeness.
- Preview unpublished draft.
- Require active terms acceptance before preview-to-publish submission.
- Publish a version while preserving the previous live version.
- Track created, updated, published, and active duration.

Exit: a Kenya pilot advertiser can onboard, accept the current terms, preview,
and publish a safe profile.

Progress:

- Added an MVP profile publish workflow that converts a safe draft into the
  tenant's live profile, marks the draft published, increments profile version,
  archives the previous live profile, tracks days live, and records profile
  publish audit evidence.
- Added tenant-session protected routes for publishing a draft, reading the
  current live profile, and listing published profile history.
- Added a profile repository boundary with in-memory default storage and
  opt-in Prisma-backed persistence through `PROFILE_REPOSITORY=prisma`,
  including persisted source-draft linkage for published profiles.
- Added tenant-session protected profile draft editing, edit audit evidence,
  publish-time request and stored current-terms checks, and a review-pending
  gate for high-risk industry, role, or country changes.
- Added persisted review reasons and MVP owner/admin profile review workflow:
  pending-review queue, approve/reject decisions, review notes, reviewed-by
  metadata, and publish blocking for rejected drafts.
- Added profile contact enrichment and service-area fields for WhatsApp,
  physical address, map URL, social/contact links, primary city, regions,
  radius, remote availability, and operating countries, with preview and live
  publish carry-over.
- Added platform-level profile moderation access with MFA-required
  `MODERATE_CONTENT` assignments, scoped pending-review queue filtering,
  country/tenant access checks, platform review endpoints, and access-decision
  audit persistence.
- Added the profile media display foundation: shared media policy, ten-item
  display cap, supported image/video metadata, recursive safety checks for media
  captions/URLs/filenames, tenant-session protected draft media routes,
  preview media slots, Prisma `MediaAsset` persistence, and publish-time media
  carry-over into the live profile.
- Added provider-neutral profile media upload preparation plus storage,
  moderation, and CDN/transform adapter hooks, with persisted storage keys,
  CDN URLs, transform status, and variant metadata.
- Added S3-compatible presigned PUT upload support through env-configured
  Signature V4 signing, plus scan/transform processing job interfaces.
- Added durable Prisma/PostgreSQL media processing job outbox persistence,
  including worker claim, complete, retry, and final-failure lifecycle support
  selected with `MEDIA_JOB_QUEUE_DRIVER=prisma`.
- Added a shared media module and internal job-key protected media processing
  runner: `POST /v1/operations/media/processing/run`, with development
  processors for malware scan, content moderation, image transform, and video
  transcode job completion.
- Added generic HTTP provider-backed processor adapters for malware scan,
  content moderation, image transform, and video transcode endpoints.
- Added Prisma media asset result publication for completed/final worker jobs,
  including moderation state, blocked fail-closed states, transform status,
  CDN URLs, thumbnails, and responsive variants.
- Added durable unsafe-media review cases through Prisma `MediaReviewCase`
  records, including severity, reason, provider, source job, media reference,
  and evidence payload for blocked or final-failed media processing.
- Wired DigitalOcean Spaces credentials (`SPACES_*`) into the S3-compatible
  upload signer and added approved ClamAV/Sightengine scanner overlays.
  Named providers fail-close without credentials.
- Added CDN publication verification on `IMAGE_TRANSFORM` and `VIDEO_TRANSCODE`
  results. HTTPS Range GET checks overlay when a public CDN origin is set.
  `MEDIA_CDN_VERIFICATION_PROVIDER=live` fail-closes without that origin.
  Unreachable objects fail closed; 5xx stays retryable.
- Added Kenya legal/reporting escalation playbooks. `ESCALATED` resolutions and
  HIGH/CRITICAL confirmed blocks require an approved country playbook, persist
  a reporting snapshot, and fail closed for countries without one.
- Added user-facing media review status on tenant profile, advert, and
  conversation media. Internal reasons are omitted. Public discovery only
  includes ready files.
- Added richer media review-case management: computed SLAs (CRITICAL 24h,
  HIGH 72h, MEDIUM 168h), GET by id, job-type and overdue filters,
  mistaken-classification gates for HIGH/CRITICAL restore or dismiss, and
  reopen of dismissed cases only.

## Epic 4: Listing and Media Vertical Slice

- Create listing draft.
- Add product/service, audience, role, price, currency, and location.
- Upload up to 10 images/clips.
- Generate thumbnails and media metadata.
- Run malware and content moderation.
- Preview, publish, pause, archive, and renew.
- Auto-delete adverts after 40 days unless renewed.
- Send renewal notifications on day 35 and day 39.

Exit: a safe listing with up to 10 media assets can be published.

Progress:

- Added shared advert lifecycle policy for 40-day expiry and day-35/day-39
  renewal alerts.
- Added tenant-scoped advert lifecycle API that creates renewal notifications
  and auto-deletes expired adverts in the MVP in-memory store.
- Added an internal job-key protected endpoint for daily all-tenant lifecycle
  sweeps: `POST /v1/operations/adverts/lifecycle/run`.
- Added database fields for expiry, renewal alerts, deletion timestamps, and
  notification records.
- Added tenant-session protected advert media upload preparation, media attach,
  and media listing routes using the shared media policy and storage,
  moderation, and CDN/transform adapter hooks; advert media uses the ten-item
  cap, safety checks, moderation status, transform metadata, display slots, and
  auto-archives when an advert auto-deletes.
- Added S3-compatible presigned upload readiness and media processing job
  queue contracts shared with profile media.
- Added durable media job outbox support shared by advert and profile media so
  queued scan/transform work survives API restarts and can be processed by
  workers.
- Added the protected media processing runner endpoint shared by advert and
  profile media worker jobs.
- Added shared HTTP processor adapters and Prisma media-result publication for
  advert and profile media worker output.
- Added durable media review cases for unsafe or final-failed advert/profile
  media processing output.
- Added scheduled advert publishing: future `publishedAt` values create
  `SCHEDULED` listings that are hidden from public discovery until the
  lifecycle sweep promotes them to `LIVE`.
- Added CDN publication verification shared by advert and profile transform
  jobs.
- Added Kenya legal/reporting playbooks on media review escalate and severe
  confirmed-block decisions.
- Added user-facing media review status on tenant media responses.
- Added richer media review-case management: computed SLAs, GET by id,
  job-type and overdue filters, mistaken-classification restore/dismiss gates,
  and reopen of dismissed cases only.

## Epic 5: Source Finder and Relationship Graph

- Search products, services, organizations, roles, and locations.
- Filter and sort by relevance, newest, most visited, verified, and response time.
- Return match reason codes.
- Add structured producer/supplier/consumer/distributor/service relationships.
- Add relationship claim acceptance.
- Add saved searches and opportunity alerts.

Exit: users can find sources, suppliers, consumers, and likely clients from one
search workflow.

Progress:

- Added shared rules-based Source Finder ranking with score, reason codes,
  human-readable reasons, sort modes, and relationship links.
- Added a tenant-scoped API endpoint: `POST /v1/source-finder/search`.
- Added server-side zero-tolerance blocking for prohibited Source Finder
  searches and unsupported country/industry rejection.
- Updated the web Source Finder to use the shared ranking engine, show match
  reasons, sort by relevance/newest/most visited/verified/response time, and
  show related supplier/buyer/service links.

Progress (2026-08-21):

- Added structured relationship claims with counterpart approve/reject,
  moderator removal, public/private/request-only/verified visibility, and
  zero-tolerance/terms gating.
- Approved public/verified claims now attach to Source Finder results and the
  web Graph panel. Opt-in Prisma persistence is available through
  `RELATIONSHIPS_REPOSITORY=prisma`.
- Added Source Finder saved searches, INSTANT/DAILY/WEEKLY cadence, de-duplicated
  opportunity alerts, consent-aware delivery plans, and opt-in Prisma
  persistence through `SOURCE_FINDER_REPOSITORY=prisma`.
- Added Source Finder outcome feedback with accept/save/dismiss/hide/report
  actions, hide/report suppression, consent-gated accept/save ranking boosts,
  product-audit events without notes, and `POST/GET /v1/source-finder/outcomes`.
- Added a persisted Source Finder search index with search text, sparse token
  vectors, tenant and operations reindex commands, and Prisma persistence
  through `SOURCE_FINDER_REPOSITORY=prisma`. Search uses indexed documents when
  present and falls back to the in-memory catalog otherwise.
- Added Source Finder hierarchy dashboards with country, industry, role, and
  relationship-link rollups via `GET /v1/source-finder/hierarchy`.
- Added Postgres full-text ranking on the Source Finder catalog index. In-memory
  token overlap and Prisma `tsvector` search add `KEYWORD_MATCH` and report
  `searchMode` as `RULES`, `FTS`, or `HYBRID`. The `embedding` column is reserved
  for an optional later overlay and is not required for tests.
- Added optional OpenAI embedding overlay for Source Finder. `OPENAI_API_KEY`
  enables `text-embedding-3-small` on reindex and search; named
  `SOURCE_FINDER_EMBEDDING_PROVIDER=openai` fail-closes without the key.
  Matches add `SEMANTIC_MATCH`. Tests do not require live OpenAI credentials.
- Native mobile saved-search screens remain out of scope. Hosted Prisma overlay
  (`PERSISTENCE_DRIVER=prisma`) is live on Fly production
  (`GET /v1/health` → `persistence.mode: prisma`).

## Epic 6: Matching and Lead Conversion

- Implement explainable rules-based matching.
- Add accept, save, dismiss, hide, and report feedback.
- Add inquiry and RFQ forms.
- Add lead inbox and statuses.
- Add realtime chat and assignment.
- Lock chat initiation behind accepted terms and zero-tolerance safety checks.
- Track response SLA and conversion events.

Exit: a match can become an inquiry, conversation, and qualified lead.

Progress:

- Added shared lead-conversion intelligence for match confidence, priority,
  response SLA, reason codes, and next-best actions.
- Added tenant-scoped match feedback API for accept, save, dismiss, hide, and
  report actions.
- Added inquiry/RFQ creation with terms acceptance and zero-tolerance checks
  before a match can become a lead.
- Added tenant lead inbox and lead status updates.
- Added web Lead Conversion controls for selected match, feedback action,
  status, inquiry lock/unlock, and next-best actions.
- Migrated match feedback, inquiry/RFQ, lead inbox, lead status, conversation,
  message, assignment, notification, and SLA routes to the MFA-verified tenant
  session guard.
- Added shared conversation states, participant roles, saved replies, and SLA
  decisions.
- Added tenant-scoped conversation APIs for terms-gated thread creation, safe
  message sending, assignment, status updates, message listing, notifications,
  and SLA checks.
- Added a web Conversation Workspace for owner assignment, SLA state, safe reply
  drafting, saved replies, and status updates.
- Added Prisma conversation, message, and notification models for durable
  persistence wiring.
- Added consent-aware notification orchestration for in-app, email, SMS, push,
  and WhatsApp channels, including tenant preferences, an outbox API, channel
  suppression reasons, and a web Notification Delivery readiness panel.
- Added a protected internal scheduler endpoint for all-tenant conversation SLA
  sweeps: `POST /v1/operations/conversations/sla/run`.
- Added notification preference, outbox, and delivery-attempt database models.
- Added HTTP delivery receipts, read receipts, typing indicators, unread
  counts, and opt-in Prisma conversation persistence through
  `CONVERSATIONS_REPOSITORY=prisma`.
- Added conversation attachments that reuse media policy, malware-scan jobs,
  and moderation adapters. Blocked or still-pending files cannot be sent.
- Added a session-authenticated Socket.IO namespace at `/v1/conversations`
  for live message, typing, receipt, and presence events, plus HTTP presence
  heartbeat/snapshot routes. Presence is in-process per API instance.
- Wired notification outbox records through channel adapters. Memory adapters
  cover IN_APP, EMAIL, SMS, PUSH, and WHATSAPP by default; Resend, Africa's
  Talking SMS, FCM, and WhatsApp Cloud / Africa's Talking WhatsApp overlay when
  credentials are set. Conversation SLA and
  Source Finder alerts now queue into the outbox. Dispatch retries run at
  `POST /v1/operations/notifications/dispatch/run`.
- Added tenant product audit coverage for conversation and notification writes,
  metadata redaction for chat copy and secrets, and `GET /v1/audit` for owner
  or admin lookup.
- Extended product audit coverage to analytics exports, privacy/retention/rollup
  jobs, invoices, and payment checkout/payout, with `action`/`entityType`
  filters on `GET /v1/audit`.
- Added in-memory and opt-in Prisma notification persistence through
  `NOTIFICATIONS_REPOSITORY=prisma`, covering tenant preferences, outbox
  destination/channel status, and delivery attempts. Dispatch retries read
  that durable outbox.
- Added live WhatsApp notification adapters. Memory remains the default.
  `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` overlay WhatsApp Cloud, and
  `WHATSAPP_PROVIDER=africastalking` with `AT_WHATSAPP_FROM` overlays Africa's
  Talking. Explicit `WHATSAPP_PROVIDER` values fail-close without credentials.
  Destinations that are not E.164 phone numbers are rejected.

## Epic 7: Analytics

- Define event schema and consent state.
- Track impressions, views, clicks, inquiries, shares, downloads, saves, media,
  matches, chat, response time, and days live.
- Build tenant dashboard.
- Build country, continent, regional, and global dashboards.
- Add CSV/PDF report exports.

Exit: each hierarchy level sees only its permitted analytics.

Progress:

- Added the shared analytics event taxonomy and consent states.
- Added tenant-scoped API endpoints for recording analytics events and reading
  tenant summaries.
- Added web dashboard metrics for most visited, sorted, clicks, enquiries,
  shares, downloads, and age.
- Added protected platform hierarchy reports and CSV/JSON hierarchy exports with
  scoped `VIEW_ANALYTICS` checks and raw metadata excluded from export payloads.
- Added web dashboard live hierarchy report loading with platform session token
  authorization and seeded preview fallback.
- Added first-party dashboard platform sign-in, session verification, MFA
  verification, and managed token reuse for protected hierarchy analytics.
- Added country-scoped analytics retention policy resolution with legal-basis
  metadata, dry-run/delete filtering, and explicit override reporting.
- Added CSV/JSON/PDF tenant and platform hierarchy analytics exports with
  explicit UTF-8/base64 payload encoding and raw metadata excluded from exported
  content.
- Added daily analytics warehouse rollups for tenant/country/industry/entity
  aggregates, Prisma persistence, in-memory parity, and a protected dry-run
  rebuild job for scheduled operations.
- Added rollup-backed tenant and platform hierarchy report reads with explicit
  `AUTO`, `RAW`, and `ROLLUP` data-source selection plus web/PWA controls and
  resolved-source display.
- Added protected analytics privacy request automation for tenant-scoped access
  summaries and dry-run-by-default erasure with country/date scoping plus rollup
  cleanup/rebuild after deletion.
- Added legal approval status metadata to analytics retention policies, review
  due dates for pending country schedules, and mandatory `approvalReference`
  enforcement for retention-day overrides.
- External legal review and approval records remain an operational follow-up.

## Epic 8: Subscription, Finance, and Tax

- Implement first-month-free subscription state machine.
- Configure country-local 10-unit pricing with fallback approval.
- Integrate payment adapter.
- Build invoice, receipt, refund, chargeback, and dunning workflows.
- Build country tax profile and effective-dated rules.
- Add immutable tax calculation snapshots.
- Build finance ledger and provider/bank reconciliation.
- Build tax return workbench.
- Build T-30, T-14, T-7, T-3, T-1, due, and overdue alerts.
- Add filing/remittance approvals, evidence, and period locks.

Exit: test transaction produces payment, invoice, tax snapshot, ledger entry,
alert, draft return, and reconciled remittance evidence.

Progress:

- Added shared finance/tax helpers for configured rates, tax-inclusive and
  tax-exclusive pricing, and remittance alert timing.
- Added tenant-scoped finance API endpoints for approved country tax profiles,
  effective-dated tax rules, tax calculation snapshots, ledger entries, tax
  return generation, and T-30/T-14/T-7/T-3/T-1/due/overdue alert runs.
- Added tenant-scoped invoice and receipt command endpoints with country/year
  document numbering, payment-balance tracking, and a paid transaction path
  that creates an invoice, optional receipt, tax snapshot, and ledger entries.
- Added tenant-scoped refund, chargeback, and dunning command endpoints with
  credit-note numbering, proportional tax/revenue reversal ledger entries,
  disputed-balance reopening, and duplicate-safe overdue invoice notices.
- Added zero-tolerance checks to finance inputs so prohibited content cannot be
  stored in finance metadata or configuration.
- Added web Finance Readiness indicators for subscription amount, computed tax,
  net revenue, and next remittance alert.
- Added the tax return workbench: review submission, reconciliation-gated
  approval, dual filing approval above the 10,000-unit threshold, filing and
  remittance evidence, period lock, CSV/JSON country tax exports, country
  finance admin access, billing-manager export denial, and product-audit events.
- Added in-memory and opt-in Prisma finance persistence through
  `FINANCE_REPOSITORY=prisma`, covering tax profiles, snapshots, invoices,
  receipts, adjustments, tax returns, payments, and reconciliation runs.
- Added controlled post-lock tax-return corrections: locked periods stay
  locked, finance admins post signed `PERIOD_CORRECTION` entries with ledger
  impact and dual-control above 10,000 units, and product audit omits notes
  and authority references.
- Added live payment-provider adapters behind `PAYMENT_PROVIDER`. Manual
  remains the default; `stripe`, `africastalking`, and `live` select Stripe
  PaymentIntents and/or Africa's Talking M-Pesa checkout, reject raw card
  numbers, keep pending captures as `REQUIRES_CAPTURE` until settlement, and
  fail closed without credentials. Play Billing is required before any Google
  Play Android listing can charge the SaaS subscription (`docs/PLAY_STORE.md`).
  STK Push on the verified login phone remains the web/PWA rail.

## Epic 9: Mobile, Localization, and Launch

- Create React Native app with shared contracts.
- Add push notifications.
- Add localization and local terminology.
- Complete account deletion and privacy workflows.
- Complete app-store UGC, subscription, privacy, and child-safety checklist.
- Run Kenya pilot readiness gate.

Exit: web/PWA and mobile clients pass pilot acceptance tests.

Progress:

- Web/PWA is the launch surface. Native Android/iOS remain out of scope.
- Google Play constraints are locked in `docs/PLAY_STORE.md`: Play Billing for
  the digital SaaS subscription, STK only to the login phone, no `READ_SMS` /
  `READ_CALL_LOG`, public `/privacy` plus signed-in `/account/delete`.
- Privacy API is mounted at `/v1/privacy` behind the tenant session guard.
  Durable erase-after-grace-period runs on Fly Prisma via the daily scheduled
  sweep (`POST /v1/operations/privacy/deletions/run`). Play listing is still
  blocked on native app, Play Billing, and in-app report/block — not on
  deletion durability.

## Epic 10: Legal Terms and Policy Operations

- Draft production terms, privacy policy, community standards, prohibited
  content policy, subscription trial terms, and country addenda with counsel.
- Add accept, withdraw, and blocked-state controls in web, PWA, Android, and iOS.
- Version all terms and policies.
- Store acceptance evidence by user, tenant, country, policy version, app
  surface, locale, timestamp, and lawful device/network metadata.
- Force re-acceptance after material terms, privacy, subscription,
  prohibited-category, payment, or country-specific policy changes.
- Add legal/support lookup for accepted policy versions.
- Ensure user responsibility, indemnity, and platform-not-party clauses do not
  attempt to waive non-waivable platform, consumer, privacy, tax, or app-store
  duties.

Exit: no publish, upload, chat, paid promotion, or payment path can proceed
without current terms acceptance and zero-tolerance clearance.

Progress:

- Added a global API sanitising pipe before validation so request bodies are
  normalized before DTO validation and zero-tolerance evaluation.
- Hardened validation errors so raw submitted values are not echoed back to
  clients.
- Limited recursive safety-field traversal to avoid crashes on hostile nested
  or cyclic payloads.
- Added Kenya media reporting playbooks with KE-CIRT, NCMEC CyberTipline, and
  hosting-abuse channels. Other countries fail closed until a playbook is
  approved.

## Immediate Sprint

1. Hosted Prisma on Fly — **done** (`persistence.mode: prisma`).
2. `INTERNAL_JOB_KEY` + scheduled-jobs smoke-test — **done** (cron enabled;
   manual workflow_dispatch green on 2026-08-22).
3. Do not start a native Play app until Play Billing exists.
