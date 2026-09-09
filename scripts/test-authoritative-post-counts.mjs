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

function post(overrides = {}) {
  return {
    id: `post-${Math.random()}`,
    post_type: "discussion",
    scope_type: "building",
    college_id: 1,
    jurusan_id: null,
    building_id: "B_OTHER",
    content: "normal published post",
    category: "campus_life",
    shape: "rounded",
    color: "#DBEAFE",
    rotation: 0,
    position_x: 10,
    position_y: 15,
    display_author_mode: "anonymous",
    author_label: "Anonymous",
    question_status: null,
    real_vote_score: 0,
    display_score: 0,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    can_manage_question: false,
    is_seed: true,
    ...overrides,
  };
}

const initialized = [
  post({ id: "global-1", scope_type: "all_km", college_id: null, building_id: null }),
  post({ id: "global-2", scope_type: "all_km", college_id: null, building_id: null }),
  ...Array.from({ length: 118 }, (_, index) => post({ id: `jurusan-${index}`, scope_type: "jurusan", jurusan_id: 10, building_id: null })),
  post({ id: "college-2-a", scope_type: "college", college_id: 2, building_id: null }),
  post({ id: "college-2-b", scope_type: "college", college_id: 2, building_id: null }),
  ...Array.from({ length: 41 }, (_, index) => post({ id: `pustaka-${index}`, building_id: "B_PUSTAKA" })),
  ...Array.from({ length: 404 }, (_, index) => post({ id: `other-${index}` })),
];
assert.equal(initialized.length, 567);
const newer = [
  post({ id: "map-created", building_id: "B_PUSTAKA", is_seed: false, created_at: "2026-09-08T00:00:00Z" }),
  post({ id: "new-college", scope_type: "college", college_id: 2, building_id: null, is_seed: false, created_at: "2026-09-08T01:00:00Z" }),
];
const cloud = {
  posts: [...initialized, ...newer],
  anchors: [{ post_id: "map-created", college_id: 1, building_id: "B_PUSTAKA", lat: 6.4, lng: 100.2 }],
};
const before = JSON.stringify(cloud);
const calls = [];

