#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "app-wall.js"), "utf8");
function extractFunction(name) {
  const functionStart = source.indexOf(`function ${name}(`);
  assert.notEqual(functionStart, -1, `missing function ${name}`);
  const start = source.slice(Math.max(0, functionStart - 6), functionStart) === "async " ? functionStart - 6 : functionStart;
  const open = source.indexOf("{", functionStart);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const post = { id: 1234567890, remoteId: "post-uuid", isRemote: true, contextType: "community", communityKey: "jurusan:1:2", placeId: "", imageUrl: "https://res.cloudinary.com/lrx0uf7z/image/upload/photo.jpg" };
const calls = { remote: [], local: [], refreshCommunity: 0, refreshBuilding: 0 };
let currentPost = post;
let remoteRequested = true;
let refreshFindsPost = true;
let remoteCommentCount = 0;
let filterNotes = [];
let localCountReads = 0;
let wallState = { contextType: "community", communityKey: "jurusan:1:2", placeId: "" };
let rootInput = { value: "ROOT TEST", checked: false };
let replyInput = { value: "REPLY TEST", checked: false };
const staleLocal = [{ id: 9, content: "STALE LOCAL COMMENT", replies: [] }];
const commentService = {
  createComment(payload) { calls.local.push(payload); },
  getCommentThreadForPost() { return staleLocal; },
  getCommentCount() { localCountReads += 1; return staleLocal.length; },
};
const provider = {
  isRemoteRequested: () => remoteRequested,
  findPost: id => currentPost && String(currentPost.id) === String(id) ? currentPost : null,
  async refreshPosts(key) { calls.refreshCommunity += 1; assert.equal(key, wallState.communityKey); currentPost = refreshFindsPost ? post : null; },
  async refreshBuildingPosts(collegeId, buildingId) { calls.refreshBuilding += 1; assert.equal(collegeId, 7); assert.equal(buildingId, wallState.placeId); currentPost = buildingPost; },
  async createComment(target, payload) { calls.remote.push({ target, payload }); },
  commentThread: () => [],
  commentCount: () => remoteCommentCount,
};
const buildingPost = { ...post, contextType: "building", communityKey: null, placeId: "B_LIB", remoteId: "building-post-uuid" };
const window = { CommunityDataProvider: provider, CommentService: commentService, KMK_COLLEGE_ID: 7 };
const elements = {
  "comment-input": { value: "COMMUNITY ROOT", closest: () => null },
  "comment-show-name": { checked: false },
  "reply-input-17": { value: "COMMUNITY REPLY", closest: () => null },
  "reply-show-name-17": { checked: false },
};
const context = vm.createContext({
  window, wallState, CommunityDataProvider: provider, CommentService: commentService,
  PermissionService: { canUserComment: () => true },
  getWallCurrentUser: () => ({ id: "user-1", displayName: "" }),
  ensureNamedRemoteProfile: async () => {},
  showToast: message => { context.lastToast = message; },
  I18n: { t: key => key }, escapeHtml: value => String(value),
  document: { getElementById: id => elements[id] || null },
  renderWallNotes() {}, openModal() {},
  findWallNote: id => provider.findPost(id),
  getContextNotes: () => filterNotes,
  getDisplayedNoteEngagementScore: () => 0,
  buildCommentHTML: comment => `<p>${comment.content}</p>`,
  Number, String, Boolean, Object, Promise,
});
const functions = [
  "isRemoteCommunityContext", "isRemoteBuildingContext", "isRemoteWallContext",
  "supportsRemoteComments", "isCurrentWallRemotePost", "resolveRemoteCommentPost",
  "renderCommentsSectionHTML", "submitComment", "getFilteredNotes",
].map(extractFunction).join("\n");
vm.runInContext(`${functions}\nwindow.test = { resolveRemoteCommentPost, renderCommentsSectionHTML, submitComment, isCurrentWallRemotePost, getFilteredNotes };`, context);
const test = window.test;
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

await test.submitComment(post.id);
check("remote Community root comment uses provider RPC path", calls.remote.at(-1)?.target === post && calls.remote.at(-1)?.payload.parentCommentId === null);
elements["reply-input-17"].value = "COMMUNITY REPLY";
await test.submitComment(post.id, 17);
check("remote Community reply uses provider RPC path", calls.remote.at(-1)?.payload.parentCommentId === 17);

wallState = context.wallState = { contextType: "building", placeId: "B_LIB", communityKey: "" };
currentPost = buildingPost;
elements["comment-input"].value = "BUILDING ROOT";
await test.submitComment(buildingPost.id);
check("remote Building root comment uses provider RPC path", calls.remote.at(-1)?.target === buildingPost && calls.remote.at(-1)?.payload.parentCommentId === null);
elements["reply-input-17"].value = "BUILDING REPLY";
await test.submitComment(buildingPost.id, 17);
check("remote Building reply uses provider RPC path", calls.remote.at(-1)?.target === buildingPost && calls.remote.at(-1)?.payload.parentCommentId === 17);
check("canonical remote Community and Building contexts never write to CommentService", calls.local.length === 0);

wallState = context.wallState = { contextType: "community", communityKey: "jurusan:1:2", placeId: "" };
currentPost = null;
const beforeRefresh = calls.refreshCommunity;
await test.submitComment(post.id);
check("missing remote post is refreshed once and retried through Supabase", calls.refreshCommunity === beforeRefresh + 1 && calls.local.length === 0 && calls.remote.length === 5);
refreshFindsPost = false;
currentPost = null;
const beforeRemoteWrite = calls.remote.length;
await test.submitComment(post.id);
check("still-unresolved remote post shows an error without a LocalStorage write", calls.remote.length === beforeRemoteWrite && calls.local.length === 0 && context.lastToast === "comments.postUnavailable");

remoteRequested = false;
elements["comment-input"].value = "LOCAL DEMO COMMENT";
await test.submitComment(post.id);
check("local/demo Community continues to use CommentService", calls.local.length === 1 && calls.local[0].content === "LOCAL DEMO COMMENT");

remoteRequested = true;
currentPost = null;
const renderedMissing = test.renderCommentsSectionHTML(post.id);
check("remote rendering excludes stale LocalStorage comments when post is unresolved", !renderedMissing.includes("STALE LOCAL COMMENT") && !renderedMissing.includes("comment-input"));
currentPost = post;
const renderedRemote = test.renderCommentsSectionHTML(post.id);
check("remote rendering reads provider thread and ignores stale LocalStorage comments", !renderedRemote.includes("STALE LOCAL COMMENT") && renderedRemote.includes("comments.empty"));
check("photo post remains eligible for remote comments", post.imageUrl.includes("cloudinary") && test.isCurrentWallRemotePost(post));
check("remote replies preserve the stable parent UI ID for UUID mapping", calls.remote[1]?.payload.parentCommentId === 17 && calls.remote[3]?.payload.parentCommentId === 17);

wallState = context.wallState = { contextType: "community", communityKey: "jurusan:1:2", placeId: "", sort: "unanswered", category: "all", postType: "all", search: "" };
filterNotes = [{ ...post, postType: "question", questionStatus: "open", createdAt: "2026-09-25T00:00:00Z" }];
remoteCommentCount = 0;
const localReadsBeforeFilter = localCountReads;
check("remote Unanswered filter uses the Supabase comment cache, not stale LocalStorage count", test.getFilteredNotes().length === 1 && localCountReads === localReadsBeforeFilter);
remoteCommentCount = 1;
check("remote Unanswered filter excludes a question with a cached remote comment", test.getFilteredNotes().length === 0 && localCountReads === localReadsBeforeFilter);

for (const result of checks) console.log(`${result.pass ? "PASS" : "FAIL"} - ${result.name}`);
const passed = checks.filter(item => item.pass).length;
console.log(`\n${passed}/${checks.length} assertions passed.`);
assert.equal(passed, checks.length, "remote comment routing assertions failed");
