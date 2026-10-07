// Test helpers for the hook tests: throwaway git repositories and a way to run a hook like Claude Code does.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewStamp, writeCiRecord } from '../../../tools/lib/repo.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const HOOKS = resolve(here, '..');
/** The repository's versioned git hooks (.githooks), used by tests that make real commits. */
export const GITHOOKS = resolve(here, '../../../.githooks');
export const REPO_ROOT = resolve(here, '../../..');

export function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

export function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * A fresh repository with the gitignore rules the guard relies on. `commit: true` adds an initial commit on
 * `main`; work then continues on the sprint branch `sprint/999`, as the workflow requires. `hooks: true` sets
 * core.hooksPath the way `npm run setup` does, which the PreToolUse guard requires.
 */
export function makeRepo({ commit = true, hooks = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'temuciv-hook-'));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'Hook Test');
  git(root, 'config', 'core.autocrlf', 'false');
  if (hooks) git(root, 'config', 'core.hooksPath', '.githooks');
  write(root, '.gitignore', '.claude/reviews/\n.claude/ci/\n');
  write(root, 'src/game.txt', 'initial\n');
  if (commit) {
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'initial');
    git(root, 'switch', '-q', '-c', 'sprint/999');
  } else {
    git(root, 'symbolic-ref', 'HEAD', 'refs/heads/sprint/999');
  }
  return root;
}

export function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

/**
 * Bring a repository to a fully closable state for sprint N: a complete sprint log listed in the index,
 * both reviews stamped against the current files, a passing CI record, and everything staged.
 */
export function prepareClose(root, sprint, { reviewerModel = 'claude-fable-5-1', verdict = 'APPROVED' } = {}) {
  write(root, `docs/sprints/SPRINT-${sprint}.md`, sprintLog(sprint));
  write(root, 'docs/sprints/INDEX.md', `| [Sprint ${sprint}](SPRINT-${sprint}.md) | complete |\n`);
  git(root, 'add', '-A');
  stampReviews(root, sprint, { reviewerModel, verdict });
  writeCiRecord(root, { result: 'pass' });
}

/** A minimal sprint log: header, a reviewed section, and the close-time sections after the review heading. */
export function sprintLog(sprint, { status = 'complete', plan = 'The plan.', task = 'complete', retro = 'Retrospective.' } = {}) {
  return (
    `# Sprint ${sprint}\n\n| Field | Value |\n|---|---|\n| **Status** | ${status} |\n\n` +
    `## Plan\n\n${plan}\n\n### TASK-1\n\n| **Status** | ${task} |\n\n` +
    `## Sprint-end review (step 7)\n\nBoth lenses approved.\n\n## Retrospective\n\n${retro}\n`
  );
}

export function stampReviews(root, sprint, { reviewerModel = 'claude-fable-5-1', verdict = 'APPROVED' } = {}) {
  const s = reviewStamp(root);
  const stamp = `reviewed-against-commit: ${s.commit}\nreviewed-scope-hash: ${s.scopeHash}\n`;
  write(root, `.claude/reviews/SPRINT-${sprint}-codex.md`, `${stamp}\nNo findings.\nverdict: ${verdict}\n`);
  write(root, `.claude/reviews/SPRINT-${sprint}-reviewer.md`, `reviewed-by-model: ${reviewerModel}\n${stamp}\nNo findings.\nverdict: ${verdict}\n`);
}

/**
 * Make a real commit in a test repository with the project's git hooks active (pre-commit secret scan,
 * commit-msg close gates). Returns git's exit status and stderr.
 */
export function commitWithHooks(root, args, { env = {} } = {}) {
  const cleanEnv = { ...process.env, ...env };
  delete cleanEnv.CLAUDE_PROJECT_DIR;
  const run = spawnSync('git', ['-c', `core.hooksPath=${GITHOOKS}`, 'commit', ...args], { cwd: root, env: cleanEnv, encoding: 'utf8', timeout: 60000 });
  return { status: run.status, stderr: run.stderr + run.stdout };
}

/** Run a git command in a test repository with the project's git hooks active. */
export function gitWithHooks(root, args, { env = {} } = {}) {
  const cleanEnv = { ...process.env, ...env };
  delete cleanEnv.CLAUDE_PROJECT_DIR;
  const run = spawnSync('git', ['-c', `core.hooksPath=${GITHOOKS}`, ...args], { cwd: root, env: cleanEnv, encoding: 'utf8', timeout: 60000 });
  return { status: run.status, stderr: run.stderr + run.stdout };
}

/** Run a hook with a tool-call payload on stdin, the way Claude Code does. */
export function runHook(hook, payload, { cwd, env = {} } = {}) {
  const cleanEnv = { ...process.env, ...env };
  delete cleanEnv.CLAUDE_PROJECT_DIR;
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete cleanEnv[k];
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const run = spawnSync(process.execPath, [join(HOOKS, hook)], { cwd, input, env: cleanEnv, encoding: 'utf8', timeout: 30000 });
  return { status: run.status, stderr: run.stderr };
}

export const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
