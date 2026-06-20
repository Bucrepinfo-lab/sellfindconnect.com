# Product Requirements Document: Multi-Tenant Advertising SaaS

Date: 2026-06-15
Last updated: 2026-06-20
Owner: Telpen Adverts
Working name: Telpen Adverts Platform
Status: Draft for validation

## 1. Executive Summary

Telpen Adverts is a multi-tenant advertising, discovery, and matchmaking SaaS for web and downloadable mobile apps. The platform lets businesses, suppliers, producers, service providers, institutions, creators, and professionals create rich advertising profiles, publish media-rich listings, and get matched with the most relevant customers, consumers, suppliers, producers, partners, and buyers.

The key differentiator is not only advertising visibility. The platform's main promise is high-precision linking: helping the advertiser find the most likely buyers or partners, and helping users find the most credible source, supplier, producer, or provider for an item or service, with built-in real-time messaging to complete the connection.

The first month is free. Starting in month two, subscribers pay 10 units of the subscriber country's local currency per month. In countries whose currency is denominated in shillings, this is displayed as 10 local shillings. In countries using another currency name, it is displayed as 10 units of that country's official local currency, subject to tax, app-store pricing tiers, and payment-provider minimums.

## 2. Product Goals

1. Create the most convenient search and discovery platform for sources, suppliers, producers, consumers, and likely clients.
2. Support every major industry category so users can select the industry they operate in and be discovered by relevant demand.
3. Provide rich, editable advertiser profiles with contacts, description, media, links, and preview before publishing.
4. Use a privacy-aware matching engine to connect advertisers to likely customers, consumers, suppliers, producers, and adjacent businesses.
5. Provide real-time chat and inquiry tools so linked parties can communicate inside the platform.
6. Provide strong monitoring and analytics across advertiser, country, continent, and global head-office levels.
7. Launch on responsive web, PWA, Android, and iOS with localized country flags, country currency, language, and regulatory controls.

### 2.1 Competitive Advantage and Market Niche Strategy

Telpen should not compete only as a directory, classifieds board, or social advertising app. Its defensible niche is commercial relationship intelligence: the fastest way to find who produces, supplies, buys, consumes, installs, repairs, ships, finances, certifies, or distributes an item or service in a country.

Signature advantages:

- Source-to-customer graph: map producers, suppliers, distributors, retailers, service providers, consumers, likely clients, financiers, certifiers, and logistics providers around each advertised item.
- Precision matching: rank likely customers and suppliers using industry, role, location, declared needs/offers, behavior, relationship links, verification, response speed, and outcomes.
- Search by commercial intent: support searches such as "who supplies this", "who produces this", "who buys this", "who can install this", "who can transport this", and "who needs this".
- Trust-first marketplace: verification, approved relationship links, zero-tolerance blocked categories, fraud detection, safety review, and response-quality scoring.
- Conversion workspace: built-in inquiry forms, RFQs, quote requests, chat, lead assignment, reminders, and analytics so discovery turns into communication.
- Local advantage: country flag, local currency pricing, local industry terms, local payment rails, local compliance, and country-level analytics.
- Management hierarchy: head office, region, continent, country, and tenant views create a structure competitors usually lack in small-business advertising tools.
- Data moat: as more searches, relationships, inquiries, and outcomes occur, Telpen's matching graph becomes more accurate and harder to copy.

Market-command requirements:

- The first screen after onboarding must help a user either publish an advert or find a source/supplier/customer within seconds.
- Every listing must answer: what is offered, who it is for, where it is available, how to contact, and which related suppliers/customers/producers are relevant.
- Every search result must include reason codes explaining why it matched.
- Every advertiser must receive actionable suggestions: missing profile data, likely customer segments, demand gaps, underperforming listings, and next best action.
- Every country admin must see supply gaps, demand gaps, trending industries, safety risks, and subscription health.

## 3. Research Insights and Constraints

Market observations:

- Google Business Profile sets user expectations for free business presence, photos, reviews, updates, calls, bookings, search terms, calls, reviews, bookings, and performance insights. Telpen must go beyond this by linking suppliers, producers, consumers, and likely buyers directly rather than acting only as a profile listing.
- Alibaba's B2B model emphasizes storefronts, RFQ, product showcase, buyer insights, global reach, and supplier tools. Telpen should combine B2B sourcing with local service discovery and consumer matching.
- LinkedIn business pages show the importance of complete profiles, logos, cover images, posting, high-quality visuals, analytics, and professional trust.

Regulatory and platform constraints:

- Apple App Store guidelines require apps with user-generated content to include filtering, reporting, blocking, and published contact information. Apple also expects complete metadata, functioning backend services, demo access during review, and responsibility for third-party SDK behavior.
- Google Play requires transparent data handling, secure transmission, prominent disclosure/consent for sensitive data uses, an accurate Data Safety section, public privacy policy, and in-app plus web-accessible account deletion.
- Google Play subscription policy requires clear localized subscription offers and easy cancellation/management access.
- GDPR applies to organizations targeting or collecting data about people in the EU/EEA and requires privacy-by-design, lawful processing, data minimization, consent or another valid lawful basis, and data subject rights.
- CCPA/CPRA gives California consumers rights over personal information and requires privacy disclosures for covered businesses.
- WCAG 2.2 should guide accessibility across web and mobile.
- OWASP API Security Top 10 2023 is critical because this platform will expose tenant, profile, listing, analytics, media, billing, and messaging APIs.
- PCI DSS applies if the business stores, processes, or transmits cardholder data directly. Prefer payment providers and app-store billing to minimize PCI scope.

Selected sources:

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Subscriptions policy: https://support.google.com/googleplay/android-developer/answer/9900533
- Google Play Inappropriate Content policy: https://support.google.com/googleplay/android-developer/answer/9878810
- Google Play Child Endangerment policy: https://support.google.com/googleplay/android-developer/answer/9878809
- Google Play Illegal Activities policy: https://support.google.com/googleplay/android-developer/answer/9878877
- Google Play User Generated Content policy: https://support.google.com/googleplay/android-developer/answer/9876937
- UNODC Human Trafficking FAQ: https://www.unodc.org/unodc/en/human-trafficking/faqs.html
- Algolia AI Search: https://www.algolia.com/products/ai-search
- Elasticsearch vector database: https://www.elastic.co/elasticsearch/vector-database
- Twilio Conversations: https://www.twilio.com/docs/conversations
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Stripe Tax: https://docs.stripe.com/tax
- Stripe Tax calculation: https://docs.stripe.com/tax/calculating
- Stripe Tax obligation monitoring: https://docs.stripe.com/tax/monitoring
- Stripe Tax filing and remittance: https://docs.stripe.com/tax/filing
- Stripe Tax reporting: https://docs.stripe.com/tax/reports
- Stripe Tax supported countries: https://docs.stripe.com/tax/supported-countries
- OECD International VAT/GST Guidelines: https://www.oecd.org/tax/consumption/international-vat-gst-guidelines.htm
- EU VAT e-commerce and OSS reference: https://taxation-customs.ec.europa.eu/business/vat/vat-e-commerce_en
- Google Business Profile: https://business.google.com/us/business-profile/
- Alibaba Seller Central: https://seller.alibaba.com/
- LinkedIn Pages: https://business.linkedin.com/advertise/linkedin-pages
- European Commission GDPR legal framework: https://commission.europa.eu/law/law-topic/data-protection/legal-framework-eu-data-protection_en
- California CCPA: https://www.oag.ca.gov/privacy/ccpa
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- PCI DSS: https://www.pcisecuritystandards.org/standards/pci-dss/
- EU Digital Services Act: https://digital-strategy.ec.europa.eu/en/policies/digital-services-act-package
- European Data Protection Board SME data protection guide: https://www.edpb.europa.eu/sme-data-protection-guide/home_en
- FTC endorsements, influencers, and reviews guidance: https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews

## 4. Target Users

Primary users:

- Advertisers: businesses, suppliers, producers, service providers, professionals, manufacturers, farmers, shops, wholesalers, institutions, creators, contractors.
- Searchers: consumers, buyers, procurement teams, wholesalers, retailers, households, service seekers, project owners.
- Match participants: advertisers linked to customers, suppliers, producers, distributors, agents, and likely clients.

Internal users:

- Global head office administrators.
- Multicontinental/regional administrators.
- Continental administrators.
- Country administrators.
- Tenant administrators.
- Moderators.
- Support agents.
- Sales/account managers.
- Finance and subscription operators.
- Data/analytics users.

## 5. Industry Category Requirements

Use a global industry taxonomy based on ISIC/NAICS-style broad sectors, with country-specific labels and deeper subcategories. The user must choose at least one primary industry and may choose secondary industries, product/service tags, and supply-chain role.

Required top-level categories:

1. Agriculture, forestry, fishing, livestock, and aquaculture
2. Mining, quarrying, oil, gas, and minerals
3. Manufacturing and processing
4. Utilities, energy, water, and waste management
5. Construction, building materials, and infrastructure
6. Wholesale, retail, trade, e-commerce, and distribution
7. Automotive, motorcycles, machinery, parts, and repair
8. Transport, logistics, shipping, storage, and warehousing
9. Hospitality, accommodation, restaurants, catering, and tourism
10. Information, communication, media, telecoms, and technology
11. Finance, insurance, fintech, accounting, and investment
12. Real estate, property, rentals, and facilities
13. Professional, scientific, technical, legal, and consulting services
14. Administrative, support, cleaning, staffing, and business services
15. Public administration, NGOs, associations, and civic services
16. Education, training, tutoring, and research
17. Health, wellness, social care, pharmaceuticals, and medical supplies
18. Arts, entertainment, events, sports, and recreation
19. Beauty, fashion, personal care, repair, and other local services
20. Home, household, childcare, domestic, and personal support
21. International organizations, cross-border agencies, and export bodies

