# EchoWall Study / Echo Library File Hosting Plan

Status: implementation plan only; no application, data, storage, database, or deployment changes are authorized by this document.

Evidence date: 2026-08-29 (Asia/Singapore).

## Decision

Use **Option C — Hybrid** for the production launch:

- Preserve the current, curated Echo Library catalogue as a sanitized static release snapshot.
- Keep the current 377 curated, real files at relative GitHub Pages paths for the first production release.
- Store new user-submitted PDFs in private Supabase Storage; store submission, moderation, verification, relation, provenance, and file-lifecycle metadata in PostgreSQL.
- Merge only approved, published, visible remote resources into the public repository result. Pending and rejected submissions must never enter public queries.
- Retain IndexedDB only as the local-development/regression provider. It is never the production source of truth and is not a production failure fallback.
- Do not use Cloudinary for Study PDFs or Office documents. Cloudinary is the image pipeline; Supabase Storage is the user-document pipeline.
- Do not migrate the 377 curated files to Supabase at launch. Reconsider that move only after a measured trigger in this plan is crossed and a staged parity rehearsal passes.

This keeps the file-opening, unavailable-resource, search/filter/sort, and Question ↔ Answer Scheme behaviour closest to the current local baseline while removing user submissions from browser-only storage.

## Current local evidence

The current working tree, not an old GitHub snapshot or report, is the baseline. The following values were measured directly from the active local source and assets:

| Evidence | Current value | Production consequence |
|---|---:|---|
| `data/study-resource-manifest.js` | 2,198,190 bytes | It is a material initial JS payload and currently contains fields that must not be public. |
| Manifest resource records | 2,468 | Import all records privately with stable IDs and provenance; generate the public catalogue from the publishable subset. |
| `reviewStatus:auto_parsed` | 2,318 | Current publishability depends on this value, not academic verification. |
| `reviewStatus:manual_review` | 150 | These are not public in the current ordinary-user flow. |
| Exact duplicate records | 36 | Preserve duplicate flags; do not publish them as separate resources. |
| Current public/publishable records | 2,284 | Release acceptance must reproduce this count before any separately approved content review changes. |
| Current unavailable-but-visible public records | 1,907 | Preserve the honest unavailable state: 2,284 publishable metadata records minus 377 real-file mappings. |
| Question/Scheme pointers | 468 | Normalize without losing directionality. |
| Canonical unordered Question/Scheme pairs | 238 | 230 are bidirectional in the current manifest; 8 are one-way and must not be silently “repaired.” |
| `resourceGroupId` values | 1,142 | Preserve stable group membership during import. |
| Real curated files | 377 | Keep on Pages at launch and verify each mapping/hash in the Pages artifact. |
| Real-file formats | 363 PDF, 6 DOCX, 8 PPTX | Preserve real opening/download behaviour for all three; the user-upload pipeline remains PDF-only. |
| Real-file bytes | 385,308,898 bytes / 367.46 MiB | Fits below the current Pages 1 GB published-site limit but consumes meaningful bandwidth and repository headroom. |
| File-size distribution recorded by current source | minimum 26 KiB, median 0.43 MiB, P95 3.01 MiB, maximum 45.73 MiB | The current 60 MiB upload ceiling is evidence-based. |
| Static real-file subject codes | AA015, AP015, DC014, DP014, DP024, EA025, EE025, EM025, SM015 | All nine must be represented in parity tests. |
| Current user upload limit | `60 * 1024 * 1024` bytes | Requires a Supabase plan/configuration that permits at least 60 MiB. |
| Current upload format | PDF only | Keep PDF-only for user submissions. Do not infer support from the curated DOCX/PPTX files. |
| Current browser database | `echowall-study-uploads-v1`, version 1 | Production must not depend on it. |
| IndexedDB stores | `submissions` keyed by `id`; `files` keyed by SHA-256 `fileId` | The provider seam is reusable, but the production provider must be Supabase-backed. |
| Current upload tests | 74/74 passing | Use as regression evidence, not as proof of production storage/RLS safety. |

The manifest header records a 2026-08-21 generation run over 2,468 source files, 2,318 auto-parsed records, 150 manual-review records, one unextracted ZIP, 36 exact duplicates, 238 linked Question/Scheme pairs, and 377 hash-verified demo file copies. These header values agree with the measured record/file counts.

### Current publishability semantics to preserve

For built-in resources, the current public service considers a record publishable when:

```text
reviewStatus == auto_parsed
AND moderationStatus != rejected
AND isDuplicate == false
```

Academic verification is separate. A built-in resource can be publicly visible while `verificationStatus` is `unverified`. For a new user submission, the current service exposes it only after `moderationStatus == approved`; approval does not automatically change verification. Production must preserve that distinction:

- `scan_status` answers “is the uploaded object safe enough to publish?”
- `moderation_status` answers “did a reviewer accept this submission?”
- `verification_status` answers “how strongly has the academic/source material been verified?”
- `publication_status` and `visibility_status` answer “may the public retrieve it now?”

