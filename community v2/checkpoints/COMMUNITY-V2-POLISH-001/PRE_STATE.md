# PRE_STATE — COMMUNITY-V2-POLISH-001

Date: 2026-08-21

## Task

Latest product instruction supersedes the prior "remove Communities from Homepage" instruction.
New instruction: the screenshot section (`CHOOSE A SPACE` / `Communities` / full Kolej card grid)
must **stay on the main Homepage**. Only fix the duplicate full-size Kolej card grid that also
exists on the Community V2 Hub (`#/community`), without touching `All KM Students`, College
Landing, Sticky Wall, or any other module.

## Pre-change investigation findings (answers to section 14 of the request)

1. **Homepage Communities renderer**: `renderHome()` in `app-router.js` (function starts line 285).
   The `#communities` section (line 348-354) already renders the full screenshot UI — eyebrow
   `home.chooseSpace` ("CHOOSE A SPACE"), heading `home.communities` ("Communities"), description
   `home.communitiesDesc`, and an `.org-grid` of `.org-card` buttons built from `organizations.map(...)`
   (lines 292-306). Each card already shows: college emoji/icon, `getCommunityNoteCount(org.id)`,
   kicker, name, description, and an "Enter community →" link. This is untouched — it is exactly
   what the new instruction wants kept.

2. **Community Hub duplicate grid**: YES. `renderCommunityHub()` in `app-community.js` (lines 23-69,
   pre-change) renders two sections: a `globalCard` (All KM Students → `#/community/all`) and a
   second `collegeCards` section (lines 38-51) that is a **near-identical full-size `.org-card` grid**
   — same emoji, same `getCommunityNoteCount()`, same kicker/title/desc/enter-link markup, same
   `.org-grid` class, same route target (`#/community/${org.id}`) as the Homepage grid. This is the
   duplicate IA the new instruction wants eliminated.

3. **Shared data source**: Yes — both Homepage and Hub read the same `organizations` array
   (`app-data.js`) and the same `getCommunityNoteCount()` helper (`app-router.js`). No parallel
   data source exists. No hardcoded per-college logic (`if (college === "KMK")`) exists anywhere
   in either renderer.

4. **Homepage College Card route**: Already canonical — `onclick="navigate('#/community/${org.id}')"`
   (app-router.js line 293). Not `#/org/:orgId`. No change needed here.

5. **Plan — keep vs remove**:
   - Keep unchanged: Homepage `#communities` section in full (screenshot UI), all Homepage
     card markup/CSS classes/i18n keys/route.
   - Keep unchanged: Hub's `globalCard` section (`All KM Students`, `#/community/all`).
   - Keep unchanged: `renderCollegeLanding()`, all Sticky Wall renderers, all other modules.
   - Change: replace the Hub's duplicate full `.org-card` grid (`collegeCards`) with a compact
     `.selection-list` of `.selection-item` rows (the same compact-list component already used
     by `renderCollegeLanding()`'s Jurusan list and `renderOrgDetails()`'s major list in this same
     codebase) — same `organizations` data, same canonical route, same note count, just a smaller
     visual footprint so the Hub no longer duplicates the Homepage's large card grid.

## Files that will be touched

- `app-community.js` — `renderCommunityHub()` only.

## Files explicitly NOT touched

`app-router.js` (renderHome, renderCollegeLanding callers, router table), `app-wall.js`,
`app-data.js`, `style-core.css`, `style-wall.css`, `services/*`, `app-admin.js`, `echomap.js`,
`app-campus-*.js`, i18n locale files (existing keys reused, no new keys needed).

## Original `renderCommunityHub()` full source

Backed up verbatim at `app-community.js.pre` in this checkpoint directory.
