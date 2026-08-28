# COM-V2-007 — Rollback instructions

## What this stage added

- New file: `services/permission-service.js` — `canUserPost`, `canUserComment`, `canUserMarkSolved`, `canUserModerateCommunity`, `getUserModerationScope`.
- `index.html`: 1 new `<script src="services/permission-service.js">` tag (after `services/community-service.js`, before `services/comment-service.js`).
- `app-wall.js`:
  - Removed the local `canUserMarkSolved()` (moved into `services/permission-service.js`, with an added college-scope branch it didn't have before).
  - `openDrawer()`, `handleFormSubmit()`: auth check changed from `if (!currentUser)` to `if (!PermissionService.canUserPost(currentUser))`.
  - `submitComment()`: auth check changed from `if (!currentUser)` to `if (!PermissionService.canUserComment(currentUser))`.
  - `setQuestionStatus()`, `openModal()`'s `questionActionsHTML`: now call `PermissionService.canUserMarkSolved()` instead of the local function.

## How to roll back only this stage

1. Delete `services/permission-service.js`.
2. In `index.html`: remove its `<script>` tag.
3. In `app-wall.js`:
   - Re-add the local `canUserMarkSolved(user, note)` function exactly as it was in COM-V2-006 (author-or-global-admin only, no college-scope branch — see `community v2/reports/REPORT_COM-V2-006.md` for its body).
   - Revert `openDrawer()`/`handleFormSubmit()` auth checks back to `if (!currentUser)`.
   - Revert `submitComment()`'s auth check back to `if (!currentUser)`.
   - Revert `setQuestionStatus()`/`openModal()` to call the local `canUserMarkSolved()` again.

## Data implications of rolling back

None — this stage added no new persisted fields to notes, comments, or users. `user.moderatesOrgId` is read defensively (`Number.isInteger(...) && > 0`) but never written anywhere in this codebase; no real user object has it. Rolling back removes the *capability* to recognize it, nothing more.

## Files this rollback must NOT touch

- `services/auth-service.js` — never modified by this stage (College Admin is modeled as an optional field the existing schema already tolerates via loose property access, not a schema change).
- `app-router.js`, `app-community.js`, `app-data.js`, `data/community-config.js`, `services/community-service.js`, `services/comment-service.js` — untouched this stage.
