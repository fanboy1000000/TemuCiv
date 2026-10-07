// Tests for the sprint-close guard (the PreToolUse hook) and the close gates it shares with the commit-msg
// hook. Each test builds a throwaway git repository, prepares (or breaks) one gate, and runs the hook
// exactly as Claude Code would. Sprint 999 is the harness-reserved number that lets TEMUCIV_CI_HEALTH_MOCK
// replace the GitHub call.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { writeCiRecord } from '../../../tools/lib/repo.mjs';
import { bash, cleanup, git, makeRepo, prepareClose, runHook, sprintLog, stampReviews, write } from './helpers.mjs';

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
const guard = (root, command, env = OK_ENV) => runHook(HOOK, bash(command), { cwd: root, env });

// --- what the guard looks at -------------------------------------------------------------------------

test('ignores commands that are not commits, including a close marker outside a commit', () => {
  const root = repo();
  assert.equal(guard(root, 'git status && echo "S999 close"').status, 0);
  assert.equal(guard(root, 'echo "git commit -m S999 close: x"').status, 0);
});

test('ignores ordinary commits without a close marker', () => {
  const root = repo();
  assert.equal(guard(root, 'git commit -m "TASK-101: add hex grid"').status, 0);
  assert.equal(guard(root, 'git commit -m "TASK-102: prepare for the S999 close"').status, 0);
});

test('ignores other tools and unparseable input', () => {
  const root = repo();
  assert.equal(runHook(HOOK, { tool_name: 'Read', tool_input: { file_path: 'x' } }, { cwd: root }).status, 0);
  assert.equal(runHook(HOOK, 'not json', { cwd: root }).status, 0);
});

test('recognises every form of the commit command: PowerShell, git -C, git.exe, git --no-pager, heredocs', () => {
  const root = repo(); // nothing prepared, so a recognised close must be blocked
  const forms = [
    "git -C . commit -m 'S999 close: x'",
    'git.exe commit -m "S999 close: x"',
    'git --no-pager commit -m "S999 close: x"',
    'git -c user.name=x commit --message="S999 close: x"',
    "git commit -F - <<'EOF'\nS999 close: x\nEOF",
    'git commit -m "$(cat <<\'EOF\'\nS999 close: x\n\nBody.\nEOF\n)"',
  ];
  for (const command of forms) assert.equal(guard(root, command).status, 2, command);
  const ps = { tool_name: 'PowerShell', tool_input: { command: "git commit -m 'S999 close: x'" } };
  assert.equal(runHook(HOOK, ps, { cwd: root, env: OK_ENV }).status, 2);
});

// --- protecting the git hooks ------------------------------------------------------------------------

test('blocks any commit while the git hooks are not installed', () => {
  const root = repo({ hooks: false });
  const run = guard(root, 'git commit -m "TASK-101: anything"');
  assert.equal(run.status, 2);
  assert.match(run.stderr, /npm run setup/);
});

test('blocks skipping or redirecting the hooks, quoted, abbreviated or chained', () => {
  const root = repo();
  for (const command of [
    'git commit --no-verify -m "TASK-1: x"',
    'git commit -n -m "TASK-1: x"',
    'git commit -qn -m "TASK-1: x"',
    'git commit --no-veri -m "TASK-1: x"',
    'git commit "--no-verify" -F message.txt',
    "git commit '-n' -F message.txt",
    'git "commit" --no-verify -m "TASK-1: x"',
    'git -c core.hooksPath=/dev/null commit -m "TASK-1: x"',
    'git -c "core.hooksPath=/dev/null" commit -m "TASK-1: x"',
    'git config core.hooksPath /tmp/none && git commit -m "TASK-1: x"',
  ]) {
    assert.equal(guard(root, command).status, 2, command);
  }
});

test('does not mistake "-n" inside a message, or a value after -m, for the flag', () => {
  const root = repo();
  assert.equal(guard(root, 'git commit -m "TASK-1: handle -n and --no-verify in docs"').status, 0);
  assert.equal(guard(root, 'git commit -m -n').status, 0);
  assert.equal(guard(root, "git commit -F - <<'EOF'\nTASK-1: docs\n\nExplain --no-verify and git commit -n.\nEOF").status, 0);
});

test('blocks a subject that looks like a close but is not in the exact form', () => {
  const root = closable();
  for (const subject of ['s999 close: lower case', 'S999 close - dash', 'S 999 close: spaced']) {
    const run = guard(root, `git commit -m "${subject}"`);
    assert.equal(run.status, 2, subject);
    assert.match(run.stderr, /isn't in the form/);
  }
});

// --- the gates -------------------------------------------------------------------------------------------

test('blocks an unprepared close and names every failing gate', () => {
  const root = repo();
  write(root, 'src/new.txt', 'untracked\n');
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  for (const gate of ['sprint-log', 'reviews', 'local-ci', 'untracked']) assert.match(run.stderr, new RegExp(`\\[${gate}\\]`));
});

test('allows a fully prepared close', () => {
  const root = closable();
  const run = guard(root, CLOSE);
  assert.equal(run.status, 0, run.stderr);
});

test('allows the very first close in a repository with no commits yet', () => {
  const root = closable({ commit: false });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 0, run.stderr);
});

