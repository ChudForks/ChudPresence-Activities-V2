import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './build-catalog.mjs';

export function catalogSchema(contract) {
  const properties = structuredClone(contract.metadataSchema.properties);
  for (const [field, file] of [['entry', 'activity.js'], ['metadata', 'metadata.json'], ['icon', 'icon.png']]) {
    properties[field] = { type: 'string', pattern: `^activities/[a-z0-9-]+/${file.replace('.', '\\.')}\u0024` };
  }
  for (const field of ['sha256', 'metadataSha256', 'iconSha256']) properties[field] = { type: 'string', pattern: '^[a-f0-9]{64}$' };
  return { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Programmable Activity V2 catalog', type: 'object',
    additionalProperties: false, required: ['schemaVersion', 'generatedAt', 'activities'], properties: {
      schemaVersion: { const: 1 }, generatedAt: { type: 'string', format: 'date-time' }, activities: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: [...contract.metadataSchema.required, 'metadata', 'sha256', 'metadataSha256'],
        properties, allOf: [{ if: { required: ['icon'] }, then: { required: ['iconSha256'] } }],
      } },
    } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const contract = JSON.parse(await fs.readFile(path.join(root, 'schemas/activity-api-v2.json'), 'utf8'));
  const output = `${JSON.stringify(catalogSchema(contract), null, 2)}\n`;
  const destination = path.join(root, 'schemas/catalog.schema.json');
  if (process.argv.includes('--check')) assert.equal(await fs.readFile(destination, 'utf8'), output, 'Catalog schema is stale.');
  else await fs.writeFile(destination, output);
}
