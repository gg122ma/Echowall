/**
 * Building Registry framework for non-KMK colleges.
 * Framework only — every list below starts empty until a college's building data is verified
 * and deliberately added. Nothing here is fabricated. KMK keeps its own separate, already
 * populated registry in data/campus-buildings.js and is not represented here.
 *
 * Building shape (documented for future entries — none seeded yet):
 * {
 *   campusId: Number,              // orgId this building belongs to (see app-data.js organizations)
 *   buildingId: String,            // stable slug unique within the campus
 *   name: String,
 *   category: String | null,
 *   coordinates: { lat: Number, lng: Number } | null,
 *   geometry: Array | null,        // optional Leaflet-compatible polygon footprint
 *   description: String | null,    // Building Information copy
 *   knowledge: String | null,      // Place Knowledge copy
 *   wallEnabled: Boolean,          // whether this building has an active Place Wall
 * }
 *
 * To add the first real building for a college: append an entry to that orgId's array below.
 * No other file needs to change — the registry pages and routes already read from this data.
 */
window.CAMPUS_BUILDING_REGISTRY = Object.freeze({
  2: Object.freeze([]), // KMKK
  3: Object.freeze([]), // KMPP
  4: Object.freeze([]), // KMPK
  5: Object.freeze([]), // KMP
  6: Object.freeze([]), // KMM
  7: Object.freeze([]), // KMNS
  8: Object.freeze([]), // KML
  9: Object.freeze([]), // KMJ
  10: Object.freeze([]), // KMPH
  13: Object.freeze([]), // KMS
  14: Object.freeze([]), // KMKT
});

window.getCampusBuildingRegistry = function getCampusBuildingRegistry(orgId) {
  return window.CAMPUS_BUILDING_REGISTRY[Number(orgId)] || [];
};

window.getCampusBuildingByOrgAndId = function getCampusBuildingByOrgAndId(orgId, buildingId) {
  const candidateId = String(buildingId || "");
  return window.getCampusBuildingRegistry(orgId).find(building => building.buildingId === candidateId) || null;
};
