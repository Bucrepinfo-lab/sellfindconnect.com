import type { MediaEscalationSnapshot } from '@telpen/domain';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma,
  PrismaClient,
  type MediaReviewCase as PrismaMediaReviewCase,
} from '@prisma/client';

import type { MediaProcessingJobMetadata } from './media.adapters';
import {
  type CreateMediaReviewCaseInput,
  type AssignMediaReviewCaseInput,
  type ListMediaReviewCasesInput,
  type MediaReviewCaseRecord,
  type MediaReviewCaseRepository,
  type MediaReviewCaseStatus,
  type MediaReviewResolution,
  type ResolveMediaReviewCaseInput,
  statusForResolution,
} from './media-review-case.repository';

export function createMediaReviewCasePrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaMediaReviewCaseRepository implements MediaReviewCaseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCase(input: CreateMediaReviewCaseInput): Promise<MediaReviewCaseRecord> {
    const now = new Date();
    const created = await this.prisma.mediaReviewCase.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        mediaId: input.mediaId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        sourceJobId: input.sourceJobId,
        jobType: input.jobType,
        severity: input.severity,
        status: input.status,
        reason: input.reason,
        provider: input.provider,
        evidence: this.mapOptionalJsonToPrisma(input.evidence),
        openedAt: new Date(input.openedAt),
        assignedTo: input.assignedTo,
        assignedAt: input.assignedAt ? new Date(input.assignedAt) : undefined,
        assignmentNote: input.assignmentNote,
        resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : undefined,
        resolvedBy: input.resolvedBy,
        resolution: input.resolution,
        notes: input.notes,
        createdAt: input.createdAt ? new Date(input.createdAt) : now,
        updatedAt: input.updatedAt ? new Date(input.updatedAt) : now,
        escalationPlaybook: this.mapOptionalJsonToPrisma(input.escalation),
      },
    });

    return this.mapCase(created);
  }

  async findCase(id: string): Promise<MediaReviewCaseRecord | undefined> {
    const record = await this.prisma.mediaReviewCase.findUnique({ where: { id } });
    return record ? this.mapCase(record) : undefined;
  }

  async listCases(input: ListMediaReviewCasesInput = {}): Promise<MediaReviewCaseRecord[]> {
    const records = await this.prisma.mediaReviewCase.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.severity ? { severity: input.severity } : {}),
        ...(input.assignedTo && !input.unassignedOnly ? { assignedTo: input.assignedTo } : {}),
        ...(input.unassignedOnly ? { assignedTo: null } : {}),
      },
      orderBy: [{ openedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(200, Math.max(1, input.limit ?? 50)),
    });

    return records.map((record) => this.mapCase(record));
  }

  async assignCase(input: AssignMediaReviewCaseInput): Promise<MediaReviewCaseRecord | undefined> {
    const assignedAt = input.assignedAt ? new Date(input.assignedAt) : new Date();
    const updated = await this.prisma.mediaReviewCase.updateMany({
      where: {
        id: input.id,
        status: 'OPEN',
      },
      data: {
        assignedTo: input.assignedTo,
        assignedAt,
        assignmentNote: input.assignmentNote,
        updatedAt: assignedAt,
      },
    });

    if (updated.count === 0) {
      return undefined;
    }

    return this.findCase(input.id);
  }

  async resolveCase(
    input: ResolveMediaReviewCaseInput,
  ): Promise<MediaReviewCaseRecord | undefined> {
    const resolvedAt = input.resolvedAt ? new Date(input.resolvedAt) : new Date();
    const updated = await this.prisma.mediaReviewCase.updateMany({
      where: {
        id: input.id,
        status: 'OPEN',
      },
      data: {
        status: statusForResolution(input.resolution),
        resolvedAt,
        resolvedBy: input.resolvedBy,
        resolution: input.resolution,
        notes: input.notes,
        updatedAt: resolvedAt,
        escalationPlaybook: this.mapOptionalJsonToPrisma(input.escalation),
      },
    });

    if (updated.count === 0) {
      return undefined;
    }

    return this.findCase(input.id);
  }

  private mapCase(record: PrismaMediaReviewCase): MediaReviewCaseRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      mediaId: record.mediaId,
      ownerType: record.ownerType,
      ownerId: record.ownerId,
      sourceJobId: record.sourceJobId ?? undefined,
      jobType: record.jobType,
      severity: record.severity,
      status: this.mapStatus(record.status),
      reason: record.reason,
      provider: record.provider ?? undefined,
      evidence: this.mapMetadata(record.evidence),
      openedAt: record.openedAt.toISOString(),
      assignedTo: record.assignedTo ?? undefined,
      assignedAt: record.assignedAt?.toISOString(),
      assignmentNote: record.assignmentNote ?? undefined,
      resolvedAt: record.resolvedAt?.toISOString(),
      resolvedBy: record.resolvedBy ?? undefined,
      resolution: this.mapResolution(record.resolution),
      notes: record.notes ?? undefined,
      escalation: this.mapEscalation(record.escalationPlaybook),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private mapStatus(value: string): MediaReviewCaseStatus {
    if (value === 'RESOLVED' || value === 'ESCALATED' || value === 'DISMISSED') {
      return value;
    }

    return 'OPEN';
  }

  private mapResolution(value: string | null): MediaReviewResolution | undefined {
    if (
      value === 'CONFIRMED_BLOCK' ||
      value === 'RESTORED' ||
      value === 'ESCALATED' ||
      value === 'DISMISSED'
    ) {
      return value;
    }

    return undefined;
  }

  private mapEscalation(value: unknown): MediaEscalationSnapshot | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const playbookCode = typeof value.playbookCode === 'string' ? value.playbookCode : undefined;
    const countryCode = typeof value.countryCode === 'string' ? value.countryCode : undefined;
    const kind = value.kind;
    const reportDueAt = typeof value.reportDueAt === 'string' ? value.reportDueAt : undefined;
    const legalHoldUntil = typeof value.legalHoldUntil === 'string' ? value.legalHoldUntil : undefined;
    if (
      !playbookCode ||
      !countryCode ||
      !reportDueAt ||
      !legalHoldUntil ||
      (kind !== 'CHILD_SAFETY' &&
        kind !== 'CYBER_INCIDENT' &&
        kind !== 'CONTENT_ABUSE' &&
        kind !== 'INTERNAL')
    ) {
      return undefined;
    }

    const channelCodes = Array.isArray(value.channelCodes)
      ? value.channelCodes.filter((item): item is MediaEscalationSnapshot['channelCodes'][number] =>
          typeof item === 'string',
        )
      : [];
    const requiredActions = Array.isArray(value.requiredActions)
      ? value.requiredActions.filter((item): item is string => typeof item === 'string')
      : [];
    const channels = Array.isArray(value.channels)
      ? value.channels.flatMap((item) => {
          if (!this.isRecord(item) || typeof item.code !== 'string' || typeof item.label !== 'string') {
            return [];
          }
          const channel: MediaEscalationSnapshot['channels'][number] = {
            code: item.code as MediaEscalationSnapshot['channels'][number]['code'],
            label: item.label,
          };
          if (typeof item.reportUrl === 'string') {
            channel.reportUrl = item.reportUrl;
          }
          return [channel];
        })
      : [];

    return {
      playbookCode,
      countryCode,
      kind,
      channelCodes,
      channels,
      reportDueAt,
      legalHoldUntil,
      preserveEvidence: true,
      requiredActions,
    };
  }

  private mapMetadata(value: unknown): MediaProcessingJobMetadata | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const entries = Object.entries(value)
      .map(([key, item]) => [key, this.mapMetadataValue(item)] as const)
      .filter(
        (entry): entry is readonly [string, MediaProcessingJobMetadata[string]] =>
          entry[1] !== undefined,
      );
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  private mapMetadataValue(value: unknown): MediaProcessingJobMetadata[string] | undefined {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.mapMetadataValue(item))
        .filter((item): item is MediaProcessingJobMetadata[string] => item !== undefined);
    }

    return this.mapMetadata(value);
  }

  private mapOptionalJsonToPrisma(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
