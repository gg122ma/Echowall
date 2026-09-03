#!/usr/bin/env node
/**
 * BACKEND V2.3 — Building Wall + Map Post Directly.
 *
 * Loads the REAL shipped source files (services/community-row-adapter.js,
 * services/community-supabase-repositories.js, services/community-service.js,
 * services/community-realtime-service.js) into a Node vm sandbox with a
 * fake Supabase client that records exactly what queries/RPC payloads the
 * repository sends — this is not a reimplementation to test against, it is
 * the actual production code, run against fixtures.
 *
 * Production writes are never authorized for this suite: every "client" is
 * a fake in-memory object; nothing here ever touches a network socket.
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

// Each `return_await(async () => {...})` block below runs its own async
// IIFE; this just queues the resulting promise so main() can await them
// all at the end, keeping the file a plain top-to-bottom script rather
// than requiring every check block to be wrapped in its own top-level await.
const pending = [];
function return_await(fn) {
  pending.push(fn());
}

// ---------------------------------------------------------------------
// 1. All 32 Building IDs canonical and unchanged — derive the expected set
//    from the authoritative applied migration when the sibling checkout
//    that carries it is present on this machine; otherwise fall back to a
//    verbatim transcription of that same INSERT statement (cited below),
//    so the test still runs in an environment without that sibling repo.
// ---------------------------------------------------------------------
const SIBLING_MIGRATION = path.resolve(
  ROOT,
  "..",
  "EchoWall latest version 3",
  "EchoWall-Feature-Foundation",
  "supabase",
  "migrations",
  "20260830000200_scope_references_and_profiles.sql"
);
// Verbatim from 20260830000200_scope_references_and_profiles.sql lines 47-56
// (BACKEND V2.1/V2.3 audit) — used only if the sibling checkout above is
// unavailable in this environment.
const FALLBACK_BUILDING_IDS = [
  "B_MASJID", "B_DEWAN_MAHAWANGSA", "B_DEWAN_KULIAH", "B_PUSTAKA",
  "B_LANGKASUKA", "B_SERAMBI", "B_GARAJ", "B_ASTAKA",
  "B_SERI_LAKA", "B_SERI_PALAS", "B_SERI_TEMIN", "B_SERI_JERAI",
  "B_BLOK_KETUA_JABATAN", "B_KP_P1", "B_KP_P2", "B_KP_P3",
  "B_KP_P4", "B_KEDIAMAN_PENGARAH", "B_KAFETERIA_A", "B_KAFETERIA_B",
  "B_KAFETERIA_C", "B_KAFETERIA_PENTADBIRAN", "B_PENCAWANG_1",
  "B_PENCAWANG_2", "B_BLOK_TUTORAN_MAKMAL", "B_BLOK_AKADEMIK_S",
  "B_TENNIS_NW", "B_BASKETBALL_NW", "B_KOOP", "B_GUARD_W",
  "B_GUARD_S", "B_PADANG_UTAMA",
];

function loadExpectedDbBuildingIds() {
  try {
    const sql = fs.readFileSync(SIBLING_MIGRATION, "utf8");
    const match = sql.match(/insert into app\.building_scope_keys[\s\S]*?values([\s\S]*?);/);
    if (!match) return { ids: FALLBACK_BUILDING_IDS, source: "fallback (sibling migration found but pattern did not match)" };
    const ids = [...match[1].matchAll(/'([^']+)'\s*,\s*1\)/g)].map(m => m[1]);
    if (!ids.length) return { ids: FALLBACK_BUILDING_IDS, source: "fallback (no rows parsed)" };
    return { ids, source: "sibling migration file (live authoritative source)" };
  } catch {
    return { ids: FALLBACK_BUILDING_IDS, source: "fallback (sibling checkout not present in this environment)" };
  }
}

function loadFrontendBuildingIds() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "data/campus-buildings.js"), "utf8"), context, { filename: "data/campus-buildings.js" });
  return (context.window.CAMPUS_BUILDINGS || []).map(b => b.id);
}

{
  const frontendIds = loadFrontendBuildingIds();
  const { ids: dbIds, source } = loadExpectedDbBuildingIds();
  const frontendSet = new Set(frontendIds);
  const dbSet = new Set(dbIds);
  const inFrontendNotDb = frontendIds.filter(id => !dbSet.has(id));
  const inDbNotFrontend = dbIds.filter(id => !frontendSet.has(id));
  const duplicateFrontend = frontendIds.length !== frontendSet.size;
  const duplicateDb = dbIds.length !== dbSet.size;
  const allCanonicalFormat = frontendIds.every(id => /^B_[A-Z0-9_]+$/.test(id));
  check("1a. All frontend Building IDs exist in DB building_scope_keys (no frontend orphan)", inFrontendNotDb.length === 0, `source=${source}; orphans=${JSON.stringify(inFrontendNotDb)}`);
  check("1b. All DB building_scope_keys exist in frontend directory (no DB orphan)", inDbNotFrontend.length === 0, `orphans=${JSON.stringify(inDbNotFrontend)}`);
  check("1c. No duplicate Building IDs on either side", !duplicateFrontend && !duplicateDb);
  check("1d. Every frontend Building ID matches DB canonical pattern ^B_[A-Z0-9_]+$ (identity mapping, no transform needed)", allCanonicalFormat);
  check("1e. Set sizes match (32 = 32 at time of writing, but asserted generically)", frontendIds.length === dbIds.length, `frontend=${frontendIds.length} db=${dbIds.length}`);
}

// ---------------------------------------------------------------------
// 2. KMK Building college source resolves to 1 — derived from the real
//    organizations array, not a bare literal, and exposed as window.KMK_COLLEGE_ID.
// ---------------------------------------------------------------------
{
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app-data.js"), "utf8"), context, { filename: "app-data.js" });
  check("2. window.KMK_COLLEGE_ID resolves to 1 via organizations, not a bare literal", context.window.KMK_COLLEGE_ID === 1);
}

// ---------------------------------------------------------------------
// Shared fake Supabase client + sandbox for repository/adapter/service tests
// ---------------------------------------------------------------------
function makeFakeClient({ tableData = {}, rpcHandlers = {} } = {}) {
  const calls = { from: [], rpc: [] };
  function makeQuery(table) {
    const record = { table, eq: [], in: [], select: null, order: [], limit: null };
    calls.from.push(record);
    const rows = () => (typeof tableData[table] === "function" ? tableData[table](record) : (tableData[table] || []));
    const builder = {
      select(cols) { record.select = cols; return builder; },
      eq(col, val) { record.eq.push([col, val]); return builder; },
      in(col, vals) { record.in.push([col, vals]); return builder; },
      order(col, opts) { record.order.push([col, opts]); return builder; },
      limit(n) { record.limit = n; return Promise.resolve({ data: rows(), error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
    };
    return builder;
  }
  return {
    calls,
    from: table => makeQuery(table),
    rpc: (name, params) => {
      calls.rpc.push({ name, params });
      const handler = rpcHandlers[name];
      const result = handler ? handler(params) : { data: null, error: null };
      return Promise.resolve(result);
    },
  };
}

function makeSandbox({ tableData, rpcHandlers } = {}) {
  const fakeClient = makeFakeClient({ tableData, rpcHandlers });
  const context = {
    window: {
      CommunitySupabaseClient: { getClient: async () => fakeClient },
      SupabaseAuthProvider: { upsertProfile: async () => {} },
    },
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  const load = file => vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  load("services/community-service.js");
  load("services/community-row-adapter.js");
  load("services/community-supabase-repositories.js");
  load("services/community-data-provider.js");
  return { context, fakeClient };
}

function publishedPostRow(overrides = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    post_type: "discussion",
    scope_type: "building",
    college_id: 1,
    jurusan_id: null,
    building_id: "B_PUSTAKA",
    content: "hello",
    category: "academic",
    shape: "rounded",
    color: "#DBEAFE",
    rotation: 0,
    position_x: 10,
    position_y: 15,
    display_author_mode: "anonymous",
    author_label: "Anonymous",
    question_status: null,
    is_seed: false,
    seed_source: null,
    seed_version: null,
    seed_base_score: 0,
    real_vote_score: 0,
    display_score: 0,
    created_at: "2026-09-04T00:00:00Z",
    updated_at: "2026-09-04T00:00:00Z",
    can_manage_question: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Building row adapter / contextType
// ---------------------------------------------------------------------
{
  const { context } = makeSandbox();
  const row = publishedPostRow();
  const post = context.window.CommunityRowAdapter.postFromRow(row);
  check("18a. A building-scope row adapts to contextType=\"building\" (never \"community\")", post.contextType === "building");
  check("18b. Building post carries no communityKey (comment-thread gating never treats it as Community)", post.communityKey === null || post.communityKey === undefined);
  check("Building post placeId is the canonical DB building_id verbatim", post.placeId === "B_PUSTAKA");
  check("Building post orgId is the row's college_id", post.orgId === 1);
  check("Building post never exposes owner identity (same guarantee as Community)", post.authorUserId === "");
}
{
  // 19. Community comments/rows still adapt exactly as V2.2 — unaffected regression check.
  const { context } = makeSandbox();
  const row = publishedPostRow({ scope_type: "all_km", college_id: null, building_id: null });
  const post = context.window.CommunityRowAdapter.postFromRow(row);
  check("19. Community (all_km) row still adapts to contextType=\"community\" with communityKey (V2.2 unchanged)", post.contextType === "community" && post.communityKey === "global:all");
}

// ---------------------------------------------------------------------
// 3/4. Building read filter + create RPC payload
// ---------------------------------------------------------------------
{
  const { context, fakeClient } = makeSandbox({
    tableData: { posts_public: [publishedPostRow()] },
  });
  return_await(async () => {
    const posts = await context.window.CommunitySupabaseRepositories.posts.listBuilding(1, "B_PUSTAKA");
    const query = fakeClient.calls.from.find(q => q.table === "posts_public");
    check("3a. Building read filters scope_type=building server-side", query.eq.some(([c, v]) => c === "scope_type" && v === "building"));
    check("3b. Building read filters college_id server-side (not fetched globally then filtered)", query.eq.some(([c, v]) => c === "college_id" && v === 1));
    check("3c. Building read filters building_id server-side, verbatim canonical value", query.eq.some(([c, v]) => c === "building_id" && v === "B_PUSTAKA"));
    check("3d. Building read returns adapted posts with contextType=\"building\"", posts.length === 1 && posts[0].contextType === "building");
  });
}
{
  const { context, fakeClient } = makeSandbox({
    rpcHandlers: { create_post: () => ({ data: null, error: null }) },
    tableData: { posts_public: [] },
  });
  return_await(async () => {
    await context.window.CommunitySupabaseRepositories.posts.createBuilding({
      collegeId: 1, buildingId: "B_PUSTAKA", postType: "discussion", content: "hi",
      category: "academic", shape: "rounded", color: "#DBEAFE", isAnonymous: true,
    });
    const call = fakeClient.calls.rpc.find(c => c.name === "create_post");
    check("4a. Building create calls api.create_post (not a new/second RPC)", Boolean(call));
    check("4b. Building create sends p_scope_type=\"building\"", call?.params.p_scope_type === "building");
    check("4c. Building create sends canonical p_building_id verbatim (no case/prefix conversion)", call?.params.p_building_id === "B_PUSTAKA");
    check("4d. Building create sends the correct p_college_id (KMK=1)", call?.params.p_college_id === 1);
    check("4e. Building create never sends p_jurusan_id for a building post", call?.params.p_jurusan_id === null);
  });
}

// ---------------------------------------------------------------------
// 5/6/7/8/9. Map anchor normalization + create_map_post payload + same-UUID
// ---------------------------------------------------------------------
{
  const anchorRow = { post_id: "22222222-2222-2222-2222-222222222222", building_id: "B_PUSTAKA", college_id: 1, lat: 6.423939, lng: 100.417013, created_at: "2026-09-04T00:00:00Z" };
  const postRow = publishedPostRow({ id: anchorRow.post_id });
  const { context, fakeClient } = makeSandbox({
    tableData: {
      post_map_anchors_public: [anchorRow],
      posts_public: query => (query.in.some(([c]) => c === "id") ? [postRow] : []),
    },
  });
  return_await(async () => {
    const records = await context.window.CommunitySupabaseRepositories.mapAnchors.list(1);
    check("5a. Map anchor read filters college_id server-side", fakeClient.calls.from.find(q => q.table === "post_map_anchors_public").eq.some(([c, v]) => c === "college_id" && v === 1));
    check("5b. Map anchor list joins to posts_public by post_id (no raw app.posts exposure)", fakeClient.calls.from.some(q => q.table === "posts_public" && q.in.some(([c, vals]) => c === "id" && vals.includes(anchorRow.post_id))));
    check("5c. Map anchor record carries lat/lng from the anchor row", records.length === 1 && records[0].lat === 6.423939 && records[0].lng === 100.417013);
    check("7. Map anchor lat/lng pass through as real WGS84 numbers, unconverted", Math.abs(records[0].lat - 6.423939) < 1e-9 && Math.abs(records[0].lng - 100.417013) < 1e-9);
    check("5d. Map anchor record still carries the canonical post's contextType=\"building\"/placeId", records[0].contextType === "building" && records[0].placeId === "B_PUSTAKA");
  });
}
{
  const returnedPostRow = publishedPostRow({ id: "33333333-3333-3333-3333-333333333333", building_id: "B_PUSTAKA", college_id: 1 });
  const { context, fakeClient } = makeSandbox({
    rpcHandlers: { create_map_post: () => ({ data: [returnedPostRow], error: null }) },
    tableData: { posts_public: [], post_map_anchors_public: [] },
  });
  return_await(async () => {
    const post = await context.window.CommunitySupabaseRepositories.mapAnchors.create({
      buildingId: "B_PUSTAKA", lat: 6.423939, lng: 100.417013, postType: "discussion",
      content: "map note", category: "academic", shape: "rounded", color: "#DBEAFE", isAnonymous: true,
    });
    const createMapCalls = fakeClient.calls.rpc.filter(c => c.name === "create_map_post");
    const createPostCalls = fakeClient.calls.rpc.filter(c => c.name === "create_post");
    check("6a. Map Post Directly calls api.create_map_post exactly once", createMapCalls.length === 1);
    check("9. Map Post Directly NEVER also calls api.create_post (no duplicate canonical post)", createPostCalls.length === 0);
    check("6b. create_map_post receives real WGS84 lat/lng, not building.center or any converted value", createMapCalls[0].params.p_lat === 6.423939 && createMapCalls[0].params.p_lng === 100.417013);
    check("6c. create_map_post receives canonical building_id verbatim", createMapCalls[0].params.p_building_id === "B_PUSTAKA");
    check("8. Same-UUID invariant: the post returned to the caller has remoteId === the RPC's returned row id", post.remoteId === returnedPostRow.id);
  });
}

// ---------------------------------------------------------------------
// 10/11/12/13/14/16/17/20. Realtime — building + map scope matching, single
// channel, concurrency-safe, raw-table-free.
// ---------------------------------------------------------------------
function makeRealtimeSandbox() {
  const dispatched = [];
  const timers = new Map();
  let nextTimerId = 1;
  let postgresChangesHandler = null;
  const channelCalls = { count: 0, names: [] };
  const channel = {
    on(_kind, _filter, handler) { postgresChangesHandler = handler; return channel; },
    subscribe(handler) { handler("SUBSCRIBED"); return channel; },
  };
  const client = {
    channel(name) { channelCalls.count += 1; channelCalls.names.push(name); return channel; },
    async removeChannel() {},
  };
  const sandbox = {
    console,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    setTimeout(handler) { const id = nextTimerId++; timers.set(id, handler); return id; },
    clearTimeout(id) { timers.delete(id); },
    dispatchEvent(event) { dispatched.push(event); },
    CommunityService: {
      parseCommunityKey(value) {
        if (value === "global:all") return { scope: "global", orgId: null, majorId: null };
        const [scope, orgId, majorId] = String(value).split(":");
        if (scope === "college") return { scope, orgId: Number(orgId), majorId: null };
        if (scope === "jurusan") return { scope, orgId: Number(orgId), majorId: Number(majorId) };
        return null;
      },
    },
    CommunitySupabaseClient: { async getClient() { return client; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "services/community-realtime-service.js"), "utf8"), sandbox, { filename: "services/community-realtime-service.js" });
  return {
    service: sandbox.CommunityRealtimeService,
    dispatched,
    channelCalls,
    emit(row) {
      assert.equal(typeof postgresChangesHandler, "function", "Realtime handler must be registered");
      postgresChangesHandler({ new: row });
      for (const [id, handler] of [...timers]) { timers.delete(id); handler(); }
    },
    clear() { dispatched.length = 0; },
  };
}

function buildingSignal(overrides = {}) {
  return { event_type: "post_created", scope_type: "building", college_id: 1, jurusan_id: null, building_id: "B_PUSTAKA", post_id: "post-1", ...overrides };
}

{
  const h = makeRealtimeSandbox();
  return_await(async () => {
    await h.service.subscribeToBuildingScope(1, "B_PUSTAKA");
    h.emit(buildingSignal());
    check("10. Building realtime: matching college+building wakes the subscription", h.dispatched.some(e => e.detail.reason === "scope"));

    h.clear();
    h.emit(buildingSignal({ building_id: "B_MASJID" }));
    check("11. Wrong Building (same college) does NOT wake the subscription", !h.dispatched.some(e => e.detail.reason === "scope"));

    h.clear();
    h.emit(buildingSignal({ college_id: 2 }));
    check("12. Wrong college (same building_id) does NOT wake the subscription — building_id alone is not sufficient", !h.dispatched.some(e => e.detail.reason === "scope"));
  });
}
{
  const h = makeRealtimeSandbox();
  return_await(async () => {
    await h.service.subscribeToMapScope(1);
    h.emit(buildingSignal({ building_id: "B_PUSTAKA" }));
    const firstMatch = h.dispatched.some(e => e.detail.reason === "scope");
    h.clear();
    h.emit(buildingSignal({ building_id: "B_MASJID" }));
    const secondMatch = h.dispatched.some(e => e.detail.reason === "scope");
    check("13. Map (college-level) invalidation wakes on ANY building within the college", firstMatch && secondMatch);

    h.clear();
    h.emit(buildingSignal({ college_id: 2, building_id: "B_PUSTAKA" }));
    check("14. Map subscription rejects a same-building event from a different college", !h.dispatched.some(e => e.detail.reason === "scope"));
  });
}
{
  // 16/17. Single channel + concurrency regression (V2.2's channelPromise
  // fix, re-verified after adding Building/Map subscription entry points).
  const h = makeRealtimeSandbox();
  return_await(async () => {
    const p1 = h.service.subscribeToBuildingScope(1, "B_PUSTAKA");
    const p2 = h.service.subscribeToMapScope(1);
    await Promise.all([p1, p2]);
    check("16/17. Concurrent Building+Map subscribe calls still create exactly ONE channel (channelPromise memoization holds)", h.channelCalls.count === 1);
  });
}
{
  // 20. The channel's only postgres_changes binding is app.realtime_events —
  // static source check (no raw Community/Building table subscription was
  // introduced by this round's changes).
  const src = fs.readFileSync(path.join(ROOT, "services/community-realtime-service.js"), "utf8");
  const bindingMatches = [...src.matchAll(/schema:\s*"([^"]+)"\s*,\s*table:\s*"([^"]+)"/g)];
  check("20. The only postgres_changes binding anywhere in the realtime service targets app.realtime_events", bindingMatches.length === 1 && bindingMatches[0][1] === "app" && bindingMatches[0][2] === "realtime_events", JSON.stringify(bindingMatches));
}

// ---------------------------------------------------------------------
// 15. Community V2.2 scope keys still work (global:all / college:1 / jurusan:1:1)
// ---------------------------------------------------------------------
{
  const h = makeRealtimeSandbox();
  return_await(async () => {
    await h.service.subscribeToScope("global:all");
    h.emit({ event_type: "post_created", scope_type: "all_km", college_id: null, jurusan_id: null, building_id: null, post_id: "p1" });
    const allKm = h.dispatched.some(e => e.detail.reason === "scope");
    h.clear();
    await h.service.subscribeToScope("college:1");
    h.emit({ event_type: "post_created", scope_type: "college", college_id: 1, jurusan_id: null, building_id: null, post_id: "p2" });
    const college = h.dispatched.some(e => e.detail.reason === "scope");
    h.clear();
    await h.service.subscribeToScope("jurusan:1:1");
    h.emit({ event_type: "post_created", scope_type: "jurusan", college_id: 1, jurusan_id: 1, building_id: null, post_id: "p3" });
    const jurusan = h.dispatched.some(e => e.detail.reason === "scope");
    check("15. Community V2.2 scope keys (global:all/college:1/jurusan:1:1) still match correctly after adding Building/Map scope types", allKm && college && jurusan);
  });
}

// ---------------------------------------------------------------------
// 18/19 (UI layer). Building comments disabled, Community comments intact —
// static source checks against the real app-wall.js.
// ---------------------------------------------------------------------
{
  const wallSource = fs.readFileSync(path.join(ROOT, "app-wall.js"), "utf8");
  check("18c. app-wall.js gates comment UI on contextType===\"community\" (Building never renders a composer)", /note\.contextType === "community" \? renderCommentsSectionHTML/.test(wallSource));
  check("18d. openModal's comment auto-fetch is gated on contextType===\"community\" too (no wasted/leaky fetch for Building)", /note\.isRemote && note\.contextType === "community" && !CommunityDataProvider\.commentsLoaded/.test(wallSource));
  check("18e. refetchOpenModalCommentsIfAny is gated on contextType===\"community\"", /post\.contextType !== "community"/.test(wallSource));
  check("19b. Building Wall create routes through createBuildingPost (api.create_post), not a raw table insert or a new RPC", /CommunityDataProvider\.createBuildingPost/.test(wallSource) && !/\.from\("posts"\)\.insert/.test(wallSource));
}

// ---------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------
async function main() {
  await Promise.all(pending);
  const failed = results.filter(r => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.name}${r.pass || !r.detail ? "" : ` (${r.detail})`}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
  if (failed.length) process.exit(1);
}

await main();
