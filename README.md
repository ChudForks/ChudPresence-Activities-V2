# ChudPresence Activities V2

An independent Git repository for programmable, sandboxed Activity API V2
packages: **Prime Video 2.0.0**, **Google 2.0.1** and **Instagram 2.3.0**. This replaces the old
declarative V2 repository layout: packages contain `metadata.json` and ordinary
JavaScript in `activity.js`. The historical JSON packages stay under the Activity
Lab's ignored local snapshot; see its `references/README.md` for recovery.

Google supports Homepage, Search, Images and AI Mode with the submitted query,
visible result statistics and elapsed time. See its [layout and local installation guide](activities/google/README.md).

Instagram supports Home, Search, profiles, Stories, Messages, Settings and Saved
with elapsed time and an On Instagram fallback, plus Reels with the archived caption/creator layout, native
progress, static logo and public buttons. It requires extension **2.0.2**'s
bounded media scopes. See its [local installation guide](activities/instagram/README.md).
Post viewers retain their preceding Home, Search, Saved or profile activity.

All Prime Video selection, episode parsing, metadata retention, artwork matching,
and presence formatting live in the Activity package. It uses the existing V2
snapshot and report APIs without an extension change or site-specific adapter.

## Install Prime Video locally

Use the Activity Lab's extension version 2.0.0 or newer, with **Allow User Scripts**
enabled in Chromium's extension details.

1. Open **Activity Library → Developer → Load local Activity**.
2. Select these three files together from `activities/prime-video/`:
   `metadata.json`, `activity.js`, and `icon.png`.
3. Review the declared page reads and approve the Prime Video/Amazon website access.
4. Open a video and show the controls once so the Activity can sample its title.

To apply an edited package, select its files again and load them. **Reload Activity**
reruns the installed source; it does not reread the working copy.

This is a local repository with no remote configured. The extension's Discover
view currently fetches the V1 repository. Generating this catalog does not publish
it or make it appear in Discover; use Developer mode for local V2 packages.

## Layout

```text
activities/prime-video/metadata.json   permissions and fixed public page reads
activities/prime-video/activity.js     self-contained sandboxed package
activities/prime-video/icon.png        official service icon
activities/prime-video/tests/          optional local tests and synthetic player page (ignored)
activities/google/                    Google metadata, JavaScript, icon and guide
activities/instagram/                 Instagram browsing/Reels package and guide
catalog.json                          generated metadata and SHA-256 hashes
schemas/                              V2 metadata, reports, catalog, and SDK types
sdk/                                  pinned extension validator/page-broker snapshot
tools/                                CLI, catalog builder, validation and local test launcher
.github/workflows/validate.yml         standalone CI
ACTIVITY_API_V2.md                     upstream API guide
TESTING.md                            verification and live-service limitations
```

## Development

Use Node.js 20 or newer (CI uses Node 24).

```sh
npm ci
npm run build
npm run check
npm run check:versions
```

The checks validate JavaScript as a guest script, metadata and selector rules,
package sizes, PNG signatures, SDK types, contract snapshots, and all catalog
hashes. Text hashes use LF line endings to match Git's served bytes. Every
metadata field, including `pageAccess`, is carried into the catalog. The catalog
uses the extension's existing schema version 1 envelope with `apiVersion: 2` entries.

Create a TypeScript package with the same authoring commands as the V1 SDK:

```sh
npm run activity -- new example-video
# Edit metadata.json, src/index.ts, and tests/.
npm run activity -- build example-video
npm run activity -- validate example-video
npm run activity -- test example-video
npm run activity -- dev example-video
```

Build bundles TypeScript and local dependencies into a single `activity.js`
targeting ES2020. Packages must use `ChudPresence.onUpdate()` and declared snapshot
reads; DOM/browser globals, native timers, and direct fetch are unavailable.
TypeScript authoring intentionally excludes DOM libraries. Watch mode watches
source dependencies; restart it after metadata changes. Prime Video is authored
directly as `activity.js`; its `build` command validates it and updates the catalog.

Increase the package version whenever metadata, installed JavaScript, or the icon
changes. Prime Video starts at **2.0.0**, above the archived declarative 1.1.1;
Google started at **2.0.0**, above its archived declarative 1.0.1, and is now
**2.0.1** with bounded navigation smoothing (requires extension 2.0.1).
The version gate compares committed changes with `HEAD^`, or `--base=<git-ref>`;
initial repositories have no previous versions to compare.

## Contract maintenance

The API originates in the Activity Lab. This repository pins its contracts,
declarations, validators, and public page collector in `sdk/upstream.json` with
the source revision and LF SHA-256 hashes. Standalone CI checks those pins. When
the lab is the parent checkout, contract validation also compares the actual
extension files. Set `CHUDPRESENCE_EXTENSION_ROOT` to use another lab checkout.

After reviewing an upstream API change, refresh only this repository:

```sh
node tools/sync-sdk.mjs /path/to/Activity-Lab
node tools/generate-catalog-schema.mjs
npm run build
npm run check
```

The sync is one-way: it never edits the extension or V1 repository. Tests and
fixtures under `activities/*/tests/`, `tools/*.test.*`, and `tools/test-*.mjs`
are kept locally and ignored by Git. CI runs tracked validation and version checks.
With the local files present, `npm test`, `npm run test:extension` and
`npm run test:browser` remain available; see [TESTING.md](TESTING.md).
A fresh checkout does not include these files. `npm test` reports a missing suite
instead of claiming a successful zero-test run.
