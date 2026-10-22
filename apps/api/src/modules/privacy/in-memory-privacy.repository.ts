import { Injectable } from '@nestjs/common';
import { isDeletionDue, type DataExportRequest, type DeletionRequest } from '@telpen/domain';

import type { PrivacyRepository } from './privacy.repository';

@Injectable()
export class InMemoryPrivacyRepository implements PrivacyRepository {
  private readonly deletions = new Map<string, DeletionRequest>();
  private readonly exports = new Map<string, DataExportRequest>();

  saveDeletion(request: DeletionRequest): void {
    this.deletions.set(this.key(request.tenantId, request.userId), this.cloneDeletion(request));
  }

  updateDeletion(request: DeletionRequest): void {
    this.saveDeletion(request);
  }

  findDeletion(tenantId: string, userId: string): DeletionRequest | undefined {
    const request = this.deletions.get(this.key(tenantId, userId));
    return request ? this.cloneDeletion(request) : undefined;
  }

  listDueDeletions(
    now: string,
    input: { tenantId?: string; limit?: number } = {},
  ): DeletionRequest[] {
    const limit = input.limit ?? 50;
    return Array.from(this.deletions.values())
      .filter((request) => !input.tenantId || request.tenantId === input.tenantId)
      .filter((request) => isDeletionDue(request, now))
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
      .slice(0, limit)
      .map((request) => this.cloneDeletion(request));
  }

  saveExport(request: DataExportRequest): void {
    this.exports.set(this.key(request.tenantId, request.userId), { ...request });
  }

  findExport(tenantId: string, userId: string): DataExportRequest | undefined {
    const request = this.exports.get(this.key(tenantId, userId));
    return request ? { ...request } : undefined;
  }

  private key(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`;
  }

  private cloneDeletion(request: DeletionRequest): DeletionRequest {
    return { ...request };
  }
}
