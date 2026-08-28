# Backend Integration Readiness

> Review classification: `DOC + ARCH/SECURITY review / L3-S1 / READY / STANDARD`
>
> Review date: 2026-07-19
>
> Scope: Supabase, Cloudinary, and GitHub CI/CD integration readiness only
>
> Status: planning document; no integration has been implemented or tested against an external service
>
> Review-level boundary: `L3-S1` classifies only this documentation review. It does not classify implementation, deployment, or production readiness.
>
> Integration review gate: any complete Supabase, Cloudinary, and GitHub CI/CD integration remains `L4-S3 / FULL_REVIEW` and requires a separately approved task.

## 1. Scope and evidence rules

This document separates three kinds of information:

- **Confirmed repository fact**: observed directly in the current checkout.
- **Recommendation**: a proposed production design; it is not current behavior.
- **Decision required**: a product, security, hosting, or operational choice that must be approved before implementation.

The review preserved the existing HTML, CSS, vanilla JavaScript, hash router, Leaflet, browser-global, and LocalStorage prototype architecture. It did not connect to Supabase, Cloudinary, GitHub, or any other external service. It did not validate current vendor APIs; version-specific commands, action versions, and platform settings must be checked against official documentation during the relevant implementation task.

The checkout was on branch `master`. The working tree already contained numerous modified and untracked files before this document was created. Those changes were treated as pre-existing and were neither reviewed as a whole nor modified by this task.

## 2. Confirmed current repository state

### 2.1 Runtime and configuration

- **Confirmed repository fact:** `config/app-config.js` exposes only browser-safe integration switches. Authentication is set to `local-prototype`; Cloudinary `cloudName` and `signatureEndpoint` are empty.
- **Confirmed repository fact:** there is no package manifest and no framework or build-tool dependency.
- **Confirmed repository fact:** no `.github/` directory, GitHub Actions workflow, `.nojekyll`, `404.html`, or `CNAME` exists.
- **Confirmed repository fact:** the application uses relative local asset paths in the inspected HTML/runtime files. No root-absolute `src`, `href`, `fetch`, or CSS `url()` reference was found by the scoped Pages check.

### 2.2 AuthService replaceable boundary

- **Confirmed repository fact:** `services/auth-service.js` is the single producer of the global `window.AuthService` object.
- **Confirmed repository fact:** its public contract is `register`, `signIn`, `signOut`, `getCurrentUser`, and `isAuthenticated`, plus the informational `provider` field.
- **Confirmed repository fact:** `services/auth-ui.js` calls registration, sign-in, sign-out, and current-user methods and listens for `echo:authchange`.
- **Confirmed repository fact:** `app-wall.js` calls `getCurrentUser()` to block signed-out posting and to derive `authorUserId` and the named display value.
- **Confirmed repository fact:** `services/bisheng-adapter.js` reads a minimal current-user context through the same global boundary.
- **Confirmed repository fact:** the provider stores prototype accounts and the prototype session in `echo-wall-users:v1` and `echo-wall-user-session:v1`.
- **Confirmed gap:** the current application boot is synchronous. `app-router.js` calls `loadNotes()`, applies UI services, and renders immediately on `DOMContentLoaded`; there is no asynchronous auth/session readiness gate.
- **Confirmed gap:** browser-side password hashing and LocalStorage sessions are prototype behavior, not production authentication or authorization.

### 2.3 LocalStorage note reads and writes

- **Confirmed repository fact:** `app-data.js` owns the global `notes` array, seed records, normalization, and note identifiers.
- **Confirmed repository fact:** `loadNotes()` reads `echo-wall-notes`, performs schema-2 normalization/seeding, calculates `nextId`, and calls `saveNotes()`.
- **Confirmed repository fact:** `saveNotes()` serializes the complete `notes` array back to `echo-wall-notes`.
- **Confirmed repository fact:** migration support also uses `echo-wall-notes-backup:v1`, `echo-wall-schema-version`, and `echo-wall-building-seed:v1`.
- **Confirmed repository fact:** `app-router.js` invokes `loadNotes()` during `DOMContentLoaded` startup.
- **Confirmed repository fact:** `app-wall.js::handleFormSubmit()` uploads an optional image, constructs a complete note object, prepends it to `notes`, and persists through `saveNotes()`.
- **Confirmed repository fact:** `app-admin.js` hides/shows and deletes wall notes by mutating the same global array and calling `saveNotes()`.
- **Confirmed repository fact:** `adminResetNotes()` removes the `echo-wall-notes` LocalStorage entry and reloads the page; it does not call `saveNotes()`.
- **Confirmed repository fact:** `adminExportNotes()` serializes the current in-memory `notes` array to a downloaded JSON file without changing or persisting note state.
- **Confirmed repository fact:** historical map notes use the separate `echowall_map_notes` LocalStorage key. This review does not propose moving map regions or reviving map-note creation.

