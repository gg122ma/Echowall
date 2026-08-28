# STUDY-V2-008 — Pre-state

Date: 2026-08-22

This checkpoint was completed by taking over the existing working tree. The Study Moderation implementation already existed; this stage performed verification and documentation only, with no application-code changes.

- `app-study-admin.js` supplies the Study Moderation panel and mutating actions.
- `app-admin.js` supplies the existing global-admin gate and dispatches the Study panel.
- `services/study-submission-service.js` owns submissions/files in IndexedDB.
- `services/study-resource-service.js` overlays approved submissions only onto the immutable built-in manifest.
- `style-admin.css` contains the reject/edit form layout rule: `.admin-study-edit-form, .admin-study-reject-form { grid-column:1/-1; ... }`.

Observed asset baseline: 377 files in `assets/study-files/`; 377 manifest entries are marked `demoAvailable:true`; no referenced demo file was missing.

Browser automation was unavailable in this session because the in-app browser bridge could not establish its trusted native connection. Per `AGENTS.md`, it was not retried. Browser-required acceptance checks therefore remain unverified.
