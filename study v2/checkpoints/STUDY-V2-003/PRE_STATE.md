# PRE_STATE — STUDY-V2-003

Date: 2026-08-21

## Task

Build the real Browse Hierarchy for Study Notes: `#/study` (Jurusan) →
`#/study/:jurusan` (Semester) → `#/study/:jurusan/sem/:semester` (Subject
Code) → `#/study/:jurusan/sem/:semester/:subjectCode` (subject shell). No
Resource List/Year Grouping/Search/Filter/PDF Viewer/Upload/Admin — those
are STUDY-V2-004+.

## State actually read before starting (not assumed from the prior report)

Per this task's own explicit instruction not to assume the prior report
still reflects the source, every touched file was re-read fresh:

- `app-study.js`: confirmed `renderStudyJurusan(container, jurusanId, semesterFilter)`
  was a SINGLE function serving both `#/study/:jurusan` and
  `#/study/:jurusan/sem/:semester` — when `semesterFilter` was `null` (the
  bare `#/study/:jurusan` case), it looped `[1, 2]` and rendered BOTH
  semesters' full subject lists on one page. This is exactly the "先显示
  Semester，不要直接展开所有 Subject" violation this stage was asked to fix.
- `services/study-resource-service.js`: confirmed it had no per-semester
  resource-count function (`getResourceCountForJurusan(jurusanId)` existed,
  scoped to the whole jurusan only) and no `getResourceTypesForSubject`.
- `app-router.js`: confirmed `getRoute()` mapped BOTH `#/study/:jurusan`
  and `#/study/:jurusan/sem/:semester` to the same `page: "study-jurusan"`
  value (differentiated only by `semester: null` vs a number), and `render()`
  called the same `renderStudyJurusan(app, route.jurusanId, route.semester)`
  for both.
- `data/study-subjects.js`: re-confirmed unchanged since
  `STUDY-V2-FOUNDATION-001` — still 32 real subject codes across 4 jurusan
  (verified via `grep -c "code:"` = 33, i.e. 32 entries + 1 incidental
  match, consistent with the prior report).
- `data/study-resource-manifest.js`: re-confirmed unchanged (header still
  reports 2468 scanned / 2318 auto_parsed / 150 manual_review / 238 linked
  pairs / 36 duplicates — identical to `STUDY-V2-FOUNDATION-001`'s report).
- `style-study.css` / `index.html`: re-confirmed no changes were needed to
  `index.html` this stage (no new files, no new script/link tags) — only
  `style-study.css` needed new rules for the Semester-picker cards.

## Plan

1. `services/study-resource-service.js`: add
   `getResourceCountForJurusanSemester(jurusanId, semester)` (filters the
   manifest directly on the resource's own `jurusan`/`semester` fields) and
   `getResourceTypesForSubject(subjectCode)` (distinct real `resourceType`
   values present for that subject — never a fabricated category list).
2. `app-router.js`: split the route table so `#/study/:jurusan` (4-segment
   check unchanged, but the 2-segment bare form) returns
   `page: "study-jurusan"` with no `semester` field, and
   `#/study/:jurusan/sem/:semester` returns a NEW distinct
   `page: "study-semester"`. Add the new title + dispatch branch.
3. `app-study.js`: split the combined renderer into
   `renderStudyJurusan(container, jurusanId)` (Semester picker only — 2
   cards, each with real subject+resource counts) and a new
   `renderStudySemester(container, jurusanId, semester)` (the real Subject
   Code list, with semester validated to be exactly 1 or 2). Fixed the
   back-navigation chain: Subject → Semester → Jurusan → Study Notes (was:
   Subject → Jurusan directly, skipping Semester). Added a lightweight
   breadcrumb eyebrow line at the Semester and Subject levels. Added a
   real, service-computed resource-type badge line to each subject list
   item (only rendered when the subject actually has publishable
   resources to compute types from).
4. `style-study.css`: new `.study-semester-grid`/`.study-semester-card`
   rules (a small 2-card grid, distinct from the compact `.selection-list`
   used everywhere else) + `.study-type-badges`.
5. `i18n/locales/{en,ms,zh}.js`: new keys for the Semester picker heading,
   subject-count label, and the 7 `resourceType` display labels used by
   the new badge line.

## Files touched by this stage

- `services/study-resource-service.js` (2 new functions, additive).
- `app-router.js` (route table split + dispatch update, 3 hunks).
- `app-study.js` (renderer split + breadcrumb/back-chain fix — see
  `before/app-study.js.pre` for the exact pre-edit file).
- `style-study.css` (new rules only).
- `i18n/locales/en.js`/`ms.js`/`zh.js` (new keys only, appended).

## Files explicitly NOT touched

`data/study-subjects.js`, `data/study-resource-manifest.js` (data
unchanged — this stage is pure UI/routing on top of the existing registry
and manifest), `index.html` (no new files to wire in), `app-community.js`,
`app-wall.js` (Community V2, pointer glow, All KM Students, College
cards), `echomap.js`, `app-campus-*.js` (Echo Map, Building Stories/
Detail/Wall), `app-admin.js`, Auth services, `style-core.css`/
`style-wall.css`/`style-admin.css`/`style-comments.css`.
