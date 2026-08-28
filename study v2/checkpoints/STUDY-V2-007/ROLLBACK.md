# STUDY-V2-007 — Rollback

Builds directly on STUDY-V2-006's end state (Browse/Search/Filter/File-Open all intact, untouched
by this stage except two small additive branches described below). Rolling this stage back returns
the module to exactly STUDY-V2-006's end state.

## New files (delete to fully roll back)

- `services/study-submission-service.js` — delete.
- `scripts/test-study-upload.mjs` — delete (or keep; it is inert without the service file).
- `study v2/checkpoints/STUDY-V2-007/` — this checkpoint itself; keep for history.

## Whole-file restores (`before/*.pre` -> real path)

```
study v2/checkpoints/STUDY-V2-007/before/app-study.js.pre                -> app-study.js
study v2/checkpoints/STUDY-V2-007/before/study-resource-service.js.pre   -> services/study-resource-service.js
study v2/checkpoints/STUDY-V2-007/before/index.html.pre                  -> index.html
study v2/checkpoints/STUDY-V2-007/before/en.js.pre                       -> i18n/locales/en.js
study v2/checkpoints/STUDY-V2-007/before/ms.js.pre                       -> i18n/locales/ms.js
study v2/checkpoints/STUDY-V2-007/before/zh.js.pre                       -> i18n/locales/zh.js
study v2/checkpoints/STUDY-V2-007/before/style-study.css.pre             -> style-study.css
```

## Hunk-level restores (no `.pre` snapshot was taken — these files already had unrelated
uncommitted changes from before this session per `git status`, so a whole-file restore would
discard that other work; revert only these specific hunks)

**`app-router.js`** — two additive hunks, both easy to isolate by search:
1. `echo:authchange` listener: change
   `if (getRoute().page === "admin") render();`
   back from
   `const page = getRoute().page; if (page === "admin" || page === "study-upload") render();`
2. Remove the `if (window.StudyUploadService) { ... }` block that was added right after the
   existing `render();` call inside the `DOMContentLoaded` handler (search for
   `STUDY-V2-007/008: IndexedDB open is async`).

**`CLAUDE.md`** — one hunk: the "Script load order matters" paragraph's file list gained
`→ data/study-subjects.js → data/study-resource-manifest.js → services/study-resource-service.js →
services/study-submission-service.js` and `→ app-study.js` (the latter was previously missing from
the documented order even though it was already loaded — a pre-existing doc gap fixed opportunistically).
Revert by removing `services/study-submission-service.js` from the list only if reverting this
stage entirely (keep the `app-study.js` addition — it was a correctness fix to existing docs, not
new-feature-specific).

## What was NOT touched

`data/study-resource-manifest.js`, `data/study-subjects.js`, `assets/study-files/` (377 files),
`app-admin.js`, `app-wall.js`, `app-place.js`, `app-data.js`, `services/auth-service.js`,
`services/permission-service.js` — all byte-identical to STUDY-V2-006's end state.

## Verification after rollback

```
node --check app-study.js
node --check services/study-resource-service.js
grep -c '"demoAvailable":true' data/study-resource-manifest.js   # must still read 377
find assets/study-files -type f | wc -l                          # must still read 377
```

`#/study/upload` will show the STUDY-V2-006-era "coming soon" state again; Study Home will no
longer show the Upload CTA; `#/study` Browse/Search/Filter/Resource Detail/Open behave exactly as
they did at STUDY-V2-006's end (the `getManifest()` overlay change in
`services/study-resource-service.js` is additive only — with `StudyUploadService` absent/reverted,
`getManifest()` falls back to returning the built-in array directly, byte-for-byte the same
behavior as before this stage, confirmed by the STUDY-V2-007 report's regression testing).
