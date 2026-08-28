import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SEED_PATH = path.join(REPO_ROOT, "data", "echo-wall-kmk-community-seed.v1.json");
const QUOTAS = Object.freeze({
  2: Object.freeze({
    ms: Object.freeze({ anonymous: 7, named: 8 }),
    en: Object.freeze({ anonymous: 3, named: 4 }),
    zh: Object.freeze({ anonymous: 1, named: 2 }),
  }),
  3: Object.freeze({
    ms: Object.freeze({ anonymous: 3, named: 3 }),
    en: Object.freeze({ anonymous: 1, named: 2 }),
    zh: Object.freeze({ anonymous: 0, named: 1 }),
  }),
});

const snapshot = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
const sourceOrder = new Map(snapshot.notes.map((note, index) => [note.demoSeedKey, index]));

function qualityScore(note) {
  const completeContent = String(note.content || "").trim().length >= 20;
  const mediaFields = ["imageUrl", "imageDataUrl", "imagePublicId", "mediaRef", "imageName"];
  const hasNoMediaReference = mediaFields.every((field) => !String(note[field] || "").trim());
  return Number(completeContent) * 2 + Number(hasNoMediaReference);
}

function selectStratum(majorId, language, identity, count) {
  const candidates = snapshot.notes
    .filter((note) => (
      Number(note.orgId) === 1
      && Number(note.majorId) === majorId
      && note.language === language
      && (note.isAnonymous ? "anonymous" : "named") === identity
    ))
    .sort((left, right) => (
      qualityScore(right) - qualityScore(left)
      || left.demoSeedKey.localeCompare(right.demoSeedKey)
    ));
  if (candidates.length < count) {
    throw new Error(`Not enough ${language}/${identity} notes for KMK major ${majorId}.`);
  }
  return candidates.slice(0, count);
}

const retainedKeys = new Set(
  snapshot.notes
    .filter((note) => Number(note.orgId) === 1 && Number(note.majorId) === 1)
    .map((note) => note.demoSeedKey),
);
for (const majorId of [2, 3]) {
  for (const language of ["ms", "en", "zh"]) {
    for (const identity of ["anonymous", "named"]) {
      for (const note of selectStratum(majorId, language, identity, QUOTAS[majorId][language][identity])) {
        retainedKeys.add(note.demoSeedKey);
      }
    }
  }
}

const notes = snapshot.notes
  .filter((note) => retainedKeys.has(note.demoSeedKey))
  .sort((left, right) => sourceOrder.get(left.demoSeedKey) - sourceOrder.get(right.demoSeedKey));
const uniqueKeys = new Set(notes.map((note) => note.demoSeedKey));
const wallCounts = Object.fromEntries(
  [1, 2, 3].map((majorId) => [
    `community:1:${majorId}`,
    notes.filter((note) => Number(note.majorId) === majorId).length,
  ]),
);
if (notes.length !== 108 || uniqueKeys.size !== 108 || Object.values(wallCounts).join("/") !== "73/25/10") {
  throw new Error("Reduced KMK seed must contain 108 unique notes with wall counts 73/25/10.");
}

snapshot.expected = {
  ...snapshot.expected,
  walls: 3,
  notes: 108,
  named: notes.filter((note) => !note.isAnonymous).length,
  anonymous: notes.filter((note) => note.isAnonymous).length,
  languages: Object.fromEntries(
    ["ms", "en", "zh"].map((language) => [language, notes.filter((note) => note.language === language).length]),
  ),
  wallCounts,
};
snapshot.notes = notes;
await fs.writeFile(SEED_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Reduced ${path.relative(REPO_ROOT, SEED_PATH)} to ${notes.length} notes.`);
console.log(`KMK major walls: ${Object.values(wallCounts).join("/")}`);
