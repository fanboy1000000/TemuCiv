// Prints the stamp for a review: the commit and the hash of every file in review scope.
// Run it immediately before starting a review lens and put both lines at the top of the saved review
// (.claude/reviews/SPRINT-N-<lens>.md). The sprint-close guard recomputes both at close; if any
// reviewed file changed since, the review no longer counts. See docs/WORKFLOW.md, step 7.
//
// Usage: node tools/review-stamp.mjs

import { reviewStamp } from './lib/repo.mjs';

const stamp = reviewStamp(process.cwd());
console.log(`reviewed-against-commit: ${stamp.commit}`);
console.log(`reviewed-scope-hash: ${stamp.scopeHash}`);
