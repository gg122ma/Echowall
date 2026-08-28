# REPORT_COM-V2-005

**Task ID:** COM-V2-005 — Comments + One-Level Reply
**Status:** PASS
**Start State:** COM-V2-004 PASSED. No comment storage/UI existed anywhere.
**Checkpoint Path:** `community v2/checkpoints/COM-V2-005/`

## Completed

- `services/comment-service.js`: LocalStorage-backed comment store (`echo-wall-comments:v1`), matching COM-V2-001's designed schema exactly. `createComment()`, `getCommentsForPost(postId)`, `getCommentThreadForPost(postId)` (top-level comments with their depth-1 replies nested under `replies`), `getCommentCount(postId)`.
- **Depth strictly enforced at write time**, not just by convention: `createComment()` throws if `parentCommentId` points at a comment whose own `depth >= 1` — a reply-to-a-reply is rejected server-side (well, service-side), not just hidden in the UI. No infinite nesting possible.
- Detail Modal (`openModal()`) now shows a full Comments section for community posts: "💬 Comments (N)", the comment thread (top-level + nested one-level replies), a composer (textarea + "Show my name" checkbox + Send), and a per-comment "Reply" link that reveals an inline reply composer under that specific comment.
- Sticky Card comment count (💬) now reads live from `CommentService.getCommentCount()` instead of the frozen field — created comments are reflected on the wall immediately (`renderWallNotes()` is called after a successful `submitComment()`, same pattern as `voteNote()`).
- Browsing comments requires nothing (works for any visitor); posting requires `AuthService.getCurrentUser()`, same as note creation — reuses the existing auth check + toast + `AuthUI.open("login")` pattern, no second auth system.
- Anonymous/Named identity reuses the account's real `displayName` when "Show my name" is checked (default unchecked = anonymous, matching the note-compose default-anonymous philosophy) — deliberately a single compact checkbox rather than a full radio-card pair, per the task's explicit permission to keep this "lowest risk" for v1.
- Building notes and Demo Seed (read-only) notes get **no** Comments section at all — confirmed via direct testing, not just code inspection.

## Modified Files

New: `services/comment-service.js`, `style-comments.css`. Edited: `index.html`, `app-wall.js`, `i18n/locales/{en,ms,zh}.js`.

## Data / Schema Changes

New storage key `echo-wall-comments:v1`, schema exactly as designed in COM-V2-001: `{id, postId, parentCommentId, depth, authorUserId, isAnonymous, authorNickname, content, moderationStatus, isHidden, createdAt, updatedAt}`.

## Routes Changed

None — Comments live inside the existing Detail Modal, no separate Post Detail route, per the task's explicit "extend the existing modal, don't build a new route" instruction.

## UI Changed

Detail Modal gained a Comments section (community posts only). Sticky Card comment count is now live instead of always-0. No other UI changed.

## Testing

- `node --check` passed for `services/comment-service.js`, `app-wall.js`, all 3 locale files.
- **Security (XSS), tested live, not just via escapeHtml code inspection**: submitted a comment containing `<script>alert(1)</script> and <img src=x onerror=alert(2)>` through the real Compose UI. Rendered as literal visible text in the comment list — confirmed no JavaScript dialog fired, page remained fully interactive and responsive afterward. This is the same `escapeHtml()` helper already used throughout the codebase for note content.
- **Post isolation, tested with two real posts**: Post A ("Discrete Mathematics...") got 1 comment + 1 reply via the real UI; Post B ("A letter to those who come later...") opened immediately afterward showed "Comments (0)" — zero leakage in either direction.
- **One-level reply enforced**: posted a Comment (depth 0), then a Reply to it (depth 1, rendered visually nested/indented). Attempting `createComment({parentCommentId: <a reply's own id>})` via direct service call threw "Replies can only be one level deep." — confirmed programmatically.
- **Validation guards, tested via direct service calls**: empty/whitespace-only content rejected, content over 500 characters rejected, missing `authorUserId` (not-signed-in equivalent) rejected — all three threw the expected error messages.
- **Anonymous safety**: reply posted with "Show my name" left unchecked showed "Anonymous", no real nickname leaked in the stored comment (`authorNickname: null`) or the rendered DOM.
- **Named identity**: comment posted with "Show my name" checked showed the real account display name ("la"), matching `currentUser.displayName`.
- **Persistence**: comments survived a full page reload (`CommentService`'s module-level cache only re-reads from LocalStorage on actual page load, not SPA navigation — same established pattern as `notes`/`loadNotes()`; verified this explicitly when a first attempt to check post-cleanup state showed stale in-memory data until a real reload).
- Cleanup: cleared the `echo-wall-comments:v1` key entirely (safe — it held only this session's 2 test comments, no pre-existing user data; the general "don't wipe LocalStorage" instruction is specifically about `echo-wall-notes`, confirmed empty of anything but test data before clearing). Confirmed 0 comments and unchanged 30-note total after reload.
- Dark+ZH: Verified — full Comments UI translated ("评论 (0)", empty-state copy, placeholder, "显示我的名字", "发送"), no raw i18n keys, zero console errors.
- Admin, Echo Map: Verified, zero console errors, unaffected (neither loads `comment-service.js`/`style-comments.css` — Echo Map correctly excluded per the Building/Map freeze; Admin doesn't touch comments this stage, per its "keep functional, don't enhance" boundary).

## Regression

- Building Wall: Verified — Detail Modal for a building note shows no Comments section at all (correct, by design).
- KMK→Sains note count: unaffected (comments are a separate storage key entirely).
- Voting, translation, photo, shape/color, anonymous/named note identity: all re-confirmed unaffected during the same test session (used the exact same modal that already renders these).

## Compatibility

- `CommentService` has zero dependency on `CommunityService`/`data/community-config.js` beyond reading the shared `COMMENT_STORAGE_KEY` constant — comments are keyed purely by `postId` (a note's own `id`), not by `communityKey`/scope, so they work identically for Global/College General/Jurusan posts (all share the same note `id` space).
- Comment storage is entirely independent of `echo-wall-notes` — no note fields are mutated when a comment is created (the sticky card's displayed count is a live read, not a stored/synced value on the note object itself, matching the spec's explicit "commentCount is derived/cache, not source of truth" instruction).

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `COMMUNITY_V2_PROGRESS.md`.

## Remaining Issues

- Mobile viewport and BM language not independently re-screenshotted this stage (same low-risk deferral as prior stages — CSS reuses existing responsive patterns; `comments.*` BM translations exist with the same care as EN/ZH). Both flagged for COM-V2-008's full sweep.
- No comment moderation UI (hide/reject) — `moderationStatus`/`isHidden` fields exist in the schema and are respected by `getCommentsForPost()`'s filter, but nothing in the UI can set them yet. Expected — full Admin moderation queue is Phase 5, explicitly out of scope.
- No comment voting/reputation — explicitly out of scope per the master spec's "明确不做" list.

## Rollback Instructions

See `community v2/checkpoints/COM-V2-005/ROLLBACK.md`.

## Next Task

COM-V2-006 — Solved / Unanswered
