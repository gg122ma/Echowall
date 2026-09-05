// BACKEND V2.4b1 — static property test for the college-scoped Building
// admin permission foundation migration draft.
//
// This is a SUPPLEMENT, not a replacement, for an engine-level dry-run —
// there is no trusted SQL/service-role/Postgres connection available in
// this environment (same constraint documented by V2.2/V2.3a/V2.3b/V2.4a),
// so the migration text itself is the only thing this script can check. It
// is a STATIC TEXT test: it proves the SQL says the right things, not that
// Postgres actually enforces them (there is a separate JS permission-model
// test, scripts/test-college-admin-permission-model.mjs, which is also
// explicitly a model test, not a live-engine test).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// Matches by suffix rather than a hardcoded full filename, following the
// same precedent as every other migration-static test in this project: the
// Supabase CLI renames an applied migration's timestamp PREFIX to match the
// ledger's applied version once it lands in production, but the
// descriptive SUFFIX survives verbatim.
const MIGRATION_SUFFIX = "_college_admin_building_permissions.sql";
const candidates = readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith(MIGRATION_SUFFIX));
if (candidates.length !== 1) {
  throw new Error(
    `Expected exactly one migration file ending in "${MIGRATION_SUFFIX}" in ${MIGRATIONS_DIR}, found ${candidates.length}: ${JSON.stringify(candidates)}`
  );
}
const MIGRATION_PATH = path.join(MIGRATIONS_DIR, candidates[0]);

const fullText = readFileSync(MIGRATION_PATH, "utf8");

const beginIdx = fullText.indexOf("begin;");
const commitIdx = fullText.indexOf("commit;", beginIdx);
if (beginIdx === -1 || commitIdx === -1) {
  throw new Error("Could not locate begin;/commit; markers in migration file.");
}
const activeBody = fullText.slice(beginIdx, commitIdx + "commit;".length);
const rollbackBody = fullText.slice(commitIdx + "commit;".length);

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

