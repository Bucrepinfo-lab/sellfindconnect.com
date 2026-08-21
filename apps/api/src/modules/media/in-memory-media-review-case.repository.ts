import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  type CreateMediaReviewCaseInput,
  type AssignMediaReviewCaseInput,
  type ListMediaReviewCasesInput,
  type MediaReviewCaseRecord,
  type MediaReviewCaseRepository,
  type ResolveMediaReviewCaseInput,
  statusForResolution,
} from './media-review-case.repository';

@Injectable()
export class InMemoryMediaReviewCaseRepository implements MediaReviewCaseRepository {
  private readonly cases = new Map<string, MediaReviewCaseRecord>();

  createCase(input: CreateMediaReviewCaseInput): MediaReviewCaseRecord {
    const now = new Date().toISOString();
    const record: MediaReviewCaseRecord = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };

    this.cases.set(record.id, record);
    return record;
  }

  findCase(id: string): MediaReviewCaseRecord | undefined {
    return this.cases.get(id);
  }

  listCases(input: ListMediaReviewCasesInput = {}): MediaReviewCaseRecord[] {
    const limit = Math.min(200, Math.max(1, input.limit ?? 50));
    return Array.from(this.cases.values())
      .filter((record) => (input.status ? record.status === input.status : true))
      .filter((record) => (input.tenantId ? record.tenantId === input.tenantId : true))
      .filter((record) => (input.severity ? record.severity === input.severity : true))
      .filter((record) =>
        input.assignedTo && !input.unassignedOnly ? record.assignedTo === input.assignedTo : true,
      )
      .filter((record) => (input.unassignedOnly ? !record.assignedTo : true))
      .sort((left, right) => right.openedAt.localeCompare(left.openedAt))
      .slice(0, limit);
  }

  assignCase(input: AssignMediaReviewCaseInput): MediaReviewCaseRecord | undefined {
    const existing = this.cases.get(input.id);
    if (!existing || existing.status !== 'OPEN') {
      return undefined;
    }

    const assignedAt = input.assignedAt ?? new Date().toISOString();
    const assigned: MediaReviewCaseRecord = {
      ...existing,
      assignedTo: input.assignedTo,
      assignedAt,
      assignmentNote: input.assignmentNote,
      updatedAt: assignedAt,
    };
    this.cases.set(assigned.id, assigned);
    return assigned;
  }

  resolveCase(input: ResolveMediaReviewCaseInput): MediaReviewCaseRecord | undefined {
    const existing = this.cases.get(input.id);
    if (!existing || existing.status !== 'OPEN') {
      return undefined;
    }

    const resolvedAt = input.resolvedAt ?? new Date().toISOString();
    const resolved: MediaReviewCaseRecord = {
      ...existing,
      status: statusForResolution(input.resolution),
      resolvedAt,
      resolvedBy: input.resolvedBy,
      resolution: input.resolution,
      notes: input.notes,
      escalation: input.escalation,
      updatedAt: resolvedAt,
    };
    this.cases.set(resolved.id, resolved);
    return resolved;
  }
}
