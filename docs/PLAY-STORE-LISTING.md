# Google Play — store listing and Android build (SellFindConnect)

Paste pack for Play Console. **Claude in Chrome fills it in; the owner approves
every Save, Submit and rollout.** If Google asks for a password or 2-Step code,
the owner types it on their own device.

The Android app is a **Trusted Web Activity (TWA)** of https://sellfindconnect.com,
like Telpen Edu. Web changes go live through Fly with no app update.

---

## App details

- **App name** (max 30): `SellFindConnect`
- **Package ID (permanent):** `com.sellfindconnect.app`
- **Type:** App · **Category:** Business · **Price:** Free
- **Contact email:** owner to confirm (suggested `telpensystems@gmail.com`, the
  operator address on the SFC sign-off forms)
- **Website:** https://sellfindconnect.com
- **Privacy policy URL:** https://sellfindconnect.com/privacy
- **Account deletion URL:** https://sellfindconnect.com/account/delete
- **Digital Asset Links:** https://sellfindconnect.com/.well-known/assetlinks.json
  (served from the `ANDROID_CERT_FINGERPRINTS` env var on the web app)

## Short description (max 80 — 67 used)

```
Find suppliers, buyers and transporters in Kenya. First month free.
```

## Full description

```
SellFindConnect is a business-to-business directory for Kenya. Find the supplier, buyer or transporter your business needs, see why each one matches, and contact them directly.

WHO IT IS FOR
• Producers, processors, manufacturers and suppliers who want buyers to find them
• Wholesalers, retailers and buyers looking for reliable suppliers
• Transporters, agents and service providers who move goods along the supply chain

WHAT YOU CAN DO
• Search businesses by industry, role and location with Source Finder
• See a plain explanation of why each result matches your search
• Publish your business profile and adverts with photos
• Message businesses, track leads and save searches with alerts
• Report or block any business or message that breaks the rules

SAFE BY DESIGN
• Zero-tolerance content rules: prohibited listings are blocked before they go live
• Report and block on every result and conversation
• Not for children: SellFindConnect is for adult business users only

PRICING
Listing your business is free for the first month.

PRIVACY AND ACCOUNT DELETION
• Privacy policy: https://sellfindconnect.com/privacy
• Delete your account: https://sellfindconnect.com/account/delete

SellFindConnect is run by Telpen Systems Ltd, Ruiru, Kenya.
```

Do not add payment-method wording (M-Pesa, STK, card) to the Play listing.
Inside the Android app the platform subscription must use Google Play Billing,
which is not built yet (see `docs/PLAY_STORE.md`).

## Graphic assets

| Asset | File |
| --- | --- |
| App icon 512×512 | `docs/store-assets/app-icon-512.png` |
| Feature graphic 1024×500 | `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots 1080×1920 (9:16) — uploaded 15/10/26 | `docs/store-assets/screenshot-1-home.png`, `screenshot-2-results.png`, `screenshot-3-signup.png` |

Play rejects screenshots that are not 16:9 or 9:16.

---

## Building the Android app with PWABuilder (Claude in Chrome)

1. Open https://www.pwabuilder.com, enter `https://sellfindconnect.com`, Start.
2. Package for stores → **Android** → Google Play → **Options**:

| Setting | Value |
| --- | --- |
| Package ID | `com.sellfindconnect.app` |
| App name / Launcher name | `SellFindConnect` |
| App version / Version code | `1.0.0` / `1` |
| Host | `sellfindconnect.com` |
| Start URL | `/` |
| Theme, navigation and background colour | `#1d4f45` |
| Display mode | Standalone |
| Notification delegation | Off |
| Location delegation | Off |
| Google Play Billing | Off |
| Signing key | **New** (owner's name and organisation `Telpen Systems Ltd`) |

3. Download the zip (owner approves the download). It holds the `.aab`, an
   `assetlinks.json` and the **signing key with its passwords**.
4. **The owner stores the signing key and its passwords offline.** Never commit
   them, never paste them into chat. Losing the key means the app can never be
   updated by the same upload path.
5. Confirm the `.aab` targets the API level Play currently requires for new
   apps (Telpen Edu is moving to API 36).

## After the first upload: Digital Asset Links

Play re-signs the app. Both fingerprints must be listed or the app shows a
browser bar:

1. Play Console → SellFindConnect → Test and release → **App integrity** → App
   signing. Copy the SHA-256 of the **app signing key** and of the **upload key**.
2. Fly → `sellfindconnect-web` → Secrets → set `ANDROID_CERT_FINGERPRINTS` to
   both values, comma-separated (fingerprints are not secret, but the web app
   reads them from its environment). Deploy secrets.
3. Check https://sellfindconnect.com/.well-known/assetlinks.json lists both.

## Testing track

The Play developer account is a personal account, so a new app needs a
**closed test with at least 12 testers opted in for 14 continuous days** before
production access (as Telpen Edu did). Testers need a Gmail address for the
Play invite and their own SellFindConnect account (they can create one in the
app).
