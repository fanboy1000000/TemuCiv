// Tests for the sprint-close guard (the PreToolUse hook: a blunt text check) and for the close gates themselves
// (tools/lib/close-gates.mjs), which the commit-msg hook runs on every close. Each test builds a throwaway git
// repository. Sprint 999 is the harness-reserved number that lets TEMUCIV_CI_HEALTH_MOCK replace the GitHub call.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { checkCloseGates } from '../../../tools/lib/close-gates.mjs';
import { writeCiRecord } from '../../../tools/lib/repo.mjs';
import { bash, cleanup, git, makeRepo, prepareClose, runHook, sprintLog, stampReviews, write } from './helpers.mjs';

const HOOK = 'sprint-close-guard.mjs';
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
const guard = (root, command, tool = 'Bash') => runHook(HOOK, tool === 'Bash' ? bash(command) : { tool_name: tool, tool_input: { command } }, { cwd: root });

/** Run the close gates for a sprint, the way commit-msg does. status 2 = blocked, stderr = the failures. */
const gates = (root, env = OK_ENV, sprint = '999') => {
  const { failures } = checkCloseGates(root, sprint, { ...process.env, ...env });
  return { status: failures.length ? 2 : 0, stderr: failures.join('\n') };
};

/** Prepare a close but keep the sprint log already written to the repository. */
function prepareCloseKeepingLog(root) {
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 999](SPRINT-999.md) | complete |\n');
  git(root, 'add', '-A');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
}

// --- the guard: a blunt text check -------------------------------------------------------------------------

test('ignores commands that are not git commits, pushes, merges or pulls, and other tools', () => {
  const root = repo({ hooks: false });
  assert.equal(guard(root, 'git status && echo done').status, 0);
  assert.equal(guard(root, 'npm test -- --no-verify').status, 0, 'no git commit/push in it');
  assert.equal(runHook(HOOK, { tool_name: 'Read', tool_input: { file_path: 'x' } }, { cwd: root }).status, 0);
  assert.equal(runHook(HOOK, 'not json', { cwd: root }).status, 0);
});

test('allows ordinary commits and pushes, including the usual heredoc message', () => {
  const root = repo();
  assert.equal(guard(root, 'git add -A && git commit -q -m "TASK-1: hex grid"').status, 0);
  assert.equal(guard(root, "git commit -m \"$(cat <<'EOF'\nTASK-1: the owner's change\n\nBody.\nEOF\n)\"").status, 0);
  assert.equal(guard(root, 'git commit -m "TASK-1: x" && head -n 5 README.md').status, 0, '-n of another command');
  assert.equal(guard(root, 'git commit -m "TASK-1: handle -n in docs"').status, 0, '-n inside the message');
  assert.equal(guard(root, 'git push origin sprint/999').status, 0);
  assert.equal(guard(root, "git commit -F msg.txt", 'PowerShell').status, 0);
});

test('blocks any git commit, push, merge or pull while the hooks are not installed', () => {
  const root = repo({ hooks: false });
  const run = guard(root, 'git commit -m "TASK-1: anything"');
  assert.equal(run.status, 2);
  assert.match(run.stderr, /npm run setup/);
});

test('blocks merging a pull request on GitHub, which skips every local check', () => {
  const root = repo();
  assert.equal(guard(root, 'gh pr merge 1 --merge').status, 2);
});

test('blocks the skip flag and core.hooksPath anywhere in the text, however the command is wrapped', () => {
  const root = repo();
  for (const command of [
    'git commit --no-verify -m "TASK-1: x"',
    'git commit "--no-veri" -m "TASK-1: x"',
    'bash -c "git commit --no-verify -m x"',
    'git push --no-verify origin main',
    'git merge --no-verify sprint/999',
    'git -c core.hooksPath=/dev/null commit -m x',
    'git config core.hooksPath /tmp/none && git commit -m x',
  ]) {
    assert.equal(guard(root, command).status, 2, command);
  }
  assert.equal(guard(root, 'git commit --no-verify -m x', 'PowerShell').status, 2, 'PowerShell');
});

test('blocks -n in a flag cluster after commit, also when wrapped', () => {
  const root = repo();
  for (const command of [
    'git commit -n -m x',
    'git commit -qn -m x',
    'bash -c "git commit -n -m x"',
    'cmd /c "git commit -n -m x"',
    'git commit -m x \\\n  -n',
    'git commit -m "fix A; tidy B" -n',
  ]) {
    const run = guard(root, command);
    assert.equal(run.status, 2, command);
    assert.match(run.stderr, /-n on a commit/);
  }
});

// --- the close gates (run by commit-msg on every close) ----------------------------------------------------

test('blocks an unprepared close and names every failing gate', () => {
  const root = repo();
  write(root, 'src/new.txt', 'untracked\n');
  const run = gates(root);
  assert.equal(run.status, 2);
  for (const gate of ['sprint-log', 'reviews', 'local-ci', 'untracked']) assert.match(run.stderr, new RegExp(`\\[${gate}\\]`));
});

test('allows a fully prepared close', () => {
  const root = closable();
  const run = gates(root);
  assert.equal(run.status, 0, run.stderr);
});

test('allows the very first close in a repository with no commits yet', () => {
  const root = closable({ commit: false });
  const run = gates(root);
  assert.equal(run.status, 0, run.stderr);
});

test('a code change after the review invalidates the review and the CI record', () => {
  const root = closable();
  write(root, 'src/game.txt', 'changed after review\n');
  git(root, 'add', '-A');
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*scope hash differs/);
  assert.match(run.stderr, /\[local-ci\].*files changed/);
});

