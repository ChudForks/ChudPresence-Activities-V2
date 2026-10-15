/// <reference path="../../schemas/activity-api-v2.d.ts" />
(() => {
  const logo = 'https://www.google.com/images/branding/googleg/2x/googleg_standard_color_128dp.png';
  const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  let session = null;
  let missingSince = null;

  function route(page) {
    if (!['https://www.google.com', 'https://google.com'].includes(page.origin) ||
        page.visibilityState !== 'visible' || page.queryDuplicates?.length) return null;
    const parameters = page.query || {};
    const query = text(parameters.q);
    const udm = parameters.udm ?? '';
    const tbm = parameters.tbm ?? '';
    if (typeof parameters.q === 'string' && parameters.q.length > 1024 || query.includes('[redacted]')) return null;
    if (['/', '/webhp'].includes(page.pathname)) {
      return !query && !udm && !tbm ? { id: 'homepage', name: 'Google', query: '' } : null;
    }
    if (!query || !['/search', '/images'].includes(page.pathname)) return null;
    if ((udm === '2' && ['', 'isch'].includes(tbm)) ||
        (!udm && tbm === 'isch') || (page.pathname === '/images' && !udm && !tbm)) {
      return { id: 'images', name: 'Google Images', query };
    }
    if (page.pathname !== '/search' || tbm) return null;
    if (udm === '50') return { id: 'ai', name: 'Google AI', query };
    return ['', '14'].includes(udm) ? { id: 'search', name: 'Google', query } : null;
  }

  ChudPresence.onUpdate(async () => {
    const current = route(ChudPresence.page.info());
    const now = Date.now();
    // The public Google apps marker avoids treating consent/error pages as ready.
    // Its empty visible text is valid. No input or results body is sampled.
    const ready = ChudPresence.page.read('googleApps') != null;
    if (ready) missingSince = null;
    else missingSince ??= now;
    // Google can temporarily replace its header during search/mode changes.
    // An established page may bridge that gap, with a fixed deadline. Initial
    // consent/error pages and unsupported routes still cannot start a session.
    if (!current || !ready && (!session || now - missingSince >= 4000)) {
      session = null;
      await ChudPresence.clear();
      return;
    }
    const key = JSON.stringify([current.id, current.query]);
    if (session?.key !== key) session = { key, startedAt: now };
    const homepage = current.id === 'homepage';
    const summary = ready && current.id === 'search' ? text(ChudPresence.page.read('resultStats')) : '';
    await ChudPresence.report({
      kind: 'generic',
      media: { title: homepage ? 'Homepage' : current.query.slice(0, 256) },
      display: {
        name: current.name,
        details: homepage ? 'Homepage' : `Searching for : ${current.query}`.slice(0, 256),
        state: summary.includes('[redacted]') ? '' : summary.slice(0, 256),
        statusDisplay: 'name',
      },
      playback: { state: 'playing', elapsed: true, position: Math.min(31536000, Math.max(0, (now - session.startedAt) / 1000)) },
      artwork: { large: logo, largeText: 'Google' },
    });
  });
})();
