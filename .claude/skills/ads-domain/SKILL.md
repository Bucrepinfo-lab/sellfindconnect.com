---
name: ads-domain
description: Use when building or reviewing anything that touches the commercial-relationship graph, the Source Finder (intent vocabulary and match reason codes), or the zero-tolerance / prohibited-content taxonomy for SellFindConnect.com / Telpen Adverts. These are the product's core IP and the terms a contributor must get exactly right.
---

# Ads domain — the product's core IP

## Purpose
SellFindConnect.com ("Sell it. Find it. Connect.") sells *commercial
relationship intelligence*: not listings, but the source-to-customer graph of
who does what for an item or service in a country. Get this vocabulary right —
it is the differentiator and it is encoded, not free text.

## When to use
- Adding/changing supply-chain roles, relationship kinds, or Source Finder
  matching, reason codes, or ranking.
- Writing copy, specs, or tests that name these concepts.
- Any moderation / acceptable-use work.

## The commercial-relationship graph
Source: `packages/domain/src/industries.ts` and
`packages/domain/src/relationships.ts`.

- **Supply-chain roles** (`supplyChainRoles`): `PRODUCER`, `SUPPLIER`,
  `DISTRIBUTOR`, `WHOLESALER`, `RETAILER`, `SERVICE_PROVIDER`, `BUYER`,
  `CONSUMER`, `AGENT`, `INSTALLER`, `MAINTAINER`, `LOGISTICS_PROVIDER`,
  `FINANCIER`, `CERTIFIER`. Type `SupplyChainRole`.
- **Relationship kinds** (`relationshipKinds`): `SUPPLIES_TO`, `BUYS_FROM`,
  `PRODUCES`, `DISTRIBUTES`, `CONSUMES`, `INSTALLS`, `REPAIRS`, `FINANCES`,
  `CERTIFIES`, `SHIPS`, `WHOLESALES`, `RETAILS`, `PARTNERS_WITH`. Type
  `RelationshipKind`. A claim links a `sourceRole` to a `counterpartRole` by a
  relationship; `graphRelationshipByKind` maps kinds to graph-link relationships.

Use the enum members verbatim — never invent a role or relationship string.

## Source Finder intent vocabulary & matching
Source: `packages/domain/src/source-finder.ts`; wiring
`apps/api/src/modules/source-finder/*` (`@Controller('source-finder')`,
`POST /source-finder/search`, `.../index/reindex`, `.../saved-searches`,
`.../alerts`, `.../outcomes`).

The searcher's intent is "who **supplies / buys / produces / consumes /
installs / repairs / ships / finances / certifies / distributes** X in country
Y", expressed through role + relationship + industry + country filters, plus
keyword and semantic (embedding) search.

**Match reason codes** are explainable and must stay in sync with their
human-readable reasons (`sourceFinderReasonCodes`):
`OFFER_MATCH`, `NEED_MATCH`, `NAME_OR_LOCATION_MATCH`, `ROLE_MATCH`,
`INDUSTRY_MATCH`, `COUNTRY_MATCH`, `VERIFIED_PROFILE`, `POPULAR_PROFILE`,
`FAST_RESPONSE`, `RELATIONSHIP_LINKS`, `OUTCOME_FEEDBACK`, `KEYWORD_MATCH`,
`SEMANTIC_MATCH`. Every surfaced match carries its codes + reasons; accepted/
saved outcomes feed back via `OUTCOME_FEEDBACK`. If you add a code, add its
reason string and a domain test.

## Zero-tolerance / prohibited-content taxonomy
Source: `packages/domain/src/safety.ts` (`prohibitedCategorySummaries`, 28
entries) with helpers `evaluateSafetyFields`, `evaluateSafetyText`; enforcement
helper `assertSafeFields` in `packages/domain/src/ugc-moderation.ts`.

Categories include: `WEAPONS_EXPLOSIVES`, `SEXUAL_EXPLOITATION`,
`CHILD_ENDANGERMENT`, `HUMAN_TRAFFICKING`, `ILLEGAL_DRUGS`, `VIOLENT_EXTREMISM`,
`HATE_THREATS`, `SELF_HARM_GRAPHIC_VIOLENCE`, `CRIMINAL_SERVICES`,
`ILLEGAL_WILDLIFE_TRADE`, `PLATFORM_ABUSE`, `SPAM_SCAMS`,
`INTELLECTUAL_PROPERTY_ABUSE`, `PROHIBITED_INFRASTRUCTURE_USE` (and more — read
the file for the full list and summaries).

## Steps when touching this domain
1. Read the source file(s) above; reuse the exported enums/helpers — do not
   duplicate the vocabulary.
2. Put new logic in `packages/domain` (framework-free) with a `*.test.ts`.
3. Run safety checks on any user/tenant-supplied text/fields.
4. Verify reason codes and reasons stay paired; keep domain tests green.

## Guardrails
- Prohibited categories are absolute; never surface one as an opportunity or a
  listing. Fail closed on moderation.
- Keep the vocabulary stable and typed; a casual rename is a breaking change to
  the graph and to saved searches.
