#!/usr/bin/env node
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

function createHarness() {
  const dispatched = [];
  const timers = new Map();
  let nextTimerId = 1;
  let postgresChangesHandler = null;

  const channel = {
    on(_kind, _filter, handler) {
      postgresChangesHandler = handler;
      return channel;
    },
    subscribe(handler) {
      handler("SUBSCRIBED");
      return channel;
    },
  };

  const sandbox = {
    console,
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail; }
    },
    setTimeout(handler) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, handler);
      return id;
    },
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
    CommunitySupabaseClient: {
      async getClient() {
        return {
          channel() { return channel; },
          async removeChannel() {},
        };
      },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "services/community-realtime-service.js"), "utf8"),
    sandbox,
    { filename: "services/community-realtime-service.js" },
  );

  return {
    service: sandbox.CommunityRealtimeService,
    dispatched,
    emit(row) {
      assert.equal(typeof postgresChangesHandler, "function", "Realtime handler must be registered");
      postgresChangesHandler({ new: row });
      for (const [id, handler] of [...timers]) {
        timers.delete(id);
        handler();
      }
    },
    clear() { dispatched.length = 0; },
  };
}

const vote = overrides => ({
  event_type: "vote_changed",
  scope_type: "all_km",
  college_id: null,
  jurusan_id: null,
  building_id: null,
  post_id: "post-1",
  ...overrides,
});
const comment = overrides => ({
  event_type: "comment_created",
  scope_type: "college",
  college_id: 1,
  jurusan_id: null,
  building_id: null,
  post_id: "post-1",
  ...overrides,
});

const harness = createHarness();
await harness.service.subscribeToScope("global:all");
harness.emit(vote({}));
check("All KM vote matches the current All KM scope", harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
await harness.service.subscribeToScope("college:1");
harness.emit(vote({ scope_type: "college", college_id: 1 }));
check("College 1 vote matches College 1", harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
harness.emit(vote({ scope_type: "college", college_id: 2 }));
check("College 2 vote does not refresh College 1", !harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
await harness.service.subscribeToScope("jurusan:1:1");
harness.emit(vote({ scope_type: "jurusan", college_id: 1, jurusan_id: 1 }));
check("Jurusan 1:1 vote matches its exact wall", harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
harness.emit(vote({ scope_type: "jurusan", college_id: 1, jurusan_id: 2 }));
check("Wrong Jurusan vote does not refresh Jurusan 1:1", !harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
await harness.service.subscribeToPost("post-1");
harness.emit(vote({ scope_type: "college", college_id: 99 }));
check("Vote still reaches the open post subscription", harness.dispatched.some(event => event.detail.reason === "post"));

harness.clear();
await harness.service.subscribeToScope("college:1");
harness.emit(vote({ scope_type: "college", college_id: 1 }));
check("One vote can match scope and open-post subscriptions", (
  harness.dispatched.some(event => event.detail.reason === "scope")
  && harness.dispatched.some(event => event.detail.reason === "post")
));

harness.clear();
harness.emit(vote({ scope_type: "building", college_id: 1, building_id: "pustaka" }));
const buildingSignal = harness.dispatched
  .find(event => event.detail.reason === "post")
  ?.detail.events.find(event => event.postId === "post-1");
check("Text building_id is preserved through open-post routing", buildingSignal?.buildingId === "pustaka");

harness.clear();
harness.service.unsubscribePost();
await harness.service.subscribeToScope("college:1");
harness.emit(comment({}));
check("College comment matches the card's current scope", harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
harness.emit(comment({ college_id: 2 }));
check("Unrelated College comment does not refresh the current wall", !harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
await harness.service.subscribeToScope("jurusan:1:1");
harness.emit(comment({ scope_type: "jurusan", college_id: 1, jurusan_id: 1 }));
check("Jurusan comment matches its exact card scope", harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
harness.emit(comment({ scope_type: "jurusan", college_id: 1, jurusan_id: 2 }));
check("Unrelated Jurusan comment does not refresh the current wall", !harness.dispatched.some(event => event.detail.reason === "scope"));

harness.clear();
await harness.service.subscribeToPost("post-1");
harness.emit(comment({ scope_type: "college", college_id: 99 }));
check("Comment/reply still reaches the open thread", harness.dispatched.some(event => event.detail.reason === "post"));

const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql"),
  "utf8",
);
const voteBranch = migration.match(/elsif tg_table_name = 'post_votes' then([\s\S]*?)\n  else\n    return null;/)?.[1] || "";
const commentBranch = migration.match(/elsif tg_table_name = 'comments' then([\s\S]*?)\n  elsif tg_table_name = 'post_votes'/)?.[1] || "";
const fullParentSelect = /select\s+p\.scope_type,\s+p\.college_id,\s+p\.jurusan_id,\s+p\.building_id,\s+p\.moderation_status\s+into\s+v_post_scope_type,\s+v_college_id,\s+v_jurusan_id,\s+v_building_id,\s+v_post_moderation_status\s+from app\.posts as p/s;

check("Vote SQL hydrates the full parent scope tuple", fullParentSelect.test(voteBranch));
check("Vote SQL rejects a missing parent", /if not found then\s+return null;/s.test(voteBranch));
check("Vote SQL rejects a non-public parent", /if v_post_moderation_status <> 'published' then\s+return null;/s.test(voteBranch));
check("Public-parent vote always assigns non-null scope_type", /v_scope_type := v_post_scope_type::text;/.test(voteBranch));
check("Vote SQL preserves the parent post UUID", /v_post_id := v_lookup_post_id;/.test(voteBranch));
check("Vote SQL emits vote_changed", /v_event_type := 'vote_changed';/.test(voteBranch));
check("Signal table keeps scope_type NOT NULL", /scope_type text not null/.test(migration));

check("Comment SQL hydrates the full parent scope tuple", fullParentSelect.test(commentBranch));
check("Comment SQL keeps Building comments disabled", /v_post_scope_type <> 'building'/.test(commentBranch));
check("Comment INSERT requires published comment and parent", /new\.moderation_status = 'published' and v_post_moderation_status = 'published'/s.test(commentBranch));
check("Never-public comment transitions still return without a signal", /if not v_old_public and not v_new_public then return null;/.test(commentBranch));

const wallSource = fs.readFileSync(path.join(ROOT, "app-wall.js"), "utf8");
check("Community cards display comment-derived state", /note-comment-count/.test(wallSource) && /CommunityDataProvider\.commentCount\(note\)/.test(wallSource));
check("Scope signals refresh wall cards", /reason === "scope"[\s\S]*CommunityDataProvider\.refreshPosts/.test(wallSource));
check("Open-post signals refresh comments", /reason === "post"[\s\S]*refetchOpenModalCommentsIfAny\(\)/.test(wallSource));

const failed = results.filter(result => !result.pass);
for (const result of results) {
  console.log(`${result.pass ? "PASS" : "FAIL"} - ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} assertions passed.`);
if (failed.length) process.exit(1);
