# ChudPresence Activities V2

Build programmable Activities for ChudPresence with the sandboxed Activity API V2. This repository contains the official V2 package catalog, JavaScript authoring tools, examples, and API documentation.

## Activities

| Activity | What it does |
| --- | --- |
| [Prime Video](activities/prime-video/README.md) | Shows movie or episode details and playback state. |
| [Google](activities/google/README.md) | Shows browsing and search activity across Google pages. |
| [Instagram](activities/instagram/README.md) | Shows browsing, Stories, profile, and selected Reels activity. |

## Create an Activity

Use Node.js 20 or newer. Install the development dependencies, generate a starter, edit its package metadata and TypeScript source, then build and validate it:

```sh
npm ci
npm run activity -- new example
# Edit activities/example/metadata.json and activities/example/src/index.ts.
npm run activity -- build example
npm run activity -- validate example
npm run check
```

The build bundles the starter into `activity.js` and refreshes the catalog. You can also write `activity.js` directly. Read [Activity API V2](ACTIVITY_API_V2.md) for the package format, available APIs, page-data declarations, security model, limits, and full authoring details.

## Try an Activity in ChudPresence

V2 packages in this repository are not currently listed in the extension's Discover catalog. To try one locally, open **Activity Library → Developer → Load local Activity** in ChudPresence and select the package's `metadata.json`, `activity.js`, and icon if it declares one. Review the requested website access and page-data declarations before loading the Activity.

## Sandbox and permissions

V2 package code runs in an isolated JavaScript sandbox. It does not get direct access to the page DOM or browser APIs. An Activity can read only the page data and media snapshots declared in its metadata, and it can report presence through the scoped V2 API. See [Activity API V2](ACTIVITY_API_V2.md) for the full security and permission model.
