(function () {
  "use strict";
  window.EchoAI = window.EchoAI || {};
  const STORAGE_KEY = "echowall_ai_map_action_v1";
  const VERSION = 1;
  const TTL_MS = 5 * 60 * 1000;

  function defaultStorage() {
    try { return window.sessionStorage || null; } catch { return null; }
  }

  function create(place) {
    if (!window.EchoAI.PlaceRegistry?.hasMapTarget?.(place)) return null;
    return Object.freeze({ type: "OPEN_MAP", placeId: place.canonicalId, buildingId: place.buildingId });
  }

  function validate(action) {
    if (!action || action.type !== "OPEN_MAP") return false;
    if (typeof action.placeId !== "string" || typeof action.buildingId !== "string") return false;
    if (window.EchoAI.PlaceRegistry) {
      const place = window.EchoAI.PlaceRegistry.getById(action.placeId);
      return Boolean(place && place.buildingId === action.buildingId && window.EchoAI.PlaceRegistry.hasMapTarget(place));
    }
    const building = window.getCampusBuilding?.(action.buildingId)
      || (window.CAMPUS_BUILDINGS || []).find(item => item.id === action.buildingId);
    const latitude = Number(building?.mapTarget?.lat);
    const longitude = Number(building?.mapTarget?.lng);
    return Boolean(building && Number.isFinite(latitude) && Number.isFinite(longitude)
      && Array.isArray(building.mapFootprint) && building.mapFootprint.length > 0);
  }

  function execute(action) {
    if (!validate(action)) return false;
    try {
      const storage = defaultStorage();
      if (!storage) return false;
      storage.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        createdAt: Date.now(),
        placeId: action.placeId,
        buildingId: action.buildingId,
      }));
    } catch {
      return false;
    }
    window.location.href = "map.html";
    return true;
  }

  function readPending(storage = defaultStorage()) {
    if (!storage) return null;
    let parsed;
    try { parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
    if (!parsed || parsed.version !== VERSION) return null;
    const age = Date.now() - Number(parsed.createdAt);
    if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return null;
    const action = { type: "OPEN_MAP", placeId: parsed.placeId, buildingId: parsed.buildingId };
    return validate(action) ? action : null;
  }

  function clearPending(storage = defaultStorage()) {
    if (!storage) return;
    try { storage.removeItem(STORAGE_KEY); } catch {}
  }

  function consumePending(storage = defaultStorage()) {
    const action = readPending(storage);
    clearPending(storage);
    return action;
  }

  window.EchoAI.MapAction = Object.freeze({ STORAGE_KEY, create, validate, execute, readPending, clearPending, consumePending });
}());
