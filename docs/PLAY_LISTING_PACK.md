# Play Console listing pack

Copy these answers into Play Console. This file is not a submission. Do not
press Submit, do not approve the Kenya tax profile, and do not upload an AAB
until Play Billing is the SaaS rail inside the Play package.

Proposed package id: `com.sellfindconnect.app`. It is not created in Play
Console yet. `com.telpen.edu` is a different product.

Default language: English (United States). Store listing country of the
developer: Kenya. Developer name: Telpen Systems Ltd.

## Store listing

| Field | Paste |
| --- | --- |
| App name | SellFindConnect |
| Short description | Sell it. Find it. Connect. A workspace for sources, buyers, and advertisers. |
| Full description | SellFindConnect is the Sell Find Connect workspace from Telpen Systems Ltd. Businesses publish adverts, find sources, and message buyers in one tenant. The first month is free. From month two the platform fee is 10 units of the subscriber country's local currency per month. Phone login uses a code you type. The same verified number is the only mobile-money prompt for web checkout. Report and block are available for messages and listings. Account deletion is in the app and at https://sellfindconnect.com/account/delete. |

## URLs

| Play field | URL |
| --- | --- |
| Privacy policy | https://sellfindconnect.com/privacy |
| Terms | https://sellfindconnect.com/terms |
| Subscription terms | https://sellfindconnect.com/subscription |
| Prohibited content | https://sellfindconnect.com/prohibited |
| User-generated content policy | https://sellfindconnect.com/community |
| Account deletion | https://sellfindconnect.com/account/delete |

There is no `/community-standards` path. The user policy is `/community`.
These URLs must be the deployed web build before they are pasted as live.

## Data Safety

| Question | Answer |
| --- | --- |
| Does the app collect or share any of the required user data types? | Yes, collected. Not sold. |
| Name | Collected. Account management. Not shared. |
| Email address | Collected. Account management. Not shared. |
| Phone number | Collected. Account management and fraud prevention. Used as the login identity and the only web STK destination. Not shared with advertisers. Sent to the SMS and mobile-money providers that deliver the login code and the STK prompt. |
| User-generated content | Collected. Profiles, adverts, media, and messages. Not sold. Other users can see published listings and conversation participants can see messages. |
| Photos and videos | Collected when a user uploads listing media. |
| Financial info | Billing references and mobile-money transaction ids. Card numbers are rejected and are not stored. |
| App activity | Views, clicks, and searches. Collected only with consent. |
| Precise or approximate location | Not collected by the product as a device location. |
| Data encrypted in transit | Yes. |
| Users can request deletion | Yes. In the app at Account deletion, and at the URL above. 30-day grace, then profile, adverts, conversations, and media are erased. Billing, analytics, and auth-audit rows are retained. |
| Committed to Play Families / designed for children | No. |

## Content rating and audience

| Question | Answer |
| --- | --- |
| Category | Business |
| Target age | 18 and over |
| Designed for children | No |
| Appeals to children | No |
| Sexual content | No. Sexual content and sexual services are prohibited. |
| Violence, drugs, gambling | No. Those categories are prohibited listings. |
| User-generated content | Yes. Users can publish listings and send messages. Report and block exist. |
| Users can interact | Yes, inside a signed-in tenant. |
| Shares precise location | No |

Complete the IARC questionnaire in Console with those answers. Do not invent a
rating badge before IARC returns one.

## Reviewer account

Play review needs a demo tenant with current terms accepted, including
community standards. Create that account in the deployed app, store the
password in Play Console's reviewer field, and do not commit the password to
this repository. No reviewer account exists in this change.

## Still required before Submit

1. Replace `apps/web/public/icons/` with final art and redeploy so the manifest
   icons are not the placeholder monogram.
2. Build and sign the AAB with your own keystore (`deploy/twa/README.md`).
3. Publish `assetlinks.json` only after the real SHA-256 fingerprint replaces
   the placeholder.
4. The server verifies a Play `purchaseToken` when `PAYMENT_PROVIDER=play`.
   The Android client that obtains that token, and Play Console product ids,
   are still required. Do not ship STK for the SaaS fee inside the AAB.
5. Capture phone screenshots. This pack does not include them.
6. Counsel reviews the public policies.
7. A person approves the Kenya tax profile. Do not set `approvedBy` here.
8. Deploy the web build that serves the policy URLs and the icon files.
