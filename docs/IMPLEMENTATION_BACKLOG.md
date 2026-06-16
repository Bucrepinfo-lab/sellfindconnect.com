# Telpen Adverts MVP Implementation Backlog

Status: Execution backlog
Date: 2026-06-15
Last updated: 2026-06-16

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

Exit: clean install, type check, tests, and production builds pass.

## Epic 1: Geography and Industry Foundation

- Seed continents and Kenya as the pilot country.
- Model country flag, currency, locale, timezone, and subscription price.
- Seed the 21 top-level industry categories.
- Model supply-chain roles.
- Add zero-tolerance category and synonym policy rules.
- Add hosting-provider acceptable-use category and synonym policy rules.
- Expose public geography and industry APIs.

Exit: web onboarding can select a permitted industry and Kenya/local currency.

## Epic 2: Authentication, Tenancy, and Roles

- Add user registration and secure authentication.
- Create tenant and assign owner.
- Add global, regional, continental, country, and tenant roles.
- Add tenant and administrative scope middleware/guards.
- Add MFA requirement for privileged administration roles.
- Add audit log.

Exit: automated tests prove users cannot read or mutate another tenant.

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

## Epic 6: Matching and Lead Conversion

- Implement explainable rules-based matching.
- Add accept, save, dismiss, hide, and report feedback.
- Add inquiry and RFQ forms.
- Add lead inbox and statuses.
- Add realtime chat and assignment.
- Lock chat initiation behind accepted terms and zero-tolerance safety checks.
- Track response SLA and conversion events.

Exit: a match can become an inquiry, conversation, and qualified lead.

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

## Immediate Sprint

1. Repository foundation.
2. Initial Prisma schema.
3. Geography, industry, and supply-chain role seeds.
4. Shared zero-tolerance policy validator.
5. Public API health/geography/industry endpoints.
6. First usable web screen for Source Finder and advertiser setup.
7. First terms acceptance gate wired to publish locking in the web screen.
