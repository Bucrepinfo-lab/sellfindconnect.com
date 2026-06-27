export type DeletionStatus = 'NONE' | 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type DataCategory = 'PROFILE' | 'ADVERTS' | 'CONVERSATIONS' | 'ANALYTICS' | 'BILLING' | 'MEDIA' | 'AUTH_LOGS';

export interface DeletionRequest {
  id: string; tenantId: string; userId: string;
  requestedAt: string; scheduledAt: string;
  status: DeletionStatus; reason?: string;
  cancelledAt?: string; completedAt?: string;
}

export interface DataExportRequest {
  id: string; tenantId: string; userId: string;
  requestedAt: string; status: 'QUEUED' | 'PROCESSING' | 'READY' | 'EXPIRED';
  downloadUrl?: string; expiresAt?: string;
}

export const DELETION_GRACE_DAYS = 30;

export const DATA_INVENTORY = {
  PROFILE:       { label: 'Business profile',    description: 'Your public profile, contact details, service area, and industry classification.', deletedWith: 'ACCOUNT' as const },
  ADVERTS:       { label: 'Adverts and listings', description: 'All adverts you have published, including drafts, expired, and archived listings.', deletedWith: 'ACCOUNT' as const },
  CONVERSATIONS: { label: 'Conversations',        description: 'Inquiry threads, RFQ messages, and quotes exchanged with other businesses.', deletedWith: 'ACCOUNT' as const },
  ANALYTICS:     { label: 'Analytics events',    description: 'Aggregated engagement data. Raw events pruned per country retention policy.', deletedWith: 'RETENTION_POLICY' as const },
  BILLING:       { label: 'Billing records',     description: 'Invoices, receipts, and tax snapshots retained for the period required by your country tax authority.', deletedWith: 'RETENTION_POLICY' as const },
  MEDIA:         { label: 'Media and files',      description: 'Images and documents uploaded to your profile and adverts.', deletedWith: 'ACCOUNT' as const },
  AUTH_LOGS:     { label: 'Auth logs',            description: 'Hashed session and audit records retained for security and fraud prevention.', deletedWith: 'RETENTION_POLICY' as const },
};

export const addDays = (iso: string, days: number): string =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString();

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
