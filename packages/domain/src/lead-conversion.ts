import type { SourceFinderReasonCode, SourceFinderSearchResult } from './source-finder';

export const matchFeedbackActions = ['ACCEPT', 'SAVE', 'DISMISS', 'HIDE', 'REPORT'] as const;

export type MatchFeedbackAction = (typeof matchFeedbackActions)[number];

export const inquiryTypes = [
  'GENERAL',
  'RFQ',
  'SUPPLY_REQUEST',
  'BUYER_REQUEST',
  'PARTNERSHIP',
] as const;

export type InquiryType = (typeof inquiryTypes)[number];

export const leadStatuses = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATING',
  'WON',
  'LOST',
  'BLOCKED',
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type LeadConversionIntelligence = {
  matchScore: number;
  confidence: number;
  priority: LeadPriority;
  responseSlaHours: number;
  reasonCodes: SourceFinderReasonCode[];
  nextBestActions: string[];
};

export type LeadRecord = {
  id: string;
  tenantId: string;
  sourceRecordId: string;
  sourceName: string;
  sourceRole: string;
  inquiryType: InquiryType;
  message: string;
  quantity?: string;
  urgency?: string;
  status: LeadStatus;
  intelligence: LeadConversionIntelligence;
  createdAt: string;
  updatedAt: string;
};

export function buildLeadConversionIntelligence(
  source: SourceFinderSearchResult,
): LeadConversionIntelligence {
  const engagementScore = Math.min(
    20,
    Math.round(
      source.analytics.inquiries * 0.18 +
        source.analytics.clicks * 0.015 +
        source.analytics.downloads * 0.08,
    ),
  );
  const verificationBoost = source.verified ? 10 : 0;
  const responseBoost = source.responseTimeMinutes <= 30 ? 8 : source.responseTimeMinutes <= 60 ? 4 : 0;
  const relationshipBoost = Math.min(10, source.relatedLinks.length * 5);
  const confidence = clampScore(
    Math.round(source.score * 0.62 + engagementScore + verificationBoost + responseBoost + relationshipBoost),
  );
  const priority: LeadPriority = confidence >= 80 ? 'HIGH' : confidence >= 55 ? 'MEDIUM' : 'LOW';
  const responseSlaHours = priority === 'HIGH' ? 4 : priority === 'MEDIUM' ? 12 : 24;

  return {
    matchScore: source.score,
    confidence,
    priority,
    responseSlaHours,
    reasonCodes: source.reasonCodes,
    nextBestActions: buildNextBestActions(source, priority),
  };
}

function buildNextBestActions(source: SourceFinderSearchResult, priority: LeadPriority): string[] {
  const actions = [
    priority === 'HIGH'
      ? 'Open a priority inquiry while the match is warm.'
      : 'Save the match and confirm fit before outreach.',
  ];

  if (source.relatedLinks.length > 0) {
    actions.push('Review attached supplier, buyer, or service links before messaging.');
  }

  if (source.reasonCodes.includes('NEED_MATCH')) {
    actions.push('Mention the declared need in the first message.');
  }

  if (source.reasonCodes.includes('OFFER_MATCH')) {
    actions.push('Ask for availability, quantity, delivery area, and price terms.');
  }

  if (source.responseTimeMinutes <= 30) {
    actions.push('Expect a fast response; assign an owner for same-day follow-up.');
  }

  return actions.slice(0, 4);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}