test('finishing the sprint log after the review needs only a fresh CI run', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { retro: 'Retrospective written after the review.' }));
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 999](SPRINT-999.md) | Title | complete | 38 tests |\n');
  write(root, 'ROADMAP.md', 'Follow-ups routed at close.\n');
  git(root, 'add', '-A');
  const stale = gates(root);
  assert.equal(stale.status, 2);
  assert.doesNotMatch(stale.stderr, /\[reviews\]/);
  writeCiRecord(root, { result: 'pass' });
  assert.equal(gates(root).status, 0);
});

test('changing the reviewed part of the sprint log, or the sprint template, after the review forces a re-review', () => {
  for (const change of [
    (root) => write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { plan: 'A ruling quietly rewritten.' })),
    (root) => write(root, 'docs/sprints/TEMPLATE.md', '# Template changed after review\n'),
  ]) {
    const root = closable();
    change(root);
    git(root, 'add', '-A');
    writeCiRecord(root, { result: 'pass' });
    const run = gates(root);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /\[reviews\].*scope hash differs/);
  }
});

test('the sprint header status changing to complete after the review needs no re-review', () => {
  const root = repo();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'in-progress' }));
  prepareCloseKeepingLog(root);
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'complete' }));
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 0, run.stderr);
});

test('changing a task status in the sprint log after the review forces a re-review', () => {
  const root = repo();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { task: 'blocked' }));
  prepareCloseKeepingLog(root);
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { task: 'complete' }));
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*scope hash differs/);
});

test('changing the previous-close row after the review forces a re-review (it is filled at sprint start)', () => {
  const root = repo();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { previousClose: 'run 1: success' }));
  prepareCloseKeepingLog(root);
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { previousClose: 'run 2: success' }));
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*scope hash differs/);
});

test('a completed task in the log does not make an unfinished sprint look complete', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'in-progress' }));
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 999](SPRINT-999.md) | in-progress |\n');
  git(root, 'add', '-A');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /header status is not "complete"/);
  assert.match(run.stderr, /does not list Sprint 999 as complete/);
});

test('a new commit after the review invalidates the review stamp', () => {
  const root = closable();
  git(root, 'commit', '-q', '-m', 'TASK-999: sneaked in');
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*stamped at/);
});

test('a BLOCKED verdict blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /verdict is BLOCKED/);
});

test('a reviewer that did not run on Fable blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { reviewerModel: 'claude-opus-5-5' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /must run on Fable/);
});

test('a failed CI record blocks the close', () => {
  const root = closable();
  writeCiRecord(root, { result: 'fail' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[local-ci\].*"fail"/);
});

test('an untracked file blocks the close', () => {
  const root = closable();
  write(root, 'tests/forgotten.test.txt', 'never staged\n');
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[untracked\] untracked files: tests\/forgotten\.test\.txt/);
});

test('an unstaged change blocks the close even when the hashes match', () => {
  const root = closable({ commit: true });
  write(root, 'src/game.txt', 'edited but not staged\n');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[untracked\] unstaged changes: src\/game\.txt/);
});

test('an incomplete or unlisted sprint log blocks the close', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', '| **Status** | in-progress |\n');
  write(root, 'docs/sprints/INDEX.md', 'nothing here\n');
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = gates(root);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /header status is not "complete"/);
  assert.match(run.stderr, /does not link SPRINT-999\.md/);
});

test('a waiver bypasses only its own gate', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  write(root, '.claude/reviews/SPRINT-999-reviews-WAIVED.md', 'Owner accepted the findings.\n');
  assert.equal(gates(root).status, 0);
  writeCiRecord(root, { result: 'fail' });
  assert.equal(gates(root).status, 2);
});

test('the documented waiver file name for the untracked gate works', () => {
  const root = closable();
  write(root, 'notes/scratch.txt', 'left untracked on purpose\n');
  writeCiRecord(root, { result: 'pass' });
  stampReviews(root, 999);
  assert.equal(gates(root).status, 2);
  write(root, '.claude/reviews/SPRINT-999-untracked-WAIVED.md', 'Owner: scratch file stays out of the commit.\n');
  const run = gates(root);
  assert.equal(run.status, 0, run.stderr);
});

// --- the GitHub gate fails closed --------------------------------------------------------------------

test('a GitHub CI run that is red, cancelled, unfinished, missing, stale or unreadable blocks the close', () => {
  const root = closable();
  const cases = {
    failure: /did not succeed \(failure\)/,
    cancelled: /did not succeed \(cancelled\)/,
    in_progress: /has not finished/,
    none: /no GitHub CI run found/,
    stale: /not the last pushed commit/,
    error: /\[github-ci\] the gate itself failed/,
  };
  for (const [mock, message] of Object.entries(cases)) {
    const run = gates(root, { TEMUCIV_CI_HEALTH_MOCK: mock });
    assert.equal(run.status, 2, mock);
    assert.match(run.stderr, message, mock);
  }
});

test('the CI mock is ignored for any sprint other than the harness-reserved 999', () => {
  const root = repo();
  prepareClose(root, 5);
  // A leaked mock must not decide anything for a real sprint. This throwaway repository has never been
  // pushed (no origin/main), so there is no remote CI state to check and the close is allowed.
  const run = gates(root, { TEMUCIV_CI_HEALTH_MOCK: 'failure' }, '5');
  assert.equal(run.status, 0, run.stderr);
});
