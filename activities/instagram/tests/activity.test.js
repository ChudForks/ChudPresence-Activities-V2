import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createHarness } from '../../../tools/test-harness.mjs';
import { validateActivityMetadata } from '../../../sdk/activity-validator.js';

const source = await fs.readFile(new URL('../activity.js', import.meta.url), 'utf8');
const metadata = JSON.parse(await fs.readFile(new URL('../metadata.json', import.meta.url), 'utf8'));
export function instagramSnapshot() {
  return {
    page: { origin: 'https://www.instagram.com', pathname: '/reels/', visibilityState: 'visible' }, reads: {},
    media: [{ visible: true, readyState: 4, visibleArea: 200000, ended: false, paused: false,
      currentTime: 12, duration: 60, playbackRate: 1, rect: { x: 0, y: 0, width: 400, height: 500 },
      scopes: { reel: { rejected: [], reads: { creatorText: 'example.creator', creatorHref: 'https://www.instagram.com/example.creator/reels/',
        caption: 'A great reel #hello', links: ['https://www.instagram.com/reels/Example_123-/'] } }, article: null } }],
  };
}

test('Instagram declares executable v2, bounded card reads, Reels-only routes and no network', () => {
  assert.equal(validateActivityMetadata(metadata).apiVersion, 2);
  assert.equal(metadata.minExtensionVersion, '2.0.2');
  assert.equal(metadata.entry, 'activity.js');
  assert.equal(metadata.version, '2.0.2');
  assert.deepEqual(metadata.network, []);
  assert.equal(metadata.pageAccess.mediaScopes.reel.ancestors, 16);
  assert.equal(metadata.matches.some(match => match.includes('stories')), false);
});

test('feed, singular/plural detail, article and bare-domain pages preserve reference presence', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    for (const path of ['/reels', '/reels/', '/reel/Example_123-', '/reel/Example_123-/', '/reels/Example_123-', '/reels/Example_123-/']) {
      for (const article of [false, true]) {
        const snapshot = instagramSnapshot();
        snapshot.page = { ...snapshot.page, origin, pathname: path };
        const player = snapshot.media[0];
        player.scopes.reel.reads.creatorHref = origin + '/example.creator/reels/';
        player.scopes.reel.reads.links = [origin + '/reels/Example_123-/'];
        if (article) { player.scopes.article = player.scopes.reel; player.scopes.reel = null; }
        const { report } = await createHarness(source).update(snapshot);
        assert.equal(report.display.details, 'A great reel #hello');
        assert.equal(report.display.state, '@example.creator');
        assert.equal(report.media.subtitle, 'Reel');
        assert.equal(report.playback.position, 12);
        assert.equal(report.playback.duration, 60);
        assert.equal(report.playback.state, 'playing');
        assert.match(report.artwork.large, /^https:\/\/play-lh.googleusercontent.com\//);
        assert.equal(report.artwork.largeText, 'Instagram');
        assert.deepEqual(report.buttons, [{ label: 'View Reel', url: origin + '/reels/Example_123-/' },
          { label: 'View Profile', url: origin + '/example.creator/' }]);
      }
    }
  }
});

test('largest paused player wins beside autoplay and a broken winner clears without borrowing metadata', async () => {
  const snapshot = instagramSnapshot();
  const neighbor = structuredClone(snapshot.media[0]);
  neighbor.visibleArea = 10000;
  neighbor.scopes.reel.reads.caption = 'Neighbor autoplay';
  snapshot.media.unshift(neighbor);
  snapshot.media[1].paused = true;
  const harness = createHarness(source);
  const { report } = await harness.update(snapshot);
  assert.equal(report.media.title, 'A great reel #hello');
  assert.equal(report.playback.state, 'paused');
  snapshot.media[1].scopes.reel = null;
  assert.equal((await harness.update(snapshot)).operation, 'presence.clear');
});

