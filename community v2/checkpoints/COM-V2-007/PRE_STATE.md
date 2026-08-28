# COM-V2-007 — Pre-checkpoint state

## Baseline confirmed present (COM-V2-006 PASSED)

- `canUserMarkSolved(user, note)` existed only inline in `app-wall.js`, checking `user.role === "admin"` with no per-college scoping.
- No unified `canUserPost`/`canUserComment`/`canUserModerateCommunity` helpers existed — `openDrawer()`, `handleFormSubmit()`, `submitComment()` each had their own inline `if (!currentUser)` check.
- `services/auth-service.js` has exactly one admin tier (2 hardcoded `PROTOTYPE_ADMIN_EMAILS`), already with unrestricted access to the whole Admin dashboard — no per-college admin role exists anywhere in the current user schema.

## Files this stage is expected to touch

- New: `services/permission-service.js`
- `index.html` (1 new script tag)
- `app-wall.js` (`openDrawer`, `handleFormSubmit`, `submitComment`, `setQuestionStatus`, `openModal` — all switched to call `PermissionService.*` instead of inline/local checks; local `canUserMarkSolved` removed)

Not expected to touch: `services/auth-service.js` (no schema change — College Admin is modeled via an optional forward-compatible `user.moderatesOrgId` field that no real prototype account has yet, not a persisted schema change), `app-router.js`, `app-community.js`, `app-data.js`, `app-admin.js`, `services/community-service.js`, `services/comment-service.js`, building/map files.

## Known constraint going in

No real "College Admin" account exists in this prototype's user data. `canUserModerateCommunity`'s college-scoped branch will be tested via direct function calls with constructed user objects (same method used successfully in COM-V2-006), not a real signed-in account — this will be reported honestly, not presented as verified against real prototype data.
