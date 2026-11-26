import type { MetadataRoute } from 'next';

const SITE = 'https://sellfindconnect.com';

/** Public pages only (owner 26/11/26: be seen by Google). Adverts are found from search on the home page. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/subscription`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/community`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/prohibited`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
