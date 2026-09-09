(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};

  const BUILDING_LINKS = Object.freeze({
    serambi: "B_SERAMBI",
    library: "B_PUSTAKA",
    "koop-mart": "B_KOOP",
    "cafe-admin": "B_KAFETERIA_PENTADBIRAN",
    "cafe-a": "B_KAFETERIA_A",
    "cafe-b": "B_KAFETERIA_B",
    "cafe-c": "B_KAFETERIA_C",
    "dewan-kuliah": "B_DEWAN_KULIAH",
    masjid: "B_MASJID",
  });

  const EXTRA_ALIASES = Object.freeze({
    library: Object.freeze(["pustaka", "perpustakaan", "lib", "图书馆"]),
    "koop-mart": Object.freeze(["koop", "koop mart", "koperasi", "koperasi mart"]),
    serambi: Object.freeze(["hep", "hal ehwal pelajar", "student affairs"]),
    "dewan-kuliah": Object.freeze(["lecture hall", "dk", "dewan kuliah", "讲堂", "讲座厅"]),
    masjid: Object.freeze(["mosque", "masjid", "清真寺"]),
    "cafe-a": Object.freeze(["cafe a", "kafe a", "kafeteria a"]),
    "cafe-b": Object.freeze(["cafe b", "kafe b", "kafeteria b"]),
    "cafe-c": Object.freeze(["cafe c", "kafe c", "kafeteria c"]),
    "cafe-admin": Object.freeze(["cafe admin", "kafe admin", "admin cafe", "kafeteria pentadbiran"]),
  });

  const SCHEDULES = Object.freeze({
    library: Object.freeze({ sun: "08:00-16:30", mon: "08:00-16:30", tue: "08:00-16:30", wed: "08:00-16:30", thu: "08:00-16:30", fri: "closed", sat: "closed" }),
    "koop-mart": Object.freeze({ sun: "08:00-17:30", mon: "08:00-17:30", tue: "08:00-17:30", wed: "08:00-17:30", thu: "08:00-17:30", fri: "09:00-17:30", sat: "09:00-17:30" }),
  });

  const EXPLICIT_RELATIONS = Object.freeze({
    library: Object.freeze(["cafe-library"]),
    "cafe-library": Object.freeze(["library"]),
    serambi: Object.freeze(["cubic", "cafe-admin"]),
    cubic: Object.freeze(["serambi"]),
    "cafe-admin": Object.freeze(["serambi"]),
    atm: Object.freeze(["pos-mini"]),
    "pos-mini": Object.freeze(["atm"]),
  });

  function unique(values) {
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))];
  }

  function groupedKnowledgeRecords() {
    const groups = new Map();
    window.EchoAI.SourceRegistry.getRecords().forEach(record => {
      if (!groups.has(record.canonicalId)) groups.set(record.canonicalId, []);
      groups.get(record.canonicalId).push(record);
    });
    return groups;
  }

  function getPlaces() {
    const buildings = Array.isArray(window.CAMPUS_BUILDINGS) ? window.CAMPUS_BUILDINGS : [];
    const buildingById = new Map(buildings.map(building => [building.id, building]));
    const places = [];
    const usedBuildings = new Set();

    groupedKnowledgeRecords().forEach((records, canonicalId) => {
      const sorted = [...records].sort((a, b) => a.authority - b.authority);
      const primary = sorted[0];
      const requestedBuildingId = primary.buildingId || BUILDING_LINKS[canonicalId] || "";
      const building = buildingById.get(requestedBuildingId) || null;
      const buildingId = building?.id || "";
      if (building) usedBuildings.add(building.id);
      const aliases = unique([
        primary.title,
        primary.id,
        ...records.flatMap(record => record.aliases || []),
        ...(EXTRA_ALIASES[canonicalId] || []),
        building?.name,
        ...Object.values(building?.tags || {}).flat(),
      ]);
      places.push(Object.freeze({
        ...primary,
        canonicalId,
        buildingId,
        building,
        aliases: Object.freeze(aliases),
        schedule: SCHEDULES[canonicalId] || null,
        sourceRecords: Object.freeze(records),
      }));
    });

    buildings.filter(building => !usedBuildings.has(building.id)).forEach(building => {
      places.push(Object.freeze({
        id: building.id,
        canonicalId: building.id,
        buildingId: building.id,
        building,
        title: building.name,
        aliases: Object.freeze(unique([building.name, building.id, building.category, ...Object.values(building.tags || {}).flat()])),
        category: building.category,
        content: building.purpose?.en || building.description?.en || "",
        contentMs: building.purpose?.ms || building.description?.ms || "",
        contentZh: building.purpose?.zh || building.description?.zh || "",
        location: `EchoWall Map: ${building.name}`,
        hours: building.hours || "Not available in current materials",
        source: "EchoWall Map/Building data",
        sourceRef: Object.freeze({ label: "EchoWall Map/Building data", filename: "data/campus-buildings.js", page: null }),
        authority: window.EchoAI.Config.sourceAuthority.mapData,
        sourceRecords: Object.freeze([]),
        schedule: null,
      }));
    });
    return places;
  }

  function getById(canonicalId) {
    return getPlaces().find(place => place.canonicalId === canonicalId) || null;
  }

  function hasMapTarget(place) {
    const latitude = Number(place?.building?.mapTarget?.lat);
    const longitude = Number(place?.building?.mapTarget?.lng);
    return Boolean(place?.buildingId) && Number.isFinite(latitude) && Number.isFinite(longitude)
      && Array.isArray(place?.building?.mapFootprint) && place.building.mapFootprint.length > 0;
  }

  function getNearbyDetails(place) {
    if (!place) return Object.freeze({ places: Object.freeze([]), basis: "none" });
    const explicit = EXPLICIT_RELATIONS[place.canonicalId] || [];
    const explicitPlaces = explicit.map(getById).filter(Boolean);
    if (explicitPlaces.length) return Object.freeze({ places: Object.freeze(explicitPlaces), basis: "explicit" });
    if (!hasMapTarget(place)) return Object.freeze({ places: Object.freeze([]), basis: "none" });
    const lat = Number(place.building.mapTarget.lat);
    const lng = Number(place.building.mapTarget.lng);
    const places = getPlaces().filter(candidate => candidate.canonicalId !== place.canonicalId && hasMapTarget(candidate)).map(candidate => ({
      candidate,
      coordinateDelta: Math.hypot(Number(candidate.building.mapTarget.lat) - lat, Number(candidate.building.mapTarget.lng) - lng),
    })).sort((a, b) => a.coordinateDelta - b.coordinateDelta).slice(0, 3).map(item => item.candidate);
    return Object.freeze({ places: Object.freeze(places), basis: places.length ? "coordinate-order" : "none" });
  }

  function getNearby(place) {
    return getNearbyDetails(place).places;
  }

  window.EchoAI.PlaceRegistry = Object.freeze({ getPlaces, getById, hasMapTarget, getNearby, getNearbyDetails });
}());
