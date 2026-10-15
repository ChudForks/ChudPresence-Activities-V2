# Instagram (programmable API v2)

Version **2.0.2**, requiring Activity Lab **2.0.2** or newer. This migrates the
archived Instagram 1.1.0 **Reels-only** presence to ordinary sandboxed JavaScript.

| Page | First line | Second line | Progress | Buttons |
| --- | --- | --- | --- | --- |
| `/reels/` feed | Caption, or Watching Reel | @username | Native video progress | View Reel when a public ID exists, View Profile |
| `/reel/<id>/` or `/reels/<id>/` | Caption, or Watching Reel | @username | Native video progress | View Reel, View Profile |

Trailing slashes are optional. Both `instagram.com` and `www.instagram.com`
are supported. Stories, profiles, direct messages, account pages and Explore
clear presence. Stories remain outside the reference package's supported scope.

Artwork is always the archived square Instagram app logo, never an avatar or
video preview. The original PNG and presence-image URL are preserved from the
reference (sourced there from Instagram's Google Play listing). Artwork,
progress, buttons, paused playback and status fields use normal preferences.

The largest eligible video by viewport-clipped area wins, including a paused
reel beside a smaller autoplaying neighbor. Equally sized winners clear rather
than guessing. The new generic `pageAccess.mediaScopes` broker binds each video
to its nearest declared single-player container, within 16 ancestors, and never
widening past app/main/body/html roots. Hidden, sensitive or ambiguous cards
fail closed; missing winning-card metadata never borrows a neighbor's values.

Creator text must match its same-origin public profile URL. The caption and
permalink come from that same card; article/header layouts use a second scoped
declaration. Absent captions use Watching Reel; rejected/empty captions clear.
Captions up to 1024 characters are trimmed to 256 for presence, matching the
reference collector. Detail-page and card Reel IDs must agree.
Feed cards without a permalink show only View Profile. URLs have no queries or
fragments. The package makes no network requests and has no page execution.

Version 2.0.1 fixes the live Reels layout's two creator anchors: an empty avatar
link precedes the username link with the same label and profile URL. Creator
reads now select the text link, keeping text and href on the same element.
An avatar alone cannot identify a Reel. State changes log a short clear reason
or a reporting confirmation, without recording captions, handles or URL values.
Repeated unchanged polls do not add diagnostic entries.

Version 2.0.2 fixes the first Reel opened from Home, including returning to it
after another Reel. That card retains a hidden copy of its audio control, which
the old broad anchor read marked as rejected. Permalink reads now exclude anchors
containing the public `Audio image` label; audio URLs cannot identify a Reel.
Other hidden links and required fields still fail closed. No extension update
beyond 2.0.2 is needed; the change is in package metadata.

## Local installation

1. Reload the updated **2.0.2** extension in Chromium's extensions page and
   enable **Allow User Scripts** if needed.
2. Open **Activity Library → Developer → Load local Activity**.
3. Select `metadata.json`, `activity.js`, and `icon.png` together from this folder.
4. Review the declared scoped reads and approve the Instagram website access.
5. Reload the Instagram page, open Reels and inspect the local presence preview.

After editing, reimport all three files. Reload Activity reruns stored source;
it does not reread files. This repository is local; catalog generation does not
publish the package or add it to Discover.

## Verification

Package tests cover routes, identity agreement, fallback, reference layout,
pause/progress and invalid-winner clearing. `npm run test:browser` includes the
real-DOM fixture here, the production broker, actual QuickJS interpreter, report
validator, presence builder and Discord payload builder. It checks deep cards,
adjacent autoplay, hidden/sensitive metadata, multiple native/shadow players,
public links, article mode and cleanup. The extension's browser smoke also checks
scoped data through the actual installed broker/worker path in a disposable profile.

The avatar/username structure and corrected selector were checked on the user's
live Instagram page on October 15, 2026. The browser fixture reproduces the
original selector clearing, followed by the corrected selector reporting through
the actual broker and QuickJS. Fixtures use no logged-in session or live traffic.
The Home-entry regression also checks a same-document Home -> first -> next ->
return sequence through the real collector and QuickJS, with both hidden and
visible SVG audio controls. It reproduces the previous `links` rejection and
verifies that hidden Reel permalinks remain rejected. The corrected declaration
was checked against the live failing card's duplicate audio controls.
The updated installed package's report and actual Discord publication still need
a check after reimporting version 2.0.2; browser policy prevents direct inspection
of the user's extension Library.
