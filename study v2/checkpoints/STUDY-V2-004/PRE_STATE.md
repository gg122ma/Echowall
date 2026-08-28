# PRE_STATE — STUDY-V2-004

Date: 2026-08-21

## Task

Turn the Subject page (`#/study/:jurusan/sem/:semester/:subjectCode`) from a "coming soon"
placeholder into a real Resource List: tabbed by category, PSPM/Pre-Pra-PSPM grouped by exam
year (newest first), Question↔Answer Scheme pairs shown as one set (not two unrelated rows), and
`#/study/resource/:resourceId` showing real metadata with an honestly-disabled "Open file" (no
served file URL exists yet — that's STUDY-V2-006).

## State actually read before starting (not assumed from prior reports)

- Re-read `CLAUDE.md`, `HANDOFF.md`, `CHANGELOG.md`, `CODE_AUDIT.md` top entries, and both prior
  Study Notes reports (`REPORT_STUDY-V2-FOUNDATION-001.md`, `REPORT_STUDY-V2-003.md`).
- Re-read the actual current `services/study-resource-service.js`, `app-study.js`,
  `style-study.css`, and the Study route section of `app-router.js` in full — confirmed
  `renderStudySubjectShell()` still ended in a literal `<p>${I18n.t("study.subjectComingSoon")}</p>`
  placeholder and `renderStudyResourceShell()` was still a generic "viewer coming soon" shell,
  exactly as the request described — no drift from the STUDY-V2-003 report.
- Sampled real manifest data directly (`node -e` against the actual 2468-item
  `data/study-resource-manifest.js`) to confirm the exact field shapes before designing anything:
  a real linked Question/Scheme pair (`AA015`, `relatedResourceId` bidirectional), a real
  `sourceCollege` example (`"KMKPH"`), and a real `isDuplicate`/`duplicateOfResourceId` example —
  confirming the schema exactly matches what STUDY-V2-002's report claimed, nothing assumed.

## Plan

1. `services/study-resource-service.js`: add `getResourcesForSubjectInContext(jurusanId,
   semester, subjectCode)` (filters on the RESOURCE's own jurusan/semester fields, not just
   subjectCode, per the request's explicit "不能只用 subjectCode 忽略 route context"
   instruction), `getResourceCategory(resource)` (maps fine-grained resourceType/resourceSubtype
   to the UI's coarser browse categories — data taxonomy itself untouched), `isYearGroupedCategory`,
   `RESOURCE_CATEGORY_ORDER`, and `isResourcePublishable(resource)` (exposes the existing
   publishability rule for the Resource Detail page's direct-link gate).
2. `app-study.js`: rewrite `renderStudySubjectShell()` to query real resources, build a category
   tab bar (only categories the subject actually has), and render either year-grouped PSPM/
   Pre-Pra-PSPM sections + a flat "Other Resources" bucket (the "All" view, modeled directly on
   the spec's own section-2 example) or a single filtered view per tab. Rename
   `renderStudyResourceShell` to `renderStudyResourceDetail` and give it real metadata + a
   disabled "Open file" button with an honest note. Tab-switching and "Load more" reuse
   app-wall.js's existing partial-re-render pattern (`setCategoryFilter`-style).
3. `style-study.css`: new resource-row/year-group/tab/detail-grid rules — no Community
   pointer-glow reuse, kept in the "clean, academic" language already established for this module.
4. `i18n/locales/{en,ms,zh}.js`: new keys for every new UI string (categories, source/verification
   labels, empty states, detail fields, file-not-connected note) — no hardcoded English.
5. `app-router.js`: one-line dispatch update for the renamed `renderStudyResourceDetail`.

## Files touched by this stage

- `services/study-resource-service.js` (additive only — see
  `before/study-resource-service.js.changes.md` for the exact pre-edit hunks, since this file was
  edited before this checkpoint directory existed).
- `app-study.js` (full pre-edit copy in `before/app-study.js.pre`).
- `app-router.js` (one dispatch line changed — full pre-edit copy in `before/app-router.js.pre`).
- `style-study.css`, `i18n/locales/en.js`/`ms.js`/`zh.js` (full pre-edit copies in `before/`).

## Files explicitly NOT touched

`data/study-subjects.js`, `data/study-resource-manifest.js` (data/manifest unchanged — this stage
is pure UI/query on top of the existing registry and manifest), `renderStudyHome`,
`renderStudyJurusan`, `renderStudySemester` (Browse Hierarchy from STUDY-V2-003, untouched),
`scripts/build-study-manifest.mjs`, `app-community.js`, `app-wall.js` (Community V2, pointer
glow), `echomap.js`, `app-campus-*.js`, `app-admin.js`, Auth services.

## A real bug found and fixed during this stage's own verification

Pagination initially budgeted "number of year-groups shown" (e.g. first 15 exam years), not
"number of resource rows shown" — on real data (`SM015`, which spans many PSPM years with
multiple sets/parts per year), that rendered 113 of 138 rows on first paint, defeating the
point of pagination. Fixed to budget by actual row count (accumulate rows per year-group, stop
once the budget is spent, always showing at least one full group) — re-verified: SM015 now
renders 50 rows initially instead of 113. See `HANDOFF.md`/the report for detail.
