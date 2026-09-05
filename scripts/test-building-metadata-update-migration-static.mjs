// BACKEND V2.4b2 — static property test for the Building metadata secure
// update RPC + audit migration draft.
//
// This is a SUPPLEMENT, not a replacement, for an engine-level dry-run —
// there is no trusted SQL/service-role/Postgres connection available in
// this environment (same constraint documented by every prior V2.x
// migration in this project), so the migration text itself is the only
// thing this script can check. It is a STATIC TEXT test: it proves the SQL
// says the right things, not that Postgres actually enforces them at
// runtime — the separate JS model test,
// scripts/test-building-metadata-update-model.mjs, is also explicitly
// labeled as a model test, not a live-engine test.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

const MIGRATION_SUFFIX = "_building_metadata_update_rpc.sql";
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

// Isolate the function body itself (between the `as $$` and closing `$$;`)
// for checks that must not accidentally match the header/rollback prose.
const fnMatch = activeCode.match(/create or replace function api\.update_building_metadata[\s\S]*?\n\$\$;/);
const fnBody = fnMatch ? fnMatch[0] : "";

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

// --- 1/2/3. Existence + security attributes ---------------------------------
assert(Boolean(fnMatch), "1. api.update_building_metadata must be defined");
assert(fnBody.includes("security definer"), "2. must be SECURITY DEFINER");
assert(fnBody.includes("set search_path = ''"), "3. must SET search_path = ''");
assert((activeCode.match(/create\s+(or\s+replace\s+)?function/gi) || []).length === 1, "exactly one new function must be created this round");

// --- 4. Uses the existing require_active_user() ------------------------------
assert(fnBody.includes("private.require_active_user()"), "4. must call the EXISTING private.require_active_user()");
assert(
  !activeCode.includes("create or replace function private.require_active_user") &&
    !activeCode.includes("create function private.require_active_user"),
  "must never redefine private.require_active_user"
);

// --- 5/6. College derived server-side; p_college_id never accepted ---------
assert(
  /select\s+b\.college_id\s+into\s+v_college_id\s*\n\s*from\s+app\.building_scope_keys\s+as\s+b\s*\n\s*where\s+b\.building_id\s*=\s*p_building_id/i.test(fnBody),
  "5. must derive college_id server-side from app.building_scope_keys using p_building_id"
);
assert(
  !/p_college_id/i.test(activeCode),
  "6. the RPC must NOT accept a p_college_id parameter of any kind"
);
assert(
  fnBody.includes("raise exception using errcode = '23503', message = 'Unknown building ID.';"),
  "must reject an unknown building_id"
);

// --- 7/8. Authorization ------------------------------------------------------
assert(
  fnBody.includes("private.can_manage_building_metadata(v_user, v_college_id)"),
  "7. must authorize via private.can_manage_building_metadata(v_user, v_college_id)"
);
{
  const authBlock = fnBody.match(/if not private\.can_manage_building_metadata\(v_user, v_college_id\) then[\s\S]*?end if;/);
  assert(Boolean(authBlock), "could not isolate the authorization-rejection block");
  if (authBlock) {
    assert(authBlock[0].includes("errcode = '42501'"), "8. unauthorized access must reject with SQLSTATE 42501");
    assert(
      !/college \d|another college|assigned to college/i.test(authBlock[0]),
      "8b. the rejection message must not reveal which college(s) the caller does or doesn't administer"
    );
  }
}
assert(
  !/private\.has_active_role\([^)]*'moderator'/i.test(fnBody),
  "38. moderator must never be granted Building-metadata authority by this migration"
);
assert(
  !fnBody.includes("private.has_active_role("),
  "this RPC must authorize ONLY via private.can_manage_building_metadata, never call private.has_active_role directly"
);

