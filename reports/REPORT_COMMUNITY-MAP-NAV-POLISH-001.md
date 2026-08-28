# REPORT — COMMUNITY-MAP-NAV-POLISH-001

Date: 2026-08-22 (corrected same-day: see erratum in section 5/7/8 — the switcher fix originally
reported here used a full-page redirect and was wrong; it has been replaced with a true in-place
switch and re-verified live)
Status: **PASS** (one item — mobile viewport — could not be visually verified due to a tooling
limitation, not a functional failure)

## Scope taken over

Investigated current source directly (not old reports) before changing anything: `app-community.js`
(`renderCollegeLanding`), `app-router.js` (`getRoute`/`render`/`renderHome`), `app-place.js`
(`renderPlaceDirectory`/`renderPlaceProfile`), `echomap.js` (`switchToCollegeIndex`, the "More
Details" click handler), `app-campus-map.js` (`renderOrgCampusMap`, untouched — the shared
renderer this task now routes through), `map.html`, `index.html`, and the three i18n locale files.

## Requested vs. Completed

All 8 functional items requested were completed. No unrelated scope was added.

## 1. General Community Card removed — **PASS**

`renderCollegeLanding()` in `app-community.js` no longer renders the `.enter-wall-box` "📣 General
Community" card. Verified live for **KMK** (`#/community/1`) and **KMPP** (`#/community/3`): both
show College header → visible-notes count → Jurusan Channels directly, no gap, no leftover empty
space. `#/community/:orgId/general` route and `renderCommunityCollegeGeneralWall` were **not**
touched — only the entry card was removed, per instruction.

## 2. Homepage "Explore Community" anchor — **PASS (code), scroll animation not visually confirmable**

The code already used `document.getElementById('communities')?.scrollIntoView({behavior:'smooth'})`
— a real element target, not a fixed pixel offset or `scrollBy`. This was true *before* this task
touched anything, so no code change was made here (see CLAUDE.md rule: don't reimplement what
already exists correctly). Verified programmatically with an instant scroll
(`scrollIntoView({behavior:'instant'})`): `#communities` lands at `top: 0.35px` — i.e. exactly at
the viewport top, nowhere near the Study Notes section further down the page. This proves the
*target* is correct.

The live `behavior:'smooth'` click test was inconclusive in this environment: the automated Chrome
tab intermittently reported `document.hidden === true` (backgrounded), which pauses
`requestAnimationFrame`/compositor-driven smooth-scroll and produced a partial, stuck scroll in
screenshots. This reproduced consistently regardless of window activation and is a property of the
CDP-driven browser session, not of the page — clicking the same button with instant/no-animation
scrolling always landed exactly on Community. **Recommend one manual click-check in a normal,
focused browser tab** as final confirmation; code-level risk of regressing to Study Notes is not
present since the target element is unique and unambiguous.

## 3. Public "Echo Map" naming unified — **PASS**

Changed (EN / BM / ZH) via `i18n/locales/{en,ms,zh}.js` and `index.html`'s static fallback:
- `nav.map` (Navbar): "Echo Map KMK" → "Echo Map" / "Peta Echo KMK" → "Peta Echo" / "KMK 留声地图" → "留声地图"
- `home.openMap` (Homepage hero CTA next to Explore Community): "Open KMK Echo Map" → "Open Echo Map" (+ BM/ZH)
- `home.mapTitle` (Homepage "Connects..." promo section headline): "Connect voices to real places at KMK" → "...on campus" (+ BM/ZH)
- `assistant.mapReply` (AI assistant chat reply mentioning the map): de-KMK'd for consistency (+ BM/ZH)

**Preserved, not touched**: `map.title` ("Echo Map KMK") and the actual `<h1>`/`<title>` on
`map.html`, which correctly keep showing the current campus name (verified live: "Echo Map KMK",
"Echo Map KMPP", "Echo Map KMKK" all still appear as page titles). `campusMap.button` was already
"Echo Map" (no change needed) and is the label the Community → Map entry button already used.

