import type { Metadata } from 'next';

import { activePolicyVersions } from '@telpen/domain';

import { LegalDocument, LegalSection } from '../../components/LegalDocument';

export const metadata: Metadata = { title: 'Terms of Service | SellFindConnect' };

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of Service"
      version={activePolicyVersions.termsVersion}
      updated="22 August 2026"
    >
      <LegalSection id="agreement" title="1. Agreement">
        <p>
          These terms govern use of Sell Find Connect (also called Telpen Adverts), operated by
          Telpen Systems Ltd. By creating an account, publishing, messaging, promoting, or paying,
          you accept the current terms, privacy policy, subscription terms, and prohibited-content
          policy. Acceptance never overrides zero-tolerance blocking or hosting-provider acceptable
          use.
        </p>
      </LegalSection>
      <LegalSection id="service" title="2. The service">
        <p>
          Sell Find Connect is a multi-tenant advertising, discovery, and matchmaking platform. It
          helps people find who produces, supplies, buys, consumes, installs, repairs, ships,
          finances, certifies, or distributes an item or service in a country. We do not take
          title to goods between counterparties and we are not a party to their contracts.
        </p>
      </LegalSection>
      <LegalSection id="account" title="3. Accounts and login phone">
        <p>
          You must provide accurate account details.           The verified login phone is the only Africa&apos;s Talking / M-Pesa STK Push destination for the platform subscription. Checkout has no
          phone field. You must not attempt to send an STK prompt to someone else&apos;s number.
        </p>
      </LegalSection>
      <LegalSection id="subscription" title="4. Subscription and tax">
        <p>
          The first month is free. From month two, the fee is 10 units of the subscriber country&apos;s
          official local currency per month. Telpen Systems Ltd stays the merchant of record. We
          do not use Paddle, Lemon Squeezy, or other merchant-of-record checkouts. Kenya VAT is
          calculated from the finance module (and Stripe Tax as a rate engine when enabled). We
          file on KRA iTax or through one Kenyan tax representative. Paid checkout stays blocked
          until a human approves the Kenya tax profile. See{' '}
          <a href="/subscription">subscription terms</a>.
        </p>
      </LegalSection>
      <LegalSection id="content" title="5. Content and zero-tolerance">
        <p>
          You are responsible for profiles, listings, media, and messages you submit. Weapons,
          pornography, human trafficking, child exploitation, illegal drugs, violent extremism,
          hate, graphic violence, criminal services, counterfeit or stolen goods, illegal wildlife
          trafficking, spam, scams, and related abuse are blocked entirely. The public list is at{' '}
          <a href="/prohibited">prohibited content</a>. We may remove content, suspend accounts,
          preserve evidence, and report to KE-CIRT, NCMEC, or hosting providers.
        </p>
      </LegalSection>
      <LegalSection id="duties" title="6. Responsibility and non-waivable duties">
        <p>
          You indemnify Telpen Systems Ltd against claims arising from your content, listings, and
          counterparties. That indemnity does not waive duties we cannot waive: privacy, tax,
          consumer, child-safety, app-store, hosting acceptable-use, and other mandatory law.
        </p>
      </LegalSection>
      <LegalSection id="privacy" title="7. Privacy and deletion">
        <p>
          Personal data is handled under the <a href="/privacy">Privacy Policy</a>. You may request
          account deletion at <a href="/account/delete">/account/delete</a>. A 30-day grace period
          applies. Billing and tax records are retained for the period required by the relevant
          tax authority (7 years for Kenya KRA).
        </p>
      </LegalSection>
      <LegalSection id="changes" title="8. Changes">
        <p>
          We version these terms. Material changes require re-acceptance before publish, upload,
          chat, paid promotion, or payment paths continue. Native Google Play apps are not in
          current delivery; a later Play listing would use Play Billing for the digital
          subscription.
        </p>
      </LegalSection>
      <LegalSection id="contact" title="9. Contact">
        <p>
          Telpen Systems Ltd · Ruiru, Kiambu County, Kenya · privacy@sellfindconnect.com. These
          terms are information about how the product operates; a qualified advisor should review
          them before you rely on them as a binding production contract in your jurisdiction.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
