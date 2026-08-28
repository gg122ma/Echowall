# PRE_STATE — STUDY-V2-006

Date: 2026-08-21

## Task

Make Resource Detail's "Open file" real: clicking a real study resource must actually open its
PDF (or trigger a download for non-PDF), for at least a curated, honestly-scoped subset of the
real course material — without faking a link for resources not actually made available, without
leaking any local filesystem path, and without scope-creeping into a full upload/storage backend.

## State actually read/re-verified before starting

- Re-read `CLAUDE.md`, `HANDOFF.md`, `CHANGELOG.md`, `CODE_AUDIT.md` top entries, and
  `study v2/reports/REPORT_STUDY-V2-004.md`.
- Re-read the full spec PDF (`study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf`) — section
  13 explicitly permits keeping a static manifest as a "competition demo fallback" while still
  requiring PDFs not be stuffed into LocalStorage and requiring pagination/lazy-loading (no
  preloading all PDFs on a list page); section 10 permits either an embedded viewer or new-tab
  open for v1, with no requirement to build a custom PDF renderer; section 9's dedup table
  confirms Question+Scheme are a distinct "do not merge" case.
- Re-read `data/study-resource-manifest.js`'s header, `scripts/build-study-manifest.mjs`,
  `services/study-resource-service.js`, `app-study.js`, and the Study section of `app-router.js`
  in full — confirmed the manifest was still metadata-only (no `fileUrl` field existed) and
  `renderStudyResourceDetail()` still rendered an unconditionally-disabled button, exactly as the
  STUDY-V2-004 report described — no drift.
- Investigated the REAL physical file state before writing any code (not assumed): cross-checked
  all 2284 publishable manifest items against the real source folders
  (`~/Downloads/Engineering`, `~/Downloads/Perakaunan`, `~/Downloads/Science `, confirmed to still
  exist, ~5.3GB combined) — **100% (2284/2284) have their physical file present, 0 missing.**
  Extension breakdown: PDF 2196, DOCX 74, PPTX 10, DOC 4. Total size of all publishable files if
  copied wholesale: ~2.52GB — safe from a per-file-limit standpoint (largest file 63.4MB) but
  large for a static competition build's working tree, so a curated subset was chosen instead of
  a wholesale copy (see `study v2/reports/REPORT_STUDY-V2-006.md` for the full investigation
  table and the reasoning for the specific 9-subject curated set).

## Plan

1. `scripts/build-study-demo-files.mjs` (new): a second, additive pass over the already-generated
   manifest — copies real files for a curated "Competition Demo File Set" (9 subject codes, full
   coverage within each, ~370MB) from the real source folders into `assets/study-files/`, named by
   resourceId (never the original title/path), re-hashes each copy against the manifest's own
   `fileId` before accepting it, then rewrites `data/study-resource-manifest.js` adding `fileUrl`
   and `demoAvailable` to every item (true only for the ~377 actually copied and verified).
2. `services/study-resource-service.js`: add `getResourceFileUrl()`, `getResourceFileType()`,
   `isResourceFilePdf()` — the only place that resolves a resource's file URL; UI never
   constructs a path itself.
3. `app-study.js`: `renderStudyResourceDetail()` — real `<a href>` for PDF (new tab, native
   browser viewer) and non-PDF (download attribute), honest disabled state + "not included in
   this demo" note for anything not in the curated set. `studyResourceRowHtml()` — optional
   lightweight file-type badge + "Open →" quick link on rows that have a file, without
   complicating the list.
4. `i18n/locales/{en,ms,zh}.js`: new keys (Open PDF, Open file, file type labels, honest
   unavailable-in-demo note).
5. No changes to Browse Hierarchy, Resource categories/year-grouping, Question/Scheme pairing UI,
   Community, Building, Echo Map, Admin, Auth.

## Files touched by this stage

- `scripts/build-study-demo-files.mjs` (new file, no "before" snapshot needed).
- `data/study-resource-manifest.js` (rewritten by the script above — full pre-edit copy in
  `before/study-resource-manifest.js.pre`).
- `services/study-resource-service.js`, `app-study.js`, `style-study.css`,
  `i18n/locales/en.js`/`ms.js`/`zh.js` (full pre-edit copies in `before/`).
- `assets/study-files/` (new directory, 377 real files, ~422MB on disk — not a code file, no
  "before" snapshot applicable; simply did not exist before this stage).

## Files explicitly NOT touched

`data/study-subjects.js`, `scripts/build-study-manifest.mjs` (the original parsing/hashing
script — untouched; only a NEW second-pass script was added), `app-router.js` (no route changes
needed this stage), Browse Hierarchy render functions, Community/pointer-glow, Echo Map, Building,
Admin, Auth.