### 2.4 Voting boundary

- **Confirmed repository fact:** `app-wall.js::voteNote()` mutates `upvotes`, `downvotes`, `score`, and the single `userVote` field on a note, then calls `saveNotes()`.
- **Confirmed gap:** a vote is not a per-user record. The state is tied to the browser's shared note object, has no authenticated ownership check, and is not protected against concurrent updates.
- **Confirmed gap:** score integrity is entirely client-controlled.

### 2.5 Administrator and moderation boundary

- **Confirmed repository fact:** `app-admin.js` contains a clearly marked demo-only browser credential and stores a boolean admin session in `echo-wall-admin-session`. This document intentionally does not reproduce the credential value.
- **Confirmed repository fact:** `app-router.js` routes `#/admin` directly to `renderAdmin()`. Inside that render entry, `isAdminLoggedIn()` is the only admin UI access gate before the login or moderation view is rendered.
- **Confirmed repository fact:** hide/show and delete operations execute directly in the browser against LocalStorage; there is no server authorization, immutable audit trail, or ownership verification.
- **Confirmed repository fact:** the admin UI can also read and modify historical `echowall_map_notes` records.
- **Confirmed gap:** hiding, deleting, exporting, and resetting data are not protected by Supabase Auth or database policy.

### 2.6 Cloudinary upload and failure behavior

- **Confirmed repository fact:** `services/cloudinary-adapter.js` is the single Cloudinary boundary exposed as `window.CloudinaryAdapter`.
- **Confirmed repository fact:** when Cloudinary is not configured, `uploadCompressedDataUrl()` returns the compressed Data URL in local mode.
- **Confirmed repository fact:** when configured, it requests signed parameters from `EchoConfig.cloudinary.signatureEndpoint`, then uploads the compressed blob directly to Cloudinary and returns the secure URL, public ID, width, and height.
- **Confirmed repository fact:** `app-wall.js::handleFormSubmit()` calls the adapter before creating and saving the note.
- **Confirmed repository fact:** signature or upload failure is caught by the form handler; no note is added and the user sees an error.
- **Confirmed repository fact:** if LocalStorage persistence fails after a successful Cloudinary upload, the newly added note is removed from the in-memory array.
- **Confirmed gap:** that post-upload persistence failure does not delete the already-uploaded Cloudinary asset, so it can create an orphan.
- **Confirmed gap:** there is no authorized Cloudinary destroy endpoint, upload-intent record, cleanup queue, or retry policy.

### 2.7 HTML script loading order

`index.html` currently loads browser globals in this order:

1. `config/app-config.js`
2. locale files, then `i18n/index.js`
3. theme and preferences services
4. `data/campus-buildings.js`
5. auth, translation, and Cloudinary services
6. `app-data.js`, `app-admin.js`, `app-place.js`, `app-router.js`, and `app-wall.js`
7. auth UI and BISHENG adapter

`map.html` loads configuration and i18n first, then theme/preferences, auth, campus building data, Leaflet, the map-note overlay, and `echomap.js`.

- **Confirmed repository fact:** this order is intentional because modules share browser globals.
- **Confirmed repository fact:** although `app-router.js` appears before `app-wall.js` and `services/auth-ui.js`, its startup work is deferred until `DOMContentLoaded`, after the later scripts have executed.
- **Confirmed gap:** a Supabase client must be loaded before the replacement auth and data services. Async session restoration must finish before the first protected render without relying only on current script order.

### 2.8 GitHub Pages deployment risks

