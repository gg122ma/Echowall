# REPORT_COMMUNITY-V2-POLISH-005

**Task ID:** COMMUNITY-V2-POLISH-005 — "All KM Students" card joins the shared pointer-follow gold
glow
**Status:** Code complete, logic-verified; real-browser interaction verification pending (same
outstanding item as `COMMUNITY-V2-POLISH-004`)
**Start State:** Homepage Community CTA and the 12 College Community cards have the shared
pointer-follow glow (`HOMEPAGE-POLISH-002/002A/002B`, `COMMUNITY-V2-POLISH-004`). `globalCard`
("All KM Students") still had its original plain `.org-card` hover (`-8px` lift, static corner
blob).
**Checkpoint Path:** `community v2/checkpoints/COMMUNITY-V2-POLISH-005/`

## Completed

- `globalCard` now carries `data-pointer-glow-card` + the same three layers
  (`org-card-ambient`/`org-card-rings`/`org-card-pointer-glow`) as the 12 college cards — **zero
  new JS**. `app-router.js` was not touched at all this stage; confirmed byte-identical to the end
  of `COMMUNITY-V2-POLISH-004` (see Testing).
- Old static `.org-card-glow` corner blob removed from `globalCard` (kept alongside the new layers
  would have reproduced the exact "two competing light sources" bug `HOMEPAGE-POLISH-002B` already
  fixed once for the Homepage card).
- Added one new CSS rule block, `.org-card[data-pointer-glow-card].org-card-global`, giving only
  the glow *radius* a larger value (440px ambient / 400px pointer-glow, within the requested
  360-480px range) — every other behavior (hover lift capped at `-2px`, no large box-shadow
  blaze, pointer-glow as the sole "main light" per `HOMEPAGE-POLISH-002B`'s principle, `:active`
  tap feedback, `:focus-visible` ring) is inherited for free from the existing
  `[data-pointer-glow-card]` rules `COMMUNITY-V2-POLISH-004` already wrote — nothing card-specific
  needed re-declaring.
- 🌐 icon, "All KM Students" text, "Enter →" link, `#/community/all` route, and card
  size/position (still the sole item in its own `.org-grid` row) are all unchanged.
- The 12 College Cards' markup is byte-identical to before this stage — not touched.

## Modified Files

- `app-community.js`
  → `globalCard`'s template literal only: added `data-pointer-glow-card`/`org-card-global`,
    replaced the old `.org-card-glow` div with the three new layers, renamed the middle `<div>`
    to `.org-card-body`. `collegeCards` unchanged. Comments above `collegeCards` updated to reflect
    that globalCard is no longer the deliberately-untouched exception.
- `style-core.css`
  → One new rule block (`.org-card-global` size variant). No existing rule's values changed.

## Files Explicitly Not Touched

`app-router.js` (verified byte-identical to the `COMMUNITY-V2-POLISH-004` "after" snapshot),
`collegeCards` markup, `app-data.js`, `getCommunityNoteCount()`, `renderCollegeLanding()`,
`app-wall.js`, i18n locale files (no new keys), `app-admin.js`, `echomap.js`, `app-campus-*.js`,
`services/*`, router table.

## Data / Schema Changes

None.

## Routes Changed

None. `#/community/all` unchanged.

## Testing

No browser-automation tool is available in this environment (same constraint as every prior POLISH
stage). Verification used the same direct-function-call method: real Node `vm` execution of the
actual, unmodified `app-data.js`/`app-community.js`/`app-router.js` source, calling the real
functions and asserting on the real output. New script:
`test-hub-cards-005.js` (session scratchpad, not part of the repo).

- `node --check` on `app-community.js`: **Verified**, passes. CSS brace balance: **Verified**
  (735 open / 735 close).
- **No second pointer-animation implementation**: **Verified** — `app-router.js` is byte-for-byte
  identical to the `COMMUNITY-V2-POLISH-004` "after" snapshot (direct string comparison of the two
  files), proving this stage added zero JS.
- **Markup (10 checks)**: 13 elements now carry `data-pointer-glow-card` (1 global + 12 college,
  up from 12); `globalCard` carries `org-card-global`; still routes to `#/community/all`; old
  `.org-card-glow` fully removed (zero occurrences anywhere in the Hub now); `globalCard` has all
  3 new layers; 🌐 icon preserved; "All KM Students" text preserved; "Enter →" link preserved;
  still the sole card in its own `.org-grid` row; the 12 college cards remain unaffected (still
  have `data-pointer-glow-card`, none of them gained `org-card-global`). **All 10 pass.**
- **3-card isolation (11 checks) — the core requirement of this stage**: simulated "All KM
  Students" (full-width fake element) alongside two college-card-sized fake elements (KMK, KMKK).
  Hovering "All KM Students" at its left/center/right edges correctly settles `--pointer-x` near
  20%/50%/89% respectively (full-range tracking on the wider card too); KMK and KMKK's values stay
  completely untouched throughout that entire sequence; leaving "All KM Students" eases it back to
  center without affecting either college card; conversely, hovering KMK afterward does not change
  "All KM Students"' already-settled value, and does not touch KMKK. **All 11 pass** — confirms
  independence in both directions (global→college and college unaffected by global, college
  hover doesn't leak back to global).
- **Regression — Homepage card**: rerun `test-community-card-js-002a.js` and
  `test-render-home-005.js` unchanged, **all 22 checks still pass** — this stage did not touch
  `app-router.js`, so this is a formality confirming nothing broke, not new coverage.
- **Regression — College Landing, Homepage section order**: rerun unchanged, **all pass**.
- **Two pre-existing scratch test files now have superseded assertions** (expected, not
  regressions): `test-render-hub-003.js`'s literal `class="org-card reveal-card"` string match
  (globalCard's class attribute is now `"org-card org-card-global reveal-card"`, a different
  string) and `test-hub-cards-004.js`'s "exactly 12 `data-pointer-glow-card`" assertion (now 13,
  correctly, since globalCard has it too) both predate this stage's explicit instruction to change
  exactly those things. `test-hub-cards-005.js` is the current, authoritative check for this
  state.

## Real browser verification (still outstanding — carried over from COMMUNITY-V2-POLISH-004)

Same environment constraint as every prior stage this session: GUI screenshot capture
(`screencapture`) works, but simulating mouse/keyboard input or running in-page JavaScript is
blocked by macOS permissions this session cannot grant itself. The user previously agreed to
manually interact in the already-open Safari session while this session takes screenshots; that
pass has not yet happened. **Still needed, now covering three surfaces instead of two:**

- Homepage Community Card: left / center / right / leave / Tab-focus.
- "All KM Students" card: left / center / right / leave.
- Isolation: hovering "All KM Students" must not light up KMK, and vice versa.
- Spot-check 2-4 college cards (e.g. KMK, KMKK) individually.
- `#/community/all` route still opens the Global Wall correctly on click.

## Remaining Issues

- Real-browser confirmation of all of the above is the one open item, identical in nature to
  `COMMUNITY-V2-POLISH-004`'s outstanding item (now including "All KM Students" too).

## Next Step

Awaiting the user's manual browser interaction pass. No other Community/Homepage UI work started.
