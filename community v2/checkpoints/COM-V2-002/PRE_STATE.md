# COM-V2-002 — Pre-checkpoint state

Captured before implementing Community Router + Hub.

## Baseline confirmed present (COM-V2-001)

- `data/community-config.js`, `services/community-service.js` present and loaded in `index.html` right after `app-data.js`.
- `app-data.js normalizeStoredNote()` backfills V3 fields for community notes (`schemaVersion:3`, `communityKey`, `communityScope`, `postType`, `questionStatus`, `moderationStatus`, `commentCount`, `updatedAt`); building notes untouched (`schemaVersion:2`).
- `CommunityService.getCommunityPosts('jurusan:1:1').length === 81` and matches the live KMK→Sains wall's direct `orgId`/`majorId` filter — confirmed by re-running the same JS check used in the COM-V2-001 report before starting this stage.
- No `community v2/reports/`, `community v2/checkpoints/COM-V2-002/` existed before this stage (created fresh this stage).

## Routes before this stage (app-router.js `getRoute()`)

```
#/                              -> home
#/admin                         -> admin
#/places                        -> places
#/place/:placeId                -> place
#/place/:placeId/wall           -> place-wall
#/org/:orgId/building/:buildingId -> org-building
#/org/:orgId/buildings          -> org-buildings
#/org/:orgId/map                -> org-map
#/org/:orgId                    -> org (renderOrgDetails: major picker + Enter Wall)
#/wall/:orgId/:batchId/:majorId -> wall, legacy:true (replaceRoute to #/wall/:orgId/:majorId)
#/wall/:orgId/:majorId          -> wall (current canonical)
```

`renderHome()`'s college cards linked to `#/org/${org.id}`.

## Files this stage is expected to touch

- `app-router.js` (route parsing, legacy redirects, page-title map, render() dispatch, home org-card link)
- `app-community.js` (new file — Hub, College Landing, Global/College-General shells)
- `i18n/locales/{en,ms,zh}.js` (new `community.hub.*` / `community.landing.*` / `community.shell.*` keys)
- `index.html` (one new `<script src="app-community.js">` tag)

Not expected to touch: `app-wall.js`, `app-data.js`, `app-admin.js`, `app-place.js`, `echomap.js`, `app-campus-map.js`, `app-campus-buildings.js`, any CSS file, any building/map data file.
