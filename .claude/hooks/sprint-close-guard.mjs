// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The authoritative checks are the git hooks (.githooks): commit-msg checks the close gates on the real
// commit message and refuses commits on `main`; pre-push refuses pushing `main` unless its tip is a close.
// This guard protects those hooks and gives early feedback, for the common ways of running `git commit` or
// `git push` (git, git.exe, with -C, -c or --no-pager before the subcommand, quoted, escaped, piped, in a
// subshell or after a heredoc):
//   1. The repository's hooks must be installed (core.hooksPath = .githooks; `npm run setup`), or the
//      command is blocked: without them nothing checks it.
//   2. Skipping or redirecting the hooks is blocked: --no-verify (or any abbreviation git accepts), -n in a
//      commit's flag cluster, and core.hooksPath set by `git -c` or `git config` in a command that commits
//      or pushes.
//   3. When the command shows a sprint-close message, every close gate (tools/lib/close-gates.mjs) is
//      checked now, before git runs, so a blocked close is explained up front.
//
// The command is split into words the way its shell does: POSIX quoting ('...', "...", $'...') and backslash
// escapes for Bash; PowerShell quoting, backtick escapes and backtick line continuations for PowerShell.
// Heredoc bodies are set aside first (they are message text), but the rest of the heredoc's opening line is
// kept, because it is shell code (e.g. `cat <<EOF | git commit -F -`). Exit 2 blocks the tool call and shows
// stderr to Claude. Unparseable input is allowed (it cannot be a command we recognise). This is a guard
// against mistakes, not against a hostile author: it covers the common forms, and the git hooks remain the
// real check.

import { readFileSync } from 'node:fs';
import { blockedMessage, checkCloseGates, classifyMessage } from '../../tools/lib/close-gates.mjs';
import { git } from '../../tools/lib/repo.mjs';

const HEREDOC = /<<-?[ \t]*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g;
const VALUE_SHORT = new Set(['m', 'F', 'C', 'c', 't']); // the value follows, attached or as the next word
const OPTIONAL_ATTACHED = new Set(['u', 'S']); // an optional value, attached only (-uno, -Skey)
const VALUE_LONG = new Set(['--message', '--file', '--template', '--author', '--date', '--reuse-message', '--reedit-message', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file']);
const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);

/**
 * Split a command into shell words; separators (; & | ( ) and unescaped newlines) become null entries.
 * `powershell` switches the escape character from backslash to backtick and adds PowerShell's doubled-quote
 * escapes ('' inside single quotes, "" inside double quotes).
 */
function shellWords(text, { powershell = false } = {}) {
  const ESC = powershell ? '`' : '\\';
  const words = [];
  let word = null;
  const push = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '$' && text[i + 1] === "'" && !powershell) {
      word = word ?? ''; // $'...': ANSI-C quoting, backslash escapes inside
      for (i += 2; i < text.length && text[i] !== "'"; i++) word += text[i] === '\\' && i + 1 < text.length ? text[++i] : text[i];
    } else if (c === "'") {
      word = word ?? '';
      for (i++; i < text.length; i++) {
        if (text[i] === "'" && powershell && text[i + 1] === "'") word += text[++i];
        else if (text[i] === "'") break;
        else word += text[i];
      }
    } else if (c === '"') {
      word = word ?? '';
      for (i++; i < text.length; i++) {
        if (text[i] === '"' && powershell && text[i + 1] === '"') word += text[++i];
        else if (text[i] === '"') break;
        else if (text[i] === ESC && i + 1 < text.length && (powershell || '"\\$`\n'.includes(text[i + 1]))) word += text[++i];
        else word += text[i];
      }
    } else if (c === ESC && i + 1 < text.length) {
      const step = text[i + 1] === '\r' && text[i + 2] === '\n' ? 2 : 1;
      if (text[i + step] === '\n') {
        // Line continuation. Bash removes backslash-newline entirely (the word carries on); PowerShell's
        // backtick-newline acts as a space between words.
        if (powershell) push();
        i += step;
      } else {
        word = (word ?? '') + text[++i];
      }
    } else if (';&|()\n'.includes(c)) {
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

/** Each git invocation in the command: { sub, globals, args }. */
function findGitCalls(words) {
  const calls = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === null || !/(^|[\\/])git(\.exe)?$/i.test(words[i])) continue;
    let j = i + 1;
    while (j < words.length && words[j] !== null && words[j].startsWith('-')) j += GLOBAL_WITH_VALUE.has(words[j]) ? 2 : 1;
    let end = j + 1;
    while (end < words.length && words[end] !== null) end++;
    calls.push({ sub: words[j] ?? '', globals: words.slice(i + 1, j), args: words.slice(j + 1, end) });
  }
  return calls;
}

