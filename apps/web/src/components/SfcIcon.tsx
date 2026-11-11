import type { ReactNode } from 'react';

/**
 * SellFindConnect's own icon set (11/11/26). Drawn for this product on a 24px
 * grid in the logo's language: rounded 1.8px strokes in the text colour and
 * one gold accent per icon (the "connect" point of the brand mark). No emoji
 * and no stock icon library on public screens, so the set looks the same on
 * every phone and browser. Source of truth: this file; sheet in docs/brand.
 */

const a = { className: 'sfc-icon__accent' } as const;
const af = { className: 'sfc-icon__accent-fill' } as const;

const lorry = (
  <>
    <path d="M2.5 6.5h11v10.5h-11z" />
    <path d="M13.5 10h3.9l3.1 3.3V17h-7" />
    <circle cx="7" cy="17.6" r="2.1" {...af} />
    <circle cx="16.9" cy="17.6" r="2.1" {...af} />
  </>
);

const shop = (
  <>
    <path d="M4.2 10.8v8.7h15.6v-8.7" />
    <path d="M3 9.8l1.8-5.3h14.4L21 9.8a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
    <path d="M10 19.5v-4.8h4v4.8" {...a} />
  </>
);

const tag = (
  <>
    <path d="M3.5 12.2V5.5a2 2 0 0 1 2-2h6.7l8 8a1.8 1.8 0 0 1 0 2.5l-5.5 5.5a1.8 1.8 0 0 1-2.5 0z" />
    <circle cx="8" cy="8" r="1.7" {...af} />
  </>
);

const magnifier = (
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.4 15.4l3.6 3.6" />
    <circle cx="19.6" cy="19.6" r="1.9" {...af} />
  </>
);

const coins = (
  <>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M14.2 10.3a5.5 5.5 0 1 1-3.9 3.9" {...a} />
    <circle cx="9" cy="9" r="1.6" {...af} />
  </>
);

const shieldTick = (
  <>
    <path d="M12 3l7.5 2.8v5.4c0 4.6-3.1 8-7.5 9.8-4.4-1.8-7.5-5.2-7.5-9.8V5.8z" />
    <path d="M8.7 11.8l2.4 2.4 4.3-4.6" {...a} />
  </>
);

