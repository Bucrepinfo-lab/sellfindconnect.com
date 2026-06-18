# Telpen Adverts MVP Implementation Backlog

Status: Execution backlog
Date: 2026-06-15
Last updated: 2026-06-18

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

- Deployment migration is paused while coding continues.
- Added `docs/DIGITALOCEAN_DEPLOYMENT.md` as the leading candidate runbook for
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
- Added an opt-in Prisma-backed auth repository selected with
  `AUTH_REPOSITORY=prisma`, using `DATABASE_URL` and the generated Prisma
  client to persist users, tenants, memberships, auth sessions, MFA
  challenges, account challenges, and terms acceptance evidence.
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
- Added database fields/models for password metadata, auth sessions, tenant
  onboarding attributes, and terms acceptance evidence.
- Added the initial Prisma migration and seed workflow required before enabling
  production Prisma persistence against a hosted PostgreSQL database.
- Production identity provider, provider-backed email delivery,
  provider-backed email/SMS/authenticator MFA delivery, invite flows, hosted
  database migration/seed execution, and production Prisma enablement remain
  next.

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
- A durable scheduler/queue and persisted advert repository remain next.

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
- Persistence, relationship claim approval, saved searches, opportunity alerts,
  search analytics feedback, and graph dashboards remain next.

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
- Live websocket delivery, read receipts, typing/presence, attachments, actual
  provider adapters, audit logs, and repository persistence remain next.

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
- Database persistence and hierarchy dashboards remain next.

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
- Added zero-tolerance checks to finance inputs so prohibited content cannot be
  stored in finance metadata or configuration.
- Added web Finance Readiness indicators for subscription amount, computed tax,
  net revenue, and next remittance alert.
- Persistence, payment adapters, invoices/receipts, reconciliation, approval
  workflow, evidence attachments, and report exports remain next.

## Epic 9: Mobile, Localization, and Launch

- Create React Native app with shared contracts.
- Add push notifications.
- Add localization and local terminology.
- Complete account deletion and privacy workflows.
- Complete app-store UGC, subscription, privacy, and child-safety checklist.
- Run Kenya pilot readiness gate.

Exit: web/PWA and mobile clients pass pilot acceptance tests.

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

## Immediate Sprint

1. Repository foundation.
2. Initial Prisma schema.
3. Geography, industry, and supply-chain role seeds.
4. Shared zero-tolerance policy validator.
5. Public API health/geography/industry endpoints.
6. First usable web screen for Source Finder and advertiser setup.
7. First terms acceptance gate wired to publish locking in the web screen.
