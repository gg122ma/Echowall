-- BACKEND V2.4a — Building Metadata Read Model + Static Fallback
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner. This round is LOCAL implementation only — no
-- migration apply, no production write, no `app.user_roles` change.
--
-- PURPOSE
-- Introduce ONE new, empty-by-design table (app.building_metadata) that lets
-- a future authorized admin path (V2.4b+, NOT this round) override a small,
-- fixed set of informational Building fields, while today's static
-- data/campus-buildings.js + data/campus-building-hours.js snapshot stays
-- the authoritative fallback. This migration creates NO write API (no RPC,
-- no INSERT/UPDATE/DELETE grant, no browser write policy of any kind) and
-- seeds NO rows — the table is intentionally empty at creation time so
-- production-visible Building content is byte-for-byte unchanged the moment
-- this migration would be applied. It also does NOT touch
-- `app.user_roles`, `app.audit_events`, the realtime publication, or any
-- existing api.* view/function.
--
-- ARCHITECTURE DECISIONS CARRIED FORWARD FROM THE V2.4A READ-ONLY AUDIT
-- 1. `app.building_scope_keys` already guarantees `building_id` is globally
--    unique (`primary key (building_id)`, plus `unique (building_id,
--    college_id)` for the composite FK below) — confirmed against the
--    live-applied definition in
--    EchoWall-Feature-Foundation/supabase/migrations/20260830000200_scope_references_and_profiles.sql.
--    `college_id` is therefore functionally determined by `building_id`
--    alone today; the composite FK is intentionally redundant with the
--    single-column FK and exists only to make a mismatched `college_id`
--    a hard constraint violation instead of an application-level check, per
--    explicit instruction for this round.
-- 2. `app.user_roles` (role enum: 'user' | 'moderator' | 'admin', no scope
--    column) cannot express per-college admin scope. This is a known,
--    already-flagged architectural gap for a LATER stage (V2.4b1) and is
--    NOT addressed by this migration — there is no write RPC here for it to
--    gate in the first place.
-- 3. Every naming/ownership/RLS convention below is reproduced verbatim
--    from the two existing live-current sources: `api.posts_public` /
--    `api.comments_public` / `api.post_map_anchors_public` (created in
--    EchoWall-Feature-Foundation/supabase/migrations/20260830000700_api_views.sql,
--    RLS policies in .../20260830000900_rls_and_grants.sql) and this
--    branch's own 20260903092150_20260903010000_building_comments_and_replies.sql.
--
--    PRODUCTION-ENGINE-PROVEN CORRECTION (this round): an earlier draft of
--    this migration assumed a brand-new view could simply be `create view`d
--    as the migration's executing role and then handed to
--    echowall_api_viewer with a trailing `alter view ... owner to
--    echowall_api_viewer;` — reasoning that the temporary-role-elevation
--    dance in this branch's own V2.3b migration was only ever needed for
--    REPLACING an already-echowall_api_viewer-owned view, not for a
--    first-time CREATE. A trusted production Postgres dry-run rejected
--    that assumption: production's migration-executing role is a MEMBER of
--    echowall_api_viewer but with `SET OPTION = false`, so `set role
--    echowall_api_viewer` (needed before `alter view ... owner to`, and
--    implicitly by ALTER OWNER's own privilege checks) fails with 42501
--    ("must be able to SET ROLE \"echowall_api_viewer\""); and separately,
--    echowall_api_viewer itself has `CREATE = false` on schema api, so
--    creating the view directly AS echowall_api_viewer (the only way to
--    avoid the ALTER OWNER step entirely) also fails with 42501
--    ("permission denied for schema api") until CREATE is temporarily
--    granted. Both findings came from a real production dry-run
--    (diagnostic only, fully rolled back, zero lasting production change).
--    This migration therefore reuses the SAME production-proven wrapper
--    V2.3b already uses for REPLACING a view — temporarily grant CREATE on
--    schema api to echowall_api_viewer, temporarily grant
--    echowall_api_viewer membership WITH SET TRUE to the executing role,
--    SET LOCAL ROLE echowall_api_viewer, create the view (now created
--    directly AS its intended owner, so no ALTER OWNER step is needed at
--    all), then RESET ROLE and revoke both temporary grants — even though
--    this view is a first-time CREATE, not a REPLACE. No `drop view`/`drop
--    function ... cascade` is used anywhere in this file.
--
-- CANONICAL MERGE SEMANTICS (enforced entirely in frontend code, not SQL —
-- see services/building-metadata-provider.js): no backend row = static
-- object unchanged; a non-null backend field wins whole (localized objects
-- and `hours` are replaced as a WHOLE unit, never merged key-by-key with
-- static); a null backend field falls back to the static field; any
-- backend/network failure falls back to static silently, with no user-
-- facing error.
--
-- Sections:
-- 1) private.is_valid_localized_text() / private.is_valid_building_hours()
--    — shared CHECK-constraint validation helpers.
-- 2) app.building_metadata table.
-- 3) Row Level Security (enable + force; single public-read policy for
--    echowall_api_viewer only — no browser policy of any kind).
-- 4) Grants (table-level SELECT to echowall_api_viewer only; browser roles
--    never get direct access to the app-schema table).
-- 5) api.building_metadata_public sanitized read view (excludes
--    updated_by), granted SELECT to anon + authenticated.
--
-- Explicitly NOT done by this migration (see header above and the V2.4a
-- audit report for why):
--   - no ALTER PUBLICATION (supabase_realtime is untouched; still only
--     app.realtime_events)
--   - no INSERT into app.building_metadata (table stays empty)
--   - no RPC / write API of any kind
--   - no change to app.user_roles, app.audit_events, or any existing
--     api.* view/function

