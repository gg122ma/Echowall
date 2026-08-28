# REPORT_COMMUNITY-V2-POLISH-004

**Task ID:** COMMUNITY-V2-POLISH-004 — College Community Cards reuse the Homepage Community
Card's pointer-follow gold glow
**Status:** Code complete, logic-verified; real-browser interaction verification pending (see
Testing section)
**Start State:** Homepage Community CTA has the pointer-follow gold glow from
`HOMEPAGE-POLISH-002`/`002A`/`002B` (done earlier this session, no formal checkpoint requested for
those). `#/community`'s College Communities section is the 4-column `.org-card`/`.org-grid`
restored by `COMMUNITY-V2-POLISH-003`, with plain hover (`-8px` lift, static corner glow).
**Checkpoint Path:** `community v2/checkpoints/COMMUNITY-V2-POLISH-004/`

## Completed

- Extracted the Homepage card's pointer-follow logic out of
  `initializeHomeCommunityCard()` into a reusable, generic engine:
  `initializePointerGlowCard(card)` (per-card closure state — own
  `rect`/`current`/`target`/`raf`, no shared globals) and
  `initializePointerGlowCards(selector)` (reduced-motion/coarse-pointer gate +
  `querySelectorAll` + one engine instance per match). `initializeHomeCommunityCard()` is now a
  one-line wrapper around the shared engine — **zero duplicated pointer-follow logic**.
- Added a new one-line wrapper `initializeCommunityCollegeCardGlow()`, called from
  `initializeRenderedPage()` when `page === "community-hub"`.
- `app-community.js`'s `collegeCards` (all 12 colleges) now carry `data-pointer-glow-card` plus
  three new layers (`org-card-ambient`, `org-card-rings`, `org-card-pointer-glow`), replacing the
  old static corner-blob decoration on those cards only.
- `globalCard` ("All KM Students") is **completely untouched** — no new attribute, no new layers,
  original `-8px` hover lift and static `org-card-glow` blob unchanged.
