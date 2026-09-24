const POLICIES: Array<{ href: string; label: string }> = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/subscription', label: 'Subscription terms' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/prohibited', label: 'Prohibited content' },
  { href: '/community', label: 'Community standards' },
  { href: '/account/delete', label: 'Delete account' },
];

/**
 * Shared "Other policies" navigation shown at the foot of every legal/policy
 * page. Google Play requires that the privacy policy, terms, and user policies
 * be reachable from one another; this keeps a single source of truth so no page
 * drifts out of the set.
 */
export function PolicyNav({ current }: { current?: string }) {
  const items = POLICIES.filter((p) => p.href !== current);
  return (
    <nav className="sfc-privacy__section" aria-label="Other policies">
      <h2>Other policies</h2>
      <div className="sfc-privacy__content">
        <p>
          {items.map((p, i) => (
            <span key={p.href}>
              {i > 0 ? ' · ' : ''}
              <a href={p.href}>{p.label}</a>
            </span>
          ))}
        </p>
      </div>
    </nav>
  );
}
