# PRE_STATE — COMMUNITY-MAP-NAV-POLISH-001

Date: 2026-08-22

The working tree already contained extensive uncommitted work from prior sessions (Study Notes V2,
Community V2, campus map framework, etc.) before this task started. `git show HEAD:<file>` is a
much older baseline (2026-08-01) that predates all of that work, so it is **not** a valid "before"
snapshot for this task's hunks — restoring whole files from HEAD would destroy unrelated
legitimate work. The exact pre-edit content of every hunk this task touched is recorded below
instead (verbatim, read directly from the working tree immediately before editing).

## app-community.js — `renderCollegeLanding()`

```html
        ${typeof renderOrgHeaderActions === "function" ? renderOrgHeaderActions(org.id) : ""}
      </header>
      <div class="enter-wall-box">
        <div><span class="enter-wall-icon">📣</span><h3>${I18n.t("community.landing.generalTitle")}</h3><p>${I18n.t("community.landing.generalDesc")}</p></div>
        <button class="btn btn-primary btn-lg btn-round" onclick="navigate('#/community/${orgId}/general')">${I18n.t("community.hub.enter")} →</button>
      </div>
      <section class="selection-shell" style="margin-top:24px">
```

## app-router.js — `getRoute()` end / helper insertion point

Before this task, immediately after `getRoute()`'s closing `}` came:

```js
  return { page: "home" };
}

let pendingRouteScrollReset = false;
```

(No `setPlaceReturnSource`/`getPlaceReturnSource` functions existed anywhere in the file.)

## app-router.js — Homepage building-home-grid card

```js
<button class="building-home-card reveal-card" data-reveal style="--reveal-delay:${index*55}ms" onclick="navigate('#/place/${encodeURIComponent(building.id)}')">
```

## app-place.js — `renderPlaceDirectory()` card

```js
return `<button class="place-card reveal-card" data-reveal style="--reveal-delay:${Math.min(index * 35, 420)}ms" onclick="navigate('#/place/${encodeURIComponent(building.id)}')">
```

## app-place.js — `renderPlaceProfile()`

Back button was always:

```html
<button class="page-back" onclick="navigate('#/places')">← ${I18n.t("place.back")}</button>
```

with no `cameFromMap`/`backAction`/`backLabel` variables defined beforehand.

## echomap.js — "More Details" click handler

```js
const moreDetailsButton = placePreview.querySelector("#place-preview-more");
if (moreDetailsButton) {
  moreDetailsButton.addEventListener("click", () => {
    location.href = "index.html#/place/" + encodeURIComponent(building.id);
  });
}
```

## echomap.js — `switchToCollegeIndex()`

```js
function switchToCollegeIndex(nextIndex) {
  const total = organizations.length;
  activeOrgIndex = ((nextIndex % total) + total) % total;
  const org = organizations[activeOrgIndex];
  const isKmk = org.id === KMK_ORG_ID;

  selectedBuildingId = "";
  selectedFootprintId = "";
  clearBuildingFootprintSelection();
  if (previewedPlaceId) closePlacePreview({ restoreFocus:false });

  if (isKmk) {
    if (!map.hasLayer(buildingLayer)) buildingLayer.addTo(map);
    if (buildingSearch) buildingSearch.disabled = false;
    if (buildingEmpty) buildingEmpty.hidden = true;
    if (collegeFrameworkNotice) collegeFrameworkNotice.hidden = true;
    buildingList.hidden = false;
    buildingSearch.parentElement.hidden = false;
    renderBuildingList();
  } else {
    if (map.hasLayer(buildingLayer)) map.removeLayer(buildingLayer);
    buildingList.innerHTML = "";
    buildingList.hidden = true;
    if (buildingSearch) {
      buildingSearch.value = "";
      buildingSearch.disabled = true;
      buildingSearch.parentElement.hidden = true;
    }
    if (buildingEmpty) buildingEmpty.hidden = true;
    if (collegeFrameworkNotice) collegeFrameworkNotice.hidden = false;
  }

  applyActiveCollegeChrome();
  fitActiveCollegeView({ animate:true });
}
```

This is the buggy non-KMK branch: it only toggled a static one-line `<p>` notice
(`#map-college-framework-notice`) while the heading right above it
(`<h2 id="map-side-title">`, static HTML, never updated by this function) always said
"Focus buildings" — producing the reported mismatched/empty sidebar for every non-KMK switch.

**Superseded intermediate state (not a rollback target)**: between the state above and the
corrected fix, a same-day intermediate version replaced the entire `else` branch with
`if (targetOrg.id !== KMK_ORG_ID) { location.href = "index.html#/org/${targetOrg.id}/map"; return; }`
— a full-page redirect. That version was itself judged wrong (it broke in-place switcher use) and
was replaced before the corrected version shipped; it is recorded here only so a future session
doesn't mistake it for either the original bug or the fix.

## map.html — pre-fix state (added to this checkpoint retroactively; these hunks were touched by
## the same-day corrected fix, not the original 8-item scope, but are part of this task's final
## diff)

Script tags: `data/campus-building-registry.js` and `app-campus-map.js` were **not** loaded on
`map.html` at all before this task (`map.html` only loaded its own KMK-specific scripts plus
`data/campus-map-config.js`; it never loaded the non-KMK campus-map renderer or building registry).

`.map-side-header` div had no `id` attribute.

Inside `#map-guide`, after `#building-selection`, the sidebar's non-KMK content was exactly the one
static notice element:

```html
<p id="map-college-framework-notice" class="building-empty" data-i18n="campusMap.frameworkDesc" hidden>Campus structure is ready. Verified building information will be added progressively.</p>
```

No `#campus-framework-guide` container existed.

## app-campus-map.js — pre-fix state (same-day corrected fix, not original 8-item scope)

`renderCampusGuideFrameworkModules(orgId)` took no `hrefPrefix` parameter; its two actionable
module cards' `onclick` were plain `navigate('#/org/${orgId}/buildings')` and
`navigate('#/org/${orgId}')` with no `goTo()` helper.

`renderCampusGuideBody(orgId, buildings)` took no `hrefPrefix` parameter and called
`renderCampusGuideFrameworkModules(orgId)` with one argument.

No `renderCampusFrameworkGuideContent()` function existed. `renderOrgCampusMap()` built its own
inline header (`hasBuildings`/`guideHeaderExtra` computed directly inside that function) and called
`renderCampusGuideBody(orgId, buildings)` directly, rather than delegating to a shared helper.

## index.html

```html
<a href="map.html" class="btn btn-outline btn-sm btn-round" data-i18n="nav.map">Echo Map KMK</a>
```

## i18n/locales/en.js (ms.js / zh.js had the equivalent localized strings)

```js
"nav.map": "Echo Map KMK",
...
"home.openMap": "Open KMK Echo Map",
...
'home.mapTitle': 'Connect voices to real places at KMK',
...
'assistant.mapReply': 'Open the KMK Echo Map to explore building locations and their dedicated walls.',
...
"place.back": "Back to buildings",
"place.enterWall": "Enter this building wall",
```

(No `place.backToMap` key existed.)