Verified live in-browser: Navbar (Light/Dark, EN/BM/ZH), Homepage hero CTA, KMPP/KMKK College
header's "Echo Map" button, and both `map.html` and `#/org/:orgId/map` page titles.

## 4. Building Detail return logic — **PASS**

Added a minimal, explicit `sessionStorage`-backed source/returnTo mechanism
(`setPlaceReturnSource`/`getPlaceReturnSource` in `app-router.js`, loaded on both `index.html` and
`map.html`), keyed by `placeId` with a 30-minute TTL — not a blanket `history.back()`.

- **Flow A** (Homepage → Building Stories → Building → Back): `renderPlaceDirectory()`'s card and
  the Homepage's `building-home-grid` shortcut both call `setPlaceReturnSource('places', placeId)`
  before navigating. Verified live: Back button reads "← Back to buildings" and returns to
  `#/places`.
- **Flow B** (Echo Map KMK → Building → More Details → Back): the "More Details" click handler in
  `echomap.js` now calls `setPlaceReturnSource('map', placeId)` **and** the same
  `saveMapReturnSnapshot(placeId)` the existing "Enter this building wall" action already used,
  before navigating. Verified live: Back button reads "← Back to Echo Map", and clicking it returns
  to `map.html` with the **exact same map center/zoom, selected building footprint, and open
  preview panel restored** (Pustaka's preview, "43 visible notes", "More details"/"Enter this
  building wall" all reappeared) — full context preservation, not just "doesn't jump to Building
  Stories."
- **Direct link with no source context**: cleared the sessionStorage key and loaded
  `#/place/B_MASJID` directly — Back button correctly fell back to "← Back to buildings" /
  `#/places`.

`renderOrgBuildingDetail` (the separate non-KMK campus-framework building-detail renderer) was left
untouched — the reported bug and its "Echo Map" entry point are KMK-specific
(`app-place.js`/`echomap.js`), not the non-KMK Campus Framework path.

## 5 / 7 / 8. Non-KMK campus map renderer unified + switcher consistency — **PASS (corrected — see erratum)**

> **Erratum (2026-08-22, same-day correction):** an earlier version of this fix and this report
> section described the switcher as doing `location.href = "index.html#/org/${orgId}/map"` — a
> full-page hand-off — for non-KMK targets. **That was wrong and has been fully replaced.** It
> broke the switcher's core purpose: clicking `›`/`‹` left `map.html` entirely, so a user could
> never continuously cycle KMK → KMKK → KMPP → KMPK on one page — every non-KMK step was a real
> navigation away from Echo Map. The corrected fix below supersedes it. **Invariant going forward:
> the Echo Map campus switcher must always switch campuses in-place, never by navigating away from
> `map.html`.**

Root cause confirmed by reading source, not guessing: `map.html`'s own `‹ KMK ›` switcher
(`echomap.js` `switchToCollegeIndex()`) had a second, ad-hoc non-KMK branch that only toggled one
static, never-updated `<p>` notice — a real second implementation of the Campus Framework sidebar
already properly built in `app-campus-map.js`/`renderOrgCampusMap()` (used by Community → Map,
`#/org/:orgId/map`). `map.html` doesn't even load the scripts (`app-campus-map.js`,
`data/campus-building-registry.js`) that a real non-KMK sidebar would need — the two paths could
never have produced the same result.

