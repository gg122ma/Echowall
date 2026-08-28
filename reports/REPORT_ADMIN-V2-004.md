# REPORT — ADMIN-V2-004: Moderation Actions + Audit Trail

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-004/PRE_STATE.md` and `ROLLBACK.md`.

## Scope

Built on the locked ADMIN-V2-001/001A/002/002A/003/003A baseline (none of those files' contracts
were changed, only extended). ADMIN-V2-005 (College Admin workspace), 006 (Study reconciliation),
007 (Admin Management), 008 (Moderation Assist) were explicitly NOT started.

## What was built

1. **`services/admin-audit-service.js`** (new) — `AuditAction` CRUD: `id/actorUserId/actorEmail/
   action/targetType/targetId/scopeType/scopeId/beforeSnapshot/afterSnapshot/reason/createdAt`.
   Provider-swappable (`ready()`/`subscribe()`/`useProvider()`, matching every other service in
   this app). Reads are scope-gated exactly like `ModerationService` (including the `canModerateMap`
   map_note special-case from ADMIN-V2-003A), plus an `AUDIT_READ_ALL` short-circuit for a future
   non-Super-Admin grant.
2. **Reason enforcement, at the service layer, not just the UI**: `ModerationService.
   updateModerationStatus()` throws BEFORE mutating if a `hidden`/`rejected`/`escalated` transition
   has no reason. `AdminAuditService.createAuditAction()` independently throws for the same 3
   actions — defense in depth, matching the spec's "Service 层也必须验证".
3. **Community + Map Hide/Delete rewired**: previously these mutated `notes`/`MapNoteService`
   directly with zero reason capture (Delete used a native `confirm()`; Hide had none at all). Now
   both go through a new shared reason-prompt overlay (`app-admin.js`'s `adminOpenReasonPrompt`) —
   Hide requires a reason, Delete's reason is optional (replaces the native `confirm()`, which also
   removes a real risk: native dialogs block all further page events). Every Hide/Restore/Delete now
   produces an `AuditAction`.
4. **Delete policy**: unchanged public semantics — Community/Map Delete remain HARD,
   irreversible deletes (not silently converted to soft-delete). What changed: confirmation is now
   the reason-prompt overlay instead of `confirm()`, and every deletion produces an `AuditAction`
   with `afterSnapshot: { deleted: true, irreversible: true }` captured before the content is gone.
5. **Study**: `approveSubmission`/`rejectSubmission`/`setVerification` now each produce a unified
   `AuditAction` — via the existing `ModerationService` mirror when a mirrored `ModerationItem`
   exists, or directly (`logStudyAuditAction`) as a fallback when it doesn't (pre-002 submissions, or
   a mirror failure) — exactly one `AuditAction` per real action, never zero, never two.
   `rejectSubmission`'s pre-existing reason requirement (`rejectReasonRequired`, unmodified) already
   satisfied the spec here.
6. **Escalate**: did not exist anywhere in the UI before this stage. Added as a button on Dashboard
   Queue rows — deliberately the ONLY status-changing action the Dashboard performs directly against
   `ModerationService.updateModerationStatus`. Approve/Reject/Hide were deliberately NOT added as
   generic Dashboard buttons (see "Deliberate scope decision" below).
7. **Audit UI**: new "Audit" tab in `#/admin`, gated the same as Overview/Queue/Reports/History
   (any active RoleAssignment) — the SCOPE gate happens inside `AdminAuditService.listAuditActions`
   itself, same pattern as every other Dashboard view. Filters: Scope, Target type, Action, Actor
   (text search on email/id), Date range (From/To).

## Deliberate scope decision: no generic Dashboard Approve/Reject/Hide

Community/Map/Study's real moderation actions live in their own workspace and mutate their own
storage (`notes`/`MapNoteService`/`StudyUploadService`) directly — `ModerationItem.status` is a
separate, parallel field that nothing before this stage kept synchronized for Community/Map (Study
already had a best-effort mirror). Adding a generic "Approve"/"Reject"/"Hide" button on the
Dashboard that only calls `ModerationService.updateModerationStatus()` would flip the *queue's*
status label without touching the *real* content visibility — the exact "Old Map Admin tab allowed
it, Unified Queue disagreed" class of bug ADMIN-V2-003A fixed for Map permissions, reintroduced as
a content-state bug instead. Escalate is safe because it has no corresponding real-content-state
equivalent to diverge from. This is not an oversight; full Community/Map ModerationItem
reconciliation is out of this stage's scope (Study's own reconciliation is ADMIN-V2-006's explicit
job) and was not attempted here.

