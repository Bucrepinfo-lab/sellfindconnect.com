import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  evaluateMediaReviewResolution,
  evaluateSafetyFields,
  getCountry,
  mediaEscalationRequiresPlaybook,
  canReopenMediaReviewCase,
  presentMediaReviewSla,
  resolveMediaEscalationPlaybook,
  toMediaEscalationAuditMetadata,
  type MediaReviewSla,
} from '@telpen/domain';

import { AuthService } from '../auth/auth.service';
import type { AuthTenantRecord, PlatformAccessSession } from '../auth/auth.records';
import type {
  AssignMediaReviewCaseDto,
  ListMediaReviewCasesDto,
  PreviewMediaEscalationPlaybookDto,
  ResolveMediaReviewCaseDto,
} from './dto/media-review.dto';
import { InMemoryMediaReviewCaseRepository } from './in-memory-media-review-case.repository';
import {
  MEDIA_REVIEW_CASE_REPOSITORY,
  type MediaReviewCaseRecord,
  type MediaReviewCaseRepository,
} from './media-review-case.repository';

@Injectable()
export class MediaReviewService {
  constructor(
    @Optional()
    @Inject(MEDIA_REVIEW_CASE_REPOSITORY)
    private readonly repository: MediaReviewCaseRepository = new InMemoryMediaReviewCaseRepository(),
    @Optional() private readonly auth?: AuthService,
  ) {}

  async listCases(
    input: ListMediaReviewCasesDto,
    session: PlatformAccessSession,
  ): Promise<Array<MediaReviewCaseRecord & MediaReviewSla>> {
    const tenantCountryMap = await this.tenantCountryMap();
    const cases = await this.repository.listCases({
      status: input.status ?? 'OPEN',
      tenantId: input.tenantId,
      severity: input.severity,
      jobType: input.jobType,
      assignedTo: input.unassignedOnly ? undefined : input.assignedTo,
      unassignedOnly: input.unassignedOnly,
      limit: input.limit,
    });

    return cases
      .filter(
        (reviewCase) =>
          this.auth?.canPlatformAccess(
            session,
            'MODERATE_CONTENT',
            this.caseAccessResource(reviewCase, tenantCountryMap),
          ) ?? true,
      )
      .map((reviewCase) => this.presentCase(reviewCase))
      .filter((reviewCase) => (input.overdueOnly ? reviewCase.overdue : true));
  }

  async resolveCase(
    id: string,
    input: ResolveMediaReviewCaseDto,
    session: PlatformAccessSession,
  ): Promise<MediaReviewCaseRecord & { reviewerRole?: string }> {
    const existing = await this.repository.findCase(id);
    if (!existing) {
      throw new NotFoundException('Media review case not found.');
    }

    if (existing.status !== 'OPEN') {
      throw new UnprocessableEntityException('Media review case is no longer open.');
    }

    if (input.notes) {
      const safety = evaluateSafetyFields({ notes: input.notes });
      if (!safety.allowed) {
        throw new UnprocessableEntityException({
          message: 'Review notes match a zero-tolerance blocked category.',
          safety,
        });
      }
    }

    const resolutionGate = evaluateMediaReviewResolution({
      resolution: input.resolution,
      severity: existing.severity,
      mistakenClassification: input.mistakenClassification,
      notes: input.notes,
    });
    if (!resolutionGate.ok) {
      throw new UnprocessableEntityException(resolutionGate.reason);
    }

    const tenantCountryMap = await this.tenantCountryMap();
    const decision = await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.caseAccessResource(existing, tenantCountryMap),
    );
    const escalation = this.playbookForResolution(existing, input.resolution, tenantCountryMap);
    const resolved = await this.repository.resolveCase({
      id,
      resolvedBy: session.userId,
      resolution: input.resolution,
      notes: input.notes?.trim(),
      escalation,
    });

    if (!resolved) {
      throw new UnprocessableEntityException('Media review case is no longer open.');
    }

    await this.auth?.recordTenantAudit({
      tenantId: resolved.tenantId,
      actorUserId: session.userId,
      action: 'MEDIA_REVIEW_CASE_RESOLVED',
      entityType: 'MEDIA_REVIEW_CASE',
      entityId: resolved.id,
      metadata: {
        mediaId: resolved.mediaId,
        ownerType: resolved.ownerType,
        ownerId: resolved.ownerId,
        jobType: resolved.jobType,
        severity: resolved.severity,
        resolution: resolved.resolution ?? input.resolution,
        role: decision?.role ?? 'GLOBAL_MODERATOR_LEAD',
        notesProvided: Boolean(input.notes),
        mistakenClassification: Boolean(input.mistakenClassification),
        ...(resolved.escalation ? toMediaEscalationAuditMetadata(resolved.escalation) : {}),
      },
    });

