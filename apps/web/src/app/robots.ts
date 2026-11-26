import type { MetadataRoute } from 'next';

const SITE = 'https://sellfindconnect.com';

/** Google may read the public pages; signed-in and admin areas stay out of search (owner 26/11/26). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/listing/', '/community', '/subscription', '/terms', '/privacy', '/prohibited'],
        disallow: ['/api/', '/admin', '/dashboard', '/account', '/onboarding'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
