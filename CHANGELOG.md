# Changelog

## 2026-08-23 — COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY

- **Echo Library rename**: "Study Notes" renamed to "Echo Library" everywhere a user actually sees
  it (Homepage promo, `#/study` landing eyebrow/H1, Programme/Semester/Subject breadcrumb, 4
  document titles, 2 error strings) across EN/BM/ZH. Internal `#/study` route, `app-study.js`,
  `StudyResourceService`, IndexedDB storage keys, and the study manifest/subject-code schema are
  completely unchanged — display-name-only. `admin.study.*` (Admin) and generic "study material(s)"
  phrasing deliberately left alone (different metric / out of scope).
- **All previously read-only seed/default Community posts are now fully interactive**: found and
  removed the `isDemoSeed && isDemoSeedRuntime` UI gate in `app-wall.js` that blocked comments,
  replies, and Mark Solved on the legacy 696-note demo-seed bundle. `CommentService` was already
  generic (keyed by postId, LocalStorage-persisted) — no new comment infrastructure was built.
  `app-data.js` gained `normalizeDemoSeedCommunityFields()` (backfills `postType`/`communityKey`/
  `communityScope`/`moderationStatus`, which the raw legacy JSON never had) so seed posts pass
  through the exact same Post Detail/filter code as real posts. Removed the visible "Demo content"
  badge and read-only styling (no seed/demo labels shown to users anymore). Voting stays a static,
  non-interactive display for seed posts only (their note objects are frozen at seed-activation
  time and can never actually persist a vote) — a deliberate, documented scope decision, not an
  oversight.
- **Added the 67 "All Student KM" community posts** from `All_Student_KM_67_Community_Posts.docx`
  (34 English / 20 Bahasa Melayu / 13 Chinese, content copied verbatim) as a new, independent seed
  source (`data/demo-seed-all-student-km.v1.js`, `window.ECHO_WALL_ALL_STUDENT_KM_SEED`) merged by
  `activateDemoSeedSnapshot()` alongside the legacy bundle — never touching that bundle's file or
  its strict validator. Global (`global:all`) scope only, never copied to any College/Jurusan/
  Building wall. `postType` (discussion/question) individually reasoned per post using the existing
  `EchoPostTypeContract`. Sticky `shape`/`color`/`rotation` are static, deterministic per post,
  drawn only from the project's existing `SHAPES`/`CATEGORY_COLORS` palettes. Import is idempotent
  (verified: 2 and 5 repeated "reloads" all yield exactly 67, never 134/335).
- New tests: `scripts/test-community-seed-interaction.mjs` (38/38), `scripts/test-all-student-km-seed.mjs`
  (36/36). Full existing regression suite re-run clean (admin x7, post-type-unification,
  study-upload, display-count-consistency).
- Browser-verified: Echo Library across every `#/study` page, a legacy KMK seed post's comment
  surviving a real refresh, a Building Wall legacy seed post (no comments — pre-existing,
  intentional Building boundary, untouched), all 67 new posts present with correct language totals,
  one comment-and-refresh cycle per language (EN/BM/ZH), a new normal Discussion + Question post
  both fully interactive (real voting) with no regression, Dark Mode readability, 0 console errors.
- Full report: `reports/REPORT_COMMUNITY-SEED-INTERACTION-AND-ECHO-LIBRARY.md`. Checkpoint:
  `checkpoints/COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY/`.

## 2026-08-23 — DISPLAY-COUNT-CONSISTENCY: unified College/Building demo notes-count

Display-only fix: College Community and KMK Building "notes count" figures now come from one
config instead of each page computing (and disagreeing on) its own real count. No note/post data,
LocalStorage, IndexedDB, moderation, report, or Admin-queue counts were touched — clicking into any
College or Building still shows its real, unmodified content and post list.

- New `data/demo-display-counts.js`: `COLLEGE_DISPLAY_COUNTS` (keyed by canonical `orgId`, 12
  colleges, total 593) and `BUILDING_DISPLAY_COUNTS` (keyed by canonical building id, the 9 KMK
  buildings named in the task, total 377), plus `getCollegeDisplayCount(orgId, fallback)` /
  `getBuildingDisplayCount(buildingId, fallback)` helpers. An entity with no entry returns the
  caller's real/fallback count unchanged — never forced to 0. Loaded right after
  `data/campus-buildings.js` in both `index.html` and `map.html`.
- Wired into every entry point that renders one of these two counts: `app-community.js` (Community
  Hub college cards, College Landing header), `app-router.js` (Homepage Building Stories grid,
  legacy `#/org/:orgId` header), `app-place.js` (Place Directory grid, Building Detail "Building
  Echoes" count), `echomap.js` (Echo Map building preview panel), `app-wall.js` (Building Wall
  header only — see semantic-scope note below).
- **Community Wall headers (Global/College-General/Jurusan) were deliberately left real/unchanged.**
  They measure a narrower, different metric (posts within that specific wall scope) than "College
  Community total across all majors," which is what the task's 593/per-college numbers represent —
  confirmed by reading `renderCommunityCollegeGeneralWall`'s `communityKey` scoping before touching
  anything. Overriding them would have shown a wrong number, not a consistent one. See HANDOFF.md
  for the full reasoning.
- New `scripts/test-display-count-consistency.mjs` (60 assertions, `node scripts/test-display-count-consistency.mjs`):
  exact college/building values, college total 593, building total 377, same-id calls stay stable
  across different caller fallbacks, unknown entities preserve their fallback, and none of the 5
  consumer files redeclare their own count table.
- Browser-verified end to end (Chrome): all 12 College cards, College Landing header, all 9
  Buildings across Building Stories / Place Directory / Building Detail / Building Wall / Echo Map
  side panel — every number matches the task's spec exactly, and the real underlying note arrays
  (e.g. Masjid's Building Wall genuinely renders its 1 real note while the header reads "83") are
  unaffected. Zero console errors.

## 2026-08-23 — UI-FIX-2: Homepage Study Notes / Echo Map promo cards, Light Mode surface follow-up

Follow-up to the same-day `UI-FIX` entry below — that fix removed the dark-brown gradient, but the
user reported the Light Mode result still looked like a standalone marketing banner (large
cream/beige `var(--secondary)` tint, oversized 28px radius, an oversized pastel decorative circle,
and — traced this round — a **second, separate** style-study.css override reintroducing an indigo
circle + lavender eyebrow specifically on `.study-notes-promo` that `style-core.css` alone couldn't
fix). Scope: only `.map-promo`/`.study-notes-promo` selectors in `style-core.css` and
`style-study.css`; `.home-community-card` (Community) was explicitly out of scope this round and
was not touched.

- `style-core.css` `.map-promo`: background `var(--secondary)` → `var(--card-bg)` (matches the
  `rgba(255,255,255,.8x)` card-surface pattern already used by `.org-card`/`.stat-card`/
  `.building-home-card` elsewhere on this same page); `border-radius` 28px → 20px; `padding`
  `clamp(28px,5vw,54px)` → `clamp(24px,4vw,40px)` (both now in the same range as sibling Homepage
  cards); the light-mode `::before` decorative circle background set to `transparent` (was a cyan
  `rgba(57,193,235,.12)` — this was Echo Map's own accent color, per the style-study.css comment
  block). CTA already used the sitewide `.btn-primary` — no separate button color existed to remove.
- `style-study.css`: found and neutralized a **second**, Study-Notes-specific override that
  `style-core.css` alone doesn't touch — `.study-notes-promo::before` (indigo `rgba(124,131,253,.16)`
  circle) → `transparent`, `.study-notes-promo .eyebrow` (`#b7bbff` lavender) → `var(--primary)`
  (brown, the sitewide brand accent). This is what was still producing the "突兀的紫色" the user
  flagged after the first fix.
- Dark Mode is provably unaffected, not just visually re-checked: the existing
  `:root[data-theme="dark"] .map-promo`/`.study-notes-promo .eyebrow` overrides have strictly higher
  CSS specificity than the (unscoped) light-mode rules changed above, so they already won in dark
  mode before this fix and continue to win identically after it — confirmed via
  `getComputedStyle()` in the browser (background `linear-gradient(135deg,#090806,#19140d)`, circle
  `rgba(212,168,90,.08)`, CTA `#dfb45f`/`#120f0a`, eyebrow `#c7caff`, all unchanged).
- Browser-verified (Chrome, `localStorage.theme` forced to each value + hard reload): Light Mode —
  both cards now render as a plain white/near-white bordered card with a subtle shadow, brown
  eyebrow/CTA, no visible circle; Dark Mode — pixel-for-pixel unchanged from before this fix; zero
  console errors on either pass.

## 2026-08-23 — UI-FIX: Study Notes tab cleanup + Homepage Light Mode cards

Two targeted, non-architectural UI fixes (no data/manifest/theme-logic changes).

- Study Notes Subject Resource page: the "Lecturer Notes" and "Student Notes" tabs no longer
  appear in the category tab bar (`studyResourceTabsHtml` in `app-study.js` now excludes them via
  a new `STUDY_HIDDEN_TAB_CATEGORIES` set). `getResourceCategory`/`RESOURCE_CATEGORY_ORDER` in
  `services/study-resource-service.js` are untouched — those two categories' resources still count
  toward "All" and render normally inside the "Other Resources" bucket; only their dedicated tab
  entry point was removed. Verified on SM015 (Science/Sem 1): tab bar now reads
  `All 141 / Pre/Pra PSPM 88 / PSPM 10 / Answer Scheme 41` (141 = 88+10+41+1 lecturer_notes+1
  student_notes, confirmed via `StudyResourceService.getResourceCategory` in-browser).
- Homepage `.home-community-card` (Community CTA) and `.map-promo` (Study Notes promo, Echo Map
  promo) in `style-core.css`: replaced the Light Mode dark-brown gradient background
  (`#241a10`→`#3d2a16` / `#2c1f14`→`#5b3b26`) and hardcoded white text with token-based styling
  (`var(--card-bg)`/`var(--secondary)`, `var(--text)`, `var(--text-muted)`, `var(--primary)`) so
  Light Mode now renders light/white cards consistent with the rest of the Light Theme. Dark Mode
  is unaffected — its existing `:root[data-theme="dark"] .home-community-card` / `.map-promo`
  overrides (near-black gradient, gold accents) were left untouched, and now rely on the same
  `var(--text)`/`var(--text-muted)` tokens for the child text, which already resolve correctly in
  dark theme.
- Browser-verified in Chrome (localhost:8000): Home in Light Mode (Community/Study Notes/Echo Map
  cards all light), Home in Dark Mode (all three cards unchanged from before this fix), SM015
  Subject Resource page tab bar and "Answer Scheme"/"Pre/Pra PSPM"/"PSPM" tab switching, zero new
  console errors on either page. (An unrelated stale-Chrome-cache `SharedUI is not defined`
  exception was observed on the very first load of this session and disappeared after a hard
  reload — not caused by these changes; see HANDOFF.md for detail.)

## 2026-08-23 — COMMUNITY-WALL-POST-TYPE-UNIFICATION

- Unified Community, Building Wall, and Echo Map on canonical `postType`:
  `discussion | question`, with `discussion` as default/invalid fallback.
- Building now exposes/persists the choice and renders Question badges.
- Map exposes post type beside Note and persists it independently from Category; existing
  placement, Category, Shape, Color, and identity paths remain intact.
- Admin displays normalized post type; all wording reuses existing EN/BM/ZH keys.
- Added 32 task assertions; all 9 test suites pass (578 assertions total).
- Required real-browser QA is blocked by the unavailable/untrusted in-app browser bridge.

## 2026-08-23 — ADMIN-V2-FINAL-QA: Admin V2 complete

Validation-only pass across the full ADMIN-V2-001 through 008 implementation — no code changes.
See `reports/REPORT_ADMIN-V2-FINAL-QA.md` for the complete role matrix, security, i18n, theme, and
regression findings.

- Full persistent test regression: 8 suites, 491 assertions, 0 failures.
- Live-verified this stage (roles not already covered live by an earlier stage): a freshly-granted
  KMPP College Admin (Community-only, zero KMK leakage), a freshly-granted Study Moderator
  (Study-only), a freshly-granted Content Reviewer (0 items before assignment, exactly 1 after),
  Guest and Student (both fully denied).
- Light theme re-verified in EN/ZH/BM (prior stages had only screenshotted Dark).
- Non-admin regression: Homepage, a real Community workspace, Study Notes browse all load cleanly
  with zero console errors.
- `HANDOFF.md` gained a new top-of-file "ADMIN V2 — FINAL STATE" architecture reference section.
- **Admin V2 (ADMIN-V2-001 through FINAL-QA) is now complete.**

## 2026-08-23 — ADMIN-V2-008: Auto Moderation Assist

Deterministic, rule-based content flagging (no external AI call) — the final Admin V2
implementation stage. See `reports/REPORT_ADMIN-V2-008.md`.

- New `services/moderation-assist-service.js`: Community rules (spam repetition, cross-author
  duplicate, suspicious link domains, excessive links, flood posting), Study rules (missing
  metadata, missing/broken file, hash duplicate — reuses existing `duplicateStatus`).
- New `ModerationService.ensureAutoFlagModerationItem()` — same "never duplicate the active queue
  case" guarantee as report dedupe.
- Wired into real post/upload creation (`app-wall.js`, `study-submission-service.js`), best-effort.
- riskScore is sorting/priority only — auto-flag never auto-deletes/hides; every flagged item is a
  normal `pending` item a human still reviews through the unchanged Approve/Reject/Hide flow.
- Real bugs found by this stage's own testing: Node vm sandbox missing `URL` global (test fixed);
  stale "(no auto_flag data yet)" Dashboard copy (fixed in all 3 languages).
- `test-admin-moderation-assist.mjs` (new) → 34 assertions. 0 regressions across the other 7 suites.

**All Admin V2 implementation stages (003A through 008) are now complete.**

## 2026-08-23 — ADMIN-V2-007: Admin Management

New Role Manager UI (Super-Admin-only) plus real gaps closed in the underlying RoleAssignment
service. See `reports/REPORT_ADMIN-V2-007.md`.

- New "Admin Management" tab (`app-admin-management.js`): grant/disable/re-enable/revoke roles,
  Super-Admin-only, real AuditAction on every action.
- `SUPER_ADMIN` is now provably unassignable via `grantRoleAssignment` (was previously a silent
  gap — confirmed, not hypothetical).
- New role/scope combination validation (e.g. `COLLEGE_ADMIN` + `scopeType:"study"` now rejected).
- New `revokeRoleAssignment` (hard removal, distinct from Disable).
- Role change confirmed immediate (no caching layer in the permission read path) — verified live.
- `test-admin-management.mjs` (new) → 43 assertions. 0 regressions across the other 6 suites.

## 2026-08-23 — ADMIN-V2-006: Study Moderation V2 Integration

Study Notes moderation was audited (not rewritten) and confirmed already complete for the spec's
field/action requirements; the one real gap — safe reconciliation between StudyUploadService's
real status and the best-effort ModerationService mirror — was closed. See
`reports/REPORT_ADMIN-V2-006.md`.

- New `StudyUploadService.reconcileStudyModerationState()`: idempotent, StudyUploadService always
  wins, creates missing mirrors (with the real rejection reason) or corrects drifted ones. Runs
  once per admin-panel session on Study tab open.
- Real bug found by this stage's own new tests (not assumed away): a recreated mirror never
  carried the real rejection reason — fixed.
- `test-study-upload.mjs` 54→65 (+11 assertions). 0 regressions across the other 5 suites.

## 2026-08-23 — ADMIN-V2-005: College Permission Enforcement + College Admin Workspace

A real `COLLEGE_ADMIN` can now use a real, scoped admin workspace — previously they could see
scope-correct Dashboard data but literally could not reach the Community/Map tabs at all. See
`reports/REPORT_ADMIN-V2-005.md`.

- Community + Map tab access decoupled and broadened: Community reachable by any real
  `COLLEGE_ADMIN`; Map reachable via the ADMIN-V2-003A `canModerateMap` fallback (KMK-only).
- `getAdminCommunityNotes()` now scope-filters per-college (global-tier unchanged) and includes
  Building notes for the first time (previously a dead code path with zero admin surface).
- Real per-item write enforcement (`adminCanModerateNote`) added to Community Hide/Delete —
  verified live that a KMK-only admin cannot hide a KMPP note via a direct console call.
- Community filter dropdown restricted to the viewer's permitted college(s) — doubles as the
  multi-college scope selector.
