import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTIVITY_ID_PATTERN, ACTIVITY_KIND_VALUES, ACTIVITY_SEMVER_PATTERN,
  MAX_ACTIVITY_METADATA_BYTES, MAX_ACTIVITY_TEXT_LENGTH, MAX_ACTIVITY_ICON_BYTES,
  MAX_ACTIVITY_V2_BYTES, V2_METADATA_FIELDS, V2_TEXT_FIELDS, V2_ATTRIBUTES, V2_PLAYER_ADAPTERS,
} from '../schemas/activity-api-v2.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'schemas');
const check = process.argv.includes('--check');
const contract = JSON.parse(await fs.readFile(path.join(schemaRoot, 'activity-api-v2.json'), 'utf8'));
assert.equal(contract.apiVersion, 2);
assert.equal(contract.execution, 'declarative');
assert.equal(contract.metadataSchema.properties.id.pattern, ACTIVITY_ID_PATTERN);
assert.equal(contract.metadataSchema.properties.version.pattern, ACTIVITY_SEMVER_PATTERN);
assert.deepEqual(contract.activitySchema.properties.kind.enum, ACTIVITY_KIND_VALUES);
assert.deepEqual(contract.metadataSchema.properties.defaultMediaKind.enum, ACTIVITY_KIND_VALUES);
assert.equal(contract.limits.metadataBytes, MAX_ACTIVITY_METADATA_BYTES);
assert.equal(contract.limits.configurationBytes, MAX_ACTIVITY_V2_BYTES);
assert.equal(contract.limits.textCharacters, MAX_ACTIVITY_TEXT_LENGTH);
assert.equal(contract.limits.iconBytes, MAX_ACTIVITY_ICON_BYTES);
assert.deepEqual(Object.keys(contract.metadataSchema.properties), V2_METADATA_FIELDS);
assert.deepEqual(Object.keys(contract.activitySchema.properties.fields.properties), V2_TEXT_FIELDS);
assert.deepEqual(contract.activitySchema.properties.fields.properties.title.oneOf[1].properties.attribute.enum, V2_ATTRIBUTES);
assert.deepEqual(contract.activitySchema.properties.player.properties.adapter.enum, V2_PLAYER_ADAPTERS);
function type(schema) {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.oneOf) return schema.oneOf.map(type).join(' | ');
  if (schema.type === 'array') return `Array<${type(schema.items)}>`;
  if (schema.type === 'object') return `{\n${Object.entries(schema.properties || {}).map(([key, value]) => `  ${JSON.stringify(key)}${schema.required?.includes(key) ? '' : '?'}: ${type(value)};`).join('\n')}\n}`;
  return { string: 'string', integer: 'number', number: 'number', boolean: 'boolean' }[schema.type] || 'unknown';
}
const types = '// Generated from activity-api-v2.json. No executable Activity API is exposed.\n' +
  `export type ActivityV2Metadata = ${type(contract.metadataSchema)};\n` +
  `export type ActivityV2Configuration = ${type(contract.activitySchema)};\n`;
const id = '[a-z0-9][a-z0-9-]{1,63}';
const catalogItem = {
  type: 'object', additionalProperties: false,
  required: [...contract.metadataSchema.required, 'metadata', 'sha256', 'metadataSha256'],
  properties: {
    ...contract.metadataSchema.properties,
    entry: { type: 'string', pattern: `^activities/${id}/activity\\.json$` },
    metadata: { type: 'string', pattern: `^activities/${id}/metadata\\.json$` },
    icon: { type: 'string', pattern: `^activities/${id}/icon\\.png$` },
    sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    metadataSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    iconSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  },
  dependentRequired: { icon: ['iconSha256'], iconSha256: ['icon'] },
};
const catalogSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/ChudForks/ChudPresence-Activities-V2/blob/main/schemas/catalog.schema.json',
  title: 'ChudPresence Declarative Activity V2 Catalog',
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'generatedAt', 'activities'],
  properties: {
    schemaVersion: { const: 1 },
    generatedAt: { type: 'string', format: 'date-time' },
    activities: { type: 'array', items: catalogItem },
  },
};
const outputs = new Map([
  [path.join(schemaRoot, 'activity-v2-metadata.schema.json'), JSON.stringify(contract.metadataSchema, null, 2) + '\n'],
  [path.join(schemaRoot, 'activity-v2.schema.json'), JSON.stringify(contract.activitySchema, null, 2) + '\n'],
  [path.join(schemaRoot, 'activity-api-v2.d.ts'), types],
  [path.join(schemaRoot, 'catalog.schema.json'), JSON.stringify(catalogSchema, null, 2) + '\n'],
]);
const workspace = path.resolve(root, '..');
try {
  await fs.access(path.join(workspace, 'extension/core/activity-validator.js'));
  outputs.set(path.join(workspace, 'schemas/activity-api-v2.json'), JSON.stringify(contract, null, 2) + '\n');
  outputs.set(path.join(workspace, 'schemas/activity-v2-metadata.schema.json'), JSON.stringify(contract.metadataSchema, null, 2) + '\n');
  outputs.set(path.join(workspace, 'schemas/activity-v2.schema.json'), JSON.stringify(contract.activitySchema, null, 2) + '\n');
  outputs.set(path.join(workspace, 'schemas/activity-api-v2.d.ts'), types);
  outputs.set(path.join(workspace, 'extension/core/activity-api-v2.js'), await fs.readFile(path.join(schemaRoot, 'activity-api-v2.js'), 'utf8'));
} catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const [file, value] of outputs) {
  if (check) assert.equal(await fs.readFile(file, 'utf8'), value, `${file} is stale; run node tools/generate-api-v2.mjs`);
  else await fs.writeFile(file, value);
}
console.log('V2 schemas, declarations, catalog schema, and any Chromium lab copies are synchronized.');
