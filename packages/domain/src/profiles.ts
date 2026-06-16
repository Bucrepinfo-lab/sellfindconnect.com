import type { SupplyChainRole } from './industries';

export type ProfileDraftInput = {
  displayName: string;
  industryCode: string;
  role: SupplyChainRole;
  description: string;
  countryCode: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type ProfileDraft = ProfileDraftInput & {
  id: string;
  tenantId: string;
  status: 'DRAFT';
  createdAt: string;
  updatedAt: string;
};

export type AdvertStatus = 'LIVE' | 'RENEWAL_DUE' | 'AUTO_DELETED';

export type AdvertPost = ProfileDraftInput & {
  id: string;
  tenantId: string;
  title: string;
  status: AdvertStatus;
  publishedAt: string;
  expiresAt: string;
  deletedAt?: string;
  renewalAlertsSent: number[];
  createdAt: string;
  updatedAt: string;
};
