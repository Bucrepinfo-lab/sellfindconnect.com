import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type UserBlock as PrismaUserBlock,
  type UserContentReport as PrismaUserContentReport,
} from '@prisma/client';
import {
  ugcReportReasons,
  ugcReportStatuses,
  ugcReportTargetTypes,
  type UgcReportReason,
  type UgcReportStatus,
  type UgcReportTargetType,
  type UserBlock,
  type UserContentReport,
} from '@telpen/domain';

import type { UgcRepository } from './ugc.repository';

export function createUgcPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaUgcRepository implements UgcRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createReport(report: UserContentReport): Promise<void> {
    await this.prisma.userContentReport.create({ data: this.toPrismaReport(report) });
  }

  async updateReport(report: UserContentReport): Promise<void> {
    const data = this.toPrismaReport(report);
    await this.prisma.userContentReport.update({
      where: { id: report.id },
      data: {
        status: data.status,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findReport(id: string): Promise<UserContentReport | undefined> {
    const record = await this.prisma.userContentReport.findUnique({ where: { id } });
    return record ? this.fromPrismaReport(record) : undefined;
  }

  async listReportsByTenant(tenantId: string): Promise<UserContentReport[]> {
    const records = await this.prisma.userContentReport.findMany({
      where: { reporterTenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromPrismaReport(record));
  }

  async listAllReports(): Promise<UserContentReport[]> {
    const records = await this.prisma.userContentReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromPrismaReport(record));
  }

  async createBlock(block: UserBlock): Promise<void> {
    await this.prisma.userBlock.create({ data: this.toPrismaBlock(block) });
  }

  async deleteBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined> {
    const existing = await this.prisma.userBlock.findUnique({
      where: { tenantId_blockedTargetId: { tenantId, blockedTargetId } },
    });
    if (!existing) {
      return undefined;
    }
    await this.prisma.userBlock.delete({ where: { id: existing.id } });
    return this.fromPrismaBlock(existing);
  }

  async findBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined> {
    const record = await this.prisma.userBlock.findUnique({
      where: { tenantId_blockedTargetId: { tenantId, blockedTargetId } },
    });
    return record ? this.fromPrismaBlock(record) : undefined;
  }

  async listBlocks(tenantId: string): Promise<UserBlock[]> {
    const records = await this.prisma.userBlock.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.fromPrismaBlock(record));
  }

  private toPrismaReport(report: UserContentReport) {
    return {
      id: report.id,
      reporterTenantId: report.reporterTenantId,
      reporterUserId: report.reporterUserId,
      targetType: report.targetType,
      targetId: report.targetId,
      targetTenantId: report.targetTenantId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      countryCode: report.countryCode,
      createdAt: new Date(report.createdAt),
      updatedAt: new Date(report.updatedAt),
    };
  }

  private fromPrismaReport(record: PrismaUserContentReport): UserContentReport {
    return {
      id: record.id,
      reporterTenantId: record.reporterTenantId,
      reporterUserId: record.reporterUserId,
      targetType: this.requireValue(record.targetType, ugcReportTargetTypes, 'PROFILE'),
      targetId: record.targetId,
      targetTenantId: record.targetTenantId ?? undefined,
      reason: this.requireValue(record.reason, ugcReportReasons, 'OTHER'),
      details: record.details ?? undefined,
      status: this.requireValue(record.status, ugcReportStatuses, 'OPEN'),
      countryCode: record.countryCode,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toPrismaBlock(block: UserBlock) {
    return {
      id: block.id,
      tenantId: block.tenantId,
      blockedTargetId: block.blockedTargetId,
      blockedTenantId: block.blockedTenantId,
      createdByUserId: block.createdByUserId,
      reason: block.reason,
      createdAt: new Date(block.createdAt),
    };
  }

  private fromPrismaBlock(record: PrismaUserBlock): UserBlock {
    return {
      id: record.id,
      tenantId: record.tenantId,
      blockedTargetId: record.blockedTargetId,
      blockedTenantId: record.blockedTenantId ?? undefined,
      createdByUserId: record.createdByUserId,
      reason: this.requireValue(record.reason, ugcReportReasons, 'OTHER'),
      createdAt: record.createdAt.toISOString(),
    };
  }

  private requireValue<T extends string>(
    value: string,
    allowed: readonly T[],
    fallback: T,
  ): T {
    return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  }
}
