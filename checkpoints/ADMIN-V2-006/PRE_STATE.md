# PRE_STATE — ADMIN-V2-006 (Study Moderation V2 Integration)

Date: 2026-08-23

Builds on the locked ADMIN-V2-001 through 005 baseline. Hunk-level before/after per CLAUDE.md.

## Audit findings (before writing any code)

- **Study Notes moderation is already functionally complete** — re-read `app-study-admin.js` in
  full and confirmed the review form (`adminStudyEditFormHtml`) ALREADY shows every field spec
  section 18 requires: Title, Jurusan, Semester, Subject, Resource Type, Subtype, Topic, Year
  (start/end), Exam Session, Source College, Source Type, Description, Related Question/Scheme,
  plus Verification (`adminStudyVerifySelectHtml`) and Duplicate status
  (`adminStudyDuplicateBadge`) shown on the row, and "Open file" (`adminStudyOpenFile`). Confirmed
  no rewrite was needed here, per the spec's own explicit instruction not to rebuild what already
  works.
- **`SUPER_ADMIN`/`STUDY_MODERATOR` → Study; everyone else denied** — already correct
  (`requireStudyModerationAccess`, unchanged since ADMIN-V2-001).
- **Approve ≠ verified_file already correctly separate actions** — `approveSubmission` never
  touches `verificationStatus`; `setVerification` is a distinct explicit action. Unchanged.
- **The real remaining gap**: the ModerationService mirror
  (`syncModerationItemStatus`, added ADMIN-V2-002, extended with AuditAction logging in
  ADMIN-V2-004) is deliberately best-effort — its own comment says a mirror failure "must never
  block a real upload/decision". This means drift between StudyUploadService's real
  `moderationStatus` and the mirrored `ModerationItem.status` IS possible (a missing mirror for
  pre-002 submissions, or any swallowed exception at approve/reject time) with no existing repair
  path — exactly the gap spec section 19's "建立 safe reconciliation mechanism (reconcileStudyModerationState())"
  names explicitly.
- **SHA-256 exact-duplicate blocking is real and unchanged** — re-confirmed by reading
  `computeFileHash`/`findDuplicate`/`approveSubmission`'s defensive re-check; not touched this
  stage.
- **No PDF bytes in LocalStorage/base64 anywhere, confirmed unchanged** — `services/
  study-submission-service.js`'s header INVARIANT comment and IndexedDB-only blob storage were not
  touched. Audit snapshots for Study actions (`logStudyAuditAction`, ADMIN-V2-004) only ever pass
  small metadata objects (`moderationStatus`, `verificationStatus`), never file bytes/blob objects
  — re-confirmed by reading every call site again this stage.

## Files touched this stage

- `services/study-submission-service.js` — new `reconcileStudyModerationState()` (Study-Moderator-
  or-Super-Admin-gated via the existing `requireModerator()`, idempotent, StudyUploadService's own
  `moderationStatus` is always authoritative over the mirror); `logStudyAuditAction`'s reject-path
  fallback in `approveSubmission`'s "no mirror" branch — a real bug fix found by this stage's own
  new tests: the newly-created mirror's `reason` field was never populated for a reconciled
  rejected submission (fixed by passing `reason` through `createModerationItem`)
- `app-study-admin.js` — `renderAdminStudyPanel` now calls a new
  `adminStudyEnsureReconciled()` once per admin-panel session (idempotent, best-effort, never blocks
  the panel on failure)
- `scripts/test-study-upload.mjs` — 11 new `ADMIN-V2-006:` assertions (drift correction, idempotency,
  missing-mirror creation with the correct reason, non-moderator denial) — extends the existing file
  rather than creating a new one, since it already has the real IndexedDB+ModerationService+
  AdminAuditService sandbox this needs (per spec section 22's "允许不建立重复 test file，但必须有
  persistent coverage")
