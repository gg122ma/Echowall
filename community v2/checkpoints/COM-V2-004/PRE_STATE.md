# COM-V2-004 — Pre-checkpoint state

## Baseline confirmed present (COM-V2-003 PASSED)

- Global/College General/Jurusan walls all fully functional, correct scope isolation (verified via a real 3-post creation test in COM-V2-003, cleaned up afterward — KMK→Sains at 81).
- `handleFormSubmit()` already wrote `postType: "discussion"` (hardcoded) and `questionStatus: null` for every new community post — this stage makes that a real user choice instead of a hardcoded value.
- Compose form had no Post Type selector; wall toolbar had no Type filter; sticky cards/detail modal had no Question badge.

## Files this stage is expected to touch

- `index.html` (new Post Type fieldset in compose form)
- `app-wall.js` (`openDrawer` — toggle group visibility; `handleFormSubmit` — read real postType; `getFilteredNotes` — Type filter; `buildNoteDOM`/`openModal` — Question badge; toolbar HTML — Type filter group; new `setPostTypeFilter`/`getQuestionBadgeHTML`)
- `app-data.js` (`wallState` — add `postType: "all"` default)
- `style-wall.css` (`.question-badge`, `.note-comment-count`)
- `i18n/locales/{en,ms,zh}.js` (form.postType*, wall.type*, wall.*Badge keys)

Not expected to touch: `app-router.js`, `app-community.js`, `app-data.js normalizeStoredNote()` (already scope/postType-aware since COM-V2-001/003), building/map files.
