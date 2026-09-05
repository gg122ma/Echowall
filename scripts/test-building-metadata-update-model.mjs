#!/usr/bin/env node
/**
 * BACKEND V2.4b2 — Building metadata update RPC semantics, modeled in JS.
 *
 * IMPORTANT — WHAT THIS IS AND IS NOT:
 * This is a pure JS re-implementation of the exact SQL semantics defined in
 * supabase/migrations/20260905150000_building_metadata_update_rpc.sql
 * (api.update_building_metadata), run against in-memory fixture tables. It
 * is a MODEL/UNIT test of the intended create/update/concurrency/audit
 * behavior, NOT a live Postgres engine test — there is no database
 * connection here, no RLS/transaction/locking is actually evaluated by
 * Postgres, and no real SQL runs. It does not and cannot prove the
 * migration behaves this way once applied; that requires an actual
 * Postgres dry-run, which this environment does not have access to (same
 * constraint documented by every other migration this project has
 * shipped). The migration's own SQL TEXT is checked separately by
 * scripts/test-building-metadata-update-migration-static.mjs, and the
 * authorization matrix it depends on is modeled separately by
 * scripts/test-college-admin-permission-model.mjs (also explicitly a
 * model test).
 */
const results = [];
function check(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
}

// --- JS model of the permission primitive (copied here deliberately, -----
// --- mirroring test-college-admin-permission-model.mjs, so this file is --
// --- self-contained like every other test in this project). --------------
function hasActiveRole(userRolesTable, userId, roles) {
  if (userId == null) return false;
  return userRolesTable.some(row => row.user_id === userId && roles.includes(row.role) && row.disabled_at == null);
}
function hasActiveCollegeAdmin(assignmentsTable, userId, collegeId) {
  if (userId == null || collegeId == null) return false;
  return assignmentsTable.some(row => row.user_id === userId && row.college_id === collegeId && row.disabled_at == null);
}
function canManageBuildingMetadata(userRolesTable, assignmentsTable, userId, collegeId) {
  return hasActiveRole(userRolesTable, userId, ["admin"]) || hasActiveCollegeAdmin(assignmentsTable, userId, collegeId);
}

const FIELDS = ["description", "purpose", "special_notes", "localized_alias", "hours"];
function isDistinct(a, b) {
  // Models PostgreSQL's IS DISTINCT FROM (NULL-safe): two NULLs are NOT
  // distinct; a NULL and a non-NULL always are.
  if (a === null && b === null) return false;
  if (a === null || b === null) return true;
  return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Models api.update_building_metadata(...) exactly, statement-for-
 * statement, against an in-memory `db`:
 *   db.buildingScopeKeys: Map<building_id, college_id>
 *   db.buildingMetadata:  Map<building_id, {college_id, description, purpose,
 *                          special_notes, localized_alias, hours, updated_by,
 *                          updated_at}>
 *   db.auditEvents:       array, appended to on a real mutation only
 *   db.userRoles / db.collegeAdminAssignments: as in the permission model
 * `nowTicker` is a monotonically increasing counter standing in for
 * clock_timestamp() so "new timestamp" assertions are deterministic.
 */
function updateBuildingMetadata(db, actorUserId, input, nowTicker) {
  const collegeId = db.buildingScopeKeys.get(input.buildingId);
  if (collegeId === undefined) {
    return { error: { sqlstate: "23503", message: "Unknown building ID." } };
  }

  if (!canManageBuildingMetadata(db.userRoles, db.collegeAdminAssignments, actorUserId, collegeId)) {
    return { error: { sqlstate: "42501", message: "You do not have permission to edit this Building." } };
  }

  const existing = db.buildingMetadata.get(input.buildingId) || null;
  const incoming = {
    description: input.description ?? null,
    purpose: input.purpose ?? null,
    special_notes: input.specialNotes ?? null,
    localized_alias: input.localizedAlias ?? null,
    hours: input.hours ?? null,
  };

  let operation;
  let changedFields = [];

  if (!existing) {
    if (input.expectedUpdatedAt != null) {
      return { error: { sqlstate: "40001", message: "Building metadata changed. Reload and retry." } };
    }
    const allNull = FIELDS.every(f => incoming[f] === null);
    if (allNull) {
      return { error: { sqlstate: "22023", message: "No override was supplied." } };
    }
    changedFields = FIELDS.filter(f => incoming[f] !== null);
    const now = nowTicker.next();
    db.buildingMetadata.set(input.buildingId, {
      college_id: collegeId,
      ...incoming,
      updated_by: actorUserId,
      updated_at: now,
    });
    operation = "created";
  } else {
    if (input.expectedUpdatedAt == null || input.expectedUpdatedAt !== existing.updated_at) {
      return { error: { sqlstate: "40001", message: "Building metadata changed. Reload and retry." } };
    }
    changedFields = FIELDS.filter(f => isDistinct(incoming[f], existing[f]));
    if (changedFields.length === 0) {
      // No-op: return the existing row untouched, no audit event.
      return { row: buildPublicRow(input.buildingId, existing) };
    }
    const now = nowTicker.next();
    const updated = { ...existing, ...incoming, updated_by: actorUserId, updated_at: now };
    db.buildingMetadata.set(input.buildingId, updated);
    operation = "updated";
  }

  const row = db.buildingMetadata.get(input.buildingId);
  db.auditEvents.push({
    actor_user_id: actorUserId,
    event_type: "building_metadata_updated",
    target_type: "building",
    target_id: input.buildingId,
    metadata: { college_id: collegeId, operation, changed_fields: changedFields },
  });

  return { row: buildPublicRow(input.buildingId, row) };
}

function buildPublicRow(buildingId, row) {
  // Models api.building_metadata_public's projection: updated_by excluded.
  const { updated_by, ...publicFields } = row;
  return { building_id: buildingId, ...publicFields };
}

function makeNowTicker(start = 1) {
  let n = start;
  return { next: () => n++ };
}

function freshDb() {
  return {
    buildingScopeKeys: new Map([
      ["B_PUSTAKA", 1],
      ["B_MASJID", 1],
    ]),
    buildingMetadata: new Map(),
    auditEvents: [],
    userRoles: [],
    collegeAdminAssignments: [],
  };
}

const GLOBAL_ADMIN = "11111111-1111-1111-1111-111111111111";
const COLLEGE1_ADMIN = "22222222-2222-2222-2222-222222222222";
const MODERATOR = "44444444-4444-4444-4444-444444444444";
const PLAIN_USER = "55555555-5555-5555-5555-555555555555";

function withStandardActors(db) {
  db.userRoles.push(
    { user_id: GLOBAL_ADMIN, role: "admin", disabled_at: null },
    { user_id: MODERATOR, role: "moderator", disabled_at: null },
    { user_id: PLAIN_USER, role: "user", disabled_at: null }
  );
  db.collegeAdminAssignments.push({ user_id: COLLEGE1_ADMIN, college_id: 1, disabled_at: null });
  return db;
}

// --- global admin create -----------------------------------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("global admin: create succeeds", Boolean(result.row) && !result.error, JSON.stringify(result));
}

