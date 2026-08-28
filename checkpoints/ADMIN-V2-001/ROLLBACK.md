# ROLLBACK — ADMIN-V2-001

Do not restore whole files for the tracked files below (the working tree carries unrelated
uncommitted work in most of them). Reverse only the specific hunks, matching `PRE_STATE.md` /
`before/*.pre`.

> **ADMIN-V2-001A addendum (2026-08-23, same checkpoint)**: after the items below, a small
> contract-correction pass removed the duplicate Super Admin email hardcode from
> `services/auth-service.js`'s `PROTOTYPE_ADMIN_EMAILS` (it used to list both
> `greencucumbertube@gmail.com` and `mzteoh88@gmail.com`; it now lists only the latter) and
> rewrote `isCurrentUserAdmin()` there into a compatibility wrapper delegating to
> `AdminPermissionService.canAccessAdminPanel()`. `after/auth-service.js.post`,
> `after/admin-permission-service.js.post` (header comment only), and
> `after/test-admin-role-scope.mjs.post` (added role-independence checks) were refreshed to this
> final state. Rolling back to the ORIGINAL `before/auth-service.js.pre` would re-introduce the
> duplicate hardcode this addendum removed — if a partial rollback is ever needed, restore
> `before/auth-service.js.pre` first (item 3 below reaches the ADMIN-V2-001 baseline, which
> already had the duplicate), not this addendum's corrected state.

1. **services/admin-permission-service.js** — delete this file entirely (it is brand new).

2. **index.html** — remove the
   `<script src="services/admin-permission-service.js"></script>` line inserted immediately after
   `<script src="services/auth-service.js"></script>`.

3. **app-admin.js**:
   - Restore `isCurrentUserAdmin()` to `return Boolean(window.AuthService?.isCurrentUserAdmin?.());`.
   - Remove `canAccessCommunityModeration()`, `requireCommunityModerationAccess()`,
     `canAccessStudyModeration()`, `requireStudyModerationAccess()`, and `renderAdminNoSectionState()`.
   - In `renderAdmin()`, remove the `canCommunitySection`/`canStudySection` normalization block and
     the `adminState.sourceType === "none"` branch; restore the direct
     `if (adminState.sourceType === "study") { renderAdminStudyPanel(container); return; }`
     immediately after the initial access check.
   - Restore the Study nav button to unconditional (remove the `${canStudySection ? ... : ""}` wrap).
   - In `adminSetSource()`, restore the single `if (!requireAdminAccess() || !["community","map","study"].includes(sourceType)) return;` line (remove the per-sourceType `requireStudyModerationAccess()`/`requireCommunityModerationAccess()` branch).
   - Restore `requireAdminAccess()` in place of `requireCommunityModerationAccess()` at: `adminRetryMapNotes`, `adminSetSearch`, `adminSetFilter`, `adminToggleHidden`, `adminToggleMapHidden`, `adminDeleteNote`, `adminDeleteMapNote`, `adminResetNotes`, `adminExportNotes`.
   - Restore `isCurrentUserAdmin()` in place of `canAccessCommunityModeration()` in
     `getAdminFilteredNotes()`/`getAdminFilteredMapNotes()`.

4. **app-study-admin.js**:
   - Restore the file header comment to its original wording (see `PRE_STATE.md`).
   - Replace all 7 `if (!requireStudyModerationAccess()) return;` occurrences back to
     `if (!requireAdminAccess()) return;`.
   - In `renderAdminStudyPanel()`, remove the `canCommunitySection` computation and restore the
     Community/Map nav buttons to unconditional markup.

5. **services/permission-service.js** — restore `getUserModerationScope()`,
   `canUserModerateCommunity()`, and `canUserMarkSolved()` to the `user.role === "admin"` /
   `user.moderatesOrgId` stub shown in `PRE_STATE.md`.

6. **services/study-submission-service.js** — restore `requireModerator()` to:
   ```js
   function requireModerator() {
     const isAdmin = Boolean(window.AuthService?.isCurrentUserAdmin?.());
     if (!isAdmin) throw new Error('study.upload.error.moderatorRequired');
     return window.AuthService.getCurrentUser();
   }
   ```

7. **services/auth-ui.js** — restore `ensureAccountPopover(user, AuthService.isCurrentUserAdmin());`
   (remove the `canSeeAdminLink` computation).

8. **scripts/test-study-upload.mjs**:
   - Remove `'services/admin-permission-service.js'` from `loadServicesIntoContext()`'s `files`
     array.
   - Remove `localStorage: createFakeLocalStorage(),` from the sandbox object in `buildSandbox()`.
   - Remove the `createFakeLocalStorage()` helper function.

9. **scripts/test-admin-role-scope.mjs** — delete this file entirely (it is brand new).

10. **services/auth-service.js** (ADMIN-V2-001A addendum): restore `PROTOTYPE_ADMIN_EMAILS` to
    ```js
    const PROTOTYPE_ADMIN_EMAILS = new Set([
      "greencucumbertube@gmail.com",
      "mzteoh88@gmail.com",
    ]);
    ```
    and restore `isCurrentUserAdmin()` to:
    ```js
    function isCurrentUserAdmin() {
      const user = getCurrentUser();
      return Boolean(
        user
        && user.role === "admin"
        && PROTOTYPE_ADMIN_EMAILS.has(normalizeEmail(user.email))
      );
    }
    ```
    (Rolling this back re-introduces the duplicate Super Admin email hardcode ADMIN-V2-001A
    removed — only do this if reverting the whole correction, not in isolation.)

## Explicitly not part of this rollback

- `data/community-config.js`, `services/community-service.js`, `services/comment-service.js`, and
  every other Community V2 / Echo Map / Building / Study Notes UI file — untouched by this task.
- `services/auth-service.js`'s `normalizeEmail`, `deriveRoleFromEmail`, `register`, `signIn`,
  `updateProfile`, education-profile logic — untouched by ADMIN-V2-001A; only
  `PROTOTYPE_ADMIN_EMAILS`'s contents and `isCurrentUserAdmin()`'s body changed (see item 10).
- No LocalStorage data was migrated or deleted. A rollback leaves any `echo-wall-role-assignments:v1`
  key harmlessly unread by older code (nothing reads that key once `admin-permission-service.js` is
  removed).

## Safety

No `git reset --hard` or `git clean -fd` was used or is required. All changes are plain
text-editor edits to the working tree; nothing was committed.
