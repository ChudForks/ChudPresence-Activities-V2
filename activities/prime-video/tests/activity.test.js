import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { validateActivityV2, validateV2Metadata } from '../../../schemas/activity-api-v2.js';

test('Prime Video is a valid JSON-only v2 package with video-specific Amazon access', async () => {
  const metadata = validateV2Metadata(JSON.parse(await readFile(new URL('../metadata.json', import.meta.url), 'utf8')));
  const config = validateActivityV2(await readFile(new URL('../activity.json', import.meta.url), 'utf8'));
  assert.equal(metadata.id, 'prime-video'); assert.equal(metadata.apiVersion, 2);
  assert.equal(metadata.entry, 'activity.json'); assert.equal(config.player.adapter, 'prime-video');
  assert.equal(config.player.metadata, 'prime-video-details'); assert.equal(metadata.version, '1.1.0');
  assert.deepEqual(Object.keys(config.fields), ['title', 'subtitle']);
  assert.ok(metadata.matches.includes('https://www.primevideo.com/*'));
  assert.ok(metadata.matches.includes('https://www.amazon.com/gp/video/*'));
  assert.ok(metadata.matches.every((pattern) => !pattern.includes('*.') && (!pattern.includes('amazon.com') || pattern.endsWith('/gp/video/*'))));
  assert.equal((await readdir(new URL('../', import.meta.url))).includes('activity.js'), false);
});
