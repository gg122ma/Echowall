# ADMIN V2 — FINAL STATE (ADMIN-V2-001 through ADMIN-V2-FINAL-QA, COMPLETE)

Status: **COMPLETE** (2026-08-23). Every ADMIN-V2 stage (001, 001A, 002, 002A, 003, 003A, 004, 005,
006, 007, 008, FINAL-QA) has PASSed. This section is the standing architecture reference for future
sessions — read this + CLAUDE.md first; the individual dated sections below (newest first) carry
each stage's own detailed rationale, real bugs found, and exact test deltas.

## Architecture, top to bottom

```
Identity (AuthService)
  -> Role/Scope/Permission (AdminPermissionService)
       -> ModerationItem + Report (ModerationService)
            -> Dashboard (app-admin-dashboard.js)
            -> Action layer (reason-prompt overlay in app-admin.js, per-module actions)
                 -> AuditAction (AdminAuditService)
       -> Admin Management (app-admin-management.js) [grants/revokes RoleAssignments]
       -> Moderation Assist (ModerationAssistService) [creates ModerationItems, source:"auto_flag"]
```

- **Super Admin**: exactly one hardcoded email, `SUPER_ADMIN_EMAIL` in
  `services/admin-permission-service.js` — the ONLY place in the entire codebase this is declared.
  `isSuperAdmin(user)` checks email only, never `role`. Cannot be created via the UI
  (`grantRoleAssignment` rejects `role: "SUPER_ADMIN"`), cannot be disabled/revoked (no real
  `RoleAssignment` row exists for it — it's a virtual, email-derived assignment).
- **Roles**: `SUPER_ADMIN` (virtual/bootstrap only), `GLOBAL_MODERATOR`, `COLLEGE_ADMIN`,
  `STUDY_MODERATOR`, `CONTENT_REVIEWER`, plus the internal-only `LEGACY_ADMIN_PSEUDO_ROLE` (derived
  from `AuthService`'s pre-Admin-V2 `role === "admin"` whitelist, never directly assignable).
- **Scopes**: `global` | `college` (always carries a `scopeId` = an `organizations` config id) |
  `study` | `system` (Super-Admin/AUDIT_READ_ALL-only — used for role-management Audit records).
  Each role has exactly one valid scope type (`ROLE_ALLOWED_SCOPE_TYPES`), enforced at grant time.
- **Permissions**: `ADMIN_MANAGE`, `AUDIT_READ_ALL`, `GLOBAL_COMMUNITY_MODERATE`,
  `COLLEGE_COMMUNITY_MODERATE`, `COLLEGE_BUILDING_MODERATE`, `COLLEGE_EVENT_MODERATE`,
  `STUDY_RESOURCE_MODERATE`, `CONTENT_REVIEW`.
- **`canModerateMap(user, orgId)`** (ADMIN-V2-003A): the one deliberate cross-cutting exception —
  Map has always shared Community's `GLOBAL_COMMUNITY_MODERATE` gate (a pre-existing, unchanged
  design), so this function is `isSuperAdmin || canModerateGlobalCommunity || canModerateCollege(orgId)`
  — the single source of truth the Old Map Admin tab, `ModerationService`, and the Dashboard all
  depend on identically.
- **ModerationItem**: `services/moderation-service.js`. Scope is always DERIVED from the real
  content object (`resolveContentScope`), never trusted from a caller-supplied value (mismatches
  throw). `source`: `submission | report | auto_flag | admin`. Status state machine:
  `pending ⇄ escalated`, `pending/escalated/approved/hidden → approved/rejected/hidden`,
  `hidden/rejected → pending` (restore). Reason is REQUIRED (throws before mutating) for
  `hidden`/`rejected`/`escalated`; optional otherwise. Every status change fires a best-effort
  `AdminAuditService.createAuditAction`. `assignedTo` (ADMIN-V2-005) is an additive access path —
  a Content Reviewer with no scope permission of their own can still read/act on exactly the item
  assigned to them, via `assignModerationItem(id, userId, superAdminActor)` (Super-Admin-only).
- **Report**: many reports on the same content share ONE active `ModerationItem` (riskScore
  increases per repeat) — "report != delete", every individual Report record is retained.
- **Dashboard** (`app-admin-dashboard.js`): Overview / Moderation Queue / Reports / History / Audit
  — five views, ALL reading exclusively through `ModerationService`/`AdminAuditService`, zero
  permission logic of their own. Scope selector is derived from the real signed-in user's actual
  RoleAssignments, never a hardcoded college list. Escalate is the ONLY status-changing action the
  Dashboard performs directly (a deliberate ADMIN-V2-004 decision — see that stage's report for
  why Approve/Reject/Hide were NOT added there: doing so would desync the queue's status label from
  the real Community/Map/Study content state, which nothing keeps in sync except Study's own
  best-effort mirror).
- **Audit** (`services/admin-audit-service.js`, ADMIN-V2-004): `AuditAction`
  `{id, actorUserId, actorEmail, action, targetType, targetId, scopeType, scopeId, beforeSnapshot,
  afterSnapshot, reason, createdAt}`. Reads are scope-gated identically to `ModerationService`
  (including the `canModerateMap` special-case). `sanitizeSnapshot()` strips
  password/token/blob/base64-shaped-string fields and truncates long strings — adversarially
  tested against a real base64 PDF payload.
- **College Admin workspace** (ADMIN-V2-005): a real `COLLEGE_ADMIN` (no global permission) can
  now reach the Community tab (scope-filtered to their own college(s), including Building notes)
  and, for KMK specifically, the Map tab. Every write is double-gated: the tab-level permission
  AND a real per-item `adminCanModerateNote()` check before any mutation (proven live: a KMK-only
  admin's console call against a real KMPP note is denied).
- **Study Moderator** (ADMIN-V2-006, and unchanged since ADMIN-V2-001/002): Study Notes moderation
  was never rewritten — it was already complete. This session added
  `reconcileStudyModerationState()`, a safe, idempotent repair between StudyUploadService's real
  `moderationStatus` (always authoritative) and the best-effort `ModerationService` mirror; runs
  once per admin-panel session on Study tab open.
- **Content Reviewer** (ADMIN-V2-005): assigned-item-only, via the additive `assignedTo` path
  above. No scope permission of their own; Audit visibility for them is correctly all-zero
  (safe-by-default, not a bypass).
- **Admin Management** (`app-admin-management.js`, ADMIN-V2-007): Super-Admin-only Grant/Disable/
  Re-enable/Revoke UI. `SUPER_ADMIN` is unassignable; role/scope combinations are validated
  (`COLLEGE_ADMIN` must be `college`-scoped, etc.); every action produces a `system`-scoped
  AuditAction (Super-Admin/AUDIT_READ_ALL-only visibility). Role changes are immediate — no
  caching layer exists anywhere in the permission read path (every check re-reads LocalStorage).
- **Moderation Assist** (`services/moderation-assist-service.js`, ADMIN-V2-008): deterministic
  rule-based flagging only (no external AI call). Community: spam repetition, cross-author
  duplicate, suspicious link domains, excessive links, flood posting. Study: missing metadata,
  missing/broken file, hash duplicate (reuses the existing SHA-256 `duplicateStatus`, never
  recomputes). `riskScore` is sort/priority metadata ONLY — structurally impossible for it to
  trigger an auto-delete (no code path reads it as a status-transition input). Wired into
  `app-wall.js`'s `handleFormSubmit` and `study-submission-service.js`'s `createSubmission`, both
  best-effort.
- **Provider architecture**: every service (`AdminPermissionService`, `ModerationService`,
  `AdminAuditService`, `StudyUploadService`, `MapNoteService`) exposes `ready()`/`subscribe()`/
  `useProvider(provider)` — a future backend swap (Supabase, etc.) replaces the provider object
  only; no caller anywhere needs to change.
- **Security boundary — read this before assuming anything is "secure"**: this is a
  prototype/front-end-only enforcement layer. EVERY check across EVERY service above can be
  bypassed by a signed-in user calling these functions directly from the browser console — proven
  repeatedly (that's literally how this session's own QA verified positive/negative cases). This
  has been stated in every service file's own header comment since ADMIN-V2-001 and remains true.
  **To move to production**: replace `localStorage` persistence with real backend calls behind
  each service's existing `useProvider()` swap point; move every permission/scope check
  server-side (Supabase RLS keyed off `auth.uid()` against a trusted `user_roles` table is the
  design these contracts were shaped to match 1:1 — see `docs/BACKEND_INTEGRATION_READINESS.md`);
  make the audit log server-side and append-only (a client can currently edit/delete its own
  `echo-wall-audit-actions:v1`); move Auto Moderation Assist's rule evaluation server-side too, so
  a malicious client can't simply skip calling it.
- **Tests** (491 assertions total, 8 files, `node scripts/test-admin-*.mjs`): `test-admin-role-scope.mjs`
  (85), `test-admin-moderation-schema.mjs` (109), `test-admin-dashboard.mjs` (52),
  `test-study-upload.mjs` (65), `test-admin-audit.mjs` (58), `test-admin-college-scope.mjs` (45),
  `test-admin-management.mjs` (43), `test-admin-moderation-assist.mjs` (34). All use the same
  Node `vm`-sandbox direct-call pattern (no test runner/npm exists in this repo — see CLAUDE.md).
- **Known limitations**: no mobile-viewport visual verification (tooling limitation); no user
  directory anywhere (every "assign a user" flow is a plain userId text field); Building
  moderation reuses the Community UI as-is (no dedicated sub-view); no real Event feature exists
  (none was fabricated); Study reconciliation is periodic, not real-time. Full detail in each
  stage's own report, consolidated in `reports/REPORT_ADMIN-V2-FINAL-QA.md`.

---

# ADMIN V2 — AUTO MODERATION ASSIST (ADMIN-V2-008, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed (real spam-link post auto-flagged end to
end)** (2026-08-23). See `reports/REPORT_ADMIN-V2-008.md` and `checkpoints/ADMIN-V2-008/`. Builds
on ADMIN-V2-001 through 007 below. **This was the final Admin V2 implementation stage — all of
003A/004/005/006/007/008 are now complete; only ADMIN-V2-FINAL-QA remains.**

- **`services/moderation-assist-service.js`** (new) — deterministic, rule-based-only content
  evaluation (spec explicitly forbids calling an external AI API). Community:
  `evaluateCommunityPost(note, allNotes)` checks spam repetition, cross-author duplicate content,
  suspicious link-shortener domains, excessive link count, flood posting. Study:
  `evaluateStudySubmission(submission)` checks missing required metadata, missing/broken file,
  exact/likely hash duplicate (reuses the EXISTING `duplicateStatus` field from ADMIN-V2-002 — no
  hash recomputed).
- **New `ModerationService.ensureAutoFlagModerationItem()`** — mirrors
  `ensureModerationItemForReport`'s exact dedupe shape (never a second active queue case for the
  same content on repeat evaluation).
- **Wired into real creation paths**: `app-wall.js`'s `handleFormSubmit` (every new post) and
  `services/study-submission-service.js`'s `createSubmission` (every new upload) — both
  best-effort, never block the real post/upload. Study's evaluation deliberately runs BEFORE
  creating its ModerationService mirror (not after) — running it after would have made every
  Study auto-flag silently merge into the pre-existing `source:"submission"` mirror instead of
  registering as `source:"auto_flag"`, invisible to the Dashboard's Flagged stat (caught during
  design, before shipping).
- **riskScore is sorting/priority ONLY** — nothing anywhere auto-transitions status away from
  `pending`; a human moderator still reviews every auto-flagged item through the exact same
  Approve/Reject/Hide flow (ADMIN-V2-004's reason-required rules unchanged), verified live.
- **Real bug found by this stage's own test**: Node's `vm` sandbox has no `URL` global (unlike a
  real browser) — `isSuspiciousUrl()`'s own defensive try/catch was silently swallowing a
  `ReferenceError` in the FIRST test run, hiding the check entirely. Fixed the test (added `URL` to
  its sandbox); separately confirmed the real browser runtime needs no such fix.
- **Real stale-copy bug found during this stage's own browser QA**: `admin.dash.statFlaggedDesc`
  still said "(no auto_flag data yet)" from ADMIN-V2-003A, now false — fixed in all 3 languages.
- Test suites: 7 unchanged (85/109/52/65/58/45/43), new `test-admin-moderation-assist.mjs` → **34**.

---

# ADMIN V2 — ADMIN MANAGEMENT (ADMIN-V2-007, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed (full grant→disable→revoke lifecycle
against real localStorage)** (2026-08-23). See `reports/REPORT_ADMIN-V2-007.md` and
`checkpoints/ADMIN-V2-007/`. Builds on ADMIN-V2-001 through 006 below.

- **New Admin Management tab** (`app-admin-management.js`), Super-Admin-only, reached as a fourth
  admin source (`adminState.sourceType === "adminManagement"`). Grant form (userId text field —
  no account picker exists in this app; Role dropdown restricted to the 4 assignable roles;
  College picker appears only for `COLLEGE_ADMIN`) + a list of every real `RoleAssignment` with
  Disable/Re-enable/Revoke. Shows the bootstrap Super Admin's email with an explicit "not
  manageable, never assignable to anyone else" note, and a static note that a legacy compat
  account is NOT a Super Admin (no dynamic legacy-account listing — no user directory exists to
  enumerate them).
- **`SUPER_ADMIN` is now provably unassignable** — `assertKnownRole` (`services/
  admin-permission-service.js`) rejects it. Before this stage, `grantRoleAssignment({role:
  "SUPER_ADMIN"})` would have silently succeeded (confirmed real gap, not hypothetical).
- **Role/scope combination validation** (new `assertValidRoleScopeCombo`) — rejects e.g.
  `COLLEGE_ADMIN` + `scopeType:"study"`, `GLOBAL_MODERATOR` + `scopeType:"college"`.
- **New `revokeRoleAssignment(id, actor)`** — hard, permanent row removal, distinct from
  `setAssignmentStatus`'s reversible Disable/Re-enable.
- **`grantRoleAssignment`/`setAssignmentStatus`/`revokeRoleAssignment` gained an optional `actor`
  parameter** — when a real UI caller supplies it, self-gates to Super Admin only AND creates a
  `role_assignment`-targeted, `scopeType:"system"` AuditAction (Super-Admin/AUDIT_READ_ALL-only
  visibility — a College Admin never sees role-management history, even for their own college,
  confirmed live). Omitting `actor` (every ADMIN-V2-001-era test fixture call) stays 100% backward
  compatible — no gate, no audit.
- **Role change confirmed immediate** — no caching layer anywhere in the permission read path
  (re-derived, not assumed); Disable takes effect on the very next permission check in the same
  process, no re-login, verified both at the service layer and live in a real browser (disabled a
  freshly-granted KMK College Admin, confirmed denial on the next call).
- Test suites: 6 unchanged (85/109/52/65/58/45), new `test-admin-management.mjs` → **43**.

---

# ADMIN V2 — STUDY MODERATION V2 INTEGRATION (ADMIN-V2-006, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed against live QA account data**
(2026-08-23). See `reports/REPORT_ADMIN-V2-006.md` and `checkpoints/ADMIN-V2-006/`. Builds on
ADMIN-V2-001 through 005 below. Study Notes moderation was deliberately NOT rewritten — audited
first and confirmed already complete for every field/action requirement (Title/Jurusan/Semester/
Subject/Type/Subtype/Topic/Year/ExamSession/SourceCollege/SourceType/Description/Related/
Verification/Duplicate all already shown in `adminStudyEditFormHtml`); only the one real gap was
closed.

