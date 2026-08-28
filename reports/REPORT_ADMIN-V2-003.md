# REPORT — ADMIN-V2-003: Unified Admin Dashboard / Scope-filtered Queue UI

Date: 2026-08-23
Status: **PASS**

## Scope

Only ADMIN-V2-003 (Unified Dashboard: Overview / Moderation Queue / Reports / History) was
implemented, on top of the already-locked ADMIN-V2-001/001A (Role/Scope contract) and
ADMIN-V2-002/002A (ModerationItem + Report schema, Study/Community/Map integration) — neither
service was modified. ADMIN-V2-004 (Audit Trail), ADMIN-V2-005 (College Admin UI redesign),
ADMIN-V2-006 (Study Moderator UI redesign), ADMIN-V2-007 (Admin Management), and ADMIN-V2-008 (AI
Moderation) were explicitly NOT started. No fake Event/AI data was created. Study Notes
browse/upload and Echo Map's public UI were not touched.

## Audit findings

See `checkpoints/ADMIN-V2-003/PRE_STATE.md` for full detail. Summary: `app-admin.js`'s
`renderAdmin()` only ever recognized 3 real `sourceType` values (`community`/`map`/`study`) plus a
`"none"` dead end (`renderAdminNoSectionState()`) for a signed-in `COLLEGE_ADMIN`/
`CONTENT_REVIEWER` with neither permission. Both the Community/Map panel (`app-admin.js`) and the
Study panel (`app-study-admin.js`) each inlined their OWN full sidebar markup — no shared
navigation existed. Existing stats/actions all read directly from `notes`/`adminMapNotes`/
`StudyUploadService`, never from `ModerationService` — confirmed there was no risk of "a second
queue data source" already existing to accidentally duplicate.

## What was built

### 1. `app-admin-dashboard.js` (new) — pure helpers + 4 new views

- **Pure helpers** (no DOM access, directly unit-tested):
  `adminDashboardModuleForContentType`, `adminDashboardVisibleScopes`, `adminDashboardFilterItems`,
  `adminDashboardSortQueue`, `adminDashboardGroupReports`, `adminDashboardOverviewCounts`,
  `adminDashboardHistoryItems`, `adminDashboardContentPreview`.
- **Views**: `renderAdminOverview`, `renderAdminQueueView`, `renderAdminReportsView`,
  `renderAdminHistoryView` — every one reads exclusively through `ModerationService.
  listModerationItems()`/`listReports()`; none re-derives moderation data from `notes`/
  `MapNoteService`/`StudyUploadService` directly.
- **Scope selector**: `adminDashboardVisibleScopes(user)` derives options from the user's REAL
  active `RoleAssignment`s (`AdminPermissionService.getRoleAssignments`) checked against the
  top-level permission functions (`canModerateGlobalCommunity`/`canModerateStudy`/
  `canModerateCollege`), not from a hardcoded college list — college names/ids come from the
  canonical `organizations` config. "All permitted scopes" only appears for Super Admin or a user
  holding more than one distinct scope; a single-scope user sees just that one option (no redundant
  "All"). **Bug caught during this stage's own browser QA and fixed before sign-off**: the first
  version derived options from `assignment.scopeType` directly, which hid "Study" from the legacy
  admin (whose one virtual `LEGACY_ADMIN` assignment has `scopeType: "global"` but grants BOTH
  `GLOBAL_COMMUNITY_MODERATE` and `STUDY_RESOURCE_MODERATE`) — fixed to check permissions directly
  instead of assuming a 1:1 assignment-scopeType-to-permission mapping.
- **Queue filters**: Status (All active / Pending / Escalated / Hidden / Approved / Rejected),
  Module (All / Community / Map / Study), Source (All / Submission / Report / Auto flag / Admin),
  Scope — all narrow an already-permission-filtered list; they never widen access.
- **Default sort**: escalated before pending before everything else, then higher `riskScore`, then
  newest — presentation-only, never mutates or re-persists `ModerationItem`s.
- **Reports view**: every Report is listed individually and `adminDashboardGroupReports()` groups
  them by `contentType`+`contentId` so "3 reports, 1 queue case" is visible and correct — reports
  are never rendered as 3 separate queue cases.
- **History view**: `adminDashboardHistoryItems()` filters to `approved`/`rejected`/`hidden` only —
  explicitly NOT an audit trail (no who/before/after — that is ADMIN-V2-004), stated in the view's
  own subtitle.
- **Content preview**: derived from canonical content only (`notes` for posts, `StudyResourceService`/
  `StudyUploadService` for study resources, the `recordKey` for map notes) — never internal storage
  paths/blob keys/fileIds, and the `ModerationItem` itself never becomes a content duplicate.
