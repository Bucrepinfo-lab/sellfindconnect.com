# Telpen Adverts

Multi-tenant advertising, Source Finder, commercial relationship intelligence,
messaging, analytics, subscription, and country tax-remittance platform.

## Workspace

- `apps/web`: Next.js responsive web/PWA
- `apps/api`: NestJS API
- `packages/domain`: shared country, industry, role, and safety rules
- `packages/database`: Prisma/PostgreSQL schema
- `docs`: technical architecture and implementation backlog

**Production:** Fly.io Frankfurt — see [`docs/FLY_DEPLOYMENT.md`](docs/FLY_DEPLOYMENT.md).
Hosted Prisma and scheduled jobs are live. Native mobile remains out of scope.

## Brand And Growth

- Primary brand domain: `SellFindConnect.com`
- Campaign line: Sell it. Find it. Connect.
- SEO and growth plan: [`docs/MARKETING_SEO_GROWTH_STRATEGY.md`](docs/MARKETING_SEO_GROWTH_STRATEGY.md)

## Local Setup

1. Install the required development tools in
   [`docs/DEVELOPMENT_ENVIRONMENT.md`](docs/DEVELOPMENT_ENVIRONMENT.md).

2. Start local infrastructure:

   ```powershell
   docker compose up -d
   ```

3. Install dependencies:

   ```powershell
   npm.cmd install
   ```

4. Create local environment settings:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Validate the database schema:

   ```powershell
   npm.cmd run db:validate
   ```

6. Start the web and API applications:

   ```powershell
   npm.cmd run dev
   ```

Web: `http://localhost:3000`

API: `http://localhost:4000/v1`

OpenAPI: `http://localhost:4000/docs`

Auth, profile, advert, relationship, and analytics repositories use in-memory
storage by default for local demo work. After migrations and seed data are
ready, set `PERSISTENCE_DRIVER=prisma` with `DATABASE_URL` to overlay
PostgreSQL-backed persistence for repositories and media queues. Named
`PERSISTENCE_DRIVER=live` fail-closes without `DATABASE_URL`. Per-repository
keys such as `AUTH_REPOSITORY=memory` still win over the overlay. `GET /v1/health`
reports `persistence.driver`, `mode`, and `databaseConfigured` without the URL.