Do not overload any one field with all four meanings.

## Production blockers found in the current file surface

### Public manifest privacy leak

The current browser-delivered manifest is not a safe production public artefact:

- Its generator comments contain six absolute `/Users/lars_foh/Downloads/...` path occurrences.
- Every one of the 2,468 rows contains `sourceRelativePath`; source folder and original file names may contain personal, institutional, or operational details.
- It also publishes internal `sourceBatch`, `parseWarnings`, content hashes, duplicate provenance, and moderation-oriented fields. “Not rendered in the UI” is not private: anyone can download and inspect the JavaScript.
- If the GitHub repository is public, excluding the file from the Pages artifact does not remove it from repository source or history.

This is a production security/privacy blocker. Generate a sanitized public catalogue and keep full import provenance only in a private migration input and/or unexposed PostgreSQL tables. Never place the private import manifest in a public repository, Pages artifact, JS bundle, source map, or Actions artifact with public retention.

### Stale ZIP false-green

`EchoWall-portable-demo-v1.zip` is 5.89 MiB with 61 entries. It contains zero `assets/study-files` entries and no current Study manifest. `scripts/validate-portable-demo.mjs` validates files in the working tree; it does not open and verify that ZIP. A passing result therefore says nothing about that ZIP's completeness.

The ZIP must not be a deployment input. The Actions workflow must assemble a new allowlisted Pages artifact from the selected source commit, unpack or enumerate that exact artifact, and test the artifact itself. A release is blocked unless the artifact contains the sanitized catalogue, exactly 377 expected curated files for the launch seed version, `index.html`, `map.html`, and every referenced relative asset.

### Content safety and rights

The 377 existing files will be publicly downloadable from Pages. Before go-live, run a one-time trusted scan for malware, malformed/polyglot content, PDF active content, embedded files, external actions/links, and Office embedded/external content. Record the scan tool/version/result and SHA-256 per asset. Also record a publication-rights decision for every asset or source batch.

If a curated file cannot be cleared, keep its catalogue card but make the file unavailable. That preserves navigation and honest metadata better than silently deleting the resource.

**PARITY EXCEPTION — quarantined curated file**

- Why: production must not publicly serve a file that fails malware, privacy, or publication-rights review.
- User impact: its existing “Open” action becomes the current unavailable state.
- Mitigation: preserve its metadata, relation, filters, and unavailable explanation; restore only after clearance.
- User approval: required for each content-removal/quarantine decision because it changes the current visible real-file set.

## Options evaluated

| Option | Design | Parity | Security/operations | Cost and migration risk | Decision |
|---|---|---|---|---|---|
| A — Static built-ins + unspecified remote submissions | Keep curated files and current metadata on Pages; put new files in an unspecified remote store. | High for existing files. | Incomplete: does not by itself define authoritative submissions, review state, RLS, duplicate handling, or deletion. | Low initial movement but leaves browser/server truth ambiguous. | Reject as underspecified. |
| B — Move every built-in file to Supabase Storage | Upload all 367.46 MiB, replace every static mapping, and serve both built-ins and new files remotely. | Highest launch risk: 377 URLs/open flows and all relationships must be remapped at once. | Centralized controls and revocation are strong. | More egress, migration validation, object lifecycle, rollback, and provider dependency at launch. | Defer until a measured trigger is met. |
| C — Hybrid | Sanitized static catalogue snapshot and current 377 files remain on Pages; PostgreSQL is authoritative for submission/review metadata and private provenance; new PDFs use Supabase Storage. | Highest launch parity with bounded backend change. | Strong quarantine/RLS for untrusted uploads; existing static files require a pre-launch scan/rights gate. | Lowest irreversible migration risk; Pages bandwidth remains a monitored constraint. | **Recommend.** |

## Target file and catalogue architecture

```text
Curated import source (private) ──seed/import──> PostgreSQL canonical metadata
             │                                      │
             ├──sanitizer──> public catalogue snapshot│
             │                    │                  │ approved overlay query
             └──377 cleared files │                  │
                                  v                  v
                         GitHub Pages         Supabase Data API + RLS
                              │                       │
                              └──── StudyResourceRepository ────> existing UI

User selects PDF
  -> browser validates and hashes in a worker
  -> PostgreSQL draft/submission row (authenticated, idempotent)
  -> direct resumable upload to private Supabase Storage
  -> trusted finalization checks object/header/size and marks pending
  -> asynchronous safety scan + reviewer decision (backend contract now; Admin UI later)
  -> approved private object + published resource metadata
  -> short-lived signed read URL for a visible published resource
```

The UI must depend on `StudyResourceRepository` and `StudySubmissionRepository`, not on static paths, IndexedDB, Storage object paths, or vendor calls. The repository merges:

1. the versioned static curated snapshot;
2. the approved/published remote overlay returned through Supabase RLS.