// --- 1/2. Table exists with exactly the expected columns --------------------
assert(
  /create\s+table\s+app\.college_admin_assignments\s*\(/i.test(activeCode),
  "1. app.college_admin_assignments must be created"
);
assert(
  (activeCode.match(/create\s+table/gi) || []).length === 1,
  "exactly one new table must be created (app.college_admin_assignments only)"
);
for (const column of [
  "user_id uuid not null",
  "college_id smallint not null",
  "assigned_by uuid not null",
  "assigned_at timestamptz not null default now()",
  "disabled_at timestamptz",
]) {
  assert(activeCode.includes(column), `2. app.college_admin_assignments must declare column: ${column}`);
}
// No extra "role" column merely restating the table name.
{
  const tableMatch = activeCode.match(/create\s+table\s+app\.college_admin_assignments\s*\(([\s\S]*?)\n\);/i);
  assert(Boolean(tableMatch), "could not isolate app.college_admin_assignments's column list");
  if (tableMatch) {
    assert(!/\brole\b/i.test(tableMatch[1]), "app.college_admin_assignments must NOT declare a role column — the table's existence is the assignment");
  }
}

// --- 3. PK is (user_id, college_id) -----------------------------------------
assert(
  activeCode.includes("primary key (user_id, college_id)"),
  "3. primary key must be exactly (user_id, college_id)"
);

// --- 4/5/6/7. Foreign keys + NOT NULL ---------------------------------------
assert(
  /user_id uuid not null\s*\n?\s*references auth\.users \(id\) on delete cascade/i.test(activeCode),
  "4. user_id must be a NOT NULL foreign key to auth.users(id) ON DELETE CASCADE"
);
assert(
  /college_id smallint not null\s*\n?\s*references app\.college_scope_keys \(college_id\) on delete restrict/i.test(activeCode),
  "5. college_id must be a NOT NULL foreign key to app.college_scope_keys(college_id) ON DELETE RESTRICT"
);
assert(
  /assigned_by uuid not null\s*\n?\s*references auth\.users \(id\) on delete restrict/i.test(activeCode),
  "6. assigned_by must be a NOT NULL foreign key to auth.users(id) ON DELETE RESTRICT"
);
assert(
  activeCode.includes("assigned_by uuid not null"),
  "7. assigned_by must be NOT NULL"
);

// --- 8/9. Defaults / nullability ---------------------------------------------
assert(
  activeCode.includes("assigned_at timestamptz not null default now()"),
  "8. assigned_at must default to now()"
);
assert(
  /disabled_at timestamptz\s*,/.test(activeCode) && !/disabled_at timestamptz not null/i.test(activeCode),
  "9. disabled_at must be nullable (NULL = active)"
);

// --- 10/11. RLS enabled + forced ---------------------------------------------
assert(
  activeCode.includes("alter table app.college_admin_assignments enable row level security;"),
  "10. RLS must be enabled on app.college_admin_assignments"
);
assert(
  activeCode.includes("alter table app.college_admin_assignments force row level security;"),
  "11. RLS must be forced on app.college_admin_assignments"
);

// --- 12/13. No browser grants of any kind ------------------------------------
assert(
  !/for\s+(select|insert|update|delete)/i.test(activeCode),
  "must not create any RLS policy on app.college_admin_assignments (zero policies, matching app.user_roles/app.audit_events)"
);
assert(
  !/grant\s+(select|insert|update|delete).*(to\s+anon|to\s+authenticated)/i.test(activeCode),
  "12/13. must never grant SELECT/INSERT/UPDATE/DELETE to anon or authenticated"
);
assert(
  !/\bto\s+anon\b/i.test(activeCode) && !/\bto\s+authenticated\b/i.test(activeCode),
  "12/13. anon/authenticated must not appear as a grant target anywhere in this migration"
);

// --- 14. No public API view --------------------------------------------------
assert(
  !/create\s+(or\s+replace\s+)?view\s+api\./i.test(activeCode),
  "14. must not create any api.* view for this table — no public API view in V2.4b1"
);

// --- 15/16/17. has_active_college_admin shape --------------------------------
assert(
  activeCode.includes("create or replace function private.has_active_college_admin(p_user_id uuid, p_college_id smallint)"),
  "15. private.has_active_college_admin(uuid, smallint) must be defined"
);
{
  const fnMatch = activeCode.match(/create or replace function private\.has_active_college_admin[\s\S]*?\$\$;/);
  assert(Boolean(fnMatch), "could not isolate private.has_active_college_admin's definition");
  if (fnMatch) {
    assert(/language sql/i.test(fnMatch[0]), "has_active_college_admin must be LANGUAGE sql");
    assert(/\bstable\b/i.test(fnMatch[0]), "has_active_college_admin must be STABLE");
    assert(/security definer/i.test(fnMatch[0]), "16. has_active_college_admin must be SECURITY DEFINER");
    assert(fnMatch[0].includes("set search_path = ''"), "17. has_active_college_admin must SET search_path = ''");
    assert(fnMatch[0].includes("caa.disabled_at is null"), "18. has_active_college_admin must check disabled_at IS NULL");
    assert(fnMatch[0].includes("caa.college_id = p_college_id"), "19. has_active_college_admin must check exact college_id equality (no range/any())");
    assert(!/college_id\s*>=|college_id\s*<=|=\s*any\s*\(/i.test(fnMatch[0]), "19b. must not use a range or ANY() match for college_id");
  }
}
revoke: {
  assert(
    activeCode.includes("revoke execute on function private.has_active_college_admin(uuid, smallint) from public, anon, authenticated;"),
    "private.has_active_college_admin must keep the project's explicit public/anon/authenticated revoke"
  );
}

// --- 20/21/22/23/24. can_manage_building_metadata shape ----------------------
assert(
  activeCode.includes("create or replace function private.can_manage_building_metadata(p_user_id uuid, p_college_id smallint)"),
  "20. private.can_manage_building_metadata(uuid, smallint) must be defined"
);
{
  const fnMatch = activeCode.match(/create or replace function private\.can_manage_building_metadata[\s\S]*?\$\$;/);
  assert(Boolean(fnMatch), "could not isolate private.can_manage_building_metadata's definition");
  if (fnMatch) {
    assert(/language sql/i.test(fnMatch[0]), "can_manage_building_metadata must be LANGUAGE sql");
    assert(/\bstable\b/i.test(fnMatch[0]), "can_manage_building_metadata must be STABLE");
    assert(/security definer/i.test(fnMatch[0]), "can_manage_building_metadata must be SECURITY DEFINER");
    assert(fnMatch[0].includes("set search_path = ''"), "can_manage_building_metadata must SET search_path = ''");
    assert(
      fnMatch[0].includes("private.has_active_role(p_user_id, array['admin'::app.app_role])"),
      "21. global-admin path must call the EXISTING private.has_active_role (not reimplement it)"
    );
    assert(
      !/private\.has_active_role\([^)]*'moderator'/i.test(fnMatch[0]),
      "23. moderator must NOT be included in the has_active_role call"
    );
    // Only 'admin' may appear inside the has_active_role(...) array argument.
    const arrayCallMatch = fnMatch[0].match(/private\.has_active_role\(p_user_id,\s*array\[([^\]]*)\]\)/i);
    assert(Boolean(arrayCallMatch), "could not isolate the has_active_role(...) array argument");
    if (arrayCallMatch) {
      assert(
        /^\s*'admin'::app\.app_role\s*$/i.test(arrayCallMatch[1]),
        "22. global-admin path must include ONLY 'admin' — no other role literal"
      );
    }
    assert(
      fnMatch[0].includes("private.has_active_college_admin(p_user_id, p_college_id)"),
      "24. college-admin path must call private.has_active_college_admin(p_user_id, p_college_id)"
    );
  }
}
assert(
  activeCode.includes("revoke execute on function private.can_manage_building_metadata(uuid, smallint) from public, anon, authenticated;"),
  "private.can_manage_building_metadata must keep the project's explicit public/anon/authenticated revoke"
);

// --- 25/26. app.user_roles / app.app_role never touched ----------------------
assert(
  !/alter\s+(table|type)\s+app\.user_roles/i.test(activeCode),
  "25. must never ALTER app.user_roles"
);
assert(
  !/alter\s+type\s+app\.app_role/i.test(activeCode),
  "26. must never ALTER app.app_role"
);
assert(
  !activeCode.includes("create or replace function private.has_active_role") &&
    !activeCode.includes("create function private.has_active_role"),
  "must never redefine the EXISTING private.has_active_role"
);

// --- 27. No Building-metadata update RPC -------------------------------------
assert(
  !/create\s+(or\s+replace\s+)?function\s+api\./i.test(activeCode),
  "27. must not create any api.* RPC function (no api.update_building_metadata, no role-management RPC) — that is V2.4b2+"
);
assert(
  !activeCode.includes("api.update_building_metadata") &&
    !activeCode.includes("api.grant_college_admin") &&
    !activeCode.includes("api.revoke_college_admin") &&
    !activeCode.includes("api.disable_college_admin"),
  "27b. must not reference any Building-update or role-management RPC name"
);

// --- 28. No audit_events INSERT ----------------------------------------------
assert(
  !/insert\s+into\s+app\.audit_events/i.test(activeCode),
  "28. must not INSERT into app.audit_events — there is no business mutation yet"
);
assert(!/alter\s+(table|view|function)\s+app\.audit_events/i.test(activeCode), "must never alter app.audit_events");

// --- 29. No realtime publication changes -------------------------------------
assert(
  !/alter\s+publication/i.test(activeCode),
  "29. must not touch the supabase_realtime publication"
);

// --- 30. No CASCADE, no seeding, no other existing object touched -----------
// Strip `comment on ... is '...';` string literals first — they legitimately
// discuss "cascade" in prose (e.g. describing the ON DELETE CASCADE column
// above), which is not a CASCADE keyword usage to flag. Then strip the one
// intentional `on delete cascade` keyword usage itself, and confirm the
// word never appears again anywhere else in the executable SQL (in
// particular, never as a DROP ... CASCADE).
{
  const withoutCommentStrings = activeCode.replace(/comment on [^;]*?is\s*'(?:[^']|'')*';/gis, "");
  const withoutIntentionalCascade = withoutCommentStrings.replace(/on delete cascade/gi, "");
  assert(!/cascade/i.test(withoutIntentionalCascade), "30. active migration body must never use CASCADE outside the one intentional ON DELETE CASCADE on user_id");
}
assert(
  !/insert\s+into\s+app\.college_admin_assignments/i.test(activeCode),
  "must not seed any row into app.college_admin_assignments"
);
for (const untouched of [
  "app.posts", "app.comments", "app.post_votes", "app.post_map_anchors",
  "app.building_scope_keys", "app.building_metadata", "app.profiles",
  "api.posts_public", "api.comments_public", "api.post_map_anchors_public", "api.building_metadata_public",
]) {
  assert(
    !new RegExp(`(alter|drop)\\s+(table|view|function)\\s+${untouched.replace(".", "\\.")}\\b`, "i").test(activeCode),
    `must never alter or drop the existing object ${untouched}`
  );
}

// --- Rollback section documents restoration of every new object ------------
for (const marker of [
  "private.can_manage_building_metadata",
  "private.has_active_college_admin",
  "app.college_admin_assignments",
]) {
  assert(rollbackBody.includes(marker), `rollback section must reference ${marker}`);
}
const rollbackDropLines = rollbackBody.split("\n").filter(line => /drop\s+(table|function)/i.test(line));
assert(rollbackDropLines.length > 0, "rollback section must contain at least one drop statement");
assert(
  rollbackDropLines.every(line => !/cascade/i.test(line)),
  "rollback section's drop statements must never use CASCADE"
);

console.log(`\nCollege admin permission migration static checks: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  process.exitCode = 1;
}
