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

test('Instagram declares executable v2, browsing routes, bounded card reads and no network', () => {
  assert.equal(validateActivityMetadata(metadata).apiVersion, 2);
  assert.equal(metadata.minExtensionVersion, '2.0.2');
  assert.equal(metadata.entry, 'activity.js');
  assert.equal(metadata.version, '2.3.0');
  assert.deepEqual(metadata.network, []);
  assert.equal(metadata.pageAccess.mediaScopes.reel.ancestors, 16);
  assert.deepEqual(metadata.matches, ['https://www.instagram.com/*', 'https://instagram.com/*']);
  assert.deepEqual(metadata.excludeMatches || [], []);
  assert.equal(metadata.presence?.kind, undefined, 'Report kind chooses browsing vs Reel presence');
});

test('Home and Search report browsing without requiring a player or publishing search input', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    for (const [pathname, title] of [['/', 'Home'], ['/explore', 'Search'], ['/explore/', 'Search'], ['/explore/search', 'Search'], ['/explore/search/', 'Search']]) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname };
      snapshot.media = [];
      snapshot.reads = { searchInput: 'PRIVATE_SEARCH_DRAFT' };
      const { report } = await createHarness(source).update(snapshot);
      assert.equal(report.kind, 'generic');
      assert.equal(report.media.title, title);
      assert.deepEqual(report.display, { name: 'Instagram', details: 'Browsing ' + title, state: '', statusDisplay: 'name' });
      assert.deepEqual(report.playback, { state: 'playing', elapsed: true, position: 0 });
      assert.equal(report.artwork.largeText, 'Instagram');
      assert.deepEqual(report.buttons, []);
      assert.doesNotMatch(JSON.stringify(report), /PRIVATE|example.creator|Reel/);
    }
  }
});

test('profiles and profile tabs identify only the current public handle despite stale Reel players', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    for (const suffix of ['', '/', '/reels', '/reels/', '/tagged/', '/reposts/']) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname: '/Other.Creator_1' + suffix };
      const { report } = await createHarness(source).update(snapshot);
      assert.equal(report.kind, 'generic');
      assert.equal(report.media.title, '@Other.Creator_1');
      assert.equal(report.display.details, 'Viewing profile');
      assert.equal(report.display.state, '@Other.Creator_1');
      assert.deepEqual(report.buttons, [{ label: 'View Profile', url: origin + '/Other.Creator_1/' }]);
      assert.equal(report.playback.duration, undefined);
      assert.doesNotMatch(JSON.stringify(report), /example.creator|A great reel/);
    }
  }
});

test('Saved supports any username and retains its label and timer through collections and post viewers', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    for (const pathname of ['/first.user/saved', '/first.user/saved/', '/first.user/saved/all-posts/',
      '/p/Same_ID/', '/Second_User/saved/', '/Second_User/saved/collection-name/123456/']) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname };
      const { report } = await harness.update(snapshot);
      assert.equal(report.kind, 'generic');
      assert.deepEqual(report.media, { title: 'Saved' });
      assert.deepEqual(report.display, { name: 'Instagram', details: 'Saved', state: '', statusDisplay: 'name' });
      assert.deepEqual(report.buttons, []);
      assert.equal(report.playback.position, (now - 100_000) / 1000);
      assert.doesNotMatch(JSON.stringify(report), /first.user|Second_User|collection-name|123456|example.creator|A great reel/);
      now += 12000;
    }
    assert.doesNotMatch(JSON.stringify(harness.logs), /first.user|Second_User|collection-name|123456/);
  }
});

