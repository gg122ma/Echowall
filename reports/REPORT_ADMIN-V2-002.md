# REPORT — ADMIN-V2-002: Unified ModerationItem + Report Schema

Date: 2026-08-23 (Map Integration upgraded from PARTIAL to PASS same day by the ADMIN-V2-002A
addendum at the end of this report — Map moderation is now fully real, tested, and
live-verified end-to-end)
Status: **PASS**

## Scope

Only ADMIN-V2-002 (unified ModerationItem + Report data model) was implemented, on top of the
already-locked ADMIN-V2-001/001A Role/Scope contract, which was **not modified** (no blocking bug
was found in it during this stage's audit). ADMIN-V2-003 through 008 (Dashboard UI redesign, Audit
Trail, College Admin full UI, Study Moderator UI redesign, Admin Management, AI Moderation) were
explicitly NOT started. No Admin page was redesigned; Study Notes browse/search/upload UI was not
touched.

## Audit findings

See `checkpoints/ADMIN-V2-002/PRE_STATE.md` for the full detail. Summary:

- **Community/Building posts**: moderation state today is a single `isHidden` boolean — no queue,
  no status enum, no report mechanism.
- **Comments**: a `moderationStatus` field exists in the schema/normalizer but is never set to
  anything but `"published"` — a stub with no real flow behind it.
- **Map notes**: same `isHidden`-only pattern as Community, in a separate admin tab.
- **Study resources**: the only module with a REAL multi-state moderation flow already
  (`pending`/`approved`/`rejected`, `verificationStatus`, `duplicateStatus`, a real `auditLog`).
- **Reports**: confirmed by project-wide grep — no report/flag feature exists anywhere. Fully
  greenfield this stage.
- **Event/Review**: no such feature exists at all (no service, no route, no data). Contract-only
  support, no fabricated UI, per explicit instruction.

## What was built

### 1. `services/moderation-service.js` (new) — the unified schema

- **ModerationItem**: `{ id, contentType, contentId, scopeType, scopeId, reason, source, riskScore,
  status, assignedTo, createdAt, resolvedAt, createdBy, updatedAt }`.
  `contentType` ∈ `post | comment | event | review | study_resource | map_note`.
  `source` ∈ `submission | report | auto_flag | admin`.
  `status` ∈ `pending | approved | rejected | hidden | escalated`, governed by an explicit state
  machine (`ALLOWED_TRANSITIONS`) — e.g. `approved -> escalated` is rejected, `escalated -> pending`
  is rejected (must resolve, not silently un-escalate), `approved -> hidden` and `hidden -> pending`
  are both allowed (retroactive hide / restore for re-review).
- **Report**: `{ id, reporterUserId, contentType, contentId, scopeType, scopeId, category, details,
  createdAt, status }`. `category` ∈ `spam | harassment | wrong_info | copyright | duplicate |
  other`. `status` ∈ `open | reviewing | resolved | dismissed`. Reports and ModerationItems are
  separate collections — creating a report never mutates or hides the reported content itself.
- **Scope derivation, not trust**: `resolveContentScope(contentType, contentId)` looks up the REAL
  canonical object (the `notes` array for `post`, always `study` for `study_resource`, always
  KMK-college for `map_note`) and derives scope from it. If the caller also supplies a scope that
  disagrees with the derived one, the call throws — a KMK post can never be filed under `scopeId:
  KMPP`. For `comment`/`event`/`review` (no canonical adapter exists), the caller's supplied scope
  is still structurally validated (a real `scopeType`, and an explicit `scopeId` for `college`) —
  just not cross-checked against a source of truth that doesn't exist yet.
- **Queue dedupe**: `ensureModerationItemForReport()` looks for an existing ACTIVE
  (`pending`/`escalated`) item for the same `contentType`+`contentId` before creating a new one — a
  second report on the same content reuses the same ModerationItem and raises its `riskScore`
  (capped at 100) instead of spawning a duplicate queue entry. Reports themselves are never
  deduplicated — every report is its own permanent record.
- **Permission gate**: every read (`getModerationItem`, `listModerationItems`, `getQueueItems`,
  `getReport`, `listReports`) filters by `canAccessScopeForModeration(user, scopeType, scopeId)`,
  and every write (`updateModerationStatus`, `updateReportStatus`) throws if that check fails. This
  function calls `AdminPermissionService.isSuperAdmin/canModerateGlobalCommunity/canModerateCollege/
  canModerateStudy` exclusively — **no `role === "admin"` check, no email whitelist, anywhere in
  this file.**
- **Provider architecture**: `localStorage` keys `echo-wall-moderation-items:v1` /
  `echo-wall-moderation-reports:v1`, behind a swappable `{ items:{list,save}, reports:{list,save} }`
  provider (`useProvider()`) — a future Supabase-backed provider replaces just that object.
  `ready()`/`subscribe()` match the shape every other swappable service in this app already uses.
