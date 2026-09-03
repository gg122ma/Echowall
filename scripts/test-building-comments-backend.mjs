#!/usr/bin/env node
/**
 * BACKEND V2.3b — Building Wall Comments + Replies.
 *
 * Loads the REAL shipped source files (services/community-row-adapter.js,
 * services/community-supabase-repositories.js, services/community-service.js,
 * services/community-data-provider.js, services/community-realtime-service.js)
 * into a Node vm sandbox with a fake Supabase client/channel — this is the
 * actual production code, run against fixtures, not a reimplementation.
 *
 * Production writes are never authorized for this suite: every "client" is
 * a fake in-memory object; nothing here ever touches a network socket. The
 * migration draft itself (supabase/migrations/20260903010000_building_
 * comments_and_replies.sql) is checked separately by
 * scripts/test-building-comments-migration-static.mjs — this file only
 * covers the FRONTEND/repository behavior that consumes it once applied.
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
const pending = [];
function return_await(fn) {
  pending.push(fn());
}

// ---------------------------------------------------------------------
// Shared fake Supabase client + sandbox (same pattern as
// scripts/test-building-map-backend.mjs, kept independent so this file has
// no import-time coupling to that one).
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

function buildingPostRow(overrides = {}) {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    post_type: "discussion", scope_type: "building", college_id: 1, jurusan_id: null,
    building_id: "B_PUSTAKA", content: "Building post", category: "academic", shape: "rounded",
    color: "#DBEAFE", rotation: 0, position_x: 10, position_y: 15,
    display_author_mode: "anonymous", author_label: "Anonymous", question_status: null,
    is_seed: false, seed_source: null, seed_version: null, seed_base_score: 0,
    real_vote_score: 0, display_score: 0,
    created_at: "2026-09-04T00:00:00Z", updated_at: "2026-09-04T00:00:00Z",
    can_manage_question: false,
    ...overrides,
  };
}

function communityPostRow(overrides = {}) {
  return buildingPostRow({ scope_type: "all_km", college_id: null, building_id: null, ...overrides });
}

function commentRow(overrides = {}) {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    post_id: "44444444-4444-4444-4444-444444444444",
    parent_comment_id: null,
    depth: 0,
    content: "A building comment",
    display_author_mode: "anonymous",
    author_label: "Anonymous",
    created_at: "2026-09-04T00:05:00Z",
    updated_at: "2026-09-04T00:05:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// 1. Building post supports the same comment repository calls as Community
//    (top-level comment -> api.create_comment; reply -> api.create_reply),
//    using post.remoteId exactly like Community does — no separate code
//    path, no separate table.
// ---------------------------------------------------------------------
{
  const post = buildingPostRow();
  const { context, fakeClient } = makeSandbox({
    tableData: { comments_public: [] },
    rpcHandlers: { create_comment: () => ({ data: null, error: null }) },
  });
  return_await(async () => {
    const adapted = context.window.CommunityRowAdapter.postFromRow(post);
    check("1a. A building-scope post row still adapts to contextType=\"building\"", adapted.contextType === "building");
    await context.window.CommunitySupabaseRepositories.comments.create(adapted, { content: "hello building", isAnonymous: true });
    const call = fakeClient.calls.rpc.find(c => c.name === "create_comment");
    check("1b. Top-level comment on a Building post calls api.create_comment (same RPC as Community)", Boolean(call));
    check("1c. api.create_comment receives the Building post's remoteId as p_post_id (no communityKey dependency)", call?.params.p_post_id === post.id);
    check("1d. No api.create_reply call is made for a top-level comment", !fakeClient.calls.rpc.some(c => c.name === "create_reply"));
  });
}
{
  const post = buildingPostRow();
  const existingComment = commentRow();
  const { context, fakeClient } = makeSandbox({
    tableData: { comments_public: [existingComment] },
    rpcHandlers: { create_reply: () => ({ data: null, error: null }) },
  });
  return_await(async () => {
    const adapted = context.window.CommunityRowAdapter.postFromRow(post);
    await context.window.CommunitySupabaseRepositories.comments.list(adapted);
    await context.window.CommunitySupabaseRepositories.comments.create(adapted, {
      content: "a building reply", isAnonymous: true, parentCommentId: context.window.CommunityRowAdapter.commentFromRow(existingComment, adapted).id,
    });
    const call = fakeClient.calls.rpc.find(c => c.name === "create_reply");
    check("2a. A reply on a Building post calls api.create_reply (same RPC as Community)", Boolean(call));
    check("2b. api.create_reply receives the parent comment's remoteId as p_parent_comment_id", call?.params.p_parent_comment_id === existingComment.id);
  });
}

// ---------------------------------------------------------------------
// 2. Building comment/reply cache and count/loaded state are keyed by
//    post.remoteId, exactly like Community — no Building-specific cache.
// ---------------------------------------------------------------------
{
  const post = buildingPostRow();
  const rows = [commentRow(), commentRow({ id: "66666666-6666-6666-6666-666666666666", parent_comment_id: "55555555-5555-5555-5555-555555555555", depth: 1 })];
  const { context } = makeSandbox({ tableData: { comments_public: rows } });
  return_await(async () => {
    const adapted = context.window.CommunityRowAdapter.postFromRow(post);
    check("3a. Building post comments are not loaded before any fetch", context.window.CommunityDataProvider.commentsLoaded(adapted) === false);
    await context.window.CommunityDataProvider.refreshComments(adapted);
    check("3b. Building post comments ARE loaded after refreshComments (same API as Community)", context.window.CommunityDataProvider.commentsLoaded(adapted) === true);
    check("3c. Building post comment count reflects both the top-level comment and its reply", context.window.CommunityDataProvider.commentCount(adapted) === 2);
    const thread = context.window.CommunityDataProvider.commentThread(adapted);
    check("3d. Building post comment thread nests the reply under its parent (depth=1, one level)", thread.length === 1 && thread[0].replies.length === 1);
  });
}

// ---------------------------------------------------------------------
// 3. Community comments remain fully unaffected (regression) — same
//    repository/provider calls, same cache keying, run through the exact
//    identical code path as Building above.
// ---------------------------------------------------------------------
{
  const post = communityPostRow({ id: "77777777-7777-7777-7777-777777777777" });
  const { context, fakeClient } = makeSandbox({
    tableData: { comments_public: [] },
    rpcHandlers: { create_comment: () => ({ data: null, error: null }) },
  });
  return_await(async () => {
    const adapted = context.window.CommunityRowAdapter.postFromRow(post);
    check("4a. A community-scope post row still adapts to contextType=\"community\"", adapted.contextType === "community");
    await context.window.CommunitySupabaseRepositories.comments.create(adapted, { content: "hello community", isAnonymous: true });
    const call = fakeClient.calls.rpc.find(c => c.name === "create_comment");
    check("4b. Community top-level comment still calls api.create_comment unchanged", call?.params.p_post_id === post.id);
  });
}

// ---------------------------------------------------------------------
// 4. No raw app.comments table access anywhere in the repository/adapter —
//    every comment/reply mutation must go through the sanitized RPC or the
//    sanitized comments_public view, never a direct table write.
// ---------------------------------------------------------------------
{
  const repoSource = fs.readFileSync(path.join(ROOT, "services/community-supabase-repositories.js"), "utf8");
  check("5a. Repository never inserts directly into app.comments or comments table", !/\.from\(["']comments["']\)\.insert/.test(repoSource) && !/\.from\(["']app\.comments["']\)/.test(repoSource));
  check("5b. Repository reads comments only via the sanitized comments_public view", /\.from\("comments_public"\)/.test(repoSource));
  check("5c. Repository writes comments/replies only via create_comment/create_reply RPCs, never a table insert", /client\.rpc\(operation, parameters\)/.test(repoSource));
}

// ---------------------------------------------------------------------
// 5. Realtime: a comment/reply signal on a Building post's scope wakes only
//    the matching Building scope subscription (same college_id+building_id
//    isolation Building post signals already have), and only the matching
//    post subscription for an open modal — proven for event_type
//    comment_created/comment_updated specifically (V2.3b's new emission
//    path), not just post_created (already covered by
//    test-building-map-backend.mjs).
// ---------------------------------------------------------------------
function makeRealtimeSandbox() {
  const dispatched = [];
  let postgresChangesHandler = null;
  const channelCalls = { count: 0 };
  const channel = {
    on(_kind, _filter, handler) { postgresChangesHandler = handler; return channel; },
    subscribe(handler) { handler("SUBSCRIBED"); return channel; },
  };
  const client = { channel() { channelCalls.count += 1; return channel; }, async removeChannel() {} };
  const sandbox = {
    console,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    setTimeout(handler) { handler(); return 1; },
    clearTimeout() {},
    dispatchEvent(event) { dispatched.push(event); },
    CommunityService: {
      parseCommunityKey(value) {
        if (value === "global:all") return { scope: "global", orgId: null, majorId: null };
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
    emit(row) {
      assert.equal(typeof postgresChangesHandler, "function", "Realtime handler must be registered");
      postgresChangesHandler({ new: row });
    },
    clear() { dispatched.length = 0; },
  };
}

function buildingCommentSignal(overrides = {}) {
  return { event_type: "comment_created", scope_type: "building", college_id: 1, jurusan_id: null, building_id: "B_PUSTAKA", post_id: "post-comment-1", ...overrides };
}

{
  const h = makeRealtimeSandbox();
  return_await(async () => {
    await h.service.subscribeToBuildingScope(1, "B_PUSTAKA");
    h.emit(buildingCommentSignal());
    check("6a. comment_created on the subscribed Building scope wakes the wall (scope reason)", h.dispatched.some(e => e.detail.reason === "scope"));

    h.clear();
    h.emit(buildingCommentSignal({ building_id: "B_MASJID" }));
    check("6b. comment_created for a DIFFERENT building (same college) does NOT wake this wall", !h.dispatched.some(e => e.detail.reason === "scope"));

    h.clear();
    h.emit(buildingCommentSignal({ college_id: 2 }));
    check("6c. comment_created for the SAME building_id but a DIFFERENT college does NOT wake this wall", !h.dispatched.some(e => e.detail.reason === "scope"));

    h.clear();
    h.emit({ ...buildingCommentSignal(), event_type: "comment_updated" });
    check("6d. comment_updated (reply/edit/removal) on the subscribed Building scope also wakes the wall", h.dispatched.some(e => e.detail.reason === "scope"));
  });
}
{
  const h = makeRealtimeSandbox();
  return_await(async () => {
    await h.service.subscribeToPost("post-comment-1");
    h.emit(buildingCommentSignal({ post_id: "post-comment-1" }));
    check("7a. A comment signal for the exact open Building post_id wakes the post subscription (reason=post)", h.dispatched.some(e => e.detail.reason === "post"));

    h.clear();
    h.emit(buildingCommentSignal({ post_id: "post-comment-OTHER" }));
    check("7b. A comment signal for a DIFFERENT post_id does NOT wake this open-modal subscription", !h.dispatched.every(e => e.detail.reason === "post") || h.dispatched.length === 0);
  });
}

// ---------------------------------------------------------------------
// 6. Static source guard: the realtime service still binds only to
//    app.realtime_events — a comment-specific realtime table/channel was
//    NOT introduced by this round.
// ---------------------------------------------------------------------
{
  const realtimeSource = fs.readFileSync(path.join(ROOT, "services/community-realtime-service.js"), "utf8");
  const channelNameLiterals = new Set([...realtimeSource.matchAll(/\.channel\("([^"]+)"\)/g)].map(m => m[1]));
  check(
    "8. No new/second realtime channel name was introduced for comments (only \"community-realtime-events\" is ever passed to .channel())",
    channelNameLiterals.size === 1 && channelNameLiterals.has("community-realtime-events"),
    JSON.stringify([...channelNameLiterals])
  );
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
