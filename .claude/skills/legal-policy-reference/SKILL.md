---
name: legal-policy-reference
description: Use when working on terms, privacy, community standards, prohibited-content or subscription policies for SellFindConnect.com / Telpen Adverts — the reference for versioned policies, acceptance + forced re-acceptance, the policy version IDs, and the exact gated actions, with real paths. Owns Epic 10.
---

# Legal & policy reference

## Purpose
Single reference for the policy/acceptance engine so nothing publishes, uploads,
messages, promotes, or charges without current terms acceptance and
zero-tolerance clearance.

## When to use
- Drafting/versioning a policy or wiring a re-acceptance trigger.
- Reasoning about why a publish/upload/chat/pay path is blocked.
- Looking up accepted versions for a dispute/investigation.

## Policy version IDs (`packages/domain/src/auth-tenancy.ts`)
`activePolicyVersions`:
- `termsVersion: 'terms-2026-08-22'`
- `privacyVersion: 'privacy-2026-06-18'`
- `prohibitedContentVersion: 'zero-tolerance-2026-06-18'`
- `subscriptionTermsVersion: 'subscription-2026-08-22'`
- `communityStandardsVersion = 'community-2026-08-22'`
  (`packages/domain/src/community-standards.ts`).

Public policy pages (`policyPages` in the same file): `/terms`, `/privacy`,
`/subscription`, `/community` (plus `/prohibited`).

## Acceptance evidence & forced re-acceptance
- Build evidence with `buildTermsAcceptanceEvidence(...)`: captures user,
  tenant, country, the four policy versions, `appSurface`, locale, timestamp,
  device/network metadata, and `acceptanceSource`
  (`SIGNUP | REACCEPTANCE | ADMIN_INVITE | CHECKOUT`).
- Forced re-acceptance is version-diff driven:
  `staleTermsAcceptancePolicies(evidence)` compares stored versions to
  `activePolicyVersions` and returns the stale keys;
  `isCurrentTermsAcceptance(evidence)` is true only when `accepted === true`
  **and** nothing is stale. **Bumping any version ID above automatically forces
  re-acceptance** — that is the trigger mechanism.
- Lookup for disputes: `GET /platform/legal/terms-acceptances`
  (`apps/api/src/modules/access/legal.controller.ts`, `@ApiTags('legal')`,
  `@Controller('platform/legal')`), behind `PlatformLegalGuard` — requires a
  session with active `VIEW_TENANT` platform access and MFA (`x-session-token`).
  Query DTO: `dto/lookup-terms-acceptance.dto.ts`.

## Exact gated actions
- **Payment / checkout:** `apps/api/src/modules/payments/payments.service.ts`
  returns `{ ok: false, reason: 'terms' }` when
  `auth.hasCurrentTermsAcceptance(userId, tenantId)` is false, and
  `{ ok: false, reason: 'tax_profile' }` when the country isn't launch-ready
  (see `finance-tax-reference`).
- **Publish / upload / chat / paid promotion:** must pass current acceptance +
  zero-tolerance clearance. Zero-tolerance enforcement:
  `packages/domain/src/safety.ts` (28 prohibited categories) and
  `assertSafeFields` in `ugc-moderation.ts`; UGC moderation routes under
  `apps/api/src/modules/ugc` (`@Controller('ugc')`, `platform/ugc`).
- **Data-subject rights (privacy):** `apps/api/src/modules/privacy`
  (`@Controller('privacy')`): `GET /privacy/data-summary`,
  `POST /privacy/export`, `POST|GET|DELETE /privacy/deletion`.

## Steps to change a policy
1. Draft/review with counsel-ready clarity; flag risks by severity.
2. Bump the relevant version ID in `auth-tenancy.ts` (or
   `community-standards.ts`) — this forces re-acceptance on next check.
3. Confirm the gated paths read `isCurrentTermsAcceptance` / the safety core;
   hand the Operation Agent the acceptance-evidence + blocked-state requirements.
4. Record the decision and effective date in `Product_Memory.md` (propose).

## Guardrails (non-negotiable)
- Acceptance never overrides zero-tolerance or acceptable-use blocking.
- No publish/upload/chat/paid-promotion/payment without current acceptance +
  zero-tolerance clearance. Child-safety and prohibited categories are absolute.
- Telpen cannot waive non-waivable platform, privacy, tax, consumer, app-store,
  hosting, or safety duties.
- Operator stays merchant of record; never accept Paddle/Lemon Squeezy/Dodo as
  seller of record. Kenya files via iTax or one Kenyan representative.
- Provide legal information, not legal advice; counsel reviews before any paid
  launch. Propose, don't dispose; tenant-locked.
