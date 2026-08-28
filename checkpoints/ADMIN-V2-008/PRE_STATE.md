# PRE_STATE — ADMIN-V2-008 (Auto Moderation Assist)

Date: 2026-08-23

Builds on the locked ADMIN-V2-001 through 007 baseline. Hunk-level before/after per CLAUDE.md.

## Audit findings (before writing any code)

- **No auto-moderation/assist mechanism existed anywhere** — `ModerationService.SOURCES` already
  included `"auto_flag"` as a valid value (defined since ADMIN-V2-002, contract-only, never
  produced by any real code path). Confirmed by grepping the whole codebase for `auto_flag` before
  writing anything: only referenced in the enum definition and the Dashboard's (already-honest)
  "Flagged" stat card, which correctly showed 0 with real, non-fabricated data.
- **`listModerationItems()` has no `contentId` filter parameter** (only `listReports()` does) —
  discovered while writing this stage's own test suite (an assertion using
  `{contentType, contentId}` silently ignored the `contentId` key and passed by coincidence);
  documented in the test file itself and worked around by filtering client-side in the test,
  rather than quietly changing `listModerationItems`'s contract this late without a clear
  requirement to do so.
- Re-read `services/moderation-service.js`'s existing `ensureModerationItemForReport` (the
  "report != duplicate queue case" dedupe pattern from ADMIN-V2-002) before designing this stage's
  own dedupe — confirmed the new `ensureAutoFlagModerationItem` should mirror that exact shape
  (find active item for contentType+contentId, reuse it if found) rather than inventing a
  different mechanism.
- Re-read `services/study-submission-service.js`'s `createSubmission()` mirror-creation point (the
  exact place a fresh `study_resource` ModerationItem is created) before deciding auto-flag
  evaluation must run BEFORE that mirror is created, not after — confirmed running it after would
  have made every Study auto-flag invisible to the Dashboard's `source==="auto_flag"` Flagged stat
  (the mirror already exists by then, so the dedupe path would silently absorb the flag into the
  existing `source:"submission"` item instead of creating a `source:"auto_flag"` one).

## Files touched this stage

- `services/moderation-assist-service.js` — **new file**: deterministic rule-based
  `evaluateCommunityPost(note, allNotes)` (spam repetition, cross-author duplicate content,
  suspicious link-shortener domains, excessive link count, flood posting) and
  `evaluateStudySubmission(submission)` (missing required metadata, missing/broken file, exact/
  likely hash duplicate — reusing the existing `duplicateStatus` field rather than recomputing a
  hash); `applyAutoFlag()` bridges an evaluation into `ModerationService.ensureAutoFlagModerationItem()`
- `services/moderation-service.js` — new `ensureAutoFlagModerationItem(input)`, mirroring
  `ensureModerationItemForReport`'s exact dedupe shape (never a second active queue case for the
  same content; riskScore only ever moves toward the higher reading); exported
- `app-wall.js` — `handleFormSubmit()` now evaluates every new Community/Building post after it
  publishes (best-effort, never blocks the real post)
- `services/study-submission-service.js` — `createSubmission()` now evaluates BEFORE creating its
  ModerationService mirror, so a flagged submission's mirror is correctly `source:"auto_flag"`
  from the start (not created-then-silently-merged)
- `index.html` — added `<script src="services/moderation-assist-service.js">` after
  admin-audit-service.js
- `i18n/locales/{en,ms,zh}.js` — fixed a real, now-stale piece of copy found during this stage's
  own browser QA: `admin.dash.statFlaggedDesc` said "(no auto_flag data yet)", written in
  ADMIN-V2-003A when that was still true; now that real auto_flag data can exist, updated to
  "Flagged by automatic rules, still needs human review" in all 3 languages
- `scripts/test-admin-moderation-assist.mjs` — **new file**: 34 assertions
