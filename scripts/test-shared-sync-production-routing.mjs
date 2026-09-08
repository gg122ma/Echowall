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

function row(overrides = {}) {
  return {
    id: "893daf79-67ac-4a6b-8554-ec2563f81a3e",
    post_type: "discussion", scope_type: "jurusan", college_id: 14, jurusan_id: 40,
    building_id: null, content: "owner community visibility fixture", category: "campus_life",
    shape: "rounded", color: "#BBF7D0", rotation: 0, position_x: 10, position_y: 15,
    display_author_mode: "anonymous", author_label: "Anonymous", question_status: null,
    is_seed: false, seed_source: null, seed_version: null, seed_base_score: 0,
    real_vote_score: 0, display_score: 0, created_at: "2026-09-07T17:21:24.625902Z",
    updated_at: "2026-09-07T17:21:24.625902Z", can_manage_question: false,
    ...overrides,
  };
}

function createCloud() {
  return { posts: [row()], anchors: [], comments: [], votes: new Map(), sequence: 1 };
}

function createClient(cloud, authenticated = true) {
  const calls = { from: [], rpc: [] };
  function filtered(table, query) {
    const source = table === "posts_public" ? cloud.posts
      : table === "post_map_anchors_public" ? cloud.anchors
      : table === "comments_public" ? cloud.comments : [];
    return source.filter(item => query.eq.every(([key, value]) => item[key] === value)
      && query.in.every(([key, values]) => values.includes(item[key])));
  }
  function from(table) {
    const query = { table, eq: [], in: [] };
    calls.from.push(query);
    const builder = {
      select() { return builder; },
      eq(key, value) { query.eq.push([key, value]); return builder; },
      in(key, values) { query.in.push([key, values]); return builder; },
      order() { return builder; },
      limit() { return Promise.resolve({ data: filtered(table, query), error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: filtered(table, query), error: null }).then(resolve, reject); },
    };
    return builder;
  }
  async function rpc(name, params) {
    calls.rpc.push({ name, params });
    if (!authenticated) return { data: null, error: { code: "42501", status: 403 } };
    if (name === "create_post") {
      const created = row({
        id: `building-${cloud.sequence++}`, scope_type: params.p_scope_type,
        college_id: params.p_college_id, jurusan_id: params.p_jurusan_id,
        building_id: params.p_building_id, content: params.p_content,
        category: params.p_category, shape: params.p_shape, color: params.p_color,
        display_author_mode: params.p_display_author_mode,
      });
      cloud.posts.push(created);
      return { data: [created], error: null };
    }
    if (name === "create_map_post") {
      const created = row({
        id: `map-${cloud.sequence++}`, scope_type: "building", college_id: 1,
        jurusan_id: null, building_id: params.p_building_id, content: params.p_content,
        category: params.p_category, shape: params.p_shape, color: params.p_color,
        display_author_mode: params.p_display_author_mode,
      });
      cloud.posts.push(created);
      cloud.anchors.push({ post_id: created.id, building_id: created.building_id, college_id: 1, lat: params.p_lat, lng: params.p_lng });
      return { data: [created], error: null };
    }
    if (name === "create_comment" || name === "create_reply") {
      const parent = name === "create_reply" ? cloud.comments.find(item => item.id === params.p_parent_comment_id) : null;
      const created = {
        id: `comment-${cloud.sequence++}`, post_id: parent?.post_id || params.p_post_id,
        parent_comment_id: parent?.id || null, content: params.p_content,
        display_author_mode: params.p_display_author_mode, author_label: "Anonymous",
        created_at: new Date(cloud.sequence * 1000).toISOString(), updated_at: new Date(cloud.sequence * 1000).toISOString(),
      };
      cloud.comments.push(created);
      return { data: [created], error: null };
    }
    if (name === "cast_vote") {
      cloud.votes.set(params.p_post_id, params.p_value);
      const post = cloud.posts.find(item => item.id === params.p_post_id);
      if (post) post.display_score = params.p_value;
      return { data: [{ post_id: params.p_post_id, current_vote: params.p_value, display_score: params.p_value }], error: null };
    }
    return { data: [], error: null };
  }
  return { calls, from, rpc };
}

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    dump: () => [...values.entries()],
  };
}

