# COM-V2-003 — Pre-checkpoint state

## Baseline confirmed present (COM-V2-002 PASSED)

- `#/community`, `#/community/:orgId`, `#/community/:orgId/jurusan/:majorId` all real. `#/community/all` and `#/community/:orgId/general` were placeholder shells ("This community is being prepared").
- `wallState` (app-data.js) had no `communityKey`/`communityScope` fields yet.
- `getContextNotes()` (app-wall.js) filtered community notes by raw `orgId`/`majorId` equality only — no communityKey-based filtering existed.
- `normalizeStoredNote()` (app-data.js) validation gate assumed every community note has a real `majorId` matching `majors` — would have silently dropped (returned `null` → filtered out) any note with `majorId: null`, which is exactly the shape College General/Global notes need.
- `handleFormSubmit()` (app-wall.js) always wrote `orgId`/`majorId` straight from `wallState.orgId`/`wallState.majorId` (which are coerced to `0` for "unset" by `renderContextWall`) and always set `schemaVersion: 2` for every new note regardless of context.

## Files this stage is expected to touch

- `app-data.js` (`normalizeStoredNote()` — scope-aware validation, null-safe orgId/majorId)
- `app-wall.js` (`renderWall`, new `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall`, `renderContextWall`, `getContextNotes`, `handleFormSubmit`)
- `app-router.js` (2-line dispatch change: shells → real wall renderers)
- `app-community.js` (delete the now-superseded shell functions)

Not expected to touch: `index.html`, i18n locale files (no new UI copy needed — this stage reuses existing wall-toolbar/compose strings and the Hub/Landing strings already added in COM-V2-002), building/map files, `app-admin.js`, `app-place.js`.
