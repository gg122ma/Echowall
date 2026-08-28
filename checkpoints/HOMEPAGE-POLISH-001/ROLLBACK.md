# ROLLBACK — HOMEPAGE-POLISH-001

## Scope of this stage

Only `app-router.js`, function `renderHome()`, was changed: the `how-section` block (`How Echo
Wall Works`, its `A simple knowledge loop` eyebrow, and the `01`/`02`/`03` `how-card` grid) was
moved from between the Community CTA and the Building promo to immediately before the `<footer>`,
after the Echo Map promo. No markup inside the block, no other section, no CSS, no i18n, and no
other file changed.

## To roll back (restore the old section order)

Move the `how-section` block back to its original position — directly after the Community CTA
section (`id="communities"`) and directly before the `building-home-section`. The exact pre-edit
block text is in `before/app-router.renderHome.section-order.before.js` in this checkpoint
directory; copy it back to that position in `app-router.js` and delete it from its current
position (immediately before `<footer class="container site-footer">`).

Alternatively, diff the full post-edit copy against the working file to confirm no other change
needs to be reverted:

```bash
diff "checkpoints/HOMEPAGE-POLISH-001/after/app-router.js.post" app-router.js
```

## Verification after rollback

- `node --check app-router.js`
- Load `#/` and confirm "How Echo Wall Works" again appears directly under the Community CTA,
  above the building/Echo Map promos.

## Dependencies / interactions with other checkpoints

Independent of `community v2/checkpoints/COMMUNITY-V2-POLISH-001/002/003` — this stage does not
touch `app-community.js` or any Community route/IA. Rolling this stage back has no effect on the
Community CTA, `#/community`, or the College Communities grid either way.
