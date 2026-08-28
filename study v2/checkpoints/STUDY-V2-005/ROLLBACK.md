# ROLLBACK — STUDY-V2-005

## If this stage needs to be fully reverted

```bash
cd "EchoWall-Feature-Foundation"
cp "study v2/checkpoints/STUDY-V2-005/before/study-resource-service.js.pre" services/study-resource-service.js
cp "study v2/checkpoints/STUDY-V2-005/before/app-study.js.pre" app-study.js
cp "study v2/checkpoints/STUDY-V2-005/before/style-study.css.pre" style-study.css
cp "study v2/checkpoints/STUDY-V2-005/before/en.js.pre" i18n/locales/en.js
cp "study v2/checkpoints/STUDY-V2-005/before/ms.js.pre" i18n/locales/ms.js
cp "study v2/checkpoints/STUDY-V2-005/before/zh.js.pre" i18n/locales/zh.js
```

`app-router.js` needs no action — confirmed byte-identical before/after this stage (never touched).

Do NOT use `git reset --hard`/`git clean -fd` (forbidden) — the `cp` commands above are the
sanctioned method and only touch these 6 files.

## Dependency notes

- `services/study-resource-service.js`'s new `filterResources`/`sortResources`/`getFilterOptions`
  and the rewritten `searchResources` are only called from the new code in `app-study.js` —
  reverting the service alone (leaving `app-study.js`) breaks Global Search and the Subject filter
  bar (`TypeError: StudyResourceService.filterResources is not a function`, etc.). Revert together.
- `app-study.js`'s `renderStudySubjectShell()` now initializes `studySubjectViewState.filters`/
  `.sort` — this is additive to the STUDY-V2-004/006 state shape (`resources`, `category`,
  `visibleLimit` are untouched), so reverting `app-study.js` alone (without reverting the service)
  is safe (old code simply doesn't call the new service functions).
- `style-study.css`'s `.study-search-*`/`.study-filter-field` rules are only referenced by the new
  markup — reverting either file independently is cosmetically safe in both directions (unused
  CSS, or unstyled-but-functional elements).
- `i18n/locales/*.js` new keys fail soft (raw key fallback) — safe to revert independently, but
  revert together with `app-study.js` for a clean state.
- STUDY-V2-006's own additions (`getResourceFileUrl`/`getResourceFileType`/`isResourceFilePdf`,
  `studyResourceFileBadgeHtml`/`studyResourceQuickOpenHtml`, `assets/study-files/`, the manifest's
  `fileUrl`/`demoAvailable` fields) are **read by, but not modified by,** this stage's new search-
  result rows and filter bar — reverting STUDY-V2-005 does not affect STUDY-V2-006 in any way, and
  vice versa. They are independent, additive layers on the same underlying manifest/service.

## What is NOT affected by any of this

`data/study-resource-manifest.js`, `data/study-subjects.js`, `scripts/build-study-manifest.mjs`,
`scripts/build-study-demo-files.mjs`, `assets/study-files/` (377 files), Browse Hierarchy,
category-tab system, year-grouping, Question/Scheme pairing, STUDY-V2-006's Resource Detail file-
open UI, Community, pointer-glow, Echo Map, Building, Admin, Auth — none of these were touched
this stage, so no rollback action is needed for them regardless of which of the 6 files above are
reverted.

## Verification after rollback

Run `node --check` on all reverted `.js` files, then re-run
`/private/tmp/claude-501/-Users-lars-foh-Downloads-EchoWall-latest-version-2/0414fc50-f0b8-40e6-99b7-3aef17f7a2a7/scratchpad/test-study-v2-006.js`
(should pass 39/39 again, matching the STUDY-V2-006 end state — search/filter code is additive
only, reverting it cannot break STUDY-V2-006's own checks).