begin;

-- 1. Validation helpers -------------------------------------------------------
-- Pure functions of their arguments only (no table access), so `security
-- invoker` is correct here (unlike `private.has_active_role`'s `security
-- definer`, which exists specifically to read app.user_roles under
-- elevated privilege). Matches this project's `set search_path = ''`
-- convention for every private.* function regardless of security mode.

create or replace function private.is_valid_localized_text(p_value jsonb, p_max_length integer)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select p_value is null or (
    jsonb_typeof(p_value) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_value) as kv(lang, val)
      where kv.lang not in ('en', 'ms', 'zh')
        or jsonb_typeof(kv.val) <> 'string'
        or length(kv.val #>> '{}') > p_max_length
    )
  );
$$;

comment on function private.is_valid_localized_text(jsonb, integer) is
  'V2.4a — CHECK-constraint helper: NULL or a JSON object whose only allowed keys are en/ms/zh, each a string within p_max_length. Mirrors the {en,ms,zh} shape read by window.getLocalizedBuildingText() in data/campus-buildings.js; does not require every language to be present.';

revoke execute on function private.is_valid_localized_text(jsonb, integer) from public, anon, authenticated;

-- Reproduces the EXACT shape read by window.BuildingHours.getSnapshot() in
-- data/campus-building-hours.js — read in full before writing this
-- function. Supported modes are precisely "weekly" | "24h" | "unavailable"
-- (no other mode exists in current code). "weekly" requires a `days` object
-- with exactly the 7 string keys "0".."6" (Date.getDay() order, Sunday
-- first), each either {"closed":true} or {"open":"HH:MM","close":"HH:MM"}.
-- `residentsOnly` (boolean) is optional and allowed on any mode, matching
-- current static data (only ever set alongside mode "24h" today, but
-- getSnapshot() does not itself forbid it elsewhere). open/close must be
-- valid 24h HH:MM and open < close: the current runtime's isOpenNow
-- comparison (`minutesNow >= open && minutesNow < close`) has no
-- overnight-crossing support, so an open >= close row would silently never
-- register as open — this validation rejects that data shape rather than
-- accepting something the current frontend cannot correctly interpret. This
-- function intentionally does NOT accept or store any "open_now"/"is_open"
-- field — open/closed stays runtime-derived only, exactly as required.
create or replace function private.is_valid_building_hours(p_value jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_mode text;
  v_days jsonb;
  v_key text;
  v_day jsonb;
  v_open text;
  v_close text;
  v_day_count integer;
begin
  if p_value is null then
    return true;
  end if;

  if jsonb_typeof(p_value) <> 'object' then
    return false;
  end if;

  if not (p_value ? 'mode') or jsonb_typeof(p_value -> 'mode') <> 'string' then
    return false;
  end if;
  v_mode := p_value ->> 'mode';
  if v_mode not in ('weekly', '24h', 'unavailable') then
    return false;
  end if;

  if p_value ? 'residentsOnly' and jsonb_typeof(p_value -> 'residentsOnly') <> 'boolean' then
    return false;
  end if;

  if v_mode = 'unavailable' or v_mode = '24h' then
    return true;
  end if;

  -- v_mode = 'weekly'
  if not (p_value ? 'days') or jsonb_typeof(p_value -> 'days') <> 'object' then
    return false;
  end if;
  v_days := p_value -> 'days';

  select count(*) into v_day_count from jsonb_object_keys(v_days);
  if v_day_count <> 7 then
    return false;
  end if;

  for v_key in select jsonb_object_keys(v_days) loop
    if v_key not in ('0', '1', '2', '3', '4', '5', '6') then
      return false;
    end if;
    v_day := v_days -> v_key;
    if jsonb_typeof(v_day) <> 'object' then
      return false;
    end if;
    if v_day ? 'closed' then
      if jsonb_typeof(v_day -> 'closed') <> 'boolean' or (v_day ->> 'closed') <> 'true' then
        return false;
      end if;
      if v_day ? 'open' or v_day ? 'close' then
        return false;
      end if;
    else
      if not (v_day ? 'open') or not (v_day ? 'close') then
        return false;
      end if;
      if jsonb_typeof(v_day -> 'open') <> 'string' or jsonb_typeof(v_day -> 'close') <> 'string' then
        return false;
      end if;
      v_open := v_day ->> 'open';
      v_close := v_day ->> 'close';
      if v_open !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or v_close !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        return false;
      end if;
      if v_open >= v_close then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

comment on function private.is_valid_building_hours(jsonb) is
  'V2.4a — CHECK-constraint helper mirroring data/campus-building-hours.js exactly (modes weekly/24h/unavailable; weekly requires 7 day keys "0".."6"). Never stores/accepts an open_now field.';

revoke execute on function private.is_valid_building_hours(jsonb) from public, anon, authenticated;

-- 2. app.building_metadata ----------------------------------------------------
create table app.building_metadata (
  building_id text primary key
    references app.building_scope_keys (building_id) on delete restrict,
  college_id smallint not null,
  description jsonb,
  purpose jsonb,
  special_notes jsonb,
  localized_alias jsonb,
  hours jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  -- Redundant with the single-column FK above by today's schema (building_id
  -- is already globally unique) — kept anyway so a caller-supplied
  -- college_id that does not match the canonical row for this building_id
  -- is a hard constraint violation, not an application-level check. See
  -- header note 1.
  foreign key (building_id, college_id)
    references app.building_scope_keys (building_id, college_id),
  check (private.is_valid_localized_text(description, 2000)),
  check (private.is_valid_localized_text(purpose, 500)),
  check (private.is_valid_localized_text(special_notes, 1000)),
  check (private.is_valid_localized_text(localized_alias, 100)),
  check (private.is_valid_building_hours(hours))
);

comment on table app.building_metadata is
  'V2.4a — optional per-building informational override. Empty by design at migration time (no seed): a missing row, or any NULL field on an existing row, means the frontend static snapshot (data/campus-buildings.js / data/campus-building-hours.js) stays authoritative for that building/field. No write API exists yet; rows can only be produced later by an explicit V2.4b+ migration/RPC.';
comment on column app.building_metadata.description is 'NULL or {en?,ms?,zh?} string object, max 2000 chars per language. Whole-object override only — never merged per-language with static data.';
comment on column app.building_metadata.purpose is 'NULL or {en?,ms?,zh?} string object, max 500 chars per language. Whole-object override only.';
comment on column app.building_metadata.special_notes is 'NULL or {en?,ms?,zh?} string object, max 1000 chars per language. Whole-object override only.';
comment on column app.building_metadata.localized_alias is 'NULL or {en?,ms?,zh?} string object, max 100 chars per language. Whole-object override only.';
comment on column app.building_metadata.hours is 'NULL or a whole BuildingHours-shaped object (mode: weekly|24h|unavailable). Whole-object override only — never merged day-by-day with static hours. Never stores a derived open/closed boolean.';
comment on column app.building_metadata.updated_by is 'Reserved for a future write RPC (V2.4b+). Deliberately excluded from api.building_metadata_public.';

-- 3. Row Level Security --------------------------------------------------------
alter table app.building_metadata enable row level security;
alter table app.building_metadata force row level security;

-- Matches the exact "<table>_api_public_read" naming/shape used by
-- comments_api_public_read (20260903092150_..._building_comments_and_replies.sql)
-- and realtime_events_public_read (20260902162437_..._community_realtime_signal.sql).
-- This is curated, always-public content (no moderation_status column
-- exists on this table), so the policy is unconditional for the
-- echowall_api_viewer role only — no policy of any kind is created for
-- anon/authenticated/service_role; browser reads only ever reach this table
-- indirectly, through api.building_metadata_public.
create policy building_metadata_api_public_read on app.building_metadata
  for select to echowall_api_viewer
  using (true);

-- 4. Grants ---------------------------------------------------------------
-- `usage on schema app` is already granted to echowall_api_viewer by
-- 20260830000700_api_views.sql; only the new table's own SELECT grant is
-- needed here. No browser role (anon, authenticated) is ever granted
-- direct access to app.building_metadata — public/browser reads go only
-- through api.building_metadata_public — and no INSERT/UPDATE/DELETE grant
-- is created for anyone this round: this table has no write path yet, and
-- when one is added (a future SECURITY DEFINER RPC) it will not depend on
-- service_role having any direct table grant here. Engine-verified: the
-- existing blanket `grant select, insert, update, delete on all tables in
-- schema app to service_role` in 20260830000900_rls_and_grants.sql is a
-- point-in-time GRANT — it only ever applied to tables that already
-- existed when that statement ran, not to tables created by later
-- migrations such as this one. No assumption should be made that
-- service_role automatically receives DML on a newly-created app-schema
-- table through that historical grant; if service_role ever needs direct
-- table access here, it requires its own explicit grant in a dedicated
-- migration, exactly as private.has_active_college_admin/
-- private.can_manage_building_metadata's missing service_role EXECUTE
-- grant was later found and corrected in
-- 20260905160000_college_admin_private_helper_acl.sql.
grant select on app.building_metadata to echowall_api_viewer;

-- 5. api.building_metadata_public ---------------------------------------------
-- Brand-new view: no prior definition exists anywhere in this project.
-- PRODUCTION-ENGINE-PROVEN: reuses the exact wrapper V2.3b already uses to
-- REPLACE an already-echowall_api_viewer-owned view (temporary CREATE on
-- schema api + temporary SET-true membership + SET LOCAL ROLE), even
-- though this view is a first-time CREATE, not a replace — a trusted
-- production dry-run proved the simpler "create as migration role, then
-- ALTER OWNER" shape a prior draft used does NOT work under production's
-- actual role configuration (migration-executing role is a member of
-- echowall_api_viewer but with SET OPTION = false, so a bare `set role`
-- fails 42501; echowall_api_viewer's CREATE on schema api is false, so
-- creating directly as it fails 42501 until temporarily granted). This
-- migration creates the view directly AS echowall_api_viewer (while SET
-- LOCAL ROLE is active), so no ALTER OWNER statement is used or needed at
-- all — see this file's header for the full production-engine finding. If
-- a future migration ever needs to redefine this view, it must follow this
-- SAME owner-preserving pattern instead of `drop view`.
grant create on schema api to echowall_api_viewer;
grant echowall_api_viewer to current_user with set true;
set local role echowall_api_viewer;

create view api.building_metadata_public
with (security_barrier = true)
as
select
  m.building_id,
  m.college_id,
  m.description,
  m.purpose,
  m.special_notes,
  m.localized_alias,
  m.hours,
  m.updated_at
from app.building_metadata as m;

comment on view api.building_metadata_public is 'Sanitized Building metadata override projection; never exposes updated_by or any admin identity.';
grant select on api.building_metadata_public to anon, authenticated;

reset role;
revoke set option for echowall_api_viewer from current_user;
revoke create on schema api from echowall_api_viewer;

commit;

-- Explicitly NOT touched by this migration (confirmed no statement above
-- references any of these): supabase_realtime publication, app.user_roles,
-- app.audit_events, app.posts, app.comments, app.post_votes,
-- app.post_map_anchors, api.posts_public, api.comments_public,
-- api.post_map_anchors_public, any api.create_*/cast_vote/solve_question
-- function.

-- ROLLBACK (manual, read-only reference — NOT executed by this file).
-- Valid ONLY if no later migration has created a dependent object on
-- api.building_metadata_public or app.building_metadata (neither has any
-- dependent at creation time, so this is a plain drop, no CASCADE) —
-- ENGINE-VERIFIED WARNING: as of V2.4b2,
-- 20260905150000_building_metadata_update_rpc.sql's
-- `api.update_building_metadata(...) RETURNS SETOF
-- api.building_metadata_public` IS exactly such a dependent object
-- (confirmed live against a real PostgreSQL 17 engine during the V2.4
-- migration stack review: attempting `drop view
-- api.building_metadata_public` while that function still exists fails
-- with "cannot drop view api.building_metadata_public because other
-- objects depend on it / function api.update_building_metadata(...)
-- depends on type api.building_metadata_public" — the same class of
-- dependent-object error V2.3b hit on api.comments_public). Therefore,
-- once V2.4b2 has been applied, this migration's rollback below is valid
-- ONLY after V2.4b2's own rollback has already dropped
-- api.update_building_metadata first — never before it, and never with
-- CASCADE as a shortcut. Full reverse-dependency order across the stack:
-- (1) drop api.update_building_metadata (V2.4b2's rollback), (2) only
-- then drop api.building_metadata_public (below), (3) then
-- app.building_metadata, (4) the two validator functions last, once every
-- dependent (the table's own CHECK constraints included) is gone:
--
--   begin;
--   revoke select on api.building_metadata_public from anon, authenticated;
--   drop view api.building_metadata_public;
--   drop policy if exists building_metadata_api_public_read on app.building_metadata;
--   revoke select on app.building_metadata from echowall_api_viewer;
--   drop table app.building_metadata;
--   drop function if exists private.is_valid_building_hours(jsonb);
--   drop function if exists private.is_valid_localized_text(jsonb, integer);
--   commit;
