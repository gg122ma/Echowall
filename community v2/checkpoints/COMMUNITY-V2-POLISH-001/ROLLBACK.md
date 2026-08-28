# ROLLBACK — COMMUNITY-V2-POLISH-001

## Scope of this stage

Only `app-community.js`, function `renderCommunityHub()`, was changed. The
`collegeCards` grid markup (originally a duplicate `.org-card`/`.org-grid`, identical
in structure to the Homepage's Kolej grid) was replaced with a compact
`.selection-list`/`.selection-item` list — same data source, same routes, smaller
visual footprint. The `globalCard` (`All KM Students`) section and everything else in
the file was not touched.

No other file was modified in this stage. No storage schema, note data, or route
table changed.

## To roll back

Restore the pre-change function from the verbatim backup:

```bash
cp "community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre" app-community.js
```

This restores `renderCommunityHub()` (and the rest of the file, which was already
byte-identical to the backup outside that function) to its exact pre-change state.

Alternatively, hand-revert just `renderCommunityHub()`'s `collegeCards` block back to
the `.org-card` grid form documented in `PRE_STATE.md`.

## Verification after rollback

- `node --check app-community.js`
- Load `#/community` and confirm the full-size college card grid is back.

## Dependencies / interactions with other checkpoints

None. This stage does not touch anything from COM-V2-002..008 — it only changes
Hub markup, not routing, permissions, comments, wall filtering, or storage. Safe to
roll back independently of any other checkpoint.
