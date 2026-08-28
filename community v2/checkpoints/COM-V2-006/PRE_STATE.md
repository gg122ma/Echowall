# COM-V2-006 — Pre-checkpoint state

## Baseline confirmed present (COM-V2-005 PASSED)

- `postType`/`questionStatus` fully functional since COM-V2-004 (`questionStatus` starts "open" for new Questions). `getQuestionBadgeHTML()` already had `.is-solved` styling ready but nothing ever set `questionStatus: "solved"`.
- No Mark Solved/Reopen UI existed. No "Unanswered" sort/filter existed.
- Comments fully functional since COM-V2-005 — `CommentService.getCommentCount(postId)` is the real source of truth this stage's Unanswered filter reads.

## Files this stage is expected to touch

- `app-wall.js` (`getFilteredNotes` — Unanswered filter+sort; toolbar HTML — Unanswered button; `openModal` — Mark Solved/Reopen action; new `canUserMarkSolved`/`setQuestionStatus`)
- `style-wall.css` (`.modal-question-actions`)
- `i18n/locales/{en,ms,zh}.js` (`wall.unanswered`, `question.*`)

Not expected to touch: `app-router.js`, `app-community.js`, `app-data.js`, `services/comment-service.js`, `services/community-service.js`, building/map files.
