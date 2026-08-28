import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SNAPSHOT = path.join(REPO_ROOT, "data", "demo-seed-showcase.v1.json");
const snapshotPath = path.resolve(process.argv[2] || DEFAULT_SNAPSHOT);

const EXPECTED = Object.freeze({
  snapshotVersion: 1,
  snapshotId: "demo-seed-showcase.v1",
  seedPackageId: "echowall-demo-content-batch01-08",
  sourcePackageSha256: "8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04",
  baselineCreatedAt: "2026-07-26T00:00:00.000Z",
  ledgerKey: "echo-wall-demo-seed-ledger:v1",
  authorModel: "static-demo-persona",
  wallCount: 14,
  noteCount: 588,
  personaCount: 444,
  mediaPlanCount: 117,
});

const EXPECTED_HASHES = Object.freeze({
  walls: "EEA3266814E4649ED0D9B65050F580627970435FD8C344EAD515C8526C7FC095",
  personas: "823A78E92AF45BA42984CF2385D05A62BB58F227FEDD0498C3AA1A86AFE4C88A",
  mediaPlans: "CD6292271793CFA97246D7BDE7D59FE720C11CA92C9DE01474841AA5B55B4E7E",
  notes: "8F15966A814DAB81146FD0BC2A0145D219F18DCF8A08DA92EC81AB40BBED832D",
});

const WALLS = Object.freeze([
  { seedBatchId: "batch01", contextType: "building", orgId: null, majorId: null, placeId: "B_SERI_JERAI", wallKey: "building:B_SERI_JERAI", start: 1, end: 42, media: 9, internalArea: "CUBIC" },
  { seedBatchId: "batch02", contextType: "building", orgId: null, majorId: null, placeId: "B_PUSTAKA", wallKey: "building:B_PUSTAKA", start: 43, end: 84, media: 9 },
  { seedBatchId: "batch03", contextType: "building", orgId: null, majorId: null, placeId: "B_DEWAN_KULIAH", wallKey: "building:B_DEWAN_KULIAH", start: 85, end: 126, media: 9 },
  { seedBatchId: "batch04", contextType: "building", orgId: null, majorId: null, placeId: "B_LANGKASUKA", wallKey: "building:B_LANGKASUKA", start: 127, end: 168, media: 9 },
  { seedBatchId: "batch05", contextType: "building", orgId: null, majorId: null, placeId: "B_BLOK_TUTORAN_MAKMAL", wallKey: "building:B_BLOK_TUTORAN_MAKMAL", start: 169, end: 210, media: 9 },
  { seedBatchId: "batch06", contextType: "community", orgId: 2, majorId: 4, placeId: "", wallKey: "community:2:4", start: 211, end: 252, media: 8 },
  { seedBatchId: "batch06", contextType: "community", orgId: 2, majorId: 5, placeId: "", wallKey: "community:2:5", start: 253, end: 294, media: 8 },
  { seedBatchId: "batch06", contextType: "community", orgId: 2, majorId: 6, placeId: "", wallKey: "community:2:6", start: 295, end: 336, media: 8 },
  { seedBatchId: "batch06", contextType: "community", orgId: 2, majorId: 7, placeId: "", wallKey: "community:2:7", start: 337, end: 378, media: 8 },
  { seedBatchId: "batch07", contextType: "community", orgId: 3, majorId: 8, placeId: "", wallKey: "community:3:8", start: 379, end: 420, media: 8 },
  { seedBatchId: "batch07", contextType: "community", orgId: 3, majorId: 9, placeId: "", wallKey: "community:3:9", start: 421, end: 462, media: 8 },
  { seedBatchId: "batch08", contextType: "community", orgId: 4, majorId: 10, placeId: "", wallKey: "community:4:10", start: 463, end: 504, media: 8 },
  { seedBatchId: "batch08", contextType: "community", orgId: 4, majorId: 11, placeId: "", wallKey: "community:4:11", start: 505, end: 546, media: 8 },
  { seedBatchId: "batch08", contextType: "community", orgId: 4, majorId: 12, placeId: "", wallKey: "community:4:12", start: 547, end: 588, media: 8 },
]);

const ALLOWED = Object.freeze({
  languages: new Set(["ms", "en", "zh"]),
  categories: new Set(["academic", "koko", "campus_life", "emotional"]),
  shapes: new Set(["rounded", "square", "rect", "circle", "envelope", "torn", "speech", "polaroid", "ticket", "hexagon"]),
  colors: new Set(["#BFDBFE", "#FEF08A", "#BBF7D0", "#FBCFE8", "#FED7AA", "#FFF7ED", "#E9D5FF", "#CBD5E1", "#CFFAFE", "#FDE68A"]),
  rotations: new Set([-2, -1, 0, 1, 2]),
  imageFits: new Set(["cover", "contain"]),
});

