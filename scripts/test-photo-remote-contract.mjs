#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const checks = [];
function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
}

const storage = new Map();
const window = {
  EchoConfig: { cloudinary: { cloudName: "das8chiyz" } },
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
  CommunityService: {
    parseCommunityKey: key => key === "global:all" ? { scope: "global", orgId: null, majorId: null } : null,
  },
  SupabaseAuthProvider: { getCurrentUser: () => ({ id: "diagnostic-user" }) },
};
window.window = window;
const rpcCalls = [];
const posts = [];
const commentRows = [];
let nextId = 1;

function rowFromRpc(name, params) {
  const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;
  const isBuilding = params.p_scope_type === "building" || name.startsWith("create_map_post");
  return {
    id,
    post_type: params.p_post_type || "discussion",
    scope_type: isBuilding ? "building" : (params.p_scope_type || "all_km"),
    college_id: params.p_college_id || 1,
    jurusan_id: params.p_jurusan_id || null,
    building_id: params.p_building_id || (isBuilding ? "B_TEST" : null),
    content: params.p_content || "Diagnostic post",
    category: params.p_category || "academic",
    shape: params.p_shape || "rounded",
    color: params.p_color || "#DBEAFE",
    display_author_mode: params.p_display_author_mode || "anonymous",
    image_url: params.p_media_secure_url || null,
    image_public_id: params.p_media_public_id || null,
    image_width: params.p_media_width || null,
    image_height: params.p_media_height || null,
    image_bytes: params.p_media_bytes || null,
    image_format: params.p_media_format || null,
    created_at: "2026-09-25T00:00:00Z",
  };
}

