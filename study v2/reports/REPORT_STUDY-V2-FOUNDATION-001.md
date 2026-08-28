# REPORT_STUDY-V2-FOUNDATION-001

**Task ID:** STUDY-V2-FOUNDATION-001 — Homepage entry + STUDY-V2-001 (Inventory/Taxonomy/Subject
Registry) + STUDY-V2-002 (Metadata Manifest Foundation) + canonical Study routes foundation
**Status:** PASS
**Spec:** `study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf` (EW-STUDY-V2-001)
**Checkpoint Path:** `study v2/checkpoints/STUDY-V2-FOUNDATION-001/`

## Completed

- **Homepage entry point**: a new `Study Notes` promo section inserted between the existing
  Community CTA and Building Stories sections (`renderHome()`, `app-router.js`), routing to
  `#/study`. Reuses `.map-promo`'s structural CSS (color-overridden only, in `style-study.css`) —
  not Community's pointer-glow card.
- **STUDY-V2-001 (Inventory + Taxonomy + Subject Registry)**: `data/study-subjects.js` — 4
  Jurusan (`sains`/`perakaunan`/`sains_komputer`/`kejuruteraan`) and 32 real Subject codes, every
  one of them cross-verified against the actually-scanned files (see below) — zero invented codes.
- **STUDY-V2-002 (Metadata Manifest Foundation)**: `scripts/build-study-manifest.mjs`, a real,
  runnable scanner (SHA-256 hashing, path/filename metadata parsing, Question↔Scheme linking,
  manual-review flagging), run for real against the three real course-material folders named in
  the spec's own "依据文件" section, producing `data/study-resource-manifest.js` (2468 items,
  metadata only — no PDF/DOCX content copied into the repo).
- **Canonical Study routes**: `#/study`, `#/study/:jurusan`, `#/study/:jurusan/sem/:semester`,
  `#/study/:jurusan/sem/:semester/:subjectCode`, `#/study/resource/:resourceId`,
  `#/study/upload` all parse and render (first two fully functional Browse pages; the latter four
  render real "coming in a later stage" shells, not 404s).
- `services/study-resource-service.js` — read-only query layer, every function scoped by
  jurusan/semester/subjectCode, never by college.

## Modified/New Files

- New: `data/study-subjects.js`, `data/study-resource-manifest.js`,
  `services/study-resource-service.js`, `app-study.js`, `style-study.css`,
  `scripts/build-study-manifest.mjs`.
- Modified (additive only, 4/3/1 hunks respectively): `app-router.js`, `index.html`,
  `i18n/locales/en.js`/`ms.js`/`zh.js`.

## Files Explicitly Not Touched

`app-community.js`, `app-wall.js` (Community V2, pointer glow, All KM Students, College cards),
`echomap.js`, `app-campus-*.js` (Echo Map, Building Stories/Detail/Wall), `app-admin.js`, Auth
services, `style-core.css`/`style-wall.css`/`style-admin.css`/`style-comments.css`.

## Real inventory — the actual numbers (not estimates)

