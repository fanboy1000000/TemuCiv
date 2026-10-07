// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The authoritative close check is the git commit-msg hook (.githooks/commit-msg), which reads the real
// commit message. This guard protects that hook and gives early feedback, for any command that runs
// `git commit` (git, git.exe, with -C, -c or --no-pager before the subcommand, quoted or not):
//   1. The repository's hooks must be installed (core.hooksPath = .githooks; `npm run setup`), or the
//      commit is blocked: without them nothing checks the close.
//   2. Skipping or redirecting the hooks is blocked: --no-verify (or any abbreviation git accepts), -n in a
//      flag cluster, and any mention of core.hooksPath in a command that commits.
//   3. When the command shows a sprint-close message, every close gate (tools/lib/close-gates.mjs) is
//      checked now, before git runs, so a blocked close is explained up front.
//
// The command is split into words the way a shell does (quotes and backslashes removed), so a quoted
// "--no-verify" is seen for what the shell will pass to git. Heredoc bodies are set aside first: they are
// message text, not arguments. Exit 2 blocks the tool call and shows stderr to Claude. Unparseable input is
// allowed (it cannot be a command we recognise). This is a guard against mistakes, not against a hostile
// author: the git hooks remain the real check.

import { readFileSync } from 'node:fs';
import { blockedMessage, checkCloseGates, classifyMessage } from '../../tools/lib/close-gates.mjs';
import { git } from '../../tools/lib/repo.mjs';

const HEREDOC = /<<-?[ \t]*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g;
const VALUE_SHORT = new Set(['m', 'F', 'C', 'c', 't']);
const VALUE_LONG = new Set(['--message', '--file', '--template', '--author', '--date', '--reuse-message', '--reedit-message', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file']);
const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);

/** Split a command into shell words; separators (; & | && || newline) become null entries. */
function shellWords(text) {
  const words = [];
  let word = null;
  const push = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      const end = text.indexOf("'", i + 1);
      word = (word ?? '') + text.slice(i + 1, end === -1 ? text.length : end);
      i = end === -1 ? text.length : end;
    } else if (c === '"') {
      word = word ?? '';
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === '\\' && i + 1 < text.length && '"\\$`'.includes(text[i + 1])) i++;
        word += text[i];
      }
    } else if (c === '\\' && i + 1 < text.length) {
      word = (word ?? '') + text[++i];
    } else if (';&|\n'.includes(c)) {
      push();
      words.push(null);
    } else if (/\s/.test(c)) {
      push();
    } else {
      word = (word ?? '') + c;
    }
  }
  push();
  return words;
}

/** Each `git ... commit ...` in the command: { args } with the commit's own arguments. */
function findCommits(words) {
  const commits = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === null || !/(^|[\\/])git(\.exe)?$/i.test(words[i])) continue;
    let j = i + 1;
    while (j < words.length && words[j] !== null && words[j].startsWith('-')) j += GLOBAL_WITH_VALUE.has(words[j]) ? 2 : 1;
    if (words[j] !== 'commit') continue;
    let end = j + 1;
    while (end < words.length && words[end] !== null) end++;
    commits.push({ args: words.slice(j + 1, end) });
  }
  return commits;
}

/** Why a commit's arguments skip the hooks, or null. Option values (e.g. the -m message) are skipped. */
function skipsHooks(args) {
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (name.length >= 6 && '--no-verify'.startsWith(name)) return `${a} skips the commit hooks`;
      if (VALUE_LONG.has(name) && !a.includes('=')) k++;
    } else if (a.startsWith('-') && a.length > 1) {
      for (let p = 1; p < a.length; p++) {
        if (a[p] === 'n') return `${a} contains -n (--no-verify), which skips the commit hooks`;
        if (VALUE_SHORT.has(a[p])) {
          if (p === a.length - 1) k++;
          break;
        }
      }
    }
  }
  return null;
}

/** Commit messages visible in the command: -m/--message values and heredoc bodies. */
function visibleMessages(command, commits) {
  const messages = [...command.matchAll(HEREDOC)].map((m) => m[3]);
  for (const { args } of commits) {
    args.forEach((a, k) => {
      if (a === '-m' || a === '--message') messages.push(args[k + 1] ?? '');
      else if (a.startsWith('--message=')) messages.push(a.slice('--message='.length));
      else if (/^-[a-zA-Z]*m./.test(a)) messages.push(a.slice(a.indexOf('m') + 1));
    });
  }
  return messages;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
  } catch {
    return 0;
  }
  if (!['Bash', 'PowerShell'].includes(payload?.tool_name)) return 0;
  const command = String(payload?.tool_input?.command ?? '');
  const words = shellWords(command.replace(HEREDOC, '<<heredoc'));
  const commits = findCommits(words);
  if (commits.length === 0) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const block = (why) => {
    process.stderr.write(`sprint-close-guard: ${why}\n`);
    return 2;
  };

  if (words.some((w) => w !== null && /core\.hookspath/i.test(w))) {
    return block('this command changes or overrides core.hooksPath while committing, which skips the close checks. Remove it.');
  }
  for (const { args } of commits) {
    const why = skipsHooks(args);
    if (why) return block(`${why}: they enforce the close gates and the secret scan. Remove it.`);
  }

  let hooksPath = '';
  try {
    hooksPath = git(root, ['config', '--get', 'core.hooksPath']).trim();
  } catch {
    hooksPath = '';
  }
  if (hooksPath.replace(/\\/g, '/').replace(/\/$/, '') !== '.githooks') {
    return block(
      `the repository's git hooks are not installed (core.hooksPath is "${hooksPath || 'unset'}"), so nothing would check ` +
        'this commit. Run `npm run setup` once, then commit again.',
    );
  }

  const close = visibleMessages(command, commits).map(classifyMessage).find(Boolean);
  if (close?.malformed) return block(`"${close.malformed}" looks like a sprint close but isn't in the form "S<N> close: <title>".`);
  if (close?.sprint) {
    const { failures, waived } = checkCloseGates(root, close.sprint);
    for (const gate of waived) process.stderr.write(`sprint-close-guard: gate "${gate}" waived for S${close.sprint}.\n`);
    if (failures.length) return block(blockedMessage(close.sprint, failures));
  }
  return 0;
}

process.exit(main());
