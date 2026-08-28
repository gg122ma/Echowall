# REPORT_COM-V2-002

**Task ID:** COM-V2-002 — Community Router + Hub
**Status:** PASS
**Start State:** COM-V2-001 verified present and working (`data/community-config.js`, `services/community-service.js`, `normalizeStoredNote()` V3 backfill all confirmed live before starting).
**Checkpoint Path:** `community v2/checkpoints/COM-V2-002/`

## Completed

- Community V2 canonical routes: `#/community` (Hub), `#/community/all` (Global shell), `#/community/:orgId` (College Landing), `#/community/:orgId/general` (College General shell), `#/community/:orgId/jurusan/:majorId` (canonical Jurusan wall — reuses the existing `renderWall()`/Sticky renderer with zero duplication).
- Legacy redirects: `#/org/:orgId` → `#/community/:orgId` (replaceState, no history growth). `#/wall/:orgId/:majorId` → `#/community/:orgId/jurusan/:majorId`. The old 4-part legacy (`#/wall/:orgId/:batchId/:majorId`) now redirects **directly** to the new canonical route in one hop, instead of double-hopping through the old 3-part route.
- `#/org/:orgId/map`, `#/org/:orgId/buildings`, `#/org/:orgId/building/:buildingId` (the separate multi-college map/building framework) were left completely untouched — verified by re-reading the route-parsing order before editing (they're checked with more specific `parts.length`/`parts[2]` conditions ahead of the new bare-`org` legacy catch-all).
- Community Hub (`renderCommunityHub`): Global card + a college grid generated from the real `organizations` array (no duplicate data), each card showing live note counts via the existing `getCommunityNoteCount()`.
- College Landing (`renderCollegeLanding`): college header (reuses `renderOrgHeaderActions()` for Echo Map/Buildings buttons where applicable — confirmed still appears for KMKK, correctly absent for KMK), a "General Community → Enter" box, and a Jurusan Channels list built from `majors.filter(m => m.orgId === orgId)`.
- Global/College-General shells (`renderCommunityGlobalShell`/`renderCommunityCollegeGeneralShell`): minimal "being prepared" placeholders — deliberately NOT full posting UI, per the task's explicit "shell only this stage" boundary. Real wall content is COM-V2-003's job.
- `renderHome()`'s college cards now link directly to `#/community/${org.id}` (canonical), avoiding an unnecessary redirect hop on the most common navigation path.
- 14 new i18n keys × 3 locales (`community.hub.*`, `community.landing.*`, `community.shell.*`) — all real translations, not placeholders.

## Modified Files

- `app-router.js` (route parsing, legacy redirects, page titles, render dispatch, home org-card link)
- `app-community.js` (new)
- `i18n/locales/en.js`, `i18n/locales/ms.js`, `i18n/locales/zh.js`
- `index.html` (1 new `<script>` tag)

## Data / Schema Changes

None. This stage is routing/UI only.

## Routes Changed

See "Completed" above. Full before/after table is in `community v2/checkpoints/COM-V2-002/PRE_STATE.md`.

## UI Changed

New Community Hub and College Landing pages (new UI, previously did not exist). Existing Sticky Wall UI, Compose, vote, translation, photo, shape/color/rotation: **unchanged** — the canonical Jurusan route calls the exact same `renderWall()` function with the same arguments as before.

## Testing

- `node --check` passed for `app-router.js`, `app-community.js`, all 3 locale files.
- Browser (`python -m http.server 8000`): `#/community` (Hub, global card + college grid with real counts), `#/community/1` (KMK Landing — General box + Jurusan list), `#/community/2` (KMKK Landing — confirmed `renderOrgHeaderActions` Echo Map/Buildings buttons present, 170 visible notes, 4 majors listed), `#/community/1/jurusan/1` (canonical wall — 81 notes, identical to the old `#/wall/1/1` render, zero console errors).
- Legacy: `#/org/1` → redirected to `#/community/1` (confirmed via wall's back button, a real click, not a direct hash edit). `#/wall/1/1` → redirected to `#/community/1/jurusan/1` (confirmed via `getRoute()`/`location.hash` read). `#/wall/1/1/1` (old 4-part legacy) → redirected directly to `#/community/1/jurusan/1` in one hop (confirmed no intermediate `#/wall/1/1` hash appears).
- Invalid: `#/community/999` → friendly "Community not found" panel, no white screen, no console errors. `#/community/1/jurusan/999` → reuses the existing "Wall not found" error page, no white screen, no console errors.
- Back button: navigated Hub → KMK Landing → Sains wall → clicked wall's back button (→ `#/org/1` → redirected to `#/community/1`) → pressed browser Back → landed directly on `#/community/1/jurusan/1` (the wall), confirming `replaceState` redirects don't pollute history (no stuck loop, no extra back-presses needed).
- Desktop: Verified. Mobile: Verified (390×844 same-origin iframe on the Hub page, no horizontal overflow). Light: Verified. Dark: Verified (College General shell). EN: Verified. ZH: Verified (College General shell, all strings translated, no raw keys visible). BM: Not verified this stage (spot-checked EN+ZH; BM keys were added with the same real-translation discipline but not separately screenshotted — will be covered in COM-V2-008's full i18n sweep).
- Console errors: none observed across any tested route.

## Regression

- Building Wall (`#/place/B_PUSTAKA/wall`): Verified, no errors.
- Admin (`#/admin`): Verified, no errors.
- Echo Map (`map.html`): Verified, no errors (untouched — new scripts correctly not loaded there).
- KMK Sains note count: still 81 (unchanged from COM-V2-001's baseline).

## Compatibility

- COM-V2-001's `CommunityService`/`COMMUNITY_DESCRIPTORS` were not called from this stage's new code — this stage is purely route/navigation plumbing. No cross-stage coupling introduced; COM-V2-002 can be rolled back independently of COM-V2-001 (see ROLLBACK.md).
- `renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` (the old major-picker page, `app-router.js`) are now unreachable dead code, since `#/org/:orgId` no longer maps to `{page:"org"}`. **Deliberately not deleted** this stage, to minimize touched surface area and risk — left as a note for a future cleanup task, not acted on here.

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md` (see entries dated 2026-08-21, "COM-V2-002"). `CODE_AUDIT.md` updated (route-ordering and legacy-redirect invariants are exactly the kind of architecture decision that warrants an entry). `COMMUNITY_V2_PROGRESS.md` created/updated.

## Remaining Issues

- BM language not independently screenshotted this stage (see Testing note above) — non-blocking, real translations exist, will be swept in COM-V2-008.
- Dead code (`renderOrgDetails` and friends) left in place — non-blocking, harmless, flagged for later cleanup.

## Rollback Instructions

See `community v2/checkpoints/COM-V2-002/ROLLBACK.md`.

## Next Task

COM-V2-003 — Global + College General Wall