function queryFor(table) {
  const filters = [];
  const query = {
    select() { return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    in() { return this; },
    range() { return this; },
    order() { return this; },
    limit() { return this; },
    then(resolve, reject) {
      let data = table === "posts_public" ? posts.slice() : (table === "comments_public" ? commentRows.slice() : []);
      data = data.filter(row => filters.every(([key, value]) => String(row[key] ?? "") === String(value ?? "")));
      return Promise.resolve({ data, error: null, count: data.length }).then(resolve, reject);
    },
  };
  return query;
}

const client = {
  from: table => queryFor(table),
  async rpc(name, params) {
    rpcCalls.push({ name, params });
    if (name.startsWith("create_post") || name.startsWith("create_map_post")) {
      const row = rowFromRpc(name, params);
      posts.unshift(row);
      return { data: name.startsWith("create_map_post") ? [row] : null, error: null };
    }
    if (name === "create_comment") {
      commentRows.push({ id: `10000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`, post_id: params.p_post_id, parent_comment_id: null, content: params.p_content, display_author_mode: params.p_display_author_mode || "anonymous" });
    } else if (name === "create_reply") {
      const parent = commentRows.find(row => row.id === params.p_parent_comment_id);
      commentRows.push({ id: `10000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`, post_id: parent?.post_id || "", parent_comment_id: params.p_parent_comment_id, content: params.p_content, display_author_mode: params.p_display_author_mode || "anonymous" });
    }
    return { data: null, error: null };
  },
};
window.CommunitySupabaseClient = {
  getClient: async () => client,
  getPublicClient: async () => client,
};

const context = vm.createContext({ window, localStorage: window.localStorage, URL, Map, Set, Object, Number, String, Date, Promise, Math, console });
for (const file of ["services/community-row-adapter.js", "services/community-supabase-repositories.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}

const media = {
  publicId: "diagnostic/photo-1",
  secureUrl: "https://res.cloudinary.com/das8chiyz/image/upload/v1/diagnostic/photo-1.png",
  bytes: 1234,
  width: 1,
  height: 1,
  format: "png",
};
const mediaParameterNames = [
  "p_media_public_id", "p_media_secure_url", "p_media_bytes",
  "p_media_width", "p_media_height", "p_media_format",
].sort();

await window.CommunitySupabaseRepositories.posts.create({ communityKey: "global:all", content: "Community text", category: "academic", shape: "rounded", color: "#DBEAFE" });
await window.CommunitySupabaseRepositories.posts.create({ communityKey: "global:all", content: "Community photo", category: "academic", shape: "rounded", color: "#DBEAFE", photo: media });
const communityPosts = window.CommunitySupabaseRepositories.posts.cached("global:all");
const communityText = communityPosts.find(post => post.content === "Community text");
const communityPhoto = communityPosts.find(post => post.content === "Community photo");
const communityPhotoCall = rpcCalls.find(call => call.name === "create_post_with_media" && call.params.p_content === "Community photo");
check("valid photo metadata selects create_post_with_media", communityPhotoCall?.name === "create_post_with_media");
check("create_post_with_media receives exactly the six expected media parameters", JSON.stringify(Object.keys(communityPhotoCall?.params || {}).filter(key => key.startsWith("p_media_")).sort()) === JSON.stringify(mediaParameterNames));
check("create_post_with_media receives validated metadata values unchanged", communityPhotoCall?.params.p_media_public_id === media.publicId && communityPhotoCall?.params.p_media_secure_url === media.secureUrl && communityPhotoCall?.params.p_media_bytes === media.bytes && communityPhotoCall?.params.p_media_width === media.width && communityPhotoCall?.params.p_media_height === media.height && communityPhotoCall?.params.p_media_format === media.format);

await window.CommunitySupabaseRepositories.posts.createBuilding({ collegeId: 1, buildingId: "B_TEST", content: "Building text", category: "academic", shape: "rounded", color: "#DBEAFE" });
await window.CommunitySupabaseRepositories.posts.createBuilding({ collegeId: 1, buildingId: "B_TEST", content: "Building photo", category: "academic", shape: "rounded", color: "#DBEAFE", photo: media });
const buildingPosts = window.CommunitySupabaseRepositories.posts.cachedBuilding(1, "B_TEST");
const buildingText = buildingPosts.find(post => post.content === "Building text");
const buildingPhoto = buildingPosts.find(post => post.content === "Building photo");
const buildingPhotoCall = rpcCalls.find(call => call.name === "create_post_with_media" && call.params.p_content === "Building photo");
check("Building photo uses the same create_post_with_media RPC and media contract", Boolean(buildingPhotoCall) && JSON.stringify(Object.keys(buildingPhotoCall.params).filter(key => key.startsWith("p_media_")).sort()) === JSON.stringify(mediaParameterNames));

const mapPhoto = await window.CommunitySupabaseRepositories.mapAnchors.create({ buildingId: "B_TEST", lat: 1, lng: 2, content: "Map Direct photo", category: "academic", shape: "rounded", color: "#DBEAFE", photo: media });
const mapPhotoCall = rpcCalls.find(call => call.name === "create_map_post_with_media");
check("Map Direct photo uses create_map_post_with_media with the same six media parameters", Boolean(mapPhotoCall) && JSON.stringify(Object.keys(mapPhotoCall.params).filter(key => key.startsWith("p_media_")).sort()) === JSON.stringify(mediaParameterNames));

const wallSource = read("app-wall.js");
const remoteCommentsHelper = wallSource.match(/function supportsRemoteComments\(note\) \{[\s\S]*?\n\}/)?.[0];
const commentsSectionHelper = wallSource.match(/function hasCommentsSection\(note\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(remoteCommentsHelper && commentsSectionHelper, "comment eligibility helpers exist");
vm.runInContext(`${remoteCommentsHelper}\n${commentsSectionHelper}\nwindow.supportsRemoteComments = supportsRemoteComments; window.hasCommentsSection = hasCommentsSection;`, context);

for (const [label, post, expectedContext] of [
  ["text Community", communityText, "community"],
  ["photo Community", communityPhoto, "community"],
  ["text Building", buildingText, "building"],
  ["photo Building", buildingPhoto, "building"],
  ["Map Direct photo", mapPhoto, "building"],
]) {
  check(`${label} post is returned as remote with its expected scope`, post?.isRemote === true && post.contextType === expectedContext && Boolean(post.remoteId));
  check(`${label} post remains eligible for the shared remote comments section`, window.supportsRemoteComments(post) && window.hasCommentsSection(post));
  await window.CommunitySupabaseRepositories.comments.create(post, { content: `Comment on ${label}` });
}
const commentCalls = rpcCalls.filter(call => call.name === "create_comment");
check("text and photo posts across Community, Building, and Map use create_comment by remote UUID", commentCalls.length === 5 && commentCalls.every(call => /^00000000-0000-4000-8000-\d{12}$/.test(call.params.p_post_id)));
check("comment creation does not branch on attached photo fields", read("services/community-supabase-repositories.js").includes("p_post_id: post.remoteId") && !/function createComment[\s\S]*?imageUrl/.test(read("services/community-supabase-repositories.js")));
const communityPhotoRoot = window.CommunitySupabaseRepositories.comments.cached(communityPhoto)[0];
const mapPhotoRoot = window.CommunitySupabaseRepositories.comments.cached(mapPhoto)[0];
await window.CommunitySupabaseRepositories.comments.create(communityPhoto, { parentCommentId: communityPhotoRoot.id, content: "Reply on photo Community" });
await window.CommunitySupabaseRepositories.comments.create(mapPhoto, { parentCommentId: mapPhotoRoot.id, content: "Reply on Map Direct photo" });
const replyCalls = rpcCalls.filter(call => call.name === "create_reply");
check("photo Community and Map Direct replies use create_reply with parent comment UUIDs", replyCalls.length === 2 && replyCalls.every(call => /^10000000-0000-4000-8000-\d{12}$/.test(call.params.p_parent_comment_id)));

for (const result of checks) console.log(`${result.pass ? "PASS" : "FAIL"} - ${result.name}`);
const passed = checks.filter(result => result.pass).length;
console.log(`\n${passed}/${checks.length} assertions passed.`);
assert.equal(passed, checks.length, "remote photo and comment contract assertions failed");
