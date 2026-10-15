# Verification

Verified locally on October 15, 2026:

- `npm run check`: TypeScript declarations, pinned SDK/extension agreement,
  metadata/source/icon validation and catalog hashes passed.
- `npm test`: 56 tests passed, including Prime Video movie/episode formatting,
  artwork agreement, title retention, clearing, pause/seek, invalid package
  rejection, semantic-version comparison and an isolated TypeScript CLI build.
  Google tests cover Homepage, Search/Web, modern/legacy Images, AI Mode,
  submitted Unicode queries, missing/hidden result stats, conflicting/duplicate
  parameters, unsupported pages, hidden tabs, and session timer retention/reset.
  Google 2.0.1 additionally covers bounded readiness gaps during query/mode
  transitions, omitting stale statistics and expiring at a fixed deadline.
  Instagram 2.3.0 covers Home, Search and profile browsing, profile tabs,
  reserved/unsupported routes, stale-player isolation, timer retention/reset
  and hidden-tab clearing, plus the archived Reels layout, default/article modes,
  largest paused player beside autoplay, missing captions/permalinks, public
  creator agreement, detail/card identity conflicts and invalid-winner clearing.
  Diagnostic tests verify zero-report clear reasons, deduplication and recovery,
  without captions, handles or URLs in logs.
  Stories cover owner handles, image/no-player operation, multiple Story IDs,
  owner changes, Story index and highlights. Every accounts/direct subpage
  reports only Settings/Messages, including login, nested settings, inbox,
  requests and thread routes. Tests verify timer retention, similarly named
  profile boundaries, excluded report values and post-source isolation.
  Saved covers different usernames, slash variants, collections and retained
  post-viewer context without owner/collection details. Unhandled routes and
  unknown-source posts show only On Instagram, sharing a generic elapsed timer.
  Hidden/foreign pages and invalid required Reel metadata still clear.
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
  Instagram's fixture also passes deep nested cards, single-player scope binding,
  invalid first/hidden fields, multiple native/shadow players, fallback,
  article/detail routes and visibility cleanup. Its reports pass through actual
  presence/Discord builders with static artwork, native timestamps, buttons and
  user preferences. No account or live-service request is used.
  The avatar-first regression reproduces the original metadata selector clearing
  and the updated selector reporting in the same real DOM. Avatar-only cards
  still clear. Separate navigation fixtures use a fresh guest per document,
  matching production lifetime and request quotas.
  The Home-entry regression keeps one document/guest across Home -> first Reel
  -> next -> return, retaining the hidden/visible SVG audio-control pair from the
  observed failing layout. Broad `a` reads reproduce the rejected `links` field;
  2.0.2 reports the first Reel and the returning Reel. An unrelated hidden Reel
  permalink still clears, preserving the existing broker guard.
  Version 2.1.0 adds same-document Home -> Search -> profile -> another profile
  -> private route -> Reels transitions through the real broker and QuickJS.
  Generic reports produce the expected Playing type, browsing text, current
  @handle, static logo, omitted empty state lines and elapsed-only timestamps.
  Timestamp preferences still apply. Seeded search input stays out of snapshots.
  Version 2.1.1 uses the same `/p/Same_ID/` URL after Home, Search and two
  different profiles to verify source context, handle and button retention
  through the real collector, QuickJS and Discord builders. Unit regressions
  additionally verify retained elapsed time while paging/closing posts, source
  replacement, hidden/visible timer reset, malformed paths and unknown-source
  clearing. No post metadata contributes to browsing reports.
  Version 2.2.0 additionally exercises Stories/highlights, message threads and
  multiple settings pages through the real broker, QuickJS and Discord builders.
  A player-free fixture seeds conversation text, recipient names, email/password
  fields and drafts. Captured reads/media stay empty; only route labels and the
  public Story owner reach reports. Hidden tabs and discarded post context clear.
  Version 2.3.0 adds different Saved owners/collections and Saved -> post source
  retention in the same document. Unhandled challenge/checkpoint/popular routes
  and unknown-source posts pass through actual Discord formatting as On Instagram.

Instagram 2.1.0 broadened package matches to both Instagram origins for browsing.
Version 2.2.0 removed direct/accounts/stories exclusions to support those states;
2.3.0 removes the remaining challenge/checkpoint exclusions for generic fallback.
Neither adds page reads, query
declarations, network access or extension changes.
The live sidebar Search link was inspected and navigated to `/explore/`; the
profile route uses its public URL handle. The original profile page was restored
after inspection. The user's live Search video was also observed at `/p/<id>/`
with the background Search navigation still selected, confirming that route-only
classification loses its source. Version 2.1.1 retains the preceding browsing
context within its document and adds no declared reads. Direct post links and
new documents cannot infer a source. The user's open Story page confirmed the
`/stories/<owner>/<numeric-id>/` route without navigating or reading its content.
The user's open Saved URL also confirmed `/<username>/saved/`; no account name
is hardcoded in its handler. Reimport all three Instagram 2.3.0 files to verify the installed
presence preview and Discord publication; neither was verified by these checks.

The live Instagram DOM was inspected on October 15, 2026 after the initial
2.0.0 package produced no reports. Two creator anchors share the same aria-label
and href, with an empty avatar anchor first. The old selector read empty text;
2.0.1 reads the visible username link on that live page. The user's shared
snapshot confirmed a locally installed 2.0.0 with no accepted reports/errors.
Its pre-report clears are ignored as stale by the manager, explaining the empty
last-clear field. Extension-page browser access was blocked; an installed 2.0.1
report and actual Discord publication remain unverified pending reimport.

The subsequent Home-entry failure was inspected on the live page and matched the
user's `card-fields-rejected` / `links` log. Its card contains four anchors: two
creator links and hidden/visible copies of the same `/reels/audio/.../` control.
Both audio anchors contain an SVG with `aria-label="Audio image"`. The 2.0.2
declaration excludes those two controls, leaving two visible creator links and
no hidden candidates. It changes no extension runtime, permissions or filters.

Extension 2.0.2's unpacked-extension smoke additionally passes scoped fields
through the real USER_SCRIPT -> worker -> QuickJS path, with native canvas media
and deeply frozen sanitized output. Existing strict-CSP, credential-isolation,
network denial, resource-failure, lifecycle and navigation tests remain passing.

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
