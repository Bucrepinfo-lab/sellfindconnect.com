import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  DATA_INVENTORY,
  DELETION_GRACE_DAYS,
  addDaysIso as addDays,
  emptyAccountEraseCounts,
  isDeletionDue,
  planAccountErase,
  type AccountEraseCounts,
  type DataExportRequest,
  type DeletionRequest,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import { AdvertsService } from '../adverts/adverts.service';
import { AuthService } from '../auth/auth.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ProfilesService } from '../profiles/profiles.service';
import { InMemoryPrivacyRepository } from './in-memory-privacy.repository';
import { PRIVACY_REPOSITORY, type PrivacyRepository } from './privacy.repository';

export type AccountDeletionRunResult = {
  now: string;
  dryRun: boolean;
  due: number;
  completed: number;
  failed: number;
  retainedCategories: readonly string[];
  results: Array<{
    id: string;
    tenantId: string;
    status: DeletionRequest['status'];
    erased: AccountEraseCounts;
    sessionsRevoked: boolean;
  }>;
};

@Injectable()
export class PrivacyService {
  private readonly repository: PrivacyRepository;

  constructor(
    @Optional()
    @Inject(PRIVACY_REPOSITORY)
    repository?: PrivacyRepository,
    @Optional() private readonly adverts?: AdvertsService,
    @Optional() private readonly profiles?: ProfilesService,
    @Optional() private readonly conversations?: ConversationsService,
    @Optional() private readonly auth?: AuthService,
  ) {
    this.repository = repository ?? new InMemoryPrivacyRepository();
  }

  async dataSummary(tenantId: string, userId: string) {
    return {
      tenantId,
      userId,
      dataInventory: Object.entries(DATA_INVENTORY).map(([category, meta]) => ({
        category,
        ...meta,
      })),
      deletion: (await this.repository.findDeletion(tenantId, userId)) ?? null,
      erasePlan: planAccountErase(),
    };
  }

  async requestExport(tenantId: string, userId: string): Promise<DataExportRequest> {
    const now = new Date().toISOString();
    const req: DataExportRequest = {
      id: randomUUID(),
      tenantId,
      userId,
      requestedAt: now,
      status: 'QUEUED',
      expiresAt: addDays(now, 7),
    };
    await this.repository.saveExport(req);
    return req;
  }

  async requestDeletion(tenantId: string, userId: string, reason?: string): Promise<DeletionRequest> {
    const existing = await this.repository.findDeletion(tenantId, userId);
    if (existing && (existing.status === 'REQUESTED' || existing.status === 'PROCESSING')) {
      throw new ConflictException('Deletion already pending.');
    }
    const now = new Date().toISOString();
    const req: DeletionRequest = {
      id: randomUUID(),
      tenantId,
      userId,
      requestedAt: now,
      scheduledAt: addDays(now, DELETION_GRACE_DAYS),
      status: 'REQUESTED',
      reason,
    };
    await this.repository.saveDeletion(req);
    return req;
  }

  async cancelDeletion(tenantId: string, userId: string): Promise<DeletionRequest> {
    const req = await this.repository.findDeletion(tenantId, userId);
    if (!req) {
      throw new NotFoundException('No deletion request found.');
    }
    if (req.status !== 'REQUESTED') {
      throw new BadRequestException('Cannot cancel status: ' + req.status);
    }
    const cancelled: DeletionRequest = {
      ...req,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    };
    await this.repository.updateDeletion(cancelled);
    return cancelled;
  }

  async getDeletion(tenantId: string, userId: string) {
    return (await this.repository.findDeletion(tenantId, userId)) ?? null;
  }

  async runDueDeletions(input: {
    now?: string;
    limit?: number;
    dryRun?: boolean;
    tenantId?: string;
  } = {}): Promise<AccountDeletionRunResult> {
    const now = input.now ?? new Date().toISOString();
    const dryRun = input.dryRun === true;
    const due = await this.repository.listDueDeletions(now, {
      tenantId: input.tenantId,
      limit: input.limit,
    });
    const results: AccountDeletionRunResult['results'] = [];
    let completed = 0;
    let failed = 0;

    for (const request of due) {
      if (!isDeletionDue(request, now)) {
        continue;
      }
      if (dryRun) {
        results.push({
          id: request.id,
          tenantId: request.tenantId,
          status: request.status,
          erased: emptyAccountEraseCounts(),
          sessionsRevoked: false,
        });
        continue;
      }

      const processing: DeletionRequest = { ...request, status: 'PROCESSING' };
      await this.repository.updateDeletion(processing);
      try {
        const erased = await this.eraseAccountHoldings(request.tenantId);
        if (this.auth) {
          await this.auth.revokeSessionsForAccountDeletion(request.userId);
        }
        const finished: DeletionRequest = {
          ...processing,
          status: 'COMPLETED',
          completedAt: now,
        };
        await this.repository.updateDeletion(finished);
        await this.auth?.recordTenantAudit({
          tenantId: request.tenantId,
          actorUserId: request.userId,
          action: 'ACCOUNT_DELETION_COMPLETED',
          entityType: 'ACCOUNT_DELETION',
          entityId: request.id,
          metadata: {
            profilesErased: erased.profiles,
            advertsErased: erased.adverts,
            conversationsErased: erased.conversations,
            mediaErased: erased.media,
            sessionsRevoked: Boolean(this.auth),
          },
        });
        completed += 1;
        results.push({
          id: request.id,
          tenantId: request.tenantId,
          status: 'COMPLETED',
          erased,
          sessionsRevoked: Boolean(this.auth),
        });
      } catch {
        failed += 1;
        results.push({
          id: request.id,
          tenantId: request.tenantId,
          status: 'PROCESSING',
          erased: emptyAccountEraseCounts(),
          sessionsRevoked: false,
        });
      }
    }

    return {
      now,
      dryRun,
      due: due.length,
      completed,
      failed,
      retainedCategories: planAccountErase().retain,
      results,
    };
  }

  private async eraseAccountHoldings(tenantId: string): Promise<AccountEraseCounts> {
    const profiles = (await this.profiles?.eraseTenantAccountHoldings(tenantId)) ?? {
      profiles: 0,
      media: 0,
    };
    const adverts = (await this.adverts?.eraseTenantAccountHoldings(tenantId)) ?? {
      adverts: 0,
      media: 0,
    };
    const conversations = (await this.conversations?.eraseTenantAccountHoldings(tenantId)) ?? {
      conversations: 0,
      media: 0,
    };
    return {
      profiles: profiles.profiles,
      adverts: adverts.adverts,
      conversations: conversations.conversations,
      media: profiles.media + adverts.media + conversations.media,
    };
  }
}
