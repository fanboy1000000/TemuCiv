// Secret scan: refuses known credential formats before they reach the public repository.
//
//   node tools/check-secrets.mjs           scan every project file on disk (part of `npm run ci`)
//   node tools/check-secrets.mjs --staged  scan what is staged for the next commit (the pre-commit hook)
//
// GitHub's gitleaks job and push protection only see a secret once it is pushed or being pushed; this scan
// catches it at commit time. Patterns and scanning live in tools/lib/secrets.mjs.

import { scan } from './lib/secrets.mjs';

const staged = process.argv.includes('--staged');
const findings = scan(process.cwd(), { staged });
const where = staged ? 'staged files' : 'project files';
if (findings.length) {
  process.stderr.write(`check-secrets: ${findings.length} possible secret(s) in ${where}:\n`);
  for (const f of findings) process.stderr.write(`  ${f.path}:${f.line}  ${f.kind}\n`);
  process.stderr.write('Remove the secret (and rotate it if it was ever pushed). Never commit credentials to this public repository.\n');
  process.exit(1);
}
console.log(`check-secrets: OK (${where})`);
