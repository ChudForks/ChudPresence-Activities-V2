/// <reference path="../../schemas/activity-api-v2.d.ts" />
(() => {
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 256) : '';
  const same = (a, b) => text(a).toLowerCase() === text(b).toLowerCase();
  let retained = null;

  function image(value) {
    // URL is deliberately unavailable in the guest. Only publish known Amazon
    // title-image paths; signed URLs and arbitrary destinations are excluded.
    return typeof value === 'string' && /^https:\/\/(?:m\.media-amazon\.com|images-(?:na|eu|fe)\.ssl-images-amazon\.com)\/images\/S\/pv-target-images\/[a-f0-9]{64}(?:\.[a-z0-9_,.-]+)?\.(?:jpg|jpeg|png|webp|avif)$/i.test(value) ? value : '';
  }

  function parseEpisode(value) {
    const match = /^(?:S(?:eason)?\s*)(\d{1,5})\s*[,.:•-]?\s*E(?:p(?:isode)?)?\s*(\d{1,5})(?:\s*[:•–—-]?\s*(.*))?$/i.exec(text(value));
    if (!match || Number(match[1]) > 10000 || Number(match[2]) > 10000) return null;
    return { season: Number(match[1]), episode: Number(match[2]), title: text(match[3]) };
  }

  function describe(title, subtitle) {
    const read = name => ChudPresence.page.read(name);
    const numbers = parseEpisode(subtitle);
    let episodeName = numbers?.title || '';
    let artwork = '';
    const detailMatches = [read('detailTitle'), read('detailLogoTitle')].some(value => text(value) && same(value, title));
    if (detailMatches && numbers) {
      // Keep each row's label, heading, and image in separate fixed scalar reads.
      // Missing values cannot shift array indices and pair unrelated episodes.
      for (let index = 1; index <= 8; index++) {
        const label = /\bS\s*(\d{1,5})\s*E\s*(\d{1,5})\b/i.exec(text(read(`episode${index}Label`)));
        const heading = /^(\d{1,5})[.)]\s*(.+)$/.exec(text(read(`episode${index}Title`)));
        if (!label || !heading || Number(label[1]) !== numbers.season || Number(label[2]) !== numbers.episode ||
            Number(heading[1]) !== numbers.episode || episodeName && !same(episodeName, heading[2])) continue;
        episodeName ||= text(heading[2]);
        artwork = image(read(`episode${index}Image`));
        break;
      }
    }
    if (!artwork && detailMatches && same(read('showImageAlt'), title)) artwork = image(read('showImage'));
    const media = numbers ? {
      title: episodeName || `Episode ${numbers.episode}`, series: title,
      season: numbers.season, episode: numbers.episode,
      subtitle: `Season ${numbers.season}, Episode ${numbers.episode}`,
    } : { title };
    return {
      kind: numbers ? 'episode' : 'movie', media,
      display: { details: media.title, state: numbers ? title : 'Prime Video' },
      ...(artwork ? { artwork: { large: artwork, largeText: numbers ? `${media.subtitle} • ${media.title}`.slice(0, 256) : title } } : {}),
    };
  }

  ChudPresence.onUpdate(async () => {
    const read = name => ChudPresence.page.read(name);
    const page = ChudPresence.page.info();
    const allowed = ['https://primevideo.com', 'https://www.primevideo.com'].includes(page.origin) ||
      ['https://amazon.com', 'https://www.amazon.com'].includes(page.origin) && /^\/gp\/video\//.test(page.pathname || '');
    const candidates = ChudPresence.media.getAll().filter(player =>
      !player.ended && player.duration > 0 && player.rect.width >= 160 && player.rect.height >= 90);
    // Snapshot media has no DOM identity. Clear ambiguous multi-player pages;
    // the public player-surface marker also supports Prime's aria-hidden VIDEO.
    const player = candidates.length === 1 ? candidates[0] : null;
    if (!allowed || read('playerSurface') == null || !player || text(read('advertisement'))) {
      retained = null;
      await ChudPresence.clear();
      return;
    }
    const route = `${page.origin}${page.pathname}`;
    const rawTitle = read('title');
    const title = text(rawTitle);
    const subtitle = text(read('episode'));
    if (title && !title.includes('[redacted]')) {
      const description = describe(title, subtitle);
      // Controls can briefly retain the title while dropping episode information.
      if (!subtitle && retained?.title === title && retained.route === route && retained.duration === player.duration) {
        description.kind = retained.description.kind;
        description.media = retained.description.media;
        description.display = retained.description.display;
      }
      if (!description.artwork && retained?.title === title && retained.route === route &&
          retained.duration === player.duration && same(description.media.title, retained.description.media.title)) {
        description.artwork = retained.description.artwork;
      }
      retained = { route, duration: player.duration, title, description };
    } else if (rawTitle !== null && rawTitle !== undefined || retained?.route !== route || retained?.duration !== player.duration) {
      retained = null;
    }
    if (!retained) { await ChudPresence.clear(); return; }
    const report = {
      ...retained.description,
      playback: { state: player.paused ? 'paused' : 'playing', position: player.currentTime, duration: player.duration, rate: player.playbackRate },
    };
    await ChudPresence.report(report);
  });
})();
