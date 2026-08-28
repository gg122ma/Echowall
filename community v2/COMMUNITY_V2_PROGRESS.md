# EchoWall Community V2 — Progress

Unattended multi-stage run started and completed 2026-08-21, per user instruction to execute COM-V2-002 through COM-V2-008 continuously without per-stage confirmation. **All 8 stages PASSED.** See `reports/COMMUNITY_V2_FINAL_REPORT.md` for the compiled summary.

| Stage | Status | Report |
|---|---|---|
| COM-V2-001 — Community Registry + Post Compatibility | PASSED (prior session) | (see CHANGELOG/HANDOFF 2026-08-21 entries) |
| COM-V2-002 — Community Router + Hub | PASSED | `reports/REPORT_COM-V2-002.md` |
| COM-V2-003 — Global + College General Wall | PASSED | `reports/REPORT_COM-V2-003.md` |
| COM-V2-004 — Discussion / Question Post Type | PASSED | `reports/REPORT_COM-V2-004.md` |
| COM-V2-005 — Comments + One-Level Reply | PASSED | `reports/REPORT_COM-V2-005.md` |
| COM-V2-006 — Solved / Unanswered | PASSED | `reports/REPORT_COM-V2-006.md` |
| COM-V2-007 — Permission Hooks | PASSED | `reports/REPORT_COM-V2-007.md` |
| COM-V2-008 — Migration + Full Regression QA | PASSED | `reports/REPORT_COM-V2-008.md` |

## Current stable rollback point

COM-V2-008 (latest PASSED checkpoint — no code changes in this stage, so identical in practice to COM-V2-007's checkpoint). Each stage's own `checkpoints/COM-V2-00X/ROLLBACK.md` documents how to revert just that stage. Notable cross-stage dependencies: COM-V2-004's `.form-group[hidden]` CSS fix should generally survive even if COM-V2-004's feature work is reverted; COM-V2-003's rollback has a data-loss caveat if real Global/College General content exists by the time of rollback.

## Known issues carried forward (final state)

- Photo posting flow not click-tested this run — code path untouched by any Community V2 stage, risk near-zero, reported honestly as "not re-tested" (COM-V2-008).
- **No real College Admin account exists in this prototype** — `PermissionService.canUserModerateCommunity()`'s college-scoped branch is logic-verified only (direct function calls with constructed user objects), never exercised by a real signed-in account through the actual UI. `services/auth-service.js` was deliberately not modified to add this (would be a schema change beyond "hooks" scope) — noted for whoever eventually builds real per-college admin accounts.
- `renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` in `app-router.js` are dead code (unreachable since `#/org/:orgId` redirects to the new canonical route) — left in place deliberately to minimize touched surface area this run; candidate for a future cleanup task, not addressed in Community V2.
- Admin panel (`app-admin.js`, frozen this run) shows "Unknown" college for Global-scope posts — cosmetic only, `app-admin.js` deliberately not enhanced this run per its "keep functional, don't break" boundary.
- No comment moderation UI (hide/reject), no `acceptedCommentId` — both explicitly out of scope this phase.

## Resolved this run (no longer open)

- ~~BM language and a real mobile viewport not independently re-screenshotted~~ — fully closed out in COM-V2-008 (BM: Hub, Landing, Wall toolbar, Compose Post Type, Comments all screenshotted; Mobile: same surfaces, zero horizontal overflow confirmed programmatically).
- ~~System theme never explicitly tested~~ — verified in COM-V2-008.
- ~~Post (note) content XSS never explicitly tested this run~~ — verified in COM-V2-008 (Comment XSS was already tested in COM-V2-005).

- ~~New community notes transiently `schemaVersion:2` in memory until next reload~~ — fixed in COM-V2-003.
- ~~`[hidden]` silently defeated on `.form-group` elements~~ — found and fixed in COM-V2-004 (`.form-group[hidden]{display:none}` added to `style-core.css`); same class of bug previously seen in `map.html`'s `.building-search`/`.building-list`, now closed for `.form-group` too.
- ~~Comment count on sticky cards always 0~~ — fixed in COM-V2-005; now a live read from `CommentService.getCommentCount()`.
- ~~Questions could never be marked Solved~~ — fixed in COM-V2-006; full `open ⇄ solved` state machine with a permission-gated UI, `.is-solved` badge CSS (built in COM-V2-004) now actually reachable.
- ~~`canUserMarkSolved()`'s permission rule was coarse (global-admin-only, no college scoping)~~ — fixed in COM-V2-007; now unified in `services/permission-service.js` with a real college-moderator branch (verified via constructed user objects, since no real College Admin account exists — see Known issues above).
