# REPORT_COMMUNITY-V2-POLISH-002

**Task ID:** COMMUNITY-V2-POLISH-002 — Homepage hides the full Kolej grid; Community Hub owns
College Discovery
**Status:** PASS
**Start State:** `COMMUNITY-V2-POLISH-001` complete (Hub's duplicate large grid already replaced
with a compact list; Homepage still had the full 12-card grid).
**Checkpoint Path:** `community v2/checkpoints/COMMUNITY-V2-POLISH-002/`
**Supersedes:** `COMMUNITY-V2-POLISH-001`'s decision that the Homepage must keep the full Kolej
grid. See `HANDOFF.md`/`CODE_AUDIT.md` — that decision is now explicitly reversed.

## Pre-change investigation (request section 13)

- Read `community v2/checkpoints/COMMUNITY-V2-POLISH-001/PRE_STATE.md` and `ROLLBACK.md`:
  confirmed POLISH-001 only ever touched `renderCommunityHub()` (removed the Hub's *duplicate*
  grid), and deliberately left the Homepage grid alone based on the product instruction active
  at the time.
- Read the current `HANDOFF.md`/`CHANGELOG.md`/`CODE_AUDIT.md`: confirmed POLISH-001 is the most
  recent Community V2 work and no later session already made this change.
- Read the current `app-router.js` `renderHome()`: confirmed the full `.org-card` grid (12
  colleges) was still present under `#communities`.
- Read the current `app-community.js` `renderCommunityHub()`: confirmed it already shows
  `All KM Students` + all 12 colleges as a compact `.selection-list` with canonical
  `#/community/:orgId` routes — this already satisfies "College Discovery happens in the Hub,"
  so no functional change was needed there, only a stale comment fix.

## Completed

- `app-router.js` `renderHome()`: removed the 12-card `.org-card`/`.org-grid` Kolej grid entirely.
  Replaced with a single Community CTA reusing the existing `.map-promo` visual component
  (already used lower on the same Homepage for the Echo Map promo) — no new CSS. CTA text reuses
  existing `community.hub.eyebrow` / `community.hub.title` / `community.hub.globalDesc` /
  `community.enter` i18n keys (already translated EN/BM/ZH) — no new i18n keys added. Button
  routes to `#/community` (the Hub) — never a specific college, never the legacy `#/org/:id`.
  `id="communities"` preserved so the hero's existing "Explore" button (`scrollIntoView`) still
  works unmodified.
- `app-community.js` `renderCommunityHub()`: no functional change. Fixed a stale code comment
  that referenced the (now-removed) Homepage grid as the canonical college-picker location.

## Modified Files

- `app-router.js`
  → `renderHome()`: `orgCards` builder deleted; `#communities` section changed from a 12-card
    grid to a single `.map-promo` CTA routing to `#/community`.
- `app-community.js`
  → `renderCommunityHub()`: comment-only correction (no behavior change).

## Files Explicitly Not Touched

`app-data.js` (`organizations` — single data source, unchanged), `getCommunityNoteCount()`
(unchanged, still used by the Hub), `app-wall.js` (Sticky Wall / Global / College General /
Jurusan / Question / Comments / Solved / Unanswered / Permissions), `style-core.css`/
`style-wall.css` (no new CSS rules), i18n locale files (no new keys), `renderCollegeLanding()`,
router table (`getRoute()`/`render()` — no route added/removed/retargeted), `app-admin.js`,
`echomap.js`, `app-campus-*.js`, `services/*`.

## Data / Schema Changes

None.

## Routes Changed

None. `#/community`, `#/community/all`, `#/community/:orgId`, `#/community/:orgId/general`,
`#/community/:orgId/jurusan/:majorId`, legacy `#/org/:orgId` redirect — all byte-identical to
before this stage.

## Testing

