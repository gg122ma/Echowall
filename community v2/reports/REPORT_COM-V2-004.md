# REPORT_COM-V2-004

**Task ID:** COM-V2-004 — Discussion / Question Post Type
**Status:** PASS
**Start State:** COM-V2-003 PASSED. Note: the "make new posts V3-compliant" half of this task's originally-planned debt was already completed in COM-V2-003 (pulled forward because scope isolation required it) — this stage's real remaining scope was the actual Discussion/Question selector UI, filter, and badge.
**Checkpoint Path:** `community v2/checkpoints/COM-V2-004/`

## Completed

- Compose Drawer: new "Post Type" selector (Discussion / Question radio cards, matching the existing identity-choice visual pattern) at the top of the form, Discussion pre-selected by default. Only shown for community posts — hidden entirely for Building posts (no Discussion/Question concept there).
- `handleFormSubmit()`: `postType`/`questionStatus` now come from the real selected radio (`question` → `questionStatus:"open"`; `discussion` → `questionStatus:null`) instead of the hardcoded `"discussion"`/`null` COM-V2-003 shipped with.
- Sticky Card + Detail Modal: Question posts show a "❓ QUESTION · OPEN" badge (will read "SOLVED" once COM-V2-006 exists); Discussion posts show no badge at all. Badge adapts to every shape/color/photo/rotation combination (rendered as a normal flex child inside the existing card markup, not a fixed-position overlay).
- Sticky Card footer: comment count placeholder (💬 `commentCount`, always 0 until COM-V2-005 builds the real comment store) — community posts only, building posts unaffected. Clicking the card still opens the Detail Modal; nothing expands inline.
- Wall Toolbar: new "Type: All / 💬 Discussion / ❓ Question" filter group, community walls only (absent on Building Wall).
- Legacy/demo-seed notes with no `postType` continue to default to Discussion via COM-V2-001's `normalizeStoredNote()` — unchanged, re-verified this stage.

## A real bug was found and fixed (not originally in scope, but blocking)

`.form-group { display:flex }` in `style-core.css` silently defeats the `[hidden]` attribute (same documented pattern as `.building-search`/`.building-list` in a prior session) — the new Post Type selector stayed visibly rendered on the **Building Wall** compose drawer even though `openDrawer()` correctly set `hidden=true` on it (confirmed via `getBoundingClientRect()`: `hidden` was `true` in the DOM, but the element still had nonzero rendered height). Fixed by adding `.form-group[hidden]{display:none}` to `style-core.css`. Re-verified after the fix: `#post-type-group` now has 0 height on the Building Wall.

## Modified Files

`index.html`, `app-data.js`, `app-wall.js`, `style-wall.css`, `style-core.css`, `i18n/locales/{en,ms,zh}.js`.

## Data / Schema Changes

None beyond what COM-V2-001/003 already introduced. `postType`/`questionStatus` are now genuinely user-chosen at creation time rather than always `"discussion"`/`null`.

## Routes Changed

None.

## UI Changed

Compose Drawer (new Post Type selector, community-only), Wall Toolbar (new Type filter, community-only), Sticky Card (Question badge + comment count), Detail Modal (Question badge). Building Wall UI: confirmed unaffected (Post Type selector correctly absent after the CSS fix; no comment count shown on building note cards).

## Testing

- `node --check` passed for all 5 touched `.js` files.
- Created a real Question post via the actual Compose UI on KMK→Sains (selected "Question" radio, submitted): confirmed stored shape `{postType:"question", questionStatus:"open", schemaVersion:3}`. Sticky card showed "❓ QUESTION · OPEN" badge correctly styled within the note's color/shape. Detail Modal showed the same badge next to the category pill.
- Type filter: clicking "Question" correctly isolated to exactly the 1 test post (all 81 legacy Discussion notes correctly hidden); clicking back to "All" restored the full 82-note view.
- Legacy notes: spot-checked several pre-existing seed notes — none show a Question badge (correctly treated as Discussion by COM-V2-001's normalization default).
- Building Wall: confirmed Post Type selector absent from compose (after the CSS fix), no console errors, note creation flow otherwise unaffected.
- Cleanup: removed the 1 test post by ID, confirmed KMK→Sains back to 81.
- Dark+ZH: Verified on the Jurusan wall — Type filter labels ("全部/讨论/提问"), toolbar, and wall state all correctly translated, no raw i18n keys visible, zero console errors.
- Admin: Verified, no errors, note/vote totals unaffected by test cleanup.
- Light+EN: Verified throughout (all screenshots in this stage's primary testing were Light+EN unless noted).

## Regression

- Building Wall: Verified (see above — also confirms the CSS fix didn't break anything else that uses `.form-group`, since every other `.form-group` on the page has no `hidden` attribute and is unaffected by an added `[hidden]` selector).
- Admin: Verified, 25 notes / totals unchanged after test cleanup.
- Jurusan wall (KMK→Sains): 81 → 82 (1 test post) → 81 (after cleanup) — confirmed via reload.
- Echo Map / other routes: not re-tested this stage (no files in their load path were touched beyond `app-data.js`'s `wallState` literal addition, which `map.html`/`echomap.js` never read — `wallState` is a wall-toolbar concept, unused by the map page).

## Compatibility

- `getQuestionBadgeHTML()` reads `note.postType`/`note.questionStatus` — both already guaranteed present (via COM-V2-001's normalization or COM-V2-003/004's creation-time writes) for every community note reaching the wall. No defensive fallback needed beyond the existing `note?.postType !== "question"` early-return.
- Mobile: not independently re-verified this stage (same UI patterns — flex cards, existing `.identity-choice-*` classes already mobile-tested in earlier stages — low risk; flagged for COM-V2-008's full regression pass along with BM language).

## Project Memory Updated

`CHANGELOG.md`, `HANDOFF.md`, `CODE_AUDIT.md`, `COMMUNITY_V2_PROGRESS.md`.

## Remaining Issues

- Mobile viewport and BM language not independently re-screenshotted this stage — deferred to COM-V2-008's full regression sweep (consistent with prior stages' notes; risk assessed as low, same established CSS/i18n patterns reused).
- Comment count is always 0 (no comment store exists yet) — expected, COM-V2-005 builds the real source of truth.

## Rollback Instructions

See `community v2/checkpoints/COM-V2-004/ROLLBACK.md`. **Read the `.form-group[hidden]` note before removing that CSS rule** — it fixes a real, independently-reproducible bug, not just this feature's own visual state.

## Next Task

COM-V2-005 — Comments + One-Level Reply