test('unhandled routes show only On Instagram and share an elapsed timer without stale page details', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    for (const pathname of ['/reels/one/extra/', '/reel/%31/', '/stories/invalid-name/123/', '/stories/example.creator/not-an-id/',
      '/stories/example.creator/123/extra/', '/stories/highlights/', '/stories/archive/123/', '/stories/direct/123/',
      '/explore/tags/cats/', '/explore/locations/', '/p/Post_ID/', '/example.creator/p/Post_ID/', '/example.creator/followers/',
      '/example%2ecreator/', '/bad-name/', '/./', '/..', '/' + 'x'.repeat(31) + '/', '/unknown/feature/',
      ...['about', 'ads', 'api', 'challenge', 'checkpoint', 'developer', 'developers', 'directory',
        'download', 'emails', 'graphql', 'help', 'legal', 'notifications', 'oauth', 'p', 'popular', 'press', 'privacy', 'push', 'reel',
        'saved', 'session', 'settings', 'terms', 'tv', 'web', 'your_activity'].map(name => '/' + name + '/')]) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname };
      const { report } = await harness.update(snapshot);
      assert.equal(report.kind, 'generic', pathname);
      assert.deepEqual(report.media, { title: 'Instagram' });
      assert.deepEqual(report.display, { name: 'Instagram', details: 'On Instagram', state: '', statusDisplay: 'name' });
      assert.deepEqual(report.buttons, []);
      assert.deepEqual(report.playback, { state: 'playing', elapsed: true, position: (now - 100_000) / 1000 });
      assert.doesNotMatch(JSON.stringify(report), /example.creator|A great reel|unknown|Post_ID/);
      now += 12000;
    }
    const hidden = { ...instagramSnapshot(), page: { origin, pathname: '/unknown/feature/', visibilityState: 'hidden' } };
    assert.equal((await harness.update(hidden)).operation, 'presence.clear');
    hidden.page.visibilityState = 'visible';
    assert.equal((await harness.update(hidden)).report.playback.position, 0);
    hidden.page.origin = 'https://not-instagram.example';
    assert.equal((await harness.update(hidden)).operation, 'presence.clear');
  }
});

test('Stories identify the URL owner without a player; story IDs and content stay out of presence', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    for (const pathname of ['/stories/Story.Creator', '/stories/Story.Creator/',
      '/stories/Story.Creator/4008117685975060734/', '/stories/Story.Creator/4008117685975060735']) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname };
      snapshot.media = [];
      snapshot.reads = { storyContent: 'PRIVATE_STORY_TEXT', reply: 'PRIVATE_REPLY' };
      const { report } = await harness.update(snapshot);
      assert.equal(report.kind, 'generic');
      assert.equal(report.display.details, 'Watching story');
      assert.equal(report.display.state, '@Story.Creator');
      assert.deepEqual(report.playback, { state: 'playing', elapsed: true, position: (now - 100_000) / 1000 });
      assert.deepEqual(report.buttons, [{ label: 'View Profile', url: origin + '/Story.Creator/' }]);
      assert.doesNotMatch(JSON.stringify(report), /400811768597506073[45]|PRIVATE|example.creator|A great reel/);
      now += 12000;
    }
    const next = instagramSnapshot();
    next.page = { ...next.page, origin, pathname: '/stories/Next.Creator/123/' };
    const { report } = await harness.update(next);
    assert.equal(report.display.state, '@Next.Creator');
    assert.equal(report.playback.position, 0);
    assert.doesNotMatch(JSON.stringify(harness.logs), /Story.Creator|Next.Creator|400811|PRIVATE/);
    for (const [pathname, details] of [['/stories/', 'Browsing Stories'], ['/stories/highlights/123456789/', 'Watching highlights']]) {
      next.page.pathname = pathname;
      const call = await harness.update(next);
      assert.equal(call.report.display.details, details);
      assert.equal(call.report.display.state, '');
      assert.deepEqual(call.report.buttons, []);
    }
  }
});

