/**
 * Shared Phase 1 campus-map interaction engine for every non-KMK college.
 * KMK retains its production renderer; capability data still declares it as
 * the only campus allowed to expose submaps.
 */
const CAMPUS_MAP_STATE_KEY = "echowall_multicollege_map_state_v1";
const CAMPUS_DETAIL_RETURN_KEY = "echowall_campus_detail_return_v1";
const CAMPUS_MAP_STATE_TTL_MS = 30 * 60 * 1000;
let activeCampusMapInstance = null;
let activeCampusInteractionController = null;

function readSessionJson(key) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
}

function writeSessionJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function removeSessionValue(key) {
  try { sessionStorage.removeItem(key); } catch (error) { /* optional storage */ }
}

function getSavedCampusMapStates() {
  const stored = readSessionJson(CAMPUS_MAP_STATE_KEY);
  return stored && stored.version === 1 && stored.campuses && typeof stored.campuses === "object"
    ? stored
    : { version:1, campuses:{} };
}

function saveCampusMapState(controller) {
  if (!controller?.map) return false;
  const center = controller.map.getCenter();
  const states = getSavedCampusMapStates();
  states.campuses[String(controller.orgId)] = {
    updatedAt:Date.now(), center:{ lat:center.lat, lng:center.lng },
    zoom:controller.map.getZoom(), selectedBuildingId:controller.selectedBuildingId || "",
  };
  return writeSessionJson(CAMPUS_MAP_STATE_KEY, states);
}

function readCampusMapState(orgId) {
  const state = getSavedCampusMapStates().campuses[String(Number(orgId))];
  if (!state || Date.now() - Number(state.updatedAt) > CAMPUS_MAP_STATE_TTL_MS) return null;
  const lat = Number(state.center?.lat);
  const lng = Number(state.center?.lng);
  const zoom = Number(state.zoom);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) return null;
  const selectedBuildingId = String(state.selectedBuildingId || "");
  if (selectedBuildingId && !window.getCampusMapBuildings?.(orgId).some(item => item.buildingId === selectedBuildingId)) return null;
  return { center:{ lat, lng }, zoom, selectedBuildingId };
}

function setCampusBuildingReturnSource(orgId, buildingId, context = "spa") {
  writeSessionJson(CAMPUS_DETAIL_RETURN_KEY, {
    version:1, createdAt:Date.now(), orgId:Number(orgId), buildingId:String(buildingId || ""),
    context:context === "standalone" ? "standalone" : "spa",
  });
}

function getCampusBuildingReturnSource(orgId, buildingId) {
  const source = readSessionJson(CAMPUS_DETAIL_RETURN_KEY);
  if (!source || source.version !== 1 || source.orgId !== Number(orgId) || source.buildingId !== String(buildingId || "")) return null;
  const age = Date.now() - Number(source.createdAt);
  if (!Number.isFinite(age) || age < 0 || age > CAMPUS_MAP_STATE_TTL_MS) return null;
  return source;
}

function clearCampusBuildingReturnSource() {
  removeSessionValue(CAMPUS_DETAIL_RETURN_KEY);
}

function syncCampusGuideSelection(orgId, buildingId) {
  document.querySelectorAll(".campus-guide-building-card").forEach(card => {
    const selected = Number(card.dataset.orgId) === Number(orgId) && card.dataset.buildingId === buildingId;
    card.classList.toggle("is-selected", selected);
    card.querySelector(".campus-guide-building-select")?.setAttribute("aria-pressed", String(selected));
  });
}

function teardownCampusMapInteraction() {
  const controller = activeCampusInteractionController;
  if (!controller) return;
  saveCampusMapState(controller);
  controller.map.off("moveend", controller.handleMoveEnd);
  controller.layer.remove();
  activeCampusInteractionController = null;
}

