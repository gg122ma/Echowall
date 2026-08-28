window.addEventListener("DOMContentLoaded", async () => {
  const MAP_RETURN_STORAGE_KEY = "echowall_map_return_v1";
  const MAP_RETURN_VERSION = 1;
  const MAP_RETURN_TTL_MS = 30 * 60 * 1000;
  const PUSTAKA_PLACE_ID = "B_PUSTAKA";
  const MASJID_PLACE_ID = "B_MASJID";
  const DEWAN_KULIAH_PLACE_ID = "B_DEWAN_KULIAH";
  const TUTORAN_MAKMAL_PLACE_ID = "B_BLOK_TUTORAN_MAKMAL";
  const LANGKASUKA_PLACE_ID = "B_LANGKASUKA";
  const SERAMBI_PLACE_ID = "B_SERAMBI";
  const ASTAKA_PLACE_ID = "B_ASTAKA";
  const TENNIS_NW_PLACE_ID = "B_TENNIS_NW";
  const BASKETBALL_NW_PLACE_ID = "B_BASKETBALL_NW";
  const DEWAN_MAHAWANGSA_PLACE_ID = "B_DEWAN_MAHAWANGSA";
  const KAFETERIA_A_PLACE_ID = "B_KAFETERIA_A";
  const KAFETERIA_B_PLACE_ID = "B_KAFETERIA_B";
  const KAFETERIA_C_PLACE_ID = "B_KAFETERIA_C";
  const KAFETERIA_PENTADBIRAN_PLACE_ID = "B_KAFETERIA_PENTADBIRAN";
  const SERI_PALAS_PLACE_ID = "B_SERI_PALAS";
  const SERI_TEMIN_PLACE_ID = "B_SERI_TEMIN";
  const SERI_LAKA_PLACE_ID = "B_SERI_LAKA";
  const SERI_JERAI_PLACE_ID = "B_SERI_JERAI";
  const PADANG_UTAMA_PLACE_ID = "B_PADANG_UTAMA";
  const BUILDING_INTERACTION_CONFIGS = Object.freeze([
    Object.freeze({
      id:PUSTAKA_PLACE_ID,
      className:"pustaka-building-footprint",
      idleColor:"#e0a040",
      hoverColor:"#d28c2c",
      selectedColor:"#b97418",
      opensPreview:true,
      showPilotEyebrow:true,
    }),
    Object.freeze({
      id:MASJID_PLACE_ID,
      className:"masjid-building-footprint",
      idleColor:"#3fa873",
      hoverColor:"#319565",
      selectedColor:"#238153",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:DEWAN_KULIAH_PLACE_ID,
      className:"dewan-kuliah-building-footprint",
      idleColor:"#7487a6",
      hoverColor:"#667d9f",
      selectedColor:"#4f668a",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:TUTORAN_MAKMAL_PLACE_ID,
      className:"tutoran-makmal-building-footprint",
      idleColor:"#9a7487",
      hoverColor:"#896477",
      selectedColor:"#744f63",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:LANGKASUKA_PLACE_ID,
      className:"langkasuka-building-footprint",
      idleColor:"#8a8b62",
      hoverColor:"#77794f",
      selectedColor:"#62663d",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:SERAMBI_PLACE_ID,
      className:"serambi-building-footprint",
      idleColor:"#9a766d",
      hoverColor:"#89645b",
      selectedColor:"#744f47",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:ASTAKA_PLACE_ID,
      className:"astaka-building-footprint",
      idleColor:"#56b87e",
      hoverColor:"#45a66d",
      selectedColor:"#2f8a55",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:TENNIS_NW_PLACE_ID,
      className:"tennis-nw-building-footprint",
      idleColor:"#4f9b70",
      hoverColor:"#3d8a5f",
      selectedColor:"#257447",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:BASKETBALL_NW_PLACE_ID,
      className:"basketball-nw-building-footprint",
      idleColor:"#4f9b70",
      hoverColor:"#3d8a5f",
      selectedColor:"#257447",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:DEWAN_MAHAWANGSA_PLACE_ID,
      className:"dewan-mahawangsa-building-footprint",
      idleColor:"#80769a",
      hoverColor:"#6d6388",
      selectedColor:"#584e73",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:KAFETERIA_A_PLACE_ID,
      className:"kafeteria-a-building-footprint",
      idleColor:"#6f8f91",
      hoverColor:"#5d7d80",
      selectedColor:"#49686b",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:KAFETERIA_B_PLACE_ID,
      className:"kafeteria-b-building-footprint",
      idleColor:"#6f8f91",
      hoverColor:"#5d7d80",
      selectedColor:"#49686b",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:KAFETERIA_C_PLACE_ID,
      className:"kafeteria-c-building-footprint",
      idleColor:"#6f8f91",
      hoverColor:"#5d7d80",
      selectedColor:"#49686b",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:KAFETERIA_PENTADBIRAN_PLACE_ID,
      className:"kafeteria-pentadbiran-building-footprint",
      idleColor:"#6f8f91",
      hoverColor:"#5d7d80",
      selectedColor:"#49686b",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:SERI_PALAS_PLACE_ID,
      className:"seri-palas-building-footprint",
      idleColor:"#9c8bd9",
      hoverColor:"#8a78c8",
      selectedColor:"#725fb0",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:SERI_TEMIN_PLACE_ID,
      className:"seri-temin-building-footprint",
      idleColor:"#9c8bd9",
      hoverColor:"#8a78c8",
      selectedColor:"#725fb0",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:SERI_LAKA_PLACE_ID,
      className:"seri-laka-building-footprint",
      idleColor:"#9c8bd9",
      hoverColor:"#8a78c8",
      selectedColor:"#725fb0",
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:SERI_JERAI_PLACE_ID,
      className:"seri-jerai-building-footprint",
      idleColor:"#6b7fd7",
      hoverColor:"#596dc5",
      selectedColor:"#4054ad",
      idleFillOpacity:.01,
      selectedFillOpacity:.08,
      opensPreview:true,
      showPilotEyebrow:false,
    }),
    Object.freeze({
      id:PADANG_UTAMA_PLACE_ID,
      className:"padang-utama-building-footprint",
      idleColor:"#5f8f62",
      hoverColor:"#4f8053",
      selectedColor:"#18743a",
      idleWeight:1,
      idleFillOpacity:.004,
      hoverWeight:2,
      hoverOpacity:.65,
      hoverFillOpacity:.035,
      selectedWeight:4,
      selectedOpacity:1,
      selectedFillOpacity:.06,
      opensPreview:true,
      showPilotEyebrow:false,
    }),
  ]);
  const PREVIEW_PLACE_IDS = new Set(
    BUILDING_INTERACTION_CONFIGS
      .filter(config => config.opensPreview)
      .map(config => config.id)
  );
  const BUILDING_TARGET_ZOOM = 18;
  const FEATURED_BUILDING_IDS = Object.freeze([
    "B_PUSTAKA",
    "B_DEWAN_KULIAH",
    "B_BLOK_TUTORAN_MAKMAL",
    "B_LANGKASUKA",
    "B_DEWAN_MAHAWANGSA",
    "B_KAFETERIA_A",
    "B_KAFETERIA_B",
    "B_KAFETERIA_C",
    "B_KAFETERIA_PENTADBIRAN",
    "B_SERI_PALAS",
    "B_SERI_TEMIN",
    "B_SERI_LAKA",
    "B_MASJID",
  ]);
  const DEFAULT_VIEW = [6.42559, 100.41959];
  const CAMPUS_BOUNDS = L.latLngBounds([6.42175, 100.41585], [6.42805, 100.42265]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getZoneName(zoneId) {
    const zone = window.CAMPUS_ZONES?.[zoneId];
    const language = I18n.getLanguage();
    return zone?.[language] || zone?.en || String(zoneId || "");
  }

  function getBuildingNameParts(name) {
    const value = String(name || "").trim();
    const match = value.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    return match
      ? { displayName: match[1].trim(), alternateName: match[2].trim() }
      : { displayName: value, alternateName: "" };
  }

  function getCategoryLabel(category) {
    const value = String(category || "");
    const translated = I18n.t("map.category." + value);
    return translated === "map.category." + value
      ? value.replace(/[-_]+/g, " ").replace(/\b\w/g, character => character.toUpperCase())
      : translated;
  }

  function getVisibleRuntimeBuildingNotes(placeId) {
    return typeof window.getVisibleBuildingNotes === 'function'
      ? window.getVisibleBuildingNotes(placeId)
      : [];
  }

  if (typeof loadNotes === 'function') loadNotes({ readOnly:true });

  const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView(DEFAULT_VIEW, 17);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 20,
  }).addTo(map);

  const buildingLayer = L.layerGroup().addTo(map);

  const mapSide = document.getElementById("map-side");
  const mapGuide = document.getElementById("map-guide");
  const buildingSearch = document.getElementById("building-search");
  const buildingList = document.getElementById("building-list");
  const buildingEmpty = document.getElementById("building-empty");
  const placePreview = document.getElementById("place-preview");
  // COMMUNITY-MAP-NAV-POLISH-001 (bugfix): the campus switcher must stay on
  // this page and switch in place -- these two containers are the KMK-only
  // sidebar (kept exactly as before) and the non-KMK Campus Framework
  // sidebar (populated from the same shared renderer Community -> Map uses,
  // see switchToCollegeIndex() below), toggled visible/hidden instead of
  // either leaving map.html or overwriting mapGuide's own KMK child nodes
  // (which are cached by reference above and must stay attached).
  const mapSideHeader = document.getElementById("map-side-header");
  const buildingSelection = document.getElementById("building-selection");
  const campusFrameworkGuide = document.getElementById("campus-framework-guide");
  let previewedPlaceId = "";
  let selectedFootprintId = "";
  let selectedBuildingId = "";
  const buildingFootprintControls = new Map();
  const featuredBuildings = FEATURED_BUILDING_IDS
    .map(id => window.CAMPUS_BUILDINGS.find(building => building.id === id))
    .filter(Boolean);

  function removeMapReturnSnapshot() {
    try {
      sessionStorage.removeItem(MAP_RETURN_STORAGE_KEY);
    } catch (error) {
      // Session storage is optional; the existing navigation remains available.
    }
  }

  function isMapReturnBuildingId(value, { allowEmpty = true } = {}) {
    if (value === "") return allowEmpty;
    return typeof value === "string" && Boolean(getInteractionBuilding(value));
  }

  function isValidMapReturnSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
    if (snapshot.version !== MAP_RETURN_VERSION) return false;
    const createdAt = Number(snapshot.createdAt);
    const age = Date.now() - createdAt;
    if (!Number.isFinite(createdAt) || age < 0 || age > MAP_RETURN_TTL_MS) return false;
    if (!isMapReturnBuildingId(snapshot.placeId, { allowEmpty:false })) return false;
    if (!isMapReturnBuildingId(snapshot.selectedBuildingId)) return false;
    if (!isMapReturnBuildingId(snapshot.selectedFootprintId)) return false;
    if (!isMapReturnBuildingId(snapshot.previewedPlaceId)) return false;

    const latitude = Number(snapshot.center?.lat);
    const longitude = Number(snapshot.center?.lng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false;
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;

    const zoom = Number(snapshot.zoom);
    const minimumZoom = map.getMinZoom();
    const maximumZoom = map.getMaxZoom();
    if (!Number.isFinite(zoom)) return false;
    if (Number.isFinite(minimumZoom) && zoom < minimumZoom) return false;
    if (Number.isFinite(maximumZoom) && zoom > maximumZoom) return false;

    return ["buildingListScrollTop", "previewBodyScrollTop", "windowScrollY"].every(field => {
      const value = Number(snapshot[field]);
      return Number.isFinite(value) && value >= 0;
    });
  }

  function readMapReturnSnapshot() {
    let stored;
    try {
      stored = sessionStorage.getItem(MAP_RETURN_STORAGE_KEY);
    } catch (error) {
      return null;
    }
    if (!stored) return null;
    try {
      const snapshot = JSON.parse(stored);
      if (isValidMapReturnSnapshot(snapshot)) return snapshot;
    } catch (error) {
      // Invalid JSON is removed below and otherwise ignored.
    }
    removeMapReturnSnapshot();
    return null;
  }

  function writeMapReturnSnapshot(snapshot) {
    try {
      sessionStorage.setItem(MAP_RETURN_STORAGE_KEY, JSON.stringify(snapshot));
      return true;
    } catch (error) {
      return false;
    }
  }

  function saveMapReturnSnapshot(placeId) {
    const building = getInteractionBuilding(placeId);
    if (!building) return false;
    const center = map.getCenter();
    const previewBody = placePreview.querySelector(".place-preview-body");
    return writeMapReturnSnapshot({
      version:MAP_RETURN_VERSION,
      createdAt:Date.now(),
      placeId:building.id,
      center:{ lat:center.lat, lng:center.lng },
      zoom:map.getZoom(),
      selectedBuildingId,
      selectedFootprintId,
      previewedPlaceId,
      buildingListScrollTop:buildingList.scrollTop,
      previewBodyScrollTop:previewBody?.scrollTop || 0,
      windowScrollY:window.scrollY,
    });
  }

  function syncBuildingSelectionState() {
    buildingList.querySelectorAll(".building-card").forEach(card => {
      const isSelected = card.dataset.buildingId === selectedBuildingId;
      card.classList.toggle("active", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function focusBuildingTarget(building) {
    const latitude = Number(building?.mapTarget?.lat);
    const longitude = Number(building?.mapTarget?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    map.flyTo([latitude, longitude], BUILDING_TARGET_ZOOM, { duration: .75 });
  }

  function renderBuildingList() {
    const query = buildingSearch.value.trim().toLocaleLowerCase();
    const matches = featuredBuildings.filter(building => building.name.toLocaleLowerCase().includes(query));
    buildingList.replaceChildren();
    matches.forEach(building => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "building-card";
      card.dataset.buildingId = building.id;
      card.setAttribute("aria-pressed", "false");
      card.innerHTML = '<span><strong>' + escapeHtml(building.name) + '</strong><small>' + escapeHtml(getCategoryLabel(building.category)) + '</small></span><span class="building-selected-mark" aria-hidden="true">✓</span>';
      card.addEventListener("click", () => {
        if (!selectBuildingFootprint(building.id)) {
          selectedBuildingId = building.id;
          syncBuildingSelectionState();
          clearBuildingFootprintSelection();
          if (previewedPlaceId) closePlacePreview({ restoreFocus:false });
        }
        focusBuildingTarget(building);
      });
      buildingList.appendChild(card);
    });
    buildingEmpty.hidden = matches.length !== 0;
    syncBuildingSelectionState();
  }

  buildingSearch.addEventListener("input", renderBuildingList);
  renderBuildingList();

  function closePlacePreview({ restoreFocus = true } = {}) {
    const closingPlaceId = previewedPlaceId;
    previewedPlaceId = "";
    mapGuide.hidden = false;
    placePreview.hidden = true;
    placePreview.replaceChildren();
    clearBuildingFootprintSelection();
    if (restoreFocus) {
      getBuildingFootprintControl(closingPlaceId)?.polygon.getElement()?.focus();
    }
  }

  function buildHoursMarkup(buildingId) {
    const snapshot = window.BuildingHours.getSnapshot(buildingId, new Date());
    const statusText = window.BuildingHours.formatStatusLine(snapshot);
    if (snapshot.mode !== "weekly") {
      return '<div class="place-preview-hours"><div class="place-preview-hours-static"><span aria-hidden="true">🕒</span><span>' + escapeHtml(statusText) + '</span></div></div>';
    }
    const rows = window.BuildingHours.weekdayKeys.map((key, index) => {
      const dayConfig = snapshot.days[index];
      const value = (dayConfig && !dayConfig.closed)
        ? window.BuildingHours.formatTime(dayConfig.open) + ' – ' + window.BuildingHours.formatTime(dayConfig.close)
        : I18n.t("map.hours.closed");
      return '<div class="place-preview-hours-row"><span>' + escapeHtml(I18n.t("map.weekday." + key)) + '</span><span>' + escapeHtml(value) + '</span></div>';
    }).join('');
    return (
      '<div class="place-preview-hours" id="place-preview-hours">' +
        '<button type="button" class="place-preview-hours-toggle" id="place-preview-hours-toggle" aria-expanded="false" aria-controls="place-preview-hours-panel">' +
          '<span aria-hidden="true">🕒</span>' +
          '<span class="place-preview-hours-status">' + escapeHtml(statusText) + '</span>' +
          '<span class="place-preview-hours-chevron" aria-hidden="true">⌄</span>' +
        '</button>' +
        '<div class="place-preview-hours-panel" id="place-preview-hours-panel" hidden>' +
          '<p class="place-preview-hours-title">' + escapeHtml(I18n.t("map.hours.title")) + '</p>' +
          rows +
        '</div>' +
      '</div>'
    );
  }

  function openPlacePreview(building, { scrollOnMobile = true } = {}) {
    if (!building || !PREVIEW_PLACE_IDS.has(building.id)) return;
    previewedPlaceId = building.id;
    const realNoteCount = getVisibleRuntimeBuildingNotes(building.id).length;
    const visibleNoteCount = typeof window.getBuildingDisplayCount === 'function'
      ? window.getBuildingDisplayCount(building.id, realNoteCount)
      : realNoteCount;
    const nameParts = getBuildingNameParts(building.name);
    const description = String(window.getLocalizedBuildingText?.(building, 'description') || '').trim();
    const descriptionMarkup = description
      ? '<p class=place-preview-description>' + escapeHtml(description) + '</p>'
      : '';
    const hoursMarkup = buildHoursMarkup(building.id);
    const moreDetailsMarkup = '<button type="button" class="place-preview-more-row" id="place-preview-more"><span>' + escapeHtml(I18n.t("map.moreDetails")) + '</span><span aria-hidden="true">→</span></button>';
    placePreview.innerHTML =
      '<button id="place-preview-back" class="place-preview-back" type="button">← ' + escapeHtml(I18n.t("map.previewBack")) + '</button>' +
      '<div class="place-preview-body">' +
        '<span class="place-preview-icon" aria-hidden="true">' + escapeHtml(building.emoji) + '</span>' +
        '<h2>' + escapeHtml(nameParts.displayName) + '</h2>' +
        descriptionMarkup +
        hoursMarkup +
        moreDetailsMarkup +
        '<div class=place-preview-count><strong>' + visibleNoteCount + '</strong><span>' + escapeHtml(I18n.t('map.visibleNotes')) + '</span></div>' +
      '</div>' +
      '<button id="enter-building-wall" class="btn btn-primary btn-lg btn-round place-preview-action" type="button">' + escapeHtml(I18n.t("place.enterWall")) + ' <span aria-hidden="true">→</span></button>';
    mapGuide.hidden = true;
    placePreview.hidden = false;
    const wallEntry = placePreview.querySelector("#enter-building-wall");
    wallEntry.addEventListener("click", () => {
      saveMapReturnSnapshot(building.id);
      navigateToBuildingWall(building.id);
    });
    placePreview.querySelector("#place-preview-back").addEventListener("click", () => {
      closePlacePreview();
    });
    const moreDetailsButton = placePreview.querySelector("#place-preview-more");
    if (moreDetailsButton) {
      moreDetailsButton.addEventListener("click", () => {
        // COMMUNITY-MAP-NAV-POLISH-001: record that this Building Detail
        // visit came from the Echo Map (so its Back button returns here
        // instead of Building Stories) and save the same map-view snapshot
        // "Enter this building wall" already uses, so the exact center/
        // zoom/selection/scroll position is restored on return.
        if (typeof setPlaceReturnSource === "function") setPlaceReturnSource("map", building.id);
        saveMapReturnSnapshot(building.id);
        location.href = "index.html#/place/" + encodeURIComponent(building.id);
      });
    }
    const hoursToggle = placePreview.querySelector("#place-preview-hours-toggle");
    if (hoursToggle) {
      hoursToggle.addEventListener("click", () => {
        const hoursWrap = placePreview.querySelector("#place-preview-hours");
        const hoursPanel = placePreview.querySelector("#place-preview-hours-panel");
        const expanded = hoursToggle.getAttribute("aria-expanded") === "true";
        hoursToggle.setAttribute("aria-expanded", String(!expanded));
        hoursWrap.classList.toggle("is-expanded", !expanded);
        hoursPanel.hidden = expanded;
      });
    }
    if (scrollOnMobile && window.innerWidth < 980) {
      requestAnimationFrame(() => mapSide.scrollIntoView({ behavior:"smooth", block:"start" }));
    }
  }

  const buildingHitPane = map.createPane("building-hit-pane");
  buildingHitPane.style.zIndex = "450";
  function normalizeFootprintRing(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return null;
    const normalizedRing = [];
    for (const point of ring) {
      if (
        !Array.isArray(point) ||
        point.length !== 2 ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number" ||
        !Number.isFinite(point[0]) ||
        !Number.isFinite(point[1])
      ) return null;
      normalizedRing.push([point[0], point[1]]);
    }
    return normalizedRing;
  }

  function normalizeBuildingFootprint(mapFootprint) {
    if (!Array.isArray(mapFootprint) || mapFootprint.length === 0) return null;
    const firstEntry = mapFootprint[0];
    const isSingleRing = Array.isArray(firstEntry) && !Array.isArray(firstEntry[0]);
    if (isSingleRing) return normalizeFootprintRing(mapFootprint);

    const normalizePolygon = polygon => {
      if (!Array.isArray(polygon) || polygon.length === 0) return null;
      const normalizedRings = polygon.map(normalizeFootprintRing);
      return normalizedRings.every(Boolean) ? normalizedRings : null;
    };
    const isMultiPolygon = Array.isArray(firstEntry?.[0]?.[0]);
    if (!isMultiPolygon) return normalizePolygon(mapFootprint);

    const normalizedPolygons = mapFootprint.map(normalizePolygon);
    return normalizedPolygons.every(Boolean) ? normalizedPolygons : null;
  }

  function getBuildingInteractionConfig(placeId) {
    return BUILDING_INTERACTION_CONFIGS.find(config => config.id === placeId) || null;
  }

  function getInteractionBuilding(placeId) {
    if (!getBuildingInteractionConfig(placeId)) return null;
    return window.getCampusBuilding?.(placeId) || null;
  }

  function getBuildingFootprintControl(placeId) {
    return buildingFootprintControls.get(placeId) || null;
  }

  function getIdleFootprintStyle(config) {
    return {
      color:config.idleColor,
      weight:config.idleWeight ?? 2,
      opacity:0,
      fillOpacity:config.idleFillOpacity ?? 0,
    };
  }

  function getSelectedFootprintStyle(config) {
    return {
      color:config.selectedColor,
      weight:config.selectedWeight ?? 3,
      opacity:config.selectedOpacity ?? .95,
      fillOpacity:config.selectedFillOpacity ?? 0,
    };
  }

  function syncBuildingFootprintStyle(placeId) {
    const control = getBuildingFootprintControl(placeId);
    if (!control) return;
    control.polygon.setStyle(selectedFootprintId === placeId
      ? getSelectedFootprintStyle(control.config)
      : getIdleFootprintStyle(control.config));
  }

  function setSelectedFootprint(placeId) {
    selectedFootprintId = buildingFootprintControls.has(placeId) ? placeId : "";
    buildingFootprintControls.forEach(control => syncBuildingFootprintStyle(control.config.id));
  }

  function clearBuildingFootprintSelection() {
    setSelectedFootprint("");
  }

  function highlightBuildingFootprint(placeId) {
    if (selectedFootprintId) return;
    const control = getBuildingFootprintControl(placeId);
    if (!control) return;
    control.polygon.setStyle({
      color:control.config.hoverColor,
      weight:control.config.hoverWeight ?? 2,
      opacity:control.config.hoverOpacity ?? .72,
      fillColor:control.config.idleColor,
      fillOpacity:control.config.hoverFillOpacity ?? .08,
    });
  }

  function selectBuildingFootprint(placeId, { scrollPreviewOnMobile = true } = {}) {
    const config = getBuildingInteractionConfig(placeId);
    const building = getInteractionBuilding(placeId);
    if (!config || !building) return false;
    if (!config.opensPreview && previewedPlaceId) closePlacePreview({ restoreFocus:false });
    setSelectedFootprint(placeId);
    selectedBuildingId = placeId;
    syncBuildingSelectionState();
    if (config.opensPreview) openPlacePreview(building, { scrollOnMobile:scrollPreviewOnMobile });
    return true;
  }

  function bindBuildingFootprintEvents(control) {
    const { building, config, polygon } = control;
    polygon.on("mouseover", () => {
      if (polygon.options.echoPlacementActive) return;
      highlightBuildingFootprint(config.id);
    });
    polygon.on("mouseout", () => {
      if (polygon.options.echoPlacementActive) return;
      syncBuildingFootprintStyle(config.id);
    });
    polygon.on("click", event => {
      if (polygon.options.echoPlacementActive) return;
      if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
      selectBuildingFootprint(config.id);
    });

    const footprintElement = polygon.getElement();
    if (!footprintElement) return;
    footprintElement.style.outline = 'none';
    footprintElement.setAttribute("tabindex", "0");
    footprintElement.setAttribute("role", "button");
    footprintElement.setAttribute("aria-label", building.name);
    footprintElement.addEventListener("focus", () => highlightBuildingFootprint(config.id));
    footprintElement.addEventListener("blur", () => syncBuildingFootprintStyle(config.id));
    footprintElement.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectBuildingFootprint(config.id);
    });
  }

  function createBuildingFootprintControl(config) {
    const building = getInteractionBuilding(config.id);
    const footprintPoints = normalizeBuildingFootprint(building?.mapFootprint);
    if (!building || !footprintPoints) {
      console.warn(config.id + " or its map footprint is missing from the campus building registry.");
      return null;
    }

    const polygon = L.polygon(footprintPoints, {
      pane:"building-hit-pane",
      renderer:L.svg({ pane:"building-hit-pane" }),
      className:config.className,
      color:config.idleColor,
      weight:config.idleWeight ?? 2,
      opacity:0,
      fill:true,
      fillColor:config.idleColor,
      fillOpacity:config.idleFillOpacity ?? 0,
      interactive:true,
      bubblingMouseEvents:false,
    }).addTo(buildingLayer);
    const control = { building, config, polygon };
    buildingFootprintControls.set(config.id, control);
    bindBuildingFootprintEvents(control);
    return control;
  }

  BUILDING_INTERACTION_CONFIGS.forEach(createBuildingFootprintControl);

  const KMK_ORG_ID = 1;
  let activeOrgIndex = organizations.findIndex(org => org.id === KMK_ORG_ID);
  if (activeOrgIndex < 0) activeOrgIndex = 0;
  const collegeSwitcherLabel = document.getElementById("map-college-label");
  const collegePrevButton = document.getElementById("map-college-prev");
  const collegeNextButton = document.getElementById("map-college-next");
  const mapTitleElement = document.getElementById("map-title");

  function fitActiveCollegeView({ animate = true } = {}) {
    const org = organizations[activeOrgIndex];
    if (org.id === KMK_ORG_ID) {
      if (animate) map.flyToBounds(CAMPUS_BOUNDS, { padding:[30,30], duration:.75 });
      else map.fitBounds(CAMPUS_BOUNDS, { padding:[24,24] });
      return;
    }
    const config = window.getCampusMapConfig?.(org.id);
    if (!config) return;
    if (animate) map.flyTo([config.lat, config.lng], config.zoom, { duration:.75 });
    else map.setView([config.lat, config.lng], config.zoom);
  }

  function applyActiveCollegeChrome() {
    const org = organizations[activeOrgIndex];
    if (collegeSwitcherLabel) collegeSwitcherLabel.textContent = org.name;
    if (mapTitleElement) {
      mapTitleElement.textContent = org.id === KMK_ORG_ID
        ? I18n.t("map.title")
        : I18n.t("campusMap.title", { name: org.name });
    }
    if (collegePrevButton) collegePrevButton.setAttribute("aria-label", I18n.t("map.previousCollege"));
    if (collegeNextButton) collegeNextButton.setAttribute("aria-label", I18n.t("map.nextCollege"));
  }

  // COMMUNITY-MAP-NAV-POLISH-001 (bugfix): renders the exact same Campus
  // Framework sidebar content Community -> Map shows (#/org/:orgId/map,
  // renderOrgCampusMap in app-campus-map.js), reusing its shared
  // renderCampusFrameworkGuideContent() helper -- not a second, separately
  // worded copy. hrefPrefix "index.html" makes the sidebar's two actionable
  // module cards do a real cross-document navigation (this page has no
  // hashchange listener of its own to react to an in-page hash rewrite).
  function renderNonKmkCampusGuide(orgId) {
    if (!campusFrameworkGuide || typeof renderCampusFrameworkGuideContent !== "function") return;
    const buildings = typeof getCampusBuildingRegistry === "function" ? getCampusBuildingRegistry(orgId) : [];
    campusFrameworkGuide.innerHTML = renderCampusFrameworkGuideContent(orgId, buildings, "index.html");
  }

  function switchToCollegeIndex(nextIndex) {
    const total = organizations.length;
    activeOrgIndex = ((nextIndex % total) + total) % total;
    const org = organizations[activeOrgIndex];
    const isKmk = org.id === KMK_ORG_ID;

    // The campus switcher always stays on this page and switches in place --
    // it must never leave map.html or open another route. KMK keeps its
    // full existing sidebar (building polygons/list/preview/search); every
    // other campus shows the shared Campus Framework sidebar instead of an
    // empty or out-of-sync notice.
    selectedBuildingId = "";
    selectedFootprintId = "";
    clearBuildingFootprintSelection();
    if (previewedPlaceId) closePlacePreview({ restoreFocus:false });

    if (isKmk) {
      if (!map.hasLayer(buildingLayer)) buildingLayer.addTo(map);
      if (buildingSearch) buildingSearch.disabled = false;
      if (buildingEmpty) buildingEmpty.hidden = true;
      buildingList.hidden = false;
      buildingSearch.parentElement.hidden = false;
      renderBuildingList();
      if (mapSideHeader) mapSideHeader.hidden = false;
      if (buildingSelection) buildingSelection.hidden = false;
      if (campusFrameworkGuide) campusFrameworkGuide.hidden = true;
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
      if (mapSideHeader) mapSideHeader.hidden = true;
      if (buildingSelection) buildingSelection.hidden = true;
      if (campusFrameworkGuide) campusFrameworkGuide.hidden = false;
      renderNonKmkCampusGuide(org.id);
    }

    applyActiveCollegeChrome();
    fitActiveCollegeView({ animate:true });
  }

  if (collegePrevButton) collegePrevButton.addEventListener("click", () => switchToCollegeIndex(activeOrgIndex - 1));
  if (collegeNextButton) collegeNextButton.addEventListener("click", () => switchToCollegeIndex(activeOrgIndex + 1));
  window.addEventListener("echo:languagechange", () => {
    applyActiveCollegeChrome();
    // The Campus Framework sidebar bakes I18n.t() strings directly into its
    // HTML (unlike the static data-i18n-tagged KMK sidebar, which the global
    // I18n.apply() call already re-applies on its own) -- it needs an
    // explicit re-render on language change while a non-KMK campus is active.
    const activeOrg = organizations[activeOrgIndex];
    if (activeOrg && activeOrg.id !== KMK_ORG_ID) renderNonKmkCampusGuide(activeOrg.id);
  });
  applyActiveCollegeChrome();

  document.getElementById("fit-campus").addEventListener("click", () => {
    fitActiveCollegeView({ animate:true });
  });

  map.fitBounds(CAMPUS_BOUNDS, { padding:[24,24] });
  map.on("click", () => {
    selectedBuildingId = "";
    syncBuildingSelectionState();
    if (previewedPlaceId) closePlacePreview({ restoreFocus:false });
    else clearBuildingFootprintSelection();
  });


  let mapReturnRestoreAttempted = false;
  function restoreMapReturnSnapshot() {
    if (mapReturnRestoreAttempted) return false;
    mapReturnRestoreAttempted = true;
    const snapshot = readMapReturnSnapshot();
    if (!snapshot) return false;

    try {
      map.setView([snapshot.center.lat, snapshot.center.lng], snapshot.zoom, { animate:false });
      if (snapshot.selectedBuildingId) {
        if (!selectBuildingFootprint(snapshot.selectedBuildingId, { scrollPreviewOnMobile:false })) {
          throw new Error("The saved building selection is unavailable.");
        }
      } else {
        selectedBuildingId = "";
        syncBuildingSelectionState();
      }

      if (snapshot.previewedPlaceId) {
        const previewedBuilding = getInteractionBuilding(snapshot.previewedPlaceId);
        if (!previewedBuilding) throw new Error("The saved building preview is unavailable.");
        openPlacePreview(previewedBuilding, { scrollOnMobile:false });
      } else if (previewedPlaceId) {
        closePlacePreview({ restoreFocus:false });
      }
      setSelectedFootprint(snapshot.selectedFootprintId);

      requestAnimationFrame(() => {
        buildingList.scrollTop = snapshot.buildingListScrollTop;
        const previewBody = placePreview.querySelector(".place-preview-body");
        if (previewBody) previewBody.scrollTop = snapshot.previewBodyScrollTop;
        window.scrollTo({ top:snapshot.windowScrollY, left:0, behavior:"auto" });
        removeMapReturnSnapshot();
      });
      return true;
    } catch (error) {
      removeMapReturnSnapshot();
      return false;
    }
  }

  restoreMapReturnSnapshot();

  window.EchoMapNoteOverlay?.init({
    map,
    getFitCampusZoom:() => map.getBoundsZoom(CAMPUS_BOUNDS, false, L.point(60,60)),
    buildingZoom:BUILDING_TARGET_ZOOM,
    buildingPolygons:Object.freeze(Array.from(buildingFootprintControls.values(), control => Object.freeze({
      placeId:control.config.id,
      building:control.building,
      name:control.building.name,
      layer:control.polygon,
    }))),
  });

  window.addEventListener("echo:languagechange", () => {
    renderBuildingList();
    const previewedBuilding = getInteractionBuilding(previewedPlaceId);
    if (previewedBuilding) openPlacePreview(previewedBuilding, { scrollOnMobile:false });
  });
  window.addEventListener('echo:runtimenoteschange', () => {
    const previewedBuilding = getInteractionBuilding(previewedPlaceId);
    if (previewedBuilding) openPlacePreview(previewedBuilding, { scrollOnMobile:false });
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) removeMapReturnSnapshot();
    const previewedBuilding = getInteractionBuilding(previewedPlaceId);
    if (previewedBuilding) openPlacePreview(previewedBuilding, { scrollOnMobile:false });
  });
  if (typeof loadDefaultDemoSeed === 'function') void loadDefaultDemoSeed();
});
