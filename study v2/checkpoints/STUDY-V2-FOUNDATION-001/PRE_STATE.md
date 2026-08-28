# PRE_STATE — STUDY-V2-FOUNDATION-001

Date: 2026-08-21

## Task

Build the foundation of Study Notes V2 per
`study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf` (EW-STUDY-V2-001):
Homepage entry point, STUDY-V2-001 (Inventory + Taxonomy + Subject Registry),
STUDY-V2-002 (Metadata Manifest Foundation), and a basic canonical-route
Browse shell (`#/study`, `#/study/:jurusan`). Explicitly NOT Upload, Admin
Moderation, or a full PDF Viewer — those are later stages (STUDY-V2-003
through 008).

## State read before starting

- Read the full 5-page spec PDF (sections 1-17) before writing any code.
- Confirmed via `grep`/`find` that no Study Notes module existed anywhere in
  the codebase yet (no `app-study.js`, no `#/study` route, no
  `data/study-subjects.js`).
- Read `app-router.js`'s `getRoute()`/`render()`/`setRouteDocumentState()` and
  `index.html`'s script/link load order to understand exactly where to add
  routes and script tags without disturbing the existing order (per
  `CLAUDE.md`'s explicit "script load order matters" rule).
- Read `services/community-service.js` and `data/community-config.js` as the
  closest existing precedent for a data-registry + service-layer module
  pattern (`window.X = Object.freeze({...})`), reused for
  `services/study-resource-service.js`.
- Located the real course-material folders the spec's "依据文件" section
  names (`Semester 1.zip`/`Semester 2.zip`/`Engineering.zip`/subject zips)
  at `~/Downloads/Engineering`, `~/Downloads/Perakaunan`, `~/Downloads/Science `
  (outside the repo, on the machine this session is running on) — inspected
  their real directory structure (2467 real files, ~5.3GB) before writing
  any parser logic, rather than guessing a taxonomy.

## Plan

1. `data/study-subjects.js` — Jurusan (sains/perakaunan/sains_komputer/
   kejuruteraan) + Subject registry, populated ONLY with the 32 subject codes
   actually observed in the real folders (verified zero invented codes —
   see the report's cross-check against the generated manifest).
2. `scripts/build-study-manifest.mjs` — real, runnable Node ESM script:
   scans real folders, ignores `__MACOSX`/`._*`/`.DS_Store`, parses
   candidate metadata from path+filename, hashes every file (SHA-256),
   links Question↔Answer Scheme pairs, flags anything uncertain as
   `reviewStatus:"manual_review"` with specific `parseWarnings` (never
   silently guesses).
3. Ran the script for real against the three real folders, producing
   `data/study-resource-manifest.js` (2468 items, metadata only — no PDF
   content copied into the repo).
4. `services/study-resource-service.js` — read-only query helpers, always
   scoped by jurusan/semester/subjectCode, never by college.
5. `app-study.js` — Browse UI: functional `#/study` (jurusan picker) and
   `#/study/:jurusan[/sem/:semester]` (subject picker with real resource
   counts); `#/study/:jurusan/sem/:semester/:subjectCode`,
   `#/study/resource/:resourceId`, `#/study/upload` render real,
   non-404 "coming in a later stage" shells (canonical routes exist, full
   UI deliberately deferred).
6. `style-study.css` — Homepage promo card styling (color-only override of
   the existing `.map-promo` structural CSS) + Browse page description
   text style. No new list/card component — reused `.org-page`/
   `.selection-shell`/`.selection-list`/`.selection-item` verbatim (the
   same shell College Landing already uses).
7. `app-router.js` — route dispatch only (`getRoute()`/`render()`/
   `setRouteDocumentState()`) + the Homepage `Study Notes` section inserted
   between the existing Community CTA and Building Stories sections. No
   Study UI logic added to this file.
8. `index.html` — script/link tags added in the correct load order.
9. `i18n/locales/{en,ms,zh}.js` — new `study.*` keys, no existing key
   changed.

## Files touched by this stage

- New: `data/study-subjects.js`, `data/study-resource-manifest.js`,
  `services/study-resource-service.js`, `app-study.js`, `style-study.css`,
  `scripts/build-study-manifest.mjs`.
- Modified: `app-router.js` (4 hunks — see `before/app-router.js.changes.md`),
  `index.html` (3 hunks — see `before/index.html.changes.md`),
  `i18n/locales/en.js`/`ms.js`/`zh.js` (1 appended block each — see
  `before/i18n-locales.changes.md`).

## Files explicitly NOT touched

`app-community.js`, `app-wall.js` (Community V2, pointer glow, All KM
Students, College cards), `echomap.js`, `app-campus-*.js` (Echo Map,
Building Stories/Detail/Wall), `app-admin.js`, `services/auth-service.js`,
`services/auth-ui.js`, `style-core.css`, `style-wall.css`, `style-admin.css`,
`style-comments.css`.
