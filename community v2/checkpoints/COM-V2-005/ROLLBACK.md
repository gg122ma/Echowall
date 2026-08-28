# COM-V2-005 — Rollback instructions

## What this stage added

- New files: `services/comment-service.js`, `style-comments.css`.
- `index.html`: 2 new tags (`<script src="services/comment-service.js">` after `services/community-service.js`; `<link rel="stylesheet" href="style-comments.css">` after `style-wall.css`).
- `app-wall.js`:
  - `buildNoteDOM()`: comment count now reads `CommentService.getCommentCount(note.id)` live instead of the frozen `note.commentCount`.
  - New functions: `getCommentAuthorLabel`, `buildCommentHTML`, `renderCommentsSectionHTML`, `toggleCommentReplyBox`, `submitComment`.
  - `openModal()`: appends `renderCommentsSectionHTML(note.id)` to the modal content, gated to `note.contextType === "community" && !isDemoSeed`.
- `i18n/locales/{en,ms,zh}.js`: added 8 `comments.*` keys × 3 locales.

## How to roll back only this stage

1. Delete `services/comment-service.js` and `style-comments.css`.
2. In `index.html`: remove both added tags.
3. In `app-wall.js`: revert `buildNoteDOM()`'s comment-count line back to `Number(note.commentCount || 0)`; delete the 5 new functions; remove the `commentsSectionHTML` variable and its interpolation from `openModal()`'s `content.innerHTML`.
4. In `i18n/locales/{en,ms,zh}.js`: remove the 8 `comments.*` keys.

## Data implications of rolling back

`echo-wall-comments:v1` (if any real comments exist by then) becomes orphaned — no code reads it after rollback, but the data itself is untouched/not deleted. If Comments are ever re-added later, existing data in that key would resurface automatically (the schema hasn't changed). No note (`echo-wall-notes`) data is affected by this rollback in either direction.

## Files this rollback must NOT touch

- `app-router.js`, `app-community.js`, `app-data.js`, `data/community-config.js`, `services/community-service.js` — untouched this stage.
- The `.form-group[hidden]` CSS fix from COM-V2-004 — unrelated to this stage, must not be reverted alongside it.