Each category must support:

- Subcategories by country/region.
- Search synonyms and local terms.
- Product/service tags.
- Supply-chain role: producer, supplier, distributor, wholesaler, retailer, service provider, buyer, consumer, agent, installer, maintainer, logistics provider, financier, certifier.
- Compliance flags for regulated categories such as healthcare, finance, alcohol, medicine, and transport.
- Zero-tolerance blocked categories must not be available as industries, subcategories, tags, search facets, paid promotions, relationship links, or matching targets.

### 5.1 Zero-Tolerance Blocked Categories

The platform must entirely block weapons, pornography, human trafficking/human trade, and other categories of similar severity. These categories are not "regulated industries" on Telpen; they are prohibited across signup, profiles, listings, media, search, matching, recommendations, chat, payment, links, and analytics exports.

Hosting-provider acceptable-use alignment is mandatory. Telpen must not allow users to publish, search, link, message, upload, promote, automate, or transact around activity that would violate strict cloud-hosting acceptable-use rules, including illegal activity, child exploitation, terrorism or violent extremism, human trafficking, nonconsensual intimate imagery, fraud, phishing, impersonation, malware, unauthorized access, DDoS, botnets, spam, abusive scraping, copyright piracy, crypto mining, torrenting, open proxies, anonymizers, compute resale, or other infrastructure abuse.

Blocked categories:

- Weapons, firearms, ammunition, explosives, weapon parts, weapon accessories, firearm conversion devices, bomb-making materials, tactical weapon kits, 3D-printable weapon files, and instructions for manufacturing, modifying, sourcing, or using weapons.
- Pornography, overtly sexual content, sexual services, prostitution, escort services, compensated dating, "sugar dating", sexual solicitation, sex guides, sexual aids marketed for gratification, explicit fetish content, bestiality, and adult entertainment.
- Non-consensual sexual content, sexual deepfakes, hidden-camera sexual content, sexual blackmail, sextortion, creepshots, or any attempt to exploit a person sexually.
- Child sexual abuse and exploitation, child sexual abuse material, grooming, sexualization of minors, trafficking of a child, sextortion of a child, and any content or behavior that endangers children.
- Human trafficking, forced labor, slavery, servitude, debt bondage, forced marriage, illegal adoption, recruitment or transport for exploitation, organ trafficking, human body-part trade, and any offer that treats a person as a commodity.
- Illegal drugs, controlled substances, drug manufacturing or growing instructions, drug paraphernalia for illegal use, marijuana/THC sales where app-store rules prohibit facilitation, and any content that helps source illegal substances.
- Terrorism, violent extremism, dangerous organizations, recruitment, fundraising, propaganda, glorification, or instructions for violence against civilians.
- Hate content, dehumanization, incitement to violence, targeted harassment, blackmail, extortion, or threats.
- Graphic violence, torture, abuse, self-harm encouragement, suicide encouragement, dangerous challenges, or content that creates a serious risk of physical harm.
- Counterfeit goods, stolen goods, fake IDs/documents, credential theft, malware, hacking-for-hire, phishing, scams, money laundering, bribery, sanctions evasion, and other criminal services.
- Illegal wildlife trade, endangered species products, poaching services, and other illegal trafficking of protected natural resources.

Enforcement requirements:

- The taxonomy must exclude these categories and synonyms from selectable industries, subcategories, and tags.
- Users attempting to create blocked profiles, listings, media, links, chats, or search queries must receive a policy-block response rather than a publishable draft.
- Users attempting hosting-provider-prohibited activity must receive the same policy-block response and must not receive search results, match suggestions, related entities, chat prompts, paid promotion, analytics exports, or publishable drafts.
- Blocked content must not be indexed, recommended, matched, boosted, shared, downloaded, or monetized.
- Detection must combine keyword/synonym lists, image/video moderation, link/domain checks, entity recognition, user reports, country-specific prohibited terms, and human review for ambiguous cases.
- Confirmed severe violations must remove the content, suspend or terminate the account, preserve evidence according to legal policy, and escalate to the appropriate country authority or child-safety reporting body where required.
- Moderators must be trained that these categories are not eligible for appeal to publish. Appeals may only correct mistaken classification.
- The safety policy must be publicly visible in Terms, Community Standards, onboarding, listing creation, and app-store review materials.
- One versioned, shared zero-tolerance catalogue must drive public policy labels, form validation, server enforcement, moderation reason codes, analytics, and audit logs so highlighted terms never disagree with executable controls.
- Client-side detection is only an immediate user experience control. Every server-side write, search, upload, relationship-link, messaging, payment, export, recommendation, and indexing path must independently reject prohibited content before persistence or distribution.
- Safety checking must inspect all user-controlled text and metadata recursively, including names, descriptions, contacts, URLs, tags, captions, filenames, OCR/transcripts, link previews, message attachments, and structured nested fields.
- API request bodies must pass through shared sanitisation before validation and policy checks, including Unicode normalization, hidden control/format character removal, reasonable recursion limits, and preservation of secret fields such as passwords and tokens.
- Normalization must resist basic evasion through casing, punctuation, spacing, Unicode variants, common character substitutions, coded terms, and country/language synonyms without silently publishing ambiguous high-risk content.
- A blocked search must return no commercial results, suggestions, related entities, cached matches, analytics exports, or advertising inventory for the prohibited request.
- A blocked draft must not be previewed externally, published, shared, downloaded, matched, messaged from, promoted, billed, or submitted for payment.
- Public policy summaries may explain prohibited categories, but internal detection dictionaries, confidence thresholds, abuse signals, and investigator tooling must remain restricted to authorized safety staff.

### 5.2 Terms, Responsibility, and Submission Gate

Every profile, listing, media upload, relationship claim, message-enabled advert, payment-enabled advert, and paid promotion must pass a terms-and-conditions submission gate before it can be published or distributed. The gate must be explicit in web and mobile clients, with clear accept, withdraw, and blocked-state controls.

Required terms clauses:

- The user confirms lawful authority to create, post, sell, source, promote, link, message, distribute, and transact around the advertised goods or services.
- The user is responsible for truthfulness, current pricing, availability, qualifications, licenses, permits, safety claims, health claims, financial claims, endorsements, guarantees, taxes, delivery terms, refunds, and dispute handling.
- The user must not submit, search for, link to, message about, pay for, or attempt to source any zero-tolerance prohibited category.
- The user must not use Telpen or its hosting infrastructure for spam, phishing, malware, botnets, DDoS, unauthorized access, abusive scraping, proxies/anonymizers, torrenting, crypto mining, compute resale, copyright piracy, fraud, impersonation, or any other infrastructure abuse.
- The user must own or have lawful permission for all uploaded names, brands, images, clips, files, links, code, descriptions, endorsements, and intellectual-property claims.
- The user must only upload or use contact data, biodata, buyer signals, supplier data, media, documents, and personal data with lawful notice, consent, contract, legitimate interest, or another valid legal basis in the relevant country.
- The user accepts responsibility for their own profile, listing, content, chats, contracts, deliveries, payments, taxes, customs, licenses, and disputes. Telpen is not a party to user-to-user transactions unless a separate written agreement says otherwise.
- The user indemnifies and holds Telpen harmless for claims arising from the user's unlawful or inaccurate content, transactions, communications, tax failures, intellectual-property violations, or prohibited conduct to the maximum extent allowed by law.
- Telpen retains the right to block, reject, remove, de-rank, disable sharing/downloading, rate-limit, suspend, terminate, preserve evidence, and report severe violations where allowed or required.
- No clause may be drafted, displayed, or enforced as a waiver of non-waivable duties owed by Telpen under consumer protection, privacy, tax, platform, app-store, child-safety, marketplace, criminal-reporting, or other mandatory law.

Execution requirements:

- Publishing must stay locked until the latest required terms version is accepted.
- Acceptance must be stored with user_id, tenant_id, country_id, terms version, policy version, IP/device metadata where lawful, timestamp, locale, app surface, and acceptance source.
- Acceptance must be renewed when material terms, privacy, subscription, prohibited-category, payment, or country-specific obligations change.
- Terms acceptance must never override zero-tolerance enforcement. If a draft, search, upload, link, message, or payment request is blocked, the user cannot proceed by accepting terms.
- Minors, restricted industries, licensed professions, health, finance, transportation, employment, childcare, and other regulated sectors may require additional country-specific attestations before publishing.
- Legal, support, and moderators must be able to retrieve the exact accepted terms version for an audit or dispute.

## 6. Tenant, Hierarchy, and Organizational Model

The platform must be multi-tenant. A tenant is an organization, business, agency, professional, supplier, producer, or advertiser account with isolated data, settings, subscriptions, users, and analytics.

Hierarchy:

1. Global Head Office
   - Sees all continents, countries, tenants, revenue, content risk, and platform health.
   - Manages global policies, global taxonomy, pricing rules, payment providers, and global reports.
2. Multicontinental/Regional Office
   - Optional layer for regions such as EMEA, Americas, APAC, or company-defined clusters.
   - Sees assigned continents/countries.
3. Continental Office
   - Africa, Europe, Asia, North America, South America, Oceania, Antarctica/Other.
   - Sees continent-level growth, revenue, moderation, matching success, and country performance.
4. Country Office
   - Sees country-local tenants, subscribers, currency, tax, language, moderation, support, and compliance.
5. Tenant Account
   - Manages profiles, contacts, listings, media, links, inquiries, chats, subscription, and analytics.
6. Tenant Users
   - Owner, admin, editor, salesperson, support/chat agent, analytics viewer, billing manager.

Every record must include tenant_id, country_id, continent_id, region_id, created_at, updated_at, created_by, updated_by, status, and audit metadata.

## 7. Core Product Scope

### 7.1 Onboarding and Localization

Requirements:

