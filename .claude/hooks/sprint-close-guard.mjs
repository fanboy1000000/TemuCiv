// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// Blocks a sprint-close commit (a `git commit` whose message contains "S<N> close") unless every close
// gate in docs/WORKFLOW.md ("Mechanical gates") passes. Rules that matter are enforced by a machine,
// not by memory: in the owner's StatsTid project, advisory close rules were skipped within one sprint.
//
// Gates, each waivable by .claude/reviews/SPRINT-<N>-<gate>-WAIVED.md (owner's say-so, reason inside):
//   sprint-log  docs/sprints/SPRINT-N.md exists, status complete, listed in the sprint INDEX
//   reviews     codex + reviewer files exist, not BLOCKED, stamped at HEAD with the current scope hash,
//               and the reviewer ran on Fable
//   local-ci    `npm run ci` passed on exactly the files on disk now
//   staging     no untracked files and no unstaged changes: what was checked is what gets committed
//   github-ci   the latest completed push run on main is not a failure (fails open without gh)
//
// Exit 2 blocks the tool call and shows stderr to Claude. Unparseable input is allowed (it cannot be a
// command we recognise). An error inside a gate counts as that gate failing: a guard that crashes open
// is a guard that silently stops guarding.
//
// Test seam: TEMUCIV_CI_HEALTH_MOCK=success|failure replaces the gh call, honoured ONLY for the
// harness-reserved sprint number 999, so a leaked environment variable can never disable a real gate.
//
// Known limitation: detection reads the command text, so a command that merely mentions a close commit
// (e.g. inside an echo) is checked too, and a message passed with -F is invisible. WORKFLOW.md step 8
// therefore requires -m or a heredoc.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CI_RECORD, REVIEW_EXCLUDE, git, gitHead, scopeHash } from '../../tools/lib/repo.mjs';

const HARNESS_SPRINT = '999';
const PASSING_VERDICTS = new Set(['APPROVED', 'APPROVED-WITH-WARNINGS']);

let payload;
try {
  const raw = readFileSync(0, 'utf8').replace(/^﻿/, '');
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

if (!['Bash', 'PowerShell'].includes(payload?.tool_name)) process.exit(0);
const command = String(payload?.tool_input?.command ?? '');
if (!/\bgit\s+(?:-[cC]\s+\S+\s+)*commit\b/i.test(command)) process.exit(0);
const marker = command.match(/\bS(\d+)\s+close\b/i);
if (!marker) process.exit(0);

const sprint = marker[1];
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = (p) => join(root, p);
const readIfExists = (p) => (existsSync(rel(p)) ? readFileSync(rel(p), 'utf8') : null);
const waived = (gate) => existsSync(rel(`.claude/reviews/SPRINT-${sprint}-${gate}-WAIVED.md`));
const lastMatch = (text, rx) => [...text.matchAll(rx)].pop()?.[1];
const listed = (items) => (items.length > 8 ? `${items.slice(0, 8).join(', ')} and ${items.length - 8} more` : items.join(', '));

const head = gitHead(root) ?? '(none)';
const sameCommit = (stamped) => !!stamped && (stamped === head || (stamped.length >= 7 && head.startsWith(stamped)));

const gates = {
  'sprint-log': () => {
    const log = readIfExists(`docs/sprints/SPRINT-${sprint}.md`);
    if (log === null) return [`docs/sprints/SPRINT-${sprint}.md does not exist`];
    const problems = [];
    if (!/^\|\s*\*\*Status\*\*\s*\|\s*complete\b/im.test(log)) problems.push(`SPRINT-${sprint}.md status is not "complete"`);
    const index = readIfExists('docs/sprints/INDEX.md') ?? '';
    if (!index.includes(`(SPRINT-${sprint}.md)`)) problems.push(`docs/sprints/INDEX.md does not link SPRINT-${sprint}.md`);
    return problems;
  },

  reviews: () => {
    const problems = [];
    const currentHash = scopeHash(root, REVIEW_EXCLUDE);
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

  staging: () => {
    const status = git(root, ['status', '--porcelain', '--untracked-files=all']);
    const problems = [];
    const untracked = status.split('\n').filter((l) => l.startsWith('??'));
    const unstaged = status.split('\n').filter((l) => /^.[MD]/.test(l));
    if (untracked.length) problems.push(`untracked files: ${listed(untracked.map((l) => l.slice(3)))}`);
    if (unstaged.length) problems.push(`unstaged changes: ${listed(unstaged.map((l) => l.slice(3)))}; stage first, in a separate command`);
    return problems;
  },

  'github-ci': () => {
    let conclusion;
    if (sprint === HARNESS_SPRINT && process.env.TEMUCIV_CI_HEALTH_MOCK) {
      conclusion = process.env.TEMUCIV_CI_HEALTH_MOCK;
    } else {
      try {
        const out = execFileSync(
          'gh',
          ['run', 'list', '--branch', 'main', '--event', 'push', '--status', 'completed', '--limit', '1', '--json', 'conclusion,url'],
          { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 },
        );
        const [run] = JSON.parse(out);
        conclusion = run?.conclusion;
        if (conclusion === 'failure') return [`the latest GitHub CI run on main failed: ${run.url}`];
      } catch (err) {
        process.stderr.write(`sprint-close-guard: github-ci gate could not ask GitHub (${err.message.split('\n')[0]}); allowing.\n`);
        return [];
      }
    }
    return conclusion === 'failure' ? ['the latest GitHub CI run on main failed'] : [];
  },
};

const failures = [];
for (const [gate, check] of Object.entries(gates)) {
  if (waived(gate)) {
    process.stderr.write(`sprint-close-guard: gate "${gate}" waived for S${sprint}.\n`);
    continue;
  }
  let problems;
  try {
    problems = check();
  } catch (err) {
    problems = [`the gate itself failed: ${err.message.split('\n')[0]}`];
  }
  for (const p of problems) failures.push(`[${gate}] ${p}`);
}

if (failures.length) {
  process.stderr.write(
    `sprint-close-guard: S${sprint} close commit BLOCKED (docs/WORKFLOW.md, "Mechanical gates"):\n` +
      failures.map((f) => `  - ${f}`).join('\n') +
      `\nFix each item, or, only on the owner's say-so, add .claude/reviews/SPRINT-${sprint}-<gate>-WAIVED.md with the reason.\n`,
  );
  process.exit(2);
}
process.exit(0);
