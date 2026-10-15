// Real DOM -> current production broker -> actual QuickJS -> Discord builder.
// All network responses are synthetic; no account, profile or live service is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { root } from './build-catalog.mjs';

const upstream = path.resolve(process.env.CHUDPRESENCE_EXTENSION_ROOT || path.join(root, '..'));
await import(pathToFileURL(path.join(upstream, 'extension/core/activity-v2-engine.generated.js')));
const { normalizeActivityReport } = await import(pathToFileURL(path.join(upstream, 'extension/core/activity-validator.js')));
const { createPresenceIntent } = await import(pathToFileURL(path.join(upstream, 'extension/core/presence.js')));
const { buildHeadlessActivity } = await import(pathToFileURL(path.join(upstream, 'extension/discord/activity-builder.js')));
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch {
  const modules = process.env.CHUDPRESENCE_TEST_NODE_MODULES || 'C:/Users/Jonathan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
  playwright = createRequire(path.join(path.resolve(modules), 'package.json'))('playwright');
}
const metadata = JSON.parse(await fs.readFile(path.join(root, 'activities/instagram/metadata.json'), 'utf8'));
const source = await fs.readFile(path.join(root, 'activities/instagram/activity.js'), 'utf8');
const fixture = await fs.readFile(path.join(root, 'activities/instagram/tests/reels.html'), 'utf8');
const collector = await build({ entryPoints: [path.join(upstream, 'extension/core/activity-v2-page.js')], bundle: true,
  write: false, format: 'iife', globalName: 'InstagramPageBroker', platform: 'browser', target: 'chrome120' });
