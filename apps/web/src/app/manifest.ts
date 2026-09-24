import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SellFindConnect',
    short_name: 'SellFind',
    description: 'Sell it. Find it. Connect. Source Finder and advertising workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f5',
    theme_color: '#1d4f45',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
