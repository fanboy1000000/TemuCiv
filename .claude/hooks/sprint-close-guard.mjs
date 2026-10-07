// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The authoritative checks are the git hooks (.githooks): commit-msg checks the close gates on the real
// commit message and refuses commits on `main`; pre-push refuses pushing `main` unless its tip is a close.
// This guard protects those hooks and gives early feedback. It is a guard against mistakes, not against a
// deliberate workaround (a flag assembled from pieces at run time is out of its reach; the server-side
// backstops are in the backlog). It works in two layers:
//
//   1. A conservative text check, which needs no parsing. If the command mentions git together with commit,
//      push or merge, it is blocked when its text (heredoc and here-string bodies aside) contains `--no-v...`
//      or `core.hooksPath`, or when it can't be read to the end (an unclosed quote or bracket). The price is
//      a rare false alarm: a -m message or a search that names those words must use -F or a search tool.
//   2. A parse of the command into words, the way its shell does (POSIX quoting and backslash escapes for
//      Bash; PowerShell quoting, backtick escapes, continuations and here-strings for PowerShell). Commands
//      nested inside the command are parsed too: "(...)" and "$(...)" values and bash backticks inside double
//      quotes, and the command given to `bash -c`, `sh -c`, `pwsh -Command` and the like. (Unquoted backticks
//      need no special case: the words inside them are ordinary words.) Every
//      `commit` subcommand found (after git, git.exe or anything else, such as a variable) is checked for -n in
//      its flag clusters, and every commit, push or merge for a skip flag written with escapes.
//
// For a command that mentions git commit, push or merge, the repository's hooks must be installed
// (core.hooksPath = .githooks; `npm run setup`), or it is blocked. When the command shows a sprint-close
// message, every close gate (tools/lib/close-gates.mjs) is checked now, before git runs. Exit 2 blocks the
// tool call and shows stderr to Claude. Unparseable input is allowed (it cannot be a command we recognise).

import { readFileSync } from 'node:fs';
import { blockedMessage, checkCloseGates, classifyMessage } from '../../tools/lib/close-gates.mjs';
import { git } from '../../tools/lib/repo.mjs';

