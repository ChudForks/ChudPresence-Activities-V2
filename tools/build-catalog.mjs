import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { validateActivityMetadata, validateActivitySource, validateActivityIcon } from '../sdk/activity-validator.js';
import { MAX_ACTIVITY_METADATA_BYTES } from '../sdk/activity-contract.generated.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repositoryText = value => value.replace(/\r\n/g, '\n');
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');

export function validateMetadata(metadata, id, text = JSON.stringify(metadata)) {
  assert.equal(metadata?.apiVersion, 2, `${id}: only programmable Activity API V2 packages are supported.`);
  assert.equal(metadata.id, id, `${id}: metadata ID must match its directory.`);
  assert.ok(Buffer.byteLength(text) <= MAX_ACTIVITY_METADATA_BYTES, `${id}: metadata exceeds its byte limit.`);
  return validateActivityMetadata(metadata);
}

export async function readPackage(id, directory = path.join(root, 'activities', id)) {
  assert.match(id, /^[a-z0-9][a-z0-9-]{1,63}$/);
  const metadataText = repositoryText(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8'));
  const metadata = JSON.parse(metadataText);
  validateMetadata(metadata, id, metadataText);
  const source = repositoryText(await fs.readFile(path.join(directory, 'activity.js'), 'utf8'));
  validateActivitySource(source);
  // Parse as a script, just as the guest does; imports and exports are invalid.
  new Script(source, { filename: `${id}/activity.js` });
  let icon;
  if (metadata.icon) {
    icon = await fs.readFile(path.join(directory, 'icon.png'));
    validateActivityIcon(`data:image/png;base64,${icon.toString('base64')}`);
  }
  const { entry: _entry, icon: _icon, ...fields } = metadata;
  return {
    ...fields,
    entry: `activities/${id}/activity.js`, metadata: `activities/${id}/metadata.json`,
    sha256: digest(source), metadataSha256: digest(metadataText),
    ...(icon ? { icon: `activities/${id}/icon.png`, iconSha256: digest(icon) } : {}),
  };
}

export async function buildCatalog({ check = false, base = root } = {}) {
  const directories = (await fs.readdir(path.join(base, 'activities'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const activities = await Promise.all(directories.map(id => readPackage(id, path.join(base, 'activities', id))));
  const destination = path.join(base, 'catalog.json');
  if (check) {
    const current = JSON.parse(await fs.readFile(destination, 'utf8'));
    assert.equal(current.schemaVersion, 1);
    assert.ok(Number.isFinite(Date.parse(current.generatedAt)), 'Invalid catalog timestamp.');
    assert.deepEqual(current.activities, activities, 'catalog.json is stale. Run npm run build.');
  } else {
    await fs.writeFile(destination, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), activities }, null, 2)}\n`);
  }
  return activities;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const activities = await buildCatalog({ check: process.argv.includes('--check') });
  console.log(`Validated ${activities.length} V2 package(s) and ${process.argv.includes('--check') ? 'verified' : 'wrote'} catalog hashes.`);
}
