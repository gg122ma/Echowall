# PRE_STATE — COMMUNITY-V2-POLISH-005

Date: 2026-08-21

## Task

Extend the pointer-follow gold glow (shared engine from `COMMUNITY-V2-POLISH-004`) to the "All KM
Students" `globalCard` on `#/community`, reusing the exact same
`initializePointerGlowCard`/`initializePointerGlowCards` engine and the same
`org-card-ambient`/`org-card-rings`/`org-card-pointer-glow` layer classes as the 12 college cards
— no second implementation. Only the glow radius should differ (globalCard is much wider — the
sole item in its own `.org-grid` row, so it expands to the full container width, unlike the
4-per-row college cards).

## State read before starting

- Re-read `renderCommunityHub()` in `app-community.js`: confirmed `globalCard` still had its
  original pre-`POLISH-004` markup — plain `.org-card` (no `data-pointer-glow-card`), a static
  `.org-card-glow` corner-blob `<div>`, untyped middle `<div>` (not `.org-card-body`) — completely
  untouched since `COMMUNITY-V2-POLISH-004` deliberately left it alone.
- Re-read the `.org-card[data-pointer-glow-card]` CSS block added by `POLISH-004`: confirmed the
  hover/lift/opacity choreography (`-2px` lift, no large box-shadow blaze, only pointer-glow
  reaches full opacity) is already generic — it applies to ANY element with
  `[data-pointer-glow-card]`, regardless of which specific card. This meant globalCard would
  inherit all of that automatically just by gaining the attribute + the three layers; only a
  radius/anchor size variant needed new CSS.
- Confirmed `initializePointerGlowCards("[data-pointer-glow-card]")` (in `app-router.js`, from
  `POLISH-004`) already uses `document.querySelectorAll`, so it needed zero changes to also pick
  up globalCard once the attribute is added to its markup — this stage does not touch
  `app-router.js` at all, verified by a byte-identical diff against the `POLISH-004` "after"
  snapshot (see Testing in the report).

## Plan

- `app-community.js`: give `globalCard` `data-pointer-glow-card` + a new `org-card-global` sizing
  class, add the three `<span>` layers (removing the old static `.org-card-glow` div — kept
  alongside the new layers would have produced two competing light sources, exactly the
  double-light bug `HOMEPAGE-POLISH-002B` already fixed once for the Homepage card), and change
  the untyped middle `<div>` to `.org-card-body` (matching the college cards' pattern, needed for
  correct stacking above the new absolute layers — the global `.org-card-body,
  .org-card-link{position:relative;z-index:1;}` rule from `POLISH-004` already covers it, no new
  CSS needed for that part).
- `style-core.css`: add ONE new size-variant rule block,
  `.org-card[data-pointer-glow-card].org-card-global .org-card-{ambient,rings,pointer-glow}`,
  with larger radii (440px ambient / 400px pointer-glow, within the requested 360-480px range) —
  everything else (hover lift, opacity choreography, focus-visible ring, `:active` tap feedback)
  is inherited for free from the existing `[data-pointer-glow-card]` rules.
- `app-router.js`: **no change** — the shared engine already generalizes via `querySelectorAll`.

## Files touched by this stage

- `app-community.js` — `globalCard`'s markup only.
- `style-core.css` — one new rule block (`.org-card-global` size variant) only.

## Files explicitly NOT touched

`app-router.js` (verified byte-identical to the end of `COMMUNITY-V2-POLISH-004` — see report),
`collegeCards`' markup (unchanged), `app-data.js`, `getCommunityNoteCount()`,
`renderCollegeLanding()`, `app-wall.js`, i18n locale files (no new keys — reused
`community.hub.kicker`/`community.hub.globalName`/`community.hub.globalDesc`/`community.hub.enter`,
all pre-existing), `app-admin.js`, `echomap.js`, `app-campus-*.js`, `services/*`, router table.
