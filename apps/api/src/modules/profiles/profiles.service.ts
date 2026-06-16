import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  type ProfileDraft,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { CreateProfileDraftDto } from './dto/create-profile-draft.dto';

@Injectable()
export class ProfilesService {
  private readonly drafts = new Map<string, ProfileDraft>();

  createDraft(tenantId: string, input: CreateProfileDraftDto): ProfileDraft {
    const country = getCountry(input.countryCode);
    const industry = industryCategories.find((item) => item.code === input.industryCode);

    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (!industry) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This profile draft matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const draft: ProfileDraft = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };

    this.drafts.set(this.key(tenantId, draft.id), draft);
    return draft;
  }

  getDraft(tenantId: string, id: string): ProfileDraft {
    const draft = this.drafts.get(this.key(tenantId, id));
    if (!draft) {
      throw new NotFoundException('Profile draft not found.');
    }

    return draft;
  }

  previewDraft(tenantId: string, id: string) {
    const draft = this.getDraft(tenantId, id);
    const country = getCountry(draft.countryCode);
    const industry = industryCategories.find((item) => item.code === draft.industryCode);

    return {
      ...draft,
      preview: {
        country,
        industry,
        completenessScore: this.completenessScore(draft),
        publicContacts: {
          phone: draft.phone ?? null,
          email: draft.email ?? null,
          website: draft.website ?? null,
        },
      },
    };
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private completenessScore(draft: ProfileDraft): number {
    const fields = [
      draft.displayName,
      draft.industryCode,
      draft.role,
      draft.description,
      draft.countryCode,
      draft.phone,
      draft.email,
      draft.website,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }
}
