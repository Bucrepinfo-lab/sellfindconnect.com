/**
 * SellFindConnect mark. A price tag (Sell it) seen through a magnifying glass
 * (Find it), whose handle joins a second point (Connect). Universal symbols,
 * two colours, no text inside the mark, so it reads in any market and at
 * browser-tab size. Inline SVG: sharp at any size, no extra request.
 * Source file: docs/brand/sellfindconnect-mark.svg.
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="SellFindConnect" focusable="false">
      <rect width="64" height="64" rx="15" fill="#1d4f45"/>
      <circle cx="27" cy="27" r="15.5" fill="#ffffff"/>
      <circle cx="27" cy="27" r="15.5" fill="none" stroke="#e0b040" strokeWidth="3"/>
      <g transform="translate(27 27) scale(1.22) translate(-27 -27) rotate(-45 27 27) translate(-1 0)">
      <path d="M17.5 22.5h13.3l5.7 4.5-5.7 4.5H17.5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" fill="#1d4f45"/>
      <circle cx="31" cy="27" r="1.9" fill="#ffffff"/>
      </g>
      <path d="M38.6 38.6l7.2 7.2" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round"/>
      <path d="M45.8 45.8L53 38.4" stroke="#e0b040" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="47" cy="47" r="5.2" fill="#e0b040"/>
      <circle cx="53.5" cy="37.5" r="3.6" fill="#ffffff" stroke="#e0b040" strokeWidth="2.2"/>
    </svg>
  );
}

export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-logo">
      <BrandMark size={size} />
      <span className="brand-logo__words">
        <span className="brand-logo__name">SellFindConnect</span>
        <span className="brand-logo__tag">Sell it. Find it. Connect.</span>
      </span>
    </span>
  );
}
