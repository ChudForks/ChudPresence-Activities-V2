(() => {
  'use strict';
  const logo = 'https://play-lh.googleusercontent.com/yHi59jmO_lVamcyJ1i3rM1_E8bAiAspShnGjjURq05ipQQSUksO3QVEsXTegRSqul038-4YNA7O644XAcx251Q=s512';
  const reserved = /^(?:accounts|about|api|developer|direct|directory|emails|explore|legal|p|privacy|reel|reels|stories|tv|web)$/i;
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  function publicPath(value, origin) {
    // URL is deliberately unavailable in the guest. Broker URLs are already
    // sanitized; this still requires the exact current origin and a public path.
    if (typeof value !== 'string' || !value.startsWith(origin + '/')) return null;
    const path = value.slice(origin.length);
    return /[?\u0023%\\]/.test(path) ? null : path;
  }
  const reelId = path => /^\/reels?\/([A-Za-z0-9_-]{1,128})\/?$/.exec(path || '')?.[1] || null;
  let lastOutcome = '';
  async function clear(reason, evidence = {}) {
    // Log state changes, without captions, creator names or URL values. Repeated
    // polls stay quiet; a zero-report installation still explains its blocker.
    const signature = JSON.stringify({ reason, ...evidence });
    if (signature !== lastOutcome) {
      lastOutcome = signature;
      await ChudPresence.log.debug('Instagram: waiting for a valid Reel', { reason, ...evidence });
    }
    await ChudPresence.clear();
  }

  ChudPresence.onUpdate(async () => {
    const page = ChudPresence.page.info();
    const path = page.pathname || '';
    if (!['https://www.instagram.com', 'https://instagram.com'].includes(page.origin) ||
        page.visibilityState !== 'visible' || !/^\/reels\/?$/.test(path) && !reelId(path)) {
      await clear('page-ineligible', { visibility: page.visibilityState || 'unavailable' }); return;
    }
    // Choose the player before examining its metadata. A broken winning card
    // must clear, including when a smaller neighboring video is autoplaying.
    const media = ChudPresence.media.getAll();
    const players = media.filter(player => player.visible && !player.ended &&
      player.readyState >= 2 && player.visibleArea > 0 && player.duration > 0);
    players.sort((left, right) => right.visibleArea - left.visibleArea);
    const player = players[0];
    if (!player) { await clear('no-eligible-player', { media: media.length }); return; }
    if (players[1]?.visibleArea === player.visibleArea) { await clear('equal-size-players'); return; }
    const scope = player.scopes?.reel || player.scopes?.article;
    if (!scope) { await clear('card-scope-unavailable'); return; }
    if (scope.rejected.length) { await clear('card-fields-rejected', { fields: scope.rejected }); return; }
    const reads = scope.reads;
    const creatorPath = publicPath(reads.creatorHref, page.origin);
    const creator = /^\/([A-Za-z0-9_.]{1,30})(?:\/reels)?\/?$/.exec(creatorPath || '')?.[1];
    if (!creator || /^\.+$/.test(creator) || reserved.test(creator) ||
        text(reads.creatorText).replace(/^@/, '').toLowerCase() !== creator.toLowerCase()) {
      await clear('creator-not-matched', { textPresent: !!text(reads.creatorText), profilePathValid: !!creator }); return;
    }
    const rawCaption = reads.caption;
    const fullCaption = rawCaption === null ? 'Watching Reel' : text(rawCaption);
    if (!fullCaption || typeof rawCaption === 'string' && rawCaption.length > 1024 || fullCaption.includes('[redacted')) { await clear('caption-invalid'); return; }
    const caption = fullCaption.slice(0, 256);
    const links = [];
    for (const value of Array.isArray(reads.links) ? reads.links : []) {
      const path = publicPath(value, page.origin);
      const id = reelId(path);
      if (id && !links.some(link => link.id === id)) links.push({ id, path });
    }
    const id = reelId(path);
    if (links.length > 1 || id && links.some(link => link.id !== id)) { await clear('reel-identity-conflict'); return; }
    const permalink = links[0]?.path || (id ? path : null);
    await ChudPresence.report({
      kind: 'video', media: { title: caption, subtitle: 'Reel', creator },
      display: { details: caption, state: '@' + creator },
      playback: { state: player.paused ? 'paused' : 'playing', position: player.currentTime, duration: player.duration, rate: player.playbackRate },
      artwork: { large: logo, largeText: 'Instagram' },
      buttons: [...(permalink ? [{ label: 'View Reel', url: page.origin + permalink }] : []),
        { label: 'View Profile', url: page.origin + '/' + creator + '/' }],
    });
    if (lastOutcome !== 'reporting') {
      lastOutcome = 'reporting';
      await ChudPresence.log.info('Instagram: reporting Reel playback');
    }
  });
})();
