import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { evaluateSafetyFields, getCountry } from '@telpen/domain';

import { AuthService } from '../auth/auth.service';
import type { AuthTenantRecord, PlatformAccessSession } from '../auth/auth.records';
import type { ListMediaReviewCasesDto, ResolveMediaReviewCaseDto } from './dto/media-review.dto';
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
  ): Promise<MediaReviewCaseRecord[]> {
    const tenantCountryMap = await this.tenantCountryMap();
    const cases = await this.repository.listCases({
      status: input.status ?? 'OPEN',
      tenantId: input.tenantId,
      severity: input.severity,
      limit: input.limit,
    });

    return cases.filter(
      (reviewCase) =>
        this.auth?.canPlatformAccess(
          session,
          'MODERATE_CONTENT',
          this.caseAccessResource(reviewCase, tenantCountryMap),
        ) ?? true,
    );
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

    const tenantCountryMap = await this.tenantCountryMap();
    const decision = await this.auth?.requirePlatformAccess(
      session,
      'MODERATE_CONTENT',
      this.caseAccessResource(existing, tenantCountryMap),
    );
    const resolved = await this.repository.resolveCase({
      id,
      resolvedBy: session.userId,
      resolution: input.resolution,
      notes: input.notes?.trim(),
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
      },
    });

    return {
      ...resolved,
      reviewerRole: decision?.role,
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