- **Confirmed repository fact:** the hash router avoids normal deep-link rewrites for application routes, so a `404.html` SPA redirect is not currently required for `#/...` URLs.
- **Confirmed repository fact:** `map.html` is a second static entry point and must be included in any deployment artifact.
- **Confirmed repository fact:** there is currently no CI gate or deterministic Pages artifact definition.
- **Confirmed risk:** deploying the repository root without an allowlist can publish planning documents, audit files, prototype-only code, or future accidental files that are not required at runtime.
- **Confirmed risk:** GitHub Pages cannot execute a Cloudinary signature endpoint or protect Supabase/Cloudinary private credentials.
- **Confirmed risk:** Supabase email/OAuth redirects must account for a GitHub project-site subpath or approved custom domain. The current hash router also makes an implicit-flow token fragment undesirable; a PKCE-style callback must be designed and verified before auth implementation.
- **Confirmed risk:** browser config is public by definition. A Supabase publishable key may be public, but service-role keys, Cloudinary API secrets, and deployment tokens must never enter the Pages artifact.
- **Confirmed risk:** Leaflet is loaded from an external CDN in `map.html`; availability and Content Security Policy behavior are separate deployment dependencies.

## 3. Recommended architecture

### 3.1 Options considered

| Option | Description | Benefit | Cost/risk | Decision |
| --- | --- | --- | --- | --- |
| Direct calls from `app-wall.js` and `app-admin.js` | Put Supabase queries in existing UI files | Few initial files | Couples UI, database schema, auth, and vendor APIs; difficult rollback and testing | Do not recommend |
| Adapter-first integration | Keep UI globals and add a Supabase client plus note/auth adapters | Preserves vanilla JS and existing consumers; narrow rollout and rollback | Adds small service modules and an async readiness gate | **Recommended** |
| Custom application server | Route all data through a new bespoke backend | Maximum control | Largest architecture change and new runtime; conflicts with the least-disruptive objective | Defer unless Supabase constraints require it |

### 3.2 Target request flow

```text
GitHub Pages static UI
  -> browser-safe Supabase client
     -> Supabase Auth
     -> PostgREST / narrowly scoped RPCs protected by RLS
     -> Supabase Edge Functions
        -> Cloudinary signed upload / authorized destroy
```

Static organizations, batches, majors, building metadata, outlines, and map grouping remain Echo Wall-owned files. The KMK Digital Twin remains read-only reference material and is not a runtime dependency.

### 3.3 Least-disruptive service boundaries

- **Recommendation:** add one `SupabaseClient` bootstrap module and keep `AuthService` as the only auth-facing global.
- **Recommendation:** add `NoteService` as the only note/vote/moderation data boundary. During rollout, `app-data.js` may retain normalization, seeds, and an in-memory UI cache, but it must stop being the production source of truth.
- **Recommendation:** add `AuthService.ready()` and await it once during application startup. Keep `getCurrentUser()` synchronous after readiness so the existing UI requires minimal change.
- **Recommendation:** continue dispatching `echo:authchange` so `services/auth-ui.js` and other current consumers remain decoupled from Supabase events.
- **Recommendation:** keep direct browser-to-Cloudinary uploads, but obtain short-lived, constrained signatures from an authenticated Supabase Edge Function.
- **Recommendation:** make the database authoritative for ownership, vote totals, visibility, and moderation. Treat every client-supplied author ID, score, hidden flag, and Cloudinary public ID as untrusted.

## 4. Exact future file-change boundary

No file in this section is changed by this review. It is the smallest recommended boundary for later approved tasks.

### 4.1 Existing runtime files to modify