- Detect probable country from app-store country, SIM/network when available, device locale, IP geolocation, and user-selected country.
- Always allow the user to manually change country because VPN, travel, and diaspora use are common.
- Display the selected country flag and country name in account, profile, search, and billing contexts.
- Localize currency, phone format, address fields, date/time, language, tax display, and subscription messaging.
- Ask user type: advertiser, buyer/searcher, both, admin-invited user.
- Ask industry, supply-chain role, service area, target countries, and preferred contacts.
- Support web signup, mobile signup, SSO, email/password, phone OTP where appropriate, and optional enterprise SSO later.
- Require explicit acceptance/submission controls for terms, privacy policy, community rules, prohibited-content policy, and subscription trial terms.
- Block account/profile setup when the selected industry, description, intended products, links, or uploaded media match a zero-tolerance category.

Implementation progress on 2026-06-18:

- Added shared owner onboarding helpers for password policy, trial subscription windows, active policy versions, and terms acceptance evidence.
- Added an MVP auth API for tenant-owner registration, secure password hashing, login sessions, MFA verification, tenant-session checks, and tenant listing.
- Added zero-tolerance checks during registration so prohibited tenant names or onboarding data cannot create an account.
- Added a global API input sanitising pipe before validation so registration, profile, listing, search, lead, chat, analytics, notification, and finance request bodies are normalized before policy checks.
- Added an auth repository boundary so the current in-memory MVP can be replaced by Prisma-backed persistence without changing public auth controller contracts.
- Added session-token hash storage so raw bearer tokens are only shown at issuance time and are not retained as lookup keys.
- Added generated, hashed, time-limited MFA challenges so the fixed development code is no longer accepted.
- Added generated, hashed, expiring email verification and password reset challenges, including password reset session revocation.
- Added MVP tenant invites so verified owners can invite non-owner tenant roles and invited users can accept with current terms, verified email, role-aware membership, and a fresh session.
- Added auth audit logging for sensitive auth and invite events, plus an owner/MFA-protected tenant audit lookup endpoint that excludes raw secrets, tokens, codes, invite links, and raw email addresses.
- Added existing-account invite acceptance requiring an active session for the invited account before linking that account to another tenant.
- Added an opt-in Prisma auth repository for durable user, tenant, membership, session, MFA challenge, account challenge, tenant invite, and policy-acceptance persistence when `AUTH_REPOSITORY=prisma` is enabled with `DATABASE_URL`.
- Added a reusable tenant session guard that validates `x-session-token` against `x-tenant-id` and requires MFA before protected tenant routes proceed.
- Migrated profile draft/preview routes and advert listing/lifecycle routes to the MFA-verified tenant session guard.
- Migrated lead conversion and conversation/chat routes to the MFA-verified tenant session guard.
- Migrated Source Finder, notification, analytics, and finance routes to the MFA-verified tenant session guard and removed the obsolete header-only tenant context guard.
- Added database support for password metadata, auth sessions, tenant onboarding attributes, and policy acceptance evidence.
- Added a checked-in baseline Prisma migration plus repeatable database seed workflow for continents, pilot country setup, and industry categories.
- Added a web Owner Onboarding panel showing password strength, trial end date, next billing amount, current terms versions, and signup lock state.

Acceptance criteria:

- A new advertiser can create an account, select country, industry, and role within 3 minutes.
- User can override detected country before subscription pricing is shown.
- App shows the correct selected flag and currency across account and billing screens.

### 7.2 Advertiser Profile

Profile fields:

- Business/person name
- Legal name
- Display name
- Industry and subcategory
- Supply-chain role
- Verification status
- Description of what the advertiser does
- Products/services offered
- Products/services needed
- Target customers
- Target suppliers/producers
- Operating countries
- Service area radius and locations
- Contacts: phone, WhatsApp, email, website, physical address, maps link, social links
- Opening hours/availability
- Languages supported
- Certifications, licenses, permits
- Price range or quote mode
- Minimum order quantity where relevant
- Delivery, pickup, shipping, or digital delivery options
- Payment methods accepted
- Tags and keywords
- Profile completeness score
- Public/private controls for sensitive contact fields

Requirements:

- Profile must be editable any time.
- Every edit must have preview before publishing.
- Profile changes must be saved as draft until published.
- Previous public version must remain live until new draft is published.
- Admin/moderator can require review for high-risk category changes.
- Profile must show created date, updated date, and how long the profile has been active.

Implementation progress on 2026-06-19:

- Added the first tenant-session protected profile publish workflow: a safe draft
  can become the tenant's live profile, the prior live profile is archived, and
  profile versions plus days-live metadata are tracked.
- Added API support for reading the current live profile and published profile
  history.
- Added profile publish audit evidence so sensitive publication events can be
  reviewed from the tenant audit trail.
- Added a profile repository boundary with in-memory default storage and
  opt-in Prisma persistence for profile drafts, live profile publishing,
  previous-live archiving, and source-draft linkage.
- Added profile draft editing with audit evidence, publish-time request and
  stored current-terms checks, and review-pending gates for high-risk industry,
  role, or country changes.
- Added persisted review reasons and an MVP owner/admin review workflow for
  pending profile drafts, including review queue listing, approve/reject
  decisions, review notes, and publish blocking for rejected drafts.
- Added profile contact enrichment and service-area coverage for WhatsApp,
  physical address, map URL, social/contact links, primary city, regions,
  radius, remote availability, and operating countries, including preview and
  live publish carry-over.
- Added platform-level profile moderation access with MFA-required
  `MODERATE_CONTENT` assignments, scoped pending-review queue filtering,
  country/tenant access checks, platform review endpoints, and access-decision
  audit persistence.
- Added the profile media display foundation: shared media policy, ten-item
  display cap, supported image/video metadata, recursive safety checks for media
  captions/URLs/filenames, tenant-session protected draft media routes, preview
  media slots, Prisma `MediaAsset` persistence, and publish-time media carry-over
  into the live profile.
- Added provider-neutral profile media upload preparation plus storage,
  moderation, and CDN/transform adapter hooks, with persisted storage keys,
  CDN URLs, transform status, and variant metadata.
- Added S3-compatible presigned PUT upload support through env-configured
  Signature V4 signing, plus scan/transform processing job interfaces.
- Added durable Prisma/PostgreSQL media processing job outbox persistence with
  worker claim, completion, retry, and final-failure support.
- Added a shared media module and internal job-key protected media processing
  runner, `POST /v1/operations/media/processing/run`, with development
  processors for scan, moderation, image transform, and video transcode jobs.
- Added generic HTTP provider-backed processor adapters for malware scan,
  content moderation, image transform, and video transcode jobs.
- Added Prisma media asset result publication from completed/final worker jobs,
  including moderation state, blocked fail-closed states, transform status,
  CDN URLs, thumbnails, and responsive variants.
- Added durable unsafe-media review cases through Prisma `MediaReviewCase`
  records for blocked or final-failed scan/moderation/transform output,
  including severity, source job, provider, reason, and evidence.
- Added protected platform media review endpoints for MFA-required
  `MODERATE_CONTENT` moderators to list scoped review cases, resolve cases as
  confirmed blocked, restored, escalated, or dismissed, block unsafe moderator
  notes, and persist tenant audit evidence for the decision.
- Remaining hardening: live object-storage credentials, approved provider
  endpoints, CDN publication verification, moderator case assignment queues,
  legal/reporting escalation playbooks, richer review case management, and
  user-facing review status in web/mobile clients.

### 7.3 Media Display Area

Requirements:

- Each profile/listing supports a maximum of 10 media items.
- Media can include images and short clips.
- Supported image types: JPG, PNG, WebP, HEIC converted where supported.
- Supported video types: MP4/MOV uploads transcoded to web/mobile-friendly MP4/HLS.
- Each media item must support caption, alt text, display order, crop/thumbnail, and visibility.
- User can preview full profile/listing before posting/uploading.
- Media moderation must check for prohibited content, malware, unsafe files, copyright reports, sexual content, child-safety risk, trafficking indicators, violence, fraud, weapons, drugs, and regulated goods.
- Media that matches zero-tolerance categories must be blocked before publishing and must not be available in preview links shared outside the editing user/team.
- Large uploads must show progress and resumable upload.
- Media CDN must create responsive sizes and thumbnails.
- Analytics must track media views, media clicks, video starts, video completion, downloads, and shares.

Initial limits:

- Image max: 10 MB each.
- Video max: 60 seconds and 100 MB each for MVP.
- Total media count: 10 per profile/listing.
- Admin can adjust limits per plan/category later.

### 7.4 Listings and Advert Posts

Listing fields:

- Title
- Category/subcategory
- Product/service type
- Description
- Price or quote mode
- Currency
- Location/service area
- Availability/in-stock status
- Supplier/producer/consumer relationship tags
- Related tenant/profile links
- Media gallery
- Contact and CTA settings
- Search keywords
- Publish start/end dates
- Created/uploaded/posted date
- Age since posting
- Status: draft, preview, pending review, live, paused, expired, rejected, archived

Requirements:

- Advertisers can create drafts and preview before publishing.
- Users can edit live listings through draft versions.
- Users can schedule posts.
- Users can pause, archive, duplicate, renew, or boost listings if future monetization allows.
- Every post, advert, and listing expires automatically after 40 days unless renewed.
- Renewal notification alerts must be sent on day 35 and day 39 before automatic deletion.
- Regulated categories require extra verification and moderator approval.
- Listings must support country, continent, and global visibility controls.

Implementation progress:

- Added the advert lifecycle foundation for 40-day expiry, day-35/day-39 renewal
  alerts, and day-40 auto-deletion.
- Added tenant-session protected advert media upload preparation, attach, and
  listing routes using the shared media policy and storage/moderation/CDN
  transform adapter hooks. Advert media enforces the ten-item cap, safety
  checks, moderation status, transform metadata, display slots, and media
  auto-archive when the advert auto-deletes.
