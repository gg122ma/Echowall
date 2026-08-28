# REPORT — COMMUNITY-SEED-INTERACTION-AND-ECHO-LIBRARY

Date: 2026-08-23

## Echo Library rename

Pure display-name rename: `#/study`'s internal route/page keys (`study-home`, `study-jurusan`,
`study-semester`, `study-subject`, `study-resource`, `study-upload`), `app-study.js`, `services/
study-resource-service.js`, `services/study-submission-service.js`, the IndexedDB storage keys,
and the study manifest/subject-code schema were all left completely untouched.

Renamed (7 i18n keys x EN/BM/ZH, following the app's existing "Echo X" naming convention already
used for `nav.map` — EN "Echo Map" / ZH "留声地图" / BM "Peta Echo"):

| Key | EN | ZH | BM |
|---|---|---|---|
| `study.home.title` | Echo Library | 留声图书馆 | Perpustakaan Echo |
| `study.home.cta` | Explore Echo Library | 浏览留声图书馆 | Terokai Perpustakaan Echo |
| `study.hub.eyebrow` | Echo Library | 留声图书馆 | Perpustakaan Echo |
| `study.hub.title` | Echo Library | 留声图书馆 | Perpustakaan Echo |
| `study.subjectComingSoon` | ...next Echo Library stage. | ...留声图书馆模块... | ...Perpustakaan Echo... |
| `study.viewerComingSoon` | ...a later Echo Library stage. | ...留声图书馆模块... | ...Perpustakaan Echo... |
| `study.upload.comingSoon` | ...a later Echo Library stage. | ...留声图书馆模块... | ...Perpustakaan Echo... |

Plus `app-router.js`'s 4 document-title values and 2 hardcoded error strings in `app-study.js`'s
`renderStudyNotFound()`.

