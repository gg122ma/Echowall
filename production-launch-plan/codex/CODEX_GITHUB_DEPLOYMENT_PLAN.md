# EchoWall GitHub Pages and GitHub Actions Production Deployment Plan

Status: implementation plan only. No workflow, application, repository setting, DNS record, or deployment was changed while preparing this document.

Evidence date: 2026-08-29 (Asia/Singapore). GitHub limits and Action versions are time-sensitive and must be reverified immediately before implementation.

## 1. Decision and launch invariant

EchoWall should remain a static, vanilla HTML/CSS/JavaScript application on GitHub Pages. A framework migration or client-side bundle is not needed for deployment. GitHub Pages is the static frontend only; Supabase owns authentication and database operations, Supabase Edge Functions own trusted/secret operations, Cloudinary owns uploaded photos, and Supabase Storage owns new Study submission files under the separate Study plan.

The production artifact must be a deterministic allow-listed copy of the reviewed release commit. It must never be the current hand-maintained portable ZIP, the whole repository, or whatever files happen to exist in a runner working directory.

The deployment invariant is:

> Current local runtime behavior is the parity baseline. A release is deployable only when the exact Pages artifact—not merely the source checkout—passes its tests, mapping checks, secret scan, path checks, and manual critical-flow acceptance.

No route redesign is permitted during this work. The following mechanics are release-critical:

- `index.html` remains the application entry document.
- `map.html` remains a separate, directly addressable document.
- application navigation continues to use hashes, including `index.html#/place/:placeId` and the existing community, Building Wall, Study, and Home routes;
- transitions between `index.html` and `map.html` remain relative and preserve the current session-state return behavior;
- first-party assets remain repository-relative, so the same artifact works at localhost root, a GitHub Pages project subpath, and a future custom-domain root;
- no server rewrite or single-page fallback is assumed. A hash is not sent in an HTTP request, so GitHub Pages only needs to serve the real `index.html` and `map.html` files.

## 2. Verified current-state deployment gap

The active local repository was inspected rather than an older GitHub snapshot.

| Item | Verified current state | Production consequence |
|---|---|---|
| Active branch | `main` | The existing workflow does not automatically deploy it. |
| Inspected HEAD | `ab3ee792a5142f0a499af448cdc0a497da9510d3` | This identifies the underlying commit only. The local parity baseline also contains uncommitted and untracked work, so this SHA alone is not the complete baseline. |
| Workflow | `.github/workflows/deploy-pages.yml` | It listens to pushes on `master`, not `main`. |
| Artifact source | `EchoWall-portable-demo-v1.zip` | The workflow deploys a fixed archive instead of building from current source. |
| ZIP | 6,172,172 bytes (5.89 MiB compressed), 61 entries | It is not an authoritative representation of the current product. |
| Study coverage in ZIP | zero `assets/study-files/` entries | Real Study file opening cannot have parity in the deployed artifact. |
| Existing portable validator | validates paths/assets in the working tree | It can pass while the artifact is stale or incomplete. Artifact-root validation is mandatory. |
| Current workflow actions | `checkout@v6`, `configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4` | Major tags are mutable and current-version guidance is inconsistent across docs/releases. Pin reviewed full commit SHAs. |
| Current concurrency | `group: pages`, `cancel-in-progress: true` | A newer run can cancel an approved production release. Production should serialize and not cancel in progress. |

The current local working tree is intentionally treated as evidence, not automatically as release input. Before implementation begins, Phase 0 must record every intended tracked and untracked parity file, review it, and capture it in a release commit. GitHub Actions cannot deploy uncommitted local state.

## 3. Measured packaging facts and Pages constraints

### 3.1 Current measurements

| Payload | Count/size observed | Deployment treatment |
|---|---:|---|
| Active runtime JavaScript loaded by `index.html`/`map.html` | 50 unique local sources: 49 first-party files totaling 4,101,753 bytes (3.91 MiB), plus vendored Leaflet at 147,552 bytes; 4,249,305 bytes total | Include all transitively required runtime modules, including the vendored dependency, and syntax-check exactly this set. |
| Study resource manifest | 2,198,190 bytes (about 2.10 MiB) | Include and validate every mapped resource before upload. |
| Built-in Study files | 377 files; 385,308,898 bytes (367.46 MiB) | Include under the recommended hybrid strategy because they are current curated content and their current URLs must continue to open. |
| Built-in Study file mix | 363 PDF (341.21 MiB), 6 DOCX (1.63 MiB), 8 PPTX (24.62 MiB) | Do not write a PDF-only artifact rule; preserve all current real-file types. |
| Repository excluding `.git` | about 683.18 MiB | Do not publish the repository wholesale. |
| Largest unrelated video observed | about 245.45 MiB | Explicitly exclude video/demo-production material from Pages. |
| Existing portable ZIP | 5.89 MiB, 61 entries, no Study files | Retire it as a deployment input after the deterministic artifact is proven. |

The curated Study library fits within the documented 1 GiB published-site limit today, but it consumes roughly 36% of that limit before other website assets and creates material bandwidth exposure. A full-repository upload would be both unnecessary and too close to the site limit once transient/unrelated assets are considered.

### 3.2 Official constraints to enforce as gates

As documented on the evidence date:

