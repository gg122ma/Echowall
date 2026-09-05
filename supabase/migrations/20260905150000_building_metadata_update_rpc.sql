-- BACKEND V2.4b2 — Building Metadata Secure Update RPC + Audit
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner. This round is LOCAL implementation only — no
-- migration apply, no production write, no role assignment, no Admin UI.
--
-- SCOPE OF THIS MIGRATION — creates ONLY:
--   1) api.update_building_metadata(...) — the one authenticated mutation
--      RPC for app.building_metadata, calling the V2.4b1 authorization
--      primitive (private.can_manage_building_metadata) and the V2.4a
--      validation helpers (private.is_valid_localized_text,
--      private.is_valid_building_hours) — no new validation convention.
--   2) its ACL hardening (revoke from public/anon, grant to
--      authenticated/service_role — the exact established convention this
--      project already uses for api.create_post/api.create_map_post/
--      api.create_comment/api.create_reply, confirmed verbatim in
--      EchoWall-Feature-Foundation/supabase/migrations/
--      20260830185742_phase3c_content_and_moderation_hardening.sql).
-- Explicitly NOT created this round: no role-management RPC (grant/revoke/
-- disable a college_admin_assignments row), no Admin UI, no realtime, no
-- ALTER of app.user_roles/app.app_role/app.building_scope_keys/
-- app.college_admin_assignments/private.has_active_role/
-- private.require_active_user, no DROP/replace of api.building_metadata_public.
--
-- SECURITY REVIEW PERFORMED BEFORE WRITING THIS FILE
-- The V2.4b1 migration (20260905120000_college_admin_building_permissions.sql)
-- was re-inspected before starting this round: both
-- private.has_active_college_admin(uuid, smallint) and
-- private.can_manage_building_metadata(uuid, smallint) explicitly
-- `revoke execute ... from public, anon, authenticated;`, matching the
-- required "not executable by PUBLIC/anon/authenticated" gate exactly —
-- this migration does not need to (and does not) touch either function's
-- ACL. One separate, non-blocking gap was found and is NOT corrected here
-- (correcting a prior stage's migration inside this one is explicitly out
-- of scope for this round): neither V2.4b1 helper has an explicit
-- `grant execute ... to service_role`, unlike the established per-function
-- convention every OTHER private/api function created after
-- 20260830000900_rls_and_grants.sql's one-time, point-in-time
-- `grant execute on all functions in schema private to service_role`
-- follows (that blanket grant only ever applied to functions that already
-- existed when it ran — it is not a default-privileges mechanism, so it
-- does not retroactively cover V2.4b1's two new functions). This has ZERO
-- functional or security impact on this migration's own RPC: `postgres`
-- owns both V2.4b1 helpers and this migration's new RPC alike, and a
-- SECURITY DEFINER function's body runs as its OWNER when calling further
-- functions, so `api.update_building_metadata` (owned by `postgres`)
-- can call `private.can_manage_building_metadata` regardless of
-- `service_role`'s own grants. It would only matter if something someday
-- authenticates directly AS `service_role` and calls that private helper
-- directly, which nothing in this codebase does. Flagged in this round's
-- final report as a P1 follow-up (a small, separately-authorized
-- "harden V2.4b1 service_role grants" migration), not silently fixed here.
--
-- OWNERSHIP — this is a brand-new function, owned by this migration's
-- executing role exactly like every other api.*/private.* function in
-- this project; no owner-transfer dance is used or needed (that pattern is
-- reserved for api.*_public views, which are deliberately owned by the
-- non-login echowall_api_viewer role — see V2.3b's migration header for
-- why). This migration does not touch api.building_metadata_public at all
-- — no DROP, no CREATE OR REPLACE — it only SELECTs from it in the RPC's
-- own return path, exactly like api.create_comment/api.create_reply
-- already do against api.comments_public.

begin;

-- api.update_building_metadata --------------------------------------------
--
-- FULL OVERRIDE-ROW SAVE SEMANTICS (V2.4a's own contract, reused
-- verbatim): each of the five p_* parameters is the COMPLETE new value for
-- its column. A NULL parameter means "no backend override for this field;
-- use static fallback" — it is written as a real SQL NULL, not skipped.
-- This RPC is NOT a PATCH endpoint: a caller that wants to keep an
-- existing override value for a field it isn't changing must pass that
-- field's CURRENT value back in, not NULL. A future Admin UI must load the
-- actual override row (not the effective/static-merged presentation) so
-- unmodified fields still round-trip correctly.
--
-- LOCALIZED / HOURS SEMANTICS — reuses the exact V2.4a validators
-- (private.is_valid_localized_text, private.is_valid_building_hours) with
-- the SAME per-field length limits as app.building_metadata's own CHECK
-- constraints, so a bad payload gets a clear 22023 application error
-- instead of an opaque constraint-violation. A non-null localized object
-- REPLACES the whole static/stored object — en/ms/zh are never merged
-- here or anywhere else. `hours` is validated and stored as one whole
-- object — individual days are never merged, and no open_now/is_open/
-- current-status field is ever accepted or stored (Open/Closed stays
-- runtime-derived by BuildingHours; see data/campus-building-hours.js).
--
-- OPTIMISTIC CONCURRENCY (app.building_metadata.updated_at) —
--   CASE A (no existing row): p_expected_updated_at MUST be NULL, else
--     reject as stale (see SQLSTATE below). The row is then created.
--   CASE B (existing row): p_expected_updated_at MUST be non-null and
--     exactly equal to the row's current updated_at, else reject as
--     stale. The existing row is locked with SELECT ... FOR UPDATE before
--     this comparison so two concurrent updaters can never both believe
--     they read the latest state.
--   CASE A's own concurrent-create race (two callers both see "no row")
--     cannot be protected by a row lock (there is no row yet to lock), so
--     it is instead protected by app.building_metadata's own PRIMARY KEY:
--     the second concurrent INSERT fails with 23505 (unique_violation),
--     which this function catches and re-raises as the SAME consistent
--     stale-write SQLSTATE/message as case B, so a caller never has to
--     distinguish "someone updated it" from "someone just created it" —
--     both simply mean "reload and retry".
--   Chosen SQLSTATE for every stale/conflict outcome: '40001' (the
--     standard PostgreSQL "serialization_failure" class code), with the
--     exact message "Building metadata changed. Reload and retry." —
--     picked because this project has never used 40001 for anything else
--     (confirmed by grep across every applied migration) and its meaning
--     ("retry your transaction") matches this RPC's intended client
--     behavior precisely.
--
-- NO-OP SAVE — for an EXISTING row, if all five incoming values are
-- IS NOT DISTINCT FROM (NULL-safe) the five stored values, nothing
-- changed: updated_at/updated_by are left untouched, no audit_events row
-- is written, and the existing api.building_metadata_public row is
-- returned as-is. This makes a repeated Save with unchanged content
-- idempotent and keeps the audit log free of no-op noise.
--
-- MISSING-ROW / ALL-NULL — if there is no existing row AND all five
-- incoming values are NULL, this is rejected (22023) rather than silently
-- creating an empty override row: an all-NULL override row is
-- semantically identical to having no row at all (every field already
-- falls back to static per V2.4a), so creating one would only add
-- meaningless data and a meaningless audit event.
--
-- AUDIT — on a REAL create or update only, exactly one app.audit_events
-- row is inserted in the SAME transaction as the metadata mutation (this
-- function's implicit single-statement transaction — if the audit INSERT
-- fails, the whole function fails and the metadata mutation rolls back
-- with it; there is no separate try/catch around the audit insert).
-- event_type = 'building_metadata_updated', target_type = 'building',
-- target_id = the building_id (text, not the metadata row's own surrogate
-- key — there isn't one). metadata is sanitized to exactly
-- {college_id, operation, changed_fields} — changed_fields is computed
-- server-side via IS DISTINCT FROM against the row that was actually
-- there before this statement (not from the request in isolation), and
-- contains only field NAMES from the five supported columns — never the
-- actual description/purpose/special_notes/localized_alias/hours VALUES,
-- and never any identity beyond actor_user_id (which app.audit_events
-- already carries as its own column, not inside metadata).
create or replace function api.update_building_metadata(
  p_building_id text,
  p_description jsonb,
  p_purpose jsonb,
  p_special_notes jsonb,
  p_localized_alias jsonb,
  p_hours jsonb,
  p_expected_updated_at timestamptz default null
)
returns setof api.building_metadata_public
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.require_active_user();
  v_college_id smallint;
  v_existing app.building_metadata%rowtype;
  v_operation text;
  v_changed_fields text[] := array[]::text[];
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  -- Resolve the canonical college server-side. Building IDs are globally
  -- unique under the current app.building_scope_keys contract, so this is
  -- a single unambiguous lookup — the caller never supplies college_id,
  -- preventing a caller from picking an easier authorization scope than
  -- the Building actually belongs to. Same lookup/rejection shape as
  -- api.create_map_post's own building_id -> college_id resolution.
  select b.college_id into v_college_id
  from app.building_scope_keys as b
  where b.building_id = p_building_id;

  if not found then
    raise exception using errcode = '23503', message = 'Unknown building ID.';
  end if;

  if not private.can_manage_building_metadata(v_user, v_college_id) then
    -- Deliberately generic: never reveals whether the caller has an
    -- assignment for some OTHER college, or any other detail about why
    -- authorization failed.
    raise exception using errcode = '42501', message = 'You do not have permission to edit this Building.';
  end if;

  if not private.is_valid_localized_text(p_description, 2000) then
    raise exception using errcode = '22023', message = 'Description is not a valid localized text object.';
  end if;
  if not private.is_valid_localized_text(p_purpose, 500) then
    raise exception using errcode = '22023', message = 'Purpose is not a valid localized text object.';
  end if;
  if not private.is_valid_localized_text(p_special_notes, 1000) then
    raise exception using errcode = '22023', message = 'Special notes is not a valid localized text object.';
  end if;
  if not private.is_valid_localized_text(p_localized_alias, 100) then
    raise exception using errcode = '22023', message = 'Localized alias is not a valid localized text object.';
  end if;
  if not private.is_valid_building_hours(p_hours) then
    raise exception using errcode = '22023', message = 'Hours is not a valid hours object.';
  end if;

  -- Lock any existing row now, before deciding create vs. update, so the
  -- optimistic-concurrency check below is race-free against another
  -- concurrent updater of the SAME existing row.
  select m.* into v_existing
  from app.building_metadata as m
  where m.building_id = p_building_id
  for update;

  if not found then
    -- CASE A: no existing override row.
    if p_expected_updated_at is not null then
      raise exception using errcode = '40001', message = 'Building metadata changed. Reload and retry.';
    end if;

    if p_description is null and p_purpose is null and p_special_notes is null
       and p_localized_alias is null and p_hours is null then
      raise exception using errcode = '22023', message = 'No override was supplied.';
    end if;

    if p_description is not null then v_changed_fields := array_append(v_changed_fields, 'description'); end if;
    if p_purpose is not null then v_changed_fields := array_append(v_changed_fields, 'purpose'); end if;
    if p_special_notes is not null then v_changed_fields := array_append(v_changed_fields, 'special_notes'); end if;
    if p_localized_alias is not null then v_changed_fields := array_append(v_changed_fields, 'localized_alias'); end if;
    if p_hours is not null then v_changed_fields := array_append(v_changed_fields, 'hours'); end if;

    begin
      insert into app.building_metadata (
        building_id, college_id, description, purpose, special_notes, localized_alias, hours,
        updated_by, updated_at
      ) values (
        p_building_id, v_college_id, p_description, p_purpose, p_special_notes, p_localized_alias, p_hours,
        v_user, v_now
      );
    exception
      when unique_violation then
        -- Another transaction created this same row concurrently between
        -- our lookup above and this INSERT. Re-raised as the SAME
        -- stale-write SQLSTATE/message as an update-time conflict, so the
        -- caller only ever has one "reload and retry" outcome to handle.
        raise exception using errcode = '40001', message = 'Building metadata changed. Reload and retry.';
    end;

    v_operation := 'created';
  else
    -- CASE B: existing override row -- optimistic concurrency required.
    if p_expected_updated_at is null or p_expected_updated_at <> v_existing.updated_at then
      raise exception using errcode = '40001', message = 'Building metadata changed. Reload and retry.';
    end if;

    if p_description is distinct from v_existing.description then v_changed_fields := array_append(v_changed_fields, 'description'); end if;
    if p_purpose is distinct from v_existing.purpose then v_changed_fields := array_append(v_changed_fields, 'purpose'); end if;
    if p_special_notes is distinct from v_existing.special_notes then v_changed_fields := array_append(v_changed_fields, 'special_notes'); end if;
    if p_localized_alias is distinct from v_existing.localized_alias then v_changed_fields := array_append(v_changed_fields, 'localized_alias'); end if;
    if p_hours is distinct from v_existing.hours then v_changed_fields := array_append(v_changed_fields, 'hours'); end if;

    if pg_catalog.array_length(v_changed_fields, 1) is null then
      -- No-op: every incoming value already matches what is stored.
      -- Leave updated_at/updated_by untouched and write no audit event.
      return query select p.* from api.building_metadata_public as p where p.building_id = p_building_id;
      return;
    end if;

    update app.building_metadata as m
    set description = p_description,
        purpose = p_purpose,
        special_notes = p_special_notes,
        localized_alias = p_localized_alias,
        hours = p_hours,
        updated_by = v_user,
        updated_at = v_now
    where m.building_id = p_building_id;

    v_operation := 'updated';
  end if;

  insert into app.audit_events (actor_user_id, event_type, target_type, target_id, metadata)
  values (
    v_user,
    'building_metadata_updated',
    'building',
    p_building_id,
    jsonb_build_object(
      'college_id', v_college_id,
      'operation', v_operation,
      'changed_fields', pg_catalog.to_jsonb(v_changed_fields)
    )
  );

  return query select p.* from api.building_metadata_public as p where p.building_id = p_building_id;
end;
$$;

comment on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) is
  'V2.4b2 -- authenticated, authorized (private.can_manage_building_metadata), audited (app.audit_events, building_metadata_updated) full-row upsert of the optional app.building_metadata override for one building. NULL fields are stored as NULL (static fallback), never skipped. Optimistic concurrency via p_expected_updated_at (SQLSTATE 40001 on any conflict). No-op saves write no audit row. Returns only the sanitized api.building_metadata_public projection -- never exposes updated_by or any audit row.';

-- ACL hardening -- the exact established convention this project already
-- uses for api.create_post/api.create_map_post/api.create_comment/
-- api.create_reply (confirmed verbatim in EchoWall-Feature-Foundation's
-- 20260830185742_phase3c_content_and_moderation_hardening.sql): revoke the
-- function's default PUBLIC-execute grant plus anon explicitly, then grant
-- back only to authenticated and service_role. Final ACL: postgres
-- (owner, implicit) yes, service_role yes, authenticated yes, anon no,
-- PUBLIC no.
revoke execute on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) to authenticated, service_role;

commit;

-- Explicitly NOT touched by this migration (confirmed no statement above
-- references any of these): app.user_roles, app.app_role,
-- app.college_admin_assignments, private.has_active_role,
-- private.has_active_college_admin, private.can_manage_building_metadata,
-- private.require_active_user, app.building_scope_keys,
-- api.building_metadata_public (read from, never redefined/dropped),
-- supabase_realtime publication, any role-management RPC, any Admin UI.

-- ROLLBACK (manual, read-only reference — NOT executed by this file).
-- Valid ONLY before any later migration (V2.4c+) creates a dependent
-- object on this function (none exists at creation time, so this is a
-- plain drop, no CASCADE). Do NOT drop api.building_metadata_public,
-- app.building_metadata, app.college_admin_assignments, or either
-- private.* helper — none of those are owned by this migration:
--
--   begin;
--   revoke execute on function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz) from authenticated, service_role;
--   drop function api.update_building_metadata(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamptz);
--   commit;
