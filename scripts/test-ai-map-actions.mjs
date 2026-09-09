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

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
const window = { location: { href: "index.html" }, sessionStorage: storage };
window.window = window;
const context = { window, sessionStorage: storage, console, Map, Set, Object, Number, String, Date, Math, JSON };
vm.createContext(context);
vm.runInContext(read("data/campus-buildings.js"), context, { filename: "data/campus-buildings.js" });
vm.runInContext(read("services/ai/map-action.js"), context, { filename: "services/ai/map-action.js" });

const libraryAction = { type: "OPEN_MAP", placeId: "library", buildingId: "B_PUSTAKA" };
check("known Map building validates in the destination document", window.EchoAI.MapAction.validate(libraryAction));
check("unknown building action is rejected", !window.EchoAI.MapAction.validate({ ...libraryAction, buildingId: "B_UNKNOWN" }));
check("arbitrary action type is rejected", !window.EchoAI.MapAction.validate({ ...libraryAction, type: "OPEN_URL" }));
check("missing action fields are rejected", !window.EchoAI.MapAction.validate({ type: "OPEN_MAP" }));
check("executing a valid action writes a pending focus request", window.EchoAI.MapAction.execute(libraryAction));
check("valid action navigates to the existing map.html", window.location.href === "map.html");
check("fresh pending action round-trips", window.EchoAI.MapAction.readPending()?.buildingId === "B_PUSTAKA");
window.EchoAI.MapAction.clearPending();
check("pending action can be consumed exactly once", window.EchoAI.MapAction.readPending() === null);

values.set(window.EchoAI.MapAction.STORAGE_KEY, JSON.stringify({ version: 1, createdAt: Date.now() - 600000, placeId: "library", buildingId: "B_PUSTAKA" }));
check("stale pending action is rejected", window.EchoAI.MapAction.readPending() === null);
values.set(window.EchoAI.MapAction.STORAGE_KEY, "not-json");
check("malformed pending action is rejected safely", window.EchoAI.MapAction.readPending() === null);

const mapSource = read("echomap.js");
const mapHtml = read("map.html");
check("Echo Map loads the shared validated action module", /services\/ai\/map-action\.js/.test(mapHtml));
check("AI handoff reuses the existing footprint selection", /applyPendingAIMapAction[\s\S]*selectBuildingFootprint\(action\.buildingId/.test(mapSource));
check("AI handoff reuses existing map focus behavior", /applyPendingAIMapAction[\s\S]*focusBuildingTarget\(building\)/.test(mapSource));
check("AI handoff consumes pending state before restoring old return state", /if \(!applyPendingAIMapAction\(\)\) restoreMapReturnSnapshot\(\)/.test(mapSource));
check("existing Building-to-Map return snapshot remains implemented", /saveMapReturnSnapshot[\s\S]*restoreMapReturnSnapshot/.test(mapSource));
check("existing place-detail return source remains implemented", /setPlaceReturnSource\("map", building\.id\)/.test(mapSource));

console.log(`\n${passed}/${passed} assertions passed.`);