- Added S3-compatible presigned upload readiness and media processing job
  queue contracts shared with profile media.
- Added durable media processing job outbox support so advert scan/transform
  jobs survive API restarts and can be processed by workers.
- Added the protected media processing runner endpoint shared by advert and
  profile media jobs.
- Added shared HTTP processor adapters and Prisma media-result publication for
  advert and profile media worker output.
- Added durable media review cases for unsafe or final-failed advert/profile
  media processing output.
- Added protected platform media review-case listing and resolution actions for
  scoped moderators, with unsafe review-note blocking and audit evidence.
- Added durable advert draft and published-advert repositories with in-memory
  and Prisma implementations, database migration support, draft preview,
  publish-to-live versioning, persisted renewal alerts, and pause/archive/renew
  controls.
- Live storage credentials, approved media vendors, moderator case assignment
  queues, duplicate/boost controls, and richer public listing discovery remain
  next.

### 7.5 Search and Discovery

The search experience is central to the product.

Requirements:

- Full-text search across business names, descriptions, products, services, tags, categories, and locations.
- Search by source, supplier, producer, consumer, likely client, item, service, industry, country, region, and availability.
- Filter by country, distance, industry, role, verified status, rating/reputation, response time, price range, delivery mode, language, media type, and active date.
- Sort by relevance, newest, most visited, most clicked, most enquired, nearest, top rated, recently updated, most shared, verified first, fastest responder.
- Typo tolerance, synonyms, local-language terms, and product aliases.
- Saved searches and alerts.
- Trending searches per country/industry.
- Related results: "similar suppliers", "likely buyers", "related producers", "consumers also searched", "suppliers for this item", "producers near you".
- Map view for location-relevant services.
- Search analytics for advertisers and internal admins.
- Searches for zero-tolerance categories must not return marketplace results, advertiser links, match suggestions, media, or chat prompts.
- Search logs involving suspected child exploitation, trafficking, weapons, drugs, or violent extremism must be routed to the safety review workflow according to legal policy.

Acceptance criteria:

- Search result relevance can explain why an item appeared: matching category, location, role, product tag, query text, or relationship graph.
- A user searching for an item can quickly discover producer, supplier, seller, related service provider, and likely consumer segments.

Implementation progress on 2026-06-17:

- Added a shared Source Finder ranking engine that scores results from query text, offers, declared needs, role, industry, country, verification, popularity, response speed, and relationship links.
- Added reason codes and human-readable match reasons so users understand why a producer, supplier, buyer, logistics provider, or related service appears.
- Added a tenant-scoped Source Finder API endpoint with server-side zero-tolerance blocking for prohibited searches.
- Updated the web Source Finder to use the shared ranking engine, expose sort modes, show match reasons, and display related commercial links.
- Remaining hardening: persisted search index, saved searches, relationship claim approval, outcome feedback, hierarchy dashboards, and privacy/consent controls for behavioral matching.

### 7.6 Precision Matching and Link Intelligence

This is the flagship feature.

Matching inputs:

- User-selected industry
- Product/service tags
- Supply-chain role
- Location and service area
- Business description
- Search behavior
- Saved searches
- Listing interactions
- Inquiry history
- Chat outcomes
- Public business biodata
- Declared needs/offers
- Transaction/inquiry outcomes
- Profile completeness
- Verification status
- Response speed
- Reputation and reports
- Similarity between product/service taxonomies
- Explicit user consent and privacy settings

Matching outputs:

- Likely customers
- Likely suppliers
- Likely producers
- Likely distributors/agents
- Related consumers
- Related businesses
- Complementary service providers
- Similar businesses
- Cross-sell/upsell opportunities
- Country/continent expansion suggestions

Requirements:

- Build a matching score from 0-100 with reason codes.
- Show match reasons in understandable language.
- Allow users to accept, dismiss, save, hide, report, or message a match.
- Allow advertisers to define "I sell", "I buy", "I produce", "I supply", "I consume", "I need", and "I can partner with".
- Do not expose private biodata without consent.
- Do not use sensitive categories such as race, religion, health, political view, children data, or precise location for matching unless there is a lawful and explicit reason.
- Provide opt-out from behavioral matching where required.
- Include anti-spam limits so match suggestions do not become mass unsolicited messaging.
- Track matching precision: accepted matches, messages started, inquiries sent, replies, qualified leads, blocked/reported matches, conversions.
- Exclude all zero-tolerance categories from matching, recommendations, relationship graph suggestions, "similar supplier" results, and outbound lead generation.

Recommended matching architecture:

- Phase 1: rules + taxonomy + location + role matching.
- Phase 2: search/vector semantic matching over profile and listing descriptions.
- Phase 3: relationship graph matching between producers, suppliers, distributors, consumers, and services.
- Phase 4: ML ranking using feedback and outcomes.
- Phase 5: explainable AI assistant for lead recommendations and profile improvements, subject to privacy disclosures.

Implementation progress on 2026-06-17:

- Added shared lead-conversion intelligence that turns a Source Finder match into match confidence, priority, response SLA, reason codes, and next-best actions.
- Added API support for match feedback actions: accept, save, dismiss, hide, and report.
- Added API support for safe inquiry/RFQ creation, with current terms acceptance required before a match can become a lead.
- Added a tenant lead inbox with status transitions for new, contacted, qualified, negotiating, won, lost, and blocked leads.
- Migrated match feedback, inquiry/RFQ, lead inbox, lead status, conversation, message, assignment, notification, and SLA endpoints to MFA-verified tenant sessions.
- Added a web Lead Conversion panel showing selected match, confidence, SLA, feedback action, lead status, inquiry lock/unlock state, and next-best actions.
- Added the first messaging and SLA workspace: shared conversation rules, saved replies, terms-gated tenant conversation API, safe message submission, assignment, SLA notification checks, Prisma conversation/message/notification models, and a web Conversation Workspace panel.
- Added consent-aware notification orchestration for in-app, email, SMS, push, and WhatsApp channels, with tenant preferences, an API outbox, and a web Notification Delivery readiness panel.
- Added a protected internal conversation SLA sweep endpoint for scheduled response-time alerts: `POST /v1/operations/conversations/sla/run`.
- Remaining hardening: live websocket delivery, read receipts, typing/presence, attachments with malware/media moderation, provider adapters, audit logs, and durable repository wiring.

### 7.7 Relationship Links

Requirements:

- Users can attach links to associated consumers, potential clients, suppliers, producers, distributors, service providers, manufacturers, certifications, products, websites, and partner profiles.
- Relationship types must be structured: supplies_to, buys_from, produces, distributes, consumes, installs, repairs, finances, certifies, ships, wholesales, retails, partners_with.
- Links can be public, private, request-only, or verified.
- Linked parties can approve or reject public relationship claims.
- Relationship graph powers search and matching.
- Admin/moderator can remove fraudulent relationship links.

### 7.8 Messaging, Chat, and Inquiries

Requirements:

- Real-time one-to-one chat between searchers and advertisers.
- Inquiry form with structured fields: item/service, quantity, location, urgency, budget range, preferred contact, attachments.
- Chat from profile, listing, match suggestion, search result, or relationship link.
- Typing indicators, read receipts, online status, message delivery state.
- File/image attachments with malware scan and moderation.
- Message templates for quotes, availability, request for supply, request for production, partnership, consumer inquiry.
- Translation support for cross-language chats.
- Spam prevention: rate limits, verified-contact thresholds, new-account limits, report/block.
- Conversation assignment to tenant team members.
- Internal notes visible only to tenant users.
- SLA tracking: first response time, average response time, unanswered inquiries.
- Push/email/SMS/WhatsApp notifications where allowed and consented.
- User can block/report abusive users.
- Moderation tools for reported conversations.
- Chat safety filters must detect and block attempts to move zero-tolerance activity into private messages, including weapons sourcing, sexual solicitation, trafficking recruitment, child exploitation, illegal drugs, violent extremism, extortion, and criminal services.

MVP decision:

- Start with in-app chat and email/push notifications.
- Add WhatsApp/deep link contact options if locally compliant.
- Add voice/video later only after moderation and safety review.

Notification delivery requirements:

- In-app notification must be available as the baseline channel for operational alerts.
- Email, SMS, push, and WhatsApp delivery must respect channel consent, country rules, and recipient preferences.
- High and critical alerts such as breached chat SLAs, tax due/overdue notices, payment failures, security alerts, and advert auto-delete notices must be marked for immediate attention.
- Delivery providers must be adapters so the platform can switch vendors or use different providers per country.
- Every outbound notification must keep an outbox record, selected channels, suppressed channels, delivery attempts, provider references, failures, and timestamps.
- Prohibited content must not be queued into notification titles, messages, metadata, or provider payloads.

Implementation progress on 2026-06-17:

- Added shared conversation states, participant roles, notification types, saved reply suggestions, and response-SLA decisions.
- Added tenant-scoped conversation endpoints for creating a thread from a safe match, listing messages, sending safe messages, assigning an owner, changing status, listing notifications, and running SLA checks.
- Required current terms acceptance before conversation creation or message sending.
- Added zero-tolerance safety checks before any message, assignment metadata, or conversation starter can be persisted.
- Added a web Conversation Workspace preview for owner assignment, SLA state, status transitions, safe reply drafting, and saved replies.
- Added Prisma models for durable `Conversation`, `ConversationMessage`, and `ConversationNotification` records.
- Added a tenant notification preferences API, consent-aware delivery planning API, notification outbox, and protected internal SLA sweep endpoint.

### 7.9 Analytics and Monitoring

Advertiser analytics:

