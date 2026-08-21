import { describe, expect, it } from 'vitest';

import {
  buildProductAuditRecord,
  canViewTenantAuditLogs,
  describeProductAuditAction,
  sanitizeProductAuditMetadata,
} from './product-audit';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('product audit helpers', () => {
  it('lets owners and admins view tenant audit logs', () => {
    expect(canViewTenantAuditLogs('OWNER')).toBe(true);
    expect(canViewTenantAuditLogs('ADMIN')).toBe(true);
    expect(canViewTenantAuditLogs('SALES_CHAT_AGENT')).toBe(false);
    expect(canViewTenantAuditLogs('READ_ONLY_VIEWER')).toBe(false);
  });

  it('redacts secrets, contact fields, and message bodies from audit metadata', () => {
    expect(
      sanitizeProductAuditMetadata({
        senderRole: 'TENANT_AGENT',
        body: 'Please share the quote and owner@example.com',
        email: 'owner@example.com',
        sessionToken: 'secret-session',
        attachmentCount: 1,
        industryCode: 'AGRICULTURE',
      }),
    ).toEqual({
      senderRole: 'TENANT_AGENT',
      attachmentCount: 1,
      industryCode: 'AGRICULTURE',
    });
  });

  it('builds a conversation audit record without storing chat text', () => {
    const record = buildProductAuditRecord({
      action: 'CONVERSATION_MESSAGE_SENT',
      entityType: 'CONVERSATION',
      entityId: 'convo-1',
      tenantId,
      createdAt: '2026-08-21T12:00:00.000Z',
      metadata: {
        senderRole: 'REQUESTER',
        body: 'Can you hide this in the delivery notes?',
        messageLength: 44,
      },
    });

    expect(record.metadata).toEqual({
      senderRole: 'REQUESTER',
      messageLength: 44,
    });
    expect(JSON.stringify(record)).not.toContain('hide this');
    expect(describeProductAuditAction(record.action)).toBe('Chat message sent');
  });

  it('describes tax workbench audit actions without storing note bodies', () => {
    const record = buildProductAuditRecord({
      action: 'TAX_RETURN_EVIDENCE_ATTACHED',
      entityType: 'TAX_RETURN',
      entityId: 'return-1',
      tenantId,
      metadata: {
        evidenceKind: 'ACCOUNTANT_NOTES',
        noteLength: 48,
        note: 'Board approved remittance for KE VAT June.',
        email: 'finance@example.com',
      },
    });

    expect(record.metadata).toEqual({
      evidenceKind: 'ACCOUNTANT_NOTES',
      noteLength: 48,
    });
    expect(JSON.stringify(record)).not.toContain('Board approved');
    expect(describeProductAuditAction('TAX_RETURN_LOCKED')).toBe('Tax period locked');
    expect(describeProductAuditAction('TAX_REPORT_EXPORTED')).toBe('Tax report exported');
    expect(describeProductAuditAction('SOURCE_FINDER_OUTCOME_RECORDED')).toBe(
      'Source Finder outcome recorded',
    );
  });
});
