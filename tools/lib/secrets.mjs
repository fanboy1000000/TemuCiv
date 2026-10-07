// Secret-scanning library, used by tools/check-secrets.mjs (the CLI) and its tests.
//
// It looks for well-known credential formats, not for every possible secret, so it is one layer of
// protection, not the only one. Findings carry the file, line and kind, never the secret itself.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listFiles } from './repo.mjs';

export const PATTERNS = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{50,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Stripe live key', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['private key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
];

/** Findings in one file's text: [{ line, kind }]. */
export function scanText(text) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [kind, rx] of PATTERNS) if (rx.test(line)) findings.push({ line: i + 1, kind });
  });
  return findings;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

function stagedFiles(root) {
  const names = git(root, ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']).split('\0').filter(Boolean);
  return names.map((path) => ({ path, read: () => git(root, ['show', `:${path}`]) }));
}

function diskFiles(root) {
  return listFiles(root)
    .filter((path) => existsSync(join(root, path)) && statSync(join(root, path)).isFile())
    .map((path) => ({ path, read: () => readFileSync(join(root, path), 'utf8') }));
}

export function scan(root, { staged = false } = {}) {
  const findings = [];
  for (const file of staged ? stagedFiles(root) : diskFiles(root)) {
    const text = file.read();
    if (text.includes('\0')) continue; // binary
    for (const f of scanText(text)) findings.push({ path: file.path, ...f });
  }
  return findings;
}
