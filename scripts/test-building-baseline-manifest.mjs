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

const appDataSource = read("app-data.js");
const sourceMatch = appDataSource.match(/const SEED_BUILDING_NOTES = (\[[\s\S]*?\n\]);/);
assert.ok(sourceMatch, "SEED_BUILDING_NOTES source array is readable");
const sourceContext = {};
vm.runInNewContext(`result = ${sourceMatch[1]}`, sourceContext);
const baselineSource = JSON.parse(JSON.stringify(sourceContext.result));

const buildingContext = { window: {} };
vm.runInNewContext(read("data/campus-buildings.js"), buildingContext);
const stableBuildingIds = new Set(buildingContext.window.CAMPUS_BUILDINGS.map(building => building.id));

const manifest = JSON.parse(read("production-launch/building-baseline-import.proposed.json"));
check("manifest is explicitly proposal-only", manifest.status === "proposal_only_not_applied");
check("manifest contains exactly the five default Building Wall notes", manifest.candidate_count === 5 && manifest.posts.length === 5 && baselineSource.length === 5);
check("every candidate has a stable registered building_id", manifest.posts.every(post => stableBuildingIds.has(post.building_id)));
check("dedupe seed keys are deterministic and unique", new Set(manifest.posts.map(post => post.seed_key)).size === 5 && manifest.posts.every(post => post.seed_key === `canonical-building-baseline:v1:${post.building_id}:${post.legacy_id}`));

for (const candidate of manifest.posts) {
  const source = baselineSource.find(note => note.id === candidate.legacy_id);
  check(`candidate ${candidate.legacy_id} maps to its exact source note`, Boolean(source));
  check(`candidate ${candidate.legacy_id} preserves content and visual fields`, candidate.content === source.content
    && candidate.category === source.category
    && candidate.shape === source.shape
    && candidate.color === source.color
    && candidate.rotation === source.rotation
    && candidate.position_x === source.positionX
    && candidate.position_y === source.positionY);
  check(`candidate ${candidate.legacy_id} preserves author mode and created_at`, candidate.display_author_mode === (source.isAnonymous ? "anonymous" : "named")
    && candidate.author_display_name === (source.isAnonymous ? null : source.authorNickname)
    && candidate.created_at === source.createdAt);
  check(`candidate ${candidate.legacy_id} preserves score as internal baseline only`, candidate.score_baseline === source.score && candidate.seed_base_score === source.score);
  check(`candidate ${candidate.legacy_id} does not fabricate media or a Map anchor`, candidate.media === null && candidate.map_anchor_required === false && candidate.map_coordinates === null);
}

const demoContext = { window: {} };
vm.runInNewContext(read("data/demo-seed-bundle.v1.js"), demoContext);
const bundle = demoContext.window.ECHO_WALL_DEMO_SEED_BUNDLE;
const bundleBuildingNotes = bundle.notes.filter(note => note.wallKey.startsWith("building:"));
const bundleBuildingCounts = new Map();
bundleBuildingNotes.forEach(note => bundleBuildingCounts.set(note.wallKey, (bundleBuildingCounts.get(note.wallKey) || 0) + 1));
check("legacy portable bundle is identified as 696 total notes", bundle.noteCount === 696 && bundle.notes.length === 696);
check("legacy portable bundle has 210 Building demo notes", bundleBuildingNotes.length === 210);
check("legacy Building demo inventory is five batches of 42", bundleBuildingCounts.size === 5 && [...bundleBuildingCounts.values()].every(count => count === 42));
check("legacy Building batches remain excluded from the import manifest", bundleBuildingNotes.every(note => !manifest.posts.some(candidate => candidate.legacy_id === note.id)));
check("legacy Building batches contain plans but no actual note-image payload", bundleBuildingNotes.some(note => note.mediaRef) && bundleBuildingNotes.every(note => !note.imageUrl && !note.imageDataUrl && !note.imagePublicId));
check("manifest has no database execution or credential material", !/(insert|update|delete)\s+into|service_role|password/i.test(read("production-launch/building-baseline-import.proposed.json")));

console.log(`\n${passed}/${passed} assertions passed.`);
