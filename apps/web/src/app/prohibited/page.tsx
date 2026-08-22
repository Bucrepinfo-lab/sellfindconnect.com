import type { Metadata } from 'next';

import { activePolicyVersions, prohibitedCategorySummaries } from '@telpen/domain';

import { LegalDocument, LegalSection } from '../../components/LegalDocument';

export const metadata: Metadata = { title: 'Prohibited content | SellFindConnect' };

export default function ProhibitedContentPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Prohibited content"
      version={activePolicyVersions.prohibitedContentVersion}
      updated="18 June 2026"
    >
      <LegalSection id="rule" title="Zero-tolerance">
        <p>
          These categories are blocked entirely across taxonomy, profiles, listings, media, search,
          matching, relationship links, chat, payment, and analytics exports. Accepting terms never
          overrides this list. We may remove content, suspend accounts, preserve evidence, and
          report to KE-CIRT, NCMEC, or the hosting provider.
        </p>
      </LegalSection>
      <LegalSection id="categories" title="Blocked categories">
        <ul>
          {prohibitedCategorySummaries.map((item) => (
            <li key={item.category}>
              <strong>{item.label}.</strong> {item.summary}
            </li>
          ))}
        </ul>
      </LegalSection>
      <LegalSection id="reports" title="Reports">
        <p>
          Kenya is the first approved reporting playbook. Confirmed high-severity blocks attach
          KE-CIRT, NCMEC CyberTipline, and hosting-abuse channels. Other countries fail closed
          until a playbook is approved. See also the <a href="/terms">Terms of Service</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
