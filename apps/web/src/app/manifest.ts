import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Telpen Adverts',
    short_name: 'Telpen',
    description: 'Source Finder and advertising workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f5',
    theme_color: '#1d4f45',
    icons: [],
  };
}