    return {
      ...this.presentCase(resolved),
      reviewerRole: decision?.role,
    };
  }

  async getCase(id: string, session: PlatformAccessSession) {
    const existing = await this.repository.findCase(id);
    if (!existing) {
      throw new NotFoundException('Media review case not found.');
    }

    const tenantCountryMap = await this.tenantCountryMap();
    await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.caseAccessResource(existing, tenantCountryMap),
    );
    return this.presentCase(existing);
  }

  async reopenCase(id: string, session: PlatformAccessSession) {
    const existing = await this.repository.findCase(id);
    if (!existing) {
      throw new NotFoundException('Media review case not found.');
    }

    if (!canReopenMediaReviewCase(existing.status)) {
      throw new UnprocessableEntityException('Only dismissed media review cases can be reopened.');
    }

    const tenantCountryMap = await this.tenantCountryMap();
    const decision = await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.caseAccessResource(existing, tenantCountryMap),
    );
    const reopened = await this.repository.reopenCase(id);
    if (!reopened) {
      throw new UnprocessableEntityException('Only dismissed media review cases can be reopened.');
    }

    await this.auth?.recordTenantAudit({
      tenantId: reopened.tenantId,
      actorUserId: session.userId,
      action: 'MEDIA_REVIEW_CASE_REOPENED',
      entityType: 'MEDIA_REVIEW_CASE',
      entityId: reopened.id,
      metadata: {
        mediaId: reopened.mediaId,
        jobType: reopened.jobType,
        severity: reopened.severity,
        previousStatus: existing.status,
        role: decision?.role ?? 'GLOBAL_MODERATOR_LEAD',
      },
    });

    return {
      ...this.presentCase(reopened),
      reviewerRole: decision?.role,
    };
  }

  async assignCase(
    id: string,
    input: AssignMediaReviewCaseDto,
    session: PlatformAccessSession,
  ): Promise<MediaReviewCaseRecord & { reviewerRole?: string }> {
    const existing = await this.repository.findCase(id);
    if (!existing) {
      throw new NotFoundException('Media review case not found.');
    }

    if (existing.status !== 'OPEN') {
      throw new UnprocessableEntityException('Media review case is no longer open.');
    }

    if (input.note) {
      const safety = evaluateSafetyFields({ note: input.note });
      if (!safety.allowed) {
        throw new UnprocessableEntityException({
          message: 'Assignment note matches a zero-tolerance blocked category.',
          safety,
        });
      }
    }

    const tenantCountryMap = await this.tenantCountryMap();
    const decision = await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.caseAccessResource(existing, tenantCountryMap),
    );
    const assigned = await this.repository.assignCase({
      id,
      assignedTo: input.assignedTo?.trim() || session.userId,
      assignmentNote: input.note?.trim(),
    });

    if (!assigned) {
      throw new UnprocessableEntityException('Media review case is no longer open.');
    }

    await this.auth?.recordTenantAudit({
      tenantId: assigned.tenantId,
      actorUserId: session.userId,
      action: 'MEDIA_REVIEW_CASE_ASSIGNED',
      entityType: 'MEDIA_REVIEW_CASE',
      entityId: assigned.id,
      metadata: {
        mediaId: assigned.mediaId,
        assignedTo: assigned.assignedTo ?? null,
        role: decision?.role ?? 'GLOBAL_MODERATOR_LEAD',
        noteProvided: Boolean(input.note),
      },
    });

    return {
      ...this.presentCase(assigned),
      reviewerRole: decision?.role,
    };
  }

  async previewEscalationPlaybook(
    input: PreviewMediaEscalationPlaybookDto,
    session: PlatformAccessSession,
  ) {
    const country = getCountry(input.countryCode);
    await this.auth?.requirePlatformAccess(session, 'MODERATE_CONTENT', {
      countryCode: input.countryCode.trim().toUpperCase(),
      continentCode: country?.continentCode,
    });

    const decision = resolveMediaEscalationPlaybook({
      countryCode: input.countryCode,
      severity: input.severity,
      jobType: input.jobType,
      reason: input.reason,
    });
    if (!decision.ok) {
      throw new UnprocessableEntityException(decision.reason);
    }

    return decision.snapshot;
  }

  private playbookForResolution(
    reviewCase: MediaReviewCaseRecord,
    resolution: string,
    tenantCountryMap: Map<string, string>,
  ) {
    if (!mediaEscalationRequiresPlaybook(resolution, reviewCase.severity)) {
      return undefined;
    }

    const decision = resolveMediaEscalationPlaybook({
      countryCode: tenantCountryMap.get(reviewCase.tenantId),
      severity: reviewCase.severity,
      jobType: reviewCase.jobType,
      reason: reviewCase.reason,
    });
    if (!decision.ok) {
      throw new UnprocessableEntityException(decision.reason);
    }

    return decision.snapshot;
  }

  private presentCase(reviewCase: MediaReviewCaseRecord) {
    return {
      ...reviewCase,
      ...presentMediaReviewSla({
        openedAt: reviewCase.openedAt,
        severity: reviewCase.severity,
      }),
    };
  }

  private async tenantCountryMap(): Promise<Map<string, string>> {
    const tenants = (await this.auth?.listTenants()) ?? [];
    return new Map(
      tenants
        .filter((tenant): tenant is AuthTenantRecord => Boolean(tenant.id && tenant.countryCode))
        .map((tenant) => [tenant.id, tenant.countryCode]),
    );
  }

  private caseAccessResource(
    reviewCase: Pick<MediaReviewCaseRecord, 'tenantId'>,
    tenantCountryMap: Map<string, string>,
  ) {
    const countryCode = tenantCountryMap.get(reviewCase.tenantId);
    const country = countryCode ? getCountry(countryCode) : undefined;
    return {
      tenantId: reviewCase.tenantId,
      countryCode,
      continentCode: country?.continentCode,
    };
  }
}
