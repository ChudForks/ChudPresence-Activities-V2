import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createHarness } from '../../../tools/test-harness.mjs';
import { validateActivityMetadata } from '../../../sdk/activity-validator.js';

const source = await fs.readFile(new URL('../activity.js', import.meta.url), 'utf8');
const metadata = JSON.parse(await fs.readFile(new URL('../metadata.json', import.meta.url), 'utf8'));
const stats = 'About 4,820,000,000 results (0.22 seconds)';
function snapshot({ pathname = '/search', q = 'test', udm = null, tbm = null, ...page } = {}, reads = {}) {
  return {
    page: { origin: 'https://www.google.com', visibilityState: 'visible', pathname, query: { q, udm, tbm }, ...page },
    reads: { googleApps: '', resultStats: stats, ...reads }, media: [],
  };
}

test('Google package declares only public route parameters, apps marker and scoped result statistics', () => {
  assert.equal(validateActivityMetadata(metadata).apiVersion, 2);
  assert.equal(metadata.version, '2.0.1');
  assert.equal(metadata.presence.navigationGraceMs, 4000);
  assert.deepEqual(metadata.pageAccess.queryParameters, ['q', 'udm', 'tbm']);
  assert.equal(metadata.pageAccess.media, undefined);
  assert.deepEqual(metadata.network, []);
  assert.deepEqual(Object.keys(metadata.pageAccess.selectors), ['googleApps', 'resultStats']);
});

