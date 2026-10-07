// sprint-close-guard: a PreToolUse hook on the Bash and PowerShell tools.
//
// The authoritative checks are the git hooks (.githooks): commit-msg checks the close gates on the real
// commit message and refuses commits on `main`; pre-push refuses pushing `main` unless its tip is a close.
// This guard protects those hooks and gives early feedback. It is a guard against mistakes, not against a
// deliberate workaround (a flag assembled from pieces at run time is out of its reach; the server-side
// backstops are in the backlog). It works in two layers:
//
//   1. A conservative text check, which needs no parsing. If the command mentions git together with commit,
//      push, merge or pull, it is blocked when its text (message bodies aside) contains `--no-v...` or
//      `core.hooksPath`, or when it can't be read to the end (an unclosed quote or bracket). The price is a
//      rare false alarm: a -m message or a search that names those words must use -F or a search tool.
//   2. A parse of the command into words, the way its shell does (POSIX quoting and backslash escapes for
//      Bash; PowerShell quoting, backtick escapes, continuations and here-strings for PowerShell). Commands
//      nested inside the command are parsed too:
//        - "(...)" and "$(...)" values (also inside double quotes) and bash backticks;
//        - the command given to bash/sh/zsh/dash/ksh `-c` (any flag cluster with c) or `<<<`, to
//          pwsh/powershell `-Command`, to `cmd /c` or `/k` (also `//c`, attached or combined, as in
//          `/d/c"..."`), to `eval`, and to `Invoke-Expression`/`iex` (also `-Command`);
//        - text piped into one of those (`echo "..." | bash`, `'...' | iex`), at any stage of a pipeline;
//        - a heredoc or here-string fed to one of those, whose body is code, not a message, including one
//          inside a "$(...)" whose enclosing command runs code (`bash -c "$(cat <<EOF ...)"`).
//      The program a command runs is found past VAR=value settings and env/command/exec/nohup/time/sudo, and
//      PowerShell's -Command is recognised in every abbreviation. A # at the start of a word starts a comment.
//      Every `commit` subcommand found (after git, git.exe or anything else, such as a variable) is checked
//      for -n in its flag clusters, and every commit, push, merge or pull for a skip flag written with escapes.
//
// For a command that mentions git commit, push, merge or pull, the repository's hooks must be installed
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
const GUARDED = new Set(['commit', 'push', 'merge', 'pull']);
const POSIX_SHELL = /(^|[\\/])(ba|z|da|k)?sh(\.exe)?$/i;
const PS_SHELL = /(^|[\\/])(pwsh|powershell)(\.exe)?$/i;
const CMD_SHELL = /(^|[\\/])cmd(\.exe)?$/i;
const PS_EVALUATOR = /^(iex|invoke-expression)$/i;
const CMD_RUN = /^((?:\/{1,2}[a-z](?::[a-z]+)?)*?)\/{1,2}([ck])([\s\S]*)$/i; // /c, //c, /d/c"...", /s /c
const PS_COMMAND = /^-c(o(m(m(a(n(d)?)?)?)?)?)?(:.*)?$/i; // -Command and every abbreviation PowerShell accepts
/** Words that run the next word as the program: `env`, `command`, `exec`, `nohup`, `time`, `sudo`. */
const PREFIX_RUNNERS = /^(env|command|exec|nohup|time|sudo)$/i;
const MAX_DEPTH = 4;
const WHAT = 'git commit/push/merge/pull';

/** Whether a command word runs text as code: a shell, cmd, eval or Invoke-Expression/iex. Returns the kind. */
function runner(word) {
  const w = String(word ?? '');
  if (POSIX_SHELL.test(w) || CMD_SHELL.test(w) || /^eval$/i.test(w)) return 'posix';
  if (PS_SHELL.test(w) || PS_EVALUATOR.test(w)) return 'powershell';
  return null;
}

/**
 * The program a command's words actually run: leading VAR=value settings are skipped, and so are wrappers that
 * run the next word (`env` with its options and settings, `command`, `exec`, `nohup`, `time`, `sudo`).
 */
function executable(words) {
  let k = 0;
  while (k < words.length) {
    const w = words[k];
    if (w === null || w === undefined) return null;
    if (/^[A-Za-z_]\w*=/.test(w)) k++;
    else if (PREFIX_RUNNERS.test(w)) {
      k++;
      while (k < words.length && words[k] !== null && words[k].startsWith('-')) k += /^-[uC]$/.test(words[k]) ? 2 : 1;
    } else return w;
  }
  return null;
}

