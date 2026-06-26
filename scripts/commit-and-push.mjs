#!/usr/bin/env node
/**
 * One-command commit & push for the Sell Find Connect / Telpen Adverts repo.
 *
 * Why this exists: work was authored from a sandboxed session that cannot reach
 * GitHub and whose mounted node_modules cannot run the full typecheck/tests.
 * This script runs the real verification gate on the host (where node_modules
 * and GitHub auth are consistent), then makes two clean commits and pushes.
 *
 * Usage (from the repo root, on your machine):
 *   node scripts/commit-and-push.mjs
 *
 * Flags:
 *   --skip-verify   Skip `npm run typecheck` + `npm test` (NOT recommended).
 *   --no-push       Commit only; do not push.
 *   --keep-noise    Do not discard the CRLF-only working-tree changes.
 *   --dry-run       Print what would happen without changing anything.
 *
 * Safety:
 *   - If verification fails, nothing is committed or pushed.
 *   - Only explicit paths are staged; untracked artifacts are never swept in.
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
process.chdir(repoRoot);

const args = new Set(process.argv.slice(2));
const skipVerify = args.has('--skip-verify');
const noPush = args.has('--no-push');
const keepNoise = args.has('--keep-noise');
const dryRun = args.has('--dry-run');

const log = (msg) => console.log(`\n* ${msg}`);
const ok = (msg) => console.log(`OK   ${msg}`);
const warn = (msg) => console.log(`!    ${msg}`);

function run(cmd, { capture = false } = {}) {
  if (dryRun && !capture) {
    console.log(`  [dry-run] ${cmd}`);
    return '';
  }
  return execSync(cmd, { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
}

// The pre-existing, in-flight analytics increment (untouched by the new work).
const analyticsPaths = [
  'apps/api/package.json',
  'apps/api/src/modules/analytics',
  'apps/api/src/modules/operations/operations.controller.ts',
  'apps/web/next-env.d.ts',
  'apps/web/src/app/page.tsx',
  'docs/ARCHITECTURE.md',
  'docs/DEPLOYMENT.md',
  'packages/database/prisma/schema.prisma',
  'packages/database/prisma/migrations/20260622123000_add_analytics_daily_rollups',
  'packages/domain/src/analytics.ts',
  'packages/domain/src/analytics.test.ts',
];

// New work: finance hardening, AI-native agents, CI, repo hygiene + doc refresh.
const newWorkPaths = [
  '.gitattributes',
  '.github/workflows/ci.yml',
  '.agents',
  'apps/api/src/modules/finance',
  'packages/domain/src/finance.ts',
  'packages/domain/src/finance.test.ts',
  'Advertising_SaaS_PRD.md',
  'Product_Memory.md',
  'docs/IMPLEMENTATION_BACKLOG.md',
];

// Pure CRLF<->LF churn with zero real content change. Discarded (not committed)
// so the tree is clean; .gitattributes prevents this recurring.
const crlfNoisePaths = [
  'package.json',
  'apps/web/package.json',
  'package-lock.json',
  'apps/web/src/app/global-error.tsx',
  'apps/web/src/app/not-found.tsx',
];

function pathHasChangesOrIsTracked(path) {
  // Tracked?
  try {
    execSync(`git ls-files --error-unmatch -- "${path}"`, { stdio: 'ignore' });
    return true;
  } catch {
    // Untracked: present only if status reports something for it.
    try {
      const out = execSync(`git status --porcelain -- "${path}"`, {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      return out.trim().length > 0;
    } catch {
      return false;
    }
  }
}

function addAndCommit(paths, message) {
  const present = paths.filter(pathHasChangesOrIsTracked);
  if (present.length === 0) {
    warn(`No paths to stage for: "${message}" - skipping.`);
    return false;
  }
  for (const p of present) run(`git add -- "${p}"`);
  const staged = run('git diff --cached --name-only', { capture: true }).trim();
  if (!staged) {
    warn(`Nothing staged for: "${message}" - skipping commit.`);
    return false;
  }
  if (dryRun) {
    console.log(`  [dry-run] git commit -m "${message}"`);
    console.log('  [dry-run] would commit:');
    console.log(staged.split('\n').map((l) => '      ' + l).join('\n'));
    run('git reset -q'); // leave tree untouched in dry-run
    return true;
  }
  run(`git commit -m "${message}"`);
  ok(`Committed: ${message}`);
  return true;
}

(async () => {
  log('Repository');
  console.log(`  ${repoRoot}`);
  const branch = run('git rev-parse --abbrev-ref HEAD', { capture: true }).trim();
  console.log(`  branch: ${branch}`);

  if (!skipVerify) {
    log('Verifying (the real gate) - typecheck + tests');
    try {
      run('npm run typecheck');
      run('npm test');
      ok('Verification passed');
    } catch {
      console.error(
        '\nX Verification failed. Nothing was committed. Fix the errors above ' +
          '(or paste them back to your assistant) and re-run.',
      );
      process.exit(1);
    }
  } else {
    warn('Skipping verification (--skip-verify)');
  }

  log('Commit 1 - in-flight analytics increment');
  addAndCommit(analyticsPaths, 'Persist rollup-backed analytics report source selection');

  log('Commit 2 - finance payments/invoicing/reconciliation, AI-native agents, CI, hygiene');
  addAndCommit(
    newWorkPaths,
    'Add finance payments, invoicing and reconciliation, AI-native agent system, CI, and repo hygiene',
  );

  if (!keepNoise) {
    log('Discarding CRLF-only working-tree noise (zero real content change)');
    for (const p of crlfNoisePaths) {
      if (pathHasChangesOrIsTracked(p)) run(`git checkout -- "${p}"`);
    }
    ok('Working tree clean of line-ending noise');
  }

  if (noPush) {
    warn(`Skipping push (--no-push). Run 'git push origin ${branch}' when ready.`);
  } else {
    log(`Pushing to origin/${branch}`);
    run(`git push origin ${branch}`);
    ok('Pushed to GitHub');
  }

  log('Done - recent history');
  run('git --no-pager log --oneline -3');
})().catch((err) => {
  console.error(`\nX ${err.message}`);
  process.exit(1);
});
