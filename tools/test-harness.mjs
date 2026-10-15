// Behavioral test helper only. Production packages execute in QuickJS, never vm.
import fs from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import { normalizeActivityReport } from '../sdk/activity-validator.js';

export const primeSource = await fs.readFile(new URL('../activities/prime-video/activity.js', import.meta.url), 'utf8');
export const titleImage = character => `https://m.media-amazon.com/images/S/pv-target-images/${character.repeat(64)}.jpg`;
export function primeSnapshot({ page = {}, reads = {}, media } = {}) {
  return {
    page: { origin: 'https://www.amazon.com', pathname: '/gp/video/detail/B012345678', ...page },
    reads: { playerSurface: '', title: 'Yu-Gi-Oh!', episode: 'S1 E1 The Heart of the Cards', detailTitle: 'Yu-Gi-Oh!',
      showImageAlt: 'Yu-Gi-Oh!', showImage: titleImage('a'), episode1Label: 'Play S1 E1',
      episode1Title: '1. The Heart of the Cards', episode1Image: titleImage('b'), ...reads },
    media: media || [{ currentTime: 120, duration: 1440, paused: false, ended: false, playbackRate: 1,
      muted: false, visible: true, rect: { x: 0, y: 0, width: 1280, height: 720 } }],
  };
}

export function createHarness(source = primeSource, { now = () => Date.now() } = {}) {
  let current;
  let callback;
  const calls = [];
  const copy = value => JSON.parse(JSON.stringify(value));
  const api = {
    apiVersion: 2,
    onUpdate(value) { callback = value; },
    page: { read(name) { return current.reads[name] ?? null; }, info() { return current.page; } },
    media: { getAll() { return current.media; } },
    async report(report) {
      const value = copy(report);
      normalizeActivityReport(value, 2);
      calls.push({ operation: 'presence.report', report: value });
      return { accepted: true };
    },
    async clear() { calls.push({ operation: 'presence.clear' }); return { cleared: true }; },
  };
  const context = createContext({ ChudPresence: api, Date: class extends Date { static now() { return now(); } } });
  new Script(source).runInContext(context, { timeout: 1000 });
  return { calls, async update(snapshot) {
    current = copy(snapshot);
    const before = calls.length;
    await callback(current);
    if (calls.length !== before + 1) throw new Error('An update must report or clear exactly once.');
    return calls.at(-1);
  } };
}