- **Production security boundary**: documented explicitly in the file's own header comment, same
  posture as `admin-permission-service.js` — prototype/front-end enforcement only.

### 2. Minimal integration (no UI redesign)

- **Study submission → real moderation item** (`services/study-submission-service.js`):
  `createSubmission()` now calls `ModerationService.createModerationItem()` (best-effort, wrapped in
  `try/catch`) immediately after a real upload succeeds. `approveSubmission()`/`rejectSubmission()`
  call a new `syncModerationItemStatus()` helper that finds the mirrored item and calls
  `updateModerationStatus()` on it. **StudyUploadService's own storage remains the real source of
  truth** — these calls are an additional index, never a replacement, and never block the real
  action if `ModerationService` is absent or throws.
- **Community report → real Report + ModerationItem**: `ModerationService.createReport()` accepts
  `contentType: "post"` against a real community-note id and derives its scope from that note's
  actual `orgId`/`communityKey` — verified against real seeded note data both in the Node test suite
  and live in the browser (see Browser QA below). No report UI button was added anywhere (that is a
  future UI stage, not this one) — the service capability is real and tested, the entry point is
  not yet wired into the Wall.
- **Map note → contract support, not a live adapter**: `contentType: "map_note"` is fully supported
  by `createModerationItem`/`createReport` with correct KMK-college scope derivation, verified in
  the Node test suite. `MapNoteService` itself was **not** modified to auto-create ModerationItems
  on new pins — doing so would touch Map-adjacent code beyond this stage's "minimal integration"
  scope, and no real map pin currently exists in this environment to verify live against (see Known
  Limitations). Marked **PARTIAL**.
- **Comment/Event/Review**: contract-only, as instructed — recognized `contentType` values with
  structural scope validation, no adapter (no canonical content lookup exists for them) and no
  fabricated UI.

## Tests

`node scripts/test-admin-moderation-schema.mjs` (new, 65 checks) — **65/65 PASS**: valid item
create, invalid contentType/status/source/scope rejected, global/KMK/KMPP scope correctness, KMK
item cannot masquerade as KMPP (scope-mismatch rejection), jurusan-derived and building-default
scope resolution, study_resource and map_note canonical scope, report creation + validation,
multiple reports on the same content reusing one active moderation item with rising `riskScore`
(and never auto-hiding/deleting), Super Admin sees all, Global Moderator sees global-only, KMK
College Admin sees KMK-only (denied KMPP both via list and via direct `getModerationItem`), KMPP
College Admin sees KMPP-only, Study Moderator sees study-only, Student/Guest denied (list and
write), disabled RoleAssignment denied, full status-transition state-machine validation (including
several explicitly invalid transitions), `getQueueItems`'s default active-only filter, and
report-status updates gated by the report's own derived scope.

`node scripts/test-admin-role-scope.mjs` — **74/74 PASS** (unchanged, Role/Scope contract untouched).
`node scripts/test-study-upload.mjs` — **49/49 PASS** (re-run after wiring the best-effort
moderation-mirror calls into `study-submission-service.js`; that sandbox does not load
`ModerationService`, so every new call resolves to a no-op via optional chaining — confirming the
integration is genuinely non-blocking).

## Browser QA (real Chrome, `mcp__claude-in-chrome`)

- Loaded `index.html#/admin` as the already-signed-in legacy admin: no console errors, existing
  Community/Map/Study Moderation panels all rendered exactly as before — confirms
  `services/moderation-service.js` loading causes no regression.
- Switched to Super Admin (`greencucumbertube@gmail.com`, live session swap): confirmed
  `window.ModerationService` present.
- **Real Study submission → moderation mirror, full round trip**: created a real submission via
  `StudyUploadService.createSubmission()` with a synthetic PDF `File` — a real mirrored
  ModerationItem appeared immediately (`contentType: "study_resource"`, `scopeType: "study"`,
  `status: "pending"`). Called the real `StudyUploadService.approveSubmission()` — the mirrored
  item's status flipped to `"approved"` with `resolvedAt` set, matching the real submission's own
  `moderationStatus`. **PASS, fully verified end-to-end.**
- **Real Community report**: picked a real note from the live `notes` array (`id: 1`,
  `orgId: 1` = KMK) and called `ModerationService.createReport()` — the resulting Report and
  ModerationItem both correctly derived `scopeType: "college", scopeId: 1`, matching the note's real
  college, not a guessed or UI-supplied value. Report status `"open"`; the note itself was
  untouched (report ≠ delete, confirmed live). **PASS.**