const ICONS = {
  // Sell it. Find it. Connect.
  sell: tag,
  find: magnifier,
  connect: (
    <>
      <path d="M8.2 19H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.6" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="5" r="2.3" {...af} />
    </>
  ),

  // Who you are looking for
  producer: (
    <>
      <path d="M3 20.5h18" />
      <path d="M4.5 20.5V11l5 3v-3l5 3V5.5h4l.9 15" />
      <circle cx="16.5" cy="2.9" r="1.3" {...af} />
    </>
  ),
  supplier: (
    <>
      <path d="M4 8.5l8-4 8 4v8l-8 4-8-4z" />
      <path d="M4 8.5l8 4 8-4M12 12.5v8" />
      <path d="M8 6.5l8 4v3" {...a} />
    </>
  ),
  wholesaler: (
    <>
      <rect x="3.5" y="12.5" width="8" height="8" rx="1.2" />
      <rect x="12.5" y="12.5" width="8" height="8" rx="1.2" />
      <rect x="8" y="3.5" width="8" height="8" rx="1.2" {...a} />
    </>
  ),
  transporter: lorry,
  services: (
    <>
      <path d="M15 4.5a4.2 4.2 0 0 0-4.6 5.9l-6.2 6.2a1.9 1.9 0 0 0 2.7 2.7l6.2-6.2A4.2 4.2 0 0 0 19 8.5l-2.6 2.6-2.4-.6-.6-2.4z" />
      <circle cx="5.6" cy="17.9" r="1" {...af} />
    </>
  ),
  buyer: (
    <>
      <path d="M3.5 9.5h17l-1.6 9a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6z" />
      <path d="M8 9.5l3-5.5M16 9.5L13 4" />
      <path d="M9.5 13v4M14.5 13v4" {...a} />
    </>
  ),
  financier: coins,
  certifier: (
    <>
      <circle cx="12" cy="9.5" r="6" />
      <path d="M8.6 14.6L7 21l5-2.4 5 2.4-1.6-6.4" />
      <path d="M9.5 9.6l1.8 1.8 3.3-3.5" {...a} />
    </>
  ),

  // Industries
  agriculture: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 14.5c-4.5 0-7-2.5-7-6.5 4.5 0 7 2.5 7 6.5z" />
      <path d="M12 11c0-3.8 2.3-6 6.5-6 0 3.8-2.3 6-6.5 6z" {...a} />
    </>
  ),
  extractives: (
    <>
      <path d="M6 4.5h12l3.5 5L12 20 2.5 9.5z" />
      <path d="M9 4.5l-1 5 4 10.5 4-10.5-1-5" />
      <path d="M2.5 9.5h19" {...a} />
    </>
  ),
  manufacturing: (
    <>
      <circle cx="12" cy="12" r="6.3" />
      <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2" />
      <circle cx="12" cy="12" r="2.3" {...af} />
    </>
  ),
  utilities: (
    <>
      <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" {...af} />
      <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" />
    </>
  ),
  construction: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 9.7h17M3.5 14.3h17" />
      <path d="M9 5v4.7M15 9.7v4.6M9 14.3V19" {...a} />
    </>
  ),
  trade: shop,
  automotive: (
    <>
      <path d="M3 16.6v-3.2l2.2-.8 2-4.6h8.6l2.6 4.5 2.6.9v3.2" />
      <path d="M9.6 16.6h4.8M6.2 12.4h11.3" />
      <circle cx="7" cy="17" r="2.1" {...af} />
      <circle cx="17" cy="17" r="2.1" {...af} />
    </>
  ),
  logistics: lorry,
  hospitality: (
    <>
      <path d="M3.5 18h17" />
      <path d="M5 18a7 7 0 0 1 14 0" />
      <path d="M12 11V9.4" />
      <circle cx="12" cy="7.6" r="1.5" {...af} />
    </>
  ),
  technology: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.3h3" {...a} />
    </>
  ),
  finance: coins,
  health: (
    <>
      <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />
      <circle cx="12" cy="12" r="1.6" {...af} />
    </>
  ),
  general: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...a} />
    </>
  ),

  // Why use it
  direct: (
    <>
      <path d="M4 4.5h10A1.5 1.5 0 0 1 15.5 6v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5 15.5v-3H4A1.5 1.5 0 0 1 2.5 11V6A1.5 1.5 0 0 1 4 4.5z" />
      <path d="M18.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 20 17h-1v2.6L16 17h-4" {...a} />
    </>
  ),
  checked: shieldTick,
  price: tag,
  report: (
    <>
      <path d="M5.5 21V3.8" />
      <path d="M5.5 4.5h12l-2.2 4 2.2 4h-12z" {...af} />
      <path d="M5.5 4.5h12l-2.2 4 2.2 4h-12" />
    </>
  ),

  // Small signs on cards and controls
  market: shop,
  pin: (
    <>
      <path d="M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10.4" r="2.3" {...af} />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.7" {...af} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.3V12l3.2 2" {...a} />
    </>
  ),
  star: <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" />,
  featured: (
    <>
      <path d="M11 3c.6 4.9 2.5 6.8 7.4 7.4-4.9.6-6.8 2.5-7.4 7.4-.6-4.9-2.5-6.8-7.4-7.4 4.9-.6 6.8-2.5 7.4-7.4z" />
      <circle cx="18.6" cy="18.6" r="1.8" {...af} />
    </>
  ),
  fresh: shieldTick,
  locate: (
    <>
      <circle cx="12" cy="12" r="6.3" />
      <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2" />
      <circle cx="12" cy="12" r="2.2" {...af} />
    </>
  ),
  share: (
    <>
      <path d="M8 11l7.8-4M8 13l7.8 4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" {...af} />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1" />
      <path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1" {...a} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type SfcIconName = keyof typeof ICONS;

export const sfcIconNames = Object.keys(ICONS) as SfcIconName[];

const ROLE_ICONS: Record<string, SfcIconName> = {
  PRODUCER: 'producer',
  MANUFACTURER: 'producer',
  SUPPLIER: 'supplier',
  WHOLESALER: 'wholesaler',
  DISTRIBUTOR: 'transporter',
  LOGISTICS_PROVIDER: 'transporter',
  SERVICE_PROVIDER: 'services',
  INSTALLER: 'services',
  REPAIRER: 'services',
  BUYER: 'buyer',
  CONSUMER: 'buyer',
  RETAILER: 'trade',
  FINANCIER: 'financier',
  CERTIFIER: 'certifier',
};

const INDUSTRY_ICONS: Record<string, SfcIconName> = {
  AGRICULTURE: 'agriculture',
  EXTRACTIVES: 'extractives',
  MANUFACTURING: 'manufacturing',
  UTILITIES: 'utilities',
  CONSTRUCTION: 'construction',
  TRADE: 'trade',
  AUTOMOTIVE: 'automotive',
  LOGISTICS: 'logistics',
  HOSPITALITY: 'hospitality',
  TECHNOLOGY: 'technology',
  FINANCE: 'finance',
  HEALTH: 'health',
};

export function roleIconName(role: string): SfcIconName {
  return ROLE_ICONS[role] ?? 'general';
}

export function industryIconName(code: string): SfcIconName {
  return INDUSTRY_ICONS[code] ?? 'general';
}

export function SfcIcon({
  name,
  size = 20,
  solid = false,
  className,
}: {
  name: SfcIconName;
  size?: number;
  /** Fill the outline with the current colour (used for rating stars). */
  solid?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`sfc-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
