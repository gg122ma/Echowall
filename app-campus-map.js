/**
 * Shared campus map + campus guide shell for non-KMK colleges.
 * One Leaflet init routine and one two-column layout, driven by data/campus-map-config.js and
 * data/campus-building-registry.js, reused across every configured community instead of
 * duplicating per-college map code. KMK keeps its own separate, fully built Echo Map
 * (map.html + echomap.js) and is not touched or represented here.
 *
 * The right-hand Campus Guide automatically switches between two modes based on data, not on
 * hardcoded college names:
 *   - buildings.length === 0  -> Framework Preview: system-module cards (Building Registry,
 *     Place Knowledge, Place Wall, Community), no fabricated building names.
 *   - buildings.length  > 0   -> Focus buildings: a real, searchable building list, matching the
 *     shape of KMK's own guide. Adding real entries to the registry is enough to switch a
 *     college into this mode; no page rewrite is required.
 */
let activeCampusMapInstance = null;

function teardownCampusMap() {
  if (!activeCampusMapInstance) return;
  activeCampusMapInstance.remove();
  activeCampusMapInstance = null;
}

function initializeCampusMapPage(orgId) {
  const mapContainer = document.getElementById("campus-map");
  const config = window.getCampusMapConfig?.(orgId);
  teardownCampusMap();
  if (!mapContainer || !config) return;

  const map = L.map(mapContainer, { zoomControl: false }).setView([config.lat, config.lng], config.zoom);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 20,
  }).addTo(map);
  activeCampusMapInstance = map;
}

function resetCampusMapView(orgId) {
  const config = window.getCampusMapConfig?.(orgId);
  if (!config || !activeCampusMapInstance) return;
  activeCampusMapInstance.flyTo([config.lat, config.lng], config.zoom, { duration: .6 });
}

function selectCampusGuideBuilding(orgId, buildingId) {
  const building = typeof getCampusBuildingByOrgAndId === "function" ? getCampusBuildingByOrgAndId(orgId, buildingId) : null;
  if (!building) return;
  document.querySelectorAll(".campus-guide-building-card").forEach(card => {
    card.classList.toggle("is-selected", card.dataset.buildingId === buildingId);
  });
  const lat = Number(building.coordinates?.lat);
  const lng = Number(building.coordinates?.lng);
  if (activeCampusMapInstance && Number.isFinite(lat) && Number.isFinite(lng)) {
    activeCampusMapInstance.flyTo([lat, lng], Math.max(activeCampusMapInstance.getZoom(), 18), { duration: .6 });
  }
}

function renderCampusGuideBuildingCards(orgId, buildings) {
  if (!buildings.length) {
    return `<p class="campus-guide-building-empty">${I18n.t("map.buildingSearchEmpty")}</p>`;
  }
  return `<div class="campus-guide-building-list">${buildings.map(building => {
    const safeId = escapeHtml(building.buildingId);
    const safeName = escapeHtml(building.name);
    return `
    <div class="campus-guide-building-card" data-building-id="${safeId}">
      <button type="button" class="campus-guide-building-select" onclick="selectCampusGuideBuilding(${orgId}, '${safeId}')">
        <span aria-hidden="true">🏢</span>
        <span><strong>${safeName}</strong>${building.category ? `<small>${escapeHtml(building.category)}</small>` : ""}</span>
      </button>
      <button type="button" class="campus-guide-building-enter" aria-label="${escapeHtml(I18n.t("campusMap.viewBuildingDetail"))}: ${safeName}" onclick="navigate('#/org/${orgId}/building/${encodeURIComponent(building.buildingId)}')">→</button>
    </div>`;
  }).join("")}</div>`;
}

function filterCampusGuideBuildings(orgId, query) {
  const resultsContainer = document.getElementById("campus-guide-building-results");
  if (!resultsContainer) return;
  const allBuildings = typeof getCampusBuildingRegistry === "function" ? getCampusBuildingRegistry(orgId) : [];
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
  const matches = allBuildings.filter(building => building.name.toLocaleLowerCase().includes(normalizedQuery));
  resultsContainer.innerHTML = renderCampusGuideBuildingCards(orgId, matches);
}

