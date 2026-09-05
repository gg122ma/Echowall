#!/usr/bin/env node
/**
 * BACKEND V2.4a — Building metadata read layer + static fallback.
 *
 * Loads the REAL shipped source files (services/building-metadata-provider.js,
 * data/campus-building-hours.js) into a Node vm sandbox with a fake
 * Supabase client — this is the actual production code run against
 * fixtures, not a reimplementation. The migration draft itself is checked
 * separately by scripts/test-building-metadata-migration-static.mjs; this
 * file only covers the frontend merge/fallback behavior that consumes it
 * once applied. No network socket is ever touched.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
function check(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
}

// Real static B_PUSTAKA shape (subset of data/campus-buildings.js's actual
// fields — id/photos/zoneId are included so a merge bug that touches an
// out-of-scope field is visible). Frozen so any accidental mutation of the
// nested objects by the code under test is at least a no-op rather than a
// silently-passing false negative — the real assertion is the deep-equality
// check after each merge, below.
function makeStaticPustaka() {
  return Object.freeze({
    id: "B_PUSTAKA",
    name: "Pustaka (Perpustakaan)",
    zoneId: "learning",
    emoji: "📚",
    description: Object.freeze({ en: "Static EN", ms: "Static MS", zh: "Static ZH" }),
    purpose: Object.freeze({ en: "Static purpose EN" }),
    specialNotes: Object.freeze({ en: "Static notes EN" }),
    localizedAlias: Object.freeze({ en: "Library", ms: "Perpustakaan", zh: "图书馆" }),
    photos: Object.freeze([{ src: "assets/buildings/B_PUSTAKA/cover-01.jpg", alt: "x", fit: "cover" }]),
  });
}

function makeSandbox({ activationMode = "supabase-production", rows = [], queryError = null, getClientThrows = false } = {}) {
  const calls = { from: [] };
  const fakeClient = {
    from(table) {
      calls.from.push(table);
      return {
        select() {
          return Promise.resolve(queryError ? { data: null, error: queryError } : { data: rows, error: null });
        },
      };
    },
  };
  const staticPustaka = makeStaticPustaka();
  const context = {
    window: {
      CommunitySupabaseClient: {
        getActivationState: () => ({ mode: activationMode }),
        getClient: async () => {
          if (getClientThrows) {
            const error = new Error("Community Supabase is not configured for this browser.");
            error.code = "COMMUNITY_STAGING_NOT_CONFIGURED";
            throw error;
          }
          return fakeClient;
        },
      },
      getCampusBuilding: id => (id === "B_PUSTAKA" ? staticPustaka : null),
    },
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  const load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  load("services/building-metadata-provider.js");
  load("data/campus-building-hours.js");
  return { context, calls, staticPustaka };
}

function metadataRow(overrides = {}) {
  return { building_id: "B_PUSTAKA", college_id: 1, description: null, purpose: null, special_notes: null, localized_alias: null, hours: null, updated_at: "2026-09-05T00:00:00Z", ...overrides };
}

async function main() {
  // ---------------------------------------------------------------------
  // 13. No backend row (table present but empty) => exact static object.
  // ---------------------------------------------------------------------
  {
    const { context, calls, staticPustaka } = makeSandbox({ rows: [] });
    const changed = await context.window.BuildingMetadataProvider.preload();
    check("13. preload() with an empty table resolves false (nothing changed)", changed === false);
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("13. no backend row => getEffectiveBuilding returns the EXACT static object reference, unchanged", effective === staticPustaka);
    check("13. exactly one bulk request was made for the whole table (no per-building query)", calls.from.length === 1 && calls.from[0] === "building_metadata_public");
  }

  // ---------------------------------------------------------------------
  // 14 & 15. One backend field overrides only that field; a null backend
  // field falls back to static (by reference, since untouched fields are
  // never copied/rebuilt).
  // ---------------------------------------------------------------------
  {
    const { context, staticPustaka } = makeSandbox({
      rows: [metadataRow({ description: { en: "New EN" } })],
    });
    await context.window.BuildingMetadataProvider.preload();
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("14. backend description overrides effective.description", JSON.stringify(effective.description) === JSON.stringify({ en: "New EN" }));
    check("15. backend purpose is null => effective.purpose falls back to the exact static reference", effective.purpose === staticPustaka.purpose);
    check("15. backend special_notes is null => effective.specialNotes falls back to the exact static reference", effective.specialNotes === staticPustaka.specialNotes);
    check("15. backend localized_alias is null => effective.localizedAlias falls back to the exact static reference", effective.localizedAlias === staticPustaka.localizedAlias);
    check("14/15. only description changed; every other field is untouched (id/name/zoneId/emoji/photos)", effective.id === staticPustaka.id && effective.name === staticPustaka.name && effective.zoneId === staticPustaka.zoneId && effective.emoji === staticPustaka.emoji && effective.photos === staticPustaka.photos);
  }

  // ---------------------------------------------------------------------
  // 16. Backend localized object replaces the WHOLE static localized
  // object — no per-language merge (a language missing from the backend
  // object must stay missing, not silently backfilled from static).
  // ---------------------------------------------------------------------
  {
    const { context } = makeSandbox({
      rows: [metadataRow({ description: { en: "New EN only" } })],
    });
    await context.window.BuildingMetadataProvider.preload();
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("16. backend description with only 'en' is used verbatim (no 'ms'/'zh' keys)", Object.keys(effective.description).length === 1 && effective.description.en === "New EN only");
    check("16. static 'ms'/'zh' values are NOT silently copied into the backend description object", effective.description.ms === undefined && effective.description.zh === undefined);
  }

  // ---------------------------------------------------------------------
  // 17. Hours: whole-object override via the single canonical
  // BuildingHours.getSnapshot() calculation path — never merged day-by-day.
  // ---------------------------------------------------------------------
  {
    const { context } = makeSandbox({
      rows: [metadataRow({ hours: { mode: "unavailable" } })],
    });
    await context.window.BuildingMetadataProvider.preload();
    // Constructed from explicit LOCAL date/time components (year, month
    // 0-indexed, day, hour, minute) rather than a UTC ISO string, so
    // getDay()/getHours() below are deterministic regardless of the host
    // machine's timezone: 2026-09-07 10:00 local is a Monday, well inside
    // B_PUSTAKA's real static open window (Sun-Thu 08:00-16:30).
    const now = new Date(2026, 8, 7, 10, 0, 0);
    const snapshot = context.window.BuildingHours.getSnapshot("B_PUSTAKA", now);
    check("17. a backend hours override replaces the whole static hours config (real static B_PUSTAKA is 'weekly', override is 'unavailable')", snapshot.mode === "unavailable");
  }
  {
    // No override present => byte-for-byte identical to pre-V2.4a static
    // behavior (same real static B_PUSTAKA weekly schedule, same
    // calculation path, nothing bridged in).
    const { context } = makeSandbox({ rows: [] });
    await context.window.BuildingMetadataProvider.preload();
    const now = new Date(2026, 8, 7, 10, 0, 0);
    const snapshot = context.window.BuildingHours.getSnapshot("B_PUSTAKA", now);
    check("17b. no hours override => getSnapshot() uses the real static CAMPUS_BUILDING_HOURS entry unchanged", snapshot.mode === "weekly" && snapshot.isOpen === true);
  }

  // ---------------------------------------------------------------------
  // 18. The static object's own contents are never mutated by a merge.
  // ---------------------------------------------------------------------
  {
    const { context, staticPustaka } = makeSandbox({
      rows: [metadataRow({ description: { en: "Mutating test EN" }, purpose: { en: "Mutating test purpose" } })],
    });
    const before = JSON.parse(JSON.stringify(staticPustaka));
    await context.window.BuildingMetadataProvider.preload();
    context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    const after = JSON.parse(JSON.stringify(staticPustaka));
    check("18. static building object contents are byte-identical before/after a merge with active overrides", JSON.stringify(before) === JSON.stringify(after));
  }

  // ---------------------------------------------------------------------
  // 19. Supabase unavailable (local mode) => static behavior, zero requests.
  // ---------------------------------------------------------------------
  {
    const { context, calls, staticPustaka } = makeSandbox({ activationMode: "local", rows: [metadataRow({ description: { en: "Should never be fetched" } })] });
    const changed = await context.window.BuildingMetadataProvider.preload();
    check("19. local mode => preload() resolves false without querying", changed === false && calls.from.length === 0);
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("19. local mode => getEffectiveBuilding returns the exact static object, unchanged", effective === staticPustaka);
  }

  // ---------------------------------------------------------------------
  // 20. Supabase query failure => silent static fallback, no throw.
  // ---------------------------------------------------------------------
  {
    const { context, staticPustaka } = makeSandbox({ queryError: { message: "boom", code: "500" } });
    let threw = false;
    let changed;
    try {
      changed = await context.window.BuildingMetadataProvider.preload();
    } catch {
      threw = true;
    }
    check("20. a query error never throws out of preload()", threw === false);
    check("20. a query error resolves preload() to false", changed === false);
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("20. a query error => getEffectiveBuilding returns the exact static object, unchanged", effective === staticPustaka);
  }
  {
    // Same guarantee when getClient() itself rejects (e.g. activation
    // blocked/misconfigured), not just when the query resolves an error.
    const { context, staticPustaka } = makeSandbox({ getClientThrows: true });
    let threw = false;
    let changed;
    try {
      changed = await context.window.BuildingMetadataProvider.preload();
    } catch {
      threw = true;
    }
    check("20b. getClient() rejecting never throws out of preload()", threw === false);
    check("20b. getClient() rejecting resolves preload() to false", changed === false);
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_PUSTAKA");
    check("20b. getClient() rejecting => getEffectiveBuilding returns the exact static object, unchanged", effective === staticPustaka);
  }

  // ---------------------------------------------------------------------
  // Bonus: preload() is memoized — concurrent/repeat calls never issue a
  // second request (this is what makes the bulk-preload approach actually
  // avoid one request per Building card).
  // ---------------------------------------------------------------------
  {
    const { context, calls } = makeSandbox({ rows: [metadataRow({ description: { en: "x" } })] });
    const [a, b] = await Promise.all([
      context.window.BuildingMetadataProvider.preload(),
      context.window.BuildingMetadataProvider.preload(),
    ]);
    await context.window.BuildingMetadataProvider.preload();
    check("bonus. preload() is memoized: 3 calls (2 concurrent + 1 sequential) issue exactly 1 request", calls.from.length === 1 && a === true && b === true);
  }

  // ---------------------------------------------------------------------
  // Bonus: an unknown/never-loaded building never throws.
  // ---------------------------------------------------------------------
  {
    const { context } = makeSandbox({ rows: [] });
    await context.window.BuildingMetadataProvider.preload();
    const effective = context.window.BuildingMetadataProvider.getEffectiveBuilding("B_DOES_NOT_EXIST");
    check("bonus. an unknown building id resolves to null, not a throw", effective === null);
  }

  const failed = results.filter(r => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.name}${r.pass || !r.detail ? "" : ` (${r.detail})`}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
  if (failed.length) process.exit(1);
}

await main();
