# PRE_STATE — ADMIN-V2-005 (College Permission Enforcement + College Admin Workspace)

Date: 2026-08-23

Builds on the locked ADMIN-V2-001/001A/002/002A/003/003A/004 baseline. Hunk-level before/after per
CLAUDE.md, not whole-file snapshots.

## Audit findings (before writing any code)

- **A real `COLLEGE_ADMIN` could not reach the Community/Map workspace at all.**
  `canAccessCommunityModeration()` (`app-admin.js`) was `canModerateGlobalCommunity(user)` only —
  documented as a known limitation in every prior stage's report since ADMIN-V2-001. A College
  Admin's Overview/Queue/Reports/History already showed correct, scope-filtered data (ADMIN-V2-002/
  003 already built that), but clicking "Review" or the sidebar's Community/Map link did nothing
  (`requireCommunityModerationAccess()` denied and redirected to Overview).
- **`getAdminCommunityNotes()` had no per-college filtering at all** — it returned every
  `contextType==="community"` note regardless of college. Simply broadening the tab-access gate
  without also fixing this would have been a real data leak (a College Admin seeing/hiding/deleting
  every other college's notes) — confirmed this risk before writing any fix.
- **Community/Map action functions (`adminToggleHidden`/`adminDeleteNote`/
  `adminToggleMapHidden`/`adminDeleteMapNote`) had zero per-item scope check** — only the blanket
  tab-level gate. Broadening that gate for College Admin without adding a real per-note check would
  have let a KMK-only admin hide/delete a KMPP note by calling the function directly with that
  note's id (confirmed this gap by reading every one of these functions before writing any fix).
- **Building notes (`contextType==="building"`) had NO admin surface anywhere** —
  `getAdminCommunityNotes()` excluded them; `renderAdminNoteRow` already has full, working
  building-note rendering logic that was simply unreachable. Confirmed no separate building-
  moderation UI exists anywhere in the codebase (grepped `app-campus-buildings.js` and the whole
  admin surface) before treating this as a real gap rather than an intentional design.
- **`CONTENT_REVIEWER`'s default permission set (`CONTENT_REVIEW` only) meant
  `canAccessScopeForModeration` always denied them** — by design, per ADMIN-V2-001 — but no
  alternate "assigned to me" access path existed anywhere, so a Content Reviewer's admin panel was
  a real dead end (confirmed via the existing test suite's `'Content Reviewer -> canModerateGlobalCommunity
  false'`-style assertions, which only prove denial, never assignment-based access).
- **No assignment mechanism existed at all** — `ModerationItem.assignedTo` was a field
  `createModerationItem`/`updateModerationStatus` could set via `extra.assignedTo`, but nothing in
  the UI or a dedicated service function ever set it.

## Files touched this stage

- `services/moderation-service.js` — `canAccessModerationItem` gained an additive `assignedTo`
  bypass (Content Reviewer's real access path); new `assignModerationItem(id, assigneeUserId, user)`
  (Super-Admin-only, creates its own `assign`/`unassign` AuditAction, deliberately separate from
  `updateModerationStatus` to avoid conflating "who's assigned" with a status transition)
- `services/admin-audit-service.js` — `ACTIONS` gained `assign`/`unassign`
- `app-admin.js` — new `adminUserCollegeOrgIds`, `canAccessMapModeration`/`requireMapModerationAccess`
  (decoupled from Community's gate), `adminResolveKmkOrgId`, `adminCanModerateNote` (per-item write
  check); `canAccessCommunityModeration` broadened to include real `COLLEGE_ADMIN`s;
  `getAdminCommunityNotes` now scope-filters (and includes building notes); `getAdminFilterDefinitions`'s
  Community dropdown restricted to permitted colleges; `adminToggleHidden`/`adminDeleteNote` gained
  the `adminCanModerateNote` write check; `adminToggleMapHidden`/`adminDeleteMapNote`/
  `adminRetryMapNotes`/`getAdminFilteredMapNotes` switched to the new Map-specific gate;
  `adminSetSource`/`adminSetSearch`/`adminSetFilter` updated to dispatch to the correct gate per
  `sourceType`; `adminResetNotes` deliberately restricted to global-tier only (unscoped, wipes ALL
  colleges' local notes); sidebar/tab-switcher Map link and Community/Map tab buttons now
  conditionally rendered per the real permission, not unconditionally
- `app-admin-dashboard.js` — new Super-Admin-only inline assign/unassign control on Queue rows
  (`adminDashboardAssignControlHtml`/`adminDashboardAssign`/`adminDashboardUnassign`); Queue row's
  "Assigned" badge now shows the actual assignee id
- `style-admin.css` — `.admin-assign-control`
- `i18n/locales/{en,ms,zh}.js` — `admin.audit.action.assign`/`unassign`,
  `admin.dash.assignPlaceholder`/`assignButton`/`unassignButton`/`assignedTo`
- `scripts/test-admin-college-scope.mjs` — **new file**: 45 assertions