## Real bugs found and fixed during this stage's own testing

- **`services/admin-permission-service.js`'s `canModerateMap` regression** — caught by the
  *existing* moderation-schema suite immediately after the first draft (a `COLLEGE_ADMIN` lost Map
  access) — not relevant to 004 directly but re-verified unchanged this stage (85/109/52 still
  green throughout).
- **`adminSetSource('audit')` silently no-op'd** — `app-admin.js` has TWO separate
  `sourceType` whitelists (the outer gate in `renderAdmin()`, and a second one inside
  `adminSetSource()` itself); the Audit sidebar link and `renderAdmin()`'s dispatch were added to
  the first, but `adminSetSource()`'s own array was missed. Caught live in the browser — clicking
  "Audit" did nothing. Fixed by adding `"audit"` to both.
- **`beforeSnapshot.isHidden` losing information via `JSON.stringify`'s undefined-drop behavior** —
  `note.isHidden` is `undefined` (not `false`) on notes that were never explicitly toggled, so
  `{isHidden: note.isHidden}` serialized to `{}` (JSON drops `undefined`-valued keys), making the
  Audit view show "Before: —" instead of "Before: isHidden: false". Fixed by coercing with
  `Boolean(...)` at all 4 snapshot call sites in `app-admin.js`.
- **Stale browser cache masking both of the above during QA** — `location.reload(true)` did not
  reliably bypass Chrome's disk cache for the CSS/JS files in this `python -m http.server`
  environment; confirmed via `fetch(url, {cache:'no-store'})` and cache-busting `?cb=` query params
  on `<link>`/reload. Documented here so a future session doesn't mistake a caching artifact for a
  real bug (or vice versa).

## Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (unchanged from 003A)
- `node scripts/test-admin-moderation-schema.mjs` — **109 passed, 0 failed** (was 105; +4 new
  reason-required assertions)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (unchanged from 003A; existing
  escalate fixture call updated to pass a reason)
- `node scripts/test-study-upload.mjs` — **54 passed, 0 failed** (was 49; sandbox now loads the
  real ModerationService + AdminAuditService — previously silently no-op'd — +5 new assertions
  proving the real integration, not just that nothing crashes)
- `node scripts/test-admin-audit.mjs` — **58 passed, 0 failed** (new file): reason
  required/denied for reject/hide/escalate, restore/approve reason-optional, beforeSnapshot/
  afterSnapshot/actor/scope/createdAt shape, Map delete irreversible-flag, scope isolation (Super
  Admin sees all; Global Moderator sees global + is denied KMK/KMPP; KMK/KMPP admins see only their
  own college and are denied each other's; Study Moderator sees zero Community/Map records; Student/
  Guest denied both list and direct-by-id read), filter coverage (actor/action/targetType/date
  range), `createAuditAction` contract validation, and snapshot sanitization (password/token/base64
  PDF payload/long binary-shaped string/nested blob URL all stripped; normal safe fields and normal
  prose text preserved)
- `node --check` on every modified/new `.js` file — clean
- **Real browser QA** (Chrome, `python -m http.server 8000`, the real `mzteoh88@gmail.com` QA
  account with its actual existing data — not fresh fixtures):
  - Hide (Community): clicked "Hide" on a real KMPP-scoped note → reason modal opened → submitted
    empty → modal stayed open, denied (toast) → typed a reason → note visibly hid (`VISIBLE` badge
    → `HIDDEN`, Visible count 14→13), toast confirmed, modal closed
  - Restore (Community): clicked "Show" on the just-hidden note → applied immediately, no modal,
    toast confirmed
  - Delete (Community): clicked "Delete" → reason-optional modal opened (`Delete permanently` /
    `Reason (optional)`) → Cancel closed it without deleting (verified 14 records unchanged) — did
    not perform a real delete against seed data, to keep the demo dataset intact
  - Escalate (Dashboard Queue): clicked "Escalate" on a real pending item → reason modal opened
    (`Escalate this case`) → Cancel closed it without mutating — did not perform a real escalate,
    to keep the demo queue state intact for later stages' QA
  - Audit tab: verified real localStorage confirms the Hide action above produced a correct
    `AuditAction` (`action:"hide"`, `reason` captured verbatim, `scopeType:"college"`,
    `scopeId:3` (KMPP), `actorEmail` captured, `createdAt` present) — the legacy admin who
    performed the action could NOT see it in their own Audit view (scope-isolated: KMPP is
    college-scoped and this account has no `COLLEGE_COMMUNITY_MODERATE`, exactly mirroring
    the pre-existing, already-tested `ModerationService` behavior for Community posts — see Known
    Limitations). A Super Admin (verified via a temporary `AuthService.getCurrentUser` stub,
    reverted immediately after) sees the record correctly, with all fields rendering in the Audit
    UI as designed.
  - i18n: EN screenshots covering Overview/Queue/Reports/History/Audit sidebar + the Audit view's
    full filter bar and record row (BM/ZH not independently re-verified for the ~50 new
    `admin.reason.*`/`admin.audit.*` strings this stage — see Known Limitations; the 003A dashboard
    strings were re-confirmed unaffected)
  - No console errors observed during any of the above interactions

