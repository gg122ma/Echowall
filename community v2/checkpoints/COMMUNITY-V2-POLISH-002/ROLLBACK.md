# ROLLBACK — COMMUNITY-V2-POLISH-002

## Scope of this stage

- `app-router.js` `renderHome()`: removed the `orgCards` builder and the 12-card `.org-grid`
  markup from the `#communities` section; replaced with a single `.map-promo`-styled "Enter
  Community" CTA that routes to `#/community`.
- `app-community.js` `renderCommunityHub()`: comment-only correction, no logic/markup change.

No other file changed in this stage. No storage schema, note data, or route table changed —
`#/community`, `#/community/all`, `#/community/:orgId`, `#/community/:orgId/general`,
`#/community/:orgId/jurusan/:majorId`, and the legacy `#/org/:orgId` redirect are byte-identical
to before this stage.

## To roll back to POLISH-001's state (Homepage shows the full grid again)

Restore `renderHome()`'s `#communities` section from the verbatim pre-edit snapshot:

```bash
# Reference the exact old code:
cat "community v2/checkpoints/COMMUNITY-V2-POLISH-002/before/app-router.renderHome.communities-section.before.js"
```

Hand-apply that snippet back into `app-router.js` in place of the current single-CTA
`#communities` section (restore the `orgCards` builder immediately after
`const latestNote = ...;`, and restore the `<section class="container section-block"
id="communities">...<div class="org-grid">${orgCards}</div></section>` markup).

Alternatively, diff the full post-edit copy against the working file to locate the exact hunk:

```bash
diff "community v2/checkpoints/COMMUNITY-V2-POLISH-002/after/app-router.js.post" app-router.js
```

(If that diff is empty, the working tree still matches this stage's output and the hand-apply
step above is the one to use.)

The `app-community.js` comment-only change needs no rollback action — reverting it has no
behavioral effect either way.

## Verification after rollback

- `node --check app-router.js`
- Load `#/` and confirm the 12-card Kolej grid is back under "CHOOSE A SPACE / Communities".

## Dependencies / interactions with other checkpoints

- Independent of `COM-V2-002..008` (routing, permissions, comments, wall filtering, storage —
  none touched).
- **Supersedes `COMMUNITY-V2-POLISH-001`'s stance that "the Homepage must keep the full grid."**
  If a future rollback of this stage is performed, that reintroduces the exact duplicate-IA
  problem POLISH-001 was originally asked to fix (Homepage grid + Hub grid both listing every
  college) — POLISH-001's own fix (Hub uses a compact list, not a duplicate large grid) is
  unaffected by rolling this stage back, so rolling back POLISH-002 alone would NOT restore a
  full duplicate grid on the Hub, only on the Homepage. Read `HANDOFF.md`'s POLISH-002 entry
  before doing this — the product decision recorded there is deliberate and dated 2026-08-21,
  not a mistake to silently reverse.
