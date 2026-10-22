import type { UserBlock, UserContentReport } from '@telpen/domain';

import type { UgcRepository } from './ugc.repository';

export class InMemoryUgcRepository implements UgcRepository {
  private readonly reports = new Map<string, UserContentReport>();
  private readonly blocks = new Map<string, UserBlock>();

  async createReport(report: UserContentReport): Promise<void> {
    this.reports.set(report.id, report);
  }

  async updateReport(report: UserContentReport): Promise<void> {
    this.reports.set(report.id, report);
  }

  async findReport(id: string): Promise<UserContentReport | undefined> {
    return this.reports.get(id);
  }

  async listReportsByTenant(tenantId: string): Promise<UserContentReport[]> {
    return [...this.reports.values()]
      .filter((report) => report.reporterTenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listAllReports(): Promise<UserContentReport[]> {
    return [...this.reports.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async createBlock(block: UserBlock): Promise<void> {
    this.blocks.set(this.key(block.tenantId, block.blockedTargetId), block);
  }

  async deleteBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined> {
    const key = this.key(tenantId, blockedTargetId);
    const existing = this.blocks.get(key);
    if (existing) {
      this.blocks.delete(key);
    }
    return existing;
  }

  async findBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined> {
    return this.blocks.get(this.key(tenantId, blockedTargetId));
  }

  async listBlocks(tenantId: string): Promise<UserBlock[]> {
    return [...this.blocks.values()]
      .filter((block) => block.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private key(tenantId: string, blockedTargetId: string): string {
    return `${tenantId}:${blockedTargetId}`;
  }
}
