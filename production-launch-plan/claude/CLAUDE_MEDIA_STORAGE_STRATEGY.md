# Claude Media & Storage Strategy

> Planning only. Cross-reference `CLAUDE_DATA_AUTH_RLS_REVIEW.md` for schema, `CLAUDE_INTERFACE_GOVERNANCE.md` for the `MediaProvider`/`StudyResourceRepository` interface contracts.

---

## 1. Photo upload pipeline (Cloudinary)

### 1.1 Current state (verified from `services/cloudinary-adapter.js`, `config/app-config.js`)

`EchoConfig.cloudinary = {cloudName: "", signatureEndpoint: "", uploadFolder: "echo-wall"}` — currently unconfigured. `CloudinaryAdapter.uploadCompressedDataUrl()`: when unconfigured, **silently returns the compressed Data URL** (`{mode:"local", dataUrl}`) and that Data URL is embedded directly in the note's `imageDataUrl` field and persisted in `echo-wall-notes`. When configured, it already does the *correct* thing: POST `{folder, context}` to the signature endpoint, then `FormData` upload directly to `https://api.cloudinary.com/v1_1/{cloudName}/image/upload`, storing back `{url, publicId, width, height}`. **The adapter's signed-mode shape is already production-correct** — no redesign needed there, only: (a) implement the signature endpoint, (b) disable the local-mode fallback in production.

### 1.2 Required production flow

```
select -> validate (type/size) -> decode/orient (EXIF) -> resize -> compress (client, canvas-based)
  -> POST to Supabase Edge Function `cloudinary-sign` (authenticated, Supabase access token required)
  -> Edge Function: verify JWT, rate-limit per user, generate folder/public_id server-side
     (never accept a client-supplied folder/public_id), record a pending `media_assets` row,
     sign params with CLOUDINARY_API_SECRET (Supabase function secret, never in frontend config)
  -> browser uploads the already-compressed blob directly to Cloudinary using the returned signature
     (no CORS issue — Cloudinary dynamically echoes the browser's Origin header, confirmed via
     current Cloudinary support documentation; the real security boundary is "who can obtain a
     valid signature," not CORS)
  -> Cloudinary returns secure_url/public_id/width/height/bytes/format
  -> browser saves post + image metadata (url, public_id, width, height) to Supabase in the same
     logical operation that creates the post row
```

### 1.3 Signing mechanics (current official Cloudinary algorithm, verified)

Server takes every upload parameter except `file`, `cloud_name`, `resource_type`, `api_key`, plus a required `timestamp`; sorts included params alphabetically by key; joins as `key=value&key=value`; appends the API secret directly (no delimiter); hashes (SHA-1 default, SHA-256 selectable). **Signatures expire — cited validity window is 1 hour from `timestamp`** — so the Edge Function must generate the signature just-in-time per upload request, never cache or pre-generate in bulk.

### 1.4 Compression targets (recommendation, since the master task asks for concrete numbers)

| Setting | Recommendation | Reasoning |
|---|---|---|
| Accepted input formats | JPEG, PNG, WebP, HEIC (convert HEIC client-side or reject with a clear message — HEIC has poor cross-browser `<img>` support) | Matches typical phone camera output; current adapter doesn't appear to gate input type explicitly — add this |
| Original max upload size (pre-compression) | 15 MB | Generous enough for any phone photo, small enough to compress quickly client-side |
| Max output dimensions | 1600px longest edge | Sufficient for a wall-card/detail-modal display context; well below anything requiring print quality |
| Output format | WebP where supported, JPEG fallback | WebP gives materially smaller files at equivalent visual quality; Cloudinary can also auto-format on delivery (`f_auto`) as a second line of defense regardless of what's uploaded |
| Quality | ~0.75–0.8 initial, iterative step-down | Balance visual quality vs. byte target |
| Target byte size | ≤300 KB per image after compression | Keeps both Cloudinary storage/bandwidth credits and page load light |
| Iterative compression | Yes — re-encode at lower quality in a loop until under the byte target or a quality floor (~0.5) is hit, then accept | Simple, dependency-free, matches "avoid over-engineering" guidance — a canvas-based loop, no need for a heavy library |
| EXIF/orientation | Read and apply orientation before compressing, then strip EXIF from the output (avoids sideways photos and avoids leaking embedded location/device metadata) | Standard mobile-upload correctness requirement |
| Failure handling | If compression fails (corrupt file, unsupported format), block the upload with a clear error — do **not** silently fall back to uploading the uncompressed original, and do **not** fall back to Data-URL local mode in production (see §1.5) | Matches the master task's "avoid storing both original and compressed unless justified" and "fail closed" guidance |
| Delivery transformations/thumbnails | Use Cloudinary eager or on-the-fly transformations (`c_fill,w_400` etc.) for wall-card thumbnails vs. the full detail-modal image, rather than storing two separate uploaded files | Avoids storing multiple physical copies; Cloudinary's transformation system is designed exactly for this |

