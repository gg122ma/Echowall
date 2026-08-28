#!/usr/bin/env node
/**
 * COMMUNITY-SEED-INTERACTION-ECHO-LIBRARY — All Student KM 67-post suite.
 *
 * Verifies data/demo-seed-all-student-km.v1.js (the source array) and its
 * behavior once merged by activateDemoSeedSnapshot() in app-data.js:
 *  - exactly 67 source records, unique seedOrder 1-67
 *  - language totals: English 34 / Bahasa Melayu 20 / Chinese 13
 *  - scope: global:all (All Student KM) only, never orgId/majorId-scoped
 *  - postType: discussion or question only (EchoPostTypeContract)
 *  - import is idempotent: re-running seed activation never grows the count
 *  - Sticky styling (color/shape/rotation) is deterministic per id and
 *    varies across the 67 posts
 *
 * Run with `node scripts/test-all-student-km-seed.mjs` (no test runner in
 * this project — see CLAUDE.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
}

function createFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => store.clear(),
  };
}

function buildSandbox() {
  const sandbox = {
    console,
    setTimeout, clearTimeout, queueMicrotask,
    localStorage: createFakeLocalStorage(),
    dispatchEvent: () => {},
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  };
  sandbox.window = sandbox;
  return sandbox;
}

function loadFile(context, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

const sandbox = buildSandbox();
const context = vm.createContext(sandbox);
loadFile(context, 'services/community-service.js');
loadFile(context, 'data/demo-seed-bundle.v1.js');
loadFile(context, 'data/demo-seed-all-student-km.v1.js');
loadFile(context, 'app-data.js');

const SEED = context.ECHO_WALL_ALL_STUDENT_KM_SEED;
check('data/demo-seed-all-student-km.v1.js loaded', Array.isArray(SEED));
check('Exactly 67 source records', SEED.length === 67, `got ${SEED.length}`);

const seedOrders = SEED.map(n => n.seedOrder);
check('seedOrder values are 1..67 with no gaps', JSON.stringify([...seedOrders].sort((a, b) => a - b)) === JSON.stringify(Array.from({ length: 67 }, (_, i) => i + 1)));
check('seedOrder values are unique', new Set(seedOrders).size === 67);
const demoSeedKeys = SEED.map(n => n.demoSeedKey);
check('demoSeedKey values are unique', new Set(demoSeedKeys).size === 67);

// --- Language totals ---------------------------------------------------

const langCounts = SEED.reduce((acc, n) => { acc[n.language] = (acc[n.language] || 0) + 1; return acc; }, {});
check('English count is 34', langCounts.en === 34, `got ${langCounts.en}`);
check('Bahasa Melayu count is 20', langCounts.ms === 20, `got ${langCounts.ms}`);
check('Chinese count is 13', langCounts.zh === 13, `got ${langCounts.zh}`);
check('Language totals sum to 67', (langCounts.en + langCounts.ms + langCounts.zh) === 67);

// --- Scope: All Student KM (global:all) only ----------------------------

check('Every post is contextType community', SEED.every(n => n.contextType === 'community'));
check('Every post is communityScope global', SEED.every(n => n.communityScope === 'global'));
check('Every post has communityKey global:all', SEED.every(n => n.communityKey === 'global:all'));
check('Every post has orgId/majorId/placeId null-or-empty (never scoped to a College/Building)', SEED.every(n => n.orgId === null && n.majorId === null && n.placeId === ''));

// --- postType: discussion or question only (EchoPostTypeContract) -------

check('Every post has postType discussion or question', SEED.every(n => n.postType === 'discussion' || n.postType === 'question'));
const contract = context.EchoPostTypeContract;
check('Every postType normalizes to itself under EchoPostTypeContract (already canonical)', SEED.every(n => contract.normalize(n.postType) === n.postType));
const postTypeCounts = SEED.reduce((acc, n) => { acc[n.postType] = (acc[n.postType] || 0) + 1; return acc; }, {});
check('Both discussion and question are actually used (not a single bucket)', (postTypeCounts.discussion || 0) > 0 && (postTypeCounts.question || 0) > 0, `discussion=${postTypeCounts.discussion} question=${postTypeCounts.question}`);
check('Question posts have questionStatus open; discussion posts have null', SEED.every(n => n.postType === 'question' ? n.questionStatus === 'open' : n.questionStatus === null));

// --- Content fidelity spot checks (title/body/hashtags exist, non-empty) -

check('Every post has a non-empty title', SEED.every(n => typeof n.title === 'string' && n.title.length > 0));
check('Every post has non-empty content (title+body+hashtags folded in)', SEED.every(n => typeof n.content === 'string' && n.content.length > 0));
check('Every post has a hashtags array', SEED.every(n => Array.isArray(n.hashtags)));
const post1 = SEED.find(n => n.seedOrder === 1);
check('#01 title matches source document', post1 && post1.title === 'Calculus revision group');
check('#01 hashtags match source document', post1 && JSON.stringify(post1.hashtags) === JSON.stringify(['Study', 'Math']));
const post67 = SEED.find(n => n.seedOrder === 67);
check('#67 title matches source document', post67 && post67.title === 'All-KM question thread');

// --- Import idempotency: activateDemoSeedSnapshot merges this array; a
// simulated reload (calling it again) must never grow the total ----------

const bundle = context.ECHO_WALL_DEMO_SEED_BUNDLE;
context.activateDemoSeedSnapshot(bundle);
const runtimeAfterFirst = context.getRuntimeNotes();
const allKmAfterFirst = runtimeAfterFirst.filter(n => n.communityKey === 'global:all' && n.seedOrder !== undefined);
check('First activation yields exactly 67 All Student KM runtime notes', allKmAfterFirst.length === 67, `got ${allKmAfterFirst.length}`);
check('Total runtime notes after first activation is 696 + 67 = 763', runtimeAfterFirst.length === 763, `got ${runtimeAfterFirst.length}`);

context.activateDemoSeedSnapshot(bundle);
const runtimeAfterSecond = context.getRuntimeNotes();
const allKmAfterSecond = runtimeAfterSecond.filter(n => n.communityKey === 'global:all' && n.seedOrder !== undefined);
check('Re-running activation still yields exactly 67 (not 134)', allKmAfterSecond.length === 67, `got ${allKmAfterSecond.length}`);
check('Total runtime notes after second activation is still 763 (not 830)', runtimeAfterSecond.length === 763, `got ${runtimeAfterSecond.length}`);

context.activateDemoSeedSnapshot(bundle);
context.activateDemoSeedSnapshot(bundle);
const runtimeAfterMany = context.getRuntimeNotes();
check('Re-running activation 5 total times still yields exactly 67, not 335', runtimeAfterMany.filter(n => n.communityKey === 'global:all' && n.seedOrder !== undefined).length === 67);

// --- Stable ids across reloads (same demoSeedKey -> same id every time) --

const byKeyFirst = new Map(allKmAfterFirst.map(n => [n.demoSeedKey, n.id]));
const byKeySecond = new Map(allKmAfterSecond.map(n => [n.demoSeedKey, n.id]));
let idsStable = true;
for (const [key, id] of byKeyFirst) { if (byKeySecond.get(key) !== id) { idsStable = false; break; } }
check('Every All Student KM post keeps the same id across simulated reloads', idsStable);
check('All 67 ids are unique', new Set([...byKeyFirst.values()]).size === 67);

// --- Sticky styling: deterministic per id, varied across the 67 ----------

const styleByKeyFirst = new Map(allKmAfterFirst.map(n => [n.demoSeedKey, { color: n.color, shape: n.shape, rotation: n.rotation }]));
const styleByKeySecond = new Map(allKmAfterSecond.map(n => [n.demoSeedKey, { color: n.color, shape: n.shape, rotation: n.rotation }]));
let styleStable = true;
for (const [key, style] of styleByKeyFirst) {
  const other = styleByKeySecond.get(key);
  if (!other || other.color !== style.color || other.shape !== style.shape || other.rotation !== style.rotation) { styleStable = false; break; }
}
check('Same post id -> same color/shape/rotation across reloads (deterministic)', styleStable);

const distinctColors = new Set(allKmAfterFirst.map(n => n.color));
const distinctShapes = new Set(allKmAfterFirst.map(n => n.shape));
const distinctRotations = new Set(allKmAfterFirst.map(n => n.rotation));
check('Multiple distinct colors are used across the 67 posts', distinctColors.size >= 4, `got ${distinctColors.size}`);
check('Multiple distinct shapes are used across the 67 posts', distinctShapes.size >= 4, `got ${distinctShapes.size}`);
check('Multiple distinct rotation values are used across the 67 posts', distinctRotations.size >= 4, `got ${distinctRotations.size}`);
check('All rotation values stay within the +/-2.5 deg clamp buildNoteDOM applies', allKmAfterFirst.every(n => n.rotation >= -2.5 && n.rotation <= 2.5));
const onlyKnownShapes = new Set(['rounded', 'square', 'rect', 'circle', 'envelope', 'torn', 'speech', 'polaroid', 'ticket', 'hexagon']);
check('Every shape is one of the project\'s existing SHAPES values (no new shape invented)', allKmAfterFirst.every(n => onlyKnownShapes.has(n.shape)));

// --- Report ------------------------------------------------------------------

const failed = results.filter(result => !result.pass);
for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}${result.detail ? ` (${result.detail})` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
if (failed.length) {
  console.log(`\nFAILED:`);
  failed.forEach(result => console.log(`  - ${result.name}${result.detail ? ` (${result.detail})` : ''}`));
  process.exit(1);
}