- a published GitHub Pages site may not exceed 1 GiB;
- a Pages deployment times out after 10 minutes;
- the soft bandwidth limit is 100 GiB per month;
- GitHub recommends a source repository under 1 GiB, with separate general repository/object-size guidance;
- Git blocks ordinary repository objects above 100 MiB and recommends much smaller objects. The current largest curated Study file is about 45.73 MiB and stays below that ceiling; the observed unrelated roughly 245.45 MiB video must never be added to the production repository or artifact. Do not treat a Git LFS pointer as a deployable Study file: the exact-artifact hash/magic test must see the real approved bytes, and Hybrid C does not require LFS for the current 377-file set;
- a custom Actions artifact for Pages is a gzip-compressed tar artifact with no symbolic or hard links and must remain below the documented 10 GiB artifact ceiling; the 1 GiB published-site limit is therefore the controlling ceiling for EchoWall;
- the artifact must have a top-level, case-correct `index.html`;
- Pages is static hosting. It provides no application server, secret store, server rewrite layer, or trusted Cloudinary signature endpoint.
- the documented soft limit of 10 Pages builds per hour does not apply when the site is built and published through a custom GitHub Actions workflow, but normal Actions and deployment limits still apply.

Operational guardrails should be stricter than the platform maxima:

- warning at 650 MiB uncompressed artifact size;
- release-blocking maximum at 800 MiB, leaving at least 20% headroom under the documented site limit;
- warning when a single static file exceeds 40 MiB and explicit review above 50 MiB;
- deployment duration warning at 7 minutes and hard failure at the platform timeout;
- monthly Pages bandwidth alerts at 50, 75, and 90 GiB if GitHub exposes sufficient usage data; otherwise estimate from Study-file request telemetry outside Pages and investigate a CDN/storage move before sustained use approaches the soft limit.

These guardrails are release policy, not claims that GitHub will enforce or alert at those values.

## 4. Repository, branch, release, and environment model

### 4.1 Source and release model

Use one authoritative source repository:

- `main`: protected integration branch and the only branch from which production releases may be promoted;
- short-lived feature/migration branches: pull requests into `main`, requiring review and all validation checks;
- immutable annotated release tags such as `echowall-prod-2026.09.0`: created only from a green `main` commit after staging acceptance;
- GitHub `github-pages` environment: production protection rule requiring a named reviewer, no self-approval where the account/plan supports it, and deployment restricted to release tags or a narrowly scoped manual promotion workflow;
- no `gh-pages` source branch: deployment remains a GitHub Actions custom workflow, avoiding generated-site commits.

Do not deploy on every push to `main`. A push to `main` should validate and produce a candidate artifact. Production should deploy only from an approved immutable release tag, or a manual dispatch that accepts and verifies an exact `main` commit SHA and records the matching release identifier. Tags are preferred because they make rollback and audit clearer.

The first release commit must intentionally capture the reviewed current local baseline. Its baseline record should include the commit SHA, dirty-tree resolution, file manifest, artifact manifest hash, Study resource count/hash summary, test results, and manual parity sign-off. This plan does not authorize that commit.

### 4.2 Staging recommendation

A hosted staging origin is recommended because Supabase Auth redirects, Edge Function CORS, Cloudinary signed uploads, repository subpaths, and real Study downloads cannot be adequately signed off from a local file URL.

GitHub Pages exposes one Pages site per repository, so it cannot safely maintain independent production and staging deployments from the same repository at two permanent URLs. Use:

- the source repository's Pages site for production; and
- a small, separate staging Pages repository populated only with the candidate allow-listed artifact and never used as a second source repository.

For genuine browser-origin isolation, host that repository under a dedicated staging owner or a verified staging custom domain such as `staging.example.edu`; two project repositories under the same `<owner>.github.io` host share the same web origin because URL paths are not part of an origin. If the same owner host is the only practical choice, record that limitation, use a separate Supabase staging project, and never treat CORS as authorization. The staging site should also use a distinct Cloudinary upload folder/tag namespace. Prefer a separate Cloudinary sub-account/product environment if the selected plan supports it. At minimum, signatures must force `echowall/staging/...`, and staging metadata must never point into production rows.

Creating the staging repository and external projects is an implementation-time user decision. If a separate hosted staging origin is declined, the minimum alternative is a fixed localhost HTTP origin plus an Actions artifact review, but production go-live then requires a controlled canary deployment followed by an immediate rollback window. That alternative carries materially higher Auth/CORS/base-path risk.

## 5. Deterministic Pages artifact contract

### 5.1 Allow-list, not repository copy

Implementation should add a version-controlled deployment manifest (for example `deploy/pages-files.txt`) and an artifact builder (for example `scripts/build-pages-artifact.mjs`). Names are recommendations, not files created by this planning task.

The builder must:

1. start with a newly created empty staging directory;
2. copy only paths declared in the deployment manifest;
3. add every local runtime script and stylesheet referenced by `index.html` and `map.html`;
4. follow the application's known static data/asset references and fail on a missing dependency;
5. add every built-in Study path declared by `data/study-resource-manifest.js` under `assets/study-files/`;
6. generate the production-safe public configuration into the staging directory, never into tracked source;
7. write `.nojekyll`, `release.json`, and an artifact manifest containing relative path, byte count, and SHA-256 for every file;
8. reject duplicate case-insensitive paths, path traversal, absolute paths, symbolic links, hard links, device files, and files outside the repository root;
9. sort paths byte-for-byte before manifesting/tarring, normalize timestamps where practical, and produce identical content hashes from identical source/config inputs;
10. run all artifact-root validation before `upload-pages-artifact`.

The exact allow-list must be generated once from the current source dependency graph and then reviewed. It should include the two entry documents, their loaded runtime modules, used styles/fonts/icons/images, current campus/building data, localization files, bounded local Ask Echo knowledge, current seed/demo data required for parity, and all curated Study resources.

### 5.2 Explicit exclusions

The artifact builder must reject rather than merely ignore these categories:

