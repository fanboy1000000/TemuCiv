// The sprint-close gates (docs/WORKFLOW.md, "Mechanical gates"), shared by the two places that enforce them:
//   - the git commit-msg hook (.githooks/commit-msg), which reads the real commit message and is the
//     authoritative check, whatever form the commit command took;
//   - the Claude Code PreToolUse guard (.claude/hooks/sprint-close-guard.mjs), which gives early feedback
//     and blocks attempts to skip the git hooks.
//
// Gates, each waivable by .claude/reviews/SPRINT-<N>-<gate>-WAIVED.md (owner's say-so, reason inside):
//   sprint-log  docs/sprints/SPRINT-N.md exists, status complete, listed in the sprint INDEX
//   reviews     codex + reviewer files exist, not BLOCKED, stamped at HEAD with the current scope hash,
//               and the reviewer ran on Fable
//   local-ci    `npm run ci` passed on exactly the project files on disk now
//   untracked   no untracked files and no unstaged changes: what was checked is what gets committed
//   github-ci   the latest CI run for the last push to main finished and succeeded (fails closed)
//
// An error inside a gate counts as that gate failing: a guard that crashes open silently stops guarding.
//
// A commit that marks a sprint log complete is a close, whatever its subject (see sprintsMarkedComplete).
//
// Test seam: TEMUCIV_CI_HEALTH_MOCK=success|failure|cancelled|in_progress|stale|none|error replaces the GitHub
// call, honoured ONLY for the harness-reserved sprint number 999, so a leaked variable can never decide a
// real gate.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CI_RECORD, git, gitHead, reviewScopeHash, scopeHash } from './repo.mjs';

export const HARNESS_SPRINT = '999';
export const GATES = ['sprint-log', 'reviews', 'local-ci', 'untracked', 'github-ci'];
const PASSING_VERDICTS = new Set(['APPROVED', 'APPROVED-WITH-WARNINGS']);

/**
 * Classify a commit message by its subject line (the first line that is not a git comment).
 * Returns { sprint } for a well-formed close ("S<N> close: <title>"), { malformed } for a subject that looks
 * like a close but isn't in exactly that form (so it can't slip past as an ordinary commit), or null.
 */
export function classifyMessage(message) {
  const subject = String(message)
    .split(/\r?\n/)
    .find((line) => line.trim() !== '' && !line.startsWith('#'));
  if (!subject) return null;
  const exact = subject.match(/^S(\d+) close: \S/);
  if (exact) return { sprint: exact[1] };
  if (/^\s*s\s*\d+\s*[-:]?\s*close\b/i.test(subject)) return { malformed: subject.trim() };
  return null;
}

/**
 * Whether a sprint log's own header says it is complete. Only the metadata table before the first "## "
 * heading counts: task tables further down also have a Status row, and a finished task must never make an
 * unfinished sprint look complete.
 */
