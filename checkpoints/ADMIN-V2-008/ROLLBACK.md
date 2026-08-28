# ROLLBACK — ADMIN-V2-008

Target specific hunks below, not whole-file restores.

## New files (delete entirely to roll back)

- `services/moderation-assist-service.js`
- `scripts/test-admin-moderation-assist.mjs`

## `index.html`

Remove `<script src="services/moderation-assist-service.js"></script>`.

## `services/moderation-service.js`

Delete `ensureAutoFlagModerationItem` entirely and remove it from the `window.ModerationService`
export object.

## `app-wall.js`

In `handleFormSubmit`, remove the `try { const evaluation = window.ModerationAssistService?...`
block that follows `notes.unshift(newNote); if (!saveNotes()) {...}`.

## `services/study-submission-service.js`

In `createSubmission`, revert to the original single `createModerationItem` call
(`source: 'submission'`, no `riskScore`/`reason` fields) and delete the `studyEvaluation` block
that now precedes it.

## `i18n/locales/{en,ms,zh}.js`

Revert `admin.dash.statFlaggedDesc` to its ADMIN-V2-003A text: "Auto-flagged (no auto_flag data
yet)" (en) / the equivalent ms/zh strings — only revert this if ADMIN-V2-008 is fully rolled back;
if only partially rolled back but auto_flag data can still be produced by something else, keep the
corrected copy.

## Verification after rollback

```
node scripts/test-admin-role-scope.mjs        # 85 passed, 0 failed
node scripts/test-admin-moderation-schema.mjs # 109 passed, 0 failed
node scripts/test-admin-dashboard.mjs         # 52 passed, 0 failed
node scripts/test-study-upload.mjs            # 65 passed, 0 failed (drop to the ADMIN-V2-006 baseline once the createSubmission hunk is reverted)
node scripts/test-admin-audit.mjs             # 58 passed, 0 failed
node scripts/test-admin-college-scope.mjs     # 45 passed, 0 failed
node scripts/test-admin-management.mjs        # 43 passed, 0 failed
```
