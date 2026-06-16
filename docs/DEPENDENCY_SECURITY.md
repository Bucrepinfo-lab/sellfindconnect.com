# Dependency Security Notes

Date reviewed: 2026-06-15

Before installing deployment tooling, `npm audit` reported seven moderate
transitive advisories through:

- Prisma development tooling (`@hono/node-server`)
- NestJS Swagger (`js-yaml`)
- Next.js (`postcss`)

Installing `@railway/cli` locally added two high-severity transitive advisories.
The CLI is used only for deployment administration and is not application
runtime functionality. Remove it from the workspace after deployment and use a
pinned transient or separately installed CLI for future Railway operations.

The npm-proposed automated fixes would force breaking framework changes, so
they were not applied.

Required follow-up:

- Re-run `npm audit` during every dependency update.
- Upgrade Prisma, NestJS Swagger, and Next.js as soon as their supported release
  lines include patched transitive dependencies.
- Add automated dependency scanning in CI.
- Keep deployment CLIs out of production runtime images.
- Do not use `npm audit fix --force` without reviewing framework compatibility,
  builds, tests, and runtime behavior.
