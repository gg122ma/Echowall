# REPORT — ADMIN-V2-005: College Permission Enforcement + College Admin Workspace

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-005/PRE_STATE.md` and `ROLLBACK.md`.

## Scope

Built on the locked ADMIN-V2-001 through 004 baseline. ADMIN-V2-006 (Study reconciliation), 007
(Admin Management), 008 (Moderation Assist) explicitly NOT started. No Event UI was built (no real
Event feature exists — spec section 54 explicitly forbids fabricating one; `event` remains
contract-only in `ModerationService.CONTENT_TYPES`, unchanged).

## What was built

1. **Real College Admin Community/Map workspace.** A `COLLEGE_ADMIN` with no global permission can
   now reach the Community and (for KMK specifically) Map tabs — previously impossible, a
   documented known limitation since ADMIN-V2-001. `getAdminCommunityNotes()` now scope-filters:
   global-tier moderators (unchanged) see everything; a real College Admin sees ONLY notes whose
   canonical scope (`ModerationService.resolveContentScope`, never re-guessed from `note.orgId`)
   is a college they hold `COLLEGE_ADMIN` for.
2. **Building notes now have an admin surface** (`contextType==="building"`) — previously excluded
   from `getAdminCommunityNotes()` entirely despite `renderAdminNoteRow` already having full,
   dead-code support for rendering them. Minimal adapter fix per spec section 15's explicit
   allowance, not a new feature.
3. **Map's gate decoupled from Community's**: new `canAccessMapModeration()`/
   `requireMapModerationAccess()`, both delegating to `AdminPermissionService.canModerateMap`
   (established in ADMIN-V2-003A) — a KMK College Admin gets Map access via its
   `canModerateCollege` fallback; a KMPP-only College Admin correctly does NOT (Map is KMK-only).
4. **Real per-item WRITE enforcement, not just tab-level gating**: new `adminCanModerateNote(user,
   note)` is checked inside `adminToggleHidden`/`adminDeleteNote` BEFORE any mutation or even
   opening the reason prompt — this is what makes a forced console call like
   `adminToggleHidden(<a KMPP note id>)` fail for a KMK-only admin, verified live (see Testing).
   Map needed no equivalent per-item check: every map note is uniformly KMK-scoped, so the blanket
   `requireMapModerationAccess()` gate already IS the complete per-item check.
5. **The Community filter dropdown** now lists only the viewer's permitted college(s) for a
   non-global-tier user (never "All communities" spanning colleges they can't see, and never lists
   another college's name) — this doubles as the multi-college scope selector spec section 12 asks
   for (a `KMK+KMPP` admin sees both as real options).
6. **`adminResetNotes` ("Reset demo data") deliberately restricted to global-tier only** — it wipes
   the single shared `echo-wall-notes` LocalStorage key for ALL colleges at once; broadening the
   Community tab's general gate without also tightening this specific destructive action would have
   let a College Admin destroy data outside their own scope.
7. **Content Reviewer: real assigned-only access.** `ModerationService.canAccessModerationItem` now
   has a second, additive path: `item.assignedTo === user.id`. This is genuinely additive (an `||`),
   so it never narrows a real moderator's existing scope-wide access — it only ever grants access to
   one specific assigned item for someone who otherwise has none.
8. **Assignment mechanism**: new `ModerationService.assignModerationItem(id, assigneeUserId, user)`
   — Super-Admin-only (spec section 15: "如果 assignment UI 尚未适合：至少 Super Admin 可以 assign
   reviewer from case action"), deliberately separate from `updateModerationStatus` (never touches
   `status`, so it can't misfire that function's reason-required/status-mapped audit logic). Minimal
   inline UI on Dashboard Queue rows (plain userId text field — no user-directory/picker exists in
   this app, and building one is ADMIN-V2-007's job, not this stage's). Creates its own `assign`/
   `unassign` AuditAction.

## Deliberate scope decisions

- **No fake per-college Building/Event product was built.** Building moderation reuses the exact
  same Community note list/actions (a `contextType` distinction already handled by the existing row
  renderer), not a new UI surface. Event has no real feature to adapt, so nothing was built for it.
- **Map access for College Admin is a side-effect of ADMIN-V2-003A's `canModerateMap` design, not a
  new grant this stage invented** — that function already had the `canModerateCollege` fallback;
  this stage only fixed the TAB-VISIBILITY gate that was still checking the wrong (global-only)
  function.

## Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (unchanged)
- `node scripts/test-admin-moderation-schema.mjs` — **109 passed, 0 failed** (unchanged)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (unchanged)
- `node scripts/test-study-upload.mjs` — **54 passed, 0 failed** (unchanged)
- `node scripts/test-admin-audit.mjs` — **58 passed, 0 failed** (unchanged)
- `node scripts/test-admin-college-scope.mjs` — **45 passed, 0 failed** (new file): KMK/KMPP/multi-
  scope college permission matrix; queue visibility exactly matches scope (counts scope-safe);
  forced scope tampering denied (`getModerationItem` direct-by-id, `updateModerationStatus` on a
  cross-college item, forcing `filters.scopeId`/`scopeType` to widen — all denied, in both
  directions KMK↔KMPP); Content Reviewer sees zero items before assignment, exactly the assigned
  item after, loses access on unassignment, non-Super-Admin cannot assign; Student/Guest denied
  everywhere including `assignModerationItem`; Audit view college-isolated (KMK admin doesn't see
  KMPP's audit record and vice versa, Super Admin sees both, Student sees none)
- `node --check` on every modified/new `.js` file — clean
- **Real browser QA** (Chrome, `python -m http.server 8000`, real existing seed data — not fresh
  fixtures): granted a real `COLLEGE_ADMIN` RoleAssignment (scoped to KMK) to a temporary QA user id
  via `AdminPermissionService.grantRoleAssignment`, and temporarily stubbed
  `AuthService.getCurrentUser` to authenticate as that user (reverted immediately after — this is a
  read/write UI verification technique, not a change to any real account). Verified:
  - Overview's scope selector shows exactly `KMK` (no "All permitted scopes" — correct for a
    single-scope user)
  - Sidebar now shows real, non-zero "KM Community Notes" (15) and "Map Notes" (0) counts — both
    tabs previously fully unreachable for this role
  - Community tab renders 15 real notes; independently re-verified via console that ALL 15 resolve
    to KMK college scope via `ModerationService.resolveContentScope` (zero cross-college leakage);
    the count (15) vs. the earlier global-tier legacy-admin view (14, pre-building-notes) is fully
    explained by (a) 1 additional building note now included and (b) this demo dataset's community
    posts happening to be predominantly KMK-scoped already — confirmed by inspection, not assumed
  - Community filter dropdown lists only `All communities` / `KMK` — no KMPP/other college visible
  - "Reset demo data" button correctly hidden for this role
  - **Forced tampering**: called `adminToggleHidden(13)` directly from the console against a real
    KMPP-scoped note — denied (no reason prompt opened, `note.isHidden` unchanged, confirmed both
    ways)
  - **Positive case**: called `adminToggleHidden(1)` against a real KMK-scoped note — reason prompt
    correctly opened (cancelled without mutating, to preserve seed data for later stages' QA)
  - Moderation Queue showed exactly 2 real scope-correct cases (a KMK Community post, a KMK Map
    note) with working "Review" and "Escalate" buttons, no Assign control (correctly Super-Admin-only)
  - Clicking "Review" on the Community post correctly routed into the now-reachable Community tab
  - No console errors during any of the above

## Modified Files

See `checkpoints/ADMIN-V2-005/PRE_STATE.md`'s "Files touched this stage" for full detail.

## Known Limitations

- **KMK Building moderation reuses the Community tab/row UI as-is** — there is no dedicated
  "Building" filter or separate panel; a College Admin sees building notes mixed into the same list
  as community notes (already distinguished per-row via `renderAdminNoteRow`'s existing
  `isBuildingNote` badge). A dedicated Building sub-view was not built (would be new UI surface
  beyond the "minimal adapter" the spec asked for).
- **No real Event feature exists**, so no Event moderation UI was built (matches spec section 54
  explicitly).
- **Content Reviewer assignment is fully manual and Super-Admin-only**, with a plain userId text
  field — no reviewer directory/picker (none exists in this app). A real Role Manager UI to browse
  users is ADMIN-V2-007's job.
- **Audit does not have a Content-Reviewer-style `assignedTo` bypass** — a Content Reviewer sees
  zero Audit records (safe-by-default: denies rather than leaks; not explicitly required by the
  spec's Audit section).
- Mobile viewport not visually verified (pre-existing tooling limitation, unchanged).
- Production security boundary unchanged — all of this remains prototype/front-end-only
  enforcement (LocalStorage `RoleAssignment`s and `ModerationItem`s can be edited by the browser
  user directly from the console); a real deployment requires server-side authorization (Supabase
  RLS keyed off `auth.uid()`/a trusted `user_roles` table).

## Next Step

ADMIN-V2-005 complete. Proceeding to ADMIN-V2-006 (Study Moderation V2 Integration) per the user's
standing full-sequence authorization for this task.
