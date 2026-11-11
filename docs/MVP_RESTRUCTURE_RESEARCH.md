# MVP restructure: what users of similar platforms complain about, and what we change

Date: 11/11/26. Owner request: research competitors and their users' reviews,
find the pains to bridge, and restructure the home page and offer around them.

## What the research found

| Source | Rating / finding | Main complaints |
| --- | --- | --- |
| IndiaMART (Trustpilot, 506 reviews) | 1.7 / 5, about 81% one-star | Fake, irrelevant or out-of-area leads for paying sellers; features removed mid-contract; aggressive upselling; spam calls after sign-up; sellers who took payment and vanished; support that does not resolve |
| TradeIndia (Trustpilot, 100 reviews) | 1.7 / 5, 77% one-star | Paid memberships that did not deliver the promised leads; few genuine buyers; spam calls and data-sharing worries; account deletion requests ignored |
| Jiji Kenya (Trustpilot, 11 reviews: a small sample) | 2.3 / 5 | Brokers advertising items they do not have; ads closed without clear notice; paying again for rejected ads; repeated calls pushing paid packages; slow support |
| Jiji sign-up test (Ripples Nigeria, 2021) | One author's test | Seller identity rests on a phone number and an email only |
| Communications Authority of Kenya survey, 2023 (via The Star) | Nearly 40% of online shoppers reported problems | Substandard goods, items unlike the photo, no way to track; buyers prefer to pay after seeing goods |
| Draft Kenya National E-Commerce Policy, June 2025 (via Financial Standard) | Government diagnosis | Weak dispute resolution, misleading conduct, eroded trust; proposes a digital trustmark and verifiable credentials for sellers |
| East African B2B e-commerce (TechCabal, Firas Ahmad) | Twiga, Wasoko, MarketForce, Copia cut back or closed | Discount-led growth, thin margins, owning stock and trucks, long credit terms. "Digitizing an order is not enough" |
| Kenyan order handling (The Standard) | How orders really move | WhatsApp photos, PDFs and handwritten notes, retyped by hand |

## The pains to bridge, and our answer

| Pain users describe elsewhere | What SellFindConnect does | State |
| --- | --- | --- |
| Paying for leads that are fake or sold to many sellers | Buyers contact the business directly by call or WhatsApp; enquiries are never sold | Live; now said on the home page |
| Upsell calls, changing packages, surprise charges | Searching is free; one monthly listing fee shown before paying; any extra is optional and priced upfront | Live; now said on the home page (web only, Play rules) |
| Anyone can pose as a seller | One-time code before publishing; photos checked before they show; Report and Block on every listing | Live; now said on the home page |
| "Verified" badges that mean nothing | We only state what we actually check. The "thousands of verified suppliers" line in onboarding is removed | Fixed in this change |
| Results from the wrong place | Businesses set county, constituency, ward and nearest landmark on their profile; search filters on it exactly, falling back to the advert text for businesses that have not set it yet | This change |
| Cluttered, tiring pages | Search first; six role chips; eight industry chips; everything else under "More filters"; policy note collapsed | This change |
| Dead ends | Skeleton while loading; an empty state that offers "Clear all filters" and "List your business here" | This change |
| No proof a seller delivers | Ratings and reviews from people who contacted the business | Next step: needs a database table and moderation, so owner approval |
| No sign of how active a listing is | Anonymous view and enquiry counts (last 90 days) on cards and listings; "Most viewed" and "Most asked" sorts | Done 11/11/26 |
| Hard to spread by word of mouth | Share and Copy link on the home page and every listing (phone share sheet, WhatsApp fallback) | This change |

## What we deliberately do not copy

- No stock, trucks, escrow or credit: that is what sank the B2B e-commerce firms.
- No lead-selling and no tiered packages: the top complaint against IndiaMART,
  TradeIndia and Jiji.
- No invented numbers. Badges and counts come only from real listing data.

## Shipped in this change

- `packages/domain/src/kenya-places.ts`: 47 counties, 290 constituencies, 1,450
  wards from Legal Notice 14 of 2012, with lookups and tests.
- `packages/domain/src/kenya-landmarks.ts`: a starter list of well-known
  markets, wholesale hubs, trade streets, industrial areas, malls and
  supermarket chains, each tied to a real county. Names only; no logos or
  photographs of third-party premises.
- `packages/domain/src/listing-display.ts`: badges (Featured, New, photos,
  days-left countdown) and sorting (Best match, Newest, Ending soon).
- New public home: logo mark, search hero, chips, collapsed filters, result
  cards with photos and badges, markets, "Why", "How it works", seller band
  with sharing.

## Next steps (need the owner's yes: they touch protected areas)

1. Done 11/11/26: structured location on the business profile (stored in the
   existing `serviceArea` JSON, no migration).
2. Ratings and reviews with moderation and report. Database and policy change.
3. Done 11/11/26: anonymous public view and enquiry counts, "Most viewed" and
   "Most asked" sorts. Counted once per visitor per listing per 30 minutes;
   the visitor key is hashed and held in memory only, never stored.
4. Done 11/11/26: "Use my location" suggests the county from the phone's
   position, worked out on the device from county headquarters coordinates.
   The position is never sent, so Play Data safety needs no new location
   declaration (data processed only on the device is not "collected").
5. Done 11/11/26: new mark, web/PWA icons and Play listing icon
   (`docs/brand/`). The Android app icon changes with the next .aab.
6. Done 11/11/26: onboarding "why" points under the Sell and Find choices.

## Sources

- https://www.trustpilot.com/review/m.indiamart.com
- https://ca.trustpilot.com/review/tradeindia.com
- https://nl-be.trustpilot.com/review/jiji.co.ke
- https://www.ripplesnigeria.com/app-review-with-a-stolen-phone-number-or-fake-email-id-you-can-sell-buy-stolen-items-on-jiji
- https://beta.the-star.co.ke/business/markets/2025-09-18-kenyas-online-trade-faces-trust-delivery-and-payment-hurdles
- https://www.standardmedia.co.ke/business/amp/financial-standard/article/2001525480/cybersecurity-trust-woes-slow-kenyas-e-commerce-growth
- https://techcabal.com/2024/05/20/whats-going-on-in-kenyas-b2b-space/
- https://firasahmad.substack.com/p/the-decline-and-revival-of-b2b-ecommerce
- https://www.standardmedia.co.ke/business/amp/tech-innovation/article/2001534724/why-kenyan-procurement-teams-spend-hours-retyping-orders
- Places data: Legal Notice 14 of 2012, via https://github.com/pkiage/data-Kenya-Counties-Constituencies-Wards
