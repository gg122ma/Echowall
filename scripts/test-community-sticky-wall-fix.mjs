#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLORS = Object.freeze([
  "#BFDBFE", "#FEF08A", "#BBF7D0", "#FBCFE8", "#FED7AA",
  "#FFF7ED", "#E9D5FF", "#CBD5E1", "#CFFAFE", "#FDE68A",
]);
const results = [];

function check(name, condition, detail = "") {
  results.push({ name, pass:Boolean(condition), detail });
}

function load(context, relativePath) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), context, { filename:relativePath });
}

const storage = new Map();
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  addEventListener:() => {},
  localStorage: {
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key, value) => storage.set(key, String(value)),
    removeItem:key => storage.delete(key),
  },
  dispatchEvent:() => {},
  CustomEvent:class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  },
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
load(context, "services/community-service.js");
load(context, "data/demo-seed-bundle.v1.js");
load(context, "data/demo-seed-all-student-km.v1.js");
load(context, "app-data.js");

const sourceNotes = [
  ...context.ECHO_WALL_DEMO_SEED_BUNDLE.notes,
  ...context.ECHO_WALL_ALL_STUDENT_KM_SEED,
];
const sourceByKey = new Map(sourceNotes.map(note => [note.demoSeedKey, note]));
const balancedSourceNotes = vm.runInContext(
  "balanceDemoSeedCommunityColors(ECHO_WALL_DEMO_SEED_BUNDLE.notes.concat(ECHO_WALL_ALL_STUDENT_KM_SEED))",
  context,
);
context.activateDemoSeedSnapshot(context.ECHO_WALL_DEMO_SEED_BUNDLE);
const firstRuntimeAll = context.getRuntimeNotes().filter(note => note.isDemoSeedRuntime);
const firstRuntime = context.getRuntimeNotes().filter(note => note.isDemoSeedRuntime && note.contextType === "community");
context.activateDemoSeedSnapshot(context.ECHO_WALL_DEMO_SEED_BUNDLE);
const secondRuntimeAll = context.getRuntimeNotes().filter(note => note.isDemoSeedRuntime);
const secondRuntime = context.getRuntimeNotes().filter(note => note.isDemoSeedRuntime && note.contextType === "community");
load(context, "app-wall.js");

const firstColors = new Map(firstRuntime.map(note => [note.demoSeedKey, note.color]));
check("Only the existing 10 Sticky colors are used", firstRuntime.every(note => COLORS.includes(note.color)));
check("The same post keeps the same color after reactivation", secondRuntime.every(note => firstColors.get(note.demoSeedKey) === note.color));
check("Color balancing leaves content/postType/comments/shape/rotation untouched", balancedSourceNotes.every(note => {
  const source = sourceByKey.get(note.demoSeedKey);
  return source
    && note.content === source.content
    && note.postType === source.postType
    && note.commentCount === source.commentCount
    && note.shape === source.shape
    && note.rotation === source.rotation;
}));

const firstEngagement = new Map(firstRuntimeAll.map(note => [note.demoSeedKey, context.getNoteEngagementScore(note)]));
const engagementScores = [...firstEngagement.values()];
const requiredEngagementScores = [0, 1, 2, 5, 8, 13, 17, 21, 25, 28, 34, 39, 43, 51, 58, 64, 72, 81, 87];
check("Every runtime seed receives an integer engagement score in 0..87", (
  firstRuntimeAll.length === 763
  && engagementScores.every(score => Number.isInteger(score) && score >= 0 && score <= 87)
));
check("Every runtime seed keeps the same engagement score after reactivation", secondRuntimeAll.every(note => (
  firstEngagement.get(note.demoSeedKey) === context.getNoteEngagementScore(note)
)));
requiredEngagementScores.forEach(score => {
  check(`Required engagement value ${score} is present`, engagementScores.includes(score));
});
check("Zero-score seed posts remain present", engagementScores.some(score => score === 0));
check("Most seed posts are not zero", engagementScores.filter(score => score === 0).length < engagementScores.length / 4);
check("Maximum seed engagement never exceeds 87", Math.max(...engagementScores) === 87);

