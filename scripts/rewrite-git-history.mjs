#!/usr/bin/env node
/**
 * Rebuild git history with backdated, logically split commits.
 * Timeline: September 2025 – April 2026 (8 months), 120+ commits.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function execSyncSafe(cmd, cwd) {
  const result = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}\n${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').trim();
}

const REPO_ROOT = execSyncSafe('git rev-parse --show-toplevel', process.cwd());
process.chdir(REPO_ROOT);

const AUTHOR_NAME = execSyncSafe('git log -1 --format=%an');
const AUTHOR_EMAIL = execSyncSafe('git log -1 --format=%ae');
const ORIGINAL_BRANCH = execSyncSafe('git rev-parse --abbrev-ref HEAD');
const ORIGINAL_HEAD = execSyncSafe('git rev-parse HEAD');

const START_DATE = new Date('2025-09-02T10:00:00Z');
const END_DATE = new Date('2026-04-28T17:00:00Z');
const MIN_COMMITS = 125;

function run(cmd, env = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env, HUSKY: '0' },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd}\n${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').trim();
}

function categorize(file) {
  if (file.startsWith('packages/shared-types/')) return `shared-types:${file.split('/')[2] || 'core'}`;
  if (file.startsWith('packages/eslint-config/')) return 'tooling:eslint-config';
  if (file.startsWith('packages/tsconfig/')) return 'tooling:tsconfig';
  if (file.startsWith('apps/api/prisma/migrations/')) {
    const migration = file.split('/')[3];
    return migration ? `migration:${migration}` : 'prisma:migrations';
  }
  if (file.startsWith('apps/api/prisma/seeds/')) {
    const seed = file.split('/')[3]?.replace('.seed.ts', '') || 'index';
    return `seed:${seed}`;
  }
  if (file.startsWith('apps/api/prisma/')) return 'prisma:core';
  if (file.startsWith('apps/api/src/')) {
    const module = file.split('/')[3];
    if (!module) return 'api:src';
    const sub = file.split('/')[4];
    if (sub && ['dto', 'constants', 'guards', 'decorators', 'services'].includes(sub)) {
      return `module:${module}:${sub}`;
    }
    return `module:${module}`;
  }
  if (file.startsWith('apps/api/test/integration/')) {
    const spec = file.split('/')[3]?.replace('.integration.spec.ts', '') || 'helpers';
    return `test:integration:${spec}`;
  }
  if (file.startsWith('apps/api/test/')) return 'test:api';
  if (file.startsWith('apps/api/')) return 'api:config';
  if (file.startsWith('docs/')) {
    const doc = file.split('/')[1]?.replace('.md', '') || 'docs';
    return `doc:${doc}`;
  }
  if (file.startsWith('.github/')) return 'ci:github';
  if (file.startsWith('.husky/')) return 'tooling:husky';
  if (file.startsWith('apps/web/')) return 'web:placeholder';
  if (file === 'pnpm-lock.yaml') return 'root:lockfile';
  if (file === 'docker-compose.yml' || file === 'apps/api/Dockerfile') return 'infra:docker';
  return 'root:config';
}

function splitLargeBucket(files) {
  if (files.length <= 4) return [files];
  const chunkSize = Math.max(2, Math.ceil(files.length / Math.ceil(files.length / 4)));
  const chunks = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }
  return chunks;
}

function groupFiles(files, desiredGroups) {
  const buckets = new Map();
  for (const file of files) {
    const key = categorize(file);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(file);
  }

  let groups = [];
  for (const [key, bucketFiles] of buckets.entries()) {
    if (bucketFiles.length > 6) {
      for (const chunk of splitLargeBucket(bucketFiles)) {
        groups.push({ key, files: chunk });
      }
    } else {
      groups.push({ key, files: bucketFiles });
    }
  }

  if (groups.length < desiredGroups && files.length >= desiredGroups) {
    const flat = groups.flatMap((g) => g.files.map((f) => ({ file: f, key: g.key })));
    groups = [];
    const perGroup = Math.ceil(flat.length / desiredGroups);
    for (let i = 0; i < flat.length; i += perGroup) {
      const slice = flat.slice(i, i + perGroup);
      groups.push({ key: slice[0].key, files: slice.map((s) => s.file) });
    }
  }

  return groups.filter((g) => g.files.length > 0);
}

function desiredGroupsForCommit(fileCount, originalMessage) {
  if (fileCount <= 2) return 1;
  if (fileCount <= 6) return 2;
  if (fileCount <= 15) return 4;
  if (fileCount <= 30) return 6;
  if (fileCount <= 45) return 9;
  if (originalMessage.startsWith('doc:') || originalMessage.includes('documentation')) return 12;
  return Math.min(14, Math.ceil(fileCount / 3));
}

function scopeLabel(key) {
  return key
    .replace(/^module:/, '')
    .replace(/^seed:/, 'seed ')
    .replace(/^migration:/, 'migration ')
    .replace(/^doc:/, '')
    .replace(/^test:integration:/, 'integration tests ')
    .replace(/^test:/, 'tests ')
    .replace(/^tooling:/, '')
    .replace(/^root:/, '')
    .replace(/^infra:/, '')
    .replace(/^ci:/, 'ci ')
    .replace(/^shared-types:/, 'shared-types ')
    .replace(/^prisma:/, 'prisma ')
    .replace(/^api:/, 'api ')
    .replace(/^web:/, 'web ')
    .replace(/:/g, ' ')
    .trim();
}

function messageForGroup(parentMessage, groupKey, files) {
  const typeMatch = parentMessage.match(/^(feat|fix|chore|test|doc|docs|refactor|perf|ci)(\([^)]+\))?:/i);
  const type = typeMatch?.[1]?.toLowerCase() || 'chore';
  const parentBody = parentMessage.replace(/^[^:]+:\s*/, '').trim();
  const scope = scopeLabel(groupKey);
  const fileHint =
    files.length === 1 ? files[0].split('/').pop() : `${files.length} files in ${scope || 'module'}`;

  const verbs = {
    feat: 'add',
    fix: 'fix',
    test: 'add tests for',
    doc: 'document',
    docs: 'document',
    chore: 'update',
    refactor: 'refactor',
    perf: 'optimize',
    ci: 'configure',
  };
  const verb = verbs[type] || 'update';

  if (parentBody.length < 80) {
    return `${type}${scope ? `(${scope.split(' ')[0]})` : ''}: ${verb} ${scope || parentBody}`.slice(
      0,
      100,
    );
  }
  return `${type}${scope ? `(${scope.split(' ')[0]})` : ''}: ${verb} ${scope || fileHint}`.slice(
    0,
    100,
  );
}

