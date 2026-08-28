# REPORT — ADMIN-V2-001: Role / Scope Contract

Date: 2026-08-22/23
Status: **PASS**

## Scope

Only ADMIN-V2-001 (Role/Scope Contract) was implemented, per
`03_EchoWall_Admin_Moderation_V2_详细架构规格书.pdf`. ADMIN-V2-002 through 008 (Queue schema,
Dashboard redesign, Audit actions, College Admin UI, Study Moderator UI redesign, Admin Management
UI, AI Moderation) were explicitly NOT started. Community/Echo Map/Building/Study Notes UI was not
redesigned — only the minimal wiring needed to route their existing admin gates through the new
permission service.

## Audit findings (before writing any code)

- **Admin gate**: `#/admin` → `app-router.js` → `renderAdmin()` (`app-admin.js`) → binary
  `isCurrentUserAdmin()` → `AuthService.isCurrentUserAdmin()` → `user.role === "admin"` AND
  `PROTOTYPE_ADMIN_EMAILS.has(email)` (`greencucumbertube@gmail.com`, `mzteoh88@gmail.com`).
- **Study Moderation gate**: identical — `app-study-admin.js`'s 7 mutating actions all called the
  SAME `requireAdminAccess()` from `app-admin.js`. There was no way for a real account to hold Study
  permission without also holding full Community+Map permission, or vice versa.
- **Service-layer gate**: `services/study-submission-service.js`'s `requireModerator()`
  independently re-checked `AuthService.isCurrentUserAdmin()` — this was the REAL enforcement point
  for approve/reject/setVerification, separate from the UI-layer check. Missing this would have made
  a new STUDY_MODERATOR role technically inert (UI would let them click Approve, the service would
  still throw `moderatorRequired`).
- **Community moderation ("Mark Solved")**: `services/permission-service.js`'s
  `getUserModerationScope()` treated any `role === "admin"` as unrestricted "global", with a dead
  `user.moderatesOrgId` stub branch the file's own header comment said was "currently reachable
  only via constructed user objects in tests, not a real signed-in account."
- **College scope**: did not exist anywhere as a real, assignable, per-college moderator concept.
- **Storage**: `services/auth-service.js` uses `localStorage` (`echo-wall-users:v1`,
  `echo-wall-user-session:v1`) with no role/permission table of its own beyond the single `role`
  field.
- Confirmed by grep: every `role === "admin"` / `isCurrentUserAdmin()` / admin-email check in the
  codebase (`app-admin.js`, `app-study-admin.js`, `services/study-submission-service.js`,
  `services/permission-service.js`, `services/auth-ui.js`, `services/auth-service.js`) was inventoried
  before any edit — see `checkpoints/ADMIN-V2-001/PRE_STATE.md`.

## What was built

### 1. `services/admin-permission-service.js` (new) — the Role/Scope/Permission contract

- **Roles**: `SUPER_ADMIN`, `GLOBAL_MODERATOR`, `COLLEGE_ADMIN`, `STUDY_MODERATOR`,
  `CONTENT_REVIEWER` (plus an internal, non-assignable `LEGACY_ADMIN` pseudo-role — see below).
- **Permissions**: `ADMIN_MANAGE`, `AUDIT_READ_ALL`, `GLOBAL_COMMUNITY_MODERATE`,
  `COLLEGE_COMMUNITY_MODERATE`, `COLLEGE_BUILDING_MODERATE`, `COLLEGE_EVENT_MODERATE`,
  `STUDY_RESOURCE_MODERATE`, `CONTENT_REVIEW`.