function mountCampusMapInteraction(map, orgId, options = {}) {
  teardownCampusMapInteraction();
  const canonicalOrgId = Number(orgId);
  const buildings = window.getCampusMapBuildings?.(canonicalOrgId) || [];
  const layer = L.layerGroup().addTo(map);
  const controls = new Map();
  const controller = {
    map, orgId:canonicalOrgId, layer, controls, selectedBuildingId:"", restoredState:false,
    handleMoveEnd:() => saveCampusMapState(controller),
  };
  activeCampusInteractionController = controller;

  const idleStyle = { color:"#c18025", weight:2, opacity:.22, fillColor:"#c18025", fillOpacity:.06 };
  const hoverStyle = { color:"#b06f16", weight:3, opacity:.9, fillColor:"#d99a38", fillOpacity:.2 };
  const selectedStyle = { color:"#8b4f0d", weight:4, opacity:1, fillColor:"#c18025", fillOpacity:.27 };
  const syncStyles = () => controls.forEach((control, buildingId) => {
    control.polygon.setStyle(buildingId === controller.selectedBuildingId ? selectedStyle : idleStyle);
  });
  controller.select = (buildingId, { focus = true, scrollOnMobile = true } = {}) => {
    const control = controls.get(String(buildingId || ""));
    if (!control) return false;
    controller.selectedBuildingId = control.building.buildingId;
    syncStyles();
    syncCampusGuideSelection(canonicalOrgId, controller.selectedBuildingId);
    if (focus) map.flyToBounds(control.polygon.getBounds(), { padding:[60,60], maxZoom:19, duration:.55 });
    if (scrollOnMobile && window.innerWidth < 980) {
      document.querySelector(".campus-guide")?.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }
    saveCampusMapState(controller);
    return true;
  };
  controller.clearSelection = () => {
    controller.selectedBuildingId = "";
    syncStyles();
    syncCampusGuideSelection(canonicalOrgId, "");
    saveCampusMapState(controller);
  };

  buildings.forEach(building => {
    const polygon = L.polygon(building.geometry.coordinates, {
      ...idleStyle, interactive:true, bubblingMouseEvents:false, className:"campus-building-footprint",
    }).addTo(layer);
    const control = { building, polygon };
    controls.set(building.buildingId, control);
    polygon.on("mouseover", () => {
      if (controller.selectedBuildingId !== building.buildingId) polygon.setStyle(hoverStyle);
    });
    polygon.on("mouseout", syncStyles);
    polygon.on("click", event => {
      if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
      controller.select(building.buildingId);
    });
    const element = polygon.getElement();
    if (element) {
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", building.name);
      element.addEventListener("focus", () => polygon.setStyle(hoverStyle));
      element.addEventListener("blur", syncStyles);
      element.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        controller.select(building.buildingId);
      });
    }
  });
  map.on("moveend", controller.handleMoveEnd);

  if (options.restoreState !== false) {
    const saved = readCampusMapState(canonicalOrgId);
    if (saved) {
      map.setView([saved.center.lat, saved.center.lng], saved.zoom, { animate:false });
      if (saved.selectedBuildingId) controller.select(saved.selectedBuildingId, { focus:false, scrollOnMobile:false });
      controller.restoredState = true;
    }
  }
  return controller;
}

function teardownCampusMap() {
  teardownCampusMapInteraction();
  if (!activeCampusMapInstance) return;
  activeCampusMapInstance.remove();
  activeCampusMapInstance = null;
}

function initializeCampusMapPage(orgId) {
  const mapContainer = document.getElementById("campus-map");
  const config = window.getCampusMapConfig?.(orgId);
  teardownCampusMap();
  if (!mapContainer || !config) return;
  const map = L.map(mapContainer, { zoomControl:false }).setView([config.lat, config.lng], config.zoom);
  L.control.zoom({ position:"topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:"© OpenStreetMap contributors", maxZoom:20,
  }).addTo(map);
  activeCampusMapInstance = map;
  const controller = mountCampusMapInteraction(map, orgId);
  if (!controller.restoredState) map.setView([config.lat, config.lng], config.zoom);
  map.on("click", () => controller.clearSelection());
}

