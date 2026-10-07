// git commit-msg hook (installed by `npm run setup`, which points core.hooksPath at .githooks/).
//
// The authoritative sprint-close check. Git hands this hook the real commit message, so it sees the same
// thing whether the commit used -m, a heredoc, -F, an editor, `git.exe` or any other form. A subject of the
// form "S<N> close: <title>" must pass every close gate (tools/lib/close-gates.mjs). A subject that looks
// like a close but isn't in exactly that form is refused, so it can't slip through as an ordinary commit.
//
// Usage (by git): node tools/hooks/commit-msg.mjs <path-to-message-file>

import { readFileSync } from 'node:fs';
import { blockedMessage, checkCloseGates, classifyMessage } from '../lib/close-gates.mjs';
import { git } from '../lib/repo.mjs';

const messageFile = process.argv[2];
let message;
try {
  message = readFileSync(messageFile, 'utf8');
} catch (err) {
  process.stderr.write(`commit-msg: cannot read the commit message (${err.message}); refusing the commit.\n`);
  process.exit(1);
}

const kind = classifyMessage(message);
if (!kind) process.exit(0);
if (kind.malformed) {
  process.stderr.write(
    `commit-msg: "${kind.malformed}" looks like a sprint close but isn't in the form "S<N> close: <title>". ` +
      'Use exactly that form for a close, or reword the subject.\n',
  );
  process.exit(1);
}

const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
const { failures, waived } = checkCloseGates(root, kind.sprint);
for (const gate of waived) process.stderr.write(`commit-msg: gate "${gate}" waived for S${kind.sprint}.\n`);
if (failures.length) {
  process.stderr.write(`commit-msg: ${blockedMessage(kind.sprint, failures)}`);
  process.exit(1);
}
process.exit(0);