- `.git/`, `.github/`, `.agents/`, `.codex/`, `.env*`, credential files, editor metadata, and OS metadata;
- `node_modules/`, package caches, test output, coverage, logs, temporary directories, and local database files;
- `scripts/`, tests, reports, planning documents (including `production-launch-plan/`), audit exports, and source-only documentation;
- checkpoint, `before`, archive, legacy-copy, abstract-source, and experimental folders that are not in the runtime dependency graph;
- `video/`, `video-demo/`, raw recording material, project files, and promotional exports;
- ZIP/backup bundles such as `EchoWall-portable-demo-v1.zip`;
- moderation/audit exports or local prototype state containing personal data;
- any unlisted file, even if it appears harmless.

Do not use broad patterns such as `cp -R . _site`, `git archive` of the whole tree, or `find ... -exec cp`. The Study manifest adds exact resource paths; it does not authorize the entire `assets/` tree.

### 5.3 Required root contents

At minimum, the final artifact contract must assert:

- `_site/index.html` is present and case-correct;
- `_site/map.html` is present and case-correct;
- `_site/.nojekyll` is present;
- production public configuration is present and syntactically valid;
- every local `src`, `href`, data URL, image URL, building asset, and Study manifest path resolves inside `_site` after stripping a query string or fragment;
- the artifact contains exactly 377 currently mapped built-in Study files unless an explicitly reviewed content change alters the baseline count;
- no unexpected top-level wrapper directory is introduced by archive extraction;
- no 404 fallback document is used to mask missing files.

## 6. Public configuration generation and secret boundary

Only public identifiers may be rendered into the Pages artifact.

| Value | GitHub source | Artifact | Rule |
|---|---|---|---|
| Supabase project URL | protected environment/repository variable | yes | HTTPS only; exact expected host/project ref. |
| Supabase publishable key | protected variable | yes | Require the current public/publishable format; it is not an authorization boundary. RLS remains mandatory. |
| Cloudinary cloud name | protected variable | yes | Public identifier only. |
| Supabase Edge Function base URL | derived from Supabase URL or public variable | yes | HTTPS, expected project ref. |
| feature flags | environment variable | yes | Public values only; record them in `release.json`. |
| environment name and release SHA | workflow context | yes | `production`/`staging`, full SHA, and immutable release label. |
| repository base path | output of Pages configuration plus validated input | yes | Normalize to `/repo/` or `/`; never use it as an origin. |
| Supabase secret/service-role credential | GitHub secret only where a genuinely trusted CI operation needs it; normally not needed to build | never | Do not pass it to the build job or expose it as an environment variable visible to scripts. |
| Cloudinary API secret | Edge Function secret | never | It has no role in Pages build or deploy. |
| future external AI secret | Edge Function secret | never | Keep the current bounded local Ask Echo implementation for launch. |

Prefer a generated `config/runtime-config.js` or equivalent that is loaded at the existing configuration point. If preserving the existing `config/app-config.js` contract is lower risk, generate an artifact-only copy with the same public shape. The implementation must not patch the tracked working-tree file in place.

The configuration gate must fail if:

- an expected public value is empty;
- a production URL is HTTP, localhost, a staging project, or an unexpected Supabase project ref;
- a key starts with `sb_secret_`, contains a service-role JWT claim, or matches a known secret placeholder;
- Cloudinary API key/secret fields, raw AI tokens, private keys, passwords, or GitHub tokens appear;
- the production origin/base path is inconsistent with the Pages deployment URL.

The workflow must not print complete keys. Although the Supabase publishable key is safe in the client, logging only a short fingerprint simplifies incident review.

## 7. Proposed GitHub Actions workflow topology

Use separate jobs so only the final deploy job receives elevated Pages permissions.

| Job | Trigger/needs | Permissions | Responsibilities | Output |
|---|---|---|---|---|
| `validate-source` | PR, push to `main`, tag, manual | `contents: read` | checkout exact SHA; dependency/tool setup; all current tests; loaded-runtime syntax; source dependency checks; public config input validation | signed-off test summary |
| `build-pages` | after source validation | `contents: read` | build the empty allow-listed `_site`; generate public config/release manifest; verify size/count/hash and reproducibility | candidate `_site` and manifest hash |
| `validate-artifact` | after build | `contents: read` | run every artifact-root, magic, mapping, secret, path, and subpath test against `_site`; archive content check | approved Pages candidate |
| `upload-pages-artifact` | production promotion only, after artifact validation | `contents: read` | invoke the reviewed Pages artifact action on `_site` | Pages deployment artifact |
| `deploy-production` | release tag/manual approved SHA; needs upload | `pages: write`, `id-token: write`; no write contents | protected `github-pages` environment; deploy exact uploaded candidate | deployment URL/id |
| `smoke-production` | after deployment | `contents: read` | read-only HTTP and browser smoke checks; compare release SHA/manifest | release evidence and go/rollback signal |

Jobs run on separate clean runners. If build and artifact validation remain separate jobs, transfer one candidate archive through a pinned standard artifact action, publish its SHA-256 as a job output, and verify that hash immediately after download. Never rebuild between approval and `upload-pages-artifact`. A simpler acceptable topology is to keep build, artifact validation, and Pages-artifact upload as ordered steps in one `package-pages` job; source tests can remain a separate prerequisite job. In either topology, `deploy-production` consumes the exact artifact that passed artifact validation.

Production concurrency:

- group: `pages-production`;
- `cancel-in-progress: false` so an already approved release is not killed halfway through;
- GitHub queues the next production release; an operator cancels it explicitly if obsolete.

Staging concurrency:

- group: `pages-staging`;
- `cancel-in-progress: true` because the latest candidate supersedes older, not-yet-approved staging candidates.

Do not grant `pages: write` or `id-token: write` at workflow level. Grant them only to the production deploy job. Do not make untrusted pull-request code eligible to access a production environment or deployment credentials.