| File | Minimal future responsibility |
| --- | --- |
| `config/app-config.js` | Add browser-safe Supabase URL/publishable-key and public Edge Function endpoint fields; keep all secrets absent. |
| `services/auth-service.js` | Replace LocalStorage account/session internals with Supabase Auth while preserving current methods/events; add a readiness promise. |
| `services/cloudinary-adapter.js` | Call authenticated Edge Functions, validate returned upload parameters, and expose an idempotent rollback/destroy method. |
| `app-data.js` | Retain schema normalization/seeds as needed; delegate production load/save to `NoteService` and stop assigning authoritative numeric IDs in the browser. |
| `app-wall.js` | Await note creation/vote operations; never submit counters or authoritative owner IDs; invoke media rollback when database creation fails. |
| `app-admin.js` | Remove the prototype credential/session gate; use Supabase session plus database-enforced admin moderation operations. |
| `app-router.js` | Await auth/data readiness before initial render and provide a controlled startup error state. |
| `services/auth-ui.js` | Map Supabase auth errors and confirmation states without importing vendor calls directly. |
| `index.html` | Load the Supabase client bootstrap and `NoteService` before dependent application files while preserving all existing global ordering constraints. |
| `map.html` | Load the same auth bootstrap before map auth consumers; do not redesign regions or add map-note creation. |

### 4.2 New implementation files to add

| File | Purpose |
| --- | --- |
| `services/supabase-client.js` | Create one configured browser client and expose readiness; reject missing/invalid public configuration without containing secrets. |
| `services/note-service.js` | Encapsulate note reads, creates, votes, ownership-safe queries, and moderation RPC calls. |
| `supabase/migrations/<generated-schema-migration>.sql` | Tables, constraints, indexes, grants, RLS policies, safe views/RPCs, and vote-counter logic. The filename must be generated by the approved Supabase CLI workflow at implementation time. |
| `supabase/functions/cloudinary-sign/index.ts` | Authenticated, rate-limited, constrained upload-signature issuance. |
| `supabase/functions/cloudinary-delete/index.ts` | Authenticated, authorization-checked, idempotent rollback and asset deletion. |
| `scripts/validate-static.mjs` | Dependency-free checks for JavaScript discovery, duplicate HTML IDs, local assets, and basic CSS structure. |
| `scripts/build-pages.mjs` | Copy an explicit runtime allowlist into a clean Pages artifact directory. |
| `.github/workflows/ci.yml` | Read-only validation for pull requests and pushes. |
| `.github/workflows/pages.yml` | Pages artifact build and deployment after validation. |

### 4.3 Documentation files to update only after an implementation objective is complete

`docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/INTEGRATIONS.md`, `CHANGELOG.md`, `HANDOFF.md`, `OPTIMIZATION_LOG.md`, and `CODE_AUDIT.md` should be updated by the specific implementation task that changes behavior. They are deliberately unchanged by this readiness review.

## 5. Supabase tables, integrity, and RLS requirements

### 5.1 Proposed tables

| Table | Minimum columns/responsibility |
| --- | --- |
| `profiles` | `id` referencing `auth.users`, validated `display_name`, timestamps. No password data. |
| `notes` | UUID ID; internal `author_id`; context fields; content/display metadata; layout fields; Cloudinary metadata; vote counters; visibility/moderation timestamps; created/updated timestamps. |
| `note_votes` | `note_id`, `user_id`, vote value constrained to `-1` or `1`, timestamp; unique `(note_id, user_id)`. |
| `user_roles` | `user_id`, constrained role such as `admin`; assignments writable only by a trusted server role. |
| `media_assets` | Cloudinary `public_id`, owner, generated folder/key, upload status, optional note reference, dimensions, timestamps, deletion status. |
| `moderation_events` | actor, note, action, reason/metadata, timestamp; append-only audit trail. |

Organizations, batches, majors, and buildings should remain static frontend snapshots in the first backend stage. The database must nevertheless validate allowed context shapes and accepted identifiers; the final mechanism—reference tables, constrained lookup function, or approved enumerated snapshot—requires a schema decision.

### 5.2 Database integrity requirements

- Use UUIDs generated by the database, not `nextId` from the browser.
- Enforce exactly one context shape: community notes require `org_id`, `batch_id`, and `major_id` and no `place_id`; building notes require `place_id` and no community IDs.
- Constrain category, shape, image fit, crop range, position range, content length, and supported image metadata.
- Set `author_id` from the authenticated database context or verify it equals `auth.uid()`; never trust the submitted browser field.
- Do not allow clients to write `upvotes`, `downvotes`, `score`, moderation actor fields, or audit timestamps.
- Preserve anonymous display by suppressing author identity in the public read contract while retaining internal ownership.
- Expose only HTTPS Cloudinary delivery URLs and server-issued public IDs; Data URLs remain prototype-only.
- Add indexes for visible context queries, hot/new ordering, `author_id`, `note_votes.note_id`, media ownership, and moderation history.

