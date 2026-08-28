# PRE_STATE — COMMUNITY-WALL-POST-TYPE-UNIFICATION

Date: 2026-08-23

The worktree already contained extensive unrelated uncommitted work. Whole-file restoration from
`HEAD` is unsafe. Before this task, Community alone owned the real post-type behavior:

- field: `postType`
- enum: exact lowercase `discussion | question`
- default and invalid-value fallback: `discussion`
- Question state: `questionStatus: open | solved`; Discussion stores `null`
- badge: `getQuestionBadgeHTML()` using existing Question/open/solved i18n keys
- form/i18n: `#post-type-group` and existing `form.postType*` keys in EN/BM/ZH

Before-task differences: stored-note normalization handled the field only for Community; Building
hid the post-type control and omitted the field; `EchoNoteStore.createPlaceNote()` omitted it; Echo
Map direct compose persisted Category/Shape and its established Color path but exposed no post-type
control; Admin moderation displayed context and Category but no post type.

No files were reset, cleaned, stashed, restored, committed, pushed, or staged by this task.
