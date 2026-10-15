# Verification

Verified locally on October 15, 2026:

- `npm run check`: TypeScript declarations, pinned SDK/extension agreement,
  metadata/source/icon validation and catalog hashes passed.
- `npm test`: 38 tests passed, including Prime Video movie/episode formatting,
  artwork agreement, title retention, clearing, pause/seek, invalid package
  rejection, semantic-version comparison and an isolated TypeScript CLI build.
  Google tests cover Homepage, Search/Web, modern/legacy Images, AI Mode,
  submitted Unicode queries, missing/hidden result stats, conflicting/duplicate
  parameters, unsupported pages, hidden tabs, and session timer retention/reset.
  Google 2.0.1 additionally covers bounded readiness gaps during query/mode
  transitions, omitting stale statistics and expiring at a fixed deadline.
- `npm run test:extension`: the current extension accepted the catalog and ran
  the package in its actual QuickJS/WASM interpreter. Validated report/clear
  operations for playback, hidden controls, pause/seek, episode changes, player
  close, missing first title, movies and SPA navigation. Google runs in the
  actual guest and passes through presence and Discord formatting: mode names,
  Playing type, exact details/state, omitted empty lines, elapsed-only timestamps,
  and hidden-tab clearing.
- `npm run test:browser`: an isolated headless browser captured the synthetic
  Prime DOM with the actual extension page collector, then passed snapshots into
  the actual QuickJS interpreter and report validator. Verified the real selector
  declarations, Prime's accessibility-hidden video, episode artwork, disappearing
  controls, pause/seek, player close and no reuse after close. Google's synthetic
  page verifies declared query reads, visible-only statistics, modes/homepage,
  duplicate parameters, SPA routes, hidden readiness and visibility resets.
  Captured snapshots exclude seeded drafts, snippets, AI responses and tracking.

Extension 2.0.1's `npm run test:v2-browser` also covers actual cross-document
navigation using an opted-in Activity: mode links and submitted forms, retained
presence while a response is held, direct replacement, and immediate tab-close
clearing/worker teardown during grace. This is an unpacked-extension synthetic
test; it does not publish to Discord or establish live Google rendering.

Browser and interpreter integration tests require an Activity Lab checkout with
its generated engine bundle. By default they use the parent directory. Set
`CHUDPRESENCE_EXTENSION_ROOT` to point elsewhere. Browser tests also require
Playwright and a Chromium executable. They try a local `playwright` installation,
then `CHUDPRESENCE_TEST_NODE_MODULES` (or the lab's known bundled runtime path).
Set `CHUDPRESENCE_TEST_BROWSER` to select a browser binary. They do not use an
existing browser profile, credentials, live service traffic, or Discord publishing.

These are fixture/integration results, not a fresh signed-in Prime Video test or
an installed-extension end-to-end test. The archived selectors were inspected on
Amazon US on October 13, 2026. Live verification should check a movie and episode,
pause/seek, hidden controls, background playback, next episode, player close,
artwork, ads and any supported regional layouts. Open controls once after loading
the package to seed its metadata. Package-observable identity limitations are
documented in the Prime Video README.

Google's layout is migrated from the archived package guide; current live Google
and Discord rendering have not been checked. Reload the updated extension and
import all three Google package files in Developer mode. Check Homepage,
Search/Web, Images, AI Mode, query/mode changes, switching tabs, missing result
counts, and artwork/timer preferences. Google must not show a fabricated count,
a Live label, or a repeated service-name state line on pages without statistics.
