import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DELETION_GRACE_DAYS, DATA_INVENTORY, addDaysIso as addDays } from '@telpen/domain';
import type { DeletionRequest, DataExportRequest } from '@telpen/domain';

@Injectable()
export class PrivacyService {
  private deletions = new Map<string, DeletionRequest>();
  private exports = new Map<string, DataExportRequest>();
  private key(t: string, u: string) { return t + ':' + u; }

  dataSummary(tenantId: string, userId: string) {
    return { tenantId, userId, dataInventory: Object.entries(DATA_INVENTORY).map(([category, meta]) => ({ category, ...meta })), deletion: this.deletions.get(this.key(tenantId, userId)) ?? null };
  }
  requestExport(tenantId: string, userId: string): DataExportRequest {
    const now = new Date().toISOString();
    const req: DataExportRequest = { id: randomUUID(), tenantId, userId, requestedAt: now, status: 'QUEUED', expiresAt: addDays(now, 7) };
    this.exports.set(this.key(tenantId, userId), req);
    return req;
  }
  requestDeletion(tenantId: string, userId: string, reason?: string): DeletionRequest {
    const ex = this.deletions.get(this.key(tenantId, userId));
    if (ex && (ex.status === 'REQUESTED' || ex.status === 'PROCESSING')) throw new ConflictException('Deletion already pending.');
    const now = new Date().toISOString();
    const req: DeletionRequest = { id: randomUUID(), tenantId, userId, requestedAt: now, scheduledAt: addDays(now, DELETION_GRACE_DAYS), status: 'REQUESTED', reason };
    this.deletions.set(this.key(tenantId, userId), req);
    return req;
  }
  cancelDeletion(tenantId: string, userId: string): DeletionRequest {
    const req = this.deletions.get(this.key(tenantId, userId));
    if (!req) throw new NotFoundException('No deletion request found.');
    if (req.status !== 'REQUESTED') throw new BadRequestException('Cannot cancel status: ' + req.status);
    req.status = 'CANCELLED'; req.cancelledAt = new Date().toISOString();
    this.deletions.set(this.key(tenantId, userId), req);
    return req;
  }
  getDeletion(tenantId: string, userId: string) { return this.deletions.get(this.key(tenantId, userId)) ?? null; }
}
