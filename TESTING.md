# V2 Activity verification

## Tracked validation

Use Node.js 20 or newer. CI runs the checks available in a fresh checkout:

```sh
npm ci
npm run check
npm run check:versions
```

These validate TypeScript declarations, pinned SDK hashes and extension agreement
when available, package metadata/source/icons, catalog hashes and version bumps.
Use `--base=<git-ref>` with the version checker for the intended review base.

## Optional local tests

Existing behavior tests and HTML fixtures under `activities/*/tests/`, test
modules under `tools/*.test.*`, and integration helpers under `tools/test-*.mjs`
remain on disk but are ignored by Git. They are not part of a fresh checkout or
CI. With these files available, run:

```sh
npm test
npm run test:extension
npm run test:browser
```

The local launcher fails with an explanatory message if no test suite is present.
Integration commands require their corresponding local helper files. Website
changes may require fixture updates; formatting, navigation, privacy and tooling
regressions remain useful checks during package changes.

The interpreter/browser helpers require the Activity Lab with its generated engine
bundle. They use the parent directory by default; set
`CHUDPRESENCE_EXTENSION_ROOT` for another checkout. Browser helpers also require
Playwright and Chromium. Set `CHUDPRESENCE_TEST_NODE_MODULES` for Playwright and
`CHUDPRESENCE_TEST_BROWSER` for a browser executable. Tests use disposable synthetic
pages, without existing profiles, credentials, live-service requests or Discord.

## Recorded coverage (October 15, 2026)

The preserved suite passed 56 tests, along with contract/catalog/type checks and
actual QuickJS and browser integration. These are recorded results, not a claim
that every optional integration was rerun by this documentation cleanup.

| Area | Preserved regression coverage |
| --- | --- |
| Prime Video | Movie/episode selection, title retention, artwork agreement, hidden controls, pause/seek, close/clear and SPA changes |
| Google | Homepage/Search/Images/AI Mode, submitted Unicode queries, visible statistics, duplicate/conflicting parameters, navigation readiness/grace, timers and visibility |
| Instagram | Browsing/profiles, post-source retention, Stories/highlights, Messages/Settings/Saved, generic fallback, Reels player/card selection, avatar-first creators, hidden audio links, progress and clear diagnostics |
| Tooling | Invalid packages, semantic versions, catalog integrity and isolated TypeScript authoring/build |
| Runtime integration | Real page collector, QuickJS guest, report validation and presence/Discord payload formatting with user preferences |

Sensitive seeded drafts, messages, search input, credentials and unrelated page
content remain excluded from snapshots. Instagram Stories/Messages/Settings
fixtures use routes without reading private content. Reels fixtures verify
identity agreement, ambiguous players, hidden fields and missing metadata.

## Remaining live checks

Fixture coverage does not verify an installed package's preview or Discord
publication. Reimport all three package files after changes, then check:

- Prime Video: signed-in movie and episode, controls shown/hidden, pause/seek,
  background playback, next episode, close, artwork, ads and supported regions.
  Show controls once to seed title metadata; see its guide for identity limits.
- Google: Homepage/Search/Images/AI Mode, query/mode changes, missing statistics,
  switching tabs, artwork/timer preferences and actual Discord layout.
- Instagram: first Reel from Home, transitions between Reels and browsing,
  profiles/posts, Stories/highlights, Messages/Settings/Saved, generic routes,
  hidden tabs, preview and actual Discord output. Direct post links and new
  documents cannot infer an earlier browsing source.

Live Instagram inspection previously confirmed creator/audio-link selectors and
route/source behavior; it did not verify the current package end to end.
Record new live findings with package/browser versions and scope. Older detailed
investigations remain in Git history and the lab's ignored historical snapshot.
