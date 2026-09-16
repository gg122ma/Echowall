#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(ROOT, "data", "campus-buildings.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename:"data/campus-buildings.js" });

const buildings = context.window.CAMPUS_BUILDINGS;
const configuredPaths = new Set();
let configuredCount = 0;

for (const building of buildings) {
  const rawPhotos = Array.isArray(building.photos) ? building.photos : [];
  const photos = context.window.getCampusBuildingPhotos(building);
  assert.equal(photos.length, rawPhotos.length, `${building.id} has an invalid photo record`);
  photos.forEach((photo, index) => {
    assert.match(photo.src, /\.(?:jpe?g|png|webp)$/i, `${building.id} photo ${index + 1} uses a supported file type`);
    assert.ok(photo.alt, `${building.id} photo ${index + 1} has meaningful alt text`);
    assert.ok(!configuredPaths.has(photo.src), `photo path is configured only once: ${photo.src}`);
    configuredPaths.add(photo.src);
    assert.ok(fs.statSync(path.join(ROOT, photo.src)).isFile(), `configured photo exists: ${photo.src}`);
    configuredCount += 1;
  });
}

const walk = directory => fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => {
  const fullPath = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(fullPath) : [fullPath];
});
const assetRoot = path.join(ROOT, "assets", "buildings");
const productionAssets = walk(assetRoot)
  .filter(file => /\.(?:jpe?g|png|webp)$/i.test(file))
  .map(file => path.relative(ROOT, file).replaceAll("\\", "/"));
const orphanedAssets = productionAssets.filter(file => !configuredPaths.has(file));

assert.deepEqual(orphanedAssets, [], `unconfigured Building photo assets: ${orphanedAssets.join(", ")}`);
assert.equal(productionAssets.length, configuredCount, "every production Building photo is configured exactly once");

const withPhotos = buildings.filter(building => context.window.getCampusBuildingPhotos(building).length > 0);
console.log(`PASS - ${configuredCount} configured Building photos exist and use supported file types`);
console.log(`PASS - ${withPhotos.length} buildings have photos; ${buildings.length - withPhotos.length} retain the no-photo fallback`);
console.log("PASS - no duplicate mappings or orphaned Building photo assets");