// --- 9/10/11. Full override-row save (never PATCH) --------------------------
for (const column of ["description", "purpose", "special_notes", "localized_alias", "hours"]) {
  assert(fnBody.includes(`${column} = p_${column}`), `9. UPDATE must assign ${column} = p_${column} unconditionally`);
}
assert(
  /insert into app\.building_metadata \([\s\S]*?\) values \(\s*p_building_id, v_college_id, p_description, p_purpose, p_special_notes, p_localized_alias, p_hours/i.test(fnBody),
  "9. INSERT must carry all five p_* parameters verbatim, including any that are NULL"
);
assert(
  !/coalesce\(p_description|coalesce\(p_purpose|coalesce\(p_special_notes|coalesce\(p_localized_alias|coalesce\(p_hours/i.test(fnBody),
  "10/11. must never COALESCE a p_* override parameter against the existing stored value (that would be PATCH semantics, not full-row save) — NULL must remain a real saved NULL"
);
assert(
  !/if\s+p_description\s+is\s+not\s+null\s+then[\s\S]{0,40}set\s+description/i.test(fnBody),
  "10/11. must never conditionally skip assigning a column based on whether its incoming parameter is null (that is key-presence PATCH semantics)"
);

// --- 12/13/14/15. Optimistic concurrency -------------------------------------
assert(fnBody.includes("p_expected_updated_at"), "12. must accept and use p_expected_updated_at");
assert(
  /select\s+m\.\*\s+into\s+v_existing[\s\S]*?for update/i.test(fnBody),
  "13. must lock the current row with SELECT ... FOR UPDATE before the concurrency check"
);
assert(
  fnBody.includes("if p_expected_updated_at is not null then") && fnBody.includes("errcode = '40001'"),
  "14a. CASE A (no existing row) must reject a non-null p_expected_updated_at as stale"
);
assert(
  /if p_expected_updated_at is null or p_expected_updated_at <> v_existing\.updated_at then[\s\S]*?errcode = '40001'/i.test(fnBody),
  "14b. CASE B (existing row) must reject a null or mismatched p_expected_updated_at as stale, SQLSTATE 40001"
);
assert(
  activeCode.includes("Building metadata changed. Reload and retry."),
  "must use the recommended stale/conflict message"
);
assert(
  (fnBody.match(/errcode = '40001'/g) || []).length === 3,
  "must use the SAME 40001 SQLSTATE for all three stale/conflict outcomes (no-expected-row, mismatched-timestamp, concurrent-create)"
);
assert(
  /exception\s*\n\s*when unique_violation then\s*\n\s*raise exception using errcode = '40001'/i.test(fnBody),
  "15. must catch a concurrent-create race (unique_violation on the primary key) and re-raise it as the same stale-write outcome"
);

// --- 16/17. Server-set actor/timestamp ---------------------------------------
assert(fnBody.includes("updated_by, updated_at") && fnBody.includes("v_user, v_now"), "16/17. INSERT must set updated_by/updated_at from server-derived v_user/v_now");
assert(fnBody.includes("updated_by = v_user") && fnBody.includes("updated_at = v_now"), "16/17. UPDATE must set updated_by/updated_at from server-derived v_user/v_now");
assert(
  !/p_updated_by|p_updated_at\b/i.test(activeCode),
  "must never accept updated_by/updated_at as a caller-supplied parameter"
);

// --- 18/19. No-op save leaves updated_at untouched and writes no audit -----
{
  const noopBlock = fnBody.match(/if pg_catalog\.array_length\(v_changed_fields, 1\) is null then[\s\S]*?end if;/);
  assert(Boolean(noopBlock), "could not isolate the no-op branch");
  if (noopBlock) {
    assert(!/update app\.building_metadata/i.test(noopBlock[0]), "18. no-op branch must never run an UPDATE (updated_at must stay untouched)");
    assert(/return;\s*\n\s*end if;\s*$/.test(noopBlock[0]), "19. no-op branch must return (bare RETURN, ending the function) immediately before its own END IF, so control never reaches the audit INSERT below it");
  }
}

// --- 20. Missing-row/all-NULL contract is explicit ---------------------------
assert(
  fnBody.includes("if p_description is null and p_purpose is null and p_special_notes is null") &&
    fnBody.includes("and p_localized_alias is null and p_hours is null then") &&
    /raise exception using errcode = '22023', message = 'No override was supplied\.';/.test(fnBody),
  "20. the missing-row/all-NULL case must be explicitly rejected (22023), not silently allowed as an empty row"
);

// --- 21-28. Audit event shape -------------------------------------------------
const auditMatch = fnBody.match(/insert into app\.audit_events[\s\S]*?\);/);
assert(Boolean(auditMatch), "could not isolate the audit_events INSERT");
if (auditMatch) {
  const audit = auditMatch[0];
  assert(audit.includes("'building_metadata_updated'"), "21. event_type must be 'building_metadata_updated'");
  assert(audit.includes("'building'"), "22. target_type must be 'building'");
  assert(audit.includes("p_building_id,"), "23. target_id must be p_building_id");
  assert(audit.includes("v_user,"), "24. actor_user_id must be v_user (the authenticated actor from require_active_user)");
  assert(audit.includes("'college_id', v_college_id"), "25. metadata must contain college_id");
  assert(audit.includes("'operation', v_operation"), "26. metadata must contain operation");
  assert(audit.includes("'changed_fields'"), "27. metadata must contain changed_fields");
  for (const forbidden of ["p_description", "p_purpose", "p_special_notes", "p_localized_alias", "p_hours", "email", "display_name"]) {
    assert(!audit.includes(forbidden), `28. audit metadata must NOT contain ${forbidden} (no Building content/PII in the audit log)`);
  }
}
assert(
  (activeCode.match(/insert into app\.audit_events/gi) || []).length === 1,
  "exactly one audit_events INSERT statement must exist (on the two real-mutation paths only, never in the no-op path)"
);

// --- 29/30. Return shape ------------------------------------------------------
assert(
  (fnBody.match(/return query select p\.\* from api\.building_metadata_public as p where p\.building_id = p_building_id;/g) || []).length === 2,
  "29. must return via SELECT p.* FROM api.building_metadata_public (once for the no-op path, once for the real-mutation path)"
);
assert(
  fnBody.includes("returns setof api.building_metadata_public"),
  "29. function signature must RETURNS SETOF api.building_metadata_public"
);
assert(
  !/select[\s\S]{0,80}updated_by[\s\S]{0,10}from app\.building_metadata/i.test(fnBody),
  "30. must never directly SELECT updated_by out of app.building_metadata into the return path"
);

// --- 31/32/33. ACL -------------------------------------------------------------
assert(
  activeCode.includes(
    "revoke execute on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) from public, anon;"
  ),
  "31. must revoke EXECUTE from public and anon"
);
assert(
  activeCode.includes(
    "grant execute on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) to authenticated, service_role;"
  ),
  "32/33. must grant EXECUTE to authenticated and service_role"
);

// --- 34. No direct browser write grant on the base table ---------------------
assert(
  !/grant\s+(insert|update|delete)/i.test(activeCode),
  "34. must never grant INSERT/UPDATE/DELETE on app.building_metadata to any role"
);
assert(
  !/to\s+anon\b/i.test(activeCode),
  "34b. anon must never appear as a grant target anywhere in this migration"
);

// --- 35. No RLS weakening ------------------------------------------------------
assert(
  !/disable row level security|no force row level security|alter table app\.building_metadata/i.test(activeCode),
  "35. must never disable or weaken RLS on app.building_metadata"
);
assert(!/create\s+policy/i.test(activeCode), "35b. must not create any new RLS policy — access is via the SECURITY DEFINER RPC only");

// --- 36/37. app.user_roles / app.app_role untouched --------------------------
assert(!/alter\s+(table|type)\s+app\.user_roles/i.test(activeCode), "36. must never ALTER app.user_roles");
assert(!/alter\s+type\s+app\.app_role/i.test(activeCode), "37. must never ALTER app.app_role");

// --- 39. No role-management RPC -----------------------------------------------
assert(
  !activeCode.includes("api.grant_college_admin") &&
    !activeCode.includes("api.revoke_college_admin") &&
    !activeCode.includes("api.disable_college_admin"),
  "39. must not create any college-admin role-management RPC this round"
);

// --- 40. No realtime publication change ---------------------------------------
assert(!/alter\s+publication/i.test(activeCode), "40. must not touch the supabase_realtime publication");

// --- 41. No CASCADE (excluding the legitimate prose in header comments, ------
// --- already stripped, and any incidental "cascade" substring in a --------
// --- comment-on string literal) ------------------------------------------
{
  const withoutCommentStrings = activeCode.replace(/comment on [^;]*?is\s*'(?:[^']|'')*';/gis, "");
  assert(!/cascade/i.test(withoutCommentStrings), "41. active migration body must never use CASCADE");
}

// --- 42. No DROP VIEW / DROP of api.building_metadata_public -----------------
assert(
  !/drop\s+view/i.test(activeCode) && !/create\s+or\s+replace\s+view\s+api\.building_metadata_public/i.test(activeCode),
  "42. must never DROP or CREATE OR REPLACE api.building_metadata_public — this migration only reads from it"
);
assert(
  !/create\s+(or\s+replace\s+)?view/i.test(activeCode),
  "must not create any new view either — no public API surface changes this round"
);

// --- Rollback section --------------------------------------------------------
assert(rollbackBody.includes("api.update_building_metadata"), "rollback section must reference api.update_building_metadata");
assert(
  !rollbackBody.includes("drop table app.building_metadata") &&
    !rollbackBody.includes("drop view api.building_metadata_public") &&
    !rollbackBody.includes("drop table app.college_admin_assignments"),
  "rollback section must never drop any object owned by a PRIOR migration (V2.4a/V2.4b1)"
);
const rollbackDropLines = rollbackBody.split("\n").filter(line => /drop\s+function/i.test(line));
assert(rollbackDropLines.length > 0, "rollback section must contain at least one drop statement");
assert(rollbackDropLines.every(line => !/cascade/i.test(line)), "rollback section's drop statements must never use CASCADE");

console.log(`\nBuilding metadata update RPC migration static checks: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  process.exitCode = 1;
}