Merge by stable public resource ID; never by display title. Apply the current sort/filter/search semantics after merge. If Supabase is unavailable, the curated catalogue and 377 built-in files continue to work, but remote-only content and upload actions show an explicit temporary-unavailable state. Do not write the failed operation to LocalStorage or IndexedDB as if it succeeded.

## Public catalogue and private provenance split

### Public catalogue fields

The generated Pages catalogue may contain only fields needed for current public behaviour:

- stable `public_id` matching the existing `study_*` route ID;
- title, jurusan, semester, subject code;
- resource type/subtype, topic, year/session;
- public source college/type where already displayed or filtered;
- language and public description;
- verification display state;
- availability kind (`static`, `remote`, `unavailable`);
- opaque static asset key or relative URL for the 377 curated files;
- stable public group ID and a projected related-resource ID only where current public behaviour exposes the relation;
- seed source/version and catalogue version only when needed for deterministic merge/cache invalidation.

Do not include source paths, original uploader filenames, uploader UUIDs, SHA-256 digests, Storage bucket/object paths, parsing warnings, rejection reasons, moderation notes, audit entries, reviewer identities, or internal duplicate evidence.

### Private canonical fields

PostgreSQL and private migration inputs retain the full provenance required for review, seeding, duplicate detection, and audit:

- current resource/public IDs and stable seed keys;
- original source batch/path only after a privacy review;
- SHA-256 and file size/type;
- parse/review warnings and duplicate provenance;
- contributor ownership for real submissions;
- moderation, verification, scan, publication, and visibility state;
- reviewer/reason/audit timestamps;
- object bucket/path and lifecycle state;
- relation import provenance and whether the current link was one-way or bidirectional.

Seed every curated row with `is_seed=true`, `seed_source='study-resource-manifest'`, a content-derived `seed_version`, and a stable `seed_key`. Do not create Supabase Auth users for built-in contributors.

### Release generation contract

The catalogue generator is a packaging step, not a framework migration. It must:

1. accept a pinned private import dataset/seed version;
2. validate unique public IDs, targets, groups, enum values, and relative static paths;
3. apply the existing built-in publishability rule;
4. emit the exact sanitized schema in deterministic sort order;
5. emit a catalogue SHA-256 and count manifest;
6. reject absolute paths, `sourceRelativePath`, `sourceBatch`, `parseWarnings`, user IDs, object paths, and secrets;
7. assert 2,284 public records and 377 static mappings for the launch seed version, unless an approved parity exception changes the recorded baseline;
8. verify each mapped file's SHA-256, extension, case-sensitive path, and size;
9. produce only relative URLs that work under a GitHub project subpath and a future custom domain.

## PostgreSQL/resource migration rules

The detailed table definitions live in `CODEX_SUPABASE_SCHEMA_RLS.md`; this file adds Study-specific migration invariants:

- Preserve each existing `study_*` identifier as the stable public route key, even if the database uses a UUID primary key internally.
- Import all 2,468 canonical metadata records privately so future reviewers can resolve the 150 manual-review records and 36 duplicates.
- Seed 377 static file-locator records with the measured bytes, format, hash, and relative asset key. Do not copy their bytes to PostgreSQL or Supabase Storage at launch.
- Store no binary/base64 document data in PostgreSQL.
- Generate the public 2,284-record snapshot from canonical seed rules; do not hand-maintain two catalogues.
- Keep the current 1,907 unavailable public records. `availability='unavailable'` is a valid state, not an error or placeholder to fabricate.
- Keep built-in `verification_status='unverified'` where current data says so. Do not mislabel auto-parsing as source/file verification.
- Approved user submissions create normal `study_resources` rows with `is_seed=false`, contributor ownership, audit provenance, and a remote file reference.
- Pending and rejected submissions remain in `study_submissions`/file metadata only and are excluded by the public view and RLS.
- Public views must use `security_invoker=true` and RLS, or remain outside the Data API. Explicit grants and RLS are both required because current Supabase projects may not auto-expose newly created tables.

## Question ↔ Answer Scheme migration

The current manifest has 468 `relatedResourceId` pointers collapsing to 238 unordered pairs: 230 bidirectional pairs and 8 one-way pairs. Migrate them to one row per semantic relation in `study_resource_relations`:

- `relation_type='question_answer_scheme'`;
- explicit `question_resource_id` and `answer_scheme_resource_id` after validating resource types;
- unique constraint on the canonical pair;
- `legacy_directionality` of `bidirectional`, `question_to_scheme_only`, or `scheme_to_question_only`;
- source seed/version and import timestamp;
- moderation/verification fields if a future reviewer repairs a relation.

Do not insert two relation rows to simulate bidirectionality. The repository projects the single relation into the current `relatedResourceId` return shape. For the 8 one-way records, preserve the visible direction until a human review approves a correction. Keep the current `resourceGroupId` as a stable legacy group key; do not infer additional relationships merely because records share a group.

Migration acceptance assertions:

- 238 canonical relation rows;
- 230 marked bidirectional and 8 marked one-way;
- zero missing relation targets;
- zero cross-subject Question/Scheme pairs unless explicitly present and approved in the source audit;
- every current public related-link and unavailable counterpart state matches local output.

