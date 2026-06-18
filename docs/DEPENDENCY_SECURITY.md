# Dependency Security Notes

Date reviewed: 2026-06-18

Current status after the 2026-06-18 sanitising pass:

- Removed the local `@railway/cli` dev dependency and root Railway deployment
  scripts while deployment work is paused. This pruned the vulnerable `tar`
  dependency chain from normal project installs.
- `npm audit` still reports remaining NestJS, Next.js, and Prisma advisories
  because the latest primary packages published to npm still pin or bundle
  affected transitive ranges. npm's automated fix suggestions would downgrade
  major frameworks and are not compatible with this codebase.

Before the pass, `npm audit` reported twelve advisories: six moderate and six
high. After pruning the deploy-only CLI chain, `npm audit` reports ten
advisories: six moderate and four high.

The npm-proposed automated fixes would force breaking framework changes, so
they were not applied.

Required follow-up:

- Re-run `npm audit` during every dependency update.
- Upgrade Prisma, NestJS, NestJS Swagger, and Next.js as soon as their supported
  release lines include patched transitive dependencies.
- Add automated dependency scanning in CI.
- Keep deployment CLIs out of production runtime images.
- Install provider deployment CLIs only as transient tools or in a separate
  deployment workstation profile after deployment work resumes.
- Do not use `npm audit fix --force` without reviewing framework compatibility,
  builds, tests, and runtime behavior.

## Input Sanitisation Boundary

The API now applies a global sanitising pipe before validation. It normalizes
Unicode text, removes hidden format/control characters, trims ordinary user
content, limits nested payload traversal, and intentionally leaves secrets such
as passwords, tokens, and MFA codes unchanged.

The Nest validation pipe also strips unknown fields, rejects non-whitelisted
fields, rejects unknown values, disables implicit conversion, and avoids
including submitted target/value data in validation errors.

## Hosting Acceptable-Use Alignment

Railway is the current deployment host, so application input guards and terms
must prevent users from using Telpen surfaces for activity that would violate
Railway-style acceptable-use restrictions. User-generated profiles, listings,
searches, messages, media, links, payment descriptors, automation, and exports
must block illegal activity, child exploitation, terrorism or violent
extremism, human trafficking, nonconsensual sexual content, fraud, phishing,
impersonation, malware, unauthorized access, DDoS, botnets, spam, abusive
scraping, copyright piracy, crypto mining, torrenting, open proxies,
anonymizers, compute resale, or infrastructure abuse.

Official policy references:

- Railway Acceptable Use Policy: https://railway.com/legal/acceptable-use
- Railway Terms of Service: https://railway.com/legal/terms