function resetCampusMapView(orgId) {
  const config = window.getCampusMapConfig?.(orgId);
  const map = activeCampusInteractionController?.orgId === Number(orgId)
    ? activeCampusInteractionController.map
    : activeCampusMapInstance;
  if (!config || !map) return;
  map.flyTo([config.lat, config.lng], config.zoom, { duration:.6 });
}

function selectCampusGuideBuilding(orgId, buildingId) {
  if (activeCampusInteractionController?.orgId !== Number(orgId)) return false;
  return activeCampusInteractionController.select(buildingId);
}

function openCampusBuildingDetail(orgId, buildingId, context = "spa") {
  if (!window.getCampusMapBuildings?.(orgId).some(item => item.buildingId === buildingId)) return false;
  if (activeCampusInteractionController?.orgId === Number(orgId)) {
    activeCampusInteractionController.select(buildingId, { focus:false, scrollOnMobile:false });
    saveCampusMapState(activeCampusInteractionController);
  }
  setCampusBuildingReturnSource(orgId, buildingId, context);
  const hash = `#/org/${Number(orgId)}/building/${encodeURIComponent(buildingId)}`;
  if (context === "standalone") location.href = `index.html${hash}`;
  else navigate(hash);
  return true;
}

function renderCampusGuideBuildingCards(orgId, buildings, hrefPrefix = "") {
  if (!buildings.length) return `<p class="campus-guide-building-empty">${I18n.t("map.buildingSearchEmpty")}</p>`;
  const context = hrefPrefix ? "standalone" : "spa";
  return `<div class="campus-guide-building-list">${buildings.map(building => {
    const safeId = escapeHtml(building.buildingId);
    const safeName = escapeHtml(building.name);
    return `<div class="campus-guide-building-card" data-org-id="${Number(orgId)}" data-building-id="${safeId}">
      <button type="button" class="campus-guide-building-select" aria-pressed="false" onclick="selectCampusGuideBuilding(${Number(orgId)}, '${safeId}')">
        <span aria-hidden="true">🏢</span><span><strong>${safeName}</strong>${building.category ? `<small>${escapeHtml(building.category)}</small>` : ""}</span>
      </button>
      <button type="button" class="campus-guide-building-enter" aria-label="${escapeHtml(I18n.t("campusMap.viewBuildingDetail"))}: ${safeName}" onclick="openCampusBuildingDetail(${Number(orgId)}, '${safeId}', '${context}')">→</button>
    </div>`;
  }).join("")}</div>`;
}

function filterCampusGuideBuildings(orgId, query, hrefPrefix = "") {
  const resultsContainer = document.getElementById("campus-guide-building-results");
  if (!resultsContainer) return;
  const buildings = window.getCampusMapBuildings?.(orgId) || [];
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
  const matches = buildings.filter(building => building.name.toLocaleLowerCase().includes(normalizedQuery));
  resultsContainer.innerHTML = renderCampusGuideBuildingCards(orgId, matches, hrefPrefix);
}

