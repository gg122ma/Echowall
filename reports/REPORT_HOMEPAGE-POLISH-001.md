# REPORT_HOMEPAGE-POLISH-001

**Task ID:** HOMEPAGE-POLISH-001 — Move "How Echo Wall Works" to the bottom of the Homepage
**Status:** PASS
**Start State:** `COMMUNITY-V2-POLISH-003` complete. Homepage order was Hero → Stats → Community
CTA → How Echo Wall Works → Building promo → Echo Map promo → Footer.
**Checkpoint Path:** `checkpoints/HOMEPAGE-POLISH-001/`
**Scope:** Pure section reorder inside `renderHome()`. No content, styling, i18n, route, or
Community IA change.

## Completed

- Moved the entire `how-section` block (`A simple knowledge loop` eyebrow, `How Echo Wall Works`
  heading, description, and the full `01`/`02`/`03` `how-grid` of three cards) from its old
  position — directly after the Community CTA — to immediately before the `<footer>`, after the
  Building promo and Echo Map promo sections. The block's markup was moved byte-for-byte; nothing
  inside it was edited.
- New Homepage order: Hero → Stats → Community CTA → Building promo → Echo Map promo →
  **How Echo Wall Works** → Footer.
- Community CTA (`COMMUNITY-V2-POLISH-002`) and all other Homepage sections are unchanged and
  still appear above "How Echo Wall Works."
- Community IA (`COMMUNITY-V2-POLISH-002`/`-003`: Homepage shows zero colleges, only the single
  CTA; `#/community` owns `All KM Students` + the 12-college card grid) was not touched.

## Modified Files

- `app-router.js`
  → `renderHome()`: reordered the returned template's `<section>` blocks. No markup inside any
    section changed; no CSS class, i18n key, or route changed.

## Files Explicitly Not Touched

`app-community.js` (Community Hub, College Landing, Community IA), `style-core.css`/
`style-wall.css`, i18n locale files, `app-wall.js`, `app-admin.js`, `echomap.js`,
`app-campus-*.js`, `services/*`, router table.

## Data / Schema Changes

None.

## Routes Changed

None.

## Testing

No browser-automation tool is available in this environment (same constraint as the Community
POLISH stages; installing one would violate this repo's "no package manager" rule in
`CLAUDE.md`). Verification used the same direct-function-call method: real Node `vm` execution of
the actual, unmodified `app-data.js`/`app-router.js` source, calling the real `renderHome()` and
asserting on the real rendered HTML's section order (string-index comparison, not just presence).
Script kept in the session scratchpad (not part of the repo): `test-render-home-004.js`.

- `node --check app-router.js` / other touched-adjacent files: **Verified**, all pass.
- **How Echo Wall Works: Moved to bottom** — **Verified**. Direct-call test confirms its
  string-index position is after Hero, Stats, Community CTA, Building promo, and Echo Map promo,
  and before the Footer (with no other section text appearing between it and the Footer).
- **Community CTA remains above it** — **Verified**. Community CTA (`id="communities"`, routes to
  `#/community`) index is earlier in the output than the "How Echo Wall Works" section, and its
  own markup/route/i18n keys are unchanged.
- **Footer remains below it** — **Verified**. Footer (`site-footer`) index is the last of all
  checked markers.
- **Content unchanged** — **Verified**. "How Echo Wall Works" heading, "A simple knowledge loop"
  eyebrow, and all three steps ("Choose your context" → "Read real experience" → "Leave something
  useful", in that order) render exactly as before; exactly 3 `.how-card` elements present (no
  card added, removed, or reordered within the block).
- **Community IA not reverted** — **Verified**. No `.org-card`/`.org-grid` reintroduced on the
  Homepage (0 matches, same as after `COMMUNITY-V2-POLISH-003`); Community Hub's own render
  function (`app-community.js`, untouched) re-tested and still shows `All KM Students` + the
  12-college card grid, unaffected.
- **Desktop / Mobile / Light / Dark / EN·BM·ZH visual rendering (spacing, animation order,
  overflow, footer spacing)**: **Not verified** — no browser available in this environment. Risk
  assessed low: this stage moved an unmodified `<section>` block to a new position among other
  unmodified sibling sections that already use the same `.section-block`/`.reveal-card` spacing
  and `data-reveal` scroll-reveal system; no CSS rule is order-dependent (`grep`-checked — no
  adjacent-sibling (`+`) or general-sibling (`~`) selectors reference `.how-section`,
  `.building-home-section`, or `.map-promo` in `style-core.css`), and `data-reveal`'s
  IntersectionObserver in `initializeRevealElements()` (`app-router.js`) attaches to whatever
  `[data-reveal]` elements exist in the DOM regardless of their order, so no animation-order
  regression is expected from a pure reorder.

## Remaining Issues

- No real-browser visual/screenshot confirmation of spacing, animation timing, overflow, or
  Light/Dark/EN/BM/ZH rendering — environment limitation (no browser automation tool available).

## Next Step

None planned. Stopping here per the request's own instruction not to continue adjusting other
Homepage UI.