### 7.1 Action pinning

The current workflow uses floating major tags. Official examples and individual Action release pages can disagree during a major-version transition. At implementation time:

1. inspect the official release and security/advisory page for each Action;
2. choose the current supported release compatible with the runner and Pages service;
3. record the release tag and resolve it to its 40-character commit SHA;
4. use `uses: owner/action@<40-character-SHA> # vX.Y.Z`;
5. enable reviewed Dependabot updates for GitHub Actions, and require a green candidate build before accepting a pin update.

This applies to checkout, Node setup if used, configure-pages, upload-pages-artifact, deploy-pages, and any artifact retention Action. Do not copy a SHA from this planning document; resolve it from the official repository on the implementation date.

## 8. Exact predeploy gates

All gates operate in a clean checkout. Production additionally operates on an immutable tag/SHA and a clean generated `_site`.

### 8.1 Existing test suite

Run all 16 currently passing scripts, with their exact repository filenames:

1. `node scripts/validate-portable-demo.mjs`
2. `node scripts/validate-demo-seed-showcase.mjs`
3. `node scripts/validate-demo-seed-pustaka.mjs`
4. `node scripts/test-study-upload.mjs`
5. `node scripts/test-post-type-unification.mjs`
6. `node scripts/test-display-count-consistency.mjs`
7. `node scripts/test-community-sticky-wall-fix.mjs`
8. `node scripts/test-community-seed-interaction.mjs`
9. `node scripts/test-all-student-km-seed.mjs`
10. `node scripts/test-admin-role-scope.mjs`
11. `node scripts/test-admin-moderation-schema.mjs`
12. `node scripts/test-admin-moderation-assist.mjs`
13. `node scripts/test-admin-management.mjs`
14. `node scripts/test-admin-dashboard.mjs`
15. `node scripts/test-admin-college-scope.mjs`
16. `node scripts/test-admin-audit.mjs`

Retain the admin contract tests even though Admin UI implementation is deferred; they guard the backend fields/scopes reserved now. No passing source test substitutes for artifact validation.

### 8.2 Loaded-runtime syntax gate

Parse `index.html` and `map.html`, collect every local JavaScript `src` in load order, resolve each path, and run `node --check` against that exact set. The observed union is 50 unique local JavaScript sources: 49 first-party files plus `assets/vendor/leaflet/leaflet.js`; that set currently passes. Preserve per-document load order as well as the unique union. Do not recursively syntax-check every historical checkpoint fragment: two known partial `before` fragments are not runtime files and generate irrelevant failures. Fail if a loaded script is absent, duplicated unexpectedly, reordered against the approved baseline, or not copied into `_site`.

Repeat the same loaded-file discovery against `_site/index.html` and `_site/map.html`. The two discovered lists must match the reviewed artifact manifest.

### 8.3 Artifact-reference and base-path gate

Against `_site`, fail on:

- any missing relative HTML/CSS/JS/image/font/data/resource reference;
- a first-party URL beginning `/` unless explicitly approved as an external-origin URL;
- `file:`, drive-letter, UNC, parent-traversal, stale localhost, or source-directory paths;
- an `index.html` to `map.html` transition that drops the GitHub project subpath;
- a map-to-building transition that does not form `index.html#/place/<encoded-id>` relative to the current document;
- case mismatches that Windows tolerated but GitHub's case-sensitive serving would not;
- query/hash stripping errors during existence checks;
- a link that depends on a server rewrite or extensionless route.

Serve `_site` under both `/` and a synthetic project prefix such as `/EchoWall-Feature-Foundation/`. A headless-browser test should directly request both documents, exercise representative hashes, and verify no first-party network request returns 404.

### 8.4 Study mapping and file-integrity gate

Load the Study manifest in the same shape used by the runtime and verify:

- every resource's static URL is relative, normalized, unique where expected, inside the allowed Study directory, and present in `_site`;
- the current baseline contains 377 real files unless a separately reviewed content change updates the count;
- Question/Scheme relation endpoints resolve and unavailable-state records remain intentionally unavailable rather than linking to a nonexistent file;
- every PDF begins with `%PDF-` after the accepted leading-byte handling and is not zero/truncated by a known minimum structure check;
- every DOCX/PPTX has ZIP magic and required Office archive members (`[Content_Types].xml` plus the appropriate `word/` or `ppt/` payload);
- manifest byte counts/hashes, if present, match; otherwise the artifact builder records SHA-256 for the release baseline;
- a representative small, large, non-ASCII-title, Question, Scheme, DOCX, and PPTX resource opens over the staged HTTP origin;
- no pending IndexedDB or future Supabase submission object is accidentally copied into the static curated set.

### 8.5 Artifact security and privacy gate

Scan filenames and decoded text in the final artifact—not just source—for:

- `sb_secret_`, legacy service-role credentials/claims, Supabase database passwords, Cloudinary API secrets, private keys, bearer tokens, external AI keys, webhook secrets, and GitHub tokens;
- `.env`, credential, backup, debug, database, source-map-with-secrets, audit export, and moderation export filenames;
- absolute local paths, usernames embedded in paths, `localhost` in production config, and private/internal endpoints;
- base64 image blobs or oversized `data:image/` values in production data;
- accidental personal data from local prototype LocalStorage/IndexedDB exports.

The scanner needs exact allow-listed test fixtures/placeholders so it fails on real secret-shaped data without being disabled by documentation strings. Record only path, rule ID, and a redacted fingerprint in logs.

### 8.6 Artifact structure and reproducibility gate

