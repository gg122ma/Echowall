// BACKEND V2.4b1.1 — static property test for the private-helper
// service_role ACL hardening migration draft.
//
// This is a SUPPLEMENT, not a replacement, for an engine-level dry-run —
// there is no trusted SQL/service-role/Postgres connection available in
// this environment (same constraint documented by every prior migration
// in this project), so the migration text itself is the only thing this
// script can check. It proves the SQL says the right things (an exhaustive
// revoke-then-grant per function, and nothing else), not that Postgres
// actually applies them.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

const MIGRATION_SUFFIX = "_college_admin_private_helper_acl.sql";
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

const FUNCTIONS = [
  "private.has_active_college_admin(uuid, smallint)",
  "private.can_manage_building_metadata(uuid, smallint)",
];

for (const fn of FUNCTIONS) {
  const escaped = fn.replace(/[.()]/g, ch => `\\${ch}`);
  for (const role of ["public", "anon", "authenticated", "service_role"]) {
    assert(
      new RegExp(`revoke all on function ${escaped} from ${role};`, "i").test(activeCode),
      `${fn}: must REVOKE ALL from ${role}`
    );
  }
  assert(
    new RegExp(`grant execute on function ${escaped} to service_role;`, "i").test(activeCode),
    `${fn}: must GRANT EXECUTE to service_role`
  );
  assert(
    !new RegExp(`grant execute on function ${escaped} to authenticated`, "i").test(activeCode),
    `${fn}: must NOT grant EXECUTE to authenticated`
  );
  assert(
    !new RegExp(`grant execute on function ${escaped} to anon`, "i").test(activeCode) &&
      !new RegExp(`grant execute on function ${escaped} to public`, "i").test(activeCode),
    `${fn}: must NOT grant EXECUTE to anon or PUBLIC`
  );
}

// --- Exactly the expected number of ACL statements — nothing extra --------
assert((activeCode.match(/revoke all on function/gi) || []).length === 8, "must contain exactly 8 REVOKE ALL statements (4 roles x 2 functions)");
assert((activeCode.match(/grant execute on function/gi) || []).length === 2, "must contain exactly 2 GRANT EXECUTE statements (service_role x 2 functions)");

// --- No logic change of any kind --------------------------------------------
assert(!/create\s+(or\s+replace\s+)?function/i.test(activeCode), "must not CREATE or CREATE OR REPLACE any function — ACL only");
assert(!/drop\s+function/i.test(activeCode), "must not DROP any function");
assert(!/alter\s+function/i.test(activeCode), "must not ALTER any function");

// --- No table/schema/other-object changes -----------------------------------
assert(!/create\s+table|alter\s+table|drop\s+table/i.test(activeCode), "must not create/alter/drop any table");
assert(!/alter\s+(table|type)\s+app\.user_roles/i.test(activeCode), "must never touch app.user_roles");
assert(!/alter\s+type\s+app\.app_role/i.test(activeCode), "must never touch app.app_role");
assert(!/app\.building_metadata\b/i.test(activeCode), "must never reference app.building_metadata");
assert(!/app\.college_admin_assignments\b/i.test(activeCode), "must never reference app.college_admin_assignments");
assert(!/api\.update_building_metadata\b/i.test(activeCode), "must never reference/change api.update_building_metadata");
assert(!/grant usage on schema/i.test(activeCode), "must not grant any schema-level USAGE (service_role already has it; must never grant it to authenticated/anon)");
assert(!/alter\s+publication/i.test(activeCode), "must not touch the supabase_realtime publication");
assert(!/cascade/i.test(activeCode), "must never use CASCADE");

// --- Rollback section ---------------------------------------------------------
for (const fn of FUNCTIONS) {
  assert(rollbackBody.includes(fn.split("(")[0]), `rollback section must reference ${fn}`);
}
assert(!/cascade/i.test(rollbackBody), "rollback section must never use CASCADE");

console.log(`\nCollege admin private helper ACL migration static checks: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  process.exitCode = 1;
}
