# PRE_STATE — ADMIN-V2-007 (Admin Management)

Date: 2026-08-23

Builds on the locked ADMIN-V2-001 through 006 baseline. Hunk-level before/after per CLAUDE.md.

## Audit findings (before writing any code)

- **`grantRoleAssignment`/`setAssignmentStatus`/`listAllRoleAssignments` already existed** (built
  ADMIN-V2-001, explicitly commented "ADMIN-V2-007 will add a real Role Manager UI on top of these
  same functions") — confirmed this stage's job was to build the UI + close real gaps, not
  reinvent the CRUD layer.
- **Real gap 1**: `assertKnownRole` did NOT reject `role: ROLES.SUPER_ADMIN` — `ROLE_DEFAULT_PERMISSIONS[SUPER_ADMIN]`
  exists (= `ALL_PERMISSIONS`), so `grantRoleAssignment({role: "SUPER_ADMIN", ...})` would have
  silently succeeded before this stage, directly contradicting spec section 24's explicit "不要允许
  UI 创建第二个 SUPER_ADMIN". Confirmed by reading `assertKnownRole`'s exact condition, not assumed.
- **Real gap 2**: `grantRoleAssignment` validated `scopeType` was a KNOWN scope type, but never
  that it was the CORRECT scope type for the given role — `COLLEGE_ADMIN` + `scopeType: "study"`
  would have been accepted. Spec section 25 explicitly calls this out as an example of what must be
  rejected.
- **Real gap 3**: no `revokeRoleAssignment` existed — only `setAssignmentStatus` (active/disabled).
  Spec section 24 explicitly lists Disable/Re-enable/Revoke as 3 distinct actions; "Revoke" is
  read as a hard, permanent removal (not just another disabled state) — confirmed no other
  interpretation fit the spec's wording as well.
- **Real gap 4**: `grantRoleAssignment`/`setAssignmentStatus` had no caller-permission check
  (documented as intentional — "gated by the CALLER's own hasPermission check, not here") and no
  AuditAction hook at all. No UI existed to call them from.
- **"Role change immediate" already true by construction** — every permission check
  (`getRoleAssignments`, `canModerateCollege`, etc.) reads `activeProvider.list()` fresh from
  LocalStorage on every call, with zero caching layer anywhere in the permission stack. Confirmed
  by reading the full read path before writing any test asserting this, rather than assuming it.
- **Bootstrap Super Admin already un-disable-able/un-revokable by construction** — it has no real
  stored `RoleAssignment` row (`isSuperAdmin()` is a pure email check); `setAssignmentStatus`/
  `revokeRoleAssignment` both operate only on `activeProvider.list()` entries, so any attempt
  against a fabricated Super Admin id throws "not found" naturally. Confirmed this needed no
  separate guard, only a test proving it.

## Files touched this stage

- `services/admin-permission-service.js` — `assertKnownRole` now also rejects `SUPER_ADMIN`;
  new `ROLE_ALLOWED_SCOPE_TYPES` + `assertValidRoleScopeCombo` (role/scope combination validation);
  new `revokeRoleAssignment(id, actor)` (hard delete); `grantRoleAssignment`/`setAssignmentStatus`/
  `revokeRoleAssignment` gained an optional `actor` parameter — when supplied, self-gates to Super
  Admin only AND creates a `role_assignment`-targeted, `system`-scoped AuditAction via
  `logRoleAuditAction`; omitting `actor` (every ADMIN-V2-001-era test fixture call) remains fully
  backward compatible (no gate, no audit, unchanged behavior)
- `app-admin-management.js` — **new file**: the Admin Management / Role Manager UI (grant form,
  assignment list with Disable/Re-enable/Revoke, bootstrap/legacy informational note), reached as a
  fourth admin source (`adminState.sourceType === "adminManagement"`)
- `app-admin.js` — new `requireAdminManagementAccess()`; `"adminManagement"` added to both
  `sourceType` whitelists and the module-source redirect logic; sidebar nav link (Super Admin only,
  shows the real assignment count)
- `index.html` — added `<script src="app-admin-management.js">` after app-admin-dashboard.js
- `style-admin.css` — `.admin-mgmt-info-note`, `.admin-mgmt-grant-form`
- `i18n/locales/{en,ms,zh}.js` — ~35 new `admin.mgmt.*` keys
- `scripts/test-admin-management.mjs` — **new file**: 43 assertions
