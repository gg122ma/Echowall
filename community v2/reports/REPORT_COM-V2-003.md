# REPORT_COM-V2-003

**Task ID:** COM-V2-003 — Global + College General Wall
**Status:** PASS
**Start State:** COM-V2-002 PASSED (Hub + College Landing real; Global/College General were placeholder shells).
**Checkpoint Path:** `community v2/checkpoints/COM-V2-003/`

## Completed

- `#/community/all` and `#/community/:orgId/general` are now real, fully-functional Sticky Walls — same renderer as Jurusan (`renderContextWall`/`renderWallNotes`/`buildNoteDOM`/`openModal`/compose drawer), zero duplication. Compose ("Leave a Note"), photo upload, shape/color/rotation, anonymous/named, voting, translation, category filters, hot/new sort, search: all confirmed working on both new wall types via real UI interaction (not just code inspection).
- **Scope isolation implemented via `communityKey`, not magic values.** `getContextNotes()` now filters community notes through `CommunityService.getCommunityKeyForNote(note) === wallState.communityKey`. `wallState` gained `communityScope`/`communityKey` fields (extended existing `wallState`, no second wall-state system).
- **New posts are V3-compliant from the moment of creation** (pulled forward from COM-V2-004's flagged technical debt — see "Deviation" below): `handleFormSubmit()` now writes `schemaVersion:3`, correct `orgId`/`majorId` (genuinely `null` for Global/College General, never `0`), `communityKey`/`communityScope`, and the full V3 field set directly, instead of relying on the next page-load's `normalizeStoredNote()` backfill.
- **Fixed two `normalizeStoredNote()` bugs that would otherwise have silently dropped every Global/College General post on next reload**: (1) the validation gate assumed every community note has a real `majorId` matching `majors` — now scope-aware (jurusan strict-validates, college validates against `organizations`, global always passes); (2) `orgId`/`majorId` were coerced via unconditional `Number(...)`, which turns `null` into `0`/`NaN` — now stays genuinely `null` when absent, so no magic-zero values ever land in stored note data.

## Modified Files

- `app-data.js` (`normalizeStoredNote()`)
- `app-wall.js` (`renderWall`, new `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall`, `renderContextWall`, `getContextNotes`, `handleFormSubmit`)
- `app-router.js` (2-line dispatch change)
- `app-community.js` (removed 3 now-superseded shell functions)

## Data / Schema Changes

Community Post V3 fields (`communityKey`, `communityScope`, `postType`, `questionStatus`, `moderationStatus`, `commentCount`, `updatedAt`) are now written at creation time for every new community post, not only backfilled on read. No schema version bump beyond what COM-V2-001 already introduced (`schemaVersion:3` for community). No migration needed — this only affects newly-created notes going forward.

## Routes Changed

None (routes themselves were already added in COM-V2-002). `#/community/all` and `#/community/:orgId/general` now render real content instead of a shell.

## UI Changed

Global/College General walls now show the full Sticky Wall toolbar/canvas/compose drawer instead of a "being prepared" placeholder. Jurusan wall UI: unchanged (same renderer, same call shape).

## Testing

- `node --check` passed for all 4 modified files.
- **Scope isolation, tested with real created data, not simulated:** posted one real note each to Global (named identity), KMK College General (anonymous identity), and KMK→Sains Jurusan (via the actual Compose UI — clicked "Leave a Note", typed content, selected identity, clicked "Pin to Wall"). Verified via `CommunityService.getCommunityPosts()` across a 5-wall matrix (`global:all`, `college:1`, `college:2`, `jurusan:1:1`, `jurusan:1:2`): **each test note appeared in exactly its own wall and nowhere else** — 15/15 matrix cells correct.
- Verified each test note's stored shape directly: Global note had `orgId:null, majorId:null, communityKey:"global:all", schemaVersion:3`; College note had `orgId:1, majorId:null, communityKey:"college:1", isAnonymous:true, authorNickname:null` (anonymity confirmed not leaked); Jurusan note had `orgId:1, majorId:1, communityKey:"jurusan:1:1", wallKey:"community:1:1"` (legacy wallKey compatibility preserved).
- KMK→Sains count: 81 → 82 (after adding 1 test post) → 81 (after removing exactly that 1 test post; total note store 33 → 30 after removing all 3 test IDs). Confirmed via `CommunityService.getCommunityPosts('jurusan:1:1').length` both before and after a page reload (persistence confirmed, not just in-memory).
- Test cleanup: removed only the 3 explicit test note IDs (217/218/219) via `notes = notes.filter(...)` + `saveNotes()` — did **not** clear LocalStorage. Confirmed 0 residual `TEST-COM-V2-003` content after reload.
- Desktop: Verified. Dark+ZH: Verified (Global wall, all UI strings correctly translated, toolbar/empty-state/compose button all in Chinese). Light+EN: Verified.
- Console errors: none observed across any tested route or interaction.

## Regression

- Building Wall (`#/place/B_PUSTAKA/wall`): Verified, no errors.
- Admin (`#/admin`): Verified — 25 community notes / 410 votes, unchanged from before this stage (test data cleanup confirmed no pollution).
- Echo Map (`map.html`): Verified — `app-data.js` is in its load path (for building notes), so re-checked directly: loads cleanly, all 14 KMK focus buildings listed, no console errors.
- KMK Sains Jurusan wall: 81 notes, unchanged (baseline preserved through the whole test-and-cleanup cycle).

## Compatibility

- Legacy Jurusan `wallKey` (`community:{orgId}:{majorId}`) still written for jurusan-scope posts only — confirmed on the real test note. Global/College General posts never get a `wallKey` (no legacy equivalent exists for them, by design).
- `CommunityService.getCommunityPosts()` (COM-V2-001) required no changes — it already delegated scope-key derivation to `getCommunityKeyForNote()`, which is exactly the function `getContextNotes()` now also uses. No divergent filtering logic between the two.

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `COMMUNITY_V2_PROGRESS.md`.

## Remaining Issues

- Admin panel (`app-admin.js`, frozen this run) shows "Unknown" for a Global post's community column (no college to look up) — cosmetic only, not fixed per the explicit "keep functional, don't enhance" boundary on `app-admin.js` this phase.
- BM language still not independently re-screenshotted this stage (same note as COM-V2-002 — deferred to COM-V2-008's full i18n sweep; no new i18n strings were added this stage, so risk is low).

## Rollback Instructions

See `community v2/checkpoints/COM-V2-003/ROLLBACK.md`. **Note the data-loss caveat**: rolling back after real Global/College General content exists would cause that content to be silently dropped on next load (fails the reverted validation gate) — back up `echo-wall-notes` via Admin Export first if this is ever needed on real data.

## Next Task

COM-V2-004 — Discussion / Question Post Type