- Profile views
- Listing views
- Unique visitors
- Search impressions
- Search keywords used to find profile/listing
- Clicks by CTA: call, WhatsApp, email, website, map, share, download, message, inquiry
- Media views and downloads
- Most visited listings/profiles
- Most clicked listings
- Most enquired listings
- Most shared listings
- Leads generated
- Match suggestions received
- Match acceptance rate
- Messages started
- Inquiry conversion rate
- Response time
- Country/city of demand where lawful and aggregated
- Date of posting/creating/uploading
- Days live
- Listing age performance curve
- Saved/bookmarked count
- Share channel if available
- Download count
- Bounce/exit rate for web profile pages
- Profile completeness impact

Internal analytics:

- Daily/monthly active users
- New advertisers
- New buyers/searchers
- Tenant growth by country/continent
- Trial activations
- Trial-to-paid conversion
- Monthly recurring revenue
- Churn
- Payment failures
- Most active countries
- Most active industries
- Search demand gaps
- Supply gaps by country/industry
- Match precision
- Match complaints
- Chat abuse reports
- Moderator queue size
- Content rejection reasons
- Zero-tolerance block attempts by category, country, tenant, source surface, and enforcement outcome
- Uptime and latency
- API errors
- Media processing failures
- App downloads and active installs where available

Hierarchy analytics:

- Global: all countries and continents.
- Multicontinental/regional: assigned regional cluster.
- Continental: all countries in continent.
- Country: country only.
- Tenant: tenant only.

Analytics requirements:

- Events must include timestamp, tenant_id, profile_id, listing_id, actor_id when known, anonymous_session_id when allowed, country_id, continent_id, device_type, platform, source, campaign, referrer, and privacy consent state.
- Use aggregated and anonymized dashboards where possible.
- Retain raw event data according to privacy and retention policy.
- Provide CSV/PDF export for tenant reports and internal reports.
- Provide API/export for enterprise plans later.

### 7.10 Subscription and Billing

Requirements:

- First month free for eligible new tenant accounts.
- From second month onward, charge 10 units of the subscriber country's official local currency per month. Countries using shilling-denominated currencies display this as 10 local shillings.
- Pricing must be localized by country, currency, tax rules, app-store pricing rules, and payment provider support.
- The pricing table must store local currency code, display name, flag/country, tax handling, payment-provider minimums, app-store tier mapping, and any legally required local disclosure.
- Web payments should support cards, mobile money where available, bank transfer where practical, and local wallets over time.
- iOS/Android digital subscription rules must be reviewed carefully. If the app unlocks digital SaaS features inside the app, app-store in-app purchase/subscription rules may apply.
- Show trial start date, trial end date, paid start date, renewal date, price, currency, tax, cancellation link, and what happens when subscription expires.
- Allow subscription management and cancellation from account settings.
- Send reminders before trial ends where legally required or best practice.
- Support invoices/receipts.
- Support failed-payment grace period.
- Support country-specific VAT/GST/sales tax configuration.
- Support coupons/promotions only if approved by finance.
- Prevent duplicate trials by abuse detection.
- Integrate with the complete finance and tax remittance module before paid launch in any country.

Subscription states:

- trial_pending
- trial_active
- trial_ending
- active_paid
- payment_failed
- grace_period
- canceled
- expired
- suspended
- refunded

### 7.10.1 Complete Finance, Tax, and Remittance Module

Purpose:

- Manage all revenue, invoices, payment provider fees, refunds, chargebacks, VAT, GST, sales tax, digital services tax, withholding tax, excise-style levies where applicable, local statutory fees, filings, remittances, approvals, and finance alerts by country.

Core requirements:

- Maintain a country tax profile for every launch country.
- Store tax authority name, country code, currency, local tax identifiers, tax registration status, filing portal link, support contact, fiscal representative if required, and local finance owner.
- Store applicable tax types per country: VAT, GST, sales tax, digital services tax, withholding tax, communications/service tax, marketplace facilitator tax, app-store tax treatment, stamp/levy rules, and other legally obliged indirect taxes.
- Store registration thresholds, threshold time windows, filing frequency, return period, remittance deadline, payment deadline, late-payment penalty notes, e-invoicing requirements, invoice numbering rules, record retention period, reverse-charge rules, B2B/B2C treatment, tax-inclusive/exclusive pricing behavior, product tax codes, and effective dates.
- Support versioned tax rules so old transactions continue to reference the rate and rule active at the time of charge.
- Calculate tax at checkout, subscription renewal, invoice generation, credit note, refund, adjustment, manual payment, app-store receipt import, and off-platform payment import.
- Use seller/platform location, customer billing country, customer tax ID, business/consumer status, product tax code, performance/location-of-supply rules, payment method evidence, currency, exemption certificate, reverse-charge status, and marketplace liability rules to compute tax.
- Store an immutable tax calculation snapshot per transaction: gross amount, taxable amount, non-taxable amount, net revenue, tax type, tax rate, tax amount, filing currency, exchange rate, jurisdiction, customer evidence, rule version, calculation provider, and timestamp.
- Support external tax engines such as Stripe Tax, TaxJar, Taxually, Avalara, or local providers through an adapter layer. The product must not depend on a single provider's data model.
- Support manual tax-rule override only with dual approval, reason, document attachment, effective date, expiry date, and audit log.
- Reconcile payment provider data, app-store proceeds, local payment rails, bank deposits, refunds, failed payments, chargebacks, and tax liability.
- Separate collected tax from platform revenue in reports and ledgers.
- Track deferred revenue for subscriptions where accounting requires recognition over the service period.
- Generate invoices, receipts, credit notes, tax invoices, pro-forma invoices where needed, and country-specific invoice numbering.
- Support finance exports in CSV, PDF, and accounting-system-friendly formats.

Tax remittance calendar:

- The finance module must generate a per-country tax calendar from the country tax profile.
- Calendar entries must include return period, filing start date, filing deadline, payment/remittance deadline, expected tax liability, responsible finance owner, approval status, filing status, remittance status, and evidence attachments.
- Alert schedule must support configurable reminders at T-30, T-14, T-7, T-3, T-1, due date, and overdue.
- Alert recipients must include Global Finance Admin, assigned Regional Finance Admin, Country Finance Admin, Billing Manager where relevant, and external accountant/tax advisor where configured.
- Alerts must be delivered in-app and by email by default, with SMS/WhatsApp optional where compliant.
- Alert severity must escalate automatically when a filing is unapproved, unreconciled, underfunded, unpaid, or overdue.

Required finance alert messages:

- Tax threshold warning: "Tax registration threshold approaching in {country}. Current taxable revenue: {amount} {currency}. Threshold: {threshold_amount} {currency}. Review by {review_date}."
- Tax registration required: "Tax registration may be required in {country}. Threshold crossed on {date}. Assign finance owner and confirm registration status."
- Return ready for review: "{tax_type} return for {country} {period} is ready. Computed tax to remit: {amount} {filing_currency}. Review by {deadline}."
- Approval required: "{country} {tax_type} remittance needs approval. Computed amount: {amount} {filing_currency}. Payment due: {due_date}."
- Upcoming remittance: "{tax_type} remittance due in {days} days for {country}. Amount to remit: {amount} {filing_currency}. Filing deadline: {filing_deadline}. Payment deadline: {payment_deadline}."
- Due today: "{country} {tax_type} remittance is due today. Amount: {amount} {filing_currency}. Submit filing and attach payment receipt."
- Overdue: "{country} {tax_type} remittance is overdue since {due_date}. Amount: {amount} {filing_currency}. Escalated to Global Finance."
- Reconciliation variance: "Tax reconciliation variance detected for {country} {period}. Calculated tax: {calculated_amount}; collected tax: {collected_amount}; variance: {variance_amount}. Resolve before filing."
- Filing completed: "{country} {tax_type} return for {period} marked filed and remitted. Receipt/reference: {reference_number}."

Tax return workbench:

- Generate draft monthly, quarterly, annual, or custom-period returns based on country rules.
- Show opening liability, collected tax, refunded tax, credit notes, exemptions, reverse charges, adjustments, exchange-rate effects, payment-provider fees, net tax due, and prior-period carryovers.
- Allow finance users to review supporting transactions and download itemized and summarized reports.
- Require reconciliation before approval.
- Require two-step approval for filing and remittance above configurable thresholds.
- Lock a filing period after remittance, while allowing correction entries through controlled adjustment workflows.
- Attach filing confirmation, payment receipt, authority reference number, accountant notes, and board/management approval evidence.

Finance roles and controls:

- Global Finance Admin configures global finance policy, providers, approval thresholds, and consolidated reporting.
- Regional/Continental Finance Admin reviews assigned territories.
- Country Finance Admin owns country tax profile, filings, payment deadlines, and local compliance evidence.
- Tenant Billing Manager can see tenant invoices, receipts, subscription status, and tax charged to that tenant, but cannot view platform-wide tax liabilities.
- Every finance action must be audit logged.
- Tax reports must be access-controlled and export events must be logged.

Acceptance criteria:

- Before any country becomes paid-live, it must have an approved country tax profile, pricing row, payment provider setup, invoice template, tax calendar, responsible finance owner, and filing/remittance workflow.
- Every paid transaction must produce an invoice/receipt and an immutable tax snapshot.
- Finance users can see the exact VAT/GST/sales tax or other obliged tax computed for each country and period.
- The system alerts responsible users before every filing and remittance deadline.
- No tax period can be marked complete without filing evidence, remittance evidence, approver identity, and timestamp.
- The module can export country-level tax reports for local advisors and tax authorities.

Implementation progress on 2026-06-17:

- Added shared finance/tax calculation helpers for tax-inclusive and tax-exclusive pricing, using configured country rules rather than hard-coded legal rates.
- Added finance API endpoints for country tax profiles, effective-dated tax rules, tenant tax calculation snapshots, ledger entries, draft tax returns, and timed remittance alerts.
- Added zero-tolerance input checks to finance configuration and calculation metadata.
- Added the web Finance Readiness panel with computed subscription tax, net revenue, and next remittance alert status.
- Remaining hardening: durable database persistence, role-scoped finance permissions, invoice/receipt generation, payment-provider reconciliation, evidence attachments, period locks, and exportable reports.

