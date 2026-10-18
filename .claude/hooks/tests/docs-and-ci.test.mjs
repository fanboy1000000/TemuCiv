// Tests that the docs checker and the CI runner fail when they should. A gate that trusts a green record
// is only as good as the tool that wrote it, so each check is shown failing on a planted problem.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { REPO_ROOT, cleanup, makeRepo, write } from './helpers.mjs';

const repos = [];
after(() => repos.forEach(cleanup));

const AGENT = (name, model) => `---\nname: ${name}\nmodel: ${model}\n---\nA test agent.\n`;

/** A throwaway project with the minimum check-docs expects, and a copy of the real tools. */
function project() {
  const root = makeRepo();
  repos.push(root);
  cpSync(join(REPO_ROOT, 'tools'), join(root, 'tools'), { recursive: true });
  write(root, 'CLAUDE.md', '# Hub\n\nSee [the workflow](docs/WORKFLOW.md).\n');
  write(root, 'docs/WORKFLOW.md', '# Workflow\n');
  write(root, 'docs/kb/INDEX.md', '| [ADR-001](decisions/ADR-001-x.md) | x |\n');
  write(root, 'docs/kb/decisions/ADR-001-x.md', '# ADR-001\n');
  write(root, 'docs/sprints/INDEX.md', '| [Sprint 1](SPRINT-1.md) |\n');
  write(root, 'docs/sprints/SPRINT-1.md', '# Sprint 1\n');
  write(root, 'docs/AGENTS.md', '<!-- roster:start -->\n| Role | Model |\n|---|---|\n| `tester` | sonnet |\n<!-- roster:end -->\n');
  write(root, '.claude/agents/tester.md', AGENT('tester', 'sonnet'));
  return root;
}

const checkDocs = (root) => spawnSync(process.execPath, ['tools/check-docs.mjs'], { cwd: root, encoding: 'utf8' });

test('check-docs passes a consistent project', () => {
  const run = checkDocs(project());
  assert.equal(run.status, 0, run.stderr);
});

test('check-docs fails on each kind of drift it guards', () => {
  const cases = [
    ['size budget', (r) => write(r, 'CLAUDE.md', 'line\n'.repeat(151)), /size: CLAUDE\.md has \d+ lines; budget is 150/],
    ['unlisted KB entry', (r) => write(r, 'docs/kb/decisions/ADR-002-y.md', '# ADR-002\n'), /ADR-002-y\.md is not listed/],
    [
      'sprint numbering gap',
      (r) => {
        write(r, 'docs/sprints/SPRINT-3.md', '# Sprint 3\n');
        write(r, 'docs/sprints/INDEX.md', '| [Sprint 1](SPRINT-1.md) |\n| [Sprint 3](SPRINT-3.md) |\n');
      },
      /numbering has a gap or duplicate near SPRINT-3\.md/,
    ],
    ['unlisted sprint log', (r) => write(r, 'docs/sprints/SPRINT-2.md', '# Sprint 2\n'), /SPRINT-2\.md is not listed/],
    ['roster model mismatch', (r) => write(r, '.claude/agents/tester.md', AGENT('tester', 'opus')), /runs on "opus" but the roster says "sonnet"/],
    ['broken link', (r) => write(r, 'docs/WORKFLOW.md', 'See [gone](missing.md).\n'), /links to "missing\.md", which does not exist/],
  ];
  for (const [name, plant, message] of cases) {
    const root = project();
    plant(root);
    const run = checkDocs(root);
    assert.equal(run.status, 1, name);
    assert.match(run.stderr, message, name);
  }
});

test('check-docs checks every quote of the owner in prototype/RULES.md against its record', () => {
  // The record: bold, a blockquote and a line break inside the quoted words; struck-out text is no record.
  const RECORD = '# Sprint 1\n\n> The owner: **ships carry armies,\n> settlers and food**; ~~walls are free~~.\n' +
    'A city builds a general the way it builds a regiment (coin and production), with no limit.\n';
  const RULINGS = '- P8 Borders: claims that tile and the\n  tiles around it.\n';
  const RULES = '# Rules\n- Ships (S1 map: "ships carry armies, settlers and food"; "settlers and food").\n' +
    '- Borders (P8: "claims that tile and the tiles around it"; eng.). Not a mark (see "The web").\n' +
    '- Generals (eng.; S1 map: "the way it builds a regiment (coin and production), with no limit").\n';
  const planted = (rules) => (r) => {
    write(r, 'docs/sprints/SPRINT-1.md', RECORD);
    write(r, 'prototype/RULINGS.md', RULINGS);
    write(r, 'prototype/RULES.md', rules);
  };
  const ok = project();
  planted(RULES)(ok);
  const run = checkDocs(ok);
  assert.equal(run.status, 0, run.stderr);

  const cases = [
    ['misquoted words', RULES.replace('settlers and food"; "', 'and food"; "'), /quotes S1 map: "ships carry armies, and food", which is not word for word in docs\/sprints\/SPRINT-1\.md/],
    ['a second quote in the same mark', RULES.replace('"settlers and food"', '"settlers and gold"'), /quotes S1 map: "settlers and gold"/],
    ['struck-out words', `${RULES}- Walls (S1 map: "walls are free").\n`, /quotes S1 map: "walls are free"/],
    ['a placeholder not in its record', RULES.replace('the tiles around it"', 'every tile around it"'), /quotes P8: .* not word for word in docs\/sprints\/SPRINT-2\.md or prototype\/RULINGS\.md/],
    ['an unknown mark', `${RULES}- New (Q7: "anything").\n`, /unknown mark "Q7"/],
    ['an unclosed quote', `${RULES}- Broken (S1 map: "ships carry).\n`, /unclosed quotation mark/],
  ];
  for (const [name, rules, message] of cases) {
    const root = project();
    planted(rules)(root);
    const bad = checkDocs(root);
    assert.equal(bad.status, 1, name);
    assert.match(bad.stderr, message, name);
  }
});

test('npm run ci records a failure and exits non-zero when a step fails', () => {
  const root = project();
  write(root, 'docs/WORKFLOW.md', 'See [gone](missing.md).\n');
  const run = spawnSync(process.execPath, ['tools/ci.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /FAILED: docs consistency/);
  const record = JSON.parse(readFileSync(join(root, '.claude/ci/last-run.json'), 'utf8'));
  assert.equal(record.result, 'fail');
});