function createProvider(cloud, authenticated = true) {
  const localStorage = createStorage();
  const client = createClient(cloud, authenticated);
  const window = {
    localStorage,
    CommunitySupabaseClient: {
      getActivationState: () => ({ mode: "supabase-production" }),
      getClient: async () => client,
      getPublicClient: async () => client,
    },
    SupabaseAuthProvider: {
      getCurrentUser: () => authenticated ? { id: "qa", displayName: "QA" } : null,
      ready: async () => authenticated ? { id: "qa" } : null,
    },
    AuthService: { getCurrentUser: () => null },
  };
  window.window = window;
  const context = { window, localStorage, console, Map, Set, Object, Number, String, Boolean, Error };
  vm.createContext(context);
  for (const file of [
    "services/community-service.js",
    "services/community-row-adapter.js",
    "services/community-supabase-repositories.js",
    "services/community-data-provider.js",
  ]) vm.runInContext(read(file), context, { filename: file });
  return { provider: window.CommunityDataProvider, client, storage: localStorage };
}

// Canonical production activation includes both documents, never another origin/path.
{
  const production = { origin: "https://gg122ma.github.io", basePath: "/Echowall/", url: "https://iavndheqyzphcppfisil.supabase.co", publishableKey: "sb_publishable_test" };
  const evaluate = pathname => {
    const window = { EchoConfig: { community: { production, staging: {} } }, location: { origin: production.origin, pathname, protocol: "https:", hostname: "gg122ma.github.io" } };
    window.window = window;
    vm.createContext(window);
    vm.runInContext(read("services/community-supabase-client.js"), window);
    return window.CommunitySupabaseClient.isCanonicalProduction();
  };
  check("canonical index routes activate Supabase", evaluate("/Echowall/") && evaluate("/Echowall/index.html"));
  check("canonical map route activates Supabase", evaluate("/Echowall/map.html"));
  check("non-canonical path does not activate Supabase", !evaluate("/other/map.html"));
}

const cloud = createCloud();
const sessionA = createProvider(cloud, true);
check("canonical Community routes to Supabase", sessionA.provider.routeFor("community", "jurusan") === "supabase");
check("canonical Map routes to Supabase", sessionA.provider.routeFor("map") === "supabase");
check("canonical Building Wall routes to Supabase", sessionA.provider.routeFor("building") === "supabase");

const ownerRows = await sessionA.provider.refreshPosts("jurusan:14:40");
const ownerQuery = sessionA.client.calls.from.at(-1);
check("Community query uses scope_type=jurusan, college_id=14, jurusan_id=40",
  [["scope_type", "jurusan"], ["college_id", 14], ["jurusan_id", 40]].every(expected => ownerQuery.eq.some(actual => actual[0] === expected[0] && actual[1] === expected[1])));
check("production-shaped Community row adapts to jurusan:14:40", ownerRows.length === 1 && ownerRows[0].communityKey === "jurusan:14:40" && ownerRows[0].contextType === "community");
check("UI identity cache never stores post content", !JSON.stringify(sessionA.storage.dump()).includes("owner community visibility fixture"));

const freshCommunitySession = createProvider(cloud, false);
const freshOwnerRows = await freshCommunitySession.provider.refreshPosts("jurusan:14:40");
check("fresh anonymous provider reads the same Community post", freshOwnerRows.length === 1 && freshOwnerRows[0].remoteId === ownerRows[0].remoteId);

await sessionA.provider.createBuildingPost({ collegeId: 1, buildingId: "B_PUSTAKA", postType: "discussion", content: "QA building", category: "academic", shape: "rounded", color: "#DBEAFE", isAnonymous: true });
const buildingPost = cloud.posts.find(item => item.content === "QA building");
check("Building create uses authenticated create_post with authoritative scope", Boolean(buildingPost) && buildingPost.scope_type === "building" && buildingPost.building_id === "B_PUSTAKA" && buildingPost.college_id === 1);

await sessionA.provider.createMapPost({ buildingId: "B_PUSTAKA", lat: 6.439, lng: 100.193, postType: "discussion", content: "QA map", category: "campus_life", shape: "rounded", color: "#BBF7D0", isAnonymous: true });
const mapPost = cloud.posts.find(item => item.content === "QA map");
check("Map create atomically produces post and matching anchor", Boolean(mapPost) && cloud.anchors.some(anchor => anchor.post_id === mapPost.id && anchor.building_id === "B_PUSTAKA"));