## Supabase Storage design

### Buckets

Use two private buckets:

| Bucket | Purpose | Public flag | Writers | Readers | Object lifetime |
|---|---|---:|---|---|---|
| `study-submissions` | Quarantine/in-progress user uploads | private | authenticated owner through path-scoped RLS; trusted service | owner while active; future Study reviewer in scope; trusted service | incomplete orphan cleanup; pending retained by policy; rejected bytes removed after retention |
| `study-approved` | Cleared approved user PDFs | private | trusted publication function only | short-lived signed URL only when matching resource is published and visible; reviewer/service | until hide/delete/replacement policy acts |

Do not enable `upsert` for ordinary uploads. Set the bucket MIME allowlist to `application/pdf`, but treat it only as a first filter. Set the bucket/project file-size limit to at least 62,914,560 bytes when preserving the current 60 MiB UI limit.

Recommended paths:

```text
study-submissions/{auth_uid}/{submission_uuid}/{upload_uuid}.pdf
study-approved/{sha256[0:2]}/{verified_sha256}.pdf
```

Never use the original filename in an object path. Validate path components server-side. A random `upload_uuid` plus `upsert=false` prevents overwrite. A verified content-addressed approved path permits canonicalization; only the trusted publication operation may create or reuse it.

### Storage authorization

Enable RLS on all exposed metadata tables and use `storage.objects` policies with these invariants:

- An authenticated ordinary user can create an object only in `study-submissions/{auth.uid()}/...` and only for a draft/submission row they own.
- The owner can read an active private submission object; another ordinary user cannot enumerate or read it.
- Owner delete, if exposed at all, is limited to the owner's `draft`/`pending` object and must update the database lifecycle. Do not create a free-form delete-by-path API.
- Future Study reviewers can read pending objects only when an active database role assignment grants the appropriate Study scope. Never authorize from user-editable `user_metadata`.
- No browser role can insert/update/delete `study-approved` objects.
- A signed URL can be created only for an approved object linked to a `published` and `visible` resource. Use a five-minute expiry initially and return no object path for pending/rejected rows.
- Trusted Edge/service operations use a server-only Supabase secret credential. It must never appear in browser JavaScript, public config, repository source, logs, or the Pages artifact.

A direct Storage signed-URL call governed by RLS is preferred over a custom Edge endpoint when the cross-table policy is demonstrably correct. If the policy becomes too complex to prove, use a narrow `study-file-access` Edge Function that accepts a public resource ID, validates published/visible state, and returns a five-minute URL; do not expose a generic bucket/path signer.

Already issued signed URLs cannot be revoked before expiry. Five minutes bounds hide/delete lag. Static built-in Pages URLs remain permanent until a new Pages deployment; that is one reason every curated file needs pre-launch clearance.

## The 60 MiB plan decision

The current UI and service allow 60 MiB, while current Supabase Free-project file-size configuration is limited to 50 MB. Current official limits and pricing are time-sensitive.

Recommended launch decision: use a paid Supabase project/configuration that supports at least 60 MiB and set the application, bucket, server finalizer, and tests to the same exact byte ceiling: 62,914,560 bytes. This preserves visible parity and accommodates the measured 45.73 MiB maximum curated sample.

For uploads above 6 MiB, use Supabase's resumable TUS upload flow. Standard upload is acceptable only at or below 6 MiB. Persist only the resumable upload URL/fingerprint and client draft ID locally; do not persist the PDF bytes as production truth.

**PARITY EXCEPTION — 50 MB fallback**

- Why: Supabase Free cannot be configured to accept the current 60 MiB maximum.
- User impact: valid local uploads in the 50–60 MiB range fail in production, and the visible “60MB” hint/error must change.
- Mitigation: compress/split guidance is not a semantic substitute; preserve pending metadata only after a valid file is accepted. The current largest curated sample remains below 50 MB, but a user file may not.
- User approval: required. The preferred approval is the paid plan, not a silent lower limit.

## Upload and finalization sequence

### 1. Select and validate locally

Keep the current visible form and result states. Before any network write:

1. require a valid Supabase Auth session;
2. require permission/license attestation;
3. require a non-empty file with a `.pdf` extension;
4. accept browser MIME `application/pdf` or an empty MIME as a hint only; reject known non-PDF MIME;
5. enforce the exact byte ceiling;
6. read and compare the first five bytes to `%PDF-`;
7. compute SHA-256 in a Web Worker/incremental implementation so a 60 MiB file does not freeze the UI;
8. normalize the display filename but keep it private;
9. run current metadata validation and likely-duplicate heuristics.

Client validation improves UX; none of its results are trusted authorization or final safety evidence.

### 2. Create an idempotent draft

Generate `submission_uuid`, `upload_uuid`, and `idempotency_key` client-side. Insert or RPC-create an owner-bound draft through RLS. The server returns the canonical object path and expected size ceiling. Repeating the same idempotency key returns the same draft; it must not create another submission.

