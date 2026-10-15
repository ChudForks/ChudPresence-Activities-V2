import assert from 'node:assert/strict';
import test from 'node:test';
import { createHarness, primeSnapshot, titleImage } from '../../../tools/test-harness.mjs';

test('episode reports carry clean title, series, numbers, matched artwork and progress', async () => {
  const { report } = await createHarness().update(primeSnapshot());
  assert.equal(report.kind, 'episode');
  assert.deepEqual(report.media, { title: 'The Heart of the Cards', series: 'Yu-Gi-Oh!', season: 1, episode: 1, subtitle: 'Season 1, Episode 1' });
  assert.deepEqual(report.display, { details: 'The Heart of the Cards', state: 'Yu-Gi-Oh!' });
  assert.equal(report.artwork.large, titleImage('b'));
  assert.deepEqual(report.playback, { state: 'playing', position: 120, duration: 1440, rate: 1 });
});

test('movies use their title and matching show art', async () => {
  const { report } = await createHarness().update(primeSnapshot({ reads: {
    title: 'A Movie', episode: null, detailTitle: 'A Movie', showImageAlt: 'A Movie',
  } }));
  assert.equal(report.kind, 'movie');
  assert.deepEqual(report.media, { title: 'A Movie' });
  assert.equal(report.artwork.large, titleImage('a'));
});

test('retains metadata and artwork with controls absent; pause and seeking update progress', async () => {
  const harness = createHarness();
  await harness.update(primeSnapshot());
  const snapshot = primeSnapshot({ reads: { title: null, episode: null, detailTitle: null } });
  snapshot.media[0].paused = true;
  snapshot.media[0].currentTime = 30;
  snapshot.media[0].playbackRate = 1.5;
  const { report } = await harness.update(snapshot);
  assert.equal(report.media.title, 'The Heart of the Cards');
  assert.equal(report.artwork.large, titleImage('b'));
  assert.deepEqual(report.playback, { state: 'paused', position: 30, duration: 1440, rate: 1.5 });
});

test('supports the accessibility-hidden video when the public Prime surface is present', async () => {
  const snapshot = primeSnapshot();
  snapshot.media[0].visible = false;
  assert.equal((await createHarness().update(snapshot)).operation, 'presence.report');
});

for (const [name, change] of [
  ['closed player', value => { value.reads.playerSurface = null; }],
  ['missing media', value => { value.media = []; }],
  ['ended media', value => { value.media[0].ended = true; }],
  ['zero duration during load', value => { value.media[0].duration = 0; }],
  ['collapsed media', value => { value.media[0].rect.width = 0; }],
  ['ambiguous players', value => { value.media.push({ ...value.media[0] }); }],
  ['advertisement marker', value => { value.reads.advertisement = 'Ad 0:15'; }],
  ['blank title node', value => { value.reads.title = ''; }],
  ['redacted title', value => { value.reads.title = '[redacted]'; }],
  ['different origin', value => { value.page.origin = 'https://example.com'; }],
  ['Amazon non-video route', value => { value.page.pathname = '/checkout'; }],
]) {
  test(`clears retained presence for ${name}`, async () => {
    const harness = createHarness();
    await harness.update(primeSnapshot());
    const snapshot = primeSnapshot();
    change(snapshot);
    assert.equal((await harness.update(snapshot)).operation, 'presence.clear');
    assert.equal((await harness.update(primeSnapshot({ reads: { title: null, episode: null } }))).operation, 'presence.clear');
  });
}

for (const field of ['route', 'duration']) {
  test(`does not reuse metadata after ${field} changes without controls`, async () => {
    const harness = createHarness();
    await harness.update(primeSnapshot());
    const snapshot = primeSnapshot({ reads: { title: null, episode: null } });
    if (field === 'route') snapshot.page.pathname = '/gp/video/detail/B098765432';
    else snapshot.media[0].duration = 1500;
    assert.equal((await harness.update(snapshot)).operation, 'presence.clear');
  });
}

test('new episode replaces old metadata and mismatching artwork', async () => {
  const harness = createHarness();
  await harness.update(primeSnapshot());
  const { report } = await harness.update(primeSnapshot({ reads: { episode: 'Season 1 Episode 2: The Gauntlet Is Thrown', showImage: null } }));
  assert.equal(report.media.title, 'The Gauntlet Is Thrown');
  assert.equal(report.media.episode, 2);
  assert.equal(report.artwork, undefined);
});

test('requires series, episode numbers and heading to agree before using an episode image', async () => {
  for (const reads of [
    { detailTitle: 'Other Show', showImage: null },
    { episode1Label: 'Play S2 E1', showImage: null },
    { episode1Title: '1. Another title', showImage: null },
    { episode1Label: null, showImage: null },
    { episode1Image: 'https://evil.example/image.png', showImage: null },
    { episode1Image: `${titleImage('b')}?token=secret`, showImage: null },
  ]) {
    assert.equal((await createHarness().update(primeSnapshot({ reads }))).report.artwork, undefined);
  }
});

test('falls back to matching show art and can fill an absent episode name from a matching row', async () => {
  const { report } = await createHarness().update(primeSnapshot({ reads: { episode: 'S1 E1', episode1Image: null } }));
  assert.equal(report.media.title, 'The Heart of the Cards');
  assert.equal(report.artwork.large, titleImage('a'));
});

test('requires a first title sample; never reports the browse-page heading as the player title', async () => {
  assert.equal((await createHarness().update(primeSnapshot({ reads: { title: null } }))).operation, 'presence.clear');
});

test('supports primevideo.com routes and falls back to numbered episodes outside captured rows', async () => {
  const { report } = await createHarness().update(primeSnapshot({
    page: { origin: 'https://www.primevideo.com', pathname: '/detail/ABC' }, reads: { episode: 'S2 E12' },
  }));
  assert.equal(report.media.title, 'Episode 12');
  assert.equal(report.media.season, 2);
});
