import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './build-catalog.mjs';
const tests = [];
async function collect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (/\.test\.(?:js|mjs)$/.test(entry.name)) tests.push(file);
  }
}
await collect(path.join(root, 'tools'));
await collect(path.join(root, 'activities'));
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
execFileSync(process.execPath, ['--test', ...tests.sort()], { cwd: root, stdio: 'inherit', env });
