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
//   - `gh pr merge`, which moves `main` on GitHub without running any local hook.
// False alarms are accepted: a commit message that names those words goes through `-F <file>`, and a command
// that runs `git commit` and, say, `head -n` on one segment is split. Exit 2 blocks the tool call.

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
  const command = String(payload?.tool_input?.command ?? '');
  if (!/\b(git(\.exe)?|gh)\b/i.test(command) || !/\b(commit|push|merge|pull)\b/i.test(command)) return 0;

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
  if (/--no-v(?!erbose)/i.test(command) || /core\.hookspath/i.test(command)) {
    return block(
      'this command would switch off or redirect the git hooks (--no-verify or core.hooksPath). They run the secret ' +
        'scan and the close gates. Remove it; if it is only message text, pass the message with -F <file>.',
    );
  }
  if (/\bgh\s+pr\s+merge\b/i.test(command)) {
    return block('`gh pr merge` moves main on GitHub without running the local checks. main only receives reviewed closes, pushed from here.');
  }
  // Continued lines are joined. Quoted text is set aside (a message may say "-n"), except quoted text that
  // itself contains a commit, such as `bash -c "git commit ..."`, which is checked as a command of its own.
  const joined = command.replace(/[\\`]\r?\n/g, ' ');
  const QUOTED = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
  const texts = [joined.replace(QUOTED, '""'), ...(joined.match(QUOTED) ?? []).filter((q) => /\bcommit\b/i.test(q))];
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