/** The program run by the last command in a piece of shell text (what a heredoc or here-string is attached to). */
function lastCommandProgram(text) {
  const parts = text.replace(/[\s(]+$/, '').split(/\$\(|[;&|(]/);
  return executable(parts[parts.length - 1].trim().split(/\s+/).filter(Boolean));
}

/** Whether any stage of a pipeline in this text (after a "|") runs its input as code. */
function pipesIntoRunner(text) {
  return text
    .split(/(?<!\|)\|(?!\|)/)
    .slice(1)
    .some((stage) => !!runner(executable(stage.trim().split(/\s+/).filter(Boolean))));
}

/**
 * Whether a heredoc or here-string at this point runs as code: its own command runs code, a later pipeline
 * stage does, or it sits inside a "$(...)" whose enclosing command runs code (`bash -c "$(cat <<EOF ...)"`).
 */
function runsAsCode(before, after) {
  if (runner(lastCommandProgram(before)) || pipesIntoRunner(after)) return true;
  const open = before.lastIndexOf('$(');
  if (open === -1) return false;
  return !!runner(lastCommandProgram(before.slice(0, open).replace(/["'\s]+$/, '')));
}

/**
 * Split a command into shell words; separators (; & | newline, a "(" that starts a command, and ")") become
 * null entries. Returns { words, unclosed, inner, pipes }: `unclosed` is true when a quote or bracket never
 * closed; `inner` holds the commands nested in the text ((...) and $(...) values, backticks); `pipes` holds
 * the index of each null that stands for a pipe (as opposed to ; && || or a newline).
 */
function shellWords(text, { powershell = false, cmd = false } = {}) {
  // cmd: ^ escapes, and a single quote is an ordinary character
  const ESC = powershell ? '`' : cmd ? '^' : '\\';
  const bash = !powershell && !cmd;
  const words = [];
  const inner = [];
  const pipes = [];
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
  /** A bash backtick substitution starting at text[i] === "`": [text, end index]. */
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
    if (c === '#' && word === null) {
      while (i + 1 < text.length && text[i + 1] !== '\n') i++; // a comment, to the end of the line
    } else if (c === '$' && text[i + 1] === "'" && bash) {
      word = word ?? ''; // $'...': ANSI-C quoting, backslash escapes inside
      for (i += 2; i < text.length && text[i] !== "'"; i++) word += text[i] === '\\' && i + 1 < text.length ? text[++i] : text[i];
      if (i >= text.length) unclosed = true;
    } else if (c === '`' && bash) {
      const [content, end] = backticks(i);
      word = (word ?? '') + content;
      i = end;
    } else if (c === '(' && !atCommandStart()) {
      const [content, end] = group(i); // (...) or $(...) inside a command: a computed value, one word
      word = (word ?? '') + content;
      i = end;
    } else if (c === "'" && !cmd) {
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
        } else if (text[i] === '`' && bash) {
          const [content, end] = backticks(i);
          word += content;
          i = end;
        } else if (text[i] === '"' && powershell && text[i + 1] === '"') word += text[++i];
        else if (text[i] === '"') {
          closed = true;
          break;
        } else if (text[i] === ESC && i + 1 < text.length && (!bash || '"\\$`\n'.includes(text[i + 1]))) word += text[++i];
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
    } else if (c === '|' && text[i + 1] !== '|') {
      push();
      pipes.push(words.length);
      words.push(null);
    } else if (';&|()\n'.includes(c)) {
      push();
      words.push(null);
      if ((c === '|' || c === '&') && text[i + 1] === c) i++; // || and &&
    } else if (/\s/.test(c)) {
      push();
    } else {
      word = (word ?? '') + c;
    }
  }
  push();
  return { words, unclosed, inner, pipes };
}

/**
 * The command strings handed to something that runs them, as listed in the header. Returns [{ text,
 * powershell }].
 */
function runnerArguments(words, pipes) {
  const nested = [];
  const restOfCommand = (k, { requote = false } = {}) => {
    let end = k;
    while (end < words.length && words[end] !== null) end++;
    const rest = words.slice(k, end);
    // For cmd: a lone quoted command is the command itself (cmd strips the outer quotes); otherwise words
    // that held spaces were quoted, so they are quoted again to stay whole.
    if (!requote || rest.length === 1) return rest.join(' ');
    return rest.map((x) => (/\s/.test(x) ? `"${x.replace(/"/g, '^"')}"` : x)).join(' ');
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? '';
    if (/^eval$/i.test(w)) {
      nested.push({ text: restOfCommand(i + 1), powershell: false });
      continue;
    }
    if (PS_EVALUATOR.test(w)) {
      const next = words[i + 1] ?? '';
      const attached = PS_COMMAND.test(next) && next.includes(':') ? next.slice(next.indexOf(':') + 1) : null;
      let text = attached ?? (PS_COMMAND.test(next) ? words[i + 2] : words[i + 1]);
      if (text != null && /^\([\s\S]*\)$/.test(text)) {
        // iex ("...") or iex ('...'): a literal in brackets is the script itself
        const literal = shellWords(text.slice(1, -1), { powershell: true }).words.filter((x) => x !== null);
        if (literal.length === 1) text = literal[0];
      }
      if (text != null) nested.push({ text, powershell: true });
      continue;
    }
    const posix = POSIX_SHELL.test(w);
    const ps = PS_SHELL.test(w);
    const cmd = CMD_SHELL.test(w);
    if (!posix && !ps && !cmd) continue;
    for (let k = i + 1; k < words.length && words[k] !== null; k++) {
      const arg = words[k];
      const run = cmd && arg.match(CMD_RUN);
      if (run) {
        const text = run[3] ? [run[3], restOfCommand(k + 1)].filter(Boolean).join(' ') : restOfCommand(k + 1, { requote: true });
        nested.push({ text, powershell: false, cmd: true });
        break;
      }
      if (posix && arg.startsWith('<<<')) {
        const text = arg.slice(3) || words[k + 1];
        if (text) nested.push({ text, powershell: false });
        break;
      }
      const takesCommand = posix ? /^-[a-z]*c[a-z]*$/.test(arg) : ps && PS_COMMAND.test(arg) && !arg.includes(':');
      if (takesCommand && words[k + 1] != null) {
        nested.push({ text: words[k + 1], powershell: ps });
        break;
      }
    }
  }
  // Text piped into a runner: `echo "..." | bash`, `'...' | iex`.
  for (const p of pipes) {
    const kind = runner(executable(words.slice(p + 1)));
    if (!kind) continue;
    let start = p - 1;
    while (start >= 0 && words[start] !== null) start--;
    const before = words.slice(start + 1, p);
    for (const text of before.length === 1 ? before : before.slice(1)) nested.push({ text, powershell: kind === 'powershell' });
  }
  return nested;
}

/**
 * Each guarded subcommand in the words: { sub, args, bare }. A `git` word (with its global options) followed
 * by commit, push, merge or pull counts, and so does any other `commit` word (`bare`): a variable or alias
 * standing in for git still commits.
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
    calls.push({ sub: words[j], args: words.slice(j + 1, end), bare: j === i });
  }
  return calls;
}

/**
 * Why a guarded subcommand's parsed arguments skip the hooks, or null: --no-verify or an abbreviation (written
 * with escapes the text check can't see), or -n in a commit's flag cluster. Option values are skipped.
 */
function skipsHooks({ sub, args, bare }) {
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (name.length >= 6 && '--no-verify'.startsWith(name)) return `${a} skips the ${sub} hooks`;
      if (sub === 'commit' && VALUE_LONG.has(name) && !a.includes('=')) k++;
    } else if (sub === 'commit' && a.startsWith('-') && a.length > 1) {
      for (let p = 1; p < a.length; p++) {
        if (a[p] === 'n') {
          const hint = bare ? ' (the word "commit" is followed by -n; if this is a search, not a commit, use a search tool)' : '';
          return `${a} contains -n (--no-verify), which skips the commit hooks${hint}`;
        }
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
function parseAll(text, powershell, depth = 0, cmd = false) {
  const { words, unclosed, inner, pipes } = shellWords(text, { powershell, cmd });
  const result = { calls: findGuardedCalls(words), unclosed };
  if (depth >= MAX_DEPTH) return result;
  const nested = [...inner.map((t) => ({ text: t, powershell })), ...runnerArguments(words, pipes)];
  for (const n of nested) {
    const sub = parseAll(n.text, n.powershell, depth + 1, !!n.cmd);
    result.calls.push(...sub.calls);
    result.unclosed ||= sub.unclosed;
  }
  return result;
}

/**
 * The command with message bodies set aside. A heredoc or here-string body is message text, unless what it is
 * attached to (the command before it, or a pipe after it) runs it as code; then it stays, as code.
 */
function setAsideMessages(command, powershell) {
  const withoutHeredocs = command.replace(HEREDOC, (all, q, tag, rest, body, offset, string) => {
    const before = string.slice(string.lastIndexOf('\n', offset) + 1, offset);
    return runsAsCode(before, rest) ? `<<heredoc ${rest}\n${body}` : `<<heredoc ${rest}`;
  });
  if (!powershell) return withoutHeredocs;
  return withoutHeredocs.replace(HERESTRING, (all, q, body, offset, string) => {
    const before = string.slice(string.lastIndexOf('\n', offset) + 1, offset);
    const after = string.slice(offset + all.length).split('\n')[0];
    return runsAsCode(before, after) ? `'herestring'\n${body}\n` : "'herestring'";
  });
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
  const code = setAsideMessages(command, powershell);
  const { calls, unclosed } = parseAll(code, powershell);
  const mentions = /\bgit(\.exe)?\b/i.test(code) && /\b(commit|push|merge|pull)\b/i.test(code);
  if (calls.length === 0 && !mentions) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const block = (why) => {
    process.stderr.write(`sprint-close-guard: ${why}\n`);
    return 2;
  };

  // Layer 1: the conservative text check.
  if (/--no-v(?!erbose)/i.test(code)) {
    return block(
      `this command mentions ${WHAT} and "--no-verify" (or an abbreviation). Skipping the hooks skips the ` +
        'close gates, the secret scan and the protection of main. Remove it; if it is only message or search text, use -F or a search tool.',
    );
  }
  if (/core\.hookspath/i.test(code)) {
    return block(`this command mentions ${WHAT} and core.hooksPath. Changing it skips the checks. Remove it.`);
  }
  if (unclosed) return block(`this command mentions ${WHAT} but couldn't be read to the end (an unclosed quote or bracket). Fix the quoting.`);

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