test('only absent captions fall back; missing public reel IDs omit only the Reel button', async () => {
  const snapshot = instagramSnapshot();
  snapshot.media[0].scopes.reel.reads.caption = null;
  snapshot.media[0].scopes.reel.reads.links = [];
  let call = await createHarness(source).update(snapshot);
  assert.equal(call.report.display.details, 'Watching Reel');
  assert.deepEqual(call.report.buttons, [{ label: 'View Profile', url: 'https://www.instagram.com/example.creator/' }]);
  snapshot.page.pathname = '/reel/Example_123-/';
  call = await createHarness(source).update(snapshot);
  assert.equal(call.report.buttons[0].url, 'https://www.instagram.com/reel/Example_123-/');
  snapshot.media[0].scopes.reel.reads.caption = 'x'.repeat(1024);
  call = await createHarness(source).update(snapshot);
  assert.equal(call.report.display.details, 'x'.repeat(256));
});

test('unsafe identities, filtered fields, conflicting permalinks, unready players and unsupported pages clear', async () => {
  const mutations = [
    s => { s.page.visibilityState = 'hidden'; }, s => { s.page.visibilityState = 'prerender'; },
    s => { s.page.origin = 'https://www.instagram.com.evil.example'; },
    ...['/', '/direct/inbox/', '/accounts/edit/', '/stories/example.creator/123/', '/example.creator/', '/explore/', '/reels/one/extra/', '/reel/%31/']
      .map(path => s => { s.page.pathname = path; }),
    s => { s.media[0].readyState = 0; }, s => { s.media[0].visibleArea = 0; },
    s => { s.media[0].ended = true; }, s => { s.media[0].visible = false; },
    s => { s.media[0].scopes.reel.rejected = ['caption']; },
    s => { s.media[0].scopes.reel.reads.caption = ''; },
    s => { s.media[0].scopes.reel.reads.caption = 'x'.repeat(1025); },
    s => { s.media[0].scopes.reel.reads.caption = '[redacted]'; },
    s => { s.media[0].scopes.reel.reads.creatorText = 'other.creator'; },
    s => { s.media[0].scopes.reel.reads.creatorHref = 'https://www.instagram.com.evil.example/example.creator/'; },
    s => { s.media[0].scopes.reel.reads.creatorHref = 'https://www.instagram.com/example%2ecreator/'; },
    s => { s.media[0].scopes.reel.reads.creatorText = 'direct'; s.media[0].scopes.reel.reads.creatorHref = 'https://www.instagram.com/direct/'; },
    s => { s.page.pathname = '/reel/Other_ID/'; },
    s => { s.media[0].scopes.reel.reads.links.push('https://www.instagram.com/reel/Other_ID/'); },
    s => { s.media.push(structuredClone(s.media[0])); },
  ];
  for (const mutate of mutations) {
    const snapshot = instagramSnapshot(); mutate(snapshot);
    assert.equal((await createHarness(source).update(snapshot)).operation, 'presence.clear', String(mutate));
  }
});

test('zero-report clears explain their reason once, recover, and keep page values out of diagnostic logs', async () => {
  const harness = createHarness(source);
  const snapshot = instagramSnapshot();
  snapshot.media[0].scopes.reel.reads.creatorText = '';
  assert.equal((await harness.update(snapshot)).operation, 'presence.clear');
  assert.equal(harness.logs[0].args[1].reason, 'creator-not-matched');
  await harness.update(snapshot);
  assert.equal(harness.logs.length, 1);
  await harness.update(instagramSnapshot());
  assert.equal(harness.logs[1].level, 'info');
  await harness.update(instagramSnapshot());
  assert.equal(harness.logs.length, 2);
  snapshot.media[0].scopes.reel.rejected = ['creatorText'];
  await harness.update(snapshot);
  assert.equal(harness.logs[2].args[1].reason, 'card-fields-rejected');
  assert.doesNotMatch(JSON.stringify(harness.logs), /example.creator|A great reel|https:/);
});
