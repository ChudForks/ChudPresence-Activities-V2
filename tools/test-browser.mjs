// Synthetic DOM -> production page collector -> actual QuickJS -> report validator.
// Requires the Activity Lab checkout and Playwright. No user profile or login is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { root } from './build-catalog.mjs';
import { primeSource, titleImage } from './test-harness.mjs';

const upstream = path.resolve(process.env.CHUDPRESENCE_EXTENSION_ROOT || path.join(root, '..'));
await import(pathToFileURL(path.join(upstream, 'extension/core/activity-v2-engine.generated.js')));
const { normalizeActivityReport } = await import(pathToFileURL(path.join(upstream, 'extension/core/activity-validator.js')));
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch {
  const modules = process.env.CHUDPRESENCE_TEST_NODE_MODULES || 'C:/Users/Jonathan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
  playwright = createRequire(path.join(path.resolve(modules), 'package.json'))('playwright');
}
const metadata = JSON.parse(await fs.readFile(path.join(root, 'activities/prime-video/metadata.json'), 'utf8'));
const fixture = await fs.readFile(path.join(root, 'activities/prime-video/tests/player.html'), 'utf8');
const collector = await build({ entryPoints: [path.join(upstream, 'extension/core/activity-v2-page.js')], bundle: true,
  write: false, format: 'iife', globalName: 'PrimePageBroker', platform: 'browser', target: 'chrome120' });
