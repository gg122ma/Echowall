# ROLLBACK — STUDY-V2-FOUNDATION-001

## Scope of this stage

Six new files (Study Notes module) + four small, additive hunks across three
existing files (`app-router.js`, `index.html`, three i18n locale files). No
existing route, function, or CSS rule's declared behavior was changed —
every hunk in the touched files is a pure addition, verified against the
`before/*.changes.md` snippets in this checkpoint.

## To fully roll back Study Notes V2 (remove the module entirely)

1. Delete the six new files:
   ```bash
   rm data/study-subjects.js data/study-resource-manifest.js \
      services/study-resource-service.js app-study.js style-study.css \
      scripts/build-study-manifest.mjs
   ```
2. In `app-router.js`, remove the four additive hunks — see
   `before/app-router.js.changes.md` for the exact before/after boundary of
   each; or restore the whole file from `after/app-router.js.post`'s diff
   against a fresh `git diff` / hand-revert using the four documented hunks.
3. In `index.html`, remove the `style-study.css` `<link>` and the four new
   `<script>` tags — see `before/index.html.changes.md`.
4. In each of `i18n/locales/en.js`/`ms.js`/`zh.js`, remove the appended
   `// Study Notes V2 (STUDY-V2-FOUNDATION-001)` block — see
   `before/i18n-locales.changes.md`.

## Verification after rollback

- `node --check app-router.js`
- Load `#/` and confirm the Homepage no longer shows a "Study Notes" section
  between Community and Building Stories, and that Community/Building
  Stories are otherwise unchanged.
- Confirm `#/study` no longer resolves to anything (falls through to Home,
  same as any other unrecognized route, per `getRoute()`'s final
  `return { page: "home" }`).

## To roll back just the generated manifest (keep the module, re-scan later)

```bash
rm data/study-resource-manifest.js
# then, once real source folders are available again:
node scripts/build-study-manifest.mjs "<path>=<jurusan>" ...
```
`services/study-resource-service.js` degrades gracefully if
`window.STUDY_RESOURCE_MANIFEST` is undefined (`getManifest()` returns `[]`),
so the Browse pages won't crash, just show 0 resources everywhere — this is
also what would happen on a fresh clone of the repo without ever running the
script, which is expected for a "competition demo manifest" per the spec.

## Dependencies / interactions with other checkpoints

Independent of every `COM-V2-*`/`COMMUNITY-V2-POLISH-*`/`HOMEPAGE-POLISH-*`
checkpoint — this stage does not touch `app-community.js`, `app-wall.js`,
or any Community/pointer-glow CSS/JS. The only shared file is
`app-router.js` (route dispatch table + `renderHome()`), where this stage's
four hunks are additive and do not modify any line those other checkpoints
depend on — confirmed by direct-call regression tests (see the report)
showing all prior Community/Homepage-card behavior unchanged after this
stage's edits.
