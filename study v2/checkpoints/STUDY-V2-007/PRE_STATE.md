# STUDY-V2-007 — Pre-State Investigation

## Storage architecture (investigated before writing any Upload UI)

- **No backend, no API server, no Supabase.** `CLAUDE.md` confirms: "no framework and no
  package manager... no bundler and no test runner." The entire app is static HTML/CSS/vanilla
  JS served via `python -m http.server`. Deployment is a GitHub Pages static unzip
  (`.github/workflows/deploy-pages.yml`).
- **Existing persistence is 100% client-side**: LocalStorage for users/session/notes/preferences
  (see `CLAUDE.md`'s Persistence section). `services/map-note-service.js` is the closest prior
  art for a provider-swappable async service (`ready()/list()/create()/setHidden()/delete()/
  subscribe()/useProvider()` pattern) — it currently backs onto LocalStorage + an in-memory
  aggregation, not IndexedDB, but the *shape* of the abstraction (a `provider` object satisfying
  `REQUIRED_METHODS`, swappable via `useProvider()`) is exactly the adapter pattern this stage's
  spec asks for, so STUDY-V2-007 mirrors it rather than inventing a new pattern.
- **Conclusion**: this is case B in the task's own decision tree — a pure static competition
  build with no real upload backend. Per the task's explicit instruction, upload storage uses
  **IndexedDB** as the "Competition Demo Upload Storage", behind a provider-swappable adapter
  (`StudyUploadService`, `services/study-submission-service.js`) — never LocalStorage/base64 for
  the PDF blob itself.

## Auth / permission architecture (existing, reused unchanged)

- `services/auth-service.js`: `AuthService.isAuthenticated()`, `AuthService.getCurrentUser()`,
  `AuthService.isCurrentUserAdmin()` (role `"admin"` derived from a fixed email allowlist,
  `PROTOTYPE_ADMIN_EMAILS`). No separate "Study Moderator" role exists anywhere in the codebase.
- `services/permission-service.js`: `PermissionService.canUserPost/canUserComment` are simple
  "any signed-in user" checks; `getUserModerationScope()` already distinguishes `{scope:"global"}`
  (the one real admin tier) from a not-yet-real `{scope:"college"}` tier reachable only via
  constructed user objects, not a real account.
- **Decision**: Upload requires `AuthService.isAuthenticated()` (Guest = read-only, matches the
  spec). Study Moderation requires `AuthService.isCurrentUserAdmin()` — same Global Admin tier
  every other admin panel in this app already uses. No new role/account system was built; a
  "Study Moderator" sub-role does not exist yet and is out of scope (would need a real backend to
  assign per-user moderation scopes safely — front-end-only role assignment is not a security
  boundary, per `services/permission-service.js`'s own header comment).

## Manifest / demo-file architecture (regression-protected, read but not modified)

- `data/study-resource-manifest.js`: 2468-item `Object.freeze`d array, `window.STUDY_RESOURCE_MANIFEST`.
  Every item's exact field set recorded here for the new Submission model to match:
  `id, title, jurusan, semester, subjectCode, resourceType, resourceSubtype, topic, yearStart,
  yearEnd, examSessionLabel, sourceCollege, sourceType, contributorUserId, fileId, language,
  description, relatedResourceId, resourceGroupId, moderationStatus, verificationStatus,
  reviewStatus, parseWarnings, sourceBatch, sourceRelativePath, isDuplicate,
  duplicateOfResourceId, createdAt, updatedAt, fileUrl, demoAvailable`.
- `services/study-resource-service.js`: pure read/query IIFE, exposes a frozen
  `window.StudyResourceService`. `getManifest()` (private) is the ONE place every query function
  reads from. `isPublishable()` = `reviewStatus === "auto_parsed" && moderationStatus !== "rejected"
  && !isDuplicate`.
- `assets/study-files/`: 377 real files, named `<resourceId>.<ext>`, verified present and
  untouched (see Testing baseline below).

## Test baseline (captured before any STUDY-V2-007 edit)

```
node --check app-study.js                        -> OK
node --check services/study-resource-service.js  -> OK
find assets/study-files -type f | wc -l           -> 377
grep -c '"demoAvailable":true' data/study-resource-manifest.js -> 377
```

Route table before this stage (`app-router.js`): `#/study/upload` already exists and maps to
`page:"study-upload"` -> `renderStudyUploadShell()`, which currently renders only
`study.upload.comingSoon`. This route/page wiring is REUSED as-is — this stage does not touch
`app-router.js`.

## Plan (recorded before implementation, so ROLLBACK.md can be written against it)

1. New file `services/study-submission-service.js` — IndexedDB-backed `StudyUploadStorageAdapter`
   provider + `window.StudyUploadService` (ready/subscribe/list/create/approve/reject/setVerification/
   getFileBlob/getApprovedResourcesSync/...), mirroring `MapNoteService`'s provider-swap pattern.
2. `services/study-resource-service.js`: ONE-line-of-intent change — `getManifest()` now
   concatenates `window.StudyUploadService.getApprovedResourcesSync()` (approved-only) onto the
   built-in array. No other function in this file changes; every existing query (search, filter,
   publishable, resource-by-id, related-resource, file-url) automatically includes approved
   uploads for free, and pending/rejected submissions are structurally invisible (never in the
   overlay) without any extra "hide pending" filtering logic anywhere else.
3. `app-study.js`: replace `renderStudyUploadShell()`'s "coming soon" body with a real form;
   add a secondary "Upload Study Material" CTA on `#/study` (Study Home) below Search/Browse;
   add IndexedDB-file-open branch to the two existing file-open call sites
   (`studyResourceQuickOpenHtml`, `renderStudyResourceDetail`'s file-open block) — both keep
   calling `StudyResourceService.getResourceFileUrl()` exactly as before, only branching on an
   `indexeddb://` prefix.
4. `index.html`: one new `<script>` tag for `services/study-submission-service.js`, placed after
   `services/study-resource-service.js` and before `app-admin.js`.
5. `i18n/locales/{en,ms,zh}.js`: new `study.upload.*` keys.
6. `style-study.css`: minimal additions for the upload form + duplicate/permission banners
   (reusing existing `.form-group/.form-input/.form-select/.form-textarea` from `style-core.css`
   wherever possible, per the "don't invent a second design system" instinct already established
   in this module).
7. `scripts/test-study-upload.mjs` — persisted Node `vm`-sandbox direct-call test suite (this
   project has no test runner; prior stages' tests were ad hoc and not persisted — this stage
   persists its suite per the task's own instruction to stop relying on scattered/ephemeral tests).
