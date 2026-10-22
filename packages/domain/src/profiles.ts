import type { SupplyChainRole } from './industries';

export const profileReviewReasons = [
  'HIGH_RISK_INDUSTRY_CHANGE',
  'HIGH_REVIEW_ROLE_CHANGE',
  'COUNTRY_SCOPE_CHANGE',
] as const;

export type ProfileReviewReason = (typeof profileReviewReasons)[number];

export const profileReviewDecisions = ['APPROVED', 'REJECTED'] as const;

export type ProfileReviewDecision = (typeof profileReviewDecisions)[number];

export type ProfileSocialLink = {
  label: string;
  url: string;
};

export type ProfileServiceArea = {
  primaryCity?: string;
  regions?: string[];
  radiusKm?: number;
  remoteAvailable?: boolean;
  operatingCountries?: string[];
};

export type ProfileDraftInput = {
  displayName: string;
  industryCode: string;
  role: SupplyChainRole;
  description: string;
  countryCode: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  physicalAddress?: string;
  mapsUrl?: string;
  socialLinks?: ProfileSocialLink[];
  serviceArea?: ProfileServiceArea;
};

export type ProfileDraft = ProfileDraftInput & {
  id: string;
  tenantId: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  reviewReasons?: ProfileReviewReason[];
  reviewRequestedAt?: string;
  reviewDecision?: ProfileReviewDecision;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishedProfile = ProfileDraftInput & {
  id: string;
  tenantId: string;
  sourceDraftId: string;
  status: 'LIVE' | 'ARCHIVED';
  version: number;
  publishedAt: string;
  archivedAt?: string;
  daysLive: number;
  createdAt: string;
  updatedAt: string;
};

export const advertDraftStatuses = ['DRAFT', 'PUBLISHED'] as const;
export type AdvertDraftStatus = (typeof advertDraftStatuses)[number];

export const advertStatuses = [
  'SCHEDULED',
  'LIVE',
  'RENEWAL_DUE',
  'PAUSED',
  'ARCHIVED',
  'AUTO_DELETED',
] as const;
export type AdvertStatus = (typeof advertStatuses)[number];

export type AdvertDraftInput = ProfileDraftInput & {
  title: string;
  publishedAt?: string;
};

export type AdvertDraft = AdvertDraftInput & {
  id: string;
  tenantId: string;
  status: AdvertDraftStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdvertPost = AdvertDraftInput & {
  id: string;
  tenantId: string;
  sourceDraftId?: string;
  title: string;
  status: AdvertStatus;
  version: number;
  publishedAt: string;
  expiresAt: string;
  boostedAt?: string;
  boostExpiresAt?: string;
  boostWeight?: number;
  pausedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  renewalAlertsSent: number[];
  createdAt: string;
  updatedAt: string;
};