### 7.11 Moderation, Trust, and Safety

Requirements:

- Community standards and prohibited content policy.
- Automated and human moderation for profiles, listings, media, reviews/comments if added, and reported chats.
- Report content/user/listing/chat.
- Block user.
- Moderator queue with severity, country, industry, tenant, report reason, and SLA.
- Verification levels: unverified, email verified, phone verified, business document verified, license verified, verified supplier/producer.
- Fraud detection for duplicate profiles, misleading listings, banned goods, spam, impersonation, counterfeit products, unsafe medical/financial claims, and relationship-link abuse.
- Audit log for all moderation decisions.
- Appeals process.
- Country-level compliance rules for regulated goods/services.
- Zero-tolerance category enforcement with automatic blocking, evidence preservation, account action, and required reporting/escalation workflows.
- Prohibited keyword/synonym libraries per country and language, including evasive spellings and coded terms, with regular safety review.
- Moderator tooling to distinguish regulated-but-allowed industries from fully blocked categories.
- Terms acceptance evidence must be visible to authorized support, legal, trust, and finance users when investigating user content, disputes, payments, reports, or enforcement.
- Terms acceptance must not reduce Telpen's own obligations to run reporting, moderation, privacy, tax, consumer-protection, app-store, and regulated-marketplace controls.

### 7.12 Reviews and Reputation

Recommended for Phase 2:

- Rating and review after verified inquiry or transaction-like interaction.
- Public response from advertiser.
- Review moderation and fraud detection.
- Reputation score combining completeness, verification, response speed, report rate, review quality, and successful inquiry outcomes.

### 7.13 Web and Mobile Apps

Platforms:

- Responsive web app.
- Progressive Web App for installable browser experience.
- Android app.
- iOS app.

Requirements:

- Shared design system across web and mobile.
- Fast onboarding and search.
- Offline-friendly draft editing for mobile where possible.
- Push notifications for inquiry, chat, match, trial ending, subscription, moderation, and account security.
- App-store metadata must accurately describe core experience.
- Demo account/demo mode required for app review.
- Privacy policy and account deletion links must be available inside app and on public web.
- Country flag and local currency must be visible in onboarding, billing, and profile contexts.

### 7.14 Administration

Admin modules:

- Tenant management
- User management
- Role/permission management
- Country/continent hierarchy
- Industry taxonomy management
- Pricing/currency/tax table
- Subscription management
- Finance ledger
- Country tax profiles
- Tax remittance calendar
- Tax return workbench
- Reconciliation dashboard
- Finance alerts
- Content moderation
- Verification workflows
- Analytics dashboards
- Search/matching configuration
- Support tickets
- Audit logs
- Feature flags
- System health
- Legal/policy pages
- Terms acceptance records and version history

## 8. Data and Entity Model

Core entities:

- User
- Tenant
- TenantUser
- Role
- Permission
- Country
- Continent
- RegionCluster
- IndustryCategory
- Subcategory
- Profile
- ProfileDraft
- ProfileServiceArea
- ProfileSocialLink
- Listing
- ListingDraft
- MediaAsset
- RelationshipLink
- MatchSuggestion
- MatchFeedback
- SearchQuery
- SavedSearch
- Inquiry
- Conversation
- Message
- Notification
- Subscription
- Invoice
- PaymentProviderCustomer
- CountryTaxProfile
- TaxRuleVersion
- TaxCalculationSnapshot
- TaxLedgerEntry
- TaxReturn
- TaxRemittance
- FinanceAlert
- ReconciliationRun
- CreditNote
- Refund
- Chargeback
- AnalyticsEvent
- ModerationCase
- VerificationCase
- AuditLog
- ReportExport

Critical fields:

- Every tenant-owned entity must include tenant_id.
- Every location-relevant entity must include country_id and optionally service_area_geo.
- Every publishable entity must include status, created_at, updated_at, published_at, archived_at.
- Every analytics event must include privacy basis/consent state.
- Every admin action must be audit logged.

## 9. Roles and Permissions

Global roles:

- Super Admin
- Global Operations Admin
- Global Finance Admin
- Global Analytics Viewer
- Global Moderator Lead

Regional roles:

- Regional Admin
- Continental Admin
- Country Admin
- Country Moderator
- Country Support Agent
- Country Sales/Account Manager

Tenant roles:

- Owner
- Admin
- Editor
- Sales/Chat Agent
- Billing Manager
- Analytics Viewer
- Read-only Viewer

Permission requirements:

- Use role-based access control with future support for attribute-based rules.
- Enforce tenant isolation at API, service, database, and analytics layers.
- Prevent horizontal access between tenants.
- Prevent country admins from accessing other countries unless assigned.
- Support audit logs for all sensitive actions.

Implementation progress on 2026-06-18:

- Added shared RBAC rules covering global head office, regional/multicontinental, continental, country, and tenant scopes.
- Added role permission matrices and MFA-required checks for privileged roles.
- Added access decision logic that blocks tenant-to-tenant horizontal access and country-admin access outside assigned countries.
- Added API endpoints for role matrices, access evaluation, and MVP access decision audit evidence.
- Added web Hierarchy Access controls showing role, scope, permission, MFA, and grant/block state.
- Added database fields and models for MFA state, access assignments, and access decision audit records.
- Added owner registration and login session groundwork so tenants can be created with an owner membership and first-month-free trial state.
- Added generated, expiring MFA challenge records for tenant-owner sessions; provider-backed email/SMS/authenticator delivery remains a production hardening step.
- Added hashed account challenge records for email verification and password reset; provider-backed email delivery remains a production hardening step.
- Added tenant invite tokens for non-owner tenant roles.
- Added audit evidence for registration, login, MFA, email verification, password reset, tenant invite creation, and invite acceptance.
- Added existing-user invite linking with same-account session verification before tenant membership is created.

## 10. Nonfunctional Requirements

Performance:

- Search results p95 under 1.5 seconds for common queries.
- Profile page p95 under 2 seconds on 4G after CDN cache.
- Chat message delivery p95 under 1 second in normal network conditions.
- Media upload resumable and visible progress.
- Mobile app cold start under 3 seconds on common mid-range devices.

Availability and reliability:

- Target uptime: 99.9% for MVP, 99.95% after scale.
- Graceful degradation if analytics, matching, or recommendations are temporarily unavailable.
- Backups with point-in-time restore.
- Disaster recovery plan per region.

Security:

- HTTPS everywhere.
- Encryption at rest for sensitive data.
- Strong authentication with generated MFA challenges for tenant owners and privileged roles.
- Secure password storage.
- Session management with refresh token rotation.
- API authorization checks on every tenant object.
- Rate limiting, bot detection, WAF, and abuse controls.
- Malware scanning for uploads.
- Secrets management.
- Security logging and alerting.
- Regular penetration testing.
- Follow OWASP Web Top 10 and API Security Top 10.

Privacy:

- Privacy-by-design and data minimization.
- Consent management for analytics, behavioral matching, notifications, and marketing.
- Data subject requests: access, correction, deletion, export, objection/opt-out where applicable.
- Account deletion in app and web.
- Retention schedule by data type.
- Data processing agreements with processors.
- Country-specific privacy disclosures.
- No sale of personal sensitive data.
- Avoid sensitive-data matching unless explicitly lawful and necessary.

Accessibility:

- Target WCAG 2.2 AA for web.
- Mobile accessibility support: dynamic type, screen readers, focus order, contrast, labels.
- Captions or text alternatives for important media where possible.

Scalability:

- Multi-country, multi-tenant from day one.
- Partition or shard high-volume events and messages.
- CDN for media.
- Search cluster for full-text and vector search.
- Event pipeline for analytics.

Observability:

- Centralized logs, metrics, traces.
- Business event monitoring.
- Error tracking.
- App crash reporting.
- Synthetic checks for core flows.
- Alerting for payment failures, media pipeline failures, chat failures, search degradation, and moderation backlog.

### 10.1 Competitive Building Components

The platform should be built as a set of product engines, not just pages. Each engine creates a specific market advantage.

Discovery engine:

- Hybrid keyword and semantic search.
- Autocomplete, typo tolerance, synonyms, local-language aliases, and category-aware search.
- Visual search for product photos in later phases.
- Voice search for mobile-first users in later phases.
- Search result reason codes.
- Search quality dashboard by country and industry.

Relationship graph engine:

- Structured links between producers, suppliers, consumers, distributors, service providers, certifiers, financiers, and logistics providers.
- Public relationship claims require acceptance from linked parties when presented as verified.
- Graph ranking to find adjacent demand and supply.
- Supply-gap and demand-gap reports by country, region, and industry.

Matching and lead intelligence engine:

- Rules-based matching for MVP.
- Vector similarity and graph ranking after enough profile/listing data exists.
- Feedback loops from accepted matches, dismissed matches, inquiries, replies, reports, and conversions.
- Match score, match reason, confidence band, and next best action.
- Privacy-safe suppression of sensitive attributes.

Conversion workspace:

- Lead inbox with inquiry status: new, contacted, quoted, negotiating, won, lost, spam, blocked.
- RFQ and quote request forms.
- Chat assignment to tenant staff.
- Response-time SLA tracking.
- Saved replies and message templates.
- AI-assisted reply drafts only after safety and privacy review.

Trust and safety engine:

- Zero-tolerance category blocking.
- Media moderation and malware scanning.
- Keyword, synonym, and coded-term libraries per country/language.
- Report/block workflow.
- Verification workflow for businesses, suppliers, producers, and licenses.
- Fraud, spam, duplicate account, impersonation, and relationship-link abuse detection.

Growth and retention engine:

