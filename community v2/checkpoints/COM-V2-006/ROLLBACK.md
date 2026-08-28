# COM-V2-006 — Rollback instructions

## What this stage added

- `app-wall.js`:
  - New `canUserMarkSolved(user, note)` and `setQuestionStatus(noteId, status)` functions.
  - `getFilteredNotes()`: added an `isUnansweredSort` branch — filters to `postType==="question" && questionStatus==="open" && commentCount===0` when `wallState.sort === "unanswered"`, sorted by `createdAt` desc.
  - Toolbar HTML: added an "❓ Unanswered" sort button (community walls only).
  - `openModal()`: added `questionActionsHTML` (Mark Solved / Reopen button, gated by `canUserMarkSolved`), inserted between `.modal-note-footer` and the comments section.
- `style-wall.css`: added `.modal-question-actions`.
- `i18n/locales/{en,ms,zh}.js`: added `wall.unanswered`, `question.markSolved`, `question.reopen`, `question.notAllowed` × 3 locales.

## How to roll back only this stage

1. In `app-wall.js`: delete `canUserMarkSolved`/`setQuestionStatus`; revert `getFilteredNotes()` to its COM-V2-005-era version (remove the `isUnansweredSort` variable and its filter/sort branches); remove the Unanswered toolbar button; remove `questionActionsHTML` and its interpolation from `openModal()`.
2. In `style-wall.css`: remove `.modal-question-actions`.
3. In `i18n/locales/{en,ms,zh}.js`: remove the 4 added keys.

## Data implications of rolling back

Any question already marked `questionStatus: "solved"` keeps that value in storage (rollback doesn't touch data) — it just loses the SOLVED badge rendering and the ability to reopen it through the UI, since `getQuestionBadgeHTML()` (COM-V2-004, unaffected by this rollback) still reads `questionStatus` and would still render "SOLVED" correctly even after this stage's rollback — the badge itself is NOT part of what this stage added, only the button that changes it. No data loss.

## Files this rollback must NOT touch

- `services/comment-service.js` — this stage only *reads* `CommentService.getCommentCount()`, never writes to it; COM-V2-005 is fully independent.
- `app-router.js`, `app-community.js`, `app-data.js`, `data/community-config.js`, `services/community-service.js` — untouched this stage.
