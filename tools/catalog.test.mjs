import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readPackage, root, buildCatalog, digest, validateMetadata } from './build-catalog.mjs';

const metadata = JSON.parse(await fs.readFile(path.join(root, 'activities/prime-video/metadata.json'), 'utf8'));

test('catalog includes the unchanged metadata declarations and LF hashes for V2 packages', async () => {
  const [entry] = await buildCatalog({ check: true });
  const { icon, entry: ignored, ...fields } = metadata;
  for (const [name, value] of Object.entries(fields)) assert.deepEqual(entry[name], value);
  assert.equal(entry.apiVersion, 2);
  assert.deepEqual(entry.pageAccess, metadata.pageAccess);
  assert.equal(entry.sha256, digest((await fs.readFile(path.join(root, 'activities/prime-video/activity.js'), 'utf8')).replace(/\r\n/g, '\n')));
});

test('runtime validator rejects legacy packages, private selectors and forbidden query keys', () => {
  for (const change of [
    { apiVersion: 1 }, { entry: 'activity.json' },
    { pageAccess: { selectors: { secret: { selector: 'input[value="secret"]', read: 'text' } } } },
    { pageAccess: { queryParameters: ['token'] } },
    { network: ['https://discord.com/*'] }, { id: 'other-id' },
    { pageAccess: { selectors: { secret: { selector: 'meta', read: 'attribute', attribute: 'value' } } } },
  ]) assert.throws(() => validateMetadata({ ...metadata, ...change }, 'prime-video'));
});

test('source validation rejects modules, empty scripts and invalid icons; CRLF hashes are canonical', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'chud-v2-package-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('chud-v2-package-'));
    return fs.rm(directory, { recursive: true, force: true });
  });
  const minimal = { ...metadata };
  delete minimal.icon;
  const write = async source => {
    await fs.writeFile(path.join(directory, 'metadata.json'), `${JSON.stringify(minimal)}\r\n`);
    await fs.writeFile(path.join(directory, 'activity.js'), source);
  };
  for (const source of ['', 'export const bad = true;', 'await Promise.resolve();', 'function {']) {
    await write(source);
    await assert.rejects(readPackage('prime-video', directory));
  }
  await write('ChudPresence.onUpdate(() => {});\r\n');
  assert.equal((await readPackage('prime-video', directory)).sha256, digest('ChudPresence.onUpdate(() => {});\n'));
  await fs.writeFile(path.join(directory, 'metadata.json'), JSON.stringify(metadata));
  await fs.writeFile(path.join(directory, 'icon.png'), 'not a PNG');
  await assert.rejects(readPackage('prime-video', directory), /PNG/);
});
