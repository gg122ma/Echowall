# REPORT_COMMUNITY-V2-POLISH-001

**Task ID:** COMMUNITY-V2-POLISH-001 — Homepage Communities / Kolej Grid placement fix
**Status:** PASS
**Start State:** Community V2 (COM-V2-002..008) complete. This task supersedes the prior
"remove Communities from Homepage" instruction — the newest instruction says the screenshot
Kolej-card section must stay on the Homepage.
**Checkpoint Path:** `community v2/checkpoints/COMMUNITY-V2-POLISH-001/`

## Pre-change investigation (request section 14)

1. **Homepage Communities renderer**: `renderHome()` in `app-router.js` (line 285). Its
   `#communities` section (lines 348-354) already IS the screenshot UI — `CHOOSE A SPACE` /
   `Communities` / description / full `.org-card` grid built from `organizations`. This was
   already correct and did not need to be created or moved — it had never actually been removed.
2. **Community Hub duplicate grid**: Confirmed present. `renderCommunityHub()` in
   `app-community.js` rendered a second, near-identical full-size `.org-card` grid for the same
   12 colleges, in addition to its `All KM Students` global card.
3. **Shared data source**: Confirmed — both use the same `organizations` array (`app-data.js`)
   and the same `getCommunityNoteCount()` helper. No parallel/hardcoded data.
4. **Homepage College Card route**: Already canonical (`#/community/:orgId`), not `#/org/:orgId`.
5. See `PRE_STATE.md` for the full pre-change plan.

## Completed

- Removed the duplicate full-size Kolej card grid from the Community Hub (`#/community`) only.
- Homepage's `#communities` section (the screenshot UI) was left byte-for-byte untouched.
- Hub's college navigation is now a compact `.selection-list`/`.selection-item` list (the same
  compact-list component `renderCollegeLanding()`'s Jurusan list already uses), reading the same
  `organizations` data and `getCommunityNoteCount()` helper, routing to the same canonical
  `#/community/:orgId`. This satisfies "keep college navigation in the Hub, but don't duplicate
  the large Homepage grid."
- Hub's `All KM Students` global card (`#/community/all` entry) was not touched.

## Modified Files

- `app-community.js`
  → `renderCommunityHub()`: replaced the `collegeCards` (`.org-card`/`.org-grid`) block with a
    `collegeItems` (`.selection-item`/`.selection-list`) block. No other function in this file
    changed. No new CSS or i18n keys added — reused `map.visibleNotes` (already used identically
    in `app-place.js`/`echomap.js`) and existing `community.hub.*`/`org.noMajors` keys.

## Files Explicitly Not Touched

`app-router.js` (Homepage grid, router table, canonical routes), `app-wall.js` (Sticky Wall,
Global/College General/Jurusan), `app-data.js`, `style-core.css`/`style-wall.css`, i18n locale
files, `app-admin.js`, `echomap.js`, `app-campus-*.js`, `services/*`, auth.

## Data / Schema Changes

None.

## Routes Changed

None. `#/community` (Hub), `#/community/all` (Global), `#/community/:orgId` (College Landing),
`#/community/:orgId/general`, `#/community/:orgId/jurusan/:majorId` — all unchanged. Legacy
`#/org/:orgId` → `#/community/:orgId` redirect unchanged.

## UI Changed

Only the Community Hub's college-list section shrank from large cards to a compact row list.
Homepage visual design (icon, note count, description, "Enter community", hover, grid layout,
Light/Dark styling) is unchanged per the request.

## Testing

No browser-automation tool (Playwright/Puppeteer/Chrome) is available in this environment, and
installing one would add a package manager/dependency to a project whose `CLAUDE.md` explicitly
forbids that. In place of that, real logic-level verification was done by loading the actual,
unmodified source files (`app-data.js`, `app-router.js`, `app-community.js`) into a Node `vm`
context (stubbing only `window`/`document`/`I18n.t`/`escapeHtml`) and calling the real render
functions directly — the same "direct function call" verification method this project's own
`HANDOFF.md` already used for permission-matrix testing in COM-V2-006/007. Scripts kept at
`/private/tmp/.../scratchpad/test-render-{home,hub,landing}.js` (session scratchpad, not part of
the repo).

- `node --check` on `app-community.js`, `app-router.js`, `app-wall.js`, `app-admin.js`,
  `app-place.js`, `echomap.js`: **Verified**, all pass.
- **Homepage `renderHome()` #communities section** (11 checks via direct call): full `.org-card`
  grid preserved, one card per college (12/12), `CHOOSE A SPACE`/`Communities` heading present,
  every card routes to canonical `#/community/:orgId`, "Enter community" link present per card,
  KMK/KMKK/KMKT spot-checked present. **Verified** (all pass).
- **Community Hub `renderCommunityHub()`** (11 checks via direct call): exactly one `.org-grid`
  (Global card only) and one `.org-card` total; college list is now exactly one
  `.selection-list` with 12 `.selection-item` rows; every row routes to canonical
  `#/community/:orgId`; Global card still present and routes to `#/community/all`; note counts
  render via the real `getCommunityNoteCount()` (not hardcoded); KMK/KMKK/KMKT spot-checked
  present. **Verified** (all pass).
- **College Landing `renderCollegeLanding(container, 1)` — `#/community/1`** (4 checks via direct
  call): KMK name renders, "General Community" entry routes to `#/community/1/general`, "Jurusan
  Channels" heading present, at least one Jurusan item routes to `#/community/1/jurusan/:majorId`.
  **Verified** (all pass) — confirms College Landing was not affected.
- **i18n key coverage**: `map.visibleNotes`, `community.hub.collegesTitle`, `org.noMajors` all
  present in `en.js`/`ms.js`/`zh.js` — **Verified** by grep, no new keys needed.
- **Desktop / Mobile / Light / Dark real rendering**: **Not visually verified** — no browser
  available in this environment. Risk assessed as low: zero new CSS was added; the Hub now
  reuses `.selection-list`/`.selection-item`, the exact same component `renderCollegeLanding()`'s
  Jurusan list already uses on the same route family, which COM-V2-008's HANDOFF entry recorded
  as already passing a real 390×844 mobile pass and Dark theme pass with zero overflow. The
  Homepage grid itself received zero code changes.
- **`#/community/all` (Global/All KM Students)**: Not independently re-run this stage (no file in
  its render path — `renderCommunityGlobalWall` in `app-wall.js` — was touched); presence of its
  entry point was confirmed both in the Hub's global card and in the direct-call test above.
- **Regression smoke (Sticky Wall, Question/Comments/Solved, Echo Map, Admin, Building Wall)**:
  **Not re-run this stage** — no file in any of those paths was touched, and the change is
  scoped to one function's markup in `app-community.js` with no shared helper edits.

## Remaining Issues

- No real browser visual check was performed (environment limitation, not a known defect).
- `community.hub.collegeKicker` i18n key (en/ms/zh) is now unused (was only used by the removed
  card markup). Left in place — not asked to be removed, and an unused i18n key carries no risk.

## Next Step

None planned. Per the request and per `CLAUDE.md`'s scope-discipline rule, stopping here —
not starting any other Community V2 UI work without explicit instruction.
