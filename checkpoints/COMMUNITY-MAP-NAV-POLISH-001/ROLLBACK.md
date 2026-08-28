# ROLLBACK — COMMUNITY-MAP-NAV-POLISH-001

Do not restore whole files (the working tree carries substantial unrelated uncommitted work in
every touched file). Reverse only the specific hunks below, matching `PRE_STATE.md`.

1. **app-community.js** — in `renderCollegeLanding()`, re-insert the removed `.enter-wall-box`
   "General Community" card between the closing `</header>` and the Jurusan `<section
   class="selection-shell" ...>` (exact markup in `PRE_STATE.md`).

2. **app-router.js**:
   - Remove the `setPlaceReturnSource`/`getPlaceReturnSource` functions and the
     `PLACE_RETURN_SOURCE_KEY`/`PLACE_RETURN_SOURCE_TTL_MS` constants inserted right after
     `getRoute()`'s closing brace (marked with a `COMMUNITY-MAP-NAV-POLISH-001` comment).
   - In the Homepage `building-home-grid` card, remove the
     `setPlaceReturnSource('places','${escapeHtml(building.id)}');` prefix from the `onclick`,
     restoring the plain `navigate('#/place/...')` call.

3. **app-place.js**:
   - In `renderPlaceDirectory()`'s card, remove the `setPlaceReturnSource('places','...')`
     prefix from the `onclick`, restoring the plain `navigate('#/place/...')` call.
   - In `renderPlaceProfile()`, remove the `cameFromMap`/`backAction`/`backLabel` block and
     restore the back button to the literal
     `<button class="page-back" onclick="navigate('#/places')">← ${I18n.t("place.back")}</button>`.

4. **echomap.js**:
   - In the `#place-preview-more` click handler, remove the `setPlaceReturnSource("map", ...)`
     and `saveMapReturnSnapshot(building.id);` lines, restoring the handler to just
     `location.href = "index.html#/place/" + encodeURIComponent(building.id);`.
   - Restore `switchToCollegeIndex()` to the `isKmk ? ... : ...` two-branch version recorded in
     `PRE_STATE.md`. **Note (superseded intermediate state)**: a same-day intermediate version of
     this function used `if (targetOrg.id !== KMK_ORG_ID) { location.href =
     "index.html#/org/${orgId}/map"; return; }` — a full-page redirect. That version was itself
     wrong (it broke in-place switcher use) and was replaced before this checkpoint's final `after/`
     snapshot was written; it never needs to be rolled back to and should not be reintroduced. The
     function currently in `after/echomap.js.post` is the corrected, in-place-switching version:
     it branches on `org.id === KMK_ORG_ID` and toggles `hidden` on `#map-side-header` /
     `#building-selection` / the Leaflet `buildingLayer` (KMK) vs. `#campus-framework-guide`
     (non-KMK, populated by the new `renderNonKmkCampusGuide()`), and never navigates.
   - Remove the new DOM-ref lines added for the corrected fix: `mapSideHeader`, `buildingSelection`,
     `campusFrameworkGuide` (`document.getElementById(...)`), and the `renderNonKmkCampusGuide()`
     function.
   - Restore the removed `const collegeFrameworkNotice = document.getElementById("map-college-framework-notice");`
     line (it read the `<p>` element restored by item 7 below).
   - In the `echo:languagechange` listener, remove the added
     `const activeOrg = organizations[activeOrgIndex]; if (activeOrg && activeOrg.id !== KMK_ORG_ID) renderNonKmkCampusGuide(activeOrg.id);`
     lines.

5. **index.html** — restore the navbar map link's fallback text to
   `<a href="map.html" class="btn btn-outline btn-sm btn-round" data-i18n="nav.map">Echo Map KMK</a>`.

6. **i18n/locales/{en,ms,zh}.js** — restore `nav.map`, `home.openMap`, `home.mapTitle`,
   `assistant.mapReply` to the strings recorded in `PRE_STATE.md`, and remove the added
   `place.backToMap` key from all three files.

7. **map.html** (added in the same-day corrected fix, not part of the original 8-item scope, but
   required for the in-place switcher and therefore part of this task's final state):
   - Remove the `<script src="data/campus-building-registry.js"></script>` and
     `<script src="app-campus-map.js"></script>` tags added near `data/campus-map-config.js` and
     after `app-router.js` respectively.
   - Remove `id="map-side-header"` from the `.map-side-header` div.
   - Remove the `<div id="campus-framework-guide" hidden></div>` container (added inside
     `#map-guide`, after `#building-selection`).
   - Restore the removed static notice:
     `<p id="map-college-framework-notice" class="building-empty" data-i18n="campusMap.frameworkDesc" hidden>Campus structure is ready. Verified building information will be added progressively.</p>`

8. **app-campus-map.js** (also added in the same-day corrected fix, not part of the original
   8-item scope):
   - Remove the `hrefPrefix` parameter from `renderCampusGuideFrameworkModules(orgId, hrefPrefix)`
     and its internal `goTo` helper; restore the two actionable module cards' `onclick` to plain
     `navigate('#/org/${orgId}/buildings')` / `navigate('#/org/${orgId}')`.
   - Remove the `hrefPrefix` parameter from `renderCampusGuideBody(orgId, buildings, hrefPrefix)`;
     restore its call to `renderCampusGuideFrameworkModules(orgId)` with no second argument.
   - Remove the `renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix = "")` function
     entirely.
   - In `renderOrgCampusMap()`, restore the inline `hasBuildings`/`guideHeaderExtra` header markup
     and the direct call to `renderCampusGuideBody(orgId, buildings)` that
     `renderCampusFrameworkGuideContent()` replaced (exact original inline markup is the same shape
     as what `renderCampusFrameworkGuideContent()` now produces — see that function's body in
     `after/app-campus-map.js.post` for the markup to inline back into `renderOrgCampusMap()`).

## Explicitly not part of this rollback

- `#/community/:orgId/general` route and `renderCommunityCollegeGeneralWall` — untouched, only the
  College Landing page's entry card to it was removed.
- `data/campus-map-config.js`, `data/campus-building-registry.js` and every other non-KMK data
  file — untouched; no building data was added, changed, or fabricated by this task at any point.
- Study Notes V2, Upload/Moderation, Community Sticky Wall, pointer glow, Jurusan Wall, building
  photos/content, campus coordinates, Auth, Admin — none of these files were touched by this task.

## Safety

No `git reset --hard` or `git clean -fd` was used or is required. All changes are plain
text-editor edits to the working tree; nothing was committed.