**Deliberately left unrenamed** (checked, not missed):
- `admin.study.*` (Admin — out of scope per the task's own instruction).
- Generic "study material(s)" / "学习资料" phrasing used as a plain noun (`study.upload.title`,
  `study.subjectEmptyState`, `study.search.placeholder`, etc.) — these describe content type, not
  the section's brand name; changing them would over-reach into a phrase the task never asked to
  rename. `study-resource` / `study-upload` document titles ("Study Resource" / "Upload Study
  Material — Echo Wall") were left for the same reason.
- No top-nav "Study Notes" entry existed before this task (`grep nav.study` — no matches); access
  is exclusively via the Homepage promo card, which is renamed.

Final grep for user-facing `Study Notes` outside `app-study-admin.js`/`admin.*` returns only source
comments (`// Study Notes V2 ...`) and internal invariant notes, both explicitly out of scope per
the task's own instruction.

## Old read-only seed posts — root cause and fix

Audited per the task's own checklist (section 0). Found the exact gate in `app-wall.js`:
`note.isDemoSeed === true && note.isDemoSeedRuntime === true` disabled, in `buildNoteDOM()`/
`openModal()`: the comments section (`&& !isDemoSeed`), the Mark Solved/Reopen action
(`!isDemoSeed &&`), and real voting (replaced with a "🔒 Read-only demo content" badge). Clicking a
card already opened the Detail modal even before this task — only comments/voting/question-actions
were blocked.

`services/comment-service.js` (`CommentService`) was **already fully generic** — comments are
keyed purely by numeric `postId` in LocalStorage (`echo-wall-comments:v1`), with zero dependency on
the note object's mutability or source. The only reason seed posts couldn't comment was the
`app-wall.js` UI gate above — no new comment infrastructure was built; the gate was simply removed
for comments, replies (already a normal-post feature, one level deep, unaffected), and the Mark
Solved action (now governed solely by the existing `PermissionService.canUserMarkSolved()`
ownership/moderator check, which already correctly denies seed posts since their `authorUserId`
never matches a real signed-in user).

**Voting is the one deliberate exception.** Demo-seed runtime notes are `Object.freeze()`d at
seed-activation time (`app-data.js`), and are never written back to `notes`/LocalStorage — a real
vote mutation on them would silently no-op (non-strict-mode assignment to a frozen object), showing
a button that visibly does nothing. Rather than build a second, parallel vote-persistence layer for
frozen seed notes (the same category of complexity the task explicitly warns against for a
duplicate `SeedCommentService`), the modal now shows the vote counts as a plain, non-interactive
`👍 N · 👎 N` display for seed posts — honest, consistent-looking, no "read-only"/"demo" label text
anywhere a user can see (the internal CSS class name `demo-seed-preview-readonly` was reused for
its pill styling only; its rendered text no longer says "Read-only" or "Demo"). This was not
required by the task's own definition of "interactive" (section 5 lists click/open/comment/reply/
report/question-status; voting is absent from that list), and normal-post voting was verified
unaffected (see Browser QA below).

The "Demo content" badge (`getDemoSeedLabelHTML()`, literally rendering "Demo content / Kandungan
demo / 演示内容") and the `is-demo-seed-preview` outline class were removed entirely from
user-facing rendering, per the task's instruction not to show seed/demo/preloaded labels to
readers. `isDemoSeed`/`isDemoSeedRuntime` remain as internal-only fields (used only to decide the
vote-display branch and an unused-by-CSS `dataset.demoSeed` debug attribute).

## Stable id — verified, not rebuilt

Demo-seed runtime ids were already deterministic before this task: `activateDemoSeedSnapshot()`
assigns a decrementing negative id (`-1, -2, ...`) purely by fixed array order in the static
bundle, with collision-avoidance against the real `notes` array's ids (which only ever start at
100 and count up — confirmed via `nextId = 100` in `app-data.js`, no overlap risk). No index-based
instability, no per-reload randomization, no duplicate-id case was found. This task reused that
exact scheme for the new 67-post source (appended after the 696 legacy notes in the same
id-assignment loop) rather than inventing a second one. Verified by test (see below): the same
`demoSeedKey` always resolves to the same id across repeated "reload" simulations.

## Comment persistence strategy

No new storage, no new service. Seed posts and user posts share the exact same
`CommentService.createComment()`/`getCommentThreadForPost()`/`getCommentCount()`, the exact same
`echo-wall-comments:v1` LocalStorage key, and the exact same Post Detail modal/composer markup —
verified live in the browser (comment survives a real page reload, bound to the same post id) and
in the automated test suite.

## 67-post import strategy

Kept in a **separate file/array**, `data/demo-seed-all-student-km.v1.js`
(`window.ECHO_WALL_ALL_STUDENT_KM_SEED`), deliberately NOT merged into `data/demo-seed-bundle.v1.js`.
That bundle has a strict, hand-written validator (`validatePortableDemoSeedBundle` in
`app-data.js`) hard-coded to exactly 696 notes / 17 walls / specific per-wall counts — merging into
it would have required rewriting that validator and risked breaking the existing 696 notes for zero
benefit. Instead, `activateDemoSeedSnapshot()` (in `app-data.js`) concatenates
`window.ECHO_WALL_ALL_STUDENT_KM_SEED` onto `snapshot.notes` **after** the bundle's own validation
already ran — the validator's inputs and behavior are byte-for-byte unchanged.

Content is copied verbatim from `note for all km student/All_Student_KM_67_Community_Posts.docx`
(extracted via its `word/document.xml`, not re-typed by hand) — title, body, and hashtags are not
paraphrased, translated, or reworded, and post numbering (`seedOrder`) matches the source
document's own `#01`–`#67`.

**Content → schema mapping decisions** (all deterministic, static, baked into the file):
- `content` = `"{title}\n\n{body}\n\n#tag1 #tag2"` — folds title/body/hashtags into the single
  `content` field real posts use (there is no separate title/body field in this schema). The
  Detail modal's `.modal-note-text` already has `white-space:pre-wrap`, so this renders as three
  visually separated blocks exactly like the source document; the Wall card preview (`.note-content`,
  no `white-space` override) collapses the newlines into a flowing, 5-line-clamped paragraph — this
  is the existing, unmodified rendering behavior for every post, not something added for this task.
  `title` and `hashtags` are additionally stored as their own fields for data completeness.
- `category` (only `academic`/`koko`/`campus_life`/`emotional` exist) is mapped from the document's
  own free-text Category label per post — a fixed lookup table, e.g. "Study Group"/"Academic
  Help"/"Notes"/"学习小组" → `academic`; "Sports"/"Sukan"/"Community"/"运动" → `koko`;
  "Campus Life"/"Lost & Found"/"Marketplace"/"Transport"/etc. → `campus_life`; "Wellbeing" →
  `emotional`. This only affects sticky color/icon, never the document's own hashtags (kept
  verbatim in `hashtags`/appended to `content`).
- Scope: every one of the 67 has `contextType:"community"`, `communityScope:"global"`,
  `communityKey:"global:all"`, `orgId:null`, `majorId:null`, `placeId:""` — never copied into any
  College/Jurusan/Building wall.
