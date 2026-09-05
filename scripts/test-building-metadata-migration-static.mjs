// BACKEND V2.4a — static property test for the Building metadata read-model
// migration draft.
//
// This is a SUPPLEMENT, not a replacement, for an engine-level dry-run —
// there is no trusted SQL/service-role/Postgres connection available in
// this environment (same constraint documented by V2.2/V2.3a/V2.3b), so the
// migration text itself is the only thing this script can check. It
// asserts: the new table exists with the right shape, RLS is enabled and
// forced, the public view exposes only the allowed columns (never
// updated_by), no browser write grant/policy of any kind was created, the
// realtime publication is untouched, no CASCADE appears anywhere, both the
// single-column and composite building_id FKs exist, and both JSON
// validation helpers are wired into CHECK constraints.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// Matches by suffix rather than a hardcoded full filename, following the
// same precedent (and the same reason) as
// test-building-comments-migration-static.mjs: the Supabase CLI renames an
// applied migration's timestamp PREFIX to match the ledger's applied
// version once it lands in production, but the descriptive SUFFIX survives
// verbatim.
const MIGRATION_SUFFIX = "_building_metadata_read_model.sql";
const candidates = readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith(MIGRATION_SUFFIX));
if (candidates.length !== 1) {
  throw new Error(
    `Expected exactly one migration file ending in "${MIGRATION_SUFFIX}" in ${MIGRATIONS_DIR}, found ${candidates.length}: ${JSON.stringify(candidates)}`
  );
}
const MIGRATION_PATH = path.join(MIGRATIONS_DIR, candidates[0]);

const fullText = readFileSync(MIGRATION_PATH, "utf8");

// Isolate the ACTIVE migration body (begin; ... commit;) from the trailing
// manual-rollback SQL, which is entirely `--`-commented reference material.
const beginIdx = fullText.indexOf("begin;");
const commitIdx = fullText.indexOf("commit;", beginIdx);
if (beginIdx === -1 || commitIdx === -1) {
  throw new Error("Could not locate begin;/commit; markers in migration file.");
}
const activeBody = fullText.slice(beginIdx, commitIdx + "commit;".length);
const rollbackBody = fullText.slice(commitIdx + "commit;".length);

