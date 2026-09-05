-- BACKEND V2.4b1.1 — Private Helper service_role ACL Hardening
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner. This round is LOCAL implementation only — no
-- migration apply, no production write, no logic change of any kind.
--
-- GAP THIS MIGRATION CLOSES
-- V2.4b2's own required security review (before writing
-- 20260905150000_building_metadata_update_rpc.sql) found that V2.4b1's two
-- new private helpers, private.has_active_college_admin(uuid, smallint)
-- and private.can_manage_building_metadata(uuid, smallint), correctly
-- `revoke execute ... from public, anon, authenticated;` but never
-- explicitly `grant execute ... to service_role;`. Every OTHER
-- private.*/api.* function created after
-- EchoWall-Feature-Foundation/supabase/migrations/
-- 20260830000900_rls_and_grants.sql's one-time, point-in-time `grant
-- execute on all functions in schema private to service_role` gets its own
-- explicit per-function grant to service_role (confirmed by grep across
-- every phase3c/phase5 migration in that repo) — that blanket statement
-- only ever covered functions that already existed when it ran; it is not
-- a default-privileges mechanism, so it does not retroactively cover
-- anything created afterward, including V2.4b1's two helpers. This
-- migration closes exactly that one gap and nothing else.
--
-- THIS IS NOT A SECURITY FIX — it is a hardening/consistency correction.
-- PUBLIC/anon/authenticated were already correctly locked out by V2.4b1's
-- own revoke statements (independently re-verified before writing this
-- file — see the ACL matrix in this round's final report). V2.4b2's
-- api.update_building_metadata was never affected by the gap either: it is
-- SECURITY DEFINER, owned by the same role that owns both helpers, and an
-- owner always retains implicit EXECUTE on its own functions regardless of
-- grants to other roles.
--
-- SCOPE — this migration ONLY changes privileges on two EXISTING
-- functions. It does not touch their logic, does not CREATE OR REPLACE
-- them, does not DROP or ALTER them, and does not touch any table,
-- app.user_roles, app.app_role, app.building_metadata,
-- app.college_admin_assignments, api.update_building_metadata, any other
-- api.* view/function, or the supabase_realtime publication. No schema-
-- level ACL is touched either — service_role already has USAGE on schema
-- private from the same 20260830000900_rls_and_grants.sql statement
-- referenced above (`grant usage on schema private to service_role;`),
-- and this migration does not grant schema private USAGE to
-- authenticated/anon (they must never reach these helpers directly).

begin;

-- private.has_active_college_admin(uuid, smallint) --------------------------
-- Explicit, exhaustive revoke-then-grant so the resulting ACL is fully
-- self-documenting in this file rather than relying on V2.4b1's earlier
-- revoke (which remains correct and is not being replaced, only
-- supplemented): PUBLIC no, anon no, authenticated no, service_role yes.
revoke all on function private.has_active_college_admin(uuid, smallint) from public;
revoke all on function private.has_active_college_admin(uuid, smallint) from anon;
revoke all on function private.has_active_college_admin(uuid, smallint) from authenticated;
revoke all on function private.has_active_college_admin(uuid, smallint) from service_role;
grant execute on function private.has_active_college_admin(uuid, smallint) to service_role;

-- private.can_manage_building_metadata(uuid, smallint) -----------------------
revoke all on function private.can_manage_building_metadata(uuid, smallint) from public;
revoke all on function private.can_manage_building_metadata(uuid, smallint) from anon;
revoke all on function private.can_manage_building_metadata(uuid, smallint) from authenticated;
revoke all on function private.can_manage_building_metadata(uuid, smallint) from service_role;
grant execute on function private.can_manage_building_metadata(uuid, smallint) to service_role;

commit;

-- Explicitly NOT touched by this migration (confirmed no statement above
-- references any of these): the function bodies/logic of either helper
-- (no CREATE OR REPLACE, no DROP, no ALTER FUNCTION), app.user_roles,
-- app.app_role, app.building_metadata, app.college_admin_assignments,
-- api.update_building_metadata, any other api.*/private.* object, schema
-- private/app/api USAGE grants, and the supabase_realtime publication.

-- ROLLBACK (manual, read-only reference — NOT executed by this file).
-- Restores the exact V2.4b1-authored ACL (service_role without an
-- explicit grant — relying on ownership/blanket-grant history, not a
-- direct grant):
--
--   begin;
--   revoke execute on function private.can_manage_building_metadata(uuid, smallint) from service_role;
--   revoke execute on function private.has_active_college_admin(uuid, smallint) from service_role;
--   commit;
