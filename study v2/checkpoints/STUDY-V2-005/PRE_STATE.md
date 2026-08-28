# PRE_STATE — STUDY-V2-005

Date: 2026-08-21

## Task

Add Global Search (`#/study`) and Subject-page filters (Year/Subtype/Source/Sort, layered on top
of the existing STUDY-V2-004 category tabs) to Study Notes — without touching Browse Hierarchy,
category system, year grouping, Question/Scheme pairing, or any STUDY-V2-006 file-serving work
(377 real demo files, `fileUrl`/`demoAvailable`, `getResourceFileUrl()`).

## State actually read/re-verified before starting

- Re-read `CLAUDE.md`, `HANDOFF.md`, `CHANGELOG.md`, `CODE_AUDIT.md` top entries,
  `study v2/reports/REPORT_STUDY-V2-004.md`, `study v2/reports/REPORT_STUDY-V2-006.md`, and the
  full spec PDF's section 9 (Browse/Search/Filter: "Search 支持 Subject Code、Title、Topic、
  Year；Subject Code 应优先匹配。Filter 至少：Jurusan、Semester、Code、Type、Subtype、Year、
  Source College。").
- Re-read `data/study-resource-manifest.js`'s header, `services/study-resource-service.js`,
  `app-study.js`, and `app-router.js` in full — confirmed a `searchResources(query)` function
  already existed (2-tier: code-prefix, then title/topic) but was not wired into any UI, and did
  not rank by exact-code vs prefix-code separately, nor search Year at all — matching the request's
  description, no drift from either prior report.
- **Explicitly re-verified STUDY-V2-006 was intact before touching anything**: `assets/study-files/`
  still had 377 files, the manifest still had 377 `demoAvailable:true` items,
  `getResourceFileUrl`/`searchResources` were present in the service's export block. Re-ran
  `test-study-v2-006.js`: 39/39 passing before any edit this stage.
- Investigated real data needed for honest testing before writing UI: confirmed 155 real resources
  have a non-null `topic` field (e.g. "Chapter 10 Accounting For Liabilities", AA015) suitable for
  topic-search testing; confirmed the real `sourceCollege` values present (31 distinct real
  strings like "KMK", "KMKPH", "KMKulim (no ans)") and real `resourceSubtype` values (10 distinct:
  revision, by_topic, pra_pspm, pspm, mock, student_notes, pre_pspm, reinforcement, lab_manual,
  tutorial) for filter-option testing.
- **Checked hash-router safety for a `#/study?q=...` URL scheme before deciding against it**:
  `getRoute()` does `location.hash.replace(/^#\/?/, "").split("/")`; appending `?q=SM015` directly
  after `study` makes `parts[0] === "study?q=SM015"`, which fails the `parts[0] === "study"` check
  and falls through to the Home page — confirmed unsafe without modifying `app-router.js`, which
  this stage's instructions explicitly forbid ("不要为了搜索重写 router"). Chose the simpler,
  request-approved alternative instead: pure in-memory component state, no URL query param.

## Plan

1. `services/study-resource-service.js`: rewrite `searchResources()` into a real 5-tier ranking
   (exact Subject Code, prefix Subject Code, Title, Topic, Year) — was previously only 2-tier and
   did not search Year at all. Add `filterResources(resources, filters)`,
   `sortResources(resources, sortMode)`, `getFilterOptions(resources)` (dynamic, never hardcoded).
2. `app-study.js`: add a Global Search bar + inline results panel to `renderStudyHome()` (debounced
   input, no page navigation on search); add a Year/Subtype/Source/Sort filter bar to
   `renderStudySubjectShell()`'s existing category-tab UI (resets on tab switch, combines via
   intersection with the tab, never a second Type/Category filter).
3. `style-study.css`: shared `.study-search-bar`/`.study-search-filters`/`.study-filter-field`
   rules (reused by both Global Search and the Subject page filter bar) — mobile-safe (wraps, no
   horizontal overflow).
4. `i18n/locales/{en,ms,zh}.js`: new keys for search/filter/sort UI text and the 11 real
   `resourceSubtype` labels.
5. `app-router.js`: **not touched** (see hash-router safety note above).

## Files touched by this stage

- `services/study-resource-service.js`, `app-study.js`, `style-study.css`,
  `i18n/locales/en.js`/`ms.js`/`zh.js` — full pre-edit copies in `before/`.
- `app-router.js` — copied into `before/`/`after/` for completeness but confirmed byte-identical
  (untouched this stage).

## Files explicitly NOT touched

`data/study-resource-manifest.js`, `data/study-subjects.js`, `scripts/build-study-manifest.mjs`,
`scripts/build-study-demo-files.mjs`, `assets/study-files/` (377 files, unchanged), the Browse
Hierarchy render functions, category-tab system, year-grouping logic, Question/Scheme pairing UI,
STUDY-V2-006's file-open UI in `renderStudyResourceDetail()` (only additive filter/search code
was added elsewhere in the file), Community, pointer-glow, Echo Map, Building, Admin, Auth.