test('every accounts subpage is only Settings and every direct subpage is only Messages', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    for (const [details, paths] of [
      ['Settings', ['/accounts', '/accounts/', '/accounts/edit/', '/accounts/privacy_and_security/', '/accounts/notifications/email/', '/accounts/login/']],
      ['Messages', ['/direct', '/direct/', '/direct/inbox/', '/direct/requests/', '/direct/t/987654321/', '/direct/t/123456789/']],
    ]) {
      let now = 100_000;
      const harness = createHarness(source, { now: () => now });
      for (const pathname of paths) {
        const snapshot = instagramSnapshot();
        snapshot.page = { ...snapshot.page, origin, pathname };
        snapshot.media = [];
        snapshot.reads = { recipient: 'PRIVATE_RECIPIENT', message: 'PRIVATE_MESSAGE', email: 'PRIVATE_EMAIL', input: 'PRIVATE_INPUT' };
        const { report } = await harness.update(snapshot);
        assert.deepEqual(report.media, { title: details });
        assert.deepEqual(report.display, { name: 'Instagram', details, state: '', statusDisplay: 'name' });
        assert.deepEqual(report.buttons, []);
        assert.deepEqual(report.playback, { state: 'playing', elapsed: true, position: (now - 100_000) / 1000 });
        assert.doesNotMatch(JSON.stringify(report), /PRIVATE|edit|privacy|security|notifications|login|987654321|123456789/);
        now += 12000;
      }
      assert.doesNotMatch(JSON.stringify(harness.logs), /PRIVATE|accounts|direct|987654321|123456789/);
    }
  }
});

test('route boundaries distinguish Settings, Messages and Stories from similarly named profiles', async () => {
  for (const username of ['accounts_fan', 'direct.fan', 'stories_fan']) {
    const snapshot = instagramSnapshot();
    snapshot.page.pathname = '/' + username + '/';
    const { report } = await createHarness(source).update(snapshot);
    assert.equal(report.display.details, 'Viewing profile');
    assert.equal(report.display.state, '@' + username);
  }
  for (const pathname of ['/person/accounts/edit/', '/person/direct/inbox/', '/stories/../123/',
    '/stories/example%2ecreator/123/', '/stories/' + 'x'.repeat(31) + '/123/']) {
    const snapshot = instagramSnapshot();
    snapshot.page.pathname = pathname;
    assert.equal((await createHarness(source).update(snapshot)).report.display.details, 'On Instagram');
  }
});

test('Search context and elapsed time survive opening, paging through and closing Search videos', async () => {
  for (const origin of ['https://www.instagram.com', 'https://instagram.com']) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    for (const pathname of ['/explore/', '/p/SearchVideo_1/', '/p/SearchVideo-2', '/p/SearchPhoto_3/', '/explore/']) {
      const snapshot = instagramSnapshot();
      snapshot.page = { ...snapshot.page, origin, pathname };
      // Search activity must not depend on the post's metadata or player state.
      snapshot.media[0].scopes.reel.rejected = ['caption', 'creatorText'];
      snapshot.media[0].paused = true;
      const call = await harness.update(snapshot);
      assert.equal(call.operation, 'presence.report', pathname);
      const { report } = call;
      assert.equal(report.kind, 'generic', pathname);
      assert.equal(report.display.details, 'Browsing Search');
      assert.equal(report.display.state, '');
      assert.deepEqual(report.playback, { state: 'playing', elapsed: true, position: (now - 100_000) / 1000 });
      assert.deepEqual(report.buttons, []);
      assert.doesNotMatch(JSON.stringify(report), /example.creator|A great reel|SearchVideo|SearchPhoto/);
      now += 12000;
    }
  }
});

test('the same post URL retains its Home or profile source and replaces earlier Search context', async () => {
  const snapshot = pathname => ({ ...instagramSnapshot(), page: { origin: 'https://www.instagram.com', pathname, visibilityState: 'visible' } });
  for (const [pathname, details, state] of [
    ['/', 'Browsing Home', ''], ['/other.creator/', 'Viewing profile', '@other.creator'],
    ['/another.creator/reposts/', 'Viewing profile', '@another.creator'],
  ]) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    await harness.update(snapshot('/explore/'));
    await harness.update(snapshot('/p/Same_ID/'));
    now += 12000;
    await harness.update(snapshot(pathname));
    now += 12000;
    const { report } = await harness.update(snapshot('/p/Same_ID/'));
    assert.equal(report.kind, 'generic');
    assert.equal(report.display.details, details);
    assert.equal(report.display.state, state);
    assert.equal(report.playback.position, 12);
    assert.deepEqual(report.buttons, state ? [{ label: 'View Profile', url: 'https://www.instagram.com/' + state.slice(1) + '/' }] : []);
  }
});