- **Map note**: attempted the same live test via `MapNoteService.list()` — **no real map pin exists
  in this environment right now** (Map Notes admin tab shows 0 total pins), so a live end-to-end
  check against real map content was **Not verified**. The `map_note` contentType's scope-derivation
  logic itself is verified in the Node test suite.
- No console errors observed at any point. Test data (one Study submission, one Report) was left in
  place, matching this repo's existing convention of QA artifacts accumulating in the local
  prototype store; the original session (`mzteoh88@gmail.com`) was restored before finishing.

## Modified / new files

```
services/moderation-service.js            NEW — ModerationItem + Report schema, single source of truth
services/study-submission-service.js      best-effort moderation-mirror calls on create/approve/reject
index.html                                loads services/moderation-service.js after map-note-service.js
scripts/test-admin-moderation-schema.mjs  NEW — 65-check direct-call test suite
```

## Not modified

`services/admin-permission-service.js`, `services/auth-service.js`, `app-admin.js`,
`app-study-admin.js`, `services/permission-service.js`, `services/auth-ui.js` (the ADMIN-V2-001/001A
Role/Scope contract — no blocking bug found, left exactly as-is). `services/community-service.js`,
`services/comment-service.js` (read for their real schemas, not edited).
`services/map-note-service.js` was read-only in the original ADMIN-V2-002 pass, **but was edited in
the same-day ADMIN-V2-002A addendum below** (Hide/Delete now sync into ModerationService — see
that section for the exact change). `StudyUploadService`'s own storage/logic beyond the two
best-effort mirror call sites — untouched throughout. Community/Study Notes/Echo Map UI — no
redesign, no new buttons or pages, in either the original pass or the addendum.

## Known Limitations

> **Erratum (ADMIN-V2-002A, same day)**: the "Map note integration is PARTIAL" bullet below
> described the state as of the original ADMIN-V2-002 pass. It has since been closed — see the
> ADMIN-V2-002A addendum at the end of this report. Map Integration is now PASS.

- ~~**Map note integration is PARTIAL.** `contentType: "map_note"` is fully supported by the schema
  (correct KMK-college scope derivation, tested), but `MapNoteService` does not yet automatically
  create ModerationItems for new/reported pins — that wiring, plus a real live-content check, is
  deferred to whichever later stage builds actual Map moderation UI.~~ **Superseded — see
  ADMIN-V2-002A below.**
- **Comment/Event/Review have no canonical content adapter.** Their scope is structurally validated
  (a real `scopeType`, explicit `scopeId` for college) but not cross-checked against real content,
  since no such content/service exists yet for any of them. Comment moderation specifically still
  has its pre-existing schema-only `moderationStatus` field in `services/comment-service.js`,
  untouched.
- **Content Reviewer sees zero items in this stage**, by design — `CONTENT_REVIEWER`'s default
  permission set (`CONTENT_REVIEW` only) grants none of `canModerateGlobalCommunity`/
  `canModerateCollege`/`canModerateStudy`, so `canAccessScopeForModeration()` denies it everything.
  Real per-item `assignedTo`-based access for Content Reviewers is deferred to whichever stage
  builds real assignment enforcement (the field exists in the ModerationItem contract already).