- Saved searches, alerts, and weekly opportunity digests.
- Profile completeness score.
- Advert performance tips.
- Localized onboarding by country and industry.
- Push, email, SMS, and WhatsApp notification options where compliant.
- Referral loops for inviting suppliers, buyers, and linked partners.

Analytics command engine:

- Tenant analytics for views, clicks, inquiries, shares, downloads, messages, match performance, and listing age.
- Country/continent/global dashboards for growth, subscription, safety, search demand, supply gaps, and revenue.
- Exportable reports for tenants and administrators.
- Experimentation dashboard for search ranking, onboarding, pricing, and notification tests.

## 11. Recommended Technology Stack

Frontend:

- Web: Next.js/React with TypeScript.
- Mobile: React Native or Flutter. React Native is preferred if sharing TypeScript domain logic with web is a priority.
- PWA support for installable web experience.
- Design system with responsive components.

Backend:

- API: Node.js/NestJS or Go. NestJS is preferred for fast SaaS development with TypeScript end to end.
- Database: PostgreSQL for transactional data.
- Cache/queues: Redis.
- Search: OpenSearch/Elasticsearch or Typesense for full-text; vector database or pgvector/OpenSearch vector for semantic search.
- Realtime: WebSocket service or managed realtime provider.
- Analytics: event pipeline using Kafka/Redpanda/Pub/Sub equivalent, warehouse such as BigQuery/Snowflake/ClickHouse, BI dashboards.
- Media: object storage plus CDN, image/video processing pipeline.
- Payments: Stripe plus local payment providers/mobile money where needed; app-store subscriptions for mobile digital unlocks if required.
- Tax and remittance: tax-engine adapter that can use Stripe Tax where available, plus TaxJar, Taxually, Avalara, local country providers, or finance-approved manual rules where provider coverage is unavailable.
- Notifications: FCM, APNs, email provider, SMS provider, WhatsApp Business API where compliant.
- AI/matching: rules engine, embeddings, graph ranking, ML ranking service, explainability layer.

Infrastructure:

- Cloud-hosted, containerized services.
- Deployment migration is paused while core coding continues.
- DigitalOcean is the leading production candidate to evaluate before paid
  subscriber onboarding because the first country launch needs strong Africa
  latency and a Cape Town/South Africa deployment location would be valuable if
  the required managed services are available there.
- Railway remains the current proven fallback/staging deployment until the
  final platform is selected, verified, and cut over.
- CI/CD with automated tests and security scans.
- Infrastructure as code.
- Feature flags.
- Environment separation: dev, staging, production.
- Local executable environment: Docker Desktop/Compose for PostgreSQL, Redis, search, and local email capture; Node.js 24 LTS pinned with a version manager such as Volta.
- Database release commands: validate Prisma schema, generate Prisma client,
  deploy checked-in migrations, check migration status, and seed baseline
  geography/industry data before enabling Prisma persistence in any hosted
  environment.

Tooling and vendor candidates:

- Web app: Next.js, React, TypeScript, Tailwind or a mature component system.
- Mobile app: React Native with Expo for faster cross-platform delivery, or Flutter if the team prefers Dart and highly controlled UI.
- API backend: NestJS/TypeScript for speed and shared language, or Go for high-throughput services after scale.
- Database: PostgreSQL with row-level tenant isolation patterns; evaluate pgvector for early semantic matching.
- Search: Typesense or Meilisearch for fast MVP search; Algolia for managed AI search speed; OpenSearch/Elasticsearch for deeper control, vector search, and large-scale analytics.
- Graph intelligence: PostgreSQL graph tables for MVP; evaluate Neo4j or a graph-processing layer when relationship depth grows.
- Realtime chat: WebSockets/Socket.IO for custom MVP; evaluate Twilio Conversations, Stream, or similar if cross-channel chat and agent workflows need faster launch.
- Notifications: Firebase Cloud Messaging for Android/web, APNs for iOS, plus email/SMS/WhatsApp providers by country.
- Payments: Stripe where supported, Google Play Billing and Apple In-App Purchase where required, and local payment rails such as mobile money providers for launch countries.
- Tax automation: Stripe Tax for calculation/threshold monitoring where supported; TaxJar, Taxually, Avalara, Marosa, or local tax providers for filing/remittance; controlled manual tax profiles for unsupported countries until an approved provider is available.
- Media: S3-compatible object storage, CDN, image resizing, video transcoding, malware scanning, and content moderation APIs.
- Analytics: event collector, warehouse, BI dashboard, and product analytics. Candidate tools include PostHog, Mixpanel, Amplitude, Segment, ClickHouse, BigQuery, Metabase, and Superset.
- Safety operations: moderation queue, audit log, blocked keyword libraries, media review tools, report handling, escalation workflow, and evidence preservation.
- Observability: OpenTelemetry, Sentry, Prometheus/Grafana, Datadog or equivalent, uptime checks, and mobile crash reporting.
- Experimentation: feature flags, A/B testing, remote config, and cohort analysis.
- Support and CRM: ticketing, help center, admin notes, tenant lifecycle tracking, and lead-quality feedback.
- Translation/localization: translation management system, country language packs, local synonyms, phone/address formatting, and currency formatting.

## 12. MVP Scope

MVP must include:

- Web responsive app.
- Android/iOS shell or React Native app if resources allow; otherwise PWA first plus mobile app in Phase 2.
- Signup/login.
- Country selection, flag, local currency display.
- Tenant creation.
- Industry/category selection.
- Advertiser profile create/edit/preview/publish.
- Up to 10 media items.
- Listing create/edit/preview/publish.
- Basic search and filters.
- Basic rules-based matching.
- Relationship links.
- Source Finder experience for finding producers, suppliers, consumers, and likely clients from a single search.
- Lead inbox with inquiry status tracking.
- In-app inquiries and basic chat.
- Advertiser analytics dashboard.
- Global/continent/country admin dashboards.
- First-month-free subscription model and billing state machine.
- Complete finance module for pricing, invoices, tax calculation snapshots, country tax profiles, finance alerts, tax calendar, and filing/remittance tracking.
- Moderation queue.
- Zero-tolerance blocked-category enforcement across taxonomy, profile, listing, media, search, matching, relationship links, and chat.
- Account deletion and privacy pages.

Out of MVP:

- Full ML ranking.
- Video/voice calls.
- Public reviews.
- Marketplace checkout.
- Escrow.
- Complex enterprise SSO.
- Advanced local tax automation for every country.

## 13. Phased Execution Plan

### Phase 0: Product Validation and Legal Foundation - 2 to 4 weeks

Deliverables:

- Validate target countries for first launch.
- Confirm launch-country pricing rows for the approved rule: first month free, then 10 units of the subscriber country's local currency per month.
- Select initial industries and subcategories.
- Finalize the global zero-tolerance blocked-category policy and launch-country prohibited keyword/synonym libraries.
- Select MVP vendor/tool choices for search, chat, analytics, payments, media, moderation, notifications, and observability.
- Select MVP vendor/tool choices for tax calculation, threshold monitoring, filing/remittance support, and country fallback rules.
- Confirm payment rails by country.
- Draft terms, privacy policy, community standards, prohibited content policy.
- Define data retention and account deletion policy.
- Confirm app-store subscription approach.
- Produce clickable UX prototype for onboarding, profile, listing, search, chat, analytics.

Exit criteria:

- Legal/privacy direction approved.
- Initial country and currency matrix approved.
- MVP backlog approved.

### Phase 1: Core Platform Foundation - 6 to 8 weeks

Deliverables:

- Multi-tenant backend.
- Auth, users, roles, permissions.
- Country/continent hierarchy.
- Industry taxonomy.
- Tenant/profile/listing data model.
- Media upload pipeline.
- Draft/preview/publish workflow.
- Admin foundation.
- Audit logs.
- Zero-tolerance category blocking at taxonomy, profile, listing, media, and link submission.
- Product memory and decision-log process for all major product, policy, pricing, architecture, and market-positioning decisions.

Exit criteria:

- Tenant data isolation tested.
- Profile/listing publishing works end to end.
- Media limit of 10 enforced.

### Phase 2: Search, Matching, and Links - 6 to 8 weeks

Deliverables:

- Full-text search.
- Filters/sorting.
- Saved searches.
- Relationship links.
- Rules-based matching score.
- Match feedback.
- Search and match analytics.
- Search, matching, and relationship graph exclusions for zero-tolerance categories.
- Source Finder workflow and first version of supply-gap/demand-gap reporting.

Exit criteria:

- Users can search by source/supplier/producer/consumer/client intent.
- Matching returns explainable recommendations.
- Relationship graph is queryable.

### Phase 3: Messaging and Analytics - 6 to 8 weeks

Deliverables:

- Inquiries.
- Realtime chat.
- Lead inbox, RFQ forms, quote-request templates, and response-time tracking.
- Notifications.
- Advertiser dashboard.
- Country/continent/global dashboards.
- Event pipeline.
- Exportable reports.
- Chat safety filters and severe-risk escalation workflow.

Exit criteria:

- Chat works across web/mobile.
- Analytics includes views, visits, clicks, inquiries, shares, downloads, posting date, and days live.

### Phase 4: Billing, Localization, and Compliance - 4 to 6 weeks

Deliverables:

- Trial and subscription state machine.
- Localized pricing table.
- Payment provider integration.
- Cancellation and subscription management.
- Complete finance module.
- Country tax profiles for all launch countries.
- VAT/GST/sales tax/DST/withholding/levy rule matrix where applicable.
- Tax calculation snapshots for every paid transaction.
- Finance ledger and reconciliation dashboard.
- Tax remittance calendar with T-30, T-14, T-7, T-3, T-1, due-date, and overdue alerts.
- Tax return workbench with review, approval, filing, remittance, evidence attachment, and period lock.
- Finance alert templates for threshold, registration, filing, approval, remittance, overdue, and reconciliation variance events.
- Privacy consent flows.
- Account deletion.
- App-store review checklist.

