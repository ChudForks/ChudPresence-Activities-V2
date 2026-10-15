# Google V2

Programmable Activity API v2 package, version **2.0.1**, using the archived
[Google presence layout](https://github.com/ChudForks/ChudPresenceSolo-Chromium-Activity-Lab/blob/v2.0.4/references/legacy-activity-api-v2/activity-repository/activities/google/README.md)
in the Activity Lab checkout.

| Page | Discord name | Details | State |
| --- | --- | --- | --- |
| Homepage | Google | Homepage | Omitted |
| Search / Web | Google | Searching for : query | Visible result count and search time, when available |
| Images | Google Images | Searching for : query | Omitted |
| AI Mode | Google AI | Searching for : query | Omitted |

All modes use Playing, the existing official Google G image, mode-name compact
status, and elapsed time. Artwork and timer preferences are honored by the
extension. Query/mode changes, hiding the tab, and unsupported routes reset the
timer. Tracking-only changes and brief Google apps header replacement preserve
the same search session. Once a page is ready, a missing header is tolerated for
at most four seconds; prolonged absence clears and resets the session. Result
statistics are omitted during that gap.

`presence.navigationGraceMs: 4000` asks extension 2.0.1 to retain the outgoing
presence for up to four seconds during an in-scope link/form navigation. The
new page's report replaces it directly. Closing the tab still clears immediately,
including while the next page is loading. The extension caps this preference at
five seconds; guests cannot defer tab-close cleanup.

Supported hosts: `www.google.com` and `google.com`. Search requires `/search`
with a submitted `q`, no `tbm`, and absent `udm` or `udm=14`. Images accepts
`udm=2`, legacy `tbm=isch`, or `/images?q=...`. AI Mode accepts `/search?udm=50`
with `q`. Homepage accepts `/` and `/webhp` without a query or mode. Duplicate
declared parameters, conflicting modes, other products/tabs, regional hosts,
and AI conversation follow-ups clear presence.

Only declared `q`, `udm`, and `tbm` URL parameters, the public `#gbwa` Google apps
marker, and visible `#main #result-stats` text are read. Search inputs, drafts,
AI responses, accounts, result snippets and image captions are excluded. The
submitted search text may be shared with Discord when sharing is enabled.
Hidden/missing statistics are omitted; no result count is fabricated. No network
service is requested by the package.

Reload Activity Lab extension **2.0.1** first: this package uses v2
`display.name`, `playback.elapsed`, visibility and duplicate-parameter snapshots.
In **Activity Library → Developer → Load local Activity**, select
`metadata.json`, `activity.js`, and `icon.png` from this folder, then approve the
declared Google origins. After editing, load the files again to replace the
installed source. Generating the local catalog does not publish to Discover.

The PNG is the archived official
[Google G image](https://www.google.com/images/branding/googleg/2x/googleg_standard_color_128dp.png).
Optional ignored local tests cover behavior, production QuickJS and browser
fixtures; see [the verification guide](../../TESTING.md).
Live Google and Discord rendering still require an installed-session check.