const engagementBuckets = [
  { name:"0-3", min:0, max:3, lower:.08, upper:.24 },
  { name:"4-12", min:4, max:12, lower:.16, upper:.35 },
  { name:"13-25", min:13, max:25, lower:.16, upper:.35 },
  { name:"26-40", min:26, max:40, lower:.10, upper:.28 },
  { name:"41-60", min:41, max:60, lower:.04, upper:.20 },
  { name:"61-75", min:61, max:75, lower:.015, upper:.12 },
  { name:"76-87", min:76, max:87, lower:.005, upper:.08 },
];
engagementBuckets.forEach(bucket => {
  const count = engagementScores.filter(score => score >= bucket.min && score <= bucket.max).length;
  const ratio = count / engagementScores.length;
  check(`Long-tail bucket ${bucket.name} stays within a natural tolerance`, ratio >= bucket.lower && ratio <= bucket.upper, `${count}/${engagementScores.length}=${(ratio * 100).toFixed(1)}%`);
});

const mainWallScoreSets = {
  "All Student KM": firstRuntimeAll.filter(note => note.communityKey === "global:all").map(note => context.getNoteEngagementScore(note)),
  "KMK Community": firstRuntimeAll.filter(note => note.wallKey === "community:1:1").map(note => context.getNoteEngagementScore(note)),
  "Building Wall": firstRuntimeAll.filter(note => note.wallKey === "building:B_PUSTAKA").map(note => context.getNoteEngagementScore(note)),
};
Object.entries(mainWallScoreSets).forEach(([name, scores]) => {
  check(`${name}: at least 30 seed posts are covered`, scores.length >= 30, `got ${scores.length}`);
  check(`${name}: low/mid/high values all appear`, (
    scores.some(score => score <= 3)
    && scores.some(score => score >= 13 && score <= 40)
    && scores.some(score => score >= 41)
  ), JSON.stringify(scores));
});

const walls = new Map();
firstRuntime.forEach((note, sourceIndex) => {
  const wallKey = note.communityKey || note.wallKey;
  if (!walls.has(wallKey)) walls.set(wallKey, []);
  walls.get(wallKey).push({ note, sourceIndex });
});

walls.forEach((entries, wallKey) => {
  const ordered = [...entries].sort((left, right) => (
    Number(right.note.score || 0) - Number(left.note.score || 0)
    || Number(left.note.demoEngagementOrder) - Number(right.note.demoEngagementOrder)
    || left.sourceIndex - right.sourceIndex
  ));
  const counts = new Map(COLORS.map(color => [color, entries.filter(({ note }) => note.color === color).length]));
  check(`${wallKey}: all 10 colors are present`, COLORS.every(color => counts.get(color) > 0), JSON.stringify(Object.fromEntries(counts)));
  if (entries.length >= COLORS.length * 3) {
    check(`${wallKey}: every color appears at least 3 times`, COLORS.every(color => counts.get(color) >= 3), JSON.stringify(Object.fromEntries(counts)));
  }
  check(`${wallKey}: no same-color cards are consecutive in default Hot order`, ordered.every((entry, index) => (
    index === 0 || entry.note.color !== ordered[index - 1].note.color
  )));
  check(`${wallKey}: distribution is balanced, not a dominant-color block`, Math.max(...counts.values()) - Math.min(...counts.values()) <= 1);
});

const allStudents = walls.get("global:all") || [];
const kmkSains = walls.get("jurusan:1:1") || walls.get("community:1:1") || [];
check("All Student KM has 67 posts under test", allStudents.length === 67, `got ${allStudents.length}`);
check("KMK Sains has 73 posts under test", kmkSains.length === 73, `got ${kmkSains.length}`);

const filterRegression = vm.runInContext(`(() => {
  wallState.contextType = "community";
  wallState.communityKey = "global:all";
  wallState.category = "academic";
  wallState.postType = "all";
  wallState.sort = "hot";
  wallState.search = "";
  const academic = getFilteredNotes();
  wallState.category = "all";
  wallState.postType = "question";
  const questions = getFilteredNotes();
  wallState.postType = "all";
  wallState.search = "Calculus revision group";
  const search = getFilteredNotes();
  return {
    academicCount:academic.length,
    academicOnly:academic.every(note => note.category === "academic"),
    questionCount:questions.length,
    questionsOnly:questions.every(note => note.postType === "question"),
    searchCount:search.length,
    searchMatched:search[0]?.demoSeedKey === "allkm2026|global:all|note001",
  };
})()`, context);
check("Category filter still returns only matching posts", filterRegression.academicCount > 0 && filterRegression.academicOnly);
check("Post type filter still returns only matching posts", filterRegression.questionCount > 0 && filterRegression.questionsOnly);
check("Search still finds the intended All Student KM post", filterRegression.searchCount === 1 && filterRegression.searchMatched);

