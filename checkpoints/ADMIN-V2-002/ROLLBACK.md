# ROLLBACK — ADMIN-V2-002

Do not restore whole files for the tracked files below (the working tree carries unrelated
uncommitted work in most of them). Reverse only the specific hunks, matching `PRE_STATE.md` /
`before/*.pre`.

1. **services/moderation-service.js** — delete this file entirely (it is brand new).

2. **scripts/test-admin-moderation-schema.mjs** — delete this file entirely (it is brand new).

3. **index.html** — remove the `<script src="services/moderation-service.js"></script>` line
   inserted immediately after `<script src="services/map-note-service.js"></script>`.

4. **services/study-submission-service.js**:
   - Remove the `syncModerationItemStatus(contentId, status, moderator)` helper function (added
     immediately after `pushAudit()`).
   - In `createSubmission()`, remove the `try { window.ModerationService?.createModerationItem?.({...}); } catch {}`
     block inserted right before `return { record: saved, duplicateWarning: ... };`.
   - In `approveSubmission()`, remove the `syncModerationItemStatus(id, 'approved', moderator);`
     line (added right before `return updated;`).
   - In `rejectSubmission()`, remove the `syncModerationItemStatus(id, 'rejected', moderator);`
     line (added right before `return updated;`).

5. **services/moderation-service.js** (ADMIN-V2-002A addendum, applied on top of item 1 above):
   - Restore `KMK_ORG_ID = 1` as a plain constant and remove `KMK_ORG_ID_FALLBACK`/
     `resolveKmkOrgId()` — replace the two `resolveKmkOrgId()` call sites in
     `resolveContentScope()` (the `post`/building-default and `map_note` branches) back to the bare
     `KMK_ORG_ID` constant.
   - Restore `ALLOWED_TRANSITIONS.approved` to `new Set(["approved", "hidden"])` (remove
     `"rejected"`) and `ALLOWED_TRANSITIONS.hidden` to `new Set(["hidden", "pending"])` (remove
     `"rejected"`).

6. **services/map-note-service.js** (ADMIN-V2-002A addendum):
   - Remove the `canonicalRecordKey(target)` and `syncMapNoteModerationStatus(target, status)`
     helper functions (added immediately before the `window.LocalAnchoredBuildingNoteProvider`
     assignment).
   - Restore `window.MapNoteService`'s `setHidden`/`delete` to their original one-line arrow-
     function form:
     ```js
     setHidden:(id, hidden) => callProvider('setHidden', id, hidden),
     delete:id => callProvider('delete', id),
     ```
     (removing the `async function(id, hidden) { const result = await callProvider(...); syncMapNoteModerationStatus(...); return result; }` wrappers ADMIN-V2-002A added).

7. **scripts/test-admin-moderation-schema.mjs** (ADMIN-V2-002A addendum, applied on top of item 2
   above): remove the `FIXTURE_ORGANIZATIONS` constant, the `organizations` field added to
   `buildSandbox()`'s returned sandbox (and its new `organizationsFixture`/`notesFixture`
   parameters — revert to the no-argument form), the "ADMIN-V2-002A: Map Note integration" test
   block, and the `runKmkLookupIndependenceCheck()` function plus its call site.

## Explicitly not part of this rollback

- `services/admin-permission-service.js`, `services/auth-service.js`, `app-admin.js`,
  `app-study-admin.js`, `services/permission-service.js`, `services/auth-ui.js` — the ADMIN-V2-001 /
  ADMIN-V2-001A Role/Scope contract. Not modified by ADMIN-V2-002 or ADMIN-V2-002A; no blocking bug
  was found in it.
- `services/community-service.js`, `services/comment-service.js` — read for their real
  schemas/scope-derivation helpers (`CommunityService.getCommunityKeyForNote`/`parseCommunityKey`),
  but not modified. ModerationItem/Report point at their content by `contentId`; they never copy or
  mutate that content.
- `services/map-note-service.js`'s actual note/pin storage, `create()`, `list()`, `ready()`,
  `exportData()`, and the anchored/direct-pin provider internals — untouched by ADMIN-V2-002A.
  Map note creation still stays public immediately (no pending state was introduced), and Delete is
  still a real hard delete (no soft-delete/tombstone was introduced) — both deliberately preserved,
  not just accidentally unchanged.
- `StudyUploadService`'s own `moderationStatus`/`verificationStatus`/`duplicateStatus`/`auditLog`
  fields and its IndexedDB storage — untouched and remains the real source of truth for Study.
  `services/moderation-service.js` is an additional, best-effort mirror only (wrapped in
  `try/catch` at every call site — see item 4 above); removing it does not affect Study's own
  approve/reject/verify functionality at all.
- No LocalStorage data was migrated or deleted. Rolling back leaves any
  `echo-wall-moderation-items:v1` / `echo-wall-moderation-reports:v1` keys harmlessly unread by
  older code.

## Safety

No `git reset --hard` or `git clean -fd` was used or is required. All changes are plain
text-editor edits to the working tree; nothing was committed.
