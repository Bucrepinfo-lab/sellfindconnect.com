import type { TenantAccessRole } from './access-control';

export const productAuditActions = [
  'CONVERSATION_CREATED',
  'CONVERSATION_MESSAGE_SENT',
  'CONVERSATION_ASSIGNED',
  'CONVERSATION_STATUS_CHANGED',
  'CONVERSATION_RECEIPT_RECORDED',
  'CONVERSATION_MEDIA_ATTACHED',
  'NOTIFICATION_PLANNED',
  'NOTIFICATION_DISPATCHED',
  'TAX_RETURN_GENERATED',
  'TAX_RETURN_SUBMITTED',
  'TAX_RETURN_APPROVED',
  'TAX_RETURN_EVIDENCE_ATTACHED',
  'TAX_RETURN_FILED',
  'TAX_RETURN_REMITTED',
  'TAX_RETURN_LOCKED',
  'TAX_RETURN_CORRECTED',
  'TAX_REPORT_EXPORTED',
  'SOURCE_FINDER_OUTCOME_RECORDED',
  'SOURCE_FINDER_INDEX_REBUILT',
  'ANALYTICS_REPORT_EXPORTED',
  'ANALYTICS_PRIVACY_REQUEST_RUN',
  'ANALYTICS_RETENTION_RUN',
  'ANALYTICS_ROLLUP_REFRESHED',
  'INVOICE_CREATED',
  'INVOICE_RECEIPT_ISSUED',
  'INVOICE_PAYMENT_CAPTURED',
  'INVOICE_REFUNDED',
  'PAYMENT_CAPTURE_SETTLED',
  'PAYMENT_CHECKOUT_REQUESTED',
  'PAYMENT_PAYOUT_REQUESTED',
] as const;

export type ProductAuditAction = (typeof productAuditActions)[number];

export type ProductAuditMetadata = Record<string, string | number | boolean | null>;

export type ProductAuditQuery = {
  action?: string;
  entityType?: string;
};

export function matchesProductAuditQuery(
  record: { action: string; entityType: string },
  query?: ProductAuditQuery,
): boolean {
  const action = query?.action?.trim();
  const entityType = query?.entityType?.trim();
  if (action && record.action !== action) {
    return false;
  }
  if (entityType && record.entityType !== entityType) {
    return false;
  }
  return true;
}

export type ProductAuditRecord = {
  action: ProductAuditAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  actorUserId?: string;
  metadata?: ProductAuditMetadata;
  createdAt: string;
};

const deniedExactKeys = new Set([
  'password',
  'token',
  'sessiontoken',
  'mfacode',
  'code',
  'invitetoken',
  'email',
  'phone',
  'body',
  'message',
  'note',
  'authorization',
  'apikey',
  'pushtoken',
  'rawemail',
  'developmenttoken',
  'developmentcode',
  'otpauthuri',
  'totpsecret',
  'totppendingsecret',
  'recoverycode',
  'receiptnumber',
  'invoicenumber',
  'paymentreference',
  'billingreference',
  'customerreference',
  'authorityreference',
]);

export function canViewTenantAuditLogs(role: TenantAccessRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function describeProductAuditAction(action: string): string {
  switch (action) {
    case 'CONVERSATION_CREATED':
      return 'Conversation created';
    case 'CONVERSATION_MESSAGE_SENT':
      return 'Chat message sent';
    case 'CONVERSATION_ASSIGNED':
      return 'Conversation assigned';
    case 'CONVERSATION_STATUS_CHANGED':
      return 'Conversation status changed';
    case 'CONVERSATION_RECEIPT_RECORDED':
      return 'Chat receipt recorded';
    case 'CONVERSATION_MEDIA_ATTACHED':
      return 'Chat media attached';
    case 'NOTIFICATION_PLANNED':
      return 'Notification planned';
    case 'NOTIFICATION_DISPATCHED':
      return 'Notification dispatched';
    case 'TAX_RETURN_GENERATED':
      return 'Tax return generated';
    case 'TAX_RETURN_SUBMITTED':
      return 'Tax return submitted';
    case 'TAX_RETURN_APPROVED':
      return 'Tax return approved';
    case 'TAX_RETURN_EVIDENCE_ATTACHED':
      return 'Tax return evidence attached';
    case 'TAX_RETURN_FILED':
      return 'Tax return filed';
    case 'TAX_RETURN_REMITTED':
      return 'Tax return remitted';
    case 'TAX_RETURN_LOCKED':
      return 'Tax period locked';
    case 'TAX_RETURN_CORRECTED':
      return 'Tax period corrected';
    case 'TAX_REPORT_EXPORTED':
      return 'Tax report exported';
    case 'SOURCE_FINDER_OUTCOME_RECORDED':
      return 'Source Finder outcome recorded';
    case 'SOURCE_FINDER_INDEX_REBUILT':
      return 'Source Finder index rebuilt';
    case 'ANALYTICS_REPORT_EXPORTED':
      return 'Analytics report exported';
    case 'ANALYTICS_PRIVACY_REQUEST_RUN':
      return 'Analytics privacy request run';
    case 'ANALYTICS_RETENTION_RUN':
      return 'Analytics retention run';
    case 'ANALYTICS_ROLLUP_REFRESHED':
      return 'Analytics rollups refreshed';
    case 'INVOICE_CREATED':
      return 'Invoice created';
    case 'INVOICE_RECEIPT_ISSUED':
      return 'Invoice receipt issued';
    case 'INVOICE_PAYMENT_CAPTURED':
      return 'Invoice payment captured';
    case 'INVOICE_REFUNDED':
      return 'Invoice refunded';
    case 'PAYMENT_CAPTURE_SETTLED':
      return 'Provider payment capture settled';
    case 'PAYMENT_CHECKOUT_REQUESTED':
      return 'Mobile checkout requested';
    case 'PAYMENT_PAYOUT_REQUESTED':
      return 'Mobile payout requested';
    default:
      return action.replaceAll('_', ' ').toLowerCase();
  }
}

export function isDeniedProductAuditMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_-]/g, '');
  if (deniedExactKeys.has(normalized)) {
    return true;
  }

  return (
    normalized.endsWith('token') ||
    normalized.endsWith('secret') ||
    normalized.endsWith('password') ||
    normalized.includes('email')
  );
}

export function sanitizeProductAuditMetadata(
  metadata?: Record<string, unknown>,
): ProductAuditMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: ProductAuditMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isDeniedProductAuditMetadataKey(key)) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function buildProductAuditRecord(input: {
  action: ProductAuditAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}): ProductAuditRecord {
  const tenantId = input.tenantId.trim();
  const entityId = input.entityId.trim();
  const entityType = input.entityType.trim();
  if (!tenantId || !entityId || !entityType) {
    throw new Error('Product audit records require a tenant, entity type, and entity id.');
  }

  return {
    action: input.action,
    entityType,
    entityId,
    tenantId,
    actorUserId: input.actorUserId?.trim() || undefined,
    metadata: sanitizeProductAuditMetadata(input.metadata),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
