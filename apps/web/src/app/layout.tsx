import type { Metadata, Viewport } from 'next';

import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';

import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import { THEME_BOOT_SCRIPT } from '../lib/theme';

import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

// Body text (identity 24/11/26): friendly, very legible on small phones.
const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