Source folders (outside this repo, on the machine this session ran on, exactly matching the
spec's own "依据文件" section): `~/Downloads/Engineering`, `~/Downloads/Perakaunan`,
`~/Downloads/Science ` — 2467 real files (~5.3GB) before this stage began, independently counted
via `find` before any parsing was written.

```
Scanned files:              2468  (2467 real files + 1 un-extracted zip, flagged not skipped)
Ignored junk (__MACOSX/._*/.DS_Store): 3   — independently re-counted via `find`, matches exactly
auto_parsed:                 2318  (93.9%)
manual_review:                 150  (6.1%) — every one has a specific, human-readable reason
Unextracted zip flagged:         1  (no matching extracted sibling folder — not silently dropped)
Question↔Scheme pairs linked:  238
Exact duplicates (SHA-256):     36
Distinct subject codes found:   32  — ALL 32 present in data/study-subjects.js (0 unknown codes)
```

By jurusan: kejuruteraan 20, perakaunan 705, sains 1743 (independently cross-checked file counts
per source folder via `find`, exact match with the manifest).

By resourceType: paper 1814, answer_scheme 294, notes 147, practice 163, summary 17, lab 4,
other 29.

manual_review breakdown (every reason, with counts):
- "paper-type resource with no detected year — verify manually": 69
- "unrecognized file extension": 29
- "no resourceType keyword recognized in path/filename": 28
- "'Set Latihan' inferred as practice/tutorial — verify": 8
- "'klon' (cloned essay set) inferred as practice/mock — verify": 7
- "compound subject folder ... — took first" (the real "EB015 - EE015" combined folder): 6
- "'DIY' set inferred as practice/revision — verify": 3
- "'Road to Final' inferred as practice/revision — verify": 1
- "zip file not expanded": 1

Nothing in this list is a silent guess — every manual_review item carries the exact reason a human
reviewer needs to resolve it.

## Testing

No browser-automation tool is available in this environment (consistent with every prior stage
this session). Verification used the same direct-function-call method plus independent filesystem
cross-checks:

- `node --check` on every new/modified JS file (including the 2.0MB generated manifest): **Verified**.
- **Manifest integrity** (via a Node script loading the real generated files): no `__MACOSX`/`._`
  anywhere in any `sourceRelativePath` (**Verified**), every non-zip item has a `fileId` hash
  (**Verified**), every item has a valid `reviewStatus` + `parseWarnings` array (**Verified**),
  every item's `jurusan` is one of the 4 registry values — never a college code (**Verified**),
  file count per jurusan matches independent `find` counts per source folder (**Verified**).
- **Question↔Scheme linking**: spot-checked a real pair (`Question PSPM 16_17 AA015.pdf` ↔
  `Skema PSPM 16_17 AA015.pdf`) — confirmed bidirectional `relatedResourceId`, both `auto_parsed`,
  zero `parseWarnings`. (A real bug was caught and fixed during this verification — the initial
  grouping key incorrectly included `resourceType`, which differs by definition between a Question
  and its Scheme, so 0 pairs linked on the first run; fixed to key on
  subjectCode+year+parent-folder instead, re-verified 238 real pairs linked.)
- **End-to-end route + render (20 checks, real `app-data.js`/`data/study-subjects.js`/
  `data/study-resource-manifest.js`/`services/study-resource-service.js`/`app-router.js`/
  `app-study.js`, via Node `vm`)**: all 6 canonical routes parse correctly; `renderStudyHome`
  shows all 4 jurusan with real (not hardcoded) resource counts and zero college names anywhere;
  `renderStudyJurusan('sains')` shows both semesters with real subject codes and canonical
  subject-page links; `renderStudySubjectShell('perakaunan',1,'AA015')` shows the REAL resource
  count read live from the manifest (705→pulled via the service, not duplicated); an unknown
  subject code renders a not-found shell, not a crash; the Homepage section order is
  Community→Study Notes→Building Stories exactly as required, the Study card does not reuse any
  `home-community-card-*` pointer-glow class, and the Community card itself is confirmed
  unmodified. **All 20 pass.**
- **Regression**: reran the Homepage/Community-Hub/College-card/pointer-glow-isolation test suites
  from `COMMUNITY-V2-POLISH-004`/`005`/`HOMEPAGE-POLISH-001`/`002A` — **all still pass** (one
  stage-specific "app-router.js byte-identical since POLISH-004" assertion now correctly fails,
  since this stage legitimately added routes to that file — not a regression, an expected,
  intentional change to a file shared across stages).

### Acceptance checklist (request section 20)

```
Homepage Study Notes placement: Community → Study Notes → Building Stories
  Verified

Study Notes grouped by Kolej: Must be NO
  Confirmed NO — jurusan is always one of sains/perakaunan/sains_komputer/kejuruteraan;
  sourceCollege exists only as a per-resource metadata field, never a query/grouping axis
  (see the invariant comments in data/study-subjects.js and services/study-resource-service.js)

Jurusan registry: Verified (4/4 present, matches spec's fixed enum)
Semester registry: Verified (1/2 supported; real folder-based detection + a documented
  code-suffix fallback with an explicit parseWarning when inferred)
Subject registry: Verified (32/32 real codes found in the scanned data are registered;
  0 unknown codes)
Real resource inventory: Completed (2467 real files fully scanned; 2318 auto-parsed,
  150 explicitly flagged for manual review with specific reasons — not partial, not fabricated)
System files ignored: Verified (3/3 __MACOSX/._*/.DS_Store files ignored,
  independently re-counted via `find`)
SHA-256 duplicate foundation: Verified (36 exact duplicates detected across the real scan)
Question/Scheme relation supported: Verified (238 real pairs linked bidirectionally
  via relatedResourceId; spot-checked one pair's exact content)
#/study: Verified (real render, real jurusan list, real counts)

Desktop: Not verified — no browser available in this environment
Mobile: Not verified — no browser available in this environment
Light: Not verified — no browser available in this environment
Dark: Not verified — no browser available in this environment
EN/BM/ZH: Verified at the data level (all study.* keys present with real translations
  in all 3 locale files, node --check passes on all three) — NOT verified as actually
  rendered/legible in a real browser
```

## Remaining Issues

- No real-browser visual verification (Desktop/Mobile/Light/Dark/actual rendered i18n text) —
  environment limitation, consistent with every prior stage this session.
- 150 manifest items need human manual review before they'd be shown in ordinary browse results
  (`StudyResourceService.getPublishableResources()` already excludes them) — this is expected,
  correct behavior per the spec ("不自动发布不确定 metadata"), not a defect to fix.
- 36 exact-duplicate files are flagged (`isDuplicate`/`duplicateOfResourceId`) but not yet
  collapsed in any UI — the spec places full duplicate-merge UI at a later moderation stage.
- Subject display `name` is intentionally `null` for 14 of the 32 codes (`SK0*`, all `D*`
  Engineering-adjacent Science codes, all `EA/EB/EE/EM` Engineering codes) — their official
  Malaysian Matriculation titles were not confirmed with reasonable certainty from the real folder
  contents inspected this stage; the UI falls back to showing the code alone rather than guessing
  a wrong official name. See the comments in `data/study-subjects.js`.
- `#/study/:jurusan/sem/:semester/:subjectCode`, `#/study/resource/:resourceId`, and
  `#/study/upload` are intentionally minimal "coming soon" shells, not full features — this is
  explicit scope for this stage, not an oversight.

## Next Step (request section 22 — proposed only, not started)

- `STUDY-V2-003` — Browse hierarchy (turn the current subject shell into a real
  Jurusan→Semester→Code resource list).
- `STUDY-V2-004` — Resource list + year grouping (PSPM Question/Scheme pairing surfaced in the UI,
  using the `relatedResourceId` links already built this stage).

Per the request, stopping here for the product owner to inspect the Homepage entry and the real
inventory before either of the above starts.
