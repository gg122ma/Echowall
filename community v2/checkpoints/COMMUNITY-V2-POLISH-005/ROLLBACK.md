# ROLLBACK — COMMUNITY-V2-POLISH-005

## Scope of this stage

- `app-community.js`: `globalCard` markup only — added `data-pointer-glow-card` +
  `org-card-global` class + three new `<span>` layers, removed the old static `.org-card-glow`
  div, changed the middle `<div>` to `.org-card-body`. `collegeCards` markup byte-identical to
  before this stage.
- `style-core.css`: one new rule block (`.org-card[data-pointer-glow-card].org-card-global ...`).
  No existing rule's declared values were changed.
- `app-router.js`: **not touched at all** — confirmed byte-identical to the
  `COMMUNITY-V2-POLISH-004` "after" snapshot.

## To roll back (globalCard loses pointer-glow, back to its pre-POLISH-005 static-blob look)

1. Restore `globalCard` in `app-community.js` from
   `before/app-community.js.pre` in this checkpoint directory (or hand-revert just the
   `globalCard` template literal — the `collegeCards` block below it is unaffected either way).
2. Remove the `.org-card[data-pointer-glow-card].org-card-global ...` rule block from
   `style-core.css` (search for the `COMMUNITY-V2-POLISH-005` comment marking its start), or
   restore the whole file from `before/style-core.css.pre`.
3. No `app-router.js` change to revert.

## Verification after rollback

- `node --check app-community.js`
- Load `#/community` and confirm "All KM Students" is back to its plain `-8px` hover lift and
  static corner-blob glow, with no pointer-follow.
- Confirm the 12 College Cards and the Homepage card are unaffected either way (this stage's
  rollback touches nothing they depend on).

## Dependencies / interactions with other checkpoints

- **Depends on `COMMUNITY-V2-POLISH-004`'s shared engine and `[data-pointer-glow-card]` CSS
  rules being present** — this stage adds no new JS and reuses those rules' hover/lift/opacity
  choreography verbatim. Do not roll back `POLISH-004` without also rolling back this stage
  first (or `globalCard`'s new attribute/layers would be inert markup with no matching CSS).
- Independent of `HOMEPAGE-POLISH-002/002A/002B` (Homepage card) — rolling this stage back has no
  effect on the Homepage.
- Independent of `COM-V2-002..008` and `COMMUNITY-V2-POLISH-001/002/003` (routing, permissions,
  wall filtering, IA — none touched).
