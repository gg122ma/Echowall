# REPORT — ADMIN-V2-006: Study Moderation V2 Integration

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-006/PRE_STATE.md` and `ROLLBACK.md`.

## Scope

Built on the locked ADMIN-V2-001 through 005 baseline. Per the spec's own explicit instruction,
Study Notes moderation was NOT rewritten — it was audited, confirmed already complete for nearly
every requirement, and the one real gap (safe reconciliation) was closed. ADMIN-V2-007 (Admin
Management), 008 (Moderation Assist) explicitly NOT started.

## What was audited and found already complete (no changes needed)

- Study review shows every required field: Title, Jurusan, Semester, Subject, Resource Type,
  Subtype, Topic, Year (start/end), Exam Session, Source College, Source Type, Description,
  Related Question/Scheme, Verification, Duplicate status — confirmed both by reading
  `adminStudyEditFormHtml`/`adminStudyVerifySelectHtml`/`adminStudyDuplicateBadge` and by real
  browser screenshots of the live form against real seed data (see Testing).
- Open actual PDF, Edit metadata, Approve, Reject, Verification status change — all pre-existing,
  all confirmed working.
- Approve ≠ verified_file — pre-existing, unchanged, confirmed still true by reading both functions.
- SHA-256 exact-duplicate blocking — pre-existing, unchanged.
- PDF bytes never in LocalStorage/base64, including in Audit snapshots (ADMIN-V2-004's
  `logStudyAuditAction` only ever passes small metadata objects) — re-confirmed by reading every
  call site again.

## What was built (the one real gap)

**`StudyUploadService.reconcileStudyModerationState()`** — a safe, idempotent repair path between
StudyUploadService's own `moderationStatus` (the real, authoritative source of truth per this
file's own header INVARIANT comment) and the best-effort `ModerationService` mirror
(`syncModerationItemStatus`, which by design "must never block a real upload/decision" — meaning
drift is a real, accepted possibility, not a bug in that function). For every cached submission:
creates a missing mirror (with the real status AND, for rejected submissions, the real
`rejectionReason`), or corrects a drifted mirror's status to match — StudyUploadService's status
always wins. Gated the same as every other Study moderation action
(`requireModerator()` → Super Admin or a real `STUDY_MODERATOR`). Wired to run once per admin-panel
session the first time the Study tab opens (`app-study-admin.js`'s `adminStudyEnsureReconciled`) —
not on every render, not blocking the panel if it fails.

## Real bug found and fixed during this stage's own testing

While writing the reconciliation test for the "missing mirror" case, discovered
`reconcileStudyModerationState`'s `createModerationItem` call for a newly-recreated mirror never
passed the submission's real `rejectionReason` through — the recreated `ModerationItem` would have
`reason: null` even for a rejected submission with a real, stored rejection reason. Fixed by adding
`reason: submission.moderationStatus === 'rejected' ? (submission.rejectionReason || null) : null`
to that `createModerationItem` call. Caught by the test itself failing on first run, not by manual
inspection.

## Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (unchanged)
- `node scripts/test-admin-moderation-schema.mjs` — **109 passed, 0 failed** (unchanged)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (unchanged)
- `node scripts/test-admin-audit.mjs` — **58 passed, 0 failed** (unchanged)
- `node scripts/test-admin-college-scope.mjs` — **45 passed, 0 failed** (unchanged)
- `node scripts/test-study-upload.mjs` — **65 passed, 0 failed** (was 54; +11 new
  `ADMIN-V2-006:` assertions): manually drifted a real mirrored `ModerationItem`'s status away from
  StudyUploadService's real status → reconcile corrects it back (StudyUploadService wins); a second
  reconcile call is a true no-op (idempotent); manually deleted a mirror entirely (simulating a
  pre-002 submission) → reconcile recreates it with the correct status AND the correct real
  rejection reason; a non-moderator (student) calling `reconcileStudyModerationState()` is denied
- `node --check` on every modified `.js` file — clean
- **Real browser QA** (Chrome, `python -m http.server 8000`, real existing seed data — 2 pending, 3
  approved, 1 rejected, 1 possible-duplicate submission): opened the Study tab as the real
  `mzteoh88@gmail.com` QA account; `reconcileStudyModerationState()` ran silently on panel load
  against real production-shaped data with zero console errors (confirmed via a fresh page load
  with console tracking armed from before load, not just checked after the fact); stat cards showed
  the correct real counts; clicked "Edit / Review" on a real pending submission and confirmed EVERY
  required field renders correctly with real data (Title/Jurusan/Semester/Subject Code/Resource
  Type/Subtype/Topic/Year start+end/Exam Session Label/Source College/Source Type/Related
  Resource/Description, plus the row's own Open file/Approve/Reject/Possible-duplicate badge) — did
  not click Approve/Reject/Save & Approve against this real pending item, to avoid mutating seed
  data already relied on by other stages' QA (unit-level coverage for these actions is extensive:
  65 assertions in `test-study-upload.mjs` alone)

## Modified Files

See `checkpoints/ADMIN-V2-006/PRE_STATE.md`'s "Files touched this stage" for full detail.

## Known Limitations

- Reconciliation is a data-repair mechanism, not a real-time sync — drift between an approve/reject
  action and the mirror being corrected is still possible for the window between a mirror failure
  and the next time `reconcileStudyModerationState()` runs (once per admin-panel session, on Study
  tab open). This matches the spec's own framing ("safe reconciliation mechanism", not "eliminate
  the possibility of drift").
- No new UI surfaces the reconciliation result (`{checked, created, updated, skipped}`) to the
  moderator — it runs silently. Given it's a background repair, not a user-initiated action, this
  was judged acceptable; a visible "Sync status" indicator would be a reasonable future addition but
  wasn't requested.
- Mobile viewport not visually verified (pre-existing tooling limitation, unchanged).
- Production security boundary unchanged (documented repeatedly in prior reports; still applies).

## Next Step

ADMIN-V2-006 complete. Proceeding to ADMIN-V2-007 (Admin Management) per the user's standing
full-sequence authorization for this task.