- Author: all 67 are `isAnonymous:true`, `authorNickname:null`, with a unique internal
  `authorUserId` (`demo_allkm_001`..`067`) — the source document has no real author names, so no
  identity was invented (per the task's explicit instruction not to fabricate one); this also keeps
  every one of them structurally unable to pass `canUserMarkSolved`'s ownership check.

## Language totals

English 34 / Bahasa Melayu 20 / Chinese 13 — 67 total, confirmed both by a Python extraction pass
over the source `.docx` XML and by the generated data file's own `language` field (see Tests).

## Discussion / Question mapping

Uses the existing `window.EchoPostTypeContract` (`discussion` | `question`, default
`discussion`) unmodified — no new postType value was added. Each of the 67 posts was read and
classified individually (not by a trailing "?" alone): a post is `question` when the author is
genuinely asking the community something and expecting an answer (e.g. "Anyone revising...this
week?", "Ada sesiapa nak buat kumpulan...?"); a post is `discussion` when it shares, offers,
reminds, or announces even if phrased invitingly (e.g. "I have a clean set of notes... Happy to
swap", "Found water bottle... describe the colour", "#67 All-KM question thread" — itself an
announcement inviting others to post questions, not a question). Result: 44 question / 23
discussion — the exact per-post assignment is baked into `data/demo-seed-all-student-km.v1.js` as
static data (`seedOrder` → `postType`), so it never changes between reloads.

## Sticky deterministic variation

`shape`/`color`/`rotation` are static values baked directly into each of the 67 records at
generation time (not computed by a runtime hash) — trivially deterministic since they never change
without editing the source file. Assignment used `seedOrder`-derived offsets across the project's
existing palettes only: `SHAPES` (10 values from `app-data.js`), each category's real
`CATEGORY_COLORS` pool (4 hex values per category, also from `app-data.js`), and a 7-value rotation
set within the existing ±2.5° clamp `buildNoteDOM()` already applies — no new palette, no new
shape, no new CSS. Verified result: 7 distinct colors, 10 distinct shapes, 7 distinct rotations
across the 67 posts (see Tests/Browser QA). Legacy seed posts were **not** touched — they already
carry hand-curated, varied `shape`/`rotation`/`color` values in their raw JSON (confirmed by
inspection, e.g. `"shape":"polaroid","rotation":-2,"color":"#BFDBFE"` on a sampled note), so section
24's "may also apply deterministic styling to old seed if it currently looks uniform" did not
apply — it already didn't look uniform.

## Idempotency

`activateDemoSeedSnapshot()` recomputes `demoSeedRuntimeNotes` fully from the two static sources
(the 696-note bundle + the 67-note array) every time it runs — nothing is ever appended to a
persisted store, so re-running it (simulating N page reloads) always yields exactly 763 total demo
notes, never 763+67, 830, etc. Verified for 2 and 5 consecutive activations in the automated test,
and for a real browser refresh (still exactly 67 All Student KM cards, still exactly 696+67=763
total demo-seed notes) in Browser QA.

## Browser QA (Chrome, `python -m http.server`, hard-reloaded between checks)

- **Echo Library**: Homepage promo ("Echo Library" / "Explore Echo Library →"), `#/study` landing
  (document title, eyebrow, H1 all "Echo Library"), Programme→Semester→Subject breadcrumb ("Echo
  Library · Science · Semester 1"), Resource Detail (title unchanged "Study Resource — Echo Wall"
  by design, PDF `Open` link still resolves to `assets/study-files/...pdf`), Upload page (title
  "Upload Study Material — Echo Wall", unchanged by design) — no "Study Notes" text found anywhere
  in `#app`'s rendered text on any of these pages.
- **All Student KM old seed**: N/A as a distinct case — the legacy bundle had zero pre-existing
  Global-scope posts (confirmed: All Student KM was empty before this task); its 67 posts are all
  new. Interaction verified on the new 67 instead (see below).
- **KMK College old seed**: opened a legacy seed post (`id -589`, `demoSeedKey
  "kmk-community-v1|community:1:1|note001"`, `postType` correctly normalized to `discussion`),
  posted a comment, confirmed it in the modal immediately, refreshed the page, reopened the same
  post by id, comment still present, wall comment-count badge showed `💬 1`.
- **Building Wall old seed**: opened a legacy seed post on B_PUSTAKA's wall (`id -43`) — clean
  content, no "Read-only"/"Demo" text, quiet `👍 0 · 👎 0` static display, no comments section
  (correct: Building notes have never had comments, for any post, seed or real — an intentional,
  pre-existing business boundary this task did not touch).
- **New 67 (All Student KM)**: 67 cards render (`#/community/all`), visually varied stickies
  (circle/hexagon/envelope/rect/polaroid-style shapes, blue/orange/etc. color families, slight
  rotations), Question badges show correctly on question posts and are absent on discussion posts.
  Interaction verified on one post per language: Chinese `#04`（找数学复习搭子）, Bahasa Melayu `#02`
  (Kumpulan Belajar), English `#10` (Best quiet study spot?) — each: opened, commented, comment
  visible immediately, wall comment-count badge updated, **refreshed**, reopened, comment still
  present, total card count still exactly 67 (not 134). Content spot-checked for `#01`, `#04`,
  `#10`, `#24`, `#34`, `#47`, `#54`, `#63`, `#67` against the source document — all match exactly.
- **Normal user post regression**: created a new Discussion post and a new Question post in KMK
  Sains (Jurusan) — both got real interactive vote buttons (`👍 Agree (N)` / `👎 Disagree (N)`, not
  the static seed display), both accepted a comment, both survived a real page refresh with the
  vote and comment intact, Question post correctly showed the `❓ QUESTION · OPEN` badge and (for
  the signed-in QA Admin's moderator permission) the Mark Solved action.
- **Dark Mode**: All Student KM wall re-checked in Dark Mode — text fully readable on every sticky
  color, comment-count badge from the earlier test still showed `💬 1` on the same card, no layout
  breakage.
- **Console**: 0 errors across every page/action above (checked after a hard reload before each
  new page, per this session's established pattern for this repo).

## Tests

- `node scripts/test-community-seed-interaction.mjs` — 38/38 assertions (stable id across a
  simulated reload, legacy-seed normalization fields, comment creation + persistence bound to the
  same id, real user post completely unaffected by seed activation/normalization/comments, Echo
  Library i18n contract changed while `#/study` route/page keys did not).
- `node scripts/test-all-student-km-seed.mjs` — 36/36 assertions (exactly 67 records, unique
  `seedOrder`/`demoSeedKey`, language totals 34/20/13, `global:all` scope only,
  `discussion`/`question` only via `EchoPostTypeContract`, content fidelity spot checks, idempotent
  across 2 and 5 re-activations, stable id + stable sticky styling across simulated reloads,
  ≥4 distinct colors/shapes/rotations used).
- Full existing regression suite re-run, all still passing, 0 regressions:
  `test-admin-audit` (64), `test-admin-college-scope` (56), `test-admin-dashboard` (53),
  `test-admin-management` (50), `test-admin-moderation-assist` (34),
  `test-admin-moderation-schema` (120), `test-admin-role-scope` (95),
  `test-post-type-unification` (PASS), `test-study-upload` (74),
  `test-display-count-consistency` (60/60, unrelated prior-task suite, re-run for safety).
- `node --check` clean on every edited `.js` file.

## Modified Files

- `app-data.js` — `normalizeDemoSeedCommunityFields()` (new), `activateDemoSeedSnapshot()` (merges
  the 67-post source + normalizes), `loadDefaultDemoSeed()`'s fetch-fallback now delegates to
  `activateDemoSeedSnapshot()`.
- `app-wall.js` — removed the demo-seed "Read-only"/"Demo content" UI gate on comments/question-actions/
  labels; vote display for seed posts is now a plain static count instead of a "read-only" badge.
- `app-router.js` — 4 document-title values renamed.
- `app-study.js` — 2 hardcoded error strings renamed.
- `index.html`, `map.html` — one new `<script>` tag each.
- `i18n/locales/en.js`, `i18n/locales/ms.js`, `i18n/locales/zh.js` — 7 keys each renamed.
- New: `data/demo-seed-all-student-km.v1.js`, `scripts/test-community-seed-interaction.mjs`,
  `scripts/test-all-student-km-seed.mjs`, this report,
  `checkpoints/COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY/`.

## Known Limitations

- The `loadDefaultDemoSeed()` `fetch()`-fallback path (used only when
  `window.ECHO_WALL_DEMO_SEED_BUNDLE` is absent — never true in the current `index.html`/`map.html`,
  which always load `data/demo-seed-bundle.v1.js` via `<script>`) now also merges the 67-post
  source for consistency, but was not separately browser-tested since it is unreachable in the
  current setup.
- Community Post Detail has no dedicated deep-link URL (it is a modal overlay, identical for every
  post, real or seed) — "stable deep link" (task section 41) therefore does not apply here; Echo
  Library's own deep link (`#/study/resource/:id`) was verified instead and is unaffected.
- Voting on seed/legacy posts remains a static, non-interactive display (see "Old read-only seed
  posts" above) — a deliberate, reasoned scope decision, not an oversight; flagged here for
  visibility since it's the one interaction seed posts still don't fully match normal posts on.
- Mobile viewport was not separately re-verified this session (this repo's browser-automation
  `resize_window` does not actually change `window.innerWidth` — a pre-existing, previously
  documented limitation of this environment, unrelated to this task).