**Store the smallest acceptable visual asset. Avoid storing both original and compressed** — confirmed as directly achievable: only the compressed blob is ever uploaded; Cloudinary-side transformations (not a second upload) produce any smaller derivative needed for thumbnails.

### 1.5 Production fallback policy

`docs/BACKEND_INTEGRATION_READINESS.md §6.3` already recommended this in July and nothing has changed: **when Cloudinary is unavailable or a photo was selected, production must fail closed** — block the post (or let it publish text-only with a clear "photo upload failed, try again" message), never silently fall back to embedding a Data URL in the database. The current adapter's local-mode fallback should be gated behind an explicit, non-production-only flag (e.g. only active when `EchoConfig.cloudinary` is intentionally left empty in a local/dev context, and the app-level config for the production deployment must never leave it empty).

### 1.6 Security

- Signed upload only; API secret lives only in Supabase Edge Function secrets (`supabase secrets set CLOUDINARY_API_SECRET=...`), never in `config/app-config.js`, never in the Pages artifact, never in Git.
- Signature request requires a valid Supabase access token (JWT verified by the Edge Function).
- Per-user rate limit + short upload-intent TTL on the signing function.
- Folder/public_id generated server-side under an Echo-Wall-and-user-scoped prefix (e.g. `echo-wall/{user_id}/{uuid}`) — never accept a client-supplied folder or public_id, per current Cloudinary security guidance on constraining signed parameters.
- A pending `media_assets` row recorded **before** the signature is returned, so an abandoned upload-intent can be identified and swept later.
- Deletion (`destroy`) also requires a signature — cannot be done from the browser — so orphan cleanup is a **second** Edge Function (`cloudinary-delete`), authenticated, checked against `media_assets` ownership or admin scope, idempotent. **Cloudinary has no built-in orphan-detection feature** (confirmed — not found in current Cloudinary documentation); this must be custom-built as a DB-triggered cleanup or a periodic reconciliation job comparing `media_assets` rows with no attached live post against Cloudinary's asset list.

### 1.7 Failure sequence (see `CLAUDE_INTERFACE_GOVERNANCE.md §Failure design` for the full table)

Signature fails → no upload, no note, retryable error. Upload fails → mark the pending `media_assets` row expired, no note created. Upload succeeds, post insert fails → call `cloudinary-delete` immediately (idempotent rollback); if that also fails, leave the `media_assets` row in a `pending-orphan` state for a scheduled cleanup pass rather than losing track of it. Post insert succeeds, UI response is lost → never delete the media; reconcile by re-fetching the post from the database on next load.

---

## 2. Study PDF / Echo Library storage decision

### 2.1 Facts that decide this (verified, not assumed)

- `assets/study-files/` (the real, already-in-the-working-tree built-in PDF corpus): **377 files, 369 MB total.**
- The generated catalog (`data/study-resource-manifest.js`) references **~2468 scanned resources**; only those 377 have `fileUrl`/`demoAvailable:true` — the rest show an honest "not included in this demo" state. This is a deliberate, already-shipped UX pattern, not a bug to fix.
- The **actual current GitHub Pages deploy artifact is `EchoWall-portable-demo-v1.zip`, 6.17 MB**, manually maintained and decoupled from the working tree (`.github/workflows/deploy-pages.yml` just unzips it — it does not run a build step that would pull in `assets/study-files/`).
- **Strong inference, not yet independently confirmed by opening the zip:** the current live deployment almost certainly does not include the 369 MB study-files corpus, meaning Echo Library's "open a real file" action is very likely already broken or absent on the current live site. **Action before finalizing this section's cost/rollout estimate:** unzip `EchoWall-portable-demo-v1.zip` and check whether `assets/study-files/` is present. If absent, this migration *fixes* a pre-existing gap rather than introducing a new cost; if present, the 6.17 MB figure needs re-explaining (unusual for a 369 MB directory to compress to 6 MB, so absence is the more likely explanation).
- Study uploads are already real, working IndexedDB-backed storage (`echowall-study-uploads-v1`), PDF-only, 60 MB per-file cap, SHA-256 dedup, magic-byte (`%PDF-`) validation — **not** a stub. Production must not regress this to "less real" than it already is; IndexedDB is explicitly the wrong long-term store only because it's per-browser/per-device, not because the feature itself is unbuilt.

### 2.2 Options

| Option | Description | Verdict |
|---|---|---|
| **A** — built-ins stay static on Pages | Keep `assets/study-files/` as static Pages assets, ship the full 369 MB in the artifact | **Reject as sole strategy** — pushes total Pages artifact from 6 MB to 375+ MB; well within GitHub's hard 1 GB site-size guidance today, but wasteful of Pages bandwidth for content that changes rarely and benefits from CDN/access-control features Pages doesn't offer, and blocks any future "hide until reviewed" state for built-ins that turn out to need correction |
| **B** — all built-ins move to Supabase Storage | Every built-in PDF also goes through Supabase Storage | Workable, but discards a "these never change and are safe to serve directly" property the built-in catalog actually has, and Supabase Storage free-tier is capped well below what's useful here (verify current tier before committing budget) |
| **C — Hybrid (recommended)** | Built-ins stay static (served from Pages or, if size becomes a real problem, a separate low-cost static host / Git LFS / release asset — see below), new user PDFs use Supabase Storage with Postgres metadata/moderation | Matches the master task's own framing and the prototype's own already-built additive-overlay design (`getManifest()` already merges static built-ins with approved uploads at the query layer — this is Option C already implemented at the data layer, just needs the *uploads* half moved off IndexedDB) |

