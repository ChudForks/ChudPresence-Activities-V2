# Prime Video 2.0.0

Programmable Activity API V2 package for `primevideo.com`, `www.primevideo.com`,
and Amazon US `/gp/video/` pages, in the top frame. Requires the sandboxed V2
Activity Lab extension 2.0.0 or newer. Install `metadata.json`, `activity.js`, and
`icon.png` together from the Library's Developer view.

Movies show the player title. Episodes show the clean episode name followed by
the series; season/episode numbers stay in media metadata and artwork hover text.
Both include playback position, duration, speed and pause state. The extension's
existing per-Activity artwork, pause and timestamp preferences apply.

## Public reads and retention

The package declares 32 fixed selectors. It reads the modern
`.dv-player-fullscreen` player's `.atvwebplayersdk-title-text` and
`.atvwebplayersdk-episode-info`, plus a public video-surface marker, optional ad
text, the public detail heading, and title-image attributes. It reads no account
data, script globals, signed playback sources, query parameters, or network APIs.
The native media snapshots provide playback state and geometry.

Prime can mark the video itself `aria-hidden`; the package accepts its playback
snapshot only while the public Prime surface is present and one candidate has
rendered dimensions of at least 160×90. Ambiguous multiple-player snapshots clear
presence. Prime removes controls during playback, so the package retains sampled
metadata for the same route and duration. Show the controls once after installing
mid-playback. Player close, absent/ended/empty media, changed route or duration
without fresh title data, a blank/redacted title, and recognized ad text clear the
cache. Seeking preserves the sampled title and updates position.

V2 snapshots intentionally omit source URLs and DOM identity. A replacement player
with the same route and duration cannot be distinguished while controls remain
absent. Filtered and removed title nodes both produce null. These are limits of
package-observable data; the package does not claim the archived adapter's exact
source/player invalidation guarantees. No persisted metadata crosses documents.

## Artwork

Episode art requires agreement between the player series, detail heading, episode
heading, and play button's season/episode label. Each of the first eight sibling
slots under `#tab-content-episodes` has its own scalar label/title/image reads,
which prevents missing values from pairing different rows. Later or virtualized
rows fall back to matching show art; missing episode names fall back to
`Episode N`. Show art also requires its image alt text to match the series/title.

Only HTTPS Amazon title-image CDN paths are accepted. Missing art stays absent;
unrelated detail-page art is not substituted. The package makes no network
requests and adds no presence buttons. Ad clearing is best effort for the declared
ad text classes; it does not promise coverage of every Prime advertising layout.

The official service icon is copied byte-for-byte from the archived package. Its
recorded source is Prime Video's 152×152 Apple touch icon:
`https://m.media-amazon.com/images/G/01/digital/video/DVUI/favicons/apple-touch-icon-152x152.png`.

The player/detail selectors originate in the archived implementation, whose live
Amazon inspection was recorded on October 13, 2026. This replacement has synthetic
browser and actual QuickJS coverage; it has not had a fresh signed-in live playback
check. Other Amazon regions and legacy players are outside its declared scope.
