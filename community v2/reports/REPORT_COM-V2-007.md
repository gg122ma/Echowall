# REPORT_COM-V2-007

**Task ID:** COM-V2-007 — Permission Hooks
**Status:** PASS
**Start State:** COM-V2-006 PASSED. `canUserMarkSolved` existed only inline in `app-wall.js`, no college-scoping. `openDrawer`/`handleFormSubmit`/`submitComment` each had their own ad hoc `if (!currentUser)` check. No `canUserModerateCommunity`/unified hooks existed.
**Checkpoint Path:** `community v2/checkpoints/COM-V2-007/`

## Completed

- `services/permission-service.js`: unified permission hooks — `canUserPost(user)`, `canUserComment(user)`, `canUserMarkSolved(user, note)`, `canUserModerateCommunity(user, community)`, `getUserModerationScope(user)`.
- `getUserModerationScope()` maps the prototype's existing single admin tier (`role:"admin"`, `services/auth-service.js`'s `PROTOTYPE_ADMIN_EMAILS`) to `{scope:"global"}` — accurate to current reality, since those 2 accounts already have unrestricted Admin dashboard access across every community today. A forward-compatible `{scope:"college", orgId}` branch reads an optional `user.moderatesOrgId` field for a future real per-college admin role — **no real account in this prototype has this field**, reported honestly as such (see Testing).
- `canUserModerateCommunity()`: global moderators can moderate everything including `global:all`; college moderators can moderate their own college's General + every Jurusan under it, but **never** `global:all` — matches the spec's permission matrix exactly.
- `canUserMarkSolved()` gained a college-moderator branch it didn't have in COM-V2-006 (checks the note's own `orgId`/`communityScope` against the moderator's scope) — a real behavior improvement, not just a refactor.
- Refactored `openDrawer()`, `handleFormSubmit()`, `submitComment()` to call the unified hooks instead of ad hoc `if (!currentUser)` checks scattered across 3 different functions — same behavior, single source of truth now.
- Explicitly documented (in the file's own header comment, in this report, and in HANDOFF) that this is front-end gating only, not a security boundary — matches the spec's own repeated instruction not to present prototype permission checks as real security.

## Modified Files

New: `services/permission-service.js`. Edited: `index.html`, `app-wall.js`.

## Data / Schema Changes

None. No new persisted fields on notes/comments/users.

## Routes Changed

None.

## UI Changed

None — this stage is pure refactor + new capability underneath existing UI (the Mark Solved button's visibility logic is unchanged in effect for the cases that already worked; it's now also correctly reachable for a hypothetical college moderator, which no real account can exercise yet).

## Testing

- `node --check` passed for `services/permission-service.js` and `app-wall.js`.
- **Visitor cannot post/comment — tested via the real UI, not just a function call**: signed out via `AuthService.signOut()`, confirmed the navbar showed "Sign in"/"Register", confirmed the wall remained fully browsable (81 notes, all toolbar/filters intact), then clicked "Leave a Note" and confirmed the real Sign-in modal opened (not a silent no-op) — the exact same modal a genuine anonymous visitor would see. Signed back in via the real form afterward, confirmed the identical session (`user_...t8b66u`, `role:"admin"`) was restored.
- **Signed-in student can post/comment** — the same real account, already verified extensively across COM-V2-003/005/006's real Compose/Comment interactions; re-confirmed the Building Wall compose drawer still opens correctly post-refactor.
- **Permission matrix — 13 cases, tested via direct function calls with constructed user objects** (the prototype has exactly one real identity, `role:"admin"`; a genuine second student account or a real College Admin account does not exist — per the task's own explicit instruction to report "Not verified" rather than fake it with DOM bypasses, direct function calls against real `CommunityService` descriptors were used instead, the same method already used and accepted in COM-V2-006): visitor cannot post ✓, visitor cannot comment ✓, real student (signed-in) can post ✓, can comment ✓, post author can solve their own question ✓, a different student cannot solve someone else's question ✓, a constructed college-moderator (`moderatesOrgId:1`) can moderate `college:1` ✓, can moderate `jurusan:1:1` ✓, cannot moderate `college:2` ✓, cannot moderate `global:all` ✓, the real global admin can moderate `global:all` ✓, can moderate any college ✓, an ordinary student cannot moderate anything ✓. **All 13/13 correct.**
- Building Wall, Admin, Echo Map: Verified, zero console errors, all unaffected by the refactor.

## Regression

- Building Wall compose drawer: confirmed still opens correctly for the signed-in account after the `openDrawer()` refactor.
- No note/comment/vote/translation behavior changed — this stage only touches the entry-gate checks, not what happens after they pass.

## Compatibility

- `canUserModerateCommunity()` takes a `CommunityDescriptor`-shaped object (from `CommunityService.getCommunityByKey()`), so it composes directly with COM-V2-001's registry without any new lookup logic.
- No change to `services/auth-service.js` — the "College Admin" concept is read defensively (`user.moderatesOrgId`) rather than requiring a schema migration, so this stage doesn't touch user records, registration, or login at all.

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `COMMUNITY_V2_PROGRESS.md`.

## Remaining Issues

- **No real College Admin account exists in this prototype** — `canUserModerateCommunity()`'s college-scoped branch is verified correct by logic/direct-call testing only, not by a real signed-in College Admin using the actual UI. This is an honest, reported gap, not a fake "Verified." If a future stage wants to test this against a real account, `services/auth-service.js` would need a way to set `moderatesOrgId` on a user record (e.g. via the Admin dashboard or a config-driven list, similar to `PROTOTYPE_ADMIN_EMAILS`) — not attempted here, as it would be a real `auth-service.js` schema change outside this stage's "hooks only" scope.
- Mobile viewport and BM language not independently re-screenshotted this stage (no new UI was added — pure logic refactor — so risk is essentially zero; still flagged for completeness ahead of COM-V2-008).
- Full Admin moderation queue (using `canUserModerateCommunity` to gate the actual Admin dashboard's community filter) is not implemented — explicitly Phase 5, out of scope for "hooks."

## Rollback Instructions

See `community v2/checkpoints/COM-V2-007/ROLLBACK.md`.

## Next Task

COM-V2-008 — Migration + Full Regression QA
