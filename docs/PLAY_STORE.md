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
  `no_phone`.
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
- **In-app and web-accessible account deletion** for any account the app creates.
  In this repo: `/account/delete` plus `POST/DELETE/GET /v1/privacy/deletion`.

Current gaps before a Play listing:

- Durable deletion exists in code: 30-day grace, then
  `POST /v1/operations/privacy/deletions/run` erases profile/adverts/media/
  conversations, revokes sessions, retains billing/analytics/auth-audit, and
  writes `ACCOUNT_DELETION_COMPLETED` without the user's reason text. Persist
  it with `PRIVACY_REPOSITORY=prisma` or `PERSISTENCE_DRIVER=prisma` against
  the existing `AccountDeletionRequest` tables.
- Production Fly web (verified 2026-08-21) still 404s `/privacy` and
  `/account/delete` because the live image is behind `main`. Redeploy web before
  pointing Play Console at those URLs.
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
