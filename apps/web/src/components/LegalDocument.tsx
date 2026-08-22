import type { ReactNode } from 'react';

import '../styles/privacy.css';

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="sfc-privacy__section">
      <h2>{title}</h2>
      <div className="sfc-privacy__content">{children}</div>
    </section>
  );
}

export function LegalDocument({
  eyebrow,
  title,
  version,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  version: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="sfc-privacy">
      <div className="sfc-privacy__hero">
        <span className="sfc-privacy__eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="sfc-privacy__meta">
          {version} · Last updated: {updated} · Telpen Systems Ltd · Kenya
        </p>
      </div>
      <div className="sfc-privacy__body">
        {children}
        <nav className="sfc-privacy__section">
          <h2>Other policies</h2>
          <div className="sfc-privacy__content">
            <p>
              <a href="/terms">Terms of Service</a>
              {' · '}
              <a href="/subscription">Subscription terms</a>
              {' · '}
              <a href="/privacy">Privacy Policy</a>
              {' · '}
              <a href="/prohibited">Prohibited content</a>
              {' · '}
              <a href="/account/delete">Delete account</a>
            </p>
          </div>
        </nav>
      </div>
    </main>
  );
}
