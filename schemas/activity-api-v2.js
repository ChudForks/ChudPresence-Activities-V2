// Self-contained V2 contract constants. generate-api-v2.mjs checks these against
// the authoritative activity-api-v2.json contract without importing V1 tooling.
export const ACTIVITY_ID_PATTERN = '^[a-z0-9][a-z0-9-]{1,63}$';
export const ACTIVITY_SEMVER_PATTERN = '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?(\\+[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?$';
export const ACTIVITY_KIND_VALUES = Object.freeze(['video', 'movie', 'episode', 'song', 'stream', 'game', 'generic']);
export const MAX_ACTIVITY_METADATA_BYTES = 65536;
export const MAX_ACTIVITY_TEXT_LENGTH = 256;
export const MAX_ACTIVITY_ICON_BYTES = 262144;
export const ACTIVITY_V2_VERSION = 2;
export const MAX_ACTIVITY_V2_BYTES = 65536;
export const V2_TEXT_FIELDS = Object.freeze(['title', 'subtitle', 'artist', 'album', 'series', 'creator', 'channel', 'category', 'game', 'playlist']);
export const V2_ATTRIBUTES = Object.freeze(['title', 'aria-label', 'alt']);
export const V2_PLAYER_ADAPTERS = Object.freeze(['html-media', 'prime-video']);
export const V2_METADATA_FIELDS = Object.freeze(['id', 'name', 'description', 'version', 'apiVersion', 'minExtensionVersion', 'author', 'contributors', 'category', 'defaultMediaKind', 'aliases', 'tags', 'matches', 'excludeMatches', 'entry', 'icon', 'frames', 'settingsUi', 'repository', 'homepage', 'serviceUrl']);

function object(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${label} must be a JSON object.`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`${label} contains unsupported field ${key}.`);
  }
}

function text(value, maximum, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new TypeError(`${label} must be non-empty text up to ${maximum} characters.`);
}

function semver(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(value) &&
    !(value.split('+')[0].match(/^\d+\.\d+\.\d+-(.*)$/)?.[1] || '').split('.').some((part) => /^0\d+$/.test(part));
}

function publicHost(host) {
  // Exact public DNS names only. No wildcards, IP literals, ports, local names,
  // or core-owned Discord hosts. DNS resolution is not an egress firewall.
  const normalized = host.toLowerCase();
  try { if (new URL(`https://${host}/`).hostname !== normalized) return false; } catch { return false; }
  return normalized.includes('.') && normalized.length <= 253 &&
    normalized.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) &&
    !/^\d+(?:\.\d+)*$/.test(normalized) &&
    !['localhost', 'local', 'localdomain', 'lan', 'home', 'home.arpa', 'intranet', 'corp', 'internal', 'test', 'invalid', 'onion', 'discord.com', 'discordapp.com', 'discordapp.net'].some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}

