export type PersistenceMode = 'memory' | 'prisma';

export type PersistenceConfigReader = {
  get(key: string): string | undefined;
};

const PRISMA_VALUES = new Set(['prisma', 'postgres', 'database']);
const MEMORY_VALUES = new Set(['memory', 'development', 'off', 'none']);
const LIVE_DRIVERS = new Set(['prisma', 'postgres', 'database', 'live']);

function trimConfig(config: PersistenceConfigReader | undefined, key: string): string {
  return config?.get(key)?.trim() ?? '';
}

export function requireDatabaseUrl(
  config: PersistenceConfigReader | undefined,
  label: string,
): string {
  const databaseUrl = trimConfig(config, 'DATABASE_URL');
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL is required when ${label}=prisma.`);
  }
  return databaseUrl;
}

export function resolvePersistenceMode(
  config: PersistenceConfigReader | undefined,
  keys: string[],
): PersistenceMode {
  for (const key of keys) {
    const value = trimConfig(config, key).toLowerCase();
    if (!value) {
      continue;
    }
    if (PRISMA_VALUES.has(value)) {
      requireDatabaseUrl(config, key);
      return 'prisma';
    }
    if (MEMORY_VALUES.has(value)) {
      return 'memory';
    }
    throw new Error(`Unsupported ${key} "${value}". Use memory or prisma.`);
  }

  const driver = trimConfig(config, 'PERSISTENCE_DRIVER').toLowerCase();
  if (!driver || MEMORY_VALUES.has(driver)) {
    return 'memory';
  }
  if (LIVE_DRIVERS.has(driver)) {
    requireDatabaseUrl(config, 'PERSISTENCE_DRIVER');
    return 'prisma';
  }
  throw new Error(
    `Unsupported PERSISTENCE_DRIVER "${driver}". Approve memory or prisma before enabling it.`,
  );
}

export function presentPersistenceHealth(config?: PersistenceConfigReader): {
  driver: string;
  mode: PersistenceMode | 'misconfigured';
  databaseConfigured: boolean;
} {
  const driver = trimConfig(config, 'PERSISTENCE_DRIVER').toLowerCase() || 'memory';
  let mode: PersistenceMode | 'misconfigured' = 'memory';
  try {
    mode = resolvePersistenceMode(config, []);
  } catch {
    mode = 'misconfigured';
  }
  return {
    driver,
    mode,
    databaseConfigured: Boolean(trimConfig(config, 'DATABASE_URL')),
  };
}