// Strip `-- ...` line comments before checking for forbidden/required SQL
// predicates, so this test inspects only executable SQL, not prose.
const activeCode = activeBody
  .split("\n")
  .map(line => {
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

// --- 1. Table exists with the required shape --------------------------------
assert(
  /create\s+table\s+app\.building_metadata\s*\(/i.test(activeCode),
  "app.building_metadata must be created"
);
// Exactly one new table this round.
assert(
  (activeCode.match(/create\s+table/gi) || []).length === 1,
  "exactly one new table must be created (app.building_metadata only)"
);
for (const column of [
  "building_id text primary key",
  "college_id smallint not null",
  "description jsonb",
  "purpose jsonb",
  "special_notes jsonb",
  "localized_alias jsonb",
  "hours jsonb",
  "updated_by uuid",
  "updated_at timestamptz not null default now()",
]) {
  assert(activeCode.includes(column), `app.building_metadata must declare column: ${column}`);
}

// --- 2. Building ID contract: single-column FK + composite college-consistency FK
assert(
  /references\s+app\.building_scope_keys\s*\(building_id\)\s*on\s+delete\s+restrict/i.test(activeCode),
  "building_id must be a foreign key to app.building_scope_keys(building_id) on delete restrict"
);
assert(
  /foreign\s+key\s*\(building_id,\s*college_id\)\s*\n?\s*references\s+app\.building_scope_keys\s*\(building_id,\s*college_id\)/i.test(activeCode),
  "must declare a composite foreign key (building_id, college_id) references app.building_scope_keys(building_id, college_id) for hard college consistency"
);
assert(
  !/alter\s+table\s+app\.building_scope_keys/i.test(activeCode),
  "must never modify app.building_scope_keys itself"
);

// --- 3. JSON localization validation wired into CHECK constraints ----------
assert(
  activeCode.includes("create or replace function private.is_valid_localized_text(p_value jsonb, p_max_length integer)"),
  "private.is_valid_localized_text(jsonb, integer) validation helper must be defined"
);
assert(
  activeCode.includes("create or replace function private.is_valid_building_hours(p_value jsonb)"),
  "private.is_valid_building_hours(jsonb) validation helper must be defined"
);
for (const [column, maxLength] of [
  ["description", 2000],
  ["purpose", 500],
  ["special_notes", 1000],
  ["localized_alias", 100],
]) {
  assert(
    activeCode.includes(`check (private.is_valid_localized_text(${column}, ${maxLength}))`),
    `${column} must be CHECK-validated via private.is_valid_localized_text with max length ${maxLength}`
  );
}
assert(
  activeCode.includes("check (private.is_valid_building_hours(hours))"),
  "hours must be CHECK-validated via private.is_valid_building_hours"
);
// Only en/ms/zh keys are ever allowed by the localized-text validator body.
assert(
  activeCode.includes("kv.lang not in ('en', 'ms', 'zh')"),
  "localized-text validator must restrict keys to exactly en/ms/zh"
);
// Both validation helpers must be locked down like every other private.*
// function in this project (revoke from public/anon/authenticated).
assert(
  activeCode.includes("revoke execute on function private.is_valid_localized_text(jsonb, integer) from public, anon, authenticated;"),
  "private.is_valid_localized_text must keep the project's explicit public/anon/authenticated revoke"
);
assert(
  activeCode.includes("revoke execute on function private.is_valid_building_hours(jsonb) from public, anon, authenticated;"),
  "private.is_valid_building_hours must keep the project's explicit public/anon/authenticated revoke"
);

// --- 4. Hours validator matches the CURRENT campus-building-hours.js shape --
for (const mode of ["'weekly'", "'24h'", "'unavailable'"]) {
  assert(activeCode.includes(mode), `hours validator must recognize mode ${mode}`);
}
assert(
  activeCode.includes("v_day_count <> 7"),
  "hours validator must require exactly 7 day keys for weekly mode"
);
assert(
  activeCode.includes("'0', '1', '2', '3', '4', '5', '6'"),
  "hours validator must key weekdays exactly as Date.getDay() (0=Sunday..6=Saturday), matching data/campus-building-hours.js"
);
assert(
  activeCode.includes("v_open >= v_close"),
  "hours validator must reject open >= close (current runtime does not support overnight-crossing hours)"
);
{
  // Only the CREATE TABLE column list matters here — prose inside `comment
  // on ... is '...'` string literals (which legitimately discusses why no
  // such column exists) must not trip this check.
  const tableMatch = activeCode.match(/create\s+table\s+app\.building_metadata\s*\(([\s\S]*?)\n\);/i);
  assert(Boolean(tableMatch), "could not isolate app.building_metadata's column list for the open_now check");
  if (tableMatch) {
    assert(
      !/\b(open_now|is_open)\b\s+(boolean|bool)\b/i.test(tableMatch[1]),
      "app.building_metadata must never declare an open_now/is_open column — open/closed stays runtime-derived"
    );
  }
}

// --- 5. Row Level Security enabled and forced -------------------------------
assert(
  activeCode.includes("alter table app.building_metadata enable row level security;"),
  "RLS must be enabled on app.building_metadata"
);
assert(
  activeCode.includes("alter table app.building_metadata force row level security;"),
  "RLS must be forced on app.building_metadata"
);
assert(
  activeCode.includes("for select to echowall_api_viewer"),
  "must create a public-read RLS policy scoped to echowall_api_viewer, matching the comments_api_public_read/realtime_events_public_read convention"
);

// --- 6. No browser write surface of any kind --------------------------------
assert(
  !/for\s+(insert|update|delete)/i.test(activeCode),
  "must not create any INSERT/UPDATE/DELETE RLS policy — V2.4a has no write API"
);
assert(
  !/\bto\s+anon\b/i.test(activeCode) || activeCode.includes("grant select on api.building_metadata_public to anon, authenticated;"),
  "the only statement granting anything to anon must be the public view's SELECT grant"
);
assert(
  !activeCode.includes("grant select on app.building_metadata to anon") &&
    !activeCode.includes("grant select on app.building_metadata to authenticated"),
  "browser roles must never be granted direct SELECT on app.building_metadata — reads must go through api.building_metadata_public only"
);
assert(
  !/create\s+(or\s+replace\s+)?function\s+api\./i.test(activeCode),
  "must not create any api.* RPC function — V2.4a has no write API"
);

// --- 7. Public view: exact allowed projection, updated_by never exposed ----
const viewMatch = activeCode.match(/create\s+view\s+api\.building_metadata_public[\s\S]*?from\s+app\.building_metadata\s+as\s+m;/i);
assert(Boolean(viewMatch), "api.building_metadata_public view definition must be present");
if (viewMatch) {
  const projection = viewMatch[0];
  for (const expected of [
    "m.building_id",
    "m.college_id",
    "m.description",
    "m.purpose",
    "m.special_notes",
    "m.localized_alias",
    "m.hours",
    "m.updated_at",
  ]) {
    assert(projection.includes(expected), `api.building_metadata_public projection must keep column ${expected}`);
  }
  for (const forbidden of ["updated_by", "owner_user_id", "auth.uid", "email"]) {
    assert(!projection.includes(forbidden), `api.building_metadata_public projection must not expose ${forbidden}`);
  }
  assert(projection.includes("security_barrier"), "api.building_metadata_public must use security_barrier, matching every other api.*_public view");
}
assert(
  activeCode.includes("grant select on api.building_metadata_public to anon, authenticated;"),
  "api.building_metadata_public must grant SELECT to anon and authenticated"
);

// --- 7b. PRODUCTION-ENGINE-PROVEN VIEW OWNERSHIP (this round's fix) --------
// A trusted production dry-run rejected the prior draft's "create as
// migration role, then ALTER OWNER" shape: production's migration-
// executing role is a member of echowall_api_viewer with SET OPTION =
// false (so a bare `set role`/the SET ROLE implicit in ALTER OWNER fails
// 42501 "must be able to SET ROLE"), and echowall_api_viewer's CREATE on
// schema api is false (so creating directly as it fails 42501 "permission
// denied for schema api" until temporarily granted). This migration must
// therefore reuse the SAME production-proven wrapper V2.3b already uses
// for REPLACING a view — even though this view is a first-time CREATE.
assert(
  !activeCode.includes("alter view api.building_metadata_public owner to echowall_api_viewer;"),
  "must NOT use ALTER VIEW ... OWNER TO — production-engine-proven to fail 42501 under the real role configuration; the view must be created directly AS echowall_api_viewer instead"
);
assert(
  activeCode.includes("grant create on schema api to echowall_api_viewer;"),
  "must temporarily grant CREATE on schema api to echowall_api_viewer so it can create its own view"
);
assert(
  activeCode.includes("grant echowall_api_viewer to current_user with set true;"),
  "must temporarily grant echowall_api_viewer membership (WITH SET TRUE) to the executing role"
);
assert(
  activeCode.includes("set local role echowall_api_viewer;"),
  "must SET LOCAL ROLE to the view's intended owner before creating it (SET LOCAL, not a bare SET, so it cannot leak past this transaction)"
);
assert(activeCode.includes("reset role;"), "must RESET ROLE after creating the view");
assert(
  activeCode.includes("revoke set option for echowall_api_viewer from current_user;"),
  "must revoke the temporary SET-option membership so the privilege state round-trips to its pre-migration value (no permanent widening)"
);
assert(
  activeCode.includes("revoke create on schema api from echowall_api_viewer;"),
  "must revoke the temporary CREATE-on-schema-api grant so the privilege state round-trips to its pre-migration value (no permanent widening)"
);
// Ordering: the elevation must strictly bracket the CREATE VIEW statement,
// and the revocation must come after it — otherwise the statement would
// run under insufficient privilege (creating it as migration_runner
// instead of echowall_api_viewer) or the elevation would be left dangling.
{
  const grantCreateIdx = activeCode.indexOf("grant create on schema api to echowall_api_viewer;");
  const grantSetTrueIdx = activeCode.indexOf("grant echowall_api_viewer to current_user with set true;");
  const setRoleIdx = activeCode.indexOf("set local role echowall_api_viewer;");
  const viewIdx = activeCode.indexOf("create view api.building_metadata_public");
  const resetIdx = activeCode.indexOf("reset role;");
  const revokeSetIdx = activeCode.indexOf("revoke set option for echowall_api_viewer from current_user;");
  const revokeCreateIdx = activeCode.lastIndexOf("revoke create on schema api from echowall_api_viewer;");
  assert(
    grantCreateIdx !== -1 &&
      grantCreateIdx < grantSetTrueIdx &&
      grantSetTrueIdx < setRoleIdx &&
      setRoleIdx < viewIdx &&
      viewIdx < resetIdx &&
      resetIdx < revokeSetIdx &&
      revokeSetIdx < revokeCreateIdx,
    "privilege elevation must strictly bracket the view creation in this exact order: grant create -> grant set true -> set local role -> create view -> reset role -> revoke set option -> revoke create"
  );
}

// --- 8. Brand-new view: simple create, never a replace/drop, no CASCADE ----
assert(
  !/create\s+or\s+replace\s+view\s+api\.building_metadata_public/i.test(activeCode),
  "api.building_metadata_public is a brand-new view this round — must use plain CREATE VIEW, not CREATE OR REPLACE (that pattern is reserved for replacing an already-echowall_api_viewer-owned view, per V2.3b's precedent)"
);
assert(
  !/drop\s+view\s+(if\s+exists\s+)?api\.building_metadata_public/i.test(activeCode),
  "must never drop api.building_metadata_public in the active migration body"
);
assert(!/cascade/i.test(activeCode), "active migration code must never use CASCADE anywhere");
assert(
  !/drop\s+(view|function|table)/i.test(activeCode) || activeCode.match(/drop\s+(view|function|table)/gi).every(() => false),
  "active migration body must not drop any existing object (this migration only creates new objects)"
);

// --- 9. No existing object touched ------------------------------------------
for (const untouched of [
  "app.posts", "app.comments", "app.post_votes", "app.post_map_anchors",
  "app.user_roles", "app.audit_events", "app.profiles",
  "api.posts_public", "api.comments_public", "api.post_map_anchors_public",
]) {
  assert(
    !new RegExp(`(alter|drop)\\s+(table|view|function)\\s+${untouched.replace(".", "\\.")}\\b`, "i").test(activeCode),
    `must never alter or drop the existing object ${untouched}`
  );
}

// --- 10. Realtime publication untouched -------------------------------------
assert(
  !/alter\s+publication/i.test(activeCode),
  "must not touch the supabase_realtime publication — V2.4a has no realtime component"
);

// --- 11. No seed data — table stays empty at migration time -----------------
assert(
  !/insert\s+into\s+app\.building_metadata/i.test(activeCode),
  "must not seed any row into app.building_metadata — the table stays empty by design this round"
);

// --- 12. Rollback section documents restoration of every new object --------
for (const marker of [
  "api.building_metadata_public",
  "building_metadata_api_public_read",
  "app.building_metadata",
  "private.is_valid_building_hours",
  "private.is_valid_localized_text",
]) {
  assert(rollbackBody.includes(marker), `rollback section must reference ${marker}`);
}
// The rollback block is entirely `--`-commented prose/SQL; only check the
// actual DROP statement lines for CASCADE, so descriptive prose like "no
// CASCADE" elsewhere in the block's commentary doesn't trip this check.
const rollbackDropLines = rollbackBody.split("\n").filter(line => /drop\s+(table|view|function|policy)/i.test(line));
assert(rollbackDropLines.length > 0, "rollback section must contain at least one drop statement");
assert(
  rollbackDropLines.every(line => !/cascade/i.test(line)),
  "rollback section's drop statements must never use CASCADE"
);

console.log(`\nBuilding metadata migration static checks: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  process.exitCode = 1;
}
