# PRE_STATE — ADMIN-V2-003A (Dashboard Consistency Correction)

Date: 2026-08-23

This stage builds directly on the already-PASSing ADMIN-V2-003 checkpoint
(`checkpoints/ADMIN-V2-003/`). The working tree already carried unrelated
uncommitted edits (Community/Map/Homepage/AI work) before this stage started;
per CLAUDE.md this checkpoint documents hunk-level before/after, not whole-file
snapshots, since a whole-file `.pre` copy would capture that unrelated work too.

## Audit findings (before writing any code)

- **4B — Map permission inconsistency (confirmed real, reproduced against live
  browser localStorage data, not just theoretical):**
  `services/moderation-service.js`'s `canAccessScopeForModeration(user, scopeType,
  scopeId)` required `AdminPermissionService.canModerateCollege(user, scopeId)`
  for every `"college"`-scoped item, including `map_note` (which is always
  KMK-scoped — see `resolveContentScope()`). The Old Map Admin tab
  (`app-admin.js`'s `canAccessCommunityModeration()`) has always gated Map on
  `canModerateGlobalCommunity(user)` instead — a *different* permission. A
  legacy admin (`role: "admin"`, not the Super Admin email) holds only the
  virtual `LEGACY_ADMIN_PSEUDO_ROLE` assignment (`scopeType: "global"`,
  `GLOBAL_COMMUNITY_MODERATE` + `STUDY_RESOURCE_MODERATE`) — no college
  `RoleAssignment` at all — so `canModerateCollege(legacyAdmin, KMK)` was
  always `false`. Confirmed live in Chrome against the real `mzteoh88@gmail.com`
  QA account: `ModerationService.listModerationItems({}, user)` returned 0
  `map_note` items before the fix despite the account being able to
  Hide/Show/Delete those same map notes from the Old Map Admin tab.
- **4A — i18n gap (confirmed real):** `app-admin-dashboard.js` (all of
  ADMIN-V2-003, ~30 render-function strings: Overview/Queue/Reports/History
  titles+descriptions, stat card labels+descriptions, module/status/source
  filter option labels, scope labels, empty states, content preview
  fallback strings, status/module/source row badges) and
  `app-admin.js`'s `adminSidebarNavHtml()` (`"Overview"`/`"Moderation Queue"`/
  `"Reports"`/`"History"`/`"Open Echo Map"`, added by ADMIN-V2-003) were hardcoded
  English with zero `I18n.t()` calls. Confirmed by grepping the file for
  capitalized string literals/JSX-style text nodes.
- Existing locked-baseline files (`services/admin-permission-service.js`,
  `services/moderation-service.js` scope math for `post`/`study_resource`,
  the 4 baseline test suites) were read in full before any edit to avoid
  breaking the documented "Global Moderator moderates global:all only, never
  an individual college" invariant.

## Files touched this stage

- `services/admin-permission-service.js` — added `canModerateMap(user, orgId)`
- `services/moderation-service.js` — `canAccessScopeForModeration` gained a
  4th `contentType` param, special-cased for `"map_note"`; `canAccessModerationItem`/
  `getReport`/`listReports`/`updateReportStatus` now pass `contentType` through
- `app-admin-dashboard.js` — full i18n pass (every render function) + 3 new
  shared label helpers (`adminDashboardScopeLabel`/`StatusLabel`/`ModuleLabel`/`SourceLabel`)
  + `adminDashboardCountHtml()` helper to keep the `.match-count` span styling
  with interpolated count strings
- `app-admin.js` — `adminSidebarNavHtml()`'s 4 dashboard nav labels + "Open Echo Map" now go through `I18n.t()`
- `i18n/locales/{en,ms,zh}.js` — ~80 new `admin.dash.*` keys
- `scripts/test-admin-moderation-schema.mjs` — new legacy-admin/Map-parity assertion block
- `scripts/test-admin-role-scope.mjs` — new `canModerateMap()` coverage block
- `scripts/test-admin-dashboard.mjs` — Global Moderator overview-count expectations updated to
  reflect the (correct) Map-visibility change; `I18n` sandbox stub upgraded from
  `key => key` to load the real `i18n/locales/en.js` table and interpolate `{var}` like the real
  `i18n/index.js`
