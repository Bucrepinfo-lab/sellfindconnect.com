import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  buildLeadConversionIntelligence,
  evaluateSafetyFields,
  evaluateSafetyText,
  pilotSourceFinderRecords,
  searchSourceFinderRecords,
  type LeadRecord,
  type MatchFeedbackAction,
  type SourceFinderSearchResult,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type {
  CreateInquiryDto,
  CreateMatchFeedbackDto,
  UpdateLeadStatusDto,
} from './dto/leads.dto';

type MatchFeedbackRecord = {
  id: string;
  tenantId: string;
  sourceRecordId: string;
  action: MatchFeedbackAction;
  note?: string;
  createdAt: string;
};

@Injectable()
export class LeadsService {
  private readonly feedback = new Map<string, MatchFeedbackRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  recordMatchFeedback(tenantId: string, input: CreateMatchFeedbackDto): MatchFeedbackRecord {
    this.assertSafe(input, 'Match feedback contains blocked content.');
    this.requireSource(input.sourceRecordId);

    const now = new Date().toISOString();
    const feedback: MatchFeedbackRecord = {
      id: randomUUID(),
      tenantId,
      sourceRecordId: input.sourceRecordId,
      action: input.action,
      note: input.note,
      createdAt: now,
    };

    this.feedback.set(this.key(tenantId, feedback.id), feedback);
    return feedback;
  }

  listMatchFeedback(tenantId: string): MatchFeedbackRecord[] {
    return Array.from(this.feedback.values())
      .filter((item) => item.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createInquiry(tenantId: string, input: CreateInquiryDto): LeadRecord {
    if (!input.acceptedTerms) {
      throw new UnprocessableEntityException('Current terms acceptance is required before inquiry.');
    }

    this.assertSafe(input, 'Inquiry contains blocked content.');
    const source = this.getSourceResult(input.sourceRecordId, input.query);
    const intelligence = buildLeadConversionIntelligence(source);
    const now = new Date().toISOString();
    const lead: LeadRecord = {
      id: randomUUID(),
      tenantId,
      sourceRecordId: source.id,
      sourceName: source.name,
      sourceRole: source.role,
      inquiryType: input.inquiryType,
      message: input.message,
      quantity: input.quantity,
      urgency: input.urgency,
      status: 'NEW',
      intelligence,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(this.key(tenantId, lead.id), lead);
    return lead;
  }

  listLeads(tenantId: string): LeadRecord[] {
    return Array.from(this.leads.values())
      .filter((lead) => lead.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateLeadStatus(tenantId: string, leadId: string, input: UpdateLeadStatusDto): LeadRecord {
    const key = this.key(tenantId, leadId);
    const lead = this.leads.get(key);
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }

    const updated: LeadRecord = {
      ...lead,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    this.leads.set(key, updated);
    return updated;
  }

  private getSourceResult(sourceRecordId: string, query?: string): SourceFinderSearchResult {
    const source = this.requireSource(sourceRecordId);
    const queryText = query?.trim() || source.offers[0] || source.name;
    const result =
      searchSourceFinderRecords({
        query: queryText,
        countryCode: source.countryCode,
        sortBy: 'RELEVANCE',
      }).find((item) => item.id === sourceRecordId) ??
      searchSourceFinderRecords({
        query: '',
        countryCode: source.countryCode,
        sortBy: 'RELEVANCE',
      }).find((item) => item.id === sourceRecordId);

    if (!result) {
      throw new NotFoundException('Source Finder match not found.');
    }

    return result;
  }

  private requireSource(sourceRecordId: string) {
    const source = pilotSourceFinderRecords.find((record) => record.id === sourceRecordId);
    if (!source) {
      throw new NotFoundException('Source Finder match not found.');
    }

    return source;
  }

  private assertSafe(input: object, message: string): void {
    const fieldSafety = evaluateSafetyFields(input);
    const textSafety = 'message' in input ? evaluateSafetyText(String(input.message)) : fieldSafety;
    const safety = fieldSafety.allowed ? textSafety : fieldSafety;

    if (!safety.allowed) {
      throw new UnprocessableEntityException({ message, safety });
    }
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
