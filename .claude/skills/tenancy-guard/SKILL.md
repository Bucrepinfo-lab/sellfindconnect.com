---
name: tenancy-guard
description: Use when adding or reviewing any tenant-owned resource or route in the SellFindConnect.com / Telpen Adverts API — to enforce multi-tenant isolation the way this codebase does (x-tenant-id + x-session-token with MFA, tenant-scoped reads/writes) and to add a tenant-owned resource safely.
---

# Tenancy guard — multi-tenant isolation

## Purpose
Every tenant's data must stay invisible to every other tenant. This platform is
a head-office → continent → country → tenant hierarchy; tenant routes are locked
to a verified owner session for one tenant. Follow the existing enforcement
exactly — do not invent a parallel scheme.

## When to use
- Adding a new tenant-owned resource, route, or repository.
- Reviewing any controller/service that reads or writes tenant data.

## How isolation is enforced (real paths)
- Guard: `apps/api/src/modules/tenant/tenant-session.guard.ts`
  (`TenantSessionGuard`). It requires both headers:
  - `x-tenant-id` — must be a UUID; else `UnauthorizedException`.
  - `x-session-token` — the issued owner session; else `UnauthorizedException`.
  It calls `auth.checkTenantSession({ tenantId, sessionToken })` and rejects
  unless **MFA is verified**. On success it sets `request.tenantId` and
  `request.authSession`.
- Request shape: `apps/api/src/modules/tenant/tenant-request.ts`
  (`TenantScopedRequest` with `tenantId?` and `authSession?`).
- Param decorators: `apps/api/src/modules/tenant/tenant-context.decorator.ts`
  — `@TenantId()` and `@TenantAuthSession()`. Controllers read the tenant from
  these, never from the request body.

## Reference pattern (`apps/api/src/modules/leads`)
```ts
@UseGuards(TenantSessionGuard)
@Controller('leads')
export class LeadsController {
  @Post('inquiries')
  createInquiry(
    @TenantId() tenantId: string,                 // from the guard, trusted
    @TenantAuthSession() session: TenantSessionDecision,
    @Body() body: CreateInquiryDto,
  ) {
    return this.leads.createInquiry(tenantId, body, session.userId);
  }
}
```
The service takes `tenantId` as its first argument and scopes everything by it:
writes store under a tenant-composite key (`key(tenantId, id)`), reads
`filter(item => item.tenantId === tenantId)`. Never trust a tenant id from the
body or query.

## Steps to add a tenant-owned resource safely
1. Put `@UseGuards(TenantSessionGuard)` on the controller (or route).
2. Take the tenant via `@TenantId()`; the actor via `@TenantAuthSession()`.
   Never accept `tenantId` in a DTO/body/query.
3. Thread `tenantId` as the first service argument; scope every read and write
   by it (composite key on write, equality filter on read).
4. Provide both repositories — `in-memory-*` (default) and `prisma-*` — and
   include `tenantId` in the persistence key/column. See `repo-conventions`.
5. Run user/tenant text through the safety core (`evaluateSafety*` /
   `assertSafeFields`). See `ads-domain`.
6. Add a `*.spec.ts` that proves one tenant cannot read/write another's data.

## Guardrails
- Fail closed: missing/invalid headers or unverified MFA → reject.
- Platform/admin routes use a different guard (e.g. `PlatformLegalGuard`,
  requiring a platform access role like `VIEW_TENANT` + MFA) — don't mix them
  with tenant routes.
- No cross-tenant reads, aggregates, or logs that leak another tenant's data.
- Minimise personal data; respect privacy export/deletion
  (`apps/api/src/modules/privacy`).
