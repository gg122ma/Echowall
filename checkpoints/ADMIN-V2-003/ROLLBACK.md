# ROLLBACK — ADMIN-V2-003

Do not restore whole files for the tracked files below (the working tree carries unrelated
uncommitted work in most of them). Reverse only the specific hunks, matching `PRE_STATE.md` /
`before/*.pre`.

1. **app-admin-dashboard.js** — delete this file entirely (it is brand new).

2. **scripts/test-admin-dashboard.mjs** — delete this file entirely (it is brand new).

3. **index.html** — remove the `<script src="app-admin-dashboard.js"></script>` line inserted
   immediately after `<script src="app-admin.js"></script>`.

4. **style-admin.css** — remove the whole `/* ADMIN-V2-003: Unified Dashboard ... */` comment block
   and the CSS rules immediately following it (`.admin-dashboard-scope`, `.admin-dashboard-filters`,
   `.admin-dashboard-module-grid`, `.admin-dashboard-module-card` + its `strong`/`small` children,
   `.admin-queue-row .admin-note-meta span`, and the dark-theme override), plus the two lines added
   inside the `@media (max-width:1100px)` block (`.admin-dashboard-filters { grid-template-columns:1fr 1fr; }`
   and `.admin-dashboard-module-grid { grid-template-columns:1fr 1fr; }`).

5. **app-admin.js**:
   - Restore `adminState` to drop `dashboardScope`/`dashboardStatus`/`dashboardModule`/
     `dashboardSource`, and restore `sourceType: "community"` (was `"overview"`).
   - Remove the `adminSidebarNavHtml(user)` function (added after `requireStudyModerationAccess()`).
   - In `renderAdmin()`, restore the original normalization block (see `PRE_STATE.md`) and remove
     the `if (adminState.sourceType === "overview"/"queue"/"reports"/"history") return render...()`
     dispatch lines; restore the `renderAdminNoSectionState(container, user); return;` branch for
     the `"none"` state.
   - Restore `renderAdminNoSectionState()` (deleted this stage — full body is in the ADMIN-V2-001
     checkpoint's `after/app-admin.js.post`, or reconstructable from `git diff` against that
     checkpoint).
   - In the Community/Map render body, restore the inline 3-button sidebar (Community/Map/Study +
     Open Echo Map) in place of `${adminSidebarNavHtml(user)}` — see `PRE_STATE.md`.
   - In `adminSetSource()`, restore the original `["community", "map", "study"]` allow-list and the
     two-way `sourceType === "study" ? requireStudyModerationAccess() : requireCommunityModerationAccess()`
     ternary (removing the three-way branch that added the generic `requireAdminAccess()` case for
     the new sources).

6. **app-study-admin.js**:
   - Restore `renderAdminStudyPanel()`'s sidebar to its own inline copy (see `PRE_STATE.md`'s
     verbatim quote) instead of calling the shared `adminSidebarNavHtml(user)`.
   - Restore the `pendingCount`/`canCommunitySection` local variables removed from this function
     (they fed the old inline sidebar's button markup and pending-count badge).

## Explicitly not part of this rollback

- `services/moderation-service.js`, `services/admin-permission-service.js`,
  `services/study-submission-service.js`, `services/map-note-service.js`,
  `services/community-service.js`, `services/comment-service.js`, `services/permission-service.js`,
  `services/auth-service.js`, `services/auth-ui.js` — the ADMIN-V2-001/001A/002/002A Role/Scope +
  Moderation contracts. Not modified by ADMIN-V2-003 at all, per the explicit
  "don't rewrite these services" instruction.
- Every existing Community/Map/Study moderation ACTION function
  (`adminToggleHidden`/`adminDeleteNote`/`adminToggleMapHidden`/`adminDeleteMapNote`/
  `adminResetNotes`/`adminExportNotes`/`adminStudyApprove`/`adminStudySaveAndApprove`/
  `adminStudyConfirmReject`/`adminStudySetVerification`/`adminStudySetVerification`) — untouched;
  ADMIN-V2-003 only ADDS a "Review" button that calls the existing `adminSetSource()` to switch into
  these unchanged workspaces, it never re-implements an action.
- Community Notes / Map Notes / Study Moderation panel bodies (stats, filters, row rendering,
  filter-menu combobox) — untouched beyond the sidebar extraction in item 5/6 above.
- No LocalStorage data was migrated, deleted, or force-created. Test/demo ModerationItems and
  Reports created during this stage's browser QA remain in `echo-wall-moderation-items:v1` /
  `echo-wall-moderation-reports:v1` exactly as ADMIN-V2-002/002A's QA data did — rolling back the
  code does not need to (and does not) touch this data.

## Safety

No `git reset --hard` or `git clean -fd` was used or is required. All changes are plain
text-editor edits to the working tree; nothing was committed.
