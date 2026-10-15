// Explicit, one-way snapshot refresh. This command never writes to the extension.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, digest, repositoryText } from './build-catalog.mjs';

const upstream = path.resolve(process.argv[2] || process.env.CHUDPRESENCE_EXTENSION_ROOT || path.join(root, '..'));
const paths = {
  'ACTIVITY_API_V2.md': 'extension/ACTIVITY_API_V2.md',
  ...Object.fromEntries(['activity-api-v2.json', 'activity-v2.schema.json', 'activity-api-v2.d.ts', 'activity-report.schema.json']
    .map(name => [`schemas/${name}`, `schemas/${name}`])),
  ...Object.fromEntries(['activity-validator.js', 'activity-settings.js', 'activity-contract.generated.js', 'activity-v2-page.js']
    .map(name => [`sdk/${name}`, `extension/core/${name}`])),
};
const files = {};
for (const [local, source] of Object.entries(paths)) {
  const value = repositoryText(await fs.readFile(path.join(upstream, source), 'utf8'));
  await fs.writeFile(path.join(root, local), value);
  files[local] = { source, sha256: digest(value) };
}
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: upstream, encoding: 'utf8' }).trim();
await fs.writeFile(path.join(root, 'sdk/upstream.json'), `${JSON.stringify({ repository: 'ChudForks/ChudPresenceSolo-Chromium-Activity-Lab', revision, files }, null, 2)}\n`);
console.log('Refreshed the V2 SDK snapshot. Review the copied contract and validator changes before committing.');
