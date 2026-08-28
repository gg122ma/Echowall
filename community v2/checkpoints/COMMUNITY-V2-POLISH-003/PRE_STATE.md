# PRE_STATE — COMMUNITY-V2-POLISH-003

Date: 2026-08-21

## Task

Corrects only the *visual layout* decision inside `COMMUNITY-V2-POLISH-001`/`-002` — not the IA.
The IA from POLISH-002 (Homepage shows zero colleges, only a single "Enter Community" CTA →
`#/community`) **stays as-is and is not touched by this stage.** What changes: inside
`#/community`, the `College Communities` section currently renders as a compact
`.selection-item`/`.selection-list` (introduced in POLISH-001 to de-duplicate against the
Homepage's old grid). Since the Homepage no longer has any grid at all (POLISH-002), that
de-duplication reason no longer applies — the Hub is now free to (and per the latest instruction,
must) use the original large `.org-card`/`.org-grid` layout, 4 cards per row on desktop.

## History read before starting (request section 13)

- `COMMUNITY-V2-POLISH-001` (`community v2/checkpoints/COMMUNITY-V2-POLISH-001/`): introduced the
  compact `.selection-list` for the Hub's college section specifically *because* the Homepage
  still had the full `.org-card` grid at the time, and two full grids on two pages was the
  problem being fixed. The pre-POLISH-001 backup at
  `community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre` contains the exact
  original `collegeCards` markup (`.org-card`/`.org-grid`, `community.hub.collegeKicker` +
  `community.desc` i18n keys) — this is the markup restored verbatim in this stage, not
  reconstructed from memory.
- `COMMUNITY-V2-POLISH-002` (`community v2/checkpoints/COMMUNITY-V2-POLISH-002/`): removed the
  Homepage's college grid entirely, replacing it with a single CTA. This is the part of the IA
  that stays — confirmed by re-reading `app-router.js` `renderHome()` before starting this stage:
  it still has zero college cards, only the `.map-promo` CTA routing to `#/community`.
- Current `app-community.js` `renderCommunityHub()` (read before editing): confirmed it still
  used the POLISH-001 compact `.selection-list` for colleges — this is what needed to change.
  Confirmed `renderCollegeLanding()`'s Jurusan section still used its own separate
  `.selection-list`/`.selection-item` — this must NOT change (per request section 12), it's a
  different page for a different purpose (choosing a stream inside one college, not discovering
  all 12 colleges).
- Confirmed `.org-grid`'s existing CSS (`style-core.css` line 192:
  `grid-template-columns:repeat(auto-fit,minmax(245px,1fr))`, `.container` capped at 1160px,
  `gap:18px`) already yields exactly 4 columns at this page's container width with zero new
  breakpoint rules needed: `(1160 - 3*18)/4 ≈ 276.5px` per column (≥245px min, so 4 fit),
  `(1160 - 4*18)/5 ≈ 217.6px` (<245px min, so 5 does not fit) → auto-fit settles on 4. The
  `@media (max-width:720px) { .org-grid { grid-template-columns:1fr; } }` override (line 423)
  already gives 1-per-row on mobile. No CSS file was touched.

## Plan

- `app-community.js` `renderCommunityHub()`: replace the `collegeItems`
  (`.selection-item`/`.selection-list`) block with the original `collegeCards`
  (`.org-card`/`.org-grid`) block, restored verbatim from the POLISH-001 pre-change backup.
- `renderCollegeLanding()`: no change (Jurusan compact list stays exactly as-is).
- `app-router.js` `renderHome()`: no change (Homepage CTA from POLISH-002 stays exactly as-is).
- `style-core.css`: no change (reuse existing `.org-grid`/`.org-card` rules verbatim).
- i18n: no new keys — `community.hub.collegeKicker` and `community.desc` (both left in place,
  unused, after POLISH-001/002) become used again by this restoration.

## Files touched by this stage

- `app-community.js` — `renderCommunityHub()` only.

## Files explicitly NOT touched

`app-router.js` (Homepage CTA, router table), `renderCollegeLanding()` in `app-community.js`,
`app-data.js`, `app-wall.js`, `style-core.css`/`style-wall.css`, i18n locale files, `app-admin.js`,
`echomap.js`, `app-campus-*.js`, `services/*`.
