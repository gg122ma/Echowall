# PRE_STATE — HOMEPAGE-POLISH-001

Date: 2026-08-21

## Task

Reorder-only: move the `How Echo Wall Works` (`how-section`) block in `renderHome()`
(`app-router.js`) to the bottom of the Homepage's content, immediately before the `<footer>`.
No content, styling, i18n, or other Homepage/Community change.

## State read before starting

Read the full current `renderHome()` body (`app-router.js` lines 285-373) before editing.
Confirmed the pre-edit section order was:

1. Hero (`<section class="hero container">`)
2. Stats (`<section class="container stats-section">`)
3. Community CTA (`<section class="container map-promo reveal-card" id="communities">`) —
   established by `COMMUNITY-V2-POLISH-002`, routes to `#/community`, unchanged by this stage.
4. **How Echo Wall Works** (`<section class="container section-block how-section">`) — the block
   this stage relocates.
5. Building promo (`<section class="container section-block building-home-section">`)
6. Echo Map promo (`<section class="container map-promo reveal-card">`)
7. Footer (`<footer class="container site-footer">`)

Confirmed the Community IA from `COMMUNITY-V2-POLISH-002`/`-003` (Homepage shows only the single
Community CTA, zero college cards; `#/community` owns `All KM Students` + the 12-college
`.org-card` grid) was intact and not to be touched by this reorder.

## Plan

Cut the entire `how-section` `<section>...</section>` block (heading + `how-grid` with all three
`01`/`02`/`03` cards, byte-for-byte, no markup edits) from its position between the Community CTA
and the Building promo, and paste it verbatim immediately before `<footer class="container
site-footer">`, after the Echo Map promo section. No other section's markup changes.

## Files touched by this stage

- `app-router.js` — `renderHome()` only (pure reorder, no content edits).

## Files explicitly NOT touched

`app-community.js` (Community Hub, College Landing — untouched, Community IA stays exactly as
POLISH-002/003 left it), `style-core.css`/`style-wall.css` (no CSS change — same classes, same
rules), i18n locale files (no copy change), `app-wall.js`, `app-admin.js`, `echomap.js`,
`app-campus-*.js`, `services/*`, router table.

## New order after this stage (see `after/app-router.js.post`)

Hero → Stats → Community CTA → Building promo → Echo Map promo → **How Echo Wall Works** →
Footer.
