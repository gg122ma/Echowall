# COM-V2-004 — Rollback instructions

## What this stage modified

- `index.html`: added `<fieldset id="post-type-group">` (Discussion/Question radios) at the top of `#note-form`, before "Your Note".
- `app-data.js`: `wallState` initial object literal gained `postType: "all"`.
- `app-wall.js`:
  - `openDrawer()`: added 2 lines toggling `#post-type-group`'s `hidden` based on `wallState.contextType`.
  - `handleFormSubmit()`: added `postType` derivation from the checked radio; `newNote`'s `postType`/`questionStatus` now use it instead of hardcoded `"discussion"`/`null`.
  - `getFilteredNotes()`: added a Type-filter `if` check.
  - `renderContextWall()`'s toolbar HTML: added a conditional (community-only) Type filter-group between Category and Sort.
  - New `setPostTypeFilter(postType)` function.
  - New `getQuestionBadgeHTML(note)` function; called from `buildNoteDOM()` (after `note-category-label`) and `openModal()` (in `.modal-note-tools`).
  - `buildNoteDOM()`: added `commentCountHTML` (💬 count) in the note footer.
- `style-wall.css`: added `.question-badge`/`.question-badge.is-solved`/`.note-comment-count` rules + dark-theme overrides.
- `style-core.css`: added `.form-group[hidden]{display:none}` — **this fixes a real bug** (see below), not purely additive to this feature.
- `i18n/locales/{en,ms,zh}.js`: added `form.postType*` (5 keys) and `wall.type*`/`wall.*Badge` (6 keys) × 3 locales.

## A real bug was found and fixed this stage — read before reverting `style-core.css`

`.form-group` sets `display:flex`, which silently defeats the `[hidden]` attribute on any element with that class (author `display` beats the UA default `[hidden]{display:none}`) — exact same pattern previously documented for `.building-search`/`.building-list` in `map.html` (see HANDOFF.md, 2026-08-20 entry). Without the `.form-group[hidden]{display:none}` fix, the Post Type selector stayed visible on the Building Wall compose drawer even though `openDrawer()` correctly set `hidden = true` on it. **If this stage is rolled back, that CSS fix must stay** if `#post-type-group` (or any other conditionally-hidden `.form-group`) is kept — otherwise re-add it as part of a from-scratch Post Type implementation, don't silently drop it.

## How to roll back only this stage

1. `index.html`: remove the `#post-type-group` fieldset.
2. `app-data.js`: remove `postType: "all"` from the `wallState` literal.
3. `app-wall.js`: revert `openDrawer()` (remove the 2-line toggle), `handleFormSubmit()` (remove `postType` derivation, hardcode `postType: "discussion", questionStatus: null` again), `getFilteredNotes()` (remove the Type-filter check), the toolbar HTML (remove the Type filter-group block), delete `setPostTypeFilter`/`getQuestionBadgeHTML`, and remove `commentCountHTML` from `buildNoteDOM()`'s footer and the badge call from `openModal()`.
4. `style-wall.css`: remove `.question-badge*`/`.note-comment-count` rules.
5. `style-core.css`: **only** remove `.form-group[hidden]{display:none}` if no other `.form-group` anywhere is ever conditionally hidden after this rollback — check first (`grep -rn "\.hidden\b" app-*.js` for any `.form-group`-classed element).
6. `i18n/locales/{en,ms,zh}.js`: remove the added `form.postType*`/`wall.type*`/`wall.*Badge` keys.

## Data implications of rolling back

Any post created with `postType: "question"` after this stage shipped keeps that field forever (rollback doesn't touch stored data) — it will just have no UI to change/display it after rollback (falls back to being treated as a plain note with no special badge, since nothing reads `postType` once this stage's code is removed). No data loss, just loss of the Question distinction in the UI.

## Files this rollback must NOT touch

- `app-router.js`, `app-community.js`, `data/community-config.js`, `services/community-service.js` — untouched this stage.
