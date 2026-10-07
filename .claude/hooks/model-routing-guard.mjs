// model-routing-guard: a PreToolUse hook on the Agent tool.
//
// Enforces the two routing rules in docs/WORKFLOW.md ("Model routing") at the moment an agent is spawned:
//   1. The reviewer runs only on Fable, and the spawn must say so explicitly (model "fable" or a full Fable id):
//      relying on the definition's default would let an environment-level model override win silently.
//   2. A generic spawn (general-purpose / claude) must name its model, so the choice is deliberate.
// Named roles get their model from their definition's frontmatter (.claude/agents/<name>.md).
// Read-only built-ins pass. Exit 2 blocks the spawn; unparseable input is allowed.

import { readFileSync } from 'node:fs';

const PASS_THROUGH = new Set(['Explore', 'Plan', 'fork', 'claude-code-guide', 'statusline-setup']);
const GENERIC = new Set(['general-purpose', 'claude']);

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
} catch {
  process.exit(0);
}
if (!['Agent', 'Task'].includes(payload?.tool_name)) process.exit(0);

const input = payload.tool_input ?? {};
const type = input.subagent_type || 'general-purpose';
const model = input.model;

const block = (why) => {
  process.stderr.write(`model-routing-guard: spawn BLOCKED: ${why} (docs/WORKFLOW.md, "Model routing").\n`);
  process.exit(2);
};

if (PASS_THROUGH.has(type)) process.exit(0);
if (type === 'reviewer' && model !== 'fable' && !/^claude-fable-/.test(model ?? '')) {
  block(`the reviewer runs only on Fable, and the spawn must name it: set model "fable"${model ? ` (this spawn asks for "${model}")` : ''}`);
}
if (GENERIC.has(type) && !model) {
  block(`a generic "${type}" spawn must name its model explicitly, or use a named role from docs/AGENTS.md`);
}
process.exit(0);
