# SellFindConnect brand mark (11/11/26)

A price tag (Sell it) seen through a magnifying glass (Find it), whose handle
joins a second point (Connect). Chosen for a global market: universal symbols,
no flags or local imagery, no text inside the mark.

- `sellfindconnect-mark.svg`: master artwork (64 x 64 grid).
- `play-icon-512.png`: square, full-bleed 512 x 512 for the Play Store listing
  (Play rounds the corners itself).
- Web/PWA icons live in `apps/web/public/icons/` (192, 512, maskable 512 with
  the mark inside the safe zone, Apple touch 180).

Colours: forest green `#1d4f45`, gold `#e0b040`, white `#ffffff`.
The Android app (TWA) icon changes only with a new `.aab` built from these
icons; the website and installed PWA pick them up on deploy.

## Icon set (11/11/26)

`apps/web/src/components/SfcIcon.tsx` holds SellFindConnect's own icons: 38
drawn for this product on a 24px grid, in the mark's language (rounded 1.8px
strokes in the text colour, one gold accent per icon). Public screens use
these instead of emoji or a stock icon library, so they look the same on every
device. Preview: `icon-sheet.png`. Add a new icon in that file only; keep one
accent and the same stroke.