function renderCampusGuideFrameworkModules(orgId, hrefPrefix = "") {
  const goTo = path => (hrefPrefix ? `location.href='${hrefPrefix}${path}'` : `navigate('${path}')`);
  return `<div class="campus-module-list">
    <button type="button" class="campus-module-card" onclick="${goTo(`#/org/${orgId}/buildings`)}"><span class="campus-module-icon" aria-hidden="true">🏛️</span><span class="campus-module-body"><strong>${I18n.t("campusMap.moduleBuildingRegistryTitle")}</strong><small>${I18n.t("campusMap.moduleBuildingRegistryDesc")}</small></span></button>
    <button type="button" class="campus-module-card campus-module-card-available" onclick="${goTo(`#/org/${orgId}`)}"><span class="campus-module-icon" aria-hidden="true">🎓</span><span class="campus-module-body"><strong>${I18n.t("campusMap.community")}</strong><small>${I18n.t("campusMap.moduleCommunityDesc")}</small></span></button>
  </div>`;
}

function renderCampusGuideBody(orgId, buildings, hrefPrefix = "") {
  if (buildings.length) return `<label class="campus-guide-search" for="campus-guide-search-input"><span>${I18n.t("map.buildingSearchLabel")}</span><input id="campus-guide-search-input" type="search" autocomplete="off" placeholder="${escapeHtml(I18n.t("map.buildingSearchPlaceholder"))}" oninput="filterCampusGuideBuildings(${orgId}, this.value, '${hrefPrefix}')" /></label><div id="campus-guide-building-results">${renderCampusGuideBuildingCards(orgId, buildings, hrefPrefix)}</div>`;
  return `<label class="campus-guide-search" for="campus-guide-search-input"><span>${I18n.t("map.buildingSearchLabel")}</span><input id="campus-guide-search-input" type="search" autocomplete="off" disabled placeholder="${escapeHtml(I18n.t("campusMap.searchDisabled"))}" /></label>${renderCampusGuideFrameworkModules(orgId, hrefPrefix)}`;
}

function renderCampusFrameworkGuideContent(orgId, buildings, hrefPrefix = "") {
  const hasBuildings = buildings.length > 0;
  return `<div class="campus-guide-header"><p class="eyebrow">${I18n.t("map.guide")}</p><h2>${hasBuildings ? I18n.t("map.buildingListTitle") : I18n.t("campusMap.frameworkTitle")}</h2></div><div class="campus-guide-body">${renderCampusGuideBody(orgId, buildings, hrefPrefix)}</div>`;
}

function renderOrgCampusMap(container, orgId) {
  const org = organizations.find(item => item.id === orgId);
  const config = org ? window.getCampusMapConfig?.(orgId) : null;
  if (!org || !config) {
    container.innerHTML = `<section class="container error-page page-reveal"><div class="error-illustration">🗺️</div><p class="eyebrow">${I18n.t("campusMap.eyebrow")}</p><h1>${I18n.t("campusMap.unavailable")}</h1><p>${I18n.t("campusMap.unavailableDesc")}</p><button class="btn btn-primary" onclick="navigate('${org ? `#/org/${orgId}` : "#/"}')">${I18n.t("org.back")}</button></section>`;
    return;
  }
  const safeName = escapeHtml(org.name);
  const buildings = window.getCampusMapBuildings?.(orgId) || [];
  document.title = `Echo Map ${org.name} — Echo Wall`;
  container.innerHTML = `<div class="container campus-map-page page-reveal"><button class="page-back" onclick="navigate('#/org/${orgId}')">← ${I18n.t("org.back")}</button><header class="campus-map-hero"><div><p class="eyebrow">${I18n.t("campusMap.eyebrow")}</p><h1>${I18n.t("campusMap.title", { name:safeName })}</h1></div></header><section class="campus-map-layout"><div class="campus-map-frame"><div id="campus-map" aria-label="${safeName} campus map"></div><div class="campus-map-floating-controls"><button type="button" class="campus-map-control-btn" onclick="resetCampusMapView(${orgId})">${I18n.t("map.fit")}</button><button type="button" class="campus-map-control-btn" onclick="navigate('#/org/${orgId}')">${I18n.t("campusMap.community")}</button></div></div><aside class="campus-guide" aria-label="${I18n.t("map.guide")}">${renderCampusFrameworkGuideContent(orgId, buildings)}</aside></section></div>`;
}

window.mountCampusMapInteraction = mountCampusMapInteraction;
window.teardownCampusMapInteraction = teardownCampusMapInteraction;
window.clearActiveCampusMapSelection = () => activeCampusInteractionController?.clearSelection();
window.getCampusBuildingReturnSource = getCampusBuildingReturnSource;
window.clearCampusBuildingReturnSource = clearCampusBuildingReturnSource;
