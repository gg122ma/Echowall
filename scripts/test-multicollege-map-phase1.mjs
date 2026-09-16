#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}

const window = {};
window.window = window;
const context = { window, Object, Array, Number, String, Map, Set, Date, JSON };
vm.createContext(context);
vm.runInContext(read("data/campus-map-config.js"), context, { filename:"data/campus-map-config.js" });
vm.runInContext(read("data/campus-building-registry.js"), context, { filename:"data/campus-building-registry.js" });

const campusIds = [2,3,4,5,6,7,8,9,10,13,14];
check("all eleven non-KMK campuses have shared map configuration", campusIds.every(id => window.getCampusMapConfig(id)?.renderer === "shared-campus-map"));
check("KMK alone supports submaps", window.getCampusMapCapabilities(1)?.supportsSubmaps === true && campusIds.every(id => window.getCampusMapCapabilities(id)?.supportsSubmaps === false));
check("every non-KMK campus has a Phase 1 top-level registry", campusIds.every(id => window.getCampusBuildingRegistry(id).length > 0));

const expectedClickable = new Map([[2,0],[3,0],[4,1],[5,3],[6,6],[7,0],[8,0],[9,0],[10,1],[13,0],[14,0]]);
for (const [orgId, expected] of expectedClickable) {
  check(`campus ${orgId} exposes exactly ${expected} supported map targets`, window.getCampusMapBuildings(orgId).length === expected);
}

const allRecords = campusIds.flatMap(id => window.getCampusBuildingRegistry(id));
const clickable = campusIds.flatMap(id => window.getCampusMapBuildings(id));
check("all map targets use an allowed interactive geometry state", clickable.every(item => ["PRODUCTION","PROVISIONAL_CLICKABLE"].includes(item.geometryState)));
check("all map targets use exact closed polygon coordinates", clickable.every(item => {
  const points = item.geometry?.coordinates;
  if (!Array.isArray(points) || points.length < 4) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return first[0] === last[0] && first[1] === last[1] && points.every(point => point.length === 2 && point.every(Number.isFinite));
}));
check("unsupported records never receive fallback geometry", allRecords.filter(item => !clickable.includes(item)).every(item => item.geometry === null));
check("KMPK keeps Blok Pensyarah and Pentadbiran as separate records", Boolean(window.getCampusBuildingByOrgAndId(4,"KMPK_B_BLOK_PENSYARAH")) && Boolean(window.getCampusBuildingByOrgAndId(4,"KMPK_B_PENTADBIRAN")));
check("KMM Oasiswa is not silently mapped to another object", window.getCampusBuildingByOrgAndId(6,"KMM_B_OASISWA")?.geometry === null);
check("KMKT contains no pre-expansion geometry", window.getCampusBuildingRegistry(14).every(item => item.geometry === null));
check("source retrieval dates are retained internally", clickable.every(item => item.geometry.retrievedAt === "2026-09-16"));
check("dated KMM owner-source evidence is retained internally", window.getCampusMapBuildings(6).every(item => item.sourceAuthority.nameSourceDate === "2026-05-14"));

const mapSource = read("app-campus-map.js");
const detailSource = read("app-campus-buildings.js");
const echoMapSource = read("echomap.js");
check("shared engine binds hover, click, keyboard and mobile-capable selection", /mouseover/.test(mapSource) && /polygon\.on\("click"/.test(mapSource) && /event\.key !== "Enter"/.test(mapSource));
check("map detail entry records context before navigation", /setCampusBuildingReturnSource\(orgId, buildingId, context\)/.test(mapSource));
check("non-KMK detail back supports SPA and standalone map contexts", /mapReturn\?\.context === "standalone"/.test(detailSource) && /#\/org\/\$\{orgId\}\/map/.test(detailSource));
check("Building Registry entry clears stale map return context", /clearCampusBuildingReturnSource\(\);navigate/.test(detailSource));
check("standalone Echo Map mounts the same shared interaction engine", /mountCampusMapInteraction\?\.\(map, org\.id\)/.test(echoMapSource));
check("standalone Echo Map can restore the requested college", /URLSearchParams\(location\.search\).*college/.test(echoMapSource));

const storageValues = new Map();
const sessionStorage = {
  getItem:key => storageValues.get(key) || null,
  setItem:(key, value) => storageValues.set(key, value),
  removeItem:key => storageValues.delete(key),
};
const cards = [];
let mobileScrolls = 0;
const document = {
  querySelectorAll:selector => selector === ".campus-guide-building-card" ? cards : [],
  querySelector:selector => selector === ".campus-guide" ? { scrollIntoView:() => { mobileScrolls += 1; } } : null,
  getElementById:() => null,
};
function fakePolygon(points, options) {
  const events = new Map();
  return {
    points, options, events, styles:[],
    addTo() { return this; },
    on(name, handler) { events.set(name, handler); return this; },
    setStyle(style) { this.styles.push(style); return this; },
    getBounds() { return { points }; },
    getElement() { return { setAttribute() {}, addEventListener() {} }; },
  };
}
const L = {
  layerGroup:() => ({ addTo() { return this; }, remove() {} }),
  polygon:fakePolygon,
  DomEvent:{ stopPropagation() {} },
};
const fakeMap = {
  center:{ lat:2.33247, lng:102.08959 }, zoom:17, events:new Map(),
  getCenter() { return this.center; }, getZoom() { return this.zoom; },
  on(name, handler) { this.events.set(name, handler); return this; },
  off(name) { this.events.delete(name); return this; },
  setView(center, zoom) { this.center = { lat:center[0], lng:center[1] }; this.zoom = zoom; return this; },
  flyToBounds(bounds) { this.lastBounds = bounds; return this; },
};
Object.assign(context, { sessionStorage, document, L, location:{ href:"map.html" }, I18n:{ t:key => key }, escapeHtml:value => String(value), navigate:path => { context.navigated = path; } });
window.innerWidth = 375;
vm.runInContext(mapSource, context, { filename:"app-campus-map.js" });
const mountCampusMapInteraction = vm.runInContext("mountCampusMapInteraction", context);
const openCampusBuildingDetail = vm.runInContext("openCampusBuildingDetail", context);
const getCampusBuildingReturnSource = vm.runInContext("getCampusBuildingReturnSource", context);
const controller = mountCampusMapInteraction(fakeMap, 6, { restoreState:false });
check("shared engine creates one polygon control per supported KMM object", controller.controls.size === 6);
const firstControl = controller.controls.get("KMM_B_TUTORAN_1");
firstControl.events = firstControl.polygon.events;
firstControl.events.get("click")({ originalEvent:{} });
check("polygon tap selects and highlights the building", controller.selectedBuildingId === "KMM_B_TUTORAN_1" && firstControl.polygon.styles.length > 0);
check("mobile selection uses the existing guide layout", mobileScrolls === 1);
check("map selection state is persisted", JSON.parse(storageValues.get("echowall_multicollege_map_state_v1")).campuses["6"].selectedBuildingId === "KMM_B_TUTORAN_1");
check("detail navigation records standalone map context", openCampusBuildingDetail(6,"KMM_B_TUTORAN_1","standalone") && getCampusBuildingReturnSource(6,"KMM_B_TUTORAN_1")?.context === "standalone");
check("standalone detail navigation targets the shared building route", context.location.href === "index.html#/org/6/building/KMM_B_TUTORAN_1");

console.log(`\n${passed}/${passed} assertions passed.`);