**Corrected fix**: `map.html` now loads `data/campus-building-registry.js` and `app-campus-map.js`
(after `app-router.js`, before `leaflet.js`), so the real Campus Framework rendering logic and data
are available on the page. The sidebar header+body markup generator was extracted out of
`app-campus-map.js`'s `renderOrgCampusMap()` into one shared, parameterized function,
`renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix = "")` (`app-campus-map.js`) — the
single source of truth for "what a non-KMK Campus Framework sidebar contains." `hrefPrefix` is the
only thing that differs between callers: `renderOrgCampusMap()` (SPA context) passes none, so its
two actionable module cards call `navigate('#/...')`; `echomap.js`'s new `renderNonKmkCampusGuide()`
passes `"index.html"`, so the same cards call `location.href='index.html#/...'` — only those two
deep-link buttons ever leave `map.html` (by user choice, e.g. "Community"), the switcher itself
never does.

`switchToCollegeIndex()` in `echomap.js` was rewritten to never navigate: it now branches on
`org.id === KMK_ORG_ID` and toggles visibility between the existing KMK sidebar containers
(`#map-side-header`, `#building-selection`, the Leaflet `buildingLayer`) and a new sibling container,
`#campus-framework-guide` (added to `map.html`, populated by `renderNonKmkCampusGuide()` calling the
shared helper above) — both are hidden/shown via the `hidden` attribute, never by overwriting a
shared parent's `innerHTML`, so the KMK sidebar's cached DOM references survive round-trips through
non-KMK campuses. `applyActiveCollegeChrome()` (switcher label, `<h1>`, aria-labels) and
`fitActiveCollegeView()` (pan/zoom the one persistent Leaflet map instance) were already correct and
were not modified — they run for every switch regardless of KMK/non-KMK.

**Real browser acceptance test performed** (Chrome via `mcp__claude-in-chrome__*`, fresh hard reload
to bypass any cached old `echomap.js`), starting from `map.html` at KMK:
- Forward: KMK → `›` → **KMKK** → `›` → **KMPP** → `›` → **KMPK**. At every step: URL/tab stayed on
  `map.html` (no navigation), `<h1>` updated to "Echo Map {code}", the switcher pill updated, the
  persistent Leaflet map panned/zoomed to the new campus, and the sidebar showed the Campus
  Framework content (CAMPUS GUIDE eyebrow, "Campus Framework" heading, FRAMEWORK PREVIEW badge,
  description, disabled search, Building Registry "AWAITING VERIFIED DATA", Place Knowledge
  "FRAMEWORK READY", Place Wall) for all three non-KMK campuses — never a blank or stale "Focus
  buildings" sidebar.
- Reverse: KMPK → `‹` → **KMPP** → `‹` → **KMKK** → `‹` → **KMK**. Each intermediate step again
  showed the correct Campus Framework content and stayed on `map.html`. On returning to KMK, the
  full building sidebar was restored exactly as before: "Focus buildings" heading, enabled "Search
  buildings" field, the 14-building list (Pustaka, Kompleks Dewan Kuliah, Blok Tutoran dan Makmal
  Sains, Bangunan Langkasuka, …). Clicking a building (Pustaka) opened the full preview panel
  (hours, "43 visible notes", "More details", "Enter this building wall") — confirming the KMK
  round-trip did not leave any stale state from the non-KMK branch.
- Cross-entry-point parity: opened `index.html#/org/3/map` (Community → KMPP Map) in a separate tab
  and compared it against the switcher's KMPP sidebar — identical Campus Guide content (same
  heading, badge, description, Building Registry/Place Knowledge status text and labels), confirming
  both entry points render through the same shared helper rather than two independently-worded
  copies.
- No console errors were observed at any point in the forward, reverse, or cross-entry-point checks.

## 6. No fabricated non-KMK building data — **Confirmed: NO**

No data file (`data/campus-map-config.js`, `data/campus-building-registry.js`, or any other) was
modified. The fix is entirely a renderer/entry-point hand-off in `echomap.js`; the honest
"Framework Preview / Awaiting verified data / Framework Ready / Available" states already produced
by the untouched `app-campus-map.js` are what both entry points now show — no invented building
names appeared anywhere during testing.

## Modified Files