export function logSaysComplete(text) {
  const header = String(text ?? '').split(/^## /m)[0];
  return /^\|\s*\*\*Status\*\*\s*\|\s*complete\s*\|/im.test(header);
}

/** Whether docs/sprints/INDEX.md lists sprint N with the status "complete". */
export function indexSaysComplete(indexText, sprint) {
  const row = String(indexText ?? '')
    .split(/\r?\n/)
    .find((line) => line.includes(`(SPRINT-${sprint}.md)`));
  return !!row && /\|\s*complete\s*\|/i.test(row);
}

/**
 * Sprints whose log this commit marks complete: the staged log's header says complete and HEAD's did not.
 * Completing a sprint is what a close does, so such a commit must carry the close subject.
 */
export function sprintsMarkedComplete(root) {
  const staged = git(root, ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
  const show = (spec) => {
    try {
      return git(root, ['show', spec]);
    } catch {
      return null;
    }
  };
  return staged
    .map((path) => [path, path.match(/^docs\/sprints\/SPRINT-(\d+)\.md$/)?.[1]])
    .filter(([path, n]) => n && logSaysComplete(show(`:${path}`)) && !logSaysComplete(show(`HEAD:${path}`)))
    .map(([, n]) => n);
}

/** The commit origin/main points at locally, or null if main was never pushed (or fetched). */
export function remoteMainSha(root) {
  try {
    return git(root, ['rev-parse', '--verify', '-q', 'refs/remotes/origin/main']).trim() || null;
  } catch {
    return null;
  }
}

function latestRun(root, sprint, env) {
  if (sprint === HARNESS_SPRINT && env.TEMUCIV_CI_HEALTH_MOCK) {
    const mock = env.TEMUCIV_CI_HEALTH_MOCK;
    if (mock === 'error') throw new Error('mocked GitHub error');
    if (mock === 'none') return { pushed: 'mock', run: undefined };
    if (mock === 'stale') return { pushed: 'mock', run: { status: 'completed', conclusion: 'success', headSha: 'older', url: 'mock' } };
    const finished = mock !== 'in_progress';
    return {
      pushed: 'mock',
      run: { status: finished ? 'completed' : 'in_progress', conclusion: finished ? mock : '', headSha: 'mock', url: 'mock' },
    };
  }
  const pushed = remoteMainSha(root);
  if (!pushed) return { pushed: null };
  const out = execFileSync(
    'gh',
    ['run', 'list', '--workflow', 'ci.yml', '--branch', 'main', '--event', 'push', '--limit', '1', '--json', 'status,conclusion,headSha,url'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 },
  );
  return { pushed, run: JSON.parse(out)[0] };
}

function gateChecks(root, sprint, env) {
  const rel = (p) => join(root, p);
  const readIfExists = (p) => (existsSync(rel(p)) ? readFileSync(rel(p), 'utf8') : null);
  const lastMatch = (text, rx) => [...text.matchAll(rx)].pop()?.[1];
  const listed = (items) => (items.length > 8 ? `${items.slice(0, 8).join(', ')} and ${items.length - 8} more` : items.join(', '));
  const head = gitHead(root) ?? '(none)';
  const sameCommit = (stamped) => !!stamped && (stamped === head || (stamped.length >= 7 && head.startsWith(stamped)));

  return {
    'sprint-log': () => {
      const log = readIfExists(`docs/sprints/SPRINT-${sprint}.md`);
      if (log === null) return [`docs/sprints/SPRINT-${sprint}.md does not exist`];
      const problems = [];
      if (!logSaysComplete(log)) problems.push(`SPRINT-${sprint}.md header status is not "complete"`);
      const index = readIfExists('docs/sprints/INDEX.md') ?? '';
      if (!index.includes(`(SPRINT-${sprint}.md)`)) problems.push(`docs/sprints/INDEX.md does not link SPRINT-${sprint}.md`);
      else if (!indexSaysComplete(index, sprint)) problems.push(`docs/sprints/INDEX.md does not list Sprint ${sprint} as complete`);
      return problems;
    },

    reviews: () => {
      const problems = [];
      const currentHash = reviewScopeHash(root);
      for (const lens of ['codex', 'reviewer']) {
        const file = `.claude/reviews/SPRINT-${sprint}-${lens}.md`;
        const text = readIfExists(file);
        if (text === null) {
          problems.push(`${file} is missing`);
          continue;
        }
        const verdict = lastMatch(text, /^verdict:\s*([A-Z-]+)/gim)?.toUpperCase();
        if (!verdict) problems.push(`${file} has no verdict: line`);
        else if (!PASSING_VERDICTS.has(verdict)) problems.push(`${file} verdict is ${verdict}`);
        const stamped = text.match(/^reviewed-against-commit:\s*(\S+)/im)?.[1];
        if (!sameCommit(stamped)) problems.push(`${file} was stamped at ${stamped ?? '(no stamp)'}, but HEAD is ${head}`);
        const hash = text.match(/^reviewed-scope-hash:\s*([0-9a-f]{64})/im)?.[1];
        if (hash !== currentHash) problems.push(`${file}: reviewed files changed since the review (scope hash differs); re-review`);
        if (lens === 'reviewer' && !/^reviewed-by-model:\s*claude-fable-\S+/im.test(text)) {
          problems.push(`${file} has no "reviewed-by-model: claude-fable-..." line; the reviewer must run on Fable`);
        }
      }
      return problems;
    },

    'local-ci': () => {
      const raw = readIfExists(CI_RECORD);
      if (raw === null) return ['no CI record; run `npm run ci`'];
      const record = JSON.parse(raw);
      const problems = [];
      if (record.result !== 'pass') problems.push(`the last \`npm run ci\` result is "${record.result}"`);
      if (record.head !== head) problems.push(`the last CI run was at ${record.head}, but HEAD is ${head}`);
      if (record.scopeHash !== scopeHash(root)) problems.push('files changed since the last `npm run ci`; run it again, last');
      return problems;
    },

    untracked: () => {
      const status = git(root, ['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all']);
      const lines = status.split('\n').filter(Boolean);
      const problems = [];
      const untracked = lines.filter((l) => l.startsWith('??'));
      const unstaged = lines.filter((l) => /^.[MD]/.test(l));
      if (untracked.length) problems.push(`untracked files: ${listed(untracked.map((l) => l.slice(3)))}`);
      if (unstaged.length) problems.push(`unstaged changes: ${listed(unstaged.map((l) => l.slice(3)))}; stage first, in a separate command`);
      return problems;
    },

    'github-ci': () => {
      const { pushed, run } = latestRun(root, sprint, env);
      if (pushed === null) return []; // main was never pushed: there is no remote CI state to be red
      if (!run) return ['no GitHub CI run found for pushes to main; check GitHub'];
      if (run.status !== 'completed') return [`the latest GitHub CI run on main has not finished (${run.status}): ${run.url}; wait for it`];
      if (run.conclusion !== 'success') return [`the latest GitHub CI run on main did not succeed (${run.conclusion || 'no conclusion'}): ${run.url}`];
      if (run.headSha !== pushed) {
        return [`the latest GitHub CI run is for ${String(run.headSha).slice(0, 7)}, not the last pushed commit ${pushed.slice(0, 7)}; fetch, or wait for CI`];
      }
      return [];
    },
  };
}

/** Run every close gate for sprint N. Returns { failures: ["[gate] problem", ...], waived: [gate, ...] }. */
export function checkCloseGates(root, sprint, env = process.env) {
  const checks = gateChecks(root, sprint, env);
  const failures = [];
  const waived = [];
  for (const gate of GATES) {
    if (existsSync(join(root, `.claude/reviews/SPRINT-${sprint}-${gate}-WAIVED.md`))) {
      waived.push(gate);
      continue;
    }
    let problems;
    try {
      problems = checks[gate]();
    } catch (err) {
      problems = [`the gate itself failed: ${String(err.message).split('\n')[0]}`];
    }
    for (const p of problems) failures.push(`[${gate}] ${p}`);
  }
  return { failures, waived };
}

/** The message both enforcement points print when a close is blocked. */
export function blockedMessage(sprint, failures) {
  return (
    `S${sprint} close commit BLOCKED (docs/WORKFLOW.md, "Mechanical gates"):\n` +
    failures.map((f) => `  - ${f}`).join('\n') +
    `\nFix each item, or, only on the owner's say-so, add .claude/reviews/SPRINT-${sprint}-<gate>-WAIVED.md with the reason.\n`
  );
}
