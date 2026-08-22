export const communityStandardsVersion = 'community-2026-08-22';

export type CommunityStandardSummary = {
  id: string;
  title: string;
  summary: string;
};

export const communityStandardSummaries: CommunityStandardSummary[] = [
  {
    id: 'AUTHORITY',
    title: 'Accurate authority',
    summary:
      'You must have lawful authority to post, sell, promote, source, and communicate about every item, service, profile, link, and media asset.',
  },
  {
    id: 'ZERO_TOLERANCE',
    title: 'Zero-tolerance content',
    summary:
      'Blocked goods, services, searches, media, links, messages, payments, and relationship claims are never allowed. Accepting terms does not unlock a blocked category.',
  },
  {
    id: 'ACCEPTABLE_USE',
    title: 'Platform acceptable use',
    summary:
      'Do not use the platform for illegal activity, exploitation, terrorism, trafficking, fraud, phishing, malware, DDoS, botnets, scraping abuse, spam, crypto mining, torrenting, proxy abuse, or compute resale.',
  },
  {
    id: 'TRUTHFUL',
    title: 'Truthful advertising',
    summary:
      'Claims, prices, offers, endorsements, guarantees, taxes, availability, and disclosures must be accurate, current, and compliant in the advertiser country.',
  },
  {
    id: 'RIGHTS',
    title: 'Rights and permissions',
    summary:
      'You must own or have permission for all names, brands, images, clips, files, links, code, descriptions, and intellectual-property claims you submit.',
  },
  {
    id: 'CONSENT',
    title: 'Data and consent',
    summary:
      'Contacts, biodata, buyer signals, and uploaded personal data may be collected, shared, or messaged only with lawful notice, consent, or another valid basis.',
  },
  {
    id: 'HARASSMENT',
    title: 'Harassment and bullying',
    summary:
      'Do not harass, bully, dox, threaten, or target a person for abuse in profiles, listings, media, or chat. Commercial disagreement is allowed; personal attacks are not.',
  },
  {
    id: 'TRANSACTIONS',
    title: 'Transaction responsibility',
    summary:
      'You are responsible for your listings, communications, contracts, deliveries, payments, taxes, and disputes. Telpen is not a party to user-to-user transactions.',
  },
  {
    id: 'REPORT_BLOCK',
    title: 'Reporting and blocking',
    summary:
      'Use in-product report and block controls for objectionable content or users. We review reports, may remove content or suspend accounts, and may report to KE-CIRT, NCMEC, or the hosting provider.',
  },
  {
    id: 'CHILDREN',
    title: 'Not for children',
    summary:
      'Sell Find Connect is a commercial business marketplace and is not directed at children. Sexual content is fully prohibited and is not treated as incidental user-generated content.',
  },
  {
    id: 'MONETIZATION',
    title: 'Paid promotion',
    summary:
      'Paid promotion, boosts, and checkout cannot be used to circulate prohibited or objectionable content. Monetization never overrides zero-tolerance or acceptable-use blocking.',
  },
  {
    id: 'MODERATION',
    title: 'Moderation rights',
    summary:
      'Telpen may block, remove, restrict, preserve evidence, suspend accounts, rate-limit abuse, and report severe violations while honoring mandatory platform, hosting-provider, and regulatory duties.',
  },
];