const freshSharedSession = createProvider(cloud, false);
const freshMap = await freshSharedSession.provider.refreshMapAnchors(1);
check("fresh anonymous provider reconstructs Map post and coordinates", freshMap.some(item => item.remoteId === mapPost.id && item.lat === 6.439 && item.lng === 100.193));
const freshBuilding = await freshSharedSession.provider.refreshBuildingPosts(1, "B_PUSTAKA");
check("fresh anonymous provider reads Building posts", freshBuilding.some(item => item.remoteId === buildingPost.id));
const otherBuilding = await freshSharedSession.provider.refreshBuildingPosts(1, "B_MASJID");
check("Building A/B scope isolation holds", otherBuilding.every(item => item.placeId === "B_MASJID"));

const adaptedBuilding = freshBuilding.find(item => item.remoteId === buildingPost.id);
await sessionA.provider.createComment(adaptedBuilding, { content: "QA comment", isAnonymous: true });
await sessionA.provider.refreshComments(adaptedBuilding);
const parent = sessionA.provider.commentsFor(adaptedBuilding)[0];
await sessionA.provider.createComment(adaptedBuilding, { parentCommentId: parent.id, content: "QA reply", isAnonymous: true });
await sessionA.provider.castVote(adaptedBuilding, 1);
const thirdSession = createProvider(cloud, false);
const thirdBuilding = (await thirdSession.provider.refreshBuildingPosts(1, "B_PUSTAKA")).find(item => item.remoteId === buildingPost.id);
await thirdSession.provider.refreshComments(thirdBuilding);
const thread = thirdSession.provider.commentThread(thirdBuilding);
check("Building comment and one-level reply survive a fresh provider", thread.length === 1 && thread[0].replies.length === 1);
check("Building vote score survives a fresh provider", thirdBuilding.score === 1);

const signedOut = createProvider(cloud, false);
await assert.rejects(() => signedOut.provider.createBuildingPost({ collegeId: 1, buildingId: "B_PUSTAKA", content: "blocked", category: "academic", shape: "rounded", color: "#DBEAFE", isAnonymous: true }), /sign in/i);
check("unauthenticated Building write is blocked", !cloud.posts.some(item => item.content === "blocked"));

const wallSource = read("app-wall.js");
const mapSource = read("features/map-note-overlay.js");
const mapHtml = read("map.html");
const authUiSource = read("services/auth-ui.js");
check("Community public refresh is not chained behind auth ready", !/CommunityDataProvider\.ready\(\)\s*\.then\(\(\) => CommunityDataProvider\.refreshPosts/.test(wallSource));
check("anonymous public views use a session-free Supabase client", /function getPublicClient[\s\S]*persistSession: false[\s\S]*autoRefreshToken: false/.test(read("services/community-supabase-client.js")) && /function readClient[\s\S]*getPublicClient/.test(read("services/community-supabase-repositories.js")));
check("new wall scopes reset category/search/type filters", /previousScopeIdentity[\s\S]*wallState\.category = "all"[\s\S]*wallState\.search = ""[\s\S]*wallState\.postType = "all"/.test(wallSource));
check("remote Building Wall reads and writes use the shared provider", /refreshBuildingPosts/.test(wallSource) && /createBuildingPost/.test(wallSource));
check("remote Map reads and writes use the shared provider", /refreshMapAnchors/.test(mapSource) && /createMapPost/.test(mapSource));
check("remote Map branch returns before local MapNoteService.create", mapSource.indexOf("createMapPost") < mapSource.indexOf("MapNoteService.create"));
check("map.html loads the shared Supabase stack without a realtime service", /community-supabase-client\.js/.test(mapHtml) && /community-data-provider\.js/.test(mapHtml) && !/community-realtime-service\.js/.test(mapHtml));
check("canonical Map navbar uses the same Supabase auth session as Post Directly", /pathname[\s\S]*endsWith\("\/map\.html"\)[\s\S]*return true/.test(authUiSource));
check("shared repositories do not persist post content to localStorage", !/localStorage/.test(read("services/community-supabase-repositories.js")));

console.log(`\n${passed}/${passed} assertions passed.`);
