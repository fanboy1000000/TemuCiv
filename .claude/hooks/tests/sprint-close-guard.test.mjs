// Tests for the sprint-close guard. Each test builds a throwaway git repository, prepares (or breaks)
// one close gate, and runs the hook exactly as Claude Code would. Sprint 999 is the harness-reserved
// number that lets TEMUCIV_CI_HEALTH_MOCK replace the GitHub call.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeCiRecord } from '../../../tools/lib/repo.mjs';
import { bash, cleanup, git, makeRepo, prepareClose, runHook, stampReviews, write } from './helpers.mjs';

const HOOK = 'sprint-close-guard.mjs';
const CLOSE = 'git commit -m "S999 close: test sprint"';
const OK_ENV = { TEMUCIV_CI_HEALTH_MOCK: 'success' };
const repos = [];
const repo = (opts) => {
  const r = makeRepo(opts);
  repos.push(r);
  return r;
};
after(() => repos.forEach(cleanup));

const closable = (opts) => {
  const root = repo(opts);
  prepareClose(root, 999);
  return root;
};

test('ignores commands that are not commits', () => {
  const root = repo();
  assert.equal(runHook(HOOK, bash('git status && echo "S999 close"'), { cwd: root }).status, 0);
});

test('ignores ordinary commits without a close marker', () => {
  const root = repo();
  assert.equal(runHook(HOOK, bash('git commit -m "TASK-101: add hex grid"'), { cwd: root }).status, 0);
});

test('ignores other tools and unparseable input', () => {
  const root = repo();
  assert.equal(runHook(HOOK, { tool_name: 'Read', tool_input: { file_path: 'x' } }, { cwd: root }).status, 0);
  assert.equal(runHook(HOOK, 'not json', { cwd: root }).status, 0);
});

test('blocks an unprepared close and names every failing gate', () => {
  const root = repo();
  write(root, 'src/new.txt', 'untracked\n');
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  for (const gate of ['sprint-log', 'reviews', 'local-ci', 'staging']) assert.match(run.stderr, new RegExp(`\\[${gate}\\]`));
});

test('allows a fully prepared close', () => {
  const root = closable();
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 0, run.stderr);
});

test('allows the very first close in a repository with no commits yet', () => {
  const root = closable({ commit: false });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 0, run.stderr);
});

test('recognises the PowerShell tool and git -C', () => {
  const root = closable();
  const ps = { tool_name: 'PowerShell', tool_input: { command: "git -C . commit -m 'S999 close: x'" } };
  assert.equal(runHook(HOOK, ps, { cwd: root, env: OK_ENV }).status, 0);
  write(root, 'src/game.txt', 'changed after review\n');
  git(root, 'add', '-A');
  assert.equal(runHook(HOOK, ps, { cwd: root, env: OK_ENV }).status, 2);
});

test('a code change after the review invalidates the review and the CI record', () => {
  const root = closable();
  write(root, 'src/game.txt', 'changed after review\n');
  git(root, 'add', '-A');
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*scope hash differs/);
  assert.match(run.stderr, /\[local-ci\].*files changed/);
});

test('finishing the sprint log after the review needs only a fresh CI run', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', '# Sprint 999\n\n| **Status** | complete |\n\nRetrospective added after review.\n');
  git(root, 'add', '-A');
  const stale = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(stale.status, 2);
  assert.doesNotMatch(stale.stderr, /\[reviews\]/);
  writeCiRecord(root, { result: 'pass' });
  assert.equal(runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV }).status, 0);
});

test('a new commit after the review invalidates the review stamp', () => {
  const root = closable();
  git(root, 'commit', '-q', '-m', 'TASK-999: sneaked in');
  writeCiRecord(root, { result: 'pass' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*stamped at/);
});

test('a BLOCKED verdict blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /verdict is BLOCKED/);
});

test('a reviewer that did not run on Fable blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { reviewerModel: 'claude-opus-5-5' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /must run on Fable/);
});

test('a failed CI record blocks the close', () => {
  const root = closable();
  writeCiRecord(root, { result: 'fail' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[local-ci\].*"fail"/);
});

test('an untracked file blocks the close', () => {
  const root = closable();
  write(root, 'tests/forgotten.test.txt', 'never staged\n');
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[staging\] untracked files: tests\/forgotten\.test\.txt/);
});

test('an unstaged change blocks the close even when the hashes match', () => {
  const root = closable({ commit: true });
  write(root, 'src/game.txt', 'edited but not staged\n');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[staging\] unstaged changes: src\/game\.txt/);
});

test('an incomplete or unlisted sprint log blocks the close', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', '| **Status** | in-progress |\n');
  write(root, 'docs/sprints/INDEX.md', 'nothing here\n');
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /status is not "complete"/);
  assert.match(run.stderr, /does not link SPRINT-999\.md/);
});

test('a waiver bypasses only its own gate', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  write(root, '.claude/reviews/SPRINT-999-reviews-WAIVED.md', 'Owner accepted the findings.\n');
  assert.equal(runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV }).status, 0);
  writeCiRecord(root, { result: 'fail' });
  assert.equal(runHook(HOOK, bash(CLOSE), { cwd: root, env: OK_ENV }).status, 2);
});

test('a red GitHub CI run blocks the close', () => {
  const root = closable();
  const run = runHook(HOOK, bash(CLOSE), { cwd: root, env: { TEMUCIV_CI_HEALTH_MOCK: 'failure' } });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[github-ci\]/);
});

test('the CI mock is ignored for any sprint other than the harness-reserved 999', () => {
  const root = repo();
  prepareClose(root, 5);
  // A leaked mock must not decide anything for a real sprint. Here the real gh call cannot find runs
  // for this throwaway repository, so the gate fails open and the close is allowed.
  const run = runHook(HOOK, bash('git commit -m "S5 close: real sprint"'), { cwd: root, env: { TEMUCIV_CI_HEALTH_MOCK: 'failure' } });
  assert.equal(run.status, 0, run.stderr);
});
