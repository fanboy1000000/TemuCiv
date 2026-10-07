// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The real protection is in git: the commit-msg hook checks the close gates and refuses commits on `main`, and
// pre-push lets `main` advance only to a close commit that left a receipt by passing those gates
// (.githooks, tools/hooks). A commit made with its hooks skipped still can't reach GitHub that way. But pre-push
// is itself a hook: what keeps it running is this guard's check for the skip flag and core.hooksPath on a push,
// so those two checks stay essential until GitHub itself protects `main` (backlog).
//
// This guard is a cheap early warning against an agent switching the git hooks off by mistake. It reads the
// command as plain text, with no attempt to parse shells, and blocks a command that mentions git together with
// commit, push, merge or pull when:
//   - the hooks aren't installed (core.hooksPath isn't .githooks; `npm run setup`);
//   - the text contains `--no-v...` (the skip flag or an abbreviation; `--no-verbose` aside) or `core.hooksPath`;
//   - after the word `commit`, in the same command (up to ; & | or a newline, after joining continued lines and
//     setting aside quoted text unless it contains a commit itself), a flag cluster contains n (-n);
//   - `gh pr merge` (gh or gh.exe, options before or after `pr`), which moves `main` on GitHub without any
//     local hook.
// Every check reads the command both as given and with continued lines joined by its shell's rule.
// False alarms are accepted: a commit message that names those words goes through `-F <file>` (a PR body through
// --body-file), and a command that runs `git commit` and, say, `head -n` on one segment is split. Exit 2 blocks.

import { readFileSync } from 'node:fs';
import { git } from '../../tools/lib/repo.mjs';

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
  } catch {
    return 0;
  }
  if (!['Bash', 'PowerShell'].includes(payload?.tool_name)) return 0;
  // Each check reads two versions of the command and blocks if either matches: the text as given, and the text
  // with continued lines joined by that shell's rule (bash drops backslash-newline, so the word carries on;
  // PowerShell's backtick-newline is a space). Joining by the wrong shell's rule, or only joining, can hide a
  // command (a PowerShell path ending in "\" would swallow the next line).
  const raw = String(payload?.tool_input?.command ?? '');
  const joined = payload.tool_name === 'PowerShell' ? raw.replace(/`\r?\n/g, ' ') : raw.replace(/\\\r?\n/g, '');
  const versions = [raw, joined];
  const anyMatch = (rx) => versions.some((v) => rx.test(v));
  if (!anyMatch(/\b(git|gh)(\.exe)?\b/i) || !anyMatch(/\b(commit|push|merge|pull)\b/i)) return 0;

  const block = (why) => {
    process.stderr.write(`sprint-close-guard: ${why}\n`);
    return 2;
  };
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let hooksPath = '';
  try {
    hooksPath = git(root, ['config', '--get', 'core.hooksPath']).trim();
  } catch {
    hooksPath = '';
  }
  if (hooksPath.replace(/\\/g, '/').replace(/\/$/, '') !== '.githooks') {
    return block(`the git hooks aren't installed (core.hooksPath is "${hooksPath || 'unset'}"). Run \`npm run setup\` once, then try again.`);
  }
  if (anyMatch(/--no-v(?!erbose)/i) || anyMatch(/core\.hookspath/i)) {
    return block(
      'this command would switch off or redirect the git hooks (--no-verify or core.hooksPath). They run the secret ' +
        'scan and the close gates. Remove it; if it is only message text, pass the message with -F <file>.',
    );
  }
  if (anyMatch(/\bgh(\.exe)?\b[^;&|\n]*\bpr\b[^;&|\n]*\bmerge\b/i)) {
    return block(
      '`gh pr merge` moves main on GitHub without running the local checks. main only receives reviewed closes, ' +
        'pushed from here. If "merge" is only text (a PR body), pass it with --body-file.',
    );
  }
  // Quoted text is set aside (a message may say "-n"), except quoted text that itself contains a commit, such
  // as `bash -c "git commit ..."`, which is checked as a command of its own.
  const QUOTED = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
  const texts = versions.flatMap((v) => [
    v.replace(QUOTED, '""'),
    ...(v.match(QUOTED) ?? []).filter((q) => /\bcommit\b/i.test(q)).map((q) => q.slice(1, -1)),
  ]);
  const afterCommit = texts.flatMap((t) => t.match(/\bcommit\b([^;&|\n]*)/gi) ?? []);
  if (afterCommit.some((segment) => /(?:^|\s)-[a-zA-Z]*n[a-zA-Z]*(?=\s|$)/.test(segment))) {
    return block(
      '-n on a commit switches off its git hooks (the secret scan and the close gates). Remove it; if -n belongs to ' +
        'another command or to the message, split the command or pass the message with -F <file>.',
    );
  }
  return 0;
}

process.exit(main());
