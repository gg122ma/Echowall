# PRE_STATE — ADMIN-V2-004 (Moderation Actions + Audit Trail)

Date: 2026-08-23

Builds on the locked ADMIN-V2-001/001A/002/002A/003/003A baseline. Per CLAUDE.md this documents
hunk-level before/after, not whole-file snapshots (the working tree carries unrelated uncommitted
work in these same files).

## Audit findings (before writing any code)

- **No unified Audit Trail existed at all.** `services/moderation-service.js`'s
  `updateModerationStatus()` silently accepted `hidden`/`rejected`/`escalated` transitions with NO
  reason requirement (only Study's own `rejectSubmission()` enforced a reason, and only inside
  `services/study-submission-service.js`, unrelated to ModerationService).
- **Community/Map moderation actions never touched ModerationService at all.**
  `app-admin.js`'s `adminToggleHidden`/`adminDeleteNote` (Community) and
  `adminToggleMapHidden`/`adminDeleteMapNote` (Map) mutate `notes`/`MapNoteService` directly with
  zero reason capture (Delete used a native `confirm()`; Hide had no confirmation or reason
  mechanism whatsoever) and zero audit trail of any kind.
- **Study already had 2 of 3 required pieces**: `rejectSubmission()` already required + stored a
  reason (`rejectionReason`, pre-existing, unmodified), and each Study record already carried its
  own lightweight `auditLog` array (`pushAudit()` — record-local, not a queryable cross-module
  trail). `approveSubmission()`/`rejectSubmission()` already best-effort-mirrored into
  `ModerationService.updateModerationStatus()` via `syncModerationItemStatus()` — this mirror is
  the hook this stage's AuditAction creation piggybacks on for Study.
- **No "Escalate" or generic Approve/Reject/Hide action existed anywhere in the UI** —
  `ModerationService.updateModerationStatus()` was previously reachable only via direct
  console/test calls and Study's best-effort sync. The Dashboard's Queue/History rows had only a
  "Review" button that navigates into the module workspace (`adminSetSource`), performing zero
  moderation action itself.
- Read `services/moderation-service.js`, `services/study-submission-service.js`, `app-admin.js`
  (all Community/Map action functions), `app-study-admin.js` (the existing reject-reason inline
  form, used as the UX pattern reference for the new shared reason-prompt modal) in full before
  writing any code.

## Files touched this stage

- `services/admin-audit-service.js` — **new file**: AuditAction CRUD, scope-gated reads (mirrors
  `moderation-service.js`'s scope logic including the `canModerateMap` map_note special-case),
  reason-required enforcement for reject/hide/escalate, snapshot sanitization (strips
  password/token/blob/base64-shaped-string fields, truncates long strings)
- `services/moderation-service.js` — `updateModerationStatus()` now requires a reason for
  `hidden`/`rejected`/`escalated` transitions and creates an AuditAction on every status change;
  `resolveContentScope` exported for reuse by `app-admin.js`
- `services/study-submission-service.js` — `approveSubmission`/`rejectSubmission`/`setVerification`
  now log a unified AuditAction (via the ModerationService mirror when it succeeds, or directly via
  new `logStudyAuditAction()` as a fallback when no mirrored ModerationItem exists — never both)
- `app-admin.js` — new shared reason-prompt overlay (`adminOpenReasonPrompt`/
  `adminCloseReasonPrompt`/`adminSubmitReasonPrompt`/`adminReasonPromptHtml`); Community
  Hide/Restore/Delete and Map Hide/Show/Delete rewritten to use it and log AuditActions; new Audit
  sidebar nav item + `audit` added to the `sourceType` router whitelist (twice — the outer gate list
  and `adminSetSource`'s own whitelist, a real bug caught during browser QA, see report)
- `app-admin-dashboard.js` — new `renderAdminAuditView` + supporting helpers (scope/action/target
  filters, actor search, date range); new "Escalate" button on Queue rows
  (`adminDashboardEscalate`) — the only Dashboard-driven action that writes through
  `ModerationService.updateModerationStatus` directly (a deliberate scope decision, see report)
- `app-study-admin.js` — injects the shared reason-prompt overlay into its own shell (for
  consistency; not currently triggered from that panel)
- `index.html` — added `<script src="services/admin-audit-service.js">` after moderation-service.js
- `style-admin.css` — `.admin-reason-overlay`/`.admin-reason-card` (mirrors `.auth-overlay`'s
  fixed/backdrop-blur pattern), `.admin-audit-filters` (6-column filter bar)
- `i18n/locales/{en,ms,zh}.js` — ~50 new `admin.reason.*`/`admin.audit.*` keys
- `scripts/test-admin-audit.mjs` — **new file**: 58 assertions for AdminAuditService's contract +
  ModerationService integration
- `scripts/test-admin-moderation-schema.mjs`, `scripts/test-admin-dashboard.mjs` — every existing
  `updateModerationStatus(..., 'hidden'|'rejected'|'escalated', ...)` call updated to pass a
  `{reason}`, plus new reason-required/denied assertions
- `scripts/test-study-upload.mjs` — sandbox now also loads the real `moderation-service.js` +
  `admin-audit-service.js` (previously silently no-op'd via optional chaining); new assertions
  confirm the real AuditAction integration for approve/reject/verify
