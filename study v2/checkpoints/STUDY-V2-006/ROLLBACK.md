# ROLLBACK — STUDY-V2-006

## If this stage needs to be fully reverted

```bash
cd "EchoWall-Feature-Foundation"
cp "study v2/checkpoints/STUDY-V2-006/before/study-resource-manifest.js.pre" data/study-resource-manifest.js
cp "study v2/checkpoints/STUDY-V2-006/before/study-resource-service.js.pre" services/study-resource-service.js
cp "study v2/checkpoints/STUDY-V2-006/before/app-study.js.pre" app-study.js
cp "study v2/checkpoints/STUDY-V2-006/before/style-study.css.pre" style-study.css
cp "study v2/checkpoints/STUDY-V2-006/before/en.js.pre" i18n/locales/en.js
cp "study v2/checkpoints/STUDY-V2-006/before/ms.js.pre" i18n/locales/ms.js
cp "study v2/checkpoints/STUDY-V2-006/before/zh.js.pre" i18n/locales/zh.js
rm -rf assets/study-files
rm scripts/build-study-demo-files.mjs   # new file this stage — delete, do not "revert"
```

Do NOT use `git reset --hard` or `git clean -fd` for this rollback (forbidden by this stage's
instructions) — the commands above are non-destructive to anything outside these specific
paths.

## Dependency notes (why these files move together)

- `data/study-resource-manifest.js` was rewritten by `scripts/build-study-demo-files.mjs` to add
  `fileUrl`/`demoAvailable` to every item. `services/study-resource-service.js`'s
  `getResourceFileUrl()`/`getResourceFileType()`/`isResourceFilePdf()` read those two fields
  directly — reverting the manifest without reverting the service (or vice versa) is harmless
  (the service functions just always return `null`/no file, same as before this stage), but for a
  clean revert to the exact STUDY-V2-004 end state, revert both together.
- `app-study.js`'s `renderStudyResourceDetail()` and `studyResourceRowHtml()` call the new
  service functions — reverting `app-study.js` alone (leaving the manifest/service changes) is
  safe (old code never calls the new functions). Reverting the service without reverting
  `app-study.js` would break the new file-open UI (`TypeError: StudyResourceService
  .getResourceFileUrl is not a function`) — revert together.
- `style-study.css`'s new `.study-badge-file`/`.study-row-open` rules are only referenced by the
  new markup — reverting one without the other is cosmetically harmless either direction (either
  unused CSS, or unstyled-but-functional new elements).
- `i18n/locales/*.js`'s new keys fail soft (raw key string fallback) if the JS using them isn't
  reverted in lockstep — safe to revert independently, but revert together with `app-study.js` for
  a clean state.
- `assets/study-files/` (377 real files, ~422MB) has no code dependency risk — deleting it while
  the manifest still has `fileUrl`/`demoAvailable: true` on those items would make Resource Detail
  show real "Open PDF" links that 404. If reverting ONLY the files but not the manifest, also
  revert the manifest, or regenerate demo files with `scripts/build-study-demo-files.mjs`.

## What is NOT affected by any of this

`data/study-subjects.js`, `scripts/build-study-manifest.mjs` (untouched — this stage only added a
second, separate script), Browse Hierarchy (`renderStudyHome`/`renderStudyJurusan`/
`renderStudySemester`), the resource-list/year-grouping/pairing logic from STUDY-V2-004 (only the
file-open section and row badges were touched), Community, pointer-glow, Echo Map, Building,
Admin, Auth.

## Verification after rollback

Run `node --check` on all reverted `.js` files, then re-run
`/private/tmp/claude-501/-Users-lars-foh-Downloads-EchoWall-latest-version-2/0414fc50-f0b8-40e6-99b7-3aef17f7a2a7/scratchpad/test-study-v2-004.js`
(should pass 36/36 again, matching the STUDY-V2-004 end state).

## Regenerating the demo file set (not a rollback — for future re-runs)

```bash
node scripts/build-study-demo-files.mjs \
  "/Users/lars_foh/Downloads/Engineering=Engineering" \
  "/Users/lars_foh/Downloads/Perakaunan=Perakaunan" \
  "/Users/lars_foh/Downloads/Science =Science"
```
Requires the manifest to already exist (regenerate it first with
`scripts/build-study-manifest.mjs` if the underlying source files ever change) and the three real
source folders to still be present at those paths on this machine.
