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

  it('schedules production maintenance jobs on the default branch', () => {
    const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'scheduled-jobs.yml'), 'utf8');
    expect(workflow).toMatch(/cron:\s+'\*\/15 \* \* \* \*'/);
    expect(workflow).toContain('/operations/privacy/deletions/run');
    expect(workflow).toContain('/operations/source-finder/alerts/run');
  });
});
