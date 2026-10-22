# Play Console — App content answers (SellFindConnect, com.sellfindconnect.app)

## Status (15/10/26)

App created in Play Console (app id 4974683027202673741, developer account
"Telpen Edu", personal). Saved: Privacy policy, Ads (Yes), Content rating
(IARC, All other app types — UGC, block, report, moderated chat, online
content), Advertising ID (No), Government apps (No), Financial features
(none), Health (none), store listing text + icon + feature graphic, category
Business, contact bucrepinfo@gmail.com, website.

Data safety is imported from `docs/data_safety_export.csv` and saved as a
draft. Play only accepts the submit after Target audience, which needs App
access (Sign in details) first.

Still to do: reviewer account + `PLAY_REVIEW_*` secrets → App access →
Target audience (18+) → submit Data safety; (phone screenshots uploaded 15/10/26);
upload the `.aab` to closed testing; add both signing fingerprints to
`ANDROID_CERT_FINGERPRINTS`; 12 testers × 14 days.

Goal: every App content card saved, so the only remaining gate is the closed
test (12 testers × 14 days). **Claude in Chrome fills each card; the owner says
yes before each Save or Submit.** Answers were checked against the code
(`packages/database/prisma/schema.prisma`, `apps/web`, `apps/api`) and the
live site.

## Live URLs Play fetches

| URL | Purpose |
| --- | --- |
| https://sellfindconnect.com/privacy | Privacy policy (`privacy-2026-06-18`, counsel-approved SFC-01) |
| https://sellfindconnect.com/account/delete | Deletion steps, shown before sign-in |
| https://sellfindconnect.com/.well-known/assetlinks.json | Digital Asset Links |
| https://sellfindconnect.com/community | UGC user policy |

## 1. App access — restricted, give the reviewer an account

Most of the app needs a business account, so choose **All or some
functionality is restricted** and add:

- Name: `Play reviewer`
- Username: the email of the review account (`PLAY_REVIEW_EMAIL`)
- Password: the review account's password
- Instructions:

```
Open the app and tap "Your business" (or go to Sign in). Sign in with the email and password above. When asked for a 6-digit code, enter <PLAY_REVIEW_MFA_CODE>. Source Finder is on the home screen; each result has Report and Block. Account deletion is under Account.
```

Setup (owner, once):
1. Create the account in the app with **Create a business account**, using an
   email you control (for example a `+playreview` Gmail alias). No staff role.
2. Fly → `sellfindconnect-api` → Secrets: set `PLAY_REVIEW_EMAIL` to that email
   and `PLAY_REVIEW_MFA_CODE` to six random digits. Deploy secrets.
3. Paste those values into this card only (not into chat or the repo).

The fixed code works only for that one account, and never for an account
with staff (platform) access.

## 2. Ads

- Does your app contain ads? **Yes.** Businesses publish adverts and paid
  promotion is part of the product, so declare it. There is **no ad SDK** and
  **no advertising ID**.

## 3. Content rating (IARC)

Category: **All other app types** (Utility, Productivity, Communication or Other).

| Question | Answer |
| --- | --- |
| Violence, sexual content, profanity, drugs, gambling, horror | No (zero-tolerance policy blocks them) |
| Users can interact or exchange content | **Yes** — business-to-business messages and public profiles/adverts |
| Users can share their location | **Yes** — businesses can publish an address and map link |
| Shares personal information with other users | **Yes** — business contact details on public profiles |
| Digital purchases | No |
| Unrestricted internet access | No — TWA of sellfindconnect.com only |

Submit the questionnaire (this card needs Submit).

## 4. Target audience and content

- Age groups: **18 and over** only. Appeals to children: **No**. Do not join
  Designed for Families. (Community standards: not for children.)

## 5. Data safety

Opening questions:

| Question | Answer |
| --- | --- |
| Collects or shares required user data types? | Yes |
| All data encrypted in transit? | Yes (HTTPS; database over TLS) |
| Users can request deletion? | Yes — https://sellfindconnect.com/account/delete |
| Independent security review? | No |

Data types to tick (everything else unticked):

| Category → type | Where in the code | Required? | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | `User.displayName` | Required | App functionality, Account management |
| Personal info → Email address | `User.email` | Required | App functionality, Account management, Fraud prevention and security |
| Personal info → User IDs | `User.id`, tenant id | Required | App functionality, Account management |
| Personal info → Phone number | `User.phone`, profile contacts | Optional | App functionality, Account management, Fraud prevention and security |
| Personal info → Address | profile physical address and map link | Optional | App functionality |
| Personal info → Other info | business name, industry, supply-chain role | Required | App functionality |
| Financial info → Purchase history | `PaymentTxn`, billing references (web subscription) | Optional | App functionality, Account management |
| Location → Approximate location | business service area and county | Optional | App functionality |
| Messages → Other in-app messages | `ConversationMessage` | Optional | App functionality |
| Photos and videos → Photos | `MediaAsset` (profile and advert images) | Optional | App functionality |
| Photos and videos → Videos | `MediaAsset` (advert video) | Optional | App functionality |
| App activity → App interactions | `AnalyticsEvent` (views, clicks, consent-gated) | Optional | Analytics, App functionality |
| App activity → In-app search history | Source Finder and saved searches | Optional | App functionality |
| App activity → Other user-generated content | adverts, profiles, `UserContentReport` | Optional | App functionality, Fraud prevention and security |
| App info and performance → Crash logs | server error logs | Required | Analytics |
| App info and performance → Diagnostics | request logs, browser type | Required | Analytics, Fraud prevention and security |

For every type: **Collected**, not shared (hosting, email delivery, media
storage and the match-explanation AI are service providers acting for us),
**not** processed ephemerally.

Do not tick: payment card or bank details (none stored), precise location,
contacts, calendar, SMS or call logs, installed apps, web browsing history,
health, race, religion, political views, sexual orientation, advertising ID,
device IDs.

## 6. Other cards

| Card | Answer |
| --- | --- |
| Privacy policy | https://sellfindconnect.com/privacy |
| Financial features | My app doesn't provide any financial features |
| Health apps | No health features |
| Government apps | No |
| News apps | No |
| COVID-19 apps | No |
| Data deletion (if asked separately) | https://sellfindconnect.com/account/delete |

## 7. Payments rule (keep true)

The Android app has **no purchase screen**. The platform subscription is a
digital good, so before the app ever charges for it in-app it must use Google
Play Billing. Marketplace deals between businesses are real-world goods and
services and are not Play purchases.
