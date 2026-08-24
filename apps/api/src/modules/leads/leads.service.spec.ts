import { describe, expect, it } from 'vitest';

import { UgcService } from '../ugc/ugc.service';
import { LeadsService } from './leads.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('LeadsService', () => {
  it('records match feedback for a source finder result', async () => {
    const service = new LeadsService();
    const feedback = await service.recordMatchFeedback(tenantId, {
      sourceRecordId: 'r1',
      action: 'SAVE',
      note: 'Likely supplier for hotel produce.',
    });

    expect(feedback.action).toBe('SAVE');
    expect(service.listMatchFeedback(tenantId)).toHaveLength(1);
  });

  it('requires terms acceptance before creating an inquiry', async () => {
    const service = new LeadsService();

    await expect(
      service.createInquiry(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Please quote weekly supply.',
        acceptedTerms: false as true,
      }),
    ).rejects.toThrow();
  });

  it('creates a lead with conversion intelligence from a safe inquiry', async () => {
    const service = new LeadsService();
    const lead = await service.createInquiry(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please quote weekly supply for tomatoes and kale in Nairobi.',
      quantity: '100 crates per week',
      urgency: 'This week',
      acceptedTerms: true,
    });

    expect(lead.status).toBe('NEW');
    expect(lead.intelligence.priority).toBe('HIGH');
    expect(lead.intelligence.nextBestActions.length).toBeGreaterThan(0);
  });

  it('updates lead status in the tenant lead inbox', async () => {
    const service = new LeadsService();
    const lead = await service.createInquiry(tenantId, {
      sourceRecordId: 'r1',
      query: 'fresh produce',
      inquiryType: 'RFQ',
      message: 'Please quote weekly supply for tomatoes and kale in Nairobi.',
      acceptedTerms: true,
    });

    const updated = service.updateLeadStatus(tenantId, lead.id, { status: 'QUALIFIED' });

    expect(updated.status).toBe('QUALIFIED');
    expect(service.listLeads(tenantId)[0]?.status).toBe('QUALIFIED');
  });

  it('blocks prohibited inquiry content', async () => {
    const service = new LeadsService();

    await expect(
      service.createInquiry(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Can you supply ammunition with produce delivery?',
        acceptedTerms: true,
      }),
    ).rejects.toThrow();
  });

  it('refuses inquiry and match feedback for a blocked source', async () => {
    const ugc = new UgcService();
    await ugc.createBlock(tenantId, 'owner-1', {
      blockedTargetId: 'r1',
      reason: 'SPAM_SCAMS',
      acceptedTerms: true,
    });
    const service = new LeadsService(ugc);

    await expect(
      service.createInquiry(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Please quote weekly supply for tomatoes and kale in Nairobi.',
        acceptedTerms: true,
      }),
    ).rejects.toThrow(/blocked/);
    await expect(
      service.recordMatchFeedback(tenantId, {
        sourceRecordId: 'r1',
        action: 'SAVE',
        note: 'Likely supplier for hotel produce.',
      }),
    ).rejects.toThrow(/blocked/);
  });
});
