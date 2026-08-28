# COM-V2-003 — Rollback instructions

## What this stage modified

- `app-data.js` `normalizeStoredNote()`:
  - Added `hasValue()` helper.
  - Validation gate is now scope-aware (majorId present → jurusan strict validation, unchanged; majorId absent + orgId present → college, must match a real `organizations` entry; both absent → global, always structurally valid).
  - `orgId`/`majorId`/`batchId` in the `normalized` object now stay genuine `null` when absent instead of being coerced to `0`/`NaN` via unconditional `Number(...)`.
- `app-wall.js`:
  - `renderWall()`: added `communityScope`/`communityKey` to the context object; `backPath` changed from `#/org/${orgId}` to `#/community/${orgId}`.
  - New `renderCommunityGlobalWall(container)` and `renderCommunityCollegeGeneralWall(container, orgId)` — call `renderContextWall()` with `communityScope: "global"`/`"college"`.
  - `renderContextWall()`: now also sets `wallState.communityScope`/`wallState.communityKey`.
  - `getContextNotes()`: community branch now filters via `CommunityService.getCommunityKeyForNote(note) === wallState.communityKey` instead of raw `orgId`/`majorId` equality (falls back to the old comparison only if `communityKey` is somehow unset).
  - `handleFormSubmit()`: note construction now derives `orgId`/`majorId`/`communityKey`/`communityScope` from `wallState.communityScope` (never a magic `0`), sets `schemaVersion:3` + full V3 fields for every new community post immediately (not only on next reload), and only attaches legacy `wallKey` for jurusan-scope posts.
- `app-router.js`: 2-line change — `community-global`/`community-college-general` dispatch now calls `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall` (app-wall.js) instead of the COM-V2-002 shell functions.
- `app-community.js`: deleted the now-superseded `renderCommunityShell`/`renderCommunityGlobalShell`/`renderCommunityCollegeGeneralShell` functions (left a one-line comment explaining why).

## How to roll back only this stage

1. In `app-community.js`: restore the three deleted shell functions (see COM-V2-002's `ROLLBACK.md`/git history for their exact bodies, or re-add from `community v2/reports/REPORT_COM-V2-002.md`'s description).
2. In `app-router.js`: change the `community-global`/`community-college-general` dispatch lines back to call `renderCommunityGlobalShell`/`renderCommunityCollegeGeneralShell`.
3. In `app-wall.js`: remove `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall`; revert `renderWall()`'s context object (remove `communityScope`/`communityKey`, restore `backPath: '#/org/${orgId}'`); revert `renderContextWall()` (remove the two new wallState assignments); revert `getContextNotes()` to the raw orgId/majorId filter; revert `handleFormSubmit()`'s note-construction block to the COM-V2-002-era version (unconditional `schemaVersion:2`, `orgId`/`majorId` straight from `wallState`).
4. In `app-data.js`: revert `normalizeStoredNote()`'s validation gate to the jurusan-only version; revert `orgId`/`majorId`/`batchId` in `normalized` back to unconditional `Number(...)` coercion; remove the `hasValue()` helper if nothing else uses it.

## Data implications of rolling back

Any Global/College General posts created after this stage shipped (`communityScope: "global"`/`"college"`, `orgId: null` or `majorId: null`) will FAIL the reverted (jurusan-only) validation gate in `normalizeStoredNote()` on next load and be silently dropped (`.filter(Boolean)`). If this rollback is ever performed on a system with real Global/College General user content, export/back up `echo-wall-notes` first via the Admin "Export JSON" button.

## Files this rollback must NOT touch

- `data/community-config.js`, `services/community-service.js` (COM-V2-001) — used by this stage's code but not modified by it.
- Building/Map files — untouched this stage.
