import type { Metadata } from 'next';

import { communityStandardSummaries, communityStandardsVersion } from '@telpen/domain';

import { LegalDocument, LegalSection } from '../../components/LegalDocument';

export const metadata: Metadata = { title: 'Community standards | SellFindConnect' };

export default function CommunityStandardsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Community standards"
      version={communityStandardsVersion}
      updated="22 August 2026"
    >
      <LegalSection id="policy" title="User policy">
        <p>
          These community standards are the public user policy for Sell Find Connect profiles,
          listings, media, search, matching, and chat. You must accept the current terms, privacy,
          subscription, prohibited-content, and community standards policies before you create or
          upload user-generated content. This page is not a counsel sign-off.
        </p>
      </LegalSection>
      <LegalSection id="standards" title="Required conduct">
        <ul>
          {communityStandardSummaries.map((item) => (
            <li key={item.id}>
              <strong>{item.title}.</strong> {item.summary}
            </li>
          ))}
        </ul>
      </LegalSection>
      <LegalSection id="content" title="Objectionable content">
        <p>
          Zero-tolerance categories are listed at <a href="/prohibited">prohibited content</a>.
          Sexual content is fully blocked. We do not host incidental sexual UGC, and the service is
          not directed at children.
        </p>
      </LegalSection>
      <LegalSection id="reports" title="Reports and blocking">
        <p>
          Report objectionable content or users from the product. You may also block another user
          in conversation tools. Kenya is the first approved reporting playbook (KE-CIRT, NCMEC
          CyberTipline, and hosting-abuse). Other countries fail closed until a playbook is
          approved.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
