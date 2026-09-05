#!/usr/bin/env node
/**
 * BACKEND V2.4b1 — Building-metadata authorization MATRIX, modeled in JS.
 *
 * IMPORTANT — WHAT THIS IS AND IS NOT:
 * This is a pure JS re-implementation of the exact SQL semantics defined in
 * supabase/migrations/20260905120000_college_admin_building_permissions.sql
 * (private.has_active_role's existing behavior, private.has_active_college_
 * admin, private.can_manage_building_metadata), run against in-memory
 * fixture arrays. It is a MODEL/UNIT test of the intended permission
 * matrix, NOT a live Postgres engine test — there is no database
 * connection here, no RLS is actually evaluated, and no real SQL runs.
 * This does not and cannot prove the migration behaves this way once
 * applied; that requires an actual Postgres dry-run, which this
 * environment does not have access to (same constraint documented by
 * every other migration this project has shipped). The migration's own
 * SQL TEXT is checked separately and independently by
 * scripts/test-college-admin-permissions-migration-static.mjs.
 */
const results = [];
function check(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
}

// --- JS model of the three SQL objects, kept deliberately literal so a --
// --- future reader can compare each line 1:1 against the migration. ----

// Models private.has_active_role(p_user_id, p_roles) — unchanged existing function.
function hasActiveRole(userRolesTable, userId, roles) {
  if (userId == null) return false;
  return userRolesTable.some(row => row.user_id === userId && roles.includes(row.role) && row.disabled_at == null);
}

// Models private.has_active_college_admin(p_user_id, p_college_id) — new in V2.4b1.
function hasActiveCollegeAdmin(assignmentsTable, userId, collegeId) {
  if (userId == null || collegeId == null) return false;
  return assignmentsTable.some(row => row.user_id === userId && row.college_id === collegeId && row.disabled_at == null);
}

// Models private.can_manage_building_metadata(p_user_id, p_college_id) — new in V2.4b1.
// Deliberately calls hasActiveRole with ONLY ['admin'] — never 'moderator'.
function canManageBuildingMetadata(userRolesTable, assignmentsTable, userId, collegeId) {
  return hasActiveRole(userRolesTable, userId, ["admin"]) || hasActiveCollegeAdmin(assignmentsTable, userId, collegeId);
}

// --- Fixtures ----------------------------------------------------------
const GLOBAL_ADMIN = "11111111-1111-1111-1111-111111111111";
const COLLEGE1_ADMIN = "22222222-2222-2222-2222-222222222222";
const COLLEGE1_ADMIN_DISABLED = "33333333-3333-3333-3333-333333333333";
const MODERATOR = "44444444-4444-4444-4444-444444444444";
const PLAIN_USER = "55555555-5555-5555-5555-555555555555";
const ASSIGNER = "99999999-9999-9999-9999-999999999999";

const userRolesTable = [
  { user_id: GLOBAL_ADMIN, role: "admin", disabled_at: null },
  { user_id: MODERATOR, role: "moderator", disabled_at: null },
  { user_id: PLAIN_USER, role: "user", disabled_at: null },
];

const assignmentsTable = [
  { user_id: COLLEGE1_ADMIN, college_id: 1, assigned_by: ASSIGNER, disabled_at: null },
  { user_id: COLLEGE1_ADMIN_DISABLED, college_id: 1, assigned_by: ASSIGNER, disabled_at: "2026-08-01T00:00:00Z" },
];

// --- Exact matrix required by the V2.4b1 spec ---------------------------
check(
  "global admin / college 1 => true",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, GLOBAL_ADMIN, 1) === true
);
check(
  "global admin / college 2 => true (global admin has every college)",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, GLOBAL_ADMIN, 2) === true
);
check(
  "college admin (college 1) / college 1 => true",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, COLLEGE1_ADMIN, 1) === true
);
check(
  "college admin (college 1) / college 2 => false (wrong college)",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, COLLEGE1_ADMIN, 2) === false
);
check(
  "disabled college admin (college 1) / college 1 => false",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, COLLEGE1_ADMIN_DISABLED, 1) === false
);
check(
  "moderator => false for any college (moderator must never manage Building metadata)",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, MODERATOR, 1) === false &&
    canManageBuildingMetadata(userRolesTable, assignmentsTable, MODERATOR, 2) === false
);
check(
  "plain user => false",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, PLAIN_USER, 1) === false
);
check(
  "anonymous / null user_id => false",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, null, 1) === false
);
check(
  "null college_id (no non-global assignment can match) => false for a non-global-admin user",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, COLLEGE1_ADMIN, null) === false
);
check(
  "null college_id => still true for a global admin (global path does not depend on college_id at all)",
  canManageBuildingMetadata(userRolesTable, assignmentsTable, GLOBAL_ADMIN, null) === true
);

// Sub-primitive checks, isolated from the composite matrix above.
check(
  "has_active_college_admin: null user_id => false",
  hasActiveCollegeAdmin(assignmentsTable, null, 1) === false
);
check(
  "has_active_college_admin: null college_id => false",
  hasActiveCollegeAdmin(assignmentsTable, COLLEGE1_ADMIN, null) === false
);
check(
  "has_active_role(['admin']) never matches a 'moderator' row",
  hasActiveRole(userRolesTable, MODERATOR, ["admin"]) === false
);

const failed = results.filter(r => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} - [MODEL] ${r.name}${r.pass || !r.detail ? "" : ` (${r.detail})`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} JS permission-model assertions passed.`);
console.log("NOTE: this is a JS model test only — it does not execute against Postgres and does not prove RLS/engine behavior.");
if (failed.length) process.exit(1);
