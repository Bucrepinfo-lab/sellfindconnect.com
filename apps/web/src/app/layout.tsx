import type { Metadata, Viewport } from 'next';

import localFont from 'next/font/local';

import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import { ReturnVisitPrompt } from '../components/ReturnVisitPrompt';
import { SiteTopBar } from '../components/SiteTopBar';
import { THEME_BOOT_SCRIPT } from '../lib/theme';

import './globals.css';

// Self-hosted (fonts/README.md): the build never depends on Google Fonts.
const display = localFont({
  src: './fonts/bricolage-grotesque-latin-wght.woff2',
  weight: '200 800',
  variable: '--font-display',
  display: 'swap',
});

// Body text (identity 24/11/26): friendly, very legible on small phones.
const body = localFont({
  src: './fonts/plus-jakarta-sans-latin-wght.woff2',
  weight: '200 800',
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SellFindConnect',
  description: 'Find suppliers, buyers and transporters across Kenya, and see why each one matches.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#161a3d' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0f2a' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Dark theme (owner 25/11/26): apply a saved choice before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <SiteTopBar />
        <ReturnVisitPrompt />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
