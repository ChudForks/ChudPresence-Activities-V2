import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root, digest, repositoryText } from './build-catalog.mjs';
import { catalogSchema } from './generate-catalog-schema.mjs';

const lock = JSON.parse(await fs.readFile(path.join(root, 'sdk/upstream.json'), 'utf8'));
const upstreamRoot = process.env.CHUDPRESENCE_EXTENSION_ROOT || path.resolve(root, '..');
let upstreamAvailable = true;
try { await fs.access(path.join(upstreamRoot, 'extension/ACTIVITY_API_V2.md')); }
catch { upstreamAvailable = false; }
if (process.env.CHUDPRESENCE_EXTENSION_ROOT) assert.ok(upstreamAvailable, 'Configured extension checkout was not found.');
for (const [local, record] of Object.entries(lock.files)) {
  const text = repositoryText(await fs.readFile(path.join(root, local), 'utf8'));
  assert.equal(digest(text), record.sha256, `${local}: SDK snapshot differs from sdk/upstream.json.`);
  if (upstreamAvailable) {
    const upstream = repositoryText(await fs.readFile(path.join(upstreamRoot, record.source), 'utf8'));
    assert.equal(text, upstream, `${local}: extension contract changed; review and refresh the SDK snapshot.`);
  }
}
const contract = JSON.parse(await fs.readFile(path.join(root, 'schemas/activity-api-v2.json'), 'utf8'));
assert.equal(contract.apiVersion, 2);
assert.deepEqual(contract.metadataSchema, JSON.parse(await fs.readFile(path.join(root, 'schemas/activity-v2.schema.json'), 'utf8')));
assert.deepEqual(contract.reportSchema, JSON.parse(await fs.readFile(path.join(root, 'schemas/activity-report.schema.json'), 'utf8')));
assert.deepEqual(catalogSchema(contract), JSON.parse(await fs.readFile(path.join(root, 'schemas/catalog.schema.json'), 'utf8')), 'Catalog schema is stale.');
console.log(`V2 SDK snapshot verified${upstreamAvailable ? ' against the extension checkout' : ' (standalone checkout)'}.`);
