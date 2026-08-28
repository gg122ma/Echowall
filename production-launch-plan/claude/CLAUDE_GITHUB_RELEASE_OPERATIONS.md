# Claude GitHub Release & Operations

> Planning only. Cross-reference `CLAUDE_ARCHITECTURE_DECISIONS.md` for the open hosting-repo discrepancy this document depends on.

---

## 1. GitHub Pages production review

### 1.1 Current state (verified, not assumed)

- `git remote -v` → `https://github.com/gg122ma/e-wall.git`, current branch `main`.
- `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md` (2026-07-19) names the confirmed target as `gg122ma/wall` → `https://gg122ma.github.io/wall/`. **These disagree.** Open decision, see decisions doc.
- `.github/workflows/deploy-pages.yml` triggers on `push: branches: ["master"]` + `workflow_dispatch`. The repo's actual branch is `main`. **As configured, an ordinary push to `main` would never trigger this workflow.** This is a real, currently-live gap (not something this migration introduces) and should be fixed regardless of the repo-name question.
- The workflow does **not** build from the working tree. It unzips a committed file, `EchoWall-portable-demo-v1.zip` (6.17 MB), into `_site` and deploys that. The zip is manually regenerated (`scripts/validate-portable-demo.mjs` only validates it, doesn't rebuild it) — meaning "what's in the repo" and "what's live" can silently diverge if someone forgets the regeneration step. `map.html` and `index.html` are both required entry points and (per `CLAUDE.md`) both need to be present in whatever artifact ships.
- Current permissions block already matches the current official pattern (`contents: read`, `pages: write`, `id-token: write`) and already uses `actions/deploy-pages@v4` + `environment: github-pages` + a `pages` concurrency group — **the existing workflow's shape is already correct by current GitHub Pages standards**; it just needs (a) the branch trigger fixed, and (b) the artifact-build step replaced with a real build rather than an unzip of a hand-maintained file.

### 1.2 Recommended production build step

Per `docs/BACKEND_INTEGRATION_READINESS.md §7.2` (still correct, not superseded by anything found): add `scripts/build-pages.mjs` that copies an explicit allowlist — `index.html`, `map.html`, all top-level `.css`/`.js` files, `config/`, `data/`, `features/`, `i18n/`, `services/`, and whatever `assets/` subset is decided by `CLAUDE_MEDIA_STORAGE_STRATEGY.md §2` — into a clean `_site` directory, and run it as a real workflow step instead of `unzip EchoWall-portable-demo-v1.zip`. Explicitly **exclude**: `.git`, all planning/audit/handoff docs (`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `OPTIMIZATION_LOG.md`, this `production-launch-plan/` directory itself, `docs/`), `checkpoints/`, `reports/`, `community v2/`, `study v2/`, `scripts/` (Node-only, not runtime), `supabase/` function source and migrations, any `.env`-shaped file, and — per §1.4 below — the large non-runtime media folders (`video/`, `video-demo/`, `vid note buildings/`, `building map/`) that are currently sitting untracked in the working tree and must never reach a Pages artifact.

### 1.3 Project-site URL structure and hash routing

Confirmed via current GitHub Pages documentation: a project site serves at `https://<owner>.github.io/<repo>/`. Since EchoWall's routing is entirely hash-based (`#/route`), **no special Pages configuration is needed for routing** — the hash fragment never reaches the server, so every navigation still resolves to the same `index.html`/`map.html`. This is unlike path-based SPA routing, which needs the well-known `404.html`-redirect trick; EchoWall needs none of that. The only subpath-awareness required is that all asset references (CSS/JS/image paths, fetch calls) stay relative or repo-subpath-aware rather than root-absolute (`/assets/...` would resolve to `owner.github.io/assets/...`, not `owner.github.io/repo/assets/...`) — confirmed via source that the existing app already uses relative local asset paths (this was verified as a "confirmed repository fact" in the July doc and nothing found in the newer source contradicts it).

### 1.4 Size/limits (time-sensitive — verify exact current numbers before launch)

Current official guidance (as researched 2026-08-28): recommended site size ≤1 GB, hard 100 MB per-file block (50 MB warning), ~100 GB/month bandwidth soft guidance, one publish step ≤10 minutes. EchoWall's actual repository working tree is currently **~1.1 GB** including non-runtime folders (`video/` 247 MB, `assets/study-files/` 369 MB, `building map/` 29 MB reference docs, `study v2/`+`community v2/` ~13 MB of checkpoints/reports) — none of which should be in the Pages artifact regardless of the Study-storage decision in the media doc. The *artifact* itself (post `build-pages.mjs`) should land well under 50 MB even including the app's own `assets/buildings` (6.4 MB) and Leaflet vendor bundle (185 KB), once the 369 MB study-files corpus is routed to Supabase Storage per the media doc's recommendation.

### 1.5 `.nojekyll`

Already present in the current workflow (`touch _site/.nojekyll`) — keep it; current guidance still recommends it for any non-Jekyll static/JS deploy via a custom Actions workflow, both to disable unwanted Jekyll processing and to avoid excluding any underscore-prefixed paths.

### 1.6 Custom domain

Not needed at launch (no such requirement stated). If added later: a `CNAME` file at the artifact root (or set via repo Settings, which writes it for you), apex domain via A/ALIAS records, `www` via CNAME to `<owner>.github.io` — purely additive, no impact on this plan's architecture.

### 1.7 Pages acceptance checklist (before enabling production deployment)

- Confirm final owner/repo/URL (blocks everything else — see decisions doc).
- Fix the branch trigger (`main`, not `master`) or rename the default branch back to `master` — either works, pick one and make it consistent everywhere including any Supabase redirect config.
- Supabase Site URL + Redirect URL allowlist set to the exact final `https://<owner>.github.io/<repo>/` (current Supabase guidance recommends pinning the exact production path rather than a wildcard).
- Verify relative asset paths resolve correctly under the subpath (test by actually loading the deployed subpath, not just `localhost`).
- Verify direct-load of `map.html` and of at least one deep hash route (`#/community/...`, `#/study/...`) works when navigated to fresh (not just via in-app navigation) — hash routes don't need server config, but this is still worth a real check since it's cheap and catches any accidental root-absolute path.
- HTTPS-only on every external endpoint (Supabase URL, Edge Function URLs, Cloudinary delivery URLs) — trivially true by default with these vendors, verify no `http://` literal survived anywhere in config.
- CORS allowlists on both Edge Functions pinned to the final Pages origin, not `*`.
- Browser console clean (no errors) on both entry points, including Leaflet CDN load in `map.html`.
- Confirm no `.env`-shaped file, service-role key, or Cloudinary API secret exists anywhere in the downloaded artifact — the CI check in §2 below should assert this automatically, but a manual spot-check before first launch is still worthwhile.

---

## 2. GitHub Actions / CI

### 2.1 What already exists and must be reused, not reinvented

**Correction to `CLAUDE.md`/`AGENTS.md`:** there is already a real, substantial Node-based test suite — `scripts/test-*.mjs` (19 files as of 2026-08-24), using a hand-rolled `vm`-sandbox pattern that loads unmodified real source and asserts on real rendered output via direct function calls, no mocks. Confirmed scale: 8 admin-focused suites alone total 491 assertions; several hundred more across Community V2/seed/display-count suites. **CI must run these, not just `node --check`.**

### 2.2 `ci.yml` (new, on PR + push)

- Checkout, pinned current Node LTS runtime (verify exact supported version at implementation time — do not guess a version number here).
- No dependency install (matches the "no package manager" constraint — nothing to install).
- `node --check` on every `.js` file (already documented in `CLAUDE.md`), **excluding** the one known historical checkpoint fixture that is intentionally not real JS (`checkpoints/HOMEPAGE-POLISH-001/before/...before.js` — confirmed cosmetic, not a real syntax issue, flagged by the docs-history research pass).
- Run every `scripts/test-*.mjs` file — this is the actual regression gate and should block merge on failure.
- Duplicate-HTML-ID / local-asset / CSS-structure validation (`scripts/validate-static.mjs`, per `docs/BACKEND_INTEGRATION_READINESS.md §7.1` — not yet built, small and worth adding).
- `git diff --check` against the PR base.
- A secret-scan step that fails the build if any forbidden pattern (service-role key shape, Cloudinary API secret shape, `.env` file) is introduced — without printing the matched value.
- Must not contact a real Supabase/Cloudinary project — pure static/local validation only.

### 2.3 `pages.yml` (rework of the existing workflow)

- Trigger on the correct default branch (fix per §1.1).
- Run only after `ci.yml` succeeds on the deployment branch.
- Run `scripts/build-pages.mjs` (§1.2) instead of `unzip EchoWall-portable-demo-v1.zip`.
- Keep the existing, already-correct `contents: read` / `pages: write` / `id-token: write` permissions, `github-pages` environment, and `pages` concurrency group.
- No Cloudinary/Supabase secret needed for the Pages deploy itself — confirmed native Pages deployment requires none.

### 2.4 Supabase deployment (separate, manually-gated workflow)

If Edge Functions/migrations are deployed from GitHub Actions later, current official pattern is `supabase/setup-cli` + `supabase functions deploy` / `supabase db push`, gated behind a protected environment with `SUPABASE_ACCESS_TOKEN`/project secrets stored in GitHub Actions secrets (never in the repo). This must be a separate, manually-approved workflow — not part of the minimum Pages pipeline, per the existing July doc's stop condition and nothing found to contradict it.

---

## 3. Operational / cost plan

| Concern | Assessment | Recommendation |
|---|---|---|
| Database growth | Small at launch (a few thousand posts/comments plausible from current seed scale — 696 + 67 legacy demo posts as a size reference) | Standard indexes on `(context_type, community_scope/place_id, created_at)` for wall queries, `(post_id)` for comments/votes — matches existing `docs/BACKEND_INTEGRATION_READINESS.md §5.2` guidance |
| Realtime | Not enabled at launch (see architecture doc §5) | No cost impact initially |
| User PDF storage | Supabase Storage, per-file cap needs to match or exceed the existing 60 MB client cap — **verify against the current free-tier 50 MB ceiling** (researched: free tier commonly capped at 50 MB/file; Pro tier configurable much higher) — this is a real plan-tier cost decision, not just a config toggle | Budget for at least Supabase Pro if large PDFs (up to 60 MB, matching the current, already-validated client cap) must be supported at launch |
| Cloudinary storage/delivery | Free tier commonly cited around 25 credits/month (1 credit ≈ 1 GB storage or bandwidth or 1,000 transformations) — **third-party-sourced figures, re-verify against cloudinary.com/pricing directly before committing budget** | With the compression targets in the media doc (~300 KB/image target), free tier likely sufficient for an early launch; monitor and upgrade if usage grows |
| Compressed image byte target | ≤300 KB/image (see media doc) | Keeps both Cloudinary and page-load cost low |
| GitHub Pages artifact size | Target well under 50 MB post-`build-pages.mjs` (see §1.4) | Free, no cost concern once study-files corpus is routed to Storage |
| Logs/audit growth | `audit_actions` is append-only and will grow indefinitely by design | Not a concern at launch scale; revisit retention policy once real volume exists — no retention decision needed yet |
| Rate limits (recommendation, since master task asks for concrete numbers) | — | Post/comment create: modest per-user per-minute limit (e.g. 10/min) to blunt spam without affecting normal use; vote RPC: generous (e.g. 60/min, it's cheap); Cloudinary sign: ~20/hour/user; Study submission: ~5/day/user (large files, moderation-reviewed anyway) |
| PDF limits | 60 MB/file (matches current validated client cap), subject to the Supabase plan-tier ceiling above | |
| Pagination defaults | Match current UI's "newest first, load more" pattern — no page-size number is currently visible in source as a hard constant; recommend 20–30 items/page as a reasonable default, confirm against actual current UI behavior before implementing |
| Cleanup cadence | Cloudinary/Storage orphan sweep: daily scheduled Edge Function or Supabase cron job | |
| Log retention | No specific requirement found; default to Supabase's own log retention, revisit if compliance needs arise |

---

## 4. Release / migration sequence

Building directly on the prototype's own already-proven staging discipline: every Community V2/Admin V2/Study V2 feature stage in this codebase used a `checkpoints/<STAGE-ID>/` (before-snapshot + `ROLLBACK.md`) + `reports/REPORT_<STAGE-ID>.md` pattern with single-function-scoped reverts and explicit cross-stage dependency notes. **Reuse this exact discipline for the production migration** — it's a real, working precedent in this specific codebase, not a generic recommendation.

| Stage | Objective | Touches | DB migration | Service config | Test gate | Rollback | Go/no-go |
|---|---|---|---|---|---|---|---|
| 0 | Freeze current local parity baseline | None (documentation only) | None | None | Full manual checklist (`CLAUDE.md`) run once, recorded | N/A | Baseline recorded and signed off |
| 1 | Resolve open decisions (hosting repo, email confirmation, first-admin process, edit-window policy, comment moderation scope) | Docs only | None | None | Owner sign-off | N/A | All `CLAUDE_ARCHITECTURE_DECISIONS.md` open items resolved |
| 2 | Provider contracts + local providers | New `useProvider()` seams on `EchoNoteStore` etc. (interface only, still LocalStorage-backed) | None | None | Existing `scripts/test-*.mjs` still pass unmodified | Revert the seam-adding commit | Interfaces stable, zero behavior change |
| 3 | Supabase project + Auth/Profile | `services/auth-service.js` internals swapped | Initial schema: `profiles`, auth wiring | Supabase URL/publishable key in `config/app-config.js` | New auth-specific test pass (manual + scripted where possible) | Feature-flag back to local-prototype provider in non-production only | Register/login/logout/session-refresh verified across two accounts |
| 4 | Posts/Comments/Votes/Map persistence | `PostRepository`, `CommentRepository`, `VoteRepository`, `MapNoteRepository` swapped | `posts`, `comments`, `note_votes`, `map_note_anchors` + RLS | RPCs deployed | RLS policy tests (anon/user/owner/other/admin per table) | Read-only fail-closed mode if backend swap breaks | Full CRUD + RLS separation proven |
| 5 | Cloudinary signed compressed images | `CloudinaryAdapter` local-mode disabled | `media_assets` table | Two Edge Functions deployed, secrets set | Upload/rollback/orphan-cleanup test | Disable photo posting (fail closed), never fall back to Data-URL | Signed upload + rollback proven end-to-end |
| 6 | Echo Library / Study remote storage | `StudySubmissionRepository` swapped off IndexedDB | `study_resources`, `study_submissions`, Storage buckets/policies | Storage bucket + RLS configured | Upload→moderate→publish end-to-end test, dedup test | Storage changes stay additive; no bucket deletion as a rollback step | Full submission lifecycle proven, built-in catalog still opens |
| 7 | GitHub Pages staging → production | `build-pages.mjs`, workflows | None | Branch trigger fixed, correct repo confirmed | Full Pages acceptance checklist (§1.7) | Redeploy last known-good artifact | Staging matches local parity baseline |
| 8 | Production observation + rollback window | None (operational) | None | Monitoring in place | Real-traffic smoke test | Rollback plan rehearsed, not just written | No critical issue in observation window |
| 9 | **PUBLIC PRODUCTION STABLE** | — | — | — | All acceptance criteria in `CLAUDE_PARITY_RISK_AND_GO_LIVE.md §Acceptance` met | — | Formal go-live declaration |
| 10 | Admin begins later | New Admin UI, reusing the already-designed backend contracts from `CLAUDE_DATA_AUTH_RLS_REVIEW.md §1.8` | None (schema already exists from stage 4/6) | None | Admin-specific test pass | Standard | Explicit separate approval, not automatic |

Each stage stops for preview/approval before the next begins, matching both the master task's instruction and this project's own existing `AGENTS.md` task-pacing policy ("wait for explicit user approval before continuing").
