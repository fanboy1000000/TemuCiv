// The one command that runs every check the project has: `npm run ci`.
//
// Each step runs as its own process and its own exit code decides pass or fail (never a piped status).
// On success the result is recorded against the exact files on disk (tools/lib/repo.mjs), which the
// sprint-close guard requires. If files change while CI runs, the run fails: it proved nothing about
// the files that exist now.
//
// New checks (type check, lint, unit tests, determinism, headless games, performance budgets) are added
// to STEPS as the code arrives. See docs/WORKFLOW.md, "Mechanical gates".

import { spawnSync } from 'node:child_process';
import { scopeHash, writeCiRecord } from './lib/repo.mjs';

const STEPS = [
  { name: 'docs consistency', cmd: process.execPath, args: ['tools/check-docs.mjs'] },
  { name: 'hook tests', cmd: process.execPath, args: ['--test', '.claude/hooks/tests/*.test.mjs'] },
];

const root = process.cwd();
const before = scopeHash(root);
const results = [];

for (const step of STEPS) {
  console.log(`\n=== ${step.name} ===`);
  const run = spawnSync(step.cmd, step.args, { cwd: root, stdio: 'inherit' });
  const status = run.error ? `error: ${run.error.message}` : run.status;
  const passed = run.status === 0 && !run.error;
  results.push({ name: step.name, passed, status });
  console.log(`=== ${step.name}: ${passed ? 'PASS' : `FAIL (${status})`} ===`);
}

const failed = results.filter((r) => !r.passed);
const unchanged = scopeHash(root) === before;
const result = failed.length === 0 && unchanged ? 'pass' : 'fail';
writeCiRecord(root, { result, steps: results });

console.log(`\nCI ${result.toUpperCase()}: ${results.length - failed.length}/${results.length} checks passed.`);
for (const f of failed) console.log(`  FAILED: ${f.name}`);
if (!unchanged) {
  console.log('  FAILED: project files changed while CI was running, so this run proves nothing about them.');
  console.log('          (Redirecting CI output into the repository counts too: write logs outside it.)');
}
process.exit(result === 'pass' ? 0 : 1);
