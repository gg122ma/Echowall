# ROLLBACK — COMMUNITY-V2-POLISH-003

## Scope of this stage

Only `app-community.js`, function `renderCommunityHub()`, was changed: the `College Communities`
section's compact `.selection-list`/`.selection-item` (from POLISH-001) was replaced with the
original `.org-card`/`.org-grid` card grid (restored verbatim from the pre-POLISH-001 backup).
`renderCollegeLanding()`'s Jurusan compact list, the Homepage's single-CTA `#communities` section
(POLISH-002), all routes, and `style-core.css` were not touched.

## To roll back to POLISH-002's compact-list Hub layout

```bash
cp "community v2/checkpoints/COMMUNITY-V2-POLISH-003/before/app-community.js.pre" app-community.js
```

This restores `renderCommunityHub()`'s compact `.selection-list` college section (and the rest of
the file, already byte-identical to this backup outside that function).

## To roll back further, to before POLISH-001 (Hub had a duplicate of the old Homepage grid)

Not applicable/not recommended — POLISH-002 already permanently removed the Homepage's grid, so
there is nothing left to "duplicate." Do not attempt to restore the Homepage's college grid on
the basis of any older checkpoint; see `HANDOFF.md`'s POLISH-002 and POLISH-003 entries.

## Verification after rollback

- `node --check app-community.js`
- Load `#/community` and confirm the compact list (`KMK  119 visible notes  →`) is back instead
  of the card grid.

## Dependencies / interactions with other checkpoints

- Independent of `COM-V2-002..008` (routing, permissions, comments, wall filtering, storage —
  none touched by this stage).
- Independent of `COMMUNITY-V2-POLISH-002`'s Homepage change — rolling this stage back does not
  affect the Homepage (it stays as a single CTA either way).
- Reverses only the *visual layout* part of `COMMUNITY-V2-POLISH-001` (compact list → card grid).
  POLISH-001's actual purpose at the time — eliminating a duplicate grid between two pages — is
  unaffected either way, since the Homepage grid POLISH-001 was deduplicating against no longer
  exists (removed by POLISH-002).
