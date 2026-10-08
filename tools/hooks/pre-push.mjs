// git pre-push hook (installed by `npm run setup`).
//
// `main` only receives reviewed sprint closes (CONVENTIONS invariant 7, WORKFLOW step 8): it is advanced by a
// fast-forward to the sprint's close commit and pushed from there. So a push that updates the remote `main`
// is refused unless the commit it sends is a close ("S<N> close: <title>") whose content passed the close gates
// here: commit-msg leaves a receipt for the exact tree when every gate passes. A task commit, or a close made
// with its commit hooks skipped, can't reach the shared branch this way. This hook is itself skipped by a push
// with the skip flag; the Claude guard blocks that. GitHub's ruleset blocks deleting or force-pushing `main`.
//
// Usage (by git): node tools/hooks/pre-push.mjs <remote> <url>, with "<local ref> <local sha> <remote ref>
// <remote sha>" lines on stdin.

import { readFileSync } from 'node:fs';
import { classifyMessage, readCloseReceipt } from '../lib/close-gates.mjs';
import { git } from '../lib/repo.mjs';

const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
const updates = readFileSync(0, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split(' '))
  .filter(([, localSha, remoteRef]) => remoteRef === 'refs/heads/main' && !/^0+$/.test(localSha));

const refuse = (why) => {
  process.stderr.write(`pre-push: ${why}\n`);
  process.exit(1);
};

for (const [, localSha] of updates) {
  const subject = git(root, ['log', '-1', '--format=%s', localSha]).trim();
  const sprint = classifyMessage(subject)?.sprint;
  if (!sprint) {
    refuse(
      `refusing to push main at "${subject}". main only receives reviewed sprint closes: its tip must be an ` +
        '"S<N> close: <title>" commit (docs/WORKFLOW.md, step 8).',
    );
  }
  const tree = git(root, ['rev-parse', `${localSha}^{tree}`]).trim();
  if (readCloseReceipt(root, tree)?.sprint !== sprint) {
    refuse(
      `refusing to push main at "${subject}": no record that this close passed the close gates on this computer ` +
        '(was it committed with the git hooks switched off?). Undo it and commit the close again normally.',
    );
  }
}
process.exit(0);