- New CSS, scoped entirely to `.org-card[data-pointer-glow-card]`, gives College Cards their own
  smaller-radius version of the same three-layer choreography (ambient/rings restrained, only
  pointer-glow reaches full opacity — same `HOMEPAGE-POLISH-002B` principle: pointer-glow is the
  only "main light"), capped `-2px` hover lift (not the base `.org-card`'s `-8px`), and no large
  blurred box-shadow glow (only a thin 1px ring — the actual "glow" is entirely the pointer-glow
  radial layer). Colors use `color-mix(in srgb, var(--primary)/var(--primary-light) N%,
  transparent)` (an existing pattern in this file) so the effect is automatically the right tone
  in both Light (muted terracotta on a white card) and Dark (bright gold on a near-black card)
  themes — no separate dark-theme override block needed.
- `overflow:hidden` on `.org-card` (pre-existing, unmodified) means each card's glow layers are
  physically clipped to that card's own box — cross-card bleed into neighbors is structurally
  impossible, not just avoided by radius tuning.
- "Enter community →" text is **kept** inside each College Card (per explicit instruction — unlike
  the Homepage card, which removed its separate button entirely). The whole `<button>` remains
  the sole click target; the text is not a second interactive element.
- Canonical routes unchanged: every College Card still calls `navigate('#/community/:orgId')`.

## Modified Files

- `app-router.js`
  → Refactored the pointer-glow init code into `initializePointerGlowCard()` +
    `initializePointerGlowCards()`; `initializeHomeCommunityCard()` now delegates to it; added
    `initializeCommunityCollegeCardGlow()` and a new `community-hub` branch in
    `initializeRenderedPage()`.
- `app-community.js`
  → `collegeCards` markup: added `data-pointer-glow-card`, three new `<span>` layers, wrapped the
    kicker/title/desc `<div>` in a new `.org-card-body` class (for correct stacking above the new
    absolutely-positioned layers). `globalCard` untouched.
- `style-core.css`
  → New rules only, scoped to `[data-pointer-glow-card]` and its child layer classes. No existing
    rule's declared values were changed.

## Files Explicitly Not Touched

`app-data.js`, `getCommunityNoteCount()`, `renderCollegeLanding()` (College Landing), `app-wall.js`,
i18n locale files (no new keys), `app-admin.js`, `echomap.js`, `app-campus-*.js`, `services/*`,
router table, `globalCard` markup/CSS.

## Data / Schema Changes

None.

## Routes Changed

None.

## Testing

**Shared pointer-glow engine reused: Yes.** `initializePointerGlowCard`/`initializePointerGlowCards`
is defined once in `app-router.js` and is the only place the pointer-follow math exists;
`initializeHomeCommunityCard()` and `initializeCommunityCollegeCardGlow()` are both thin wrappers
around it (verified by reading the final `app-router.js` — `grep -c` for the damping/easing logic
returns exactly one occurrence).

**Duplicated second pointer-follow implementation: No.** Confirmed by code inspection — there is
no second copy of the `requestAnimationFrame`/damping loop anywhere in the codebase.

No browser-automation tool (Playwright/Puppeteer) is available in this environment. As with all
prior POLISH stages, verification was done via real Node `vm` execution of the actual, unmodified
`app-data.js`/`app-router.js`/`app-community.js` source (not reimplemented stubs), calling the
real functions and asserting on the real output:

- `node --check` on all touched/adjacent JS files: **Verified**, all pass.
- **Markup-level (9 checks)**: 12 college cards carry `data-pointer-glow-card`; the global card
  does not; the global card still uses the old static `.org-card-glow` unchanged; all 12 college
  cards have the 3 new layers; the old `.org-card-glow` div only appears once now (the global
  card's); "Enter community" text is present in all 12 college cards (kept, not removed); every
  card routes to canonical `#/community/:orgId`; `.org-grid` (4-column CSS) still wraps both
  sections; still exactly 12 organizations. **All 9 pass.**
- **Multi-card independence (6 checks, the core requirement of this stage)**: simulated two
  separate fake card elements at different DOM positions, hovering one does not touch the other's
  `--pointer-x`; moving the mouse within one card while a value is already set on a sibling leaves
  the sibling's value untouched; each card eases back to its own center (50%) independently on its
  own `pointerleave` without affecting the other. **All 6 pass** — confirms no shared global state
  (`current`/`target`/`rect` are per-card closures, not a single module-level object).
- **Homepage card regression (13 + 9 checks, rerun unchanged from HOMEPAGE-POLISH-002A/002)**: the
  full-range pointer-follow math (clamp-free tracking to ~80%/~5%/~90%, genuine per-frame easing
  not instant jumps, pointerleave settling to center, touch/reduced-motion/coarse-pointer gating)
  and the Homepage markup checks (single button, no separate Enter button, aria-label, canonical
  route) **all still pass** — confirms the shared-engine refactor did not regress the already
  '完成' Homepage card.
- **College Landing (`#/community/1`) and full Homepage section-order regression**: rerun
  unchanged from prior stages, **all pass** — confirms this stage did not touch either surface.

## Real browser verification (per this task's own section 29 requirement)

**Not yet completed at the time of this report.** This session does have real GUI screen access
(confirmed via `screencapture`/`osascript` earlier this session) but keyboard/mouse simulation
(`System Events`) and in-page JavaScript execution (`Safari do JavaScript`) are both blocked by
macOS permissions this environment cannot grant itself — the user previously agreed to manually
hover/click while this session takes screenshots. That manual interaction round was requested for
`HOMEPAGE-POLISH-002A`/`002B` (mouse-left / mouse-center / mouse-right / pointerleave / Tab-focus
on the Homepage card) and has not yet been completed before this stage's instructions arrived. The
same manual-interaction method is the plan for verifying the College Cards (KMK/KMKK/KMPP/KMKT:
mouse-left/center/right/leave on each, confirming only the hovered card lights up) — **pending the
user's next interaction pass in Safari.**

- Pointer-follow glow: **Implemented** (per code + logic-level verification above).
- Glow follows cursor position: **Not independently browser-verified yet** (logic-verified only).
- Glow is not image swapping: **Verified** — no `<img>` tag and no `background-image: url(...)`
  anywhere in either card's markup or CSS; both cards render entirely from `radial-gradient()`/
  `repeating-radial-gradient()` driven by `--pointer-x`/`--pointer-y`.
- Per-card independence (only the hovered card activates): **Logic-verified** (multi-card test
  above); **not yet independently confirmed in a real browser.**
- Desktop 4-column grid intact: **Logic-verified** (`.org-grid` wrapper unchanged, no new
  breakpoint rules added).
- Mobile / Light / Dark / EN·BM·ZH: **Not independently verified** — same environment constraint
  as every prior POLISH stage.

## Remaining Issues

- Real-browser confirmation of the pointer-follow effect (Homepage card and all 12/spot-checked
  College Cards) is outstanding — requires the user's manual mouse interaction in the already-open
  Safari session, which was requested but not yet completed before this stage's instructions
  arrived. This report will be updated once that pass happens, if requested.
- No mobile-specific radius tuning was added for the College Cards' `:active` tap flourish (the
  Homepage card got one in `HOMEPAGE-POLISH-002`); the college-card tap glow uses its 210px
  desktop radius on mobile's single-column, wider card too. Low-impact (brief tap-only visual, no
  functional effect) — flagged rather than silently left out of the report.

## Next Step

Awaiting the user's manual browser interaction pass (or explicit instruction to proceed without
it) before this task can be marked fully visually verified. No other Community/Homepage UI work
started.
