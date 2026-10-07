// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The authoritative close check is the git commit-msg hook (.githooks/commit-msg), which reads the real
// commit message. This guard protects that hook and gives early feedback, for any command that runs
// `git commit` (git, git.exe, with -C, -c or --no-pager before the subcommand):
//   1. The repository's hooks must be installed (core.hooksPath = .githooks; `npm run setup`), or the
//      commit is blocked: without them nothing checks the close.
//   2. Skipping or redirecting the hooks (--no-verify, -n, -c core.hooksPath=...) is blocked.
//   3. When the command text shows a sprint-close message, every close gate (tools/lib/close-gates.mjs)
//      is checked now, before git runs, so a blocked close is explained up front.
//
// Exit 2 blocks the tool call and shows stderr to Claude. Unparseable input is allowed (it cannot be a
// command we recognise). Rules that matter are enforced by a machine, not by memory: in the owner's
// StatsTid project, advisory close rules were skipped within one sprint.

import { readFileSync } from 'node:fs';
import { blockedMessage, checkCloseGates, classifyMessage } from '../../tools/lib/close-gates.mjs';
import { git } from '../../tools/lib/repo.mjs';

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
} catch {
  process.exit(0);
}
if (!['Bash', 'PowerShell'].includes(payload?.tool_name)) process.exit(0);
const command = String(payload?.tool_input?.command ?? '');

// Quoted text is blanked before looking at flags, so a message that mentions "-n" isn't mistaken for one.
const unquoted = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
const COMMIT = /\bgit(?:\.exe)?((?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*)\s+commit\b([^\n;&|]*)/gi;
const commits = [...unquoted.matchAll(COMMIT)];
if (commits.length === 0) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const block = (why) => {
  process.stderr.write(`sprint-close-guard: ${why}\n`);
  process.exit(2);
};

for (const [, globalOpts, commitArgs] of commits) {
  if (/core\.hooksPath/i.test(globalOpts)) block('overriding core.hooksPath on a commit skips the close checks. Remove the override.');
  if (/(?:^|\s)--no-verify\b/.test(commitArgs) || /(?:^|\s)-[a-zA-Z]*n[a-zA-Z]*(?=\s|$)/.test(commitArgs)) {
    block('--no-verify / -n skips the commit hooks that enforce the close gates and the secret scan. Remove it.');
  }
}

let hooksPath = '';
try {
  hooksPath = git(root, ['config', '--get', 'core.hooksPath']).trim();
} catch {
  hooksPath = '';
}
if (hooksPath.replace(/\\/g, '/').replace(/\/$/, '') !== '.githooks') {
  block(
    `the repository's git hooks are not installed (core.hooksPath is "${hooksPath || 'unset'}"), so nothing would check ` +
      'this commit. Run `npm run setup` once, then commit again.',
  );
}

// Early check: a close message visible in the command text. The commit-msg hook checks every other form.
const close = command
  .split(/\s-m\s+|\s--message[=\s]+|<<-?\s*['"]?\w+['"]?\s*\n/)
  .slice(1)
  .map((part) => classifyMessage(part.replace(/^["']/, '')))
  .find(Boolean);
if (close?.malformed) block(`"${close.malformed}" looks like a sprint close but isn't in the form "S<N> close: <title>".`);
if (close?.sprint) {
  const { failures, waived } = checkCloseGates(root, close.sprint);
  for (const gate of waived) process.stderr.write(`sprint-close-guard: gate "${gate}" waived for S${close.sprint}.\n`);
  if (failures.length) block(blockedMessage(close.sprint, failures));
}
process.exit(0);
