(() => {
  'use strict';
  const logo = 'https://play-lh.googleusercontent.com/yHi59jmO_lVamcyJ1i3rM1_E8bAiAspShnGjjURq05ipQQSUksO3QVEsXTegRSqul038-4YNA7O644XAcx251Q=s512';
  const reserved = /^(?:accounts|about|ads|api|challenge|checkpoint|developer|developers|direct|directory|download|emails|explore|graphql|help|legal|notifications|oauth|p|popular|press|privacy|push|reel|reels|saved|session|settings|stories|terms|tv|web|your_activity)$/i;
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  function publicPath(value, origin) {
    // URL is deliberately unavailable in the guest. Broker URLs are already
    // sanitized; this still requires the exact current origin and a public path.
    if (typeof value !== 'string' || !value.startsWith(origin + '/')) return null;
    const path = value.slice(origin.length);
    return /[?\u0023%\\]/.test(path) ? null : path;
  }
  const reelId = path => /^\/reels?\/([A-Za-z0-9_-]{1,128})\/?$/.exec(path || '')?.[1] || null;
  function browsingRoute(path) {
    if (path === '/') return { key: 'home', title: 'Home', details: 'Browsing Home', retainPosts: true };
    if (/^\/explore(?:\/search)?\/?$/.test(path)) {
      return { key: 'search', title: 'Search', details: 'Browsing Search', retainPosts: true };
    }
    if (/^\/accounts(?:\/|$)/.test(path)) return { key: 'settings', title: 'Settings', details: 'Settings' };
    if (/^\/direct(?:\/|$)/.test(path)) return { key: 'messages', title: 'Messages', details: 'Messages' };
    const savedOwner = /^\/([A-Za-z0-9_.]{1,30})\/saved(?:\/|$)/.exec(path)?.[1];
    if (savedOwner && !/^\.+$/.test(savedOwner) && !reserved.test(savedOwner)) {
      return { key: 'saved', title: 'Saved', details: 'Saved', retainPosts: true };
    }
    if (/^\/stories\/?$/.test(path)) return { key: 'stories', title: 'Stories', details: 'Browsing Stories' };
    if (/^\/stories\/highlights\/[0-9]{1,64}\/?$/.test(path)) {
      return { key: 'highlights', title: 'Highlights', details: 'Watching highlights' };
    }
    const storyOwner = /^\/stories\/([A-Za-z0-9_.]{1,30})(?:\/[0-9]{1,64})?\/?$/.exec(path)?.[1];
    if (storyOwner && !/^\.+$/.test(storyOwner) && !reserved.test(storyOwner) && !/^(?:highlights|archive)$/i.test(storyOwner)) {
      return { key: 'story:' + storyOwner.toLowerCase(), title: 'Story', details: 'Watching story', username: storyOwner };
    }
    const username = /^\/([A-Za-z0-9_.]{1,30})(?:\/(?:reels|tagged|reposts))?\/?$/.exec(path)?.[1];
    if (!username || /^\.+$/.test(username) || reserved.test(username)) return null;
    return { key: 'profile:' + username.toLowerCase(), title: '@' + username, details: 'Viewing profile', username, retainPosts: true };
  }
  let browsingContext = null;
  let session = null;
  let lastOutcome = '';
  async function clear(reason, evidence = {}) {
    session = null;
    // Log state changes, without captions, creator names or URL values. Repeated
    // polls stay quiet; a zero-report installation still explains its blocker.
    const signature = JSON.stringify({ reason, ...evidence });
    if (signature !== lastOutcome) {
      lastOutcome = signature;
      await ChudPresence.log.debug('Instagram: waiting for a supported activity', { reason, ...evidence });
    }
    await ChudPresence.clear();
  }

  ChudPresence.onUpdate(async () => {
    const page = ChudPresence.page.info();
    const path = page.pathname || '';
    if (!['https://www.instagram.com', 'https://instagram.com'].includes(page.origin)) {
      browsingContext = null;
      await clear('page-ineligible', { visibility: page.visibilityState || 'unavailable' }); return;
    }
    // /p/<id>/ is shared by Search, Home, Saved and profile post viewers. Keep the
    // preceding browsing context in this document; the post URL has no source.
    const post = /^\/p\/[A-Za-z0-9_-]{1,128}\/?$/.test(path);
    const reelPage = /^\/reels\/?$/.test(path) || !!reelId(path);
    const browsing = browsingRoute(path) || (post ? browsingContext : null) ||
      (!reelPage ? { key: 'instagram', title: 'Instagram', details: 'On Instagram' } : null);
    browsingContext = browsing?.retainPosts ? browsing : null;
    if (browsing) {
      const now = Date.now();
      if (session?.key !== browsing.key) session = { key: browsing.key, startedAt: now };
      await ChudPresence.report({
        kind: 'generic', focusPolicy: 'foreground', media: { title: browsing.title },
        display: { name: 'Instagram', details: browsing.details, state: browsing.username ? '@' + browsing.username : '', statusDisplay: 'name' },
        playback: { state: 'playing', elapsed: true, position: Math.min(31536000, Math.max(0, (now - session.startedAt) / 1000)) },
        artwork: { large: logo, largeText: 'Instagram' },
        buttons: browsing.username ? [{ label: 'View Profile', url: page.origin + '/' + browsing.username + '/' }] : [],
      });
      if (lastOutcome !== 'browsing') {
        lastOutcome = 'browsing';
        await ChudPresence.log.info('Instagram: reporting browsing activity');
      }
      return;
    }
    if (page.visibilityState !== 'visible') {
      await clear('page-ineligible', { visibility: page.visibilityState || 'unavailable' }); return;
    }
    session = null;
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
