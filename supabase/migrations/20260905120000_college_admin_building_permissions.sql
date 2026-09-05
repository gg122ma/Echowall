-- BACKEND V2.4b1 — Server-Side College-Scoped Building Admin Permission Foundation
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner. This round is LOCAL implementation only — no
-- migration apply, no production write, no role assignment, no RPC that
-- performs a real mutation. It establishes the AUTHORIZATION PRIMITIVE a
-- later V2.4b2 Building-metadata write RPC will call — it does not itself
-- expose any way to write app.building_metadata or manage assignments.
--
-- CORE SECURITY DECISION — read this before touching anything here
-- `app.user_roles.role = 'admin'` is a GLOBAL role, read by the EXISTING
-- `private.has_active_role(p_user_id uuid, p_roles app.app_role[])`
-- (defined in EchoWall-Feature-Foundation/supabase/migrations/
-- 20260830000600_private_helpers_and_triggers.sql — language sql, stable,
-- security definer, set search_path = '', checking
-- `app.user_roles.role = any(p_roles) and disabled_at is null`). If a
-- college-scoped admin were represented by inserting `role='admin'` into
-- `app.user_roles` for that user, `has_active_role(..., ARRAY['admin'])`
-- would treat that user as a GLOBAL admin everywhere — a privilege
-- escalation. This migration therefore does NOT touch `app.user_roles` or
-- `app.app_role` in any way, and does NOT add a `college_id` column to
-- `app.user_roles`. Instead it introduces one purpose-specific table,
-- `app.college_admin_assignments`, whose EXISTENCE of a row (not a role
-- value — no role column is needed, since the table itself means "this
-- user is a COLLEGE_ADMIN for this college") is a separate, narrower
-- authorization contract, combined with the existing global-admin check
-- only inside a new helper (`private.can_manage_building_metadata`) that
-- never writes to or reinterprets `app.user_roles`.
--
-- WHY A SEPARATE TABLE (documented per instruction)
--   app.user_roles                 -> user / moderator / admin, GLOBAL role contract
--   app.college_admin_assignments  -> COLLEGE-SCOPED COLLEGE_ADMIN contract, separate and additive
-- A global `admin` remains global (sections below give it access to every
-- college via private.has_active_role, unchanged). A college admin does
-- NOT automatically become admin, moderator, GLOBAL_MODERATOR, a Study
-- moderator, or a Content reviewer — a college_admin_assignments row only
-- ever answers "is this user this exact college's Building admin", nothing
-- broader. See docs/BACKEND_V2.md for the full frontend-role-to-backend
-- mapping (documentation only — no frontend/Admin UI integration this
-- round).
--
-- SCOPE OF THIS MIGRATION — creates ONLY:
--   1) app.college_admin_assignments (table, RLS enabled+forced, ZERO
--      policies — same pattern as the existing app.user_roles/
--      app.audit_events, which are pure server-side authorization-state
--      tables with no public view and are only ever read through a
--      SECURITY DEFINER helper owned by the same role that owns the
--      table, never through a granted policy).
--   2) private.has_active_college_admin(uuid, smallint)
--   3) private.can_manage_building_metadata(uuid, smallint)
-- Explicitly NOT created this round (see the task's own scope boundary):
--   - no api.grant_college_admin / api.revoke_college_admin / api.disable_college_admin
--     (role-management writes need their own audit/admin design and are
--     not required to authorize Building metadata RPCs)
--   - no api.update_building_metadata (that is V2.4b2 — this migration
--     only provides the authorization primitive V2.4b2 will call)
--   - no app.audit_events INSERT (there is no business mutation yet)
--   - no ALTER PUBLICATION / no realtime of any kind
--   - no change to app.user_roles, app.app_role, private.has_active_role,
--     app.building_scope_keys, or app.building_metadata
--
-- OWNERSHIP — unlike api.* views (which are deliberately owned by the
-- non-login `echowall_api_viewer` role so RLS still applies to the view's
-- own queries — see 20260830000700_api_views.sql), every object here is
-- brand new and simply owned by this migration's executing role, exactly
-- like every other app.* table and private.* function in this project. No
-- owner-transfer / temporary-role-elevation dance is used or needed.

begin;

-- 1. app.college_admin_assignments -------------------------------------------
create table app.college_admin_assignments (
  user_id uuid not null
    references auth.users (id) on delete cascade,
  college_id smallint not null
    references app.college_scope_keys (college_id) on delete restrict,
  assigned_by uuid not null
    references auth.users (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (user_id, college_id)
);

comment on table app.college_admin_assignments is
  'V2.4b1 — server-side COLLEGE_ADMIN contract, intentionally separate from app.user_roles (see this migration''s header for why). A row''s mere existence (with disabled_at null) means that user is the Building-metadata admin for that one college; there is no role column because the table itself is the assignment. No write API exists yet — rows can only be produced by a future, separately-authorized role-management RPC (not this migration).';
comment on column app.college_admin_assignments.user_id is 'The college admin. references auth.users, cascade so a deleted auth user''s assignments are cleaned up automatically.';
comment on column app.college_admin_assignments.college_id is 'references app.college_scope_keys; restrict so a college key can never be silently removed out from under an active assignment.';
comment on column app.college_admin_assignments.assigned_by is 'Actor who created the assignment. references auth.users, restrict (never cascade an admin-actor identity away).';
comment on column app.college_admin_assignments.disabled_at is 'NULL = active. A disabled (non-null) row is kept for history/audit, never deleted, and is treated as false by every helper below.';

alter table app.college_admin_assignments enable row level security;
alter table app.college_admin_assignments force row level security;
-- No RLS policy of any kind is created — this matches the EXISTING pattern
-- for app.user_roles and app.audit_events (both RLS enabled+forced, both
-- with zero policies: confirmed in
-- EchoWall-Feature-Foundation/supabase/migrations/20260830000900_rls_and_grants.sql,
-- lines 21-24), because both are pure server-side authorization-state
-- tables with no public projection view. All real access happens only
-- through the two SECURITY DEFINER helpers below, which run as this
-- table's own owner and therefore need no policy to read it. No anon
-- SELECT, no authenticated SELECT, no browser INSERT/UPDATE/DELETE policy
-- exists or is intended to ever exist for this table.
--
-- No explicit REVOKE is added for the table itself: PostgreSQL grants no
-- default table privilege to PUBLIC (unlike functions, which DO default-
-- grant EXECUTE to PUBLIC and are explicitly revoked below) — confirmed by
-- the same app.user_roles/app.audit_events precedent, which carries no
-- GRANT or REVOKE statement of any kind for the table itself, only the two
-- ENABLE/FORCE lines above.

-- 2. private.has_active_college_admin -----------------------------------------
-- Returns true only for an ACTIVE (disabled_at is null) assignment of
-- EXACTLY p_college_id to EXACTLY p_user_id. Standard SQL null semantics
-- already make this false for a null p_user_id or p_college_id (an
-- equality comparison against NULL is never true, so the EXISTS subquery
-- finds no row) — no special-cased null check is needed or added.
create or replace function private.has_active_college_admin(p_user_id uuid, p_college_id smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.college_admin_assignments as caa
    where caa.user_id = p_user_id
      and caa.college_id = p_college_id
      and caa.disabled_at is null
  );
$$;

comment on function private.has_active_college_admin(uuid, smallint) is
  'V2.4b1 — true iff p_user_id has a non-disabled app.college_admin_assignments row for exactly p_college_id. Null p_user_id/p_college_id => false via ordinary SQL equality semantics.';

revoke execute on function private.has_active_college_admin(uuid, smallint) from public, anon, authenticated;

-- 3. private.can_manage_building_metadata -------------------------------------
-- The authorization primitive a future V2.4b2 api.update_building_metadata
-- RPC will call. Exact matrix (see this migration's header for the
-- security reasoning): global admin => every college; a college's own
-- COLLEGE_ADMIN => that college only; a DIFFERENT college's COLLEGE_ADMIN,
-- a disabled assignment, `moderator`, `user`, or anonymous => false.
-- Deliberately calls the EXISTING private.has_active_role with ONLY
-- ARRAY['admin'::app.app_role] — never 'moderator' — so a global Community
-- moderator is NOT granted Building-metadata authority by this helper.
create or replace function private.can_manage_building_metadata(p_user_id uuid, p_college_id smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_active_role(p_user_id, array['admin'::app.app_role])
    or private.has_active_college_admin(p_user_id, p_college_id);
$$;

comment on function private.can_manage_building_metadata(uuid, smallint) is
  'V2.4b1 — Building-metadata authorization primitive for a future write RPC (V2.4b2, not yet created). True iff p_user_id is a GLOBAL admin (via the existing private.has_active_role, admin only, never moderator) OR an active COLLEGE_ADMIN of exactly p_college_id (via private.has_active_college_admin). Not exposed through the api schema.';

revoke execute on function private.can_manage_building_metadata(uuid, smallint) from public, anon, authenticated;

commit;

-- Explicitly NOT touched by this migration (confirmed no statement above
-- references any of these): app.user_roles, app.app_role,
-- private.has_active_role, app.building_scope_keys, app.building_metadata,
-- api.building_metadata_public, supabase_realtime publication,
-- app.audit_events, any api.* RPC function.

-- ROLLBACK (manual, read-only reference — NOT executed by this file).
-- Valid ONLY before any later migration (V2.4b2+) creates a dependent
-- object on either function or on app.college_admin_assignments (neither
-- has any dependent at creation time, so this is a plain drop, no
-- CASCADE):
--
--   begin;
--   revoke execute on function private.can_manage_building_metadata(uuid, smallint) from public, anon, authenticated;
--   drop function private.can_manage_building_metadata(uuid, smallint);
--   revoke execute on function private.has_active_college_admin(uuid, smallint) from public, anon, authenticated;
--   drop function private.has_active_college_admin(uuid, smallint);
--   drop table app.college_admin_assignments;
--   commit;
