import { describe, expect, it } from 'vitest';

import {
  presentPersistenceHealth,
  requireDatabaseUrl,
  resolvePersistenceMode,
} from './persistence';

function configReader(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  };
}

describe('hosted Prisma persistence overlay', () => {
  it('keeps memory by default and overlays prisma from PERSISTENCE_DRIVER', () => {
    expect(resolvePersistenceMode(configReader({}), ['AUTH_REPOSITORY'])).toBe('memory');
    expect(
      resolvePersistenceMode(
        configReader({ DATABASE_URL: 'postgresql://localhost/telpen' }),
        ['AUTH_REPOSITORY'],
      ),
    ).toBe('memory');
    expect(
      resolvePersistenceMode(
        configReader({ PERSISTENCE_DRIVER: 'prisma', DATABASE_URL: 'postgresql://localhost/telpen' }),
        ['AUTH_REPOSITORY'],
      ),
    ).toBe('prisma');
    expect(
      resolvePersistenceMode(
        configReader({
          PERSISTENCE_DRIVER: 'prisma',
          DATABASE_URL: 'postgresql://localhost/telpen',
          AUTH_REPOSITORY: 'memory',
        }),
        ['AUTH_REPOSITORY'],
      ),
    ).toBe('memory');
  });

  it('fail-closes named prisma selection without DATABASE_URL', () => {
    expect(() =>
      resolvePersistenceMode(configReader({ AUTH_REPOSITORY: 'prisma' }), ['AUTH_REPOSITORY']),
    ).toThrow('DATABASE_URL is required when AUTH_REPOSITORY=prisma.');
    expect(() =>
      resolvePersistenceMode(configReader({ PERSISTENCE_DRIVER: 'live' }), ['PROFILE_REPOSITORY']),
    ).toThrow('DATABASE_URL is required when PERSISTENCE_DRIVER=prisma.');
    expect(() =>
      resolvePersistenceMode(configReader({ PERSISTENCE_DRIVER: 'mysql' }), ['AUTH_REPOSITORY']),
    ).toThrow('Unsupported PERSISTENCE_DRIVER "mysql"');
  });

  it('presents health without exposing the database URL', () => {
    expect(
      presentPersistenceHealth(
        configReader({
          PERSISTENCE_DRIVER: 'prisma',
          DATABASE_URL: 'postgresql://user:secret@hosted.example/telpen',
        }),
      ),
    ).toEqual({
      driver: 'prisma',
      mode: 'prisma',
      databaseConfigured: true,
    });
    expect(
      JSON.stringify(
        presentPersistenceHealth(
          configReader({
            PERSISTENCE_DRIVER: 'prisma',
            DATABASE_URL: 'postgresql://user:secret@hosted.example/telpen',
          }),
        ),
      ),
    ).not.toContain('secret');
    expect(presentPersistenceHealth(configReader({ PERSISTENCE_DRIVER: 'prisma' }))).toEqual({
      driver: 'prisma',
      mode: 'misconfigured',
      databaseConfigured: false,
    });
    expect(requireDatabaseUrl(configReader({ DATABASE_URL: 'postgresql://localhost/telpen' }), 'AUTH_REPOSITORY')).toBe(
      'postgresql://localhost/telpen',
    );
  });
});
