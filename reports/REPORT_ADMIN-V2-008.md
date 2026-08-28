# REPORT — ADMIN-V2-008: Auto Moderation Assist

Date: 2026-08-23
Status: **PASS**

Full detail: `checkpoints/ADMIN-V2-008/PRE_STATE.md` and `ROLLBACK.md`.

## Scope

Built on the locked ADMIN-V2-001 through 007 baseline. This is the final Admin V2 implementation
stage — ADMIN-V2-FINAL-QA follows next.

## What was built

1. **`services/moderation-assist-service.js`** (new) — deterministic, rule-based content
   evaluation. No external AI API is called (spec section 31 explicitly forbids it); every rule is
   a pure function of content already in memory:
   - **Community**: spam repetition (same author, same exact text, 3+ times), cross-author
     duplicate content, suspicious link-shortener domains (bit.ly, tinyurl.com, etc.), excessive
     link count (3+ URLs in one post), flood posting (5+ posts by the same author within 10
     minutes).
   - **Study**: missing required metadata (title/jurusan/semester/subjectCode/resourceType),
     missing or zero-byte file, exact/likely hash duplicate (reuses the EXISTING `duplicateStatus`
     field from ADMIN-V2-002's SHA-256 check — no hash is recomputed here).
2. **`ModerationService.ensureAutoFlagModerationItem()`** (new) — mirrors
   `ensureModerationItemForReport`'s exact "never spawn a second active queue case for the same
   content" dedupe shape; riskScore only ever moves toward the higher of two readings on a repeat
   flag, never lower.
3. **Wired into real content-creation paths**: `app-wall.js`'s `handleFormSubmit` (every new
   Community/Building post) and `services/study-submission-service.js`'s `createSubmission` (every
   new Study upload, evaluated BEFORE the ModerationService mirror is created so a flagged
   submission's mirror is correctly `source:"auto_flag"` from the start — see Real bug section).
   Both are best-effort: a broken evaluation logs to console and never blocks the real
   post/upload, which had already succeeded by the time evaluation runs.
4. **`riskScore` is sorting/priority metadata only** — nothing in this stage (or any prior stage)
   ever auto-transitions an item's `status` away from `pending` based on `riskScore`. An
   auto-flagged item is a completely ordinary `pending` `ModerationItem`; a human moderator reviews
   and decides through the exact same Approve/Reject/Hide flow (with ADMIN-V2-004's reason-required
   rules) as any reported or manually-created item — verified live (see Testing).
5. **Explainability**: every flagged evaluation carries `rulesTriggered` (which specific rule(s)
   fired) and a human-readable `reason` string built from them (e.g. `"Auto-flagged:
   suspicious_link_domain"`) — never a bare unexplained score.

## Real bug found and fixed during this stage's own work

