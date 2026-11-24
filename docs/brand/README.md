# SellFindConnect brand mark (11/11/26)

A price tag (Sell it) seen through a magnifying glass (Find it), whose handle
joins a second point (Connect). Chosen for a global market: universal symbols,
no flags or local imagery, no text inside the mark.

- `sellfindconnect-mark.svg`: master artwork (64 x 64 grid).
- `../store-assets/app-icon-512.png`: square, full-bleed 512 x 512 for the Play Store listing
  (Play rounds the corners itself).
- Web/PWA icons live in `apps/web/public/icons/` (192, 512, maskable 512 with
  the mark inside the safe zone, Apple touch 180).

Colours (identity 24/11/26, replaces forest green and gold): the mark sits on
indigo ink `#161a3d`; the tag is SELL tangerine `#ff6a3d`, the lens ring FIND
cobalt `#5b78ff`, the joined points CONNECT berry `#ff4f93` (brighter tints of
the UI colours so they glow on ink), white `#ffffff`.
The Android app (TWA) icon changes only with a new `.aab` built from these
icons; the website and installed PWA pick them up on deploy.

## Icon set (11/11/26)

`apps/web/src/components/SfcIcon.tsx` holds SellFindConnect's own icons: 38
drawn for this product on a 24px grid, in the mark's language (rounded 1.8px
strokes in the text colour, one gold accent per icon). Public screens use
these instead of emoji or a stock icon library, so they look the same on every
device. Preview: `icon-sheet.png`. Add a new icon in that file only; keep one
accent and the same stroke.

## Identity: Sell. Find. Connect. (24/11/26)

Owner brief: the forest green and gold did not say what the product does;
make the look communicate selling, finding and connecting, and stand out from
competitors. Each verb owns a colour, used with the same meaning everywhere:

| Verb | Colour | UI token | Used for |
|---|---|---|---|
| Sell | tangerine `#ff6a3d` (ink text on it, never white) | `--sell` | List your business, the seller band, anything a seller does |
| Find | cobalt `#2b4cf0` | `--find` (also `--green` for older rules) | Search, links, primary buttons, focus |
| Connect | berry `#d1246b` | `--connect` | Call, WhatsApp, Email, Website on a listing; match reasons |
| (base) | indigo ink `#161a3d`, paper `#fbfaf7` | `--ink`, `--canvas` | text, hero, sidebar |
| (rating) | sun `#ffc23d` | `--sun` | stars, featured, active marks |

Why these: the greens most Kenyans see every day already belong to
Safaricom/M-Pesa and Jiji (and our own HarvestHub); marketplaces that go all
orange (Alibaba, Jumia) blur together. Cobalt reads as trust and search,
tangerine as commerce and action, berry as the human connection; on indigo ink
the three glow, and orange beside blue is the strongest contrast pair for
calls to action. All text pairs pass WCAG AA (tangerine with ink text 5.9:1;
white on cobalt 6.2:1; white on berry 5.0:1).

Type: Bricolage Grotesque (display, 500 to 800) and Plus Jakarta Sans (text),
both loaded through next/font in `layout.tsx`. (Before this change a `:root`
rule overrode the display font, so headings had always fallen back to the
phone's system font, and "Inter" was named but never loaded.)

Signature: the hero carries a faint connection map (points joined by lines)
and a three-band stripe along its foot, tangerine, cobalt, berry.

## Light on the dark (24/11/26)

Owner: "apply some yellow in the darkish areas… illuminating or crystalline".
Yellow (sun `#ffc23d`, crystal-gold gradient `#fff6c7` → `#ffd84d` →
`#ffc23d`) is the light in the product, not a fourth verb: a sunrise glow and
two soft light shafts in the hero, golden crystal points on the connection
map, "anywhere in Kenya." lit in the gold gradient, a gold halo round the
search card, a gold "Use my location", a sunrise at the top of the business
sidebar with a gold-lit current section, and the same sunrise on the dark
onboarding and privacy screens. Gold text on ink is 10.4:1.
