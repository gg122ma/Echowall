# PRE_STATE — COMMUNITY-V2-POLISH-004

Date: 2026-08-21

## Task

Reuse the Homepage Community CTA's pointer-follow gold glow (built across
`HOMEPAGE-POLISH-002`/`002A`/`002B`, all done earlier this session, no
formal checkpoint was requested for those) on the Community Hub's 12
College Community cards (`#/community`), via a shared engine — not a
second, duplicated implementation. Homepage card, Community IA, and the
College Card's existing `.org-card`/`.org-grid` 4-column desktop layout
must not change.

## State read before starting

- Re-read the current `initializeHomeCommunityCard()` in `app-router.js`
  (the POLISH-002B version — single-card, `querySelector`, own closure
  state) and the `.home-community-card-*` CSS (POLISH-002B version — three
  layers: ambient/rings/pointer-glow, only pointer-glow reaches opacity 1 on
  hover).
- Re-read `renderCommunityHub()` in `app-community.js`: confirmed
  `collegeCards` (12 `.org-card` buttons, restored by `COMMUNITY-V2-POLISH-003`)
  is a separate block from `globalCard` ("All KM Students"), and confirmed
  `.org-card`'s base CSS (`style-core.css` line 193-206): `min-height:250px`,
  `overflow:hidden` (so any new glow layer added inside a card is
  automatically clipped to that card's own box — cannot bleed into
  siblings, satisfying the "one card, one card only" requirement by
  construction, not just by radius tuning), existing `.org-card:hover {
  transform:translateY(-8px); }` (must be overridden down to -2px for cards
  that opt into the new effect, per this task's -3px cap), and the existing
  static `.org-card-glow` corner-blob decoration (used by both globalCard
  and collegeCards today — this task replaces it with the new 3-layer set
  only inside collegeCards, leaving globalCard's exactly as-is).
- Confirmed `app-router.js` loads before `app-community.js` in
  `index.html`'s script order (line 225 vs 226), so a shared engine defined
  once in `app-router.js` is safely callable from `app-community.js`'s
  markup-building code and from `initializeRenderedPage()`'s
  `community-hub` branch — no need to duplicate the engine in
  `app-community.js`.

## Plan

- `app-router.js`: extract the existing single-card pointer-follow logic
  into `initializePointerGlowCard(card)` (the reusable per-card engine —
  independent `rect`/`current`/`target`/`raf` via closure, no shared
  globals) + `initializePointerGlowCards(selector)` (the
  reduced-motion/coarse-pointer gate + `querySelectorAll` + per-match
  engine call). `initializeHomeCommunityCard()` becomes a one-line wrapper
  calling `initializePointerGlowCards("[data-home-community-card]")`. Add a
  new one-line wrapper `initializeCommunityCollegeCardGlow()` calling
  `initializePointerGlowCards("[data-pointer-glow-card]")`, invoked from
  `initializeRenderedPage()` when `page === "community-hub"`.
- `app-community.js`: add `data-pointer-glow-card` plus three new
  `<span>` layers (`org-card-ambient`, `org-card-rings`,
  `org-card-pointer-glow`) to `collegeCards`' markup only, replacing the old
  static `org-card-glow` div there (globalCard keeps its original
  `org-card-glow` div, untouched, no new attribute). Wrap the untyped
  middle `<div>` (kicker/title/desc) in a new `org-card-body` class so it
  can be explicitly stacked above the new absolutely-positioned glow layers
  (mirrors `.org-card-header`'s existing `position:relative;z-index:1`).
  "Enter community" text is kept (per this task's explicit instruction —
  unlike the Homepage card, which removed its separate button entirely;
  here it's just in-card text, the whole button remains the sole click
  target).
- `style-core.css`: new rules scoped to `.org-card[data-pointer-glow-card]`
  only (so the "All KM Students" card and any other `.org-card` usage is
  unaffected) — smaller radii (210-220px vs the Homepage's 420-560px),
  capped `-2px` hover lift (overriding the base `.org-card:hover`'s `-8px`),
  no large blurred box-shadow glow (only a thin `0 0 0 1px` ring — the
  "main light" is entirely the pointer-glow radial layer, per this task's
  explicit instruction). Colors use `color-mix(in srgb, var(--primary)/
  var(--primary-light) N%, transparent)` (already an established pattern in
  this file, e.g. line 606/662/677) instead of hardcoded hex, so the glow
  is automatically the right tone in both Light (white card, muted
  terracotta glow) and Dark (near-black card, brighter gold glow) themes
  with no separate dark-theme override block needed.

## Files touched by this stage

- `app-router.js` — the pointer-glow init code only (refactor + one new
  wrapper + one new `initializeRenderedPage()` branch).
- `app-community.js` — `collegeCards`' markup only (globalCard untouched).
- `style-core.css` — new rules only, scoped to `[data-pointer-glow-card]`;
  zero changes to any pre-existing `.org-card`/`.home-community-card-*`
  rule's own declared values.

## Files explicitly NOT touched

`app-data.js` (`organizations`, unchanged), `getCommunityNoteCount()`,
`renderCollegeLanding()` (College Landing, General/Jurusan — untouched),
`app-wall.js`, i18n locale files (no new keys — reused
`community.hub.collegeKicker`/`community.desc`/`community.enter`, all
already existing), `app-admin.js`, `echomap.js`, `app-campus-*.js`,
`services/*`, router table.

## Known, accepted simplification (documented, not a defect)

The shared engine deliberately does NOT add a `window` resize listener
(unlike a resize-aware design would) — see the code comment above
`initializePointerGlowCard()` in `app-router.js`. With up to 12 cards on
the Community Hub, a `window`-level resize listener per card would outlive
its element on every SPA navigation (since `renderCommunityHub()` replaces
the DOM via `innerHTML`, and nothing currently tears down page-specific
listeners on route change). Rect is still correctly re-measured on every
`pointerenter`, so this only affects the rare case of resizing the browser
window while actively hovering one specific card — accepted as out of
scope per this task's "不需要大规模重构" instruction.
