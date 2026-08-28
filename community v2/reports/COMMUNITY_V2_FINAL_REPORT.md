# EchoWall Community V2 Final Report

## Overall Status

**PASS**

All 8 tasks (COM-V2-001 through COM-V2-008) completed and PASSED across one unattended run on 2026-08-21, per the user's explicit instruction to execute continuously without per-stage confirmation. No stage was rolled back. No blocking regression was ever found.

## Completed Checkpoints

| Task | Status | Report |
|---|---|---|
| COM-V2-001 — Community Registry + Post Compatibility | PASSED | (prior session; see CHANGELOG/HANDOFF 2026-08-21 entries) |
| COM-V2-002 — Community Router + Hub | PASSED | `reports/REPORT_COM-V2-002.md` |
| COM-V2-003 — Global + College General Wall | PASSED | `reports/REPORT_COM-V2-003.md` |
| COM-V2-004 — Discussion / Question Post Type | PASSED | `reports/REPORT_COM-V2-004.md` |
| COM-V2-005 — Comments + One-Level Reply | PASSED | `reports/REPORT_COM-V2-005.md` |
| COM-V2-006 — Solved / Unanswered | PASSED | `reports/REPORT_COM-V2-006.md` |
| COM-V2-007 — Permission Hooks | PASSED | `reports/REPORT_COM-V2-007.md` |
| COM-V2-008 — Migration + Full Regression QA | PASSED | `reports/REPORT_COM-V2-008.md` |

## Final Architecture

- **Global / College General / Jurusan** share one Sticky Wall renderer (`renderContextWall`/`renderWallNotes`/`buildNoteDOM`/`openModal`, all in `app-wall.js`) and one filtering mechanism (`wallState.communityKey` resolved via `CommunityService.getCommunityKeyForNote()`) — no per-scope duplication anywhere.
- **Community Registry**: `data/community-config.js` (`COMMUNITY_DESCRIPTORS`, generated from the pre-existing `organizations`/`majors`) + `services/community-service.js` (key helpers — `getCommunityKey`, `parseCommunityKey`, `isValidCommunityKey`, `getCommunityByKey`, `getCommunityPosts`, etc.).
- **Post V3**: every community note carries `schemaVersion:3`, `communityKey`, `communityScope`, `postType`, `questionStatus`, `moderationStatus`, `commentCount`, `updatedAt` — written directly at creation time (`handleFormSubmit`) since COM-V2-003, and backfilled non-destructively on read for legacy notes (`normalizeStoredNote()`, COM-V2-001). Building notes (`schemaVersion:2`) were never touched by any of this.
- **Comments**: `services/comment-service.js`, `echo-wall-comments:v1`, one-level replies enforced at the data layer, keyed purely by post `id` (scope-agnostic).
- **Question state machine**: `open ⇄ solved`, gated by `services/permission-service.js`'s unified `canUserPost`/`canUserComment`/`canUserMarkSolved`/`canUserModerateCommunity` hooks — explicitly documented as front-end gating only, not a security boundary.
- **Legacy compatibility**: `#/org/:orgId` and `#/wall/:orgId/:majorId` (both 3- and 4-part forms) redirect via `replaceState` to the new canonical routes, verified to cause no history pollution or redirect loops.

## Routes

```
#/community                                Community Hub
#/community/all                            Global Wall (All KM Students)
#/community/:orgId                         College Landing
#/community/:orgId/general                 College General Wall
#/community/:orgId/jurusan/:majorId        Jurusan Wall (canonical)

Legacy (redirect, replaceState, no history growth):
#/org/:orgId                        -> #/community/:orgId
#/wall/:orgId/:majorId              -> #/community/:orgId/jurusan/:majorId
#/wall/:orgId/:batchId/:majorId     -> #/community/:orgId/jurusan/:majorId (direct, one hop)
```

`#/org/:orgId/map`, `#/org/:orgId/buildings`, `#/org/:orgId/building/:buildingId` (the separate multi-college map/building framework) were never touched — confirmed unaffected throughout.

## Storage

```
echo-wall-notes            Community posts (V3) + Building notes (v2, untouched) — unchanged key, additive schema only
echo-wall-comments:v1      New this phase — Comment/Reply store, isolated by postId, independent of note storage
```

No destructive migration was ever run. No existing user data format changed in a breaking way.

## Full E2E Results

