# REPORT — STUDY-V2-007: Upload Study Material

Date: 2026-08-22 (session clock; see `study v2/checkpoints/STUDY-V2-007/PRE_STATE.md` for the
investigation that preceded implementation).

## Scope note — stage-gating override

`AGENTS.md`/`CLAUDE.md` normally require stopping and waiting for explicit approval between
stages (~15–20 min task budget). This run was executed under an explicit, one-time user override
to proceed through STUDY-V2-007 → 008 → FINAL-QA unattended (confirmed via an in-session
question before any code was touched). This report documents 007 only; 008/FINAL-QA are separate
reports.

## Completed

- `services/study-submission-service.js` (new): `StudyUploadService` — an IndexedDB-backed
  "Competition Demo Upload Storage" adapter, structured as a swappable provider
  (`ready/list/create/update/getFileBlob/subscribe`) mirroring `services/map-note-service.js`'s
  existing provider pattern, so a future real backend can replace it without touching any UI
  caller. Two IndexedDB object stores: `submissions` (metadata) and `files` (blobs, keyed by
  `sha256:<hex>` content hash — identical bytes uploaded twice are stored once).
- File validation: non-empty, ≤60MB (derived from the real 377-file demo set: median 0.43MB, P95
  3.01MB, max 45.73MB — measured, not guessed), `.pdf` extension, `%PDF-` byte-signature check.
- SHA-256 hashing via `crypto.subtle.digest`, matching the built-in manifest's own `fileId` format
  exactly.
- Duplicate detection: **exact** (same hash, scans built-in manifest + pending + approved
  submissions — blocks the submission with a thrown `EXACT_DUPLICATE` error) and **likely** (same
  subject+type+similar-year, ≥60% token-overlap title match, different hash — flagged
  `duplicateStatus:"likely"` but still accepted into moderation).
- Permission confirmation checkbox, required, in EN/BM/ZH.
- Every new submission starts `moderationStatus:"pending"`, `verificationStatus:"unverified"` —
  never auto-published.