Store separately:

- `claimed_sha256` from the browser;
- `verified_sha256`, initially null;
- the permission statement version and acceptance timestamp;
- the original filename in private metadata only;
- `upload_state='initiated'`, public-facing `moderation_status='pending'` only after finalization.

### 3. Upload directly and resumably

Upload to `study-submissions` using the user's JWT and publishable Supabase key. Never proxy 60 MiB through PostgreSQL or a normal Edge Function. Use TUS for files over 6 MiB, `upsert=false`, bounded exponential backoff with jitter for 408/429/5xx, and no automatic retry for authorization/validation 4xx responses.

A network drop after Storage success is recoverable: retry finalization with the same submission/idempotency key. A double-click reuses the existing draft/object instead of creating a second row or upload.

### 4. Trusted finalization

A narrow user-JWT-authenticated finalization operation must:

- verify that caller, submission row, and object path owner agree;
- obtain the actual object byte size and stored content type;
- range-read/sniff the object start for `%PDF-` instead of trusting the browser;
- verify the object is complete and within the exact ceiling;
- compare the actual Storage object identity/version to the draft;
- transition `upload_state` once under a row lock;
- write the pending moderation item and audit event transactionally;
- return the existing success result when replayed.

Because an Edge Function has tight CPU limits, do not claim that it has authoritatively rehashed or malware-scanned a 60 MiB PDF unless an implementation benchmark proves that operation inside current limits. Treat the client digest as claimed until a trusted asynchronous scanner computes the authoritative SHA-256.

### 5. Quarantine scan

Before publication, a trusted asynchronous scanner must:

- compute authoritative SHA-256 over the stored bytes;
- validate PDF structure, not only the magic bytes;
- detect encrypted/password-protected or malformed PDFs according to policy;
- flag JavaScript, launch actions, embedded files, suspicious external actions, polyglot content, and known malware;
- record scanner engine/signature versions and a tamper-evident result;
- keep suspicious/failed objects private and require reviewer disposition.

Do not run an unbounded antivirus process inside the browser. Do not publish before a clean result. Supabase Edge Functions may orchestrate a scanner, but a 60 MiB antivirus/parser job should run in a service/worker whose current CPU/time limits have been verified. If no scanner is approved for launch, accept uploads only into private pending quarantine and postpone approval/publication; never treat “pending” as “safe.”

### 6. Duplicate decision

Use authoritative SHA-256 for the final decision:

- Exact match to an active built-in/approved resource: reject as exact duplicate and return the existing public resource ID when disclosure is safe.
- Exact replay for the same owner/idempotency key: return the existing submission.
- Exact match to another active pending submission: block or merge according to ownership/privacy policy; do not reveal another uploader's identity.
- Likely metadata/title/year match with different bytes: preserve current behaviour—accept as pending with `duplicate_status='likely'` and a reviewer hint.
- Rejected submission resubmission: preserve current behaviour by allowing a new quarantine object and new scan. Never automatically reuse bytes rejected for safety.

Use a partial unique constraint for authoritative hashes of non-rejected, canonical resources rather than trusting `claimed_sha256`. A publication transaction must re-check the constraint to close the race between simultaneous submissions.

### 7. Reviewer decision and publication

Admin UI is explicitly deferred. Reserve the backend operation now for a future Study reviewer/global admin; launch may run pending-only until that operational path is approved.

The privileged publication state machine is:

```text
pending + scan_status=clean
  -> publishing (row lock + idempotency reservation)
  -> copy/reuse verified hash object in private study-approved bucket
  -> one PostgreSQL transaction:
       approve submission
       create/update non-seed study_resource
       link approved file
       create approved relation(s)
       set publication=published, visibility=visible
       append immutable audit event/reason
  -> mark source quarantine object cleanup-eligible
```

Storage copy and PostgreSQL commit are not one transaction. Make failure safe:

- Copy failure: leave the database `pending`/`publication_failed`; no public resource exists.
- Copy success + DB failure: approved bucket is private, so the object is an unreferenced private orphan; retry idempotently or remove after the orphan window.
- DB finalize success + response loss: replay returns the committed resource and signed-open contract.
- Pending-source delete failure after success: keep both private copies temporarily and clean asynchronously; never roll back the published metadata solely because cleanup failed.

Approval does not automatically set academic verification. A reviewer must choose `unverified`, `verified_source`, or `verified_file` separately. Hide/restore/delete, rejection reason, reviewer identity/scope, and immutable audit fields are required now for future Admin, but no Admin UI is designed or built here.

## File lifecycle and cleanup