- **`StudyUploadService.reconcileStudyModerationState()`** (new) — safe, idempotent repair between
  StudyUploadService's own `moderationStatus` (always authoritative) and the best-effort
  `ModerationService` mirror `syncModerationItemStatus` already used (that function's own comment
  says a mirror failure "must never block a real upload/decision" — meaning drift is accepted-
  possible by design, not a bug). Creates a missing mirror (with the real status + real
  `rejectionReason` for rejected submissions) or corrects a drifted one's status. Gated via the
  existing `requireModerator()`. Runs once per admin-panel session on Study tab open
  (`app-study-admin.js`'s `adminStudyEnsureReconciled`), silently, never blocking the panel on
  failure.
- **Real bug found by this stage's own tests, not assumed away**: the reconciled mirror's
  recreation path never passed the real `rejectionReason` through to the new `ModerationItem` — the
  test caught it failing on first run; fixed by passing `reason` through `createModerationItem`.
- Test suites: 5 unchanged (85/109/52/58/45), `test-study-upload.mjs` 54→**65** (+11
  `ADMIN-V2-006:` assertions: drift correction, idempotency, missing-mirror recreation with correct
  reason, non-moderator denial) — extended the existing file (it already has the real IndexedDB +
  ModerationService + AdminAuditService sandbox needed) rather than a duplicate new file, per spec
  allowance.

---

# ADMIN V2 — COLLEGE PERMISSION ENFORCEMENT + COLLEGE ADMIN WORKSPACE (ADMIN-V2-005, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed against live seed data + a real granted
COLLEGE_ADMIN RoleAssignment** (2026-08-23). See `reports/REPORT_ADMIN-V2-005.md` and
`checkpoints/ADMIN-V2-005/`. Builds on ADMIN-V2-001 through 004 below (read those first).

- **A real `COLLEGE_ADMIN` can now reach the Community/Map workspace** — previously impossible
  (documented known limitation since ADMIN-V2-001). `canAccessCommunityModeration()` broadened to
  `canModerateGlobalCommunity(user) || adminUserCollegeOrgIds(user).length > 0`; Map got its OWN,
  decoupled gate (`canAccessMapModeration()`/`requireMapModerationAccess()`, delegating to
  `AdminPermissionService.canModerateMap` — a KMK admin gets it via the `canModerateCollege`
  fallback established in ADMIN-V2-003A, a KMPP-only admin correctly does not, since Map is
  KMK-only).
- **`getAdminCommunityNotes()` now scope-filters** (global-tier unchanged/sees everything; a real
  College Admin sees only notes whose canonical scope, via
  `ModerationService.resolveContentScope`, is a college they moderate) and now includes
  **Building notes** (`contextType==="building"`) for the first time — they had zero admin surface
  before despite `renderAdminNoteRow` already having full working support for them (a real,
  pre-existing gap, fixed as the spec's own "minimal adapter" allowance, not a new feature).
- **Real per-item WRITE enforcement, not just tab gating**: new `adminCanModerateNote(user, note)`
  is checked inside `adminToggleHidden`/`adminDeleteNote` BEFORE any mutation — verified live: a
  KMK-only admin calling `adminToggleHidden(<a real KMPP note id>)` directly from the console is
  denied (no reason prompt, no mutation), while the same call against a real KMK note correctly
  opens the reason prompt. Map needs no equivalent per-item check (every map note is uniformly
  KMK-scoped, so the blanket gate already is the complete check).
- **Community filter dropdown** now lists only the viewer's permitted college(s) for a
  non-global-tier user — doubles as the multi-college scope selector (a KMK+KMPP admin sees both as
  real options, never "All communities" spanning colleges they can't see).
- **"Reset demo data" deliberately restricted to global-tier only** — it wipes ALL colleges' local
  notes at once (single shared LocalStorage key); the general Community-tab gate broadening does
  NOT extend to this specific destructive action.
- **Content Reviewer: real assigned-only access.** `ModerationService.canAccessModerationItem`
  gained an additive `item.assignedTo === user.id` path (never narrows a real moderator's existing
  scope access — only ever grants one specific assigned item to someone who otherwise has none).
  New `ModerationService.assignModerationItem(id, assigneeUserId, user)` — Super-Admin-only,
  deliberately separate from `updateModerationStatus` (never touches `status`, so it can't misfire
  that function's reason/audit-status-mapping logic) — with a minimal inline userId-text-field UI
  on Dashboard Queue rows (no user-directory exists in this app; building one is ADMIN-V2-007's
  job).
- Test suites: 5 unchanged (85/109/52/54/58), new `test-admin-college-scope.mjs` → **45**
  (college permission matrix, forced-tampering-denied in both KMK↔KMPP directions, Content
  Reviewer assigned/unassigned, Audit college isolation).
- **No Event UI built** (no real Event feature exists — spec explicitly forbids fabricating one).
  Building moderation reuses the existing Community row UI as-is, no dedicated Building panel.

---

# ADMIN V2 — MODERATION ACTIONS + AUDIT TRAIL (ADMIN-V2-004, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed against live QA account data**
(2026-08-23). See `reports/REPORT_ADMIN-V2-004.md` and `checkpoints/ADMIN-V2-004/`. Builds on
ADMIN-V2-001/001A/002/002A/003/003A below (read those first).

- **`services/admin-audit-service.js`** (new): `AuditAction` CRUD
  (`id/actorUserId/actorEmail/action/targetType/targetId/scopeType/scopeId/beforeSnapshot/
  afterSnapshot/reason/createdAt`). Reads are scope-gated exactly like `ModerationService`
  (`listAuditActions(filters, user)`), including the `canModerateMap` map_note special-case. Reason
  is mandatory (throws) for `reject`/`hide`/`escalate`; optional for everything else. Snapshots are
  sanitized (`sanitizeSnapshot`) — password/token/blob/base64-shaped strings stripped, long strings
  truncated — never trust a caller not to pass something unsafe.
- **`ModerationService.updateModerationStatus()` is now the single choke point for both reason
  enforcement AND AuditAction creation** for anything that goes through it: transitioning to
  `hidden`/`rejected`/`escalated` throws without a reason (before any mutation); every successful
  transition creates an `AuditAction` best-effort (a broken/missing AdminAuditService never blocks
  the already-completed moderation decision — logged to console instead).
- **Community + Map Hide/Delete now go through a shared reason-prompt overlay** (`app-admin.js`'s
  `adminOpenReasonPrompt`/`adminReasonPromptHtml`) instead of a bare toggle (Hide) or native
  `confirm()` (Delete). Hide requires a reason; Delete's is optional. Both produce an `AuditAction`;
  Delete's `afterSnapshot` carries `{deleted:true, irreversible:true}` — Delete itself is UNCHANGED
  hard-delete semantics, not converted to soft-delete.
- **Study's `approveSubmission`/`rejectSubmission`/`setVerification`** each produce exactly one
  `AuditAction` — via the existing best-effort `ModerationService` mirror when it finds a mirrored
  item, or directly (`logStudyAuditAction`) as a fallback when it doesn't (older submissions/mirror
  failure). `rejectSubmission`'s pre-existing reason requirement was already correct, untouched.
- **Escalate** (new, Dashboard Queue rows only) is the ONLY Dashboard-driven action that calls
  `ModerationService.updateModerationStatus` directly — a deliberate choice: Approve/Reject/Hide
  were NOT added as generic Dashboard buttons, because Community/Map/Study's real moderation state
  lives in their own storage, not `ModerationItem.status` — a fake Dashboard-level Approve/Reject/Hide
  would silently diverge the queue label from the real content. Escalate has no such real-content
  equivalent to diverge from, so it's safe.
- **New "Audit" tab** in `#/admin` (`app-admin-dashboard.js`'s `renderAdminAuditView`) — Scope/
  Target/Action/Actor/Date-range filters, gated the same as Overview/Queue/Reports/History (scope
  filtering happens inside `AdminAuditService.listAuditActions` itself, zero permission logic in
  the view). `adminState.sourceType` has TWO separate whitelists in `app-admin.js`
  (`renderAdmin()`'s outer gate AND `adminSetSource()`'s own array) — both needed `"audit"` added;
  missing the second one silently no-op'd clicking the sidebar link (caught live in browser QA, not
  by the test suite — the DOM-only render path isn't unit tested).
- **Real bugs found+fixed this stage** (see report for full detail): the `adminSetSource` dual-
  whitelist gap above; `beforeSnapshot.isHidden` silently losing information via
  `JSON.stringify`'s undefined-key-dropping when `note.isHidden` was `undefined` rather than
  `false` (fixed with `Boolean(...)` coercion at all 4 snapshot call sites); and a stale-Chrome-
  cache false alarm during QA (`location.reload(true)` didn't reliably bypass disk cache for CSS/JS
  under `python -m http.server` — cache-busting `?cb=` on `<link>`/script reload was needed;
  document this for future sessions so it isn't mistaken for a real bug next time).
- **Known limitation, deliberately not fixed**: a Global Moderator/legacy admin who hides a
  college-scoped Community post cannot read back their own resulting AuditAction (scope-isolated,
  since Audit inherits `ModerationService`'s existing, already-tested rule that global-tier
  moderators never see `COLLEGE_COMMUNITY_MODERATE`-scoped data — unlike Map, which ADMIN-V2-003A
  deliberately widened per explicit spec instruction; extending that same widening to Community
  posts was NOT requested and would contradict "Global Moderator 不能管理 College").
- Test suites: `test-admin-role-scope.mjs` unchanged at 85, `test-admin-moderation-schema.mjs`
  105→**109**, `test-admin-dashboard.mjs` unchanged at 52, `test-study-upload.mjs` 49→**54** (its
  sandbox now loads the real ModerationService+AdminAuditService instead of silently no-op'ing),
  new `test-admin-audit.mjs` → **58** (new file).

---

# ADMIN V2 — DASHBOARD CONSISTENCY CORRECTION (ADMIN-V2-003A, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed against live QA account data**
(2026-08-23). See `reports/REPORT_ADMIN-V2-003.md`'s addendum and `checkpoints/ADMIN-V2-003A/`.
This is a correction stage on top of ADMIN-V2-003 (below) — fixed two gaps that stage's own
"Known Limitations" section had already documented.

- **`AdminPermissionService.canModerateMap(user, orgId)`** (new) — single source of truth for "can
  this user moderate Echo Map notes": `isSuperAdmin(user) || canModerateGlobalCommunity(user) ||
  (orgId != null && canModerateCollege(user, orgId))`. `services/moderation-service.js`'s
  `canAccessScopeForModeration(user, scopeType, scopeId, contentType)` gained a 4th `contentType`
  param and special-cases `"map_note"` inside its `"college"` branch to call this instead of
  `canModerateCollege` alone — every other content type (including college-scoped Community posts)
  is byte-for-byte unchanged, so "Global Moderator never gets College Community" is still intact.
  Before this fix, a legacy admin (`role:"admin"`, `GLOBAL_COMMUNITY_MODERATE`+
  `STUDY_RESOURCE_MODERATE`, no college `RoleAssignment`) could Hide/Show/Delete map notes from the
  Old Map Admin tab (gated by `canModerateGlobalCommunity`) but the Unified Queue/Dashboard silently
  showed zero of them (gated by `canModerateCollege(user, KMK)`, which a legacy admin never passes).
  Confirmed live against the real `mzteoh88@gmail.com` QA account's actual data: `map_note` items
  visible in `listModerationItems()` went from 0 → 2 after the fix, with zero change to that
  account's Community-post visibility (still 0, as it should be — legacy admin never gets
  `COLLEGE_COMMUNITY_MODERATE`). A real `COLLEGE_ADMIN`'s own-college Map access (via the
  `canModerateCollege` fallback) was confirmed NOT regressed by both the existing test suite and a
  new dedicated assertion.
- **Full i18n pass on `app-admin-dashboard.js`** (all of ADMIN-V2-003's ~30 render-function
  strings) plus `app-admin.js`'s dashboard sidebar labels — ~80 new `admin.dash.*` keys across
  `i18n/locales/{en,ms,zh}.js`. Internal enum values (status/module/source/contentType strings used
  for CSS classing or filter `value` attributes) stay untranslated; only display labels changed,
  via 4 new small label-lookup helpers. Verified in a real browser in all 3 languages against live
  QA data (not fixtures) — including singular/plural report counts and `{count}`/`{id}`/`{date}`
  interpolation — with zero raw translation-key leakage.
- **Test suites**: `test-admin-role-scope.mjs` 74→**85**, `test-admin-moderation-schema.mjs`
  89→**105**, `test-admin-dashboard.mjs` 50→**52** (all net-new assertions; the dashboard suite's
  `I18n` sandbox stub now loads the real `i18n/locales/en.js` table instead of `key => key`, so its
  own assertions exercise real interpolation). `test-study-upload.mjs` unchanged at 49.
- **Known limitations carried forward** (unchanged from ADMIN-V2-003, not this stage's scope):
  History is not an Audit Trail (ADMIN-V2-004), Content Reviewer has no per-item enforcement
  (ADMIN-V2-005), no per-college Community/Building/Event workspace (ADMIN-V2-005), Mobile viewport
  not visually verified (tooling limitation).

---

# ADMIN V2 UNIFIED DASHBOARD (ADMIN-V2-003, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed** (2026-08-23). See
`reports/REPORT_ADMIN-V2-003.md` and `checkpoints/ADMIN-V2-003/`. Built entirely on top of the
ADMIN V2 Role/Scope Contract and Moderation Data Contract below (read both first) — neither
service was modified this stage.

- **Dashboard IA**: `#/admin` now defaults to **Overview**, with **Moderation Queue**, **Reports**,
  and **History** alongside it in the sidebar (`app-admin-dashboard.js`), plus the pre-existing
  Community/Map/Study module workspaces (unchanged, still gated by their own ADMIN-V2-001
  permissions). A shared `adminSidebarNavHtml()` (in `app-admin.js`) replaced two previously-
  duplicated inline sidebar copies (the Community/Map panel's own, and `app-study-admin.js`'s own)
  — every admin view now shows identical navigation.
- **Overview count rules**: Pending/Reported/Flagged/Escalated/Resolved + a Community/Map/Study
  module summary, computed by `adminDashboardOverviewCounts(items, reports)` — a PURE function
  that only tallies whatever `ModerationService.listModerationItems()`/`listReports()` already
  decided this user may see. There is no separate permission check in the counting code itself;
  correctness is inherited entirely from ModerationService's own scope-filtering (ADMIN-V2-002).
- **Scope selector**: `adminDashboardVisibleScopes(user)` — checks the top-level permission
  functions (`isSuperAdmin`/`canModerateGlobalCommunity`/`canModerateStudy`/`canModerateCollege`)
  directly, NOT each RoleAssignment's own `scopeType` field 1:1. This distinction matters: the
  legacy admin's one virtual assignment has `scopeType: "global"` but grants BOTH
  `GLOBAL_COMMUNITY_MODERATE` and `STUDY_RESOURCE_MODERATE` — deriving scopes from
  `assignment.scopeType` alone hid "Study" from them (a real bug, caught in this stage's own
  browser QA and fixed before sign-off). College names/ids come from the canonical `organizations`
  config, never a hardcoded list. "All permitted scopes" only appears for Super Admin or a
  genuinely multi-scope user.
- **Queue filter model**: Status (`active`/`pending`/`escalated`/`hidden`/`approved`/`rejected`),
  Module (derived via `adminDashboardModuleForContentType`: `post`→community, `map_note`→map,
  `study_resource`→study, `comment`/`event`/`review`→`null`, no live module yet), Source
  (`submission`/`report`/`auto_flag`/`admin`), Scope — all narrow an already-permission-filtered
  list (`adminDashboardFilterItems`), never widen access. Default presentation order
  (`adminDashboardSortQueue`): escalated before pending before everything else, then higher
  `riskScore`, then newest — presentation-only, never persisted.
- **Report grouping**: `adminDashboardGroupReports(reports)` groups by `contentType`+`contentId` so
  N reports on the same content show as N report rows but ONE queue case reference — matches
  ModerationService's own `ensureModerationItemForReport()` dedupe (ADMIN-V2-002) at the
  presentation layer too.
- **History semantics**: `adminDashboardHistoryItems()` = items with status
  `approved`/`rejected`/`hidden`. Explicitly NOT an audit trail — no who/before/after-snapshot
  (that's ADMIN-V2-004); the view's own subtitle says so.
- **Module review handoff**: a Queue/History row's "Review" button calls the existing
  `adminSetSource('community'|'map'|'study')` — it switches into the SAME, unmodified module
  workspace ADMIN-V2-001/002 already built and tested; ADMIN-V2-003 added zero new
  approve/reject/hide logic.
- **Permission enforcement**: every Dashboard read goes through `ModerationService`, which itself
  is gated by `AdminPermissionService` (ADMIN-V2-001/002) — confirmed live that forcing
  `adminState.dashboardScope` to an unauthorized value via the console, and even calling
  `ModerationService.listModerationItems({scopeType:"college", scopeId:<other college>}, user)`
  directly, both still return zero cross-scope items. The Dashboard UI itself contains no
  permission logic of its own to bypass.
- **Responsive behavior**: reuses the existing `.admin-shell`/`.admin-stats`/`.admin-filters`
  breakpoints (`@media (max-width:1100px)`/`(max-width:760px)`) rather than introducing a new
  layout system; new classes (`.admin-dashboard-module-grid` etc.) get their own small overrides at
  the same breakpoints.
- **Known limitations**: `COLLEGE_ADMIN`/`CONTENT_REVIEWER` still have no dedicated per-college
  module workspace (ADMIN-V2-005) — they now land on a real scope-correct Overview instead of the
  old "no sections" dead end, but Community/Map module access still requires
  `GLOBAL_COMMUNITY_MODERATE` specifically. A legacy admin (Global+Study permission, no
  `COLLEGE_COMMUNITY_MODERATE`) can still manage Map content through the OLD dedicated Map panel,
  but won't see `map_note` cases in the new unified views (Map is always KMK-college-scoped per
  ADMIN-V2-002A) — a direct, documented consequence of preserving Map's existing permission
  sharing rather than redesigning the matrix this stage. No Event/AI-flag data exists yet (correct
  empty states, nothing fabricated). Mobile not visually verified (pre-existing tooling
  limitation); BM/ZH not separately re-checked (Dashboard text is plain English, matching this
  admin tool's existing convention).
- **Tests**: `scripts/test-admin-dashboard.mjs` (new, 50/50 passing) — module mapping, scope-option
  correctness across every role (including the legacy-admin bug above), scope-isolated Overview
  counts, 3-reports-1-case grouping, all four filter dimensions, sort ordering, History exclusion of
  active items, safe content previews. `scripts/test-admin-moderation-schema.mjs` (89/89),
  `scripts/test-admin-role-scope.mjs` (74/74), `scripts/test-study-upload.mjs` (49/49) all
  re-verified unaffected.
- **Next step**: ADMIN-V2-004 (Audit Trail) — not started, do not start automatically.

---

# ADMIN V2 MODERATION DATA CONTRACT (ADMIN-V2-002 + ADMIN-V2-002A Map Integration, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed** (2026-08-23, extended same day by
ADMIN-V2-002A — Map moderation is now fully wired and live-verified, closing the one gap the
original pass left PARTIAL). See `reports/REPORT_ADMIN-V2-002.md` (including its "ADMIN-V2-002A"
section) and `checkpoints/ADMIN-V2-002/`. Built on top of the ADMIN V2 Role/Scope Contract below
(read that section first) — this is the unified content-moderation data model every later Admin V2
stage (ADMIN-V2-003 Dashboard, 004 Audit, 005 College Admin UI, 006 Study Moderator UI, 008 AI
Moderation) will read/write through.

- **ModerationItem schema**: `{ id, contentType, contentId, scopeType, scopeId, reason, source,
  riskScore, status, assignedTo, createdAt, resolvedAt, createdBy, updatedAt }`. `contentType` ∈
  `post | comment | event | review | study_resource | map_note`. `source` ∈ `submission | report |
  auto_flag | admin`. A ModerationItem never copies the content body — it only points at
  `contentId` in the module that actually owns that content (`notes`, `StudyUploadService`,
  `MapNoteService`).
- **Report schema**: `{ id, reporterUserId, contentType, contentId, scopeType, scopeId, category,
  details, createdAt, status }`. `category` ∈ `spam | harassment | wrong_info | copyright |
  duplicate | other`. `status` ∈ `open | reviewing | resolved | dismissed`. Reports and
  ModerationItems are separate collections on purpose — **a report never deletes or hides content**;
  it only ever creates/reuses a ModerationItem.
- **contentType coverage today**: `post` (Community + Building-wall notes, real adapter via
  `CommunityService`), `study_resource` (real adapter, always `scopeType:"study"`), `map_note`
  (real scope-derivation AND real live wiring as of ADMIN-V2-002A — see below), `comment`/`event`/
  `review` (contract + structural validation only — no canonical content source exists for any of
  them yet).
- **Scope derivation, not trust**: `resolveContentScope()` looks up the REAL content object and
  derives its scope from that — a Community post's scope comes from
  `CommunityService.getCommunityKeyForNote()`/`parseCommunityKey()` against the note's actual
  `orgId`/`communityKey`, never from whatever a caller claims. If a caller supplies a scope that
  disagrees with the derived one, the call throws (a KMK post can never be filed as KMPP). For
  content types with no adapter, the supplied scope is still structurally validated (real
  `scopeType`, explicit `scopeId` for `college`).
- **Queue dedupe strategy**: `ensureModerationItemForReport()` reuses the existing ACTIVE
  (`pending`/`escalated`) ModerationItem for the same `contentType`+`contentId` if one exists,
  raising its `riskScore` (capped at 100) instead of creating a duplicate. Reports themselves are
  never deduplicated — every report is its own permanent record, independently listable.
- **Status state machine**: `pending -> {approved, rejected, hidden, escalated}`,
  `escalated -> {approved, rejected, hidden}` (never silently back to pending — must resolve),
  `approved -> {hidden, rejected}`, `rejected -> {pending}` (reopen for re-review),
  `hidden -> {pending, rejected}` (restore for re-review, or hard-delete). The `-> rejected` edges
  from `approved`/`hidden` (added in ADMIN-V2-002A) both represent the same real event — a hard
  delete outside the normal review flow, not a review-outcome transition — driven by Map's real
  Delete action. Any other transition throws.
- **Provider architecture**: `localStorage` keys `echo-wall-moderation-items:v1` /
  `echo-wall-moderation-reports:v1`, behind a swappable `{ items:{list,save}, reports:{list,save} }`
  provider (`ModerationService.useProvider(nextProvider)`) — matches the same pattern
  `admin-permission-service.js` already established.
- **Permission integration**: every read (`getModerationItem`/`listModerationItems`/
  `getQueueItems`/`getReport`/`listReports`) filters by, and every write
  (`updateModerationStatus`/`updateReportStatus`) requires,
  `AdminPermissionService.isSuperAdmin`/`canModerateGlobalCommunity`/`canModerateCollege`/
  `canModerateStudy` — **no `role === "admin"` check or email whitelist anywhere in this file.**
  `CONTENT_REVIEWER` currently sees/can-touch nothing (its default permission set has none of the
  three moderate-* permissions) — deliberate, documented, until real per-item `assignedTo`
  enforcement is built in a later stage.
- **Legacy adapters**: `services/study-submission-service.js`'s `createSubmission()`/
  `approveSubmission()`/`rejectSubmission()` call into `ModerationService` as a best-effort mirror
  (wrapped in `try/catch`) — StudyUploadService's own `moderationStatus`/`verificationStatus`/
  `auditLog` fields remain the real source of truth for Study; nothing was deleted or replaced.
  **ADMIN-V2-002A**: `services/map-note-service.js`'s `setHidden()`/`delete()` (the functions
  `app-admin.js`'s real Hide/Show/Delete buttons call) now do the same best-effort mirror —
  `contentId` is the note's `recordKey` (`note:<id>` / `pin:<id>`, normalized via a new
  `canonicalRecordKey()` helper regardless of how the caller addressed the note). Map note
  *creation* was deliberately NOT wired to auto-create a ModerationItem — a new map note stays
  immediately public, exactly as the real product already behaves; only report/admin-flag/
  auto_flag ever creates a queue case, matching Study's own "submission enters pending, but
  approval doesn't retroactively rewrite history" spirit.
- **KMK org id is looked up, not hardcoded** (ADMIN-V2-002A): `resolveKmkOrgId()` in
  `moderation-service.js` finds KMK by name in the canonical `organizations` config
  (app-data.js) — the bare literal `1` is now only a last-resort fallback, verified by a dedicated
  test using an intentionally different id (77) to prove the real lookup path runs.
- **Production security boundary**: same posture as `admin-permission-service.js` — prototype/
  front-end enforcement only, documented in the file's own header. Production reads/writes must be
  re-authorized server-side.
- **Tests**: `scripts/test-admin-moderation-schema.mjs` (new, grew to 89/89 passing after
  ADMIN-V2-002A, was 65/65) — schema validation, scope derivation/mismatch-rejection, queue dedupe,
  full permission-isolation matrix (Super Admin/Global Moderator/KMK+KMPP College Admin/Study
  Moderator/Student/Guest/disabled assignment), status-transition state-machine validation, and
  (ADMIN-V2-002A) real-recordKey-shaped map note scope derivation, a full Map report chain, and a
  KMK-lookup independence check. `scripts/test-admin-role-scope.mjs` (74/74) and
  `scripts/test-study-upload.mjs` (49/49) both re-verified unaffected across both passes.
- **Known limitations**: Comment/Event/Review have no canonical content adapter (structural
  validation only — no such feature/service exists for any of them yet). Content Reviewer role has
  no real per-item `assignedTo` access yet. Map note integration's earlier PARTIAL status was
  closed by ADMIN-V2-002A — see above; it is no longer a limitation.
- **Next step**: ADMIN-V2-003 (Dashboard UI redesign) — not started, do not start automatically.

---

# ADMIN V2 ROLE/SCOPE CONTRACT (ADMIN-V2-001 + ADMIN-V2-001A correction, COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed** (2026-08-23, corrected same day by
ADMIN-V2-001A). See `reports/REPORT_ADMIN-V2-001.md` (including its "ADMIN-V2-001A" section) and
`checkpoints/ADMIN-V2-001/`. This is the permission foundation every later Admin V2 stage
(ADMIN-V2-002 through 008) builds on — read this section before touching `#/admin`, Study
Moderation, Community moderation, or Map moderation again.

- **Super Admin bootstrap**: `greencucumbertube@gmail.com` is the ONLY hardcoded super-admin email
  in the codebase, declared exactly once in `services/admin-permission-service.js`
  (`SUPER_ADMIN_EMAIL`). **Correction (ADMIN-V2-001A)**: the original ADMIN-V2-001 pass left this
  email ALSO hardcoded in `services/auth-service.js`'s pre-existing `PROTOTYPE_ADMIN_EMAILS` —
  that duplicate has been removed; `PROTOTYPE_ADMIN_EMAILS` now lists only the legacy admin. Super
  Admin authorization is provably independent of `AuthService`'s `role` field —
  `greencucumbertube@gmail.com` now gets `role: "user"` from `AuthService`, yet still resolves as
  Super Admin purely via `isSuperAdmin(user)`'s email check (confirmed live and by dedicated
  `role: "user"` / no-`role`-field test fixtures). `isSuperAdmin(user)` normalizes with
  `trim().toLowerCase()` before comparing — any casing resolves. A Super Admin is a virtual,
  always-true assignment (`scopeType: "system"`, never stored, never disable-able) with every
  permission.
- **Role list**: `SUPER_ADMIN` (all permissions), `GLOBAL_MODERATOR` (`GLOBAL_COMMUNITY_MODERATE`
  only — the "All KM Students" global community, never an individual college),
  `COLLEGE_ADMIN` (`COLLEGE_COMMUNITY_MODERATE`/`COLLEGE_BUILDING_MODERATE`/`COLLEGE_EVENT_MODERATE`,
  always scoped to one explicit `orgId` — never implicitly covers other colleges, even for a user
  holding several `COLLEGE_ADMIN` assignments at once), `STUDY_MODERATOR`
  (`STUDY_RESOURCE_MODERATE` only), `CONTENT_REVIEWER` (`CONTENT_REVIEW` only, cannot manage roles).
  Plus an internal, non-assignable `LEGACY_ADMIN` pseudo-role (see below).
- **Scope model**: `scopeType` ∈ `global | college | study | system`. `scopeId` is `null` for
  global/study/system-wide assignments, and an explicit college `orgId` for `COLLEGE_ADMIN`. A
  user can hold any number of `RoleAssignment` rows; scopes are always checked explicitly — never
  "one College Admin grant = all colleges."
- **Permission model**: `ADMIN_MANAGE`, `AUDIT_READ_ALL`, `GLOBAL_COMMUNITY_MODERATE`,
  `COLLEGE_COMMUNITY_MODERATE`, `COLLEGE_BUILDING_MODERATE`, `COLLEGE_EVENT_MODERATE`,
  `STUDY_RESOURCE_MODERATE`, `CONTENT_REVIEW`. `hasPermission(user, permission)` unions across every
  ACTIVE assignment the user holds (Super Admin short-circuits true for everything).
- **Storage/provider architecture**: `localStorage` key `echo-wall-role-assignments:v1`, read/written
  through a swappable `{ list(), save(list) }` provider
  (`AdminPermissionService.useProvider(nextProvider)`) — a future Supabase `user_roles`-backed
  provider replaces just that object, no caller changes. The RoleAssignment shape was chosen to be
  close to `docs/BACKEND_INTEGRATION_READINESS.md` section 5's planned `user_roles` table for
  exactly this reason.
- **Legacy compatibility**: `mzteoh88@gmail.com` (still whitelisted in `services/auth-service.js`'s
  own `PROTOTYPE_ADMIN_EMAILS`, which after ADMIN-V2-001A contains ONLY this email) is recognized
  as `isLegacyAdmin(user)` by reading the EXISTING `user.role === "admin"` field —
  `admin-permission-service.js` never re-declares that email itself. `AuthService.isCurrentUserAdmin()`
  is now a compatibility wrapper: it defers to `AdminPermissionService.canAccessAdminPanel()` when
  that service is loaded (the normal case), falling back to the legacy-only whitelist only if it
  is somehow absent — no circular script-load dependency, since the check runs at call-time. A
  legacy admin gets `GLOBAL_COMMUNITY_MODERATE` + `STUDY_RESOURCE_MODERATE` (exactly its
  pre-Admin-V2 real capability: the Community+Map admin tabs share one gate, always have) but
  explicitly NOT `ADMIN_MANAGE`/`AUDIT_READ_ALL`/any college scope — confirmed NOT Super Admin by
  both test suites and a live browser session.
- **Minimal wiring done this stage** (see `reports/REPORT_ADMIN-V2-001.md` for the full file list):
  `app-admin.js` (`isCurrentUserAdmin()` is now a compat wrapper for `canAccessAdminPanel()`; new
  `requireCommunityModerationAccess()`/`requireStudyModerationAccess()` gate Community/Map vs. Study
  separately; `adminState.sourceType` self-normalizes to a section the signed-in user can actually
  reach), `app-study-admin.js` (all 7 mutating actions), `services/study-submission-service.js`
  (`requireModerator()` — the REAL service-layer approve/reject/verify gate, not just the UI),
  `services/permission-service.js` ("Mark Solved" now multi-scope-aware via
  `AdminPermissionService.canModerateCollege()`), `services/auth-ui.js` (Admin Dashboard link
  visibility), `services/auth-service.js` (ADMIN-V2-001A: `isCurrentUserAdmin()` compat wrapper,
  `PROTOTYPE_ADMIN_EMAILS` trimmed to legacy-only).
- **Production security boundary**: explicitly documented in
  `services/admin-permission-service.js`'s own header comment — this is prototype/front-end
  enforcement only. Every check can be bypassed by calling the service's functions directly from
  the browser console. Production writes must be re-authorized server-side (Supabase RLS keyed off
  `auth.uid()`/a trusted `user_roles` table).
- **Tests**: `scripts/test-admin-role-scope.mjs` (new, 74/74 passing — grew from 65 in ADMIN-V2-001A
  to add 9 checks proving Super Admin independence from the legacy `role` field) — Super Admin
  bootstrap (including mixed-case email AND `role: "user"`/no-`role`-field fixtures), Guest/Student
  denial, legacy admin compat, Global/College/Study role isolation, KMK-vs-KMPP college isolation,
  disabled assignments, multiple scopes, Content Reviewer, RoleAssignment shape sanity.
  `scripts/test-study-upload.mjs` re-verified 49/49 (sandbox loads the real permission service; no
  assertions ever changed across either pass).
- **Known limitations**: `COLLEGE_ADMIN`/`CONTENT_REVIEWER` have no dedicated moderation UI yet — a
  real grant is fully correct at the permission-service layer (proven live) but currently lands on
  a "No sections assigned yet" state in `#/admin`, since per-college Community/Building/Event UI is
  ADMIN-V2-005 and Content Review UI doesn't exist yet. Map moderation still shares
  `GLOBAL_COMMUNITY_MODERATE` with Community (matches pre-existing behavior — they've never been
  distinguished). `ADMIN_MANAGE`/`AUDIT_READ_ALL` have no consuming UI yet (ADMIN-V2-004/007).
- **Next step**: ADMIN-V2-002 (Moderation Queue schema) — not started, do not start automatically.

---

# COMMUNITY-MAP-NAV-POLISH-001 — Community/Echo Map navigation fixes (COMPLETE)

Status: **COMPLETE, real Chrome browser acceptance passed** (2026-08-22). Fixed 4 real,
independently-verified bugs in Community/Echo Map navigation, taken from live source inspection
(not old reports). See `reports/REPORT_COMMUNITY-MAP-NAV-POLISH-001.md` and
`checkpoints/COMMUNITY-MAP-NAV-POLISH-001/` (PRE_STATE.md/ROLLBACK.md use exact pre-edit hunk
snapshots, not `git show HEAD:`, because the working tree carries substantial unrelated uncommitted
work in every touched file — restoring from HEAD would destroy that work).

- **General Community card removed** from the College Landing page
  (`renderCollegeLanding()` in `app-community.js`) for every college. Header, visible-notes count
  and Jurusan Channels are unaffected; the underlying `#/community/:orgId/general` route and
  `renderCommunityCollegeGeneralWall` renderer were deliberately left in place — only the entry UI
  was removed.
- **Homepage "Explore Community" anchor**: no code change was needed — it already used
  `document.getElementById('communities')?.scrollIntoView({behavior:'smooth'})`, a real element
  target (verified exact via an instant-scroll check: `top: 0.35px`). If a future session reports
  this bug again, re-verify live before touching the code — see the report's note about the
  automation tab's `document.hidden` intermittently pausing `requestAnimationFrame`/compositor
  smooth-scroll, which produced a misleading partial-scroll artifact in this session's own testing.
- **Public "Echo Map" naming unified**: `nav.map`, `home.openMap`, `home.mapTitle`,
  `assistant.mapReply` in `i18n/locales/{en,ms,zh}.js` (+ `index.html`'s static navbar fallback) no
  longer say "Echo Map KMK"/"KMK Echo Map". `map.title` and the real `map.html` page title/`<h1>`
  were deliberately left alone — they must keep showing the current campus name once inside an
  actual map (confirmed live for KMK/KMPP/KMKK).
- **Building Detail return source**: new `setPlaceReturnSource(source, placeId)` /
  `getPlaceReturnSource(placeId)` in `app-router.js` (loaded on both `index.html` and `map.html` —
  see the script-order note below), backed by `sessionStorage` key
  `echowall_place_return_source_v1` with a 30-minute TTL, keyed by `placeId` to avoid stale
  cross-building leakage. Building Stories entries (`renderPlaceDirectory()`'s cards, and the
  Homepage's `building-home-grid` shortcut) record `"places"`; the Echo Map's "More Details" button
  (in `echomap.js`) records `"map"` **and** calls the pre-existing `saveMapReturnSnapshot()` (same
  one "Enter this building wall" already used) so returning restores the exact prior map
  center/zoom/selected-building/preview state, not just "doesn't land on Building Stories". A direct
  `#/place/:placeId` link with no matching source falls back to Building Stories, exactly as
  instructed. `renderOrgBuildingDetail` (the separate non-KMK campus-framework building page) was
  not touched — this bug and its fix are specific to KMK's `app-place.js`/`echomap.js` path.
- **Non-KMK Echo Map switcher unified with the Community → Map renderer, switching in-place**:
  `map.html`'s own `‹ KMK ›` switcher (`switchToCollegeIndex()` in `echomap.js`) used to fall
  through to a second, out-of-sync copy of the Campus Framework sidebar for non-KMK targets — a
  single static, never-updated `<p>` notice, because `map.html` never even loads the scripts a real
  non-KMK sidebar needs (`app-campus-map.js`, `data/campus-building-registry.js`).
  **Invariant: the switcher must always switch campuses in-place — it must never navigate away from
  `map.html`.** An earlier same-day version of this fix violated that invariant by doing
  `location.href = "index.html#/org/${orgId}/map"` for non-KMK targets, which broke continuous
  switcher use (KMK → KMKK → KMPP → KMPK could no longer be clicked through on one page); that
  version was replaced before this handoff was written and must not be reintroduced.
  The corrected fix: `map.html` now loads `data/campus-building-registry.js` and
  `app-campus-map.js`. The Campus Framework sidebar's header+body markup was extracted into one
  shared helper, `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix = "")` in
  `app-campus-map.js` — used by both `renderOrgCampusMap()` (SPA, no `hrefPrefix` → `navigate()`)
  and the switcher's new `renderNonKmkCampusGuide()` (`hrefPrefix="index.html"` → only its two
  actionable module-card buttons, Building Registry and Community, do a real
  `location.href='index.html#/...'`; everything else stays in place). `switchToCollegeIndex()` now
  branches on `org.id === KMK_ORG_ID` and toggles `hidden` on sibling containers
  (`#map-side-header`/`#building-selection`/the Leaflet `buildingLayer` vs. the new
  `#campus-framework-guide`) instead of ever overwriting a shared parent's `innerHTML` — this keeps
  KMK's cached DOM references (`buildingList`, `buildingSearch`, etc.) intact across round-trips
  through non-KMK campuses. KMK itself is completely unaffected (still renders in-place, own
  persistent Leaflet instance, full building list/search/footprints/preview). Verified live in a
  real Chrome session: KMK → `›` → KMKK → `›` → KMPP → `›` → KMPK, then reversed all the way back to
  KMK — every step stayed on `map.html`, non-KMK campuses showed the Campus Framework sidebar
  (never blank "Focus buildings"), and KMK's full building sidebar/search/preview was intact on
  return. `index.html#/org/3/map` (Community → KMPP Map) and the switcher's KMPP both show
  byte-identical Campus Guide content. No building data was fabricated.

**Known limitation carried into next session**: Mobile 390–430px was not visually verified —
`resize_window` does not change `window.innerWidth` in this environment (same limitation recorded
in the Study Notes V2 FINAL-QA handoff below). If a future session gets real device emulation
working, this is the one remaining check for this stage.

---

# STUDY NOTES V2 — FINAL STATE

Status: **COMPLETE — real Chrome browser acceptance passed** (2026-08-22). The in-app browser
bridge (`mcp__claude-in-chrome`), previously unavailable, connected successfully this session. Every
item below marked "Not verified"/BLOCKED in earlier handoffs has been independently exercised in a
real, running Chrome browser against `http://localhost:8000` and passed. No Study application
source was changed to reach this result — see
`study v2/reports/REPORT_STUDY-V2-008.md` and `study v2/reports/REPORT_STUDY-V2-FINAL-QA.md` for
the full real-browser evidence (Browse/Search/Filter, Upload→Pending→Approve/Reject→Publish,
SHA-256 exact-duplicate blocking, Question↔Scheme, Guest/Student/Admin permissions, Light/Dark,
EN/BM/ZH, and a full non-Study regression smoke test).

- **IA:** Home → Study Notes → Jurusan → Semester → Subject → Resource Detail; `sourceCollege` is metadata/filter only, never the browse hierarchy.
- **Built-ins:** 2,468 manifest records; 377 built-in demo files currently exist under `assets/study-files/` and all referenced demo URLs resolve on disk (real Open-PDF confirmed in-browser).
- **Search/filter:** subject-code/title/topic/year search; category, subtype, year, source, sort, clear filters; load-more and ~200ms debounce — all re-verified live.
- **Upload architecture:** PDF-only submissions enter Pending/Unverified and are SHA-256 duplicate checked. Pending/rejected/manual_review/duplicate records cannot enter public browse/search/detail — reconfirmed live with a real uploaded PDF and a real registered student account.
- **Storage:** `StudyUploadService` stores metadata and PDF Blob separately in IndexedDB (`echowall-study-uploads-v1`); never LocalStorage/base64. Confirmed both the pending-file `Open file` action (admin) and the approved-file public Open action resolve to real `blob:` URLs.
- **Moderation:** `#/admin` Study queue is Global Admin only; approve/reject, metadata Save & Approve and verification states are service backed. Approve does not grant `verified_file` (reconfirmed: a freshly approved record showed `Unverified` until the admin explicitly changed it). The Reject form is visually confirmed full-card-width (`grid-column:1/-1`), not the previously unverified 72px thumbnail column.
- **Publication/file opening:** the resource service overlays approved uploads over the frozen built-in manifest. Upload PDFs resolve through `indexeddb://` then an object URL; built-ins use the demo-file resolver.
- **Question/Scheme:** built-in pairs and own-user upload pairs use related IDs; service regression covers the latter bidirectionally, and this was also followed live in-browser both for a built-in pair and for a real approved user-upload linked to a built-in Question.
- **Permissions/invariants:** Guest/Student cannot mutate moderation, and cannot even reach `#/admin` — reconfirmed live with three distinct real accounts (guest/signed-out, `role:"user"`, `role:"admin"`). All actual authorization remains prototype frontend-only and needs server enforcement in production.
- **Known limitations:** IndexedDB submissions are browser/profile-local; no cross-tab reactive sync. Mobile 390–430px viewport rendering was **not** live-verified this session — the `resize_window` browser tool does not actually change `window.innerWidth` in this environment (confirmed by reading it back after the call). Structural mobile CSS breakpoints (`@media (max-width:720px)` in `style-study.css`, `@media (max-width:1100px)`/`(max-width:760px)` in `style-admin.css`) were confirmed present in source instead. If a future session gets a working device-emulation path, that is the one remaining real-device gap to close.
- **Regression:** `node scripts/test-study-upload.mjs` (49/49, re-run after the browser pass). Targeted runtime source syntax checks pass. The literal all-`.js` repository scan is polluted by an unrelated checkpoint HTML fragment with a `.js` extension; exclude archival checkpoint snapshot directories when checking runnable sources.

Reports: `study v2/reports/REPORT_STUDY-V2-008.md` and `study v2/reports/REPORT_STUDY-V2-FINAL-QA.md` (both now PASS). Checkpoints include pre-state, rollback notes, and source snapshots.

## Next session starting point

Study Notes V2 (STUDY-V2-003 through FINAL-QA) is complete and browser-accepted. Do not start a new
Study Notes stage unless the user explicitly asks for one. If a new session needs to interact with
the app in a real browser, the `mcp__claude-in-chrome` bridge worked in this session — try it before
assuming it is unavailable.

## 2026-08-23 — COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY

Two independent objectives in one task (kept fully separate at the service layer, per the task's
own instruction): (A) rename the visible "Study Notes" label to "Echo Library" everywhere a user
sees it, and (B) make every previously read-only seed/default Community post — legacy 696-note
bundle AND a newly-added 67-post "All Student KM" batch — fully interactive through the exact same
Post Detail / CommentService a real user post already uses. Full detail, per-post rationale, and
QA transcript: `reports/REPORT_COMMUNITY-SEED-INTERACTION-AND-ECHO-LIBRARY.md`. Rollback:
`checkpoints/COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY/` (`PRE_STATE.md`/`ROLLBACK.md` give exact
hunks, not whole-file restores — this working tree has a lot of unrelated in-flight work that must
survive any future rollback here).

- **Echo Library is a display-name-only rename.** `#/study`'s route, page keys (`study-home` etc.,
  still untranslated internal identifiers), `app-study.js`, `StudyResourceService`/
  `StudyUploadService`, IndexedDB, and the manifest/subject-code schema are byte-for-byte
  unchanged. Only 7 i18n keys per locale (`study.home.title`/`.cta`, `study.hub.eyebrow`/`.title`,
  3 dead `...comingSoon` strings) + 4 `app-router.js` document-title values + 2 hardcoded strings
  in `app-study.js`'s `renderStudyNotFound()` changed. `admin.study.*` (Admin) and generic "study
  material(s)" phrasing (`study.upload.title`, `study.subjectEmptyState`,
  `study.search.placeholder`, etc. — these describe content TYPE, not the section's brand name)
  were deliberately left alone; check both lists again before assuming "Study Notes" is 100% gone
  from every string in the file, only the brand-name occurrences were touched.
- **The demo-seed read-only gate was 100% in `app-wall.js`'s rendering layer, not in
  `CommentService`.** `note.isDemoSeed === true && note.isDemoSeedRuntime === true` blocked the
  comments section, Mark Solved, and real voting in `buildNoteDOM()`/`openModal()`;
  `services/comment-service.js` was already fully generic (keyed only by numeric `postId`,
  persisted to `echo-wall-comments:v1` in LocalStorage, zero dependency on the note object). Fixing
  this was almost entirely deletion — removing 3 `isDemoSeed`-gated conditionals and the
  `getDemoSeedLabelHTML()`/`is-demo-seed-preview` visible badge/outline. If a future session finds
  another "seed post → disable X" conditional anywhere, it is NOT this one and needs its own
  investigation — this task's audit (grep `isReadOnly|readOnly|canComment|commentsDisabled|seed|
  default` project-wide) found only this single gate.
- **Voting on seed/legacy posts is the one deliberate, permanent exception**, not a bug to fix
  later: demo-seed runtime notes are `Object.freeze()`d in `activateDemoSeedSnapshot()`
  (`app-data.js`) and never written to `notes`/LocalStorage, so a real vote mutation on one would
  silently no-op (non-strict-mode assignment to a frozen object — no exception, no effect). Rather
  than build a second vote-persistence layer for frozen objects (equivalent complexity/risk to the
  "don't build a second SeedCommentService" instruction this task was explicitly given for
  comments), the modal shows seed-post votes as a plain, non-interactive `👍 N · 👎 N` text display
  instead of working Agree/Disagree buttons. This was checked against the task's own definition of
  "interactive" (comment/reply/report/question-status — voting is absent from that list) before
  deciding not to build it.
- **Stable ids were already correct — verified, not rebuilt.** `activateDemoSeedSnapshot()`
  assigns decrementing negative ids purely by fixed array order (`-1, -2, ...`), with
  collision-avoidance against real `notes` ids (which only ever start at 100 and count up —
  `nextId = 100` in `app-data.js`). Same `demoSeedKey` → same id on every simulated reload,
  confirmed by test. This task's 67-post source reuses this exact same id-assignment loop
  (appended after the 696 legacy notes in one combined `.map()`), not a second scheme.
- **New 67-post source: `data/demo-seed-all-student-km.v1.js`
  (`window.ECHO_WALL_ALL_STUDENT_KM_SEED`) — a plain array, NOT the `demo-seed-bundle.v1.js`
  snapshot format, and deliberately never merged into that file.** That bundle has a strict,
  hand-written validator (`validatePortableDemoSeedBundle` in `app-data.js`) hard-coded to exactly
  696 notes/17 walls/specific per-wall counts (`community:1:1` must be 73, etc.) — merging into it
  would have required rewriting that validator and risked breaking the existing 696 notes for zero
  benefit. Instead `activateDemoSeedSnapshot(snapshot)` now does
  `snapshot.notes.concat(window.ECHO_WALL_ALL_STUDENT_KM_SEED)` **after** `snapshot` (the untouched
  696-note bundle) has already passed its own unchanged validator, and runs every combined note
  through the same new `normalizeDemoSeedCommunityFields()` (backfills `postType`/`communityKey`/
  `communityScope`/`moderationStatus`, which the legacy JSON never had at all — confirmed via
  `grep -c` returning 0 for all four fields across the 696-note file before this task). Script tag
  added to both `index.html` and `map.html`, right after `data/demo-seed-bundle.v1.js`. If a future
  session needs an 68th+ post added to this batch, add it to this file's array (not the bundle) and
  re-verify with `scripts/test-all-student-km-seed.mjs`.
- **67-post content is copied verbatim** from
  `note for all km student/All_Student_KM_67_Community_Posts.docx` (extracted from
  `word/document.xml`, not re-typed) — 34 English / 20 Bahasa Melayu / 13 Chinese, `seedOrder`
  1–67 matching the document's own numbering. `content` = `title\n\nbody\n\n#hashtags` (folded into
  the single `content` field this schema uses — there's no separate title/body field); the Detail
  modal already has `white-space:pre-wrap` on `.modal-note-text` so this renders as 3 visually
  separated blocks matching the source document, while the Wall card preview (`.note-content`, no
  such override) collapses it into one flowing, 5-line-clamped paragraph — pre-existing, unmodified
  rendering behavior, not something built for this task. Scope is `global:all` only for every one
  of the 67 (`orgId`/`majorId`/`placeId` all null/empty) — never copied to a College/Jurusan/
  Building wall. `postType` was read and reasoned per-post (not by trailing "?" alone) — 44
  question / 23 discussion, baked into the file as static data. `shape`/`color`/`rotation` are
  likewise static per-post values (not a runtime hash) drawn only from the project's existing
  `SHAPES` (10 values) and each category's real `CATEGORY_COLORS` pool — trivially deterministic
  since nothing computes them at runtime.
- **Idempotency is structural, not a flag check**: `demoSeedRuntimeNotes` is fully recomputed from
  the two static sources on every `activateDemoSeedSnapshot()` call and never persisted/appended
  to anywhere — there is no "already seeded?" state to get out of sync. Verified 2x and 5x
  consecutive calls in the test suite, and one real browser refresh, all landing on exactly
  696+67=763 total demo notes.
- **Test coverage**: `scripts/test-community-seed-interaction.mjs` (38/38 — legacy-seed
  normalization, stable id + comment persistence across a simulated reload, real user post
  provably unaffected, Echo Library i18n contract vs. unchanged route keys) and
  `scripts/test-all-student-km-seed.mjs` (36/36 — counts/totals/scope/postType/idempotency/sticky
  determinism). Both load the real `app-data.js`/`services/*.js` source in a Node `vm` sandbox
  (same pattern as `scripts/test-study-upload.mjs`) — **note the `let notes = []` module-level
  binding in `app-data.js` is NOT exposed as a settable property on the vm context object** (a
  `let`/`const` top-level declaration inside a `vm.runInContext`-executed script lives in a
  script-local lexical environment, not on the global/context object) — to inject a fixture real
  user post, write it into the fake `localStorage[STORAGE_KEY]` and call the real `loadNotes()`,
  never try `context.notes = [...]` directly (it silently does nothing to the actual binding the
  functions use).
- **Browser QA performed**: full Echo Library page sweep (title/eyebrow/H1/breadcrumb, zero
  leftover "Study Notes" text, Resource Detail PDF link still resolves); a legacy KMK seed post
  (`id -589`) commented and confirmed surviving a real refresh; a Building Wall legacy seed post
  (`B_PUSTAKA`, `id -43`) — clean, no comments section (pre-existing Building-notes-never-have-
  comments boundary, confirmed untouched, not a gap); all 67 new posts present, one comment+refresh
  cycle per language (EN #10, BM #02, ZH #04); a brand-new Discussion and Question post each with
  real interactive voting + comments, both surviving a refresh (regression check); Dark Mode
  re-check on the All Student KM wall; 0 console errors throughout.

## 2026-08-23 — DISPLAY-COUNT-CONSISTENCY: single source for College/Building demo notes-count

Prototype/demo requirement: College Community and KMK Building "notes count" figures were being
computed independently on every page (real `getCommunityNoteCount(orgId)` / real
`getVisibleBuildingNotes(placeId).length`), so the same college or building could show a different
number on the Homepage than on its own detail page or on the Map — because the real underlying demo
seed data is sparse/uneven per entity, not because anything was broken. The fix is a pure
UI-display override layer; it does not touch note/post data, the manifest, LocalStorage, IndexedDB,
moderation, reports, or Admin queues.

- **New file, single source of truth: `data/demo-display-counts.js`.** Two plain objects —
  `COLLEGE_DISPLAY_COUNTS` keyed by canonical numeric `orgId` (matches `organizations` in
  `app-data.js`: 1=KMK...14=KMKT), `BUILDING_DISPLAY_COUNTS` keyed by canonical building id (matches
  `CAMPUS_BUILDINGS` in `data/campus-buildings.js`, e.g. `B_PUSTAKA`) — plus two helpers,
  `getCollegeDisplayCount(orgId, fallback)` and `getBuildingDisplayCount(buildingId, fallback)`.
  Unconfigured entities return the caller's own real/fallback count untouched (never silently 0).
  Script-loaded right after `data/campus-buildings.js` in both `index.html` and `map.html` — before
  every consumer file listed below.
- **Every call site that renders one of these two counts now goes through the shared helper**
  (grep `getCollegeDisplayCount(`/`getBuildingDisplayCount(` to find them all — `scripts/test-display-count-consistency.mjs`
  also asserts none of these 5 files redeclare a duplicate table):
  - `app-community.js`: Community Hub college cards (`note-count` badge), College Landing header
    ("N visible notes").
  - `app-router.js`: Homepage Building Stories grid (top-6 buildings), legacy `#/org/:orgId` header
    (`renderOrgDetails`, both the `comingSoon` and normal branches — same header text, two branches).
  - `app-place.js`: Place Directory grid (`/places`, also used by its own search filter — same
    cards, same source, no separate count logic there), Building Detail's "Building Echoes" count.
  - `echomap.js`: `openPlacePreview()`'s building preview panel (the side panel shown when a marker/
    building-list card is clicked — there is no separate Leaflet `.bindPopup()` with its own count;
    this side panel is the only "building popup"-equivalent surface on the map).
  - `app-wall.js`: Building Wall header ONLY (new `wallDisplayNoteCount(realCount)` helper, used at
    both the initial `renderContextWall()` render and every `renderWallNotes()` re-render). The
    actual note list `renderWallNotes()` renders (`filtered.forEach(...)`) is **never** touched by
    this — only the header's summary text. Verified live: Masjid's Building Wall header reads
    "83 notes" while the canvas genuinely renders its 1 real seeded note.
- **Community Wall headers (Global / College-General / Jurusan) were deliberately NOT overridden.**
  `renderCommunityCollegeGeneralWall()`/`renderCommunityGlobalWall()` scope their note count via
  `CommunityService.getCommunityKey("college"|"global", orgId, null)` → `communityKey` filtering in
  `getContextNotes()` — this is a strictly narrower set (posts not tied to any specific major, or
  global-only posts) than `getVisibleCommunityNotes(orgId)` (every post under that orgId regardless
  of major), which is what the College Community card figure (593 total) represents. These are
  provably different metrics, not the same one shown two ways — overriding the Wall header to match
  the College card total would have been actively wrong, not "more consistent." If a future task
  asks to touch Community Wall counts, re-derive this from `app-wall.js`'s `getContextNotes()`
  before assuming it's the same number as `getCommunityNoteCount()`.
- **Exact configured values** (college total 593, building total 377) — see `data/demo-display-counts.js`
  itself for the authoritative table; do not hand-copy numbers from this prose into future edits,
  read the file.
- **Canonical id mapping used**: `Bilik Tutorial dan Makmal Sains` (task's building name) →
  `B_BLOK_TUTORAN_MAKMAL` (`CAMPUS_BUILDINGS`' actual name for it is "Blok Tutoran dan Makmal
  Sains" — same building, the task used a slightly different Malay phrasing). All other 8 building
  names matched `CAMPUS_BUILDINGS` exactly.
- **Regression test**: `scripts/test-display-count-consistency.mjs` (`node scripts/test-display-count-consistency.mjs`,
  60/60 assertions) — loads `data/demo-display-counts.js` in a minimal `vm` sandbox (same pattern as
  `scripts/test-study-upload.mjs`) and checks exact values, the two totals, same-id stability across
  different caller fallbacks, unknown-entity fallback preservation, and "no duplicate count table"
  across the 5 consumer files.
- **Browser-verified** (Chrome, `python -m http.server`): all 12 College cards + College Landing
  header, all 9 named Buildings across Building Stories / Place Directory / Building Detail /
  Building Wall / Echo Map side panel — every number matches the spec exactly and real note arrays
  are provably unaffected (`getVisibleBuildingNotes()` real counts differ from display counts for
  7 of the 9 buildings, e.g. Masjid real=1/display=83, proving the override is doing real work, not
  a coincidence). Zero console errors on any page.
- **Rollback**: `git diff -- data/demo-display-counts.js index.html map.html app-community.js
  app-place.js app-router.js app-wall.js echomap.js` — every change is additive (a new file plus one
  new script tag per HTML file plus wrapping an existing real-count expression in a helper call);
  no existing function signature or return value changed for any other caller.

## 2026-08-23 — UI-FIX-2: Homepage Study Notes / Echo Map promo — Light Mode surface follow-up

Same-day follow-up to `UI-FIX` (entry directly below). After that fix, the user reported the two
`.map-promo` cards (Study Notes, Echo Map) were no longer dark-brown but still read as a standalone
"marketing banner" in Light Mode — large flat `var(--secondary)` cream tint, 28px radius (vs ~16–20px
elsewhere on Homepage), an oversized pastel decorative circle, and (traced this round) a **second,
independent** purple/indigo override living in `style-study.css`, not `style-core.css`, that
`UI-FIX` never touched.

- **Two files own `.map-promo`'s look, not one.** `style-core.css` has the shared base rule (used by
  both the Study Notes promo and the Echo Map promo — they're literally the same `.map-promo` class).
  `style-study.css` (top of file, right after the module comment block) has **Study-Notes-only**
  accent overrides: `.study-notes-promo::before` (circle color) and `.study-notes-promo .eyebrow`
  (eyebrow color), explicitly commented as giving Study Notes "a visual identity distinct from...
  the Echo Map promo (cyan-blue)" — i.e. this was intentional, not a bug, from
  `STUDY-V2-FOUNDATION-001`. The Homepage brief this round asked to drop that per-card color identity
  in Light Mode; if a future session is asked to touch either promo card's *color* again, check
  BOTH files — `style-core.css` alone will look like it worked and then not actually change anything
  for Study Notes specifically.
- **Light Mode changes** (`style-core.css` `.map-promo`): `background: var(--secondary)` →
  `var(--card-bg)`; `border-radius: 28px` → `20px`; `padding: clamp(28px,5vw,54px)` →
  `clamp(24px,4vw,40px)`; `.map-promo::before` (the decorative circle) background → `transparent`.
  (`style-study.css` `.study-notes-promo`): `::before` background → `transparent`; `.eyebrow` color
  `#b7bbff` → `var(--primary)`.
- **Dark Mode was not just re-screenshotted — it's structurally guaranteed unaffected.** Every
  Light-Mode rule touched above is an *unscoped* base selector (e.g. `.map-promo::before`,
  `.study-notes-promo .eyebrow`); every Dark Mode value comes from a `:root[data-theme="dark"] ...`
  selector with strictly higher CSS specificity (confirmed by the specificity math, not just visual
  inspection — `:root[data-theme="dark"] .map-promo::before` is (0,3,1) vs the unscoped
  `.study-notes-promo::before` at (0,1,1)), so Dark Mode already won before this fix and continues to
  win identically after it. Verified with `getComputedStyle()` post-fix: background
  `linear-gradient(135deg,#090806,#19140d)`, circle `rgba(212,168,90,.08)`, CTA background `#dfb45f`
  / text `#120f0a`, eyebrow `#c7caff` — all byte-identical to pre-fix.
- **Community card (`.home-community-card`) was explicitly out of scope this round** (the user's
  instruction named only Study Notes + Echo Map) and was **not touched** — it keeps whatever state
  `UI-FIX` below left it in.
- No checkpoint directory for this follow-up either (same reasoning as `UI-FIX`); `git diff` is the
  rollback path if ever needed. The two changed rule-bodies are small enough to hand-revert by
  re-reading this entry.

## 2026-08-23 — UI-FIX: Study Notes tab cleanup + Homepage Light Mode cards

Two isolated, explicitly-scoped UI bug fixes (user reported both from screenshots). No data
structure, router, auth, moderation, or Dark Mode changes.

- **Study Notes — Lecturer Notes / Student Notes tabs removed from the Subject Resource tab bar.**
  `app-study.js` `studyResourceTabsHtml()` (~line 403) now filters `presentCategories` through a
  new `STUDY_HIDDEN_TAB_CATEGORIES = new Set(["lecturer_notes", "student_notes"])` constant
  (declared next to `STUDY_YEAR_GROUPED_ORDER`, ~line 97) before building tab buttons. The
  underlying `services/study-resource-service.js` (`getResourceCategory`, `RESOURCE_CATEGORY_ORDER`,
  the manifest, IndexedDB submissions) is **completely untouched** — deliberate, since these two
  categories still need to classify correctly for the "All" tab's "Other Resources" bucket and for
  direct resource-detail links. Verified live on SM015 (Science/Sem 1, `#/study/sains/sem/1/SM015`):
  tab bar now reads exactly `All 141 / Pre/Pra PSPM 88 / PSPM 10 / Answer Scheme 41`; the 2
  remaining resources (1 `lecturer_notes` + 1 `student_notes`, confirmed via
  `StudyResourceService.getResourceCategory` in the browser console) still count toward "All" and
  still render under the "Other Resources" section — no tab reaches them directly, but nothing was
  deleted or hidden from data.
- **Homepage Light Mode — Community / Study Notes / Echo Map cards no longer dark brown.**
  `style-core.css`: `.home-community-card` (Community CTA, ~line 282) and `.map-promo` (Study Notes
  promo + Echo Map promo, both reuse this one class, ~line 265) had a **Light Mode base rule**
  hardcoded to a dark-brown gradient (`#241a10→#3d2a16` / `#2c1f14→#5b3b26`) with white text — a
  deliberate `HOMEPAGE-POLISH-002/002A/002B` design choice (see that entry further down this file)
  that the user has now asked to revert **for Light Mode only**. Fix: replaced the hardcoded
  dark colors with design tokens (`var(--card-bg)` / `var(--secondary)` background, `var(--text)` /
  `var(--text-muted)` / `var(--primary)` text) on the base (Light Mode) rule. Dark Mode is
  untouched — its `:root[data-theme="dark"] .home-community-card` / `.map-promo` overrides (near
  the end of the file, background + border-color + eyebrow + button color) were left exactly as
  they were; they still work correctly because the child text now reads `var(--text)`/
  `var(--text-muted)`, which already resolve to near-white/light-tan under `data-theme="dark"`.
  The `.home-community-card:focus-visible` white outline ring was also swapped from hardcoded
  `rgba(255,255,255,.85)` to `color-mix(in srgb,var(--text) 70%,transparent)` for the same reason
  (a literal white ring would have been invisible on the new light card background).
- **Rollback boundary**: `app-study.js` — the new `STUDY_HIDDEN_TAB_CATEGORIES` const and its one
  `.filter()` call in `studyResourceTabsHtml()`; nothing else in that file changed.
  `style-core.css` — only the `.map-promo`/`.home-community-card` **base** (non-`:root[data-theme]`)
  rule bodies changed; the `:root[data-theme="dark"] .map-promo` / `.home-community-card` blocks and
  every mobile `@media` rule for these classes are byte-for-byte unchanged. No checkpoint directory
  was created for this fix (single-session, two small isolated diffs); use `git diff` against the
  working tree's prior state if a revert is ever needed.
- **Verified in Chrome** (`python -m http.server 8000`, `mcp__claude-in-chrome`): Home in Light Mode
  (all three cards light/white, dark text, brown CTA buttons — screenshotted), Home in Dark Mode
  (all three cards visually unchanged from before this fix — screenshotted via
  `localStorage.setItem('echo-wall-theme:v1','dark')` + reload), SM015 tab bar (screenshotted +
  zoomed) and tab-switching (`Answer Scheme` tab clicked, list rendered correctly), zero console
  errors on either page after a hard reload. One unrelated, pre-existing, non-reproducing artifact
  was observed and is worth recording: the very first page load in this session threw
  `ReferenceError: SharedUI is not defined` from `app-router.js`/`services/auth-ui.js`, but a fresh
  `fetch(..., {cache:'no-store'})` of the same file confirmed the string `SharedUI` does not exist
  anywhere in the served/working-tree JS — a hard reload (Ctrl+Shift+R) made the error disappear
  permanently for the rest of the session. This was Chrome serving a stale disk-cached script (the
  Python `http.server` used for manual QA sends no cache-control headers), not a real code defect,
  and not something introduced by this fix — flagging it here only so a future session doesn't
  waste time chasing a phantom `SharedUI` reference that isn't in the source.

## 2026-08-23 — COMMUNITY / BUILDING / MAP POST TYPE UNIFICATION

All three surfaces now share `EchoPostTypeContract` (`discussion | question`, default/invalid
fallback `discussion`). Building and Map persist `postType`; Map Category remains independent;
legacy missing values read as Discussion; Admin shows normalized type.

Automated status: PASS — 9 test files, 578 assertions, zero failures; active JS syntax PASS.
Acceptance status: BLOCKED only because the mandatory in-app browser connection was unavailable
and untrusted, so the required real-browser matrix could not be executed honestly.

See `reports/REPORT_COMMUNITY-WALL-POST-TYPE-UNIFICATION.md` and
`checkpoints/COMMUNITY-WALL-POST-TYPE-UNIFICATION/`.

# Handoff

## 2026-08-22 — STUDY-V2-007: Upload Study Material

- **Upload storage is IndexedDB, behind a provider-swappable adapter — never LocalStorage/base64
  for PDF bytes, confirmed empirically (not just by code review) in a real browser.**
  `services/study-submission-service.js` defines `window.StudyUploadService`, structured exactly
  like `services/map-note-service.js`'s existing `ready/subscribe/useProvider` pattern (a
  `provider` object with `ready/list/create/update/getFileBlob/subscribe`) — a future real backend
  (Supabase Storage, S3, Cloudinary) can be swapped in via `useProvider()` without any UI caller
  changing. Database `echowall-study-uploads-v1`, stores `submissions` (metadata, keyPath `id`)
  and `files` (blobs, key = `sha256:<hex>` content hash — same bytes uploaded twice only stores
  once).
- **The public resource pipeline is unified through ONE integration point.**
  `services/study-resource-service.js`'s private `getManifest()` now does
  `base.concat(StudyUploadService.getApprovedResourcesSync())` — approved-only. Every other
  function in that file (search/filter/publishable/byId/related/file-url) is completely unchanged
  and inherits this automatically. Pending/rejected submissions are structurally never in that
  overlay array at all — there is no separate "hide pending" filter anywhere to accidentally break.
  **If you ever add a second place that reads submissions into a resource-shaped list, route it
  through `getApprovedResourcesSync()` too — don't build a second overlay mechanism.**
- **A submission record's full field list** (see the module comment in
  `services/study-submission-service.js`): `id, title, jurusan, semester, subjectCode,
  resourceType, resourceSubtype, topic, yearStart, yearEnd, examSessionLabel, sourceCollege,
  sourceType, contributorUserId, fileId, fileName, fileType, fileExt, fileSize, description,
  relatedResourceId, resourceGroupId, moderationStatus, verificationStatus, duplicateStatus,
  duplicateOfResourceId, permissionConfirmed, rejectionReason, auditLog, createdAt, updatedAt`.
  `submissionToResource(record)` is the ONLY place that converts one into a StudyResource-shaped
  object (matching `data/study-resource-manifest.js`'s exact field set) — its `fileUrl` is encoded
  `indexeddb://<submissionId>.<ext>` (never a real path) specifically so
  `StudyResourceService.getResourceFileType()`/`isResourceFilePdf()` (which just read the string's
  extension) keep working completely unchanged for uploaded files too.
- **Opening an uploaded file is a small, explicit UI branch, not a rewrite of file-opening.**
  `app-study.js`'s `studyIsIndexedDbFileUrl()`/`studyOpenIndexedDbFile()` are the only new pieces;
  `studyResourceQuickOpenHtml()` and `renderStudyResourceDetail()`'s file-open block both still
  call `StudyResourceService.getResourceFileUrl()` exactly as STUDY-V2-006 left them, just
  branching to a `<button onclick>` (fetches the blob, `URL.createObjectURL`, `window.open`)
  instead of `<a href>` when the URL starts with `indexeddb://`. **If a future stage adds a third
  file-open call site, it must branch the same way — don't assume every resource's fileUrl is a
  real static path.**
- **Exact duplicate detection scans built-in manifest (full, not publishable-only) + pending +
  approved submissions — deliberately excludes rejected ones**, so a submission rejected for a
  metadata reason (wrong subject, etc.) can be corrected and resubmitted with the identical file.
  Confirmed by a direct test (`scripts/test-study-upload.mjs`: "Identical bytes to a REJECTED
  submission can be resubmitted").
- **Question↔Answer Scheme linking between two of the SAME uploader's pending submissions is
  bidirectional** (`linkRelatedIfSubmission` in the submission service) — uploading a Scheme and
  linking it to an already-uploaded-but-still-pending Question also back-links the Question to the
  Scheme, and both get a shared `resourceGroupId`. Linking to a BUILT-IN or already-approved
  resource stays one-directional (the frozen built-in manifest and other users' resources are
  never mutated by someone else's upload) — this is an accepted, documented limitation, not a bug.
- **A real bug was found via real-browser testing, not caught by the Node suite or static
  review**: the exact-duplicate error banner used to link to the matched resource via
  `StudyResourceService.isResourcePublishable(resource)` — a pure field-check that doesn't verify
  the object is actually reachable through `getManifest()`. A still-pending duplicate's
  hand-constructed resource object passed that check (fields alone look "publishable"), so the
  banner rendered a clickable link to a page that 404'd. **Fixed**: check
  `StudyResourceService.getResourceById(resource.id)` for real reachability instead. **If you ever
  render a resource-shaped object that did NOT come from `getManifest()`/`getResourceById()`
  yourself, don't trust `isResourcePublishable()` alone to decide whether a link to it will work —
  check reachability directly.**
- **Auth/permission reuse, no new role system.** Upload requires
  `PermissionService.canUserPost(user)` — the exact same "any signed-in user" gate the community
  wall's own posting flow already uses. Moderation (STUDY-V2-008, next) will require
  `AuthService.isCurrentUserAdmin()` — there is still only one real admin tier in this prototype
  (`PROTOTYPE_ADMIN_EMAILS` in `services/auth-service.js`); a separate "Study Moderator" role does
  not exist and was intentionally not built (front-end role assignment isn't a security boundary
  without a real backend — see `services/permission-service.js`'s own header comment).
- **Testing status**: 49/49 direct-call checks (Node `vm` + a hand-rolled minimal fake IndexedDB,
  since this repo has no package.json/test runner to pull a real one from) — see
  `scripts/test-study-upload.mjs` and `study v2/reports/REPORT_STUDY-V2-007.md`. Real Chrome
  browser (via claude-in-chrome) confirmed the full upload flow end-to-end including actual
  IndexedDB persistence, exact-duplicate blocking, pending-hidden-from-search, zero LocalStorage
  footprint, Dark/Light, and EN/BM/ZH. **Mobile viewport not independently re-verified this stage**
  — `resize_window` did not change `window.innerWidth` in this environment (same class of tooling
  limitation every prior stage hit with Safari's Accessibility permissions).
- **Per the explicit unattended-execution override: continuing directly into STUDY-V2-008** (Admin
  Moderation) — this is NOT the normal stop-and-wait convention this repo otherwise follows (see
  `AGENTS.md`), and should not be read as a new standing default for future sessions.

### Rollback

See `study v2/checkpoints/STUDY-V2-007/ROLLBACK.md`. Builds directly on STUDY-V2-006's end state
(Browse/Search/Filter/File-Open all intact) — rolling this stage back returns the module to
exactly that checkpoint's end state (`#/study/upload` shows "coming soon" again).

## 2026-08-21 — STUDY-V2-005: Search / Filter

- **`StudyResourceService.searchResources()` is now a real 5-tier ranked search, not a plain
  substring match.** Order: exact Subject Code → prefix Subject Code → Title → Topic → Year
  (`examSessionLabel`/`yearStart`/`yearEnd`, stringified and substring-matched). Each resource
  lands in exactly ONE tier (first match wins, via `continue` in the loop) — never duplicated
  across tiers. If this is touched again, preserve tier order; it's what makes "SM015" reliably
  surface SM015 resources first even though many other subjects' titles/topics could coincidentally
  contain that substring.
- **Filters are a SECOND, additive axis — not a second Type system.** `filterResources()` accepts
  `subtype`/`year`/`sourceCollege`/`category`/`subjectCode`, all optional. On the Subject page,
  `app-study.js` only ever passes `subtype`/`year`/`sourceCollege` from the UI filter bar — the
  existing category tabs (STUDY-V2-004's `getResourceCategory`/`RESOURCE_CATEGORY_ORDER`) remain
  the ONLY Type axis. If a future change is tempted to add a second Type/Category dropdown
  alongside Subtype/Year/Source, that's the exact "重复造第二套 Type filter" mistake this stage's
  own instructions explicitly warned against — don't.
- **Filter dropdown options are always computed from whatever's actually in view
  (`getFilterOptions()`), never hardcoded.** Year options came from real SM015 data (15 real exam
  sessions, sorted newest-first); Source College options came from real per-subject
  `sourceCollege` strings (SM015 alone has 21 distinct real values like "KMJ"/"KMKulim (no ans)" —
  do NOT replace this with a fixed 12-Kolej list, the real source data is messier than that and
  the whole point of this rule is to reflect what's actually there).
- **Switching a category tab resets the Year/Subtype/Source/Sort filters** (`setStudyResourceCategory()` now
  also resets `studySubjectViewState.filters`/`.sort`) — deliberate: a different category's real
  option set can be completely different (e.g. PSPM's Year options vs Practice's Subtype options),
  so keeping a stale filter value across a tab switch would silently show nothing or the wrong
  thing rather than the tab's real content.
- **Global Search does NOT use a URL query parameter — this was a deliberate, checked decision,
  not an oversight.** `getRoute()` in `app-router.js` does
  `location.hash.replace(/^#\/?/, "").split("/")`; appending `?q=SM015` directly after `study`
  makes `parts[0]` literally equal `"study?q=SM015"`, which fails `parts[0] === "study"` and falls
  through to the Home page — confirmed by tracing the actual parsing logic before deciding.
  `app-router.js` was explicitly left untouched this stage (verified byte-identical
  before/after). If a future stage wants a shareable/bookmarkable search URL, it needs to either
  add a real `?`-aware parsing step to `getRoute()` (a deliberate, reviewed router change) or split
  the query out of `location.hash` before calling `getRoute()` — don't just concatenate `?q=` onto
  `navigate()` calls and assume it works.
- **Search is debounced (~200ms) via a plain `setTimeout`, per spec section 12 — no search library
  was added,** and doesn't need one at ~2.5k manifest items. The real oninput handler
  (`studyGlobalSearchInput`) is a thin wrapper around `studyApplySearchQuery()`, which is the part
  actually under test (see Testing below) and the part to extend if search logic ever needs to
  change — don't put new logic directly in the debounce wrapper.
- **STUDY-V2-006 is fully intact — re-verified explicitly before AND after this stage's edits.**
  377 files in `assets/study-files/`, 377 `demoAvailable:true` manifest items,
  `getResourceFileUrl()`/`openPdf` behavior — search results reuse the EXACT SAME
  `studyResourceFileBadgeHtml()`/`studyResourceQuickOpenHtml()` helpers Resource rows already used
  (no duplicate file-state logic was written for search results).
- **Testing status**: 56/56 direct-call checks — see `study v2/reports/REPORT_STUDY-V2-005.md`.
  Real Safari browser confirmed the search bar (Study Home) and the new filter bar (Subject page)
  both render correctly (Dark theme, Chinese) with no conflict with existing STUDY-V2-004/006 UI.
  **Mobile and EN/BM were not independently browser-verified this stage** (tooling limitation,
  same as every prior stage — no Accessibility permission for click automation, no JS-injection in
  Safari, so neither a resize-and-inspect pass nor a language-dropdown click could be performed
  for THIS stage's specific new UI, though the shared CSS patterns were already mobile-confirmed
  for STUDY-V2-006's badges/links).
- **A note on this stage's browser session, for full transparency**: a `make new document` call
  briefly landed as a new tab inside the user's own Safari window (a macOS/Safari tab-preference
  behavior, not something this session's AppleScript explicitly requested) before a genuinely
  separate window was confirmed to exist and was used (by explicit window index) for the rest of
  verification. No user tab was navigated, edited, or closed. Separately, the user's own window
  had one fewer tab by the end of the session (a port-5500 PDF tab) than at the start — most
  likely the user closing it themselves while browsing in parallel (their window shows independent
  Live Server activity this automation never touched), but this is flagged rather than asserted
  with certainty. See the report for the full detail.
- **Per the request: stopping here.** Upload (`STUDY-V2-007`) and Admin Moderation
  (`STUDY-V2-008`) are proposed next steps only, not started.

### Rollback

See `study v2/checkpoints/STUDY-V2-005/ROLLBACK.md`. Builds directly on `STUDY-V2-004`'s category
tabs and `STUDY-V2-006`'s file-serving (reads, doesn't modify, either) — rolling this stage back
returns the module to exactly STUDY-V2-006's end state, not further.

## 2026-08-21 — STUDY-V2-006: Actual File / PDF Opening

- **File serving is now real, but deliberately partial — read this before assuming a resource's
  "Open file" should work.** Only 377 of the 2284 publishable resources (a curated "Competition
  Demo File Set": full coverage of EE025/EM025/EA025/AA015/AP015/SM015/DP024/DC014/DP014 — see
  `scripts/build-study-demo-files.mjs`'s own top comment for exactly why these 9) have a real
  `fileUrl`. Every other resource has `demoAvailable: false`, `fileUrl: null`, and correctly shows
  a disabled button + "not available in this demo" note — **this is by design, not a bug or a
  TODO**. If a future stage wants full coverage, re-run
  `build-study-demo-files.mjs` with a larger `DEMO_SUBJECT_CODES` set (up to the full ~2.52GB/2284
  items if the working tree can bear it) rather than assuming something is broken.
- **`data/study-resource-manifest.js` now has two new fields on every item: `fileUrl` and
  `demoAvailable`.** Both are written by `scripts/build-study-demo-files.mjs`, NOT by
  `scripts/build-study-manifest.mjs` (that script is untouched — still only does path/metadata
  parsing + hashing). If you ever need to regenerate the base manifest (source files changed),
  you must re-run BOTH scripts in order: `build-study-manifest.mjs` first, then
  `build-study-demo-files.mjs` — running only the first will wipe the `fileUrl`/`demoAvailable`
  fields back to nothing (harmless — the next `build-study-demo-files.mjs` run restores them) but
  will make every Resource Detail page show the disabled state until you do.
- **The served filename is the resourceId, never the original title or folder path** —
  `assets/study-files/<resourceId>.<ext>`. This was a deliberate security/privacy choice (spec
  section 15's "不允许暴露本机绝对路径" plus the request's explicit "UI 不应该自己拼路径"): the
  public URL structurally cannot leak the original Drive/Kolej folder hierarchy, and there is no
  server-side code that accepts a path parameter at all (plain static files), so path traversal
  isn't just checked, it's structurally impossible.
- **`StudyResourceService.getResourceFileUrl()`/`getResourceFileType()`/`isResourceFilePdf()` are
  the ONLY sanctioned way to get a resource's file info.** `app-study.js` never concatenates
  `"assets/study-files/" + something` itself — if you're adding a new UI surface that needs to
  link to a resource's file, call these, don't reinvent the path.
- **PDF opens in a new tab via the browser's own native viewer** (`target="_blank"
  rel="noopener noreferrer"`) — no custom PDF renderer was built, matching the spec's own explicit
  "第一版不需要复杂自制 PDF renderer" allowance. Non-PDF (docx/pptx/doc) uses the `download`
  attribute instead of pretending the browser can preview it — this was a conscious choice per the
  request's own section 9 ("不要假装全部可以 browser preview").
- **Question/Scheme file mapping integrity was the single highest-risk thing this stage** (the
  request explicitly called out "不能出现 Question button → scheme PDF 这种 mapping 错误") — it is
  correct BECAUSE the copy step (`build-study-demo-files.mjs`) copies by each manifest item's OWN
  `id` + `sourceRelativePath`, independently per item, never inferring one file's location from
  another's. If this copy logic is ever touched again, preserve that per-item independence — do
  not "optimize" by copying a Question and guessing its Scheme's path from a shared prefix.
- **Every copied file is re-hashed and compared to the manifest's existing `fileId` before being
  accepted** — a mismatch is a hard `throw`, not a warning, and the script deletes the unverified
  copy rather than leaving it in `assets/study-files/`. 0 mismatches occurred on the actual run
  (377/377 verified).
- **Testing status**: 39/39 direct-call checks (Node `vm` + real filesystem/hash verification) —
  see `study v2/reports/REPORT_STUDY-V2-006.md`. Real Safari browser verification WAS done
  (dedicated new window, never the user's own tabs, explicitly closed by window index afterward):
  a real Question PDF and its paired Answer Scheme PDF were opened directly and visually confirmed
  as distinct, correct content (not a copy/misrouted file); a DOCX Resource Detail page and a
  non-demo resource's honest disabled state were also confirmed. Desktop/Mobile/Dark all
  confirmed; **Light Mode not independently browser-verified** — same tooling limitation as every
  prior stage (no Accessibility permission for click automation, no JS-injection permission in
  Safari).
- **Per the request: stopping here.** `STUDY-V2-005` (Search/Filter), full storage-backed serving
  of the remaining ~1900 resources, `STUDY-V2-007` (Upload), and `STUDY-V2-008` (Admin Moderation)
  are proposed next steps only, not started.

### Rollback

See `study v2/checkpoints/STUDY-V2-006/ROLLBACK.md`. Builds directly on `STUDY-V2-004`'s Resource
List (same render functions, only the file-open section and row badges changed) — rolling this
stage back returns the module to exactly that checkpoint's end state (disabled "Open file"
everywhere), not further. `assets/study-files/` must be deleted separately (not code, no diff to
revert).

## 2026-08-21 — STUDY-V2-004: Resource List + Year Grouping

- **The Subject page is now real.** `renderStudySubjectShell()` in `app-study.js` calls
  `StudyResourceService.getResourcesForSubjectInContext(jurusanId, semester, subjectCode)` —
  this checks the RESOURCE's own `jurusan`/`semester`/`subjectCode` fields together, not just
  `subjectCode` alone (a resource can't leak into the wrong jurusan/semester's page even if a
  subjectCode were ever accidentally reused). Result is always `getPublishableResources()`-only
  unless `{ includeUnreviewed: true }` is explicitly passed (nothing currently passes it — that
  option exists only for a possible future Admin/moderation view, not used by any live route).
- **Two invariants recorded verbatim in `CODE_AUDIT.md` this stage — read them before touching
  the Subject or Resource Detail pages again**: (1) the Subject page must always be generated
  dynamically from the publishable StudyResource manifest, never hardcoded resource cards; (2)
  Question and Answer Scheme are linked explicitly via `relatedResourceId`/`resourceGroupId`,
  never left for the user to infer from titles.
- **Category tabs are computed, not fixed.** `studyResourceTabsHtml()` only renders a tab for a
  category the subject actually has at least one publishable resource in (via
  `getResourceCategory()`'s mapping of resourceType/resourceSubtype → the 7 UI-facing categories:
  lecturer_notes, student_notes, pre_pra_pspm, pspm, answer_scheme, practice, other — the
  underlying data taxonomy itself is untouched, this is a display-layer mapping only). If a
  subject only has notes and PSPM, only 2 tabs (+"All") render — never an empty tab.
- **Year grouping is real metadata, not string-parsed.** `studyYearGroupedListHtml()` groups PSPM/
  Pre-Pra-PSPM resources by `yearStart`/`yearEnd`/`examSessionLabel`, sorted newest-first — it
  never re-derives a year by parsing the title.
- **Question/Scheme pairing renders as one linked unit, never a duplicate.** A Question row shows
  a "paired Answer Scheme" link built from `relatedResourceId`; in the "All" composed view, any
  scheme already shown as a pair is excluded from the flat "Other Resources" bucket (tracked via a
  `pairedSchemeIds` Set built while rendering the year-grouped sections first). Orphan
  (unpaired) schemes render normally — this is intentional, not a bug, don't "fix" it by hiding
  all schemes from Other Resources.
- **A real pagination bug was found and fixed this stage, not just a nice-to-have.** The first
  implementation budgeted "how many year-groups to show," which on SM015's real data (many PSPM
  sets sharing the same year) rendered 113 of 138 rows on first paint — effectively no pagination
  at all. Fixed to budget by cumulative row count instead. **If this code is touched again**: the
  budget is currently spent independently per section in the "All" view (PSPM section, Pre-Pra-
  PSPM section, Other Resources section each get their own `STUDY_RESOURCE_PAGE_SIZE`-sized
  budget) rather than one global shared budget — an accepted simplification, not a bug, but worth
  unifying if a future stage adds true infinite scroll.
- **Resource Detail (`renderStudyResourceDetail`, renamed from `renderStudyResourceShell`) never
  renders `sourceRelativePath`/`sourceBatch`/`fileId` or any local filesystem path** — only an
  explicit allow-listed field set (subject, semester, category, year, sourceCollege label,
  verificationStatus, description, related resource). It is gated by
  `StudyResourceService.isResourcePublishable(resource)` — a manual_review/rejected/duplicate
  resource returns the not-found shell even via a direct `#/study/resource/:id` link, not just
  when reached through the Subject list.
- **"Open file" is intentionally, honestly disabled.** There is no served file URL in the manifest
  yet (metadata-only, by STUDY-V2-FOUNDATION-001/002 design) — the button is rendered
  `disabled` with an explanatory i18n string, not a fake/dead link. **Do not wire this button up
  without also building real file serving — that's STUDY-V2-006, explicitly out of scope here.**
- **Testing status**: 36/36 direct-call checks (Node `vm`, real manifest/service/router/study
  source) — see `study v2/reports/REPORT_STUDY-V2-004.md`. Real Safari browser verification WAS
  done this stage (unlike STUDY-V2-003): a dedicated new Safari window (not the user's own tabs)
  was opened against the local dev server, and the real SM015 Subject page + a real Resource
  Detail page were screenshotted at Desktop and Mobile widths — confirmed correct. The browser
  session had Dark theme + Chinese language already active (persisted from the user's own prior
  session), which incidentally verified Dark+ZH too. **Light Mode and EN/BM were NOT
  browser-toggled** — no Accessibility permission for UI click automation, no "Allow JavaScript
  from Apple Events" for script injection, so no in-page control could be clicked. Confirmed
  instead via direct inspection of the locale files + the direct-call suite rendering with each
  locale loaded. If a future stage needs Light/EN/BM real-browser confirmation, it needs either
  those permissions granted or the user manually toggling and confirming.
- **Per the request: stopping here.** `STUDY-V2-005` (Search/Filter) and `STUDY-V2-006` (actual
  file/PDF opening) are proposed next steps only, not started.

### Rollback

See `study v2/checkpoints/STUDY-V2-004/ROLLBACK.md`. Builds directly on `STUDY-V2-003`'s Browse
Hierarchy (same data/registry) — rolling this stage back returns the module to exactly that
checkpoint's end state (Subject page shows "coming soon" again), not further.

## 2026-08-21 — STUDY-V2-003: Browse Hierarchy (Jurusan → Semester → Subject Code)

- **Real bug found by re-reading the actual source before starting, not by trusting the prior
  report**: `STUDY-V2-FOUNDATION-001`'s `renderStudyJurusan(container, jurusanId, semesterFilter)`
  was a single function that, when called for bare `#/study/:jurusan` (no `/sem/:semester`
  suffix), looped both `[1, 2]` and rendered **both semesters' full subject lists on one page** —
  exactly the "expand everything at once" problem this stage's instructions explicitly called out.
  This wasn't caught by `STUDY-V2-FOUNDATION-001`'s own tests because they only checked that
  `renderStudyJurusan` showed *some* subjects, not that it correctly deferred them behind a
  Semester choice.
- **The fix: two distinct routes, two distinct pages, two distinct render functions.**
  `#/study/:jurusan` → `page: "study-jurusan"` → `renderStudyJurusan()` (Semester picker ONLY, 2
  cards, no subjects). `#/study/:jurusan/sem/:semester` → `page: "study-semester"` (a genuinely
  new page name, not reused) → `renderStudySemester()` (the real Subject Code list). **If either
  of these two functions is ever touched again, keep them separate — collapsing them back into
  one "show everything if no semester given" function reintroduces exactly this bug.**
- **Back-navigation chain, now actually correct at every level**: Subject page's back button →
  `#/study/:jurusan/sem/:semester` (was: straight to `#/study/:jurusan`, skipping Semester).
  Semester page's back button → `#/study/:jurusan`. Jurusan page's back button → `#/study`. Each
  level also shows a small breadcrumb eyebrow line (`studyBreadcrumb()` in `app-study.js`) for
  extra clarity — this is informational text, not a second navigation control; the `page-back`
  button chain is still the actual working navigation.
- **Semester is now validated, not just parsed.** `renderStudySemester()` and
  `renderStudySubjectShell()` both check `canonicalSemester === 1 || canonicalSemester === 2`
  explicitly — `#/study/sains/sem/3` (or `/sem/0`, `/sem/abc` → `NaN`) renders a real not-found
  shell with a working back link, never a crash, never a blank page. This was NOT validated before
  this stage (the router just did `Number(parts[3])` with no range check).
- **Resource-type badges are real, computed data — `StudyResourceService.getResourceTypesForSubject(code)`
  returns the distinct `resourceType` values actually present among that subject's publishable
  resources.** If a subject has zero publishable resources, `studyResourceTypeBadges()` in
  `app-study.js` returns an empty string — nothing is shown, nothing is fabricated. Don't replace
  this with a fixed/hardcoded category list if the UI is ever redesigned.
- **`sains_komputer` still has zero real subjects in either semester** (unchanged since
  `STUDY-V2-FOUNDATION-001` — no Computer Science-specific batch has been scanned yet). Its
  Semester pages now correctly render the real "No subjects listed" empty state rather than
  silently looking broken or (worse) getting a fake placeholder subject to "fill the space." If a
  real Computer Science batch is scanned in the future, `getSubjectsByJurusanAndSemester()` will
  automatically start returning results — no UI change needed.
- **Data files untouched this stage.** `data/study-subjects.js` (32 real subject codes) and
  `data/study-resource-manifest.js` (2468 items) are exactly as `STUDY-V2-FOUNDATION-001` left
  them — this stage is pure UI/routing on top of that existing data.
- **Testing status**: 31 end-to-end direct-call checks against the real unmodified source, all
  pass (route split, per-jurusan/per-semester subject correctness cross-checked against the
  registry, empty-state honesty, invalid-route handling, back-chain structure, no-college
  verification) — see `study v2/reports/REPORT_STUDY-V2-003.md`. **Real browser visual
  verification (Desktop/Mobile/Light/Dark, actual rendered EN/BM/ZH) is not done** — same
  environment constraint as every prior stage this session.
- **Per the request: stopping here.** `STUDY-V2-004` (Resource List + Year Grouping) is a proposed
  next step only, not started — the request explicitly asked to pause for the product owner to
  check the actual Browse UI/UX first.

### Rollback

See `study v2/checkpoints/STUDY-V2-003/ROLLBACK.md`. Builds directly on
`STUDY-V2-FOUNDATION-001` (same data/service files) — rolling this stage back returns the module
to exactly that checkpoint's end state (combined Jurusan+Semester page), not further.

## 2026-08-21 — STUDY-V2-FOUNDATION-001: Study Notes V2 foundation

- **Read `study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf` before touching this module
  again** — it's short (5 pages) and has the full taxonomy/data-model/route table this stage
  implemented. This entry is a pointer to that spec plus what's specific to THIS implementation,
  not a replacement for reading it.
- **THE load-bearing invariant, repeated here because it's the single most important thing about
  this module**: Study Notes is organized `Jurusan → Semester → Subject Code → Resource`.
  College is a `sourceCollege` string field on an individual `StudyResource`, nothing more — never
  a route segment, never a query dimension, never a UI grouping. This is stated as a comment at
  the top of `data/study-subjects.js` and `services/study-resource-service.js` — read those
  comments before adding any new query function or route to this module, they explain exactly why
  and point at the product decision that ruled it out.
- **Where things live** (per the spec's own suggested file structure, section 15, followed almost
  exactly): `data/study-subjects.js` (registry), `data/study-resource-manifest.js` (generated —
  see below, DO NOT hand-edit), `services/study-resource-service.js` (query layer),
  `app-study.js` (Browse UI), `style-study.css` (styles), `scripts/build-study-manifest.mjs`
  (the generator). `app-router.js` only got route-dispatch additions (`getRoute()`/`render()`/
  `setRouteDocumentState()`) plus the Homepage promo section — no Study rendering logic was added
  there, matching the spec's own explicit instruction ("app-router.js 只做路由分发").
- **The manifest is real, not a stub.** `data/study-resource-manifest.js` (2468 items, ~2.0MB) was
  generated by actually running `scripts/build-study-manifest.mjs` against three real
  course-material folders on the machine this session ran on
  (`~/Downloads/Engineering`/`Perakaunan`/`Science `, exactly the folders the spec's own "依据文件"
  section names) — 2467 real files, ~5.3GB, independently counted via `find` before any code was
  written. It stores METADATA ONLY (title, jurusan/semester/subjectCode/resourceType, a SHA-256
  `fileId`, and a `sourceRelativePath`/`sourceBatch` for traceability) — no PDF/DOCX content was
  copied into this repo, and there is no served file URL yet (Upload/Storage/Viewer wiring is a
  later stage). If you need to regenerate it (e.g., a new batch of real files arrives), the
  command is printed in the manifest file's own header comment.
- **Every manifest item has a `reviewStatus`** (`"auto_parsed"` or `"manual_review"`) and a
  `parseWarnings` array. `services/study-resource-service.js`'s `getPublishableResources()` (and
  everything built on it — `getResourcesForSubject`, the counts shown on `#/study`/`#/study/:jurusan`
  today) filters to `auto_parsed` + not-rejected + not-`isDuplicate` only. The 150 `manual_review`
  items and 36 `isDuplicate` items are still IN the manifest (queryable via
  `getManualReviewQueue()`) — they're just not counted/shown in ordinary browse results until a
  human reviews them. That review UI is `STUDY-V2-008`, not built yet.
- **Question↔Scheme pairing is real and tested, but the grouping key had a real bug caught during
  this stage's own verification**: the first version keyed groups on
  `subjectCode|resourceType|year|folder`, but a Question file's `resourceType` (`"paper"`) and its
  Answer Scheme's `resourceType` (`"answer_scheme"`, set unconditionally by the FIRST branch in
  `detectResourceType()` in the build script) always differ by definition — so every real pair
  landed in two different groups and 0 pairs linked on the first full run. Fixed by dropping
  `resourceType`/`resourceSubtype` from the group key entirely (subject+year+parent-folder is what
  real pairs in this dataset actually share) — re-verified 238 real pairs linked afterward,
  including a manual spot-check of one pair's exact JSON. **If Question/Scheme linking is ever
  touched again, re-read this note before changing the group key** — it's an easy way to silently
  break every pairing again.
- **Subject display names are honestly incomplete on purpose.** 18 of 32 real subject codes have a
  confirmed `name` (Accounting/Economics/Business Math/Business Studies/Math/Physics/Chemistry/
  Biology, each language-keyed); the other 14 (`SK0*`, all `D*` codes under the Science folder,
  all Engineering `EA/EB/EE/EM` codes) have `name: null` because this stage's author could not
  confirm their official Malaysian Matriculation titles with reasonable confidence from the real
  folder contents alone — the UI falls back to showing the bare code. Don't fill these in with a
  guess; get them from a real syllabus/module handbook.
- **Homepage placement, exactly as requested**: `renderHome()`'s section order is now Hero → Stats
  → Community CTA → **Study Notes** → Building Stories → Echo Map promo → How Echo Wall Works →
  Footer. The Study Notes card intentionally does NOT reuse `.home-community-card`'s pointer-glow
  system (`HOMEPAGE-POLISH-002`/`002A`/`002B`) — it's a static card reusing `.map-promo`'s
  structural CSS with its own color (`style-study.css`), giving it a distinct visual identity from
  both the Community card (gold, pointer-follow) and the Echo Map promo (cyan-blue).
- **Testing status**: full logic-level verification done — real inventory numbers cross-checked
  independently via `find`, 20 end-to-end route/render checks against the real unmodified source,
  full regression of the Community/pointer-glow/Homepage-section-order test suites (all still
  pass). **Real browser visual verification (Desktop/Mobile/Light/Dark, actual rendered i18n) is
  not done** — same environment constraint as every prior stage this session (see the
  `HOMEPAGE-POLISH-002/002A/002B` entry further down for the specific permission blockers, if
  GUI automation is attempted again for this module).
- **Per the request: stopping here.** `STUDY-V2-003` (Browse hierarchy) and `STUDY-V2-004`
  (Resource list + year grouping) are proposed next steps only, not started — the request
  explicitly asked to pause for the product owner to inspect the Homepage entry and the real
  inventory first.

### Rollback

See `study v2/checkpoints/STUDY-V2-FOUNDATION-001/ROLLBACK.md`. Every hunk in every touched
existing file (`app-router.js`, `index.html`, the three i18n locale files) is additive — nothing
existing was changed, only new lines added, so a full rollback is just deleting six new files plus
removing four/three/one additive hunks respectively.

## 2026-08-21 — COMMUNITY-V2-POLISH-005: "All KM Students" card joins the shared pointer-follow gold glow

- **All three surfaces on this site now share the exact same pointer-glow engine.** As of this
  stage: Homepage Community CTA, `#/community`'s "All KM Students" card, and all 12 College
  cards all call `initializePointerGlowCards(...)`/`initializePointerGlowCard(...)` in
  `app-router.js` — there is still exactly one implementation (confirmed this stage by diffing
  `app-router.js` byte-for-byte against the `COMMUNITY-V2-POLISH-004` snapshot: zero changes).
  **If a future surface needs this effect, the pattern is: add `data-pointer-glow-card` + the
  three `<span>` layers (`org-card-ambient`/`org-card-rings`/`org-card-pointer-glow` or
  `home-community-card-*` if it's Homepage-card-sized) to its markup, and — if its glow needs a
  different radius than the college-card default — add one small CSS variant rule like
  `.org-card-global` did. Never touch `app-router.js` for a new call site whose element already
  matches `[data-pointer-glow-card]`.**
- **`.org-card-global` is the pattern for "same interaction, different size."** It's a pure CSS
  sizing variant (larger `radial-gradient()` radii) — it adds no new selector logic, no new JS
  hook, nothing else. Any future third/fourth size variant (e.g. a wide building-wall promo card)
  should follow the same shape: one class, three CSS rules overriding only the radius/anchor
  values, nothing else re-declared.
- **`globalCard`'s old static `.org-card-glow` div is gone.** Removing it (not just adding the new
  layers alongside it) was deliberate — keeping both would have reproduced the exact "two
  competing light sources" bug `HOMEPAGE-POLISH-002B` fixed for the Homepage card earlier this
  session. If any future `.org-card` variant is built by copy-pasting `globalCard`'s markup,
  double-check the old `org-card-glow` div isn't accidentally reintroduced alongside the new
  layers.
- **Isolation was verified in both directions this stage**, not just "hovering A doesn't affect
  B" — also "A's already-settled state doesn't get perturbed by later hovering B." This matters
  because `globalCard` and the college cards are structurally different shapes (one full-width
  row vs. a 4-per-row grid) sharing the exact same `querySelectorAll("[data-pointer-glow-card]")`
  call — the test that matters isn't "do they look different" (they do, by CSS), it's "does the
  JS ever conflate them" (it doesn't, by construction — closures).
- **Testing status carried over from `COMMUNITY-V2-POLISH-004` and still not fully closed**: full
  logic-level verification done (13/13 cards tagged, 3-card isolation, byte-identical
  `app-router.js`, all Homepage/College-card regressions clean — see
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-005.md`). **Real browser interaction
  verification (does the glow visually track the cursor; does hovering "All KM Students" leave
  KMK dark and vice versa; does `#/community/all` still open correctly on click) is still
  outstanding** — same permission-blocked-automation situation described in the
  `HOMEPAGE-POLISH-002/002A/002B` entry below: this session can take real screenshots
  (`screencapture` works) but cannot simulate mouse/keyboard input or run in-page JS. The user
  agreed earlier this session to manually interact while screenshots are taken; that pass still
  hasn't happened as of this entry. **Whoever picks this up next: this is the single most
  important open item across `POLISH-002` through `POLISH-005` — everything else is logic-verified
  only.**

### Rollback

See `community v2/checkpoints/COMMUNITY-V2-POLISH-005/ROLLBACK.md`. Depends on
`COMMUNITY-V2-POLISH-004`'s CSS rules being present (read the "Dependencies" section there) — this
stage's own change is small (one markup block + one CSS rule block) and safe to revert
independently of the Homepage card or the 12 college cards.

## 2026-08-21 — COMMUNITY-V2-POLISH-004: College Community Cards reuse the Homepage Community Card's pointer-follow gold glow

- **Read this + the `HOMEPAGE-POLISH-002/002A/002B` entry below before touching pointer-glow
  cards anywhere.** There is now exactly ONE pointer-follow engine in the codebase:
  `initializePointerGlowCard(card)` in `app-router.js` (per-card closure state — its own
  `rect`/`current`/`target`/`raf`, nothing shared globally) plus `initializePointerGlowCards(selector)`
  (the reduced-motion/coarse-pointer gate + `querySelectorAll` + one engine instance per match).
  Both the Homepage's single Community CTA (`initializeHomeCommunityCard()`) and the Community
  Hub's 12 College cards (`initializeCommunityCollegeCardGlow()`) are thin one-line wrappers
  around this shared engine. **If either surface's pointer-follow behavior ever needs a fix, fix
  it once in `initializePointerGlowCard()`** — do not patch one wrapper's call site or add a
  second copy of the damping/easing math.
- **Two call sites, two different CSS "skins," same JS.** The engine only ever writes
  `--pointer-x`/`--pointer-y` (percentages) onto whatever `card` element it's given — it knows
  nothing about radius, color, or card size. Visual differences between the Homepage's huge card
  and the Community Hub's small 276px-wide college cards are 100% CSS: `.home-community-card-*`
  (unchanged from `HOMEPAGE-POLISH-002B`, 420-560px radii, hardcoded gold) vs the new
  `.org-card[data-pointer-glow-card] .org-card-*` (210-220px radii, `color-mix()` with
  `var(--primary)`/`var(--primary-light)` so it auto-adapts between Light/Dark themes with no
  separate dark-theme override block — this is a genuinely better pattern than the Homepage
  card's hardcoded-gold approach; if the Homepage card is ever revisited, consider migrating it to
  the same `color-mix()` technique for consistency, though that wasn't in this stage's scope).
- **`data-pointer-glow-card` is the opt-in flag, added ONLY to `collegeCards`' markup in
  `app-community.js`, never to `globalCard` ("All KM Students").** The global card was explicitly
  required to stay untouched — same `-8px` hover lift, same static `.org-card-glow` corner blob it
  always had. If a future stage decides the global card should also get pointer-glow, that's a
  one-line markup change (add the attribute + swap its `org-card-glow` div for the three new
  layers) — the CSS/JS already generalize to any `.org-card[data-pointer-glow-card]`.
- **`overflow:hidden` on `.org-card` (pre-existing, never touched) is what guarantees zero
  cross-card glow bleed** — each card's glow layers are `position:absolute;inset:0` *inside* that
  card's own clipped box, so a 220px-radius gradient physically cannot paint into a neighboring
  grid cell regardless of how the numbers are tuned. This was the actual mechanism relied on to
  satisfy "each card responds independently, only the hovered one lights up" — not just JS-side
  independence (which was also verified separately, via closures).
- **Known, accepted simplification**: the shared engine does NOT register a `window` resize
  listener (the Homepage card's earlier `002A` version did, briefly, before this refactor dropped
  it). With up to 12 cards on the Hub, a `window`-level listener per card would outlive its
  `innerHTML`-replaced element on every SPA navigation — a real, if minor, leak. Rect is still
  freshly measured on every `pointerenter`, so the only cost is: resizing the browser window while
  actively mid-hover on one specific card won't re-measure until the next `pointerenter`. Accepted
  as out of scope per this task's own "不需要大规模重构" instruction — documented here rather than
  silently dropped.
- **Testing status**: full logic-level verification done (multi-card independence, markup,
  Homepage-regression — see `community v2/reports/REPORT_COMMUNITY-V2-POLISH-004.md`). **Real
  browser interaction verification (mouse left/center/right/leave on the Homepage card and on
  spot-checked college cards KMK/KMKK/KMPP/KMKT) is still outstanding** — this session has real
  GUI screen access (`screencapture` works) but cannot simulate mouse/keyboard input or run
  in-page JS (both blocked by macOS permissions this session can't grant itself); the user agreed
  earlier this session to manually interact while screenshots are taken, but that pass hadn't
  completed before this stage's own instructions arrived. **Whoever picks this up next: if the
  user has since done that interaction pass, check the report for updated results; if not, that's
  the very next thing to ask for before calling this task's visual acceptance criteria met.**

### Rollback

See `community v2/checkpoints/COMMUNITY-V2-POLISH-004/ROLLBACK.md` — **read the "shared
dependency" section first**, since `app-router.js`'s refactor is now load-bearing for the Homepage
card too, not just the College Cards.

## 2026-08-21 — HOMEPAGE-POLISH-002 / 002A / 002B: Homepage Community CTA becomes an interactive pointer-follow gold glow card

- **No formal checkpoint directory exists for this sub-thread** (it happened as three rapid
  corrections within one continuous conversation, each explicitly building on/overriding the
  previous — `002A` supersedes `002`'s "small offset near a fixed anchor" approach, `002B`
  supersedes `002A`'s "ambient jumps to full opacity on hover" approach). The final, correct state
  is: `002B`'s rules are what's live in `style-core.css` today. If you're reading this cold, the
  CSS comment blocks directly above `.home-community-card-rings` and above the
  `:hover`/`:focus-visible` opacity rules in `style-core.css` explain the final design in place —
  read those, not this changelog-style summary, for the authoritative current behavior.
- **Where things live**: markup in `app-router.js` `renderHome()` (search `data-home-community-card`);
  CSS in `style-core.css` (search `home-community-card`, both the base rules near `.map-promo` and
  the `:root[data-theme="dark"]` override near the end of the file); JS was originally
  `initializeHomeCommunityCard()` in `app-router.js` but **has since been refactored by
  `COMMUNITY-V2-POLISH-004` (entry above) into a shared engine** — see that entry for the current
  structure.
- **The whole card is the click target** — no separate "Enter Community" button/icon exists
  anymore (explicitly removed per instruction). `aria-label` gives it a concise accessible name
  independent of its visible (eyebrow + title + description) text content.
- **No GSAP was added.** This project has no bundler/package manager and no GSAP vendor file
  (confirmed by search before starting) — `CLAUDE.md` explicitly guards against adding either
  without approval. The pointer-follow smoothing is a small hand-rolled
  `requestAnimationFrame` damped-follow (exponential decay toward a target each frame), not a
  GSAP `quickTo()` as the original instruction suggested as a *preference*, not a requirement (the
  instruction itself said to fall back to `requestAnimationFrame` + CSS custom properties if GSAP
  wasn't safely addable).
- **Reduced motion / coarse pointer**: the init function returns immediately without attaching any
  listener when either media query matches — the CSS `var(--pointer-x,50%)`/`var(--pointer-y,50%)`
  fallback alone renders the correct static default appearance for those visitors. Verified at the
  logic level (JS genuinely never touches the custom property in that case) but not from an actual
  OS-level reduced-motion toggle in a real browser.
- **Real-browser visual verification status**: attempted mid-session. GUI screenshot capture
  (`screencapture`) works in this environment and produced a real screenshot of the live Homepage.
  Simulating mouse movement/clicks (`System Events`) and running in-page JavaScript
  (`Safari do JavaScript`) are both blocked by macOS permissions (Accessibility trust /
  "Allow JavaScript from Apple Events") that this session cannot grant itself — both require a
  one-time manual toggle in System Settings / Safari Settings. The user chose to manually
  hover/click/Tab through the card while this session takes screenshots instead of granting either
  permission; that interaction pass was requested but had not been completed before
  `COMMUNITY-V2-POLISH-004`'s instructions arrived, so it's still outstanding for both the
  Homepage card and (per that stage) the College Cards.

### Rollback

No dedicated checkpoint exists for this specific sub-thread (see note above). The final state as
of `002B` is captured as the "before" snapshot in
`community v2/checkpoints/COMMUNITY-V2-POLISH-004/before/app-router.renderHome-init.before.js` (JS)
and can be cross-referenced against `style-core.css`'s current `.home-community-card-*` rules
(unchanged by `COMMUNITY-V2-POLISH-004`) for the CSS side.

## 2026-08-21 — HOMEPAGE-POLISH-001: "How Echo Wall Works" moved to the bottom of the Homepage

- **Checkpoint/report location differs from the Community V2 stages.** This task lives at
  `checkpoints/HOMEPAGE-POLISH-001/` and `reports/REPORT_HOMEPAGE-POLISH-001.md` (project root),
  not under `community v2/` — it's a Homepage-only reorder, not Community V2 work, and the task's
  own instruction named that exact path.
- **What changed, precisely**: `renderHome()` in `app-router.js` now emits its `<section>` blocks
  in a different order: Hero → Stats → Community CTA → Building promo → Echo Map promo →
  **How Echo Wall Works** → Footer. Before this stage, "How Echo Wall Works" sat directly under
  the Community CTA, ahead of the Building promo and Echo Map promo. The block itself (heading,
  `A simple knowledge loop` eyebrow, and the `01`/`02`/`03` `how-card` grid) was moved
  byte-for-byte — nothing inside it, no CSS, no i18n key, was edited.
- **Rationale (from the task): "How Echo Wall Works" is onboarding/explanation content, not a
  primary entry point** — users should see what the Homepage actually offers (Community CTA,
  Building directory, Echo Map) before reading an explanation of how the site works. This is a
  content-priority decision, not a UX bug fix.
- **The Community IA from `COMMUNITY-V2-POLISH-002`/`-003` was not touched by this stage** and
  must not be treated as reopened by it: Homepage still shows zero college cards, only the single
  Community CTA (`id="communities"`, routes to `#/community`); `#/community`
  (`renderCommunityHub()` in `app-community.js`, untouched this stage) still shows
  `All KM Students` + the 12-college `.org-card` grid. If a future session sees "Homepage
  reordered" and assumes that implies a Community layout change too, it does not — verify against
  `app-community.js` directly, which this stage never opened.
- **No CSS is order-dependent here** — confirmed by `grep`: no sibling-combinator (`+`/`~`) rule
  in `style-core.css` references `.how-section`, `.building-home-section`, or `.map-promo`, so
  moving the block cannot have broken adjacent-sibling styling. `data-reveal`'s
  `IntersectionObserver` (`initializeRevealElements()` in `app-router.js`) attaches to whatever
  `[data-reveal]` elements exist in the DOM regardless of order, so the scroll-reveal animation
  system needed no change either.
- **Testing method, same constraint as the Community POLISH stages**: no browser automation tool
  exists in this environment (installing one would violate `CLAUDE.md`'s "no package manager"
  rule), so verification was real Node `vm` execution of the actual unmodified
  `app-data.js`/`app-router.js`, asserting on the real rendered HTML's section order via
  string-index comparison (not just presence/absence). All 13 checks passed — full order
  confirmed, moved block's content/step sequence unchanged, no college grid reintroduced. Full
  list in `reports/REPORT_HOMEPAGE-POLISH-001.md`.
- **Not independently verified this stage** (per `CLAUDE.md`'s no-false-claims rule): actual
  browser rendering — spacing, animation timing, horizontal overflow, footer spacing, and
  Desktop/Mobile/Light/Dark/EN/BM/ZH visuals. Risk assessed low given the CSS/animation
  independence confirmed above and that this is a pure reorder of otherwise-unmodified markup.

### Rollback

See `checkpoints/HOMEPAGE-POLISH-001/ROLLBACK.md` — single-file, single-function revert
(`app-router.js` `renderHome()`), verbatim pre-move snapshot of the block included in the
checkpoint directory.

## 2026-08-21 — COMMUNITY-V2-POLISH-003: Community Hub's College Communities restored to a 4-column Card Grid

- **Read this before touching `renderCommunityHub()` again.** This is a *layout-only* correction
  on top of POLISH-002 — it does **not** change the IA recorded in the POLISH-002 entry directly
  below this one. That IA (`Home → single "Enter Community" CTA → #/community → All KM Students +
  College Communities → #/community/:orgId → General/Jurusan`) **remains fully in effect.**
  Nothing in this stage touched `app-router.js`'s `renderHome()` — the Homepage still has zero
  college cards.
- **What changed**: only how `#/community`'s `College Communities` section is styled. POLISH-001
  had replaced the Hub's college section with a compact `.selection-item`/`.selection-list`
  specifically because, at that time, the Homepage still had a full `.org-card` grid and having
  two full grids on two pages was the problem being fixed. POLISH-002 later removed the
  Homepage's grid entirely, which made that de-duplication reason moot — the Hub can (and per
  the latest instruction, should) use the original large card grid, since there is no longer
  anything on another page for it to duplicate.
- **The restored markup is not a reconstruction** — it's copied verbatim from
  `community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre`, the exact pre-POLISH-001
  backup of `renderCommunityHub()`'s original `collegeCards` block (`.org-card`/`.org-grid`,
  `org-card-glow`/`org-card-header`/`org-emoji`/`note-count`/`org-card-kicker`/`org-card-title`/
  `org-card-desc`/`org-card-link`, `community.hub.collegeKicker` + `community.desc` i18n keys).
  Same `organizations` data, same `getCommunityNoteCount()` helper, same canonical
  `#/community/:orgId` routes as it always had.
- **Zero CSS changes.** `.org-grid`'s existing `repeat(auto-fit,minmax(245px,1fr))` rule
  (`style-core.css` line 192) at this page's 1160px `.container` width with an 18px gap
  mathematically fits exactly 4 columns (`(1160-3×18)/4≈276.5px` per column, above the 245px
  minimum; 5 columns would need `(1160-4×18)/5≈217.6px`, below the minimum, so auto-fit settles
  on 4) — no new breakpoint was written. The existing `@media (max-width:720px) { .org-grid {
  grid-template-columns:1fr; } }` override (unchanged) already collapses to 1 column on mobile;
  intermediate tablet widths get 2-3 columns from the same unchanged auto-fit rule.
- **`renderCollegeLanding()`'s Jurusan `.selection-list`/`.selection-item` was explicitly left
  alone** — it's a different UI for a different purpose (choosing a stream inside one already-
  selected college), not the same component as the Hub's college-discovery grid, even though
  both use `.selection-item` CSS. Don't conflate the two if either needs to change again.
- **`All KM Students` global card**: completely untouched — same size, route, description,
  styling, and position (still the first `.org-grid` section, above `College Communities`).
- **Testing method, same constraint as prior POLISH stages**: no browser automation tool exists
  in this environment (installing one would violate `CLAUDE.md`'s "no package manager" rule), so
  verification was real Node `vm` execution of the actual unmodified source, asserting on real
  rendered HTML. All checks passed: Hub now has exactly 2 `.org-grid` sections and 13 total
  `.org-card` elements (1 Global + 12 colleges) with the full original card structure, every
  college card routing to canonical `#/community/:orgId`; Homepage still zero college
  cards/routes (rerun of POLISH-002's own test, unchanged); College Landing for org 1 unaffected.
  Full check list in `community v2/reports/REPORT_COMMUNITY-V2-POLISH-003.md`.
- **Not independently verified this stage** (per `CLAUDE.md`'s no-false-claims rule): actual
  browser rendering — Desktop 4-per-row, Tablet, Mobile, Light, Dark, EN/BM/ZH. The 4-column
  claim is backed by CSS-rule arithmetic (above), not a screenshot. Risk is low: this exact
  markup and these exact CSS rules were already in production on the Homepage before POLISH-001,
  so nothing here is genuinely new/untested code — it's a restoration.

### Rollback

See `community v2/checkpoints/COMMUNITY-V2-POLISH-003/ROLLBACK.md` — single-file revert
(`app-community.js`), verbatim pre-change backup included in the checkpoint directory. Rolling
this back returns the Hub's college section to POLISH-002's compact list; it has no effect on the
Homepage either way.

## 2026-08-21 — COMMUNITY-V2-POLISH-002: Homepage hides the full Kolej grid; Community Hub owns College Discovery

- **Read this before touching the Homepage `#communities` section or the Community Hub again.**
  `COMMUNITY-V2-POLISH-001`'s stated IA decision — "the full Kolej card grid must stay on the
  Homepage" — **has been overridden by the latest product instruction and is no longer correct.**
  Do not restore the Homepage's college grid on the basis of the POLISH-001 entry below this one;
  that entry accurately describes what POLISH-001 did at the time, but the product decision it
  was built on has since changed. This entry is the current, correct IA.
- **The current, final IA** (as of this stage): `Home` shows existing content plus one
  `.map-promo`-styled "Enter Community" CTA (`#communities` section in `renderHome()`,
  `app-router.js`) that routes to `#/community`. `#/community` (`renderCommunityHub()`,
  `app-community.js`) is the *only* place all 12 colleges are listed — it shows `All KM Students`
  (global card, routes to `#/community/all`) plus a compact `.selection-list` of every college
  (routes to canonical `#/community/:orgId`). `#/community/:orgId` (`renderCollegeLanding()`)
  still offers General/Jurusan, completely untouched by either POLISH-001 or POLISH-002.
- **What actually changed in this stage vs. POLISH-001's end state**: only `renderHome()`. The
  `orgCards` builder (which mapped `organizations` into 12 `.org-card` buttons) was deleted
  entirely, and the `#communities` section was replaced with a single CTA reusing the `.map-promo`
  component that already existed lower on the same page for the Echo Map promo — same CSS, zero
  new stylesheet rules, already has a mobile `flex-direction:column` rule and a Dark-theme
  override. CTA copy reuses existing `community.hub.eyebrow`/`community.hub.title`/
  `community.hub.globalDesc`/`community.enter` i18n keys (already translated EN/BM/ZH) — no new
  i18n keys were added. `id="communities"` was kept on the new section specifically so the
  pre-existing hero "Explore" button's `scrollIntoView('#communities')` call continues to work
  with zero changes to that button.
- **`renderCommunityHub()` needed no functional change** — POLISH-001 already left it showing
  `All KM Students` + all 12 colleges as a compact list, which is exactly what this stage's
  instruction asked for ("College Discovery happens after entering Community, not before"). Only
  a stale code comment (which said the Homepage still owned the canonical full grid) was
  corrected — no markup, route, or data change in that function.
- **`organizations` (app-data.js) and `getCommunityNoteCount()` (app-router.js) are untouched**
  and remain the single data source/helper for both surfaces — no second data source was created,
  no per-college `if` branch was added anywhere.
- **Testing method, same constraint as POLISH-001**: no browser automation tool exists in this
  environment (and installing one would violate `CLAUDE.md`'s explicit "no package manager"
  rule), so verification was done via real Node `vm` execution of the actual, unmodified
  `app-data.js`/`app-router.js`/`app-community.js` source, calling the real render functions and
  asserting on the real rendered HTML. All checks passed: Homepage now has zero `.org-card`/
  `.org-grid` and zero per-college routes, one CTA present routing to `#/community`; Hub
  unchanged (Global card + 12/12 colleges, canonical routes, real note counts); College Landing
  for org 1 unaffected (General + at least one Jurusan link). Full check list in
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-002.md`.
- **Not independently verified this stage** (per `CLAUDE.md`'s no-false-claims rule): real
  Desktop/Mobile/Light/Dark rendering in an actual browser — same environment limitation as
  POLISH-001. Risk assessed low: the change removes Homepage layout surface (12 cards →
  1 CTA) rather than adding any, and reuses a component (`.map-promo`) already exercised on the
  same page. `#/community/all`, `#/community/1/general`, `#/community/1/jurusan/1`, Question/
  Comments/Solved/Unanswered, Echo Map, Building Wall, Admin were not re-run this stage — no file
  in any of those paths was touched.
- **Now-unused i18n keys**: `home.chooseSpace`, `home.communitiesDesc`, `community.kicker`, and
  the homepage-card usage of `community.desc` are unused since `orgCards` was deleted. Left in
  place (harmless, not asked to be removed) — same handling as `community.hub.collegeKicker`
  after POLISH-001.

### Rollback

See `community v2/checkpoints/COMMUNITY-V2-POLISH-002/ROLLBACK.md`. Read the "Dependencies"
section there before rolling back — reverting this stage alone restores the Homepage's full grid
and reintroduces the exact IA problem the latest product instruction asked to fix; it does not
affect POLISH-001's Hub fix (the Hub's compact list is independent and stays either way).

## 2026-08-21 — COMMUNITY-V2-POLISH-001: Homepage Communities / Kolej Grid placement fix

- **This supersedes a prior instruction** (never actually implemented in code, per this task's
  own pre-change investigation — no trace of it in git history or in this file) to remove the
  Communities section from the Homepage. The current, latest instruction is the opposite: the
  screenshot's `CHOOSE A SPACE` / `Communities` full Kolej-card grid **must stay on the Homepage**
  as the quick-pick entry into each college community. If a future session sees any older note or
  memory saying "move Communities off the Homepage," that is stale — ignore it in favor of this
  entry and the current code (`renderHome()`'s `#communities` section in `app-router.js`).
- **What was actually wrong going into this task**: not the Homepage (it already had the correct
  full grid, unchanged since Community V2 work began) — it was that `renderCommunityHub()` in
  `app-community.js` (`#/community`) had grown a *second*, near-identical full-size `.org-card`
  grid for the same 12 colleges, alongside its `All KM Students` global card. Two large grids for
  the same data on two different pages, both reading the same `organizations` array.
- **The fix, scoped to exactly one function**: `renderCommunityHub()`'s college section now
  renders a compact `.selection-list`/`.selection-item` list instead of a second `.org-card` grid
  — this is the *same* compact-list component `renderCollegeLanding()` already uses for its
  Jurusan list a few lines below in the same file, so no new CSS was needed. Same data
  (`organizations`), same helper (`getCommunityNoteCount()`), same canonical route
  (`#/community/:orgId`) as before — only the markup/CSS class changed, not what data feeds it or
  where it navigates.
- **IA split now enforced by code, not just convention**: Homepage = full-size Kolej grid (quick
  pick a college). Hub (`#/community`) = `All KM Students` global card (unchanged, still routes to
  `#/community/all`) + a compact college list (still lets you get to any college from the Hub,
  just without duplicating the large grid). College Landing (`#/community/:orgId`) = General +
  Jurusan choice, completely untouched by this task.
- **No route changed.** `#/community`, `#/community/all`, `#/community/:orgId`,
  `#/community/:orgId/general`, `#/community/:orgId/jurusan/:majorId`, and the legacy
  `#/org/:orgId` redirect are all exactly as they were before this task.
- **Testing method, since no browser tool exists in this environment**: real Node `vm`-based
  direct-function-call tests against the actual unmodified `app-data.js`/`app-router.js`/
  `app-community.js` source (not mocked reimplementations) — same "direct function call"
  verification precedent already established in this project's COM-V2-006/007 permission-matrix
  testing when a real signed-in second account wasn't available. All checks passed: Homepage
  12/12 colleges with canonical routes preserved, Hub now has exactly one `.org-card` (Global)
  plus one compact list with 12 canonical-route rows (zero duplicate large grid), College Landing
  for org 1 still shows General + at least one Jurusan link. Full detail and exact check list in
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-001.md`.
- **Not independently verified this stage** (explicitly, per `CLAUDE.md`'s no-false-claims rule):
  real Desktop/Mobile/Light/Dark rendering in an actual browser — no browser automation tool is
  available in this environment, and installing one (npm/Playwright/etc.) would violate this
  repo's explicit "no package manager" constraint. Risk is assessed low since zero new CSS was
  added (reused `.selection-list`/`.selection-item`, already mobile+dark-verified in COM-V2-008's
  own HANDOFF entry for the same route family) and the Homepage received zero code changes.
  Global Community wall, Sticky Wall, Question/Comments/Solved, Echo Map, Admin, Building Wall
  were not re-run this stage — no file in any of those paths was touched.
- **`community.hub.collegeKicker` i18n key** (en/ms/zh) is now unused (only the removed card
  markup referenced it). Left in place, harmless — not deleted since it wasn't asked for and
  removing i18n keys wasn't in scope.

### Rollback

See `community v2/checkpoints/COMMUNITY-V2-POLISH-001/ROLLBACK.md` — single-file revert
(`app-community.js`), verbatim pre-change backup included in the checkpoint directory.

## 2026-08-21 — COM-V2-008: Migration + Full Regression QA — Community V2 Phase 2 COMPLETE

- **This is the last stage of the unattended COM-V2-002→008 run.** All 8 tasks PASSED. `community v2/reports/COMMUNITY_V2_FINAL_REPORT.md` is the compiled summary — read that first if you're picking this project up cold; it has the final architecture, route table, storage layout, and full E2E/regression results in one place. `community v2/COMMUNITY_V2_PROGRESS.md` has the final per-stage status table.
- **No code changed in this stage** — it closed out every item previously marked "not independently verified" (mobile viewport, BM language, System theme, Post-content XSS, combined filters) and re-confirmed legacy migration one final time. Nothing broke.
- **What a future session picking this up should know, in one place:**
  - The Sticky Wall renderer is genuinely unified across Global/College General/Jurusan — `wallState.communityKey` is the single filtering mechanism (`app-wall.js` `getContextNotes()`), never raw `orgId`/`majorId` comparison for community notes.
  - `services/permission-service.js` is the single place for any future permission check — don't add a new inline `if (user.role === ...)` anywhere else.
  - `services/comment-service.js` (`echo-wall-comments:v1`) is fully independent of note storage, keyed by post `id`, depth-0/1 only, enforced at the data layer not just the UI.
  - Legacy `#/org/:orgId` and `#/wall/:orgId/:majorId` (both forms) still redirect correctly via `replaceState` — confirmed one final time this stage, still zero history pollution.
  - `renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` in `app-router.js` are confirmed-unreachable dead code since COM-V2-002 — still not deleted, still flagged for a future cleanup task if anyone wants it.
  - No real College Admin test account exists in this prototype (`services/auth-service.js` untouched throughout Community V2) — `canUserModerateCommunity()`'s college-scoped branch has only ever been logic-tested via constructed objects, never a real signed-in account.
  - Photo posting was never click-tested during this specific 8-stage run (the code path was never touched by any of the 8 stages, so this is a "didn't check," not a "found a problem") — worth a quick real click-through before assuming it's fine, next time someone's in this codebase with browser tools handy.
- Verified end-to-end via `python -m http.server 8000` + real browser: a genuine 390×844 mobile pass across every Community V2 surface (all confirmed zero horizontal overflow via `scrollWidth === clientWidth`, not just eyeballing screenshots), a full BM language pass, System theme resolution, a live Post-content XSS test, combined Category+Search filtering, and a final legacy-redirect + KMK→Sains-baseline re-check (still 81, unchanged since COM-V2-001).
- **Per the user's explicit instruction: stopping here.** Not starting Study Notes, Admin V2, Supabase migration, or any other phase without the user's explicit go-ahead in a future message.

### Rollback

See `community v2/checkpoints/COM-V2-008/ROLLBACK.md` — nothing to roll back, no files changed this stage. To roll back Community V2 as a whole, walk each `checkpoints/COM-V2-00X/ROLLBACK.md` in reverse order (008→007→...→001), respecting the cross-stage dependency notes in each (e.g. COM-V2-004's CSS fix, COM-V2-003's data-loss caveat).

## 2026-08-21 — COM-V2-007: Permission Hooks

- **Stage 7 of the unattended run.** `community v2/reports/REPORT_COM-V2-007.md` has full detail.
- **This prototype has exactly one real user identity to test with** (`role:"admin"`, the only account signed into this browser session throughout the whole Community V2 run) — there is no second real student account and no real College Admin account anywhere in `echo-wall-users:v1`. For the parts of this stage's permission matrix that need those roles, direct function calls with constructed user objects (`{id, role, moderatesOrgId}`) were used instead — same method already established and accepted in COM-V2-006's report. This is honest logic verification, not a DOM bypass, and not the same as "verified against real prototype data" — the report is explicit about which is which.
- **`services/auth-service.js` was deliberately NOT touched.** "College Admin" is modeled as an optional `user.moderatesOrgId` field that `getUserModerationScope()` reads defensively — no real user record has it, and adding real per-college admin accounts (e.g. a config list like the existing `PROTOTYPE_ADMIN_EMAILS`) would be a genuine `auth-service.js` schema change, which is bigger than "hooks" scope. If a future stage wants to actually test this against a real signed-in account, start there.
- **Where the permission logic now lives, for future stages**: `services/permission-service.js` is the single source of truth. If COM-V2-008 or a later Admin-queue stage needs to gate anything else (e.g. hide/delete a note, hide a comment), add the check there, not as a new inline `if` in `app-wall.js`/`app-admin.js` — that's the whole point of this stage existing.
- **`canUserMarkSolved()` behavior changed slightly from COM-V2-006**: it now also allows a college-scoped moderator (not just global admin) to mark solved a Question that belongs to their own college — this is a real behavior addition matching the spec's permission matrix ("College Admin: 可管理自己 College 全部"), not just a refactor. No real account can currently exercise this branch (see above), but the logic is correct and tested.
- Verified end-to-end via `python -m http.server 8000` + real browser: real sign-out/sign-in cycle confirming visitor-cannot-post through the actual Sign-in modal (not a simulated check), the full 13-case permission matrix via direct function calls, and Building Wall/Admin/Echo Map regression — all zero console errors, session fully restored to the original signed-in state afterward.
- Next step: COM-V2-008 — Migration + Full Regression QA (proceeding automatically) — this is the completion gate for the whole Community V2 run; no new features, only migration verification, bug fixing, and the full regression sweep flagged as deferred across every prior stage (BM language, real mobile viewport, full E2E flows A–G from the master spec).

### Rollback

See `community v2/checkpoints/COM-V2-007/ROLLBACK.md`. No data implications — this stage added no persisted fields.

## 2026-08-21 — COM-V2-006: Solved / Unanswered

- **Stage 6 of the unattended run.** `community v2/reports/REPORT_COM-V2-006.md` has full detail.
- **`canUserMarkSolved()` is intentionally coarse and explicitly flagged for COM-V2-007**: it's `isAuthor || user.role === "admin"`, with no per-college scoping — a KMK admin can currently mark a KMKK-scoped Question solved, since the prototype only has one global `role:"admin"` flag, not per-community moderator roles. This is a known, documented gap, not an oversight — COM-V2-007 (Permission Hooks) is exactly the stage meant to replace this with real `communityScope`-aware moderation. When that happens, `setQuestionStatus()`'s permission check is the one line to update.
- **The Unanswered sort is also a filter**, not just a sort-order tiebreak — read `getFilteredNotes()`'s `isUnansweredSort` branch before changing sort logic again. Selecting "Unanswered" hides everything except open, zero-comment Questions; selecting Hot/New shows everything as before. This dual behavior was a deliberate reading of the spec (which lists Unanswered both as a "Sort" option and separately defines it with filter-like exclusion rules) — confirmed correct behavior by testing a Question move in and out of the filter as its comment count changed live.
- **No new badge code was needed for SOLVED** — `getQuestionBadgeHTML()` and its `.is-solved` CSS were already built in COM-V2-004 (unreachable until now, since nothing could set `questionStatus:"solved"` before this stage). If the badge ever looks wrong, that function/CSS is still the one place to check, unchanged since COM-V2-004.
- Verified end-to-end via `python -m http.server 8000` + real browser: the full canonical E2E flow (Create Question → OPEN → comment → Mark Solved → SOLVED, with reload-persistence), the Unanswered filter correctly gaining/losing the test question as its comment count and solved-status changed, and a 4-case permission matrix tested via direct `canUserMarkSolved()` calls with synthetic user objects (a stranger, the real author, an unrelated admin, and a Discussion post) — since this prototype only has one real signed-in identity, direct function calls with constructed user objects were used instead of DOM-bypassing, per the task's own explicit guidance on how to test multi-role scenarios safely.
- **Not independently re-verified this stage**: real mobile viewport, BM language, Echo Map (no touched file is in `map.html`'s load path).
- Next step: COM-V2-007 — Permission Hooks (proceeding automatically) — should specifically revisit `canUserMarkSolved()` per the note above.

### Rollback

See `community v2/checkpoints/COM-V2-006/ROLLBACK.md`. Independent of COM-V2-004's `.form-group[hidden]` fix and COM-V2-005's comment service — do not bundle reverts.

## 2026-08-21 — COM-V2-005: Comments + One-Level Reply

- **Stage 5 of the unattended run.** `community v2/reports/REPORT_COM-V2-005.md` has full detail.
- **`CommentService` caches in memory after first load** — same established pattern as `notes`/`loadNotes()` in `app-data.js`. If you ever clear `echo-wall-comments:v1` from LocalStorage directly via console/devtools, the in-memory `comments` array in `services/comment-service.js` does NOT reflect that until an actual page reload (SPA navigation via `navigate()` is not enough — it doesn't reload the JS module). Hit this directly during this stage's own cleanup: cleared the storage key, immediately re-queried, still saw the old count, had to hard-reload to see the clean state. Worth remembering for any future debugging session.
- **Depth enforcement lives in `createComment()` itself, not the UI.** `parentCommentId` is only accepted if the target comment's own `depth` is `0` — attempting to reply to a reply throws synchronously. The UI never even offers a "Reply" control on nested replies (`buildCommentHTML(comment, isReply)` only renders reply controls when `isReply` is false), so this is enforced twice, not just once.
- **Comments are keyed purely by `postId` (a note's own numeric `id`)** — completely independent of `communityKey`/scope. This means Comments work identically for Global/College General/Jurusan posts with zero extra plumbing, since they all share the same note-id space. If a future stage ever needs per-scope comment behavior (e.g., different moderation rules for Global vs Jurusan comments), that would need to look up the parent note's `communityScope` via `getRuntimeNotes().find(...)`, not anything stored on the comment itself.
- **XSS is handled the same way notes always have been**: comment content is stored raw (trimmed) and only escaped via `escapeHtml()` at render time — verified live with a real `<script>`/`<img onerror>` payload through the actual Compose UI, not just by reading the code. No dialog fired, page stayed responsive.
- Verified end-to-end via `python -m http.server 8000` + real browser: posted a real comment (named identity) containing an XSS payload, replied to it (anonymous identity, one level deep), confirmed post-isolation with a second real post (0 leakage), confirmed depth-2 rejection and all three validation guards via direct `CommentService` calls, confirmed the wall-card comment count updates live after posting, confirmed persistence across a real reload, confirmed Building/Demo-Seed notes correctly get no Comments section at all, Dark+ZH fully translated, Admin/Echo Map regression-clean.
- **Not independently re-verified this stage**: real mobile viewport, BM language (same low-risk deferral pattern as prior stages — reused CSS/i18n conventions, no new risk surface). No comment moderation UI (expected — Phase 5).
- Next step: COM-V2-006 — Solved / Unanswered (proceeding automatically).

### Rollback

See `community v2/checkpoints/COM-V2-005/ROLLBACK.md`. Independent of COM-V2-004's `.form-group[hidden]` fix — do not revert that alongside this stage.

## 2026-08-21 — COM-V2-004: Discussion / Question Post Type

- **Stage 4 of the unattended run.** `community v2/reports/REPORT_COM-V2-004.md` has full detail.
- **Real, independent bug found and fixed**: `.form-group[hidden]` did nothing before this stage, because `.form-group{display:flex}` in `style-core.css` overrides the browser's default `[hidden]{display:none}` UA rule (same class of bug as `map.html`'s `.building-search`/`.building-list` — see the 2026-08-20 HANDOFF entry for that one). Caught it via `getBoundingClientRect()` returning nonzero height for `#post-type-group` on the Building Wall even though its `hidden` DOM property read `true`. **If any future `.form-group`-classed element is ever conditionally hidden and doesn't visually hide, this is the first thing to check** — the fix (`.form-group[hidden]{display:none}`, added to `style-core.css`) is general-purpose, not scoped to just the Post Type selector.
- **Where things live now**: `getQuestionBadgeHTML(note)` (app-wall.js) is the single badge-rendering function, called from both `buildNoteDOM()` (wall card) and `openModal()` (detail) — if COM-V2-006 needs to change SOLVED rendering, that's the one place to touch. `wallState.postType` follows the exact same pattern as `category`/`sort`/`search` (persists across wall navigation, not reset per-wall) — deliberately consistent with existing behavior, not a new design decision; if that's ever revisited, do it for all four together, not just `postType`.
- Verified end-to-end via `python -m http.server 8000` + real browser: created a real Question post via the actual Compose UI (selected the radio, typed content, submitted — found via `getBoundingClientRect()` again since the drawer's submit button position varies with content length), confirmed its stored shape and the badge rendering on both the wall card and the Detail Modal. Verified the Type filter isolates exactly the Question post from all 81 legacy Discussion notes. Confirmed the Building Wall compose drawer no longer shows the Post Type selector after the CSS fix (0 height, confirmed via `getBoundingClientRect()`). Dark+ZH fully translated (no raw i18n keys visible). Cleaned up the 1 test post, confirmed KMK→Sains back to 81. Admin regression-checked, zero console errors throughout.
- **Not independently re-verified this stage**: real mobile viewport, BM language (same low-risk reasoning as prior stages — existing, already-mobile-tested CSS patterns reused; deferred to COM-V2-008's full sweep).
- Next step: COM-V2-005 — Comments + One-Level Reply (proceeding automatically).

### Rollback

See `community v2/checkpoints/COM-V2-004/ROLLBACK.md`. **The `.form-group[hidden]` CSS fix should generally be kept** even if this stage's feature work is reverted — it's an independent, real bug fix.

## 2026-08-21 — COM-V2-003: Global + College General Wall

- **Stage 3 of the unattended run.** `community v2/COMMUNITY_V2_PROGRESS.md` has live status; `community v2/reports/REPORT_COM-V2-003.md` is the authoritative detail for this stage.
- **The core mechanism, if you need to extend it later:** `wallState.communityKey` is now the single source of truth for "which notes belong on this wall" — `getContextNotes()` filters via `CommunityService.getCommunityKeyForNote(note) === wallState.communityKey`, not raw `orgId`/`majorId` comparison. Every wall-entry function (`renderWall`, `renderCommunityGlobalWall`, `renderCommunityCollegeGeneralWall`, all in `app-wall.js`) sets `communityScope`/`communityKey` in the context object passed to `renderContextWall()`. If a future stage adds a new wall type, follow this same pattern — do not add a new orgId/majorId special case.
- **New posts are fully V3-shaped the instant they're created now** — `handleFormSubmit()` was rewritten to derive `orgId`/`majorId`/`communityKey`/`communityScope` from `wallState.communityScope` rather than blindly copying `wallState.orgId`/`wallState.majorId` (which are internally coerced to `0` for "unset" bookkeeping — that coercion never leaks into a note's own stored fields anymore). This was originally slated for COM-V2-004 but had to happen now: without it, a freshly-created Global/College General post wouldn't show up on its own wall until a page reload, which is a real visible bug, not a nice-to-have.
- **Two real bugs in COM-V2-001's `normalizeStoredNote()` were found and fixed this stage** — not by inspection, but because testing this stage's scope isolation would have failed without them: (1) its validation gate assumed every community note has a real `majorId` (true for jurusan-only notes, false for the new College General/Global shape) — a Global post would have been silently dropped (returns `null` → filtered out) on the very next page load. (2) `orgId: Number(note.orgId)` turns `null` into `0`, silently reintroducing the "orgId=0 magic value" the whole Community V2 spec explicitly forbids — fixed with a `hasValue()` null-check before coercing. **If you ever see a Global or College General post vanish after a reload, check these two spots first** — they're the exact failure mode both bugs produced before the fix.
- Verified end-to-end via `python -m http.server 8000` + real browser, using genuinely-created data (not simulated): posted one real note each to Global (named), KMK General (anonymous — confirmed nickname not leaked), and KMK→Sains Jurusan, all via the actual Compose UI (typed text, clicked identity radio, clicked "Pin to Wall" — found the submit button via `getBoundingClientRect()` when scroll-position guessing missed a couple of times, a good technique to reuse if a drawer's scroll height ever surprises you again). Built a 5-wall isolation matrix (`global:all`/`college:1`/`college:2`/`jurusan:1:1`/`jurusan:1:2`) confirming all 15 cells correct — no cross-scope leakage in either direction. Cleaned up by removing exactly the 3 test note IDs (not a LocalStorage wipe), confirmed KMK→Sains reverted to 81 and 0 residual test content after a real reload. Building Wall, Admin (25/410 unchanged), and Echo Map (`map.html` — `app-data.js` is in its load path, re-checked directly, 14 buildings load fine, zero errors) all regression-clean. Dark+ZH and Light+EN confirmed on the new Global wall.
- Next step: COM-V2-004 — Discussion / Question Post Type (proceeding automatically). Note its scope is now slightly smaller than originally planned, since the "make new posts V3-compliant" part of its stated debt was already fixed here — COM-V2-004 only needs to add the actual Discussion/Question selector UI and badge rendering.

### Rollback

See `community v2/checkpoints/COM-V2-003/ROLLBACK.md`. **Read its data-loss caveat before rolling back** if any real Global/College General content exists by then.

## 2026-08-21 — COM-V2-002: Community Router + Hub

- **This is stage 2 of an unattended multi-stage run** (COM-V2-002 through COM-V2-008, per explicit user instruction — see `community v2/COMMUNITY_V2_PROGRESS.md` for live status of every stage, and `community v2/reports/REPORT_COM-V2-00X.md` for each stage's full individual report; those reports are the authoritative detail, this entry is a summary).
- **Route table changed for real this time** (COM-V2-001 was data-only). New canonical: `#/community`, `#/community/all`, `#/community/:orgId`, `#/community/:orgId/general`, `#/community/:orgId/jurusan/:majorId`. Old `#/org/:orgId` and `#/wall/:orgId/:majorId` (and the even-older 4-part `#/wall/:orgId/:batchId/:majorId`) are now `legacy:true` in `getRoute()` and `replaceState`-redirect to the new canonical hash in `render()` — read the top of `app-router.js`'s `getRoute()`/`render()` before changing routing again, the comments there explain exactly why each check is ordered where it is (the community-prefixed checks must come before the `org`-prefixed checks that would otherwise shadow them, but the `org-map`/`org-buildings`/`org-building` checks — a separate framework — must stay ahead of the new bare-`org` legacy catch-all).
- **`app-community.js` is new** and deliberately thin: it only renders Hub/Landing/shell pages, and calls the *existing* `renderWall()` (via the router's `wall` page dispatch) for the actual Jurusan Sticky Wall — there is no second wall renderer. It reuses existing CSS classes (`.org-page`, `.org-grid`, `.org-card`, `.selection-shell`, `.enter-wall-box`) instead of adding a stylesheet.
- **The Global (`#/community/all`) and College General (`#/community/:orgId/general`) routes are placeholder shells this stage** — "This community is being prepared" — by explicit design (the task spec calls this "shell only", full posting is COM-V2-003's job). Don't be surprised these routes exist but don't let you post; that's expected until the next stage lands.
- **`renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` (old major-picker page) are now dead code** — `#/org/:orgId` no longer routes to `{page:"org"}`, so `renderOrgDetails` is unreachable. Left in place on purpose (minimize this stage's touched surface) — safe to delete in a later cleanup, not done here.
- Verified end-to-end via `python -m http.server 8000` + real browser: Hub (global card + college grid with live counts from `getCommunityNoteCount`), two different College Landings (KMK — no map/building buttons since KMK has its own dedicated Echo Map; KMKK — map/building buttons correctly present via the reused `renderOrgHeaderActions`), canonical Jurusan wall (81 notes, identical render to the old route), all three legacy redirect shapes, two invalid-route cases (friendly not-found, no white screen), a real browser Back-button test confirming no history pollution from the `replaceState` redirects, Dark+ZH, Light+EN, a real 390×844 mobile viewport, and Building Wall/Admin/Echo Map regression — all zero console errors.
- **Not verified this stage**: BM language (real translations were added with the same discipline as EN/ZH, just not separately screenshotted — will be swept in COM-V2-008's full i18n pass).
- Next step: COM-V2-003 — Global + College General Wall (proceeding automatically per the user's unattended-run instruction).

### Rollback

See `community v2/checkpoints/COM-V2-002/ROLLBACK.md` for exact hunks. This stage is rollback-independent from COM-V2-001 (no code added this stage calls `CommunityService`).

## 2026-08-21 — COM-V2-001: Community Registry + Post Compatibility Layer (EchoWall V2 Phase 2 start)

- **This is the first task of EchoWall V2 Phase 2 (Community V2)**, per `community v2/00A_EchoWall_Community_V2_框架与架构规格书.pdf`. Read that PDF in full before touching any COM-V2-00x task again — it defines the full Community V2 product model (`global:all` / `college:{orgId}` / `jurusan:{orgId}:{majorId}` scopes, Post/Comment schema v3, the 8-task rollout COM-V2-001 through COM-V2-008) and explicitly warns the current source may not match its assumptions 1:1. It didn't, in one place: the PDF's "current Note schema" table doesn't mention that `normalizeStoredNote()` force-sets `schemaVersion:2` on every note unconditionally — this had to be changed to be scope-conditional (see below), which the PDF's own normalization table implies (`schemaVersion:3` for the V3 Post shape) but doesn't say outright.
- **What this task built, in plain terms**: a data-layer-only registry that can name "which community" a note belongs to (`global:all`, `college:{orgId}`, `jurusan:{orgId}:{majorId}`) without ever using `orgId=0`/`majorId=null` magic values, plus a non-destructive backfill so every *existing* community note gets these new fields the next time it's loaded. **Zero UI changed.** No new routes, no new pages, no new buttons — confirmed via full-language/theme/mobile screenshots showing the site pixel-identical to before.
- **New files**: `data/community-config.js` (`window.COMMUNITY_DESCRIPTORS`, generated from the *existing* `organizations`/`majors` arrays in `app-data.js` — no duplicate college/major data anywhere) and `services/community-service.js` (`window.CommunityService` — the key helpers: `getCommunityKey`, `parseCommunityKey`, `isValidCommunityKey`, `getCommunityByKey`, `getCommunityFromLegacyContext`, `mapLegacyWallKeyToCommunityKey`, `getCommunityKeyForNote`, `getCommunityPosts`). Both load in `index.html` right after `app-data.js` (before `services/map-note-service.js`) — **not** added to `map.html`, since Echo Map doesn't touch Community V2 this round.
- **The actual normalization change** is in `app-data.js` `normalizeStoredNote()`: for community notes only, it now backfills `communityKey`/`communityScope`/`postType`/`questionStatus`/`moderationStatus`/`commentCount`/`updatedAt` and sets `schemaVersion:3` (was hardcoded `2` for every note before). This is idempotent — if a note already has a valid `communityKey`, it's kept, not recomputed — and it never touches `orgId`/`majorId`/`batchId` or any other legacy field. Building notes are completely untouched: still `schemaVersion:2`, never get a `communityKey` field at all. Read the function before changing it again — the community-specific block is a clearly separated `if (contextType === "community") { ... }` at the end, easy to extend for COM-V2-004's `postType`/question fields later without re-touching the rest.
- **Important discovery, not in the PDF, found by actually reading `app-data.js` before coding**: the demo-seed showcase bundle (`data/demo-seed-bundle.v1.js`, 696 notes, loaded via `window.ECHO_WALL_DEMO_SEED_BUNDLE` and activated by `activateDemoSeedSnapshot()`) is a **separate note source** that never passes through `normalizeStoredNote()` — it has its own strict, hash/count-validated activation path (`validatePortableDemoSeedBundle`) that this task correctly did not touch (mutating those notes would break its own internal invariant checks, which assert exact wall counts like `community:1:1` = 73). Instead, `CommunityService.getCommunityKeyForNote(note)` computes a community key on the fly from `orgId`/`majorId` for any note that doesn't already have a valid one — so `getCommunityPosts()` correctly includes demo-seed notes without ever mutating them. **If a future COM-V2 task needs demo-seed notes to carry real `communityKey`/`postType` fields (e.g. to show Question badges on them), it will need its own plan — this task deliberately left that bundle frozen.**
- Load order matters here for a subtle reason: `community-service.js` (loaded after `app-data.js`) is *called from inside* `app-data.js`'s `normalizeStoredNote()` (via `window.CommunityService?.getCommunityKey(...)`), even though `community-service.js` loads *after* the function that calls it is *defined*. This works because `normalizeStoredNote()` is only ever *invoked* later, inside `loadNotes()`, which itself only runs on the `DOMContentLoaded` listener in `app-router.js` — by which point every `<script>` tag (including `community-service.js`) has already executed. Don't be alarmed seeing the "caller loads before callee" ordering in `index.html` — it's safe specifically because of this call-time-vs-definition-time gap. If `normalizeStoredNote()` is ever called synchronously at module-load time in the future (it currently isn't), this assumption would break.
- Verified end-to-end via `python -m http.server 8000` + real browser: Community Key validity tests (`global:all`/`college:1`/`jurusan:1:1` valid; `global:1`/`college:`/`jurusan:1`/`jurusan:x:y` all correctly rejected — no silent coercion), a real KMK→Sains seed note's full V3 field set after normalize (with every legacy field — `orgId/majorId/batchId/shape/color/authorNickname/isAnonymous/upvotes/score/createdAt` — confirmed unchanged), a real building note (`B_PUSTAKA`) confirmed to have **no** `communityKey`/`communityScope` at all and `schemaVersion:2` unchanged, KMK→Sains note count **81 before and after** (matches `CommunityService.getCommunityPosts('jurusan:1:1').length`), voting + translation on a real note, Building Wall (43 notes), Admin route (25 community notes, 410 votes), Echo Map (unaffected, new scripts correctly absent), Dark+EN, Light+BM, and a real 390×844 mobile viewport (same-origin-iframe technique) — all with zero console errors.
- **Not verified this round** (per the task's own scope — no UI changed, so nothing to check): Router (`app-router.js` untouched), any Community Hub/Global/College General UI (doesn't exist yet), Comments UI (doesn't exist yet, `echo-wall-comments:v1` is schema-only, no read/write code).
- **Session note**: cleanup after browser testing used `taskkill /IM python.exe` to stop the test HTTP server, which kills *all* Python processes system-wide, not just the test server. If a future session needs to stop a test server, prefer killing the specific PID (`python -m http.server` prints/holds it, or use `Get-Process python | Where-Object {...}` to target it) instead of a blanket `taskkill /IM python.exe`.
- Next step: **COM-V2-002 — Community Router + Hub** (not started; explicitly waiting for user confirmation before starting).

### Rollback

- Remove `data/community-config.js` and `services/community-service.js`, and their two `<script>` tags in `index.html` (right after `app-data.js`).
- In `app-data.js` `normalizeStoredNote()`: revert the object literal's `schemaVersion: contextType === "community" ? 3 : 2` back to the unconditional `schemaVersion: 2`, and remove the `if (contextType === "community") { ... }` block added after the `normalized` object (backfills `communityKey`/`communityScope`/`postType`/`questionStatus`/`moderationStatus`/`commentCount`/`updatedAt`).
- No LocalStorage data needs cleanup or migration — the new fields are additive-only on read; removing the code stops them from being added on the next load, and any already-written `echo-wall-notes` entries with the extra fields are harmless (ignored by all pre-existing code, since nothing before this task read them).

## 2026-08-21 — Echo Map switcher: per-college visual calibration (center + zoom), superseding the zoom−1 pass

- **This replaces the previous session's "zoom −1 for every non-KMK college" approach.** The user clarified the real issue was centering, not just zoom, and asked for independent per-college calibration instead. `data/campus-map-config.js` now has hand-calibrated `lat`/`lng`/`zoom` for all 11 non-KMK colleges — see CHANGELOG for the full before/after table and the visual result of each. Only `data/campus-map-config.js` was edited; `lat`/`lng` are no longer the original "somewhere near the college" values from whenever that file was first authored — they're now each independently verified to visually center the real campus.
- **Calibration method, if this needs to be redone or extended:** open `map.html`, temporarily add `window.__calibrationMap = map;` right after `const map = L.map("map", ...)` in `echomap.js` (find the exact line — it's the very first line inside the `DOMContentLoaded` handler that creates the Leaflet instance), then from a `javascript_exec` console: `window.__calibrationMap.setView([lat,lng], zoom)` to preview instantly (no animation lag — see the flyTo caveat below), attach a one-time click listener (`window.__calibrationMap.on('click', e => window.__lastClickLatLng = e.latlng)`), click directly on the visible campus in a screenshot via the `computer` tool's real mouse click (not a synthetic DOM `.click()` — that never fired the map's click handler in this session), then read `window.__lastClickLatLng` for a precise, real Leaflet-computed center. Zoom out to ~15 first to see a campus's full extent before picking a click point, then zoom to 16–17 for the final framing check. **Remove the debug line before finishing** — confirmed via `grep -c "__calibrationMap" echomap.js` returning 0 this session; do the same next time.
- **Two testing-environment quirks hit repeatedly this session — neither is a real bug, don't "fix" them:**
  1. `map.setView(...)` (non-animated) always applied instantly and reliably. `map.flyTo(...)` (animated, `duration:.75`) frequently did **not** progress at all when driven by pure scripted `javascript_exec` waits (`await new Promise(r=>setTimeout...)`) — the map's `getCenter()` would stay pinned at the pre-click value indefinitely, even after 5+ seconds of scripted waiting. This is almost certainly `requestAnimationFrame` not being reliably scheduled without the `computer` tool's `wait`+`screenshot` cycle actually forcing a real paint. **Workaround that reliably fixed it:** use `computer wait` (not JS-side waits) between the click and the check, and if a screenshot still shows the stale view, click the button a second time (or click "Fit campus") — this consistently kicked the animation into completing. This is a property of CDP-driven automation, not of the shipped `echomap.js` code (which is unchanged from the prior session and was already working correctly for real users).
  2. OSM's public tile server was intermittently slow to serve tiles this session (blank/gray map area for several seconds after a `setView`/`flyTo`), independent of the animation issue above — almost certainly rate-limiting from the cumulative volume of map reloads across this and the prior two sessions' testing today. Confirmed unrelated to any code change (it affected KMK's own untouched view too). If a future session hits the same thing, just wait longer / reload the page fresh rather than assuming something broke.
- **KMS and KMKT have a real, permanent OSM-data limitation worth knowing about**, not a calibration mistake: OSM has mapped their campus **boundary polygons** clearly (so centering/framing was done confidently against those), but does **not** have detailed internal building footprints/labels for either college the way it does for KMKK, KMPP, KMPK, KMP, KMM, KMNS, KML, and KMJ (all of which have richly labeled individual buildings — Komsas blocks, Dewan Kuliah, Astaka, etc. — visible directly on the OSM basemap). This is upstream OSM data coverage, not something fixable from this codebase. If those two colleges ever get real building data added to `data/campus-building-registry.js`, the campus body's true extent is defined by their existing boundary polygon — recentering shouldn't be needed, but doubly verify then.
- KMK, the switcher's own logic (`echomap.js`), `data/campus-building-registry.js`, and `app-campus-map.js` were **not** touched this session — confirmed via the untouched "Fit campus" behavior and full building-list restoration when cycling back to KMK, and via re-reading the `fitActiveCollegeView`/`switchToCollegeIndex` functions (unchanged from two sessions ago) before starting calibration.
- Verified end-to-end via the **real production switcher** (not the calibration hook): KMK → KMKK → KMP → …→ KMKT (wraparound forward-tested) → KMK (wraparound backward-tested), then clicked the Pustaka building on KMK and confirmed the full preview (Opening Hours, note count) still works. Also confirmed on a real 390×844 mobile viewport.
- Next step: none requested. If a future task wants real building data for KMS/KMKT specifically, start by checking whether OSM's coverage has improved (re-run the calibration method above at zoom 18+ to look for individual building tags) before assuming none exists.

### Rollback

- Revert `data/campus-map-config.js`'s 11 `lat`/`lng`/`zoom` triples to the previous session's values (all `zoom:16`, centers as listed in the CHANGELOG table's "Old Center" column) if this calibration needs to be undone. Nothing else changed this session.

## 2026-08-20 — Echo Map switcher: non-KMK default zoom −1, and a confirmed answer on "other school maps"

- **This turn started as a verification request, not a code task.** The user pushed back on the previous session's college-switcher work, suspecting the non-KMK map integration might be a shortcut rather than a real reuse of "already-completed" other-college maps. I re-verified from primary sources before touching anything (no code changed until the user confirmed the finding and asked for the zoom-only edit below). The confirmed answer, in case this comes up again: **the 11 non-KMK colleges have no real map/building content anywhere in this repo.** Each one is exactly `{orgId, lat, lng, zoom}` in `data/campus-map-config.js` plus an empty array in `data/campus-building-registry.js` (`Object.freeze([])` for every single one — confirmed by reading the file directly, not summarized). No polygons, no markers, no per-college photos (`assets/buildings/` only has KMK's `B_*` folders), no GeoJSON, nothing — confirmed via a repo-wide grep for every college short code and a git-log check (these framework files have no commit history; they're part of this whole session's uncommitted baseline). The shared "Framework Preview" empty state (`app-campus-map.js` / `app-campus-buildings.js`) is genuinely the entire "other school map" experience today, by design (its own comments say "Framework only... Nothing here is fabricated"). The previous session's Echo Map switcher already reused everything that exists for these colleges — there was nothing more to hook up.
- **This turn's actual code change:** `data/campus-map-config.js` — `zoom: 17` → `zoom: 16` for all 11 non-KMK entries (KMKK through KMKT), uniformly, per the user's explicit "current zoom − 1" rule. `lat`/`lng` untouched. This is the *only* file changed. KMK's own zoom/bounds (`echomap.js`, `CAMPUS_BOUNDS`/`DEFAULT_VIEW` = 17, unrelated to this file) were not touched.
- **No second zoom-offset logic was added anywhere.** `echomap.js`'s `fitActiveCollegeView()` and the college-aware "Fit campus" handler (both added in the previous session) already read `config.zoom` straight from `getCampusMapConfig(orgId)` with zero arithmetic on it — confirmed via `grep -n "config.zoom" echomap.js` before editing, so a pure data edit in `campus-map-config.js` was guaranteed sufficient without touching any JS. This was a deliberate check, not an assumption.
- Verified live: `window.getCampusMapConfig(2/3/14).zoom` all read `16` after a fresh page load; switching to KMKK visibly showed more surrounding context than the prior (zoom 17) screenshots from the previous session — the river and a wider road network are now in frame that weren't before; "Fit campus" on a non-KMK college reproduces the same (now-wider) view, confirming it shares the same data with no separate logic; KMK unaffected (building list/search restored correctly on switch-back; KMK's own zoom/bounds code path was never touched, confirmed by inspection). Mobile re-confirmed via the same-origin-iframe technique used in prior sessions (see the two entries above this one for why — `resize_window` still doesn't work in this environment).
- One session-specific note, not a bug: OpenStreetMap's public tile server was intermittently slow/rate-limited during this session's testing (likely from the volume of map reloads across several consecutive sessions today) — a few screenshots briefly showed blank/gray tiles before they loaded. This affected KMK's own (untouched) view too, confirming it's an external tile-loading issue, not something introduced by this change. Verification relied on the live `getCampusMapConfig()` reads (authoritative) plus visual confirmation once tiles did load, not on any single screenshot.
- `data/campus-map-config.js` is untracked in git (no commit history, part of the whole session's uncommitted baseline) — `git diff` shows nothing for it; use `git status --short` or read the file directly to see the current state.
- Next step: none requested. If someone asks for real building data for a non-KMK college next, see the previous HANDOFF entry's note about `switchToCollegeIndex` needing a registry-length check added at that point — still applies, untouched by this turn.

### Rollback

- In `data/campus-map-config.js`, change all 11 `zoom: 16` back to `zoom: 17`. Nothing else changed this turn.

## 2026-08-20 — Echo Map: multi-college switcher (← KMK →), reusing the existing framework

- **Where the multi-college system lives, for future reference:** `app-data.js`'s `organizations` array (id/name/emoji, canonical order — top-level `const`, not `window.organizations`, but accessible from any later-loaded classic `<script>` on the same page, same trick `app-router.js` already relies on) + `data/campus-map-config.js` (`window.CAMPUS_MAP_CONFIGS`/`getCampusMapConfig(orgId)`, lat/lng/zoom per non-KMK college — KMK/orgId 1 deliberately absent by design) + `data/campus-building-registry.js` (`window.CAMPUS_BUILDING_REGISTRY`/`getCampusBuildingRegistry(orgId)`, currently empty arrays for every non-KMK college) + `app-campus-map.js` (the SPA's shared Leaflet page for `#/org/:orgId/map`, index.html only). This was all pre-existing before this session — none of those four files' *content* was changed, only `data/campus-map-config.js` got a new `<script>` tag added to `map.html` so `echomap.js` could read it too.
- **What this session added, entirely in `echomap.js` + `map.html` + `style-core.css` + locale files:** a small "‹ {code} ›" stepper in `map.html`'s existing `.map-floating-controls` (top-left, stacked above "Fit campus"). Logic lives in `echomap.js`, added right after `BUILDING_INTERACTION_CONFIGS.forEach(createBuildingFootprintControl)`: `activeOrgIndex` (state, starts at the index of `organizations` where `id===1`, i.e. always KMK on load), `fitActiveCollegeView()`, `applyActiveCollegeChrome()` (label + H1 + aria-labels), `switchToCollegeIndex(nextIndex)` (the actual switch — modulo wraparound, closes any open preview, toggles `buildingLayer`/building-list/search/notice, re-renders via the *existing* `renderBuildingList()` when landing on KMK). The existing "Fit campus" button handler was made college-aware (same `CAMPUS_BOUNDS` for KMK, `CAMPUS_MAP_CONFIGS` lookup otherwise) — same button, same data, just no longer hardcoded to always assume KMK.
- **Non-KMK colleges show a reused "awaiting data" message, not a fake building list**, because `CAMPUS_BUILDING_REGISTRY` is genuinely empty for all 11 of them right now (confirmed by reading the file — this is real project state, not a shortcut I invented). The message is the *existing* `campusMap.frameworkDesc` i18n string that `app-campus-map.js` already shows in the exact same situation on its own page — reused verbatim via a new `<p id="map-college-framework-notice" data-i18n="campusMap.frameworkDesc" hidden>` in `map.html`, toggled by `switchToCollegeIndex`. **If a future task adds real entries to `data/campus-building-registry.js` for some college**, this Echo Map switcher will keep showing the "awaiting data" notice for it regardless — it does not check `getCampusBuildingRegistry(orgId).length` the way `app-campus-map.js` does, because building an actual point-marker/list renderer for that data shape (`{buildingId, name, category, coordinates:{lat,lng}}`, different from KMK's polygon-footprint `mapFootprint` shape) was out of scope for "just add a switcher." Whoever adds real data for another college next should also come back to `switchToCollegeIndex` in `echomap.js` and make the non-KMK branch check registry length like `app-campus-map.js` does, instead of always showing the empty state.
- **A real bug was found and fixed along the way, unrelated to the switching logic itself:** `.building-search{display:block}` and `.building-list{display:flex}` in `map.html`'s `<style>` block each set an explicit `display`, which — per normal CSS cascade (author styles beat the UA default `[hidden]{display:none}` when both target the same property) — meant setting `.hidden = true` on those two elements silently did nothing; they stayed visible. Caught this via screenshot showing the search box still rendered after `switchToCollegeIndex` set `hidden = true`, cross-checked with a DOM `.hidden` read in JS that correctly reported `true` (the attribute *was* set — it just had no visual effect). Fixed by adding `.building-search[hidden]{display:none}` / `.building-list[hidden]{display:none}`, the same pattern this file already uses for `.map-guide[hidden]` etc. **If any other element in `map.html` is ever toggled with `.hidden` and doesn't visually hide, check whether its class rule sets an explicit `display` — same bug, same fix.**
- H1 (`#map-title`, new id added this session) keeps its original `data-i18n="map.title"` attribute — I deliberately did NOT remove it. On a language change, `I18n.apply()` runs first (inside `I18n.setLanguage()`) and would reset the H1 back to the default KMK text; the existing `echo:languagechange` event then fires afterward (confirmed synchronous ordering — `apply()` is called before `dispatchEvent()` in `i18n/index.js`), and this session's new listener re-applies the correct per-college title right after. If someone ever changes that ordering in `i18n/index.js`, this H1 sync would silently break on language change — worth a quick check if `map.title`/`campusMap.title` ever look wrong after switching languages.
- Manually verified end-to-end (see CHANGELOG for the full list): default-KMK on load, forward/backward cycling, wraparound both directions, building list/footprints/search fully hidden off-KMK and fully restored on return (13 buildings), a KMK building click/preview/Opening-Hours/More-details/note-count all still work after a round trip away and back, dark theme, `zh` locale, and a **real** mobile viewport via a same-origin `<iframe width:390 height:844>` injected into a tab (see the previous two HANDOFF entries for why this technique is used instead of the broken `resize_window` tool in this environment — still broken this session too, same workaround applied).
- Next step: none requested. If a future task wants real building data for a second college, see the registry-length note above before touching `switchToCollegeIndex` again.

### Rollback

- Reverse the `echomap.js` hunk (delete `activeOrgIndex`/`fitActiveCollegeView`/`applyActiveCollegeChrome`/`switchToCollegeIndex` and their listener wiring; restore the original unconditional `map.flyToBounds(CAMPUS_BOUNDS, ...)` in the `fit-campus` click handler).
- Reverse the `map.html` hunks: remove the `.map-college-switcher*` CSS rules, the `.building-search[hidden]`/`.building-list[hidden]` fix (only if also reverting the switcher — that fix has no effect while nothing sets `.hidden` on those elements, so it's harmless to leave in place even if the switcher itself is reverted), the switcher markup in `.map-floating-controls`, the `#map-college-framework-notice` paragraph, the `id="map-title"` addition, and the `<script src="data/campus-map-config.js">` tag.
- Reverse the `style-core.css` hunk: remove `.map-college-switcher` from the dark-theme selector list (line ~192 in the current diff).
- Remove `map.previousCollege`/`map.nextCollege` from the three locale files.
- Nothing in `app-data.js`, `data/campus-map-config.js`, `data/campus-building-registry.js`, or `app-campus-map.js` was touched — no rollback needed there.

## 2026-08-20 — Building name alias now localized on the Building Detail page

- `data/campus-buildings.js` gained a generic, opt-in `localizedAlias: {zh, ms, en}` field on the building object (same shape as `description`/`purpose`/`specialNotes`) and two new global helpers right after `window.getLocalizedBuildingText`: `window.getBuildingCanonicalName(building)` (regex-strips a trailing `(...)` off `name`) and `window.getLocalizedBuildingDisplayName(building)` (canonical name + `getLocalizedBuildingText(building, 'localizedAlias')` for the current language, parenthesized — or just the canonical name if the building has no `localizedAlias`, never an empty `()`). Only `B_PUSTAKA` has `localizedAlias` populated right now (`{zh:"图书馆", ms:"Perpustakaan", en:"Library"}`) — it's the only building whose `name` currently contains a `(...)`.
- `app-place.js`'s `renderPlaceProfile()` H1 calls `window.getLocalizedBuildingDisplayName(building)` instead of rendering `building.name` directly. This is the only code-call-site change. The Wall CTA heading (`${building.name} Wall`) was deliberately left as-is — it still uses the raw name — since the task explicitly said not to touch Building Wall.
- **Important: `building.name` itself was deliberately NOT changed** (Pustaka's `name` is still the literal string `"Pustaka (Perpustakaan)"`). This was a considered choice, not an oversight — `echomap.js`'s building-search filter (`renderBuildingList`) matches typed queries against the raw `building.name` string, and stripping the Malay parenthetical out of the canonical data would have silently broken searching for "perpustakaan" in the Echo Map sidebar, which nothing in this task asked to fix. If a future task wants the raw `name` field itself cleaned up (moving the canonical name to be `name`-only everywhere, including the map sidebar and search), that's a separate, larger change — search behavior and `tags.ms` coverage need to be checked together at that point, not done as a quick follow-on.
- Echo Map (`echomap.js`) needed **zero changes**. Its preview-card heading was already using `getBuildingNameParts(building.name).displayName` (a local, map-only parser, unrelated to the new shared helpers) which already discarded any `(...)` suffix before this session — so it never displayed the Malay alias to begin with, and there was no inconsistency to fix. Verified this by browser testing: the map sidebar and preview card show the exact same text as before this change.
- Language-switch re-render is not new plumbing — it reuses the existing `window.addEventListener("echo:languagechange", () => { I18n.apply(); render(); ... })` in `app-router.js`, which already re-invokes `renderPlaceProfile()` on every language change. Verified live in-browser (EN→BM→ZH via the navbar language menu, no reload) that the H1 updates instantly.
- Next step: none requested. If another building later needs a localized alias (e.g. if more `Name (Something)` buildings are added), just add `localizedAlias: {zh, ms, en}` to that building's object in `data/campus-buildings.js` — the helper is already fully generic, no code change needed.

### Rollback

- Remove `localizedAlias` from `B_PUSTAKA`'s object, remove `window.getBuildingCanonicalName`/`window.getLocalizedBuildingDisplayName` from `data/campus-buildings.js`, and revert the single H1 line in `app-place.js`'s `renderPlaceProfile()` back to `${escapeHtml(building.name)}`. Nothing else changed this session.

## 2026-08-20 — Building Detail page: mobile photo-first order

- On the Building Detail page (`#/place/:placeId`), mobile/tablet (≤980px) now visually shows the Photo Gallery (or `.building-overview` no-photo fallback) before the Building Information card. This is CSS-only: `.place-profile-media{order:1}`, `.building-overview{order:1}`, `.place-profile-copy{order:2}` added inside the existing `@media(max-width:980px)` block in `style-core.css`. `.place-profile-hero` (the CSS Grid parent) and the DOM order in `app-place.js` were **not** changed — the photo markup still comes after the copy markup in the HTML, `order` just changes paint order. No JS file was touched this session.
- Desktop (≥981px) is completely untouched — same fixed-viewport + internal-card-scroll behavior from the immediately preceding session, same left/right column layout, same photo gallery.
- **Testing tooling note for future sessions:** the `resize_window` tool reports success but does not actually change `window.innerWidth` in this environment (confirmed failing identically across four consecutive sessions now). This session worked around it by injecting a same-origin `<iframe style="width:390px;height:844px">` pointing at `http://localhost:8000/index.html#/place/...` into a normal tab via `javascript_tool`, then screenshotting — CSS media queries evaluate against the iframe's own viewport, so this gives a **genuinely rendered** mobile layout, not a simulation. Use this technique directly next time instead of re-attempting `resize_window` — it removes the "not visually verified: mobile" caveat that appeared in the previous two sessions' reports. Caveats: (1) synthetic `element.click()` on the gallery carousel arrows can leave the `scroll-snap`+`smooth-scroll` track in a stuck mid-transition state inside the iframe — use the `computer` tool's real `left_click` with computed screen coordinates instead, which works correctly; (2) `iframe.contentWindow.scrollTo(x,y)` without `behavior:'instant'` inherits the page's global `html{scroll-behavior:smooth}` and won't be synchronously reflected — pass `{behavior:'instant'}` and await a short delay before reading `scrollY`/coordinates; (3) writing to the outer page's `localStorage` before setting `iframe.src` does not reliably propagate before the iframe's inline theme-init script runs — call `iframe.contentWindow.ThemeService.setTheme(...)` / `iframe.contentWindow.I18n.setLanguage(...)` directly on the *current* iframe document instead.
- Verified: multi-photo (Astaka — carousel arrow + counter work post-reorder), single-photo (Pustaka), no-photo fallback (Seri Laka); natural whole-page scroll reaching the Wall CTA; existing container left/right padding preserved around the photo (not edge-to-edge); Dark+zh, Light+en, Light+BM all correct. Desktop re-confirmed unaffected (BM+Light) in the same session.
- Next step: none requested. If mobile layout is revisited again, note in CHANGELOG/HANDOFF this is now a stable, tested state — re-read this entry before changing `@media(max-width:980px)` `.place-profile*` rules again.

### Rollback

- Remove the three `order` declarations added to the `@media(max-width:980px)` block in `style-core.css` (`.place-profile-media{order:1}`, `.building-overview{order:1}`, `.place-profile-copy{order:2}`) to restore the previous mobile order (Information card, then photo). Nothing else changed this session — no JS, data, router, or desktop CSS to revert.

## 2026-08-20 — Building Detail page: viewport-locked desktop layout, internal card scroll

- Desktop (≥981px) Building Detail (`#/place/:placeId`) is a locked-viewport layout again: `body:has(.place-profile)` and `#app:has(.place-profile)` get `overflow:hidden`/`height:100dvh` inside a `@media(min-width:981px)` block near the end of `.place-profile*` in `style-core.css`. Only `.place-profile-copy` (the left Building Information card) scrolls — `overflow-y:auto; overflow-x:hidden; scrollbar-gutter:stable`. The header, "← Back to buildings", both column positions, and the right-hand Photo Gallery never move.
- This is the third change to this exact layout across three sessions — read this before touching `.place-profile*` CSS again: (1) originally single-screen + `overflow:hidden` that silently clipped content when it grew (2026-07-27 baseline); (2) one session ago, changed to whole-page natural scroll so the newly-added Purpose/Hours/Notes/Events/Echoes sections wouldn't be clipped; (3) this session, changed to what the user actually wanted — page still locked to viewport, but the left card scrolls internally instead of clipping. **Do not go back to (1) or (2)** — (2) is what this session just replaced because the user explicitly wants desktop to not have a page-level scrollbar.
- The `@media(max-width:980px)` block and the base (mobile-first) `.place-profile*` rules were **not touched in this session** — mobile/tablet keeps natural whole-page scroll with the two columns stacked in a single column, unchanged since the previous stage.
- The right column's own sizing was **not touched**: `.building-gallery-track{aspect-ratio:4/3}` and `.place-profile-media .building-gallery{max-width:min(100%,calc(133.333dvh - 280px))}` are exactly as before. Verified in-browser via `getBoundingClientRect()` that width/height/4:3-ratio and screen position don't change while the left card is scrolled. `.place-profile-media{overflow:hidden}` was re-added inside the new desktop media block (needed once the row has a bounded height again) — this does not clip the gallery, since the gallery is already sized to fit within that box by its own max-width formula.
- `.place-profile-hero{align-items:stretch}` is back for desktop (was `start` in the previous stage). This is intentional and required: `stretch` makes the no-photo SVG-outline fallback (`.building-overview`) fill the full column height again (matches the pre-existing look), and does **not** distort the photo gallery, because the gallery's own width/height is already fully determined by its aspect-ratio + the viewport-height-based max-width formula — `align-items` only affects how much vertical space its *container* (`.place-profile-media`, `display:grid;place-items:center`) gets, and the gallery just centers within whatever space it's given.
- Manually verified (see CHANGELOG for the full list): page has zero scroll (`body.scrollHeight === body.clientHeight`), card has internal scroll and reaches the Wall CTA, photo position/size confirmed unchanged via `getBoundingClientRect()`, multi-photo carousel arrows still work after scrolling (Astaka), no-photo fallback still fills its column (Seri Laka), dark theme confirmed, `#/places` directory page confirmed unaffected by the `:has()` scoping.
- **Not verified: real mobile/narrow-viewport rendering.** Same tooling limitation as the previous two sessions — the available browser-resize automation does not actually change `window.innerWidth` in this environment. Verified only that the CSS breakpoints (`min-width:981px` / `max-width:980px`) don't overlap or leave a gap. If a future session has working viewport-resize tooling, this is the first thing to actually check.
- Next step: none requested beyond this. If asked to revisit layout again, re-read this entry first — three back-and-forth layout changes on the same file in three sessions means the next request should be read very literally before touching `.place-profile*` again.

### Rollback

- Reverse only the `@media(min-width:981px)` block added after `.place-wall-entry` in `style-core.css` (restore `.place-profile{min-height:calc(100dvh - 68px);padding:20px 0 24px;display:block}`, `.place-profile-hero{align-items:start}`, no `overflow:hidden`/`overflow-y:auto` overrides — i.e. the previous stage's whole-page-scroll state) to go back to "whole page scrolls". Do not restore the original (2026-07-27) `overflow:hidden` version — that clips the new content sections, which is the bug two stages of this feature already fixed.
- No JS, data, or router changes were made this session, so nothing else needs reverting.

## 2026-08-20 — Building Detail page: Purpose, Opening Hours, Special Notes, Events, Building Echoes

- Building Detail ("More details") is `#/place/:placeId`, rendered by `renderPlaceProfile()` in `app-place.js`. The Echo Map card's "More details →" button (`echomap.js`, `#place-preview-more`) now does `location.href = 'index.html#/place/' + placeId` to reach it — no router change, no map-return snapshot involved (that mechanism is only for the "Enter this building wall" flow).
- Left-column field order is now: icon → name → description → Purpose → Opening Hours (status line + always-expanded weekly table) → Special Notes → Current Events → Upcoming Events → Building Echoes (note count) → "Enter this building wall" CTA (still last). Each of the six new blocks is its own `<section class="place-profile-section">` with a small uppercase heading and a top border — see `renderBuildingPurposeSection` / `renderBuildingHoursSection` / `renderBuildingSpecialNotesSection` / `renderBuildingEventsSection` / `renderBuildingEchoesSection` in `app-place.js`.
- **Opening Hours is a single shared data source now.** `data/campus-building-hours.js` holds `window.CAMPUS_BUILDING_HOURS` (the per-building weekly/24h/unavailable schedule, unchanged from the previous stage) plus a new `window.BuildingHours` API (`getSnapshot(buildingId, now)`, `formatStatusLine(snapshot)`, `formatTime`, `weekdayKeys`). Both `echomap.js` (map card) and `app-place.js` (detail page) call this same API — do not add a second hours implementation. The file is now loaded on both `map.html` and `index.html` (added right after `data/campus-buildings.js` in each). `renderBuildingHoursSection` in `app-place.js` guards with `if (!window.BuildingHours) return ''` — during testing, a stale-cached `index.html` (missing the new `<script>` tag) threw and blanked the whole page before this guard was added; keep the guard.
- **Purpose / Special Notes are plain data fields, not a second content system.** Added directly to the relevant building objects in `data/campus-buildings.js` as `purpose`/`specialNotes`, localized `{zh, ms, en}` exactly like the existing `description` field, read via the existing `window.getLocalizedBuildingText`. Only 14 buildings have this data (the ones `KMK_Building_Facility_Source_Summary_EchoWall.docx` gives clear text for): `B_MASJID, B_SERAMBI, B_DEWAN_KULIAH, B_BLOK_TUTORAN_MAKMAL, B_LANGKASUKA, B_DEWAN_MAHAWANGSA, B_PUSTAKA, B_KAFETERIA_A, B_KAFETERIA_B, B_KAFETERIA_C, B_KAFETERIA_PENTADBIRAN, B_SERI_PALAS, B_SERI_TEMIN, B_SERI_LAKA`. Every other building (all sports courts, `B_ASTAKA`, `B_TENNIS_NW`, `B_BASKETBALL_NW`, `B_PADANG_UTAMA`, `B_SERI_JERAI`, all academic/service buildings outside the 14) has **no** `purpose`/`specialNotes` fields — nothing was guessed for them. `renderBuildingPurposeSection` returns `''` (section hidden) when `purpose` is absent; `renderBuildingSpecialNotesSection` always renders, falling back to "No special notes available." when `specialNotes` is absent.
- **Events are an empty-state-only data hook**, not a built feature. `getBuildingEvents(building, status)` in `app-place.js` reads an optional `building.events` array filtered by `status` (`'happening-now' | 'upcoming' | 'past'`, matching the `{id, buildingId, eventName, date, startTime, endTime, description, photo, status}` shape from the request). No building currently has an `events` field, so Current/Upcoming Events always show "No current events." / "No upcoming events." on every building today. There is no event submission UI, no backend, no moderation — do not build that from this hook without a separate approved stage.
- **Desktop layout was changed from a fixed single-screen constraint to natural scroll — this is the key risk area to re-check if `.place-profile*` CSS is touched again.** `style-core.css`: `.place-profile` was `height:calc(100dvh-68px); overflow:hidden` (page-locked to one screen, `body:has(.place-profile){overflow-y:hidden}`); it is now `min-height:calc(100dvh-68px)` with natural block flow, and that `body:has()`/`#app:has()` overflow-lock rule plus the `(min-width:981px) and (max-height:700px)` "shrink text/padding to fit" media query were both removed (they existed specifically to fight the single-screen constraint, which no longer exists). `.place-profile-hero` changed `align-items:stretch` → `start`, so the right column no longer stretches to match the left column's height.
- **The photo gallery itself was deliberately NOT touched.** `.building-gallery-track{aspect-ratio:4/3}` and `.place-profile-media .building-gallery{max-width:min(100%,calc(133.333dvh - 280px))}` are unchanged — that width formula depends only on viewport height, not on the (now-variable) left-column height, so the gallery renders pixel-identical to before at any given viewport size regardless of how much left-column content there is. The no-photo SVG-outline fallback (`.building-overview`) previously relied on the removed `height:100%`/stretch behaviour and would have collapsed to zero height under the new `align-items:start` — it was given its own `aspect-ratio:4/3` so it keeps a sane size. This was a required consequence of the layout fix, not a redesign of the photo/gallery system.
- Manually verified: Masjid, Pustaka, Kafeteria A/B, Astaka, Seri Laka — see CHANGELOG for the full list of what was checked (router, dark theme, zh locale, wall CTA, back button). **Not verified: mobile/narrow viewport** — the browser automation available this session could not resize the actual viewport (`resize_window` reported success but `window.innerWidth` never changed), so mobile stacking and the photo ratio at narrow widths were reasoned about from the existing (unmodified) `@media(max-width:980px)` rules, not seen rendered. This should be the first thing checked in the next session before calling this stage fully done.
- Known limitation: the "Opening hours not applicable" state described in the request (e.g. for dormitories) was not implemented — none of the current 19 buildings in `CAMPUS_BUILDING_HOURS` map to that case (the three residence blocks have a real "24h, residents only" entry instead), so no code path for it exists yet.
- Next step, if requested: mobile visual verification in a real viewport; then, only if asked, building out an actual Events data source/backend (the UI hook already exists) or extending Purpose/Special Notes coverage to more buildings from the same docx source.

### Rollback

- Reverse only the 2026-08-20 hunks: the six `renderBuilding*Section`/`getBuildingEvents` functions and the `detailSections` wiring in `renderPlaceProfile()` (`app-place.js`); the `moreDetailsButton` click handler in `openPlacePreview()` (`echomap.js`); the `window.BuildingHours` block appended to `data/campus-building-hours.js`; the `purpose`/`specialNotes` fields added to the 14 building objects in `data/campus-buildings.js`; the `<script src="data/campus-building-hours.js">` tag added to `index.html`; the `place.*` i18n keys added to the three locale files; and the `.place-profile*`/`.building-overview` CSS hunks in `style-core.css` (restore `height:calc(100dvh - 68px)`, `overflow:hidden`, `align-items:stretch`, the `body:has()/#app:has()` overflow lock, and the `(min-width:981px) and (max-height:700px)` media query). Do not restore whole files — the working tree has overlapping uncommitted work.
- No LocalStorage keys, note schema, or the `#/place/:placeId` route itself changed, so no data migration is needed.

## 2026-08-20 — Echo Map building card: opening hours + More details entry

- Added two rows below the building description in the Echo Map right-side building card (`echomap.js` `openPlacePreview`, rendered inside `#place-preview`): an expandable "Opening Hours" row and a static "More details →" entry row. Card layout, sizing, visual style, `Visible Notes` position and `Enter this building wall` behaviour are unchanged.
- New data file `data/campus-building-hours.js` (loaded in `map.html` right after `data/campus-buildings.js`, before `echomap.js`) holds a structured weekly schedule (`window.CAMPUS_BUILDING_HOURS`, keyed by building id, `Date.getDay()` 0=Sunday) for the 19 buildings in `PREVIEW_PLACE_IDS`. Pustaka uses the docx source's precise Sun–Thu 8:00am–4:30pm / closed Fri–Sat schedule (matches the user's own worked example of "Closes 4:30 PM"); other buildings reuse the existing `campus-buildings.js` `hours` text where it gives an unambiguous day range, or are marked `mode:"unavailable"` when the source is event-dependent or says to check current hours (`B_DEWAN_MAHAWANGSA`, `B_KAFETERIA_PENTADBIRAN`) — nothing was guessed.
- `echomap.js` gained `getBuildingHoursSnapshot`, `buildHoursStatusLine`, `buildHoursMarkup`, `formatHoursTime`, `hoursToMinutes` (all local closures inside the `DOMContentLoaded` handler, same pattern as the existing helpers). Status is computed from `new Date()` at render time — open/closed/opens-at/closes-at, 24h, or unavailable.
- New i18n keys: `map.hours.*`, `map.weekday.*`, `map.moreDetails` in `i18n/locales/{en,ms,zh}.js`. The Chinese `opensOnDay` template deliberately orders `{day} {time}` (day-first) rather than mirroring the English `{time} {day}` order.
- The "More details" row (`#place-preview-more`) intentionally has no click handler — it is an entry point only, per this stage's scope; its destination screen is a separate future task.
- Manually verified in-browser (`python -m http.server 8000`, `map.html`): Pustaka expand/collapse and the Sun–Sat table, Masjid (24h), Seri Palas (24h + residents-only note), Dewan Mahawangsa (unavailable), dark theme, and `zh` locale. `node --check` passed on all touched `.js` files. Mobile-width (≤620px) was not visually re-verified this session (browser window-resize automation did not take effect); the new rows only use `width:100%` / relative units consistent with the existing `.place-preview-*` rules, so the existing `@media(max-width:620px)` block needed no changes.

### Rollback

- Reverse only the 2026-08-20 hunks: the `.place-preview-hours*` / `.place-preview-more-row` CSS block in `map.html`'s inline `<style>`, the `<script src="data/campus-building-hours.js">` tag in `map.html`, the `WEEKDAY_KEYS`/`hoursToMinutes`/`formatHoursTime`/`getBuildingHoursSnapshot`/`buildHoursStatusLine`/`buildHoursMarkup` functions and the `hoursMarkup`/`moreDetailsMarkup`/hours-toggle-listener additions inside `openPlacePreview` in `echomap.js`, the new `map.hours.*`/`map.weekday.*`/`map.moreDetails` keys in the three locale files, and delete `data/campus-building-hours.js`. Do not restore whole files — the working tree has overlapping uncommitted work.
- No LocalStorage keys, note schema, routes or existing `.place-preview-*` markup were touched, so no data migration or cleanup is needed on rollback.

## 2026-07-27 — Accepted building photo directory and profile baseline

- Building directory ordering is computed inside `renderPlaceDirectory()` from a stable decorated copy. `B_MASJID` is always first, other records with a non-empty `photos` array follow, and records without photos remain last; original order is preserved inside both groups.
- `renderPlaceProfile()` conditionally renders one right-hand media surface: a 4:3 photo gallery for photo-backed buildings or the existing bird's-eye outline for buildings without photos.
- Multi-photo galleries keep internal horizontal scroll-snap, previous/next controls and a `1/N` counter. Single-photo galleries have no controls or counter. A failed photo reveals the building outline fallback.
- Desktop profiles occupy the available viewport below the navbar and suppress page-level scrolling. The left card retains the building name, clamped description, runtime visible-note count and building-wall action. At mobile widths the layout becomes a natural vertical page.
- Building IDs, photo paths, map data, runtime note filtering, wall navigation, seed data and LocalStorage structures were not changed by the accepted layout task.
- Manual acceptance is complete. Focused renderer assertions, `node --check app-place.js` and `git diff --check` passed; no new test framework was introduced.

### Rollback

- Reverse only the 2026-07-27 ordering and profile-layout hunks in `app-place.js` and `style-core.css`; do not restore either complete file because the working tree contains overlapping user changes.
- Restore direct source-order rendering in `renderPlaceDirectory()`, move the gallery out of the right-hand conditional media surface, and restore the prior profile height/overflow rules only if the accepted layout must be withdrawn.
- Do not delete `photos` metadata or `assets/buildings/` files as part of this layout rollback; the earlier accepted photo import is a separate change. No LocalStorage cleanup or data migration is required.

## KMK assistant

- `services/ai-assistant.js` provides the visible chat panel and local KMK building-guide fallback.
- The assistant uses only `CAMPUS_BUILDINGS` public information until a BISHENG endpoint is configured in `config/app-config.js`.
- Do not add private credentials to frontend configuration. Keep BISHENG behind the existing backend bridge.
- The `database/` directory is the KMK public knowledge-base import pack for BISHENG; it should be ingested by the backend, not exposed as private browser data.
- The assistant deliberately shows a short typing state for local responses and remains in that state for the duration of a configured remote AI request.

Version: `pustaka-map-pilot-2026-07-14`

## 2026-07-20 — Verified community navigation baseline

- The current community route is `#/wall/:orgId/:majorId`, and the organization page now asks only for a major or stream.
- A legacy `#/wall/:orgId/:batchId/:majorId` link discards its middle Batch value and uses `history.replaceState` to become the current route without adding history, looping or rendering an intermediate error page.
- Community-wall filtering requires `contextType === "community"` plus matching `orgId` and `majorId`; `batchId` and community wall keys do not participate in display filtering.
- `batchId` remains in the note schema as optional legacy metadata. Existing values are preserved, new community notes store `batchId:null`, and the `batches` array remains available for compatibility. No optional legacy Batch metadata label was added.
- New community notes use `community:${orgId}:${majorId}`. Old community wall keys remain untouched and continue to work because legacy notes are matched by context, organization and major rather than an exact wall-key comparison.
- Building walls remain independently routed through `#/place/:placeId/wall`; their `building:${placeId}` wall keys, `placeId` flow and map integration must remain isolated from community navigation changes.
- This remains a LocalStorage prototype. No database, backend or stored-note migration was introduced.
- Static, isolated and user browser acceptance passed, including legacy-route replacement, cross-Batch merging, posting/reload, three languages, building/map regression and Console checks.
- Because the working tree contains overlapping uncommitted work, rollback must reverse only the focused community-route, wall filtering/publishing, nullable-Batch normalization and locale/documentation hunks. Do not restore entire files.

## Completed

- Preserved original static architecture.
- Added building directory, profile and dedicated wall routes.
- Added popular-note building overview.
- Added local prototype registration and login gate for posting.
- Added anonymous/named posting for authenticated users.
- Added note position selection, more shapes and photo crop controls.
- Added three-language UI framework and user-note translation adapter.
- Added light/dark/system theme.
- Added Cloudinary and BISHENG adapters.
- Left map region redesign deferred.
- Connected a transparent, hover-highlighted `B_PUSTAKA` building footprint to the localized, scroll-safe right-side preview and existing dedicated building wall; no permanent building icon is shown.
- Standardized functional-zone selection: no default overlays, one selected border/name at a time, explicit clearing paths and event isolation from building/free-location clicks.
- Removed direct map-note creation and login prompts while preserving existing `echowall_map_notes` records as read-only historical markers.

## Important limitations

- Local auth is not secure enough for public deployment.
- Translation requires an endpoint.
- Cloudinary requires a backend signature endpoint.
- BISHENG requires the group member's endpoint and credentials strategy.
- The Pustaka click area is a lightweight static footprint snapshot, not a surveyed navigation layer; its Digital Twin OSM reference is source-derived and unverified.
- The in-app browser list was empty in this session, so real desktop/390px clicks, wall return, refresh/history and Console validation remain manual.
- `tinycss2` was not installed; CSS brace structure passed, but a new full parser run was not claimed.

## Do not modify without a separate approved stage

- Existing community hierarchy.
- Existing zone IDs and Leaflet bounds coordinates.
- Existing admin prototype authentication.
- Existing colleges, batches and majors.

## Next approved stage

Complete the manual desktop/390px acceptance steps for the Pustaka preview, single-zone selector, read-only historical markers and no-action map-background clicks. Do not extend map clicks to another building or redesign GIS data without a separately approved stage.

## Portable demo handoff — 2026-07-28

The portable demo bundle is complete: 788 demo notes across 17 walls, with KMK community walls at 73/62/65. Seed notes remain runtime-only and are not written to LocalStorage. The classic-script global is loaded before `app-data.js`; route changes reuse the ready runtime snapshot and do not merge it again. A fetch of `data/demo-seed-showcase.v1.json` remains only as a development fallback when the global bundle is absent.

Artifact: `EchoWall-portable-demo-v1.zip` (6,179,795 bytes). It excludes `.git`, docs archives, temporary directories and itself.

Manual `file://` acceptance still required: open `index.html`, confirm all 788 notes and the three KMK wall counts, refresh and switch routes without count growth, verify existing LocalStorage user notes remain separate and persistent, open `map.html`, check browser Console, and verify desktop/mobile layout. Leaflet and web fonts remain external HTTPS dependencies, so map rendering/fonts should also be checked with and without network access.
## Reduced KMK demo seed handoff — 2026-07-29

KMK now contains 108 runtime-only demo notes: 73 Sains, 25 Akaun and 10 Sains Komputer. The combined bundle contains 696 unique notes and preserves all 588 showcase notes. Retained KMK distribution is 65 MS, 30 EN and 13 ZH, with 60 named and 48 anonymous notes. The portable ZIP was rebuilt at `EchoWall-portable-demo-v1.zip` (6,166,270 bytes).

Manual preview: check `#/wall/1/1`, `#/wall/1/2` and `#/wall/1/3`, refresh and switch routes without count growth, and confirm LocalStorage user notes remain separate from runtime seed notes.

## Portable demo refresh handoff — 2026-08-01

The current working-tree runtime was packaged byte-for-byte into `EchoWall-portable-demo-v1.zip`: 50 files, 6,172,172 bytes, SHA-256 `3BAA8C6897FE86EF9860217F74FA0A038A7A66F51DA7EBAC7364250A6E7671A6`. It contains 696 runtime-only demo notes across 17 walls; KMK is 73/25/10 and Pustaka has 42 notes. Loading the bundled seed twice remained at 696 and made zero LocalStorage writes.

HTTP checks passed for the home page, all three KMK wall URLs, the Pustaka building wall URL, `map.html`, the Pustaka image, the seed bundle and the local AI adapter. All 16 building photos returned 200 with their original byte lengths. The local rule-based AI answered a library query with external-model mode disabled and rejected a sensitive password query.

Archive scans found no `.git`, `docs`, logs, nested ZIP, drive path, `localhost` reference or common real-secret pattern. The Pages workflow remains tracked and unchanged. Automated browser rendering was unavailable, so desktop/mobile appearance, browser Console state and interaction-level refresh behavior still need one manual preview before publishing.
# STUDY NOTES V2 — FINAL STATE

Status: **COMPLETE — real Chrome browser acceptance passed** (2026-08-22). The in-app browser
bridge (`mcp__claude-in-chrome`), previously unavailable, connected successfully this session. Every
item below marked "Not verified"/BLOCKED in earlier handoffs has been independently exercised in a
real, running Chrome browser against `http://localhost:8000` and passed. No Study application
source was changed to reach this result — see
`study v2/reports/REPORT_STUDY-V2-008.md` and `study v2/reports/REPORT_STUDY-V2-FINAL-QA.md` for
the full real-browser evidence (Browse/Search/Filter, Upload→Pending→Approve/Reject→Publish,
SHA-256 exact-duplicate blocking, Question↔Scheme, Guest/Student/Admin permissions, Light/Dark,
EN/BM/ZH, and a full non-Study regression smoke test).

- **IA:** Home → Study Notes → Jurusan → Semester → Subject → Resource Detail; `sourceCollege` is metadata/filter only, never the browse hierarchy.
- **Built-ins:** 2,468 manifest records; 377 built-in demo files currently exist under `assets/study-files/` and all referenced demo URLs resolve on disk (real Open-PDF confirmed in-browser).
- **Search/filter:** subject-code/title/topic/year search; category, subtype, year, source, sort, clear filters; load-more and ~200ms debounce — all re-verified live.
- **Upload architecture:** PDF-only submissions enter Pending/Unverified and are SHA-256 duplicate checked. Pending/rejected/manual_review/duplicate records cannot enter public browse/search/detail — reconfirmed live with a real uploaded PDF and a real registered student account.
- **Storage:** `StudyUploadService` stores metadata and PDF Blob separately in IndexedDB (`echowall-study-uploads-v1`); never LocalStorage/base64. Confirmed both the pending-file `Open file` action (admin) and the approved-file public Open action resolve to real `blob:` URLs.
- **Moderation:** `#/admin` Study queue is Global Admin only; approve/reject, metadata Save & Approve and verification states are service backed. Approve does not grant `verified_file` (reconfirmed: a freshly approved record showed `Unverified` until the admin explicitly changed it). The Reject form is visually confirmed full-card-width (`grid-column:1/-1`), not the previously unverified 72px thumbnail column.
- **Publication/file opening:** the resource service overlays approved uploads over the frozen built-in manifest. Upload PDFs resolve through `indexeddb://` then an object URL; built-ins use the demo-file resolver.
- **Question/Scheme:** built-in pairs and own-user upload pairs use related IDs; service regression covers the latter bidirectionally, and this was also followed live in-browser both for a built-in pair and for a real approved user-upload linked to a built-in Question.
- **Permissions/invariants:** Guest/Student cannot mutate moderation, and cannot even reach `#/admin` — reconfirmed live with three distinct real accounts (guest/signed-out, `role:"user"`, `role:"admin"`). All actual authorization remains prototype frontend-only and needs server enforcement in production.
- **Known limitations:** IndexedDB submissions are browser/profile-local; no cross-tab reactive sync. Mobile 390–430px viewport rendering was **not** live-verified this session — the `resize_window` browser tool does not actually change `window.innerWidth` in this environment (confirmed by reading it back after the call). Structural mobile CSS breakpoints (`@media (max-width:720px)` in `style-study.css`, `@media (max-width:1100px)`/`(max-width:760px)` in `style-admin.css`) were confirmed present in source instead. If a future session gets a working device-emulation path, that is the one remaining real-device gap to close.
- **Regression:** `node scripts/test-study-upload.mjs` (49/49, re-run after the browser pass). Targeted runtime source syntax checks pass. The literal all-`.js` repository scan is polluted by an unrelated checkpoint HTML fragment with a `.js` extension; exclude archival checkpoint snapshot directories when checking runnable sources.

Reports: `study v2/reports/REPORT_STUDY-V2-008.md` and `study v2/reports/REPORT_STUDY-V2-FINAL-QA.md` (both now PASS). Checkpoints include pre-state, rollback notes, and source snapshots.

## Next session starting point

Study Notes V2 (STUDY-V2-003 through FINAL-QA) is complete and browser-accepted. Do not start a new
Study Notes stage unless the user explicitly asks for one. If a new session needs to interact with
the app in a real browser, the `mcp__claude-in-chrome` bridge worked in this session — try it before
assuming it is unavailable.
