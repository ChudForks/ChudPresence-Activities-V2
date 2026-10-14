# ChudPresence Activities V2

Declarative Activity API V2 packages and their discovery catalog. Prime Video
is the first package, at version **1.1.0**. Each activity contains `metadata.json`
and `activity.json`, with an optional `icon.png` and package tests.

V2 describes bounded media selectors and a player adapter bundled with the
extension. Packages cannot supply JavaScript, request network access, or add a
custom adapter. The extension presents the extraction summary for approval when
an activity is installed or updated.

This repository is independent of the trusted V1 activity repository,
[ChudPresence-Activities](https://github.com/ChudForks/ChudPresence-Activities).
The Chromium lab keeps both repositories as independent nested Git checkouts,
ignored by the lab and excluded from its extension build. You can clone, validate,
and contribute to this repository on its own; the lab is not required.

## Develop an activity

Use Node.js 20 or later:

```sh
npm ci
npm run activity -- new my-service
npm run activity -- validate my-service
npm run activity -- test my-service
npm run activity -- build my-service
```

`new` always creates a V2 JSON package. Edit the exact HTTPS matches in
`metadata.json` and the selectors in `activity.json`. `build` validates the
package and updates `catalog.json`; JSON needs no compilation. `dev` validates
the package and explains the reload workflow. Increment the package's semantic
version when its metadata, configuration, or icon changes.

Load both JSON files through **Activity Library → Developer → Load local
Activity**, review the extraction summary, and approve installation. Reimport
both files after editing to approve an update. The Prime Video package requires
the Chromium lab's bundled `prime-video` adapter and the extension version
declared in its metadata.

See [the V2 authoring guide](ACTIVITY_API_V2.md) and
[Prime Video's package notes](activities/prime-video/README.md) for the current
contract and its supported behavior.

## Contract, types, and catalog

`schemas/activity-api-v2.json` is the authoritative V2 contract. Its generated
schemas, TypeScript declarations, and V2-only catalog schema are checked in.
`schemas/activity-api-v2.js` is the standalone validator. The generator checks
its constants against the contract. TypeScript tools can import
`ActivityV2Metadata` and `ActivityV2Configuration` from
`@chudpresence/activity-sdk-v2/types`.

```sh
npm run check:contract
npm run check:catalog
npm run typecheck
npm test
npm run check:versions
```

After changing the contract, run `node tools/generate-api-v2.mjs`. Within the
Chromium lab checkout, the generator also synchronizes the lab's schema and
validator copies. In a standalone checkout it only manages this repository.
After changing a package, run `npm run build:catalog`. Catalog hashes use the LF
text bytes served by Git, including on Windows.

The version gate compares package changes with a pull request's base, the prior
push revision, or `HEAD^`. An initial commit has no previous package versions
and skips that comparison. Use `--base=<ref>` with
`node tools/check-version-bumps.mjs` to select a comparison explicitly.