- refuse symlinks/hard links and archive entries with `..`, absolute paths, backslashes, or duplicate case-folded names;
- assert exact file count, total uncompressed bytes, largest-file list, and SHA-256 manifest;
- build twice from the same checkout/config in separate empty directories and compare their file manifests;
- inspect the uploaded tar structure before deployment and assert one top-level site tree with `index.html`, `map.html`, `.nojekyll`, and `release.json`;
- fail above the 800 MiB release guardrail or when an undeclared file appears.

## 9. URL, routing, Auth redirect, and origin matrix

Origins contain scheme, host, and port only; a GitHub Pages repository path is not part of an origin. Base paths and Auth redirect paths are separate concerns.

| Environment | Site URL/base path | Supabase Auth redirect/reset allow-list | Edge Function allowed `Origin` | Notes |
|---|---|---|---|---|
| Local | fixed HTTP server, e.g. `http://127.0.0.1:4173/` | exact local `index.html` callback/recovery URLs; include `localhost` only if developers actually use it | exact `http://127.0.0.1:4173` and approved localhost equivalent | Never test Auth from `file://`. Fixed ports avoid overbroad wildcards. |
| Staging | `https://<owner>.github.io/<staging-repo>/` | exact staging `index.html` callback/recovery URL | exact `https://<owner>.github.io` (origin is shared by owner Pages sites; function must also validate app/environment claims) | Use separate staging Supabase project and Cloudinary namespace. |
| Production project Pages | `https://<owner>.github.io/<production-repo>/` | exact production `index.html` callback/recovery URL under the repository path | exact `https://<owner>.github.io` plus signed-in JWT and server-side controls | Relative asset/document URLs preserve the repository subpath. |
| Future custom domain | `https://<verified-domain>/` | add exact custom-domain callback/recovery URL before cutover | exact custom-domain origin | Keep old origin temporarily during controlled cutover, then remove it. |

Use a query-based static callback marker or another route-safe contract such as `index.html?auth_callback=1`, because the application's hash is already its router state. Supabase's current PKCE callback code is returned in the URL query. Do not place the OAuth/recovery protocol in a competing router hash. The Auth implementation plan must own the exact callback parser and password-recovery state; deployment owns making every exact redirect URL serve `index.html` successfully.

For Supabase Auth configuration:

- set Site URL to the canonical production base URL;
- register exact local, staging, project-Pages, and later custom-domain redirect paths required by sign-up confirmation and password reset;
- avoid a host-wide production wildcard; if a documented wildcard is temporarily required for staging previews, constrain it to the staging host/path and remove it before launch;
- test a confirmation/reset link after adding the GitHub repository subpath;
- test that query parameters survive and the existing hash route resumes after session recovery.

Edge Functions must respond to `OPTIONS`, echo only an allow-listed exact origin, emit `Vary: Origin`, allow only required methods/headers, and return no CORS headers to an unrecognized origin. CORS is not authentication; JWT validation, rate limiting, RLS, parameter allow-listing, and idempotency still apply. The browser's direct Cloudinary upload uses Cloudinary's HTTPS upload endpoint and vendor CORS support; EchoWall's signature function must never expose the API secret and must not sign arbitrary client parameters.

### 9.1 GitHub Pages response-header limitation and fixed-stack acceptance

GitHub Pages does not provide repository-level control over arbitrary HTTP response headers. EchoWall therefore cannot rely on Pages configuration to set a response-header Content Security Policy, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy`, `X-Content-Type-Options`, application-specific `Cache-Control`, or a custom HSTS policy.

An HTML `<meta http-equiv="Content-Security-Policy">` can provide a useful partial CSP for content parsed after the element, but it is not equivalent to a response header. In particular, CSP `frame-ancestors` is not honored from a meta policy; report-only policy and some other header semantics are also unavailable. An `X-Frame-Options` meta element is not a valid substitute. If a meta CSP is introduced, it must appear as early as possible in both real entry documents and must be parity-tested against Supabase, Edge Functions, direct Cloudinary upload/delivery, current map tiles/vendor assets, fonts, images, and blobs. It must not be weakened with broad origins merely to make tests pass.

GitHub provides HTTPS for the standard Pages host, and the launch must use HTTPS exclusively. For a custom domain, configure and verify DNS first, wait for GitHub's certificate issuance, then enable **Enforce HTTPS** before treating that host as canonical. A custom domain that still terminates directly at GitHub Pages does **not** add arbitrary header control.

**FIXED-STACK SECURITY ACCEPTANCE REQUIRED:** before production go-live, the security owner/user must explicitly accept the missing response-header controls for the mandated GitHub Pages stack, with the partial meta-CSP and secure-code/RLS mitigations documented. If that residual risk is unacceptable, the required architecture change is a trusted reverse proxy/CDN/host that can inject and test headers; a DNS name alone is insufficient. Adding that proxy would expand the user's fixed target stack and requires separate approval. This is not a product redesign, but it is a production security decision.

## 10. Hash-route and cross-document acceptance matrix

| Case | Request actually sent to Pages | Pass condition |
|---|---|---|
| Home | `<base>/index.html#/` | `index.html` is 200 and Home renders; no fallback request. |
| Community routes | `<base>/index.html#/community/...` | canonical All KM/College/Jurusan hashes render and legacy hashes redirect in the client exactly as locally. |
| Building Detail/Wall | `<base>/index.html#/place/<id>` and `/wall` hash | both views render; encoded ID is preserved. |
| Echo Library | `<base>/index.html#/study/...` | manifest loads at the repository subpath and a real mapped file opens. |
| Open map | `<base>/map.html` | the real file is 200; map assets and data stay beneath `<base>`. |
| Map to Building Wall | relative `index.html#/place/<id>/wall` | the browser remains under the project path and the direct-post note appears through the existing map/Building Wall relationship. |
| Building back to map | relative `map.html` plus session state | map view/return state restores according to the current sessionStorage contract. |
| Refresh/new tab | request before `#` only | refreshing any hash route serves `index.html`; a copied map URL serves `map.html`. |
| Future custom domain | same relative document paths at `/` | no code or content path rewrite is required. |

