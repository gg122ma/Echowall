# PRE_STATE — COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY

Repo has extensive pre-existing uncommitted work (git status at task start showed ~97
modified/untracked paths — see `HANDOFF.md`'s prior dated entries for that history). This
checkpoint covers ONLY the files this task touched; it does not attempt to snapshot the rest of
the working tree.

## What existed before this task

- **"Study Notes" was the visible brand name** for the `#/study` section everywhere: Homepage
  promo card, `#/study` landing (eyebrow + H1), Programme/Semester/Subject page breadcrumb,
  document titles for `study-home`/`study-jurusan`/`study-semester`/`study-subject`, and two
  hardcoded error strings in `app-study.js`'s `renderStudyNotFound()`. i18n keys
  `study.home.title`, `study.home.cta`, `study.hub.eyebrow`, `study.hub.title`, and three dead
  `...comingSoon` strings held the English "Study Notes" / Chinese "学习资料" / Malay "Nota
  Pembelajaran" values in `i18n/locales/{en,ms,zh}.js`. `admin.study.*` keys (Admin-only) already
  said "Study Notes Moderation" and were NOT part of this task.
- **`app-wall.js`** gated Community-post interaction behind `note.isDemoSeed === true &&
  note.isDemoSeedRuntime === true`:
  - `buildNoteDOM()` added an `is-demo-seed-preview` outline class, a visible "Demo content /
    Kandungan demo / 演示内容" badge (`getDemoSeedLabelHTML()`), and replaced the vote button with
    a "🔒 Read-only" badge.
  - `openModal()` showed a "🔒 Read-only demo content · Voting disabled" badge instead of real vote
    buttons, and — critically — skipped `renderCommentsSectionHTML()` entirely (`&& !isDemoSeed`)
    and skipped the Mark Solved/Reopen question action (`!isDemoSeed &&`).
  - `CommentService` (`services/comment-service.js`) itself was already fully generic (keyed only
    by numeric `postId`, LocalStorage-persisted) — it never had a seed-specific restriction; the
    restriction was 100% in `app-wall.js`'s rendering layer.
- **`app-data.js`**'s `activateDemoSeedSnapshot()` spread each of the 696 legacy
  `demo-seed-bundle.v1.js` notes as `Object.freeze({...note, id: runtimeId,
  isDemoSeedRuntime:true})` with NO normalization — the raw JSON has no `postType`,
  `communityKey`, `communityScope`, or `moderationStatus` fields at all (confirmed via
  `grep -c '"postType"' data/demo-seed-bundle.v1.js` → 0 across all 696 notes). This meant the
  Discussion/Question filter tabs silently hid every legacy seed post (`note.postType !==
  wallState.postType` is always true when `postType` is `undefined`).
- Runtime ids for demo-seed notes were already deterministic in practice (a decrementing counter
  starting at -1, driven by fixed array order in the static bundle, with collision-avoidance
  against the real `notes` array's positive ids) — this task did not need to change the id
  assignment scheme, only reuse it for the new 67-post source too.
- `data/demo-seed-all-student-km.v1.js` did not exist. All Student KM (`global:all`) had zero
  seed community posts.
- `scripts/test-community-seed-interaction.mjs` and `scripts/test-all-student-km-seed.mjs` did not
  exist.

## Files this task touched

- `app-data.js` — new `normalizeDemoSeedCommunityFields()`; `activateDemoSeedSnapshot()` now
  merges `window.ECHO_WALL_ALL_STUDENT_KM_SEED` and normalizes every seed note; the
  `fetch()`-fallback path in `loadDefaultDemoSeed()` now delegates to `activateDemoSeedSnapshot()`
  instead of duplicating the id-assignment loop inline.
- `app-wall.js` — `getDemoSeedLabelHTML()` removed; `buildNoteDOM()` no longer adds the
  `is-demo-seed-preview` class or the demo badge, and always renders the normal vote-count button
  (which only ever opened the modal, never voted, so this was always safe); `openModal()` always
  renders the comments section and (subject to the existing `canUserMarkSolved` permission check)
  the question actions for community posts; the modal's vote area shows a plain, non-badged
  `👍 N · 👎 N` static display for seed posts (frozen note objects can never actually persist a
  vote) instead of the old "Read-only" text.
- `app-router.js` — `study-home`/`study-jurusan`/`study-semester`/`study-subject` document-title
  values renamed to "Echo Library — Echo Wall".
- `app-study.js` — the two hardcoded strings in `renderStudyNotFound()` renamed.
- `index.html`, `map.html` — one new `<script src="data/demo-seed-all-student-km.v1.js">` tag each,
  placed right after `data/demo-seed-bundle.v1.js`.
- `i18n/locales/en.js`, `i18n/locales/ms.js`, `i18n/locales/zh.js` — 7 keys each renamed (see
  `HANDOFF.md`'s dated entry for the exact key list and values).
- New: `data/demo-seed-all-student-km.v1.js`, `scripts/test-community-seed-interaction.mjs`,
  `scripts/test-all-student-km-seed.mjs`, `reports/REPORT_COMMUNITY-SEED-INTERACTION-AND-ECHO-LIBRARY.md`.
