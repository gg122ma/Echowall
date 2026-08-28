# PRE_STATE — COMMUNITY-V2-POLISH-002

Date: 2026-08-21

## Task

Corrects `COMMUNITY-V2-POLISH-001`'s IA decision. The latest, highest-priority product
instruction is the opposite of what POLISH-001 preserved: the Homepage must **not** show the
full 12-college Kolej grid. The Homepage gets a single "Enter Community" CTA that routes to
`#/community`; the Community Hub becomes the sole place all colleges are listed (alongside
`All KM Students`).

## State read before starting (per this task's own section 13 instruction)

- `community v2/checkpoints/COMMUNITY-V2-POLISH-001/PRE_STATE.md` / `ROLLBACK.md` — confirmed
  POLISH-001 only ever touched `renderCommunityHub()` in `app-community.js` (removed the Hub's
  *duplicate* large grid, replaced with a compact list) and explicitly left the Homepage's full
  grid untouched, believing at the time that the Homepage grid was the correct final state. That
  belief is what this task corrects — the report is not wrong about what it did, only about what
  the product actually wanted long-term.
- `HANDOFF.md` / `CHANGELOG.md` / `CODE_AUDIT.md` — confirmed POLISH-001's entries are the most
  recent, and confirmed no other session already implemented this reversal.
- Read the *current* `app-router.js` `renderHome()` (lines 285-388) and confirmed the
  `#communities` section still contained the full `organizations.map(...)` → `.org-card` grid,
  unchanged since before POLISH-001.
- Read the *current* `app-community.js` `renderCommunityHub()` (unchanged by this task's edits
  until now) and confirmed the Hub already shows `All KM Students` + a compact
  `.selection-list` of all 12 colleges with canonical `#/community/:orgId` routes — this already
  satisfies section 16/17 of the new instruction ("Community Hub 承担 College Discovery") with
  zero further changes needed there.

## Plan

- `app-router.js` `renderHome()`: delete the `orgCards` builder and the `.org-grid` markup
  entirely; replace the `#communities` section with a single CTA reusing the existing
  `.map-promo` component (already used lower on the same page for the Echo Map promo — same
  CSS, already mobile/dark-theme-covered, no new stylesheet rules). CTA text reuses existing
  `community.hub.eyebrow` / `community.hub.title` / `community.hub.globalDesc` / `community.enter`
  i18n keys (all already translated EN/BM/ZH) — no new i18n keys. Button navigates to
  `#/community` (the Hub), never directly to a specific college and never the legacy `#/org/:id`.
  `id="communities"` kept on the new section so the existing hero "Explore" button's
  `scrollIntoView('#communities')` keeps working unmodified.
- `app-community.js` `renderCommunityHub()`: no functional change — POLISH-001's compact college
  list already satisfies "all colleges visible after entering Community." Only the stale code
  comment (which said the Homepage still owns the full grid) is corrected.
- `organizations` array (`app-data.js`), `getCommunityNoteCount()` (`app-router.js`): untouched,
  still the single data source for both the (now single-CTA) Homepage stat count and the Hub's
  college list.

## Files touched by this stage

- `app-router.js` — `renderHome()` only.
- `app-community.js` — `renderCommunityHub()` comment only (no logic change).

## Files explicitly NOT touched

`app-data.js`, `app-wall.js`, `style-core.css`/`style-wall.css` (no new CSS — reused `.map-promo`
verbatim), i18n locale files (no new keys), `renderCollegeLanding()`, all Sticky Wall renderers,
`app-admin.js`, `echomap.js`, `app-campus-*.js`, `services/*`, router table (`getRoute()`/
`render()` in `app-router.js` — no route added, removed, or retargeted).

## Verbatim before/after snapshots

- `before/app-router.renderHome.communities-section.before.js` — exact pre-edit text of the
  touched region (function open + `orgCards` builder + the old `#communities` section markup),
  captured via Read before any edit in this task.
- `after/app-router.js.post`, `after/app-community.js.post` — full post-edit file copies.
