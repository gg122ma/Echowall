# REPORT_COMMUNITY-V2-POLISH-003

**Task ID:** COMMUNITY-V2-POLISH-003 — Community Hub's College Communities restored to a
4-column Card Grid
**Status:** PASS
**Start State:** `COMMUNITY-V2-POLISH-002` complete (Homepage: single Community CTA, no college
grid. Hub: `All KM Students` + compact `.selection-list` of all 12 colleges).
**Checkpoint Path:** `community v2/checkpoints/COMMUNITY-V2-POLISH-003/`
**Scope note:** This changes only the Hub's college-section *layout*. It does NOT touch the
Homepage IA established by POLISH-002 — that stays exactly as-is.

## Pre-change investigation (request section 13)

- Read `COMMUNITY-V2-POLISH-001`'s and `COMMUNITY-V2-POLISH-002`'s checkpoints/reports: confirmed
  the compact list was introduced in POLISH-001 specifically to avoid duplicating the Homepage's
  then-existing full grid, and that POLISH-002 later removed the Homepage's grid entirely — so
  the original reason for the compact list (avoiding a duplicate against the Homepage) no longer
  applies.
- Located the exact original `.org-card`/`.org-grid` Hub markup in
  `community v2/checkpoints/COMMUNITY-V2-POLISH-001/app-community.js.pre` (the pre-POLISH-001
  backup) and restored it verbatim rather than reconstructing it from memory, per the request's
  explicit instruction.
- Confirmed `.org-grid`'s existing CSS (`style-core.css`) already produces exactly 4 columns at
  this page's 1160px container width with zero new rules: `repeat(auto-fit,minmax(245px,1fr))`
  with an 18px gap fits 4×276.5px columns but not 5×217.6px columns; the existing
  `@media (max-width:720px)` override already collapses to 1 column on mobile. No CSS change was
  needed or made.
- Confirmed `renderCollegeLanding()`'s Jurusan `.selection-list`/`.selection-item` is a separate
  section in the same file and was not touched.

## Completed

