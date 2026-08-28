# Claude Architecture Decisions

> Decision log for the production launch plan. Three categories: **Confirmed** (already decided by the owner in prior work, verified still applicable), **Recommended** (this review's proposal, not yet approved), **Open** (must be resolved by the owner before the relevant implementation stage — per `CLAUDE_GITHUB_RELEASE_OPERATIONS.md §4`, these are largely Stage 1 blockers).

---

## Confirmed (from `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md`, 2026-07-19 — verified still the owner's stated decision, though §1 below flags a conflict with current repo state)

1. Frontend hosting: GitHub Pages, project site.
2. Backend: exactly one online Supabase project (no separate staging project).
3. Auth method: Email + Password only, no OAuth.
4. Admin authorization: a protected `user_roles` table; never a frontend flag, LocalStorage value, or user-editable metadata.
5. Legacy note migration: one-time controlled migration, not continuous sync; `legacy_author_id`/`legacy_author_label` preserved as non-authoritative metadata; existing prototype passwords/sessions never migrated.
6. Legacy vote counters (`upvotes`/`downvotes` aggregates) preserved as `legacy_upvotes`/`legacy_downvotes`, never synthesized into fake per-user `note_votes` rows.
7. `echowall_map_notes` (legacy direct-pin store) kept separately identified, archive-vs-migrate decision still open (see below) — confirmed still accurate: verified via source that this store is now creation-disabled/read-only, consistent with an eventual archive decision.

---

## 1. OPEN — Hosting repo/URL conflict (blocks Stage 1 and 7)

**Finding:** `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §2.1` names the confirmed target as `gg122ma/wall` → `https://gg122ma.github.io/wall/`. The actual current `git remote -v` in this checkout is `https://github.com/gg122ma/e-wall.git`. These are different repository names.

**Why it matters:** the Supabase Auth Site URL/Redirect URL allowlist, the Cloudinary/Edge Function CORS allowlist, and the final Pages build path all depend on knowing the exact production URL. Proceeding on the wrong assumption would require reconfiguring all three later.

**Decision needed from owner:** which repository is actually the production target — `gg122ma/wall` (as previously confirmed) or `gg122ma/e-wall` (as currently checked out)? Or has the repo been intentionally renamed/replaced since July 19, making the July decision stale and needing a fresh confirmation?

**Related, smaller finding to fix regardless of the above:** `.github/workflows/deploy-pages.yml` triggers only on `push: branches: ["master"]`; the actual current branch is `main`. Fix this mismatch (either retarget the workflow to `main` or rename the branch) independent of the repo-name question.

---

## 2. OPEN — Initial administrator process (blocks Stage 1, referenced by master task §2.4, §9)

**Critical finding, verified via primary source in two independent passes:** the prototype currently hardcodes **two separate admin-granting emails**:
- `services/auth-service.js`: `PROTOTYPE_ADMIN_EMAILS` set, containing one entry.
- `services/admin-permission-service.js`: `SUPER_ADMIN_EMAIL` constant, a different single email — the file's own comment calls it "the ONLY place in the ENTIRE codebase this project hardcodes the super-admin email."

Both grant admin access purely by matching a signed-in user's email — no `user_roles` table backs either mechanism today.

**Why this must not simply be carried into production:** `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §5` already flagged "initial administrator email" and "first administrator authorization method" as explicitly unresolved and stated they "must not be guessed." The prototype's two hardcoded emails answer a *different* question (who has admin in the demo/prototype) than "who should be the first production admin" — they must not be assumed to be the same person or the same intended production owner without an explicit decision.

**Decision needed from owner:**
- Confirm the real production administrator's email (may or may not match either prototype-hardcoded email).
- Confirm the trusted one-time process for inserting that first `user_roles` row (e.g., a manual `SQL` insert run once by the project owner directly in the Supabase dashboard immediately after the schema migration, with no public-facing "become admin" path ever existing) — this document does not perform that insert or propose exposing any path to it from the application.
- Neither hardcoded email should be silently ported into the `user_roles` seed without this explicit confirmation.

---

## 3. OPEN — Email confirmation on/off (blocks Stage 3)

Restated from `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §2.3`/§5, still unresolved. This review's recommendation (not yet approved): **enable email confirmation** for standard abuse resistance, accepting the new "check your email" registration-UX state as a net-new capability rather than a parity break (the current prototype has no verification concept to preserve). Owner must approve or override.

---

## 4. OPEN — Session edit/delete-own-post policy

Not addressed by any existing doc and not implemented in current source (no self-delete/edit path found for posts). Needs an explicit decision: can authors edit or delete their own published posts, and within what time window, if any? `docs/BACKEND_INTEGRATION_READINESS.md §9.5` already flagged this as unresolved in July; still unresolved. Recommendation: match current behavior (no edit/delete) at launch, revisit later — lowest-risk choice, no new UI needed.

---

## 5. OPEN — Comment moderation write-path

**Finding:** `comment-service.js`'s schema already includes `moderationStatus` and `updatedAt` fields, but **no function anywhere writes to them** — no edit, no delete, no hide function exists for comments today, despite `moderation-service.js`'s `CONTENT_TYPES` already listing `"comment"` as a valid moderation target. This is a genuine, code-confirmed gap between the data model's apparent intent and what's actually wired up.

**Decision needed:** implement comment hide/moderate now (straightforward, since the moderation queue/RPC pattern already exists for other content types and would just need a comment-specific scope-resolution adapter), or explicitly defer and document the unused fields as reserved-for-later. Either is acceptable; leaving it undecided is not, since the schema currently implies a capability the product doesn't have.

---

## 6. OPEN — Frozen seed-post voting behavior

**Finding:** the 2026-08-23 change made seed/demo posts fully interactive for comments/replies/solved-toggle, but voting remains frozen — confirmed as a side effect of `Object.freeze()` at seed-activation time (a storage-layer artifact), not a deliberate "seed content should never be voted on" product rule stated anywhere.

**Decision needed:** should production seed data (if any is imported at all — see §7) allow voting, or should the freeze be reproduced as an explicit, intentional rule (`is_seed = true` rows excluded from `note_votes` writes, with a clear UI message) rather than an accidental side effect? Recommendation: make it an explicit rule matching current behavior, since changing it would be a visible product change nobody asked for.

---

## 7. OPEN — Seed/demo data production disposition

`docs/BACKEND_INTEGRATION_READINESS.md §9.8` already asked this in July: are the ~696 + 67 seed/demo posts disposable, exported manually, or migrated once into production alongside real data (clearly flagged `is_seed`)? This review's recommendation: migrate once as clearly-flagged `is_seed` rows if the owner wants the launch site to feel populated on day one (matches the master task's "product parity is the primary requirement" framing — an empty launch site would itself be a parity break from the current, richly-seeded local experience) — but this is explicitly the owner's call, not a technical one.

