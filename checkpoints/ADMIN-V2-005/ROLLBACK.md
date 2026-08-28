# ROLLBACK — ADMIN-V2-005

Target specific hunks below, not whole-file restores.

## New files (delete entirely to roll back)

- `scripts/test-admin-college-scope.mjs`

## `services/moderation-service.js`

Revert `canAccessModerationItem` to its single-line `return canAccessScopeForModeration(...)` form
(drop the `assignedTo` bypass). Delete `assignModerationItem` and its export line.

## `services/admin-audit-service.js`

Remove `"assign", "unassign"` from the `ACTIONS` array.

## `app-admin.js`

- Delete `adminUserCollegeOrgIds`, `canAccessMapModeration`, `requireMapModerationAccess`,
  `adminResolveKmkOrgId`, `adminCanModerateNote`.
- Revert `canAccessCommunityModeration` to `Boolean(window.AdminPermissionService?.canModerateGlobalCommunity?.(user))`.
- Revert `getAdminCommunityNotes` to `notes.filter(note => note?.contextType === "community")`.
- Revert `getAdminFilterDefinitions`'s Community dropdown to unconditionally list every org.
- Revert `adminToggleHidden`/`adminDeleteNote`'s note lookup to `contextType === "community"` only
  and drop the `adminCanModerateNote` check block in each.
- Revert `adminToggleMapHidden`/`adminDeleteMapNote`/`adminRetryMapNotes`/`getAdminFilteredMapNotes`
  to call `requireCommunityModerationAccess()`/`canAccessCommunityModeration()` again.
- Revert `adminSetSource`'s `hasSourceAccess` to route both `"community"` and `"map"` through
  `requireCommunityModerationAccess()`.
- Revert `adminSetSearch`/`adminSetFilter` to call `requireCommunityModerationAccess()`
  unconditionally (drop the `sourceType === "map"` branch).
- Revert `adminResetNotes`'s gate back to `requireCommunityModerationAccess()`.
- Revert the sidebar's Map `dashLink` and the Community/Map tab-switcher buttons to render
  unconditionally under the single `canAccessCommunityModeration()` check (drop the separate
  `canAccessMapModeration()` conditionals).
- Revert the "Reset demo data" button's condition to just `!activeIsMap`.

## `app-admin-dashboard.js`

Delete `adminDashboardAssignControlHtml`, `adminDashboardAssign`, `adminDashboardUnassign`, and the
`${adminDashboardAssignControlHtml(item)}` call site. Revert the Queue row's "Assigned" span back to
`${item.assignedTo ? \`<span>${I18n.t("admin.dash.assigned")}</span>\` : ""}`.

## `style-admin.css`

Remove the `.admin-assign-control` block.

## `i18n/locales/{en,ms,zh}.js`

Delete `admin.audit.action.assign`, `admin.audit.action.unassign`, `admin.dash.assignPlaceholder`,
`admin.dash.assignButton`, `admin.dash.unassignButton`, `admin.dash.assignedTo`.

## Verification after rollback

```
node scripts/test-admin-role-scope.mjs        # 85 passed, 0 failed
node scripts/test-admin-moderation-schema.mjs # 109 passed, 0 failed
node scripts/test-admin-dashboard.mjs         # 52 passed, 0 failed
node scripts/test-study-upload.mjs            # 54 passed, 0 failed
node scripts/test-admin-audit.mjs             # 58 passed, 0 failed
```
