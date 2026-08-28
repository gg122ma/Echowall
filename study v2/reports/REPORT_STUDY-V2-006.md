# REPORT — STUDY-V2-006: Actual File / PDF Opening

Date: 2026-08-21

## Scope

Resource Detail (`#/study/resource/:resourceId`) now offers a real, working "Open PDF"/"Open
file" action for any resource in a curated "Competition Demo File Set" (377 real files, ~422MB,
copied from the real course-material folders and verified by re-hash against each resource's
existing `fileId`). Resources outside that set still show an honest disabled state — never a fake
or dead link. Resource List rows gained an optional lightweight file-type badge + quick "Open →"
link. Browse Hierarchy, category tabs, year grouping, Question/Scheme pairing UI, Community,
Building, Echo Map, Admin, Auth: untouched.

## §2 — Physical source file investigation (performed BEFORE writing any code)

```
Total publishable resources: 2284
Files physically available (on the real source folders): 2284  (100%)
PDF: 2196
DOC/DOCX: 74 (docx) + 4 (doc) = 78
PPT/PPTX: 10
Other (unrecognized extension, among publishable items): 0
Missing source files: 0
```

Total size of ALL 2284 publishable files if copied wholesale: ~2.52GB (largest single file:
63.4MB — safely under any per-file limit). This is smaller than the ~5.3GB of raw source
material (which also includes non-publishable/manual_review/duplicate files), but still large for
a static competition build's working tree — so a curated demo subset was built instead of a
wholesale copy (see §4 below).

## §4 — Competition Demo File Set (what was actually decided and why)

Chosen: **full coverage of 9 real subjects** (every publishable resource in each of these subjects
has a real file — no subject in this set looks half-broken) spanning all 3 jurusan that currently
have real data:

- kejuruteraan: **EE025, EM025, EA025** — all 3 real Engineering subjects (~4.8MB total)
- perakaunan: **AA015, AP015** — the two subjects prior stages' reports/tests already used
- sains: **SM015** (heavily tested in STUDY-V2-004), **DP024, DC014, DP014** — added specifically
  for notes/summary/by_topic/lab_manual category coverage

Result: **377 files, ~422MB on disk** (363 PDF, 8 PPTX, 6 DOCX). Together these 9 subjects cover
every `resourceType`/`resourceSubtype` actually present anywhere in the real 2468-item manifest
except `lecturer_notes` — which does not exist in the real data at all (0 resources anywhere have
`resourceSubtype: "lecturer_notes"`; this is a true fact about the source material, not a gap in
the demo set). `sains_komputer` still has 0 real subjects (unchanged since
STUDY-V2-FOUNDATION-001) — nothing to include there.

Every other publishable resource (1907 of them) is marked `demoAvailable: false`, `fileUrl: null`
and renders the honest "File not available in this demo" state — never a fake link.

## Required fields

- **Physical source files inspected**: Yes — see §2 table above, produced by directly
  cross-checking all 2284 publishable manifest items against the real files on
  `~/Downloads/Engineering`/`Perakaunan`/`Science ` before any code was written.