No browser-automation tool is available in this environment (same constraint as POLISH-001;
installing one would violate this repo's "no package manager" rule in `CLAUDE.md`). Verification
was done the same way as POLISH-001 — real Node `vm` execution of the actual, unmodified
`app-data.js`/`app-router.js`/`app-community.js` source, calling the real render functions and
asserting on the real rendered HTML string. Scripts kept in the session scratchpad (not part of
the repo): `test-render-home-002.js`, `test-render-hub.js` (rerun), `test-render-landing.js`
(rerun).

- `node --check` on `app-router.js`, `app-community.js`, `app-admin.js`, `app-place.js`,
  `app-wall.js`, `echomap.js`: **Verified**, all pass.
- **Homepage full College Grid**: **Removed** — 11/11 checks pass via direct call: zero
  `.org-card` elements, zero `.org-grid`, no individual college name/route rendered, single
  `.map-promo` CTA present with `id="communities"`.
- **Homepage Community entry**: **Verified** — CTA button is `onclick="navigate('#/community')"`
  (not a specific college, not legacy `#/org/:id`), text is the existing `community.enter` key
  ("Enter community"), eyebrow/title/desc use existing `community.hub.*` keys, no hardcoded
  English. Hero's pre-existing "Explore" button (`scrollIntoView('#communities')`) still targets
  the CTA section and needed no change.
- **Community Hub — All KM Students**: **Verified** — Global card unchanged, routes to
  `#/community/all`.
- **Community Hub — All Colleges**: **Verified** — all 12 colleges (KMK, KMKK, KMPP, KMPK, KMP,
  KMM, KMNS, KML, KMJ, KMPH, KMS, KMKT) present as `.selection-item` rows in one
  `.selection-list`, real `getCommunityNoteCount()` values shown (not hardcoded), no duplicate
  large grid re-added.
- **College canonical route**: **Verified** — both the Hub's college rows and (previously) the
  Homepage always used `#/community/:orgId`; confirmed the Hub still does after this stage's
  comment-only edit; confirmed the Homepage no longer emits any per-college route at all (nothing
  to check there now — there is no college link on the Homepage by design).
- **College Landing (`#/community/1`)**: **Verified** — re-ran the same 4-check direct-call test
  as POLISH-001: KMK name renders, "General Community" routes to `#/community/1/general`,
  "Jurusan Channels" heading present, at least one Jurusan item routes to
  `#/community/1/jurusan/:majorId`. Unaffected by this stage, as expected (file not touched
  beyond the unrelated comment fix).
- **`#/community/all`, `#/community/1/general`, `#/community/1/jurusan/1`, Question/Comments/
  Solved/Unanswered**: **Not independently re-run this stage** — no file in any of those render
  paths (`app-wall.js`) was touched by this stage; POLISH-001's and COM-V2-008's prior
  verification of these surfaces stands unaffected.
- **Desktop / Mobile / Light / Dark / EN·BM·ZH visual rendering**: **Not verified** — no browser
  available in this environment. Risk assessed low: the new CTA reuses `.map-promo` verbatim
  (already has a mobile `flex-direction:column` rule and a Dark-theme override in
  `style-core.css`, already exercised on the same Homepage for the Echo Map promo), and the
  change reduces Homepage information density (removes 12 cards) rather than adding new layout
  surface, which working against overflow risk, not toward it.
- **Home / Echo Map / Building Wall / Admin smoke test**: **Not re-run this stage** — no file in
  any of those paths was touched.

## Remaining Issues

- No real-browser visual confirmation (environment limitation, same as POLISH-001).
- `home.chooseSpace`, `home.communitiesDesc`, `community.kicker`, `I18n.t("community.desc")` (as
  used by the old card `.org-card-desc`) are now unused on the Homepage (only the removed
  `orgCards` block referenced them). Left in place, harmless — not deleted, consistent with how
  `community.hub.collegeKicker` was left after POLISH-001. `org.comingSoon` remains in active use
  elsewhere (College Landing's coming-soon state) and was not touched.

## Next Step

None planned. Stopping here per the request's own instruction not to continue into other
Community UI work.
