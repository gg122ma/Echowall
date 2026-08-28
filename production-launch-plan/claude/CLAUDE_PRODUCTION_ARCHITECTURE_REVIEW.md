# Claude Production Architecture Review

> Independent planning document. Second opinion, for later cross-validation against a Codex-authored equivalent.
> Author: Claude Sonnet 5, High reasoning. Date: 2026-08-29.
> Status: **Planning only.** No application code, UI, data, or infrastructure was changed to produce this document. No Supabase/Cloudinary resources were created. No deployment occurred.
> Evidence basis: current local runtime/source in `EchoWall-Feature-Foundation/` (verified by direct source reading across 7 research passes covering every `app-*.js`, every `services/*.js`, `data/`, `config/`, `i18n/`, routing, and the deploy workflow), cross-checked against `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md` and `docs/BACKEND_INTEGRATION_READINESS.md` (both dated 2026-07-19 — treated as prior decisions to verify, not as current fact), and current official vendor documentation (GitHub Pages/Actions, Supabase, Cloudinary) as of 2026-08-28/29. Truth priority followed: **current runtime/source > current data > tests > old reports/docs.**

---

## 0. Correction to two "confirmed" facts in existing docs

Before anything else: two specific claims in the existing planning docs no longer match the repository and must be treated as stale.

1. **Hosting target repo.** `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §2.1` names the confirmed repo as `gg122ma/wall` (`https://gg122ma.github.io/wall/`). The actual current `git remote -v` in this checkout is **`https://github.com/gg122ma/e-wall.git`**, current branch **`main`**. Either the repo was renamed/replaced since July 19, or the July decision was never carried into this checkout. **This is a decision that needs re-confirmation from the project owner before any Pages/Supabase redirect URL is finalized** — see `CLAUDE_ARCHITECTURE_DECISIONS.md`.
2. **"No automated test suite" (CLAUDE.md / AGENTS.md).** This is now materially wrong. `scripts/test-*.mjs` (19 files, added 2026-08-22–24) is a real regression suite — hand-rolled Node `vm`-sandbox harness that loads unmodified real source and asserts against real rendered output/behavior, no mocks. Confirmed count: 8 admin-focused suites alone total 491 assertions; several hundred more across Community V2/seed/display-count suites. This changes the CI recommendation in `CLAUDE_GITHUB_RELEASE_OPERATIONS.md` — these scripts should be wired into CI, not reinvented.

Also newly discovered and load-bearing for this whole review: `.github/workflows/deploy-pages.yml` triggers only on `push: branches: ["master"]`, but the repository's actual current branch is `main`. **As configured today, a push to `main` would not trigger a deploy at all.** This is an existing, live operational gap, not something introduced by this plan.

---

## 1. What "production" actually replaces (accurate current-state summary)

Echo Wall is a single-page, hash-routed, vanilla-JS static app with two HTML entry points (`index.html`, `map.html`) and zero build step. Every "backend" concept today is a browser-global service backed by LocalStorage (or, for Study uploads, IndexedDB), almost all of them already built as **swappable provider interfaces** (`ready()/list()/create()/subscribe()/useProvider()`) — this is the single most important architectural fact for this whole plan: **the prototype was already written to be swapped, not just refactored.** Concretely:

| Concern | Current owner | Storage |
|---|---|---|
| Notes (community + building) | `app-data.js` (`EchoNoteStore`), `app-wall.js` | `echo-wall-notes` |
| Comments/replies | `services/comment-service.js` | `echo-wall-comments:v1` |
| Community scoping (`global:all` / `college:{orgId}` / `jurusan:{orgId}:{majorId}`) | `services/community-service.js` | derived, no separate store |
| Votes | `app-wall.js::voteNote()` | single `userVote` field on the note object — **no per-user vote table exists anywhere** |
| Map notes / anchors | `services/map-note-service.js` | `echowall_map_note_anchors_v1` (live) + `echowall_map_notes` (legacy, read-only now) |
| Study resources (built-in) | `data/study-resource-manifest.js` (generated, static) | static file, ~2468 catalog entries, 377 with real files under `assets/study-files/` (369 MB) |
| Study uploads | `services/study-submission-service.js` | **IndexedDB** `echowall-study-uploads-v1` (submissions + file blobs, SHA-256 keyed) |
| Auth | `services/auth-service.js` | `echo-wall-users:v1`, `echo-wall-user-session:v1` — SHA-256 client-hashed passwords, no session expiry |
| Roles/permissions | `services/admin-permission-service.js`, `services/permission-service.js` | `echo-wall-role-assignments:v1` + **two hardcoded admin emails in source** (see §9, and `CLAUDE_DATA_AUTH_RLS_REVIEW.md §3`) |
| Moderation queue | `services/moderation-service.js` | `echo-wall-moderation-items:v1`, `echo-wall-moderation-reports:v1` |
| Audit log | `services/admin-audit-service.js` | `echo-wall-audit-actions:v1` |
| Auto-flagging | `services/moderation-assist-service.js` | rule-based only, writes into the moderation queue, never auto-acts |
| Media | `services/cloudinary-adapter.js` | unconfigured (`cloudName`/`signatureEndpoint` both empty) → falls back to embedding a Data URL in the note |
| i18n / theme | `i18n/*`, `services/theme-service.js` | `echo-wall-language:v1`, `echo-wall-theme:v1` — **zero backend dependency, lowest-risk subsystem in the app** |

Production replaces the storage layer underneath every one of these interfaces and adds real authorization (RLS) behind the ones that currently self-describe as "not a security boundary." It does **not** need to replace the interfaces themselves in most cases — see `CLAUDE_INTERFACE_GOVERNANCE.md`.

---

## 2. Target architecture

```text
GitHub Pages (static: index.html, map.html, css, js, config/, data/, i18n/, services/, features/, assets)
  |
  |-- browser-safe Supabase client (URL + publishable key only, no secret)
  |     |-- Supabase Auth (email+password, PKCE)
  |     |-- PostgreSQL via PostgREST, gated by RLS (direct reads; RPC for transactional writes)
  |     |-- Supabase Storage (Study PDFs only — see CLAUDE_MEDIA_STORAGE_STRATEGY.md)
  |     |-- Supabase Edge Functions (Deno, JWT-verified)
  |           |-- cloudinary-sign   (issues short-lived signed upload params)
  |           |-- cloudinary-delete (authorized rollback/orphan cleanup)
  |
  |-- direct browser -> Cloudinary upload (compressed blob, signed params from the Edge Function above)
  |     Cloudinary needs no CORS config on its side for this (see research: it echoes Origin automatically);
  |     the security boundary is entirely "who can obtain a valid signature," not CORS.
```

Static reference data (organizations, majors, `data/campus-buildings.js`, `data/campus-building-hours.js`, `data/campus-map-config.js`, `data/study-subjects.js`, the generated `data/study-resource-manifest.js` metadata) **stays a frontend-owned static snapshot**, exactly as `CLAUDE.md` already mandates for the KMK Digital Twin relationship. Nothing in this plan proposes moving that into Postgres as live-editable data; the database only needs to *validate* that submitted `orgId`/`majorId`/`placeId`/`jurusan`/`semester`/`subjectCode` values are within the known static set (a check constraint or lookup table, not a live-editable copy — see `CLAUDE_DATA_AUTH_RLS_REVIEW.md §2.3`).

### 2.1 Why not a framework rewrite

No concrete production blocker requires React/Vue/TypeScript/a bundler. The prototype's biggest asset for this migration is that most dynamic subsystems were *already* isolated behind swappable provider objects before this task began (`MapNoteService`, `StudyUploadService`, `ModerationService`, `AdminPermissionService`, `AdminAuditService` all expose `useProvider()`). A framework rewrite would throw away that isolation for no measurable production benefit and would itself become the largest parity risk in the whole project. **Recommendation: do not rewrite.** Vanilla JS + hash router stays.

### 2.2 Why the "adapter-first" integration option (not direct-in-UI, not a custom server)

`docs/BACKEND_INTEGRATION_READINESS.md §3.1` already evaluated this and reached the right conclusion in July; nothing found in the newer source changes that conclusion — if anything, the newer services (Admin V2, Community V2, Study V2) *reinforce* it, because they were built as isolated adapters from day one specifically so a real backend could be dropped in later. Reusing that precedent:

| Option | Verdict |
|---|---|
| Direct Supabase calls inside `app-wall.js`/`app-admin.js` | **Reject** — couples UI to vendor + schema, breaks the existing provider pattern the codebase already committed to |
| Adapter-first (new `NoteService`, `AuthService` swap, `CommentService`/`MapNoteService`/`StudyUploadService`/`ModerationService`/`AdminPermissionService`/`AdminAuditService` internals swapped via their existing `useProvider()` hooks) | **Recommended** |
| Custom application server | **Reject** — no concrete requirement Supabase can't satisfy; would be the single biggest new attack surface and ops burden in the project |

---

## 3. Product-parity architecture matrix

See `CLAUDE_PARITY_RISK_AND_GO_LIVE.md §1` for the full 25-row matrix (current implementation → production replacement → visible change? → risk → mitigation) covering Home, Auth/Profile, Echo Map, Building Detail, Building Wall, Map Direct Posting, All KM/College/Jurusan, post composer, Discussion, Question, Comment, Reply, Solved/Reopen, Vote, photos, Echo Library, real files, Question/Scheme, Study upload, Ask Echo, Language, Theme, responsive, keyboard. It is kept in that file rather than duplicated here because parity is that document's single organizing concern; this document focuses on architecture and this section only summarizes the *shape* of parity risk by subsystem:

- **Near-zero risk, no backend dependency:** i18n, theme, hash routing, KMK Echo Map rendering, non-KMK "framework preview" empty states, Study jurusan→semester→subject navigation UI.
- **Low risk, mechanical swap:** Auth (interface unchanged, only internals swap), Cloudinary adapter (already shaped correctly for signed upload), comments/replies (schema is already close to final).
- **Moderate risk, real behavior change required:** Voting (must move from a single unkeyed `userVote` scalar to a real per-user, per-post unique constraint with server-side toggle logic — the biggest genuine behavior change in the whole migration, not just an RLS wrapper), Study upload storage (IndexedDB → Supabase Storage/Postgres), seed/demo data separation (no `is_seed` field exists today).
- **Pre-existing gap, not introduced by this migration:** Echo Library "real files" almost certainly do not work on the *current* live deployment at all — `assets/study-files/` is 369 MB but the actual deploy artifact is `EchoWall-portable-demo-v1.zip` at 6.17 MB, which is very unlikely to include it. This must be verified (open the zip) before claiming any regression; if confirmed, production fixes a bug rather than the reverse.

---

## 4. Domain model / schema direction (summary — full detail in `CLAUDE_DATA_AUTH_RLS_REVIEW.md`)

Key resolutions, driven by verified current source (not the stale July doc):

1. **Posts are one unified table**, not four. `contextType: 'community'|'building'` plus `postType: 'discussion'|'question'` plus a derived `communityKey` (`global:all` / `college:{orgId}` / `jurusan:{orgId}:{majorId}`) exactly mirrors `services/community-service.js`'s existing model — this is not a new design, it's porting a design the prototype already settled on 2026-08-21. Building posts require `placeId` and no community fields; community posts require exactly one of the three `communityKey` shapes and no `placeId`. Enforce with a `CHECK` constraint mirroring `EchoNoteStore`'s existing client-side validation.
2. **Comments are a separate table**, one-level only, enforced by `CHECK (depth IN (0,1))` plus a trigger/RPC guard equivalent to `comment-service.js`'s `parent.depth >= 1` throw (the current code enforces this in both the data layer and the UI layer — production should keep both: DB constraint as the real boundary, UI check for good error messaging).
3. **Votes need a genuinely new table** — `note_votes(note_id, user_id, value, updated_at)`, unique `(note_id, user_id)`, `value IN (-1,1)` — because none exists today (confirmed by two independent source-verification passes: only a single unkeyed `userVote` scalar exists). This is real new design work, not a lift-and-shift.
4. **`questionStatus`/Solved-Reopen** stays a field on the post row; **no `acceptedCommentId`** — confirmed explicitly out of scope by the prototype's own `community v2/reports/REPORT_COM-V2-006.md`, so production should not invent it unless the user asks.
5. **Map notes are not a separate content type** — `MapNoteService` already unifies "map direct posting" into a normal building-context post plus a `(note_id, lat, lng)` anchor row. Production should keep exactly this shape: one `posts` table + one `map_note_anchors` table, not a parallel notes system. The legacy `echowall_map_notes` "direct pins" store is frozen (no more creates) and is a one-time migration/archive decision, matching `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §2.5/§3.1`.
6. **Study**: `study_resources` (built-in catalog, effectively read-only reference data) + `study_submissions` (user uploads, full moderation lifecycle) + a nullable self-referencing `related_resource_id`/`resource_group_id` pair reproducing the verified two-way Question↔Scheme linking behavior (`StudyUploadService.linkRelatedIfSubmission()`), including the confirmed edge case where a pending submission can link to another pending submission before either is approved.
7. **Admin/moderation/audit**: the prototype's `RoleAssignment`/`ModerationItem`/`AuditAction` shapes are already schema-ready — see `CLAUDE_DATA_AUTH_RLS_REVIEW.md §4` and `CLAUDE_ARCHITECTURE_DECISIONS.md` for the full enum/table port. This is the strongest "reuse the prototype's design" opportunity in the entire project: the JS objects were deliberately modeled on a future `user_roles`/`moderation_items`/`audit_actions` schema, down to field names.