const candidates = process.env.CHUDPRESENCE_TEST_BROWSER ? [process.env.CHUDPRESENCE_TEST_BROWSER] : [
  playwright.chromium.executablePath(), ...(process.platform === 'win32' ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'] : []),
];
let browser;
const failures = [];
for (const executablePath of candidates) {
  try { browser = await playwright.chromium.launch({ executablePath, headless: true }); break; }
  catch (error) { failures.push(String(error.message).split('\n')[0]); }
}
assert.ok(browser, `No test browser launched. Set CHUDPRESENCE_TEST_BROWSER. ${failures.join('; ')}`);
const reports = [];
const errors = [];
const sandbox = await globalThis.ChudPresenceV2Engine.createActivityV2Sandbox({ source: primeSource,
  request(operation, payload) {
    if (operation === 'presence.report') normalizeActivityReport(payload.report, 2);
    reports.push({ operation, ...payload });
    return { accepted: true };
  }, onError(error) { errors.push(String(error)); },
});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route('**/*', route => route.request().resourceType() === 'document'
    ? route.fulfill({ status: 200, contentType: 'text/html', body: fixture }) : route.abort());
  await page.goto('https://www.amazon.com/gp/video/detail/B012345678');
  await page.addScriptTag({ content: collector.outputFiles[0].text });
  async function sample() {
    const snapshot = await page.evaluate(access => PrimePageBroker.collectActivityV2Snapshot(access, document), metadata.pageAccess);
    const before = reports.length;
    assert.equal(sandbox.update(snapshot), true);
    for (let i = 0; i < 48; i++) await Promise.resolve();
    assert.deepEqual(errors, []);
    assert.equal(reports.length, before + 1);
    return { snapshot, call: reports.at(-1) };
  }
  let result = await sample();
  assert.equal(result.snapshot.media[0].visible, false, 'Fixture models Prime aria-hidden VIDEO.');
  assert.equal(result.snapshot.reads.playerSurface, '');
  assert.equal(result.call.report.media.title, 'The Heart of the Cards');
  assert.equal(result.call.report.artwork.large, titleImage('b'));
  await page.locator('.atvwebplayersdk-title-text').evaluate(node => node.remove());
  await page.locator('.atvwebplayersdk-episode-info').evaluate(node => node.remove());
  result = await sample();
  assert.equal(result.call.report.media.title, 'The Heart of the Cards');
  await page.locator('video').evaluate(node => {
    Object.defineProperty(node, 'paused', { configurable: true, value: true });
    Object.defineProperty(node, 'currentTime', { configurable: true, value: 25 });
  });
  result = await sample();
  assert.equal(result.call.report.playback.state, 'paused');
  assert.equal(result.call.report.playback.position, 25);
  await page.locator('.dv-player-fullscreen').evaluate(node => node.style.display = 'none');
  assert.equal((await sample()).call.operation, 'presence.clear');
  await page.locator('.dv-player-fullscreen').evaluate(node => node.style.display = 'block');
  assert.equal((await sample()).call.operation, 'presence.clear');
  console.log('Browser fixture passed: real Prime selectors, accessibility-hidden video, matched artwork, disappearing controls, pause/seek and player close through the production collector and QuickJS.');

  const googleMetadata = JSON.parse(await fs.readFile(path.join(root, 'activities/google/metadata.json'), 'utf8'));
  const googleSource = await fs.readFile(path.join(root, 'activities/google/activity.js'), 'utf8');
  const googleFixture = await fs.readFile(path.join(root, 'activities/google/tests/search.html'), 'utf8');
  const googleCalls = [];
  const googleErrors = [];
  const google = await globalThis.ChudPresenceV2Engine.createActivityV2Sandbox({ source: googleSource,
    request(operation, payload) {
      if (operation === 'presence.report') normalizeActivityReport(payload.report, 2);
      googleCalls.push({ operation, ...payload });
      return { accepted: true };
    }, onError(error) { googleErrors.push(String(error)); },
  });
  try {
    await page.unroute('**/*');
    await page.route('**/*', route => route.request().resourceType() === 'document'
      ? route.fulfill({ status: 200, contentType: 'text/html', body: googleFixture }) : route.abort());
    async function googleSample() {
      const snapshot = await page.evaluate(access => PrimePageBroker.collectActivityV2Snapshot(access, document), googleMetadata.pageAccess);
      assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE|UNSUBMITTED/);
      const count = googleCalls.length;
      assert.equal(google.update(snapshot), true);
      for (let i = 0; i < 48; i++) await Promise.resolve();
      assert.deepEqual(googleErrors, []);
      assert.equal(googleCalls.length, count + 1);
      return { snapshot, call: googleCalls.at(-1) };
    }
    await page.goto('https://www.google.com/search?q=hello+%26+%E7%8C%AB&tracking=PRIVATE');
    await page.addScriptTag({ content: collector.outputFiles[0].text });
    let result = await googleSample();
    assert.equal(result.call.report.display.details, 'Searching for : hello & 猫');
    assert.equal(result.call.report.display.state, 'About 4,820,000,000 results (0.22 seconds)');
    await page.locator('#result-stats').evaluate(node => node.style.display = 'none');
    assert.equal((await googleSample()).call.report.display.state, '');
    await page.locator('#gbwa').evaluate(node => node.style.display = 'none');
    await page.evaluate(() => history.pushState({}, '', '/search?q=updated&udm=2'));
    result = await googleSample();
    assert.equal(result.call.operation, 'presence.report');
    assert.equal(result.call.report.display.name, 'Google Images');
    assert.equal(result.call.report.display.details, 'Searching for : updated');
    await page.locator('#gbwa').evaluate(node => node.style.display = 'block');
    for (const [url, name] of [
      ['/search?q=images&udm=2', 'Google Images'], ['/search?q=ai&udm=50', 'Google AI'], ['/', 'Google'],
    ]) {
      await page.evaluate(url => history.pushState({}, '', url), url);
      result = await googleSample();
      assert.equal(result.call.report.display.name, name);
      assert.equal(result.call.report.display.state, '');
    }
    assert.equal(result.call.report.display.details, 'Homepage');
    for (const url of ['/search?q=one&q=two', '/search?q=test&udm=50&udm=2', '/maps?q=test']) {
      await page.evaluate(url => history.pushState({}, '', url), url);
      assert.equal((await googleSample()).call.operation, 'presence.clear');
    }
    await page.evaluate(() => history.pushState({}, '', '/search?q=test'));
    await page.locator('#gbwa').evaluate(node => node.style.display = 'none');
    assert.equal((await googleSample()).call.operation, 'presence.clear');
    await page.locator('#gbwa').evaluate(node => node.style.display = 'block');
    await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }));
    assert.equal((await googleSample()).call.operation, 'presence.clear');
    await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }));
    assert.equal((await googleSample()).call.report.playback.position, 0);
    console.log('Google browser fixture passed: production collector and QuickJS, submitted query, visible-only stats, modes/homepage, duplicate/mismatched routes, hidden readiness and visibility; no drafts, snippets or AI responses captured.');
  } finally { google.dispose(); }
} finally { sandbox.dispose(); await browser.close(); }