- `app-community.js` → removed the General Community entry card from `renderCollegeLanding()`.
- `app-router.js` → added `setPlaceReturnSource`/`getPlaceReturnSource` (shared, loaded on both
  pages); Homepage building-card shortcut now records `places` as its return source.
- `app-place.js` → `renderPlaceDirectory()` records `places` as return source; `renderPlaceProfile()`
  picks the Back button's destination/label from the recorded source instead of a hardcoded
  `#/places`.
- `echomap.js` → "More Details" click handler records `map` as return source and reuses
  `saveMapReturnSnapshot()`; `switchToCollegeIndex()` rewritten to switch in-place — never
  navigates — toggling between the KMK building sidebar and a new
  `renderNonKmkCampusGuide()`-populated Campus Framework sidebar for non-KMK targets.
- `app-campus-map.js` → extracted `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix)`
  as the single shared renderer for the Campus Framework sidebar (header + body); parameterized
  `renderCampusGuideFrameworkModules()`/`renderCampusGuideBody()` with `hrefPrefix` so the same
  markup works unmodified from both `index.html` (SPA `navigate()`) and `map.html`
  (`location.href='index.html#/...'` for its two actionable module cards only); `renderOrgCampusMap()`
  now calls the shared helper instead of inlining its own copy of the same markup.
- `map.html` → loads `data/campus-building-registry.js` and `app-campus-map.js`; added
  `id="map-side-header"`; removed the old static single-notice `<p id="map-college-framework-notice">`;
  added the new `#campus-framework-guide` sidebar container (populated entirely by JS, never left as
  static markup).
- `index.html` → navbar map link's static fallback text "Echo Map KMK" → "Echo Map".
- `i18n/locales/{en,ms,zh}.js` → `nav.map`, `home.openMap`, `home.mapTitle`, `assistant.mapReply`
  de-KMK'd; added `place.backToMap` in all three.

## Testing

- Desktop: Verified (real Chrome, ~1568×709 and ~1536×800).
- Mobile: Not visually verified — `resize_window` does not change `window.innerWidth` in this
  environment (same known limitation recorded in prior sessions' reports/HANDOFF).
- Light Mode: Verified.
- Dark Mode: Verified (College Community page).
- Language: Verified — EN, BM, ZH all checked on the College Community page and the map-naming
  keys.
- Router: Verified — `#/community/:orgId`, `#/org/:orgId/map`, `#/place/:placeId`, `#/places`,
  `#/admin`, `#/study` all exercised live.
- Existing related features: Verified — Study Notes home page loads unaffected; Admin (KM Community
  Notes / Map Notes) loads unaffected; no console errors observed at any point.

## Regression smoke test

Homepage, Community hub, College Community (KMK + KMPP), Jurusan Channels, Echo Map KMK, non-KMK
Echo Map (KMPP + KMKK via both entry points), Building Stories, Building Detail (both return flows),
Study Notes home, Admin — all loaded and behaved correctly. No console errors were observed in any
of these checks.

## Not modified (per explicit instruction)

Study Notes V2, Upload/Moderation, Community Sticky Wall, Community pointer glow, Jurusan Wall,
building content/photos, campus coordinates, non-KMK building data, Auth, Admin.

## Project Memory Updated

- CHANGELOG.md
- HANDOFF.md
- CODE_AUDIT.md
- OPTIMIZATION_LOG.md (single-renderer de-duplication is a real reuse/optimization worth recording)

## Remaining Issues

- Mobile 390–430px viewport: not visually verified (tooling limitation, not a known defect).
- The Homepage "Explore Community" `behavior:'smooth'` animation could not be watched end-to-end
  live due to the automation tab's intermittent background/hidden state; the underlying target
  computation was verified correct via instant scroll. A quick manual click in a normal browser tab
  is the only remaining confirmation step, at the user's discretion.

## Next Step

None proposed — this task's 8 items are complete. Awaiting the user's next instruction; not starting
any further stage automatically.