// --- matching college admin create --------------------------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, COLLEGE1_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("matching college admin (college 1, B_PUSTAKA is college 1): create succeeds", Boolean(result.row) && !result.error);
}

// --- wrong-college reject -------------------------------------------------
{
  const db = withStandardActors(freshDb());
  db.buildingScopeKeys.set("B_OTHER_COLLEGE", 2);
  const result = updateBuildingMetadata(db, COLLEGE1_ADMIN, { buildingId: "B_OTHER_COLLEGE", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("wrong-college admin: reject with 42501", result.error?.sqlstate === "42501");
}

// --- moderator reject -------------------------------------------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, MODERATOR, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("moderator: reject with 42501", result.error?.sqlstate === "42501");
}

// --- plain user reject -------------------------------------------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, PLAIN_USER, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("plain user: reject with 42501", result.error?.sqlstate === "42501");
}

// --- anonymous reject ---------------------------------------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, null, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: null }, makeNowTicker());
  check("anonymous (null actor): reject with 42501", result.error?.sqlstate === "42501");
}

// --- first create requires expected_updated_at null -----------------------
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "New" }, expectedUpdatedAt: 99 }, makeNowTicker());
  check("first create with a NON-null expected_updated_at: reject with 40001 (stale)", result.error?.sqlstate === "40001");
}

// --- existing row: correct timestamp succeeds -------------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, expectedUpdatedAt: null }, ticker);
  const currentUpdatedAt = created.row.updated_at;
  const updated = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v2" }, expectedUpdatedAt: currentUpdatedAt }, ticker);
  check("existing row, correct expected_updated_at: update succeeds", Boolean(updated.row) && !updated.error);
  check("existing row, correct expected_updated_at: description actually changed", JSON.stringify(updated.row.description) === JSON.stringify({ en: "v2" }));
}

// --- existing row: stale timestamp rejects ----------------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, expectedUpdatedAt: null }, ticker);
  const staleResult = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v2 attempted" }, expectedUpdatedAt: -1 }, ticker);
  check("existing row, wrong expected_updated_at: reject with 40001", staleResult.error?.sqlstate === "40001");
  check("existing row, rejected stale write: stored description unchanged", JSON.stringify(db.buildingMetadata.get("B_PUSTAKA").description) === JSON.stringify({ en: "v1" }));
}

// --- no-op update: same timestamp, zero audit event -------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "same" }, expectedUpdatedAt: null }, ticker);
  const auditCountAfterCreate = db.auditEvents.length;
  const before = db.buildingMetadata.get("B_PUSTAKA").updated_at;
  const noop = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "same" }, expectedUpdatedAt: created.row.updated_at }, ticker);
  const after = db.buildingMetadata.get("B_PUSTAKA").updated_at;
  check("no-op update (identical values): succeeds without error", Boolean(noop.row) && !noop.error);
  check("no-op update: updated_at unchanged", before === after);
  check("no-op update: zero NEW audit events written", db.auditEvents.length === auditCountAfterCreate);
}

