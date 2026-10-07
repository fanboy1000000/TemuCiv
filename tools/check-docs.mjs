// Documentation consistency gate. Runs in `npm run ci` and GitHub Actions.
//
// Docs are the shared memory every agent works from, so stale docs mean agents acting on wrong
// information. This script catches the drift that machines can see:
//   1. size budgets  - governance docs stay short enough to be read (docs/WORKFLOW.md, "Harness evolution")
//   2. KB index      - every knowledge-base entry is listed in docs/kb/INDEX.md, and every listing exists
//   3. sprint index  - every sprint log is listed in docs/sprints/INDEX.md, numbered without gaps
//   4. agent roster  - every .claude/agents definition is in the docs/AGENTS.md roster with the same model
//   5. links         - every relative markdown link points at a file that exists
// Exit code 1 on any finding.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { listFiles } from './lib/repo.mjs';

const root = process.cwd();
const errors = [];
const read = (p) => readFileSync(join(root, p), 'utf8');
const lines = (text) => text.split(/\r?\n/).length;

// --- 1. Size budgets (lines) ---------------------------------------------------------------------
const BUDGETS = {
  'CLAUDE.md': 150,
  'docs/CONVENTIONS.md': 100,
  'docs/WORKFLOW.md': 450,
  'docs/AGENTS.md': 450,
};
const PATTERN_BUDGETS = [
  { rx: /^docs\/sprints\/SPRINT-\d+\.md$/, max: 400, label: 'sprint log' },
  { rx: /^docs\/kb\/(decisions|patterns|failures)\/.+\.md$/, max: 150, label: 'KB entry' },
];
const files = listFiles(root).filter((p) => existsSync(join(root, p)));
for (const p of files) {
  const budget = BUDGETS[p] ?? PATTERN_BUDGETS.find((b) => b.rx.test(p))?.max;
  if (budget && lines(read(p)) > budget) {
    errors.push(`size: ${p} has ${lines(read(p))} lines; budget is ${budget}. Shorten or split it.`);
  }
}

// --- 2. Knowledge-base index ---------------------------------------------------------------------
const KB_FOLDERS = { decisions: 'ADR', patterns: 'PAT', failures: 'FAIL' };
if (existsSync(join(root, 'docs/kb/INDEX.md'))) {
  const index = read('docs/kb/INDEX.md');
  for (const [folder, prefix] of Object.entries(KB_FOLDERS)) {
    const dir = join(root, 'docs/kb', folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      if (!name.startsWith(`${prefix}-`)) {
        errors.push(`kb: docs/kb/${folder}/${name} must be named ${prefix}-NNN-<slug>.md`);
      }
      if (!index.includes(`(${folder}/${name})`)) {
        errors.push(`kb: docs/kb/${folder}/${name} is not listed in docs/kb/INDEX.md`);
      }
    }
  }
} else {
  errors.push('kb: docs/kb/INDEX.md is missing');
}

// --- 3. Sprint index -----------------------------------------------------------------------------
if (existsSync(join(root, 'docs/sprints/INDEX.md'))) {
  const index = read('docs/sprints/INDEX.md');
  const sprints = readdirSync(join(root, 'docs/sprints'))
    .map((n) => n.match(/^SPRINT-(\d+)\.md$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  sprints.forEach((n, i) => {
    if (!index.includes(`(SPRINT-${n}.md)`)) errors.push(`sprints: SPRINT-${n}.md is not listed in docs/sprints/INDEX.md`);
    if (n !== i + 1) errors.push(`sprints: numbering has a gap or duplicate near SPRINT-${n}.md (expected SPRINT-${i + 1}.md)`);
  });
  for (const m of index.matchAll(/\((SPRINT-\d+\.md)\)/g)) {
    if (!existsSync(join(root, 'docs/sprints', m[1]))) errors.push(`sprints: INDEX links ${m[1]}, which does not exist`);
  }
} else {
  errors.push('sprints: docs/sprints/INDEX.md is missing');
}

// --- 4. Agent roster -----------------------------------------------------------------------------
const agentsDir = join(root, '.claude/agents');
const rosterText = existsSync(join(root, 'docs/AGENTS.md')) ? read('docs/AGENTS.md') : '';
const rosterBlock = rosterText.split('<!-- roster:start -->')[1]?.split('<!-- roster:end -->')[0];
if (!rosterBlock) {
  errors.push('agents: docs/AGENTS.md has no <!-- roster:start --> ... <!-- roster:end --> block');
} else {
  const roster = new Map();
  for (const m of rosterBlock.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z0-9-]+)\s*\|/gm)) roster.set(m[1], m[2]);
  const defined = new Map();
  if (existsSync(agentsDir)) {
    for (const file of readdirSync(agentsDir).filter((n) => n.endsWith('.md'))) {
      const text = readFileSync(join(agentsDir, file), 'utf8');
      const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const name = front.match(/^name:\s*(\S+)/m)?.[1];
      const model = front.match(/^model:\s*(\S+)/m)?.[1];
      if (!name || !model) errors.push(`agents: .claude/agents/${file} needs name and model in its frontmatter`);
      if (name && `${name}.md` !== file) errors.push(`agents: .claude/agents/${file} declares name "${name}"; file and name must match`);
      if (name) defined.set(name, model);
    }
  }
  for (const [name, model] of defined) {
    if (!roster.has(name)) errors.push(`agents: "${name}" is defined in .claude/agents but missing from the docs/AGENTS.md roster`);
    else if (roster.get(name) !== model) errors.push(`agents: "${name}" runs on "${model}" but the roster says "${roster.get(name)}"`);
  }
  for (const name of roster.keys()) {
    if (!defined.has(name)) errors.push(`agents: roster lists "${name}" but .claude/agents/${name}.md does not exist`);
  }
}

// --- 5. Relative markdown links ------------------------------------------------------------------
for (const p of files.filter((f) => f.endsWith('.md'))) {
  const text = read(p).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = normalize(join(dirname(p), decodeURI(target.split('#')[0])));
    if (relative(root, join(root, path)).startsWith('..') || !existsSync(join(root, path))) {
      errors.push(`links: ${p} links to "${target}", which does not exist`);
    }
  }
}

// --- Report --------------------------------------------------------------------------------------
if (errors.length) {
  console.error(`check-docs: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-docs: OK (${files.length} files checked)`);