test('a code change after the review invalidates the review and the CI record', () => {
  const root = closable();
  write(root, 'src/game.txt', 'changed after review\n');
  git(root, 'add', '-A');
  const run = guard(root, CLOSE);
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
  const stale = guard(root, CLOSE);
  assert.equal(stale.status, 2);
  assert.doesNotMatch(stale.stderr, /\[reviews\]/);
  writeCiRecord(root, { result: 'pass' });
  assert.equal(guard(root, CLOSE).status, 0);
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
    const run = guard(root, CLOSE);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /\[reviews\].*scope hash differs/);
  }
});

test('a completed task in the log does not make an unfinished sprint look complete', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'in-progress' }));
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 999](SPRINT-999.md) | in-progress |\n');
  git(root, 'add', '-A');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /header status is not "complete"/);
  assert.match(run.stderr, /does not list Sprint 999 as complete/);
});

test('a new commit after the review invalidates the review stamp', () => {
  const root = closable();
  git(root, 'commit', '-q', '-m', 'TASK-999: sneaked in');
  writeCiRecord(root, { result: 'pass' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[reviews\].*stamped at/);
});

test('a BLOCKED verdict blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /verdict is BLOCKED/);
});

test('a reviewer that did not run on Fable blocks the close', () => {
  const root = closable();
  stampReviews(root, 999, { reviewerModel: 'claude-opus-5-5' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /must run on Fable/);
});

test('a failed CI record blocks the close', () => {
  const root = closable();
  writeCiRecord(root, { result: 'fail' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[local-ci\].*"fail"/);
});

test('an untracked file blocks the close', () => {
  const root = closable();
  write(root, 'tests/forgotten.test.txt', 'never staged\n');
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[untracked\] untracked files: tests\/forgotten\.test\.txt/);
});

test('an unstaged change blocks the close even when the hashes match', () => {
  const root = closable({ commit: true });
  write(root, 'src/game.txt', 'edited but not staged\n');
  stampReviews(root, 999);
  writeCiRecord(root, { result: 'pass' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /\[untracked\] unstaged changes: src\/game\.txt/);
});

test('an incomplete or unlisted sprint log blocks the close', () => {
  const root = closable();
  write(root, 'docs/sprints/SPRINT-999.md', '| **Status** | in-progress |\n');
  write(root, 'docs/sprints/INDEX.md', 'nothing here\n');
  git(root, 'add', '-A');
  writeCiRecord(root, { result: 'pass' });
  const run = guard(root, CLOSE);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /header status is not "complete"/);
  assert.match(run.stderr, /does not link SPRINT-999\.md/);
});

test('a waiver bypasses only its own gate', () => {
  const root = closable();
  stampReviews(root, 999, { verdict: 'BLOCKED' });
  write(root, '.claude/reviews/SPRINT-999-reviews-WAIVED.md', 'Owner accepted the findings.\n');
  assert.equal(guard(root, CLOSE).status, 0);
  writeCiRecord(root, { result: 'fail' });
  assert.equal(guard(root, CLOSE).status, 2);
});

test('the documented waiver file name for the untracked gate works', () => {
  const root = closable();
  write(root, 'notes/scratch.txt', 'left untracked on purpose\n');
  writeCiRecord(root, { result: 'pass' });
  stampReviews(root, 999);
  assert.equal(guard(root, CLOSE).status, 2);
  write(root, '.claude/reviews/SPRINT-999-untracked-WAIVED.md', 'Owner: scratch file stays out of the commit.\n');
  const run = guard(root, CLOSE);
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
    const run = guard(root, CLOSE, { TEMUCIV_CI_HEALTH_MOCK: mock });
    assert.equal(run.status, 2, mock);
    assert.match(run.stderr, message, mock);
  }
});

test('the CI mock is ignored for any sprint other than the harness-reserved 999', () => {
  const root = repo();
  prepareClose(root, 5);
  // A leaked mock must not decide anything for a real sprint. This throwaway repository has never been
  // pushed (no origin/main), so there is no remote CI state to check and the close is allowed.
  const run = guard(root, 'git commit -m "S5 close: real sprint"', { TEMUCIV_CI_HEALTH_MOCK: 'failure' });
  assert.equal(run.status, 0, run.stderr);
});