test('Search, Images, AI Mode and homepage produce the archived presence layout', async () => {
  for (const [page, name, details, state] of [
    [{}, 'Google', 'Searching for : test', stats],
    [{ udm: '14' }, 'Google', 'Searching for : test', stats],
    [{ udm: '2' }, 'Google Images', 'Searching for : test', ''],
    [{ tbm: 'isch' }, 'Google Images', 'Searching for : test', ''],
    [{ udm: '2', tbm: 'isch' }, 'Google Images', 'Searching for : test', ''],
    [{ pathname: '/images' }, 'Google Images', 'Searching for : test', ''],
    [{ udm: '50' }, 'Google AI', 'Searching for : test', ''],
    [{ pathname: '/', q: null }, 'Google', 'Homepage', ''],
    [{ pathname: '/webhp', q: '' }, 'Google', 'Homepage', ''],
    [{ origin: 'https://google.com' }, 'Google', 'Searching for : test', stats],
  ]) {
    const { report } = await createHarness(source).update(snapshot(page));
    assert.equal(report.display.name, name);
    assert.equal(report.display.details, details);
    assert.equal(report.display.state, state);
    assert.equal(report.display.statusDisplay, 'name');
    assert.equal(report.kind, 'generic');
    assert.equal(report.playback.state, 'playing');
    assert.equal(report.playback.elapsed, true);
    assert.equal(report.playback.live, undefined);
    assert.equal(report.playback.duration, undefined);
    assert.match(report.artwork.large, /^https:\/\/www\.google\.com\/images\/branding\/googleg\//);
    assert.equal(report.buttons, undefined);
  }
});

test('unsupported routes, modes, duplicate declarations, hidden tabs and missing readiness clear', async () => {
  for (const page of [
    { pathname: '/searching' }, { pathname: '/maps' }, { pathname: '/shopping' },
    { pathname: '/' }, { pathname: '/webhp', udm: '50', q: null },
    { pathname: '/images', udm: '14' }, { pathname: '/images', udm: '50' },
    { udm: '28' }, { udm: '7' }, { udm: '39' }, { tbm: 'nws' }, { tbm: 'vid' },
    { udm: '50', tbm: 'isch' }, { udm: '2', tbm: 'shop' },
    { q: null }, { q: '   ' }, { q: '[redacted]' }, { q: 'x'.repeat(1025) },
    { queryDuplicates: ['q'] }, { queryDuplicates: ['udm'] }, { queryDuplicates: ['tbm'] },
    { visibilityState: 'hidden' }, { visibilityState: 'prerender' },
    { origin: 'https://accounts.google.com' }, { origin: 'https://www.google.co.uk' },
  ]) assert.equal((await createHarness(source).update(snapshot(page))).operation, 'presence.clear', JSON.stringify(page));
  assert.equal((await createHarness(source).update(snapshot({}, { googleApps: null }))).operation, 'presence.clear');
});

test('missing, hidden or redacted result statistics omit the state line without inventing counts', async () => {
  for (const resultStats of [null, '', '[redacted]', 'About [redacted] results']) {
    const { report } = await createHarness(source).update(snapshot({}, { resultStats }));
    assert.equal(report.display.state, '');
  }
});

test('submitted Unicode query text is normalized and reports stay within field limits', async () => {
  const { report } = await createHarness(source).update(snapshot({ q: 'hello & 猫\nworld' }));
  assert.equal(report.display.details, 'Searching for : hello & 猫 world');
  const long = (await createHarness(source).update(snapshot({ q: 'x'.repeat(1024) }))).report;
  assert.equal(long.media.title.length, 256);
  assert.equal(long.display.details.length, 256);
});

test('elapsed session survives polling and equivalent routes; full query, mode and visibility changes reset it', async () => {
  let now = 100_000;
  const harness = createHarness(source, { now: () => now });
  const position = async page => (await harness.update(snapshot(page))).report.playback.position;
  assert.equal(await position({}), 0);
  now += 12_000;
  assert.equal(await position({ udm: '14' }), 12);
  assert.equal(await position({ q: 'another' }), 0);
  now += 12_000;
  assert.equal(await position({ q: 'another', udm: '2' }), 0);
  now += 12_000;
  assert.equal(await position({ pathname: '/images', q: 'another' }), 12);
  assert.equal((await harness.update(snapshot({ visibilityState: 'hidden' }))).operation, 'presence.clear');
  assert.equal(await position({ pathname: '/images', q: 'another' }), 0);
  assert.equal(await position({ q: 'x'.repeat(256) + 'a' }), 0);
  now += 12_000;
  assert.equal(await position({ q: 'x'.repeat(256) + 'b' }), 0);
});

test('leaving supported routes discards session state', async () => {
  let now = 100_000;
  const harness = createHarness(source, { now: () => now });
  for (const unsupported of [snapshot({ pathname: '/maps' }), snapshot({ udm: '28' })]) {
    await harness.update(snapshot());
    now += 12_000;
    assert.equal((await harness.update(unsupported)).operation, 'presence.clear');
    assert.equal((await harness.update(snapshot())).report.playback.position, 0);
  }
});

test('brief header loss updates modes and queries without clearing or retaining stale result statistics', async () => {
  let now = 100_000;
  const harness = createHarness(source, { now: () => now });
  await harness.update(snapshot());
  now += 2000;
  let call = await harness.update(snapshot({ udm: '2' }, { googleApps: null }));
  assert.equal(call.report.display.name, 'Google Images');
  assert.equal(call.report.display.state, '');
  now += 1000;
  call = await harness.update(snapshot({ q: 'new search' }, { googleApps: null }));
  assert.equal(call.report.display.details, 'Searching for : new search');
  assert.equal(call.report.display.state, '');
  assert.equal(harness.calls.some(call => call.operation === 'presence.clear'), false);
  now += 1000;
  call = await harness.update(snapshot({ q: 'new search' }));
  assert.equal(call.report.display.state, stats);
  assert.equal(call.report.playback.position, 1);
});

test('readiness grace has a fixed four-second deadline and hidden/unsupported pages still clear immediately', async () => {
  let now = 100_000;
  const harness = createHarness(source, { now: () => now });
  await harness.update(snapshot());
  now += 1000;
  await harness.update(snapshot({}, { googleApps: null }));
  now += 3999;
  assert.equal((await harness.update(snapshot({}, { googleApps: null }))).operation, 'presence.report');
  now += 1;
  assert.equal((await harness.update(snapshot({}, { googleApps: null }))).operation, 'presence.clear');
  assert.equal((await harness.update(snapshot())).report.playback.position, 0);
  assert.equal((await harness.update(snapshot({ visibilityState: 'hidden' }, { googleApps: null }))).operation, 'presence.clear');
  await harness.update(snapshot());
  assert.equal((await harness.update(snapshot({ pathname: '/maps' }, { googleApps: null }))).operation, 'presence.clear');
});
