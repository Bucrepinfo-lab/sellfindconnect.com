import type { Metadata } from 'next';

import { activePolicyVersions } from '@telpen/domain';

import { LegalDocument, LegalSection } from '../../components/LegalDocument';

export const metadata: Metadata = { title: 'Subscription terms | SellFindConnect' };

export default function SubscriptionTermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Subscription terms"
      version={activePolicyVersions.subscriptionTermsVersion}
      updated="22 August 2026"
    >
      <LegalSection id="trial" title="1. First month free">
        <p>
          New tenants receive a 30-day trial. No platform subscription charge is collected during
          that window. The trial does not waive zero-tolerance, terms, or tax gates.
        </p>
      </LegalSection>
      <LegalSection id="price" title="2. Price">
        <p>
          From month two, the fee is 10 units of the subscriber country&apos;s official local currency
          per month. Countries that use a shilling display this as 10 local shillings. The price
          is tax-inclusive when the approved country tax profile says so. Kenya&apos;s proposed VAT is
          the KRA 16% general rate.
        </p>
      </LegalSection>
      <LegalSection id="seller" title="3. Seller of record">
        <p>
          Telpen Systems Ltd is the merchant of record for this SaaS fee. We do not hand the
          subscription to Paddle, Lemon Squeezy, Dodo, or any other merchant-of-record checkout.
          Stripe Tax, when enabled, calculates rates only. It does not file iTax and does not
          become the seller.
        </p>
      </LegalSection>
      <LegalSection id="collection" title="4. How we collect">
        <p>
          Web and PWA collection uses Stripe cards and/or Africa&apos;s Talking STK / M-Pesa to the
          verified login phone. Checkout does not accept a different payer phone. A Google Play
          Android listing, if ever submitted, must use Play Billing for this digital subscription.
        </p>
      </LegalSection>
      <LegalSection id="gate" title="5. Paid launch gate">
        <p>
          We will not charge the SaaS fee in a country until a human has approved that country&apos;s
          tax profile and live payment credentials have been reviewed. Until then, STK checkout
          returns a tax-profile block. Kenya files on iTax or through one Kenyan tax
          representative.
        </p>
      </LegalSection>
      <LegalSection id="cancel" title="6. Cancellation, failed payments, refunds">
        <p>
          You may stop using the service and request account deletion. Failed subscription
          payments may move the tenant through grace and suspension states. Refunds and credits
          require owner approval through the finance workbench. They are not issued automatically
          by support or by an agent.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
