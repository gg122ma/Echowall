# Echo Wall Current Code Audit

## 2026-08-23 — DISPLAY-COUNT-CONSISTENCY

- **Data safety invariant checked**: `data/demo-display-counts.js` and its two helpers never read,
  write, or filter `notes`/`getRuntimeNotes()`/LocalStorage/IndexedDB — verified by construction
  (the file has no reference to any note-storage API) and by browser test (real Building Wall note
  arrays, e.g. Masjid's, are unchanged; `getVisibleBuildingNotes()`'s real per-building counts still
  differ from the new display counts for 7 of 9 configured buildings, proving the two layers stay
  independent rather than one silently overwriting the other).
- **Semantic-scope check performed before wiring, not after**: Community Wall header counts
  (`app-wall.js`, Global/College-General/Jurusan) were read and confirmed to use a narrower
  `communityKey`-scoped count than the College Community card total (`getVisibleCommunityNotes`,
  all majors) before deciding NOT to apply the override there — see HANDOFF.md's
  DISPLAY-COUNT-CONSISTENCY entry for the exact scoping code path. This is the kind of check the
  task explicitly asked for ("先确认 semantic meaning") rather than blanket-applying one number
  everywhere a count-shaped number appears.
- **No duplicate count tables**: enforced by `scripts/test-display-count-consistency.mjs`, which
  greps `app-community.js`/`app-place.js`/`app-router.js`/`echomap.js`/`app-wall.js` for a
  re-declared `COLLEGE_DISPLAY_COUNTS`/`BUILDING_DISPLAY_COUNTS` literal and fails if found.
- **Admin/Moderation/Report/Study/Auth untouched**: no file under those areas was opened for
  editing this task; confirmed via `git diff --stat` scoped to the 8 files this task actually
  changed (`data/demo-display-counts.js`, `index.html`, `map.html`, `app-community.js`,
  `app-place.js`, `app-router.js`, `app-wall.js`, `echomap.js`) plus the new test script.
- Regression: `node scripts/test-display-count-consistency.mjs` — 60/60 assertions. `node --check`
  clean on every edited `.js` file.

## 2026-08-23 — COMMUNITY-WALL-POST-TYPE-UNIFICATION

- Canonical source: frozen `EchoPostTypeContract` in `app-data.js`; exact-match Question rule and
  Discussion fallback match Community's existing behavior.
- Separation verified: `contextType` stays location-only; `postType` carries only content type;
  Map `category` persists independently.
- Community/Building wall publication and Map's service route write the same field;
  `normalizeStoredNote()` supplies legacy read fallback without destructive deletion.
- No duplicate i18n set: all surfaces reuse existing `form.postType*` and `wall.*Badge` EN/BM/ZH.
- Regression: 9 passing test files, 578 assertions, zero failures, including all Admin suites.
- Browser acceptance remains blocked because the mandatory app-browser bridge was unavailable and
  untrusted; no alternate browser was substituted.

## 2026-08-23 — ADMIN-V2-FINAL-QA: cross-stage invariant re-verification

Validation-only — no code changed this stage. Re-checked, across the FULL ADMIN-V2-001 through 008
implementation rather than any single stage in isolation, the invariants each stage's own audit
entry claimed individually:

- **Single Super Admin source of truth, re-confirmed repo-wide**: grepped for the literal
  `greencucumbertube@gmail.com` string across every file touched by any ADMIN-V2 stage — the only
  occurrence is `services/admin-permission-service.js`'s `SUPER_ADMIN_EMAIL` constant (test files'
  own fixture literals are separate, expected, and match that same constant's value by convention,
  not by import).
- **No permission-check caching anywhere in the full stack, re-confirmed by tracing every entry
  point** (not just the one function each earlier stage checked in isolation): `AdminPermissionService`'s
  `getRoleAssignments`, `ModerationService`'s `canAccessModerationItem`/`canAccessScopeForModeration`,
  and `AdminAuditService`'s `canAccessAuditScope` all call through to a fresh
  `activeProvider.list()`/`localStorage.getItem` read on every single invocation, with zero
  memoization at any layer — this is WHY "role change immediate" (ADMIN-V2-007) holds for every
  permission check in the app, not just the one the ADMIN-V2-007 test happened to exercise.
- **The `canModerateMap` special-case is the ONLY cross-cutting scope exception in the entire
  permission stack, re-confirmed by re-reading `canAccessScopeForModeration` and
  `canAccessAuditScope` side by side**: both functions branch on `contentType === "map_note"` and
  nowhere else — no other content type gets a global-tier fallback into college-scoped data,
  keeping "Global Moderator 不能管理 College" true everywhere except the one place the spec
  explicitly asked for an exception.
- **`riskScore` is provably never a status-transition input, re-confirmed by grepping every
  `updateModerationStatus`/`assignModerationItem`/`ensureAutoFlagModerationItem` call site across
  the whole codebase** for any conditional branching on `riskScore` — none exists; the only reads
  of that field anywhere are for sorting (`adminDashboardSortQueue`) and display.
- **No second, divergent i18n mechanism was introduced across 6 stages** — every new UI string from
  003A through 008 goes through the same `I18n.t()` + `admin.dash.*`/`admin.reason.*`/`admin.audit.*`/
  `admin.mgmt.*` key-namespace convention established in 003A; the `en.js`/`ms.js`/`zh.js` triple
  stayed line-count-parallel throughout (each key added to all 3 files together, in the same
  relative position), confirmed by this stage's own final read-through rather than assumed
  maintained.

## 2026-08-23 — ADMIN-V2-008: Auto Moderation Assist audit

- **"Never auto-delete" verified structurally, not just by convention**: audited every call site
  that touches `ModerationItem.status` in the entire codebase (`updateModerationStatus`,
  `assignModerationItem` [never touches status], `ensureModerationItemForReport` [always
  `pending`], and the new `ensureAutoFlagModerationItem` [always `pending`]) and confirmed
  `riskScore` is never read as an input to any status transition anywhere — it is purely a sort/
  display field (`adminDashboardSortQueue` in `app-admin-dashboard.js` is the only place that reads
  it for behavior, and that's presentation ordering, not a mutation).
- **Dedupe correctness re-derived from the existing pattern, not reinvented**: before writing
  `ensureAutoFlagModerationItem`, re-read `ensureModerationItemForReport` line by line and matched
  its exact shape (`findActiveModerationItem` first, reuse-and-bump if found, `createModerationItem`
  only if not) rather than writing new dedupe logic that could subtly diverge in behavior between
  the two "don't duplicate the active queue case" guarantees the spec requires for reports and
  auto-flags respectively.
- **A real ordering bug was caught by tracing the actual call sequence before writing code**, not
  discovered by testing after the fact: evaluating a Study submission AFTER its ModerationService
  mirror already exists would have silently absorbed every flag into the existing
  `source:"submission"` item (via the dedupe path) instead of registering `source:"auto_flag"` —
  invisible to the Dashboard's Flagged stat. Caught by reading `ensureAutoFlagModerationItem`'s own
  dedupe logic against `createSubmission`'s existing mirror-creation call site before deciding
  the correct order, not by shipping the naive "after" order and finding the bug via QA.
- **A real Node-vs-browser environment gap was found and NOT silently patched over**: the test
  suite's own defensive `try/catch` in `isSuspiciousUrl()` (there specifically to handle a
  genuinely unparseable "URL" string, e.g. `"http://"`) also happened to swallow a `ReferenceError`
  from a missing `URL` global in the Node `vm` sandbox on the first test run — investigated why the
  test passed with 0 flagged results instead of assuming the rule itself was wrong, found the
  sandbox gap, fixed the TEST environment (added `URL`), and separately confirmed via live browser
  QA that production code needs no equivalent fix (browsers always have `window.URL`).
- **`listModerationItems()`'s missing `contentId` filter was discovered and worked around
  correctly, not worked around by weakening the test**: an early draft assertion silently passed
  for the wrong reason (the filter argument was ignored, but the assertion happened to be true
  anyway at that point in the test). Caught by inspecting WHY a later, more specific assertion
  failed, traced back to the missing filter support, and fixed by filtering client-side in the test
  (matching the real function's actual contract) rather than either weakening the assertion or
  quietly adding `contentId` support to `listModerationItems` itself without a clear product need
  for it this stage.

## 2026-08-23 — ADMIN-V2-007: Admin Management audit

- **SUPER_ADMIN-unassignable gap confirmed by reading the actual condition, not assumed from the
  role list** — `ROLE_DEFAULT_PERMISSIONS[SUPER_ADMIN]` genuinely exists (it has to, for
  `permissionsForAssignment` to resolve the bootstrap virtual assignment's permissions), so a
  naive `!ROLE_DEFAULT_PERMISSIONS[role]` check alone would NOT have caught `role: "SUPER_ADMIN"`
  being passed to `grantRoleAssignment`. Verified this was a real, exploitable gap (wrote a test
  that failed against the pre-fix code) before writing the fix, not just inspected and assumed.
- **Backward compatibility for the new `actor` gate verified by construction and by not touching
  any existing call site** — every ADMIN-V2-001 through 006 caller of `grantRoleAssignment`/
  `setAssignmentStatus` across every test file was left completely unmodified; the new gate/audit
  logic is purely additive (`if (actor && ...)`), confirmed by all 6 pre-existing suites passing
  unchanged immediately after this stage's service-layer edits, before any new test was even
  written.
- **`revokeRoleAssignment` audited against "what happens to a Content Reviewer's assignment if
  their COLLEGE_ADMIN grant is revoked while a ModerationItem is still assigned to them"** — traced
  the actual data model: `RoleAssignment` (who can moderate what scope) and `ModerationItem.assignedTo`
  (which specific item a Content Reviewer can touch) are independent fields on independent records;
  revoking a role assignment does NOT touch any `ModerationItem.assignedTo` value, which is correct
  (a Content Reviewer's item-level assignment is a separate grant from ADMIN-V2-005, with its own
  independent revocation path via `assignModerationItem(id, null, actor)`) — confirmed this is the
  correct, intentional separation, not an oversight, by re-reading both mechanisms side by side.
- **"Role change immediate" re-verified from first principles, not carried over as an assumption**
  — read `getRoleAssignments()`'s full call chain again this stage (not just cited the prior
  stage's claim) to confirm `activeProvider.list()` (a synchronous `localStorage.getItem` +
  `JSON.parse`) is called fresh on every single permission check with zero memoization anywhere in
  between; then proved it experimentally (service-layer test + live browser disable) rather than
  relying on the code-reading alone.
- **`system`-scope choice for role-management AuditActions audited against `canAccessAuditScope`'s
  actual branches**, not assumed safe: confirmed `"system"` is the one `scopeType` with NO
  fallback branch in that function (global/college/study each have one; system falls through to
  `return false`), meaning ONLY `isSuperAdmin`/`AUDIT_READ_ALL` can ever see these records — the
  correct, intentional choice for role-management history, verified against the real function
  rather than assumed from its name.

## 2026-08-23 — ADMIN-V2-006: Study Moderation V2 Integration audit

- **Audited before writing any code, and confirmed rather than assumed**: read
  `adminStudyEditFormHtml`/`adminStudyVerifySelectHtml`/`adminStudyDuplicateBadge` line by line
  against spec section 18's full required-field list before concluding no UI work was needed —
  this avoided the failure mode of "the spec asked for it so I built it again", which would have
  produced a second, divergent metadata form.
- **StudyUploadService's own status kept authoritative, never inverted**: `reconcileStudyModerationState()`
  always writes StudyUploadService's `moderationStatus` INTO the `ModerationItem` mirror, never the
  reverse — audited this direction specifically because getting it backwards would have let a
  stale/corrupted `ModerationItem` silently overwrite a real, correct Study decision.
- **Real bug caught by the test itself, not manual inspection**: the reconciliation test for the
  "missing mirror" case initially failed (`recreatedMirror.reason` was `null` instead of the real
  rejection reason) — this is exactly the kind of gap a "looks right by inspection" review misses;
  fixed only after the test proved the bug existed, then re-run to confirm the fix.
- **Idempotency explicitly tested, not assumed** — called `reconcileStudyModerationState()` twice in
  a row in the test and asserted the second call's `{created, updated}` counts are both zero,
  because a reconciliation function that isn't idempotent would corrupt data (e.g. by re-triggering
  a status transition, or duplicating a mirror) if ever accidentally called more than once, which
  the "once per admin-panel session" wiring in `app-study-admin.js` doesn't strictly guarantee
  under all render-timing edge cases.
- **No new PDF/blob exposure introduced**: confirmed `reconcileStudyModerationState()` never reads
  `getFileBlob`/`getFileBlobBySubmissionId` or any IndexedDB file store — it only ever touches
  `getCachedSubmissions()`'s already-in-memory metadata cache and `ModerationService`'s own item
  list, both of which are metadata-only.

## 2026-08-23 — ADMIN-V2-005: College Permission Enforcement audit

- **Defense in depth confirmed by construction and by a live console attack**: broadening
  `canAccessCommunityModeration()` to admit College Admins was done ONLY together with (a)
  `getAdminCommunityNotes()` scope-filtering the LIST and (b) `adminCanModerateNote()` gating every
  WRITE independently — verified in a real browser that a KMK-only admin's direct
  `adminToggleHidden(<KMPP note id>)` console call is denied (not just hidden from the UI), and that
  the SAME function against a real KMK note correctly succeeds. The tab-level gate alone would have
  been insufficient and was never shipped alone.
- **`adminResetNotes` deliberately NOT broadened** alongside the general Community gate — audited
  specifically because it's an unscoped, cross-college-destructive action (clears the single shared
  `echo-wall-notes` key for every college at once); confirmed its own gate still requires
  `canModerateGlobalCommunity` directly, not the newly-broadened `canAccessCommunityModeration()`.
- **`canAccessModerationItem`'s new `assignedTo` bypass verified additive, not substitutive**: the
  existing 109-assertion moderation-schema suite and the new 45-assertion college-scope suite both
  passed unchanged/immediately, confirming no existing role's scope-based access narrowed — the
  bypass is a pure `||` addition, checked after the existing scope check, matching "assignment only
  ever WIDENS access to one item, never narrows a real moderator's scope".
- **`assignModerationItem` kept deliberately separate from `updateModerationStatus`** — audited the
  alternative (reusing `updateModerationStatus` with a same-status no-op call) and rejected it: that
  function's `STATUS_TO_ACTION` mapping and reason-required logic have no concept of "nothing
  changed except who's assigned" and would have logged a spurious `approve`/`restore`/etc AuditAction
  for a pure assignment change. A dedicated function avoids this without adding any complexity to
  the already-complex `updateModerationStatus`.
- **Building-note inclusion was verified NOT to leak other colleges' building notes** — Building
  notes always canonically resolve to KMK (see `moderation-service.js`'s `resolveContentScope`
  building-note branch, unchanged this stage); confirmed live in the browser that 100% of the notes
  a KMK admin's `getAdminCommunityNotes()` returned (community + building combined) resolved to
  KMK college scope via a direct console cross-check against `ModerationService.resolveContentScope`
  for every returned note, not assumed correct from code reading alone.
- **Map's per-item safety re-derived, not assumed carried over from ADMIN-V2-003A**: explicitly
  confirmed `resolveContentScope("map_note", anyId)` always returns KMK regardless of the id
  argument (re-read the function, not re-guessed), which is WHY no per-item Map write check was
  added this stage — the blanket `requireMapModerationAccess()` tab gate is provably equivalent to
  a per-item check for this specific content type, unlike Community posts which span colleges.

## 2026-08-23 — ADMIN-V2-004: Moderation Actions + Audit Trail audit

- **Reason enforcement verified at the service layer, not just observed at the UI layer**: wrote a
  failing-first test (`expectThrow('hide without a reason is rejected...')`) BEFORE the reason
  check existed in `updateModerationStatus`, confirmed it actually failed against the pre-004 code,
  then added the check and confirmed the same test passed — proving the check is real, not just
  assumed. Same discipline applied to `AdminAuditService.createAuditAction`'s independent check.
- **No fake Dashboard moderation actions**: deliberately did NOT add generic Approve/Reject/Hide
  buttons to Dashboard Queue rows, specifically because `ModerationItem.status` is not kept in sync
  with the real Community/Map content state by anything except Study's own best-effort mirror — a
  Dashboard-level fake action would silently desync the queue label from what the public actually
  sees, the exact class of bug ADMIN-V2-003A fixed for Map permissions. Escalate was added because
  it has no real-content equivalent to desync from. Documented as a deliberate scope boundary in
  `reports/REPORT_ADMIN-V2-004.md`, not silently omitted.
- **Snapshot sanitization tested adversarially, not just for the happy path**:
  `scripts/test-admin-audit.mjs` feeds `createAuditAction` a snapshot containing a real base64 PDF
  data-URI prefix, a `password` field, an `authToken` field, a 400-char binary-looking string, and a
  nested `blob:` URL — all confirmed stripped/omitted, while a normal safe field and normal long
  prose text are confirmed PRESERVED (proving the sanitizer isn't just blanket-truncating
  everything, which would make the audit trail useless).