Run this matrix in Chromium at mobile and desktop widths, with keyboard navigation on the critical Auth/post/map/Study paths. Browser acceptance is mandatory because the current planning environment could execute source tests but could not complete an in-app live-browser walkthrough.

## 11. Cache busting and versioning

GitHub Pages does not provide an application-controlled cache purge guarantee. Use immutable or release-versioned URLs rather than relying on purge timing.

For the first production migration:

- generate `release.json` with commit SHA, release tag, artifact-manifest hash, UTC build time, public config fingerprint, and seed/Study manifest versions;
- in the generated artifact copy only, append a single release token such as `?v=<12-char-sha>` to first-party JS and CSS entry references after parsing HTML, never by a broad text replacement;
- validate that query-stripped URLs resolve and the source order is unchanged;
- keep content-hash-named Study files and uploaded remote objects immutable; do not append release tokens to every large PDF/DOCX/PPTX;
- give changed static images/data new versioned names or include their release query in the referencing artifact where the current data model permits it;
- never overwrite a Cloudinary `public_id` for a new content version; use versioned delivery URLs and `overwrite=false` under the media plan.

Longer term, a small deterministic static packager may emit content-hashed filenames and a reference map, but that is a packaging improvement, not a framework migration. It must be parity-tested before replacing query versioning.

## 12. Custom-domain readiness

Do not attach a custom domain during the initial infrastructure migration unless it is already an approved launch requirement. First prove the GitHub project URL.

When approved:

1. verify the domain in GitHub using the documented DNS TXT procedure to reduce takeover risk;
2. configure the custom domain in the Pages repository settings before changing DNS;
3. use supported apex A/AAAA/ALIAS/ANAME or `www` CNAME records exactly as GitHub documents; never use a wildcard DNS record;
4. wait for DNS and GitHub verification, then enable/enforce HTTPS;
5. check CAA permits the issuer GitHub uses (currently Let's Encrypt; reverify);
6. add the new exact Supabase Auth redirect and Edge CORS origin before traffic cutover;
7. run the full routing, Auth, media, and Study smoke suite on the custom host;
8. select one canonical host and redirect at the DNS/Pages-supported layer where possible; relative URLs make application assets agnostic;
9. retain the old project-URL redirect/CORS entry only through the defined session/link transition window, then remove it.

Custom Actions deployment does not rely on a source `CNAME` file in the same way as legacy branch deployment; the repository Pages setting is authoritative and must be backed up in release runbooks.

## 13. Rollback and bad-deployment response

The rollback unit is a known-good release tag/commit plus its recorded public configuration fingerprint and artifact manifest. Do not roll back only HTML while leaving an incompatible backend migration active.

### 13.1 Preparation

- retain the source tag indefinitely;
- attach/store the file manifest, artifact SHA-256, test summary, schema compatibility version, and public config fingerprint with the release evidence;
- retain a normal Actions candidate artifact for the organization's approved retention period, but do not rely on the short-lived Pages deployment artifact as the sole rollback copy;
- make database migrations expand/contract and backward-compatible across at least the rollback window;
- keep the immediately previous frontend compatible with current Supabase schema/RLS/Edge contracts;
- define the on-call owner and a 24–48 hour observation window for the first production release.

### 13.2 Rollback procedure

1. stop/withhold queued promotions; do not cancel the deployment currently publishing unless GitHub documents it as safe;
2. identify the last known-good immutable tag and confirm backend contract compatibility;
3. dispatch the same pinned workflow against that exact tag;
4. rebuild the deterministic artifact from the tag and its archived public variable set, compare it with the recorded manifest, and require environment approval;
5. deploy it as a new Pages deployment;
6. run the production smoke suite and record the new deployment ID;
7. if a Supabase migration is causal, use its separately approved forward-fix or tested database rollback. Never improvise a destructive schema reversal from the Pages workflow.

GitHub's deployment/run history and rerun capability are useful but time-limited and are not a durable rollback mechanism. A rollback is therefore a new deployment from a retained known-good source tag, not a promise that an old Pages artifact can always be reactivated.

### 13.3 Emergency severity triggers

Rollback immediately for any of these:

- entry document, map document, core script, current locale, or current real Study file returns 404;
- production artifact contains a secret/service credential or personal local-state export;
- project-subpath navigation escapes to the owner root;
- Supabase Auth callback/reset is unusable for the selected launch policy;
- RLS/security testing finds another-user access or pending Study publication;
- signed Cloudinary upload exposes a secret or accepts unconstrained/replayed requests outside the approved contract;
- the release cannot preserve a core posting, comment/reply, vote, solved, map-direct-post, or Building Wall loop.

## 14. Deployment observability and postdeploy checks

Every workflow run should write a machine-readable result and a readable GitHub job summary containing:

- source SHA/ref and dirty status (Actions must be clean);
- release ID, environment, expected site URL/base path;
- action names, pinned SHAs, runner image, and Node/tool versions;
- all 16 test results and loaded-runtime file count;
- artifact file count, uncompressed/compressed bytes, largest 20 files, Study file/type counts, and SHA-256 manifest hash;
- public configuration fingerprints (never complete values);
- secret/path scan counts;
- Pages artifact/deployment ID, final URL, start/end/duration, and environment approver;
- smoke-test results and rollback tag.

Postdeploy automation should make read-only requests with bounded retries for propagation and verify:

- `index.html`, `map.html`, `.nojekyll`, and `release.json` return success from the deployed base;
- deployed `release.json` SHA and manifest hash match the approved candidate;
- representative CSS/JS/data assets have correct non-HTML content and no 404 fallback masquerading as 200;
- a representative PDF starts with `%PDF-` over a range request where supported, plus one DOCX and one PPTX has expected ZIP content type/bytes;
- a missing random path returns 404 rather than silently serving Home;
- no mixed content occurs;
- the Supabase health/auth endpoint and Edge signer CORS preflight are reachable from the exact origin without invoking a privileged write.

The release owner must then execute the manual/browser parity smoke matrix. GitHub Pages logs do not provide full application request analytics; Supabase, Edge Function, and Cloudinary logs own backend/upload observations. Avoid adding invasive client analytics merely for launch.

## 15. Deployment parity and security test matrix

| Area | Test | Pass criterion | Risk addressed |
|---|---|---|---|
| Artifact freshness | Compare deployed `release.json` SHA/hash to promoted candidate | Exact match | stale ZIP/current `master` mismatch |
| Static entry | Directly load project-path `index.html` and `map.html` | 200, expected content type/body | Pages has no rewrite layer |
| Hash routes | Open each canonical and legacy representative hash directly and refresh | same current view/redirect behavior | hash/base-path regression |
| Cross-document map | map → detail/wall → map | same building/post and return state | `map.html` path/session regression |
| Relative assets | run network assertion under synthetic and real project subpaths | zero first-party 404/owner-root requests | leading-slash errors |
| Study files | map every manifest resource and open representative PDF/DOCX/PPTX | exact mapping; correct magic; current unavailable states retained | current ZIP omits Study |
| Auth URL | sign-up/sign-in/session refresh/reset callback on hosted staging | approved Auth UX and exact safe redirect | callback conflict/project path |
| Edge CORS | allowed and denied origin preflights | allow-list only; denied origin gets no ACAO | wildcard/host confusion |
| Public config | scan artifact and inspect runtime values | only approved public identifiers; production project/origin | cross-environment or secret leak |
| Secret absence | source + generated artifact pattern/entropy scan | no service credential/API secret/token | irreversible public exposure |
| Private paths | path and content scan | no local absolute paths, `.env`, local-state exports | privacy/local coupling |
| Artifact shape | manifest, link, case, link-type, size checks | exact allow-list; no links; under 800 MiB guardrail | whole-repo/Windows-only deploy |
| Cloudinary | compressed signed upload in staging and recovery path | no secret; post stores remote metadata; failure remains recoverable | broken media launch |
| RLS | direct REST attempts as anon/user/other user | only policy-authorized data/actions | Pages client is untrusted |
| Pending Study | query/open attempt as public | pending metadata/object unavailable | moderation bypass |
| Rollback | redeploy known-good staging tag | manifest reproduces and smoke passes | untested emergency procedure |

These checks complement, not replace, the feature-by-feature local-versus-production parity and security matrices in `CODEX_MIGRATION_PARITY_TEST_PLAN.md`.

## 16. Implementation phases, rollback, and go/no-go

### D0 — Freeze and fingerprint the current parity baseline

- Scope: current local source/runtime/data/assets/tests; no deployment.
- Work: resolve which dirty/untracked files are intended; record routes/script order/storage keys/current seed counts/Study mappings; capture manual screenshots/critical behavior; generate a candidate file manifest.
- Tests: all current tests, the exact union of 50 loaded local scripts (49 first-party plus vendored Leaflet) with per-document order preserved, and a live local browser walkthrough.
- Rollback: none; this is evidence capture.
- Go: user confirms the reviewed local state is the production parity baseline.
- No-go: any intended current asset exists only outside the repository or browser walkthrough cannot be completed.

### D1 — Add artifact builder and artifact-root validators

- Scope: future deployment scripts/manifests/tests only; no production workflow change.
- Work: deterministic allow-list, public config template, hash manifest, Study mapping/magic checks, base-path test server, secret/private-path scanner.
- Tests: two identical builds produce identical manifests; source and `_site` gates pass; deliberate missing Study file/secret/path causes failure.
- Rollback: remove/revert deployment tooling without touching runtime.
- Go: candidate includes all parity assets and excludes all source-only material; under guardrail.
- No-go: builder uses broad repository copy, mutates source, or validators still inspect only working tree.

### D2 — Introduce protected CI without deployment

- Scope: PR/push validation workflow, action pins, branch protection.
- Work: run source/build/artifact jobs on pull requests and `main`; retain candidate evidence.
- Tests: green clean checkout; fork/untrusted PR cannot access production environment; deliberate failure blocks merge.
- Rollback: disable the new required check and revert workflow commit if it blocks all work; artifact builder remains locally runnable.
- Go: three consecutive representative runs are deterministic and green.
- No-go: action pins unresolved, excessive permissions, secrets in build environment, or nondeterministic manifests.

### D3 — Provision and verify hosted staging

- Scope: separate staging Pages artifact target, staging public config, staging Supabase/Auth/Cloudinary origins.
- Work: deploy approved candidate to staging only; configure exact redirects/CORS; run full parity/security suite.
- Tests: all matrix rows plus mobile/keyboard and real media/Study flows.
- Rollback: redeploy prior staging tag or disable staging; production remains unchanged.
- Go: no unresolved critical/high security issue and approved parity exceptions only.
- No-go: project-subpath, Auth, CORS, signed-upload, or real-file behavior differs unexpectedly.

### D4 — Replace stale production workflow contract

- Scope: future `.github/workflows/deploy-pages.yml` change and repository Pages settings; still no automatic deploy.
- Work: set repository Settings → Pages → Build and deployment source to GitHub Actions; change release trigger from `master`/fixed ZIP to approved release tag/exact SHA; split permissions/jobs; production concurrency; environment approval; exact artifact upload.
- Tests: dry-run/candidate build at release SHA; inspect artifact; prove `EchoWall-portable-demo-v1.zip` is not consumed.
- Rollback: revert workflow/settings before any production promotion.
- Go: two-person review of permissions, action pins, artifact hash, and rollback runbook.
- No-go: mutable/unreviewed branch can deploy or whole repository/ZIP remains input.

### D5 — First production promotion

- Scope: Pages deploy only after backend phases and launch acceptance are green.
- Work: tag exact approved `main` SHA; environment approval; deploy; automated smoke; manual critical-flow smoke.
- Tests: release SHA/hash, routing/map/Study/Auth/media/RLS checks, secret scan evidence.
- Rollback: new deploy from last known-good tag; compatible backend rollback/forward-fix runbook ready.
- Go: every core feature passes and no unapproved parity exception exists.
- No-go: missing sign-off, backend incompatibility, no known-good tag, or rollback drill failed.

### D6 — Observation window and stable-public declaration

- Scope: first 24–48 hours and agreed traffic threshold.
- Work: monitor Actions/Pages availability, Supabase errors/RLS, Edge signing, Cloudinary upload failures/orphans, Study opens, and user-reported parity defects.
- Tests: scheduled smoke checks plus targeted production reads; no destructive probes.
- Rollback: severity triggers in Section 13.
- Go: error/latency/availability thresholds agreed in the architecture plan remain healthy and no P0/P1 parity/security defect remains.
- No-go: repeated upload/auth/storage outage, bandwidth trajectory is unsafe, or parity incidents remain unresolved.

Only after D6 may the program declare `PUBLIC PRODUCTION STABLE`. Admin resumes as a separate later project; this workflow must not smuggle Admin implementation into launch.

## 17. Production go-live acceptance criteria

Production promotion is approved only when all statements are true:

- the release commit captures the reviewed current local parity baseline and the worktree-to-release mapping is documented;
- the artifact is generated from that exact immutable commit, not the old ZIP and not the entire repository;
- all 16 current tests pass, all loaded runtime scripts pass syntax, and all artifact-root checks pass;
- `index.html`, `map.html`, hash routes, relative URLs, repository subpath, and map return flow pass in a hosted browser;
- all 377 baseline built-in Study files and their manifest/relations are validated and representative PDF/DOCX/PPTX files open;
- artifact size is below 800 MiB and current bandwidth/cost estimates are approved;
- no secret/service credential, Cloudinary API secret, local path/state, or base64 production photo blob exists in the artifact;
- production Supabase URL/publishable key and Cloudinary cloud name are correct public values; all trusted values remain outside Pages;
- Auth redirect/reset and Edge CORS allow-lists contain exact current production/staging URLs and no production wildcard;
- RLS, signed upload, pending Study isolation, and direct bypass security tests pass;
- the prior known-good release remains compatible and rollback has been exercised in staging;
- deployment environment approval, Action SHA review, smoke owner, and 24–48 hour observation owner are assigned;
- every visible security-driven difference is recorded as an approved `PARITY EXCEPTION` in the decisions document.

## 18. Official sources and time-sensitive assumptions

The following official sources were checked for this plan. Recheck them at implementation and release because GitHub Actions versions, platform limits, and domain procedures change.

- GitHub Pages custom workflows: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Pages 404/path troubleshooting: <https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites>
- What is GitHub Pages / project-site URL form: <https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>
- GitHub Pages limits: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>
- GitHub repository limits: <https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits>
- GitHub Actions limits: <https://docs.github.com/en/actions/reference/limits>
- GitHub Pages custom domains: <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages>
- `configure-pages` inputs/outputs, including base path: <https://github.com/actions/configure-pages/blob/main/action.yml>
- Official Action release histories to verify and pin: <https://github.com/actions/checkout/releases>, <https://github.com/actions/configure-pages/releases>, <https://github.com/actions/upload-pages-artifact/releases>, <https://github.com/actions/deploy-pages/releases>

Date-sensitive assumptions requiring implementation-day verification:

- the 1 GiB site, 100 GiB/month soft bandwidth, and 10-minute deployment limits;
- Pages artifact format/link/size requirements;
- supported Action releases and runner/Node requirements;
- artifact retention/rerun windows and environment-protection features for the account plan;
- GitHub Pages custom-domain DNS targets, certificate issuer/CAA requirements, and HTTPS timing;
- GitHub's terms/acceptable-use fit for the intended public service;
- whether the measured 367.46 MiB curated library and projected download volume remain economically/operationally appropriate for Pages.

## 19. Handoff checklist for implementation

- [ ] User confirms repository owner/name, canonical production URL, and whether to create a dedicated staging Pages repository.
- [ ] User confirms `main` plus immutable release tags and protected `github-pages` approval model.
- [ ] Phase 0 resolves the current dirty/untracked baseline into reviewed release source.
- [ ] Deployment allow-list and exact Study manifest closure are reviewed.
- [ ] Public variable names and production/staging Supabase/Cloudinary identifiers are approved.
- [ ] Action versions are reverified and full SHAs recorded.
- [ ] Artifact builder and artifact-root validators are implemented without changing application behavior.
- [ ] Existing stale ZIP dependency and `master` trigger are removed only after candidate proof.
- [ ] Hosted staging passes full parity/security/rollback testing.
- [ ] Production URL, Auth redirects, Edge CORS, Pages settings, and optional domain configuration agree.
- [ ] Known-good release, backend compatibility window, rollback owner, and observation owner are documented.
- [ ] First production promotion has explicit go/no-go approval.
