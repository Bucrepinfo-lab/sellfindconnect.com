import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { isDeletionDue, type DataExportRequest, type DeletionRequest } from '@telpen/domain';

import type { PrivacyRepository } from './privacy.repository';

export function createPrivacyPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaPrivacyRepository implements PrivacyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveDeletion(request: DeletionRequest): Promise<void> {
    await this.prisma.accountDeletionRequest.upsert({
      where: { id: request.id },
      create: this.toDeletionData(request),
      update: this.toDeletionData(request),
    });
  }

  async updateDeletion(request: DeletionRequest): Promise<void> {
    await this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: this.toDeletionData(request),
    });
  }

  async findDeletion(tenantId: string, userId: string): Promise<DeletionRequest | undefined> {
    const record = await this.prisma.accountDeletionRequest.findFirst({
      where: { tenantId, userId },
      orderBy: { requestedAt: 'desc' },
    });
    return record ? this.fromDeletion(record) : undefined;
  }

  async listDueDeletions(
    now: string,
    input: { tenantId?: string; limit?: number } = {},
  ): Promise<DeletionRequest[]> {
    const records = await this.prisma.accountDeletionRequest.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: ['REQUESTED', 'PROCESSING'] },
        scheduledAt: { lte: new Date(now) },
      },
      orderBy: { scheduledAt: 'asc' },
      take: input.limit ?? 50,
    });
    return records.map((record) => this.fromDeletion(record)).filter((request) => isDeletionDue(request, now));
  }

  async saveExport(request: DataExportRequest): Promise<void> {
    await this.prisma.dataExportRequest.upsert({
      where: { id: request.id },
      create: this.toExportData(request),
      update: this.toExportData(request),
    });
  }

  async findExport(tenantId: string, userId: string): Promise<DataExportRequest | undefined> {
    const record = await this.prisma.dataExportRequest.findFirst({
      where: { tenantId, userId },
      orderBy: { requestedAt: 'desc' },
    });
    return record ? this.fromExport(record) : undefined;
  }

  private toDeletionData(request: DeletionRequest) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      userId: request.userId,
      status: request.status,
      reason: request.reason ?? null,
      requestedAt: new Date(request.requestedAt),
      scheduledAt: new Date(request.scheduledAt),
      cancelledAt: request.cancelledAt ? new Date(request.cancelledAt) : null,
      completedAt: request.completedAt ? new Date(request.completedAt) : null,
    };
  }

  private fromDeletion(record: {
    id: string;
    tenantId: string;
    userId: string;
    status: string;
    reason: string | null;
    requestedAt: Date;
    scheduledAt: Date;
    cancelledAt: Date | null;
    completedAt: Date | null;
  }): DeletionRequest {
    return {
      id: record.id,
      tenantId: record.tenantId,
      userId: record.userId,
      status: record.status as DeletionRequest['status'],
      reason: record.reason ?? undefined,
      requestedAt: record.requestedAt.toISOString(),
      scheduledAt: record.scheduledAt.toISOString(),
      cancelledAt: record.cancelledAt?.toISOString(),
      completedAt: record.completedAt?.toISOString(),
    };
  }

  private toExportData(request: DataExportRequest) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      userId: request.userId,
      status: request.status,
      downloadUrl: request.downloadUrl ?? null,
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      requestedAt: new Date(request.requestedAt),
    };
  }

  private fromExport(record: {
    id: string;
    tenantId: string;
    userId: string;
    status: string;
    downloadUrl: string | null;
    expiresAt: Date | null;
    requestedAt: Date;
  }): DataExportRequest {
    return {
      id: record.id,
      tenantId: record.tenantId,
      userId: record.userId,
      status: record.status as DataExportRequest['status'],
      downloadUrl: record.downloadUrl ?? undefined,
      expiresAt: record.expiresAt?.toISOString(),
      requestedAt: record.requestedAt.toISOString(),
    };
  }
}
