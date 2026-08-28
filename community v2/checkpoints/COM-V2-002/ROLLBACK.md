# COM-V2-002 — Rollback instructions

## What this stage modified

- `app-router.js`:
  - `getRoute()`: added Community V2 canonical route parsing (`#/community`, `#/community/all`, `#/community/:orgId`, `#/community/:orgId/general`, `#/community/:orgId/jurusan/:majorId`), and changed the bare `#/org/:orgId` and `#/wall/:orgId/:majorId` (3-part and 4-part) checks to return `legacy:true` targeting the new canonical routes instead of the old `org`/`wall` pages.
  - `render()`: added two legacy-redirect branches (`community-college` legacy → `replaceRoute('#/community/{orgId}')`; the existing `wall` legacy branch now redirects to `#/community/{orgId}/jurusan/{majorId}` instead of `#/wall/{orgId}/{majorId}`), and added dispatch for the four new page types (`community-hub`, `community-college`, `community-global`, `community-college-general`).
  - `setRouteDocumentState()`: added 4 new entries to the `titles` map.
  - `renderHome()`: org card `onclick` changed from `navigate('#/org/${org.id}')` to `navigate('#/community/${org.id}')`.
- New file `app-community.js` (`renderCommunityHub`, `renderCollegeLanding`, `renderCommunityGlobalShell`, `renderCommunityCollegeGeneralShell`, `renderCommunityNotFound`, `renderCommunityShell`).
- `index.html`: one new `<script src="app-community.js">` tag, right after `app-router.js`.
- `i18n/locales/{en,ms,zh}.js`: added `community.hub.*` / `community.landing.*` / `community.shell.*` keys (14 keys × 3 locales), inserted right after the existing `org.enter` key.

## How to roll back only this stage

1. Delete `app-community.js`.
2. In `index.html`, remove the `<script src="app-community.js"></script>` line.
3. In `app-router.js`:
   - Revert `getRoute()` to the COM-V2-001-era version: remove the 6 new `community`-prefixed `if` blocks; change the `org` bare-route check back to `if (parts[0] === "org" && parts[1]) return { page: "org", orgId: toId(parts[1]) };` (no `legacy`); change the 3-part `wall` check back to `return { page: "wall", orgId: toId(parts[1]), majorId: toId(parts[2]) };` (no `legacy`); change the 4-part `wall` legacy target back to the 3-part `#/wall/:orgId/:majorId` (see COM-V2-001-era `replaceRoute` target).
   - In `render()`: remove the `community-college` legacy branch; revert the `wall` legacy branch's `replaceRoute` target back to `` `#/wall/${route.orgId}/${route.majorId}` ``; remove the 4 new dispatch lines (`community-hub`/`community-college`/`community-global`/`community-college-general`).
   - Revert the 4 new entries in `setRouteDocumentState()`'s `titles` map.
   - Revert `renderHome()`'s org card `onclick` back to `navigate('#/org/${org.id}')`.
4. In `i18n/locales/{en,ms,zh}.js`: remove the 14 `community.hub.*`/`community.landing.*`/`community.shell.*` keys added after `org.enter`.

## Files this rollback must NOT touch

- `data/community-config.js`, `services/community-service.js`, `app-data.js` (COM-V2-001 — independent, do not revert unless COM-V2-001 itself is being rolled back).
- `app-wall.js`, `app-admin.js`, `app-place.js`, `echomap.js`, `app-campus-map.js`, `app-campus-buildings.js` — none were touched this stage.

## Depends on

- COM-V2-001's `data/community-config.js` / `services/community-service.js` are NOT used by this stage's code (no `CommunityService` calls in `app-router.js`/`app-community.js` — this stage only adds routes/navigation, not data queries). This stage is rollback-independent from COM-V2-001.
