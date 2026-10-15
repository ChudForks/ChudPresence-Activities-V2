# Pinned Activity Lab SDK

These four JavaScript files are exact LF-normalized copies of the active Activity
Lab's runtime validators, settings validator, shared constants, and public page
snapshot collector. `upstream.json` pins the source revision and every copied API
file's hash. The extension remains the authority for the API.

Node tooling imports these files to enforce the same checks as installation.
Activities do not import them; the installed `activity.js` depends only on
`ChudPresence`. The Node VM helper is solely a behavioral test fixture. Actual
guest execution is verified separately against the extension's QuickJS/WASM bundle.

Run `npm run check:contract` to check the pins and, when available, compare the
parent Activity Lab checkout. Run `node tools/sync-sdk.mjs <lab-directory>` from
the repository root only after reviewing an upstream change. Refreshing writes
only into this repository. Do not edit copied validators independently.
