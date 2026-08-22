import type { Metadata } from "next";
import "../../styles/privacy.css";
export const metadata: Metadata = { title: "Privacy Policy | SellFindConnect" };
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="sfc-privacy__section"><h2>{title}</h2><div className="sfc-privacy__content">{children}</div></section>;
}
export default function PrivacyPolicyPage() {
  return (
    <main className="sfc-privacy">
      <div className="sfc-privacy__hero">
        <span className="sfc-privacy__eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="sfc-privacy__meta">Last updated: 25 June 2026 · Telpen Systems Ltd · Kenya</p>
      </div>
      <div className="sfc-privacy__body">
        <Section id="overview" title="Overview">SellFindConnect is operated by Telpen Systems Ltd. This policy explains what data we collect, why, how we protect it, and your rights. We process data under the Kenya Data Protection Act 2019 and where applicable the EU GDPR.</Section>
        <Section id="data" title="Data We Collect"><ul><li><strong>Account data</strong> — name, email, phone, password hash.</li><li><strong>Business profile</strong> — company name, industry, service area, contact details.</li><li><strong>Adverts</strong> — titles, descriptions, media, pricing.</li><li><strong>Conversations</strong> — inquiry messages, RFQ threads, quotes.</li><li><strong>Payment data</strong> — billing reference and M-Pesa transaction IDs. We never store card numbers.</li><li><strong>Usage data</strong> — views, clicks, searches, interaction events (consent-gated).</li></ul></Section>
        <Section id="use" title="How We Use Your Data"><ul><li>To operate the platform and provide discovery and matching services.</li><li>To process subscription payments and issue tax-compliant receipts.</li><li>To send transactional notifications.</li><li>To comply with country tax authority requirements.</li><li>To detect fraud, abuse, and zero-tolerance policy violations.</li></ul></Section>
        <Section id="sharing" title="Data Sharing">We do not sell your data. We share data only with payment providers (Safaricom M-Pesa / Africa&apos;s Talking), cloud infrastructure providers (Fly.io Frankfurt) under strict data-processing agreements, and law enforcement when legally required.</Section>
        <Section id="retention" title="Data Retention">Account and profile data is deleted within 30 days of a confirmed deletion request. Billing records are retained for the period required by your country tax authority (7 years for Kenya KRA).</Section>
        <Section id="rights" title="Your Rights">Under the Kenya Data Protection Act and GDPR you have the right to access, correct, export, erase, restrict, and object to processing of your data. Exercise these rights from Settings then Data and Privacy in-app or email privacy@sellfindconnect.com.</Section>
        <Section id="security" title="Security">Data is encrypted in transit (TLS 1.3) and at rest. Passwords are hashed and never stored in plain text. MFA is required for all sensitive account actions.</Section>
        <Section id="contact" title="Contact">Telpen Systems Ltd · privacy@sellfindconnect.com · Ruiru, Kiambu County, Kenya. Complaints: <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">odpc.go.ke</a>. Related: <a href="/terms">Terms of Service</a> · <a href="/subscription">Subscription terms</a> · <a href="/prohibited">Prohibited content</a> · <a href="/account/delete">Delete account</a>.</Section>
      </div>
    </main>
  );
}