function createClient() {
  function from(table) {
    const query = { table, columns: "*", options: {}, eq: [], in: [], range: null };
    calls.push(query);
    function result() {
      const source = table === "posts_public" ? cloud.posts : cloud.anchors;
      const filtered = source.filter(row => query.eq.every(([key, value]) => row[key] === value)
        && query.in.every(([key, values]) => values.includes(row[key])));
      const ranged = query.range ? filtered.slice(query.range[0], query.range[1] + 1) : filtered;
      const fields = query.columns === "*" ? null : query.columns.split(",");
      const data = fields ? ranged.map(row => Object.fromEntries(fields.map(field => [field, row[field]]))) : ranged;
      return { data, error: null, count: query.options.count ? filtered.length : null };
    }
    const builder = {
      select(columns = "*", options = {}) { query.columns = columns; query.options = options; return builder; },
      eq(key, value) { query.eq.push([key, value]); return builder; },
      in(key, values) { query.in.push([key, values]); return builder; },
      range(from, to) { query.range = [from, to]; return Promise.resolve(result()); },
      order() { return builder; },
      limit() { return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    return builder;
  }
  return { from, rpc: async () => { throw new Error("count read must not mutate"); } };
}

const client = createClient();
const window = {
  CommunitySupabaseClient: {
    getActivationState: () => ({ mode: "supabase-production" }),
    getPublicClient: async () => client,
    getClient: async () => client,
  },
  SupabaseAuthProvider: { getCurrentUser: () => null, ready: async () => null },
  AuthService: { getCurrentUser: () => null },
  localStorage: { getItem: () => null, setItem: () => {} },
};
window.window = window;
const context = { window, localStorage: window.localStorage, console, Map, Set, Object, Number, String, Boolean, Error };
vm.createContext(context);
for (const file of [
  "services/community-service.js",
  "services/community-row-adapter.js",
  "services/community-supabase-repositories.js",
  "services/community-data-provider.js",
]) vm.runInContext(read(file), context, { filename: file });

await window.CommunityDataProvider.refreshPostCounts();
check("College Hub aggregate includes every Jurusan scope in its college", window.CommunityDataProvider.cachedCollegeAggregatePostCount(1) === 118);
check("College with 118 Jurusan posts and no College-General posts does not display 0", window.CommunityDataProvider.cachedCollegeAggregatePostCount(1) === 118);
check("canonical global count uses exact all_km scope", window.CommunityDataProvider.cachedCommunityPostCount("global:all") === 2);
check("College General Wall remains exact College scope", window.CommunityDataProvider.cachedCommunityPostCount("college:1") === 0);
check("a second College aggregate adds exact College rows", window.CommunityDataProvider.cachedCollegeAggregatePostCount(2) === 3);
check("Jurusan Wall remains exact college and Jurusan scope", window.CommunityDataProvider.cachedCommunityPostCount("jurusan:1:10") === 118);
check("Home visible-note total uses all published remote post rows", window.CommunityDataProvider.cachedTotalPostCount() === 569);
check("Latest Memory uses the newest published created_at", window.CommunityDataProvider.cachedLatestPostCreatedAt() === "2026-09-08T01:00:00Z");
check("raw provider photo count remains unresolved and separate from Home presentation", window.CommunityDataProvider.cachedPhotoPostCount() === null);
check("Building count includes the Map-created Building post once", window.CommunityDataProvider.cachedBuildingPostCount(1, "B_PUSTAKA") === 42);
check("Map anchor metadata is not counted as a second post", window.CommunityDataProvider.cachedBuildingPostCount(1, "B_PUSTAKA") === cloud.posts.filter(row => row.scope_type === "building" && row.building_id === "B_PUSTAKA").length);
check("count aggregation reads posts_public and never the anchor view", calls.length === 1 && calls[0].table === "posts_public");
check("count aggregation downloads dimensions and created_at only, never post content", calls[0].columns === "scope_type,college_id,jurusan_id,building_id,created_at" && !calls[0].columns.includes("content"));
check("count aggregation uses exact count semantics and bounded range", calls[0].options.count === "exact" && calls[0].range[0] === 0 && calls[0].range[1] === 999);
await window.CommunityDataProvider.refreshPostCounts();
check("fresh count cache avoids a repeated full projection read", calls.length === 1);
await window.CommunityDataProvider.refreshPostCounts({ force: true });
check("explicit force refresh performs one projection read after a write", calls.length === 2);
check("567 initialized rows require no mutation", JSON.stringify(cloud.posts.slice(0, 567)) === JSON.stringify(initialized));
check("legitimate newer rows require no mutation", JSON.stringify(cloud.posts.slice(567)) === JSON.stringify(newer));
check("the read-only count operation performs no database mutation", JSON.stringify(cloud) === before);

const routerSource = read("app-router.js");
const helperSource = routerSource.slice(
  routerSource.indexOf("function usesAuthoritativePostCounts"),
  routerSource.indexOf("function getVisibleCommunityCount"),
);
const helperWindow = {
  KMK_COLLEGE_ID: 1,
  CommunityDataProvider: {
    isRemoteRequested: () => true,
    cachedCollegeAggregatePostCount: () => 118,
    cachedBuildingPostCount: () => 42,
    cachedTotalPostCount: () => 569,
    cachedLatestPostCreatedAt: () => "2026-09-07T17:21:24.625902+00:00",
    cachedPhotoPostCount: () => null,
  },
};
const helperContext = {
  window: helperWindow,
  getCollegeDisplayCount: () => 203,
  getBuildingDisplayCount: () => 43,
  getCommunityNoteCount: () => 999,
  getBuildingNotes: () => Array(999),
  document: { querySelectorAll: () => [] },
  Promise,
};
helperWindow.window = helperWindow;
vm.createContext(helperContext);
vm.runInContext(read("services/home-stats-service.js"), helperContext, { filename: "services/home-stats-service.js" });
vm.runInContext(helperSource, helperContext);
check("Community fixed override cannot replace the production College aggregate", helperContext.getCollegeNoteDisplayCount(1, 999) === 118);
check("Building fixed override cannot replace production count", helperContext.getBuildingNoteDisplayCount("B_PUSTAKA", 999) === 42);
check("Home presentation floor applies below the raw baseline", helperContext.getHomeNoteDisplayCount(1017) === 1017);
check("Home Photo Notes retains the approved presentation baseline", helperContext.getHomePhotoNoteDisplayCount() === 53);
for (const [raw, expected] of [[573, 1017], [574, 1018], [575, 1019], [580, 1024], [572, 1017], [0, 1017]]) {
  check(`Home Visible Notes maps raw ${raw} to ${expected}`, helperWindow.HomeStatsService.getVisibleNotes(raw) === expected);
}
check("Home Latest Memory formats the newest canonical timestamp in Malaysia time", helperContext.getLatestMemoryDisplay("Aug 25, 2026") === "Sep 8, 2026");
helperWindow.CommunityDataProvider.isRemoteRequested = () => false;
check("non-canonical Local mode retains college compatibility", helperContext.getCollegeNoteDisplayCount(1, 999) === 203);
check("non-canonical Local mode retains building compatibility", helperContext.getBuildingNoteDisplayCount("B_PUSTAKA", 999) === 43);
check("non-canonical Local mode retains its Latest Memory fallback", helperContext.getLatestMemoryDisplay("Aug 25, 2026") === "Aug 25, 2026");

const communitySource = read("app-community.js");
const placeSource = read("app-place.js");
const wallSource = read("app-wall.js");
const mapSource = read("echomap.js");
check("Community cards and landing use authoritative count helper", /getCollegeNoteDisplayCount/.test(communitySource) && !/getCollegeDisplayCount/.test(communitySource));
check("Building Stories and Detail use authoritative count helper", /getBuildingNoteDisplayCount/.test(placeSource) && !/getBuildingDisplayCount/.test(placeSource));
check("Building Wall header uses remote building count cache", /cachedBuildingPostCount/.test(wallSource));
check("Community Wall header uses exact remote scope count cache", /cachedCommunityPostCount\(wallState\.communityKey\)/.test(wallSource));
check("Map preview uses Building count semantics, not anchored-only count", /getBuildingNoteDisplayCount/.test(mapSource) && !/cachedMapAnchors[\s\S]{0,300}place-preview-count/.test(mapSource));
check("all production posts still use the same normal wall renderer", /filtered\.forEach\(\(note, index\) => canvas\.appendChild\(buildNoteDOM\(note, index\)\)\)/.test(wallSource) && !/renderSeedPost/.test(wallSource));
check("no public provenance badge or separate renderer was introduced", !/(seed|demo|sample)-(badge|section|renderer|post)/i.test([communitySource, placeSource, wallSource, mapSource].join("\n")));
check("fixed display tables are reachable only behind non-remote branches", /if \(!usesAuthoritativePostCounts\(\)\) return getCollegeDisplayCount/.test(routerSource) && /if \(!usesAuthoritativePostCounts\(\)\) return getBuildingDisplayCount/.test(routerSource));
check("canonical Home Photo Notes renders the approved numeric baseline", /const homepagePhotoNotesInitial = "0"/.test(routerSource));
check("Latest Memory has an async in-place refresh target", /data-home-latest-memory/.test(routerSource) && /cachedLatestPostCreatedAt/.test(routerSource));

console.log(`\n${passed}/${passed} assertions passed.`);
