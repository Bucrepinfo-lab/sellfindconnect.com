import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Telpen Adverts',
  description: 'Commercial relationship intelligence for advertisers, sources and buyers.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