| Condition | Detection | Action | Initial deadline |
|---|---|---|---:|
| Draft row, no object | `initiated` with no matching Storage object | expire draft; preserve minimal audit/idempotency tombstone | 24 hours |
| Object, no draft/submission | Storage inventory left join | mark orphan, then delete if no active upload lock | 24 hours |
| Upload complete, finalization failed | object exists, state not finalized | allow idempotent retry; then quarantine/delete | 24 hours after last retry |
| Scan failed transiently | `scan_status=failed` | bounded retry; then reviewer/manual hold | 7 days |
| Rejected content | final rejection | retain metadata/audit; delete bytes after appeal/retention policy | proposed 30 days; user approval required |
| Approved source copy remains | publication committed and approved canonical object exists | delete quarantine source asynchronously | 24 hours |
| Approved private orphan | no committed file/resource reference | delete after idempotency/reconciliation check | 24 hours |
| Hidden resource | moderation hide | deny new signed URLs; retain bytes for restore | policy-controlled |
| Deleted resource | approved delete contract | remove object, tombstone metadata, append audit | after retention/legal hold |

Do not automatically delete legitimate pending submissions merely because Admin UI is postponed. Start with per-user and global quotas, backlog alerts, and an explicit retention decision before applying an age-based pending purge.

Recommended initial abuse/cost guardrails:

- maximum 5 upload starts per authenticated user per hour and 20 per day;
- maximum 2 concurrent uploads per user;
- maximum 10 active pending submissions or 250 MiB pending bytes per user;
- alert at 70% and block new uploads at 90% of the purchased Storage budget;
- pause the upload feature transparently if the review backlog has no operational owner; keep Library reads available;
- retain audit metadata after byte deletion according to the separate audit-retention policy.

## IndexedDB production role

`echowall-study-uploads-v1` is a sound prototype/local provider but cannot be production truth because it is device-local, unaudited, unmoderated across users, and lost when browser storage is cleared.

Production rules:

- `SupabaseStudySubmissionRepository` is the only authoritative provider in production configuration.
- `LocalIndexedDbStudySubmissionRepository` remains available only for local development and regression comparison behind an explicit non-production flag.
- Production startup must fail closed for writes if Supabase configuration is missing. It must not silently instantiate the local provider.
- Local browser persistence may hold form drafts, TUS resume URLs, and idempotency IDs; it must not claim an upload is submitted until the backend finalizes it.
- Do not retain a second full PDF copy in IndexedDB after remote success.
- On backend outage, show a retryable failure/maintenance state and retain only user-controlled selection/draft state. Never fabricate success.

## GitHub Pages packaging and capacity

The current 367.46 MiB Study file set is below GitHub Pages' current 1 GB published-site limit. The manifest is about 2.10 MiB, and the full non-`.git` working tree was measured at about 683.18 MiB because it also contains large non-production material. Therefore:

- Never deploy the repository root wholesale.
- Build an explicit allowlist artifact containing runtime HTML/CSS/JS/data, required building assets, the sanitized Study catalogue, and only the 377 cleared `assets/study-files` files.
- Exclude videos, reports, checkpoints, source import archives, the stale portable ZIP, private manifests, planning files, and development-only assets.
- Validate artifact size uncompressed before upload and after GitHub's artifact packaging.
- Verify every file through its real project-subpath URL in staging. Do not use leading-root URLs.
- Use a catalogue/seed version to invalidate metadata caches; keep content-addressed file names immutable.

The current average curated asset is approximately 0.97 MiB, but the maximum is 45.73 MiB. Pages' current 100 GB/month bandwidth limit is soft and time-sensitive; real usage must be measured rather than estimated only from catalogue size.

### Trigger for moving curated files later

Evaluate Option B as a separate, reversible migration when any of these conditions occurs:

- deployed uncompressed Pages artifact is at or above 750 MiB for two consecutive releases;
- curated Study files are at or above 600 MiB;
- measured Pages bandwidth is at or above 70 GB in a rolling 30-day period, or Study downloads alone exceed 50 GB for two consecutive periods;
- Pages deployment duration exceeds 8 minutes for two consecutive releases;
- real-file open failure rate exceeds 1% or P95 open latency exceeds 3 seconds for two consecutive weekly windows after excluding user-network failures;
- moderation/legal policy requires immediate per-file revocation that Pages deployments cannot meet.

Crossing a trigger starts a staging migration assessment; it does not authorize an emergency bulk move. Move only after all 377 hashes, URLs, content dispositions, relation flows, and rollback paths pass in staging, and keep the prior Pages file set for at least one rollback window.

## Cost and capacity assumptions

As of the evidence date, official Supabase pricing describes Free Storage around 1 GB and Pro included Storage around 100 GB; Free and Pro egress allowances and overage pricing differ and can change. A 60 MiB maximum upload can consume a 1 GB project quickly, especially because quarantine and approved copies briefly coexist. The recommended production posture is a paid project with budget alerts, not a Free project that silently forces a lower file limit or fills during a moderation backlog.

Track at minimum:

- active pending bytes and count by owner/age;
- approved bytes and unique verified hashes;
- temporary double-copy bytes;
- upload failures/resumes/finalization retries;
- scan queue age and failure rate;
- signed URL generation and download egress;
- orphan count/age and cleanup outcomes;
- Pages artifact bytes and Study download bandwidth;
- duplicate bytes avoided by canonicalization.

