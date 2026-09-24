# Google Play Store compliance for Sell Find Connect

Status: Native Android / Play listing is **out of current delivery**. This note
locks the policy constraints so a later mobile slice cannot ship a Play-violating
checkout or SMS-permission design.
Date: 2026-08-21

Sell Find Connect currently launches as **web + PWA**. Do not submit an Android
package to Google Play until the checklist below is implemented and legal has
signed off.

## Locked identity: login phone = STK Push phone

The verified E.164 phone number is the **login identity** and the **only**
M-Pesa / Africa's Talking STK Push destination.

- SMS OTP and STK Push both target the same number (`packages/domain/src/phone.ts`,
  `AuthService.verifyPhoneOtp`, `PaymentsService.requestCheckout`).
- Checkout does **not** accept a payer phone in the request body. The signed-in
  user's stored phone is used. If that phone is missing, checkout returns
  `no_phone`. Invoice pay (`POST /v1/finance/payment-invoices/pay`) rejects an
  E.164 `customerReference` and, for `MOBILE_MONEY`, sends STK only to
  `AuthService.getVerifiedLoginPhone`.
- Owner payouts (`POST /v1/payments/payout`) require current terms and a
  recipient who is a member of the same tenant. A user id from another tenant
  returns `forbidden` and does not call the provider.
- Product audit stores `phoneHash` / amount / status only — never the raw
  number, never the STK reason text.

This is a fraud and Play User Data control: a Play or web client must not let a
user push an STK prompt to someone else's phone.

## Payments policy (digital goods)

The tenant SaaS fee (first month free, then 10 local-currency units / month) is a
**digital subscription**.

| Surface | Allowed rail for the SaaS subscription |
| --- | --- |
| Web and PWA | Stripe and/or Africa's Talking STK to the **login** phone |
| Google Play Android app | **Google Play Billing** (Play's payments policy). Kenya is not in the India / South Korea / EEA alternative-billing programmes. Direct M-Pesa STK **inside a Play-distributed APK** for the platform subscription is not permitted. |
| Physical goods / services between marketplace counterparties | STK / local rails may be used outside Play Billing, including from a Play app, when the payment is for a real-world good or service and not for the digital SaaS entitlement. |

Do not enable in-app SaaS checkout via STK in a Play build. Keep STK on web/PWA
and for counterparty marketplace payments. A future Play binary needs a Play
Billing adapter behind the existing `PAYMENT_PROVIDER` boundary.

## SMS, OTP, and sensitive permissions

Phone login is allowed. The implementation must stay on:

- User-typed OTP, or
- SMS Retriever / user-consent SMS APIs that do **not** require `READ_SMS`.

Do **not** request `READ_SMS` or `READ_CALL_LOG`. Google Play's SMS and Call Log
policy (updated July 2026) no longer treats account verification via call log as
a permitted use.

## User Data, account deletion, and Data Safety

Play User Data requires:

- An accurate Data Safety form (account data, phone number used for login and
  mobile-money, approximate location if collected, UGC, diagnostics).
- A public privacy policy URL. In this repo: `/privacy`.
- A public terms and subscription URL. In this repo: `/terms` and `/subscription`.
- A public prohibited-content URL. In this repo: `/prohibited`.
- A public community-standards / UGC user-policy URL. In this repo: `/community`.
- In-product report and block for UGC (`POST /v1/ugc/reports`, `POST /v1/ugc/blocks`).
  Tenant blocks also stop conversation, inquiry, and Source Finder outreach.
  Moderators review the home queue (`GET /v1/platform/ugc/reports`) with MFA
  `MODERATE_CONTENT` access.
- **In-app and web-accessible account deletion** for any account the app creates.
  In this repo: `/account/delete` plus `POST/DELETE/GET /v1/privacy/deletion`.

Current gaps before a Play listing:

- Durable deletion exists in code: 30-day grace, then
  `POST /v1/operations/privacy/deletions/run` erases profile/adverts/media/
  conversations, revokes sessions, retains billing/analytics/auth-audit, and
  writes `ACCOUNT_DELETION_COMPLETED` without the user's reason text. Hosted
  Prisma (`PERSISTENCE_DRIVER=prisma`) plus the daily scheduled-jobs sweep
  make that durable in production after the Fly API image in this change is
  deployed.
- Production Fly web (verified 2026-08-22) serves `/privacy` and
  `/account/delete` (HTTP 200). Keep those URLs live before a Play Console
  listing.
- Deletion UI must send `x-session-token` and `x-tenant-id`; it must not be a
  dead form.

## UGC, child safety, and subscriptions disclosure

Zero-tolerance blocking, reporting, and terms gating already exist for web UGC.
A Play listing still needs:

- Demo reviewer account.
- In-app report/block that works on the Android client.
- Localized subscription price, trial length, and cancellation path (Play
  Billing subscription center, not only a web portal).
- No child-directed positioning. This is a B2B marketplace.

## What this slice does **not** do

- It does not create a React Native / Play app.
- It does not add Play Billing.
- It does not request SMS or call-log permissions.
- It does not submit a Play Console listing, Data Safety form, or tax approval.

## Listing exercise (2026-09-24)

This is a readiness pass for **Sell Find Connect** (`sellfindconnect.com`). It is
not a submission. `app.telpen.net` and package `com.telpen.edu` are a different
product and are not this repository.

Public policy URLs for the Play Console form, once this web build is deployed:

| Play field | URL |
| --- | --- |
| Privacy policy | `https://sellfindconnect.com/privacy` |
| Terms | `https://sellfindconnect.com/terms` |
| Subscription terms | `https://sellfindconnect.com/subscription` |
| Prohibited content | `https://sellfindconnect.com/prohibited` |
| UGC user policy | `https://sellfindconnect.com/community` |
| Account deletion | `https://sellfindconnect.com/account/delete` |

There is no `/community-standards` route. The user policy is `/community`.

Data Safety answers supported by the current product:

- Account data: name, email, and phone. Phone is the login identity and the only STK destination.
- User content: profiles, adverts, media, and messages. Report and block exist on the web app.
- Financial info: billing references and mobile-money transaction ids. Card numbers are rejected.
- App activity: views, clicks, and searches, consent-gated.
- Not directed at children. Sexual content is prohibited, not incidental.
- Account deletion is in the web app, with a 30-day grace period, then erasure of profile, adverts, conversations, and media. Billing, analytics, and auth-audit rows are retained.

PWA manifest name is `Sell Find Connect` (`short_name` `SellFind`). Privacy, terms, community standards, and account deletion link to each other.

Still required before anyone presses Submit in Play Console:

1. An Android package. This repository is web and PWA only.
2. Play Billing for the digital SaaS subscription inside that package. STK stays on web and PWA. Do not put STK for the platform subscription inside a Play APK.
3. `/.well-known/assetlinks.json` only after a real package name and signing certificates exist. Do not invent fingerprints.
4. A demo reviewer account with current terms accepted.
5. Counsel review of the public policies. The pages are product copy, not a sign-off.
6. A human approval of the Kenya tax profile before any paid checkout. Do not sign that profile here.
7. Deploy this branch to the live web host so the policy URLs above stop serving an older build.
