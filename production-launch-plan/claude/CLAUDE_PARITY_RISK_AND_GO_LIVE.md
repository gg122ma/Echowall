# Claude Parity, Risk & Go-Live

> Planning only. This is the primary document for cross-validation against a Codex-authored equivalent, since parity is the master task's stated primary requirement.

---

## 1. Product-parity architecture matrix

Legend for "Visible change?": **No** = pixel/behavior identical; **PARITY EXCEPTION** = flagged per the master task's required format (reason/impact/mitigation/approval needed); **Pre-existing gap** = not introduced by this migration.

| Area | Current implementation | Production replacement | Visible change? | Parity risk | Mitigation |
|---|---|---|---|---|---|
| Home | `app-router.js::renderHome()`, hardcoded homepage stats (1017 notes, 12 communities, 53 photo notes, literal date string "Aug 25, 2026") | Same layout; stats sourced from real counts once volume exists, or an explicit "demo copy" flag if the owner wants curated numbers to persist | **PARITY EXCEPTION** if switched to real counts before real volume exists (numbers will look different/smaller) — reason: hardcoded marketing numbers aren't real; impact: homepage stats change value; mitigation: keep curated numbers behind an explicit flag until real usage justifies switching; approval needed: **yes** | Low technical risk, needs a product decision |
| Auth/Profile | Local SHA-256 password, no session expiry, `updateProfile()` w/ education fields, no password reset | Supabase Auth, same UI, session now expires + refreshes silently, password reset added | **PARITY EXCEPTION** — session expiry behavior; see data/auth doc §3 for full breakdown | Low — refresh is silent in normal use | Silent refresh; only affects truly long-idle sessions |
| Echo Map (KMK) | Full interactive Leaflet map, ~20 real building polygons, keyboard-accessible, searchable | Unchanged — pure static/local, no backend dependency | No | None | N/A |
| Echo Map (11 other colleges) | Intentional empty "framework preview" placeholder — zero fabricated data, by design | Unchanged | No | None — **do not build fake data to "complete" this**; it's an intentional product state | N/A |
| Building Detail | Static building info (name/description/hours/photos) + a note **count** only (confirmed: no top-note preview list exists, correcting a stale claim in `docs/ARCHITECTURE.md`) | Same fields, count now sourced from Postgres instead of LocalStorage | No | None | N/A |
| Building Wall | `building:${placeId}` context, no batch/major required | Same, RLS-scoped read/write instead of LocalStorage | No | Low | Standard RLS testing |
| Map Direct Posting | `MapNoteService` — posts a normal building-context note + `(place_id, lat, lng)` anchor row; reaches the same Building Wall as a wall-page post (single unified pipeline, verified) | Same shape: post insert + anchor insert in one transaction | No | Low — already a clean, unified design | Preserve the transactional pairing |
| All KM Students (Global) | `communityKey: "global:all"`, route `#/community/all` | Same | No | Low | N/A |
| College Community | `communityKey: "college:{orgId}"`, route `#/community/:orgId/general` | Same | No | Low | N/A |
| Jurusan Community | `communityKey: "jurusan:{orgId}:{majorId}"`, canonical route; legacy `#/wall/:orgId/:majorId` and `#/org/:orgId` auto-redirect | Same, redirects preserved | No | Low | N/A |
| Post composer | Client-authoritative `id`, image via `CloudinaryAdapter` (local-mode fallback today) | Server-generated UUID, mandatory signed Cloudinary upload (no Data-URL fallback in production) | **PARITY EXCEPTION** — photo posting fails closed instead of silently embedding a Data URL if Cloudinary is unreachable; reason: security (never store base64 in Postgres, never leave secret-free fallback that bypasses moderation); impact: rare, only on Cloudinary outage; mitigation: clear retry error, text-only post still succeeds; approval needed: **yes**, since it's a real behavior change under failure conditions | Failure-mode only, not normal-path |
| Discussion | `postType: "discussion"`, no badge | Same field, same rendering | No | Low | N/A |
| Question | `postType: "question"`, OPEN/SOLVED badge | Same | No | Low | N/A |
| Comment | `echo-wall-comments:v1`, community-post-only, 500-char cap, no edit/delete function exists today | Real table, same cap, same community-only gate; edit/delete/moderation write-path is a **new capability decision** — see decisions doc | No change to what exists today; **new** capability only if the open decision adds edit/hide, which would need its own UI (out of scope unless requested) | Low | Don't build UI features the current product doesn't have |
| Reply | One-level enforced at both data layer (throw on `parent.depth >= 1`) and UI layer (no reply button rendered on a reply) | Same rule enforced by a DB constraint/RPC guard instead of client JS | No | Low | Preserve both layers of enforcement (defense in depth) |
| Solved/Reopen | `questionStatus` field, author-or-scoped-moderator gate, no `acceptedCommentId` (explicitly out of scope by the prototype's own design) | Same, RLS-enforced gate matching `canUserMarkSolved()` exactly (author OR global moderator OR college moderator within their own `org_id`, never for global-scope posts) | No | Low | Don't invent `acceptedCommentId` unless explicitly requested |
| Vote | Single unkeyed `userVote` scalar, no per-user server truth, two accounts sharing a browser can overwrite each other's vote | Real per-user unique vote, server-computed score | **PARITY EXCEPTION** — two accounts sharing one browser can no longer silently share/overwrite a vote (each account now has its own independent vote); reason: this is a real security/correctness fix, not a stylistic choice; impact: only affects the (unsupported, prototype-only) multi-account-one-browser edge case; mitigation: none needed, this is strictly more correct; approval needed: no (this is a bug fix, not a product decision) | Low — old behavior was a bug, not a feature |
| Photos | Compressed Data URL fallback when unconfigured; signed Cloudinary when configured | Signed Cloudinary only, compression before upload | See "Post composer" row above | Covered above | Covered above |
| Echo Library | Jurusan→Semester→Subject hierarchy, never college-grouped (hard product constraint, code-enforced) | Same hierarchy and constraint, catalog metadata ported to Postgres or kept static (see media doc) | No | Low | Preserve the "never group by college" invariant explicitly in schema/API design, not just convention |
| Real files | 377 built-in PDFs with real files (of ~2468 catalog entries); **very likely already broken on the current live deploy** since the 6.17 MB deploy zip almost certainly excludes the 369 MB `assets/study-files/` directory | Served from Supabase Storage (recommended) or a fixed static host, actually reachable in production | **Pre-existing gap, likely fixed rather than broken by this migration** — verify by inspecting the current zip before finalizing this row | Medium (needs verification) | Confirm current live-site file availability as an explicit pre-migration test, not an assumption |
| Question/Scheme | `relatedResourceId`/`resourceGroupId`, two-way linking including pending↔pending | Same fields, same linking logic, server-enforced | No | Low | N/A |
| Study upload | Real IndexedDB storage, PDF-only, 60 MB cap, SHA-256 dedup, magic-byte validation — already a working feature, not a stub | Supabase Storage + Postgres, same limits/validation moved server-side | No (from the user's perspective) | Medium — must not regress an already-working feature during the storage swap | Thorough end-to-end test of upload→moderate→publish before cutover |
| Ask Echo | 3-tier fallback (local FreeAI RAG → Bisheng, currently inert → local keyword fallback on `CAMPUS_BUILDINGS`); no live secrets found today | Unchanged behavior; if remote tiers are ever activated, route tokens through a backend proxy (see interface governance doc §6) | No (today); **future PARITY EXCEPTION only if remote tiers are activated without a proxy**, which this plan recommends against | Low today | Keep local-tier-always-available guarantee |
| Language (EN/BM/ZH) | Flat key→string tables, `echo-wall-language:v1`, no URL-based locale | Unchanged — zero backend dependency | No | None | N/A |
| Theme (Light/Dark/System) | `data-theme` attribute, `matchMedia` live-updates | Unchanged | No | None | N/A |
| Responsive | CSS-based; project's own docs note mobile-viewport automation is frequently unreliable, so most mobile claims in this codebase's own history are "CSS-inspected," not independently browser-verified | Unchanged code; **verification gap is pre-existing**, not introduced here | No | Low technical risk, but claims should be re-verified with real devices before go-live, not just re-trusted from prior docs | Real-device check as part of the acceptance checklist below |
| Keyboard | Real, deliberate accessible engineering confirmed in source: `auth-ui.js`'s custom combobox (arrow keys, `role="combobox"`), Echo Map's keyboard-navigable building list (`tabindex`, `role="button"`, Enter/Space) | Unchanged | No | None | N/A |

---

## 2. Top 5 parity risks

1. **Echo Library real files may already be broken in production** (369 MB corpus vs. 6.17 MB deploy zip) — needs a direct check before this plan can claim whether the migration fixes or must preserve this state.
2. **Voting model change is a real behavior change**, not just an RLS wrapper — the entire toggle/switch/clear logic moves server-side; any subtle mismatch (e.g., score computation timing) would be immediately visible to users.
3. **Two hardcoded admin emails exist in current source** (`services/auth-service.js`'s `PROTOTYPE_ADMIN_EMAILS`, `services/admin-permission-service.js`'s `SUPER_ADMIN_EMAIL`) — if the production `user_roles` seed process isn't deliberately designed fresh, there's a real risk of accidentally carrying prototype-admin access into production, or of the actual project owner losing admin access if the wrong email is assumed.
4. **Hardcoded homepage/community display numbers** (`data/demo-display-counts.js`, `app-router.js`'s literal home-stat numbers) could leak into production as if they were real analytics if not explicitly gated behind a decision.
5. **Mobile-responsive parity claims in this project's own history carry a known verification gap** (documented tooling unreliability for viewport automation) — re-verify on real devices rather than trusting prior "verified" claims at face value.

## 3. Top 5 security/operational risks

1. **Client-side vote/score/moderation-flag trust** — every write in the current prototype is explicitly self-documented as "not a security boundary, bypassable from the console"; RLS must be the actual enforcement for all of it, tested per-role before launch.
2. **`SECURITY DEFINER` search-path shadowing** on any privileged RPC (vote toggle, moderation transition, role grant, audit write) — must pin `search_path = ''` and fully qualify every reference, per current Postgres/Supabase guidance; this is a real, documented privilege-escalation class, not theoretical.
3. **Cloudinary/Storage orphan assets** — neither vendor auto-detects orphans; without the reconciliation jobs designed in the media/interface docs, failed uploads or rejected submissions can silently accumulate storage cost and unlinked files.
4. **GitHub Pages artifact hygiene** — the current deploy mechanism (manually-maintained zip) already demonstrates the risk class the master task warns about (working-tree/live divergence); the new `build-pages.mjs` allowlist must be actively maintained as new folders get added to the repo (e.g. the currently-untracked `abstract-source/`, `video-demo/`, `vid note buildings/` directories found in `git status`), or a future accidental file could reach production.
5. **Branch/repo configuration mismatch** — the deploy workflow's `master` trigger doesn't match the actual `main` branch, and the confirmed hosting repo (`gg122ma/wall`) doesn't match the actual git remote (`gg122ma/e-wall`); either of these, left unresolved, would cause Supabase auth redirect URLs to be configured against the wrong origin, silently breaking login on the real production URL.

---

## 4. Production acceptance criteria (per master task §20)

- [ ] Local vs. production parity confirmed against the matrix in §1, with every PARITY EXCEPTION explicitly approved by the owner.
- [ ] No public secrets in the Pages artifact, Supabase publishable config, or any log (automated check in `ci.yml`).
- [ ] RLS bypass attempts fail: tested as anon, authenticated non-owner, owner, different authenticated user, and each admin scope, per table in `CLAUDE_DATA_AUTH_RLS_REVIEW.md §2` — including the specific cross-college moderation-bypass scenario already named in the prototype's own `AdminPermissionService` design (a college_admin for one college attempting to moderate another college's content).
- [ ] Auth survives refresh and a new tab (session persists correctly across both, unlike the prototype which never expired at all).
- [ ] Two users do not leak ownership — an anonymous post never exposes `author_id` to a public read, verified via the `security_invoker` view design.
- [ ] Anonymous public display + internal ownership both work simultaneously (public sees "Anonymous," the real owner and any authorized moderator still resolve real ownership internally).
- [ ] Post/Question/Comment/Reply/Solved works identically across two real accounts (not just one signed-in account, which is the current prototype's tested limit per its own admin-management gap notes).
- [ ] Vote uniqueness — a user cannot register two votes on the same post, and switching/clearing a vote behaves exactly like the current `voteNote()` semantics.
- [ ] Map Direct Posting reaches the same Building Wall as a wall-page post — confirmed as already-unified in the prototype design, must not regress into two separate content pools.
- [ ] Compressed, signed Cloudinary upload works end-to-end.
- [ ] Failed upload / orphan recovery works (kill the network mid-upload, confirm no orphaned Cloudinary asset and no broken post).
- [ ] Echo Library built-in files still open — **verify this is actually true on the current live site first** (see §2 risk #1) so this criterion measures a real improvement or a preserved state, not an unverified assumption either way.
- [ ] Study remote submission (if migrated per the media doc's Option C) works end-to-end: upload → pending → moderator review → approve → publicly visible → Question/Scheme link still resolves.
- [ ] Pending Study resources are not publicly readable (RLS-verified, not just UI-hidden).
- [ ] EN/BM/ZH all render correctly (zero backend dependency, should be trivial to confirm).
- [ ] Light/Dark/System all render correctly (zero backend dependency).
- [ ] Responsive behavior verified on at least one real mobile device, not just automated viewport resize (per the known tooling-reliability gap noted in this project's own history).
- [ ] Keyboard-critical paths verified: the auth combobox, the Echo Map keyboard-accessible building list, and standard tab/Enter/Escape behavior on all modals.
- [ ] GitHub Pages routes and `map.html` both load correctly from a cold/direct URL on the final production subpath.
- [ ] Rollback tested — not just documented: actually redeploy a prior known-good artifact and confirm it serves correctly, per the staged rollback plan in `CLAUDE_GITHUB_RELEASE_OPERATIONS.md §4`.

Only once every item above is checked does the project reach **PUBLIC PRODUCTION STABLE**, the gate before Admin UI implementation begins (per master task §17).