### 5.3 RLS and grants matrix

RLS must be enabled on every table exposed through the Supabase Data API. Table/API grants and RLS are separate controls and both must be explicit.

| Operation | `anon` | `authenticated` | admin role |
| --- | --- | --- | --- |
| Read visible note projection | Allowed, if public reading remains approved | Allowed | Allowed, including hidden records through an admin path |
| Create note | Denied | Allowed only for `auth.uid()` and validated input | Same as authenticated unless moderation tooling requires otherwise |
| Update/delete own note | Denied | Decision required; ownership plus immutable protected columns | Allowed through audited moderation operation |
| Read votes | Aggregate counters only | Aggregate counters plus only the caller's vote row | As operationally required |
| Toggle vote | Denied | Own unique vote only; atomic operation | Same unless policy says admins cannot vote |
| Read profile | No unrestricted email access | Own profile; public display-name exposure only if separately approved | Minimum required support access |
| Assign roles | Denied | Denied | Trusted server/service process only |
| Create/read moderation events | Denied | Denied | Append/read through authorized operation; no client updates/deletes |
| Manage media | Denied | Own pending/attached assets through Edge Functions | Authorized moderation cleanup |

Additional requirements:

- Public note reads must not reveal `author_id` for anonymous posts. Prefer an explicit safe-column view/query contract and column grants that prevent direct selection of ownership fields; do not rely on UI omission.
- If a view is exposed, use security-invoker behavior and test that underlying RLS and grants still apply.
- Owner updates require both `USING` and `WITH CHECK`; an update also needs an applicable select policy.
- Role decisions must use server-managed data such as `user_roles` or `app_metadata`, never user-editable metadata.
- Vote toggle and counter maintenance must be transactional. A narrowly scoped RPC plus database-maintained counters is recommended over client-side read/modify/write.
- Moderation should use a transactional operation that changes visibility and appends `moderation_events`; hard deletion and media deletion need a separate failure-safe lifecycle.
- Any privileged function must have a fixed search path, minimum grants, explicit `auth.uid()`/role validation, and dedicated tests. Privileged functions must not be added merely to bypass a failing RLS policy.
- Test every policy as unauthenticated, ordinary authenticated, owner, different user, and admin. Include attempts to select anonymous ownership, overwrite counters, reassign ownership, alter roles, and moderate without authorization.

## 6. Cloudinary Edge Function requirements

### 6.1 Upload signature function

`cloudinary-sign` should:

1. Accept only approved Pages origins and handle CORS without `*` for credentialed requests.
2. Require and validate a Supabase access token.
3. Enforce per-user rate limits and an upload-intent TTL.
4. Generate the folder/public ID server-side under an Echo Wall and user-scoped prefix; do not accept an arbitrary client folder or public ID.
5. Permit only the required image resource type and signed parameters. Bind timestamp, folder/public ID, and any transformations/context included in the upload.
6. Record a pending `media_assets` row before returning the signature.
7. Return only browser-required public values: API key, timestamp, signature, generated folder/public ID, and upload URL if desired. Never return the Cloudinary API secret.
8. Keep Cloudinary secret material only in Supabase-managed function secrets, not Git, frontend config, logs, or GitHub Pages artifacts.

The browser should continue to validate, resize, and compress JPG/PNG/WebP input, but server-side policies must not trust the browser's reported type or size as an authorization control.

### 6.2 Delete and rollback function

`cloudinary-delete` should:

1. Require a Supabase access token and validate the caller against `media_assets` ownership or the approved admin role.
2. Accept an internal media identifier or server-recorded public ID only; reject arbitrary Cloudinary IDs.
3. Refuse deletion when the asset is attached to another user's live note.
4. Be idempotent so retries are safe.
5. Call Cloudinary destroy with the secret held server-side, record the result, and return a non-secret status.
6. Support both immediate rollback of an unattached upload and authorized cleanup after moderation/deletion.

### 6.3 Required failure sequence