- **"Review" action**: switches to the existing Community/Map/Study workspace via the unchanged
  `adminSetSource()` — no new action engine, no re-implementation of Approve/Reject/Hide (that
  stays ADMIN-V2-004's job).

### 2. Shared sidebar (`adminSidebarNavHtml`, in `app-admin.js`)

Extracted from the two previously-duplicated inline copies (Community/Map panel and
`renderAdminStudyPanel`) into one function, used by all 6 admin views now. Overview/Queue/Reports/
History are always shown (the outer `canAccessAdminPanel()` check already gated the caller);
Community/Map/Study links stay conditional on their own existing specific permission, unchanged.

### 3. `renderAdmin()` dispatch and default landing tab

`adminState.sourceType` now defaults to `"overview"` (was `"community"`) and Overview/Queue/
Reports/History are recognized alongside the existing Community/Map/Study values. A stale/forged
`sourceType` pointing at a module the user lacks permission for now falls back to `"overview"`
(always safe) instead of the old `"none"` dead end — this also naturally retires
`renderAdminNoSectionState()`: a plain `COLLEGE_ADMIN`/`CONTENT_REVIEWER` now lands on a real,
honest (if all-zero) Overview instead of a login-page-styled dead end.

## Tests

`node scripts/test-admin-dashboard.mjs` (new, 50 checks) — **50/50 PASS**: module-mapping,
scope-option correctness for Super Admin/Global Moderator/KMK-only/KMPP-only/multi-college/Study
Moderator/legacy admin/Student/Guest (including the assignment-scopeType-vs-permission bug fixed
above), Overview counts scope-isolated per role (including the map_note-is-always-KMK interaction
with a multi-college count), 3-reports-one-queue-case grouping + dedupe, all four filter dimensions
(status/module/scope/source), risk/status sort ordering, History excluding active items, and safe
canonical content-preview generation.

`node scripts/test-admin-moderation-schema.mjs` — **89/89 PASS** (ModerationService untouched).
`node scripts/test-admin-role-scope.mjs` — **74/74 PASS** (Role/Scope contract untouched).
`node scripts/test-study-upload.mjs` — **49/49 PASS** (Study's own storage/actions untouched).

## Browser QA (real Chrome, `mcp__claude-in-chrome`)

- Loaded `#/admin` as the already-signed-in legacy admin (`mzteoh88@gmail.com`): landed on Overview
  by default, scope selector correctly showed "All permitted scopes" / "Global" / "Study" (the bug
  above was caught and fixed here), real counts reflecting real leftover QA data from prior stages,
  no console errors.
- Clicked into Moderation Queue, Reports, and History — all rendered correctly with real
  ModerationService data (Queue's empty state was honest — 0 active cases — since the one leftover
  item was already resolved).
- Switched to Super Admin: scope selector listed **Global, Study, and all 12 real colleges from the
  canonical `organizations` config** (not a hardcoded list) plus "All permitted scopes".
- **Created real fresh test data spanning all three live modules in one session**: a real Community
  report (`ModerationService.createReport` against a real `notes` entry), a real Study submission
  (`StudyUploadService.createSubmission` with a synthetic PDF `File`), and a real Map report
  (`ModerationService.createReport` against a `map_note` contentId) — the unified Moderation Queue
  then showed **all three modules simultaneously**, each with a real, safe content preview
  (community post excerpt, study metadata summary, map record key) and correct scope badges.
- Clicked "Review" on the Study queue card — landed in the existing, unmodified Study Moderation
  workspace showing the real submission with working Approve/Reject/Edit actions.
- **Permission isolation, tested live with real granted RoleAssignments**: a KMK-only College Admin
  saw only KMK-scoped data (sidebar hid Community/Map/Study module links entirely, scope selector
  locked to "KMK" alone) — and forcing `adminState.dashboardScope = "college:3"` (KMPP) directly
  via the console, then querying `ModerationService.listModerationItems({scopeType:"college",
  scopeId:3}, user)` directly, still returned **zero** KMPP items: the permission check lives in
  the service layer, not the UI filter, so no DOM/console tampering can leak cross-scope data. A
  Study Moderator similarly saw only the Study module (sidebar, scope selector, and counts all
  locked to Study; Community/Map counts were 0).
- Verified Light theme and Dark theme both render the new Overview stat cards/module-summary cards
  correctly (module cards use a light `#fff` background by default with a dark-theme override, same
  pattern as the rest of `style-admin.css`).
- No console errors observed at any point across the entire session. Test RoleAssignments were
  disabled and the original session (`mzteoh88@gmail.com`) restored before finishing.
- **Mobile (390–430px): Not verified** — same pre-existing tooling limitation recorded in every
  prior stage (`resize_window` does not actually change `window.innerWidth` in this environment).
  The relevant CSS breakpoints (`@media (max-width:1100px)`/`(max-width:760px)`) were confirmed
  present and reused for every new element, but this is a structural check, not a rendered
  observation.
- **EN only verified live**; BM/ZH were not separately re-checked this stage (the Dashboard's new
  UI text is hardcoded English, matching this file's existing convention of mixing `I18n.t()` for
  pre-existing keys and plain English for new internal-admin-tool text — see `admin.study.*`'s own
  precedent in `app-study-admin.js`, and CLAUDE.md's admin i18n scope).

## Modified / new files

```
app-admin-dashboard.js            NEW — pure helpers + Overview/Queue/Reports/History views
app-admin.js                      shared sidebar, new sourceType dispatch, default landing tab
app-study-admin.js                sidebar now calls the shared helper instead of its own copy
style-admin.css                   Dashboard module-summary grid + scope/filter layout tweaks
index.html                        loads app-admin-dashboard.js after app-admin.js
scripts/test-admin-dashboard.mjs  NEW — 50-check direct-call test suite
```

## Not modified

`services/moderation-service.js`, `services/admin-permission-service.js`,
`services/study-submission-service.js`, `services/map-note-service.js`,
`services/community-service.js`, `services/comment-service.js`, `services/permission-service.js`,
`services/auth-service.js`, `services/auth-ui.js` — none of the ADMIN-V2-001/001A/002/002A
contracts were touched. Every existing Community/Map/Study moderation ACTION function
(hide/delete/approve/reject/verify) is unchanged; ADMIN-V2-003 only adds a "Review" button that
switches into those unchanged workspaces via the existing `adminSetSource()`.

## Known Limitations

- **A `COLLEGE_ADMIN`/`CONTENT_REVIEWER` still has no dedicated per-college Community/Building/
  Event moderation UI** (unchanged from ADMIN-V2-001/002 — that is ADMIN-V2-005). They now land on
  a real, scope-correct Overview/Queue/Reports/History instead of the old "no sections" dead end,
  but the Community/Map module workspace itself remains reachable only via
  `GLOBAL_COMMUNITY_MODERATE` (Super Admin or a Global Moderator/legacy admin), matching the
  pre-existing, explicitly-preserved compatibility decision from ADMIN-V2-001/002A.
- ~~**Map notes are inherently KMK-scoped** ... a legacy admin ... will NOT see `map_note` cases in
  the new unified Queue/Reports/History~~ — **FIXED in ADMIN-V2-003A**, see addendum below.
- **History is not an Audit Trail** — no who/before-snapshot/after-snapshot; that is ADMIN-V2-004,
  explicitly deferred.
- **Content Reviewer** still has zero real per-item access (unchanged from ADMIN-V2-002 — no
  `assignedTo` enforcement exists yet).
- **No Event/AI-flag data exists** — the Flagged stat and the Module filter's Event option (via
  `adminDashboardModuleForContentType` returning `null`) correctly show real empty states; nothing
  was fabricated.
- Mobile viewport not visually verified (pre-existing tooling limitation, not new). ~~BM/ZH not
  separately re-verified this stage~~ — **i18n'd and verified in ADMIN-V2-003A**, see addendum below.

## Next Step (original, superseded — see addendum)

~~None proposed — ADMIN-V2-003 is complete. Awaiting the user's explicit instruction before starting
ADMIN-V2-004 (Audit Trail) or any later stage.~~

---

## ADDENDUM — ADMIN-V2-003A (Dashboard Consistency Correction)

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-003A/PRE_STATE.md` and `ROLLBACK.md`.

### 4A — i18n

Every ADMIN-V2-003-introduced user-visible string in `app-admin-dashboard.js` (Overview/Queue/
Reports/History titles+descriptions, stat cards, module cards, filter labels+options, scope
labels, empty states, content-preview fallback strings, and the status/module/source row badges
that were still rendering raw internal enum values) plus `app-admin.js`'s `adminSidebarNavHtml()`
sidebar labels ("Overview"/"Moderation Queue"/"Reports"/"History"/"Open Echo Map") now route
through `I18n.t()`. ~80 new `admin.dash.*` keys added to `i18n/locales/{en,ms,zh}.js`. Internal
enum *values* (status/module/source/contentType strings used for CSS classing, filter `value`
attributes, transitions) were deliberately left untranslated per spec — only their *display
labels* changed, via 4 new small lookup helpers (`adminDashboardStatusLabel`/`ModuleLabel`/
`SourceLabel`) plus the pre-existing `adminDashboardScopeLabel` (new this stage, replacing 3
duplicated inline ternaries).

**Real browser verification** (not just unit tests): loaded `#/admin` as the real
`mzteoh88@gmail.com` QA account (existing localStorage data — 2 pending items, 3 reports, 2
resolved cases), screenshotted Overview/Queue/Reports/History in EN, ZH, and BM via
`I18n.setLanguage()` + `render()`. Confirmed: every label (including status/module/source row
badges, singular/plural report counts "1 report" vs "2 reports"/"1 条举报"/"1 laporan", and the
`{count}`/`{id}`/`{date}` interpolations) renders correctly in all three languages with zero raw
`admin.dash.*` key leakage. One false alarm during QA: a stale cached `app-admin-dashboard.js`
made an early screenshot look untranslated — `location.reload(true)` confirmed the served file
(verified via `fetch(..., {cache:'no-store'})`) was correct all along.

### 4B — Legacy Map permission parity

Added `AdminPermissionService.canModerateMap(user, orgId)`:
`isSuperAdmin(user) || canModerateGlobalCommunity(user) || (orgId != null && canModerateCollege(user,
orgId))`. `services/moderation-service.js`'s `canAccessScopeForModeration` now special-cases
`contentType === "map_note"` inside its `"college"` branch to call this instead of
`canModerateCollege` alone. This exactly restores what the Old Map Admin tab has always granted
(`canModerateGlobalCommunity`) while preserving the pre-existing real-`COLLEGE_ADMIN` case (via the
`canModerateCollege` fallback — confirmed NOT regressed, see Testing) and NOT granting
`ADMIN_MANAGE`/`AUDIT_READ_ALL`/any KMPP scope/an actual `COLLEGE_ADMIN` or `SUPER_ADMIN` role to a
legacy admin.

**Real browser verification**: with the real `mzteoh88@gmail.com` account, before the fix
`ModerationService.listModerationItems({}, user).filter(i => i.contentType === 'map_note').length`
was `0`; after the fix it is `2` (confirmed live against real existing map-note moderation items,
not fixture data) — visible in the Overview module-summary card ("Map: 2"), the Queue ("Map note —
Record note:9001", scope badge "KMK"), and History ("Map note — Record note:206", status
REJECTED).

### Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (was 74; +11 new
  `canModerateMap` assertions, 0 regressions)
- `node scripts/test-admin-moderation-schema.mjs` — **105 passed, 0 failed** (was 89; +16 new
  legacy-admin/Map-parity assertions, 0 regressions)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (was 50; the Global Moderator
  overview-count assertion changed from "exactly 1" to "exactly 2" — a required, documented
  consequence of the fix: Global Moderator has always had Map-tab access via
  `canModerateGlobalCommunity`, same as legacy admin, so the Unified Dashboard now correctly agrees)
- `node scripts/test-study-upload.mjs` — **49 passed, 0 failed** (untouched, no regression)
- `node --check` on every modified `.js` file — clean
- Real browser QA (Chrome via local `python -m http.server 8000`, real existing QA account/data,
  not fresh fixtures) — see above

### Modified Files

- `services/admin-permission-service.js` — added `canModerateMap()`
- `services/moderation-service.js` — `canAccessScopeForModeration`/`canAccessModerationItem`/
  `getReport`/`listReports`/`updateReportStatus` now thread `contentType` through
- `app-admin-dashboard.js` — i18n pass across every render function + 5 new label/formatting
  helpers
- `app-admin.js` — `adminSidebarNavHtml()` dashboard nav labels + "Open Echo Map" now `I18n.t()`
- `i18n/locales/en.js`, `i18n/locales/ms.js`, `i18n/locales/zh.js` — ~80 new `admin.dash.*` keys
  each
- `scripts/test-admin-moderation-schema.mjs`, `scripts/test-admin-role-scope.mjs` — new assertion
  blocks
- `scripts/test-admin-dashboard.mjs` — `I18n` sandbox stub now loads the real `en.js` table and
  interpolates like production; Global Moderator expectations updated

### Remaining Issues

None identified for 4A/4B specifically. Pre-existing limitations from the original report (History
not being an Audit Trail, Content Reviewer having no per-item enforcement, no per-college
Community/Building/Event UI, Mobile not visually verified) are unchanged and are explicitly
ADMIN-V2-004/005/008 scope, not this addendum's.

### Next Step

ADMIN-V2-003A complete. Proceeding to ADMIN-V2-004 (Moderation Actions + Audit Trail) per the
user's standing full-sequence authorization for this task.
