// git pre-push hook (installed by `npm run setup`).
//
// `main` only receives reviewed sprint closes (CONVENTIONS invariant 7, WORKFLOW step 8): it is advanced by a
// fast-forward to the sprint's close commit and pushed from there. So a push that updates the remote `main`
// is refused unless the commit it sends is a close ("S<N> close: <title>"). A task commit pushed to `main` by
// mistake would put unreviewed work on the shared branch.
//
// Usage (by git): node tools/hooks/pre-push.mjs <remote> <url>, with "<local ref> <local sha> <remote ref>
// <remote sha>" lines on stdin.

import { readFileSync } from 'node:fs';
import { classifyMessage } from '../lib/close-gates.mjs';
import { git } from '../lib/repo.mjs';

const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
const updates = readFileSync(0, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split(' '))
  .filter(([, localSha, remoteRef]) => remoteRef === 'refs/heads/main' && !/^0+$/.test(localSha));

for (const [, localSha] of updates) {
  const subject = git(root, ['log', '-1', '--format=%s', localSha]).trim();
  if (!classifyMessage(subject)?.sprint) {
    process.stderr.write(
      `pre-push: refusing to push main at "${subject}". main only receives reviewed sprint closes: its tip must be ` +
        'an "S<N> close: <title>" commit (docs/WORKFLOW.md, step 8).\n',
    );
    process.exit(1);
  }
}
process.exit(0);