**Recommendation: Option C.** Concretely:
- Keep `data/study-resource-manifest.js`'s metadata static (Category C per the master task's taxonomy — it's generated, rarely changes, and the "never group by college" invariant is easiest to enforce as static code, not a live query).
- Decide the *file* hosting for the 377 built-in PDFs separately from the metadata: given 369 MB is inside GitHub's per-file/repo guidance but is a meaningful chunk of a "thin, fast" Pages artifact, recommend serving the built-in file set from **Supabase Storage as a public (read-only) bucket** rather than the Pages artifact itself — this keeps the Pages deploy thin and fast (matching the project's own apparent existing preference, evidenced by the 6 MB zip pattern already in use), gives a single storage/CDN answer for both built-in and user files, and avoids a second file-serving mechanism. This is a deliberate deviation from "keep everything static on Pages" — flag as requiring explicit owner sign-off since it's a real infrastructure choice, not just a migration mechanic.
- New user-submitted PDFs: Supabase Storage, **private** bucket, RLS-gated (see `CLAUDE_DATA_AUTH_RLS_REVIEW.md §1.7/§2`), promoted to a signed or public URL only once `moderation_status = 'approved'`.

### 2.3 If Supabase Storage is used for user submissions (design, per master task §11)

- **Bucket structure:** `study-submissions/{user_id}/{submission_id}/{sha256}.pdf` (pending, private) → on approval, either re-parented to a `study-published/` public bucket or simply flipped to public-readable via RLS/policy change without a physical file move (cheaper — recommend this).
- **Pending/private state:** default-deny RLS on the private bucket; only the contributor and `STUDY_MODERATOR`/`SUPER_ADMIN` scope can read a pending object (via `download()` with the caller's JWT, or a short-lived signed URL issued by an Edge Function).
- **Reviewer access:** `STUDY_MODERATOR` role (already modeled in the prototype's `AdminPermissionService`) reads pending files through the same signed-URL/JWT-gated path.
- **Approval/publication:** the approval RPC flips `study_submissions.moderation_status` and the bucket-object RLS/visibility together, transactionally with the audit-log write (same "audit-first" pattern as §1.8 of the data doc).
- **Signed vs. public URLs:** pending = signed URL, short expiry, reviewer-only; approved = public URL (or a long-expiry signed URL if the owner wants to avoid fully public file listing — open decision).
- **Max size:** keep the existing, already-validated 60 MB client-side cap (derived from the real corpus: median 0.43 MB, P95 3.01 MB, max 45.73 MB across the 377-file demo set) — but **verify Supabase Storage's current plan-tier file-size ceiling before committing to this number**: research confirms the *free* tier is capped at 50 MB per file, which would silently reject the current UI's largest allowed uploads; Pro tier raises this substantially. This is a concrete, numeric decision that affects which Supabase plan tier is required at launch — flag explicitly in `CLAUDE_ARCHITECTURE_DECISIONS.md` and `CLAUDE_GITHUB_RELEASE_OPERATIONS.md §cost`.
- **MIME/PDF signature validation:** reproduce the existing magic-byte (`%PDF-`) check **server-side** (Edge Function or a Postgres check before marking the row `pending`), not just client-side — the client check the prototype has today is a UX nicety, not a security boundary once files reach a real backend.
- **SHA-256 duplicates:** reproduce the existing dedup exactly — recompute the hash server-side (do not trust a client-reported hash) and block/flag exact-duplicate re-uploads, matching `moderation-assist-service.js`'s existing `evaluateStudySubmission()` duplicate-detection logic.
- **Object paths / orphan cleanup:** a rejected or abandoned submission's Storage object should be swept by the same kind of periodic reconciliation job as Cloudinary orphans (§1.6), or deleted synchronously when a submission is explicitly rejected (recommend synchronous delete-on-reject, since rejected files have no future use, versus Cloudinary images which might still be referenced elsewhere).

**Production submissions must not rely on IndexedDB as source of truth** — confirmed as the plan's explicit direction; IndexedDB is replaced entirely, not layered.

### 2.4 Clarified responsibility split (per master task framing)

- **Cloudinary** = user post photos only.
- **Supabase Postgres** = content/ownership/media metadata (both photo metadata and Study submission metadata).
- **Supabase Storage** = Study PDFs / non-image files only — both the built-in catalog (recommended, §2.2) and user submissions (required, §2.3). Not used for photos.
