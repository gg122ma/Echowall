# COM-V2-005 — Pre-checkpoint state

## Baseline confirmed present (COM-V2-004 PASSED)

- No comment storage/read/write code existed anywhere — `echo-wall-comments:v1` was only a documented constant (`CommunityService.COMMENT_STORAGE_KEY`) from COM-V2-001, never read or written.
- Detail Modal (`openModal()`) rendered note content + vote actions only, no Comments section.
- Sticky card comment count (💬) showed the frozen `note.commentCount` field (always 0), not a live count.

## Files this stage is expected to touch

- New: `services/comment-service.js`, `style-comments.css`
- `index.html` (2 new tags: script + stylesheet link)
- `app-wall.js` (`buildNoteDOM` — live comment count; `openModal` — append Comments section; new `getCommentAuthorLabel`/`buildCommentHTML`/`renderCommentsSectionHTML`/`toggleCommentReplyBox`/`submitComment`)
- `i18n/locales/{en,ms,zh}.js` (`comments.*` keys)

Not expected to touch: `app-router.js`, `app-community.js`, `app-data.js`, `data/community-config.js`, `services/community-service.js`, building/map files.
