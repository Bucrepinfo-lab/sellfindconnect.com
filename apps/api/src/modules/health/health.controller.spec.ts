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

  it('reports persistence without throwing or leaking a database URL', () => {
    const previousDriver = process.env.PERSISTENCE_DRIVER;
    const previousUrl = process.env.DATABASE_URL;
    process.env.PERSISTENCE_DRIVER = 'prisma';
    delete process.env.DATABASE_URL;

    try {
      const payload = new HealthController().check();
      expect(payload.persistence).toEqual({
        driver: 'prisma',
        mode: 'misconfigured',
        databaseConfigured: false,
      });
      expect(JSON.stringify(payload)).not.toContain('postgresql://');
    } finally {
      if (previousDriver === undefined) {
        delete process.env.PERSISTENCE_DRIVER;
      } else {
        process.env.PERSISTENCE_DRIVER = previousDriver;
      }
      if (previousUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousUrl;
      }
    }
  });
});