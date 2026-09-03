// BACKEND V2.3b — static property test for the migration draft.
//
// This is a SUPPLEMENT, not a replacement, for an engine-level dry-run.
// There is no trusted SQL/service-role/Postgres connection available in
// this environment (confirmed across V2.2/V2.3a/V2.3b: no Supabase CLI, no
// .env, no MCP Postgres connector), so the migration text itself is the
// only thing this script can check. It asserts the migration removes
// exactly the Building exclusion from the 5 objects it targets, and does
// not touch anything else (no new table, no new publication entry, no
// weakened privacy column, no changed reply-depth rule).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260903010000_building_comments_and_replies.sql"
);

const fullText = readFileSync(MIGRATION_PATH, "utf8");

// Isolate the ACTIVE migration body (begin; ... commit;) from the trailing
// manual-rollback SQL, which is entirely `--`-commented and deliberately
// still contains the OLD Building-exclusion text as documentation of what
// to restore if this migration is ever reverted after being applied.
const beginIdx = fullText.indexOf("begin;");
const commitIdx = fullText.indexOf("commit;", beginIdx);
if (beginIdx === -1 || commitIdx === -1) {
  throw new Error("Could not locate begin;/commit; markers in migration file.");
}
const activeBody = fullText.slice(beginIdx, commitIdx + "commit;".length);
const rollbackBody = fullText.slice(commitIdx + "commit;".length);

// Strip `-- ...` line comments before checking for forbidden SQL predicates
// below, so this test inspects only executable SQL, not the prose comments
// that legitimately describe (in words) what was removed and why.
const activeCode = activeBody
  .split("\n")
  .map((line) => {
    const idx = line.indexOf("--");
    return idx === -1 ? line : line.slice(0, idx);
  })
  .join("\n");

let pass = 0;
let fail = 0;
function assert(condition, label) {
  if (condition) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${label}`);
  }
}

// --- 1. Building exclusion actually removed from the active body ----------
assert(
  !activeCode.includes("scope_type <> 'building'"),
  "active migration code must not contain any remaining scope_type <> 'building' exclusion"
);
assert(
  !activeCode.includes("scope_type != 'building'"),
  "active migration code must not contain any remaining scope_type != 'building' exclusion"
);
assert(
  !activeCode.includes("Building Wall posts do not support comments"),
  "active migration code must not contain the old Building-rejection error message"
);

// --- 2. Reply depth / thread-integrity invariants preserved ----------------
assert(
  activeCode.includes("Replies can only be one level deep"),
  "one-level-deep reply restriction must be preserved verbatim"
);
assert(
  activeCode.includes("c.post_id = new.post_id"),
  "same-post parent_comment_id constraint must be preserved in validate_comment_thread()"
);
assert(
  activeCode.includes("v_post_moderation <> 'published'") &&
    activeCode.includes("v_parent_moderation <> 'published'"),
  "published-parent-post and published-parent-comment checks must be preserved in validate_comment_thread()"
);
assert(
  (activeCode.match(/moderation_status = 'published'/g) || []).length >= 4,
  "published-only gating must still appear across the view/policy/functions"
);

// --- 3. No new table, no new comment/reply model, no new realtime object --
assert(!/create\s+table/i.test(activeCode), "must not create any new table");
assert(
  !activeCode.includes("app.building_comments") && !activeCode.includes("app.building_replies"),
  "must not reference a separate Building comment/reply table"
);
assert(
  !/alter\s+publication/i.test(activeCode),
  "must not add anything to the supabase_realtime publication (only the existing app.realtime_events entry, added in V2.2, is used)"
);
assert(
  !activeCode.includes("community-realtime-events-building") && !activeCode.includes("building-realtime-events"),
  "must not introduce a second/new realtime channel name"
);

// --- 4. Security attributes preserved for every redefined function --------
assert(
  (activeCode.match(/security invoker/g) || []).length === 2,
  "exactly 2 functions (validate_comment_thread, emit_realtime_event) must stay security invoker"
);
assert(
  (activeCode.match(/security definer/g) || []).length === 1,
  "exactly 1 function (create_reply) must stay security definer"
);
assert(
  (activeCode.match(/set search_path = ''/g) || []).length === 3,
  "all 3 redefined functions must keep set search_path = ''"
);

// --- 5. Privacy: comments_public view exposes no new sensitive column -----
const viewMatch = activeCode.match(/create view api\.comments_public[\s\S]*?from app\.comments as c/);
assert(Boolean(viewMatch), "api.comments_public view definition must be present");
if (viewMatch) {
  const projection = viewMatch[0];
  for (const forbidden of ["owner_user_id", "email", "auth.uid", "user_id"]) {
    assert(!projection.includes(forbidden), `api.comments_public projection must not expose ${forbidden}`);
  }
  for (const expected of [
    "c.id",
    "c.post_id",
    "c.parent_comment_id",
    "c.content",
    "c.display_author_mode",
    "c.created_at",
    "c.updated_at",
  ]) {
    assert(projection.includes(expected), `api.comments_public projection must keep column ${expected}`);
  }
}

// --- 6. Grants match the project's existing explicit revoke+grant style ---
assert(
  activeCode.includes(
    "revoke execute on function api.create_reply(uuid, text, app.display_author_mode) from public, anon;"
  ),
  "api.create_reply must keep its explicit public/anon revoke"
);
assert(
  activeCode.includes(
    "grant execute on function api.create_reply(uuid, text, app.display_author_mode) to authenticated, service_role;"
  ),
  "api.create_reply must keep its explicit authenticated/service_role grant"
);
assert(
  activeCode.includes("grant select on api.comments_public to anon, authenticated;"),
  "api.comments_public must keep its explicit anon/authenticated select grant"
);
assert(
  activeCode.includes(
    "revoke execute on function private.validate_comment_thread() from public, anon, authenticated;"
  ),
  "private.validate_comment_thread must keep its explicit revoke"
);
assert(
  activeCode.includes("revoke execute on function private.emit_realtime_event() from public, anon, authenticated;"),
  "private.emit_realtime_event must keep its explicit revoke"
);

// --- 7. api.create_comment is untouched (no Building-specific check existed) --
assert(
  !activeCode.includes("create or replace function api.create_comment") &&
    !activeCode.includes("create function api.create_comment"),
  "api.create_comment must not be redefined by this migration (it had no Building-specific check to remove)"
);

// --- 8. Rollback section documents restoration of every changed object ----
for (const marker of [
  "private.validate_comment_thread()",
  "api.create_reply(",
  "api.comments_public",
  "comments_api_public_read",
  "private.emit_realtime_event()",
]) {
  assert(rollbackBody.includes(marker), `rollback section must reference ${marker}`);
}

console.log(`\nBuilding comments migration static checks: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  process.exitCode = 1;
}
