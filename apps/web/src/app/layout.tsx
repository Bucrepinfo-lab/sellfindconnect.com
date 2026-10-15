import type { Metadata } from 'next';

import { Familjen_Grotesk } from 'next/font/google';

import './globals.css';

const display = Familjen_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SellFindConnect',
  description: 'Find suppliers, buyers and transporters across Kenya, and see why each one matches.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
