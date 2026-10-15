# Verification

Verified locally on October 14, 2026:

- `npm run check`: TypeScript declarations, pinned SDK/extension agreement,
  metadata/source/icon validation and catalog hashes passed.
- `npm test`: 29 tests passed, including Prime Video movie/episode formatting,
  artwork agreement, title retention, clearing, pause/seek, invalid package
  rejection, semantic-version comparison and an isolated TypeScript CLI build.
- `npm run test:extension`: the current extension accepted the catalog and ran
  the package in its actual QuickJS/WASM interpreter. Validated report/clear
  operations for playback, hidden controls, pause/seek, episode changes, player
  close, missing first title, movies and SPA navigation.
- `npm run test:browser`: an isolated headless browser captured the synthetic
  Prime DOM with the actual extension page collector, then passed snapshots into
  the actual QuickJS interpreter and report validator. Verified the real selector
  declarations, Prime's accessibility-hidden video, episode artwork, disappearing
  controls, pause/seek, player close and no reuse after close.

Browser and interpreter integration tests require an Activity Lab checkout with
its generated engine bundle. By default they use the parent directory. Set
`CHUDPRESENCE_EXTENSION_ROOT` to point elsewhere. Browser tests also require
Playwright and a Chromium executable. They try a local `playwright` installation,
then `CHUDPRESENCE_TEST_NODE_MODULES` (or the lab's known bundled runtime path).
Set `CHUDPRESENCE_TEST_BROWSER` to select a browser binary. They do not use an
existing browser profile, credentials, real Prime traffic, or Discord publishing.

These are fixture/integration results, not a fresh signed-in Prime Video test or
an installed-extension end-to-end test. The archived selectors were inspected on
Amazon US on October 13, 2026. Live verification should check a movie and episode,
pause/seek, hidden controls, background playback, next episode, player close,
artwork, ads and any supported regional layouts. Open controls once after loading
the package to seed its metadata. Package-observable identity limitations are
documented in the Prime Video README.