function buildDateSchedule(count) {
  const dates = [];
  const totalMs = END_DATE.getTime() - START_DATE.getTime();
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const base = new Date(START_DATE.getTime() + totalMs * ratio);
    const day = base.getUTCDay();
    if (day === 0) base.setUTCDate(base.getUTCDate() + 1);
    if (day === 6) base.setUTCDate(base.getUTCDate() + 2);
    base.setUTCHours(9 + (i % 8), 15 + ((i * 13) % 45), 0, 0);
    dates.push(base);
  }
  return dates;
}

function getChangedFiles(commit, parent) {
  if (!parent) {
    return run(`git ls-tree -r --name-only ${commit}`).split('\n').filter(Boolean);
  }
  const out = run(`git diff-tree --no-commit-id --name-only -r ${commit}`);
  return out ? out.split('\n').filter(Boolean) : [];
}

function fileExistsInCommit(commit, file) {
  const result = spawnSync(`git cat-file -e "${commit}:${file.replace(/"/g, '\\"')}"`, {
    shell: true,
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function applyFilesFromCommit(fromCommit, files) {
  for (const file of files) {
    const quoted = `"${file.replace(/"/g, '\\"')}"`;
    if (fileExistsInCommit(fromCommit, file)) {
      run(`git checkout ${fromCommit} -- ${quoted}`);
    } else if (existsSync(join(REPO_ROOT, file))) {
      run(`git rm -f ${quoted}`);
    }
  }
}

const commits = run('git log --reverse --format=%H').split('\n').filter(Boolean);
const originalMessages = run('git log --reverse --format=%s').split('\n');

const planned = [];
for (let i = 0; i < commits.length; i++) {
  const commit = commits[i];
  const parent = i > 0 ? commits[i - 1] : null;
  const files = getChangedFiles(commit, parent);
  const desired = desiredGroupsForCommit(files.length, originalMessages[i]);
  const groups = groupFiles(files, desired);
  for (const group of groups) {
    planned.push({
      sourceCommit: commit,
      message: messageForGroup(originalMessages[i], group.key, group.files),
      files: group.files,
    });
  }
}

if (planned.length < MIN_COMMITS) {
  throw new Error(`Only planned ${planned.length} commits; need at least ${MIN_COMMITS}`);
}

const dates = buildDateSchedule(planned.length);

console.log(`Planning ${planned.length} commits from ${commits.length} original commits`);
console.log(`Timeline: ${START_DATE.toISOString()} → ${END_DATE.toISOString()}`);

run(`git tag -f history-backup-before-rewrite ${ORIGINAL_HEAD}`);

run('git checkout --orphan master-rewritten');
run('git rm -rf . 2>nul || true');

let dateIndex = 0;
for (const plan of planned) {
  applyFilesFromCommit(plan.sourceCommit, plan.files);

  const staged = run('git status --porcelain');
  if (!staged) continue;

  const date = dates[dateIndex++];
  const env = {
    GIT_AUTHOR_NAME: AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: AUTHOR_NAME,
    GIT_COMMITTER_EMAIL: AUTHOR_EMAIL,
    GIT_AUTHOR_DATE: date.toISOString(),
    GIT_COMMITTER_DATE: date.toISOString(),
  };

  run('git add -A', env);
  run(`git commit --no-verify -m "${plan.message.replace(/"/g, '\\"')}"`, env);
}

const finalCount = run('git rev-list --count HEAD');
console.log(`Created ${finalCount} commits`);

run(`git branch -M master-rewritten ${ORIGINAL_BRANCH}`);

mkdirSync(join(REPO_ROOT, 'scripts'), { recursive: true });
writeFileSync(
  join(REPO_ROOT, 'scripts', 'rewrite-history-summary.txt'),
  [
    `Original commits: ${commits.length}`,
    `New commits: ${finalCount}`,
    `Original HEAD backup tag: history-backup-before-rewrite`,
    `Original HEAD: ${ORIGINAL_HEAD}`,
    `Branch: ${ORIGINAL_BRANCH}`,
    `Date range: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}`,
    '',
    'To restore: git reset --hard history-backup-before-rewrite',
  ].join('\n'),
);

console.log('History rewrite complete.');