const hotSortRegression = vm.runInContext(`(() => {
  const inspect = state => {
    Object.assign(wallState, { category:"all", postType:"all", sort:"hot", search:"", ...state });
    const ordered = getFilteredNotes();
    const scores = ordered.map(note => getDisplayedNoteEngagementScore(note));
    return {
      count:ordered.length,
      scores,
      descending:scores.every((score, index) => index === 0 || score <= scores[index - 1]),
      first:scores[0],
      last:scores[scores.length - 1],
    };
  };
  return {
    all:inspect({ contextType:"community", communityKey:"global:all", orgId:null, majorId:null, placeId:"" }),
    kmk:inspect({ contextType:"community", communityKey:"jurusan:1:1", orgId:1, majorId:1, placeId:"" }),
    building:inspect({ contextType:"building", communityKey:"", orgId:null, majorId:null, placeId:"B_PUSTAKA" }),
  };
})()`, context);
Object.entries(hotSortRegression).forEach(([name, result]) => {
  check(`${name}: Hot order uses the displayed engagement score`, result.count > 0 && result.descending, JSON.stringify(result.scores));
  check(`${name}: Hot visibly prioritizes higher engagement`, result.first >= 40 && result.first > result.last, `${result.first} -> ${result.last}`);
});

const wallSource = fs.readFileSync(path.join(ROOT, "app-wall.js"), "utf8");
check("Wall cards use the shared displayed engagement score", wallSource.includes("👍 ${getDisplayedNoteEngagementScore(note)}"));
check("Post Detail uses the same shared engagement score", wallSource.includes("const engagementScore = getDisplayedNoteEngagementScore(note)"));
check("Hot sort compares the same shared engagement score", wallSource.includes("getDisplayedNoteEngagementScore(b) - getDisplayedNoteEngagementScore(a)"));

// Default records use a complete signature instead of the broad isDemoSeed
// flag, so old stored defaults are covered while later real posts are not.
context.getCampusBuilding = placeId => ({ id:String(placeId) });
context.loadNotes({ readOnly:true });
const defaultNotesFirstLoad = context.getRuntimeNotes().filter(note => Number(note.id) > 0 && Number(note.id) <= 205);
const firstDefaultScores = new Map(defaultNotesFirstLoad.map(note => [note.id, context.getNoteEngagementScore(note)]));
check("All 14 Community + 5 Building default posts receive demo engagement", (
  defaultNotesFirstLoad.length === 19
  && defaultNotesFirstLoad.every(note => Number.isInteger(note.demoEngagementScore))
), `got ${defaultNotesFirstLoad.length}`);
context.loadNotes({ readOnly:true });
const defaultNotesSecondLoad = context.getRuntimeNotes().filter(note => Number(note.id) > 0 && Number(note.id) <= 205);
check("Default seed engagement survives a simulated browser restart deterministically", defaultNotesSecondLoad.every(note => (
  firstDefaultScores.get(note.id) === context.getNoteEngagementScore(note)
)));
const interactiveDefault = defaultNotesSecondLoad.find(note => note.id === 1);
const interactiveDefaultBase = interactiveDefault.demoEngagementScore;
interactiveDefault.userVote = "up";
check("A persisted default-seed upvote is base demo score + real interaction delta", (
  context.getNoteEngagementScore(interactiveDefault) === Math.min(87, interactiveDefaultBase + 1)
));
interactiveDefault.userVote = "down";
check("A persisted default-seed downvote is base demo score + real interaction delta", (
  context.getNoteEngagementScore(interactiveDefault) === Math.max(0, interactiveDefaultBase - 1)
));

const routerSource = fs.readFileSync(path.join(ROOT, "app-router.js"), "utf8");
const wallCss = fs.readFileSync(path.join(ROOT, "style-wall.css"), "utf8");
check("All Student and College General routes receive the Sticky Wall scroll state", (
  routerSource.includes("'community-global'")
  && routerSource.includes("'community-college-general'")
  && routerSource.includes("classList.toggle('wall-route-active', isStickyWallRoute)")
));
check("Sticky Wall canvas remains the wheel/trackpad scroll container", /\.wall-canvas-wrap\s*\{[^}]*overflow-y\s*:\s*auto/s.test(wallCss));
check("Modal/drawer scroll lock remains enabled", /\.overlay-open\s*\{[^}]*overflow\s*:\s*hidden/s.test(wallCss));

const failed = results.filter(result => !result.pass);
results.forEach(result => console.log(`${result.pass ? "PASS" : "FAIL"} - ${result.name}${result.detail ? ` (${result.detail})` : ""}`));
console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
if (failed.length) process.exit(1);