- Question↔Answer Scheme linking: uploading either type can reference an existing resource
  (built-in, approved, **or the uploader's own still-pending submission**); linking two pending
  submissions to each other back-links both sides automatically
  (`StudyUploadService`'s `linkRelatedIfSubmission`), without ever mutating the frozen built-in
  manifest.
- `services/study-resource-service.js`: `getManifest()` now concatenates
  `StudyUploadService.getApprovedResourcesSync()` (approved-only) onto the untouched built-in
  array — the ONE integration point; every existing query function (search/filter/publishable/
  byId/related/file-url) picks up approved uploads automatically, and pending/rejected
  submissions are structurally unreachable through this path.
- `app-study.js`: real Upload form at `#/study/upload` (replacing the "coming soon" placeholder),
  cascading Jurusan→Semester→Subject and Type→Subtype selects, dynamic Related-Resource dropdown,
  sign-in gate (reuses `PermissionService.canUserPost`), inline validation, success/duplicate/error
  banners. Secondary (non-competing) "Upload Study Material" CTA added to `#/study` below Search.
  `studyOpenIndexedDbFile()` + branching in `studyResourceQuickOpenHtml()` and
  `renderStudyResourceDetail()` so an approved upload's file opens via `indexedDB://` blob
  resolution while every built-in file keeps using the exact same static-`<a href>` path as before.
- `app-router.js`: `StudyUploadService.ready()` kicked off at `DOMContentLoaded` (IndexedDB open
  is async) with a re-render once ready, plus a `subscribe()` re-render for `study*`/`admin` pages
  on any create/moderate event, and `echo:authchange` now also re-renders `study-upload`.
- `index.html`, `CLAUDE.md`: new script tag + updated script-load-order documentation.
- `i18n/locales/{en,ms,zh}.js`: ~55 new `study.upload.*` keys, all three languages, real-browser
  confirmed (see Testing).
- `style-study.css`: upload form + banner styles, reusing `style-core.css`'s existing
  `.form-group/.form-input/.form-select/.form-textarea` rather than a second design system.
- `scripts/test-study-upload.mjs` (new, persisted): a Node `vm`-sandbox direct-call suite with a
  hand-rolled minimal fake IndexedDB (this repo has no package.json/test runner — see
  `CLAUDE.md`), covering the full submission lifecycle against small fixture data.

## A real bug found and fixed during real-browser testing

The exact-duplicate error banner originally linked to the matched resource using
`StudyResourceService.isResourcePublishable(payload.resource)` as the "is this a working link"
check. That predicate only inspects the object's own fields (`reviewStatus`/`moderationStatus`/
`isDuplicate`) — it does not check whether the object is actually reachable through
`getManifest()`. A hand-constructed resource-shaped object for a still-**pending** duplicate
submission passes that predicate (its `moderationStatus` is `"pending"`, not `"rejected"`), so the
banner rendered a clickable link to `#/study/resource/<pendingId>` — which 404'd to "Study Notes
page not found" because pending submissions are never in the overlay. **Caught only by actually
clicking the link in a real browser**, not by the Node test suite (which doesn't exercise
`app-study.js`'s DOM code) or by static review. Fixed by checking real reachability directly
(`StudyResourceService.getResourceById(payload.resource.id)`) instead of the field-only predicate;
a non-reachable duplicate now shows its title as plain text, not a dead link. Re-verified in the
browser after the fix (see Testing).

## Modified Files

- `services/study-submission-service.js` → new file, upload storage + business logic.
- `services/study-resource-service.js` → `getManifest()` now overlays approved submissions.
- `app-study.js` → real Upload form, Study Home CTA, IndexedDB file-open branch, the duplicate-link
  bug fix above.
- `app-router.js` → `StudyUploadService.ready()`/`subscribe()` wiring, `echo:authchange` extended.
- `index.html` → new `<script>` tag.
- `CLAUDE.md` → script-load-order doc updated (also fixed a pre-existing gap: `app-study.js` was
  missing from that list even before this stage).
- `i18n/locales/en.js`, `ms.js`, `zh.js` → `study.upload.*` keys.
- `style-study.css` → upload form/banner styles.
- `scripts/test-study-upload.mjs` → new, persisted test suite.

## Testing

- **Direct-call (Node, fixture data)**: `node scripts/test-study-upload.mjs` → **49/49 passed**.
  Covers: guest rejection, missing-field rejection (title/jurusan/semester/subject/type/
  permission), wrong file type, empty file, oversized file, non-PDF-bytes-with-.pdf-extension,
  valid Lecturer/Student Notes uploads, Question↔Scheme bidirectional linking between two pending
  submissions, exact duplicate rejection, likely-duplicate flagging, non-admin moderation rejection,
  approve (metadata patch, audit log, no-auto-verify), `setVerification` as a separate action,
  reject (reason required, hidden from publishable/search), a rejected file's bytes being
  re-submittable, and the defensive exact-duplicate approve guard. Built-in manifest confirmed
  `Object.isFrozen === true` and length unchanged throughout.
- **Direct-call (Node, real 2468-item manifest, no StudyUploadService loaded)**: confirmed
  `getManifest()`'s overlay change is a true no-op when `StudyUploadService` is absent — 2284
  publishable resources, 138 SM015 search results, all identical to pre-STUDY-V2-007 behavior.
- **Real browser (Chrome, via claude-in-chrome, `http://localhost:8000`)**:
  - Signed-in user ("la"), Dark theme, EN: filled the full Upload form (cascading Jurusan→
    Semester→Subject confirmed populating real data; Resource Type→Subtype; Related Resource field
    correctly hidden until Type=Answer Scheme/Paper, then populated with real SM015
    papers/schemes), uploaded a real PDF via the file-input (`file_upload` tool, not a fabricated
    success), submitted — got a real "Submission received... Status: Pending review" banner.
  - Verified via `javascript_tool` directly against the live IndexedDB-backed service: the
    submission's blob was actually stored (265 bytes, `application/pdf`), `moderationStatus:
    "pending"`, `verificationStatus:"unverified"`, NOT in `getPublishableResources()`, NOT
    findable via `searchResources()`.
  - Re-uploaded the identical file bytes → "This file already exists." banner shown (exact
    duplicate correctly blocked in a real browser, not just in the Node mock).
  - Found and confirmed the duplicate-link bug above by actually clicking the link (see above);
    re-verified both branches (pending → plain text, built-in/approved → working link) after the
    fix, with a hard reload to bypass script cache.
  - `#/study` (Study Home): Upload CTA renders as a small secondary link below Search, does not
    compete visually with Search/Browse. Searching the pending submission's title → "No study
    materials match your search" (correctly hidden). Searching "SM015" → 138 results, filters/
    quick-open badges all rendering exactly as before (STUDY-V2-005/006 regression intact).
  - LocalStorage inspected directly (`Object.keys(localStorage)` + sizes): zero Study-related keys
    of any kind — confirms no PDF bytes, no base64, nothing Study-upload-related ever touches
    LocalStorage. `echo-wall-notes` (pre-existing community notes, 824KB) is the only large key
    and is unrelated to this stage.
  - Console: no errors at any point (`read_console_messages`, `onlyErrors:true`).
  - Light Mode: toggled and re-screenshotted the Upload form — renders correctly (light card/
    input backgrounds, correct token colors, no dark-mode-only regressions).
  - BM and ZH: switched language, re-viewed the Upload form both times — every visible string
    translated (no raw `study.upload.*` keys, no `[object Object]`, no console errors), including
    cascading-select labels and the permission-confirmation sentence.
- **Not verified**:
  - Mobile viewport: `resize_window` did not change `window.innerWidth` in this environment
    (confirmed via `javascript_tool` — stayed at 1536×639 after two resize attempts). Same class
    of tooling limitation prior stages hit with Safari's Accessibility permissions — this stage's
    new `.study-upload-grid`/`.study-upload-form` CSS uses the same `@media (max-width: 720px)`
    breakpoint and grid-collapse pattern already real-device-confirmed for STUDY-V2-004/006's
    `.study-detail-grid`/`.study-resource-row`, but was **not independently re-confirmed on an
    actual narrow viewport this stage**.
  - `docx`/`pptx`/`doc` upload: this version is PDF-only by design (spec section 15); not
    applicable to test.
  - Cross-tab realtime sync: by design, IndexedDB changes only trigger a re-render within the same
    tab/session (documented limitation in `app-router.js`'s comment) — not tested across two tabs.
  - Very large (near-60MB) real file upload: tested the size-limit rejection path with a declared
    `file.size` override rather than allocating a real 60MB+ file; the actual hashing/storage path
    was exercised only with small files. Believed correct (identical code path regardless of file
    size) but not empirically timed/verified for a large real file.

## Storage strategy

IndexedDB (`echowall-study-uploads-v1`, stores `submissions` + `files`), behind a
provider-swappable adapter. **PDF stored in LocalStorage/base64: NO — confirmed empirically in a
real browser**, not just by code review.

## SHA-256 duplicate detection

PASS (Node fixture tests + real browser).

## Exact duplicate

PASS (Node fixture tests + real browser, including the built-in-manifest-fileId path via unit
test).

## Likely duplicate

PASS (Node fixture test: flagged, not blocked).

## Permission confirmation

PASS (required client-side and server-side/service-layer; Node test + visible checkbox in three
languages in the browser).

## Pending moderation

PASS — every new submission starts pending/unverified; structurally excluded from
`getPublishableResources()`/search/`getResourceById` (Node tests + real browser confirmed both
ways: cached-state inspection and a live search-for-pending-title returning zero results).

## Auto published

NO (confirmed by construction and by test — `moderationStatus` is never anything but `"pending"`
at creation).

## Question/Scheme relation

PASS — bidirectional linking between two pending submissions confirmed (Node test); one-directional
linking to a built-in/already-approved resource is a documented, accepted limitation (frozen
manifest can't be mutated) — see the code comment on `linkRelatedIfSubmission`.

## Auth

PASS — guest upload rejected (Node test + relies on the same `PermissionService.canUserPost` gate
already used by the community wall's own posting flow); real browser session was already
signed-in, so the sign-in-prompt UI itself (not the underlying gate) was not independently
re-screenshotted this stage — the gate logic itself is directly tested.

## 377 demo files preserved

PASS — `find assets/study-files -type f | wc -l` → 377, `grep -c '"demoAvailable":true'` → 377,
both unchanged before/after this stage.

## 003/004/005/006 regression

PASS — real 2468-item manifest smoke test (2284 publishable, 138 SM015 results, unchanged) +
real-browser Search/Filter/Browse/quick-open re-verification, all identical to pre-stage behavior.

## Remaining Issues

- Mobile viewport not independently re-verified this stage (tooling limitation, see Testing).
- Admin Moderation (approve/reject/verify UI) does not exist yet — this stage only built the
  service-layer functions (`approveSubmission`/`rejectSubmission`/`setVerification`); no UI can
  call them yet. That is STUDY-V2-008, next.
- Question/Scheme back-linking to an already-*approved* (not built-in) resource was not
  separately tested — only pending↔pending and pending↔built-in were exercised. Expected to work
  identically (an approved submission is just a submission with `moderationStatus:"approved"`,
  same `linkRelatedIfSubmission` code path), but not empirically confirmed.

## Next Step

Proceed to STUDY-V2-008 (Admin Moderation / Verification) per the confirmed unattended-execution
override.