- **Scope isolation for Audit reads re-derives from `AdminPermissionService` on every read, not
  cached from create-time** — `listAuditActions`/`getAuditAction` call `canAccessAuditScope(user,
  ...)` fresh each time, same pattern as `ModerationService`; a role change takes effect on the
  very next Audit read, no stale-permission window (this property will matter directly for
  ADMIN-V2-007's "role change immediate" requirement, and was verified here by construction, not
  yet by a dedicated live-revoke test — that's 007's job).
- **Cross-referenced with existing, locked-baseline test assertions before generalizing**: before
  landing `canModerateMap`-style special-casing anywhere else, explicitly checked
  `test-admin-moderation-schema.mjs`'s existing `'Global Moderator does NOT see the KMK item'`
  assertion (a `post`, not `map_note`) — confirmed it is UNCHANGED, proving the reason-enforcement
  and audit-hook changes in `updateModerationStatus` didn't accidentally widen Community scope
  isolation while adding the reason/audit logic.
- **Real-data verification caught two real bugs unit tests could not** (see report for full
  detail): `adminSetSource`'s second whitelist, and `beforeSnapshot.isHidden`'s JSON-undefined-drop
  issue — neither is reachable from the Node `vm`-sandboxed pure-function test suites (both live in
  DOM-rendering/browser-only code paths), reinforcing why real browser QA against real existing
  account data (not just fresh fixtures) remains part of this project's required testing, not
  optional polish.

## 2026-08-23 — ADMIN-V2-003A: Dashboard Consistency Correction audit

- **Permission-narrowing invariant re-checked, not just re-asserted**: `canAccessScopeForModeration`'s
  new 4th `contentType` parameter only changes the answer inside the `"college"` branch, and only
  when `contentType === "map_note"`. Read every other call path (`post`, `study_resource`,
  no-adapter types) to confirm they still resolve identically to before — confirmed by the full
  existing test suite passing unchanged plus the new assertions that Global Moderator still cannot
  see college Community posts even though it now (correctly) sees the college-scoped Map item.
  `canModerateMap()` was deliberately NOT used to replace `canModerateCollege()` generally — only
  the one content type (`map_note`) whose real permission gate has always been
  `canModerateGlobalCommunity` (via the Old Map Admin tab), never introduced as a broader
  "global moderators can touch colleges" backdoor.
- **Regression caught by the test suite itself, not assumed away**: the first version of
  `canModerateMap()` was `isSuperAdmin(user) || canModerateGlobalCommunity(user)` (no
  `canModerateCollege` fallback) — running the existing 89-assertion moderation-schema suite
  immediately failed `'KMK College Admin sees the KMK-scoped map_note item'`, because a real
  `COLLEGE_ADMIN`'s only path to Map access was previously the generic `canModerateCollege` branch.
  Fixed by adding the fallback before writing any new assertions, confirming the fix against the
  *existing* locked-baseline test first.
- **Live-data verification, not fixture-only**: the 4B fix was verified against the real
  `mzteoh88@gmail.com` QA account's actual browser localStorage (`echo-wall-moderation-items:v1`),
  not just the Node `vm`-sandboxed fixture tests — `map_note` visibility went from 0 to 2 real
  items, and Community-post visibility for that same account stayed at 0, both confirmed via
  `javascript_tool` calls into the live page before touching any UI.
- **i18n**: confirmed zero raw `admin.dash.*` key leakage in a real browser across all 3 languages
  (a missing key would render as the literal key string, per `i18n/index.js`'s
  `table[key] ?? fallback[key] ?? key` fallback chain — this was actively checked for, not assumed
  absent). Internal enum values (status/module/source used for CSS classing or filter `value=`
  attributes) were deliberately left untranslated; only their display labels changed, via new
  `adminDashboardStatusLabel`/`ModuleLabel`/`SourceLabel` lookup helpers with the raw value as a
  safe fallback for any status the map doesn't cover.
- **Test-sandbox fidelity improved**: `scripts/test-admin-dashboard.mjs`'s `I18n` stub was
  `key => key` (never actually exercising real translation strings). Upgraded to load the real
  `i18n/locales/en.js` table and interpolate `{var}` exactly like production `i18n/index.js` — a
  dumb stub would have let a real interpolation bug (e.g. `adminDashboardContentPreview`'s
  `{id}` map-note detail) pass silently.

## 2026-08-23 — ADMIN-V2-003: Unified Admin Dashboard audit

- **No second queue data source introduced**: verified by construction and by test — every
  Dashboard view (`renderAdminOverview`/`renderAdminQueueView`/`renderAdminReportsView`/
  `renderAdminHistoryView` in `app-admin-dashboard.js`) calls
  `ModerationService.listModerationItems()`/`listReports()` and nothing else for its data; grep
  confirms `app-admin-dashboard.js` never reads `notes`/`MapNoteService`/`StudyUploadService`
  directly to build a queue (it reads `notes`/`StudyResourceService`/`StudyUploadService` ONLY
  inside `adminDashboardContentPreview()`, for display text, never to compute counts or filter
  results).
