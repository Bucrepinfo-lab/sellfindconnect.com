import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, 'fly.api.toml')) && existsSync(path.join(dir, 'deploy', 'api-release.sh'))) {
      return dir;
    }
    dir = path.resolve(dir, '..');
  }
  throw new Error('Could not find the repository root from the test working directory.');
}

const repoRoot = findRepoRoot(process.cwd());

describe('hosted Prisma release path', () => {
  it('migrates then enables prisma on the Fly API image', () => {
    const flyApi = readFileSync(path.join(repoRoot, 'fly.api.toml'), 'utf8');
    expect(flyApi).toContain('release_command = "sh /app/deploy/api-release.sh"');
    expect(flyApi).toMatch(/PERSISTENCE_DRIVER\s*=\s*"prisma"/);

    const dockerfile = readFileSync(path.join(repoRoot, 'deploy', 'api.Dockerfile'), 'utf8');
    expect(dockerfile).toContain('packages/database/prisma');
    expect(dockerfile).toContain('deploy/api-release.sh');
    expect(dockerfile).toContain('--workspace @telpen/database');
  });

  it('clears known failed Prisma rows before migrate deploy', () => {
    const script = readFileSync(path.join(repoRoot, 'deploy', 'api-release.sh'), 'utf8');
    expect(script).toContain('migrate:resolve:finance-durability');
    expect(script).toContain('migrate:resolve:search-hardening');
    expect(script.indexOf('migrate:resolve:search-hardening')).toBeLessThan(
      script.indexOf('db:migrate:deploy'),
    );
  });

  it('uses Postgres string literals in search_hardening SQL', () => {
    const sql = readFileSync(
      path.join(
        repoRoot,
        'packages',
        'database',
        'prisma',
        'migrations',
        '20260627000000_search_hardening',
        'migration.sql',
      ),
      'utf8',
    );
    expect(sql).not.toContain('to_tsvector("english"');
    expect(sql).not.toContain('|| " " ||');
    expect(sql).not.toMatch(/coalesce\([^)]+""\)/);
    expect(sql).toContain("to_tsvector(\n  'english'");
  });

  it('fail-closes the release command without DATABASE_URL', () => {
    const script = path.join(repoRoot, 'deploy', 'api-release.sh');
    expect(() =>
      execFileSync('sh', [script], {
        env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp' },
        encoding: 'utf8',
        cwd: repoRoot,
      }),
    ).toThrow(/DATABASE_URL is required before hosted Prisma migrate deploy/);
  });

  it('keeps Prisma migration SQL free of a UTF-8 BOM', () => {
    const migrationsDir = path.join(repoRoot, 'packages', 'database', 'prisma', 'migrations');
    const bomFiles: string[] = [];
    for (const entry of readdirSync(migrationsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const sqlPath = path.join(migrationsDir, entry.name, 'migration.sql');
      if (!existsSync(sqlPath)) {
        continue;
      }
      const head = readFileSync(sqlPath);
      if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
        bomFiles.push(entry.name);
      }
    }
    expect(bomFiles).toEqual([]);
  });

  it('has a migration for every Prisma model table and column', () => {
    const prismaDir = path.join(repoRoot, 'packages', 'database', 'prisma');
    const schema = readFileSync(path.join(prismaDir, 'schema.prisma'), 'utf8');
    const migrationsDir = path.join(prismaDir, 'migrations');
    const sql = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(migrationsDir, entry.name, 'migration.sql'))
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
    const modelNames = new Set(models.map((match) => match[1]));
    const missing: string[] = [];

    for (const [, name, body] of models) {
      const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? name;
      const tableSql = new RegExp(`(CREATE TABLE (IF NOT EXISTS )?"${table}"[\\s\\S]*?\\n\\);|ALTER TABLE "${table}"[^;]*;)`, 'g');
      const tableText = [...sql.matchAll(tableSql)].map((match) => match[0]).join('\n');
      if (!tableText) {
        missing.push(`table ${table}`);
        continue;
      }
      for (const raw of body.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
        const [field, type] = line.split(/\s+/);
        if (!field || !type) continue;
        const baseType = type.replace(/[?\[\]]/g, '');
        if (modelNames.has(baseType) || line.includes('@relation')) continue;
        const column = line.match(/@map\("([^"]+)"\)/)?.[1] ?? field;
        if (!tableText.includes(`"${column}"`)) missing.push(`${table}.${column}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('schedules production maintenance jobs on the default branch', () => {
    const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'scheduled-jobs.yml'), 'utf8');
    expect(workflow).toMatch(/cron:\s+'\*\/15 \* \* \* \*'/);
    expect(workflow).toContain('/operations/privacy/deletions/run');
    expect(workflow).toContain('/operations/source-finder/alerts/run');
  });
});
