import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { createHarness } from './test-harness.mjs';
import { root } from './build-catalog.mjs';

test('SDK scaffolds, builds, validates and exercises a V2 TypeScript package in an isolated checkout', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chud-v2-sdk-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('chud-v2-sdk-'));
    return fs.rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });
  for (const name of ['tools', 'schemas', 'sdk']) await fs.cp(path.join(root, name), path.join(directory, name), { recursive: true });
  for (const name of ['package.json', 'tsconfig.json']) await fs.copyFile(path.join(root, name), path.join(directory, name));
  await fs.mkdir(path.join(directory, 'activities'));
  await fs.symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const cli = (...args) => execFileSync(process.execPath, ['tools/chudpresence.mjs', 'activity', ...args], { cwd: directory, encoding: 'utf8', env });
  cli('new', 'sdk-example');
  const metadata = JSON.parse(await fs.readFile(path.join(directory, 'activities/sdk-example/metadata.json'), 'utf8'));
  assert.equal(metadata.apiVersion, 2);
  assert.equal(metadata.pageAccess.media, true);
  assert.throws(() => cli('new', '../outside'));
  assert.throws(() => cli('new', 'sdk-example'));
  cli('build', 'sdk-example');
  cli('validate', 'sdk-example');
  cli('test', 'sdk-example');
  const source = await fs.readFile(path.join(directory, 'activities/sdk-example/activity.js'), 'utf8');
  const harness = createHarness(source);
  assert.equal((await harness.update({ page: {}, reads: { title: 'Example episode' }, media: [{ visible: true, ended: false, paused: false, currentTime: 1, duration: 100, playbackRate: 1 }] })).report.media.title, 'Example episode');
  assert.equal((await harness.update({ page: {}, reads: { title: null }, media: [] })).operation, 'presence.clear');
  const catalog = JSON.parse(await fs.readFile(path.join(directory, 'catalog.json'), 'utf8'));
  assert.equal(catalog.activities[0].apiVersion, 2);
});
