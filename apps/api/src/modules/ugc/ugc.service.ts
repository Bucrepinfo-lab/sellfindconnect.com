import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  createUserBlock,
  createUserContentReport,
  resolveUserContentReport,
  UgcModerationError,
  type UserBlock,
  type UserContentReport,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { AuthService } from '../auth/auth.service';
import type { CreateUgcBlockDto, CreateUgcReportDto, ResolveUgcReportDto } from './dto/ugc.dto';
import { InMemoryUgcRepository } from './in-memory-ugc.repository';
import { UGC_REPOSITORY, type UgcRepository } from './ugc.repository';

@Injectable()
export class UgcService {
  constructor(
    @Optional()
    @Inject(UGC_REPOSITORY)
    private readonly repository: UgcRepository = new InMemoryUgcRepository(),
    @Optional() private readonly auth?: AuthService,
  ) {}

  async createReport(
    tenantId: string,
    userId: string,
    input: CreateUgcReportDto,
  ): Promise<UserContentReport> {
    const report = this.runDomain(() =>
      createUserContentReport(input, { tenantId, userId, countryCode: 'KE' }, randomUUID()),
    );
    await this.repository.createReport(report);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId: userId,
      action: 'USER_CONTENT_REPORTED',
      entityType: 'USER_CONTENT_REPORT',
      entityId: report.id,
      metadata: {
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        status: report.status,
        detailsLength: report.details?.length ?? 0,
      },
    });
    return report;
  }

  async listReports(tenantId: string): Promise<UserContentReport[]> {
    return this.repository.listReportsByTenant(tenantId);
  }

  async listAllReports(): Promise<UserContentReport[]> {
    return this.repository.listAllReports();
  }

  async resolveReport(
    id: string,
    userId: string,
    input: ResolveUgcReportDto,
  ): Promise<UserContentReport> {
    const existing = await this.repository.findReport(id);
    if (!existing) {
      throw new NotFoundException('Report not found.');
    }
    const updated = this.runDomain(() => resolveUserContentReport(existing, input.resolution));
    await this.repository.updateReport(updated);
    await this.auth?.recordTenantAudit({
      tenantId: existing.reporterTenantId,
      actorUserId: userId,
      action: 'USER_CONTENT_REPORT_RESOLVED',
      entityType: 'USER_CONTENT_REPORT',
      entityId: updated.id,
      metadata: {
        status: updated.status,
        reason: updated.reason,
      },
    });
    return updated;
  }

  async createBlock(tenantId: string, userId: string, input: CreateUgcBlockDto): Promise<UserBlock> {
    const block = this.runDomain(() =>
      createUserBlock(input, { tenantId, userId, countryCode: 'KE' }, randomUUID()),
    );
    const existing = await this.repository.findBlock(tenantId, block.blockedTargetId);
    if (existing) {
      throw new ConflictException('That account is already blocked.');
    }
    await this.repository.createBlock(block);
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId: userId,
      action: 'USER_BLOCKED',
      entityType: 'USER_BLOCK',
      entityId: block.id,
      metadata: {
        blockedTargetId: block.blockedTargetId,
        reason: block.reason,
      },
    });
    return block;
  }

  async listBlocks(tenantId: string): Promise<UserBlock[]> {
    return this.repository.listBlocks(tenantId);
  }

  async removeBlock(tenantId: string, userId: string, blockedTargetId: string): Promise<UserBlock> {
    const removed = await this.repository.deleteBlock(tenantId, blockedTargetId);
    if (!removed) {
      throw new NotFoundException('Block not found.');
    }
    await this.auth?.recordTenantAudit({
      tenantId,
      actorUserId: userId,
      action: 'USER_UNBLOCKED',
      entityType: 'USER_BLOCK',
      entityId: removed.id,
      metadata: {
        blockedTargetId: removed.blockedTargetId,
      },
    });
    return removed;
  }

  private runDomain<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof UgcModerationError) {
        throw new UnprocessableEntityException({ message: error.message, safety: error.safety });
      }
      throw error;
    }
  }
}
