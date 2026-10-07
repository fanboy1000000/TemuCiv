// Shared repository helpers for TemuCiv tooling and hooks.
//
// The central idea is the "scope hash": one SHA-256 over the path and content of every file git would
// consider part of the project (tracked, plus untracked files that are not ignored), read from disk.
// Ignored files (node_modules, .env, review and CI records) and file metadata (modes, symlink targets)
// are not part of it. Two hashes are equal only if the project files' contents are byte-for-byte the
// same. The close gates use it to prove that what was reviewed and what passed CI is what gets committed.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Files the close paperwork may change after the sprint-end review without invalidating it. */
export const REVIEW_EXCLUDE = [/^docs\/sprints\/INDEX\.md$/, /^ROADMAP\.md$/];

const CLOSE_TIME_HEADER_ROWS = /^\|\s*\*\*(Status|Dates|CI verified|Previous close on GitHub)\*\*\s*\|/;

/**
 * The part of a file the review covers. A sprint log is reviewed up to its "## Sprint-end review" heading,
 * minus the header rows filled in at close (Status, Dates, CI verified, Previous close on GitHub): the plan,
 * the owner's rulings and the task evidence are frozen by the review, while the review summary, test summary,
 * retrospective and handoff are written afterwards. Every other file is reviewed whole.
 */
export function reviewedPart(path, content) {
  if (!/^docs\/sprints\/SPRINT-\d+\.md$/.test(path)) return content;
  const beforeReview = content.toString('utf8').split(/^## Sprint-end review/m)[0];
  return Buffer.from(beforeReview.split('\n').filter((line) => !CLOSE_TIME_HEADER_ROWS.test(line)).join('\n'));
}

/** Where `npm run ci` records its last result. Gitignored. */
export const CI_RECORD = '.claude/ci/last-run.json';

export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The HEAD commit sha, or null in a repository with no commits yet. */
export function gitHead(root) {
  try {
    return git(root, ['rev-parse', '--verify', '-q', 'HEAD']).trim() || null;
  } catch {
    return null;
  }
}

/** Tracked files plus untracked files that are not ignored, sorted, with forward slashes. */
export function listFiles(root) {
  const out = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  return [...new Set(out.split('\0').filter(Boolean))].sort();
}

/**
 * SHA-256 over path + content of every project file, skipping paths matched by `exclude`. `part` picks the
 * part of each file's content that counts (the whole file by default).
 */
export function scopeHash(root, exclude = [], part = (path, content) => content) {
  const hash = createHash('sha256');
  for (const path of listFiles(root)) {
    if (exclude.some((rx) => rx.test(path))) continue;
    const abs = join(root, path);
    hash.update(path);
    hash.update('\0');
    if (existsSync(abs) && statSync(abs).isFile()) {
      hash.update(createHash('sha256').update(part(path, readFileSync(abs))).digest('hex'));
    } else {
      hash.update('<missing>'); // tracked but deleted on disk
    }
    hash.update('\n');
  }
  return hash.digest('hex');
}

/** The stamp a review is made against: the HEAD commit and the review-scope hash. */
export function reviewStamp(root) {
  return { commit: gitHead(root) ?? '(none)', scopeHash: reviewScopeHash(root) };
}

/** The hash a review stamp records: the review scope, with sprint logs reduced to their reviewed part. */
export function reviewScopeHash(root) {
  return scopeHash(root, REVIEW_EXCLUDE, reviewedPart);
}

/** Record a CI result for the exact files on disk now. */
export function writeCiRecord(root, { result, steps = [] }) {
  const record = {
    result,
    head: gitHead(root) ?? '(none)',
    scopeHash: scopeHash(root),
    steps,
    recordedAt: new Date().toISOString(),
  };
  const path = join(root, CI_RECORD);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(record, null, 2) + '\n');
  return record;
}
