#!/usr/bin/env node
/**
 * DISPLAY-COUNT-CONSISTENCY — direct-call test suite for
 * data/demo-display-counts.js, the single display-only source of truth for
 * College Community and KMK Building "notes count" figures shown across
 * Building Stories, Building Detail, Building Wall, Echo Map, Community Hub
 * and College Landing.
 *
 * This project has no test runner/package manager (see CLAUDE.md) — run
 * directly with `node scripts/test-display-count-consistency.mjs`.
 *
 * Scope: the config/helper layer only (data/demo-display-counts.js is a
 * plain, DOM-free `window.*` assignment script). It is loaded in a minimal
 * vm sandbox below, the same approach scripts/test-study-upload.mjs uses.
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

// --- Load data/demo-display-counts.js in a minimal window sandbox ---------

const configPath = path.join(ROOT, 'data', 'demo-display-counts.js');
const configSource = fs.readFileSync(configPath, 'utf8');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(configSource, sandbox, { filename: configPath });

const {
  COLLEGE_DISPLAY_COUNTS,
  BUILDING_DISPLAY_COUNTS,
  getCollegeDisplayCount,
  getBuildingDisplayCount,
} = sandbox;

// --- A. College configured values exactly match ----------------------------

const EXPECTED_COLLEGE_COUNTS = {
  1: 203,  // KMK
  2: 48,   // KMKK
  3: 86,   // KMPP
  4: 37,   // KMPK
  5: 24,   // KMP
  6: 17,   // KMM
  7: 28,   // KMNS
  8: 10,   // KML
  9: 43,   // KMJ
  10: 15,  // KMPH
  13: 48,  // KMS
  14: 34,  // KMKT
};

for (const [orgId, expected] of Object.entries(EXPECTED_COLLEGE_COUNTS)) {
  check(
    `College orgId ${orgId} display count === ${expected}`,
    COLLEGE_DISPLAY_COUNTS[orgId] === expected && getCollegeDisplayCount(orgId, -1) === expected,
  );
}
check(
  'College config has exactly the 12 expected orgIds (no extras)',
  Object.keys(COLLEGE_DISPLAY_COUNTS).length === Object.keys(EXPECTED_COLLEGE_COUNTS).length,
  `got ${Object.keys(COLLEGE_DISPLAY_COUNTS).length}, expected ${Object.keys(EXPECTED_COLLEGE_COUNTS).length}`,
);

// --- College total = 593 ----------------------------------------------------

const collegeTotal = Object.values(COLLEGE_DISPLAY_COUNTS).reduce((sum, value) => sum + value, 0);
check('College display counts total === 593', collegeTotal === 593, `got ${collegeTotal}`);

// --- B. Building configured values exactly match ----------------------------

const EXPECTED_BUILDING_COUNTS = {
  B_MASJID: 83,
  B_DEWAN_MAHAWANGSA: 67,
  B_DEWAN_KULIAH: 59,
  B_PUSTAKA: 43,
  B_LANGKASUKA: 17,
  B_ASTAKA: 11,
  B_SERI_JERAI: 18,
  B_KEDIAMAN_PENGARAH: 21,
  B_BLOK_TUTORAN_MAKMAL: 58,
  B_SERAMBI: 35,
};

for (const [buildingId, expected] of Object.entries(EXPECTED_BUILDING_COUNTS)) {
  check(
    `Building ${buildingId} display count === ${expected}`,
    BUILDING_DISPLAY_COUNTS[buildingId] === expected && getBuildingDisplayCount(buildingId, -1) === expected,
  );
}
check(
  'Building config has exactly the 10 expected building ids (no extras)',
  Object.keys(BUILDING_DISPLAY_COUNTS).length === Object.keys(EXPECTED_BUILDING_COUNTS).length,
  `got ${Object.keys(BUILDING_DISPLAY_COUNTS).length}, expected ${Object.keys(EXPECTED_BUILDING_COUNTS).length}`,
);

// --- Specified Building total = 412 -----------------------------------------

const buildingTotal = Object.values(BUILDING_DISPLAY_COUNTS).reduce((sum, value) => sum + value, 0);
check('Building display counts total === 412', buildingTotal === 412, `got ${buildingTotal}`);

// --- Same canonical id -> all display helper calls return the same count ---
// (proves the config wins over any per-caller "real" fallback, so every
// entry point that passes a different real/fallback number still converges
// on one figure for the same entity)

for (const buildingId of Object.keys(EXPECTED_BUILDING_COUNTS)) {
  const viaZeroFallback = getBuildingDisplayCount(buildingId, 0);
  const viaOtherFallback = getBuildingDisplayCount(buildingId, 999);
  check(
    `getBuildingDisplayCount('${buildingId}', ...) is stable across different fallbacks`,
    viaZeroFallback === viaOtherFallback && viaZeroFallback === EXPECTED_BUILDING_COUNTS[buildingId],
  );
}
for (const orgId of Object.keys(EXPECTED_COLLEGE_COUNTS)) {
  const viaZeroFallback = getCollegeDisplayCount(orgId, 0);
  const viaOtherFallback = getCollegeDisplayCount(orgId, 999);
  check(
    `getCollegeDisplayCount(${orgId}, ...) is stable across different fallbacks`,
    viaZeroFallback === viaOtherFallback && viaZeroFallback === EXPECTED_COLLEGE_COUNTS[orgId],
  );
}

// --- Unknown entity -> fallback preserved (never forced to 0) --------------

check('Unknown building id falls back to caller-supplied real count', getBuildingDisplayCount('B_NOT_CONFIGURED', 7) === 7);
check('Unknown building id falls back to 0 only if caller explicitly passes 0 (not silently forced)', getBuildingDisplayCount('B_NOT_CONFIGURED', 0) === 0);
check('Unknown org id falls back to caller-supplied real count', getCollegeDisplayCount(9999, 12) === 12);
check('Numeric-string org id resolves the same as a numeric org id', getCollegeDisplayCount('1', -1) === 203);

// --- No duplicate count tables: every live consumer calls the shared helper,
// none re-declares its own literal College/Building count map -------------

const CONSUMER_FILES = ['app-community.js', 'app-place.js', 'app-router.js', 'echomap.js', 'app-wall.js'];
const DUPLICATE_TABLE_PATTERN = /(COLLEGE_DISPLAY_COUNTS|BUILDING_DISPLAY_COUNTS)\s*=\s*\{/;

for (const file of CONSUMER_FILES) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  check(`${file} does not redeclare its own display-count table`, !DUPLICATE_TABLE_PATTERN.test(source));
}

check(
  'app-place.js calls the shared building display-count helper',
  fs.readFileSync(path.join(ROOT, 'app-place.js'), 'utf8').includes('getBuildingDisplayCount('),
);
check(
  'app-router.js calls both shared display-count helpers',
  (() => {
    const source = fs.readFileSync(path.join(ROOT, 'app-router.js'), 'utf8');
    return source.includes('getBuildingDisplayCount(') && source.includes('getCollegeDisplayCount(');
  })(),
);
check(
  'app-community.js calls the shared college display-count helper',
  fs.readFileSync(path.join(ROOT, 'app-community.js'), 'utf8').includes('getCollegeDisplayCount('),
);
check(
  'echomap.js calls the shared building display-count helper',
  fs.readFileSync(path.join(ROOT, 'echomap.js'), 'utf8').includes('getBuildingDisplayCount('),
);
check(
  'app-wall.js calls the shared building display-count helper',
  fs.readFileSync(path.join(ROOT, 'app-wall.js'), 'utf8').includes('getBuildingDisplayCount('),
);

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