---

## 5. Realtime decision

**Do not enable Realtime at launch for anything.** Evaluated against the current product's actual interaction model (page-load/action-triggered re-render, no live multi-user presence anywhere in the current UI):

| Surface | Classification | Reasoning |
|---|---|---|
| Posts, comments, votes, solved state | No realtime | Current UX is refresh/re-render on the acting user's own action; no existing UI shows another user's post appearing live. Adding it would be a new, unrequested UI feature, which the task explicitly forbids ("do not invent new live UI features"). |
| Moderation queue | No realtime at launch; **useful** later for multi-moderator collision avoidance | Only relevant once more than one admin account is concurrently moderating; not needed for `PUBLIC PRODUCTION STABLE`. |
| Study upload/approval status | No realtime | Current UX is "check back later," matches a polling/reload model already in place. |

If the user later wants Realtime, `CLAUDE_DATA_AUTH_RLS_REVIEW.md §Realtime notes` records that Realtime respects RLS automatically once a table has RLS + a matching `SELECT` policy, and requires explicit `ALTER PUBLICATION supabase_realtime ADD TABLE ...` — so it can be turned on later without a schema redesign, provided RLS is done correctly from day one.

---

## 6. Admin (deferred, contracts reserved)

Per the task's constraint, the Admin UI itself is postponed until `PUBLIC PRODUCTION STABLE`. The backend, however, should be built to support it from day one, because the prototype's Admin V2 layer is a genuinely complete design (roles: `SUPER_ADMIN`, `GLOBAL_MODERATOR`, `COLLEGE_ADMIN`, `STUDY_MODERATOR`, `CONTENT_REVIEWER`; scopes: `global`/`college`/`study`/`system`; permissions enum; a `ModerationItem` state machine with `pending⇄escalated→approved/rejected/hidden`; an append-only-by-convention audit log with snapshot redaction). See `CLAUDE_DATA_AUTH_RLS_REVIEW.md §4` for the RLS-ready port of this model, and `CLAUDE_ARCHITECTURE_DECISIONS.md` for the explicit decision that **the two hardcoded admin emails found in source must never seed production `user_roles`** — a fresh, deliberate first-admin process is required (open decision — see that file).

---

## 7. Cross-references

- Schema, RLS, Auth parity, seed/demo separation → `CLAUDE_DATA_AUTH_RLS_REVIEW.md`
- Cloudinary compression/signing, Study file storage decision → `CLAUDE_MEDIA_STORAGE_STRATEGY.md`
- Repository interfaces, external call registry, failure-mode design → `CLAUDE_INTERFACE_GOVERNANCE.md`
- GitHub Pages/Actions specifics, cost/ops plan, migration sequence → `CLAUDE_GITHUB_RELEASE_OPERATIONS.md`
- Full parity matrix, top risks, acceptance criteria → `CLAUDE_PARITY_RISK_AND_GO_LIVE.md`
- Decision log / open decisions needing user approval → `CLAUDE_ARCHITECTURE_DECISIONS.md`
