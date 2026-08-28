import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SHOWCASE_PATH = path.join(REPO_ROOT, "data", "demo-seed-showcase.v1.json");
const KMK_PATH = path.join(REPO_ROOT, "data", "echo-wall-kmk-community-seed.v1.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "demo-seed-bundle.v1.js");

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));
const isLegacyKmkNote = (note) => note?.contextType === "community"
  && Number(note.orgId) === 1
  && [1, 2, 3].includes(Number(note.majorId));

const showcase = await readJson(SHOWCASE_PATH);
const kmk = await readJson(KMK_PATH);
const mergedByKey = new Map();
for (const note of [...showcase.notes.filter((note) => !isLegacyKmkNote(note)), ...kmk.notes]) {
  if (!note?.demoSeedKey) throw new Error("Every bundled note must have a demoSeedKey.");
  mergedByKey.set(note.demoSeedKey, note);
}
const notes = [...mergedByKey.values()];
const wallCounts = new Map();
for (const note of notes) wallCounts.set(note.wallKey, (wallCounts.get(note.wallKey) || 0) + 1);
const retainedWalls = showcase.walls.filter((wall) => wallCounts.has(wall.wallKey));
const retainedWallKeys = new Set(retainedWalls.map((wall) => wall.wallKey));
const addedWalls = [...wallCounts.entries()].filter(([key]) => !retainedWallKeys.has(key)).map(([wallKey, noteCount]) => {
  const sample = notes.find((note) => note.wallKey === wallKey);
  return {
    seedBatchId: sample.seedBatchId,
    name: `KMK Community · Major ${sample.majorId}`,
    contextType: "community",
    orgId: sample.orgId,
    batchId: null,
    majorId: sample.majorId,
    placeId: "",
    wallKey,
    internalArea: "",
    noteCount,
  };
});
const walls = [...retainedWalls, ...addedWalls].map((wall) => ({ ...wall, noteCount: wallCounts.get(wall.wallKey) }));
const bundle = {
  snapshotVersion: 1,
  snapshotId: "demo-seed-bundle.v1",
  seedPackageId: "echowall-portable-demo-v1",
  sourceSnapshotIds: [showcase.snapshotId, kmk.seedPackageId],
  wallCount: walls.length,
  noteCount: notes.length,
  walls,
  notes,
};
await fs.writeFile(OUTPUT_PATH, `window.ECHO_WALL_DEMO_SEED_BUNDLE = ${JSON.stringify(bundle, null, 2)};\n`, "utf8");
const counts = [1, 2, 3].map((majorId) => notes.filter((note) => Number(note.orgId) === 1 && Number(note.majorId) === majorId).length);
console.log(`Built ${path.relative(REPO_ROOT, OUTPUT_PATH)} with ${notes.length} notes across ${walls.length} walls.`);
console.log(`KMK major walls: ${counts.join("/")}`);
