# ROLLBACK — STUDY-V2-003

## Scope of this stage

- `services/study-resource-service.js`: 2 new functions added (additive —
  no existing function's behavior changed).
- `app-router.js`: the Study route table's bare `#/study/:jurusan` case now
  returns `page: "study-jurusan"` (no `semester` field, was previously
  `semester: null`); a distinct `page: "study-semester"` case was added for
  `#/study/:jurusan/sem/:semester` (previously this also returned
  `page: "study-jurusan"` with a `semester` number). New title entry +
  dispatch branch added.
- `app-study.js`: `renderStudyJurusan(container, jurusanId, semesterFilter)`
  was replaced by two functions — `renderStudyJurusan(container, jurusanId)`
  (Semester picker) and `renderStudySemester(container, jurusanId, semester)`
  (Subject list, the old function's semester-filtered behavior). Back-link
  targets and breadcrumbs changed on the Semester and Subject pages.
- `style-study.css`: new rules only (`.study-semester-grid`,
  `.study-semester-card`, `.study-type-badges`). No existing rule's
  declared values changed.
- `i18n/locales/en.js`/`ms.js`/`zh.js`: new keys appended, no existing key
  changed.

## To roll back to STUDY-V2-FOUNDATION-001's combined Jurusan+Semester page

1. Restore `app-study.js` from `before/app-study.js.pre` in this checkpoint
   directory.
2. Restore `services/study-resource-service.js` from
   `before/study-resource-service.js.pre` (or just leave the 2 new
   functions in place — they're additive and harmless if unused).
3. In `app-router.js`, restore the Study route table's bare
   `#/study/:jurusan` case to return `{ page: "study-jurusan", jurusanId,
   semester: null }` and the `#/study/:jurusan/sem/:semester` case to
   return `{ page: "study-jurusan", jurusanId, semester: Number(parts[3]) }`
   (both mapping to the same page again) — see `before/app-router.js.pre`
   for the exact original block. Remove the `"study-semester"` title entry
   and dispatch branch, and change the `study-jurusan` dispatch call back
   to `renderStudyJurusan(app, route.jurusanId, route.semester)`.
4. Restore `style-study.css` from `before/style-study.css.pre` (removes the
   Semester-grid/type-badge rules).
5. Restore the three i18n locale files from `before/{en,ms,zh}.js.pre`
   (removes the new Browse Hierarchy keys — harmless to leave in place too,
   since nothing else would reference them).

Full post-stage file copies are in `after/` for diffing:

```bash
diff "study v2/checkpoints/STUDY-V2-003/after/app-router.js.post" app-router.js
diff "study v2/checkpoints/STUDY-V2-003/after/app-study.js.post" app-study.js
diff "study v2/checkpoints/STUDY-V2-003/after/study-resource-service.js.post" services/study-resource-service.js
diff "study v2/checkpoints/STUDY-V2-003/after/style-study.css.post" style-study.css
```

## Verification after rollback

- `node --check app-router.js app-study.js services/study-resource-service.js`
- Load `#/study/sains` and confirm it goes back to showing both semesters'
  full subject lists on one page (the pre-STUDY-V2-003 behavior).

## Dependencies / interactions with other checkpoints

Builds directly on top of `STUDY-V2-FOUNDATION-001` (same data files, same
service, same module) — rolling this stage back returns the module to
exactly that checkpoint's end state, not further. Independent of every
`COM-V2-*`/`COMMUNITY-V2-POLISH-*`/`HOMEPAGE-POLISH-*` checkpoint — the only
shared file, `app-router.js`, only had its Study-specific route-table lines
touched this stage (confirmed by direct-call regression tests showing all
Community/pointer-glow/Homepage-section-order behavior unchanged).