Exit criteria:

- Trial-to-paid flow works.
- Country currency and flag work.
- Compliance checklist passed for launch countries.
- Every paid launch country has an approved tax profile, finance owner, filing calendar, invoice template, and remittance workflow.
- Test transactions produce correct invoice, payment, tax snapshot, ledger entry, finance alert, and draft return entry.
- Finance can export itemized and summarized tax reports by country, tax type, and period.

### Phase 5: Mobile Apps and Beta Launch - 6 to 8 weeks

Deliverables:

- Android app.
- iOS app.
- Push notifications.
- App-store listings and review assets.
- Demo accounts.
- Beta testing.
- Crash/error monitoring.
- App-store safety evidence showing UGC moderation, reporting, blocking, zero-tolerance policy, and child-safety compliance.

Exit criteria:

- Apps approved or ready for submission.
- Beta users complete signup, publish, search, match, and chat flows.

### Phase 6: AI Precision and Growth - ongoing

Deliverables:

- Semantic search.
- Vector recommendations.
- ML ranking.
- Match quality feedback loops.
- Profile improvement assistant.
- Translation in chat.
- Reviews/reputation.
- Advanced fraud detection.
- Country expansion playbook.

Exit criteria:

- Measurable improvement in match acceptance, inquiry response, and qualified leads.

## 14. Success Metrics

North-star metric:

- Successful qualified connections per active tenant per month.

Activation metrics:

- Account created.
- Country/industry selected.
- Profile completed.
- First listing published.
- First match viewed.
- First inquiry/chat started.

Engagement metrics:

- Searches per user.
- Source Finder searches per user.
- Profile/listing views.
- Match accept rate.
- Inquiry rate.
- Chat reply rate.
- RFQs or quote requests created.
- Lead inbox resolution rate.
- Saved searches.
- Return visits.

Business metrics:

- Trial starts.
- Trial-to-paid conversion.
- Monthly recurring revenue.
- Churn.
- Payment success rate.
- Active tenants by country/continent.
- Tax collected by country and tax type.
- Tax remitted by country and tax type.
- Outstanding tax liability.
- Filing/remittance on-time rate.
- Reconciliation variance rate.
- Finance alerts resolved before due date.

Quality metrics:

- Search click-through rate.
- Match precision.
- Search-to-inquiry conversion rate.
- Match-to-chat conversion rate.
- Verified relationship acceptance rate.
- Supply-gap closure rate by country/industry.
- Report/block rate.
- Spam rate.
- Average response time.
- Content rejection rate.
- Time to moderation decision.

## 15. Key Risks and Mitigations

Risk register status: updated. Each risk below has required controls that must be implemented before the affected feature or country goes live.

| Risk | Impact | Required mitigation/control | Owner |
| --- | --- | --- | --- |
| Local 10-unit pricing cannot be charged in a country because of app-store tiers, payment-provider minimums, taxes, rounding, or currency constraints. | Failed checkout, rejected app submission, revenue leakage, customer confusion. | Maintain country pricing table with local currency, app-store tier, provider minimums, tax behavior, fallback price, approval record, and customer-facing disclosure. Block paid launch until pricing row is approved. | Global Finance Admin |
| VAT/GST/sales tax/DST/withholding/levy obligations are missed or remitted late. | Penalties, interest, loss of operating authority, blocked payments. | Complete finance module with country tax profiles, tax registration tracking, versioned tax rules, tax snapshots, remittance calendar, computed liability, approval workflow, filing evidence, and alerts at T-30/T-14/T-7/T-3/T-1/due/overdue. Use external tax providers and local advisors where available. | Global Finance Admin, Country Finance Admin |
| Tax calculations are wrong because of customer location, product tax code, B2B/B2C status, reverse charge, exemption, refund, FX, app-store proceeds, or off-platform payments. | Under-collection, overcharging, bad filings, audit exposure. | Store immutable tax calculation snapshots, customer evidence, rule version, exchange rate, taxability reason, refund/credit adjustments, and reconciliation runs. Require variance resolution before filing. | Finance Engineering Lead |
| Country expansion happens before legal, tax, payment, and safety readiness. | Operational failure and regulatory exposure. | Country launch gate requiring approved tax profile, pricing row, payment rails, terms/privacy localization, blocked-category library, moderation escalation path, finance owner, and support readiness. | Country Operations Lead |
| Matching based on biodata violates privacy expectations or law. | User harm, regulator action, loss of trust. | Consent management, data minimization, explainable match reasons, sensitive-data exclusions, opt-out controls, DPIA/privacy review for matching features, and audit logs. | Privacy Lead |
| User-generated ads attract fraud, spam, impersonation, counterfeit goods, or scams. | Marketplace quality collapse, payment disputes, user harm. | Verification, duplicate detection, rate limits, report/block, moderation queue, relationship-link approval, fraud scoring, abuse analytics, and country-level enforcement. | Trust and Safety Lead |
| Severe prohibited content appears in UGC or private chat. | App-store rejection, legal exposure, user harm. | Zero-tolerance blocking across taxonomy, search, profile, listing, media, matching, links, and chat; public standards; trained moderators; evidence preservation; escalation/reporting channels. | Trust and Safety Lead |
| Multi-tenant data leakage exposes one tenant's data to another tenant or wrong admin level. | Critical security breach and legal liability. | Tenant isolation in database and API, row-level authorization tests, admin-scope checks, audit logs, penetration testing, and security review before launch. | Security Lead |
| Search/matching quality starts weak and users do not see value. | Low activation, churn, poor market entry. | Start with transparent rules, Source Finder, taxonomy tuning, search analytics, match feedback, reason codes, saved searches, and manual country/category tuning before ML ranking. | Product Lead |
| Payment failures, chargebacks, refunds, and dunning are not handled well. | Revenue loss and support load. | Subscription state machine, retry rules, grace period, receipts, refund workflow, chargeback evidence, reconciliation, and failed-payment notifications. | Billing Lead |
| App stores reject the mobile apps due to UGC, subscription disclosure, privacy labels, or account deletion gaps. | Launch delay. | App-store review checklist, demo account, UGC reporting/blocking, child-safety policy, localized subscription terms, privacy disclosures, and in-app/web account deletion. | Mobile Lead |
| Vendor lock-in or provider gaps limit country support. | Cost increase or inability to launch countries. | Adapter pattern for payments, tax, chat, search, moderation, and notifications. Maintain fallback providers and manual controlled workflows for unsupported countries. | Architecture Lead |
| Security breach or API abuse compromises data or platform availability. | High-impact operational and legal incident. | OWASP controls, MFA for admins, WAF, rate limits, bot protection, secrets management, logging, monitoring, incident response runbooks, and regular security tests. | Security Lead |
| Moderation backlog grows beyond team capacity. | Unsafe content remains live and good users lose trust. | Automated triage, severity queues, SLAs, country moderators, escalation rules, safety analytics, and staffing model tied to active users/listings. | Trust and Safety Lead |
| AI/ML recommendations create unfair, unsafe, or irrelevant matches. | Bad leads, user distrust, discrimination concerns. | Explainability, human-readable reason codes, suppression of sensitive attributes, feedback loops, safety filters, offline evaluation, and human review for high-risk categories. | AI/Matching Lead |
| Analytics over-collects personal data or conflicts with consent. | Privacy violations. | Consent-aware event collection, anonymization/aggregation, retention schedule, data subject rights workflows, and restricted exports. | Data Protection Officer |
| Currency conversion and finance reporting disagree across presentment, settlement, and filing currencies. | Accounting errors and tax reconciliation failures. | Store presentment, settlement, integration, and filing currencies; store FX rate and source; reconcile by country/tax period/provider before return approval. | Finance Engineering Lead |
| Platform reliability fails under high traffic, media uploads, search, chat, or analytics volume. | Poor experience and churn. | CDN, queues, autoscaling, database indexing, load testing, graceful degradation, observability, uptime checks, and incident response. | Infrastructure Lead |
| Legal rules change after launch. | Silent noncompliance. | Quarterly compliance review, provider rule updates, country legal owner, effective-dated rule versions, change alerts, and launch-country policy review calendar. | Legal/Compliance Lead |
| Tax, finance, or compliance actions lack audit evidence. | Failed audits and weak internal control. | Immutable audit logs, approval trails, evidence attachments, export logs, period locks, and role-based access. | Finance Controller |

## 16. Open Decisions

1. What is the first launch country or region?
2. Which countries need fallback pricing because payment-provider or app-store minimums prevent charging exactly 10 local currency units?
3. Which payment methods are mandatory for launch countries?
4. Will advertisers only subscribe, or will buyers/searchers also have paid plans later?
5. Will the platform allow public reviews in MVP?
6. Which launch countries require specific legal reporting channels, safety contacts, or law-enforcement escalation rules for zero-tolerance violations?
7. Is the initial mobile app required on day one, or can the first launch use web + PWA while native apps are built?
8. Which tax provider or combination of providers will be used for each launch country?
9. Which accounting system must the finance module export to or integrate with?
10. Who is the named Country Finance Admin and external tax advisor for each launch country?
11. What is the approved fallback process where an external tax provider does not support a country or tax type?

## 17. Build Readiness Checklist

- PRD approved.
- UX prototype approved.
- Technical architecture approved.
- Data model reviewed.
- Security/privacy review completed.
- Legal documents drafted.
- Payment provider selected.
- Tax provider selected for launch countries or controlled manual fallback approved.
- Country tax profiles approved.
- Tax remittance calendar configured.
- Finance alert recipients configured.
- Tax invoice templates approved.
- Reconciliation dashboard tested.
- Filing/remittance evidence workflow tested.
- Launch countries selected.
- App-store requirements checklist completed.
- MVP backlog estimated.
- Analytics taxonomy implemented.
- Moderation workflow staffed.