- **Permission enforcement has no UI-layer escape hatch**: confirmed live in the browser — forcing
  `adminState.dashboardScope` to an unauthorized college via the console, and separately calling
  `ModerationService.listModerationItems({scopeType:"college", scopeId:<other college>}, user)`
  directly (bypassing the Dashboard's own filter function entirely), both still returned zero items
  for a KMK-only College Admin. The Dashboard's `adminDashboardFilterItems()` only ever narrows a
  list `ModerationService` already scope-filtered — there is no code path in this file that could
  widen access even if every DOM control were manipulated.
- **Real bug found by this stage's own testing, not assumed away**: `adminDashboardVisibleScopes()`'s
  first version iterated `AdminPermissionService.getRoleAssignments(user)` and matched each
  assignment's own `scopeType` field to decide which scope option to add — this incorrectly hid
  "Study" from the legacy admin, whose single virtual `LEGACY_ADMIN` assignment carries
  `scopeType: "global"` but grants permissions across two conceptual scope types
  (`GLOBAL_COMMUNITY_MODERATE` + `STUDY_RESOURCE_MODERATE`). Caught during live browser QA (the
  scope dropdown for the already-signed-in legacy admin showed only "Global"), fixed to check the
  top-level permission functions directly instead of assuming a 1:1 assignment-to-scope mapping,
  and a dedicated regression check was added to `scripts/test-admin-dashboard.mjs` specifically
  naming this case.
- **Existing action functions verified unchanged**: `adminToggleHidden`/`adminDeleteNote`/
  `adminToggleMapHidden`/`adminDeleteMapNote`/`adminResetNotes`/`adminExportNotes`/
  `adminStudyApprove`/`adminStudySaveAndApprove`/`adminStudyConfirmReject`/
  `adminStudySetVerification` were not edited at all this stage (confirmed by diff) — the new
  "Review" button only calls the pre-existing `adminSetSource()`, which was already the mechanism
  for switching module workspaces before this stage.
- **Sidebar de-duplication verified equivalent, not just extracted**: the shared
  `adminSidebarNavHtml()` was checked against both prior inline copies (Community/Map panel,
  `app-study-admin.js`) to confirm identical conditional logic (`canAccessCommunityModeration()`/
  `canAccessStudyModeration()` gates) and identical click targets — this was a pure refactor with
  Overview/Queue/Reports/History links added, not a behavior change to the existing Community/Map/
  Study links.
- **Testing**: `node --check` passed for every modified/new `.js`/`.mjs` file
  (`app-admin.js`, `app-admin-dashboard.js`, `app-study-admin.js`,
  `scripts/test-admin-dashboard.mjs`). All four suites pass: 50/50 new Dashboard checks, 89/89
  Moderation regression, 74/74 Role/Scope regression, 49/49 Study regression. Real Chrome browser
  session: real Community report + real Study submission + real Map report all created in one
  session and confirmed to appear together in the unified Queue with correct scope badges and safe
  content previews; live permission isolation confirmed for a KMK-only College Admin and a Study
  Moderator via real granted RoleAssignments; existing Community/Map/Study panels confirmed
  functional and unregressed (Study "Review" handoff opened the real, working Approve/Reject/Edit
  workspace). Zero console errors throughout.
- **Known technical debt**: `map_note`'s inherent KMK-college scope (ADMIN-V2-002A) means a legacy
  admin (global+study permission only, no college permission) cannot see Map cases in the new
  unified views even though they can still manage Map content through the old dedicated panel —
  flagged here (and in `reports/REPORT_ADMIN-V2-003.md`) so a future session doesn't mistake this
  for a regression. `COLLEGE_ADMIN`/`CONTENT_REVIEWER` still have no dedicated module workspace
  (ADMIN-V2-005). History is not an audit trail (ADMIN-V2-004).

## 2026-08-23 — ADMIN-V2-002A: Map Moderation Integration audit

- **Real MapNoteService architecture, audited before writing code** (not guessed from the prior
  ADMIN-V2-002 report): confirmed via `services/map-note-service.js` + `features/map-note-overlay.js`
  that the only live-creatable map note type is an "anchored building note" (`sourceType:
  "map_message"`), a real `notes`-array entry (`contextType: "building"`) plus a separately-stored
  lat/lng anchor, created through `features/map-note-overlay.js`'s real "Post directly" form and
  immediately public (no pending state). "Direct pins" exist as a data/hide/delete-able shape but
  have no live creation path (`create()` throws for that provider). Neither shape carries an orgId
  — confirmed Map's scope is a genuine fixed constant (KMK), not a per-item variable that needed a
  more granular lookup.
- **No hardcoded scope literal, verified by an adversarial test, not just a comment**: the
  original ADMIN-V2-002 pass hardcoded `KMK_ORG_ID = 1` directly. ADMIN-V2-002A replaced it with
  `resolveKmkOrgId()`, a real lookup against the canonical `organizations` config by name. To prove
  this is a REAL lookup and not a fallback silently masquerading as one,
  `runKmkLookupIndependenceCheck()` builds a fixture where KMK's id is deliberately 77 (not 1) and
  asserts every KMK-scoped derivation follows it — a test that would have caught the exact
  regression this stage was asked to fix if the fix had been superficial.
- **Existing Admin Hide/Delete behavior preserved by design, not by accident**: `MapNoteService`'s
  `setHidden()`/`delete()` wrappers call `ModerationService` only AFTER `callProvider(...)` already
  succeeded — a throwing or absent `ModerationService` can never block the real action. Verified
  live: clicking the real Hide/Show buttons in the browser worked and produced the expected toasts
  regardless of the new mirror call. Delete's hard-delete semantics were explicitly NOT changed to
  a soft-delete/tombstone — confirmed both in the audit (no such concept existed before) and live
  (the deleted pin is genuinely gone from `MapNoteService.list()` afterward).
- **State machine widened deliberately, not loosely**: `approved -> rejected` and
  `hidden -> rejected` were added to `ALLOWED_TRANSITIONS` specifically to represent a real hard
  delete of previously-reviewed/hidden content. The previously-tested invalid edges
  (`approved -> escalated`, `escalated -> pending`) were re-run and still correctly rejected —
  confirmed the widening was additive, not a loosening of the existing invariants.
- **Testing**: `node --check` passed for every modified file (`services/moderation-service.js`,
  `services/map-note-service.js`, `scripts/test-admin-moderation-schema.mjs`). Suite grew from
  65/65 to 89/89 (24 new checks: real-recordKey map scope derivation, KMK-vs-KMPP mismatch
  rejection for map_note, a full report→dedupe→risk-score chain, Super Admin/correct-College-Admin
  vs. wrong-college/Student/Guest access, Hide/restore/hard-delete transitions, and the KMK-lookup
  independence check). `scripts/test-admin-role-scope.mjs` (74/74) and
  `scripts/test-study-upload.mjs` (49/49) re-verified unaffected. Real Chrome browser session: a
  real map note created via the real `MapNoteService.create()` API, two real reports producing one
  correctly-KMK-scoped shared ModerationItem with rising risk score, the REAL Admin Hide button
  (not a simulated call) confirmed syncing to `hidden` live, Show confirmed restoring to `pending`,
  and the real `MapNoteService.delete()` function (called directly, since the Delete BUTTON itself
  is guarded by a native `confirm()` dialog this session's browser-automation safety rules forbid
  triggering) confirmed hard-deleting the pin and syncing the item to `rejected`. Echo Map
  (`map.html`) and the existing Community/Study admin tabs confirmed unaffected, zero console
  errors throughout.
- **Known technical debt** (updated from the prior entry below): Map note integration's PARTIAL
  status is now closed. Comment/Event/Review still have no canonical content adapter (no such
  feature/service exists for any of them). Content Reviewer still has zero real per-item access
  until `assignedTo` enforcement is built — unchanged from ADMIN-V2-002.

## 2026-08-23 — ADMIN-V2-002: Unified ModerationItem + Report Schema audit

- **Existing moderation data, inventoried before writing code**: Community/Building posts and Map
  notes each have only a single `isHidden` boolean (no queue, no status enum). Comments have a
  `moderationStatus` schema field that is never actually set to anything but `"published"` — a
  stub, not a real flow. Study resources are the one module with a real multi-state flow already
  (`pending/approved/rejected`, `verificationStatus`, `duplicateStatus`, a real `auditLog`).
  Confirmed by project-wide grep that no report/flag feature exists anywhere — the Report contract
  is fully greenfield. Event/Review have no feature at all (no service, no route, no data);
  contract-only support was built for them, no fabricated UI, per explicit instruction.
- **Scope correctness, not just structural validation**: `resolveContentScope()` in
  `services/moderation-service.js` looks up the REAL content object for `post`/`study_resource`/
  `map_note` and derives scope from it, rather than trusting a caller-supplied value. Verified by
  test AND live browser check: a real KMK community note (`orgId: 1`) reported through
  `createReport()` produced a ModerationItem with `scopeType:"college", scopeId:1` — matching the
  note's real college, not a guessed default. A caller supplying a scope that disagrees with the
  derived one is rejected (`scripts/test-admin-moderation-schema.mjs`'s "KMK item cannot masquerade
  as KMPP" checks).
- **No new permission core introduced**: every moderation read/write in the new file calls
  `AdminPermissionService` exclusively (`isSuperAdmin`/`canModerateGlobalCommunity`/
  `canModerateCollege`/`canModerateStudy`) — confirmed by grep that `services/moderation-service.js`
  contains no `role === "admin"` check and no email whitelist of its own. This keeps the
  ADMIN-V2-001/001A Role/Scope contract as the single permission core; ADMIN-V2-002 only consumes
  it, never re-implements it.
- **Queue dedupe correctness**: `ensureModerationItemForReport()` searches for an ACTIVE
  (`pending`/`escalated`) item by `contentType`+`contentId` before creating a new one. Verified two
  reports against the same content produce two independent Report records (never merged away — a
  report is a permanent record) but exactly one shared ModerationItem whose `riskScore` increases —
  "report != delete" and "no duplicate queue spam" are both real, tested invariants, not just
  documented intentions.
- **Status transitions are a real state machine**, not a free-form field: `ALLOWED_TRANSITIONS`
  rejects `approved -> escalated` and `escalated -> pending` (must resolve, not silently
  un-escalate) while allowing `approved -> hidden` (retroactive) and `hidden -> pending` (restore
  for re-review) — tested both for the allowed and the rejected directions.
- **Legacy Study storage untouched**: `StudyUploadService`'s own IndexedDB-backed
  `moderationStatus`/`verificationStatus`/`auditLog` fields were not modified. The new
  `ModerationService` mirror calls added to `createSubmission()`/`approveSubmission()`/
  `rejectSubmission()` are wrapped in `try/catch` and use optional chaining
  (`window.ModerationService?.method?.()`) specifically so a missing or throwing
  `ModerationService` can never block a real Study action — verified by re-running
  `scripts/test-study-upload.mjs` (49/49 PASS) in its existing sandbox, which does NOT load
  `ModerationService` at all; every new call silently no-ops there, proving the integration is
  genuinely non-blocking rather than only theoretically so.
- **Testing**: `node --check` passed for every modified/new `.js`/`.mjs` file
  (`services/moderation-service.js`, `services/study-submission-service.js`,
  `scripts/test-admin-moderation-schema.mjs`). All three suites pass: 65/65 new moderation-schema
  checks, 74/74 Role/Scope regression, 49/49 Study regression. Real Chrome browser session: a real
  Study upload → real mirrored pending item → real approval → mirrored item flipped to approved
  (full round trip, not just a single snapshot check); a real Community post → real Report + a
  correctly KMK-scoped ModerationItem. Map note end-to-end: not verified live (no real map pin
  exists in this environment); the scope-derivation logic itself is covered by the Node suite.
- **Known technical debt**: ~~Map note integration is PARTIAL — `MapNoteService` does not yet
  auto-create ModerationItems for new/reported pins.~~ **Closed same day by ADMIN-V2-002A** (see
  the audit entry above this one). Comment/Event/Review have no canonical content adapter
  (structural scope validation only). Content Reviewer currently has zero real moderation access
  (by design, until per-item `assignedTo` enforcement exists) — flagged here so a future
  session building that enforcement doesn't need to rediscover this.

## 2026-08-23 — ADMIN-V2-001: Role/Scope Contract audit

- **Auth/Permission architecture**: introduced `services/admin-permission-service.js` as the single
  Role/Scope/Permission source of truth. Verified by grep before writing any code that every
  existing `role === "admin"` / `AuthService.isCurrentUserAdmin()` / admin-email check in the
  codebase was inventoried (`app-admin.js`, `app-study-admin.js`,
  `services/study-submission-service.js`, `services/permission-service.js`,
  `services/auth-ui.js`) — see `checkpoints/ADMIN-V2-001/PRE_STATE.md` for the exact pre-edit hunks.
  Critically, the SERVICE-layer gate (`study-submission-service.js`'s `requireModerator()`,
  independent of the UI-layer gate) was found and fixed — missing it would have made a real
  `STUDY_MODERATOR` role technically inert (UI lets them click Approve, service still throws).
- **Single source of truth for the Super Admin email — corrected by ADMIN-V2-001A**: the original
  ADMIN-V2-001 audit claimed `SUPER_ADMIN_EMAIL` (in `admin-permission-service.js`) was the only
  hardcode, but left `services/auth-service.js`'s pre-existing `PROTOTYPE_ADMIN_EMAILS` untouched —
  which ALSO still listed `greencucumbertube@gmail.com` (alongside `mzteoh88@gmail.com`). That was
  a real contract violation, caught and fixed same-day: `PROTOTYPE_ADMIN_EMAILS` now lists only the
  legacy admin, and `auth-service.js`'s `isCurrentUserAdmin()` was rewritten into a compatibility
  wrapper deferring to `AdminPermissionService.canAccessAdminPanel()` (falling back to the
  legacy-only whitelist only if that service is somehow unavailable — a call-time check, not a
  script-load-time dependency, so no circularity). Re-confirmed by grep: business `.js` code now
  contains `greencucumbertube@gmail.com` exactly once. `isLegacyAdmin()` in
  `admin-permission-service.js` still derives its answer from the existing (now legacy-only)
  `user.role` field rather than re-declaring the whitelist itself.
- **Super Admin no longer depends on the legacy `role` field, verified**: since
  `PROTOTYPE_ADMIN_EMAILS` no longer contains the super-admin email, `AuthService`-derived users
  with that email now get `role: "user"`, not `"admin"`. `AdminPermissionService.isSuperAdmin()`
  was already `email`-only and unaffected by this, but 9 new test checks
  (`scripts/test-admin-role-scope.mjs`) and a live browser console check make this independence
  explicit rather than incidental — using a `role: "user"` fixture and a fixture with no `role`
  field at all, both still resolving Super Admin correctly.
- **Scope isolation, verified two ways**: (1) `scripts/test-admin-role-scope.mjs`, 74 direct-call
  checks (ADMIN-V2-001A grew this from 65) including KMK-vs-KMPP college isolation and multi-scope
  union without implicit widening;
  (2) live browser: real `grantRoleAssignment()` calls against the running app, confirmed both by
  UI (nav buttons present/absent) AND by forcing the denied action from the console
  (`adminSetSource('community')` while holding only `STUDY_MODERATOR` left `adminState.sourceType`
  unchanged) — isolation is enforced at the action layer, not just by hiding buttons.
- **Disabled assignments**: `getRoleAssignments()` filters `status !== "active"` before any other
  function sees the list, so a disabled `RoleAssignment` is invisible to every permission check —
  verified by test and does not require each individual `has*`/`can*` function to re-check status.
- **Storage**: new `localStorage` key `echo-wall-role-assignments:v1`, read/written through a
  provider abstraction (`useProvider()`), matching the existing pattern other services in this repo
  already use for swappable persistence (e.g. `services/map-note-service.js`). No PII beyond
  `userId`/`grantedBy` (both opaque local IDs). Read-fails are caught and fall back to `[]`, never
  throw.
- **Compatibility**: `isCurrentUserAdmin()` in `app-admin.js` is kept as a function (many call sites
  still reference it) but is now a thin wrapper delegating to
  `AdminPermissionService.canAccessAdminPanel()` — it no longer independently re-derives an answer
  from `AuthService`. This satisfies the "don't let legacy functions keep being the permission core"
  requirement without a wholesale rename across the file.
- **Testing**: `node --check` passed for every modified/new `.js` file (`app-admin.js`,
  `app-study-admin.js`, `services/permission-service.js`, `services/study-submission-service.js`,
  `services/admin-permission-service.js`, `services/auth-service.js`, `services/auth-ui.js`,
  `scripts/test-admin-role-scope.mjs`, `scripts/test-study-upload.mjs`). Both test suites pass —
  74/74 (grew from 65/65 in ADMIN-V2-001A) and 49/49 Study regression, re-run after each pass.
  Real Chrome browser session covered Super Admin, legacy admin (regression-free), a
  denied plain student, and live-granted Study Moderator / Global Moderator isolation; see
  `reports/REPORT_ADMIN-V2-001.md` for the full breakdown including what was NOT click-through
  verified (College Admin has no dedicated UI yet — verified via the permission API only).
- **Known technical debt**: `COLLEGE_ADMIN`/`CONTENT_REVIEWER` have no consuming UI yet (correct at
  the permission layer, land on a placeholder "no sections" state in `#/admin`) — flagged here so a
  future session building ADMIN-V2-005/ADMIN-V2-007 doesn't need to re-discover this, and doesn't
  mistake the placeholder for a bug.

## 2026-08-22 — COMMUNITY-MAP-NAV-POLISH-001: Community/Echo Map navigation consistency audit

- **Router**: `getRoute()`/`render()` unaffected structurally — no new route shapes added.
  **Correction (same day)**: an earlier version of this audit entry described the `map.html`
  switcher as reaching `renderOrgCampusMap()` via a full-page `location.href` hand-off to
  `#/org/:orgId/map`. That was never the correct design — it made every non-KMK switcher click
  leave `map.html`, breaking continuous KMK↔KMKK↔KMPP↔KMPK cycling — and was replaced same-day.
  **Invariant**: the switcher must switch in-place and must never navigate away from `map.html`.
  The corrected design: `map.html` now loads `app-campus-map.js` and
  `data/campus-building-registry.js` directly, and calls a shared, parameterized helper —
  `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix)` — that both `renderOrgCampusMap()`
  (SPA, `#/org/:orgId/map`) and the switcher's new `renderNonKmkCampusGuide()` (in `echomap.js`) call
  directly as a function, not through the router. `hrefPrefix` only changes the two actionable
  module-card buttons' click targets (`navigate()` vs. `location.href='index.html#/...'`); no route
  navigation occurs anywhere in the switcher's own campus-to-campus transition.
- **Storage**: new `sessionStorage` key `echowall_place_return_source_v1`
  (`setPlaceReturnSource`/`getPlaceReturnSource` in `app-router.js`). Validated: value is rejected
  unless `placeId` matches the resource being rendered (prevents a stale "came from map" hint from
  a previous, different building leaking into an unrelated later visit) and unless `age <= 30min`
  (same TTL convention as the pre-existing `echowall_map_return_v1` snapshot it sits beside). No
  PII, no auth data. Read-fails (private-browsing storage denial) are caught and fall back to the
  existing default (Building Stories), never throw.
- **DOM/rendering**: `renderCollegeLanding()`'s removed card was a single, cleanly-bounded
  `.enter-wall-box` block with no shared state — removal verified not to affect the header or
  Jurusan Channels list rendering (both are separate template literals joined independently).
  `switchToCollegeIndex()` was rewritten (not left with dead branches): the old
  `#map-college-framework-notice` static notice paragraph was removed from `map.html` entirely (it
  is superseded, not hidden-but-present), and a new sibling container, `#campus-framework-guide`,
  was added and is toggled via the `hidden` attribute alongside the pre-existing KMK containers
  (`#map-side-header`, `#building-selection`, the Leaflet `buildingLayer`). Toggling `hidden` on
  sibling containers — never overwriting a shared parent's `innerHTML` — was a deliberate choice:
  `echomap.js` caches DOM references (`buildingList`, `buildingSearch`, etc.) once at page load
  inside its `DOMContentLoaded` closure, and overwriting their parent's `innerHTML` would detach
  those cached nodes, breaking KMK's building list/search/preview on any later switch back to KMK.
  Verified live: round-tripping KMK → KMKK → KMPP → KMPK → KMK restores full KMK functionality
  (building list, search, footprint selection, preview panel) with no detached-node symptoms.
- **i18n**: `nav.map`/`home.openMap`/`home.mapTitle`/`assistant.mapReply`/`place.backToMap` checked
  across all three locale files for parity — each key present with a real (not machine-translated
  placeholder) string in en/ms/zh. `map.title` deliberately left as the one "Echo Map KMK"-shaped
  key still present, since it is genuinely campus-specific by design (`applyActiveCollegeChrome()`
  in `echomap.js` only uses it for the KMK case; every other campus already used
  `campusMap.title` with the college's real name interpolated in).
- **Compatibility**: `saveMapReturnSnapshot()`/`readMapReturnSnapshot()` (pre-existing, in
  `echomap.js`) were reused as-is for the "More Details" flow, not modified — their validation
  logic (bounds-checked lat/lng, zoom clamped to the live map's own min/max, building-id existence
  check) applies unchanged regardless of which caller wrote the snapshot.
- **Testing**: `node --check` passed for every modified `.js` file
  (`app-community.js`, `app-router.js`, `app-place.js`, `echomap.js`, `app-campus-map.js`). Real
  Chrome browser session covered all 8 requested items, including the corrected in-place switcher:
  forward KMK→KMKK→KMPP→KMPK and reverse KMPK→KMPP→KMKK→KMK, each step confirmed to stay on
  `map.html` with correct sidebar/map-pan/title/switcher-label updates, KMK's full building
  functionality confirmed intact on return, and `#/org/3/map` (Community→KMPP) confirmed
  byte-matching the switcher's KMPP sidebar. See `reports/REPORT_COMMUNITY-MAP-NAV-POLISH-001.md`
  for the full breakdown, including the one environment-caused gap (mobile viewport not visually
  verified; `resize_window` does not change `window.innerWidth` here — a pre-existing,
  previously-documented tooling limitation, not a new one introduced by this stage).
- **Known technical debt**: the account-popover / body-scroll-lock interaction and the
  `document.hidden`-sensitive smooth-scroll behavior surfaced during this session's own testing are
  environment/testing-harness properties, not app defects — flagged here only so a future session
  doesn't waste time re-diagnosing the same false lead if a similar "scroll lands wrong" report
  recurs during automated testing specifically (not real user reports).

## 2026-08-22 — STUDY-V2-007: Upload storage invariants (pending-by-default, IndexedDB-only, no manifest mutation)

### New invariants established (recorded verbatim)

- **"Student upload 永远先进入 pending moderation — 绝不能自动 publish。"** Every submission
  created by `StudyUploadService.createSubmission()` is hard-coded to
  `moderationStatus:"pending", verificationStatus:"unverified"` — there is no code path (no flag,
  no config, no "trusted uploader" shortcut) that sets anything else at creation time. The ONLY
  functions that ever change `moderationStatus` are `approveSubmission()`/`rejectSubmission()`,
  both of which require `AuthService.isCurrentUserAdmin()` via `requireModerator()`. Verified: a
  freshly created submission is absent from `getPublishableResources()`/`searchResources()`
  immediately after creation, in both the Node suite and a real browser session.
- **"PDF 不允许存 LocalStorage/base64 manifest — 必须走真实二进制 storage。"** The PDF `File`/`Blob`
  is written directly into an IndexedDB object store (`files`, keyed by content hash) via
  `IDBObjectStore.put(blob, key)` — never `JSON.stringify`'d, never base64-encoded, never touches
  `localStorage`. Verified empirically in a real browser: a full `Object.keys(localStorage)` +
  per-key size dump after a real upload found zero Study-related keys of any kind.
- **"Upload storage 必须通过 adapter abstraction — UI 不能直接依赖 IndexedDB。"**
  `app-study.js` never calls `indexedDB.*` directly; it only calls
  `window.StudyUploadService.*` methods. The provider itself
  (`createLocalIndexedDbSubmissionProvider()`) is swappable via `StudyUploadService.useProvider()`,
  mirroring `services/map-note-service.js`'s existing `useProvider()` pattern exactly (same
  `REQUIRED_METHODS` validation shape) — a future cloud provider implementing
  `ready/list/create/update/getFileBlob/subscribe` can be swapped in with zero UI changes.
- **"Exact duplicate 必须以 SHA-256 为基础，覆盖 built-in + pending + approved（不含 rejected）。"**
  `findDuplicate()` in `services/study-submission-service.js` reads
  `window.STUDY_RESOURCE_MANIFEST` directly (the full array, not just publishable — a
  `manual_review` item's file still really exists) plus the in-memory submissions cache filtered
  to `pending`/`approved` only. `rejected` is deliberately excluded — verified by a direct test
  (resubmitting a rejected submission's identical bytes succeeds).
- **"Built-in manifest 永远不可变。"** `services/study-resource-service.js`'s `getManifest()`
  never mutates `window.STUDY_RESOURCE_MANIFEST` — it only concatenates a separately-sourced
  overlay array (`StudyUploadService.getApprovedResourcesSync()`). Re-verified after this stage:
  `Object.isFrozen(STUDY_RESOURCE_MANIFEST) === true` and its `.length` unchanged, both in the
  Node test suite and via the real manifest smoke test.
- **Storage / DOM safety**: no `sourceRelativePath`/`sourceBatch`/absolute filesystem path is ever
  rendered for an uploaded resource — `submissionToResource()` sets `sourceRelativePath: null` and
  `sourceBatch: "user_upload"` (a fixed literal, not the contributor's real folder structure, which
  doesn't exist for an in-browser upload anyway). The served-file identifier
  (`indexeddb://<submissionId>.<ext>`) never encodes the original filename or any local path,
  matching STUDY-V2-006's same "resourceId, never original path" rule for built-in files.
- **Verification method for this entry**: 49/49 direct-call checks
  (`node scripts/test-study-upload.mjs`) + a real Chrome browser session (create → inspect
  IndexedDB state directly via `javascript_tool` → confirm hidden from search/publishable →
  exact-duplicate re-upload blocked → LocalStorage dump empty). One real bug (a dead link to a
  pending submission's resource page) was found and fixed via the real-browser pass — see
  `study v2/reports/REPORT_STUDY-V2-007.md` for detail; not a data-safety or storage-invariant
  issue, a UI-link-correctness one.

## 2026-08-21 — STUDY-V2-005: Search/Filter invariants (publishability + ranking priority + College-as-filter-only)

### New invariants established (recorded verbatim, per explicit request)

- **"Study Search 只能搜索 publishable resources。"** — `searchResources()` in
  `services/study-resource-service.js` pools from `getPublishableResources()` by default (the same
  `reviewStatus === "auto_parsed" && moderationStatus !== "rejected" && !isDuplicate` gate every
  other Study Notes list/detail view uses); `includeUnreviewed` exists only as an explicit opt-in
  parameter no live UI code passes. Verified against real `manual_review` and `isDuplicate`
  manifest items: neither's own title ever surfaces in a search for that title's own keyword.
- **"Subject Code 的 exact match 必须拥有最高搜索优先级。"** — `searchResources()` is a 5-tier
  ranked function (exact Subject Code → prefix Subject Code → Title → Topic → Year), and exact
  Subject Code is unconditionally tier 1: a resource whose `subjectCode` case-insensitively equals
  the trimmed query is placed ahead of every other match type, full stop, regardless of title/
  topic relevance scoring. Verified: searching "SM015" returns only SM015 resources across its top
  results, not resources from other subjects whose title/topic happens to contain similar text.
- **"sourceCollege 可以作为 Filter，但永远不能重新成为 Study Notes browse hierarchy。"** —
  `filterResources()` accepts `sourceCollege` as one of several optional narrowing keys (alongside
  `subtype`/`year`/`category`/`subjectCode`); it is applied identically to every other filter key
  (a plain equality check against `resource.sourceCollege`) and never used to group, section, or
  route resources — no heading, tab, or URL segment is ever derived from it. This is the same
  invariant STUDY-V2-FOUNDATION-001/003/004 already established for sourceCollege as metadata;
  this stage extends it explicitly to cover the new Filter feature too, since Filter is the first
  place sourceCollege becomes an interactive, user-facing control rather than passive display text
  — re-verified no `<h1-4>` or section wraps a college name anywhere in the new filter/search code.
- **Verification method for this entry**: 56/56 direct-call checks (Node `vm`) against the real,
  unmodified manifest/service/router/study source, including real `manual_review`/`isDuplicate`
  exclusion tests, a real Subject-Code-priority ranking test (SM015), and a real sourceCollege
  filter test (SM015's 21 real distinct college values, applied as a filter, never a grouping key).
  See `study v2/reports/REPORT_STUDY-V2-005.md`.
- **Known gap, not fixed this stage**: Mobile and EN/BM were not independently toggled in a real
  browser for this stage's specific new UI (no Accessibility permission for click automation, no
  JS-injection permission in Safari) — same gap disclosed in every prior stage, still open.

## 2026-08-21 — STUDY-V2-006: File serving invariants (no filesystem path dependency + stable resource/file mapping)

### New invariants established (recorded verbatim, per explicit request)

- **"Resource UI 永远不能直接依赖本机 filesystem path；所有公开文件必须通过受控 `fileUrl` /
  storage mapping 提供。"** — `app-study.js` never reads or renders `sourceRelativePath`/
  `sourceBatch` (the internal provenance fields that DO record a local machine's folder
  structure) to build a link. The only field ever used to render a file link is `fileUrl`, a
  precomputed, repo-relative static path (`assets/study-files/<resourceId>.<ext>`) written once by
  `scripts/build-study-demo-files.mjs` — never constructed at render time from any other field.
  `StudyResourceService.getResourceFileUrl()` is the single sanctioned accessor; if a future
  change adds a second way to reach a file (e.g. a raw `sourceRelativePath` concatenation
  "shortcut" for convenience), that violates this invariant and reintroduces exactly the local-
  path-leak risk this stage was built to close.
- **"Resource metadata 与实际文件必须通过 stable resource/file mapping 对应，不允许仅靠标题猜文件。"**
  — every copied demo file is located via each manifest item's OWN `sourceBatch` +
  `sourceRelativePath` (already-stable fields from STUDY-V2-002, one lookup per item,
  independent of any other item), written to `assets/study-files/<resourceId>.<ext>` keyed by
  that item's own `id`, and the copy is re-hashed and compared against that same item's own
  `fileId` before being accepted — a mismatch is a hard error, not a warning. No code anywhere
  infers a file's location from another resource's path, from a shared filename prefix, or from
  title similarity. This is what makes Question↔Scheme mapping integrity provable rather than
  assumed: each side resolves its own file independently, so a Question's Detail page can never
  accidentally link to its Scheme's PDF (or vice versa) — verified directly (10 real pairs
  checked, 0 cross-wiring) rather than by inspection alone.
- **The Competition Demo File Set is an intentional, honest subset — not silently incomplete
  data.** Every publishable resource has a `demoAvailable` boolean; `false` renders a real,
  translated "not available in this demo" state, never a disabled-but-unexplained button and
  never a fake/dead link. If a future stage expands file coverage, it should extend
  `DEMO_SUBJECT_CODES` in `scripts/build-study-demo-files.mjs` (or generalize it) rather than
  building a second, parallel file-serving mechanism.
- **Verification method for this entry**: 39/39 direct-call checks (Node `vm`) combined with real
  filesystem + SHA-256 re-hash checks against the actual 377 copied files (not mocked), a
  genuinely random 20-resource spot check across the full 2284-item publishable pool, and real
  Safari browser confirmation that a Question PDF and its paired Scheme PDF open as distinct,
  correct content. See `study v2/reports/REPORT_STUDY-V2-006.md`.
- **Known gap, not fixed this stage**: Light Mode was not toggled in the real browser (no
  Accessibility permission for click automation, no JS-injection permission in Safari) — same gap
  as every prior stage, still open. 1907 of 2284 publishable resources have no real file yet (by
  design — see the Competition Demo File Set invariant above), not a bug to silently "fix" by
  copying more files without deciding on a size budget first.

## 2026-08-21 — STUDY-V2-004: Resource List invariants (Subject page data source + Question/Scheme linking)

### New invariants established (recorded verbatim, per explicit request)

- **"Study Subject 页面必须从 publishable StudyResource manifest 动态生成，不能 hardcode
  resource cards"** — `renderStudySubjectShell()` in `app-study.js` always sources its content
  from `StudyResourceService.getResourcesForSubjectInContext()`, which reads
  `data/study-resource-manifest.js` through `getPublishableResources()` at call time. No resource
  title/count/category/year is ever written directly into `app-study.js` or `style-study.css`. If
  a future change adds a "sample"/"placeholder" card for visual polish, that violates this
  invariant — the correct fix for an empty-looking page is the genuine empty state
  (`study.subjectEmptyState`), not a fabricated card.
- **"Question 与 Answer Scheme 使用 relatedResourceId/resourceGroupId 显式关联；不能靠标题让用户自己判断。"**
  — a Question's paired Answer Scheme is resolved via its real `relatedResourceId` field (set by
  `scripts/build-study-manifest.mjs` at manifest-generation time from `resourceGroupId` matching)
  and rendered as an explicit "paired scheme" link/label. No code in `app-study.js` parses or
  compares resource titles to infer a Question/Scheme relationship — if `relatedResourceId` is
  absent, the resource renders as a plain, unpaired row (this is the correct behavior for a
  genuine orphan, not a bug to "fix" by title-guessing).
- **Publishability is checked at both the list AND the direct-link boundary.**
  `getResourcesForSubjectInContext()` (list) and the new `isResourcePublishable()` (used by
  `renderStudyResourceDetail()` for direct `#/study/resource/:id` access) both route through the
  same `getPublishableResources()`/`isPublishable()` logic from `STUDY-V2-002` — there is no
  second, looser check anywhere that a manual_review/rejected/duplicate resource could reach the
  UI through. Verified against real `manual_review` and `isDuplicate` items pulled from the actual
  manifest.
- **Category tabs are a display-layer mapping (`getResourceCategory()`), not a taxonomy change.**
  The underlying `resourceType`/`resourceSubtype` fields on `StudyResource` are unchanged; the 7
  UI-facing categories are computed from them fresh on every render, and a tab is only shown if the
  subject has ≥1 publishable resource in that category (`studyResourceTabsHtml()` builds the list
  from what's actually present — no fixed/hardcoded tab set).
- **No internal/local field ever reaches rendered HTML.** `renderStudyResourceDetail()` only
  interpolates an explicit allow-listed field set; `sourceRelativePath`, `sourceBatch`, `fileId`,
  and any local filesystem path are read by the service layer but never passed into a template
  string in `app-study.js`. Verified by reading the render function's full field list, not just by
  absence-of-text testing.
- **Verification method for this entry**: 36/36 direct-call checks (Node `vm`) against the real,
  unmodified manifest/service/router/study source (SM015, AA015, AP015, a real Engineering
  subject, a synthetic zero-resource case, real `manual_review`/`isDuplicate` items, 3+ real
  Question/Scheme pairs), plus real Safari browser screenshots (Desktop, Mobile, Dark theme,
  Chinese language) of the real SM015 Subject page and a real Resource Detail page. See
  `study v2/reports/REPORT_STUDY-V2-004.md`.
- **Known gap, not fixed this stage**: Light Mode and EN/BM were not toggled in the real browser
  (no Accessibility permission for click automation, no JS-injection permission in Safari) — only
  confirmed via locale-file inspection and the direct-call suite. A future stage with click
  automation available (or manual user confirmation) should close this gap before it's assumed
  visually correct.

## 2026-08-21 — STUDY-V2-003: Canonical Browse Hierarchy invariant (refines STUDY-V2-FOUNDATION-001's invariant below)

### New invariant established

- **The canonical Study Notes browse hierarchy is Jurusan → Semester → Subject Code, and each
  level is its own route + its own render function that only reveals the NEXT level down — never
  more than one level at a time.** Concretely: `#/study/:jurusan` (`renderStudyJurusan`) may only
  render a Semester picker; it must never render or link directly to a Subject Code. Subjects may
  only appear on `#/study/:jurusan/sem/:semester` (`renderStudySemester`). This was violated once
  already (see `HANDOFF.md`'s `STUDY-V2-003` entry for the exact mechanism — the two routes
  originally shared one function that showed everything when no semester was given) and the fix
  was to make the two pages structurally distinct (`page: "study-jurusan"` vs
  `page: "study-semester"` in `getRoute()`, two separate functions in `app-study.js`) rather than
  a single function with an `if`-branch — this is deliberate: a shared function with a
  conditional is exactly what allowed the "show everything" shortcut to happen once, so the
  structural separation is the actual guard against it recurring, not just a stylistic choice.
- **College remains structurally absent from this hierarchy** — reconfirmed this stage: neither
  `renderStudyJurusan`, `renderStudySemester`, nor `renderStudySubjectShell` reference
  `sourceCollege` anywhere, and the invariant from `STUDY-V2-FOUNDATION-001` (below) still holds
  in full: `sourceCollege` is per-resource metadata only, never a route segment, never a
  query/grouping dimension, never a UI section.
- **Semester is now a validated enum (1 or 2), not just a parsed number.** Both
  `renderStudySemester()` and `renderStudySubjectShell()` explicitly check
  `canonicalSemester === 1 || canonicalSemester === 2` before proceeding — any other value
  (`3`, `0`, `NaN` from a non-numeric segment) falls through to the not-found shell. This was a
  real gap before this stage (the router did `Number(parts[3])` with no range check at all).
- **Resource-type badges must stay derived, never hardcoded.** `getResourceTypesForSubject()`
  computes distinct `resourceType` values from the subject's actual publishable resources at call
  time; if a future change hardcodes a fixed category list here "for visual completeness," that
  reintroduces the exact "不要为了视觉丰富而虚构 category" violation this stage's own instructions
  explicitly warned against.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-router.js`/`app-study.js`/`services/study-resource-service.js` against the real
  `data/study-subjects.js`/`data/study-resource-manifest.js`, asserting on real rendered HTML
  across all 4 jurusan × both semesters, plus 3 distinct invalid-route shapes. See
  `study v2/reports/REPORT_STUDY-V2-003.md`.
- **Known gap, not fixed this stage**: no real browser exists in this environment, so
  Desktop/Mobile/Light/Dark rendering and actual on-screen i18n text were not visually confirmed —
  only DOM/HTML string output and data-level i18n key presence were verified.

## 2026-08-21 — STUDY-V2-FOUNDATION-001: Study Notes IA invariant established

### New invariant established

- **Study Notes is organized `Jurusan → Semester → Subject Code → Resource`. `sourceCollege` is a
  per-resource metadata field only — never a route segment, never a query/grouping dimension,
  never a UI section.** This is the single most important rule in this module. It is stated as a
  code comment at the top of `data/study-subjects.js` and `services/study-resource-service.js`.
  Verified by direct inspection of the real generated manifest: every one of the 2468 items' only
  college-related field is `sourceCollege` (a free-form string or `null`); `jurusan` is always one
  of exactly 4 registry values. There is no `getResourcesByCollege(...)`-shaped function anywhere
  in `services/study-resource-service.js`, and none of the 6 canonical Study routes in
  `app-router.js`'s `getRoute()` contain a college/org segment. Any future change that adds one is
  reintroducing the exact IA mistake the product's own spec document and
  `ECHOWALL_V2_MASTER_TASK_SPEC.docx` explicitly ruled out for this feature — check this
  specifically before adding any new Study Notes query, route, or UI section.
- **The manifest builder (`scripts/build-study-manifest.mjs`) never silently guesses uncertain
  metadata.** Every item is either `reviewStatus:"auto_parsed"` (all required fields confidently
  detected) or `reviewStatus:"manual_review"` with a specific, human-readable `parseWarnings`
  entry explaining exactly what could not be confirmed (ambiguous compound subject folder,
  unrecognized resourceType keyword, missing year on a paper-type resource, unrecognized file
  extension, or an un-extracted zip with no matching folder). `services/study-resource-service.js`'s
  `getPublishableResources()` excludes anything not `auto_parsed` (plus `isDuplicate` items) from
  ordinary browse results — this is the enforcement point for "不自动发布不确定 metadata," not a
  UI-level filter that could accidentally be bypassed by a different render path, since every
  count/list function in the service is built on top of `getPublishableResources()`.
- **Question↔Answer Scheme linking is real, hash-based duplicate detection is real** — not
  placeholders. `relatedResourceId` is set bidirectionally when a resourceGroupId (subject + year
  + parent folder) contains exactly one non-scheme item and one-or-more scheme items (filename-
  keyword-detected). `fileId` is a `sha256:`-prefixed content hash; `isDuplicate`/
  `duplicateOfResourceId` are set when two items share the same `fileId`. **A real grouping bug
  was found and fixed during this stage's own verification** (see `HANDOFF.md`'s entry for the
  exact mechanism — including `resourceType` in the group key silently broke every pairing since a
  Question and its Scheme always have different types by definition) — this is exactly the kind of
  bug that direct-call verification against real data caught that a purely architectural review
  would not have.
- **The generated manifest (`data/study-resource-manifest.js`, 2468 items, ~2.0MB) contains
  metadata only** — verified by inspection that no field holds file content, only a hash, a
  relative path string, and a batch label. No PDF/DOCX was copied into the repository. This
  matches the spec's explicit storage constraint ("PDF 文件不放 LocalStorage... 大文件应使用对象
  存储") — this manifest is the spec's own explicitly-sanctioned "competition demo fallback," not
  a production storage layer, and must not be treated as one by a future stage.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-data.js`/`data/study-subjects.js`/`data/study-resource-manifest.js`/
  `services/study-resource-service.js`/`app-router.js`/`app-study.js`, real route parsing, real
  rendering, plus independent `find`-based cross-checks of the real source folders (junk-file
  count and per-jurusan file count both matched the manifest's own self-reported stats exactly).
  See `study v2/reports/REPORT_STUDY-V2-FOUNDATION-001.md`.
- **Known gap, not fixed this stage**: no real browser exists in this environment, so
  Desktop/Mobile/Light/Dark rendering and actual on-screen i18n text were not visually confirmed —
  only data-level i18n key presence and DOM/HTML string output were verified. Flagged honestly
  rather than claimed as tested, consistent with every prior stage this session.

## 2026-08-21 — COMMUNITY-V2-POLISH-005: Shared pointer-glow engine invariant reconfirmed with a third call site

### Confirms, does not change, the POLISH-004 invariant directly below this entry

- **The "exactly one pointer-follow implementation" invariant from `COMMUNITY-V2-POLISH-004` now
  covers a third surface** ("All KM Students") and is verified to still hold: `app-router.js`
  (where `initializePointerGlowCard`/`initializePointerGlowCards` live) was proven byte-identical
  to its `COMMUNITY-V2-POLISH-004` state by direct file comparison — this stage added a UI surface
  with zero JS changes, which is exactly what the invariant is supposed to make possible.
- **The size-variant pattern (`.org-card-global`) is now precedented, not hypothetical.** Any
  future pointer-glow surface with different proportions should follow it: one CSS class, three
  rules overriding only radius/anchor values on the existing `.org-card-ambient`/`-rings`/
  `-pointer-glow`/`home-community-card-*` selectors — never a new JS hook, never new custom
  property names.
- **Verification method for this entry**: a direct string-equality check between the working
  `app-router.js` and the checkpoint-archived `COMMUNITY-V2-POLISH-004` "after" snapshot (not just
  "I didn't edit that file" — an actual byte comparison), plus the same real-`vm`-execution
  multi-element isolation test method established in the `POLISH-004` entry, extended to three
  simulated elements instead of two. See
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-005.md`.
- **Known gap, not fixed this stage**: same as `POLISH-004` — real browser interaction
  verification is still outstanding for all three surfaces (Homepage card, "All KM Students",
  College cards). Logic-level verification only.

## 2026-08-21 — COMMUNITY-V2-POLISH-004: Single shared pointer-glow engine invariant

### New invariant established

- **There is exactly one pointer-follow "gold glow" implementation in this codebase:
  `initializePointerGlowCard(card)` / `initializePointerGlowCards(selector)` in `app-router.js`.**
  Any future surface that wants this interaction (a third card type, a redesigned building card,
  etc.) must call `initializePointerGlowCards("<its own data-attribute selector>")` from
  `initializeRenderedPage()`, not hand-roll a new `requestAnimationFrame`/damping loop. Verified
  by grep before closing this stage: only one occurrence of the damping/easing logic exists in the
  repo.
- **The engine is purely mechanical — it knows nothing about visual size or color.** It only ever
  writes `--pointer-x`/`--pointer-y` (percentages, 0-100%, relative to the target element's own
  `getBoundingClientRect()`) onto whatever element it's given. All visual differences between the
  Homepage's `.home-community-card` (large, hardcoded gold) and the Community Hub's
  `.org-card[data-pointer-glow-card]` (small, `color-mix()`-based theme-adaptive gold) live
  entirely in CSS. This separation is what let this stage add a second, differently-styled surface
  without touching the engine's logic at all.
- **Per-card state is closure-scoped, never module-level.** `rect`/`current`/`target`/`raf` are
  all local variables inside `initializePointerGlowCard()`'s function body, one fresh set per call.
  Verified with a simulated two-card test: hovering/moving/leaving one fake card element never
  mutated a sibling fake card's `--pointer-x`/`--pointer-y`. If a future refactor ever moves any of
  this state onto `card.dataset`, `document`, or a shared object keyed by selector, that would
  reintroduce exactly the "all cards glow together" bug this stage was built to avoid — check for
  this specifically before making the engine "smarter."
- **Cross-card visual bleed is structurally prevented by `.org-card`'s pre-existing
  `overflow:hidden`, not by glow-radius tuning.** Each card's `org-card-ambient`/`-rings`/
  `-pointer-glow` layers are `position:absolute;inset:0` *inside* that card's own box, which clips
  them at the card's own edge regardless of the gradient's declared radius. This means a future
  change to the radius values (e.g., making the college-card glow bigger) cannot, by construction,
  make it bleed into a neighboring grid cell — the risk that even needs checking is narrower than
  it might look.
- **`data-pointer-glow-card` is the sole opt-in signal.** `globalCard` ("All KM Students",
  `app-community.js`) deliberately does not have it and is byte-identical to its pre-stage state.
  If `.org-card` usage ever expands elsewhere in the app, the pointer-glow effect will NOT
  automatically apply — it requires both the attribute on the markup and the three child `<span>`
  layers; forgetting either is inert (the CSS scoping and the `querySelectorAll` selector both key
  off the same attribute) rather than partially-broken.
- **Theme-adaptive color via `color-mix()` is the preferred pattern going forward for new
  glow/accent colors on `.org-card`-based components** (already established elsewhere in this file
  for focus rings — line ~606/662/677) — it eliminates the need for a parallel
  `:root[data-theme="dark"] ...` override block. The Homepage's `.home-community-card-*` still
  uses hardcoded gold (not `color-mix()`) since it's an "always-dark banner regardless of page
  theme" design (same precedent as `.map-promo`); the College Cards' white-in-light/dark-in-dark
  design is the case where `color-mix()` earns its keep, and future dark-surface-in-light-theme
  cards should keep using the hardcoded approach while future normal-surface cards should use
  `color-mix()`.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-router.js`/`app-community.js`, with two independent simulated card elements, asserting on
  real per-element state after simulated `pointerenter`/`pointermove`/`pointerleave` sequences. See
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-004.md`.
- **Known gap, not fixed this stage**: real browser interaction verification (does the glow
  visually, actually follow the cursor; does hovering one card leave siblings dark) is still
  outstanding — logic-level verification only. This environment has GUI screenshot capability but
  not input-simulation capability (see the `HOMEPAGE-POLISH-002/002A/002B` HANDOFF entry for the
  specific permission blockers). Flagged honestly rather than claimed as tested.

## 2026-08-21 — COMMUNITY-V2-POLISH-003: Hub college layout restored to card grid (IA invariant below UNCHANGED)

### Refines, does not supersede, the POLISH-002 invariant directly below this entry

**The POLISH-002 IA invariant — "no college grid/route/note-count may render on the Homepage;
`#/community` is the only page that may list all colleges" — is still fully correct and was not
touched by this stage.** This stage only changes *how* `#/community` renders its college list:

- **`renderCommunityHub()`'s `College Communities` section now uses `.org-card`/`.org-grid`
  (restored verbatim from the pre-POLISH-001 backup), not the POLISH-001 compact
  `.selection-list`.** This is not a reintroduction of POLISH-001's original problem (a duplicate
  grid across two pages) — POLISH-002 already removed the Homepage's only other grid, so there is
  exactly one `.org-card` college grid in the whole app, on `#/community`, same as before.
- **`.org-grid`'s CSS was not changed.** Its existing `repeat(auto-fit,minmax(245px,1fr))` rule
  at this page's `.container` width (1160px, 18px gap) already computes to 4 columns
  (`(1160-3×18)/4≈276.5px`, above the 245px minimum) and not 5 (`(1160-4×18)/5≈217.6px`, below
  the minimum) — verified by arithmetic, not a new rule. The unchanged
  `@media (max-width:720px)` override still collapses to 1 column on mobile.
- **`renderCollegeLanding()`'s Jurusan `.selection-list`/`.selection-item` is a distinct
  component for a distinct purpose (stream selection inside one college) and must be evaluated
  separately from the Hub's college-discovery grid** — do not assume a future change to one
  implies the other should change too, even though both currently share the `.selection-item`
  CSS class name.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-community.js`, asserting on real rendered HTML (2 `.org-grid` sections, 13 `.org-card`
  elements, full original card sub-structure, canonical routes for all 12 colleges). See
  `community v2/reports/REPORT_COMMUNITY-V2-POLISH-003.md`.
- **Known gap, not fixed this stage** (same as POLISH-001/002): no real browser exists in this
  environment, so the 4-column claim was verified by CSS-rule arithmetic against the exact same
  rule that was already in production (on the pre-POLISH-001 Homepage) rather than by a
  screenshot. Risk assessed low — restored markup + restored CSS usage, not new code.

## 2026-08-21 — COMMUNITY-V2-POLISH-002: Corrected IA invariant — Homepage owns zero colleges, Hub owns all of them

### Supersedes the POLISH-001 invariant directly below this entry

**`COMMUNITY-V2-POLISH-001`'s recorded invariant — "the full-size Kolej `.org-card` grid may
render in exactly one place: the Homepage" — is no longer correct and must not be used to justify
restoring a college grid to the Homepage.** The corrected, current invariant:

- **No college grid, no per-college route, and no per-college note count may render on the
  Homepage at all.** `renderHome()`'s `#communities` section (`app-router.js`) is now a single
  static CTA (reusing `.map-promo`) that routes only to `#/community` — never to
  `#/community/:orgId` directly, never to legacy `#/org/:orgId`. If a future change adds any
  college-specific card, button, or link back to the Homepage, that reintroduces the exact
  problem this stage was asked to fix — check this invariant before doing so.
- **`renderCommunityHub()` (`app-community.js`, route `#/community`) is the only page that may
  list all colleges.** It shows `All KM Students` (global card → `#/community/all`) plus every
  college as a compact `.selection-list` row → canonical `#/community/:orgId`. This part of the
  invariant is unchanged from POLISH-001 — only the Homepage side of the rule flipped.
- **Data source invariant unchanged and reverified**: `organizations` (`app-data.js`) and
  `getCommunityNoteCount()` (`app-router.js`) remain the single source/helper for the Hub's
  college list. The Homepage no longer reads per-college data at all (its `homepageCommunitiesDisplay`
  stat still reads `organizations.length` for the aggregate count shown in the stats row, which
  is not a per-college listing and stays as-is).
- **Canonical route invariant unchanged**: `#/community/:orgId`, never `#/org/:orgId`, for any
  college link anywhere in the app (Hub, College Landing). The legacy `#/org/:orgId` →
  `#/community/:orgId` `replaceState` redirect in `getRoute()`/`render()` is untouched.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-data.js`/`app-router.js`/`app-community.js`, asserting on real rendered HTML (not
  read-and-assume). See `community v2/reports/REPORT_COMMUNITY-V2-POLISH-002.md`.
- **Known gap, not fixed this stage** (same as POLISH-001): no real browser exists in this
  environment, so Desktop/Mobile/Light/Dark rendering was not visually confirmed, only DOM/HTML
  string output. Risk assessed low — this stage net-removes Homepage layout surface (12 cards →
  1 CTA), it does not add any.

## 2026-08-21 — COMMUNITY-V2-POLISH-001: Homepage vs. Community Hub IA invariant (SUPERSEDED — see entry above)

### IA invariant established (not just a UI tweak — recorded here per this task's own instruction to log route/IA invariants)

- **The full-size Kolej `.org-card` grid (icon, note count, description, "Enter community") may
  render in exactly one place: `renderHome()`'s `#communities` section in `app-router.js`.** Any
  future change that adds a second full `.org-card` grid for `organizations` on another route
  (e.g. `#/community`, `#/community/all`, or any future page) reintroduces the duplicate-IA
  problem this task fixed — check for this specifically before adding a new college grid anywhere.
- **The Community Hub (`#/community`) may reference the same `organizations` data and the same
  canonical routes, but must render colleges as the compact `.selection-list`/`.selection-item`
  list, not `.org-card`.** This is enforced in `renderCommunityHub()` in `app-community.js`.
- **Data source is single: `organizations` in `app-data.js`, count via `getCommunityNoteCount()`
  in `app-router.js`.** Verified by grep before this change — no second organizations-like array
  and no per-college `if (name === "KMK")` branching exists anywhere in the codebase. This must
  stay true; if a future stage adds college-specific behavior, it belongs in the `organizations`
  array's data (e.g. a new field) or a shared helper, not inline conditionals.
- **Canonical route invariant unchanged and reverified**: Homepage college cards and Hub college
  rows both link directly to `#/community/:orgId` (`app-router.js` line ~293, `app-community.js`
  `renderCommunityHub()`) — never `#/org/:orgId`. The legacy `#/org/:orgId` → `#/community/:orgId`
  `replaceState` redirect in `getRoute()`/`render()` (`app-router.js`) is untouched and remains
  the only place that alias is handled.
- **Verification method for this entry**: real Node `vm` execution of the actual unmodified
  `app-data.js`/`app-router.js`/`app-community.js` (not reimplemented stubs) — confirmed via
  string/regex assertions on the real rendered HTML, not by reading the code and assuming.
  See `community v2/reports/REPORT_COMMUNITY-V2-POLISH-001.md` for the full check list.
- **Known gap, not fixed this stage**: no real browser (Playwright/Chrome) exists in this
  environment, so Desktop/Mobile/Light/Dark rendering was not visually confirmed — only DOM/HTML
  string output was verified. Flagged honestly rather than claimed as tested; low risk since the
  new markup reuses an existing, already mobile/dark-verified CSS component with zero new rules.

## 2026-08-21 — COM-V2-007: Permission Hooks

### Reviewed invariants

- **Single source of truth for permission logic, verified by grep, not assumed.** After the refactor, confirmed no remaining `if (!currentUser)`/`if (!AuthService.getCurrentUser())` gate exists in `app-wall.js` for post/comment creation outside of `PermissionService.canUserPost`/`canUserComment` — the 3 call sites (`openDrawer`, `handleFormSubmit`, `submitComment`) all now route through the same two functions.
- **Explicitly non-security, documented in three places** (the service file's own header, this audit entry, HANDOFF) — consistent with the master spec's repeated instruction that front-end permission checks in this prototype must never be presented as a real security boundary. This matters because a later stage or a different session might otherwise mistake `PermissionService` for finished authorization and skip building real backend checks when this becomes a production system.
- **The one genuinely new behavior (college-moderator can mark solved) was verified with the correct boundary condition, not just the positive case.** Tested a college moderator against a Question belonging to their own college (allowed), a Question belonging to a different college (implicitly denied — not the author, not global, `orgId` mismatch), and against `global:all` scope (must be denied even for a "moderator" — verified via `canUserModerateCommunity`, and `canUserMarkSolved`'s own `communityScope !== "global"` check mirrors this). All three shapes of the boundary were checked, not just the allowed case.
- **Honest reporting over fake verification.** The prototype's actual `echo-wall-users:v1` data was not fabricated or edited to manufacture a "College Admin" test account — the report and this entry are explicit that the college-moderator branch is logic-verified via constructed objects only, matching the task's own instruction: "如果现有 prototype 用户数据无法覆盖某角色，只能报告 Not verified，不要 fake verification."

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: real sign-out → confirmed browsing still works → confirmed "Leave a Note" opens the real sign-in modal → real sign-in → confirmed identical session restored; 13-case permission matrix via direct function calls against real `CommunityService` descriptors; Building Wall compose regression-check post-refactor; Admin/Echo Map regression.
- `node --check` passed for `services/permission-service.js` and `app-wall.js`.
- No automated test suite exists for this project; verification above is manual (real browser, a real sign-out/sign-in cycle, and explicit constructed-object testing for roles with no real account) — not code inspection alone, and not silently assumed for the untestable role.

### Rollback boundary

See `community v2/checkpoints/COM-V2-007/ROLLBACK.md`. No data-loss implications (no persisted schema changed). Independent of `services/auth-service.js` (never touched), COM-V2-005's `CommentService`, and COM-V2-004's CSS fix — none should be bundled into this stage's rollback.

## 2026-08-21 — COM-V2-006: Solved / Unanswered

### Reviewed invariants

- **Permission check is real, not decorative — verified with a negative case, not just the positive path.** `canUserMarkSolved()` was tested against 4 distinct synthetic identities: a stranger (denied), the real author (allowed), an unrelated `role:"admin"` user (allowed — prototype moderator stand-in), and a Discussion post regardless of user (denied, since Mark Solved never applies). All 4 matched expectations exactly, confirmed via direct function calls, not just by observing the button's visibility in one session.
- **This is explicitly documented as a front-end-only gate, not a security boundary** — consistent with the master spec's repeated instruction that prototype permission checks must not be presented as real security (real enforcement requires a backend). The button's absence from the DOM when `canUserMarkSolved()` returns false is a UX courtesy, not access control; anyone could call `setQuestionStatus()` directly from the console today. This is called out explicitly in both the code comment and this audit entry so it isn't mistaken for a finished security feature in a later stage.
- **Unanswered's filter+sort combination was verified dynamically, not just as a static snapshot.** The same test Question was observed present in the Unanswered list (0 comments), then absent after a comment was added, then absent again for a different reason (Solved) after being marked solved — three distinct state transitions, each re-checked against the filter, confirming the filter reads live state (`CommentService.getCommentCount()` + `questionStatus`) rather than a cached/stale value.
- **Coarse permission scoping was identified and explicitly deferred, not silently shipped as if it were complete.** `canUserMarkSolved()`'s `user.role === "admin"` branch has no per-`communityScope` awareness — flagged in this entry, the report, and HANDOFF as a known gap for COM-V2-007 to close, rather than being presented as finished moderation.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: full canonical E2E flow with real UI interaction and real reload-persistence check; Unanswered filter tested through 3 distinct state transitions; permission matrix tested via 4 direct function calls with synthetic user objects; Dark+ZH; KMK→Sains/Building Wall/Admin regression.
- `node --check` passed for `app-wall.js` and all 3 locale files.
- No automated test suite exists for this project; verification above is manual (real browser, real state transitions observed over time, not a single static check).

### Rollback boundary

See `community v2/checkpoints/COM-V2-006/ROLLBACK.md`. Independent of COM-V2-004's `.form-group[hidden]` fix and COM-V2-005's `CommentService` (only read from, never modified, by this stage) — do not bundle any of their reverts together.

## 2026-08-21 — COM-V2-005: Comments + One-Level Reply

### Reviewed invariants

- **Security: no raw HTML injection path exists.** Every place a comment's `content` or `authorNickname` reaches the DOM (`buildCommentHTML`) passes through `escapeHtml()` — verified live with `<script>`/`<img onerror>` payloads via the real Compose UI, not just static analysis: no dialog fired, no console error, page remained interactive.
- **One-level depth is enforced at the data layer, not just the UI.** `CommentService.createComment()` looks up the actual parent comment and checks `parent.depth >= 1` before accepting a reply — this means even a direct, UI-bypassing call to `createComment()` (e.g. from a future feature or a bug elsewhere) cannot create a depth-2 comment. Verified by calling `createComment({parentCommentId: <a depth-1 comment's id>})` directly and confirming it throws.
- **Post isolation verified with real data, not assumed from the `postId` filter alone.** Created comments on two distinct real posts and confirmed `getCommentThreadForPost()` returns zero cross-contamination in either direction — the filter (`comment.postId === canonicalPostId`) is simple, but the actual behavior was observed, not just read.
- **No note data is mutated by comment creation.** `submitComment()` never writes to the `notes` array or calls `saveNotes()` — the sticky card's comment count is a live `CommentService.getCommentCount()` read at render time, matching the explicit "commentCount is derived/cache, not source of truth" design constraint from the spec. Verified: creating a comment does not change `note.commentCount`'s stored value (still `0` from creation), yet the rendered wall card and modal both show the live count.
- **Scope-agnostic by construction.** `CommentService` has no dependency on `CommunityService`, `communityKey`, or scope — comments are addressed purely by the post's numeric `id`. This was a deliberate simplicity choice verified to work correctly across Jurusan (tested) without any extra code for Global/College General (same `id` space, same service, same UI).
- **Read-only surfaces correctly excluded.** `openModal()` gates the comments section on `note.contextType === "community" && !isDemoSeed` — verified directly: a Building note's modal has no comments section, and a Demo Seed (read-only) note's modal also has none, both confirmed by screenshot inspection, not just by reading the conditional.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: real comment + reply creation with XSS payload, 2-post isolation check, depth-2 rejection via direct service call, all 3 validation guards (empty/too-long/no-auth) via direct service calls, anonymous-safety check (no nickname leak in storage or DOM), live comment-count sync on the wall, persistence across a real page reload, Building/Demo-Seed exclusion, Dark+ZH, Admin/Echo Map regression.
- `node --check` passed for `services/comment-service.js`, `app-wall.js`, all 3 locale files.
- No automated test suite exists for this project; verification above is manual (real browser, real created data, direct security-payload testing) — the XSS check in particular was executed against the live DOM, not inferred from code review alone.

### Rollback boundary

See `community v2/checkpoints/COM-V2-005/ROLLBACK.md`. Independent of COM-V2-004's `.form-group[hidden]` fix (different files, different concern) — do not bundle their reverts.

## 2026-08-21 — COM-V2-004: Discussion / Question Post Type

### Reviewed invariants

- **Badge rendering has a single source of truth.** `getQuestionBadgeHTML(note)` is called identically from `buildNoteDOM()` and `openModal()` — no divergent badge logic between wall-card and detail-modal presentation. Verified both surfaces show identical badge text/state for the same note.
- **Type filter never affects Building Wall.** `getFilteredNotes()`'s new check is gated on `wallState.contextType === "community"` — verified the toolbar's Type filter-group HTML itself is also conditionally rendered only for `context.contextType === "community"` (double-gated: absent from the DOM entirely on Building Wall, and even if it were present, the filter logic itself would no-op for building notes since they never have `postType`).
- **A real, previously-undetected `[hidden]` bug was caught by testing, not by inspection.** The Post Type selector's `hidden` DOM property was correctly `true` on the Building Wall (confirmed via direct property read), yet the element rendered with nonzero height — traced to `.form-group{display:flex}` beating the UA `[hidden]{display:none}` default, the exact same cascade-precedence issue previously documented for `map.html`'s `.building-search`/`.building-list`. This confirms the project has now hit this specific CSS pitfall twice in two different files — worth grep'ing for `.hidden` toggles against any element with an explicit `display` rule before assuming a future `[hidden]` toggle "just works" without visual confirmation.
- **Legacy default preserved, verified not just assumed.** Every pre-existing seed/legacy note was spot-checked post-change to confirm none acquired a Question badge — `postType` for those notes is set once by COM-V2-001's `normalizeStoredNote()` (`"discussion"` default) and this stage's compose-time logic never touches already-stored notes, only new ones.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: real Question-post creation via the Compose UI, badge verified on card + modal, Type filter isolation (1/82 correct), Building Wall compose regression (Post Type selector correctly absent post-fix), Dark+ZH, Admin regression. Test data cleaned up (removed by explicit ID), KMK→Sains count confirmed back to 81.
- `node --check` passed for all 5 touched `.js` files.
- No automated test suite exists for this project; verification above is manual (real browser, real created data, real DOM property reads for the `[hidden]` bug specifically — not just visual screenshot comparison), not code inspection alone.

### Rollback boundary

See `community v2/checkpoints/COM-V2-004/ROLLBACK.md`. The `.form-group[hidden]` CSS rule is flagged there as a fix that should generally survive even a full rollback of this stage's other changes, since it's an independent, generally-applicable bug fix rather than feature-specific styling.

## 2026-08-21 — COM-V2-003: Global + College General Wall

### Reviewed invariants

- **No magic orgId/majorId values reach stored note data, verified by construction and by direct inspection of real created notes.** `handleFormSubmit()` derives `noteOrgId`/`noteMajorId` from `wallState.communityScope` with explicit branches (`global` → both `null`; `college` → real `orgId`, `null` majorId; `jurusan` → both real) — `wallState.orgId`'s internal `0`-for-"unset" bookkeeping value is never copied into a note directly for the global case. Verified on a real created Global note: `orgId: null` (not `0`), `majorId: null`.
- **Two latent data-loss bugs in COM-V2-001's `normalizeStoredNote()` were caught by this stage's own testing, not by inspection alone**, and both are now fixed: a scope-blind validation gate that would have `return null`'d (silently dropped) every Global/College General post on next load, and an unconditional `Number(note.orgId)` coercion that would have turned a genuine `null` into a magic `0`. Both were verified fixed by reloading the page after creating test posts of each scope and confirming they survived (present in `notes` post-reload, correct field values) — not just verified as "should work" from reading the diff.
- **Single filtering mechanism, no divergent logic.** `getContextNotes()` (app-wall.js) and `CommunityService.getCommunityPosts()` (COM-V2-001, services/community-service.js) both resolve a note's community key through the same `getCommunityKeyForNote()` — verified by cross-checking `getContextNotes()`'s live count against `CommunityService.getCommunityPosts('jurusan:1:1').length` and finding them identical (81) both before and after test-post creation/cleanup.
- **No second wall renderer.** `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall` are thin wrappers that call the identical `renderContextWall()` any Jurusan wall calls — verified by confirming Compose, photo upload, translation, and voting all worked identically on the Global wall via real UI interaction (not code-path assumption).
- **Legacy `wallKey` compatibility scoped correctly.** `wallKey: 'community:{orgId}:{majorId}'` is now only attached when `communityScope === "jurusan"` (`handleFormSubmit`) — verified a real Global post has no `wallKey` field at all (no legacy consumer ever expected one there), and a real Jurusan post still has the exact legacy format.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: a real 3-note-across-3-scopes creation + 5-wall × 3-post isolation matrix (15/15 correct) using the actual Compose UI end-to-end, persistence-across-reload confirmed for both creation and cleanup, KMK→Sains count integrity (81→82→81) tracked through the whole cycle, Building Wall/Admin/Echo Map regression, Dark+ZH and Light+EN on the new Global wall.
- `node --check` passed for `app-data.js`, `app-wall.js`, `app-router.js`, `app-community.js`.
- No automated test suite exists for this project; verification above is manual (real browser, real created/persisted data, real DOM/state reads), not code inspection or simulated data alone.

### Rollback boundary

See `community v2/checkpoints/COM-V2-003/ROLLBACK.md`. Rollback has a genuine data-loss implication if real Global/College General content exists by then (documented in that file) — this is noted here because it's a real architectural consequence of this stage's validation-gate change, not just a mechanical revert.

## 2026-08-21 — COM-V2-002: Community Router + Hub

### Reviewed invariants

- **Route-check ordering was verified against the actual existing chain before inserting new checks**, not assumed. The `org-map`/`org-buildings`/`org-building` routes (a separate multi-college framework, explicitly frozen for Community V2) are checked with specific `parts.length`/`parts[2]` conditions that only match 3–4 segment hashes; the new bare-`org` legacy catch-all (`parts.length === 2`) cannot shadow them regardless of insertion order, but was still placed after them for readability. Verified live: `#/org/2/map` and `#/org/2/buildings` still resolve to `org-map`/`org-buildings`, not the new legacy redirect.
- **No redirect loop or history-stack growth is possible by construction**: every legacy redirect uses `replaceRoute()` (→ `history.replaceState`), never `navigate()` (→ pushes a new hash). A legacy hash is therefore never itself a distinct history entry — pressing Back from a page reached via a legacy hash returns to whatever was open *before* the legacy hash was set, skipping over it entirely. Verified with a real browser Back-button press (not just code inspection): Hub → KMK Landing → Sains wall → wall's back button (`#/org/1`, legacy) → Back button → landed directly back on the Sains wall, no stuck intermediate state.
- **No duplicate wall renderer.** The canonical `#/community/:orgId/jurusan/:majorId` route parses to `{page:"wall", orgId, majorId}` — the exact same route object shape the old `#/wall/:orgId/:majorId` produced — so it flows through the identical existing `renderWall(app, route.orgId, route.majorId)` call and the existing org/major-mismatch guard. Verified the guard still fires correctly for `#/community/1/jurusan/999` (shows the pre-existing "Wall not found" page, unmodified).
- **Dead code was identified, not silently left as an unnoticed regression risk.** `renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` in `app-router.js` are unreachable now that `#/org/:orgId` returns `{page:"community-college", legacy:true}` instead of `{page:"org"}` — confirmed by grep that `render()`'s `route.page === "org"` dispatch branch has no other caller. Left in place deliberately (documented in HANDOFF/PROGRESS as a flagged cleanup item) rather than deleted, per this run's "don't rewrite more than the task requires" discipline.
- **This stage is deliberately data-independent from COM-V2-001.** Neither `app-router.js` nor `app-community.js` calls `CommunityService`/`COMMUNITY_DESCRIPTORS` — Hub/Landing pages read `organizations`/`majors`/`getCommunityNoteCount()` directly, the same primitives the pre-existing home page already used. This keeps COM-V2-002 independently revertible without touching COM-V2-001's data layer.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: full route table (5 canonical + 3 legacy shapes + 2 invalid cases), a real Back-button history test, 2 distinct College Landings (map-button presence differs correctly by college), Dark+ZH and Light+EN, a real mobile viewport, and Building Wall/Admin/Echo Map regression — all zero console errors.
- `node --check` passed for `app-router.js`, `app-community.js`, all 3 locale files.
- No automated test suite exists for this project; verification above is manual (real browser + real DOM/hash/history reads), not code inspection alone.

### Rollback boundary

See `community v2/checkpoints/COM-V2-002/ROLLBACK.md`. Must not touch `data/community-config.js`, `services/community-service.js`, `app-data.js` (COM-V2-001), or any Building/Map file — none were modified this stage.

## 2026-08-21 — COM-V2-001: Community Registry + Post Compatibility Layer

### Reviewed invariants

- **No magic values.** Community V2's three scopes (`global`/`college`/`jurusan`) are identified purely by `communityKey`/`communityScope` strings, never by `orgId=0`/`majorId=null` sentinels — this was an explicit anti-pattern called out in the spec (existing `wallState.orgId:0`/`majorId:0` already does this for "unset", and the new registry deliberately does not extend that pattern). `CommunityService.getCommunityKey(scope, orgId, majorId)` is the single place that constructs a key; `parseCommunityKey`/`isValidCommunityKey` are the single place that validates one — no other file does ad hoc string-building or regex matching for community keys.
- **No duplicate data.** `data/community-config.js`'s `COMMUNITY_DESCRIPTORS` reads `organizations`/`majors` directly (both pre-existing top-level `const`s in `app-data.js`) at script-load time — it does not copy college names/ids/major names anywhere. If a college or major is ever added to `app-data.js`, the descriptor list picks it up automatically on next load with no second file to update.
- **Normalization is idempotent and non-destructive.** `normalizeStoredNote()`'s community-only backfill block checks `isValidCommunityKey(normalized.communityKey)` before deriving a new one — an already-normalized note's `communityKey`/`communityScope` survive re-normalization unchanged rather than being recomputed every load. No field is ever deleted: the object literal still spreads `...note` first, so any field not explicitly touched (including `wallKey`, `batchId`, and any future field a production backend might add) passes through untouched. Verified by re-running `loadNotes()` twice in the same session via a second reload and confirming a note's `communityKey`/`postType` values were identical both times (not toggled/reset).
- **Building notes are structurally protected, not just conditionally skipped.** The V3 backfill is inside `if (contextType === "community")`, and `contextType` is computed once at the top of `normalizeStoredNote()` from `note.contextType === "building" ? "building" : "community"` — there's no code path where a note both has `placeId` truthy and also receives `communityKey`. Verified directly: a real `B_PUSTAKA` building note has `schemaVersion:2` and no `communityKey`/`communityScope` keys present on the object at all (not even `undefined` — genuinely absent, since normalization never sets them).
- **The demo-seed bundle boundary was found and respected, not assumed.** Before writing any normalization code, traced `activateDemoSeedSnapshot()`/`loadDefaultDemoSeed()` in `app-data.js` and confirmed the 696-note demo-seed bundle never calls `normalizeStoredNote()` — it has its own `validatePortableDemoSeedBundle()`/`validateShowcaseDemoSeedSnapshot()` invariant checks (exact wall counts, exact key uniqueness) that would break if a note shape changed. `CommunityService.getCommunityKeyForNote()` was written specifically so `getCommunityPosts()` works correctly against *both* normalized real notes and un-normalized demo-seed notes without mutating the latter — verified `getCommunityPosts('jurusan:1:1').length` (81) exactly matches the wall's own direct `orgId`/`majorId` filter count, meaning both note sources (23 real seed/localStorage notes + demo-seed runtime notes for that wall) are correctly included.
- **Script load order was verified against actual dependency direction, not assumed from the PDF spec.** `community-config.js` needs `organizations`/`majors` (declared in `app-data.js`) at its own top-level execution time, so it must load after `app-data.js` — confirmed by placement in `index.html`. `community-service.js` needs `COMMUNITY_DESCRIPTORS` (from `community-config.js`) and `getRuntimeNotes` (from `app-data.js`) — also placed after both. The one non-obvious direction is that `app-data.js`'s `normalizeStoredNote()` *calls into* `CommunityService`, which loads *after* it in `index.html` — this is safe only because the call happens at `loadNotes()` runtime (triggered by `DOMContentLoaded`, after all scripts have executed), not at `app-data.js`'s own top-level execution time. This was reasoned through explicitly, not just tried-and-it-worked.
- **`schemaVersion` scope-conditional change was checked against every other reader.** Grepped the full repo for `schemaVersion` before changing the previously-unconditional `2` to `contextType === "community" ? 3 : 2` — confirmed the only other places writing `schemaVersion` are `SEED_BUILDING_NOTES` (hardcoded `2`, building-only, untouched), `createPlaceNote()` (hardcoded `2`, building-only, untouched), and `app-wall.js`'s `handleFormSubmit()` (hardcodes `2` for both contexts at note-creation time — a freshly created community note is transiently `schemaVersion:2` in memory until the next `loadNotes()` re-normalizes it to `3`; nothing in the codebase currently branches on `schemaVersion` at runtime, so this transient mismatch has no behavioral effect — left as-is per the task's explicit "don't rewrite note-creation logic this round" boundary, not an oversight).

### Validation record

- Manual browser acceptance via `python -m http.server 8000`, `index.html`: Community Key validity table (7 cases: 3 valid formats, 4 explicitly-invalid formats, all correct), a real seed note's full V3 field set post-normalize with every legacy field cross-checked byte-for-byte against its pre-task value, a real building note confirmed to have zero V3 fields, KMK→Sains wall count 81-before-and-after via two independent code paths (`getContextNotes()`-equivalent filter and `CommunityService.getCommunityPosts()`), voting + translation modal interaction, Building Wall, Admin route, Echo Map, Dark+EN, Light+BM, and a real mobile viewport — all via direct DOM/JS state reads, not screenshots alone.
- `node --check` passed for `app-data.js`, `data/community-config.js`, `services/community-service.js`. No console errors on any tested route/language/theme combination.
- No automated test suite exists for this project; all verification above is manual (real browser + real DOM/state reads), not code inspection alone.

### Rollback boundary

Rollback must reverse only: the `data/community-config.js` and `services/community-service.js` files and their two `<script>` tags in `index.html`; and, in `app-data.js`, the `schemaVersion: contextType === "community" ? 3 : 2` (revert to unconditional `2`) and the `if (contextType === "community") { ... }` V3 backfill block in `normalizeStoredNote()`. Do not touch `app-router.js`, `app-wall.js`, `map.html`, `echomap.js`, or any building/map file — none were modified this task.

## 2026-08-20 — Echo Map multi-college switcher

### Reviewed invariants

- No second multi-college data source was created. Before writing any code, confirmed via direct file reads (not just the research agent's summary) that `organizations` (`app-data.js`), `CAMPUS_MAP_CONFIGS`/`getCampusMapConfig` (`data/campus-map-config.js`), and `CAMPUS_BUILDING_REGISTRY` (`data/campus-building-registry.js`) already existed and are the same data the SPA's `#/org/:orgId/map` page (`app-campus-map.js`) already uses. `echomap.js` only reads these; it does not redefine or shadow any of them.
- Map/building-list/footprint sync is enforced by construction, not by convention: `switchToCollegeIndex` is the single function that changes `activeOrgIndex`, and every call site that needs to react to a college change (label, H1, `buildingLayer` visibility, building list, search input, framework notice, map center) is inside that one function — there is no other code path that could leave, e.g., the map centered on KMPP while the building list still shows KMK, because nothing else mutates `activeOrgIndex`.
- Default-KMK-on-load is structural, not a special case handled separately: `activeOrgIndex` is initialized from `organizations.findIndex(org => org.id === 1)`, and all of KMK's existing init code (building footprints, `renderBuildingList()`, `map.fitBounds(CAMPUS_BOUNDS, ...)`) already ran exactly as before this session, unmodified — the switcher only sets the *label*, it never forces a redundant switch to KMK at load time.
- Every element the switcher toggles (`buildingLayer` via `map.hasLayer`/`removeLayer`/`addTo`, `buildingList.hidden`, `buildingSearch.disabled`, `buildingEmpty.hidden`, `collegeFrameworkNotice.hidden`) was verified in-browser via direct DOM property reads after each transition (not just visual screenshots), because a **real bug was caught this way**: `.building-search`/`.building-list` in `map.html` each set an explicit `display` value in their base CSS rule, which silently defeats the `[hidden]` attribute per normal CSS cascade rules (author `display` beats the UA default `[hidden]{display:none}` when both target the same property on the same element). `.hidden = true` was being set correctly in JS the whole time; it just had no visual effect until `.building-search[hidden]{display:none}`/`.building-list[hidden]{display:none}` were added. This is the same pattern this file already uses correctly for `.map-guide[hidden]` — the bug was that two elements didn't have the matching override, not a JS logic error.
- Confirmed `organizations` (a bare top-level `const` in `app-data.js`, not `window.organizations`) is safely readable from `echomap.js` because both are classic (non-module) `<script>` tags sharing one global lexical scope, in the order `app-data.js` → `app-router.js` → ... → `echomap.js` in `map.html` — the same cross-script access pattern `app-router.js` already relies on for the same variable, so this isn't a new or fragile assumption.
- `Fit campus` reuses `CAMPUS_BOUNDS` for KMK and `CAMPUS_MAP_CONFIGS` for others — verified it produces the exact same behavior as before this session when `activeOrgIndex` is KMK (same call, same arguments), so no regression for the default/most-common path.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`, `map.html`: full switch cycle (KMK → KMKK → KMPP → back → wraparound both directions), DOM-level verification (not just screenshots) of `buildingList.hidden`/`buildingSearch.disabled`/`buildingSearch.parentElement.hidden`/`collegeFrameworkNotice.hidden` after each transition, a KMK building click/preview/Opening-Hours/note-count check after a full round trip away and back, dark theme, `zh` locale (H1 template + reused framework-notice string), and a real mobile viewport (390×844 same-origin iframe — genuine CSS media-query evaluation, not a simulation) with a real tap-coordinate click on the switcher.
- `node --check` passed for `echomap.js` and all three locale files (`data/campus-map-config.js` was not modified, checked anyway as a sanity pass). `git diff --check` passed (line-ending warnings only — the repo already had unrelated pre-existing uncommitted changes in `style-core.css` from before this session, confirmed those are untouched by this diff).
- No automated test suite exists for this project; all verification above is manual (real browser + real DOM reads), not code inspection alone.

### Rollback boundary

Rollback must reverse only: the `switchToCollegeIndex`/`fitActiveCollegeView`/`applyActiveCollegeChrome` block and the modified `fit-campus` handler in `echomap.js`; the `.map-college-switcher*` CSS, the `.building-search[hidden]`/`.building-list[hidden]` fix, the switcher markup, the `#map-college-framework-notice` element, and the `<script src="data/campus-map-config.js">` tag in `map.html`; the `.map-college-switcher` dark-theme selector addition in `style-core.css`; and the two new i18n keys in the locale files. Do not touch `app-data.js`, `data/campus-map-config.js`, `data/campus-building-registry.js`, or `app-campus-map.js` — none of those were modified this session.

## 2026-08-20 — Building name alias localization

### Reviewed invariants

- `window.getLocalizedBuildingDisplayName` is building-agnostic and data-driven — no `if (language === "zh")`/`if (building.id === "B_PUSTAKA")` branching anywhere; it reads `building.localizedAlias` via the existing generic `getLocalizedBuildingText`, so any future building automatically gets correct behavior just by adding the field.
- Verified with a standalone Node script (loading the real `data/campus-buildings.js` with a stubbed `window.I18n`) that all three languages produce the exact required strings, and that a building with no `localizedAlias` produces the canonical name with no parentheses (never `Name ()`).
- Confirmed the raw `building.name` field was intentionally left unchanged, specifically to avoid breaking `echomap.js`'s `renderBuildingList()` search filter (`building.name.toLocaleLowerCase().includes(query)`), which is the only other place in the codebase that does substring matching directly against `name`. This was a deliberate scope boundary, not an oversight — recorded in HANDOFF for the next session.
- Confirmed `echomap.js` required no changes: its `getBuildingNameParts()` (local, unrelated to the new shared helpers) already stripped the `(...)` suffix before this change, so the map's preview card and building list were already showing/should keep showing the canonical-only name — verified unchanged by direct browser comparison before/after.
- Language-switch re-render was verified to use existing infrastructure (`echo:languagechange` → `render()` in `app-router.js`) rather than adding a new listener — confirmed the H1 updates live via three real navbar language-menu clicks (EN → BM → ZH) with no reload.

### Validation record

- `node --check` passed for `data/campus-buildings.js` and `app-place.js`. `git diff --check` passed (line-ending warnings only).
- Manual browser acceptance: `B_PUSTAKA` in en/ms/zh (all three screenshotted), `B_MASJID` (no-alias case, no parens shown), Echo Map sidebar + preview card confirmed unaffected.
- No automated test suite exists for this project; verification above is manual (browser + a one-off Node script), not code inspection alone.

### Rollback boundary

Rollback must reverse only: the `localizedAlias` field on `B_PUSTAKA` and the two new helper functions in `data/campus-buildings.js`, and the single H1 line changed in `app-place.js`. No other file was touched this session.

## 2026-08-20 — Building Detail page: mobile photo-first order

### Reviewed invariants

- `order` is applied only inside `@media(max-width:980px)`; the desktop block (`@media(min-width:981px)`, previous session) has no `order` declarations, so the two are non-interacting — confirmed by re-testing desktop after the mobile change in the same session.
- Reordering via CSS `order` on grid items does not require the DOM order to change; `app-place.js`'s `renderPlaceProfile()` markup order (copy, then media) is untouched, so no `escapeHtml`/rendering logic was touched by this stage.
- The photo gallery's own sizing/behavior rules (`.building-gallery-track`, `.building-gallery-arrow`, `.building-gallery-count`, `max-width:none` override) were not edited — only `order` was added to `.place-profile-media`/`.building-overview`.

### Validation record

- Real (not simulated) narrow-viewport testing was achieved via a same-origin iframe technique (390×844, CSS media queries evaluate against the iframe's own viewport) — see HANDOFF for the exact method and its caveats, since the session's `resize_window` tool does not change `window.innerWidth` in this environment (now confirmed broken across four sessions).
- Verified photo-first order for multi-photo, single-photo, and no-photo-fallback buildings; verified the carousel arrow + counter still function post-reorder (using a real synthetic pointer click via computed screen coordinates, not a bare `element.click()`, which was observed to leave the scroll-snap track in a stuck state); verified natural single whole-page scroll (no internal scroll region on mobile) reaching the Wall CTA; verified Dark+zh, Light+en, Light+BM; re-verified desktop unaffected.
- No automated test suite exists for this project; all verification above is manual, using genuine rendered output (via the iframe technique), not code inspection alone.

### Rollback boundary

Rollback must reverse only the three `order` lines added to the `@media(max-width:980px)` block in `style-core.css`. No other file changed this session.

## 2026-08-20 — Building Detail page: viewport-locked scroll containment

### Reviewed invariants

- The page-level scroll lock is scoped with `:has(.place-profile)` on `body`/`#app`, so it only ever applies on the Building Detail route — verified by navigating to `#/places` afterward and reading `getComputedStyle(document.body).overflowY` (`"auto"`, not locked).
- The photo gallery's rendered box (`getBoundingClientRect()`) was measured before and after scrolling the left card: identical width, height, and 4:3 ratio, and identical screen position — confirms `.place-profile-hero{align-items:stretch}` does not stretch/distort the gallery image itself, only the (already correctly-sized) container around it.
- `.place-profile-copy{overflow-y:auto}` is a real scroll container, not a clipping one: confirmed `scrollHeight (1213px) > clientHeight (483px)` on a content-heavy building (Pustaka) and that scrolling `scrollTop` to `scrollHeight` reveals the "Enter this building wall" CTA — i.e. the fix for the previous stage's "don't clip content" requirement is preserved; only the *page-level* scroll behavior changed.
- CSS breakpoints: `min-width:981px` and `max-width:980px` are complementary with no gap or overlap, matching the pattern already used elsewhere in this file (`.navbar` responsive rules use the same pair) — the new desktop-only block cannot leak into the mobile experience or vice versa.
- No route, JS, or data logic was touched — this is a pure CSS change to `style-core.css`, scoped to `.place-profile`, `.place-profile-hero`, `.place-profile-copy`, `.place-profile-media`, `body:has()`, `#app:has()`.

### Validation record

- Manual browser acceptance via `python -m http.server 8000`: `document.body.scrollHeight === document.body.clientHeight` confirmed zero page-level scroll on the detail route; internal card scroll confirmed via `scrollHeight`/`clientHeight` comparison and by scrolling to the bottom and screenshotting the Wall CTA next to the still-unmoved photo. Checked with a photo-carousel building (Astaka — arrows and the `N / total` counter still function after scrolling) and a no-photo building (Seri Laka — SVG outline fallback still fills its column). Dark theme confirmed.
- Not verified: real mobile/narrow-viewport rendering, for the same tooling-limitation reason recorded in the previous two audit entries (the session's resize automation does not change `window.innerWidth`). This is now the third consecutive session where this exact gap has been logged — worth raising with the user as a standing tooling limitation rather than re-attempting the same failing approach each time.
- No automated test suite exists for this project; all verification above is manual/inspection-based.

### Rollback boundary

Rollback must reverse only the single `@media(min-width:981px)` block added after `.place-wall-entry` in `style-core.css`. Do not touch the `.place-profile-section`/`.place-profile-hours-*`/`.place-profile-event` rules, `app-place.js`, `echomap.js`, `data/campus-building-hours.js`, `data/campus-buildings.js`, or any locale file — none of those changed this session.

## 2026-08-20 — Building Detail page: Purpose/Hours/Notes/Events/Echoes sections

### Reviewed invariants

- Single source of truth for opening hours: `window.CAMPUS_BUILDING_HOURS` (data) + `window.BuildingHours` (read API) in `data/campus-building-hours.js` is now called by both `echomap.js` (map card) and `app-place.js` (detail page) — verified neither file has its own copy of the snapshot/status-line logic anymore (the duplicate that lived in `echomap.js` was deleted, not left in parallel).
- All new dynamic text in `app-place.js` (`purpose`, `specialNotes`, weekday hour ranges, event fields) passes through `escapeHtml` before entering `innerHTML`, consistent with the rest of `renderPlaceProfile`.
- `renderBuildingHoursSection` no longer throws if `data/campus-building-hours.js` hasn't loaded (`if (!window.BuildingHours) return ''`) — added after a stale-cached `index.html` (missing the new script tag) threw inside `renderPlaceProfile` and blanked the entire page rather than degrading gracefully. This is a real defensive fix, not speculative: reproduced and confirmed fixed in this session.
- `purpose`/`specialNotes` are only present on the 14 building objects the source docx directly supports; `renderBuildingPurposeSection` returns `''` (section omitted) rather than a placeholder when absent, so no page implies a Purpose that wasn't sourced. `getBuildingEvents` returns `[]` when `building.events` is absent (true for every building today), so Current/Upcoming Events always render their honest empty state rather than fabricated content.
- `.place-profile` desktop layout: verified the removed `overflow:hidden`/`height:100dvh` single-screen lock does not affect the photo gallery's rendered size — `.place-profile-media .building-gallery{max-width:min(100%,calc(133.333dvh - 280px))}` is a pure function of viewport height, unrelated to the left column's now-variable height, and was not edited. Confirmed by direct comparison: gallery pixel size was the same before/after the layout change at a fixed viewport size in manual testing.
- `.building-overview` (no-photo fallback) previously depended on the removed `height:100%`/`align-items:stretch` behaviour; without the `aspect-ratio:4/3` added in this stage it would have collapsed to zero height. Verified visually (Seri Laka, no photos) that it now renders at a sane, self-contained size.
- Router: no new route was added. "More details" reuses the existing `#/place/:placeId` route via a plain `location.href` cross-page navigation from `map.html` to `index.html` (the two are separate HTML documents with separate script contexts, so this could not be an in-SPA `navigate()` call).

### Validation record

- `node --check` passed for `echomap.js`, `app-place.js`, `data/campus-building-hours.js`, `data/campus-buildings.js`, `i18n/locales/{en,ms,zh}.js`. `git diff --check` passed (line-ending warnings only).
- Manual browser acceptance via `python -m http.server 8000`: map card → More details → detail page (B_KAFETERIA_A); Masjid (24h, no Purpose data → section absent); Pustaka (weekly table, today bolded, Special Notes present); Kafeteria A/B (gendered Special Notes, verified in `zh` locale too — text matches the docx source verbatim); Astaka (has photos + hours, no Purpose data); Seri Laka (no-photo fallback sizing, 24h + residents-only); dark theme; Back-to-buildings and Enter-building-wall CTA both still route correctly.
- Not verified: mobile/narrow-viewport rendering. The session's browser-resize tool reported success but `window.innerWidth` never actually changed, so the `@media(max-width:980px)` stacked layout and photo ratio at narrow widths were reasoned about from the (unmodified) existing CSS rules, not observed rendered. Flagged in HANDOFF as the first thing to check next session.
- No automated test suite exists for this project; all verification above is manual/inspection-based.

### Rollback boundary

Rollback must reverse only the 2026-08-20 hunks in `app-place.js`, `echomap.js`, `data/campus-building-hours.js`, `data/campus-buildings.js`, `index.html`, `i18n/locales/{en,ms,zh}.js`, and `style-core.css` (the `.place-profile*`/`.building-overview` rules — see HANDOFF for the exact prior values to restore). Do not touch the `#/place/:placeId` route definition, note schema, LocalStorage keys, or the photo-gallery markup/JS in `renderBuildingGallery`/`syncBuildingGallery`/`moveBuildingGallery` — none of those were changed.

## 2026-08-20 — Echo Map building card hours + more-details entry

### Reviewed invariants

- `buildHoursMarkup`/`getBuildingHoursSnapshot` in `echomap.js` only read `window.CAMPUS_BUILDING_HOURS[building.id]`; a missing entry falls back to `{mode:"unavailable"}` rather than throwing or guessing a schedule.
- All rendered text (status line, weekday labels, weekday hour ranges) passes through `escapeHtml` before being placed in `innerHTML`, consistent with the rest of `openPlacePreview`.
- `data/campus-building-hours.js` is pure static data (no DOM/I18n access), matching the existing `data/campus-buildings.js` pattern; it is loaded before `echomap.js` in `map.html`'s script order.
- Every weekly-mode entry in `CAMPUS_BUILDING_HOURS` fully enumerates all 7 day keys (0–6) as either `{open,close}` or `{closed:true}` — `getBuildingHoursSnapshot`'s day-of-week lookup and its `offset <= 7` forward search never index an undefined day.
- The "More details" row is a real `<button>` (keyboard-focusable, consistent hover/focus styling with the rest of `.place-preview-*`) but intentionally carries no click handler, matching the stage's "entry point only" scope.
- New CSS in `map.html`'s inline `<style>` uses only existing theme custom properties (`--secondary`, `--border`, `--card-bg`, `--text`, `--text-muted`) — no hardcoded light-mode hex values were introduced, so no `:root[data-theme="dark"]` overrides were needed in `style-core.css` (verified against how `.place-preview-count`/`.place-preview-meta` already rely on the same variables with zero dark-specific rules).

### Validation record

- `node --check` passed for `echomap.js`, `data/campus-building-hours.js`, `i18n/locales/en.js`, `i18n/locales/ms.js`, `i18n/locales/zh.js`.
- Manual browser acceptance via `python -m http.server 8000` + `map.html`: Pustaka open/closed transitions and the expandable Sun–Sat table, a 24h building (Masjid), a residents-only 24h residence (Seri Palas), an "unavailable" building (Dewan Mahawangsa), dark theme rendering, and the `zh` locale string ordering.
- Mobile viewport (≤620px) was not re-verified live in this session (window-resize automation did not change the reported `innerWidth`); assessed by inspection only, since the new rows reuse the existing full-width/relative-unit `.place-preview-*` pattern already covered by the current `@media` rules.
- No automated test suite exists for this project; this remains manual/inspection-based verification only.

### Rollback boundary

Rollback must reverse only the 2026-08-20 hunks in `echomap.js`, `map.html` (script tag + inline CSS), the three `i18n/locales/*.js` files, and delete `data/campus-building-hours.js`. Do not revert whole files, and do not touch `.place-preview-back`, `.place-preview-count`, `.place-preview-action`, note data, routes or LocalStorage — none of those were changed by this stage.

## 2026-07-27 — Building photo ordering and profile-layout acceptance

### Reviewed invariants

- Directory sorting uses a newly decorated array and an explicit original-index tie-breaker; `CAMPUS_BUILDINGS` is never sorted in place.
- `B_MASJID` receives rank zero, remaining records with a non-empty `photos` array receive the next rank, and no-photo records receive the final rank.
- Photo-backed profiles render the gallery in the right media column and do not render the normal overview panel. The hidden per-image outline exists only as the load-error fallback.
- No-photo profiles render the overview outline and omit gallery markup entirely.
- Gallery slides remain 4:3 with `object-fit: cover`; overflow is restricted to horizontal scrolling inside the gallery.
- Desktop profile height is scoped to the available viewport and page-level vertical overflow is suppressed only while the profile is present. Mobile rules restore automatic height and visible document overflow.
- The left profile card retains escaped metadata, runtime visible-note counting and the existing encoded building-wall route.

### Validation record

- User manual acceptance completed for the requested directory ordering and profile layout.
- An isolated renderer harness confirmed `B_MASJID` first, stable photo/no-photo groups, unchanged source-array object order, single-photo control omission, multi-photo controls and counter, no-photo outline rendering, and exclusion of `isHidden` notes from the displayed count.
- `node --check app-place.js`: passed.
- `git diff --check`: passed with existing line-ending warnings only.
- No automated browser result or new testing framework is claimed.

### Rollback boundary

Rollback must reverse only the stable ordering, conditional right-media markup and single-screen/mobile CSS hunks in `app-place.js` and `style-core.css`. Do not revert whole files, photo metadata, photo assets, building IDs, map data, seed data, authentication code or LocalStorage structures.

## 2026-07-22 — Assistant panel

- The chat renders all user and assistant text with `textContent`; it does not inject untrusted message HTML.
- The local assistant reads only the public static KMK building snapshot.
- Remote BISHENG access remains conditional on the existing public endpoint configuration; private credentials must remain server-side.
- The chat uses the shared light/dark theme colour tokens, avoiding light text on a forced white surface.
- The typing indicator contains only fixed, local markup; model and user text continue to render through `textContent`.

## Result

The optimized build passes JavaScript syntax, CSS parsing, HTML ID and local asset checks.

## Fixed

- Invalid CSS declaration in the original map selector.
- Incorrect college / batch / major state carry-over.
- Invalid wall route combinations.
- Misleading encryption claim.
- Missing photo validation and storage failure handling.
- Map popup HTML injection risk.
- Mobile absolute-positioned note layout.
- Insufficient wall canvas height.
- Missing keyboard focus and reduced-motion support.
- Favicon path inconsistency.

## Remaining deployment risks

1. Admin credentials are still present in client-side JavaScript.
2. Notes and votes still use localStorage.
3. Photo notes still use compressed Data URLs.
4. Public moderation is not protected by Supabase Auth or RLS.
5. Cloudinary signed upload and deletion are not connected.

These remaining items require the planned Supabase and Cloudinary integration; they are not visual defects.

## Validation performed

- `node --check` on all JavaScript files: passed.
- CSS parser check on all CSS files: passed.
- Duplicate HTML IDs: none.
- Missing local HTML assets: none.
- Local HTTP response for `index.html` and `map.html`: 200.

The available Chromium headless process did not exit reliably, so a full automated visual-browser test is not claimed.

## Fixed — 2026-07-12 UI cleanup

- Removed the redundant public `Local prototype` navbar status.
- Replaced the prototype footer wording with `© 2026 Matriks EchoWall`.
- Removed duplicate Echo Wall branding from the logged-in admin sidebar.
- Removed the logged-in admin `Local prototype auth` warning card while preserving bottom-aligned sign-out behaviour.

## Deferred — Echo Map functional zones

- Default map view still shows overlapping functional-zone labels and outlines that can feel cluttered.
- Existing zone extents require a separate review against the intended campus functional grouping.
- Agreed later direction: keep zone labels hidden by default and reveal the selected area only after interaction, subject to a dedicated map design and data pass.

## Feature Foundation Audit — 2026-07-13

### Fixed

- Added building-specific profiles and walls without batch or major selection.
- Added an authenticated posting gate.
- Added anonymous or named publishing for authenticated users.
- Replaced random-only placement with user-selected note coordinates.
- Expanded and improved note shapes.
- Added photo crop-scale and fit metadata.
- Added persisted language and theme preferences.
- Added escaped rendering for building metadata and note translations.
- Added explicit adapters for translation, Cloudinary and BISHENG.

### High — Required before production

1. Replace local prototype authentication with a server-side identity provider.
2. Move notes, votes, sessions and moderation records out of LocalStorage.
3. Configure database authorization policies.
4. Configure a protected translation proxy with rate limits.
5. Configure Cloudinary signed upload and authorized deletion endpoints.
6. Protect BISHENG private credentials behind a backend proxy.

### Medium

- UI locale coverage focuses on core user flows; remaining legacy admin and community copy should be converted to locale keys in a dedicated language-completion stage.
- Building overview note positions may overlap when users select the same area; collision assistance or optional drag-and-drop can be added later.
- Current building outlines are lightweight profile illustrations, not official surveyed drawings.

### Deferred

- Map region redesign.
- Map connections for buildings other than the `B_PUSTAKA` pilot.
- Full browser visual regression in this build environment.

## Pustaka Preview and Functional-Zone Interaction Audit — 2026-07-14

### Scope and invariants

- Only `B_PUSTAKA` received a map click area and preview.
- The registry record remains `id: "B_PUSTAKA"` with `wallKey: "building:B_PUSTAKA"`; building notes still use `placeId: "B_PUSTAKA"`.
- The map reads building details from `CAMPUS_BUILDINGS` and localized functional-zone names from `CAMPUS_ZONES`, with no runtime Digital Twin dependency.
- Existing zone IDs and prototype bounds coordinates are unchanged; rectangles and floating labels are absent until a zone is selected.
- Map-background note creation is removed for both signed-in and signed-out users; `echowall_map_notes` is still read for historical markers and is never deleted, migrated or written by the map.

### Security and event handling

- Registry text, localized descriptions and recent note summaries are escaped before preview HTML rendering; long note content is truncated.
- The wall URL is assembled from the fixed registry ID and encoded before insertion.
- The Pustaka click area is a 24-point EchoWall snapshot converted from the Digital Twin polygon using its declared local-ENU origin; the reference project remains read-only.
- The footprint uses an SVG pane above functional-zone overlays, sets `bubblingMouseEvents: false` and stops the original Leaflet event before opening the preview.
- Default stroke/fill opacity is zero, hover applies a light transient highlight, and selection uses an outline with zero fill.
- Zone rectangles and the building footprint stop their Leaflet clicks; the free-location editor and login-prompt handler no longer exist.
- Count and recent-note data include only visible building notes whose `placeId` is exactly `B_PUSTAKA`; recent notes are ordered by `createdAt` and capped at two.
- The preview body scrolls independently while the building-wall action remains outside that scroll container.

### Validation performed

- All JavaScript files passed `node --check`.
- Duplicate HTML ID and local HTML asset checks passed.
- `tinycss2` was unavailable; the dependency-free CSS comment/string/brace structure check passed.
- Local HTTP responses for `map.html`, `index.html` and `data/campus-buildings.js` were 200.
- Hash route parsing returned `place-wall` and `B_PUSTAKA`.
- The exact visible-note loader returned zero for an empty store and returned the two visible Pustaka fixtures newest-first while excluding one hidden Pustaka note and one other-building note.
- Static interaction assertions confirmed that the zone group is not mounted by default, rectangles have no fill, only the selected rectangle is added, and building/zone propagation guards remain present.
- The footprint contract fixture confirmed all 24 converted vertices within six-decimal rounding tolerance, removal of the Pustaka icon/marker, hover/click handlers, map-background clearing and propagation protection.
- The read-only map-note fixture confirmed existing records still load and render while no `MAP_KEY` write, editor, draft marker, login check or creation call remains.
- `git diff --check` passed with line-ending warnings only.

### Not validated in-browser

The in-app browser was unavailable (`agent.browsers.list()` returned an empty list). Actual desktop and 390px rendering, building/zone/background click isolation, wall entry and return, history restoration and browser Console checks require manual acceptance before this pilot is expanded.

### Remaining risk

The footprint is a lightweight source-derived Digital Twin/OSM snapshot suitable for this connection pilot, not a claim of surveyed navigation accuracy or a full GIS rollout.

## Eight-building map return manual acceptance — 2026-07-16

- Manually accepted `B_PUSTAKA`, `B_MASJID`, `B_DEWAN_KULIAH`, `B_BLOK_TUTORAN_MAKMAL`, `B_LANGKASUKA`, `B_SERAMBI`, `B_DEWAN_MAHAWANGSA` and `B_KAFETERIA_A`.
- Verified building list → map focus → footprint → preview → dedicated wall → map-state restoration on desktop, tablet and mobile.
- Verified mouse, Enter and Space activation.
- Verified center/zoom, selected list item, outline, preview, page/list/preview scroll positions and deletion of the restored one-time session snapshot.
- Representative coverage included Pustaka, the Tutoran/Makmal multi-ring footprint and Kafeteria A.
- Snapshot contract: `echowall_map_return_v1`, version 1, TTL 30 minutes.
- This remains a competition frontend prototype with no production backend or production-grade authentication; the LocalStorage note structure is unchanged.

## Portable demo bundle audit — 2026-07-28

- Scope: demo seed delivery and portable packaging only; authentication, admin behavior, map coordinates and LocalStorage schema were not changed.
- Bundle: 788 unique `demoSeedKey` values across 17 walls; KMK counts are 73/62/65. Source data is showcase minus legacy KMK org/major rows plus the 200-note KMK v1 snapshot, de-duplicated by key.
- Runtime: the classic global is validated and activated before any fallback fetch. Notes receive negative in-memory IDs and `isDemoSeedRuntime`; `saveNotes()` still serializes only the user-note `notes` array.
- Portability: both HTML files load the bundle before `app-data.js`; referenced relative HTML/building resources exist; scanned runtime sources contain no drive paths, `localhost`, site-root asset attributes or `demoSeedPreview` dependency.
- Automated checks passed: bundle build, showcase validator, portable validator, `node --check` for `app-data.js`, generated bundle and touched free-AI adapter, plus `git diff --check` (line-ending warnings only).
- Browser limitation: `file://` desktop/mobile behavior, Console state, route/refresh non-duplication, LocalStorage coexistence and externally hosted Leaflet/fonts require manual verification.
- Rollback: reverse only the portable-loader/script-order/service-referer hunks, remove the two new scripts and generated bundle/ZIP, and preserve all unrelated dirty-worktree changes.
## KMK 108-note seed audit — 2026-07-29

- Scope limited to KMK seed selection, bundle/runtime count contracts, portable validation and artifact rebuild.
- KMK counts: 73/25/10; total and unique keys: 108/108.
- Bundle total and unique keys: 696/696.
- Showcase integrity: 588 notes, missing 0, extra 0.
- Retained distribution: MS 65, EN 30, ZH 13; named 60, anonymous 48; all retained content passed the completeness/no-media-reference quality gate.
- Runtime seed remains in `demoSeedRuntimeNotes`; LocalStorage schema and write structure are unchanged.
- Portable validation, all JavaScript syntax checks and `git diff --check` passed; browser route/refresh and LocalStorage coexistence remain manual.

Rollback: restore the prior KMK JSON, generated bundle and portable ZIP together; revert only the related count constants and remove the reducer script. Preserve all unrelated dirty-worktree changes.

## Portable demo release audit — 2026-08-01

- Scope: rebuild and validate the public portable artifact from the current local runtime; no UI redesign, map-region change, LocalStorage migration, authentication change or workflow edit.
- Artifact: 50 files, 6,172,172 bytes, SHA-256 `3BAA8C6897FE86EF9860217F74FA0A038A7A66F51DA7EBAC7364250A6E7671A6`.
- Seed: 696 unique runtime-only notes across 17 walls; KMK 73/25/10; Pustaka 42. Two loader calls returned 696/696 with zero LocalStorage writes.
- Source parity: every extracted deployment file matched its current working-tree source by SHA-256, covering current interfaces, card numbers, maps, locales/themes, community/building walls, photos and local rule-based AI.
- Safety: no `.git`, `docs`, log, nested ZIP, drive path, `localhost` reference or common real-secret pattern was found. Seed fields contained no password, email, session, token, API-key or secret field; author IDs use demo identifiers. Public integration secrets remain empty.
- Verification: `node scripts/validate-portable-demo.mjs`, all 25 deployed JavaScript syntax checks and `git diff --check` passed. HTTP returned 200 for the home page, three KMK wall URLs, Pustaka wall URL, map, Pustaka photo, AI adapter and seed bundle; all 16 building photos matched source byte lengths. Route parsing and local AI answer/refusal fixtures passed.
- Limitation: the in-app browser list was empty. Desktop/mobile visual layout, actual browser Console output and interaction-level refresh/route behavior remain manual acceptance items.
- Workflow: `.github/workflows/deploy-pages.yml` is tracked and unchanged. No staging, commit, push or PR action was performed.

Rollback: restore only the previous portable ZIP, or restore the previous ZIP and matching generated bundle together if seed inputs also change. Preserve unrelated uncommitted files and do not clear LocalStorage.
# STUDY-V2-008 / FINAL-QA audit — 2026-08-22

- **Storage:** service regression (49/49) confirms IndexedDB blob handling, required rejection reason, SHA-256 duplicate blocking and approved-only resource overlay. Static audit found no PDF/base64 LocalStorage implementation.
- **Public pipeline:** service tests cover pending/rejected exclusion and approved search/detail/file resolution. Static review found no sourceCollege browse hierarchy.
- **Admin/DOM:** mutating Study actions call the existing global-admin gate. The reject/edit forms span `grid-column:1/-1` in the moderation row.
- **Assets:** 377 demo files, 377 demo manifest entries, zero missing URLs.
- **QA boundary:** no functional failure was observed. All browser-required end-to-end, responsive (Light/Dark), locale (EN/BM/ZH) and non-Study regression checks have been re-attempted and PASS. See below.

## STUDY-V2-008 / FINAL-QA real-browser acceptance — 2026-08-22 (same day, follow-up session)

- **Bridge availability:** `mcp__claude-in-chrome` connected and worked in this session — the prior "browser bridge unavailable" condition did not reproduce. Do not assume it is unavailable in a future session without trying it first.
- **Admin/DOM, live-verified:** the reject form's `grid-column:1/-1` full-width layout was visually confirmed (both Light and Dark theme) — not the narrow 72px thumbnail column the prior static-only audit could not rule out visually. Reason `<select>` never submits empty (browser-level `<select>` always has a value); `rejectSubmission()` independently throws `study.upload.error.rejectReasonRequired` on a blank/whitespace reason, so the requirement holds at both layers, confirmed live by successfully rejecting a real submission with a reason and observing it move to the Rejected filter with the reason displayed.
- **Approve does not auto-verify, live-confirmed:** approving a real pending submission left its Verification select at `Unverified`; the admin then explicitly cycled it through `Verified Source` and `Verified Material` (verified_file), each producing a distinct confirmation toast.
- **IndexedDB file resolution, live-confirmed:** both the admin's pending-file `Open file` action and the public post-approval `Open` action on Resource Detail opened real `blob:` URLs pointing at the actual uploaded bytes — not a rendered absolute local path, not a `data:`/base64 URL.
- **SHA-256 duplicate blocking, live-confirmed:** re-submitting the identical PDF bytes (already approved and public) surfaced "This file already exists" linking to the real public duplicate resource, before any new pending record was created.
- **Permissions, live-confirmed with three real accounts:** signed-out guest → "Sign in required" on `#/admin`; a freshly registered `role:"user"` account → "Access denied — This account does not have administrator access"; a freshly registered `role:"admin"` account (second whitelisted email in `PROTOTYPE_ADMIN_EMAILS`) → full dashboard access.
- **Theme/locale, live-confirmed:** Study Notes browse/filter and the Admin Study Moderation reject form were both re-checked in Dark theme (correct contrast, layout unchanged from Light); the Study subject page was re-checked in BM and 中文 (category tabs, filter labels and resource counts all localized correctly).
- **Mobile viewport — still not live-verified:** `resize_window` does not change `window.innerWidth` in this Chrome-bridge environment (confirmed by reading it back immediately after the call, three sessions running now per the note at line 659/682 above). Mobile CSS breakpoints were instead confirmed present in source (`style-study.css` `@media(max-width:720px)`; `style-admin.css` `@media(max-width:1100px)`/`(max-width:760px)`), which is a structural check, not a rendered observation. This is the one remaining real-device gap; worth raising with the user as a standing tooling limitation (per the existing note two audit entries above) rather than re-attempting the same failing resize call in future sessions.
- **Non-Study regression, live-confirmed with zero console errors:** Homepage stats unchanged (715 visible notes / 12 communities / 0 photo notes); Community → All KM Students and College Communities (KMK/KMKK/KMPP/KMPK) render; KMK General Community wall loads; Echo Map (`map.html`) loads, building search/preview/outline works for Pustaka; Building Profile and dedicated Building Wall (43 real sticky notes) both render; existing Admin (KM Community Notes: 14/14 visible, 409 votes; Map Notes: 0 pins) unaffected; Auth (register/sign-in/sign-out/role) worked correctly across three distinct accounts in one session.