Recheck current plan limits, maximum object size, Edge limits, Storage egress, and GitHub limits immediately before implementation and again before go-live.

## Phased implementation, rollback, and gates

### Study Phase S0 — freeze evidence

- Inputs: current source, 2,468-row manifest, 377 files, current tests.
- Produce planning-era checksums/count manifest only during implementation, not now.
- Record 2,284 public, 1,907 unavailable, 238 canonical pairs, and current route/open snapshots.
- Go: all counts and current file hashes reproducible.
- No-go: missing file, duplicate public ID, unresolved target, or working-tree mismatch.
- Rollback: none; read-only baseline capture.

### Study Phase S1 — sanitize and seed metadata

- Create private import representation, deterministic PostgreSQL seed, relation rows, and public catalogue generator.
- Keep current static repository/provider active.
- Test public output field allowlist and exact behaviour/counts.
- Go: no absolute/source paths or private fields in public artifact; current search/filter/sort/unavailable/relation tests pass.
- No-go: any public count/ordering/route drift without approved exception.
- Rollback: continue serving the current local provider in non-production; do not deploy unsafe manifest.

### Study Phase S2 — Supabase submission provider

- Create tables/RLS, private buckets, direct TUS upload, finalization, idempotency, quotas, and cleanup reconciliation.
- Run in staging with production local fallback disabled.
- Go: owner/other-user/reviewer/anon RLS suite, PDF validation, 60 MiB plan test, network-recovery, and pending-not-public tests pass.
- No-go: any direct-object read, pending resource leak, double-submit duplicate, or secret in public artifact.
- Rollback: feature-flag uploads unavailable; retain remote draft/pending data; built-in Library remains static and readable.

### Study Phase S3 — publication backend contract

- Implement asynchronous scan integration and idempotent reviewer publication/hide/delete contracts without Admin UI.
- Go: a clean staged PDF publishes once, a suspicious PDF never publishes, signed access follows visibility, audit is immutable, and every injected storage/DB failure reconciles safely.
- No-go: approval without clean scan, unscoped reviewer action, public orphan, or inability to hide access within signed-URL TTL.
- Rollback: disable publication action; keep pending objects private. Do not delete evidence.

### Study Phase S4 — Pages production release

- Deploy the sanitized static catalogue and exactly 377 cleared built-ins in the allowlisted artifact; enable Supabase overlay/upload only after backend gates pass.
- Go: full parity/security matrix below passes from the production origin and project subpath; rights/security sign-off exists.
- No-go: stale ZIP used, artifact exceeds limits, source paths leak, file mappings fail, or production RLS differs from staging.
- Rollback: redeploy the known-good Pages commit/artifact configuration and disable remote upload/overlay. Database/storage rows remain intact for forward recovery.

## Parity and security acceptance matrix

| Test | Method | Pass criterion |
|---|---|---|
| Catalogue cardinality | Compare current service output to sanitized static snapshot | 2,284 public records for launch seed version; 1,907 preserve unavailable state. |
| File mapping | Enumerate deployed artifact and HTTP-open every expected path | Exactly 377 mappings/files; SHA-256 and case-sensitive relative URL match. |
| File types | Open/download representative and all automated URLs | 363 PDF open flows, 6 DOCX and 8 PPTX download/open flows remain functional. |
| Project subpath | Test `owner.github.io/repository/...` and future custom-domain base | No leading-root/path break; direct Study detail and back navigation work. |
| Browse/search/filter/sort | Golden fixtures across jurusan/semester/subject/type/year/source | Same inclusion, ordering, counts, empty/unavailable labels, and pagination behaviour. |
| Question/Scheme | Golden all 238 relation rows | Current forward/reverse visibility preserved; 8 one-way cases do not gain fabricated backlinks. |
| Stable routes | Open every sampled `#/study/resource/study_*` route | Same record or current unavailable/not-public state; IDs do not change. |
| Upload validation | Empty, wrong extension, MIME spoof, bad `%PDF-`, zero byte, exact limit, limit+1 | Same current user-facing validation, plus server rejects every bypass. |
| 60 MiB upload | TUS test at boundary with interruption/resume | Completes once on selected paid plan; exact metadata/bytes recorded. |
| Pending isolation | Query Data API, Storage, guessed URL, direct REST as anon/other user | No pending metadata/object/file bytes are disclosed. |
| Approved publication | Publish one clean fixture through backend contract | Appears once in merged search/detail, preserves verification, and opens by short-lived URL. |
| Signed URL expiry/hide | Mint, expire, hide, retry | New access denied immediately after hide; old URL stops within five minutes. |
| Duplicate hash | Concurrent same-file finalize | One canonical publishable resource/object; deterministic existing/duplicate response. |
| Likely duplicate | Similar metadata, different bytes | Accepted pending with reviewer warning, not auto-published. |
| Rejected resubmission | Resubmit identical rejected fixture | New quarantine/scan allowed; rejected object is not silently reused. |
| Double submit/replay | Double-click and drop response after success | Same submission/resource returned; no duplicate row/object/audit decision. |
| Supabase outage | Disable Data/Storage/Function paths | Built-ins continue; upload/remote overlay reports outage; no IndexedDB fake success. |
| Scanner failure | Timeout/malformed/encrypted/active-content fixtures | Remains private and non-publishable; bounded retry and audit record. |
| RLS matrix | anon/auth owner/other/reviewer/global/service direct requests | Only documented operations succeed; role from trusted DB assignment, never user metadata. |
| Public artefact privacy | Recursive string/field scan of exact Pages artifact | No `/Users/`, drive paths, source paths/batches, original names, hashes, object paths, uploader IDs, moderation/audit data, or secrets. |
| Packaged-artifact truth | Inspect exact tar uploaded by Actions | Tests run against artifact contents; stale ZIP is absent and cannot produce a green release. |
| Orphan reconciliation | Inject Storage success + DB failure and the reverse | Private orphan is retried/cleaned; no public orphan or lost committed resource. |
| Seed provenance | Query seeded and user rows | Curated records are `is_seed`; user submissions are not; analytics can exclude seed activity. |

