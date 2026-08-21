import { PATH_METADATA } from '@nestjs/common/constants';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

describe('PrivacyController', () => {
  it('mounts below the global v1 prefix used by the API', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PrivacyController)).toBe('privacy');
  });
});

describe('PrivacyService', () => {
  it('schedules account deletion without exposing a second phone field', () => {
    const svc = new PrivacyService();
    const deletion = svc.requestDeletion(tenantId, userId, 'I no longer need SellFindConnect');

    expect(deletion.status).toBe('REQUESTED');
    expect(deletion.tenantId).toBe(tenantId);
    expect(deletion.userId).toBe(userId);
    expect(svc.dataSummary(tenantId, userId).deletion?.id).toBe(deletion.id);
    expect(() => svc.requestDeletion(tenantId, userId)).toThrow(ConflictException);
  });

  it('cancels a requested deletion during the grace period', () => {
    const svc = new PrivacyService();
    svc.requestDeletion(tenantId, userId);
    const cancelled = svc.cancelDeletion(tenantId, userId);
    expect(cancelled.status).toBe('CANCELLED');
    expect(svc.getDeletion(tenantId, userId)?.status).toBe('CANCELLED');
  });
});
