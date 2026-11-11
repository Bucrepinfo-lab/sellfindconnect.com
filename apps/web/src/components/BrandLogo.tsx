/**
 * SellFindConnect mark: two businesses (the dots) joined by one S-shaped
 * route, with the maize dot marking the match that was found. Inline SVG so
 * it stays sharp at any size and costs no extra request.
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="SellFindConnect" focusable="false">
      <rect width="48" height="48" rx="12" fill="#1d4f45" />
      <path
        d="M32 16c-1.9-2.8-4.8-4.3-8.4-4.3-4.9 0-8.2 2.6-8.2 6.4 0 3.9 3.1 5.3 7.9 6.2 4.7.9 8.1 2.4 8.1 6.4 0 3.8-3.4 6.6-8.5 6.6-3.7 0-6.7-1.4-8.7-4.1"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="33.5" cy="14.5" r="4.4" fill="#e0b040" stroke="#1d4f45" strokeWidth="1.8" />
      <circle cx="14" cy="34.5" r="3.2" fill="#ffffff" />
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
