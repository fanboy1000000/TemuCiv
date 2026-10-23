// Documentation consistency gate. Runs in `npm run ci` and GitHub Actions.
//
// Docs are the shared memory every agent works from, so stale docs mean agents acting on wrong
// information. This script catches the drift that machines can see:
//   1. size budgets  - governance docs stay short enough to be read (docs/WORKFLOW.md, "Harness evolution")
//   2. KB index      - every knowledge-base entry is listed in docs/kb/INDEX.md, and every listing exists
//   3. sprint index  - every sprint log is listed in docs/sprints/INDEX.md, numbered without gaps
//   4. agent roster  - every .claude/agents definition is in the docs/AGENTS.md roster with the same model
//   5. links         - every relative markdown link points at a file that exists
//   6. owner quotes  - every quote of the owner's words in prototype/RULES.md is in the record its mark points to
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

// --- 6. The owner's quoted words -----------------------------------------------------------------
// In prototype/RULES.md, double quotes hold only the owner's words, each inside a mark such as (A4: "words"; "more
// words"); other quoted names there are in italics. A mark opens its part of the parentheses, and a part holding
// only a quote continues the part before it. Each quote must appear word for word in the paragraphs listed below for
// its mark, each running from its opening words to the next blank line (for a list item, to the next item). A text
// match proves only that: P1 to P12, K1 to K6 and D1 to D3 share their paragraphs, and a paragraph can also hold
// engineering's narration, so whether a quote is the owner's decision under the right mark stays with the review of
// RULES.md. A quote outside a mark, under a mark not listed here, or whose paragraph's opening words are missing,
// fails. Struck-out text is not a record. The check is the owner's H1 (Sprint 5 log); add the marks here when a
// sprint records new rulings. Remove it with the prototype/ folder when production starts (M1).
const S1 = 'docs/sprints/SPRINT-1.md', S2 = 'docs/sprints/SPRINT-2.md', S4 = 'docs/sprints/SPRINT-4.md';
const S5 = 'docs/sprints/SPRINT-5.md';
const RULINGS = {
  'S1 web': [[S1, '- **Progression is a Path of Exile-style web**']],
  'S1 logistics': [[S1, '- **Logistics is a major feature.**']],
  'S1 combat': [[S1, "The owner's combat concept, still to be matured:"]],
  'S1 map': [[S1, '**Map and borders (2026-10-07).**']],
  'S1 progression': [[S1, '**Progression, revised (2026-10-07).**']],
  'S1 web pricing': [[S1, '**Web pricing (2026-10-07).**']],
  C2: [[S2, '**Economy (2026-10-15).**']],
  'owner, 2026-10-15': [['docs/sprints/SPRINT-3.md', '**Production and coin (2026-10-15).**']],
  R1: [[S4, '**R1,']],
  G1: [[S5, '**G1,']],
  W1: [[S5, '**W1,'], [S5, "Shown with W1's question"]],
  W2: [[S5, '**W2,']],
  W3: [[S5, '**W3,'], [S5, '> **Shape:**'], [S5, 'Asked "Go with this draft node list']],
  H1: [[S5, '**H1,']],
};
const K = [[S2, '**Ruling a large empire'], [S2, '**Challenges, round one (2026-10-13).**'], [S2, '**Challenges, round one, continued']];
for (let n = 1; n <= 6; n++) RULINGS[`K${n}`] = K;
for (let n = 1; n <= 3; n++) RULINGS[`D${n}`] = [[S2, '**A first playable prototype (2026-10-15).**']];
for (let n = 1; n <= 5; n++) RULINGS[`A${n}`] = [[S4, `**A${n},`]];
for (let n = 1; n <= 12; n++) RULINGS[`P${n}`] = [[S2, '**Slice 1 placeholders (2026-10-15).**'], ['prototype/RULINGS.md', `- P${n} `]];
// A known mark, longest first so "S1 web pricing" beats "S1 web"; failing that, anything shaped like a mark.
const MARK = new RegExp(`^\\s*(${Object.keys(RULINGS).sort((a, b) => b.length - a.length).join('|')})(?![\\w-])`);
const MARK_SHAPED = /^\s*(S1 [a-z]+|owner, \d{4}-\d{2}-\d{2}|[A-Z]\d{1,2})(?![\w-])/;
const ANY_MARK = /(?<![\w-])(S1 [a-z]+|owner, \d{4}-\d{2}-\d{2}|[A-Z]\d{1,2})(?![\w-])/g;
const plain = (text) => text.replace(/~~[\s\S]*?~~/g, ' ').replace(/^\s*>\s?/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ');
const section = (p, opening) => {
  const text = existsSync(join(root, p)) ? read(p) : '';
  const at = text.indexOf(opening);
  if (at < 0) return null;
  const end = text.slice(at + 1).search(opening.startsWith('- ') ? /\n\s*\n|\n- / : /\n\s*\n/);
  return plain(text.slice(at, end < 0 ? undefined : at + 1 + end));
};
const QUOTED = 'prototype/RULES.md';
if (existsSync(join(root, QUOTED))) {
  const text = read(QUOTED).replace(/\s+/g, ' ');
  // Top-level parentheses, split at semicolons; quotes are opaque, so a quote may hold parentheses or semicolons.
  const groups = [];
  let depth = 0, inQuote = false, segment = '', outside = '';
  for (const c of text) {
    if (c === '"') inQuote = !inQuote;
    if (!inQuote && c === '(' && depth++ === 0) { groups.push([]); segment = ''; continue; }
    if (!inQuote && c === ')' && depth > 0 && --depth === 0) { groups.at(-1).push(segment); continue; }
    if (depth === 0) { outside += c; continue; }
    if (!inQuote && c === ';' && depth === 1) { groups.at(-1).push(segment); segment = ''; continue; }
    segment += c;
  }
  if (inQuote) errors.push(`quotes: ${QUOTED} has an unclosed quotation mark`);
  if (depth > 0) errors.push(`quotes: ${QUOTED} has an unclosed parenthesis`);
  for (const [, quote] of outside.matchAll(/"([^"]+)"/g)) {
    errors.push(`quotes: ${QUOTED} has "${quote}" outside a mark; the owner's words sit in a mark, other names in italics`);
  }
  for (const segments of groups) {
    let mark = null;
    for (const seg of segments) {
      // The words around the quotes: a mark first, or nothing at all (a bare quote continues the previous mark).
      const words = seg.replace(/"[^"]*"/g, ' ').trim();
      const head = words.match(MARK)?.[1] ?? words.match(MARK_SHAPED)?.[1];
      mark = head ?? (words ? null : mark);
      const late = [...words.slice(head?.length ?? 0).matchAll(ANY_MARK)].map((m) => m[1]);
      for (const [, quote] of seg.matchAll(/"([^"]+)"/g)) {
        if (late.length) errors.push(`quotes: ${QUOTED} has "${quote}" after "${late[0]}", a mark that doesn't open its part of the parentheses`);
        else if (!mark) errors.push(`quotes: ${QUOTED} has "${quote}" in parentheses with no mark before it`);
        else if (!RULINGS[mark]) errors.push(`quotes: ${QUOTED} quotes an unknown mark "${mark}"; add its ruling to check-docs`);
        else {
          const parts = RULINGS[mark].map(([p, opening]) => [p, opening, section(p, opening)]);
          for (const [p, opening] of parts.filter(([, , s]) => s === null)) {
            errors.push(`quotes: ${p} has no "${opening}", where ${mark}'s ruling should start; fix check-docs or the record`);
          }
          if (parts.every(([, , s]) => s !== null) && !parts.some(([, , s]) => s.includes(plain(quote)))) {
            errors.push(`quotes: ${QUOTED} quotes ${mark}: "${quote}", which is not word for word in ${mark}'s ruling (${[...new Set(parts.map(([p]) => p))].join(', ')})`);
          }
        }
      }
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