- **File serving strategy**: Static files, no dynamic server-side path handling. A curated
  "Competition Demo File Set" (9 full subjects, 377 files) is copied into `assets/study-files/`
  at build time by the new `scripts/build-study-demo-files.mjs`, named by `resourceId` (e.g.
  `assets/study-files/study_1e9ead2cfebc2a86f06e.pdf`) — never the original title or folder path.
  The manifest's `fileUrl` field is precomputed static data; `StudyResourceService
  .getResourceFileUrl()` is the only place that reads it — `app-study.js` never constructs a path
  itself. Because this is plain static-file hosting (same as every other asset in this repo, e.g.
  Python's `http.server` locally or GitHub Pages in production) with no server-side code that
  accepts a path parameter, `../` traversal / query-string filesystem access are structurally
  impossible, not just runtime-checked.
- **Files exposed**: 377 (363 PDF, 8 PPTX, 6 DOCX) — see §4 for the exact subject list and
  reasoning.
- **Total exposed size**: ~422MB on disk (`du -sh assets/study-files/`).
- **PDF opening**: Verified — real browser test opened a real Question PDF
  (`study_1e9ead2cfebc2a86f06e.pdf`, SM015 PSPM 2022/2023) directly via its served URL: real exam
  content rendered (KMKJ letterhead, "SM015 Mathematics 1", instructions). Confirmed the
  Resource Detail page's "打开 PDF"/"Open PDF" button is a real `<a href="...fileUrl..."
  target="_blank" rel="noopener noreferrer">`, not a disabled button, for every demo-available PDF
  resource (also verified by the direct-call suite across the full 377-item demo set).
- **Question opening**: Verified — the Question PDF above opened correctly, content matches its
  metadata (SM015, PSPM, 2022/2023).
- **Answer Scheme opening**: Verified — its paired Scheme
  (`study_9f4fc2eecb79cc241d6c.pdf`) opened directly via its served URL: real, distinct content
  ("ANSWER SCHEME", SM015 Mathematics 1, KMKJ, worked solutions table with marks/remarks columns)
  — visually confirmed as genuinely different from the Question PDF, not a copy/misrouted file.
- **Question/Scheme mapping**: Verified — direct-call suite checked 10 real Question↔Scheme pairs
  (5+ required) that are both in the demo set: every pair resolves to two DIFFERENT physical
  files, both exist on disk, both hash-match their recorded `fileId`, and each resource's own
  Detail page links ONLY to its own `fileUrl` (never the other's) — the exact "Question button →
  Scheme PDF" mapping bug the request warned against does not occur. The SM015 pair above was also
  visually spot-checked end-to-end in a real browser.
- **Non-PDF handling**: Verified — a real DOCX resource (`[Q&A] Bahagian Matrikulasi PRA-PSPM
  20_21 AA015`) renders a real `<a href="...fileUrl..." download>` labeled "打开文件"/"Open file"
  (not "Open PDF") with a "DOCX" type badge, confirmed both in the direct-call suite and a real
  browser screenshot. PPTX/DOC behave identically (same code path, verified via
  `getResourceFileType()`'s extension-derived branch, not per-type special-casing).
- **Missing files**: 0 — every one of the 377 demo-set files exists on disk and hash-matches its
  recorded `fileId` (verified both at copy time by `scripts/build-study-demo-files.mjs`'s own
  re-hash check, and independently re-verified by the test suite).
- **Broken public URLs**: 0 — verified two ways: (1) all 377 demoAvailable files individually
  checked (exist + hash-match), (2) a genuinely random 20-resource spot check spread across the
  full 2284-item publishable pool (stride-sampled, not clustered) found 0 broken/mismatched URLs
  among the demo-available resources in that sample, and confirmed every non-demo resource in the
  sample correctly renders the honest unavailable state rather than a dead link.
- **Local absolute paths exposed**: 0 — verified by direct-call assertions (no `fileUrl` contains
  "Users"/"Downloads"/a leading "/"/".."), by reading `renderStudyResourceDetail()`'s full
  template (only an allow-listed field set is ever interpolated — `sourceRelativePath`/
  `sourceBatch`/`fileId` are never rendered, confirmed for both a demo-available AND a
  non-demo-available resource), and visually confirmed in real browser screenshots.
- **Desktop**: Verified — real Safari window (~1460×960): Question Detail page (real "Open PDF"
  button + PDF badge + related Scheme link), the Question PDF itself, the paired Scheme PDF, a
  DOCX Resource Detail page, and a non-demo resource's honest disabled state — all screenshotted.
- **Mobile**: Verified — real Safari window (~420×900): AA015 Subject list with file-type badges
  and row-level "打开 →" quick-open links renders cleanly, no overflow, no overlap.
- **Dark**: Verified — every screenshot above was taken with Dark theme active (persisted from
  the user's own prior session); all new elements (file badges, PDF button, disabled-state note,
  row quick-open link) render correctly against dark theme tokens.
- **Light**: Not verified — same environment constraint as every prior stage this session: no
  Accessibility permission for UI click automation and no "Allow JavaScript from Apple Events" in
  Safari, so the theme toggle (a click target) could not be exercised from this environment.

## Testing performed

1. **Direct-call test suite** (`/private/tmp/.../scratchpad/test-study-v2-006.js`), 39/39 passing,
   loading the real, unmodified `app-data.js`, `data/study-subjects.js`, the real (now-augmented)
   `data/study-resource-manifest.js`, `services/study-resource-service.js`, `app-router.js`,
   `app-study.js` into one Node `vm` context, PLUS direct filesystem/hash checks against the real
   377 files in `assets/study-files/` — covers every required field above against real data.
2. **`node --check`** on all touched/new `.js` files: clean.
3. **CSS brace-balance check** on `style-study.css`: 65/65 balanced.
4. **Real browser** (Safari, dedicated new window, never the user's own tabs — opened, verified,
   and explicitly closed by window index so none of the user's other live tabs/windows were
   touched): Question Detail page, the Question PDF (native Safari PDF viewer), the paired Scheme
   PDF, a DOCX Resource Detail page, a non-demo resource's Detail page, and AA015's Subject list at
   mobile width — 6 screenshots total, all visually inspected.
5. Re-ran `test-study-v2-004.js`: 35/36 (was 36/36). The one difference
   ("Resource Detail 'Open file' button is disabled") is an **expected, documented** outdated
   assumption from before this stage — it tests against AA015's first publishable resource, and
   AA015 is now fully in the demo set, so that resource's Open button is CORRECTLY no longer
   disabled. Not a regression; re-verified via `test-study-v2-006.js`'s check #5 (a resource NOT
   in the demo set, SM025, still shows the honest disabled state).

## Requested / Completed / Not Completed / Future Work

- **Requested**: real PDF/file opening for real resources, honest handling for anything not
  actually served, no local path leakage, Question/Scheme mapping integrity, broken-link spot
  check, i18n, checkpoint + report + memory updates.
- **Completed**: all of the above (see field-by-field results).
- **Not Completed**: Light Mode real-browser toggle verification (tooling limitation, not a code
  gap — same as every prior stage). The remaining 1907 publishable resources outside the curated
  demo set do not have real files — by design (see §4), not an oversight; each renders the honest
  "not available in this demo" state.
- **Future Work** (not started, explicitly out of scope): Search/Filter (STUDY-V2-005), full
  object-storage-backed file serving for the complete 2284-resource set beyond the demo,
  Upload (STUDY-V2-007), Admin Moderation (STUDY-V2-008).