// --- real update: new timestamp, one audit event ----------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, expectedUpdatedAt: null }, ticker);
  const before = created.row.updated_at;
  const auditCountBefore = db.auditEvents.length;
  const updated = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v2" }, expectedUpdatedAt: before }, ticker);
  check("real update: updated_at advances", updated.row.updated_at > before);
  check("real update: exactly one NEW audit event written", db.auditEvents.length === auditCountBefore + 1);
}

// --- audit changed_fields exact ----------------------------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, purpose: { en: "p1" }, expectedUpdatedAt: null }, ticker);
  updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v2" }, purpose: { en: "p1" }, hours: { mode: "unavailable" }, expectedUpdatedAt: created.row.updated_at }, ticker);
  const lastEvent = db.auditEvents[db.auditEvents.length - 1];
  check(
    "audit changed_fields contains exactly the fields that actually changed (description, hours) and NOT purpose (unchanged) or special_notes/localized_alias (still null->null)",
    JSON.stringify([...lastEvent.metadata.changed_fields].sort()) === JSON.stringify(["description", "hours"].sort())
  );
}

// --- nulling one override counts as changed and is stored as a real null ---
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, purpose: { en: "p1" }, expectedUpdatedAt: null }, ticker);
  const nulled = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", description: { en: "v1" }, purpose: null, expectedUpdatedAt: created.row.updated_at }, ticker);
  check("nulling purpose: counts as a changed field", nulled.row && db.auditEvents[db.auditEvents.length - 1].metadata.changed_fields.includes("purpose"));
  check("nulling purpose: stored value is a real null, not skipped/left as the old value", db.buildingMetadata.get("B_PUSTAKA").purpose === null);
}

// --- full 5-field save: fields not intentionally changed keep their --------
// --- EXPLICITLY SUPPLIED value (this RPC is not a PATCH — a caller must ---
// --- resupply every field it wants to keep). --------------------------------
{
  const db = withStandardActors(freshDb());
  const ticker = makeNowTicker();
  const created = updateBuildingMetadata(db, GLOBAL_ADMIN, {
    buildingId: "B_PUSTAKA", description: { en: "v1" }, purpose: { en: "p1" }, specialNotes: { en: "n1" }, localizedAlias: { en: "a1" }, hours: { mode: "24h" }, expectedUpdatedAt: null,
  }, ticker);
  // Caller re-supplies every field, changing only `hours`.
  const updated = updateBuildingMetadata(db, GLOBAL_ADMIN, {
    buildingId: "B_PUSTAKA", description: { en: "v1" }, purpose: { en: "p1" }, specialNotes: { en: "n1" }, localizedAlias: { en: "a1" }, hours: { mode: "unavailable" }, expectedUpdatedAt: created.row.updated_at,
  }, ticker);
  const stored = db.buildingMetadata.get("B_PUSTAKA");
  check(
    "full 5-field resupply: fields the caller did not intend to change retain their explicitly-supplied values",
    JSON.stringify(stored.description) === JSON.stringify({ en: "v1" }) &&
      JSON.stringify(stored.purpose) === JSON.stringify({ en: "p1" }) &&
      JSON.stringify(stored.special_notes) === JSON.stringify({ en: "n1" }) &&
      JSON.stringify(stored.localized_alias) === JSON.stringify({ en: "a1" })
  );
  check("full 5-field resupply: the intentionally changed field (hours) is updated", JSON.stringify(stored.hours) === JSON.stringify({ mode: "unavailable" }));
  // Demonstrating the PATCH-semantics trap this RPC deliberately avoids: if
  // a caller omitted the other fields (sent null) instead of resupplying
  // them, they would be WIPED, not preserved — this is intentional (see
  // migration header) and is a caller-contract concern, not a bug.
  const wipedIfOmitted = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", hours: { mode: "weekly", days: {} }, expectedUpdatedAt: stored.updated_at }, ticker);
  check(
    "omitting a field (sending null) on a subsequent save WIPES it to null, proving this is full-row save, not PATCH",
    db.buildingMetadata.get("B_PUSTAKA").description === null
  );
}

// --- missing row + all null: rejected (this project's chosen contract) -----
{
  const db = withStandardActors(freshDb());
  const result = updateBuildingMetadata(db, GLOBAL_ADMIN, { buildingId: "B_PUSTAKA", expectedUpdatedAt: null }, makeNowTicker());
  check("missing row + all five fields null: rejected with 22023 (chosen contract: reject, not allow an empty row)", result.error?.sqlstate === "22023");
  check("missing row + all-null rejection: no row was created", !db.buildingMetadata.has("B_PUSTAKA"));
}

const failed = results.filter(r => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} - [MODEL] ${r.name}${r.pass || !r.detail ? "" : ` (${r.detail})`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} JS update-model assertions passed.`);
console.log("NOTE: this is a JS model test only — it does not execute against Postgres and does not prove RLS/transaction/locking behavior.");
if (failed.length) process.exit(1);
