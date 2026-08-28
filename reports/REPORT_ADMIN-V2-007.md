# REPORT — ADMIN-V2-007: Admin Management

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-007/PRE_STATE.md` and `ROLLBACK.md`.

## Scope

Built on the locked ADMIN-V2-001 through 006 baseline. ADMIN-V2-008 (Moderation Assist) explicitly
NOT started.

## What was built

1. **New "Admin Management" tab**, Super-Admin-only (`app-admin-management.js`), reached as a
   fourth admin source alongside Community/Map/Study. Shows: the bootstrap Super Admin's email with
   an explicit "not manageable here, never assignable to anyone else" note; a note that a legacy
   compatibility account may have moderation access but is NOT a Super Admin and is not listed as a
   manageable assignment (no user directory exists in this app to enumerate legacy accounts by
   email, so this is a static informational note, not a dynamic listing — see Known Limitations); a
   Grant form (userId text field — no account picker exists in this app — Role dropdown restricted
   to the 4 assignable roles, a College picker that only appears for `COLLEGE_ADMIN`); and a list of
   every real `RoleAssignment` with Disable/Re-enable/Revoke actions.
2. **`SUPER_ADMIN` is now provably unassignable** — `assertKnownRole` rejects it explicitly (spec
   section 24). Before this stage, `grantRoleAssignment({role: "SUPER_ADMIN", ...})` would have
   silently succeeded (a real, confirmed gap, not a hypothetical one).
3. **Role/scope combination validation** — `assertValidRoleScopeCombo` rejects e.g.
   `COLLEGE_ADMIN` + `scopeType: "study"` (spec section 25's own example), `GLOBAL_MODERATOR` +
   `scopeType: "college"`, `STUDY_MODERATOR` + `scopeType: "global"`.
4. **`revokeRoleAssignment(id, actor)`** (new) — a hard, permanent removal of the assignment row,
   distinct from `setAssignmentStatus`'s reversible Disable/Re-enable.
5. **Real AuditAction on every grant/disable/enable/revoke** — `grantRoleAssignment`/
   `setAssignmentStatus`/`revokeRoleAssignment` gained an optional `actor` parameter: when a real UI
   caller supplies it, the function self-gates to Super Admin only AND creates a
   `role_assignment`-targeted AuditAction, deliberately `scopeType: "system"` (Super-Admin/
   `AUDIT_READ_ALL`-only Audit visibility — a College Admin must never see role-management history,
   even for their own college, confirmed live: see Testing). Omitting `actor` (every
   ADMIN-V2-001-era test fixture call across the whole suite) remains 100% backward compatible —
   no gate, no audit, unchanged behavior. This was a deliberate design choice over retrofitting
   every existing test call site.
6. **Role change is immediate** — re-confirmed (not just assumed unchanged) that no caching layer
   exists anywhere in the permission read path; a Disable takes effect on the very next permission
   check in the same process, no re-login required. Verified both at the service layer (new test)
   and live in the browser (see Testing).

## Deliberate scope decisions

- **No user directory/account picker was built.** Grant uses a plain userId text field — building
  a real "search existing accounts" UI would require a user-listing capability this prototype has
  never had (no backend, no `users` table query surface). This matches ADMIN-V2-005's identical
  decision for the Content Reviewer assign control.
- **Legacy admin is shown only as a static note, not a dynamic row** — there is no way to enumerate
  "which accounts are on the legacy whitelist" without a user directory; the note satisfies "not
  disguised as SUPER_ADMIN" without fabricating a listing feature.
- **No migration tool** for converting a legacy admin into a real `COLLEGE_ADMIN` was built (spec
  section 28 explicitly says this is optional and not required this stage).

## Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (unchanged)
- `node scripts/test-admin-moderation-schema.mjs` — **109 passed, 0 failed** (unchanged)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (unchanged)
- `node scripts/test-study-upload.mjs` — **65 passed, 0 failed** (unchanged)
- `node scripts/test-admin-audit.mjs` — **58 passed, 0 failed** (unchanged)
- `node scripts/test-admin-college-scope.mjs` — **45 passed, 0 failed** (unchanged)
- `node scripts/test-admin-management.mjs` — **43 passed, 0 failed** (new file): Super Admin grants
  Global/KMK/Study/Reviewer roles (each verified to actually confer the right permission);
  COLLEGE_ADMIN+study, GLOBAL_MODERATOR+college, STUDY_MODERATOR+global, missing scopeId, and an
  unknown role are all rejected; granting `role: SUPER_ADMIN` is rejected even when attempted by a
  real Super Admin; a non-Super-Admin's grant/disable/revoke attempts are all denied (and denied
  grant confirmed NOT to mutate storage); Disable takes effect immediately (same-process, no
  re-login) on `canModerateCollege` AND `canAccessAdminPanel`; Re-enable restores access
  immediately; Revoke permanently removes the row (re-revoking throws "not found"); a fabricated
  Super Admin virtual id throws "not found" for both disable and revoke attempts; every
  grant/disable/enable/revoke produces a real AuditAction with actor/target/before/after/createdAt,
  `scopeType: "system"`, invisible to a non-Super-Admin's Audit view; no-actor calls remain fully
  backward compatible (no throw, no audit)
- `node --check` on every modified/new `.js` file — clean
- **Real browser QA** (Chrome, `python -m http.server 8000`, real existing localStorage —
  including real `RoleAssignment` rows left over from earlier stages' own QA): authenticated as a
  temporary Super Admin stub (`AuthService.getCurrentUser` override, reverted after — same
  technique used in every prior stage's QA); navigated to Admin Management and confirmed the info
  note, the real assignment list (6 real rows, including disabled ones from ADMIN-V2-001's own
  earlier QA), and the grant form all render correctly; **granted** a real new `COLLEGE_ADMIN`
  (KMK) role assignment via the actual form (typed a userId, submitted) — appeared immediately in
  the list, correctly attributed `By: qa_super_admin`; clicked **Disable** — status flipped to
  DISABLED live; clicked **Revoke** — the reason-prompt overlay opened (reason optional), confirmed
  — the row disappeared entirely and a real AuditAction was confirmed via console
  (`action:"revoke"`, `scopeType:"system"`, full before/after/actor/timestamp); switched identity to
  a real KMK College Admin and confirmed `adminSetSource('adminManagement')` is denied and
  redirects to Overview, AND the sidebar shows no "Admin Management" link at all for that role
  — no console errors during any of the above

## Modified Files

See `checkpoints/ADMIN-V2-007/PRE_STATE.md`'s "Files touched this stage" for full detail.

## Known Limitations

- No account/user search — a plain userId text field (no user directory exists in this prototype).
- Legacy admin accounts are not individually listed (no way to enumerate them without a user
  directory) — represented only as a static informational note.
- No legacy-to-real-COLLEGE_ADMIN migration tool (explicitly optional per spec, not built).
- "Last relevant activity" (spec section 24's optional item) was not built — this app has no
  reliable cross-session activity log to derive it from beyond the Audit trail itself, which is
  already separately browsable via the Audit tab.
- Mobile viewport not visually verified (pre-existing tooling limitation, unchanged).
- Production security boundary unchanged — all `RoleAssignment` grant/disable/revoke logic remains
  prototype/front-end-only (a browser user can call these functions directly from the console);
  production requires server-side authorization for every one of these mutations.

## Next Step

ADMIN-V2-007 complete. Proceeding to ADMIN-V2-008 (Auto Moderation Assist) per the user's standing
full-sequence authorization for this task.
