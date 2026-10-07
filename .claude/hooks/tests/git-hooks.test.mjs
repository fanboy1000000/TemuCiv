// Tests for the versioned git hooks (.githooks) and the tools behind them: the commit-msg hook that
// enforces the close gates on the real commit message, the pre-commit secret scan, and the review stamp's
// refusal to stamp uncommitted work. These make real commits in throwaway repositories.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { scanText } from '../../../tools/lib/secrets.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { REPO_ROOT, cleanup, commitWithHooks, git, gitWithHooks, makeRepo, prepareClose, sprintLog, write } from './helpers.mjs';

const OK_ENV = { TEMUCIV_CI_HEALTH_MOCK: 'success' };
const repos = [];
const repo = (opts) => {
  const r = makeRepo(opts);
  repos.push(r);
  return r;
};
after(() => repos.forEach(cleanup));

// Fake credentials are assembled at run time so no secret-shaped string is ever stored in this repository.
const FAKE = {
  'GitHub token': 'gh' + 'p_' + 'a1B2'.repeat(9),
  'Anthropic API key': 'sk-' + 'ant-' + 'x'.repeat(30),
  'AWS access key': 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP',
  'private key': '-----BEGIN ' + 'RSA PRIVATE ' + 'KEY-----',
};

// --- commit-msg: the authoritative close check ---------------------------------------------------------

test('commit-msg blocks an unprepared close, whatever form the message takes', () => {
  const root = repo();
  write(root, 'src/game.txt', 'changed\n');
  git(root, 'add', '-A');
  write(root, '.git/MSG', 'S999 close: via a message file\n');
  for (const args of [['-F', '.git/MSG'], ['-m', 'S999 close: via -m']]) {
    const run = commitWithHooks(root, args, { env: OK_ENV });
    assert.notEqual(run.status, 0, args.join(' '));
    assert.match(run.stderr, /S999 close commit BLOCKED/);
  }
});

test('commit-msg allows a fully prepared close made with -F', () => {
  const root = repo();
  prepareClose(root, 999);
  write(root, '.git/MSG', 'S999 close: prepared\n\nBody text.\n');
  const run = commitWithHooks(root, ['-F', '.git/MSG'], { env: OK_ENV });
  assert.equal(run.status, 0, run.stderr);
});

test('commit-msg refuses a subject that looks like a close but is malformed', () => {
  const root = repo();
  write(root, 'src/game.txt', 'changed\n');
  git(root, 'add', '-A');
  const run = commitWithHooks(root, ['-m', 's999 close - informal'], { env: OK_ENV });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /isn't in the form/);
});

test('commit-msg refuses an ordinary commit that marks a sprint log complete', () => {
  const root = repo();
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'in-progress' }));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'TASK-1: start the log');
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'complete' }));
  git(root, 'add', '-A');
  const run = commitWithHooks(root, ['-m', 'Sprint 999 close: wrapping up'], { env: OK_ENV });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /marks Sprint 999 complete, which only a close commit may do/);
});

test('commit-msg lets ordinary commits through, even when the body mentions a close', () => {
  const root = repo();
  write(root, 'src/game.txt', 'changed\n');
  git(root, 'add', '-A');
  const run = commitWithHooks(root, ['-m', 'TASK-101: hex grid', '-m', 'Ready for the S999 close.']);
  assert.equal(run.status, 0, run.stderr);
});

// --- main only receives reviewed closes ----------------------------------------------------------------

test('commit-msg refuses any commit on main', () => {
  const root = repo();
  git(root, 'switch', '-q', 'main');
  write(root, 'src/game.txt', 'changed on main\n');
  git(root, 'add', '-A');
  const run = commitWithHooks(root, ['-m', 'TASK-1: straight onto main']);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /no commits on main/);
});

/** A throwaway repository with a bare remote called origin. */
function repoWithRemote() {
  const root = repo();
  const remote = mkdtempSync(join(tmpdir(), 'temuciv-remote-'));
  repos.push(remote);
  git(remote, 'init', '-q', '--bare');
  git(root, 'remote', 'add', 'origin', remote);
  return root;
}

test('pre-push refuses pushing main at a task commit', () => {
  const root = repoWithRemote();
  write(root, 'src/game.txt', 'task work\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'TASK-1: unreviewed work');
  git(root, 'branch', '-f', 'main', 'HEAD');
  const refused = gitWithHooks(root, ['push', '-q', 'origin', 'main']);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /refusing to push main at "TASK-1: unreviewed work"/);
  assert.equal(gitWithHooks(root, ['push', '-q', 'origin', 'sprint/999']).status, 0, 'a sprint branch may be pushed');
});

test('pre-push lets main advance to a close made through the hooks, but not to one made with them switched off', () => {
  // The same prepared close, committed twice: once with the hooks off (no receipt), once through them.
  const root = repoWithRemote();
  prepareClose(root, 999);
  git(root, 'commit', '-q', '-m', 'S999 close: hooks switched off');
  git(root, 'branch', '-f', 'main', 'HEAD');
  const refused = gitWithHooks(root, ['push', '-q', 'origin', 'main']);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /no record that this close passed the close gates/);

  git(root, 'reset', '-q', '--soft', 'HEAD~1');
  const made = commitWithHooks(root, ['-m', 'S999 close: through the hooks'], { env: OK_ENV });
  assert.equal(made.status, 0, made.stderr);
  git(root, 'branch', '-f', 'main', 'HEAD');
  const allowed = gitWithHooks(root, ['push', '-q', 'origin', 'main']);
  assert.equal(allowed.status, 0, allowed.stderr);
});

// --- pre-commit: secret scan ------------------------------------------------------------------------------

test('the secret patterns find each known credential format and ignore ordinary text', () => {
  for (const [kind, value] of Object.entries(FAKE)) {
    assert.deepEqual(scanText(`const x = "${value}";`).map((f) => f.kind).includes(kind), true, kind);
  }
  assert.deepEqual(scanText('const sky = "blue"; // sk- prefix alone, ghp_short, AKIA too short'), []);
});

test('pre-commit refuses a commit that stages a secret, and names the file without printing the secret', () => {
  const root = repo();
  write(root, 'src/config.txt', `token = ${FAKE['GitHub token']}\n`);
  git(root, 'add', '-A');
  const run = commitWithHooks(root, ['-m', 'TASK-1: config']);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /src\/config\.txt:1\s+GitHub token/);
  assert.doesNotMatch(run.stderr, new RegExp(FAKE['GitHub token']));
});

// --- review stamp ----------------------------------------------------------------------------------------

const stamp = (root) =>
  spawnSync(process.execPath, [join(REPO_ROOT, 'tools/review-stamp.mjs')], { cwd: root, encoding: 'utf8' });

test('the review stamp refuses while reviewable files are uncommitted, but not for close paperwork', () => {
  const root = repo();
  write(root, 'src/new.txt', 'not committed yet\n');
  write(root, 'docs/sprints/SPRINT-999.md', sprintLog(999, { status: 'in-progress' }));
  const refused = stamp(root);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /src\/new\.txt/);
  assert.match(refused.stderr, /SPRINT-999\.md/);

  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'TASK-1: new');
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 999](SPRINT-999.md) | complete |\n');
  write(root, 'ROADMAP.md', 'backlog updated at close\n');
  const ok = stamp(root);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^reviewed-against-commit: [0-9a-f]{40}\nreviewed-scope-hash: [0-9a-f]{64}\n$/);
});