test('hidden post viewers clear presence but resume their source context with a fresh timer', async () => {
  for (const [pathname, details, state] of [['/explore/', 'Browsing Search', ''], ['/other.creator/', 'Viewing profile', '@other.creator']]) {
    let now = 100_000;
    const harness = createHarness(source, { now: () => now });
    const snapshot = { ...instagramSnapshot(), page: { origin: 'https://www.instagram.com', pathname, visibilityState: 'visible' } };
    await harness.update(snapshot);
    snapshot.page.pathname = '/p/Same_ID/';
    now += 12000;
    await harness.update(snapshot);
    snapshot.page.visibilityState = 'hidden';
    assert.equal((await harness.update(snapshot)).operation, 'presence.clear');
    now += 12000;
    snapshot.page.visibilityState = 'visible';
    const { report } = await harness.update(snapshot);
    assert.equal(report.display.details, details);
    assert.equal(report.display.state, state);
    assert.equal(report.playback.position, 0);
  }
});

test('unknown post sources, departed browsing contexts and malformed post paths use On Instagram', async () => {
  const snapshot = pathname => ({ ...instagramSnapshot(), page: { origin: 'https://www.instagram.com', pathname, visibilityState: 'visible' } });
  const post = snapshot('/p/SearchVideo_1/');
  assert.equal((await createHarness(source).update(post)).report.display.details, 'On Instagram');
  for (const next of [snapshot('/reels/'), snapshot('/direct/inbox/'), snapshot('/accounts/edit/'), snapshot('/stories/other.creator/123/'),
    { ...snapshot('/p/SearchVideo_1/'), page: { ...post.page, origin: 'https://outside.example' } }]) {
    const harness = createHarness(source);
    await harness.update(snapshot('/explore/'));
    await harness.update(post);
    await harness.update(next);
    assert.equal((await harness.update(post)).report.display.details, 'On Instagram', JSON.stringify(next.page));
  }
  for (const pathname of ['/p/', '/p/Bad%2eID/', '/p/Valid_ID/extra/', '/p/' + 'x'.repeat(129) + '/']) {
    const harness = createHarness(source);
    await harness.update(snapshot('/explore/'));
    assert.equal((await harness.update(snapshot(pathname))).report.display.details, 'On Instagram');
  }
});

test('browsing timers survive polling and equivalent profile tabs but reset on activity, profile, visibility and Reel changes', async () => {
  let now = 100_000;
  const harness = createHarness(source, { now: () => now });
  const update = pathname => harness.update({ ...instagramSnapshot(), page: { origin: 'https://www.instagram.com', pathname, visibilityState: 'visible' } });
  const position = async pathname => (await update(pathname)).report.playback.position;
  assert.equal(await position('/'), 0);
  now += 12000;
  assert.equal(await position('/'), 12);
  assert.equal(await position('/explore/'), 0);
  now += 12000;
  assert.equal(await position('/explore/search/'), 12);
  assert.equal(await position('/some.creator/'), 0);
  now += 12000;
  assert.equal(await position('/Some.Creator/reposts/'), 12);
  assert.equal(await position('/other.creator/'), 0);
  const hidden = instagramSnapshot();
  hidden.page = { ...hidden.page, pathname: '/other.creator/', visibilityState: 'hidden' };
  assert.equal((await harness.update(hidden)).operation, 'presence.clear');
  assert.equal(await position('/other.creator/'), 0);
  now += 12000;
  assert.equal((await update('/reels/')).report.kind, 'video');
  assert.equal(await position('/other.creator/'), 0);
  now += 12000;
  assert.equal((await update('/accounts/edit/')).report.display.details, 'Settings');
  assert.equal(await position('/other.creator/'), 0);
  assert.doesNotMatch(JSON.stringify(harness.logs), /some.creator|other.creator|https:/i);
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

test('unsafe identities, filtered fields, conflicting permalinks, unready players and hidden/foreign pages clear', async () => {
  const mutations = [
    s => { s.page.visibilityState = 'hidden'; }, s => { s.page.visibilityState = 'prerender'; },
    s => { s.page.origin = 'https://www.instagram.com.evil.example'; },
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