| Failure point | Required behavior |
| --- | --- |
| Signature request fails | Do not upload or create a note; show a retryable error. |
| Cloudinary upload fails | Mark/expire the upload intent; do not create a note. |
| Upload succeeds, note insert fails | Call idempotent rollback; if rollback also fails, retain an orphan-pending record for controlled retry/cleanup. |
| Note insert succeeds, UI response fails | Do not delete media; reload/reconcile the note from the database. |
| Moderation hides a note | Keep media unless the retention policy explicitly says otherwise. |
| Authorized hard delete | Coordinate database state and idempotent media deletion; preserve the moderation audit record. |

For production configuration, silent fallback from Cloudinary to a Data URL should be disabled when a photo was selected. Local fallback may remain only behind an explicit prototype mode.

## 7. GitHub Actions requirements

### 7.1 CI workflow

`.github/workflows/ci.yml` should run on pull requests and relevant branch pushes with read-only repository permissions. It should:

- check out the exact revision;
- use a pinned, currently supported Node runtime/action version verified at implementation time;
- install no project dependencies;
- run `node --check` for every repository JavaScript file;
- run `scripts/validate-static.mjs` for duplicate HTML IDs, referenced local assets, and CSS comment/string/brace structure;
- validate the intended HTML script order and required runtime entry files;
- run `git diff --check` against the pull-request base or pushed revision range;
- fail if forbidden private-key/service-role/Cloudinary-secret configuration fields are introduced into the Pages artifact, without printing matched secret values.

CI must not contact a real Supabase or Cloudinary project for the static validation stage.

### 7.2 Pages deployment workflow

`.github/workflows/pages.yml` should:

- run only after validation succeeds on the approved deployment branch;
- use least-privilege permissions: repository contents read, Pages write, and OIDC token write only where the official Pages deployment action requires it;
- use an environment named `github-pages` with the generated deployment URL;
- use concurrency so two deployments do not race, while avoiding cancellation during the actual deploy step;
- run `scripts/build-pages.mjs` to create a clean, allowlisted artifact containing both `index.html` and `map.html` plus required CSS, JavaScript, assets, `config/`, `data/`, `features/`, `i18n/`, and `services/` runtime files;
- exclude `.git`, documentation, audits, LocalStorage exports, Supabase function source, migrations, test fixtures, and any secret-bearing file;
- deploy through the official GitHub Pages artifact mechanism, not by committing generated output back to the branch.

Native Pages deployment needs no Cloudinary or Supabase private secret. If backend migrations or Edge Functions are later deployed from GitHub Actions, that must be a separate manually approved workflow/environment with protected secrets and a pinned Supabase CLI; it is not part of the minimum Pages workflow.

### 7.3 Pages acceptance checks

Before enabling deployment, verify the final production URL for:

- project-site subpath versus custom domain;
- Supabase site URL, allowed redirect URLs, email confirmation links, password reset links, and PKCE callback behavior;
- relative assets on `index.html` and `map.html`;
- direct loading of `map.html` and all hash routes;
- HTTPS-only API endpoints and Cloudinary delivery URLs;
- CORS allowlists for both Edge Functions;
- browser console errors, CSP behavior, and Leaflet CDN availability;
- absence of private credentials and non-runtime files in the downloaded Pages artifact.

## 8. Risks, stop conditions, and rollback

### 8.1 Principal risks

1. Async Supabase session restoration can cause a signed-out flash or incorrect posting gate if rendering starts too early.
2. Anonymous display can leak authenticated ownership if database columns or views are overexposed.
3. Client-writable vote counters or moderation flags would make RLS incomplete even if login works.
4. Cloudinary direct upload can leave orphan assets unless upload intent and rollback are implemented together.
5. A Pages root artifact can publish non-runtime files or accidental credentials.
6. GitHub project-site paths and Supabase auth redirects can fail only after deployment if the canonical URL is undecided.
7. Existing LocalStorage data has no automatic multi-user migration path; switching sources without an approved plan can appear as data loss.
8. The current prototype administrator mechanism must never be treated as a production role source.

### 8.2 Stop conditions for later implementation

Stop the relevant task before runtime changes if any of the following is true:

- the approved Supabase project/environment, canonical Pages URL, or auth redirect policy is missing;
- the task would require placing a service-role key, Cloudinary API secret, or private credential in frontend JavaScript or the Pages artifact;
- RLS tests cannot prove separation between anonymous reader, user, owner, other user, and admin;
- the anonymous ownership projection, admin-role source, vote semantics, or delete/retention policy is undecided;
- Cloudinary upload is enabled without an authorized idempotent rollback path;
- existing user work overlaps the exact runtime files and cannot be preserved safely;
- schema work would require an unapproved destructive migration or LocalStorage data deletion;
- CI would need to connect to production services to pass;
- vendor documentation or supported tool/action versions cannot be verified during implementation.

### 8.3 Rollback strategy

- Keep backend schema changes additive during initial rollout; do not drop LocalStorage data or database tables as a rollback step.
- Preserve an explicit provider/config switch only for non-public prototype or staging rollback. Never fall back to `local-prototype` authentication on a public production deployment; production rollback should redeploy the last known-good backend-enabled artifact or fail closed/read-only.
- Deploy the previous known-good Pages artifact or revert only the integration-specific files and workflows.
- Disable photo posting or enforce fail-closed production media mode when Cloudinary configuration is removed. Do not permit public production to fall back to Data URL persistence, and do not delete existing remote assets automatically.
- Keep `media_assets` and moderation records so orphan cleanup and audit history survive a frontend rollback.
- Export/retain prototype LocalStorage data before any separately approved migration. Never clear it automatically during initial backend enablement.
- Roll back RLS or schema only with a reviewed forward migration; do not use destructive history rewrites or ad hoc production SQL.

## 9. Decisions still required from the user/owner

1. Supabase project ownership, region, staging/production separation, and canonical public URL.
2. Authentication methods: email/password only or additional OAuth providers; email confirmation and password-reset policy.
3. Exact PKCE callback URL for a GitHub project site versus a custom domain.
4. Whether visible notes are readable while signed out and whether voting always requires sign-in.
5. Whether authors may edit/delete their own notes after publishing, and the allowed time/retention rules.
6. Admin role source and who is authorized to grant/revoke that role.
7. Soft-delete versus hard-delete behavior, moderation reason requirements, and audit retention.
8. Whether existing LocalStorage notes are disposable seed/demo data, exported manually, or migrated once.
9. Whether community/building identifiers will be validated by database reference tables or a controlled static snapshot contract.
10. Cloudinary account/environment, allowed delivery domain, folder naming, transformations, quotas, retention, and orphan cleanup window.
11. Whether production photo posting must fail closed when Cloudinary is unavailable; this review recommends yes.
12. GitHub Pages source branch, protected environment/reviewer rules, project subpath versus custom domain, and whether backend deployment remains manual.
13. Account lifecycle and privacy policy: account deletion, session revocation, token lifetime, personal-data retention/export, and anonymous-author ownership handling.
14. Production operations ownership: auth/note/vote rate limits, abuse response, monitoring and alerting, database backup/restore, secret rotation, and incident response.

## 10. Follow-up single-objective task list

Each item below is a separate task and must stop for preview/approval before the next begins.

1. **Decide the production identity and hosting contract:** record the canonical URL, Supabase environment, auth methods, redirect URLs, and admin-role source only.
2. **Create the Supabase schema and RLS migration:** implement and locally verify tables, grants, policies, safe projections, and policy tests only.
3. **Replace the AuthService provider:** add Supabase client/bootstrap and production auth behind the existing interface only.
4. **Introduce NoteService reads:** load visible community/building notes from Supabase while preserving current rendering only.
5. **Introduce authenticated note creation:** create text-only notes through the database and remove client authority over IDs/ownership only.
6. **Introduce transactional voting:** replace `userVote` and counter mutation with per-user database votes only.
7. **Introduce protected moderation:** replace prototype admin login and LocalStorage hide/delete with authorized audited operations only.
8. **Implement Cloudinary signed upload and rollback:** add the two Edge Functions and media lifecycle without changing note layout controls.
9. **Add dependency-free CI validation:** create the static validation script and `ci.yml` only.
10. **Add GitHub Pages deployment:** create the allowlisted artifact builder and `pages.yml` only, after production URL decisions are approved.

Do not begin Supabase implementation from this document alone. Start with item 1 or another explicitly approved single objective.