## Go-live acceptance criteria

Study/Echo Library is ready for public production only when all are true:

- the current local runtime remains the documented parity baseline;
- the sanitized public catalogue passes its strict field allowlist and count/hash manifest;
- no private import manifest or original source path is in the repo/public artifact according to the chosen repository visibility policy;
- publication rights and one-time safety scans are recorded for all 377 served files;
- exact Pages artifact size is below 750 MiB and every real file opens from the project subpath;
- the Supabase project supports the approved 60 MiB or approved 50 MB parity exception;
- RLS and Storage policies pass anon/owner/other/reviewer/service bypass tests;
- pending and rejected submissions are not public through UI, Data API, Storage, guessed URLs, or direct REST;
- TUS interruption, idempotent retry, duplicate races, scanner failures, and orphan cleanup have passed fault injection;
- no Supabase secret/service credential is present in frontend config or the Pages artifact;
- Admin UI remains disabled/deferred; only the reserved reviewer backend contract exists;
- upload/publication can be disabled without harming built-in Library reads;
- rollback has been rehearsed against a known-good Pages release and retained Supabase rows.

## Decisions requiring user approval

1. **Supabase capacity:** approve a paid plan that preserves the 60 MiB limit (recommended), or approve the visible 50 MB parity exception.
2. **Content rights/privacy:** approve public hosting of the 377 curated files and the sanitized 2,284-record catalogue after the rights/PII scan. Any uncleared file must be approved as a parity exception and made unavailable.
3. **Repository visibility/history:** decide whether the production repository is public or private. If public, approve a remediation plan for the already tracked full manifest/path history; merely excluding it from Pages is insufficient.
4. **Launch publication scope:** recommended: allow authenticated uploads into private pending quarantine, but keep approval/publication disabled until a trusted scanner and reviewer operating process exist. Approve if publication of user files must instead be in the first public launch.
5. **Approved-file access:** approve private `study-approved` objects with five-minute signed URLs (recommended) rather than permanent public bucket URLs.
6. **Retention:** approve rejected-byte retention (proposed 30 days), pending retention, audit retention, and any legal-hold/appeal requirements before cleanup is enabled.

## Official documentation and date-sensitive assumptions

Verified/recorded for this plan on 2026-08-29; recheck before implementation and go-live:

- GitHub Pages custom Actions workflows: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Pages limits: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>
- GitHub repository limits: <https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits>
- Supabase Storage bucket fundamentals/private-vs-public: <https://supabase.com/docs/guides/storage/buckets/fundamentals>
- Supabase Storage access control/RLS: <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase Storage ownership: <https://supabase.com/docs/guides/storage/security/ownership>
- Supabase standard uploads and the recommendation to use resumable uploads above 6 MB: <https://supabase.com/docs/guides/storage/uploads/standard-uploads>
- Supabase resumable TUS uploads: <https://supabase.com/docs/guides/storage/uploads/resumable-uploads>
- Supabase file-size limits: <https://supabase.com/docs/guides/storage/uploads/file-limits>
- Supabase file downloads and signed URLs: <https://supabase.com/docs/guides/storage/serving/downloads>
- Supabase Storage pricing: <https://supabase.com/docs/guides/storage/pricing>
- Supabase platform pricing: <https://supabase.com/pricing>
- Supabase Data API security and explicit exposure/grants: <https://supabase.com/docs/guides/api/securing-your-api>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Edge Function limits: <https://supabase.com/docs/guides/functions/limits>

Time-sensitive assumptions include the Pages 1 GB published-site and 100 GB/month soft bandwidth limits, the Supabase Free 50 MB file ceiling, included Storage/egress, Edge CPU/wall-time limits, pricing, and GitHub Actions versions. Pin implementation dependencies/actions to reviewed versions or commit SHAs and record the re-verification date in the release evidence.