const AUTH_FIELDS = ["email", "password", "passwordHash", "session", "role"];
const passed = [];
const failures = [];

function check(condition, label, evidence = "") {
  if (condition) passed.push(label);
  else failures.push(evidence ? `${label}: ${evidence}` : label);
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").toUpperCase();
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = String(item[field]);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read valid JSON from ${snapshotPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const walls = Array.isArray(snapshot.walls) ? snapshot.walls : [];
const notes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
const personas = Array.isArray(snapshot.personas) ? snapshot.personas : [];
const mediaPlans = Array.isArray(snapshot.mediaPlans) ? snapshot.mediaPlans : [];
const baselineMs = Date.parse(EXPECTED.baselineCreatedAt);

check(
  snapshot.snapshotVersion === EXPECTED.snapshotVersion
    && snapshot.snapshotId === EXPECTED.snapshotId
    && snapshot.seedPackageId === EXPECTED.seedPackageId
    && snapshot.sourcePackageSha256 === EXPECTED.sourcePackageSha256,
  "snapshot identity and package hash",
);
check(
  snapshot.baselineCreatedAt === EXPECTED.baselineCreatedAt
    && snapshot.ledgerKey === EXPECTED.ledgerKey
    && snapshot.authorModel === EXPECTED.authorModel,
  "frozen baseline, ledger key and static persona model",
);
check(
  Array.isArray(snapshot.sourceEntries)
    && snapshot.sourceEntries.length === 8
    && snapshot.sourceEntries.every((entry, index) => entry.endsWith(`Batch0${index + 1}.md`)),
  "eight ordered Batch01-08 Markdown source entries",
);
check(
  snapshot.wallCount === EXPECTED.wallCount
    && snapshot.noteCount === EXPECTED.noteCount
    && snapshot.personaCount === EXPECTED.personaCount
    && snapshot.mediaPlanCount === EXPECTED.mediaPlanCount,
  "declared totals 14/588/444/117",
);
check(
  walls.length === EXPECTED.wallCount
    && notes.length === EXPECTED.noteCount
    && personas.length === EXPECTED.personaCount
    && mediaPlans.length === EXPECTED.mediaPlanCount,
  "collection totals 14/588/444/117",
);
check(
  hash(walls) === EXPECTED_HASHES.walls
    && hash(personas) === EXPECTED_HASHES.personas
    && hash(mediaPlans) === EXPECTED_HASHES.mediaPlans
    && hash(notes) === EXPECTED_HASHES.notes,
  "frozen wall, persona, media and note collection hashes",
);

const wallErrors = [];
const rowErrors = [];
const wallSummaries = [];
const noteKeys = new Set();
const contentValues = new Set();
const authorUsage = new Map();
const mediaByKey = new Map(mediaPlans.map((plan) => [plan.demoSeedKey, plan]));

WALLS.forEach((expectedWall, wallIndex) => {
  const wall = walls[wallIndex];
  if (
    !wall
    || wall.seedBatchId !== expectedWall.seedBatchId
    || wall.contextType !== expectedWall.contextType
    || wall.orgId !== expectedWall.orgId
    || wall.batchId !== null
    || wall.majorId !== expectedWall.majorId
    || wall.placeId !== expectedWall.placeId
    || wall.wallKey !== expectedWall.wallKey
    || wall.noteCount !== 42
    || wall.globalOrderRange?.start !== expectedWall.start
    || wall.globalOrderRange?.end !== expectedWall.end
    || (expectedWall.internalArea ? wall.internalArea !== expectedWall.internalArea : Object.hasOwn(wall, "internalArea"))
  ) {
    wallErrors.push(expectedWall.wallKey);
  }

  const wallNotes = notes.slice(expectedWall.start - 1, expectedWall.end);
  const named = wallNotes.filter((note) => note.isAnonymous === false).length;
  const anonymous = wallNotes.filter((note) => note.isAnonymous === true).length;
  const media = wallNotes.filter((note) => note.mediaRef).length;
  const languageCounts = countBy(wallNotes, "language");
  const wallAuthorCount = new Set(wallNotes.map((note) => note.authorUserId)).size;

  if (
    wallNotes.length !== 42
    || wallNotes.some((note) => note.wallKey !== expectedWall.wallKey)
    || named !== 23
    || anonymous !== 19
    || media !== expectedWall.media
    || wallAuthorCount !== 42
    || languageCounts.ms !== 24
    || languageCounts.en !== 13
    || languageCounts.zh !== 5
  ) {
    wallErrors.push(`${expectedWall.wallKey} distribution`);
  }
  wallSummaries.push({ wallKey: expectedWall.wallKey, notes: wallNotes.length, named, anonymous, media });
});

check(wallErrors.length === 0, "14 wall mappings, ranges and per-wall distributions", wallErrors.join(", "));

notes.forEach((note, index) => {
  const expectedOrder = index + 1;
  const wall = WALLS.find((candidate) => expectedOrder >= candidate.start && expectedOrder <= candidate.end);
  const localNumber = expectedOrder - wall.start + 1;
  const suffix = String(localNumber).padStart(3, "0");
  const expectedKey = `${wall.seedBatchId}|${wall.wallKey}|note${suffix}`;
  const expectedTime = new Date(baselineMs + index * 60_000).toISOString();
  const prefix = `order${String(expectedOrder).padStart(3, "0")}`;

  if (note.demoSeedKey !== expectedKey) rowErrors.push(`${prefix} key`);
  if (noteKeys.has(note.demoSeedKey)) rowErrors.push(`${prefix} duplicate key`);
  noteKeys.add(note.demoSeedKey);
  if (Object.hasOwn(note, "id")) rowErrors.push(`${prefix} numeric id`);
  if (AUTH_FIELDS.some((field) => Object.hasOwn(note, field))) rowErrors.push(`${prefix} auth field`);
  if (
    note.schemaVersion !== 2
    || note.seedPackageId !== EXPECTED.seedPackageId
    || note.seedBatchId !== wall.seedBatchId
    || note.seedGlobalOrder !== expectedOrder
    || note.contextType !== wall.contextType
    || note.orgId !== wall.orgId
    || note.batchId !== null
    || note.majorId !== wall.majorId
    || note.placeId !== wall.placeId
    || note.wallKey !== wall.wallKey
  ) {
    rowErrors.push(`${prefix} schema/wall`);
  }
  if (wall.internalArea) {
    if (note.internalArea !== "CUBIC") rowErrors.push(`${prefix} CUBIC`);
  } else if (Object.hasOwn(note, "internalArea")) {
    rowErrors.push(`${prefix} unexpected internalArea`);
  }
  if (!ALLOWED.languages.has(note.language)) rowErrors.push(`${prefix} language`);
  if (!ALLOWED.categories.has(note.category)) rowErrors.push(`${prefix} category`);
  if (!ALLOWED.shapes.has(note.shape)) rowErrors.push(`${prefix} shape`);
  if (!ALLOWED.colors.has(note.color)) rowErrors.push(`${prefix} color`);
  const isRotationException = note.demoSeedKey === "batch01|building:B_SERI_JERAI|note006" && note.rotation === 2.5;
  if (!isRotationException && !ALLOWED.rotations.has(note.rotation)) rowErrors.push(`${prefix} rotation`);
  if (note.createdAt !== expectedTime) rowErrors.push(`${prefix} createdAt`);
  if (note.isDemoSeed !== true) rowErrors.push(`${prefix} isDemoSeed`);
  if (note.upvotes !== 0 || note.downvotes !== 0 || note.score !== 0 || note.userVote !== null) rowErrors.push(`${prefix} votes`);
  if (note.imageUrl !== "" || note.imageDataUrl !== "" || note.imagePublicId !== "") rowErrors.push(`${prefix} image payload`);

  const persona = personas.find((candidate) => candidate.personaId === note.authorUserId);
  if (!persona) rowErrors.push(`${prefix} persona`);
  if (note.isAnonymous === true) {
    if (note.authorNickname !== null) rowErrors.push(`${prefix} anonymous nickname`);
  } else if (
    note.isAnonymous !== false
    || typeof note.authorNickname !== "string"
    || !note.authorNickname.trim()
    || persona?.displayName !== note.authorNickname
  ) {
    rowErrors.push(`${prefix} named author`);
  }
  authorUsage.set(note.authorUserId, (authorUsage.get(note.authorUserId) || 0) + 1);

  if (typeof note.content !== "string" || !note.content.trim() || note.content.length > 500) rowErrors.push(`${prefix} content`);
  if (contentValues.has(note.content)) rowErrors.push(`${prefix} duplicate content`);
  contentValues.add(note.content);

  const media = mediaByKey.get(note.demoSeedKey);
  if (note.mediaRef) {
    if (
      !media
      || note.mediaRef !== note.imageName
      || media.mediaRef !== note.mediaRef
      || media.imageName !== note.imageName
      || media.fit !== note.imageFit
      || media.cropScale !== note.imageCropScale
      || !ALLOWED.imageFits.has(note.imageFit)
      || !Number.isFinite(note.imageCropScale)
      || note.imageCropScale < 1
      || note.imageCropScale > 1.8
    ) {
      rowErrors.push(`${prefix} media plan`);
    }
  } else if (
    media
    || note.imageName !== ""
    || note.imageFit !== ""
    || note.imageCropScale !== null
  ) {
    rowErrors.push(`${prefix} unexpected media plan`);
  }
});

check(rowErrors.length === 0, "588 note keys, mappings, authors, anonymous rules, visuals, time, body, votes and empty images", rowErrors.slice(0, 30).join(", "));
check(noteKeys.size === EXPECTED.noteCount, "588 unique demoSeedKey values");
check(contentValues.size === EXPECTED.noteCount, "588 unique non-empty note bodies");

const personaErrors = [];
const personaIds = new Set();
personas.forEach((persona) => {
  if (personaIds.has(persona.personaId)) personaErrors.push(`${persona.personaId} duplicate`);
  personaIds.add(persona.personaId);
  if (
    typeof persona.personaId !== "string"
    || !persona.personaId.startsWith("demo_")
    || persona.isDemoPersona !== true
    || persona.authorModel !== EXPECTED.authorModel
    || !Array.isArray(persona.sourceSeedBatchIds)
    || persona.sourceSeedBatchIds.length !== 1
    || persona.usageCount !== authorUsage.get(persona.personaId)
    || AUTH_FIELDS.some((field) => Object.hasOwn(persona, field))
  ) {
    personaErrors.push(persona.personaId);
  }
});
check(personaErrors.length === 0 && personaIds.size === EXPECTED.personaCount, "444 unique static personas with exact usage and no Auth fields", personaErrors.slice(0, 20).join(", "));

const mediaErrors = [];
const mediaKeys = new Set();
mediaPlans.forEach((plan) => {
  if (mediaKeys.has(plan.demoSeedKey)) mediaErrors.push(`${plan.demoSeedKey} duplicate`);
  mediaKeys.add(plan.demoSeedKey);
  if (
    typeof plan.mediaRef !== "string"
    || !plan.mediaRef.endsWith(".webp")
    || plan.imageName !== plan.mediaRef
    || !ALLOWED.imageFits.has(plan.fit)
    || !Number.isFinite(plan.cropScale)
    || plan.cropScale < 1
    || plan.cropScale > 1.8
  ) {
    mediaErrors.push(plan.demoSeedKey);
  }
});
check(mediaErrors.length === 0 && mediaKeys.size === EXPECTED.mediaPlanCount, "117 unique media plans with fit/cropScale only", mediaErrors.slice(0, 20).join(", "));

const specialRotation = notes.find((note) => note.demoSeedKey === "batch01|building:B_SERI_JERAI|note006");
check(
  specialRotation?.rotation === 2.5
    && notes.filter((note) => note.internalArea === "CUBIC").length === 42,
  "Batch01 note006 rotation 2.5 and all CUBIC notes mapped to B_SERI_JERAI",
);
check(
  notes.every((note) => note.batchId === null)
    && notes.filter((note) => note.contextType === "community").length === 378,
  "all note batchId values are null, including 378 community notes",
);

const contentLengths = notes.map((note) => note.content.length);
const namedCount = notes.filter((note) => note.isAnonymous === false).length;
const anonymousCount = notes.filter((note) => note.isAnonymous === true).length;
const minimumLength = Math.min(...contentLengths);
const maximumLength = Math.max(...contentLengths);

console.log("EchoWall Batch01-08 full showcase demo seed dry-run");
console.log(`Snapshot: ${path.relative(REPO_ROOT, snapshotPath).replaceAll("\\", "/")}`);
console.log("Mode: static validation only; no runtime IDs, imports, Auth users or LocalStorage writes");
console.log(`Walls: ${walls.length}; notes: ${notes.length}; notes per wall: ${wallSummaries.every((item) => item.notes === 42) ? 42 : "invalid"}`);
console.log(`Keys: ${noteKeys.size} unique`);
console.log(`Personas: ${personaIds.size} unique static authors; named notes: ${namedCount}; anonymous notes: ${anonymousCount}`);
console.log(`Media plans: ${mediaPlans.length}; non-empty image payloads: ${notes.filter((note) => note.imageUrl || note.imageDataUrl || note.imagePublicId).length}`);
console.log(`Global order: ${notes[0]?.seedGlobalOrder ?? "-"}-${notes.at(-1)?.seedGlobalOrder ?? "-"}`);
console.log(`CreatedAt: ${notes[0]?.createdAt ?? "-"} to ${notes.at(-1)?.createdAt ?? "-"}`);
console.log(`Content length: ${minimumLength}-${maximumLength} characters; unique bodies: ${contentValues.size}`);
console.log(`Checks: ${passed.length} passed, ${failures.length} failed`);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log("RESULT: PASS");
}
