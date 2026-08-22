import { PATH_METADATA } from '@nestjs/common/constants';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { InMemoryAdvertsRepository } from '../adverts/in-memory-adverts.repository';
import { AdvertsService } from '../adverts/adverts.service';
import { InMemoryConversationsRepository } from '../conversations/in-memory-conversations.repository';
import { ConversationsService } from '../conversations/conversations.service';
import { InMemoryProfilesRepository } from '../profiles/in-memory-profiles.repository';
import { ProfilesService } from '../profiles/profiles.service';
import { PrivacyController } from './privacy.controller';
import { InMemoryPrivacyRepository } from './in-memory-privacy.repository';
import { PrivacyService } from './privacy.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

describe('PrivacyController', () => {
  it('mounts below the global v1 prefix used by the API', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrivacyController)).toBe('privacy');
  });
});

describe('PrivacyService', () => {
  it('schedules account deletion without exposing a second phone field', async () => {
    const svc = new PrivacyService();
    const deletion = await svc.requestDeletion(tenantId, userId, 'I no longer need SellFindConnect');

    expect(deletion.status).toBe('REQUESTED');
    expect(deletion.tenantId).toBe(tenantId);
    expect(deletion.userId).toBe(userId);
    expect((await svc.dataSummary(tenantId, userId)).deletion?.id).toBe(deletion.id);
    await expect(svc.requestDeletion(tenantId, userId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels a requested deletion during the grace period', async () => {
    const svc = new PrivacyService();
    await svc.requestDeletion(tenantId, userId);
    const cancelled = await svc.cancelDeletion(tenantId, userId);
    expect(cancelled.status).toBe('CANCELLED');
    expect((await svc.getDeletion(tenantId, userId))?.status).toBe('CANCELLED');
  });

  it('completes due deletions by erasing account holdings and keeping billing categories', async () => {
    const adverts = new AdvertsService(new InMemoryAdvertsRepository());
    const profiles = new ProfilesService(new InMemoryProfilesRepository());
    const conversations = new ConversationsService(new InMemoryConversationsRepository());
    const svc = new PrivacyService(
      new InMemoryPrivacyRepository(),
      adverts,
      profiles,
      conversations,
    );
    const requested = await svc.requestDeletion(tenantId, userId);
    const dryRun = await svc.runDueDeletions({
      now: requested.scheduledAt,
      dryRun: true,
    });
    expect(dryRun.due).toBe(1);
    expect(dryRun.completed).toBe(0);
    expect((await svc.getDeletion(tenantId, userId))?.status).toBe('REQUESTED');

    const run = await svc.runDueDeletions({ now: requested.scheduledAt });
    expect(run.completed).toBe(1);
    expect(run.failed).toBe(0);
    expect(run.retainedCategories).toEqual(['ANALYTICS', 'BILLING', 'AUTH_LOGS']);
    expect((await svc.getDeletion(tenantId, userId))?.status).toBe('COMPLETED');
    expect(JSON.stringify(run)).not.toContain('I no longer need');
  });
});