const HEREDOC = /<<-?[ \t]*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g;
const HERESTRING = /@(['"])[ \t]*\r?\n([\s\S]*?)\r?\n\1@/g; // PowerShell @'...'@ and @"..."@
const VALUE_SHORT = new Set(['m', 'F', 'C', 'c', 't']); // the value follows, attached or as the next word
const OPTIONAL_ATTACHED = new Set(['u', 'S']); // an optional value, attached only (-uno, -Skey)
const VALUE_LONG = new Set(['--message', '--file', '--template', '--author', '--date', '--reuse-message', '--reedit-message', '--fixup', '--squash', '--cleanup', '--trailer', '--pathspec-from-file']);
const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env']);
const GUARDED = new Set(['commit', 'push', 'merge']);
const POSIX_SHELL = /(^|[\\/])(ba|z|da|k)?sh(\.exe)?$/i;
const PS_SHELL = /(^|[\\/])(pwsh|powershell)(\.exe)?$/i;
const MAX_DEPTH = 4;

/**
 * Split a command into shell words; separators (; & | newline, a "(" that starts a command, and ")") become
 * null entries. Returns { words, unclosed, inner }: `unclosed` is true when a quote or bracket never closed;
 * `inner` holds the commands nested in the text ((...) and $(...) values, backticks inside double quotes).
 */
function shellWords(text, { powershell = false } = {}) {
  const ESC = powershell ? '`' : '\\';
  const words = [];
  const inner = [];
  let word = null;
  let unclosed = false;
  const push = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const atCommandStart = () => word === null && (words.length === 0 || words[words.length - 1] === null);
  /** The bracketed group starting at text[i] === "(", up to its matching ")": [text, end index]. */
  const group = (i) => {
    let depth = 0;
    for (let k = i; k < text.length; k++) {
      if (text[k] === '(') depth++;
      else if (text[k] === ')' && --depth === 0) {
        inner.push(text.slice(i + 1, k));
        return [text.slice(i, k + 1), k];
      }
    }
    unclosed = true;
    return [text.slice(i), text.length];
  };
  /** A bash backtick substitution inside double quotes, starting at text[i] === "`": [text, end index]. */
  const backticks = (i) => {
    for (let k = i + 1; k < text.length; k++) {
      if (text[k] === '\\') k++;
      else if (text[k] === '`') {
        inner.push(text.slice(i + 1, k));
        return [text.slice(i, k + 1), k];
      }
    }
    unclosed = true;
    return [text.slice(i), text.length];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '$' && text[i + 1] === "'" && !powershell) {
      word = word ?? ''; // $'...': ANSI-C quoting, backslash escapes inside
      for (i += 2; i < text.length && text[i] !== "'"; i++) word += text[i] === '\\' && i + 1 < text.length ? text[++i] : text[i];
      if (i >= text.length) unclosed = true;
    } else if (c === '(' && !atCommandStart()) {
      const [content, end] = group(i); // (...) or $(...) inside a command: a computed value, one word
      word = (word ?? '') + content;
      i = end;
    } else if (c === "'") {
      word = word ?? '';
      let closed = false;
      for (i++; i < text.length; i++) {
        if (text[i] === "'" && powershell && text[i + 1] === "'") word += text[++i];
        else if (text[i] === "'") {
          closed = true;
          break;
        } else word += text[i];
      }
      if (!closed) unclosed = true;
    } else if (c === '"') {
      word = word ?? '';
      let closed = false;
      for (i++; i < text.length; i++) {
        if (text[i] === '$' && text[i + 1] === '(') {
          const [content, end] = group(i + 1); // "$(...)": a command substitution inside the string
          word += '$' + content;
          i = end;
        } else if (text[i] === '`' && !powershell) {
          const [content, end] = backticks(i);
          word += content;
          i = end;
        } else if (text[i] === '"' && powershell && text[i + 1] === '"') word += text[++i];
        else if (text[i] === '"') {
          closed = true;
          break;
        } else if (text[i] === ESC && i + 1 < text.length && (powershell || '"\\$`\n'.includes(text[i + 1]))) word += text[++i];
        else word += text[i];
      }
      if (!closed) unclosed = true;
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
  return { words, unclosed, inner };
}

/** The commands handed to a shell by `bash -c "..."`, `pwsh -Command "..."` and the like: [{ text, powershell }]. */
function shellArguments(words) {
  const nested = [];
  for (let i = 0; i < words.length; i++) {
    const posix = POSIX_SHELL.test(words[i] ?? '');
    if (!posix && !PS_SHELL.test(words[i] ?? '')) continue;
    for (let k = i + 1; k < words.length && words[k] !== null; k++) {
      const flag = words[k];
      const takesCommand = posix ? /^-[a-z]*c$/.test(flag) : /^-(c|command)$/i.test(flag);
      if (takesCommand && words[k + 1] != null) {
        nested.push({ text: words[k + 1], powershell: !posix });
        break;
      }
    }
  }
  return nested;
}

/**
 * Each guarded subcommand in the words: { sub, args }. A `git` word (with its global options) followed by
 * commit, push or merge counts, and so does any other `commit` word: a variable or alias standing in for git
 * still commits.
 */
function findGuardedCalls(words) {
  const calls = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === null) continue;
    let j = null;
    if (/(^|[\\/])git(\.exe)?$/i.test(w)) {
      j = i + 1;
      while (j < words.length && words[j] !== null && words[j].startsWith('-')) j += GLOBAL_WITH_VALUE.has(words[j]) ? 2 : 1;
      if (!GUARDED.has(words[j])) j = null;
    } else if (w === 'commit') {
      j = i;
    }
    if (j === null) continue;
    let end = j + 1;
    while (end < words.length && words[end] !== null) end++;
    calls.push({ sub: words[j], args: words.slice(j + 1, end) });
  }
  return calls;
}

/**
 * Why a guarded subcommand's parsed arguments skip the hooks, or null: --no-verify or an abbreviation (written
 * with escapes the text check can't see), or -n in a commit's flag cluster. Option values are skipped.
 */
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

/** Commit messages visible in the command: -m/--message values, heredoc and here-string bodies. */
function visibleMessages(command, calls) {
  const messages = [...command.matchAll(HEREDOC)].map((m) => m[4]);
  messages.push(...[...command.matchAll(HERESTRING)].map((m) => m[2]));
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

/** Parse a command and every command nested in it. Returns { calls, unclosed }. */
function parseAll(text, powershell, depth = 0) {
  const { words, unclosed, inner } = shellWords(text, { powershell });
  const result = { calls: findGuardedCalls(words), unclosed };
  if (depth >= MAX_DEPTH) return result;
  const nested = [...inner.map((t) => ({ text: t, powershell })), ...shellArguments(words)];
  for (const n of nested) {
    const sub = parseAll(n.text, n.powershell, depth + 1);
    result.calls.push(...sub.calls);
    result.unclosed ||= sub.unclosed;
  }
  return result;
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
  const powershell = payload.tool_name === 'PowerShell';
  const code = command.replace(HEREDOC, '<<heredoc $3').replace(HERESTRING, powershell ? "'herestring'" : '$&');
  const { calls, unclosed } = parseAll(code, powershell);
  const mentions = /\bgit(\.exe)?\b/i.test(code) && /\b(commit|push|merge)\b/i.test(code);
  if (calls.length === 0 && !mentions) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const block = (why) => {
    process.stderr.write(`sprint-close-guard: ${why}\n`);
    return 2;
  };

  // Layer 1: the conservative text check.
  if (/--no-v(?!erbose)/i.test(code)) {
    return block(
      'this command mentions git commit/push/merge and "--no-verify" (or an abbreviation). Skipping the hooks skips the ' +
        'close gates, the secret scan and the protection of main. Remove it; if it is only message or search text, use -F or a search tool.',
    );
  }
  if (/core\.hookspath/i.test(code)) {
    return block('this command mentions git commit/push/merge and core.hooksPath. Changing it skips the checks. Remove it.');
  }
  if (unclosed) return block("this command mentions git commit/push/merge but couldn't be read to the end (an unclosed quote or bracket). Fix the quoting.");

  // Layer 2: the parsed check.
  for (const call of calls) {
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

  const close = visibleMessages(command, calls).map(classifyMessage).find(Boolean);
  if (close?.malformed) return block(`"${close.malformed}" looks like a sprint close but isn't in the form "S<N> close: <title>".`);
  if (close?.sprint) {
    const { failures, waived } = checkCloseGates(root, close.sprint);
    for (const gate of waived) process.stderr.write(`sprint-close-guard: gate "${gate}" waived for S${close.sprint}.\n`);
    if (failures.length) return block(blockedMessage(close.sprint, failures));
  }
  return 0;
}

process.exit(main());
