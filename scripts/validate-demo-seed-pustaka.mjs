import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SNAPSHOT = path.join(REPO_ROOT, "data", "demo-seed-pustaka.v1.json");
const snapshotPath = path.resolve(process.argv[2] || DEFAULT_SNAPSHOT);

const EXPECTED = Object.freeze({
  snapshotVersion: 1,
  snapshotId: "demo-seed-pustaka.v1",
  seedPackageId: "echowall-demo-content-batch01-08",
  sourcePackageSha256: "8E9DAE085753CABED028ED0C3BF37D24B181458B32849FCBEFAA46B298449C04",
  seedBatchId: "batch02",
  baselineCreatedAt: "2026-07-26T00:00:00.000Z",
  noteCount: 42,
  startOrder: 43,
  endOrder: 84,
  contextType: "building",
  placeId: "B_PUSTAKA",
  wallKey: "building:B_PUSTAKA",
  authorModel: "static-demo-persona",
});

const EXPECTED_COUNTS = Object.freeze({
  language: { ms: 24, en: 13, zh: 5 },
  category: { campus_life: 13, academic: 25, emotional: 4 },
  shape: {
    rounded: 5,
    square: 5,
    rect: 4,
    circle: 4,
    envelope: 4,
    torn: 4,
    speech: 4,
    polaroid: 4,
    ticket: 4,
    hexagon: 4,
  },
  color: {
    "#BFDBFE": 6,
    "#FEF08A": 3,
    "#BBF7D0": 4,
    "#FBCFE8": 3,
    "#FED7AA": 4,
    "#FFF7ED": 4,
    "#E9D5FF": 5,
    "#CBD5E1": 5,
    "#CFFAFE": 5,
    "#FDE68A": 3,
  },
  rotation: { "-2": 9, "-1": 8, "0": 8, "1": 8, "2": 9 },
});

const EXPECTED_MEDIA = new Map([
  [2, ["pustaka-bag-rack-01.webp", "cover", 1.12]],
  [6, ["pustaka-notice-board-01.webp", "contain", 1]],
  [10, ["pustaka-silent-study-01.webp", "cover", 1.08]],
  [15, ["pustaka-study-checklist-01.webp", "contain", 1.03]],
  [20, ["pustaka-group-study-01.webp", "cover", 1.1]],
  [24, ["pustaka-group-summary-01.webp", "contain", 1]],
  [29, ["pustaka-book-shelf-01.webp", "cover", 1.12]],
  [35, ["pustaka-exam-revision-01.webp", "contain", 1.02]],
  [40, ["pustaka-library-cafe-break-01.webp", "cover", 1.1]],
]);

const ALLOWED_CATEGORIES = new Set(["academic", "koko", "campus_life", "emotional"]);
const ALLOWED_SHAPES = new Set(Object.keys(EXPECTED_COUNTS.shape));
const ALLOWED_COLORS = new Set(Object.keys(EXPECTED_COUNTS.color));
const ALLOWED_ROTATIONS = new Set([-2, -1, 0, 1, 2]);
const AUTH_FIELDS = ["email", "password", "passwordHash", "session", "role"];

const passed = [];
const failures = [];

function check(condition, label, evidence) {
  if (condition) {
    passed.push(label);
  } else {
    failures.push(evidence ? `${label}: ${evidence}` : label);
  }
}