- `app-community.js` `renderCommunityHub()`: replaced the compact `.selection-list` college
  section with the original `.org-card`/`.org-grid` card grid, restored verbatim from the
  pre-POLISH-001 backup (icon, `📖` note count, `MATRICULATION COMMUNITY`-style kicker via
  `community.hub.collegeKicker`, college name, description via `community.desc`, "Enter
  community →" link, card glow, hover animation — all pre-existing CSS, zero new rules).
- `All KM Students` global card: untouched (same markup, same `.org-grid` wrapper it already had).
- `renderCollegeLanding()`'s Jurusan compact list: untouched.
- Homepage (`app-router.js` `renderHome()`): untouched — still a single "Enter Community" CTA,
  zero college cards.

## Modified Files

- `app-community.js`
  → `renderCommunityHub()`: `collegeItems` (`.selection-item`/`.selection-list`) →
    `collegeCards` (`.org-card`/`.org-grid`), restored verbatim from the POLISH-001 backup.
    Comment above it corrected to explain why this is not a re-introduction of POLISH-001's
    duplicate-grid problem (the Homepage has zero grids now, so there is nothing to duplicate).

## Files Explicitly Not Touched

`app-router.js` (Homepage CTA + router table), `renderCollegeLanding()`, `app-data.js`
(`organizations`, unchanged data source), `getCommunityNoteCount()`, `style-core.css`/
`style-wall.css` (no new CSS — reused `.org-card`/`.org-grid` verbatim), i18n locale files (no
new keys — `community.hub.collegeKicker`/`community.desc`, unused since POLISH-001, are used
again by this restoration), `app-wall.js`, `app-admin.js`, `echomap.js`, `app-campus-*.js`,
`services/*`.

## Data / Schema Changes

None.

## Routes Changed

None. Every college card routes to canonical `#/community/:orgId` (never `#/org/:orgId`),
identical to before this stage.

## Testing

No browser-automation tool is available in this environment (same constraint as POLISH-001/002).
Verification used the same direct-function-call method: real Node `vm` execution of the actual,
unmodified `app-data.js`/`app-router.js`/`app-community.js` source, calling the real render
functions and asserting on the real rendered HTML. Scripts in the session scratchpad (not part
of the repo): `test-render-hub-003.js` (new), `test-render-home-002.js` / `test-render-landing.js`
(rerun unchanged from POLISH-002 to confirm no regression).

- `node --check` on `app-community.js`, `app-router.js`, `app-admin.js`, `app-place.js`,
  `app-wall.js`, `echomap.js`: **Verified**, all pass.
- **Homepage College Grid: Absent** — **Verified**. Rerunning the POLISH-002 Homepage test
  (unchanged file) still shows 0 `.org-card`, 0 `.org-grid`, no per-college route, single
  `.map-promo` CTA present.
- **Homepage Community CTA**: **Verified**. Routes to `#/community`, uses existing i18n keys, no
  hardcoded English (unchanged from POLISH-002, re-confirmed).
- **Community Hub — All KM Students**: **Preserved** — **Verified**. Global card markup,
  position, and route (`#/community/all`) are byte-identical to before this stage.
- **Community Hub — College Layout**: **4-column Card Grid** — **Verified at the CSS-rule level**
  (`.org-grid`'s `repeat(auto-fit,minmax(245px,1fr))` at 1160px container width mathematically
  yields 4 columns, confirmed by calculation above; this is the same rule the pre-POLISH-001
  Homepage grid used, already exercised in production before). Direct-call test confirms exactly
  2 `.org-grid` sections (Global + Colleges) and 13 total `.org-card` elements (1 Global + 12
  colleges), each with the required `org-card-glow`/`org-card-header`/`org-emoji`/
  `org-card-kicker`/`org-card-title`/`org-card-desc`/`org-card-link` structure.
- **12 Colleges**: **Verified** — all 12 `organizations` entries render as cards; spot-checked
  KMK/KMKK/KMPP/KMKT present; every card's `onclick` targets `#/community/:orgId` for its own
  `org.id`; note counts render via the real `getCommunityNoteCount()` (not hardcoded — confirmed
  with a stubbed value of `3` for org id `1`, which appeared correctly in the output).
- **Desktop 4-per-row**: **Verified at the CSS-rule level** (computed column-fit math above); not
  visually screenshotted (no browser available).
- **Tablet**: **Not independently verified** — no new breakpoint was added; existing `.org-grid`
  auto-fit behavior (2-3 columns depending on width between 508px and 1033px) is unchanged and
  was already the Homepage's pre-POLISH-001 tablet behavior for the same CSS class.
- **Mobile**: **Not independently verified visually** — the existing
  `@media (max-width:720px) { .org-grid { grid-template-columns:1fr; } }` rule (unchanged, not
  touched this stage) applies to this markup exactly as it did to the original Homepage grid.
- **Light / Dark**: **Not independently verified visually** — `.org-card`/`.org-grid` already has
  a Dark-theme override block in `style-core.css` (`:root[data-theme="dark"] .org-card`, etc.),
  unchanged by this stage, and was already exercised when this exact markup lived on the
  Homepage pre-POLISH-001.
- **College Landing (`#/community/1`)**: **Verified** — rerun of the same 4-check direct-call
  test as POLISH-001/002: KMK name renders, "General Community" routes to
  `#/community/1/general`, "Jurusan Channels" heading present, at least one Jurusan item routes
  to `#/community/1/jurusan/:majorId`. Confirms the Jurusan compact list was not affected by this
  stage's restoration of the *different* College Communities grid.
- **`#/community/all`, `#/community/1/general`, `#/community/1/jurusan/1`, Question/Comments/
  Solved/Unanswered, Echo Map, Building Wall, Admin**: **Not re-run this stage** — no file in any
  of those render paths was touched.

## Remaining Issues

- No real-browser visual/screenshot confirmation of the 4-per-row layout, Tablet, Mobile, Light,
  Dark, or EN/BM/ZH rendering — environment limitation (no browser automation tool available;
  installing one would violate this repo's "no package manager" rule). Risk assessed low: this
  restores markup and relies on CSS rules that were already in production (on the Homepage) prior
  to POLISH-001, not new code.
- `map.visibleNotes` i18n key (used by the now-removed `.selection-item` college rows) is
  unused at the Hub level again, though still actively used elsewhere (`app-place.js`,
  `echomap.js`). Not a dead key overall, just no longer referenced from `app-community.js`.

## Next Step

None planned. Stopping here per the request's own instruction not to continue into other
Community UI work.