export function validateV2MatchPattern(pattern) {
  if (typeof pattern !== 'string' || pattern.length > 256) return false;
  const match = /^https:\/\/([^/]+)\/(.+)$/.exec(pattern);
  return Boolean(match && publicHost(match[1]) && /^[-a-z0-9_.*%!$&'()+,;=:@/]+$/i.test(match[2]));
}

export function validateV2Selector(selector, { scope = false } = {}) {
  if (typeof selector !== 'string' || !selector.trim() || selector.length > 256 ||
      (scope && !/[#.]/.test(selector))) throw new TypeError('V2 selectors must be bounded tag, ID, or class selectors; scope needs an ID or class.');
  // Intentionally small CSS subset: no attributes, pseudo selectors, escapes,
  // wildcards, sibling traversal, or comma lists. Fallbacks are explicit arrays.
  const parts = selector.trim().split(/\s*>\s*|\s+/);
  if (parts.length > 8 || parts.some((part) => !part ||
      !/^(?:[a-z][a-z0-9-]*)?(?:[.#][a-z_][a-z0-9_-]*)*$/i.test(part) ||
      /^(?:html|body|head|script|style|link|meta|form|input|textarea|select|option|iframe|object|embed)(?:[.#]|$)/i.test(part))) {
    throw new TypeError('V2 selector uses an unsupported or sensitive selector.');
  }
  return selector.trim();
}

export function validateV2Metadata(metadata) {
  object(metadata, V2_METADATA_FIELDS, 'V2 metadata');
  if (new TextEncoder().encode(JSON.stringify(metadata)).byteLength > MAX_ACTIVITY_METADATA_BYTES) throw new TypeError('V2 metadata exceeds 64 KB.');
  if (typeof metadata.id !== 'string' || !new RegExp(ACTIVITY_ID_PATTERN).test(metadata.id)) throw new TypeError('V2 Activity ID is invalid.');
  text(metadata.name, 80, 'V2 name');
  text(metadata.description, 500, 'V2 description');
  if (!semver(metadata.version) || (metadata.minExtensionVersion !== undefined && !semver(metadata.minExtensionVersion))) throw new TypeError('V2 versions must use semantic version format.');
  if (metadata.apiVersion !== 2 || metadata.entry !== 'activity.json') throw new TypeError('V2 requires apiVersion 2 and entry activity.json. Executable packages are not accepted.');
  for (const field of ['matches', 'excludeMatches']) {
    const values = metadata[field] ?? (field === 'excludeMatches' ? [] : null);
    if (!Array.isArray(values) || values.length > 32 || (field === 'matches' && !values.length) ||
        new Set(values).size !== values.length || !values.every(validateV2MatchPattern)) throw new TypeError(`V2 ${field} requires unique exact public HTTPS hosts; wildcards and protected/local hosts are forbidden.`);
  }
  if (metadata.frames !== undefined && metadata.frames !== 'top') throw new TypeError('V2 supports only the top frame.');
  if (metadata.icon !== undefined && metadata.icon !== 'icon.png') throw new TypeError('V2 icon must be icon.png.');
  if (metadata.defaultMediaKind !== undefined && !ACTIVITY_KIND_VALUES.includes(metadata.defaultMediaKind)) throw new TypeError('V2 defaultMediaKind is invalid.');
  if (metadata.category !== undefined && !/^[a-z][a-z0-9-]{0,31}$/.test(metadata.category)) throw new TypeError('V2 category is invalid.');
  for (const field of ['aliases', 'tags']) {
    if (metadata[field] === undefined) continue;
    const values = metadata[field];
    if (!Array.isArray(values) || values.length > 32 || new Set(values).size !== values.length) throw new TypeError(`V2 ${field} is invalid.`);
    for (const value of values) {
      text(value, field === 'tags' ? 32 : 80, field);
      if (field === 'tags' && !/^[a-z0-9][a-z0-9-]{0,31}$/.test(value)) throw new TypeError('V2 tag is invalid.');
    }
  }
  const url = (value) => {
    if (typeof value !== 'string' || value.length > 2048) throw new TypeError('V2 discovery URL is invalid.');
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !publicHost(parsed.hostname)) throw new TypeError('V2 discovery URLs must use public HTTPS hosts.');
  };
  for (const field of ['repository', 'homepage', 'serviceUrl']) if (metadata[field] !== undefined) url(metadata[field]);
  const person = (value) => { object(value, ['name', 'url'], 'V2 author'); text(value.name, 80, 'V2 author name'); if (value.url !== undefined) url(value.url); };
  if (metadata.author !== undefined) person(metadata.author);
  if (metadata.contributors !== undefined) {
    if (!Array.isArray(metadata.contributors) || metadata.contributors.length > 16) throw new TypeError('V2 contributors is invalid.');
    metadata.contributors.forEach(person);
  }
  if (metadata.settingsUi !== undefined) {
    object(metadata.settingsUi, ['statusLabels'], 'V2 settingsUi');
    if (metadata.settingsUi.statusLabels !== undefined) {
      object(metadata.settingsUi.statusLabels, ['app', 'artist', 'track'], 'V2 statusLabels');
      Object.values(metadata.settingsUi.statusLabels).forEach((value) => text(value, 80, 'V2 status label'));
    }
  }
  return { ...metadata, name: metadata.name.trim(), description: metadata.description.trim(), frames: 'top' };
}

export function validateActivityV2(source) {
  if (typeof source !== 'string' || !source.trim() || new TextEncoder().encode(source).byteLength > MAX_ACTIVITY_V2_BYTES) throw new TypeError('activity.json must be non-empty JSON up to 64 KB.');
  let config;
  try { config = JSON.parse(source); } catch { throw new TypeError('V2 accepts JSON configuration, never executable JavaScript.'); }
  object(config, ['schemaVersion', 'kind', 'scope', 'fields', 'player'], 'V2 Activity');
  if (config.schemaVersion !== 1 || !ACTIVITY_KIND_VALUES.includes(config.kind)) throw new TypeError('V2 schemaVersion or media kind is invalid.');
  validateV2Selector(config.scope, { scope: true });
  object(config.fields, V2_TEXT_FIELDS, 'V2 fields');
  if (!Object.hasOwn(config.fields, 'title')) throw new TypeError('V2 requires a title extraction field.');
  for (const rule of Object.values(config.fields)) {
    object(rule, ['source', 'selectors', 'attribute', 'removePrefix', 'removeSuffix'], 'V2 field rule');
    if (!['dom.text', 'dom.attribute'].includes(rule.source)) throw new TypeError('V2 supports dom.text and dom.attribute only.');
    if (!Array.isArray(rule.selectors) || rule.selectors.length < 1 || rule.selectors.length > 4 || new Set(rule.selectors).size !== rule.selectors.length) throw new TypeError('V2 needs one to four unique fallback selectors per field.');
    rule.selectors.forEach((selector) => validateV2Selector(selector));
    if (rule.source === 'dom.attribute' ? !V2_ATTRIBUTES.includes(rule.attribute) : rule.attribute !== undefined) throw new TypeError('V2 permits only title, aria-label, or alt attribute reads.');
    for (const option of ['removePrefix', 'removeSuffix']) if (rule[option] !== undefined) text(rule[option], 64, `V2 ${option}`);
  }
  object(config.player, ['adapter', 'selectors', 'metadata'], 'V2 player');
  if (!V2_PLAYER_ADAPTERS.includes(config.player.adapter) || !Array.isArray(config.player.selectors) ||
      !config.player.selectors.length || config.player.selectors.length > 4 || new Set(config.player.selectors).size !== config.player.selectors.length) throw new TypeError('V2 needs a supported bundled adapter and one to four player selectors.');
  config.player.selectors.forEach((selector) => validateV2Selector(selector));
  if (config.player.metadata !== undefined &&
      (config.player.adapter !== 'prime-video' || config.player.metadata !== 'prime-video-details')) {
    throw new TypeError('V2 player metadata supports only the bundled prime-video-details mode.');
  }
  if (config.player.adapter === 'prime-video') {
    // Retention and the media accessibility exception belong only to this
    // fixed, bundled player integration, never arbitrary package selectors.
    const selectors = { title: '.atvwebplayersdk-title-text', subtitle: '.atvwebplayersdk-episode-info' };
    if (config.kind !== 'video' || config.scope !== '.dv-player-fullscreen' ||
        JSON.stringify(config.player.selectors) !== JSON.stringify(['.atvwebplayersdk-video-surface video']) ||
        Object.entries(config.fields).some(([field, rule]) => !selectors[field] || rule.source !== 'dom.text' ||
          JSON.stringify(rule.selectors) !== JSON.stringify([selectors[field]]) || Object.keys(rule).length !== 2)) {
      throw new TypeError('The prime-video adapter requires its fixed player container, video selector, and title/subtitle text fields.');
    }
  }
  return config;
}

export function validPrimeVideoArtworkUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.search && !url.hash &&
      ['m.media-amazon.com', 'images-na.ssl-images-amazon.com', 'images-eu.ssl-images-amazon.com', 'images-fe.ssl-images-amazon.com'].includes(url.hostname) &&
      /^\/images\/S\/pv-target-images\/[a-f0-9]{64}(?:\.[a-z0-9_,.-]+)?\.(?:jpg|jpeg|png|webp|avif)$/i.test(url.pathname);
  } catch { return false; }
}

export function validateV2Report(report, config) {
  const enriched = config.player?.adapter === 'prime-video' && config.player.metadata === 'prime-video-details';
  object(report, enriched ? ['kind', 'media', 'playback', 'artwork'] : ['kind', 'media', 'playback'], 'V2 report');
  if (report.kind !== config.kind && !(enriched && report.kind === 'episode')) throw new TypeError('V2 report kind must match its approved configuration.');
  object(report.media, [...Object.keys(config.fields), ...(enriched ? ['series', 'season', 'episode'] : [])], 'V2 report media');
  text(report.media.title, MAX_ACTIVITY_TEXT_LENGTH, 'V2 report title');
  for (const [field, value] of Object.entries(report.media)) {
    if (enriched && ['season', 'episode'].includes(field)) {
      if (!Number.isInteger(value) || value < 0 || value > 10000) throw new TypeError('V2 Prime episode numbers must be integers between 0 and 10000.');
    } else text(value, MAX_ACTIVITY_TEXT_LENGTH, 'V2 report field');
  }
  if (enriched && report.kind === 'episode' && (!report.media.series || report.media.season === undefined || report.media.episode === undefined)) {
    throw new TypeError('V2 Prime episodes require a series, season and episode.');
  }
  if (report.artwork !== undefined) {
    object(report.artwork, ['large', 'largeText'], 'V2 Prime artwork');
    if (!validPrimeVideoArtworkUrl(report.artwork.large)) throw new TypeError('V2 Prime artwork must use an approved Amazon title image URL.');
    const expected = report.kind === 'episode' ? `Season ${report.media.season}, Episode ${report.media.episode} • ${report.media.title}` : report.media.title;
    if (report.artwork.largeText !== expected.slice(0, MAX_ACTIVITY_TEXT_LENGTH)) throw new TypeError('V2 Prime artwork text must describe the reported media.');
  }
  object(report.playback, ['state', 'position', 'duration', 'live', 'rate'], 'V2 playback');
  return report;
}

export function describeActivityV2(metadata, source) {
  const config = validateActivityV2(source);
  return [
    `V2 reads media information on: ${metadata.matches.join(', ')}`,
    `Player container: ${config.scope}`,
    ...Object.entries(config.fields).map(([field, rule]) => `${field}: ${rule.source}${rule.attribute ? ` (${rule.attribute})` : ''} from ${rule.selectors.join(' or ')}`),
    `Player: ${config.player.adapter} from ${config.player.selectors.join(' or ')}`,
    ...(config.player.adapter === 'prime-video' ? ['Prime Video retains previously visible title/subtitle text while controls are removed, only for the same player, media source and route. Its rendered video may be aria-hidden for accessibility.'] : []),
    ...(config.player.metadata === 'prime-video-details' ? ['Prime Video details: parse the player episode line into series, season, episode and episode name. Read only matching public title headings, episode play labels and thumbnail images under #main. Artwork can be published from approved Amazon title-image CDN paths. No package network requests are made.'] : []),
    'These selected values may be published to Discord when sharing is enabled. Review that the selectors identify media information. V2 cannot run package JavaScript or request external network destinations.',
  ].join('\n');
}

export function canonicalV2Json(value) {
  return JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object' && !Array.isArray(nested)
    ? Object.fromEntries(Object.keys(nested).sort().map((key) => [key, nested[key]])) : nested);
}

export async function activityV2Digest(activityPackage) {
  const value = canonicalV2Json({
    metadata: validateV2Metadata(activityPackage.metadata),
    metadataSource: activityPackage.metadataSource ?? null,
    source: activityPackage.source,
    icon: activityPackage.icon || '',
    sourceType: activityPackage.sourceType || 'local',
    provenance: activityPackage.provenance || null,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
