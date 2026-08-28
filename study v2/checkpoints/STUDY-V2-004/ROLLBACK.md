# ROLLBACK — STUDY-V2-004

## If this stage needs to be fully reverted

All five touched files have a full pre-edit snapshot in `before/`:

```bash
cd "EchoWall-Feature-Foundation"
cp "study v2/checkpoints/STUDY-V2-004/before/app-study.js.pre" app-study.js
cp "study v2/checkpoints/STUDY-V2-004/before/app-router.js.pre" app-router.js
cp "study v2/checkpoints/STUDY-V2-004/before/style-study.css.pre" style-study.css
cp "study v2/checkpoints/STUDY-V2-004/before/en.js.pre" i18n/locales/en.js
cp "study v2/checkpoints/STUDY-V2-004/before/ms.js.pre" i18n/locales/ms.js
cp "study v2/checkpoints/STUDY-V2-004/before/zh.js.pre" i18n/locales/zh.js
```

`services/study-resource-service.js` has no `.pre` snapshot (it was edited before this checkpoint
directory existed). It was changed **additively only** — see
`before/study-resource-service.js.changes.md` for the exact 3 hunks. To revert it by hand: delete
the `getResourcesForSubjectInContext`, `getResourceCategory`, `RESOURCE_CATEGORY_ORDER`,
`isYearGroupedCategory`, and `isResourcePublishable` functions, and remove those 5 names from the
`Object.freeze({...})` export block at the bottom of the file — nothing else in that file was
touched, so a diff against `after/study-resource-service.js.post` will show exactly those hunks
and nothing more.

Do NOT use `git reset --hard` or `git clean -fd` for this rollback (forbidden by this stage's
instructions) — the `cp` commands above are the sanctioned method, and are non-destructive to
anything outside these 6 files.

## Dependency notes (why these files move together)

- `app-router.js`'s one changed line (`renderStudyResourceShell` → `renderStudyResourceDetail`)
  only makes sense together with the `app-study.js` rename — reverting one without the other
  breaks the Resource Detail route (`ReferenceError: renderStudyResourceShell is not defined`
  after reverting app-study.js alone, since the router would still call the old name; the reverse
  produces the same error). Always revert `app-study.js` and `app-router.js` together.
- `style-study.css`'s new rules (`.study-tabs`, `.study-resource-row`, `.study-detail-grid`, etc.)
  are only referenced by the new markup in `app-study.js`. Reverting `app-study.js` without
  reverting the CSS is harmless (unused CSS rules, no visual regression) but reverting the CSS
  without reverting `app-study.js` will visibly break the new Subject/Resource Detail pages
  (unstyled tabs/rows). Revert together to be safe.
- The three `i18n/locales/*.js` files added the same new key set in parallel — safe to revert
  independently of each other, but must be reverted together with `app-study.js` (missing keys
  fall back to raw key strings via `I18n.t`'s existing fallback, so this fails soft, not hard).
- `services/study-resource-service.js`'s 5 new exports are only called from the new
  `app-study.js` code — reverting the service file without reverting `app-study.js` will break
  the Subject/Resource Detail pages (`TypeError: StudyResourceService.getResourcesForSubjectInContext
  is not a function`). Revert together.

## What is NOT affected by any of this

`data/study-subjects.js`, `data/study-resource-manifest.js`, `scripts/build-study-manifest.mjs`,
Browse Hierarchy (`renderStudyHome`/`renderStudyJurusan`/`renderStudySemester`), Community V2,
pointer-glow, Echo Map, Building, Admin, Auth — none of these were touched this stage, so no
rollback action is needed for them regardless of which of the 6 files above are reverted.

## Verification after rollback

Run `node --check` on all 6 files, then re-run
`/private/tmp/claude-501/-Users-lars-foh-Downloads-EchoWall-latest-version-2/0414fc50-f0b8-40e6-99b7-3aef17f7a2a7/scratchpad/test-study-v2-003.js`
(the STUDY-V2-003 suite) — it should pass again once reverted, since it predates this stage's
changes.