---

## 8. OPEN — Study built-in file hosting location

`CLAUDE_MEDIA_STORAGE_STRATEGY.md §2.2` recommends serving the 377-file/369 MB built-in catalog from Supabase Storage rather than the GitHub Pages artifact, as a deliberate infrastructure choice (keeps the Pages deploy thin, matches the project's own existing preference for a thin deploy artifact). This is flagged as needing explicit owner sign-off because it's real infrastructure spend/complexity, not a mechanical migration step — the alternative (ship all 369 MB in the Pages artifact) is technically within GitHub's limits and remains a valid, simpler fallback if the owner prefers to avoid a second storage system for read-only reference files.

**Prerequisite fact-check, not yet performed by this review:** open `EchoWall-portable-demo-v1.zip` and confirm whether `assets/study-files/` is currently included. This directly affects whether "Echo Library real files" is a currently-working feature this migration must not break, or a currently-broken feature this migration would fix.

---

## 9. OPEN — Supabase Storage file-size ceiling vs. current 60 MB client cap

Research confirms Supabase Storage's free tier commonly caps individual files at 50 MB; the current, already-validated client-side Study upload cap is 60 MB (derived from the real corpus's actual max file size of 45.73 MB plus headroom). If the free tier is used, some currently-acceptable uploads would be silently rejected — a real parity break. **Decision needed:** confirm intended Supabase plan tier before implementation, since this is a budget decision, not purely technical.