- **Node `vm` sandbox has no `URL` global** (unlike a real browser's `window.URL`) — the new test
  suite's first run showed `isSuspiciousUrl()`'s link-shortener check silently failing (its own
  defensive try/catch was swallowing a `ReferenceError`), which would have hidden a real bug if it
  ever happened in production too. Fixed the TEST (added `URL` to the sandbox — the real browser
  runtime already has it, confirmed separately via live QA), and documented the finding so a
  future session doesn't rediscover it.
- **Stale Dashboard copy found during this stage's own browser QA**: `admin.dash.statFlaggedDesc`
  still read "(no auto_flag data yet)" — true when ADMIN-V2-003A wrote it, false as soon as this
  stage makes real auto_flag data possible. Fixed in all 3 languages.
- **Study auto-flag ordering bug caught during design, before it shipped**: evaluating AFTER
  creating the `source:"submission"` mirror would have made every Study auto-flag silently merge
  into that pre-existing item instead of registering as `source:"auto_flag"` — invisible to the
  Dashboard's Flagged stat. Caught by tracing the actual call order against
  `ensureAutoFlagModerationItem`'s dedupe logic before writing the wiring code, not discovered
  after the fact.

## Testing

- `node scripts/test-admin-role-scope.mjs` — **85 passed, 0 failed** (unchanged)
- `node scripts/test-admin-moderation-schema.mjs` — **109 passed, 0 failed** (unchanged)
- `node scripts/test-admin-dashboard.mjs` — **52 passed, 0 failed** (unchanged)
- `node scripts/test-study-upload.mjs` — **65 passed, 0 failed** (unchanged — the assist wiring in
  `createSubmission` is best-effort and the test sandbox doesn't load
  `moderation-assist-service.js`, confirming zero regression risk to existing Study flows even
  without assist active)
- `node scripts/test-admin-audit.mjs` — **58 passed, 0 failed** (unchanged)
- `node scripts/test-admin-college-scope.mjs` — **45 passed, 0 failed** (unchanged)
- `node scripts/test-admin-management.mjs` — **43 passed, 0 failed** (unchanged)
- `node scripts/test-admin-moderation-assist.mjs` — **34 passed, 0 failed** (new file): normal
  content never flagged; spam repetition, cross-author duplicate, suspicious link domain,
  excessive link count, and flood posting each independently flagged with the correct rule name in
  `rulesTriggered`; Study missing-metadata, missing/broken-file, and exact-hash-duplicate each
  flagged (a complete non-duplicate submission is NOT flagged); riskScore always finite,
  non-negative, and capped at 100 even with every signal firing at once; `applyAutoFlag` creates
  exactly one `pending`/`source:"auto_flag"` `ModerationItem` carrying the real riskScore and
  reason; a repeat evaluation of the same content reuses the same item (no duplicate active queue
  case); an unflagged evaluation creates nothing; permissions on an auto-flagged item are IDENTICAL
  to a reported one (Global Moderator sees it, KMK-only College Admin does not, Student/Guest fully
  denied); Reject on an auto-flagged item still requires a reason and still works normally (the
  auto-flag never bypasses ADMIN-V2-004's action rules)
- `node --check` on every modified/new `.js` file — clean
- **Real browser QA** (Chrome, `python -m http.server 8000`, real existing data): pushed a real
  note (`http://bit.ly/free-scholarship-now` in the content, matching the exact shape
  `handleFormSubmit` produces) into the live `notes` array and ran the SAME evaluation +
  `applyAutoFlag` call path the real form-submit handler uses — confirmed `evaluation.flagged:
  true`, `rulesTriggered: ["suspicious_link_domain"]`, `riskScore: 40`, and a real `ModerationItem`
  created with `source:"auto_flag"`, `status:"pending"` (not hidden/deleted — the note remained
  publicly visible throughout); switched to a real Super Admin view and confirmed the Dashboard
  Overview's "Flagged" stat correctly read **1** (previously always 0, since no real auto_flag data
  had ever existed); filtered the Unified Queue by Source="Auto flag" and confirmed the real row
  renders with correct badges (`PENDING`/`Community`/`Global`/`Auto flag`/`Risk 40`), the real
  flagged content text visible in the preview, and working Review/Escalate/Assign controls — no
  console errors during any of the above

## Modified Files

See `checkpoints/ADMIN-V2-008/PRE_STATE.md`'s "Files touched this stage" for full detail.

## Known Limitations

- Rules are intentionally simple/deterministic (spec explicitly prioritizes this over an external
  AI call) — they will not catch sophisticated spam that varies wording per post, uses non-URL
  contact info, etc. This is assist, not a spam-proof filter, matching the spec's own framing.
- The link-shortener domain list (`SUSPICIOUS_LINK_DOMAINS`) is a small, hardcoded set of common
  real-world shorteners — not exhaustive, and not configurable through any UI this stage.
- No Comment/Event auto-flag rules were built — Comment has no live moderation module in this app
  yet (unchanged since ADMIN-V2-002's "no canonical adapter" note), and no real Event feature
  exists (spec section 54 explicitly forbids fabricating one).
- Auto-flag evaluation runs synchronously and inline with post/upload creation — for a very large
  `notes` array, the cross-note checks (repetition/duplicate/flood) are O(n) per post; acceptable
  at this app's real data scale (tens to low hundreds of notes), not benchmarked further since no
  performance concern was observed or reported.
- Mobile viewport not visually verified (pre-existing tooling limitation, unchanged).
- Production security boundary unchanged — this remains prototype/front-end-only; a real deployment
  would likely move rule evaluation server-side (so a malicious client can't simply skip calling
  it), which this stage does not attempt.

## Next Step

ADMIN-V2-008 complete — all 6 remaining Admin V2 implementation stages (003A/004/005/006/007/008)
are now done. Proceeding to ADMIN-V2-FINAL-QA per the user's standing full-sequence authorization
for this task.
