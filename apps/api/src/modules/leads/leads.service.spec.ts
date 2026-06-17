import { describe, expect, it } from 'vitest';

import { LeadsService } from './leads.service';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('LeadsService', () => {
  it('records match feedback for a source finder result', () => {
    const service = new LeadsService();
    const feedback = service.recordMatchFeedback(tenantId, {
      sourceRecordId: 'r1',
      action: 'SAVE',
      note: 'Likely supplier for hotel produce.',
    });

    expect(feedback.action).toBe('SAVE');
    expect(service.listMatchFeedback(tenantId)).toHaveLength(1);
  });

  it('requires terms acceptance before creating an inquiry', () => {
    const service = new LeadsService();

    expect(() =>
      service.createInquiry(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Please quote weekly supply.',
        acceptedTerms: false as true,
      }),
    ).toThrow();
  });

  it('creates a lead with conversion intelligence from a safe inquiry', () => {
    const service = new LeadsService();
    const lead = service.createInquiry(tenantId, {
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

  it('updates lead status in the tenant lead inbox', () => {
    const service = new LeadsService();
    const lead = service.createInquiry(tenantId, {
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

  it('blocks prohibited inquiry content', () => {
    const service = new LeadsService();

    expect(() =>
      service.createInquiry(tenantId, {
        sourceRecordId: 'r1',
        query: 'fresh produce',
        inquiryType: 'RFQ',
        message: 'Can you supply ammunition with produce delivery?',
        acceptedTerms: true,
      }),
    ).toThrow();
  });
});
