# ROLLBACK — COMMUNITY-WALL-POST-TYPE-UNIFICATION

Do not restore whole files. Reverse only these task hunks:

1. `app-data.js`: remove `POST_TYPES`, `normalizePostType`, `EchoPostTypeContract`, Building
   creation fields, and `EchoNoteStore.postTypes`; restore Community-only normalization.
2. `app-wall.js`: restore Building-only hiding of `#post-type-group` and Community-only fields.
3. `features/map-note-overlay.js`: remove post-type copy, field, submission, CSS, and detail row.
4. `app-admin.js`: remove `postTypeLabel` and its metadata badge.
5. Remove `scripts/test-post-type-unification.mjs`.
6. Remove this checkpoint/report and only this task's dated documentation sections.

Do not delete legacy data. No Git reset/clean/restore is required.
