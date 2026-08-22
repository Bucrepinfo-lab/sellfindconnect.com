import type { UserBlock, UserContentReport } from '@telpen/domain';

export const UGC_REPOSITORY = Symbol('UGC_REPOSITORY');

export type UgcRepository = {
  createReport(report: UserContentReport): Promise<void>;
  updateReport(report: UserContentReport): Promise<void>;
  findReport(id: string): Promise<UserContentReport | undefined>;
  listReportsByTenant(tenantId: string): Promise<UserContentReport[]>;
  listAllReports(): Promise<UserContentReport[]>;
  createBlock(block: UserBlock): Promise<void>;
  deleteBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined>;
  findBlock(tenantId: string, blockedTargetId: string): Promise<UserBlock | undefined>;
  listBlocks(tenantId: string): Promise<UserBlock[]>;
};
