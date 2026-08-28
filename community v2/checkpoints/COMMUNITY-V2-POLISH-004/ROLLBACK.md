# ROLLBACK — COMMUNITY-V2-POLISH-004

## Scope of this stage

- `app-router.js`: refactored `initializeHomeCommunityCard()`'s body into a
  shared `initializePointerGlowCard(card)` / `initializePointerGlowCards(selector)`
  pair, plus a new `initializeCommunityCollegeCardGlow()` wrapper and a new
  `if (page === "community-hub")` branch in `initializeRenderedPage()`.
- `app-community.js`: `collegeCards`' markup gained `data-pointer-glow-card`
  and three new `<span>` layers; `globalCard` is byte-identical to before.
- `style-core.css`: new rules only, all scoped to
  `.org-card[data-pointer-glow-card]` / its child `.org-card-ambient` /
  `.org-card-rings` / `.org-card-pointer-glow` / `.org-card-body`. No
  existing rule's declared values were edited.

## IMPORTANT — shared dependency between Homepage and College Cards

**`initializePointerGlowCard(card)` is now the single engine both the
Homepage's Community CTA (`HOMEPAGE-POLISH-002`/`002A`/`002B`) and the
Community Hub's 12 College cards depend on.** If you roll back only the
`app-community.js`/`style-core.css` changes (removing the College Cards'
effect) but leave `app-router.js`'s refactor in place, the Homepage card
keeps working fine — `initializeHomeCommunityCard()` still calls the same
shared engine with just its own selector, and nothing about the engine
itself changed behaviorally, only where it's *defined* (extracted into two
functions instead of one). It is safe to roll back either side
independently. If you roll back `app-router.js`'s refactor specifically,
you must ALSO remove `data-pointer-glow-card` and the three new `<span>`
layers from `app-community.js`'s `collegeCards` (otherwise those cards
would have dead markup with no JS wiring it up — harmless visually, since
the CSS var() fallbacks still render a static default glow, but the
pointer-follow motion would silently stop working).

## To roll back the College Cards' pointer-glow effect only (keep Homepage as-is)

1. Restore `collegeCards` in `app-community.js` from
   `before/app-community.collegeCards.before.js` in this checkpoint
   directory (removes `data-pointer-glow-card` and the three new `<span>`
   layers, restores the original single `.org-card-glow` div).
2. Remove the `.org-card[data-pointer-glow-card]...` rule block from
   `style-core.css` (search for the `COMMUNITY-V2-POLISH-004` comment
   marking its start).
3. `app-router.js`'s refactor can be left in place (harmless — nothing
   references `[data-pointer-glow-card]` anymore after step 1, so
   `initializeCommunityCollegeCardGlow()` just finds zero elements and
   no-ops) or reverted too using
   `before/app-router.renderHome-init.before.js` plus removing the
   `if (page === "community-hub")` branch in `initializeRenderedPage()`.

## To roll back everything from this stage

```bash
# app-community.js: hand-restore collegeCards from the backup above.
# style-core.css: remove the COMMUNITY-V2-POLISH-004-tagged rule block.
# app-router.js: restore the pointer-glow section from
#   before/app-router.renderHome-init.before.js, and remove the
#   `if (page === "community-hub") { initializeCommunityCollegeCardGlow(); }`
#   branch from initializeRenderedPage().
```

Full post-stage file copies are in `after/` for diffing:

```bash
diff "community v2/checkpoints/COMMUNITY-V2-POLISH-004/after/app-router.js.post" app-router.js
diff "community v2/checkpoints/COMMUNITY-V2-POLISH-004/after/app-community.js.post" app-community.js
diff "community v2/checkpoints/COMMUNITY-V2-POLISH-004/after/style-core.css.post" style-core.css
```

## Verification after rollback

- `node --check app-router.js app-community.js`
- Load `#/` and confirm the Homepage Community CTA still has its
  pointer-follow glow (if `app-router.js`'s refactor was kept) or its
  original POLISH-002B behavior (if fully reverted).
- Load `#/community` and confirm College Cards are back to plain hover
  (`-8px` lift, static corner blob) with no pointer-follow.

## Dependencies / interactions with other checkpoints

Independent of `COM-V2-002..008` and `COMMUNITY-V2-POLISH-001/002/003`
(none of their routing/permission/wall-filtering/IA changes are touched).
Builds on top of `HOMEPAGE-POLISH-002/002A/002B` (no formal checkpoint
exists for those sub-stages — they were done earlier this same session
without a dedicated checkpoint request; this stage's `before/` snapshot is
the closest recorded reference point for the pre-refactor engine).
