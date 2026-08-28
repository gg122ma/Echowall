# ROLLBACK — ADMIN-V2-007

Target specific hunks below, not whole-file restores.

## New files (delete entirely to roll back)

- `app-admin-management.js`
- `scripts/test-admin-management.mjs`

## `index.html`

Remove `<script src="app-admin-management.js"></script>`.

## `services/admin-permission-service.js`

- Revert `assertKnownRole` to drop the `|| role === ROLES.SUPER_ADMIN` condition.
- Delete `ROLE_ALLOWED_SCOPE_TYPES` and `assertValidRoleScopeCombo`; remove the
  `assertValidRoleScopeCombo(role, resolvedScopeType);` call in `grantRoleAssignment`.
- Delete `logRoleAuditAction`.
- Revert `grantRoleAssignment`'s signature to drop `actor = null`; drop the
  `if (actor && !isSuperAdmin(actor)) throw ...` line; drop the `logRoleAuditAction(...)` call
  before `return assignment;`.
- Revert `setAssignmentStatus(id, status)` to its original 2-arg signature; drop the actor gate and
  the `logRoleAuditAction(...)` call.
- Delete `revokeRoleAssignment` entirely and its export line.
- Remove `revokeRoleAssignment` from the `window.AdminPermissionService` export object.

## `app-admin.js`

- Delete `requireAdminManagementAccess()`.
- Remove `"adminManagement"` from both `sourceType` whitelists (`renderAdmin()`'s outer gate array
  and `adminSetSource()`'s own array) and its `isModuleSource`/redirect branch.
- Remove `if (adminState.sourceType === "adminManagement") return renderAdminManagementView(container);`.
- Remove the Admin Management sidebar `dashLink` block (the `if (window.AdminPermissionService?.isSuperAdmin?.(user))` block in `adminSidebarNavHtml`).

## `style-admin.css`

Remove the "ADMIN-V2-007: Admin Management" block (`.admin-mgmt-info-note`, `.admin-mgmt-grant-form`).

## `i18n/locales/{en,ms,zh}.js`

Delete every `"admin.mgmt.*"` key.

## Verification after rollback

```
node scripts/test-admin-role-scope.mjs        # 85 passed, 0 failed
node scripts/test-admin-moderation-schema.mjs # 109 passed, 0 failed
node scripts/test-admin-dashboard.mjs         # 52 passed, 0 failed
node scripts/test-study-upload.mjs            # 65 passed, 0 failed
node scripts/test-admin-audit.mjs             # 58 passed, 0 failed
node scripts/test-admin-college-scope.mjs     # 45 passed, 0 failed
```