// COMMUNITY-MAP-NAV-POLISH-001 (bugfix): hrefPrefix is the ONLY thing that
// differs between this function's two callers. renderOrgCampusMap() below
// runs inside the index.html SPA, where the existing in-page navigate()
// (same document, just changes location.hash) is correct. The Echo Map
// campus switcher (echomap.js, a different document -- map.html) calls
// this too, but navigate('#/...') there would silently rewrite map.html's
// own hash with nothing listening for it. Passing hrefPrefix="index.html"
// makes the two actionable cards do a real cross-document
// `location.href='index.html#/...'` instead -- the labels, statuses and
// icons are identical either way; only the click action's target changes.
function renderCampusGuideFrameworkModules(orgId, hrefPrefix = "") {
  const goTo = path => (hrefPrefix ? `location.href='${hrefPrefix}${path}'` : `navigate('${path}')`);
  return `<div class="campus-module-list">
    <button type="button" class="campus-module-card" onclick="${goTo(`#/org/${orgId}/buildings`)}">
      <span class="campus-module-icon" aria-hidden="true">🏛️</span>
      <span class="campus-module-body">
        <strong>${I18n.t("campusMap.moduleBuildingRegistryTitle")}</strong>
        <small>${I18n.t("campusMap.moduleBuildingRegistryDesc")}</small>
        <span class="campus-module-status">${I18n.t("campusMap.statusAwaitingData")}</span>
      </span>
    </button>
    <button type="button" class="campus-module-card" disabled>
      <span class="campus-module-icon" aria-hidden="true">📖</span>
      <span class="campus-module-body">
        <strong>${I18n.t("building.knowledgeTitle")}</strong>
        <small>${I18n.t("campusMap.modulePlaceKnowledgeDesc")}</small>
        <span class="campus-module-status">${I18n.t("campusMap.statusFrameworkReady")}</span>
      </span>
    </button>
    <button type="button" class="campus-module-card" disabled>
      <span class="campus-module-icon" aria-hidden="true">💬</span>
      <span class="campus-module-body">
        <strong>${I18n.t("building.wallTitle")}</strong>
        <small>${I18n.t("campusMap.modulePlaceWallDesc")}</small>
        <span class="campus-module-status">${I18n.t("campusMap.statusAvailableAfterVerification")}</span>
      </span>
    </button>
    <button type="button" class="campus-module-card campus-module-card-available" onclick="${goTo(`#/org/${orgId}`)}">
      <span class="campus-module-icon" aria-hidden="true">🎓</span>
      <span class="campus-module-body">
        <strong>${I18n.t("campusMap.community")}</strong>
        <small>${I18n.t("campusMap.moduleCommunityDesc")}</small>
        <span class="campus-module-status">${I18n.t("campusMap.statusAvailable")}</span>
      </span>
    </button>
  </div>`;
}

function renderCampusGuideBody(orgId, buildings, hrefPrefix = "") {
  if (buildings.length) {
    return `
      <label class="campus-guide-search" for="campus-guide-search-input">
        <span>${I18n.t("map.buildingSearchLabel")}</span>
        <input id="campus-guide-search-input" type="search" autocomplete="off" placeholder="${escapeHtml(I18n.t("map.buildingSearchPlaceholder"))}" oninput="filterCampusGuideBuildings(${orgId}, this.value)" />
      </label>
      <div id="campus-guide-building-results">${renderCampusGuideBuildingCards(orgId, buildings)}</div>`;
  }
  return `
    <label class="campus-guide-search" for="campus-guide-search-input">
      <span>${I18n.t("map.buildingSearchLabel")}</span>
      <input id="campus-guide-search-input" type="search" autocomplete="off" disabled placeholder="${escapeHtml(I18n.t("campusMap.searchDisabled"))}" />
    </label>
    ${renderCampusGuideFrameworkModules(orgId, hrefPrefix)}`;
}

// COMMUNITY-MAP-NAV-POLISH-001 (bugfix): the single source of truth for
// "what a non-KMK campus's Campus Guide sidebar contains" -- header
// (eyebrow/title/Framework Preview badge/description) plus body (search +
// either real building cards or the Framework module cards). Used by
// renderOrgCampusMap() below (Community -> Map, hrefPrefix "") and by the
// Echo Map campus switcher in echomap.js (map.html, hrefPrefix
// "index.html") so both entry points render byte-identical content instead
// of map.html maintaining a second, separately-worded copy.
function renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix = "") {
  const hasBuildings = buildings.length > 0;
  const guideHeaderExtra = hasBuildings
    ? ""
    : `<span class="framework-preview-badge">${I18n.t("campusMap.frameworkPreview")}</span><p class="campus-guide-desc">${I18n.t("campusMap.frameworkDesc")}</p>`;
  return `
    <div class="campus-guide-header">
      <p class="eyebrow">${I18n.t("map.guide")}</p>
      <h2>${hasBuildings ? I18n.t("map.buildingListTitle") : I18n.t("campusMap.frameworkTitle")}</h2>
      ${guideHeaderExtra}
    </div>
    <div class="campus-guide-body">
      ${renderCampusGuideBody(orgId, buildings, hrefPrefix)}
    </div>`;
}

function renderOrgCampusMap(container, orgId) {
  const org = organizations.find(item => item.id === orgId);
  const config = org ? window.getCampusMapConfig?.(orgId) : null;

  if (!org || !config) {
    container.innerHTML = `
      <section class="container error-page page-reveal">
        <div class="error-illustration">🗺️</div>
        <p class="eyebrow">${I18n.t("campusMap.eyebrow")}</p>
        <h1>${I18n.t("campusMap.unavailable")}</h1>
        <p>${I18n.t("campusMap.unavailableDesc")}</p>
        <button class="btn btn-primary" onclick="navigate('${org ? `#/org/${orgId}` : "#/"}')">${I18n.t("org.back")}</button>
      </section>`;
    return;
  }

  const safeName = escapeHtml(org.name);
  document.title = `Echo Map ${org.name} — Echo Wall`;
  const buildings = typeof getCampusBuildingRegistry === "function" ? getCampusBuildingRegistry(orgId) : [];

  container.innerHTML = `
    <div class="container campus-map-page page-reveal">
      <button class="page-back" onclick="navigate('#/org/${orgId}')">← ${I18n.t("org.back")}</button>
      <header class="campus-map-hero">
        <div>
          <p class="eyebrow">${I18n.t("campusMap.eyebrow")}</p>
          <h1>${I18n.t("campusMap.title", { name: safeName })}</h1>
        </div>
      </header>
      <section class="campus-map-layout">
        <div class="campus-map-frame">
          <div id="campus-map" aria-label="${safeName} campus map"></div>
          <div class="campus-map-floating-controls">
            <button type="button" class="campus-map-control-btn" onclick="resetCampusMapView(${orgId})">${I18n.t("map.fit")}</button>
            <button type="button" class="campus-map-control-btn" onclick="navigate('#/org/${orgId}')">${I18n.t("campusMap.community")}</button>
          </div>
        </div>
        <aside class="campus-guide" aria-label="${I18n.t("map.guide")}">
          ${renderCampusFrameworkGuideContent(orgId, buildings)}
        </aside>
      </section>
    </div>`;
}
