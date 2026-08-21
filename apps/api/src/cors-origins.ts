/**
 * Browser origins allowed to call the API with credentials.
 *
 * Production serves the web app on both the apex and www hosts. A single
 * WEB_ORIGIN secret therefore cannot cover live traffic; the apex/www pair is
 * added automatically when either brand host is configured.
 */
export function resolveCorsOrigins(webOrigin?: string, extraOrigins?: string): string[] {
  const origins = new Set<string>();

  const add = (value?: string) => {
    const trimmed = value?.trim().replace(/\/$/, '');
    if (trimmed) {
      origins.add(trimmed);
    }
  };

  add(webOrigin);
  if (extraOrigins) {
    for (const part of extraOrigins.split(',')) {
      add(part);
    }
  }

  for (const origin of [...origins]) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'www.sellfindconnect.com') {
        add(`${url.protocol}//sellfindconnect.com`);
      } else if (url.hostname === 'sellfindconnect.com') {
        add(`${url.protocol}//www.sellfindconnect.com`);
      }
    } catch {
      // Keep non-URL origins as configured.
    }
  }

  return [...origins];
}