/** Why a commit's or push's arguments skip the hooks, or null. Option values (e.g. the -m message) are skipped. */
function skipsHooks({ sub, args }) {
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (name.length >= 6 && '--no-verify'.startsWith(name)) return `${a} skips the ${sub} hooks`;
      if (sub === 'commit' && VALUE_LONG.has(name) && !a.includes('=')) k++;
    } else if (sub === 'commit' && a.startsWith('-') && a.length > 1) {
      for (let p = 1; p < a.length; p++) {
        if (a[p] === 'n') return `${a} contains -n (--no-verify), which skips the commit hooks`;
        if (OPTIONAL_ATTACHED.has(a[p])) break;
        if (VALUE_SHORT.has(a[p])) {
          if (p === a.length - 1) k++;
          break;
        }
      }
    }
  }
  return null;
}

/** Commit messages visible in the command: -m/--message values (separate or attached) and heredoc bodies. */
function visibleMessages(command, calls) {
  const messages = [...command.matchAll(HEREDOC)].map((m) => m[4]);
  for (const { sub, args } of calls) {
    if (sub !== 'commit') continue;
    args.forEach((a, k) => {
      if (a === '--message' || /^-[a-zA-Z]*m$/.test(a)) messages.push(args[k + 1] ?? '');
      else if (a.startsWith('--message=')) messages.push(a.slice('--message='.length));
      else if (/^-[a-zA-Z]*m./.test(a)) messages.push(a.slice(a.indexOf('m') + 1));
    });
  }
  return messages;
}

/** Whether the command sets core.hooksPath through `git -c` or `git config`. Message text doesn't count. */
function setsHooksPath(calls) {
  const mentions = (w) => /core\.hookspath/i.test(w);
  return calls.some(({ sub, globals, args }) => globals.some(mentions) || (sub === 'config' && args.some(mentions)));
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
  const words = shellWords(command.replace(HEREDOC, '<<heredoc $3'), { powershell: payload.tool_name === 'PowerShell' });
  const calls = findGitCalls(words);
  const guarded = calls.filter(({ sub }) => sub === 'commit' || sub === 'push');
  if (guarded.length === 0) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const block = (why) => {
    process.stderr.write(`sprint-close-guard: ${why}\n`);
    return 2;
  };

  if (setsHooksPath(calls)) {
    return block('this command changes or overrides core.hooksPath while committing or pushing, which skips the checks. Remove it.');
  }
  for (const call of guarded) {
    const why = skipsHooks(call);
    if (why) return block(`${why}: they enforce the close gates, the secret scan and the protection of main. Remove it.`);
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
        'this command. Run `npm run setup` once, then try again.',
    );
  }

  const close = visibleMessages(command, guarded).map(classifyMessage).find(Boolean);
  if (close?.malformed) return block(`"${close.malformed}" looks like a sprint close but isn't in the form "S<N> close: <title>".`);
  if (close?.sprint) {
    const { failures, waived } = checkCloseGates(root, close.sprint);
    for (const gate of waived) process.stderr.write(`sprint-close-guard: gate "${gate}" waived for S${close.sprint}.\n`);
    if (failures.length) return block(blockedMessage(close.sprint, failures));
  }
  return 0;
}

process.exit(main());