- "Reset demo data" restricted to global-tier only (it's an unscoped, all-colleges action).
- Content Reviewer: real assigned-only access (`ModerationService.canAccessModerationItem`'s new
  additive `assignedTo` path) + new Super-Admin-only `assignModerationItem()` with a minimal
  inline assign/unassign UI on Dashboard Queue rows.
- New `test-admin-college-scope.mjs` → 45 assertions. 0 regressions across the other 5 suites.

## 2026-08-23 — ADMIN-V2-004: Moderation Actions + Audit Trail

New `services/admin-audit-service.js` — a unified, scope-gated Audit Trail (`AuditAction`
CRUD) — plus reason enforcement and a new Audit UI tab. See `reports/REPORT_ADMIN-V2-004.md`.

- Reason now REQUIRED (service-layer enforced, not just UI) for Reject/Hide/Escalate across
  `ModerationService.updateModerationStatus`; optional for Approve/Restore.
- Community + Map Hide/Delete rewired onto a new shared reason-prompt overlay
  (replacing a bare toggle and a native `confirm()` respectively) — every Hide/Restore/Delete now
  produces an `AuditAction`. Delete stays a hard, irreversible delete (unchanged semantics), now
  flagged `irreversible:true` in its audit record.
- Study's Approve/Reject/Verify each produce exactly one unified `AuditAction`.
- New "Escalate" action on Dashboard Queue rows — deliberately the only Dashboard-driven action
  against `ModerationService` directly (see report for why Approve/Reject/Hide were NOT added
  there).
- New "Audit" tab in `#/admin`: Scope/Target/Action/Actor/Date-range filters, scope-gated
  identically to the rest of the Dashboard.
- Snapshot sanitization: audit records never contain PDF bytes/base64/passwords/tokens.
- Real bugs found+fixed during this stage's own testing: `adminSetSource`'s second, separate
  `sourceType` whitelist missing `"audit"` (silent no-op on click, caught in browser QA);
  `beforeSnapshot.isHidden` losing info via JSON's undefined-drop behavior.
- Tests: `test-admin-moderation-schema.mjs` 105→109, `test-study-upload.mjs` 49→54 (now exercises
  the real ModerationService+AdminAuditService integration instead of silently no-op'ing), new
  `test-admin-audit.mjs` → 58. 0 regressions.

## 2026-08-23 — ADMIN-V2-003A: Dashboard Consistency Correction (i18n + legacy Map permission parity)

Correction stage fixing two gaps ADMIN-V2-003's own report had already flagged as Known
Limitations. See `reports/REPORT_ADMIN-V2-003.md`'s addendum and `checkpoints/ADMIN-V2-003A/`.

- **Fixed**: legacy admin (`mzteoh88@gmail.com`-style, no college `RoleAssignment`) could
  Hide/Show/Delete Map notes from the Old Map Admin tab but the Unified Queue/Dashboard showed
  zero of them. New `AdminPermissionService.canModerateMap(user, orgId)` is now the single source
  of truth all three (Old Map Admin tab, `ModerationService`, Dashboard) depend on for `map_note`
  scope checks — confirmed live against the real account's actual data (0 → 2 visible map items),
  with zero change to Community-post isolation or any `COLLEGE_ADMIN`'s existing own-college Map
  access.
- **Fixed**: `app-admin-dashboard.js` (all of ADMIN-V2-003) and `app-admin.js`'s dashboard sidebar
  labels were hardcoded English. ~80 new `admin.dash.*` i18n keys added to
  `i18n/locales/{en,ms,zh}.js`; every render function now calls `I18n.t()`. Verified in a real
  browser in EN/BM/ZH against live QA data.
- Test suites extended (0 regressions): `test-admin-role-scope.mjs` 74→85,
  `test-admin-moderation-schema.mjs` 89→105, `test-admin-dashboard.mjs` 50→52.

## 2026-08-23 — ADMIN-V2-003: Unified Admin Dashboard / Scope-filtered Queue UI

New `app-admin-dashboard.js` adds a real Dashboard layer (Overview / Moderation Queue / Reports /
History) on top of `#/admin`, built entirely on the already-locked ADMIN-V2-001/001A Role/Scope
contract and ADMIN-V2-002/002A ModerationService — neither service was modified.

- **Overview**: scope-filtered Pending/Reported/Flagged/Escalated/Resolved counts plus a
  Community/Map/Study module summary — every count comes from `ModerationService.
  listModerationItems()`/`listReports()`, which already scope-filter by the signed-in user; a
  Student/Guest/denied user gets honest all-zero counts, never a "no permission" surprise after
  the fact.
- **Scope selector**: options are derived from the user's real active RoleAssignments checked
  against the top-level permission functions, with college names/ids read from the canonical
  `organizations` config — never a hardcoded college list. A single-scope user sees just that one
  option; "All permitted scopes" only appears for Super Admin or a genuinely multi-scope user.
- **Moderation Queue**: Status/Module/Source/Scope filters over `ModerationService`'s own data
  (never a second queue re-derived from `notes`/`MapNoteService`/`StudyUploadService`), sorted
  escalated-then-pending-then-newest, each row showing a safe canonical-content preview (post
  excerpt, Study subject/type/source, Map record key — never internal storage paths/blob keys).
- **Reports**: every report listed individually; `adminDashboardGroupReports()` correctly shows "3
  reports, 1 queue case" instead of rendering duplicates as separate cases.
- **History**: resolved (approved/rejected/hidden) cases only — explicitly not an audit trail
  (that's ADMIN-V2-004).
- **Existing Community/Map/Study panels untouched** — a new shared `adminSidebarNavHtml()`
  replaces two previously-duplicated inline sidebar copies, and queue rows get a "Review" button
  that switches into the existing, unmodified workspace via the existing `adminSetSource()` — no
  second action engine.
- A `COLLEGE_ADMIN`/`CONTENT_REVIEWER` who previously landed on a "No sections assigned yet" dead
  end now lands on a real, scope-correct (if all-zero) Overview instead.

**Bug found and fixed during this stage's own browser QA**: the scope selector's first version
derived visible scopes from each RoleAssignment's own `scopeType` field, which hid "Study" from the
legacy admin (one virtual assignment, `scopeType: "global"`, but grants both
`GLOBAL_COMMUNITY_MODERATE` and `STUDY_RESOURCE_MODERATE`) — fixed to check permissions directly.

New test suite `scripts/test-admin-dashboard.mjs` (50/50 passing). `scripts/test-admin-moderation-schema.mjs`
(89/89), `scripts/test-admin-role-scope.mjs` (74/74), and `scripts/test-study-upload.mjs` (49/49)
all re-verified unaffected. Real Chrome session: created a real Community report, a real Study
submission, and a real Map report in one pass — the unified Queue showed all three modules
simultaneously with real content previews; a live-granted KMK-only College Admin and a
console-forced attempt to view KMPP data both correctly returned zero cross-scope items (checked
directly against `ModerationService`, not just the UI filter); a Study Moderator saw only Study.
Light/Dark verified; mobile not verified (pre-existing tooling limitation).

Checkpoint: `checkpoints/ADMIN-V2-003/`. Report: `reports/REPORT_ADMIN-V2-003.md`. No Admin UI was
redesigned beyond adding this Dashboard layer; Study Notes browse/upload and Echo Map's public UI
were not touched. ADMIN-V2-004 through 008 were explicitly not started.

## 2026-08-23 — ADMIN-V2-002A: Map Moderation Integration (closes the Map PARTIAL gap)

Small supplementary stage on top of ADMIN-V2-002 (same day): wires the real
`services/map-note-service.js` into `services/moderation-service.js`, closing the one known gap
from ADMIN-V2-002 ("Map Integration: PARTIAL").

- **KMK org id is no longer a bare hardcoded `1`** in `moderation-service.js` — a new
  `resolveKmkOrgId()` looks it up from the canonical `organizations` config by name, with `1` kept
  only as a last-resort fallback. Verified with a dedicated test using a deliberately unusual KMK
  id (77) in a fresh fixture, proving the real lookup runs, not the fallback.
- **`MapNoteService.setHidden()`/`delete()` now sync into the unified moderation queue**,
  best-effort, after the real action already succeeded: Hide → `hidden`, un-hide → `pending`,
  hard-delete → `rejected` (a newly-allowed transition from `approved`/`hidden`, since deletion is
  a real destructive escape hatch outside the normal review flow). If no ModerationItem exists for
  a note (the common case — most notes are never reported), this is a silent no-op — historical
  normal map notes are never force-migrated into the queue. `contentId` uses the same `recordKey`
  convention (`note:<id>` / `pin:<id>`) the Admin UI's own rows already use.
- **Existing Map Admin behavior unchanged**: map note creation is still immediately public (no
  pending state), and Delete is still a real hard delete (no soft-delete/tombstone was introduced)
  — confirmed by audit and preserved deliberately.

`scripts/test-admin-moderation-schema.mjs` grew from 65 to 89 checks — **89/89 PASS**: real
recordKey-shaped map note scope derivation, KMK-vs-KMPP scope-mismatch rejection, a full Map
report → Report + ModerationItem → duplicate-reuse → risk-score-rise chain, Super
Admin/correct-College-Admin access vs. wrong-college/Student/Guest denial, and the
Hide/restore/hard-delete transition chain, plus an independence check proving the KMK id isn't
hardcoded. `scripts/test-admin-role-scope.mjs` (74/74) and `scripts/test-study-upload.mjs` (49/49)
re-verified unaffected.

**Real Chrome end-to-end verification**: created a real map note via the actual
`MapNoteService.create()` API, reported it twice (one shared ModerationItem, correctly KMK-scoped,
risk score rising), clicked the real Admin "Hide" button (ModerationItem synced to `hidden` live),
clicked "Show" (synced back to `pending`), and called the real `MapNoteService.delete()` (hard
delete preserved, ModerationItem synced to `rejected`). Echo Map and existing Community/Study Admin
confirmed unaffected, zero console errors throughout.

Checkpoint: `checkpoints/ADMIN-V2-002/` (addendum, same folder). Report:
`reports/REPORT_ADMIN-V2-002.md`'s "ADMIN-V2-002A" section. No Admin UI was redesigned.
ADMIN-V2-003 through 008 were explicitly not started.

## 2026-08-23 — ADMIN-V2-002: Unified ModerationItem + Report Schema

New `services/moderation-service.js` — the single ModerationItem/Report source of truth, built on
top of the ADMIN-V2-001/001A Role/Scope contract (not modified this stage).

- **ModerationItem**: `{ id, contentType, contentId, scopeType, scopeId, reason, source, riskScore,
  status, assignedTo, createdAt, resolvedAt, createdBy, updatedAt }`, `contentType` ∈
  `post|comment|event|review|study_resource|map_note`, `status` governed by an explicit state
  machine (e.g. `approved -> escalated` and `escalated -> pending` are both rejected).
- **Report**: `{ id, reporterUserId, contentType, contentId, scopeType, scopeId, category, details,
  createdAt, status }`, fully separate from ModerationItem — a report never deletes or hides
  content; a second report on the same content reuses the existing active ModerationItem and raises
  its `riskScore` instead of creating a duplicate queue entry.
- **Scope is derived, not trusted**: a KMK community post's ModerationItem is always
  `scopeType:"college", scopeId:1` (KMK's real orgId), derived from the actual note object — a
  caller supplying a mismatched scope (e.g. claiming a KMK post is KMPP) is rejected outright.
- **Permission gate is AdminPermissionService only** — every read filters by, and every write
  requires, `canModerateGlobalCommunity`/`canModerateCollege`/`canModerateStudy`/`isSuperAdmin`; no
  `role === "admin"` check or email whitelist anywhere in the new file.
- **Minimal real integration**: Study submissions now mirror into a real ModerationItem on upload
  and sync on approve/reject (best-effort, StudyUploadService's own storage remains authoritative);
  Community reports work against real post data with real derived scope; Map notes and
  Comment/Event/Review get contract-level support (Map: scope-derivation only, no live
  auto-creation yet — PARTIAL; Comment/Event/Review: no canonical adapter exists for them yet).

New test suite `scripts/test-admin-moderation-schema.mjs` (65/65 passing). `scripts/test-admin-role-scope.mjs`
re-verified 74/74 (Role/Scope contract untouched) and `scripts/test-study-upload.mjs` re-verified
49/49 (Study's own moderation storage untouched; the new mirror calls are no-ops when
`ModerationService` isn't loaded). Real Chrome session: a real Study upload → real mirrored pending
item → real approval → mirrored item flipped to approved, and a real Community post → real Report +
correctly KMK-scoped ModerationItem, both live end-to-end with no console errors. Map note
end-to-end check: Not verified (no real map pin exists in this environment right now).

Checkpoint: `checkpoints/ADMIN-V2-002/`. Report: `reports/REPORT_ADMIN-V2-002.md`. No Admin UI was
redesigned; Study Notes browse/search/upload UI was not touched. ADMIN-V2-003 through 008 were
explicitly not started.

## 2026-08-23 — ADMIN-V2-001A: Super Admin email — true single source of truth

Small correction on top of ADMIN-V2-001 (same day): `greencucumbertube@gmail.com` was still
hardcoded in two business-code files — the new `services/admin-permission-service.js`
(`SUPER_ADMIN_EMAIL`, intended) and the pre-existing `services/auth-service.js`
(`PROTOTYPE_ADMIN_EMAILS`, left over, never removed when ADMIN-V2-001 was built). Fixed:

- `services/auth-service.js`'s `PROTOTYPE_ADMIN_EMAILS` now lists only the true legacy admin,
  `mzteoh88@gmail.com` — the Super Admin email no longer appears there.
- `services/auth-service.js`'s `isCurrentUserAdmin()` is now a compatibility wrapper deferring to
  `AdminPermissionService.canAccessAdminPanel()` when available, falling back to the (now
  legacy-only) whitelist only if that service is somehow absent. No script-load circular
  dependency — this runs at call-time, well after both scripts have loaded.
- **Super Admin authorization is now provably independent of the legacy `user.role` field**:
  `greencucumbertube@gmail.com` gets `role: "user"` from `AuthService` (no longer whitelisted
  there), yet still resolves as Super Admin with every permission — confirmed live in Chrome and by
  3 new dedicated test fixtures (`role: "user"`, and no `role` field at all).
- `mzteoh88@gmail.com` unaffected: still a working legacy admin (Community + Map + Study), still
  confirmed NOT Super Admin.

`scripts/test-admin-role-scope.mjs` grew to 74 checks (was 65) — **74/74 PASS**.
`scripts/test-study-upload.mjs` re-verified **49/49 PASS** (unaffected — its sandbox never touches
the real `services/auth-service.js`). Real Chrome smoke test (Super Admin / legacy admin / denied
student) confirmed no regression. See `reports/REPORT_ADMIN-V2-001.md`'s "ADMIN-V2-001A" section
for full detail; `checkpoints/ADMIN-V2-001/` updated with an addendum, not a new checkpoint folder.

## 2026-08-23 — ADMIN-V2-001: Role / Scope Contract

New `services/admin-permission-service.js` — the single Role/Scope/Permission source of truth for
Echo Wall Admin V2, replacing the old binary `user.role === "admin"` gate everywhere it mattered for
moderation.

- **Roles**: `SUPER_ADMIN`, `GLOBAL_MODERATOR`, `COLLEGE_ADMIN`, `STUDY_MODERATOR`,
  `CONTENT_REVIEWER` — real, assignable, scope-separated roles instead of one flat admin flag.
- **RoleAssignment contract**: `{ id, userId, role, scopeType, scopeId, permissions, status,
  grantedBy, grantedAt, updatedAt }` (`scopeType`: global/college/study/system; `status`:
  active/disabled). A user may hold multiple assignments (e.g. College Admin for both KMK and
  KMPP) — each scope stays explicit, never implicit.
- **Permissions**: `ADMIN_MANAGE`, `AUDIT_READ_ALL`, `GLOBAL_COMMUNITY_MODERATE`,
  `COLLEGE_COMMUNITY_MODERATE`, `COLLEGE_BUILDING_MODERATE`, `COLLEGE_EVENT_MODERATE`,
  `STUDY_RESOURCE_MODERATE`, `CONTENT_REVIEW`.
- **Super Admin bootstrap**: `greencucumbertube@gmail.com` (the ONLY hardcoded email in the new
  system, single-sourced in `admin-permission-service.js`, email-normalized case/whitespace) always
  resolves to `SUPER_ADMIN` with every permission — verified live in Chrome, including a mixed-case
  email variant.
- **Legacy compatibility**: `mzteoh88@gmail.com` (the existing prototype admin whitelist in
  `services/auth-service.js`, untouched) keeps its pre-Admin-V2 capability (Community + Map + Study
  moderation) via a virtual legacy-compat grant, but is explicitly confirmed NOT Super Admin — no
  `ADMIN_MANAGE`, no `AUDIT_READ_ALL`, no college-scope bypass.
- **Minimal wiring**: `app-admin.js`'s `#/admin` gate, `app-study-admin.js`'s 7 Study-moderation
  actions, `services/study-submission-service.js`'s `requireModerator()` (the real service-layer
  gate for approve/reject/verify), `services/permission-service.js`'s "Mark Solved" moderation-scope
  check, and `services/auth-ui.js`'s Admin Dashboard link visibility all now ask the new service
  instead of re-deriving their own answer. Community/Map and Study now have genuinely separate
  gates — a Study Moderator cannot switch into Community/Map (and vice versa for a Global
  Moderator), confirmed both by denial toasts in the UI and by the action refusing to execute when
  forced from the console.
- **Prototype persistence**: `localStorage` key `echo-wall-role-assignments:v1`, behind a
  swappable provider so a future Supabase-backed provider can replace it with zero caller changes.
  Documented explicitly, in the file's own header, as prototype/front-end enforcement only —
  production writes still need server-side re-authorization.

New test suite `scripts/test-admin-role-scope.mjs` (65/65 passing): Super Admin bootstrap
(exact + mixed-case email), Guest/Student denial, legacy admin compatibility, Global/College/Study
role isolation, KMK vs KMPP college isolation, disabled assignments, multiple scopes, Content
Reviewer. `scripts/test-study-upload.mjs` re-verified 49/49 passing after wiring the real permission
service into its sandbox (no assertions changed, only the sandbox setup).

Checkpoint: `checkpoints/ADMIN-V2-001/`. Report: `reports/REPORT_ADMIN-V2-001.md`. Community UI,
Echo Map UI, Building UI, and Study Notes UI were not redesigned — only the minimal admin-gate
wiring above. ADMIN-V2-002 through 008 (Queue schema, Dashboard redesign, Audit actions, College
Admin UI, Study Moderator UI redesign, Admin Management UI, AI Moderation) were explicitly not
started.

### Verified

Real Chrome browser session: Super Admin (`greencucumbertube@gmail.com`, an existing prototype
account) reached the Admin Dashboard and functionally used Community, Map, and Study Moderation
panels. Legacy admin (`mzteoh88@gmail.com`) confirmed unaffected — same full access as before this
task, confirmed NOT Super Admin. A plain signed-in student was denied `#/admin`. Real
`grantRoleAssignment()` calls against the live app confirmed a Study Moderator sees only the Study
tab (Community/Map hidden, and switching denied even when forced from the console) and a Global
Moderator sees only Community/Map (Study hidden and denied). No console errors observed. KMK/KMPP
College Admin isolation was verified via the live permission-service API (matching the Node suite)
— no dedicated College Admin UI exists yet to click through (ADMIN-V2-005). Mobile viewport not
visually verified (pre-existing tooling limitation).

## 2026-08-22 — COMMUNITY-MAP-NAV-POLISH-001: Community/Echo Map navigation and consistency fixes

Investigated current source (not old reports) before changing anything, then fixed 4 real bugs:

- Removed the "📣 General Community" entry card from the College Landing page
  (`renderCollegeLanding()` in `app-community.js`) for every college — header, visible-notes count
  and Jurusan Channels are unaffected. The `#/community/:orgId/general` route and
  `renderCommunityCollegeGeneralWall` were left untouched, only the entry UI was removed.
- Confirmed the Homepage "Explore Community" button already used
  `document.getElementById('communities')?.scrollIntoView({behavior:'smooth'})` — a real element
  target, not a fixed offset — so no code change was needed there; verified the target computation
  is exactly correct via an instant-scroll check (`top: 0.35px`).
- Unified every public "Echo Map" entry-point label (Navbar, Homepage hero CTA, Homepage
  "Connect voices..." promo section, AI-assistant reply) from "Echo Map KMK"/"Open KMK Echo Map" to
  campus-agnostic "Echo Map" in `i18n/locales/{en,ms,zh}.js` and `index.html`'s static fallback.
  `map.title` and the real `map.html` `<h1>`/`<title>` were explicitly left alone — they correctly
  keep showing "Echo Map KMK"/"Echo Map KMPP"/etc. once inside an actual campus map.
- Fixed Building Detail's Back button always going to Building Stories regardless of entry point.
  Added a minimal `sessionStorage`-backed navigation-source hint
  (`setPlaceReturnSource`/`getPlaceReturnSource` in `app-router.js`, shared by `index.html` and
  `map.html`) instead of a blanket `history.back()`. Building Stories entries record `"places"`;
  the Echo Map's "More Details" action records `"map"` and reuses the existing
  `saveMapReturnSnapshot()` the "Enter this building wall" action already used, so returning from
  Building Detail to Echo Map restores the exact prior map center/zoom/selected-building/preview
  state, not just avoids Building Stories. A direct `#/place/:placeId` link with no recorded source
  correctly falls back to Building Stories.
- Root-caused and fixed the non-KMK Echo Map switcher showing an empty "Focus buildings" sidebar:
  `map.html`'s own `‹ KMK ›` switcher (`switchToCollegeIndex()` in `echomap.js`) had a second,
  out-of-sync copy of the Campus Framework sidebar that only ever toggled one static, never-updated
  notice paragraph — `map.html` doesn't even load the scripts a real non-KMK sidebar needs
  (`app-campus-map.js`, `data/campus-building-registry.js`). Fixed by loading those two scripts on
  `map.html` and switching **in-place**: `switchToCollegeIndex()` now toggles between the KMK
  building sidebar and a new `#campus-framework-guide` container for non-KMK targets — it never
  navigates away from `map.html`. The sidebar's header+body markup was extracted into one shared,
  parameterized helper, `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix)` in
  `app-campus-map.js`, called by both `renderOrgCampusMap()` (Community → Map, `hrefPrefix` empty →
  `navigate()`) and the switcher's new `renderNonKmkCampusGuide()` (`hrefPrefix="index.html"` → only
  its two actionable module-card buttons use `location.href`). Verified live that clicking `›`/`‹`
  repeatedly cycles KMK → KMKK → KMPP → KMPK and back, entirely on `map.html`, with KMK's full
  building functionality intact on return and KMPP/KMKK/KMPK showing the same Campus Framework
  content as Community → Map. No building data was fabricated or added.

  **Correction (same day):** an earlier version of this fix used `location.href =
  "index.html#/org/${orgId}/map"` for non-KMK targets — a full-page redirect that broke continuous
  switcher use (each non-KMK step left Echo Map entirely). That approach was replaced same-day with
  the in-place fix described above before this changelog entry was written; no full-page-redirect
  version ever reached a released state.

Checkpoint: `checkpoints/COMMUNITY-MAP-NAV-POLISH-001/`. Report:
`reports/REPORT_COMMUNITY-MAP-NAV-POLISH-001.md`. Study Notes V2, Upload/Moderation, Community
Sticky Wall/pointer glow, Jurusan Wall, building content/photos, campus coordinates, non-KMK
building data, Auth and Admin were not touched.

### Verified

Real Chrome browser session: General Community card removal (KMK + KMPP), Echo Map naming across
Light/Dark and EN/BM/ZH, both Building Detail return flows (including full map-context restoration
for the Echo Map flow, and the no-source-context direct-link fallback), and the in-place switcher
sequence KMK → KMKK → KMPP → KMPK → KMPK → KMPP → KMKK → KMK (forward and reverse, all on
`map.html`, KMK building functionality fully restored on return, Campus Framework sidebar content
byte-matching Community → Map for KMPP). No console errors observed. Mobile 390–430px not visually
verified (`resize_window` does not change `window.innerWidth` in this environment, a pre-existing
tooling limitation).

## 2026-08-22 — STUDY NOTES V2 — FINAL Browser Acceptance (COMPLETE)

- Real-Chrome browser acceptance for STUDY-V2-008 and FINAL-QA, using the `mcp__claude-in-chrome` bridge (previously unavailable in this environment; connected and usable this session). No Study application source was modified — verification only, per explicit instruction not to redo 003–008 or reimplement Upload/Moderation.
- Full real-browser pass: Homepage → Study Notes → Jurusan → Semester → Subject → Resource → Open PDF (real built-in file, 14 pages); global Search (`SM015`, `AA015`, `2023`, a live title/topic keyword) and subject-page Category/Year/Subtype/Source/Sort/Clear filters.
- Real Upload as a newly registered regular (`role: "user"`) account with a real generated PDF via the file input; confirmed the pending submission is invisible to Browse/Search and does not move the public resource count.
- Real Admin Moderation as a newly registered `role: "admin"` account (second whitelisted email): pending PDF opens via a real `blob:` URL; Reject form visually confirmed full-width (`grid-column:1/-1`, not the previously-unverified 72px column) with a required, always-non-empty reason enforced at both UI and service layers; Edit metadata → Save & Approve; verification cycled Unverified → Verified Source → Verified Material with Approve confirmed to leave a record at Unverified by default (no auto verified_file).
- Approve → Publish confirmed end-to-end: Browse/Search/Filter/Resource-Detail all pick up the approved item, and its real uploaded PDF opens publicly via `blob:` URL. Reject confirmed end-to-end: invisible to Browse/Search and its direct `#/study/resource/:id` route 404s ("Study Notes page not found").
- Re-uploading the exact same PDF bytes was blocked with "This file already exists" linking to the real public duplicate (SHA-256 exact-duplicate detection).
- Question↔Answer Scheme cross-navigation confirmed both for a built-in pair and for a real approved user-upload linked to a built-in Question.
- Permissions confirmed with three real accounts in one session: guest → "Sign in required"; regular student → "Access denied"; admin → full dashboard.
- Theme/language matrix: Light and Dark both re-verified (including the Reject form in Dark); EN/BM/ZH all re-verified on the Study subject page. Mobile 390–430px could not be live-verified — `resize_window` does not change `window.innerWidth` in this environment (same tooling gap as STUDY-V2-007); structural mobile CSS breakpoints were confirmed present in `style-study.css`/`style-admin.css` instead, and this is reported as a gap, not a pass.
- Non-Study regression smoke test (Homepage, Community, All KM Students, College Community, pointer glow, Echo Map, Building Profile/Wall, existing Admin — KM Community Notes + Map Notes, Auth) all re-verified with no console errors.
- `scripts/test-study-upload.mjs`: 49/49 passing (re-run after the browser pass); 377 built-in demo files confirmed unchanged.
- Updated `study v2/reports/REPORT_STUDY-V2-008.md` and `study v2/reports/REPORT_STUDY-V2-FINAL-QA.md` from BLOCKED to PASS with the real-browser evidence above.

## 2026-08-22 — STUDY-V2-007: Upload Study Material

Real Upload Study Material flow at `#/study/upload` (replacing the "coming soon" placeholder),
backed by a new IndexedDB storage adapter — every submission starts pending/unverified and is
structurally excluded from the public resource pipeline until approved (approval UI is
STUDY-V2-008, not built yet).

### Added

- `services/study-submission-service.js` (new): `StudyUploadService`, an IndexedDB-backed,
  provider-swappable upload storage adapter (mirrors `services/map-note-service.js`'s
  `ready/subscribe/useProvider` shape). SHA-256 hashing, exact/likely duplicate detection (scans
  built-in manifest + pending + approved submissions), PDF-only validation (extension + `%PDF-`
  signature + a 60MB cap derived from the real demo file set's measured max of 45.73MB), the full
  submission lifecycle (`createSubmission/approveSubmission/rejectSubmission/setVerification`),
  and bidirectional Question↔Answer Scheme linking between two of the uploader's own pending
  submissions (never mutates the frozen built-in manifest).
- `services/study-resource-service.js`: `getManifest()` now overlays
  `StudyUploadService.getApprovedResourcesSync()` (approved-only) onto the untouched built-in
  array — the single integration point; every existing query function inherits this for free.
- `app-study.js`: the real Upload form (cascading Jurusan→Semester→Subject, Type→Subtype, dynamic
  Related-Resource picker, sign-in gate, validation, success/duplicate/error banners), a secondary
  Upload CTA on `#/study`, and `indexeddb://`-aware file-opening (`studyOpenIndexedDbFile`)
  alongside the existing static-path file-opening, unchanged.
- `app-router.js`: `StudyUploadService.ready()`/`subscribe()` wiring at `DOMContentLoaded`.
- `i18n/locales/{en,ms,zh}.js`: ~55 new `study.upload.*` keys, all three languages real-browser
  confirmed. `style-study.css`: upload form/banner styles (reuses `style-core.css`'s existing
  form classes).
- `scripts/test-study-upload.mjs` (new, persisted): Node `vm` direct-call suite with a hand-rolled
  minimal fake IndexedDB — 49/49 passing.

### Not changed

`data/study-resource-manifest.js`, `data/study-subjects.js`, `assets/study-files/` (377 files,
unchanged), Browse Hierarchy, Search/Filter (STUDY-V2-005), file-serving for built-in resources
(STUDY-V2-006), Community, Echo Map, Building, Admin, Auth.

### Verified

49/49 direct-call checks (Node `vm`, fixture data) + a real 2468-item-manifest smoke test
confirming `getManifest()`'s overlay is a byte-identical no-op when `StudyUploadService` is absent
(2284 publishable, 138 SM015 results — unchanged from pre-stage). Real Chrome browser session
(signed-in, Dark→Light, EN→BM→ZH): filled and submitted the real Upload form with a real PDF file
via the file input, confirmed the blob was actually persisted in IndexedDB (not LocalStorage — a
full `localStorage` key/size dump found zero Study-upload-related keys), confirmed the pending
submission is invisible to search/browse, confirmed exact-duplicate re-upload is blocked with a
real error banner, and — via that same real-browser pass — **found and fixed a real bug**: the
duplicate-error banner linked to a still-pending submission's resource page, which 404'd (fixed by
checking actual `getResourceById` reachability instead of the field-only `isResourcePublishable`
predicate). Mobile viewport not independently re-verified this stage (`resize_window` did not
change `window.innerWidth` in this environment). See `study v2/reports/REPORT_STUDY-V2-007.md` for
the full breakdown.

## 2026-08-21 — STUDY-V2-005: Search / Filter

Global Search (search box + inline results panel at `#/study`, ranked Subject Code first) and
Year/Subtype/Source/Sort filters layered on top of the existing STUDY-V2-004 category tabs on the
Subject page. Both are additive to, and verified not to disturb, STUDY-V2-006's file-serving work.

### Added

- `services/study-resource-service.js`: `searchResources()` rewritten from a 2-tier (code-prefix,
  then title/topic) into a real 5-tier ranking — exact Subject Code, prefix Subject Code, Title,
  Topic, Year (examSessionLabel/yearStart/yearEnd) — always publishable-only. New
  `filterResources(resources, filters)` (subtype/year/sourceCollege/category/subjectCode, all
  optional), `sortResources(resources, sortMode)` ("relevant"/"newest"/"oldest"/"title"),
  `getFilterOptions(resources)` (dynamic years/subtypes/sourceColleges from the given array, never
  hardcoded).
- `app-study.js`: Global Search bar + inline results panel on `renderStudyHome()` (debounced
  ~200ms `oninput`, no page navigation on search, no URL query param — see the Not-Modified note
  below for why). Subject page (`renderStudySubjectShell`) gained a Year/Subtype/Source/Sort
  filter bar beneath the existing category tabs — filters reset on tab switch (each category can
  have entirely different real option values), combine with the tab as an intersection, and never
  duplicate the tabs' own Type axis.
- `style-study.css`: shared `.study-search-bar`/`.study-search-filters`/`.study-filter-field`/
  `.study-clear-link` rules (reused by both Global Search and the Subject page filter bar).
- `i18n/locales/en.js`/`ms.js`/`zh.js`: new keys for search/filter/sort UI text and all 11 real
  `resourceSubtype` labels — full EN/BM/ZH.

### Not changed

`app-router.js` (checked — appending `?q=...` directly after `#/study` would break the current
`getRoute()`'s `hash.split("/")` parsing; kept search as pure component state instead of touching
the router, per this stage's explicit instruction not to rewrite it for search).
`data/study-resource-manifest.js`, `data/study-subjects.js`, `scripts/build-study-manifest.mjs`,
`scripts/build-study-demo-files.mjs`, `assets/study-files/` (377 files, unchanged), Browse
Hierarchy, category-tab taxonomy, year grouping, Question/Scheme pairing, STUDY-V2-006's Resource
Detail file-open UI, Community, pointer-glow, Echo Map, Building, Admin, Auth.

### Verified

56/56 direct-call checks (Node `vm`) against the real, unmodified manifest/service/router/study
source — Subject Code priority ranking, title/topic/year search all confirmed against real
matching data (e.g. "liabilities" finds a real AA015 resource via its `topic` field; "2023" finds
real year-matching resources); manual_review/duplicate resources confirmed absent from search
results; combined search+filter intersection confirmed; SM015 PSPM Year filter and AA015 Practice
Subtype/Source filters confirmed against real data. Re-ran `test-study-v2-006.js` (39/39, all 377
demo files + `getResourceFileUrl()` unaffected) and `test-study-v2-004.js` (35/36, same
pre-existing documented gap, no new regression) before and after this stage. Real Safari browser
confirmed the search bar and Subject-page filter bar both render correctly in Dark theme/Chinese,
alongside STUDY-V2-004/006's tabs/badges/pairing links with no visual conflict. Mobile and EN/BM
real-browser toggling not independently confirmed this stage (tooling limitation, consistent with
every prior stage). See `study v2/reports/REPORT_STUDY-V2-005.md` for the full breakdown,
including a transparency note about an incidental Safari tab-focus mixup during verification (no
user tab was navigated/edited/closed by this session; full detail in the report).

## 2026-08-21 — STUDY-V2-006: Actual File / PDF Opening

Resource Detail's "Open file" is now real for any resource in a curated "Competition Demo File
Set" (377 real files, ~422MB, full coverage across 9 real subjects spanning all 3 jurusan that
have data), instead of unconditionally disabled. Resources outside that set still show an honest
"not available in this demo" state — never a fake or dead link.

### Added

- `scripts/build-study-demo-files.mjs` (new): a second, additive pass over the already-generated
  manifest — copies real files for the curated demo subject list from the real source folders
  into `assets/study-files/`, named by resourceId (never the original title/path), re-hashes each
  copy against the manifest's own `fileId` before accepting it, then rewrites
  `data/study-resource-manifest.js` adding `fileUrl` and `demoAvailable` to every item.
- `services/study-resource-service.js`: `getResourceFileUrl(resource)`, `getResourceFileType
  (resource)`, `isResourceFilePdf(resource)` — the only place a resource's file URL is resolved;
  `app-study.js` never constructs a path itself.
- `app-study.js`: `renderStudyResourceDetail()` now renders a real `<a href>` (new tab for PDF,
  `download` attribute for DOCX/PPTX/DOC) when a file exists, or a disabled button + honest
  "File not available in this demo" note when it doesn't. `studyResourceRowHtml()` gained an
  optional file-type badge + "Open →" quick link.
- `i18n/locales/en.js`/`ms.js`/`zh.js`: `study.openPdf`, `study.openShort`,
  `study.fileUnavailableInDemo(Note)`, `study.fileType.{pdf,docx,pptx,doc}` — full EN/BM/ZH.
- `style-study.css`: `.study-badge-file`, `.study-row-open`.

### Not changed

`data/study-subjects.js`, `scripts/build-study-manifest.mjs` (the original parsing/hashing script
— untouched, only a new second-pass script was added), Browse Hierarchy, category tabs/year
grouping/pairing logic (STUDY-V2-004, untouched beyond the file-open section), Community,
pointer-glow, Echo Map, Building, Admin, Auth.

### Verified

39/39 direct-call checks (Node `vm` + real filesystem/hash checks against the real 377 files)
covering: all demo files exist + hash-match `fileId`; 10 real Question↔Scheme pairs (5+ required)
resolve to distinct, correct files with no cross-wiring; a genuinely random 20-resource spot check
across the full 2284-item publishable pool found 0 broken URLs; no local absolute path or internal
field (sourceRelativePath/sourceBatch/fileId) ever rendered. Real Safari browser verification:
opened a real Question PDF and its paired Answer Scheme PDF directly (distinct, correct exam/
solution content confirmed visually), a real DOCX Resource Detail page, and a non-demo resource's
honest disabled state — Desktop, Mobile, and Dark theme all confirmed; Light Mode not
independently browser-verified (same tooling limitation as every prior stage). See
`study v2/reports/REPORT_STUDY-V2-006.md` for the full field-by-field breakdown.

## 2026-08-21 — STUDY-V2-004: Resource List + Year Grouping

Subject page (`#/study/:jurusan/sem/:semester/:subjectCode`) now renders real resources from the
real generated manifest instead of a "coming soon" shell. Resource Detail page
(`#/study/resource/:resourceId`) now shows real metadata with an honest, non-fake disabled
"Open file" state (file serving is STUDY-V2-006, not this stage).

### Added

- `services/study-resource-service.js`: `getResourcesForSubjectInContext(jurusanId, semester,
  subjectCode)` — verifies jurusan+semester+subjectCode together against each resource's own
  fields (not subjectCode alone), always publishable-only unless explicitly overridden.
  `getResourceCategory(resource)`, `RESOURCE_CATEGORY_ORDER`, `isYearGroupedCategory()` — map the
  existing resourceType/resourceSubtype taxonomy to the Subject page's UI category tabs (Lecturer
  Notes, Student Notes, Pre/Pra PSPM, PSPM, Answer Scheme, Practice, Other) without changing the
  underlying data taxonomy. `isResourcePublishable(resource)` — exposes the existing
  publishability gate for the Resource Detail page's direct-link check.
- `app-study.js`: real Subject page — category tabs (only for categories the subject actually
  has), PSPM/Pre-Pra-PSPM sections grouped by exam year (newest→oldest, from existing
  yearStart/yearEnd/examSessionLabel — never re-derived from titles), Question rows show an
  explicit "paired Answer Scheme" link via relatedResourceId/resourceGroupId (schemes already
  shown as a pair are excluded from the flat "Other Resources" bucket — no duplicate rendering;
  orphan schemes still render normally). Real publishable resource count in the Subject header.
  Genuine empty state when a subject has 0 publishable resources. Initial render capped with a
  "Load more" button (no thousands-of-rows dump). Renamed `renderStudyResourceShell` →
  `renderStudyResourceDetail`: real subject/semester/type/year/source/verification metadata,
  optional description, related Question/Scheme link, disabled "Open file" button + explanatory
  note — never renders sourceRelativePath/sourceBatch/fileId or any local filesystem path.
  manual_review/rejected/duplicate resources are excluded here too, even via direct link.
- `style-study.css`: new `.study-tabs`/`.study-tab`, `.study-year-group`, `.study-resource-row`,
  `.study-pair-link`, `.study-badge`, `.study-detail-grid`, `.study-file-open` rules (own class
  names, independent of style-wall.css's filter-pill system).
- `i18n/locales/en.js`/`ms.js`/`zh.js`: new keys for all new UI text (category labels, source/
  verification labels, empty states, detail fields, load-more, file-not-connected note) — full
  EN/BM/ZH, no hardcoded English.
- `app-router.js`: one-line dispatch update for the renamed `renderStudyResourceDetail`.

### Fixed

Pagination initially budgeted by "number of year-groups shown" rather than "number of rows
shown" — on real data (SM015, which has many PSPM sets across the same year) this rendered 113 of
138 rows on first paint. Fixed to budget by cumulative row count; SM015 now renders 50 rows
initially.

### Not changed

`data/study-subjects.js`, `data/study-resource-manifest.js`, the Browse Hierarchy
(`renderStudyHome`/`renderStudyJurusan`/`renderStudySemester`), `scripts/build-study-manifest.mjs`,
Community V2, pointer-glow, Echo Map, Building, Admin, Auth.

### Verified

36/36 direct-call checks (Node `vm`) against the real, unmodified manifest/service/router/study
source, covering SM015 (Sains, 138 resources), AA015/AP015 (Perakaunan, real Question/Scheme
pairs), a real Engineering subject, and a zero-resource synthetic case; `node --check` clean on
all 6 touched files; CSS brace-balance clean. Real Safari browser verification (Desktop ~1460×960,
Mobile ~420×900, Dark theme, Chinese language — all as found already active in the user's own
persisted session) confirmed the Subject page (real SM015 tabs/counts/year-groups/pairing link)
and a real Resource Detail page (real metadata, honest disabled file button). Light Mode and EN/BM
toggles were **not** independently browser-verified this stage (no Accessibility permission for
UI click automation, no JS-injection permission in Safari) — confirmed instead via direct
inspection of the locale files and the direct-call suite. See
`study v2/reports/REPORT_STUDY-V2-004.md` for the full field-by-field breakdown.

## 2026-08-21 — STUDY-V2-003: Browse Hierarchy (Jurusan → Semester → Subject Code)

Fixed a real IA bug found by re-reading the actual source before starting: `#/study/:jurusan` was
rendering **both** semesters' full subject lists on one page instead of a Semester picker. Split
into a real 3-level hierarchy, each a distinct route/render function.

### Changed

- `app-router.js`: `#/study/:jurusan` and `#/study/:jurusan/sem/:semester` now map to two distinct
  pages (`study-jurusan` vs `study-semester`) instead of one page differentiated by an optional
  `semester` param.
- `app-study.js`: `renderStudyJurusan()` now renders a Semester picker only (2 cards, real subject
  + resource counts, no subjects listed). New `renderStudySemester()` renders the real Subject
  Code list for that jurusan+semester (validates semester is exactly 1 or 2). Back-navigation
  chain fixed: Subject → Semester → Jurusan → Study Notes (previously skipped Semester). Added a
  breadcrumb eyebrow line and real, service-computed resource-type badges (never fabricated —
  omitted when a subject has zero publishable resources).
- `services/study-resource-service.js`: added `getResourceCountForJurusanSemester()` and
  `getResourceTypesForSubject()` (additive).
- `style-study.css`: new Semester-picker grid/card rules + type-badge styling.
- `i18n/locales/en.js`/`ms.js`/`zh.js`: new keys for the Semester picker and resourceType labels.

### Not changed

`data/study-subjects.js`, `data/study-resource-manifest.js` (data unchanged — pure UI/routing
work on top of the existing registry/manifest), Community V2, Echo Map, Building Stories, Admin,
Auth.

### Verified

31 end-to-end direct-call checks (Node `vm`, no browser available) against the real, unmodified
source: all 4 jurusan browse correctly through Semester 1/2 to their real subject codes
(cross-checked against `data/study-subjects.js`); `sains_komputer` (0 real subjects) renders a
genuine empty state, not fabricated subjects; invalid routes (`#/study/not-real`,
`#/study/sains/sem/3`, an invalid subject code) all render real not-found shells, never a crash;
back-navigation chain confirmed structurally correct at every level; no college text anywhere.
Full regression of Community/pointer-glow/Homepage-order suites: all pass. See
`study v2/reports/REPORT_STUDY-V2-003.md` for the full breakdown, including what was **not**
independently browser-verified (Desktop/Mobile/Light/Dark visuals, actual rendered EN/BM/ZH text).

## 2026-08-21 — STUDY-V2-FOUNDATION-001: Study Notes V2 foundation (Homepage entry + inventory/taxonomy + manifest + routes)

New module, built per `study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf`. Scope: Homepage
entry point, STUDY-V2-001 (Inventory + Taxonomy + Subject Registry), STUDY-V2-002 (Metadata
Manifest Foundation), and a canonical-route Browse shell. Explicitly not Upload, Admin Moderation,
or a full PDF Viewer (later stages).

### Added

- `data/study-subjects.js` — Jurusan (sains/perakaunan/sains_komputer/kejuruteraan) + 32 real
  Subject codes, all cross-verified against actual scanned files, zero invented codes.
- `scripts/build-study-manifest.mjs` — real Node ESM manifest builder: ignores `__MACOSX`/`._*`/
  `.DS_Store`, parses jurusan/semester/subjectCode/resourceType/resourceSubtype/topic/year/
  sourceCollege from path+filename, hashes every file (SHA-256), links Question↔Answer Scheme
  pairs via a resourceGroupId, flags anything uncertain as `reviewStatus:"manual_review"` with a
  specific reason — never silently guesses. Run for real against the three real course-material
  folders named in the spec's own reference section (2467 real files, ~5.3GB) to generate
  `data/study-resource-manifest.js` (2468 items, metadata only — no file content copied into the
  repo).
- `services/study-resource-service.js` — read-only query layer, every function scoped by
  jurusan/semester/subjectCode; deliberately has no college-grouped query function.
- `app-study.js` — Browse UI: functional `#/study` (jurusan picker with real resource counts) and
  `#/study/:jurusan[/sem/:semester]` (subject picker); `#/study/:jurusan/sem/:semester/:subjectCode`,
  `#/study/resource/:resourceId`, `#/study/upload` are real, non-404 "coming in a later stage"
  shells.
- `style-study.css` — Homepage promo (color-only override of `.map-promo`'s structural CSS, not
  Community's pointer-glow card) + Browse page description styling.
- `app-router.js`: Homepage `Study Notes` section inserted between the existing Community CTA and
  Building Stories sections; Study route parsing/dispatch/titles added (route dispatch only — no
  Study UI logic added to this file).
- `index.html`: script/link tags added in the correct load order.
- `i18n/locales/en.js`/`ms.js`/`zh.js`: new `study.*` keys (no existing key changed).

### Invariant (see data/study-subjects.js and services/study-resource-service.js for the full statement)

**Study Notes is organized Jurusan → Semester → Subject Code → Resource, forever. College is only
ever a `sourceCollege` metadata field on an individual resource — never a grouping/query
dimension, never a route segment, never a UI section.** Confirmed correct in the current
implementation: zero college-keyed anything anywhere in the new module. Any future change that
adds a college-grouped Study Notes view is reintroducing the exact mistake the product decision
in the spec (and `ECHOWALL_V2_MASTER_TASK_SPEC.docx`) explicitly ruled out.

### Verified

Real inventory numbers (not estimates): 2468 files scanned, 3 junk files ignored (independently
re-counted via `find`, exact match), 2318 auto-parsed (93.9%), 150 flagged for manual review with
specific reasons, 1 un-extracted zip flagged (not silently dropped), 238 Question↔Scheme pairs
linked, 36 exact duplicates detected via SHA-256. A real bug was caught and fixed during
verification — the Question/Scheme grouping key initially included `resourceType`, which always
differs between a Question and its Scheme by definition, so 0 pairs linked on the first run; fixed
to key on subjectCode+year+parent-folder instead. 20 end-to-end route/render checks (Node `vm`
against the real, unmodified source) all pass — see
`study v2/reports/REPORT_STUDY-V2-FOUNDATION-001.md` for the full breakdown, including what was
**not** independently browser-verified (Desktop/Mobile/Light/Dark visuals — no browser available
in this environment, consistent with every prior stage this session).

## 2026-08-21 — COMMUNITY-V2-POLISH-005: "All KM Students" card joins the shared pointer-follow gold glow

Extended `COMMUNITY-V2-POLISH-004`'s pointer-follow glow onto the `globalCard` ("All KM Students")
on `#/community` — the last `.org-card` on that page still using the old plain `-8px` hover +
static corner blob. **Zero new JS**: `app-router.js` was not touched at all this stage (verified
byte-identical to the end of `COMMUNITY-V2-POLISH-004`).

### Changed

- `app-community.js`: `globalCard` gained `data-pointer-glow-card` + a new `org-card-global` sizing
  class + the same three layers (`org-card-ambient`/`org-card-rings`/`org-card-pointer-glow`) as
  the 12 college cards, replacing its old static `.org-card-glow` corner blob (kept alongside the
  new layers would have reproduced the "two competing light sources" bug already fixed once for
  the Homepage card in `HOMEPAGE-POLISH-002B`).
- `style-core.css`: one new rule block, `.org-card[data-pointer-glow-card].org-card-global`,
  giving only the glow *radius* a larger value (440px ambient / 400px pointer-glow — this card is
  much wider, being the sole item in its own `.org-grid` row). Every other behavior (hover lift,
  opacity choreography, focus ring, tap feedback) is inherited from the existing
  `[data-pointer-glow-card]` rules `COMMUNITY-V2-POLISH-004` already wrote.

### Not changed

`app-router.js` (the shared engine already generalizes via `querySelectorAll` — no code change
needed to pick up the newly-tagged card), the 12 College Cards, the Homepage card, 🌐 icon/"All KM
Students" text/"Enter →" link/`#/community/all` route/card size, College Landing, Community IA.

### Verified

Direct-function-call and simulated-3-card tests (Node `vm`, no browser available): `app-router.js`
confirmed byte-identical to before this stage (proves no second implementation was added); 13/13
`.org-card`s now carry `data-pointer-glow-card` (up from 12); globalCard's full-range tracking
(left/center/right edges settle near 20%/50%/89%) works on the wider card too; hovering "All KM
Students" never touches two simulated college cards' state and vice versa, in both directions;
Homepage card and College Cards regression-clean. **Real-browser interaction verification is still
outstanding** (carried over from `COMMUNITY-V2-POLISH-004`, now covering three surfaces) — see
`community v2/reports/REPORT_COMMUNITY-V2-POLISH-005.md`.

## 2026-08-21 — COMMUNITY-V2-POLISH-004: College Community Cards reuse the Homepage Community Card's pointer-follow gold glow

Extended the Homepage Community CTA's pointer-follow glow (see the `HOMEPAGE-POLISH-002`/`002A`/
`002B` entry below) onto the 12 College Community cards on `#/community`, via a **shared engine**,
not a second implementation.

### Changed

- `app-router.js`: extracted the pointer-follow logic out of `initializeHomeCommunityCard()` into
  reusable `initializePointerGlowCard(card)` (per-card closure state, no shared globals) +
  `initializePointerGlowCards(selector)` (gate + `querySelectorAll` + one engine instance per
  match). Added `initializeCommunityCollegeCardGlow()` and a new `community-hub` branch in
  `initializeRenderedPage()`.
- `app-community.js`: `collegeCards` (all 12 colleges) gained `data-pointer-glow-card` + three new
  layers (`org-card-ambient`/`org-card-rings`/`org-card-pointer-glow`), replacing their old static
  corner-blob decoration. `globalCard` ("All KM Students") is untouched — no new attribute, no new
  layers, original `-8px` hover lift and static glow unchanged, per explicit instruction.
- `style-core.css`: new rules scoped to `.org-card[data-pointer-glow-card]` only — smaller radii
  than the Homepage card, `-2px` capped hover lift (not the base `.org-card`'s `-8px`), no large
  blurred box-shadow (glow comes entirely from the pointer-glow radial layer, matching
  `HOMEPAGE-POLISH-002B`'s "one main light" rule). Colors use `color-mix(in srgb, var(--primary)/
  var(--primary-light) N%, transparent)` so the effect auto-adapts between Light (white card,
  muted terracotta) and Dark (near-black card, bright gold) themes with no separate override
  block. "Enter community →" text is **kept** inside each card (unlike the Homepage card, which
  removed its separate button) — still just text inside the one clickable `<button>`.

### Not changed

Homepage Community CTA (still works via the same, now-shared, engine), `All KM Students` card,
College Landing, `.org-grid` 4-column desktop layout, canonical routes, Community IA.

### Verified

Direct-function-call and simulated-multi-card tests (Node `vm`, no browser available) confirm:
exactly one pointer-follow implementation exists (the shared engine); 12/12 college cards carry
the new layers, the global card does not; hovering one simulated card never touches a sibling
card's state (independent closures, not shared globals); the Homepage card's own full-range
pointer-follow behavior is unregressed by the refactor; College Landing and Homepage section order
unaffected. **Real-browser interaction verification (mouse left/center/right/leave on the Homepage
card and spot-checked college cards) is still outstanding** — see
`community v2/reports/REPORT_COMMUNITY-V2-POLISH-004.md` for the exact pending items.

## 2026-08-21 — HOMEPAGE-POLISH-002 / 002A / 002B: Homepage Community CTA becomes an interactive pointer-follow gold glow card

Upgraded the Homepage's single-CTA Community entry point (from `HOMEPAGE-POLISH-002`, no formal
checkpoint requested for this sub-thread) from a plain `.map-promo` banner + separate "Enter
Community" button into one large, fully-clickable interactive card with a real, continuous,
cursor-following gold glow — built and corrected across three rounds based on direct product
feedback against two reference images (`community v2/ChatGPT Image ....png`).

### 002 (initial build)

- Replaced the `.map-promo`-styled CTA with `.home-community-card`: the whole card is a
  `<button type="button" data-home-community-card>` (native keyboard/focus semantics, no custom
  keydown handling needed) routing to `#/community` via the project's existing `navigate()`
  convention — the separate "Enter Community →" `.btn` was deleted entirely.
- Added three decorative layers (rings/glow/content) using only `radial-gradient()`/
  `repeating-radial-gradient()` — no image assets, no image swapping between reference states.
- A `requestAnimationFrame` damped-follow loop (no GSAP — none is present in this project and
  adding it would be a new dependency this static-site codebase's `CLAUDE.md` explicitly guards
  against) drove a small pointer-offset near a fixed top-right anchor.

### 002A (correction: glow must track the cursor across the whole card, not wobble near a corner)

- Split the single glow into `ambient` (static, CSS-only) + `pointer-glow` (dynamic, JS-driven).
- Rewrote the follow math to use full-range percentages (`--pointer-x`/`--pointer-y`, 0-100%) of
  the card's own box, so "mouse at 20% x" genuinely puts the glow near 20%, not clamped to a small
  range around a fixed anchor.

### 002B (correction: no "two main lights" — ambient must never compete with pointer-glow)

- Capped `ambient`'s hover opacity from a full `1` down to `.3` (barely above its `.2` default) and
  reduced `rings`' hover opacity from `.85` to `.58`, so pointer-glow is the only layer that ever
  reaches full opacity — the single perceived "main light," wherever the cursor is.

### Verified (Node `vm`, no browser available in this environment for any of these three rounds)

Full-range tracking math (mouse at 5%/80%/90% settles at ~5%/80%/90%, not a small offset), genuine
per-frame easing (not an instant jump — confirmed by reading the custom property's value both
immediately after a `pointermove` and after exactly one `requestAnimationFrame` tick), smooth
`pointerleave` settling to center, touch-pointer and `prefers-reduced-motion`/`pointer:coarse`
gating (JS never touches the custom property for those visitors — the CSS `var()` fallback alone
renders the correct static default), and markup checks (single button, no separate Enter button,
`aria-label`, canonical route, no `<img>`/`background-image:url()` anywhere). Real-browser visual
confirmation (screenshots of default/hover/pointermove/pointerleave/focus states) was attempted
mid-session via `screencapture`/`osascript` — GUI screenshot capture works in this environment,
but keyboard/click simulation and in-page JS execution are both blocked by macOS permissions this
session cannot grant itself; the user agreed to manually interact while this session screenshots,
but that interaction pass had not completed before `COMMUNITY-V2-POLISH-004`'s instructions
arrived (see that entry above).

## 2026-08-21 — HOMEPAGE-POLISH-001: "How Echo Wall Works" moved to the bottom of the Homepage

**Pure section reorder, no content/design change.** The `how-section` block (`A simple knowledge
loop` / `How Echo Wall Works` / the `01`/`02`/`03` step cards) is onboarding/explanation content,
not a primary entry point — it now renders last among Homepage content sections, immediately
before the footer, instead of directly under the Community CTA.

### Changed

- `app-router.js` `renderHome()`: moved the `how-section` `<section>` block (unmodified) from
  between the Community CTA and the Building promo to between the Echo Map promo and the
  `<footer>`. New order: Hero → Stats → Community CTA → Building promo → Echo Map promo →
  How Echo Wall Works → Footer.

### Not changed

`how-section`'s markup/copy/i18n keys, the 3-column card layout, icons, typography, colors,
borders, Dark/Light theming, responsive breakpoints, `data-reveal` scroll animation; the Community
CTA and the Community IA established by `COMMUNITY-V2-POLISH-002`/`-003` (Homepage still shows
zero colleges — only the CTA; `#/community` still owns `All KM Students` + the 12-college card
grid); any other module.

### Verified

Direct-function-call test (Node `vm`, no browser available) against the real `renderHome()`
confirmed the new string-index order of all 7 Homepage sections (Hero → Stats → Community CTA →
Building promo → Echo Map promo → How Echo Wall Works → Footer), confirmed the moved block's
content/step order is unchanged, and confirmed no college grid was reintroduced on the Homepage.
`style-core.css` has no sibling-combinator (`+`/`~`) rule referencing `.how-section`,
`.building-home-section`, or `.map-promo`, so no CSS is order-dependent. See
`reports/REPORT_HOMEPAGE-POLISH-001.md` for the full check list, including what was **not**
independently browser-verified (Desktop/Mobile/Light/Dark/EN/BM/ZH visuals, spacing, animation
timing).

## 2026-08-21 — COMMUNITY-V2-POLISH-003: Community Hub's College Communities restored to a 4-column Card Grid

**Layout-only correction, not an IA change.** `COMMUNITY-V2-POLISH-002`'s IA decision — Homepage
shows zero colleges, only a single "Enter Community" CTA → `#/community` — **remains fully in
effect and was not touched.** This stage only changes how `#/community`'s `College Communities`
section looks: the compact `.selection-list` introduced in POLISH-001 (to avoid duplicating the
Homepage's then-existing grid) is now restored to the original `.org-card`/`.org-grid` card grid,
since the Homepage no longer has any grid to duplicate against.

### Changed

- `app-community.js` `renderCommunityHub()`: `College Communities` section's compact
  `.selection-item`/`.selection-list` replaced with the original `.org-card`/`.org-grid` card
  grid, restored verbatim from the pre-POLISH-001 backup
  (`community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre`) — same
  `organizations` data, same `getCommunityNoteCount()` helper, same canonical
  `#/community/:orgId` routes, same `community.hub.collegeKicker`/`community.desc` i18n keys. No
  new CSS: `.org-grid`'s existing `repeat(auto-fit,minmax(245px,1fr))` rule already yields 4
  columns at this page's 1160px container width; the existing `@media (max-width:720px)`
  override already collapses to 1 column on mobile.

### Not changed

Homepage (`renderHome()`'s single CTA), `All KM Students` global card, `renderCollegeLanding()`'s
Jurusan compact list, `organizations` data, all routes, Sticky Wall, Global/College General/
Jurusan walls, Question/Comments/Solved/Unanswered/Permissions, Echo Map, Building Wall, Admin,
Auth, all CSS files.

### Verified

Direct-function-call tests (Node `vm`, no browser available) against the real render functions:
Hub now renders exactly 2 `.org-grid` sections (Global + Colleges) and 13 total `.org-card`
elements (1 Global + 12 colleges) with the full original card structure
(glow/header/emoji/kicker/title/desc/link), every college card routing to canonical
`#/community/:orgId`; Homepage still renders zero college cards (rerun of POLISH-002's test,
unchanged); College Landing (`#/community/1`) unaffected. `.org-grid`'s 4-column behavior at
desktop width was confirmed by CSS-rule math, not a browser screenshot — see
`community v2/reports/REPORT_COMMUNITY-V2-POLISH-003.md` for the full check list and what was
**not** independently browser-verified (Desktop/Tablet/Mobile/Light/Dark visuals).

## 2026-08-21 — COMMUNITY-V2-POLISH-002: Homepage hides the full Kolej grid; Community Hub owns College Discovery

**Supersedes `COMMUNITY-V2-POLISH-001`.** POLISH-001's judgment that "the Homepage must keep the
full Kolej card grid" has been overridden by the latest, highest-priority product instruction.
**Any future session must not restore the Homepage's college grid based on POLISH-001 alone —
this entry is the current, correct IA decision.**

New IA: `Home → [Enter Community] → #/community (All KM Students + all colleges) → #/community/:orgId (General/Jurusan)`.

### Changed

- `app-router.js` `renderHome()`: removed the 12-card `.org-card`/`.org-grid` Kolej grid entirely.
  Replaced with a single "Enter Community" CTA reusing the existing `.map-promo` component
  (already used elsewhere on the same Homepage — no new CSS). Routes to `#/community` (the Hub),
  never a specific college. Reuses existing `community.hub.eyebrow`/`community.hub.title`/
  `community.hub.globalDesc`/`community.enter` i18n keys — no new i18n keys.
- `app-community.js` `renderCommunityHub()`: no functional change (POLISH-001's compact college
  list already satisfies "all colleges visible after entering Community"); only a stale comment
  corrected.

### Not changed

`organizations` data source, `getCommunityNoteCount()`, all routes, College Landing, Sticky Wall,
Global/College General/Jurusan walls, Question/Comments/Solved/Unanswered/Permissions, Echo Map,
Building Wall, Admin, Auth.

### Verified

Direct-function-call tests (Node `vm`, no browser available) against the real render functions:
Homepage now renders zero college cards/routes and one CTA routing to `#/community`; Community
Hub still shows `All KM Students` + all 12 colleges with canonical `#/community/:orgId` routes;
College Landing (`#/community/1`) unaffected (General + Jurusan). See
`community v2/reports/REPORT_COMMUNITY-V2-POLISH-002.md` for the full check list, including what
was **not** independently browser-verified (Desktop/Mobile/Light/Dark visuals).

## 2026-08-21 — COMMUNITY-V2-POLISH-001: Homepage Communities / Kolej Grid placement fix

Latest product instruction supersedes the older "remove Communities from Homepage" instruction:
the `CHOOSE A SPACE` / `Communities` full Kolej-card grid stays on the main Homepage. Only fix
applied: the Community V2 Hub (`#/community`) had grown a near-duplicate full-size copy of the
same grid; that duplicate is now a compact college list instead.

### Changed

- `app-community.js` `renderCommunityHub()`: the Hub's college section now renders a compact
  `.selection-list`/`.selection-item` list (reusing the same component `renderCollegeLanding()`'s
  Jurusan list already uses) instead of a second full `.org-card` grid. Same `organizations` data
  source, same `getCommunityNoteCount()` helper, same canonical `#/community/:orgId` routes — no
  new data source, no new i18n keys (reused `map.visibleNotes`).
- `All KM Students` (`#/community/all`) global card in the Hub: unchanged.
- Homepage `renderHome()` `#communities` section: unchanged (it already was the canonical
  screenshot UI — full `.org-card` grid, `#/community/:orgId` routes; this task confirmed it,
  did not need to recreate it).

### Verified

Direct-function-call tests against the real, unmodified render functions (Node `vm`, no browser
available in this environment) confirmed: Homepage grid unchanged (12/12 colleges, canonical
routes, "Enter community" links intact); Hub no longer renders a duplicate large grid (exactly
one `.org-card` — the Global card — and one compact `.selection-list` with 12 rows, all routing
to canonical `#/community/:orgId`); College Landing (`#/community/1`) unaffected (General +
Jurusan channels still render). See `community v2/reports/REPORT_COMMUNITY-V2-POLISH-001.md` for
full detail, including what was **not** independently browser-verified (Desktop/Mobile/Light/Dark
visuals — no browser tool available this session).

## 2026-08-21 — COM-V2-008: Migration + Full Regression QA — Community V2 Phase 2 complete

### No code changes

Pure QA/verification stage, per its own scope. No bug required a fix.

### Verified (closing out every "not verified" item flagged across COM-V2-002–007)

- **Mobile (390×844)**: Community Hub, College Landing, Jurusan Wall (with live comment count + badges), Detail Modal + Comments, Compose Post Type selector — zero horizontal overflow anywhere, confirmed programmatically, not just visually.
- **BM (Bahasa Melayu)**: full pass across College Landing, Wall toolbar, Compose Post Type, Comments UI — zero raw/untranslated keys.
- **System theme**: confirmed correct resolution against OS preference.
- **Post (note) content XSS**: `<script>`/`<img onerror>`/`javascript:` payload rendered as literal text, no execution — closes the gap left after Comment XSS was tested in COM-V2-005.
- **Combined filters** (Category + Search together) and **cross-community filter-state behavior** (transparent, not silently hidden) confirmed reasonable.
- **Legacy migration re-verified**: `#/org/1` redirect, Home→canonical-route linking, KMK→Sains stable at 81 notes across the entire 8-stage run.
- **Full E2E flow checklist (spec Flows A–G)** compiled: Global Discussion ✅, Global Question+Solve ✅, College General ✅, Legacy Jurusan ✅, Anonymous ✅, Translation ✅ — all verified across this run. Photo flow: not click-tested this run (code untouched by any Community V2 stage).
- Echo Map, Building Wall/Detail, Admin, Auth: all regression-clean throughout.

**Community V2 Phase 2 (COM-V2-001 through COM-V2-008) is complete.** Full compiled summary: `community v2/reports/COMMUNITY_V2_FINAL_REPORT.md`.

## 2026-08-21 — COM-V2-007: Permission Hooks

### Added

- `services/permission-service.js`: unified permission hooks — `canUserPost`, `canUserComment`, `canUserMarkSolved`, `canUserModerateCommunity`, `getUserModerationScope`. Front-end gating only, explicitly documented as not a security boundary.
- `getUserModerationScope()` maps the prototype's existing single admin tier to `{scope:"global"}` (accurate — those accounts already have unrestricted access today), with a forward-compatible `{scope:"college", orgId}` branch for a future per-college admin role (`user.moderatesOrgId` — no real account has this field yet).

### Changed

- `openDrawer()`, `handleFormSubmit()`, `submitComment()` refactored to call the unified hooks instead of 3 separate ad hoc `if (!currentUser)` checks.
- `canUserMarkSolved()` moved from `app-wall.js` into the new service and gained a real college-moderator branch it didn't have in COM-V2-006.

### Verified

- **Visitor cannot post — tested via the real UI**: signed out, confirmed browsing still works, confirmed clicking "Leave a Note" opened the real sign-in modal, signed back in and confirmed the identical session was restored.
- **13-case permission matrix** (visitor/student/author/stranger/college-moderator/global-admin × post/comment/mark-solved/moderate-community) tested via direct function calls with constructed user objects and real `CommunityService` descriptors — **13/13 correct**. No real College Admin account exists in this prototype, so that branch is logic-verified only (reported honestly, not faked).
- Building Wall, Admin, Echo Map regression-clean, zero console errors.
- `node --check` passed for both touched files.

Full detail: `community v2/reports/REPORT_COM-V2-007.md`.

## 2026-08-21 — COM-V2-006: Solved / Unanswered

### Added

- Question state machine complete: Detail Modal gained a "Mark Solved"/"Reopen" button (Question posts only), gated by new `canUserMarkSolved(user, note)` — post author, or the prototype's `role:"admin"` flag as a stand-in moderator (front-end gating only, explicitly not a security boundary — flagged for COM-V2-007 to build real per-college scoping).
- Wall Toolbar: new "❓ Unanswered" sort (community walls only) — filters to open, uncommented Questions and sorts newest-first; excludes Discussion and Solved/answered Questions.
- 4 new i18n keys × 3 locales.

### Verified

- Full E2E flow executed exactly as specified, all via real UI: created a Global Question (OPEN) → confirmed in Unanswered → added a comment → confirmed dropped from Unanswered → Mark Solved → badge instantly "❓ QUESTION · SOLVED" → reload → status persisted.
- Permission matrix (stranger/author/admin/discussion-post) tested via direct function calls with synthetic user objects — all 4 cases correct.
- KMK→Sains (81), Building Wall, Admin all regression-clean, zero console errors. Dark+ZH toolbar fully translated.
- `node --check` passed for all touched files.

Full detail: `community v2/reports/REPORT_COM-V2-006.md`.

## 2026-08-21 — COM-V2-005: Comments + One-Level Reply

### Added

- `services/comment-service.js`: LocalStorage-backed Comment store (`echo-wall-comments:v1`), `createComment`/`getCommentsForPost`/`getCommentThreadForPost`/`getCommentCount`. Depth strictly enforced at write time — replying to a reply throws, no infinite nesting possible.
- Detail Modal: full Comments section for community posts (thread with one-level nested replies, composer, per-comment "Reply" toggle). Building notes and read-only Demo Seed notes get no Comments section.
- 8 new `comments.*` i18n keys × 3 locales.
- `style-comments.css` (new file, per the spec's suggested module boundary).

### Changed

- Sticky Card comment count (💬) now reads live from `CommentService.getCommentCount()` instead of the always-0 frozen field.

### Verified

- **XSS**: a comment containing `<script>alert(1)</script>`/`<img onerror=...>` rendered as literal text via the real Compose UI — no dialog fired, page stayed fully responsive.
- **Isolation**: 2 real posts tested — Post A's comment+reply never appeared on Post B, and vice versa.
- **Depth enforcement**: reply-to-a-reply rejected with "Replies can only be one level deep."; validation guards (empty, >500 chars, not-signed-in) all rejected correctly via direct service calls.
- **Anonymity**: unchecked "Show my name" produced `authorNickname:null` in storage and "Anonymous" in the UI — no leak.
- Persistence confirmed across a real reload. Dark+ZH fully translated. Admin/Echo Map regression-clean.
- `node --check` passed for all touched `.js` files.

Full detail: `community v2/reports/REPORT_COM-V2-005.md`.

## 2026-08-21 — COM-V2-004: Discussion / Question Post Type

### Added

- Compose Drawer: "Post Type" selector (Discussion/Question), community-only, Discussion default.
- Sticky Card + Detail Modal: "❓ QUESTION · OPEN" badge for Question posts (none for Discussion). Sticky footer gets a 💬 comment-count placeholder (community posts only, always 0 until COM-V2-005).
- Wall Toolbar: "Type: All / Discussion / Question" filter, community walls only.
- 11 new i18n keys × 3 locales (`form.postType*`, `wall.type*`, `wall.*Badge`).

### Fixed

- `.form-group { display:flex }` (style-core.css) was silently defeating the `[hidden]` attribute — same bug class previously found in `map.html`'s `.building-search`/`.building-list`. Without the fix, the new Post Type selector stayed visibly rendered on the Building Wall compose drawer even though `openDrawer()` correctly set `hidden=true`. Fixed with `.form-group[hidden]{display:none}`.

### Verified

- Real Question post created via the Compose UI on KMK→Sains: confirmed `{postType:"question", questionStatus:"open", schemaVersion:3}`, badge rendered correctly on both card and modal.
- Type filter correctly isolated the 1 test Question post from all 81 legacy Discussion notes.
- Building Wall compose confirmed Post Type selector absent (post-fix), no regressions. Dark+ZH fully translated, no console errors anywhere tested.
- `node --check` passed for all touched `.js` files.

Full detail: `community v2/reports/REPORT_COM-V2-004.md`.

## 2026-08-21 — COM-V2-003: Global + College General Wall

### Added

- `#/community/all` (Global) and `#/community/:orgId/general` (College General) are now real Sticky Walls — `renderCommunityGlobalWall`/`renderCommunityCollegeGeneralWall` in `app-wall.js`, reusing the exact same wall renderer as the Jurusan wall (no duplicate implementation).

### Changed

- `wallState` (app-data.js) gained `communityScope`/`communityKey` fields. `getContextNotes()` (app-wall.js) now filters community notes by `communityKey` (via `CommunityService.getCommunityKeyForNote`) instead of raw `orgId`/`majorId` equality — this is what lets Global/College General/Jurusan share one filter with zero `orgId=0`/`majorId=0` magic-value special-casing.
- `handleFormSubmit()` (app-wall.js) now writes fully V3-compliant community posts at creation time (`schemaVersion:3`, correct `communityKey`/`communityScope`, genuine `null` orgId/majorId for Global/College General) instead of relying on the next reload's normalization backfill — this closes the "new posts transiently schemaVersion:2" debt flagged in COM-V2-001/002, ahead of its originally-planned COM-V2-004 slot, since scope isolation required it now.
- `normalizeStoredNote()` (app-data.js) validation is now scope-aware (previously assumed every community note has a real `majorId`, which would have silently dropped every Global/College General post on next load) and no longer coerces an absent `orgId`/`majorId` into `0`/`NaN`.

### Verified

- Real posts created via the actual Compose UI to Global (named), KMK General (anonymous), and KMK→Sains Jurusan — a 5-wall × 3-post isolation matrix confirmed **15/15 correct**: each post appears only on its own wall.
- KMK→Sains count: 81 → 82 (after 1 test post) → 81 (after removing exactly that post) — legacy wall unaffected. Full test-note cleanup confirmed after reload (no residual test data, no LocalStorage wipe used).
- Building Wall, Admin (25 notes/410 votes unchanged), Echo Map: all regression-checked, zero console errors. Dark+ZH and Light+EN confirmed on the new Global wall.
- `node --check` passed for all 4 touched files.

Full detail: `community v2/reports/REPORT_COM-V2-003.md`.

## 2026-08-21 — COM-V2-002: Community Router + Hub

### Added

- Canonical Community V2 routes in `app-router.js`: `#/community` (Hub), `#/community/all` (Global shell), `#/community/:orgId` (College Landing), `#/community/:orgId/general` (College General shell), `#/community/:orgId/jurusan/:majorId` (canonical Jurusan wall — dispatches to the existing `renderWall()`, zero duplication).
- New `app-community.js`: `renderCommunityHub`, `renderCollegeLanding`, `renderCommunityGlobalShell`, `renderCommunityCollegeGeneralShell`. Reuses existing `.org-page`/`.org-grid`/`.selection-shell` CSS — no new stylesheet needed.
- 14 new i18n keys × 3 locales (`community.hub.*`, `community.landing.*`, `community.shell.*`), real translations in EN/BM/ZH.

### Changed

- `#/org/:orgId` and `#/wall/:orgId/:majorId` (plus the old 4-part `#/wall/:orgId/:batchId/:majorId`) are now legacy aliases that `replaceState`-redirect to the new canonical routes — old links/bookmarks keep working, no redirect loop, no history-stack growth (verified via a real browser Back-button test).
- `renderHome()`'s college cards now link directly to `#/community/${org.id}` instead of the legacy `#/org/${org.id}`.

### Verified

- New routes (Hub, 2 different College Landings, canonical Jurusan wall) all render correctly with zero console errors; KMK→Sains note count unchanged at 81.
- Legacy redirects (`#/org/1`, `#/wall/1/1`, `#/wall/1/1/1`) all land on the correct canonical hash; browser Back button confirmed no loop/no stuck history.
- Invalid routes (`#/community/999`, `#/community/1/jurusan/999`) show friendly not-found panels, no white screen.
- Desktop, Mobile (390×844 iframe), Light, Dark, EN, ZH all confirmed. Building Wall, Admin, Echo Map regression-checked, no errors.
- `node --check` passed for `app-router.js`, `app-community.js`, all 3 locale files.

Full detail: `community v2/reports/REPORT_COM-V2-002.md`.

## 2026-08-21 — COM-V2-001: Community Registry + Post Compatibility Layer

### Added

- `data/community-config.js`: builds `window.COMMUNITY_DESCRIPTORS`, one `CommunityDescriptor` per Community V2 scope — `global:all` (1 entry), `college:{orgId}` (one per `organizations` entry), `jurusan:{orgId}:{majorId}` (one per `majors` entry). Reuses the existing `organizations`/`majors` arrays from `app-data.js` directly; no second copy of college/major data was created. 47 descriptors generated from the current 12 colleges / 34 majors.
- `services/community-service.js`: `window.CommunityService` with `getCommunityKey(scope, orgId, majorId)`, `parseCommunityKey(key)`, `isValidCommunityKey(key)`, `getCommunityByKey(key)`, `getCommunityFromLegacyContext(orgId, majorId)`, `mapLegacyWallKeyToCommunityKey(wallKey)`, `getCommunityKeyForNote(note)`, `getCommunityPosts(communityKey)`. Also documents the `echo-wall-comments:v1` Comment/Reply storage schema as a constant + comment block only — no read/write logic, no UI (that's COM-V2-005).
- Both files are loaded in `index.html` right after `app-data.js` (before `services/map-note-service.js`), since they depend on `organizations`/`majors` being declared. **Not** added to `map.html` — Echo Map does not use the Community Registry this round, per the explicit "Community V2 does not touch Echo Map" boundary.

### Changed

- `app-data.js` `normalizeStoredNote()`: for `contextType === "community"` notes only, now non-destructively backfills `communityKey`, `communityScope`, `postType` (`"discussion"` default), `questionStatus` (`null` unless `postType === "question"`), `moderationStatus` (`"published"` default), `commentCount` (`0` default), `updatedAt` (`null` default), and sets `schemaVersion: 3` (was unconditionally `2`). Already-valid V3 field values on a note are preserved, not overwritten (idempotent). `orgId`/`majorId`/`batchId` and every other legacy field are untouched. Building notes (`contextType === "building"`) are completely unaffected — still `schemaVersion: 2`, never get a `communityKey`.
- Legacy `community:{orgId}:{majorId}` wallKeys are compatible via `CommunityService.mapLegacyWallKeyToCommunityKey()` — existing seed/localStorage data needs no migration.

### Explicitly out of scope this round (confirmed, not done)

- No Router changes (`app-router.js` untouched), no `#/community` routes, no legacy redirects, no Community Hub/College Landing/Global or College General Wall UI, no Post Type compose UI, no Comments UI, no Question/Solved UI, no Admin moderation queue. Community V2 UI is unchanged — confirmed via screenshots in every language/theme tested.
- **Discovery made while reading current code, not assumed from the spec**: the big demo-seed bundle (`data/demo-seed-bundle.v1.js`, 696 notes, activated via `activateDemoSeedSnapshot()`) bypasses `normalizeStoredNote()` entirely — it has its own strict hash/count-validated activation path (`validatePortableDemoSeedBundle`) that must not be touched. `CommunityService.getCommunityKeyForNote()` derives a community key on the fly for these notes (via `orgId`/`majorId`) without mutating them, so `getCommunityPosts()` still returns correct results for demo-seed notes even though they never pass through the normalization backfill.

### Verified

- Browser-tested via `python -m http.server 8000`: `CommunityService.getCommunityKey/parseCommunityKey/isValidCommunityKey` for `global:all`/`college:1`/`jurusan:1:1` (valid) and `global:1`/`college:`/`jurusan:1`/`jurusan:x:y` (all correctly rejected, `null`/`false`, no silent coercion).
- A real KMK → Sains seed note (`orgId:1, majorId:1, content:"Discrete Mathematics..."`) confirmed post-normalize: `schemaVersion:3`, `communityScope:"jurusan"`, `communityKey:"jurusan:1:1"`, `postType:"discussion"`, `questionStatus:null`, `moderationStatus:"published"`, while `orgId/majorId/batchId/shape/color/authorNickname/isAnonymous/upvotes/score/createdAt` all unchanged.
- A real building note (`B_PUSTAKA`) confirmed post-normalize: `schemaVersion:2` (unchanged), no `communityKey`/`communityScope` fields present at all.
- KMK → Sains wall note count: **81 before and after** (direct `getContextNotes()`-equivalent filter matches `CommunityService.getCommunityPosts('jurusan:1:1').length`, both 81) — no notes lost or duplicated.
- Modal vote (Agree) and translate button both functioned normally on a real note; Building Wall (`B_PUSTAKA`, 43 notes), Admin route (25 community notes / 410 votes), and Echo Map (`map.html`, unaffected — new scripts correctly not loaded there) all rendered with zero console errors.
- Desktop: Dark+EN and Light+BM both confirmed visually correct, note counts unchanged. Mobile: real 390×844 same-origin-iframe viewport confirmed no horizontal overflow, identical content/count.
- `node --check` passed for `app-data.js`, `data/community-config.js`, `services/community-service.js`.

## 2026-08-21 — Echo Map switcher: per-college visual calibration (center + zoom) for all 11 non-KMK colleges

### Changed

- Replaced the previous session's uniform "zoom −1 for every non-KMK college" rule with **independent, per-college visual calibration** of both `lat`/`lng` and `zoom` in `data/campus-map-config.js`, per the user's explicit instruction that a blanket zoom rule wasn't the real problem — the real problem was that several colleges' centers didn't actually place the campus at the visual center of the map viewport.
- For each of the 11 non-KMK colleges, opened the Echo Map switcher, located the real campus (by its OSM name label, roads, and — where present — labeled building clusters), and iteratively adjusted `lat`/`lng`/`zoom` until the campus's main body was reasonably centered in the viewport with the campus area sensibly filling the frame. Every value was set from a real, click-derived `Leaflet` `containerPointToLatLng` conversion (clicking directly on the visible campus in a live map and reading Leaflet's own computed lat/lng for that pixel — not manual pixel-to-geo math, which was tried first and found unreliable due to inconsistent screenshot scaling in this session), then re-verified by reloading and inspecting the result.
- KMK was not touched at all this turn: no changes to `echomap.js`'s `CAMPUS_BOUNDS`, `DEFAULT_VIEW`, building polygons, or "Fit campus" behavior for KMK.
- The switcher itself, `data/campus-building-registry.js`, `app-campus-map.js`, and all Building functionality were not touched — this was a pure data-value change in one file.
- A temporary debug hook (`window.__calibrationMap = map`) was added to `echomap.js` only to drive this calibration session (so real Leaflet click coordinates could be read), and was fully removed before finishing — confirmed via `grep -c "__calibrationMap" echomap.js` returning 0.

### Calibration table

| College | Old Center (from prior session's zoom-only pass) | New Center | Old Zoom | New Zoom | Visual Result |
|---|---|---|---|---|---|
| KMKK | 5.880324, 100.510018 | 5.878962, 100.509380 | 16 | 17 | Full "Kolej Matrikulasi Kejuruteraan Kedah" building cluster centered and filling the frame |
| KMPP | 5.492549, 100.436382 | 5.491023, 100.435738 | 16 | 16 | Full "Kolej Matrikulasi Pulau Pinang" complex (labeled blocks B1–C5, Dewan Kuliah, etc.) centered |
| KMPK | 4.444886, 101.132961 | 4.444771, 101.131051 | 16 | 16 | Full "Kolej Matrikulasi Perak" grounds (Kompleks Sukan, Blok Pensyarah, etc.) centered |
| KMP | 6.441802, 100.276523 | 6.442928, 100.279511 | 16 | 17 | Full "Kolej Matrikulasi Perlis" complex (Komsas A1–C3, Perpustakaan, etc.) very well centered |
| KMM | 2.331326, 102.088292 | 2.332470, 102.089595 | 16 | 17 | Full "Kolej Matrikulasi Melaka" complex (A1–C5 blocks, Kompleks Sukan) centered |
| KMNS | 2.717520, 102.242114 | 2.714313, 102.241366 | 16 | 16 | Full "Kolej Matrikulasi Negeri Sembilan" boundary + buildings centered |
| KML | 5.358383, 115.225467 | 5.359739, 115.225253 | 16 | 17 | Full "Kolej Matrikulasi Labuan" + "Padang Bola KML" centered, fills frame nicely |
| KMJ | 2.287391, 102.563605 | 2.285762, 102.563381 | 16 | 16 | Full "Kolej Matrikulasi Johor" complex (Dataran Wawasan, Blok A/B/C, etc.) centered |
| KMPH | 3.720134, 103.073689 | 3.721456, 103.075039 | 16 | 16 | Full "Kolej Matrikulasi Pahang" complex (Blok A/B/C, Padang, Dewan Kuliah) centered |
| KMS | 2.822610, 101.444441 | 2.821894, 101.442476 | 16 | 16 | Full campus boundary polygon centered — **internal buildings not densely mapped in OSM for this college**, calibrated to the clear boundary instead (not a guess: the boundary itself is unambiguous) |
| KMKT | 5.925366, 102.285171 | 5.927561, 102.285826 | 16 | 16 | Full "Kolej Matrikulasi Kelantan" boundary polygon centered — same OSM-detail caveat as KMS |

### Verified

- Every row above was visually confirmed with a real, loaded screenshot during calibration (not simulated) — see this session's browser testing.
- Re-verified afterward through the **real production switcher** (clicking the actual "›"/"‹" buttons and "Fit campus", not the calibration debug hook): confirmed KMKK, KMP, and KMKT (the last college, confirming forward wraparound reaches it correctly) all render at the calibrated positions; clicked "›" once more from KMKT to confirm wraparound back to KMK; clicked the Pustaka building footprint afterward and confirmed the full preview panel (Opening Hours, note count, footprint highlight) still works — KMK Building functionality fully intact after a complete cycle through all 11 other colleges.
- Confirmed via a real 390×844 same-origin-iframe mobile viewport (see HANDOFF for the technique) that KMKK renders correctly and the switcher/Fit-campus controls work identically on mobile.
- `node --check` passed for `data/campus-map-config.js` and `echomap.js`. Confirmed the temporary calibration debug line was fully removed (`grep` returns 0 matches).
- Noted for the record: this session's browser testing repeatedly hit transient tile-loading delays (OSM's public tile server responding slowly, likely due to the cumulative request volume from this and prior sessions' testing today) and, separately, `Leaflet.flyTo()`'s `requestAnimationFrame`-driven animation not reliably progressing under pure scripted waits (a CDP-automation-only quirk — confirmed `map.setView()`, the non-animated equivalent, always worked instantly and reliably; a second real click, or simply waiting longer, always resolved the stale-tile appearance). Neither issue reflects a defect in the shipped code — both were worked around during testing, and are documented in HANDOFF for future sessions.

## 2026-08-20 — Echo Map switcher: non-KMK default zoom reduced by one level

### Changed

- `data/campus-map-config.js`: reduced `zoom` from `17` to `16` for all 11 non-KMK colleges (KMKK, KMPP, KMPK, KMP, KMM, KMNS, KML, KMJ, KMPH, KMS, KMKT). Every entry was `17`; every entry is now `16` — a uniform one-level zoom-out, matching the "current zoom − 1" rule exactly. `lat`/`lng` for all 11 are byte-for-byte unchanged.
- This is the single source of truth for those colleges' default zoom — both the Echo Map switcher's `fitActiveCollegeView()` (switch transitions) and its college-aware "Fit campus" handler in `echomap.js` read `config.zoom` directly from this file with no separate multiplier or offset logic, so no second place needed to change.
- KMK was not touched: `CAMPUS_BOUNDS`/`DEFAULT_VIEW`/zoom 17 in `echomap.js`, building polygons, and "Fit campus" for KMK are all defined independently of this config file and were not edited.

### Preceded by a verification-only turn (no code changes)

- Before this edit, at the user's request, re-confirmed from scratch (fresh direct file reads, not relying on memory from the prior session) that the 11 non-KMK "school maps" genuinely contain nothing beyond a center/zoom point plus an empty building registry — no polygons, no markers, no per-college assets exist anywhere in the repo (confirmed via `assets/buildings/` listing — KMK-only — and a repo-wide grep for every college code). Reported this back before making any change, per instruction. This turn's zoom edit does not change that finding.

### Verified

- `window.getCampusMapConfig(2).zoom`, `(3).zoom`, `(14).zoom` (KMKK/KMPP/KMKT) all read `16` live in the browser after a fresh load.
- Manually exercised in a browser (`python -m http.server 8000`, `map.html`): KMK's default view unchanged (visually and via untouched `CAMPUS_BOUNDS` code path); switched to KMKK — map visibly shows more surrounding area than the prior zoom level (wider road network, the river, and neighboring context visible that weren't in frame before); "Fit campus" while on KMKK reproduced the identical zoomed-out view (same config, no separate logic); switched back to KMK — building list and search fully restored. Random-sampled KMPP and KMKT via `getCampusMapConfig` reads, both `16`. Dark/light and `zh` locale unaffected (no UI/copy was touched). Mobile confirmed via the same-origin-iframe technique (see HANDOFF) — switch still works, no layout change since this was a data-only edit.
- `node --check` passed for `data/campus-map-config.js`. File is untracked in git (part of this whole session's uncommitted "Feature Foundation" work), so `git status --short` was used instead of `git diff` to confirm the change — output shows the file's 11 `zoom: 17` occurrences are now all `zoom: 16`, with zero `17`s remaining.

## 2026-08-20 — Echo Map: multi-college switcher (← KMK →), reusing the existing framework

### Changed

- Added a small "‹ KMK ›" control to the top-left of the Echo Map's floating map controls (`map.html`, stacked above "Fit campus" in the same `.map-floating-controls` group), letting users cycle through every configured college and browse its map region without leaving `map.html`.
- **This reuses the multi-college framework that already existed elsewhere in the site** (`app-campus-map.js` + `data/campus-map-config.js` + `data/campus-building-registry.js`, previously wired only into the SPA's `#/org/:orgId/map` route for non-KMK colleges) rather than building a second map-switching system:
  - College order/identity/short codes: the existing `organizations` array in `app-data.js` (already loaded on `map.html`), unmodified — KMK first, then KMKK, KMPP, KMPK, KMP, KMM, KMNS, KML, KMJ, KMPH, KMS, KMKT, exactly as already defined. No new ordering was invented.
  - Per-college map center/zoom: the existing `data/campus-map-config.js` (`window.CAMPUS_MAP_CONFIGS` / `getCampusMapConfig(orgId)`), now also loaded on `map.html` (previously index.html only) — added via one new `<script>` tag, file itself untouched.
  - Empty/no-data copy for colleges without real building data yet: reused the existing `campusMap.frameworkDesc` i18n string (already used by `app-campus-map.js`'s "Framework Preview" state) rather than inventing new text — every non-KMK college today has zero entries in `data/campus-building-registry.js`, so this is the accurate, honest state for all of them right now.
- Default on first load is unchanged: KMK (orgId 1), full building footprints, full "Focus buildings" list, full building-click/preview functionality — none of that init code was touched.
- Clicking → / ← cycles forward/backward through `organizations` with wraparound (KMK → … → KMKT → KMK and back), updates the switcher's label, the page H1 (via the existing `campusMap.title: "Echo Map {name}"` template for non-KMK, or `map.title` for KMK), re-centers the same Leaflet map instance to that college's `CAMPUS_MAP_CONFIGS` entry, and syncs the sidebar: for KMK, restores building footprints (`buildingLayer` re-added to the map) and the real building list (`renderBuildingList()`); for any other college, removes `buildingLayer` from the map and swaps the sidebar to the reused "awaiting data" notice — so the map view and the building list can never show two different colleges at once. Closes any open building preview panel when switching away.
- "Fit campus" is now college-aware: fits KMK's existing `CAMPUS_BOUNDS` when on KMK, or flies to the active college's `CAMPUS_MAP_CONFIGS` center/zoom otherwise — same button, same existing bounds data, just applied to whichever college is currently active.
- Language switching (`echo:languagechange`) refreshes the switcher's aria-labels and the H1 template live, matching the rest of the page's existing i18n behavior.
- Added `map.previousCollege`/`map.nextCollege` i18n keys (arrow aria-labels) to all three locale files. No other new UI copy was added — the switcher's label text is the college's existing short code from `organizations`, never a hardcoded string.
- **Bug found and fixed during testing, unrelated to the switcher's own logic but required for it to work:** `.building-search` and `.building-list` in `map.html`'s `<style>` block both set an explicit `display` value, which (per normal CSS cascade rules) overrides the browser's default `[hidden]{display:none}` UA rule for those elements — so toggling `.hidden = true` on them silently did nothing. Added `.building-search[hidden]{display:none}` and `.building-list[hidden]{display:none}`, matching the `[hidden]` override pattern already used elsewhere in this same file (e.g. `.map-guide[hidden]`, `.building-empty` has no competing `display` rule so was unaffected).

### Verified

- Manually exercised in a browser (`python -m http.server 8000`, `map.html`): initial load defaults to KMK; → cycles KMK → KMKK → KMPP (map genuinely re-centers to each college's real-world coordinates — confirmed by the OSM tiles themselves showing "Kolej Matrikulasi Kejuruteraan Kedah" / "Kolej Matrikulasi Kelantan" labels at the corresponding stops); ← returns to KMKK → KMK; wraparound confirmed both directions (KMK ‹ → KMKT, KMKT › → KMK); building list/search/footprints fully absent while off-KMK and fully restored (13 buildings, search box) back on KMK; clicked a KMK building (Pustaka) after switching away and back — preview panel, Opening Hours, "More details", note count all worked, confirming existing Building functionality survives a round trip. Dark theme and `zh` locale confirmed (H1 → "Echo 地图 KMKK", notice → "校园结构已就绪，经核实的建筑信息将逐步添加。").
- Mobile confirmed with a real narrow viewport via the same-origin-iframe technique (390×844; see HANDOFF for the method) — switcher sits in the same bottom floating-controls group as the other buttons at ≤620px, full-width and easy to tap, no overlap with zoom controls; tapped → for a real center-recompute and state sync (verified via DOM query, not just visual); switched back to KMK and confirmed the building list (13 entries) and search box both reappeared.
- `node --check` passed for `echomap.js`, `data/campus-map-config.js` (unmodified, checked anyway), and all three locale files. `git diff --check` passed (line-ending warnings only).

## 2026-08-20 — Building name alias now localized on the Building Detail page

### Changed

- The bracketed alias next to a Building Detail page's name (e.g. "Pustaka (…)") now follows the current UI language instead of always showing the Malay text baked into `data/campus-buildings.js`'s `name` field. EN → "Pustaka (Library)", BM → "Pustaka (Perpustakaan)", ZH → "Pustaka (图书馆)".
- Added a new optional, generic `localizedAlias: {zh, ms, en}` field to the building data model (same shape as the existing `description`/`purpose`/`specialNotes` fields), populated for `B_PUSTAKA` only — the one building whose `name` currently contains a `(...)` alias. No other building has this field; buildings without it render their name with no parentheses at all (never an empty `()`).
- Added two small, building-agnostic global helpers to `data/campus-buildings.js`: `window.getBuildingCanonicalName(building)` (strips a trailing `(...)` from `name`) and `window.getLocalizedBuildingDisplayName(building)` (canonical name + the current-language `localizedAlias`, or just the canonical name if there is none). `app-place.js`'s `renderPlaceProfile()` H1 now calls `getLocalizedBuildingDisplayName` instead of rendering `building.name` directly.
- The raw `building.name` field itself was **not** changed (still `"Pustaka (Perpustakaan)"`) — this was a deliberate choice to avoid any risk to the Echo Map building-search filter (`echomap.js` matches search queries against the raw `name` string) or the "Enter this building wall" heading, neither of which this task asked to change.
- Echo Map (`echomap.js`, `map.html`) was not touched: its building list sidebar and its preview-card heading already only ever showed the canonical name (its own `getBuildingNameParts` parser already discarded the raw alias before this change), so there was nothing to fix there for consistency — verified by inspection and by browser testing after the change.

### Verified

- Node one-off script confirmed `getLocalizedBuildingDisplayName` returns `"Pustaka (Library)"` / `"Pustaka (Perpustakaan)"` / `"Pustaka (图书馆)"` for en/ms/zh, and `"Masjid Khulafa Ar Rasyidin"` (no parens) for a building without `localizedAlias`.
- Manually exercised in a browser (`python -m http.server 8000`, `index.html#/place/B_PUSTAKA`): confirmed all three languages render correctly, and confirmed the H1 updates **instantly on language switch with no page reload** (reuses the existing `echo:languagechange` → `render()` wiring in `app-router.js` — no new event listener was added). Confirmed `B_MASJID` (no alias) shows no parentheses. Confirmed the Echo Map building list and preview card are unaffected (still show the raw/canonical name exactly as before).
- `node --check` passed for `data/campus-buildings.js` and `app-place.js`. `git diff --check` passed (line-ending warnings only).

## 2026-08-20 — Building Detail page: mobile photo-first order

### Changed

- On mobile/tablet (≤980px) the Building Detail page now shows the Photo Gallery (or the no-photo outline fallback) **before** the Building Information card, instead of after it. Desktop (≥981px) is completely unchanged — left/right column layout, the fixed-viewport-with-internal-scroll behavior from the previous stage, and the Photo Gallery are all untouched.
- Implemented purely with CSS `order` inside the existing `@media (max-width:980px)` block in `style-core.css`: `.place-profile-media{order:1}`, `.building-overview{order:1}`, `.place-profile-copy{order:2}`. `.place-profile-hero` is already a CSS Grid container, so no DOM changes, no duplicate markup, and no second Mobile/Desktop HTML variant were needed — `app-place.js` was not touched.
- No changes to the gallery's own CSS (`aspect-ratio`, `object-fit`, `max-width`, carousel behavior, border-radius, arrows, `N / total` counter) — reordering only affects *position*, not sizing.

### Verified

- Real narrow-viewport rendering was achieved this session via a same-origin `<iframe>` sized 390×844 (CSS media queries evaluate against the iframe's own viewport, giving a genuine — not simulated — mobile layout test, unlike the window-resize tool used in prior sessions which does not actually change `window.innerWidth` in this environment).
- Confirmed: photo-before-information order (multi-photo building — Astaka; single-photo — Pustaka; no-photo fallback — Seri Laka); natural whole-page scroll (`window.innerHeight` 836 vs content `scrollHeight` 1533, page scrolled by the iframe's own scrollbar, not an internal one) reaching the "Enter this building wall" CTA; carousel next-arrow and the `1/2` → `2/2` counter still work after a real pointer click at mobile width; existing left/right padding around the photo preserved (not edge-to-edge). Checked in Dark+zh, Light+en, and Light+BM (Malay) — all three languages and both themes rendered correctly with no layout breakage.
- Desktop re-verified afterward in the same session (BM + Light): left card with its own internal scrollbar, right photo/fallback fixed in place — unchanged from the previous stage.
- `git diff --check` passed (line-ending warnings only, no new errors).

## 2026-08-20 — Building Detail page: viewport-locked desktop layout, internal card scroll

### Changed

- Reverted the Building Detail page's desktop (≥981px) layout from "whole page scrolls" (the previous stage's fix) to "page is locked to the viewport, only the left Building Information card scrolls internally" — the header, "← Back to buildings", both column positions, and the right-hand Photo Gallery no longer move at all when the left card's content overflows.
- `style-core.css`: added a `@media (min-width:981px)` block restoring `body:has(.place-profile){height:100dvh;overflow-y:hidden}` and `#app:has(.place-profile){overflow:hidden}`, giving `.place-profile` a bounded `height:calc(100dvh - 68px)` with `grid-template-rows:auto minmax(0,1fr)`, `.place-profile-hero{align-items:stretch;overflow:hidden}`, and `.place-profile-media{overflow:hidden}`. Unlike the pre-existing (2026-07-27) version of this pattern, `.place-profile-copy` now gets `overflow-y:auto; overflow-x:hidden; scrollbar-gutter:stable` instead of `overflow:hidden` — so the six sections added in the previous stage (Purpose/Opening Hours/Special Notes/Events/Building Echoes) are reachable by scrolling the card, not clipped/hidden.
- The `@media (max-width:980px)` block and the mobile-first base rules were **not changed** — mobile/tablet still gets natural whole-page scroll with the two columns stacked, exactly as the previous stage left it.
- The right-hand photo gallery's own sizing (`.building-gallery-track{aspect-ratio:4/3}`, `.place-profile-media .building-gallery{max-width:min(100%,calc(133.333dvh - 280px))}`) was **not touched** — confirmed by measuring `getBoundingClientRect()` in the browser: width/height/ratio (4:3) are unchanged and the element's screen position does not move while the left card is scrolled.
- No JS, data, router, or Photo Gallery markup/behavior changed in this stage — CSS only.

### Verified

- Manually exercised in a browser (`python -m http.server 8000`, `index.html#/place/...`): confirmed via `document.body.scrollHeight === document.body.clientHeight` (page has zero scroll overflow) while `.place-profile-copy.scrollHeight > .clientHeight` (card has internal scroll); scrolled the card programmatically and by screenshot to the very bottom — "Enter this building wall" CTA appears, photo gallery pixel position/size (`getBoundingClientRect`) unchanged throughout. Checked Pustaka (weekly hours + photos), Astaka (multi-photo carousel — arrows/`1 of 2` counter still work after scrolling), Seri Laka (no-photo outline fallback, still fills the stretched column height as before). Dark theme confirmed. Confirmed `#/places` (building directory) is unaffected — `:has(.place-profile)` correctly scopes the lock to only the detail page.
- Not verified: real narrow/mobile viewport rendering — the session's browser-resize automation reported success but `window.innerWidth` never actually changed, so mobile could not be visually confirmed. Verified only that the `min-width:981px` and `max-width:980px` breakpoints are mutually exclusive (no gap/overlap) so the untouched mobile rules fully govern at ≤980px.

## 2026-08-20 — Building Detail page: Purpose, Opening Hours, Special Notes, Events, Building Echoes

### Changed

- Wired up the Echo Map building card's "More details →" row (`echomap.js`, previously an inert placeholder) to navigate to the existing Building Detail page: `location.href = 'index.html#/place/' + placeId`. No router changes — reuses the existing `#/place/:placeId` route and its existing "← Back to buildings" behaviour.
- `app-place.js` `renderPlaceProfile()` now renders six additional sections inside the left-hand information card, in this order: Purpose, Opening Hours (with an always-expanded Sunday–Saturday table, today's row bolded), Special Notes, Current Events, Upcoming Events, Building Echoes (visible-note count). The "Enter this building wall" CTA remains the last element, unchanged.
- Purpose and Special Notes text was added to `data/campus-buildings.js` (`purpose`/`specialNotes`, localized zh/ms/en, same shape as the existing `description` field) for the 14 buildings with clear source coverage: Masjid, Serambi, Dewan Kuliah, Blok Tutoran/Makmal, Langkasuka, Dewan Mahawangsa, Pustaka, Kafeteria A/B/C/Pentadbiran, and the three residence blocks (Seri Palas/Temin/Laka). Sourced from `KMK_Building_Facility_Source_Summary_EchoWall.docx`. The Purpose section is omitted entirely (not a placeholder) for buildings without this data; Special Notes always renders, with "No special notes available." as the fallback.
- Current/Upcoming Events read an optional `building.events` array (schema: `{id, buildingId, eventName, date, startTime, endTime, description, photo, status}`) filtered by `status`. No building currently has this field, so both sections always show their empty state ("No current events." / "No upcoming events.") — this is a display-only data hook, no event backend or submission flow was built.
- The Opening Hours logic that previously lived only inside `echomap.js` was extracted to a shared `window.BuildingHours` API in `data/campus-building-hours.js` (`getSnapshot`, `formatStatusLine`, `formatTime`, `weekdayKeys`), so the map card and the detail page compute and display the exact same status from one dataset. `data/campus-building-hours.js` is now also loaded on `index.html` (previously map.html only).
- **Layout fix (required for the above):** `.place-profile` on desktop (≥981px) was a fixed `100dvh`-height, `overflow:hidden` single-screen layout that clamped/hid overflowing left-column content and force-stretched the right-column photo gallery to match. Changed to `min-height` + natural block flow, `.place-profile-hero` from `align-items:stretch` to `align-items:start`, and removed the `overflow:hidden` clipping and the `(min-width:981px) and (max-height:700px)` "shrink everything to fit" media query. The page now scrolls when the left card grows taller than the photo. The photo gallery's own size formula (`max-width:min(100%, calc(133.333dvh - 280px))` on `.building-gallery-track{aspect-ratio:4/3}`) was **not changed** — it depends only on viewport height, not on the left column's height, so it renders at the identical pixel size/ratio as before at any given viewport size. The no-photo bird's-eye-outline fallback (`.building-overview`), which previously relied on `height:100%` from the old stretch layout, was given its own `aspect-ratio:4/3` so it doesn't collapse to zero height under the new `align-items:start`.
- Added `place.purpose`, `place.specialNotes`, `place.noSpecialNotes`, `place.currentEvents`, `place.noCurrentEvents`, `place.upcomingEvents`, `place.noUpcomingEvents`, `place.buildingEchoes` to `i18n/locales/{en,ms,zh}.js`. Building Echoes reuses the existing `map.visibleNotes` string (previously the note count on this page was hardcoded English "notes").

### Verified

- `node --check` passed for `echomap.js`, `app-place.js`, `data/campus-building-hours.js`, `data/campus-buildings.js`, and all three locale files. `git diff --check` passed (line-ending warnings only).
- Manually exercised in a browser (`python -m http.server 8000`): map card → "More details →" → detail page end to end; Masjid (24h, hidden Special Notes since no data), Pustaka (weekly table, today bolded, Special Notes), Kafeteria A/B (gender-restriction Special Notes), Astaka (has hours + photos, no Purpose data so section is absent), Seri Laka (no-photo fallback box at correct size, 24h + "Residents only"); dark theme; `zh` locale end to end. Confirmed "← Back to buildings" and "Enter this building wall" still work.
- Not verified: narrow/mobile viewport rendering — browser window-resize automation did not change `window.innerWidth` in this session. Assessed by CSS inspection only: the existing `@media(max-width:980px)` block already stacks `.place-profile-hero` to one column and was not modified; new sections are plain block children of `.place-profile-copy` with no fixed widths, so they should stack normally, but this was not visually confirmed.

## 2026-08-20 — Echo Map building card: opening hours + More details entry

### Changed

- Added an expandable "Opening Hours" row and a "More details" entry row to the Echo Map building preview card (`echomap.js` `openPlacePreview`), placed directly below the building description and above the existing visible-notes count. No other card layout, sizing or behaviour changed.
- Added `data/campus-building-hours.js`, a structured weekly-schedule dataset for the 19 buildings that can open the map building card (`PREVIEW_PLACE_IDS`). Pustaka's schedule (Sun–Thu 8:00am–4:30pm, closed Fri/Sat) is sourced from `KMK_Building_Facility_Source_Summary_EchoWall.docx`; the rest are derived from the existing `data/campus-buildings.js` `hours` text. Buildings whose source is event-dependent or says "check current hours" (`B_DEWAN_MAHAWANGSA`, `B_KAFETERIA_PENTADBIRAN`) are marked `unavailable` rather than guessed.
- Open/closed status is computed client-side from the browser's current time; the row reads "Open · Closes {time}", "Closed · Opens {time} [{day}]", "Open · Open 24 hours" (+ "· Residents only" for the three residence blocks), or "Hours not available". Clicking the row toggles a weekly Sunday–Saturday breakdown; 24h and unavailable buildings render as a static, non-expandable line.
- The "More details" row is an inert entry point only (`id="place-preview-more"`, no click handler) — its destination screen is intentionally not built in this change.
- Added `map.hours.*`, `map.weekday.*` and `map.moreDetails` i18n keys to `i18n/locales/{en,ms,zh}.js`.

### Verified

- `node --check` passed for `echomap.js`, `data/campus-building-hours.js` and all three locale files.
- Manually exercised in a browser at `http://localhost:8000/map.html`: Pustaka's expand/collapse and weekly rows, a 24h building (Masjid), a residents-only 24h building (Seri Palas), an "unavailable" building (Dewan Mahawangsa), dark theme, and the `zh` locale (including day-first phrasing for "Opens {time} {day}"). Not verified live: narrow mobile viewport (window-resize automation was unavailable in this session) — the new rows reuse the existing `.place-preview-*` full-width/relative-unit pattern, so no new mobile-specific CSS was needed.

## 2026-07-27 — Building photo priority and accepted profile layout

### Changed

- Building directory cards now render from a stable sorted copy: `B_MASJID` first, then buildings whose `photos` array is non-empty, then buildings without photos. Source order is retained inside each group and `CAMPUS_BUILDINGS` is not mutated.
- Photo-backed building profiles place the 4:3, `object-fit: cover` gallery in the large right-hand media area. Multiple photos retain horizontal scroll-snap, arrow controls and the `1/N` counter; single photos omit controls and the counter.
- Buildings without photos continue to show their existing bird's-eye outline in the right-hand area and do not render an empty gallery.
- Photo load failures reveal the matching building outline fallback.
- Desktop building profiles use a single-screen viewport layout with a clamped description and a first-screen building-wall action. Mobile profiles return to a natural vertical document flow.
- Building IDs, photo paths, runtime visible-note counts, wall routes and storage contracts remain unchanged.

### Verified and manually accepted

- User manual acceptance completed for the building photo ordering and building-profile layout.
- Focused renderer assertions passed for stable ordering, source-array immutability, single- and multi-photo controls, no-photo outline fallback and hidden-note exclusion.
- `node --check app-place.js` and `git diff --check` passed; the latter reported line-ending warnings only.

## 2026-07-22 — KMK assistant launcher and chat panel

- Enabled the existing bottom-right assistant launcher as a working KMK campus guide.
- Added an accessible Intercom-style chat panel with suggested prompts, keyboard dismissal and responsive mobile layout.
- Grounded initial answers in the public KMK building snapshot; configured BISHENG responses take precedence when a secure endpoint is supplied.
- Aligned the assistant’s panel, messages, input and controls with the light and dark site theme tokens.
- Added a visible typing indicator while the assistant prepares each response.

## 2026-07-20 — Community walls browse by major

### Changed

- Simplified community navigation from organization → Batch → major to organization → major; Batch is no longer a community selection, route or filtering layer.
- Changed the current community route to `#/wall/:orgId/:majorId`; legacy `#/wall/:orgId/:batchId/:majorId` links replace themselves with the two-parameter route without adding history or entering a redirect loop.
- Community walls now explicitly match community notes by `orgId` and `majorId`, so legacy notes from different batches are combined while other organizations, majors and building notes remain isolated.
- New community notes retain the `batchId` field with a `null` value and use `community:${orgId}:${majorId}` as their wall key.
- Kept legacy community notes and their existing Batch values without migration; displaying them does not require an exact match against either the old or new community wall key.
- Kept building-wall routes, building wall keys, `placeId` handling and all map flows unchanged.

### Verified

- Passed the focused syntax checks, full-repository JavaScript syntax check, `git diff --check` and isolated routing/filtering/persistence tests.
- User browser acceptance passed for current and legacy routes, cross-Batch merging, organization/major isolation, community posting and reload, `batchId:null`, building and map regressions, English/Bahasa Melayu/Chinese UI and a clean Console.

## 2026-07-17 — Cafe Admin focus-building preview

- Added B_KAFETERIA_PENTADBIRAN to the fourteen-building focus list using its existing three-component MultiPolygon, generic preview, building wall and map-return flow.
- Added a secondary building-details link only for Cafe Admin, replaced its unverified staff-use description and fixed hours with neutral copy, and did not claim official GIS or formal operating hours.

## 2026-07-17 — Cafe Admin stall-roof component

- Added the user-confirmed lower stall / roof area to B_KAFETERIA_PENTADBIRAN as a third separate Polygon within the same logical building; no extra building ID or wall was created.
- The source remains non-official GIS, and Cafe Admin remains outside the thirteen-building focus list with preview disabled.

## 2026-07-17 — Cafe Admin MultiPolygon correction

- Corrected B_KAFETERIA_PENTADBIRAN after user field confirmation that Cafe Admin comprises two separate buildings: the map now uses one logical building with a two-component MultiPolygon, without a second building ID or wall.
- The source remains non-official GIS; Cafe Admin is still excluded from the thirteen-building focus list and its preview remains disabled.

## 2026-07-17 — Seri Laka parent residence entry

- Added B_SERI_LAKA as a neutral parent residence area to the thirteen-building focus list, normalizing its public EchoWall category to residence while leaving the raw Digital Twin unchanged; no C2 object, gender classification, official GIS claim or precise single-building claim was added.

## 2026-07-17 — Seri Temin parent residence entry

- Added B_SERI_TEMIN to the twelve-building focus list using its complete parent residence-area geometry and the existing preview, dedicated wall and map-return flow; no B1/B2 object or official single-building GIS claim was added. B_SERI_LAKA remains blocked because its current user-visible residence_m category is not evidence-safe.

## 2026-07-17 — Seri Palas featured map entry

- Added `B_SERI_PALAS` to the eleven-building focus list, enabled the generic preview and dedicated wall, retained the three-ring parent residence-area geometry, and did not claim official GIS verification.

## 2026-07-17 — Kafeteria C map preview

- Added `B_KAFETERIA_C` to the ten-building focus list and enabled the existing generic map preview, dedicated wall entry and map-return flow.

## 2026-07-16 — Map wall return revalidation

- Revalidated the matching map-return snapshot when the building-wall exit is clicked and stopped BFCache `pageshow` from deleting a valid snapshot before successful map restoration.

## 2026-07-16 — Kafeteria B map preview

- Added `B_KAFETERIA_B` to the nine-building focus list and enabled the existing generic map preview, dedicated wall entry and map-return flow.

## 2026-07-16 — Eight-building map and wall-return acceptance

### Manually accepted

- Completed the full flow for eight focus buildings: building list → map focus → building footprint → building preview → dedicated building wall → restored map state.
- Accepted building IDs: `B_PUSTAKA`, `B_MASJID`, `B_DEWAN_KULIAH`, `B_BLOK_TUTORAN_MAKMAL`, `B_LANGKASUKA`, `B_SERAMBI`, `B_DEWAN_MAHAWANGSA` and `B_KAFETERIA_A`.
- Verified on desktop, tablet and mobile with mouse, Enter and Space activation.
- Verified restoration of map center and zoom, selected list item, building outline, building preview, page/list/preview scroll positions and deletion of the one-time session snapshot.
- Representative checks included Pustaka, the Tutoran/Makmal multi-ring footprint and Kafeteria A.
- Return snapshot contract: `echowall_map_return_v1`, version 1, 30-minute TTL.

### Preserved

- Echo Wall remains a competition frontend prototype; no production backend or production-grade authentication was added.
- The LocalStorage note structure was not changed.

## 2026-07-14 — Pustaka preview and functional-zone interaction standard

### Added

- Loaded the existing Echo Wall building registry on `map.html`.
- Added an EchoWall-owned 24-point `B_PUSTAKA` map-footprint snapshot converted from the read-only Digital Twin local-ENU polygon.
- Replaced the permanent Pustaka icon with a transparent building hit area that lightly highlights on hover and shows only its outline while selected.
- Cleared the selected building outline and preview on map-background clicks while keeping building clicks isolated from free-location notes.
- Expanded the existing right-side Pustaka preview with the registry-backed display name and alias, localized building category and functional-zone name, description, visible-note count, at most two recent visible notes and a clear zero-note state.
- Kept the building-wall action outside the preview's scrollable content so it stays visible on long content and narrow screens.
- Changed functional zones to start hidden and appear only after the user opens the existing selector and chooses one zone.
- Limited the map to one selected zone border and permanent name at a time; the selected zone clears from the current card/rectangle, map background, selector close button or selector toggle.
- Refreshed preview note data and localized zone/preview copy after history restoration or language changes.

### Removed

- Removed map-background note creation, its login prompt, draft marker, editor/backdrop and LocalStorage write path.

### Preserved

- Kept `B_PUSTAKA`, `placeId: "B_PUSTAKA"` and `wallKey: "building:B_PUSTAKA"` unchanged.
- Kept all existing `zoneId` values and map bounds coordinates unchanged.
- Kept building and zone clicks isolated; no map element can invoke a free-location note editor.
- Kept existing `echowall_map_notes` records untouched and readable as historical map markers.
- Added no runtime Digital Twin dependency, backend, package or GIS redesign.

### Deferred

- Map connections for every building other than `B_PUSTAKA`.
- Surveyed building footprints or a broader map-region redesign.
- Automated visual and interactive browser regression; the in-app browser was unavailable in this session.

## 2026-07-13 — Feature foundation

### Added

- Building directory and building profile routes.
- Dedicated building walls without batch or major selection.
- Popular notes on building bird's-eye overview.
- Local prototype user registration and login.
- Login requirement before posting.
- Authenticated anonymous or named publishing.
- User-selected note position.
- Rounded, speech, polaroid, ticket and hexagon note shapes.
- Photo crop scale and fit controls.
- English, Bahasa Melayu and Chinese locale structure.
- Original/translated note toggle and translation adapter.
- Light, dark and system themes.
- Cloudinary signed-upload adapter.
- BISHENG assistant bridge.

### Preserved

- Existing HTML, CSS, JavaScript, Hash Router and Leaflet architecture.
- Existing community wall flow.
- Existing map region implementation.

### Deferred

- Map region redesign.
- Production authentication.
- Live translation endpoint.
- Live Cloudinary and BISHENG credentials.

## 2026-07-28 — Portable demo bundle

### Added

- Added a deterministic classic-script demo seed bundle builder and portable validator.
- Generated `data/demo-seed-bundle.v1.js` with 788 runtime-only demo notes, including KMK wall counts 73/62/65.
- Added `EchoWall-portable-demo-v1.zip` containing only website runtime files and assets.

### Changed

- `index.html` and `map.html` load the bundle before `app-data.js`.
- `app-data.js` activates the in-memory bundle synchronously and skips the fetch fallback when the bundle exists.
- Removed the `localhost` referer fallback from the optional free-AI adapter for portable path validation.

### Rollback

Remove the bundle script tags and generated bundle/build/validation files, revert the portable branch in `loadDefaultDemoSeed()`, restore the previous free-AI referer fallback, and delete the portable ZIP. Do not alter LocalStorage or unrelated working-tree changes.
## 2026-07-29 — Reduced KMK community demo seed

- Reduced KMK community runtime seed from 200 to 108 notes: Sains 73, Akaun 25 and Sains Komputer 10.
- Added deterministic quality-first, language/identity-stratified selection in `scripts/reduce-kmk-demo-seed.mjs`; note bodies and `demoSeedKey` values are preserved.
- Rebuilt the classic-script bundle to 696 notes and refreshed `EchoWall-portable-demo-v1.zip`.
- Updated runtime and portable validation contracts to 696 and 73/25/10.

Rollback: restore the previous 200-note KMK JSON and 788-note bundle/ZIP, revert the 696 and 73/25/10 validation constants, and remove the reducer script. Do not alter LocalStorage or unrelated working-tree changes.

## 2026-08-01 — Refreshed portable demo artifact

- Rebuilt `data/demo-seed-bundle.v1.js` deterministically at 696 runtime-only notes across 17 walls, including KMK counts 73/25/10 and 42 notes on the Pustaka building wall.
- Recreated `EchoWall-portable-demo-v1.zip` from an explicit runtime whitelist; the archive contains 50 files and is 6,172,172 bytes with SHA-256 `3BAA8C6897FE86EF9860217F74FA0A038A7A66F51DA7EBAC7364250A6E7671A6`.
- Preserved `.github/workflows/deploy-pages.yml` unchanged and did not stage, commit, push or create a pull request.
- Imported no browser LocalStorage content because no automated browser instance was available; no login, session, password, private-account or unknown user-note data was added to the seed.
- Verified the portable validator, all 25 deployed JavaScript files, `git diff --check`, archive safety scans, four wall routes, runtime seed idempotency, 16 building photos, HTTP resources and the local rule-based AI fallback.

Rollback: restore only the prior `EchoWall-portable-demo-v1.zip` (and its matching generated bundle if the seed sources also change). Do not clear LocalStorage or revert unrelated dirty-worktree files.