## Modified Files

See `checkpoints/ADMIN-V2-004/PRE_STATE.md`'s "Files touched this stage" for the full list with
per-file detail.

## Known Limitations

- **Global-tier admin (legacy admin / Global Moderator) cannot read back their own Audit record
  for a college-scoped Community post they just hid**, even though they were authorized to
  perform the Hide itself (via `canModerateGlobalCommunity`, the Old Content Management tab's
  gate). This exactly mirrors the PRE-EXISTING, already-tested `ModerationService` behavior for
  Community `post` items (a Global Moderator/legacy admin has never been able to see college-scoped
  Community `ModerationItem`s in the Unified Queue either — see `test-admin-moderation-schema.mjs`'s
  `'Global Moderator does NOT see the KMK item'`). ADMIN-V2-003A deliberately fixed this exact class
  of asymmetry ONLY for `map_note` (per that stage's explicit spec instruction); extending the same
  fallback to `post` would mean a Global Moderator gaining visibility into `COLLEGE_COMMUNITY_MODERATE`-
  scoped data, which section 8/K of the original ADMIN-V2-001 spec explicitly forbids
  ("Global Moderator 不能管理 College"). Not fixed here — flagged for a future stage if the product
  decision changes.
- **Community/Map `ModerationItem`s still are not created/synced by the Old tab's own actions** —
  Hide/Delete write an `AuditAction` (this stage's job) but do not create or update a
  `ModerationItem` the way Study's actions do. A Community/Map item hidden via the Old tab will not
  change status in the Unified Queue/History unless a `ModerationItem` already existed for it (e.g.
  via a prior Report). Full reconciliation was explicitly out of scope (Study-specific
  reconciliation is ADMIN-V2-006).
- **`beforeSnapshot`/`afterSnapshot` are minimal, not exhaustive** — only the fields directly
  relevant to the action (`isHidden`, `status`, `verificationStatus`, a short content excerpt for
  Delete) are captured, by design (spec section 6: "只保存必要、安全 metadata").
- **BM/ZH translations for the ~50 new `admin.reason.*`/`admin.audit.*` keys were written but not
  independently screenshot-verified in a browser this stage** (EN was). Given the exact same
  `I18n.t()` mechanism ADMIN-V2-003A already proved correct in all 3 languages (interpolation,
  fallback chain, no raw-key leakage), and the key values themselves were written by the same
  process as 003A's already-verified ~80 keys, risk is assessed as low — but this is a real gap
  between "written" and "independently verified", stated honestly rather than claimed as tested.
- **Content Reviewer** still has zero real per-item Audit visibility distinct from other roles
  (no `assignedTo`-based Audit filtering) — `AdminAuditService`'s scope gate treats a Content
  Reviewer the same as any user with no matching `canModerate*` permission (denied), which is
  SAFE (no over-exposure) but not the "assigned queue only" nuance ADMIN-V2-005 will need to add.
- Mobile viewport not visually verified (pre-existing tooling limitation, unchanged from prior
  stages).
- Production security boundary unchanged: this remains prototype/front-end-only enforcement — see
  `services/admin-audit-service.js`'s own header comment. A real audit log requires a server-side,
  append-only table; this LocalStorage-backed one can be edited/deleted by the browser user calling
  these functions directly from the console.

## Next Step

ADMIN-V2-004 complete. Proceeding to ADMIN-V2-005 (College Permission Enforcement + College Admin
Workspace) per the user's standing full-sequence authorization for this task.
