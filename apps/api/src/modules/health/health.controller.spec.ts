import { PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('mounts below the global v1 prefix used by the API and Fly health check', () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
  });

  it('returns a healthy service payload', () => {
    expect(new HealthController().check()).toMatchObject({
      status: 'ok',
      service: 'sellfindconnect-api',
    });
  });
});