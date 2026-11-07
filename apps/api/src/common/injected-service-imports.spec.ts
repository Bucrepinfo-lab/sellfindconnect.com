import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const modulesDir = join(__dirname, '..', 'modules');

function serviceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return serviceFiles(path);
    return entry.endsWith('.service.ts') ? [path] : [];
  });
}

/**
 * Nest injects constructor parameters by their emitted design type. A class
 * brought in with `import type` is emitted as `Object`, so an `@Optional()`
 * AuthService silently resolves to undefined in production, and every
 * `this.auth?.…` check (stored terms acceptance, tenant audit) is skipped.
 * The server would then accept writes the UI only appears to restrict.
 */
describe('constructor-injected services are value imports', () => {
  it('no service injects AuthService through a type-only import', () => {
    const offenders = serviceFiles(modulesDir)
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        const injectsAuth = /private readonly auth\??:\s*AuthService/.test(source);
        const typeOnly = /import type \{[^}]*\bAuthService\b[^}]*\} from '\.\.\/auth\/auth\.service'/.test(source);
        return injectsAuth && typeOnly;
      })
      .map((file) => relative(modulesDir, file));

    expect(offenders).toEqual([]);
  });
});
