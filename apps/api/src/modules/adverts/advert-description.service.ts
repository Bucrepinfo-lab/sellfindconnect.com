import { Inject, Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ADVERT_DRAFT_AUDIT_ACTION,
  aiAdvertDraftsUsed,
  evaluateSafetyFields,
  industryCategories,
  kenyaPlaceLabel,
  MONTHLY_AI_ADVERT_DRAFTS,
  templateAdvertDraft,
  type AdvertCopyInput,
} from '@telpen/domain';

import { AuthService } from '../auth/auth.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ADVERT_DRAFTER, type AdvertDrafter } from './advert-drafter';
import type { DraftAdvertDescriptionDto } from './dto/create-advert.dto';

export type AdvertDescriptionDraftResult = {
  title: string;
  description: string;
  /** True when the AI wrote it; false for the free template. */
  usedModel: boolean;
  /** AI drafts left this month for this business (0 when AI is off). */
  aiDraftsLeft: number;
};

function roleLabel(role: string): string {
  const words = role.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

@Injectable()
export class AdvertDescriptionService {
  constructor(
    @Optional() @Inject(ADVERT_DRAFTER) private readonly drafter?: AdvertDrafter,
    @Optional() private readonly auth?: AuthService,
    @Optional() private readonly profiles?: ProfilesService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private monthlyCap(): number {
    const raw = Number.parseInt(this.config?.get<string>('ADVERT_AI_DRAFTS_PER_MONTH') ?? '', 10);
    return Number.isInteger(raw) && raw >= 0 ? Math.min(raw, 50) : MONTHLY_AI_ADVERT_DRAFTS;
  }

  async draft(
    tenantId: string,
    userId: string,
    body: DraftAdvertDescriptionDto,
    now = new Date().toISOString(),
  ): Promise<AdvertDescriptionDraftResult> {
    const safety = evaluateSafetyFields({ title: body.title ?? '', notes: body.notes ?? '' });
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'Your details contain words we never allow. Change them and try again.',
        safety,
      });
    }

    const profile = await this.profiles?.getLiveProfile(tenantId).catch(() => undefined);
    const industry = industryCategories.find((item) => item.code === profile?.industryCode);
    const area = profile?.serviceArea;
    const input: AdvertCopyInput = {
      title: body.title,
      notes: body.notes,
      businessName: profile?.displayName ?? 'Our business',
      roleLabel: profile ? roleLabel(profile.role) : 'Business',
      industryLabel: industry?.name.split(',')[0] ?? 'Kenya',
      place: area?.county ? kenyaPlaceLabel(area) : area?.primaryCity,
    };
    const template = templateAdvertDraft(input);

    const cap = this.monthlyCap();
    let used = 0;
    if (this.drafter && this.auth) {
      const { auditLogs } = await this.auth
        .listAuditLogsForTenant(tenantId, { action: ADVERT_DRAFT_AUDIT_ACTION })
        .catch(() => ({ auditLogs: [] as Array<{ action: string; createdAt: string }> }));
      used = aiAdvertDraftsUsed(auditLogs, now);
    }

    let result: AdvertDescriptionDraftResult = {
      ...template,
      usedModel: false,
      aiDraftsLeft: this.drafter ? Math.max(0, cap - used) : 0,
    };
    let reason = this.drafter ? (used >= cap ? 'monthly_cap' : 'model_failed') : 'ai_off';
    let tokens = { inputTokens: 0, outputTokens: 0 };

    if (this.drafter && used < cap) {
      const drafted = await this.drafter.draft(input);
      if (drafted) {
        result = {
          title: drafted.title,
          description: drafted.description,
          usedModel: true,
          aiDraftsLeft: Math.max(0, cap - used - 1),
        };
        tokens = { inputTokens: drafted.inputTokens, outputTokens: drafted.outputTokens };
        reason = 'ai';
      }
    }

    await this.auth
      ?.recordTenantAudit({
        tenantId,
        actorUserId: userId,
        action: ADVERT_DRAFT_AUDIT_ACTION,
        entityType: 'ADVERT_DRAFT',
        metadata: { usedModel: result.usedModel, reason, ...tokens },
      })
      .catch(() => undefined);
    return result;
  }
}