- **RoleAssignment shape**: `{ id, userId, role, scopeType, scopeId, permissions, status, grantedBy,
  grantedAt, updatedAt }`. `scopeType` ∈ `global|college|study|system`. `status` ∈ `active|disabled`.
  A user may hold any number of assignments; a `COLLEGE_ADMIN` assignment always carries an explicit
  `scopeId` (the college's `orgId`) and never implicitly widens to other colleges.
- **API**: `isSuperAdmin`, `isLegacyAdmin`, `getRoleAssignments`, `hasRole`, `hasPermission`,
  `canAccessScope`, `canAccessAdminPanel`, `canModerateGlobalCommunity`, `canModerateCollege`,
  `canModerateCollegeBuilding`, `canModerateCollegeEvent`, `canModerateStudy`,
  `grantRoleAssignment`, `setAssignmentStatus`, `listAllRoleAssignments`, `useProvider`.
- **Storage**: `localStorage` key `echo-wall-role-assignments:v1`, behind a swappable
  `{ list(), save(list) }` provider (`LocalRoleAssignmentProvider` is the default;
  `useProvider(nextProvider)` swaps it — e.g. for a future Supabase `user_roles`-backed provider,
  with zero caller changes).

### 2. Super Admin bootstrap — single source of truth

`SUPER_ADMIN_EMAIL = "greencucumbertube@gmail.com"` is declared exactly once, inside
`services/admin-permission-service.js`. `isSuperAdmin(user)` normalizes `email` with
`trim().toLowerCase()` before comparing, so `GreenCucumberTube@Gmail.com` (or any casing/whitespace
variant) still resolves. A Super Admin is a **virtual** assignment (`scopeType: "system"`,
`scopeId: null`) synthesized on every call from the email match — it is never written to
`localStorage`, so it cannot be "disabled" by tampering with stored RoleAssignment rows. `hasPermission`
short-circuits `true` for a Super Admin regardless of the permission list's future growth.

### 3. Legacy admin compatibility

`isLegacyAdmin(user)` = `user.role === "admin"` AND NOT the super-admin email. This reads the
**existing** `role` field `services/auth-service.js` already computes from its own
`PROTOTYPE_ADMIN_EMAILS` whitelist — it does **not** re-declare that whitelist or hardcode
`mzteoh88@gmail.com` a second time anywhere. A legacy admin gets a virtual `LEGACY_ADMIN`
pseudo-role granting exactly its pre-Admin-V2 real capability — `GLOBAL_COMMUNITY_MODERATE` (covers
both the Community and Map admin tabs, since `app-admin.js` has always gated them identically) and
`STUDY_RESOURCE_MODERATE` — but explicitly **not** `ADMIN_MANAGE`, `AUDIT_READ_ALL`, or any
`COLLEGE_*` scope. `mzteoh88@gmail.com` is confirmed **not** Super Admin (test suite + live browser
check both confirm).

### 4. Minimal wiring (no UI redesign)

- `app-admin.js`: `isCurrentUserAdmin()` is now a compatibility wrapper for
  `AdminPermissionService.canAccessAdminPanel(user)` ("does this user hold ANY active
  RoleAssignment"). Two new section-specific gates were added —
  `requireCommunityModerationAccess()` (`canModerateGlobalCommunity`) and
  `requireStudyModerationAccess()` (`canModerateStudy`) — and every previously-blanket
  `requireAdminAccess()` call on a Community/Map-specific action (`adminSetSource`,
  `adminSetSearch`, `adminSetFilter`, `adminToggleHidden`, `adminDeleteNote`, `adminResetNotes`,
  `adminToggleMapHidden`, `adminDeleteMapNote`, `adminRetryMapNotes`, `adminExportNotes`,
  `getAdminFilteredNotes`, `getAdminFilteredMapNotes`) now uses the correct specific gate.
  `renderAdmin()` normalizes `adminState.sourceType` to a section the signed-in user can actually
  reach (defense against a stale/forged `sourceType`), and a new `renderAdminNoSectionState()`
  handles the edge case of a user holding a RoleAssignment that unlocks no built section yet (a
  plain `COLLEGE_ADMIN` or `CONTENT_REVIEWER` in this stage — see Known Limitations). The Study nav
  button and the outer shell's Community/Map nav buttons are now conditionally rendered.
- `app-study-admin.js`: all 7 mutating action call sites switched from `requireAdminAccess()` to
  `requireStudyModerationAccess()`. `renderAdminStudyPanel()`'s Community/Map nav buttons are now
  conditional on `canAccessCommunityModeration()`.
- `services/study-submission-service.js`: `requireModerator()` (the REAL service-layer gate for
  approve/reject/setVerification) now checks `AdminPermissionService.canModerateStudy(user)` instead
  of the legacy binary check — this is the fix that makes a real `STUDY_MODERATOR` role actually
  functional end-to-end, not just UI-visible.
- `services/permission-service.js`: `canUserModerateCommunity()`/`canUserMarkSolved()` (the Wall's
  "Mark Solved/Reopen" action) now delegate to `AdminPermissionService.canModerateGlobalCommunity()`/
  `canModerateCollege()` directly, replacing the single-scope stub with real multi-scope-aware
  checks — a user with both a KMK and a KMPP `COLLEGE_ADMIN` assignment can now correctly moderate
  posts in either college.
- `services/auth-ui.js`: the Admin Dashboard link in the account popover now also shows for any user
  with `canAccessAdminPanel(user)` true, not just the legacy binary admin check.
- `index.html`: `<script src="services/admin-permission-service.js"></script>` added immediately
  after `services/auth-service.js` (CLAUDE.md script-order convention).

### 5. Production security boundary (documented, not just claimed)

`services/admin-permission-service.js`'s file header states explicitly: *"this is prototype/front-end
enforcement only, not a real security boundary... Production writes still require the write itself
to be re-authorized server-side (e.g. Supabase RLS keyed off `auth.uid()`/a trusted `user_roles`
table)."* The RoleAssignment shape was deliberately kept close to `docs/BACKEND_INTEGRATION_READINESS.md`
section 5's planned `user_roles` table so a future backend swap only replaces the provider.

## Tests

`node scripts/test-admin-role-scope.mjs` (new, 65 checks) — **65/65 PASS**:
- Super Admin bootstrap for both exact-case and mixed-case email — all permissions, all college
  scopes, Study true.
- Guest / plain signed-in Student — every check false.
- Legacy admin (`mzteoh88@gmail.com`) — NOT Super Admin, but retains its pre-Admin-V2 capability
  (Community + Study), explicitly NOT `ADMIN_MANAGE`/`AUDIT_READ_ALL`/college scope.
- Global Moderator — global true, college false, study false.
- KMK College Admin — KMK true, KMPP false, global false, study false, building/event true for KMK.
- KMPP College Admin — KMPP true, KMK false.
- Study Moderator — study true, global false, college false.
- Disabled assignment — every check false, `hasRole` false.
- Multiple scopes (KMK + KMPP on one user) — both explicit scopes true, an ungranted third college
  false, no implicit global grant.
- `canAccessScope()` direct checks for global/college/study scope types.
- Content Reviewer — `CONTENT_REVIEW` true, `ADMIN_MANAGE` false, no community/study moderation.
- RoleAssignment shape sanity (all 9 contract fields present) and `listAllRoleAssignments()`
  includes disabled rows.

`node scripts/test-study-upload.mjs` — **49/49 PASS** (re-run after wiring
`services/admin-permission-service.js` + a fake `localStorage` into that suite's sandbox, so it now
exercises `requireModerator()`'s REAL new gate instead of a stale legacy-only path). No assertion in
that file was changed — only the sandbox setup, to keep it in sync with the real code it tests.

## Browser QA (real Chrome, `mcp__claude-in-chrome`)

- **Super Admin** (`greencucumbertube@gmail.com`, signed in via a real existing prototype account,
  session verified live): Admin Dashboard reachable; `isSuperAdmin`, all 8 permissions, both college
  scopes, and Study all confirmed `true` via live console check; **clicked into** Study Moderation
  (real pending submission rendered) and Map Notes (real panel rendered) — both fully functional, no
  console errors.
- **Legacy admin** (`mzteoh88@gmail.com`, the account already signed in at session start): Admin
  Dashboard, Community Notes, Map Notes, and Study Moderation all visible and functional before AND
  after this task's changes — confirmed NOT Super Admin, confirmed legacy-compat grants exactly
  Community+Study. No console errors at any point.
- **Regular signed-in student** (`teststudent.qa@example.com`, `role: "user"`, zero RoleAssignments):
  `#/admin` → "Access denied" page — confirmed live.
- **Study Moderator** (real `grantRoleAssignment()` call against the live app, then hard-reloaded):
  sidebar showed **only** "Study Moderation" + "Open Echo Map" (Community/Map nav buttons correctly
  absent); landed directly on a working Study Moderation panel. Forcing
  `adminSetSource('community')` from the console was denied (`adminState.sourceType` stayed
  `"study"`) — confirmed the isolation is enforced at the action level, not just by hiding buttons.
- **Global Moderator** (same live-grant method): sidebar showed Community Notes + Map Notes, real
  data rendered; Study Moderation nav button correctly absent. Forcing `adminSetSource('study')` from
  the console was denied (`adminState.sourceType` stayed `"community"`).
- **KMK/KMPP College Admin isolation**: verified via the live `AdminPermissionService` API in the
  browser console (matching the Node suite) — no dedicated College Admin UI exists yet to click
  through (that is ADMIN-V2-005, explicitly out of scope this stage). **Not a full UI click-through
  — recorded honestly, not claimed as more than it is.**
- Test RoleAssignments were disabled and the original `mzteoh88@gmail.com` session was restored
  before finishing, leaving the live app in its original signed-in state. No console errors were
  observed at any point across the whole QA pass.
- Mobile viewport: **Not verified** (same pre-existing `resize_window` tooling limitation recorded
  in every prior stage's report/HANDOFF).

## Modified / new files

```
services/admin-permission-service.js   NEW — Role/Scope/Permission contract, single source of truth
app-admin.js                           section-specific gates, sourceType normalization, no-section state
app-study-admin.js                     Study-specific gate on all 7 actions + conditional sidebar buttons
services/study-submission-service.js   requireModerator() now checks the real Study permission
services/permission-service.js         canUserModerateCommunity/canUserMarkSolved delegate to the new service
services/auth-ui.js                    Admin Dashboard link visibility uses canAccessAdminPanel too
index.html                             loads services/admin-permission-service.js after auth-service.js
scripts/test-admin-role-scope.mjs      NEW — 65-check direct-call test suite
scripts/test-study-upload.mjs          sandbox now loads the real permission service + a fake localStorage
```

## Not modified

Community UI, Echo Map UI, Building UI, Study Notes UI (browse/upload) — no visual or behavioral
change beyond the minimal admin-gate wiring above. `data/community-config.js`,
`services/community-service.js`, `services/comment-service.js`, `services/map-note-service.js`,
`app-router.js`, `app-wall.js` — untouched. `PROTOTYPE_ADMIN_EMAILS` in `services/auth-service.js` —
untouched (still the legacy whitelist's own source of truth).

## Known Limitations

- **College Admin / Content Reviewer have no dedicated UI yet.** A real `COLLEGE_ADMIN` or
  `CONTENT_REVIEWER` RoleAssignment is fully correct at the permission-service layer (proven by
  both test suites and live console checks), but reaching `#/admin` today lands them on
  `renderAdminNoSectionState()` ("No sections assigned yet") because the actual per-college
  Community/Building/Event moderation UI is ADMIN-V2-005 and Content Review UI does not exist yet.
  This is expected and intentional for this stage, not a bug.
- **Map moderation has no dedicated permission constant.** It continues to share
  `GLOBAL_COMMUNITY_MODERATE` with Community moderation, matching `app-admin.js`'s pre-existing
  behavior (it has never distinguished the two). A future stage could split this out if map
  moderation needs its own scope.
- **`AUDIT_READ_ALL` and `ADMIN_MANAGE` have no consuming UI yet** — the permission constants exist
  and are correctly granted only to Super Admin, but there is no Audit log or Role Manager screen to
  gate (ADMIN-V2-004 / ADMIN-V2-007).
- **This remains prototype/front-end-only enforcement.** Every check in
  `services/admin-permission-service.js` can be bypassed by calling its functions directly from the
  browser console (as this report's own Browser QA section did, deliberately, to grant test roles).
  Production authorization must be re-checked server-side — see the file's own header comment and
  `docs/BACKEND_INTEGRATION_READINESS.md` section 5.
- Mobile viewport not visually verified (pre-existing tooling limitation, not new).

## ADMIN-V2-001A — Contract correction (2026-08-23, same stage, applied after the above)

**Issue found**: `greencucumbertube@gmail.com` was hardcoded in TWO business-code files —
`services/admin-permission-service.js`'s `SUPER_ADMIN_EMAIL` (correct, intended) AND
`services/auth-service.js`'s pre-existing `PROTOTYPE_ADMIN_EMAILS` (left over from before this
stage, never removed). This violated ADMIN-V2-001's own "single source of truth" requirement.

**Fix**:
- `services/auth-service.js`'s `PROTOTYPE_ADMIN_EMAILS` now contains only the true legacy admin,
  `mzteoh88@gmail.com`. The Super Admin email no longer appears there at all.
- `services/auth-service.js`'s `isCurrentUserAdmin()` is now a compatibility wrapper: when
  `window.AdminPermissionService.canAccessAdminPanel` is available (the normal case — it loads
  immediately after this file), it defers entirely to that; only if `AdminPermissionService` is
  somehow absent does it fall back to the (now legacy-only) whitelist. This introduces no
  script-load circular dependency — the check runs at call-time (a user action), long after both
  scripts have loaded, not at parse-time.
- **Super Admin authorization no longer depends on `user.role`.** `AdminPermissionService.isSuperAdmin()`
  was already `email`-only (this was never actually broken at the permission-service layer — the
  real defect was the duplicate hardcode, not a functional bug), but this is now also true of
  `AuthService`'s own `role` field: `greencucumbertube@gmail.com` now gets `role: "user"` from
  `AuthService` (since it's no longer in any whitelist there), and Super Admin status still
  resolves correctly purely from `AdminPermissionService.isSuperAdmin()`'s email check — confirmed
  live in the browser (see below) and by three new dedicated test fixtures using `role: "user"`
  and even no `role` field at all.
- `mzteoh88@gmail.com` is unaffected — still a real, working legacy admin (Community + Map + Study),
  still confirmed NOT Super Admin.

**Verification — grep**: business `.js` code now contains `greencucumbertube@gmail.com` exactly
once, in `services/admin-permission-service.js`'s `SUPER_ADMIN_EMAIL`. (Test fixtures in
`scripts/test-admin-role-scope.mjs` and archival snapshots under `checkpoints/` also reference the
email, as expected and permitted — those are not business-code hardcodes.)

**Tests**: `scripts/test-admin-role-scope.mjs` grew from 65 to **74 checks, 74/74 PASS** — 9 new
checks added specifically proving Super Admin independence from the legacy `role` field (a
`role: "user"` fixture and a no-`role`-field-at-all fixture, both still resolving `isSuperAdmin`,
`canAccessAdminPanel`, `canModerateStudy`, `canModerateGlobalCommunity`, `ADMIN_MANAGE`, and
`AUDIT_READ_ALL` correctly true). `scripts/test-study-upload.mjs` re-run: **49/49 PASS** unaffected
(that suite's sandbox provides its own fake `AuthService` and never touches the real
`services/auth-service.js`).

**Browser smoke** (real Chrome, not a full re-run of all of ADMIN-V2-001's Browser QA):
- `greencucumbertube@gmail.com` (existing account, session switched live): confirmed via console
  `role: "user"` (no longer `"admin"`), yet `isSuperAdmin: true`, `isLegacyAdmin: false`,
  `canAccessAdminPanel/canModerateGlobalCommunity/canModerateCollege(KMK)/canModerateStudy/
  ADMIN_MANAGE/AUDIT_READ_ALL` all `true`, and `AuthService.isCurrentUserAdmin()` (the compat
  wrapper) `true`. Admin Dashboard reachable; clicked into Study Moderation — real pending
  submission rendered, no console errors.
- `mzteoh88@gmail.com`: Community/Map/Study Moderation all still visible and functional (identical
  to before this correction); console-confirmed `isSuperAdmin: false`, `isLegacyAdmin: true`,
  `ADMIN_MANAGE: false`, `AUDIT_READ_ALL: false`.
- Plain signed-in student: `#/admin` → "Access denied", no console errors.
- Original session (`mzteoh88@gmail.com`) restored before finishing.

**Modified files (this correction only)**: `services/auth-service.js`,
`services/admin-permission-service.js` (header comment only — no logic change),
`scripts/test-admin-role-scope.mjs` (+9 checks). Checkpoint `after/*.post` snapshots for these
three refreshed; `PRE_STATE.md`/`ROLLBACK.md` updated with an addendum documenting this pass.

## Next Step

None proposed — ADMIN-V2-001 (including the ADMIN-V2-001A contract correction) is complete.
Awaiting the user's explicit instruction before starting ADMIN-V2-002 (Moderation Queue schema) or
any later stage.
