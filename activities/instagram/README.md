# Instagram (programmable API v2)

Version **2.3.0**, requiring Activity Lab **2.0.2** or newer. Home, Search,
profiles, Stories, Messages, Settings and Saved use elapsed page activity, alongside
the archived Instagram Reels caption/creator layout in sandboxed JavaScript.

| Page | First line | Second line | Progress | Buttons |
| --- | --- | --- | --- | --- |
| `/` | Browsing Home | Omitted | Elapsed time | None |
| `/explore/` or `/explore/search/` | Browsing Search | Omitted | Elapsed time | None |
| `/<username>/`, including `reels`, `tagged` and `reposts` profile tabs | Viewing profile | @username | Elapsed time | View Profile |
| `/stories/<username>/` with an optional numeric Story ID | Watching story | @username | Elapsed time per owner | View Profile |
| `/stories/` | Browsing Stories | Omitted | Elapsed time | None |
| `/stories/highlights/<id>/` | Watching highlights | Omitted | Elapsed time | None |
| `/direct` and every `/direct/...` page | Messages | Omitted | Elapsed time | None |
| `/accounts` and every `/accounts/...` page | Settings | Omitted | Elapsed time | None |
| `/<username>/saved/` and its collection pages | Saved | Omitted | Elapsed time | None |
| `/p/<id>/` opened from Home, Search, Saved or a profile in the same document | Retains the source page's first line | Retains the source profile, if any | Continues source elapsed time | Retains source buttons |
| `/reels/` feed | Caption, or Watching Reel | @username | Native video progress | View Reel when a public ID exists, View Profile |
| `/reel/<id>/` or `/reels/<id>/` | Caption, or Watching Reel | @username | Native video progress | View Reel, View Profile |
| Every other route, including direct posts without a known source | On Instagram | Omitted | Elapsed time | None |

Trailing slashes are optional. Both `instagram.com` and `www.instagram.com`
are supported. Pages without a specific handler show On Instagram. Search maps to the live web sidebar's
`/explore/` destination; no search query, typed input or result text is read.
Profiles use only the public handle in the URL, with reserved service paths
rejected. Profile URLs in buttons omit query parameters and fragments.

Browsing reports use generic activity (Playing), while Reels retain video
activity (Watching). Repeated polls retain the elapsed timer, as do profile tab
changes for the same handle. Changing Home/Search/profile, switching profiles,
entering Reels, or clearing presence starts a new browsing timer. Hidden tabs
clear immediately. Browsing does not require a video and never reuses a stale
Reel's caption, creator or native playback timestamps.

Version 2.1.1 remembers the preceding browsing page when Instagram opens the
shared `/p/<id>/` post viewer. The same post URL can come from Home, Search or
a profile, so it carries no source classification by itself. Paging through or
closing posts retains that source and timer; visiting another browsing page
replaces it. Entering Reels or an unsupported route discards browsing context.
Hidden tabs clear presence and reset elapsed time, while retaining the known
source for the same document's post viewer. A reload or new document starts
without remembered context. Post captions, creators and playback are not used.

Version 2.2.0 adds route-based Stories, Messages and Settings. Story owners come
from their public URL handle, with no caption or media requirements, supporting
both photo and video stories. Switching Story IDs for one owner retains elapsed
time; switching owners resets it. Highlights have no inferred owner. Messages
use the same generic label and timer across inbox, requests and conversations.
Every `/accounts/...` subpage, including `/accounts/edit/`, displays only Settings
and retains that timer. No message recipient, conversation ID, settings subpage,
account field, Story ID or reply text is included in these reports or logs.
These states cannot become the source of a `/p/...` post viewer. Version 2.2.0
retained challenge/checkpoint exclusions; version 2.3.0 removes those remaining
route exclusions. Declared page reads and network access are unchanged.

Version 2.3.0 identifies Saved by `/<username>/saved/` for any valid username,
including collection pages below it. Saved reports no owner or collection names,
IDs or buttons. Posts opened from Saved retain its label and timer. Unhandled
routes and posts with no known source show only On Instagram; the fallback
shares one elapsed timer across those routes and drops previous source details.
Hidden/foreign pages still clear, as do invalid required fields on a recognized
Reels page. The user's open Saved URL confirmed its username-dependent path.

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
5. Reload Instagram and check Home, Search, a profile, Stories, Messages,
   Settings, Saved and Reels in the local presence preview.

After editing, reimport all three files. Reload Activity reruns stored source;
it does not reread files. This repository is local; catalog generation does not
publish the package or add it to Discover.

## Verification

Package tests cover browsing routes, current profile identity, timer retention
and reset, identity agreement, fallback, reference layout, pause/progress and
invalid-winner clearing. `npm run test:browser` includes the
real-DOM fixture here, the production broker, actual QuickJS interpreter, report
validator, presence builder and Discord payload builder. It checks deep cards,
adjacent autoplay, hidden/sensitive metadata, multiple native/shadow players,
public links, article mode and cleanup. Browsing fixture checks cover Home,
Search and profile transitions in one document, omitted empty state lines,
generic Discord activity, elapsed-only timestamps, preferences, route fallback,
Saved source retention and returning to Reels. Stories, Messages and Settings also pass through
the real broker and QuickJS without a player. Seeded conversation, account and
input fields stay out of snapshots and Discord payloads in these fixtures.
The extension's browser smoke also checks
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
The live Search navigation destination and profile route were inspected on
October 15, 2026 for the browsing update. The user's open Story URL also confirmed
the owner/numeric-ID route. The updated installed package's report
and actual Discord publication still need a check after reimporting version
2.3.0; browser policy prevents direct inspection
of the user's extension Library.