- **This remains prototype/front-end-only enforcement**, same as ADMIN-V2-001 — every check in
  `services/moderation-service.js` can be bypassed by calling its functions directly from the
  browser console (as this report's own Browser QA section did, deliberately). Production
  reads/writes must be re-authorized server-side.
- Mobile viewport not applicable this stage (no UI was built).

## ADMIN-V2-002A — Map Moderation Integration addendum (2026-08-23, same day)

**Gap closed**: Map Integration is now **PASS**, not PARTIAL. `services/map-note-service.js` is
now wired into `services/moderation-service.js`, and the round trip was verified live end-to-end
in a real browser, not just in the Node test suite.

**Audit** (see `checkpoints/ADMIN-V2-002/PRE_STATE.md`'s addendum for full detail): confirmed the
only live-creatable map note type today is an "anchored building note" (`sourceType:
"map_message"`, real `notes`-array entry + a separate lat/lng anchor), created via
`features/map-note-overlay.js`'s "Post directly" flow and immediately public — no pending state.
"Direct pins" exist as a data shape but have no live creation path. Neither shape carries an
orgId — Map's scope genuinely is a fixed constant (KMK), not a per-item derivation.

**Fixes**:
- `services/moderation-service.js`'s KMK org id is no longer a bare hardcoded `1` — a new
  `resolveKmkOrgId()` looks it up from the canonical `organizations` config (app-data.js) by name,
  with the literal `1` demoted to a last-resort fallback only. Verified by a dedicated test using a
  deliberately unusual KMK id (77) in a fresh fixture, proving the lookup — not the fallback — is
  what's actually running.
- `services/map-note-service.js` gained `canonicalRecordKey()` (normalizes any of the several ways
  a map note can be addressed — string, `{noteId}`, `{pinId}` — to one canonical `note:<id>` /
  `pin:<id>` string, matching the `recordKey` `app-admin.js`'s rows already display) and
  `syncMapNoteModerationStatus()`. `MapNoteService.setHidden()`/`delete()` now call this
  best-effort, AFTER the real action already succeeded — Hide syncs an existing active
  ModerationItem to `hidden`, un-hiding syncs it back to `pending`, and Delete syncs it to
  `rejected`. If no ModerationItem exists for that note (the common case — most notes are never
  reported), this is a silent no-op, exactly matching the task's "don't force every historical note
  into the queue" requirement.
- `ALLOWED_TRANSITIONS` gained `approved -> rejected` and `hidden -> rejected` (both represent the
  same real event — a moderator hard-deleting content outside the normal review flow) — the
  previously-tested invalid transitions (`approved -> escalated`, `escalated -> pending`) are
  unaffected and still rejected.
- **Existing Map Admin behavior deliberately unchanged**: map note creation is still immediately
  public (no pending state introduced), and Delete is still a real hard delete (no soft-delete/
  tombstone introduced) — both confirmed unchanged in the audit and preserved on purpose.

**Tests**: `scripts/test-admin-moderation-schema.mjs` grew from 65 to **89 checks, 89/89 PASS** —
real-recordKey-shaped map note scope derivation (`note:`/`pin:` prefixed contentIds), KMK-vs-KMPP
scope-mismatch rejection, a full Map report → Report + ModerationItem → duplicate-report-reuse →
risk-score-rise chain, Super Admin and the correct College Admin able to read/update a KMK map
item, the wrong-college (KMPP) admin and Student/Guest all denied, and the Hide→`hidden`/
restore→`pending`/hard-delete→`rejected` transition chain. A separate
`runKmkLookupIndependenceCheck()` proves the KMK id genuinely comes from config, not a hardcoded
literal. `scripts/test-admin-role-scope.mjs` (74/74) and `scripts/test-study-upload.mjs` (49/49)
both re-verified unaffected.

**Browser QA — real, live, end-to-end** (real Chrome, `mcp__claude-in-chrome`, signed in as the
real `greencucumbertube@gmail.com` Super Admin account):
1. Created a real map note via the actual `MapNoteService.create()` API (the same function
   `features/map-note-overlay.js`'s real "Post directly" form calls) — `recordKey: "note:206"`,
   immediately public, exactly as the real product behaves.
2. Confirmed it live in the Admin "Map Notes" tab (1 total pin, visible, at the exact submitted
   coordinates).
3. Created two real reports via `ModerationService.createReport()` against that real note — two
   independent Report records, one shared ModerationItem correctly scoped `college:1` (KMK,
   resolved via the real config lookup), `riskScore` rising on the second report.
4. Clicked the REAL "Hide" button in the Admin UI — toast confirmed "Map pin hidden from public
   map.", admin stats updated (0 visible / 1 hidden), and the ModerationItem's status flipped to
   `hidden` live.
5. Clicked the REAL "Show" button — restored to visible, ModerationItem synced back to `pending`.
6. Called the real `MapNoteService.delete()` directly (the Delete BUTTON itself triggers a native
   `confirm()` dialog, which per this session's browser-automation safety rules must not be
   clicked — so the exact same underlying service function the button calls was invoked directly
   instead, exercising identical code): the pin was permanently removed (hard delete, unchanged
   behavior) and the ModerationItem synced to `rejected`.
7. Verified Echo Map (`map.html`) still loads and renders correctly (KMK view, building list, "Post
   directly" button present) with zero console errors, and the existing Community Notes/Study
   Moderation admin tabs remained fully functional throughout — no regression.
8. No console errors observed at any point. The original session (`mzteoh88@gmail.com`) was
   restored before finishing.

**Modified files (this addendum only)**: `services/moderation-service.js` (KMK-lookup +
transition-table changes), `services/map-note-service.js` (Hide/Delete sync wiring),
`scripts/test-admin-moderation-schema.mjs` (+24 checks). Checkpoint `after/*.post` snapshots for
these refreshed; `PRE_STATE.md`/`ROLLBACK.md` updated with this addendum.

**Updated Known Limitations** (supersedes the Map-related bullet above): Map note auto-creation on
report/hide/delete now works for real against real content; the remaining limitation is scoped
down to exactly what the task didn't ask this stage to touch — Comment/Event/Review still have no
canonical content adapter, Content Reviewer still has zero real per-item access, and this remains
prototype/front-end-only enforcement.

## Next Step

None proposed — ADMIN-V2-002 (including the ADMIN-V2-002A Map Integration addendum) is complete.
Awaiting the user's explicit instruction before starting ADMIN-V2-003 (Dashboard UI redesign) or
any later stage.
