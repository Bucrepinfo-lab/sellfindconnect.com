/**
 * Where the shared top bar shows, and where "Back" goes when the visitor did
 * not arrive from another page of this site (opened from a link or a share).
 */

/** Home, the dashboard and the staff console carry their own side menu. */
const OWN_MENU = ['/', '/dashboard', '/admin'];

export function showsSiteTopBar(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return !OWN_MENU.includes(path);
}

export function backTargetFor(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/account') return '/dashboard';
  if (path.startsWith('/account/')) return '/account';
  if (path.startsWith('/dashboard/')) return '/dashboard';
  return '/';
}
