# ROLLBACK — ADMIN-V2-006

Target specific hunks below, not whole-file restores.

## `services/study-submission-service.js`

Delete `reconcileStudyModerationState()` entirely and its export line in the
`window.StudyUploadService` object. In `approveSubmission`'s "no mirror" fallback branch, remove
the `reason:` field from the `ms.createModerationItem({...})` call this stage added.

## `app-study-admin.js`

Remove the `adminStudyReconciled` state var and `adminStudyEnsureReconciled()` function, and the
`adminStudyEnsureReconciled();` call at the top of `renderAdminStudyPanel`.

## `scripts/test-study-upload.mjs`

Delete the entire "--- ADMIN-V2-006: reconcileStudyModerationState() ---" block (11 assertions,
clearly delimited by that comment, right before the final `console.log` summary).

## Verification after rollback

```
node scripts/test-study-upload.mjs   # must read 54 passed, 0 failed (ADMIN-V2-005 baseline)
```
All other suites (`test-admin-role-scope.mjs`, `test-admin-moderation-schema.mjs`,
`test-admin-dashboard.mjs`, `test-admin-audit.mjs`, `test-admin-college-scope.mjs`) are untouched
by this stage and need no rollback.
