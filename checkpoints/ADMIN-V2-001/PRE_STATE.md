# PRE_STATE — ADMIN-V2-001

Date: 2026-08-22/23

Full pre-edit copies of every touched file are in `before/*.pre` (exact working-tree content
immediately before this task started). `services/admin-permission-service.js` is a brand-new file
— it has no `.pre` snapshot because it did not exist before this task.

> **ADMIN-V2-001A addendum (2026-08-23)**: a follow-up contract-correction pass edited
> `services/auth-service.js` for the first time (it was audited but not modified in the original
> ADMIN-V2-001 pass) — `before/auth-service.js.pre` already correctly captures its state
> immediately before ANY change in this checkpoint, since the file was untouched between the two
> passes. Before the correction, `PROTOTYPE_ADMIN_EMAILS` read
> `new Set(["greencucumbertube@gmail.com", "mzteoh88@gmail.com"])` and `isCurrentUserAdmin()` was
> `Boolean(user && user.role === "admin" && PROTOTYPE_ADMIN_EMAILS.has(normalizeEmail(user.email)))`
> — i.e. the Super Admin email was hardcoded in TWO business-code files at once (here and in
> `services/admin-permission-service.js`'s `SUPER_ADMIN_EMAIL`), which is exactly the contract
> violation ADMIN-V2-001A fixed. See `after/auth-service.js.post` for the corrected version.

The key pre-edit hunks (for readers who don't want to diff full files):

## app-admin.js

```js
function isCurrentUserAdmin() {
  return Boolean(window.AuthService?.isCurrentUserAdmin?.());
}

function requireAdminAccess() {
  if (isCurrentUserAdmin()) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}
```

`renderAdmin(container)` began:

```js
function renderAdmin(container) {
  const user = window.AuthService?.getCurrentUser?.() || null;
  if (!user || !isCurrentUserAdmin()) {
    renderAdminAccessState(container, user);
    return;
  }

  // STUDY-V2-008: ...
  if (adminState.sourceType === "study") {
    renderAdminStudyPanel(container);
    return;
  }

  const mapNotes = adminMapNotes.slice();
```

No `canAccessCommunityModeration()`, `canAccessStudyModeration()`, `requireCommunityModerationAccess()`,
`requireStudyModerationAccess()`, or `renderAdminNoSectionState()` existed. The Study nav button was
unconditional. `adminSetSource()` used one blanket `requireAdminAccess()` for every sourceType.
`getAdminFilteredNotes()`/`getAdminFilteredMapNotes()` guarded with `isCurrentUserAdmin()`. All
Community/Map mutating actions (`adminToggleHidden`, `adminDeleteNote`, `adminResetNotes`,
`adminToggleMapHidden`, `adminDeleteMapNote`, `adminRetryMapNotes`, `adminSetSearch`,
`adminSetFilter`, `adminExportNotes`) guarded with the same blanket `requireAdminAccess()`.

## app-study-admin.js

File header claimed: "Only a Global Admin (`AuthService.isCurrentUserAdmin()`) ever reaches this
panel — `requireAdminAccess()` (app-admin.js) gates every mutating action... There is no separate
'Study Moderator' role in this prototype." All 7 mutating functions
(`adminStudySetFilter`/`adminStudyToggleExpand`/`adminStudyToggleReject`/`adminStudyApprove`/
`adminStudySaveAndApprove`/`adminStudyConfirmReject`/`adminStudySetVerification`) guarded with
`if (!requireAdminAccess()) return;`. `renderAdminStudyPanel()`'s sidebar unconditionally rendered
Community/Map nav buttons.

## services/permission-service.js

```js
function getUserModerationScope(user) {
  if (!user) return null;
  if (user.role === "admin") return { scope: "global" };
  if (Number.isInteger(user.moderatesOrgId) && user.moderatesOrgId > 0) {
    return { scope: "college", orgId: user.moderatesOrgId };
  }
  return null;
}
```

`canUserModerateCommunity`/`canUserMarkSolved` both called this stub, which treated any
`role === "admin"` user as unrestricted "global" and had a dead `user.moderatesOrgId` branch never
reachable by a real signed-in account (per the file's own header comment).

## services/study-submission-service.js

```js
function requireModerator() {
  const isAdmin = Boolean(window.AuthService?.isCurrentUserAdmin?.());
  if (!isAdmin) throw new Error('study.upload.error.moderatorRequired');
  return window.AuthService.getCurrentUser();
}
```

## services/auth-ui.js

```js
if (user) {
  ensureAccountPopover(user, AuthService.isCurrentUserAdmin());
  bindAccountPopover(target);
}
```

## index.html

`services/auth-service.js` was immediately followed by `services/translation-service.js` — no
`services/admin-permission-service.js` script tag existed anywhere in the file.

## scripts/test-study-upload.mjs

`loadServicesIntoContext()`'s `files` array was
`['services/study-resource-service.js', 'services/study-submission-service.js']` — no
`admin-permission-service.js`. The sandbox object had no `localStorage` key at all.

## scripts/test-admin-role-scope.mjs

Did not exist.