| Flow | Result |
|---|---|
| Global Discussion | ✅ Verified — scope-isolated (5-wall matrix, 15/15 correct) |
| Global Question → Comment → Mark Solved → SOLVED | ✅ Verified — full real-UI E2E with reload-persistence |
| College General (no Jurusan selection required) | ✅ Verified — real `orgId`, null `majorId`, no magic zero |
| Legacy Jurusan (old Seed Notes) | ✅ Verified — 81-note KMK→Sains baseline stable across all 8 stages |
| Anonymous (post + comment) | ✅ Verified — no nickname leak in storage or DOM |
| Photo | ⚠️ Not re-tested this run — code path untouched by any Community V2 stage (confirmed via review, not click-tested) |
| Translation | ✅ Verified — Translate button functional throughout |
| Comments (post-specific, one-level reply) | ✅ Verified — 2-post isolation, depth-2 rejection enforced at data layer |
| Solved / Unanswered filter | ✅ Verified — 3 live state transitions observed |

## Regression Results

| Area | Result |
|---|---|
| Desktop | ✅ Verified throughout |
| Mobile (390×844) | ✅ Verified — Hub, Landing, Wall, Compose, Modal, Comments, all no horizontal overflow |
| Light | ✅ Verified |
| Dark | ✅ Verified — full translation confirmed alongside |
| System | ✅ Verified (COM-V2-008) |
| EN | ✅ Verified (default, implicit throughout) |
| BM | ✅ Verified (COM-V2-008 — full pass, previously only partially spot-checked) |
| ZH | ✅ Verified extensively (COM-V2-001–007) |
| Echo Map | ✅ Verified clean — no Community V2 script/stylesheet loaded there, by design |
| Building Wall | ✅ Verified clean throughout |
| Building Detail | ✅ Verified clean (COM-V2-008) |
| Admin | ✅ Verified clean — 25 notes / 410 votes baseline never disturbed |
| Auth (sign-out/sign-in) | ✅ Verified (COM-V2-007) |

## Security

- **Post content escaping**: `escapeHtml()` — verified live with `<script>`/`<img onerror>`/`javascript:` payloads (COM-V2-008), rendered as literal text, no execution.
- **Comment content escaping**: same `escapeHtml()` helper — verified live (COM-V2-005), same result.
- **Permission checks**: 13-case matrix tested (COM-V2-007) — visitor/student/author/stranger/college-moderator/global-admin × post/comment/mark-solved/moderate-community, all correct. Explicitly documented as front-end-only, not a security boundary — real enforcement requires backend authorization before any production deployment.

## Remaining Issues

- Photo posting flow (Compose → Photo) not click-tested during this specific Community V2 run — code untouched by any of the 8 stages, so risk is assessed as near-zero, but this is reported honestly as "not re-tested" rather than "verified."
- No real College Admin account exists in this prototype — `canUserModerateCommunity()`'s college-scoped branch is logic-verified via constructed objects only, never exercised by a real signed-in account.
- `renderOrgDetails`/`selectMajorItem`/`enterWallCanvas`/`selectedMajor` (app-router.js) are dead code since COM-V2-002 — left in place deliberately, not deleted, to minimize touched surface area.
- Admin panel shows "Unknown" college for Global-scope posts — cosmetic only, `app-admin.js` was deliberately frozen (not enhanced) throughout Community V2 per its explicit "keep functional, don't break" boundary.
- No comment moderation UI (hide/reject) and no `acceptedCommentId` (accept-a-specific-answer) — both explicitly out of scope this phase.

## Deferred to Later Phase

Per the master spec's own explicit exclusions, none of the following were built, and none should be inferred as implicitly started:

- Real-time chat / WebSocket
- Direct Message / Private Message
- Followers / Following
- Personalized Feed / Recommendation Algorithm
- Push Notification / targeted question routing
- Infinite nested comments (only depth 0/1 exists, by design)
- Comment voting / reputation system
- Cross-college global Jurusan network
- Production Supabase/RLS migration (`docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md`'s target architecture is unchanged — this phase is still LocalStorage prototype)
- Full Admin moderation queue (Phase 5) — `moderationStatus`/`isHidden` fields exist and are respected by every read, but nothing in the UI can set them yet beyond the existing Building-note hide/delete in Admin

## Stable Rollback Point

**COM-V2-008** (this stage — no code changes, so effectively identical to COM-V2-007's checkpoint). Each stage's individual `community v2/checkpoints/COM-V2-00X/ROLLBACK.md` documents exactly how to revert only that stage, in order, with explicit cross-stage dependency notes (e.g. COM-V2-004's `.form-group[hidden]` CSS fix should generally survive even if COM-V2-004's feature work is reverted; COM-V2-003's rollback has a data-loss caveat if real Global/College General content exists by the time of rollback).
