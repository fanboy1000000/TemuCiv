// Prints the stamp for a review: the commit and the hash of every file in review scope.
// Run it immediately before starting a review lens and put both lines at the top of the saved review
// (.claude/reviews/SPRINT-N-<lens>.md). The sprint-close guard recomputes both at close; if any
// reviewed file changed since, the review no longer counts. See docs/WORKFLOW.md, step 7.
//
// It refuses to stamp while files in review scope are uncommitted or untracked: reviewers read the
// committed diff (git diff <base>..HEAD), so anything not yet committed would be hashed without being
// reviewed. Only the files the close paperwork may change (REVIEW_EXCLUDE: docs/sprints/INDEX.md,
// ROADMAP.md) may stay uncommitted; the sprint log itself must be committed before the stamp.
//
// Usage: node tools/review-stamp.mjs

import { REVIEW_EXCLUDE, git, reviewStamp } from './lib/repo.mjs';

const root = process.cwd();
const pending = git(root, ['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all'])
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^.* -> /, ''))
  .filter((path) => !REVIEW_EXCLUDE.some((rx) => rx.test(path)));
if (pending.length) {
  process.stderr.write(
    `review-stamp: refusing to stamp; commit these first so the reviewed diff matches the stamp:\n` +
      pending.map((p) => `  ${p}`).join('\n') +
      '\n',
  );
  process.exit(1);
}

const stamp = reviewStamp(root);
console.log(`reviewed-against-commit: ${stamp.commit}`);
console.log(`reviewed-scope-hash: ${stamp.scopeHash}`);
