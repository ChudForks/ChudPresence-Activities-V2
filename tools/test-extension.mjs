import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './build-catalog.mjs';
import { primeSource, primeSnapshot } from './test-harness.mjs';

const upstream = path.resolve(process.env.CHUDPRESENCE_EXTENSION_ROOT || path.join(root, '..'));
await import(pathToFileURL(path.join(upstream, 'extension/core/activity-v2-engine.generated.js')));
const { validateCatalog } = await import(pathToFileURL(path.join(upstream, 'extension/core/activity-repository.js')));
const { normalizeActivityReport } = await import(pathToFileURL(path.join(upstream, 'extension/core/activity-validator.js')));
const { createPresenceIntent } = await import(pathToFileURL(path.join(upstream, 'extension/core/presence.js')));
const { buildHeadlessActivity } = await import(pathToFileURL(path.join(upstream, 'extension/discord/activity-builder.js')));
const catalog = validateCatalog(JSON.parse(await fs.readFile(path.join(root, 'catalog.json'), 'utf8')));
assert.equal(catalog.activities[0].apiVersion, 2);
const calls = [];
const errors = [];
const sandbox = await globalThis.ChudPresenceV2Engine.createActivityV2Sandbox({ source: primeSource,
  request(operation, payload) {
    if (operation === 'presence.report') normalizeActivityReport(payload.report, 2);
    calls.push({ operation, payload });
    return { accepted: true };
  }, onError(error) { errors.push(String(error)); },
});
async function update(value) {
  const count = calls.length;
  assert.equal(sandbox.update(value), true);
  for (let i = 0; i < 48; i++) await Promise.resolve();
  assert.deepEqual(errors, []);
  assert.equal(calls.length, count + 1);
  return calls.at(-1);
}
try {
  let call = await update(primeSnapshot());
  assert.equal(call.payload.report.media.title, 'The Heart of the Cards');
  assert.equal(call.payload.report.media.series, 'Yu-Gi-Oh!');
  const paused = primeSnapshot({ reads: { title: null, episode: null } });
  paused.media[0].paused = true;
  paused.media[0].currentTime = 20;
  call = await update(paused);
  assert.equal(call.payload.report.playback.state, 'paused');
  assert.equal(call.payload.report.playback.position, 20);
  const changed = primeSnapshot({ reads: { episode: 'S1 E2 New Episode' } });
  call = await update(changed);
  assert.equal(call.payload.report.media.title, 'New Episode');
  assert.equal((await update(primeSnapshot({ reads: { playerSurface: null } }))).operation, 'presence.clear');
  assert.equal((await update(paused)).operation, 'presence.clear');
  call = await update(primeSnapshot({ reads: { title: 'A Movie', episode: null } }));
  assert.equal(call.payload.report.kind, 'movie');
  assert.equal((await update(primeSnapshot({ reads: { title: null }, page: { pathname: '/gp/video/detail/OTHER' } }))).operation, 'presence.clear');
  console.log('Extension integration passed: catalog accepted; Prime Video executes and reports in the actual QuickJS/WASM guest.');
} finally { sandbox.dispose(); }

const googleSource = await fs.readFile(path.join(root, 'activities/google/activity.js'), 'utf8');
const googleCalls = [];
const googleErrors = [];
const google = await globalThis.ChudPresenceV2Engine.createActivityV2Sandbox({ source: googleSource,
  request(operation, payload) {
    const report = operation === 'presence.report' ? normalizeActivityReport(payload.report, 2) : null;
    googleCalls.push({ operation, report });
    return { accepted: true };
  }, onError(error) { googleErrors.push(String(error)); },
});
try {
  for (const [udm, name] of [[null, 'Google'], ['2', 'Google Images'], ['50', 'Google AI']]) {
    const snapshot = { page: { origin: 'https://www.google.com', pathname: '/search', visibilityState: 'visible', query: { q: 'test', udm, tbm: null } },
      reads: { googleApps: '', resultStats: 'About 100 results (0.22 seconds)' }, media: [] };
    assert.equal(google.update(snapshot), true);
    for (let i = 0; i < 48; i++) await Promise.resolve();
    assert.deepEqual(googleErrors, []);
    const call = googleCalls.at(-1);
    assert.equal(call.operation, 'presence.report');
    const intent = createPresenceIntent({ ...call.report, activityName: 'Google', activityId: 'google' });
    const activity = buildHeadlessActivity(intent, '1549066134706323548');
    assert.equal(activity.name, name);
    assert.equal(activity.type, 0);
    assert.equal(activity.details, 'Searching for : test');
    assert.equal(activity.state, udm ? undefined : 'About 100 results (0.22 seconds)');
    assert.ok(activity.timestamps.start > 0);
    assert.equal(activity.timestamps.end, undefined);
    google.update({ ...snapshot, page: { ...snapshot.page, visibilityState: 'hidden' } });
    for (let i = 0; i < 48; i++) await Promise.resolve();
    assert.equal(googleCalls.at(-1).operation, 'presence.clear');
  }
  assert.deepEqual(googleErrors, []);
  console.log('Google extension integration passed: actual QuickJS, mode names, Playing, text, omitted state, elapsed timestamps and hidden-tab clearing.');
} finally { google.dispose(); }
