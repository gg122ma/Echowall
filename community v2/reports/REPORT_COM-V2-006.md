# REPORT_COM-V2-006

**Task ID:** COM-V2-006 — Solved / Unanswered
**Status:** PASS
**Start State:** COM-V2-005 PASSED. `questionStatus` field existed and defaulted to `"open"` for new Questions since COM-V2-004, but nothing could ever change it to `"solved"`. Badge CSS for `.is-solved` already existed (unused).
**Checkpoint Path:** `community v2/checkpoints/COM-V2-006/`

## Completed

- Question state machine complete: `open` ⇄ `solved`, via a "Mark Solved"/"Reopen" button in the Detail Modal.
- `canUserMarkSolved(user, note)`: the post's own author, or the current prototype "admin" role (stand-in moderator until COM-V2-007 builds real per-college moderation scope) — front-end gating only, explicitly documented as not a security boundary (real enforcement needs a backend, per the master spec's own instruction).
- `acceptedCommentId` (accept-a-specific-answer) deliberately **not** implemented — explicitly out of scope per the task's own instruction ("don't build the accepted-answer system while doing Solved").
- Wall Toolbar: new "❓ Unanswered" sort option (community walls only). Selecting it both filters (only `postType:"question"`, `questionStatus:"open"`, live comment count `0`) and sorts (newest first) — verified this combined behavior matches the spec's definition exactly (excludes Discussion, excludes Solved Questions, excludes Questions that already have comments).
- SOLVED badge renders identically to the already-built `.is-solved` CSS from COM-V2-004 (no new badge code needed — `getQuestionBadgeHTML()` already read `questionStatus` correctly, it just never received `"solved"` before this stage).

## Modified Files

`app-wall.js`, `style-wall.css`, `i18n/locales/{en,ms,zh}.js`.

## Data / Schema Changes

None — `questionStatus` already existed (COM-V2-001/004). This stage is the first code path that can ever write `"solved"` to it.

## Routes Changed

None.

## UI Changed

Detail Modal: new Mark Solved/Reopen button (Question posts only, permission-gated). Wall Toolbar: new Unanswered sort button (community walls only).

## Testing

- `node --check` passed for `app-wall.js` and all 3 locale files.
- **Full E2E flow, executed exactly as specified** (Global → Create Question → OPEN → comment → Mark Solved → SOLVED), all via the real Compose/Modal/Comment UI, not simulated: created a real Question on the Global wall (confirmed `questionStatus:"open"`), confirmed it appeared under the Unanswered filter (1/1), added a real comment (simulating "User B"), confirmed it correctly **disappeared** from Unanswered (has a comment now), clicked "Mark Solved" — badge instantly updated to "❓ QUESTION · SOLVED" (green), button became "🔓 Reopen". Reloaded the page — SOLVED status and comment count both persisted.
- **Permission matrix, tested via direct function calls with synthetic user objects** (not just the one real signed-in identity, since this prototype has no second real account to sign into — matches the task's own guidance to use `AuthService`-compatible objects rather than bypassing permission checks via DOM manipulation): a stranger user (not author, not admin) → denied; the actual post author → allowed; an unrelated user with `role:"admin"` → allowed (prototype moderator stand-in); a Discussion post (any user) → denied (button never shows, since Mark Solved only applies to Questions). All 4 cases correct.
- Reopen tested directly via `setQuestionStatus(id, 'open')` — status correctly reverted to `"open"`.
- Unanswered filter/sort verified empty-state correctly when no post matches (after the test question became Solved+commented).
- Dark+ZH: Verified — "❓ 待解答" (Unanswered) toolbar label, full page translated, zero console errors.
- Cleanup: removed the 1 test question by ID, cleared the (test-only) comment store, confirmed KMK→Sains unaffected (81) throughout.
- Building Wall, Admin: Verified, zero console errors, both unaffected (Unanswered button correctly absent from Building Wall toolbar since it's gated to `context.contextType === "community"`).

## Regression

- KMK→Sains Jurusan wall: 81 notes, unaffected throughout the whole test cycle.
- Building Wall: confirmed no Unanswered filter button, no Mark Solved button possible (building notes have no `postType`), zero errors.
- Admin: unaffected, zero errors.
- Echo Map: not independently re-verified this stage (no touched file is in its load path — `app-wall.js` is not loaded by `map.html`; confirmed via `index.html`/`map.html` script-tag comparison, not just assumption).

## Compatibility

- `setQuestionStatus()` follows the exact same demo-seed-guard pattern as `voteNote()` (`if (note.isDemoSeed === true && note.isDemoSeedRuntime === true) return;`) — read-only showcase Questions (if any exist in the demo bundle) cannot be marked Solved/Reopened, consistent with their voting being disabled too.
- The Unanswered filter reads `CommentService.getCommentCount()` (COM-V2-005) — verified this correctly returns `0` for un-commented Questions and updates immediately once a comment is added, with no caching/staleness issue (confirmed by observing the same test question move in and out of the Unanswered filter as its comment count changed).

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `COMMUNITY_V2_PROGRESS.md`.

## Remaining Issues

- Mobile viewport and BM language not independently re-screenshotted this stage (same low-risk deferral as prior stages). Flagged for COM-V2-008.
- `canUserMarkSolved()`'s "admin role = moderator for everything" rule is intentionally coarse (a KMK admin could technically mark solved a Question on a KMKK-scoped post, since there's only one `role:"admin"` flag in the prototype, not per-college roles) — this is exactly what COM-V2-007 (Permission Hooks) is scoped to refine into real per-`communityScope` moderation. Documented here so COM-V2-007 knows to revisit this specific function.
- No "accept a specific answer" (`acceptedCommentId`) — explicitly deferred (V2.1/optional per spec), not attempted.

## Rollback Instructions

See `community v2/checkpoints/COM-V2-006/ROLLBACK.md`.

## Next Task

COM-V2-007 — Permission Hooks
