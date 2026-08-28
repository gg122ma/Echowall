# ROLLBACK — ADMIN-V2-004

Target specific hunks below, not whole-file restores.

## New files (delete entirely to roll back)

- `services/admin-audit-service.js`
- `scripts/test-admin-audit.mjs`

## `index.html`

Remove the `<script src="services/admin-audit-service.js"></script>` line (between
`services/moderation-service.js` and `data/study-subjects.js`).

## `services/moderation-service.js`

Revert `updateModerationStatus` to its pre-004 form: drop the `STATUS_TO_ACTION`/
`REASON_REQUIRED_STATUSES` consts, the reason-required throw, and the
`AdminAuditService.createAuditAction` try/catch block at the end of the function. Remove
`resolveContentScope` from the exported `window.ModerationService` object (keep the function
itself — still used internally).

## `services/study-submission-service.js`

Revert `syncModerationItemStatus` to its original no-return-value, no-reason-param form. Delete
`logStudyAuditAction`. In `approveSubmission`/`rejectSubmission`/`setVerification`, remove the
`logStudyAuditAction(...)` fallback calls and the `mirrored`/audit-related lines.

## `app-admin.js`

- Delete the reason-prompt overlay block (`adminReasonPrompt` state + `adminOpenReasonPrompt`/
  `adminCloseReasonPrompt`/`adminSubmitReasonPrompt`/`adminReasonPromptHtml`).
- Delete `adminLogAuditAction`, `adminResolvePostScope`, `adminResolveMapScope`.
- Revert `adminToggleHidden`/`adminApplyCommunityHide` to the original single-function toggle (no
  reason, no audit).
- Revert `adminDeleteNote` to its native `confirm()` form.
- Revert `adminToggleMapHidden`/`adminApplyMapHide` to the original single-function toggle.
- Revert `adminDeleteMapNote` to its native `confirm()` form.
- Remove `"audit"` from both `adminState.sourceType` whitelists (the one in `renderAdmin()` and the
  one in `adminSetSource()`) and the `adminState.audit*` fields from the initial `adminState` object.
- Remove the `dashLink("audit", ...)` line from `adminSidebarNavHtml()`.
- Remove `${adminReasonPromptHtml()}` from the Community/Map shell template's closing.

## `app-admin-dashboard.js`

- Remove `if (adminState.sourceType === "audit") return renderAdminAuditView(container);` — wait,
  that line lives in `app-admin.js`'s `renderAdmin()`, already covered above.
- Delete the entire "--- Audit (ADMIN-V2-004) ---" section (from `ADMIN_AUDIT_ACTION_KEYS` through
  `renderAdminAuditView`).
- Remove the Escalate button + `adminDashboardEscalate` function from the Queue row / below
  `adminDashboardReview`.
- Remove `${adminReasonPromptHtml()}` from `renderAdminDashboardShell`.

## `app-study-admin.js`

Remove `${adminReasonPromptHtml()}` from `renderAdminStudyPanel`'s closing template.

## `style-admin.css`

Remove the `.admin-reason-overlay`/`.admin-reason-card`/`.admin-audit-filters` block and its two
small `@media` overrides.

## `i18n/locales/{en,ms,zh}.js`

Delete every `"admin.reason.*"` and `"admin.audit.*"` key.

## Test files

Revert `scripts/test-admin-moderation-schema.mjs` and `scripts/test-admin-dashboard.mjs`: every
`updateModerationStatus(..., 'hidden'|'rejected'|'escalated', ...)` call goes back to 3 args (no
`{reason}`), and drop the new reason-required-throws assertions. Revert
`scripts/test-study-upload.mjs`'s `files` array to the original 3 entries (drop
`moderation-service.js`/`admin-audit-service.js`) and drop the 5 new `ADMIN-V2-004:` assertions.

## Verification after rollback

```
node scripts/test-admin-role-scope.mjs        # must read 85 passed, 0 failed
node scripts/test-admin-moderation-schema.mjs # must read 105 passed, 0 failed (003A baseline)
node scripts/test-admin-dashboard.mjs         # must read 52 passed, 0 failed (003A baseline)
node scripts/test-study-upload.mjs            # must read 49 passed, 0 failed (pre-004 baseline)
```