function countBy(notes, field) {
  return notes.reduce((counts, note) => {
    const value = String(note[field]);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sameCounts(actual, expected) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read valid JSON from ${snapshotPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const notes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
const baselineMs = Date.parse(EXPECTED.baselineCreatedAt);

check(
  snapshot.snapshotVersion === EXPECTED.snapshotVersion
    && snapshot.snapshotId === EXPECTED.snapshotId
    && snapshot.seedPackageId === EXPECTED.seedPackageId
    && snapshot.sourcePackageSha256 === EXPECTED.sourcePackageSha256,
  "snapshot identity and source package hash",
);

check(
  snapshot.seedBatchId === EXPECTED.seedBatchId
    && snapshot.baselineCreatedAt === EXPECTED.baselineCreatedAt
    && snapshot.noteCount === EXPECTED.noteCount
    && snapshot.globalOrderRange?.start === EXPECTED.startOrder
    && snapshot.globalOrderRange?.end === EXPECTED.endOrder,
  "Batch02 metadata and global order range 43-84",
);

check(
  snapshot.authorModel === EXPECTED.authorModel,
  "persona model is static-demo-persona",
);

check(
  snapshot.wall?.contextType === EXPECTED.contextType
    && snapshot.wall?.placeId === EXPECTED.placeId
    && snapshot.wall?.wallKey === EXPECTED.wallKey
    && snapshot.wall?.batchId === null,
  "top-level B_PUSTAKA wall mapping",
);

check(notes.length === EXPECTED.noteCount, "exactly 42 notes", `found ${notes.length}`);

const keys = notes.map((note) => note.demoSeedKey);
check(new Set(keys).size === EXPECTED.noteCount, "42 unique demoSeedKey values");

const rowErrors = [];
const contentLengths = [];
let namedCount = 0;
let anonymousCount = 0;

notes.forEach((note, index) => {
  const noteNumber = index + 1;
  const suffix = String(noteNumber).padStart(3, "0");
  const expectedKey = `batch02|building:B_PUSTAKA|note${suffix}`;
  const expectedOrder = EXPECTED.startOrder + index;
  const expectedTime = new Date(baselineMs + (expectedOrder - 1) * 60_000).toISOString();
  const prefix = `note${suffix}`;

  if (note.demoSeedKey !== expectedKey) rowErrors.push(`${prefix} key`);
  if (Object.hasOwn(note, "id")) rowErrors.push(`${prefix} runtime id present`);
  if (note.schemaVersion !== 2 || note.seedPackageId !== EXPECTED.seedPackageId) {
    rowErrors.push(`${prefix} schema/package`);
  }
  if (note.seedBatchId !== EXPECTED.seedBatchId || note.seedGlobalOrder !== expectedOrder) {
    rowErrors.push(`${prefix} seed order`);
  }
  if (
    note.contextType !== EXPECTED.contextType
    || note.placeId !== EXPECTED.placeId
    || note.wallKey !== EXPECTED.wallKey
    || note.orgId !== null
    || note.batchId !== null
    || note.majorId !== null
  ) {
    rowErrors.push(`${prefix} wall mapping`);
  }
  if (note.authorUserId !== `demo_pustaka_${suffix}`) rowErrors.push(`${prefix} authorUserId`);
  if (AUTH_FIELDS.some((field) => Object.hasOwn(note, field))) rowErrors.push(`${prefix} auth field`);
  if (note.isAnonymous === true) {
    anonymousCount += 1;
    if (note.authorNickname !== null) rowErrors.push(`${prefix} anonymous nickname`);
  } else if (note.isAnonymous === false) {
    namedCount += 1;
    if (typeof note.authorNickname !== "string" || !note.authorNickname.trim()) {
      rowErrors.push(`${prefix} named nickname`);
    }
  } else {
    rowErrors.push(`${prefix} isAnonymous`);
  }
  if (note.isDemoSeed !== true) rowErrors.push(`${prefix} isDemoSeed`);
  if (!ALLOWED_CATEGORIES.has(note.category)) rowErrors.push(`${prefix} category`);
  if (!ALLOWED_SHAPES.has(note.shape)) rowErrors.push(`${prefix} shape`);
  if (!ALLOWED_COLORS.has(note.color)) rowErrors.push(`${prefix} color`);
  if (!ALLOWED_ROTATIONS.has(note.rotation)) rowErrors.push(`${prefix} rotation`);
  if (note.createdAt !== expectedTime) rowErrors.push(`${prefix} createdAt`);
  if (note.upvotes !== 0 || note.downvotes !== 0 || note.score !== 0 || note.userVote !== null) {
    rowErrors.push(`${prefix} votes`);
  }

  const contentLength = typeof note.content === "string" ? note.content.length : -1;
  contentLengths.push(contentLength);
  if (contentLength < 1 || contentLength > 500 || !note.content.trim()) {
    rowErrors.push(`${prefix} content length`);
  }

  if (note.imageUrl !== "" || note.imageDataUrl !== "" || note.imagePublicId !== "") {
    rowErrors.push(`${prefix} image payload`);
  }

  const media = EXPECTED_MEDIA.get(noteNumber);
  if (media) {
    if (
      note.mediaRef !== media[0]
      || note.imageName !== media[0]
      || note.imageFit !== media[1]
      || note.imageCropScale !== media[2]
    ) {
      rowErrors.push(`${prefix} media plan`);
    }
  } else if (
    note.mediaRef !== ""
    || note.imageName !== ""
    || note.imageFit !== ""
    || note.imageCropScale !== null
  ) {
    rowErrors.push(`${prefix} unexpected media plan`);
  }
});

check(rowErrors.length === 0, "per-note schema, key, wall, author, time, vote and image rules", rowErrors.join(", "));
check(namedCount === 23 && anonymousCount === 19, "author and anonymous counts 23/19");
check(
  new Set(notes.map((note) => note.authorUserId)).size === EXPECTED.noteCount,
  "42 unique static author IDs",
);
check(
  sameCounts(countBy(notes, "language"), EXPECTED_COUNTS.language),
  "language distribution ms/en/zh = 24/13/5",
);
check(
  sameCounts(countBy(notes, "category"), EXPECTED_COUNTS.category),
  "category distribution and accepted values",
);
check(
  sameCounts(countBy(notes, "shape"), EXPECTED_COUNTS.shape),
  "all 10 shapes with source distribution",
);
check(
  sameCounts(countBy(notes, "color"), EXPECTED_COUNTS.color),
  "all 10 colors with source distribution",
);
check(
  sameCounts(countBy(notes, "rotation"), EXPECTED_COUNTS.rotation),
  "rotation values and source distribution",
);
check(
  notes.filter((note) => note.mediaRef).length === EXPECTED_MEDIA.size,
  "9 media plans and no image payloads",
);

const minimumLength = contentLengths.length ? Math.min(...contentLengths) : 0;
const maximumLength = contentLengths.length ? Math.max(...contentLengths) : 0;
check(
  minimumLength === 34 && maximumLength === 167,
  "content length range 34-167 characters",
  `found ${minimumLength}-${maximumLength}`,
);

console.log("EchoWall Batch02 B_PUSTAKA demo seed dry-run");
console.log(`Snapshot: ${path.relative(REPO_ROOT, snapshotPath).replaceAll("\\", "/")}`);
console.log("Mode: read-only validation; no runtime IDs, imports, users or LocalStorage writes");
console.log(`Notes: ${notes.length}`);
console.log(`Keys: ${new Set(keys).size} unique`);
console.log(`Authors: ${namedCount} named, ${anonymousCount} anonymous, ${new Set(notes.map((note) => note.authorUserId)).size} static IDs`);
console.log(`Global order: ${notes[0]?.seedGlobalOrder ?? "-"}-${notes.at(-1)?.seedGlobalOrder ?? "-"}`);
console.log(`CreatedAt: ${notes[0]?.createdAt ?? "-"} to ${notes.at(-1)?.createdAt ?? "-"}`);
console.log(`Media plans: ${notes.filter((note) => note.mediaRef).length}; non-empty image payloads: ${notes.filter((note) => note.imageUrl || note.imageDataUrl || note.imagePublicId).length}`);
console.log(`Content length: ${minimumLength}-${maximumLength} characters`);
console.log(`Checks: ${passed.length} passed, ${failures.length} failed`);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log("RESULT: PASS");
}
