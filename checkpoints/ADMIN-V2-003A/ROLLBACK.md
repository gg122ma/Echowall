# ROLLBACK — ADMIN-V2-003A

Target specific hunks below, not whole-file restores (the working tree carries
unrelated uncommitted work in these same files).

## 4B — canModerateMap

**`services/admin-permission-service.js`**: remove the `canModerateMap(user, orgId)`
function (added directly after `canModerateStudy`) and its export line
(`canModerateMap,` in the `window.AdminPermissionService` object literal).

**`services/moderation-service.js`**: revert `canAccessScopeForModeration` to its
3-arg form (drop the `contentType` param and the `map_note` special case inside
the `"college"` branch, restoring a bare `return aps.canModerateCollege(user, scopeId);`).
Revert the 4 call sites (`canAccessModerationItem`, `getReport`, `listReports`,
`updateReportStatus`) to call it without the 4th argument.

## 4A — i18n

**`app-admin-dashboard.js`**: every `I18n.t("admin.dash.*")` call introduced this
stage reverts to its original hardcoded English literal (see PRE_STATE.md's
"Files touched" list for the full set of render functions touched). The 5 new
helper functions (`adminDashboardScopeLabel`, `adminDashboardStatusLabel`,
`adminDashboardModuleLabel`, `adminDashboardSourceLabel`, `adminDashboardCountHtml`)
can be deleted along with their call sites reverted to the original inline
ternaries/string literals.

**`app-admin.js`**: revert the 4 `dashLink(...)` calls and the `"Open Echo Map"`
anchor in `adminSidebarNavHtml()` to their hardcoded string literals.

**`i18n/locales/{en,ms,zh}.js`**: delete every `"admin.dash.*"` key (one
contiguous block per file, inserted directly before the pre-existing
`"nav.theme"` key).

**`scripts/test-admin-dashboard.mjs`**: revert the `I18n` sandbox stub to
`{ t: key => key }` and drop `i18n/locales/en.js` from the `files` array in
`loadServicesIntoContext`. Revert the Global-Moderator overview-count block
(2 checks) back to the original "sees only 1 global item" assertions
(this reversal only makes sense in conjunction with reverting 4B — the two are
coupled: without the 4B fix, Global Moderator never sees the Map item).

**`scripts/test-admin-moderation-schema.mjs`** / **`scripts/test-admin-role-scope.mjs`**:
delete the appended `canModerateMap`/legacy-admin-Map-parity assertion blocks
(clearly delimited by their own `// --- ADMIN-V2-003A` comment headers).

## Verification after rollback

```
node scripts/test-admin-role-scope.mjs        # must read 74 passed, 0 failed
node scripts/test-admin-moderation-schema.mjs # must read 89 passed, 0 failed
node scripts/test-admin-dashboard.mjs         # must read 50 passed, 0 failed
node scripts/test-study-upload.mjs            # must read 49 passed, 0 failed (unaffected either way)
```