const candidates = process.env.CHUDPRESENCE_TEST_BROWSER ? [process.env.CHUDPRESENCE_TEST_BROWSER] : [
  playwright.chromium.executablePath(), ...(process.platform === 'win32' ? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'] : []),
];
let browser;
const failures = [];
for (const executablePath of candidates) {
  try { browser = await playwright.chromium.launch({ executablePath, headless: true }); break; }
  catch (error) { failures.push(String(error.message).split('\n')[0]); }
}
assert.ok(browser, `No test browser launched: ${failures.join('; ')}`);
const calls = [], errors = [], logs = [];
const createSandbox = () => globalThis.ChudPresenceV2Engine.createActivityV2Sandbox({ source,
  request(operation, payload) {
    if (operation === 'log.write') { logs.push(payload); return { value: true }; }
    if (operation === 'presence.report') normalizeActivityReport(payload.report, 2);
    calls.push({ operation, ...payload }); return { accepted: true };
  }, onError(error) { errors.push(String(error)); },
});
let sandbox;
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.route('**/*', route => route.request().resourceType() === 'document'
    ? route.fulfill({ status: 200, contentType: 'text/html', body: fixture }) : route.abort());
  async function reset(url = 'https://www.instagram.com/reels/') {
    // Real cross-document navigation owns a fresh guest and request quota.
    sandbox?.dispose();
    sandbox = await createSandbox();
    await page.goto(url);
    await page.addScriptTag({ content: collector.outputFiles[0].text });
  }
  async function sample(access = metadata.pageAccess) {
    const snapshot = await page.evaluate(access => InstagramPageBroker.collectActivityV2Snapshot(access, document), access);
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE/);
    const count = calls.length;
    assert.equal(sandbox.update(snapshot), true);
    for (let i = 0; i < 48; i++) await Promise.resolve();
    assert.deepEqual(errors, []);
    assert.equal(calls.length, count + 1);
    return { snapshot, call: calls.at(-1) };
  }
  await reset();
  // The inspected live layout has an empty avatar anchor before a separate
  // username anchor. Both have the same aria-label and public profile href.
  assert.equal(await page.locator('#current a[aria-label$=" reels"]').count(), 2);
  assert.equal(await page.locator('#current a[aria-label$=" reels"]').first().textContent(), '');
  const previousAccess = structuredClone(metadata.pageAccess);
  previousAccess.mediaScopes.reel.selectors.creatorText.selector = 'a[aria-label$=" reels"]';
  previousAccess.mediaScopes.reel.selectors.creatorHref.selector = 'a[aria-label$=" reels"]';
  const previous = await sample(previousAccess);
  assert.equal(previous.snapshot.media[1].scopes.reel.reads.creatorText, '');
  assert.equal(previous.call.operation, 'presence.clear', 'The original selector reproduces zero reports with avatar-first markup');
  let result = await sample();
  assert.equal(result.snapshot.media.length, 2);
  assert.equal(result.call.report.display.details, 'A great reel #hello');
  assert.equal(result.call.report.display.state, '@example.creator');
  assert.equal(result.snapshot.media[1].scopes.reel.reads.creatorText, 'example.creator');
  assert.equal(result.call.report.playback.state, 'paused');
  assert.deepEqual(result.call.report.buttons, [
    { label: 'View Reel', url: 'https://www.instagram.com/reels/Example_123-/' },
    { label: 'View Profile', url: 'https://www.instagram.com/example.creator/' },
  ]);
  // Home-entry Reels retain a hidden audio control plus a visible duplicate.
  // Neither control is a Reel permalink. Their native SVG labels were inspected
  // on the live failing card; do not weaken the broker's hidden-field guard.
  await reset('https://www.instagram.com/');
  await page.locator('#current').evaluate(card => {
    for (const hidden of [true, false]) {
      const control = document.createElement('a');
      control.setAttribute('role', 'link');
      control.href = '/reels/audio/123456789/';
      if (hidden) control.style.visibility = 'hidden';
      control.innerHTML = '<div><svg aria-label="Audio image"></svg><span>Track title</span></div>';
      card.append(control);
    }
  });
  assert.equal((await sample()).call.operation, 'presence.clear');
  const broadLinks = structuredClone(metadata.pageAccess);
  broadLinks.mediaScopes.reel.selectors.links.selector = 'a';
  async function enter(path) { await page.evaluate(path => history.pushState({}, '', path), path); }
  await enter('/reels/Example_123-/');
  let transition = await sample(broadLinks);
  assert.deepEqual(transition.snapshot.media[1].scopes.reel.rejected, ['links']);
  assert.equal(transition.call.operation, 'presence.clear', 'Broad links reproduce the first-Reel failure');
  transition = await sample();
  assert.equal(transition.call.report.media.title, 'A great reel #hello');
  assert.equal(transition.call.report.buttons[0].url, 'https://www.instagram.com/reels/Example_123-/');
  assert.deepEqual(transition.snapshot.media[1].scopes.reel.rejected, []);
  await page.locator('#current').evaluate(card => {
    card.querySelector('.caption [dir]').textContent = 'Next Reel';
    card.querySelector('.permalink').href = '/reels/Next_ID/';
  });
  await enter('/reels/Next_ID/');
  assert.equal((await sample()).call.report.media.title, 'Next Reel');
  await page.locator('#current').evaluate(card => {
    card.querySelector('.caption [dir]').textContent = 'A great reel #hello';
    card.querySelector('.permalink').href = '/reels/Example_123-/';
  });
  await enter('/reels/Example_123-/');
  assert.equal((await sample(broadLinks)).call.operation, 'presence.clear', 'Returning retains the same hidden-audio failure');
  assert.equal((await sample()).call.report.media.title, 'A great reel #hello');
  // Other hidden links remain rejected; only the unrelated audio control is excluded.
  await page.locator('#current .permalink').evaluate(node => node.style.visibility = 'hidden');
  assert.equal((await sample()).call.operation, 'presence.clear');
  await reset();
  await page.locator('#current video').evaluate(video => Object.defineProperty(video, 'paused', { configurable: true, value: false }));
  const report = (await sample()).call.report;
  const track = { ...normalizeActivityReport(report, 2), activityId: 'instagram', activityName: 'Instagram' };
  const intent = createPresenceIntent(track, 100000);
  const activity = buildHeadlessActivity(intent, '1549066134706323548');
  assert.equal(activity.name, 'Instagram');
  assert.equal(activity.details, 'A great reel #hello');
  assert.equal(activity.state, '@example.creator');
  assert.deepEqual(intent.timestamps, { start: 88, end: 148 });
  assert.equal(activity.assets.large_image, report.artwork.large);
  const hidden = createPresenceIntent(track, 100000, { showArtwork: false, showButtons: false, showTimestamps: false });
  assert.equal(hidden.assets, null); assert.deepEqual(hidden.buttons, []); assert.equal(hidden.timestamps, null);

  for (const mutate of [
    () => page.locator('#current .caption').evaluate(node => node.style.display = 'none'),
    () => page.locator('#current .caption [dir]').evaluate(node => node.innerHTML += '<span hidden>PRIVATE_HIDDEN</span>'),
    () => page.locator('#current .creator').evaluate(node => node.textContent = 'different.creator'),
    () => page.locator('#current .creator').evaluate(node => node.href = 'https://outside.example/example.creator/'),
    () => page.locator('#current .creator').evaluate(node => node.remove()),
    () => page.locator('#current video').evaluate(video => video.parentElement.append(document.createElement('video'))),
    () => page.locator('#current').evaluate(card => { const host = document.createElement('site-player'); host.attachShadow({ mode: 'open' }).innerHTML = '<video></video>'; card.append(host); }),
    () => page.locator('#current').evaluate(node => node.style.opacity = '0'),
    () => page.locator('#current').evaluate(node => node.style.top = '1200px'),
    () => page.locator('#current video').evaluate(node => Object.defineProperty(node, 'readyState', { configurable: true, value: 0 })),
    () => page.locator('#current .caption [dir]').evaluate(node => node.textContent = 'x'.repeat(1025)),
  ]) {
    await reset(); await mutate();
    result = await sample();
    // If the selected video stops being eligible, the remaining visible reel
    // may win. Metadata failures on an eligible winner must always clear.
    if (result.snapshot.media[1]?.visibleArea > 0 && result.snapshot.media[1]?.readyState >= 2) {
      assert.equal(result.call.operation, 'presence.clear');
    } else if (result.call.operation === 'presence.report') assert.equal(result.call.report.media.creator, 'neighbor.creator');
  }
  await reset();
  await page.locator('#current .caption').evaluate(node => node.remove());
  assert.equal((await sample()).call.report.display.details, 'Watching Reel');
  await reset();
  await page.locator('#current .permalink').evaluate(node => node.remove());
  assert.equal((await sample()).call.report.buttons.length, 1);
  await reset();
  await page.locator('#current .creator').evaluate(node => node.remove());
  result = await sample();
  assert.equal(result.call.operation, 'presence.clear', 'An avatar alone cannot supply the creator identity');
  assert.ok(logs.some(entry => entry.args[1]?.reason === 'creator-not-matched'));
  for (const url of ['/reel/Example_123-/', '/reels/Example_123-/', '/reel/Other_ID/', '/stories/example.creator/123/', '/direct/inbox/']) {
    await reset('https://www.instagram.com' + url);
    result = await sample();
    assert.equal(result.call.operation, url.includes('Example_123-') ? 'presence.report' : 'presence.clear');
  }
  await reset();
  await page.locator('#current').evaluate(card => {
    const creator = card.querySelector('.creator'), avatar = card.querySelector('.avatar');
    creator.removeAttribute('aria-label'); avatar.removeAttribute('aria-label');
    const header = document.createElement('header'); creator.replaceWith(header); header.append(avatar, creator);
    const caption = card.querySelector('.caption'); const heading = document.createElement('h1'); heading.textContent = 'Article caption'; caption.replaceWith(heading);
  });
  assert.equal((await sample()).call.report.display.details, 'Article caption');
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }));
  assert.equal((await sample()).call.operation, 'presence.clear');
  console.log('Instagram browser fixtures passed: Home -> first Reel -> next -> return with hidden/visible SVG audio controls, retained hidden-permalink rejection, avatar-before-username regression, deep cards, paused winner beside autoplay, clean links, Discord payload/preferences, hidden/private fields, ambiguous players and cleanup through the current broker and actual QuickJS.');
} finally { sandbox?.dispose(); await browser.close(); }