---

## 10. Recommended (this review's proposals — not yet owner-approved, listed for convenience; full reasoning in the other six documents)

- Adapter-first integration, no framework rewrite (`CLAUDE_PRODUCTION_ARCHITECTURE_REVIEW.md §2`).
- Extend the existing `useProvider()` pattern to `EchoNoteStore` rather than inventing a different abstraction style (`CLAUDE_INTERFACE_GOVERNANCE.md §1`).
- No Realtime at launch on any table (`CLAUDE_PRODUCTION_ARCHITECTURE_REVIEW.md §5`).
- `is_seed`/`seed_source`/`seed_version` columns added to `posts` and `study_resources`, replacing the current implicit signature-matching/freeze-based seed detection (`CLAUDE_DATA_AUTH_RLS_REVIEW.md §4`).
- Photo posting fails closed (no Data-URL fallback) in production (`CLAUDE_MEDIA_STORAGE_STRATEGY.md §1.5`).
- Any future activation of Ask Echo's remote AI tiers (OpenRouter/Bisheng) must route through a backend proxy rather than a public frontend token field (`CLAUDE_INTERFACE_GOVERNANCE.md §6`).
- Client-generated idempotency keys added to post/comment creation to guard against double-submit under real network latency, a risk that barely existed with synchronous LocalStorage writes (`CLAUDE_INTERFACE_GOVERNANCE.md §4`).
- Reuse the prototype's own `checkpoints/<STAGE-ID>/` + `reports/REPORT_<STAGE-ID>.md` staged-rollback discipline for the production migration itself (`CLAUDE_GITHUB_RELEASE_OPERATIONS.md §4`).
- Wire the existing `scripts/test-*.mjs` suite into CI rather than treating the project as untested (`CLAUDE_GITHUB_RELEASE_OPERATIONS.md §2.1`).

---

## 11. Final self-review (per master task §22)

- [x] No app code changed — only markdown files created under `production-launch-plan/claude/`.
- [x] No feature removed — every current feature has a documented production-replacement path; the only intentionally-not-carried-forward mechanism is the *implicit* seed-detection technique (signature-matching, `Object.freeze`), replaced by an *explicit* field with equivalent effect.
- [x] Current local runtime/source treated as the parity baseline, verified directly rather than trusted from older docs — multiple stale claims in existing docs were caught and corrected (`docs/ARCHITECTURE.md`'s Building Detail claim, `CLAUDE.md`'s "no automated tests" claim, `docs/DATA_MODEL.md`'s pre-Community-V2 schema).
- [x] Every dynamic/shared data concern has a named production source of truth (see schema doc).
- [x] RLS is treated as the real DB security boundary throughout; every prototype permission check is explicitly noted as insufficient on its own.
- [x] No server secret reaches the client in any recommendation (Cloudinary secret, Supabase service-role key, any AI provider token all confined to Edge Function secrets).
- [x] Compression happens before Cloudinary upload in the recommended flow.
- [x] Signed Cloudinary upload only; local Data-URL fallback explicitly disabled for production.
- [x] No PostgreSQL base64 photo storage recommended anywhere.
- [x] Study files handled separately from photos (Supabase Storage, not Cloudinary).
- [x] Seed/demo separated from real data via a new explicit field, not the current implicit mechanism.
- [x] Admin UI deferred; backend contracts (roles, scopes, audit, moderation) fully specified now, reusing the prototype's already-designed shapes.
- [x] Every external interface documented (`CLAUDE_INTERFACE_GOVERNANCE.md §5`).
- [x] GitHub Pages path/routing covered, including the newly-found branch-trigger mismatch.
- [x] Rollback exists at every migration stage, and a "test it, don't just document it" criterion is included in the acceptance checklist.
- [x] A `PUBLIC PRODUCTION STABLE` gate exists and is the explicit prerequisite for Admin UI work to begin.
