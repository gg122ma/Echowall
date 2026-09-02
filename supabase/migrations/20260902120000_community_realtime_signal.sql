-- BACKEND V2.2 — Community Safe Realtime Foundation (CORRECTED, ROUND 3)
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner.
--
-- This file has been corrected three times:
-- Round 1 fixed column types (building_id text, not bigint), moved the
--   trigger to private.emit_realtime_event() with security invoker (not
--   app schema / security definer), and added moderation_status visibility
--   gating — all against the real app.posts/app.comments/app.post_votes/
--   app.post_map_anchors DDL, found in the 13 prior migrations at
--   "EchoWall-Feature-Foundation/supabase/migrations/" in a sibling
--   checkout (this repo checkout has no supabase/migrations/ history of
--   its own — confirmed again this round).
-- Round 2 (this pass) fixes a live-confirmed privilege gap: service_role
--   has BYPASSRLS=true, but that is NOT the same thing as holding a SQL
--   object privilege (GRANT) on app.realtime_events — see the "P0 FIX (this
--   round)" comment block below section 1 for the full RLS-vs-privilege
--   explanation and the live facts behind it (service_role already has
--   explicit select/insert/update/delete on app.posts/app.comments/
--   app.post_votes/app.post_map_anchors from 20260830000900_rls_and_grants.sql,
--   but that grant only covered tables that existed when it ran, and there
--   is no default-privilege rule extending it to a table created later —
--   confirmed live: no pg_default_acl entry for future app-schema tables to
--   service_role).
-- Round 3 fixes a transactional live-engine blocker and completes Community
--   wall routing for comment/vote signals: both branches now hydrate the
--   parent post's full scope tuple (scope_type, college_id, jurusan_id,
--   building_id) together with moderation_status. The prior vote branch
--   left scope_type null and therefore violated realtime_events.scope_type's
--   NOT NULL constraint; the prior comment branch carried only scope_type,
--   which was insufficient to refresh College/Jurusan card comment counts.
--
-- Naming convention: this repo checkout has no supabase/migrations/ history
-- of its own (confirmed again this round — it only exists in the sibling
-- EchoWall-Feature-Foundation checkout, not in this frozen production
-- clone), so this file continues to use the standard Supabase CLI timestamp
-- convention. 20260902120000 sorts correctly after the real, live-applied
-- 20260901050515_phase5_question_management_capability.sql — the 13 real
-- migrations are NOT duplicated into this repo by this migration; only this
-- one new file is added here.
--
-- PURPOSE
-- Give browsers viewing a Community wall (All KM / College / Jurusan) a
-- safe "something changed" signal so they can refetch without a manual
-- reload, WITHOUT ever replicating app.posts / app.comments / app.post_votes
-- raw rows to Realtime subscribers (those rows carry owner_user_id/user_id),
-- and WITHOUT ever signaling the existence, scope, or timing of a row that
-- is not currently publicly visible (pending/flagged/hidden/rejected) — see
-- the moderation-status gating in private.emit_realtime_event() below. Even
-- metadata about a non-public row (its post_id, scope, or the fact that it
-- changed at a given timestamp) is itself a privacy leak if broadcast to
-- every anonymous browser, independent of whether identity/content fields
-- are present.
--
-- VERIFIED SCHEMA FACTS USED BELOW (read directly from the real DDL, not
-- inferred):
--   app.posts: id uuid, owner_user_id uuid, post_type app.post_type,
--     scope_type app.scope_type, college_id smallint, jurusan_id smallint,
--     building_id text, question_status app.question_status,
--     moderation_status app.moderation_status not null default 'published'
--     (20260830000300_posts_and_map_anchors.sql)
--   app.comments: id uuid, post_id uuid, owner_user_id uuid,
--     parent_comment_id uuid, moderation_status app.moderation_status not
--     null default 'published' (20260830000400_comments_and_votes.sql)
--   app.post_votes: post_id uuid, user_id uuid, value smallint in (-1,1);
--     value 0 is represented by row DELETE, never an UPDATE to 0
--     (20260830000400_comments_and_votes.sql; behavior independently
--     confirmed by reading api.cast_vote's body in
--     20260830000800_narrow_api_functions.sql: p_value=0 -> DELETE,
--     otherwise INSERT ... ON CONFLICT ... DO UPDATE. api.cast_vote never
--     writes app.posts — vote score is computed at read time in
--     api.posts_public as seed_base_score + sum(post_votes.value), so
--     "vote realtime source" is app.post_votes only, not app.posts.)
--   app.moderation_status enum: ('pending','published','flagged','hidden',
--     'rejected') — 5 values, not the 3-4 named in casual descriptions;
--     every value other than 'published' is treated identically below (not
--     publicly visible), so this migration does not need to special-case
--     'flagged' separately from 'pending'/'hidden'/'rejected'.
--     (20260830000100_foundation_schemas_and_types.sql)
--   api.comments_public additionally requires p.scope_type <> 'building' —
--     Building Wall comments are not exposed publicly at all today
--     (20260830000700_api_views.sql) — mirrored in the comment-visibility
--     gate below for consistency with what api.comments_public actually
--     shows.
--   app schema conventions followed here: trigger functions live in the
--   `private` schema (not `app`), use `security invoker` (not `definer`)
--   because they only ever fire inside an already-privileged execution
--   context (a SECURITY DEFINER api.* RPC, or service_role — anon/
--   authenticated have zero direct DML grants on any app.* table), and use
--   `set search_path = ''` with fully-qualified references throughout —
--   this matches private.touch_updated_at / private.validate_map_anchor /
--   private.validate_comment_thread exactly
--   (20260830000600_private_helpers_and_triggers.sql). A global
--   `alter default privileges revoke execute on functions from public,
--   anon, authenticated` was already applied in
--   20260830185734_phase3c_privilege_and_identity_hardening.sql, so any new
--   function (including this migration's) starts EXECUTE-revoked by
--   default; the explicit revoke below is kept anyway, matching this
--   project's own belt-and-suspenders style (e.g. line ~174 of that same
--   migration explicitly revokes private.require_authenticated_user even
--   though the schema-wide default already prevented the grant).

begin;

-- 1. Signal table -----------------------------------------------------------
-- Deliberately narrow: only enough for a browser to decide "is this
-- relevant to what I'm looking at" and "should I refetch". No identity
-- columns, no post/comment content, ever — and (see the trigger function)
-- no row for anything that is not currently publicly visible, ever.
create table if not exists app.realtime_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'post_created',
    'post_updated',
    'post_deleted_or_hidden',
    'comment_created',
    'comment_updated',
    'vote_changed',
    'question_status_changed'
  )),
  -- 'building' is accepted even though no frontend consumer subscribes to
  -- it yet (Building Wall is still local-only per BACKEND V2.1) — the
  -- generic per-row trigger on app.posts already emits correctly-scoped,
  -- correctly-gated signals for building-scope rows today, so a future
  -- stage can start consuming them with zero migration changes.
  scope_type text not null check (scope_type in ('all_km', 'college', 'jurusan', 'building')),
  -- P0 FIX 1: college_id/jurusan_id match app.posts' real smallint type;
  -- building_id is TEXT, matching app.posts.building_id / app.post_map_anchors.building_id
  -- exactly (e.g. 'pustaka') — it is a human-assigned string key in this
  -- schema, never an integer, and must never be cast toward one.
  college_id smallint null,
  jurusan_id smallint null,
  building_id text null,
  post_id uuid null,
  created_at timestamptz not null default now()
);

comment on column app.realtime_events.building_id is
  'Text building key (e.g. pustaka), matching app.posts.building_id and app.post_map_anchors.building_id exactly. Never cast to a numeric type.';
-- comment on table app.realtime_events is set once, below, after the grants
-- section — its text documents the final privilege shape, so it is stated
-- after that shape actually exists rather than duplicated here.

create index if not exists realtime_events_created_at_idx on app.realtime_events (created_at);
create index if not exists realtime_events_scope_idx on app.realtime_events (scope_type, college_id, jurusan_id, building_id);

-- P0 FIX (privileges) — RLS + FORCE, matching every other app-schema table
-- in this project (app.posts/app.comments/app.post_votes/app.post_map_anchors
-- all have both ENABLE and FORCE set: 20260830000900_rls_and_grants.sql).
-- FORCE is safe here specifically because — exactly like those tables —
-- the only role that ever writes this table (the owner of the SECURITY
-- INVOKER trigger's execution context, inherited from whichever SECURITY
-- DEFINER api.* RPC caused the write, or service_role) already bypasses RLS
-- independent of FORCE (that is proven by production today: app.posts has
-- FORCE RLS enabled and 568 real rows exist, written entirely through
-- SECURITY DEFINER RPCs). FORCE here does not block that write; it only
-- ensures nothing WITHOUT that bypass can ever write this table, including
-- future code that might otherwise assume owner-context grants an
-- exception.
alter table app.realtime_events enable row level security;
alter table app.realtime_events force row level security;

-- Public read: this table is safe by construction (strictly less
-- information than api.posts_public already exposes, and only ever
-- contains rows about currently-public content — see the trigger function).
-- There is no privacy reason to gate SELECT beyond "anyone".
drop policy if exists realtime_events_public_read on app.realtime_events;
create policy realtime_events_public_read
  on app.realtime_events
  for select
  to anon, authenticated
  using (true);

comment on policy realtime_events_public_read on app.realtime_events is
  'Every row in this table is already public-safe by construction (see private.emit_realtime_event()), so unconditional SELECT is intentional, not a gap.';

-- No client-facing write path, enforced twice over: (a) no INSERT/UPDATE/
-- DELETE policy exists for anon/authenticated at all (FORCE RLS + zero
-- matching policies = always denied for any role that does not bypass
-- RLS), and (b) the grants below don't even give those roles the
-- table-level privilege to attempt it. Rows are written only by the
-- trigger function, never directly by API callers.
revoke insert, update, delete on app.realtime_events from anon, authenticated;
grant select on app.realtime_events to anon, authenticated;

-- P0 FIX (this round) — service_role table + sequence privileges.
--
-- RLS AUTHORIZATION IS NOT THE SAME THING AS SQL OBJECT PRIVILEGE, and the
-- prior round's reasoning conflated them. BYPASSRLS (confirmed live: both
-- `service_role` and `postgres` have it) only means row-level security
-- POLICIES are skipped for that role — it says nothing about whether the
-- role has been GRANTed SELECT/INSERT/UPDATE/DELETE on a given table at
-- all. Those are two separate, independently-enforced gates in Postgres:
-- privilege check first (GRANT/REVOKE), then — only if that passes, and
-- only if the role is not exempt — row-level policy check. A role can have
-- BYPASSRLS and still get a flat "permission denied for table X" if it was
-- never granted table-level access in the first place.
--
-- Live-confirmed fact this round: app.posts/app.comments/app.post_votes/
-- app.post_map_anchors already carry an explicit
-- `grant select, insert, update, delete ... to service_role`
-- (from 20260830000900_rls_and_grants.sql:106, `grant select, insert,
-- update, delete on all tables in schema app to service_role;` — a
-- snapshot statement that only covered the app-schema tables that existed
-- at the time it ran). app.realtime_events did not exist yet, so it never
-- received that grant, and this project has no default-privilege rule that
-- would auto-extend it to a table created later (confirmed live: no
-- pg_default_acl entry grants future app-schema tables to service_role).
-- Left unfixed, any trusted backend path that performs DML on
-- app.posts/app.comments/app.post_votes directly as service_role (not
-- through a SECURITY DEFINER api.* RPC — e.g. a future Admin backend tool
-- using the service-role key) would fire this migration's SECURITY INVOKER
-- trigger running AS service_role, which would then hit "permission denied
-- for table realtime_events" trying to INSERT the signal row — table
-- privilege, not RLS, is what would reject it.
--
-- Fix: explicit, scoped grants — service_role only, matching the exact
-- privilege list already used for the other four app-schema tables (not
-- a blanket "grant all privileges", which this project's own convention
-- does not use for tables: rls_and_grants.sql:106 lists select/insert/
-- update/delete explicitly, and :107 lists usage/select for sequences —
-- neither is "all privileges", so this migration matches that exact
-- explicit style rather than introducing a broader shorthand).
grant select, insert, update, delete on app.realtime_events to service_role;

-- Identity-column sequence privilege: a GENERATED ALWAYS AS IDENTITY column
-- is backed by an implicit sequence (named app.realtime_events_id_seq,
-- confirmed live), and a non-owner role needs USAGE on that sequence to
-- successfully insert a row relying on its default nextval() — this is
-- again a plain object-privilege requirement, unaffected by BYPASSRLS.
-- Matches the usage+select (not usage+select+update) scope already used
-- for every other app-schema sequence (rls_and_grants.sql:107).
grant usage, select on app.realtime_events_id_seq to service_role;

comment on table app.realtime_events is
  'Sanitized change-signal stream for Community/Building/Map realtime (BACKEND V2.2). Never insert owner_user_id, user_id, email, or post/comment content into this table, and never insert a row for content that is not currently publicly visible (see private.emit_realtime_event()). Final privilege shape: anon/authenticated = SELECT only; service_role = SELECT/INSERT/UPDATE/DELETE (trusted backend only, browsers never hold the service-role key); no other role has any privilege on this table.';

-- 2. Trigger function ---------------------------------------------------
-- Lives in `private`, not `app`, and uses `security invoker` — matching
-- private.touch_updated_at / private.validate_map_anchor /
-- private.validate_comment_thread exactly (20260830000600). This is safe
-- (not merely convention) because app.posts/app.comments/app.post_votes
-- have zero direct DML grants for anon/authenticated (rls_and_grants.sql:
-- "revoke all on all tables in schema app from public, anon, authenticated"
-- plus only service_role gets insert/update/delete) — so this trigger can
-- only ever fire inside a context that is already privileged (a SECURITY
-- DEFINER api.* RPC's execution, or service_role), the same precondition
-- validate_map_anchor/validate_comment_thread already rely on.
--
-- P0 FIX 2 — every branch below emits a signal ONLY for a row that is
-- currently publicly visible, or that is transitioning across the public/
-- not-public boundary in a way a public browser needs to react to (row
-- appears -> post_created/comment_created; row disappears ->
-- post_deleted_or_hidden/comment_updated). A transition entirely within the
-- non-public states (pending<->flagged<->hidden<->rejected, in any
-- direction, never touching 'published') emits nothing, because no public
-- browser could have known that row existed in the first place — signaling
-- its post_id/scope/timestamp at that point would itself be a metadata leak
-- to anonymous clients who never had legitimate visibility into it.
create or replace function private.emit_realtime_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_type text;
  v_scope_type text;
  v_college_id smallint;
  v_jurusan_id smallint;
  v_building_id text;
  v_post_id uuid;
  v_lookup_post_id uuid;
  v_post_moderation_status app.moderation_status;
  v_post_scope_type app.scope_type;
  v_old_public boolean;
  v_new_public boolean;
begin
  if tg_table_name = 'posts' then
    if tg_op = 'DELETE' then
      if old.moderation_status <> 'published' then
        return null; -- was never publicly visible (or already hidden) — no signal
      end if;
      v_scope_type  := old.scope_type::text;
      v_college_id  := old.college_id;
      v_jurusan_id  := old.jurusan_id;
      v_building_id := old.building_id;
      v_post_id     := old.id;
      v_event_type  := 'post_deleted_or_hidden';

    elsif tg_op = 'INSERT' then
      if new.moderation_status <> 'published' then
        return null; -- created in a non-public state (e.g. pending) — no signal yet
      end if;
      v_scope_type  := new.scope_type::text;
      v_college_id  := new.college_id;
      v_jurusan_id  := new.jurusan_id;
      v_building_id := new.building_id;
      v_post_id     := new.id;
      v_event_type  := 'post_created';

    else -- UPDATE
      v_old_public := (old.moderation_status = 'published');
      v_new_public := (new.moderation_status = 'published');
      if not v_old_public and not v_new_public then
        return null; -- moved between non-public states (e.g. pending -> hidden) — never visible, no signal
      end if;
      v_scope_type  := new.scope_type::text;
      v_college_id  := new.college_id;
      v_jurusan_id  := new.jurusan_id;
      v_building_id := new.building_id;
      v_post_id     := new.id;
      if v_old_public and not v_new_public then
        v_event_type := 'post_deleted_or_hidden'; -- published -> pending/flagged/hidden/rejected
      elsif not v_old_public and v_new_public then
        v_event_type := 'post_created'; -- pending/flagged/hidden/rejected -> published (newly, or re-, visible)
      elsif new.question_status is distinct from old.question_status then
        v_event_type := 'question_status_changed';
      else
        -- Content edits, or a cast_vote-driven aggregate score landing on
        -- app.posts itself if it ever does (see header note — currently it
        -- does not; app.post_votes below covers the real vote path).
        v_event_type := 'post_updated';
      end if;
    end if;

  elsif tg_table_name = 'comments' then
    v_lookup_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;
    select
        p.scope_type,
        p.college_id,
        p.jurusan_id,
        p.building_id,
        p.moderation_status
      into
        v_post_scope_type,
        v_college_id,
        v_jurusan_id,
        v_building_id,
        v_post_moderation_status
      from app.posts as p
      where p.id = v_lookup_post_id;
    if not found then
      return null; -- parent post not found (race with a hard delete) — nothing safe to emit
    end if;
    v_post_id := v_lookup_post_id;

    if tg_op = 'DELETE' then
      v_old_public := (old.moderation_status = 'published' and v_post_moderation_status = 'published' and v_post_scope_type <> 'building');
      if not v_old_public then return null; end if;
      v_scope_type  := v_post_scope_type::text;
      v_event_type  := 'comment_updated'; -- minimal event set: a removed comment is expressed the same way as an edited one — client refetches the thread either way
    elsif tg_op = 'INSERT' then
      if not (new.moderation_status = 'published' and v_post_moderation_status = 'published' and v_post_scope_type <> 'building') then
        return null;
      end if;
      v_scope_type := v_post_scope_type::text;
      v_event_type := 'comment_created';
    else -- UPDATE
      v_old_public := (old.moderation_status = 'published' and v_post_moderation_status = 'published' and v_post_scope_type <> 'building');
      v_new_public := (new.moderation_status = 'published' and v_post_moderation_status = 'published' and v_post_scope_type <> 'building');
      if not v_old_public and not v_new_public then return null; end if;
      v_scope_type := v_post_scope_type::text;
      v_event_type := 'comment_updated'; -- covers a public edit and a public->hidden removal alike
    end if;
    -- The parent scope tuple is included because Community cards display a
    -- comment/reply count even when no thread modal is open. It lets the
    -- current All KM/College/Jurusan wall refetch without waking unrelated
    -- walls; post_id simultaneously routes the same signal to an open thread.

  elsif tg_table_name = 'post_votes' then
    v_lookup_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;
    select
        p.scope_type,
        p.college_id,
        p.jurusan_id,
        p.building_id,
        p.moderation_status
      into
        v_post_scope_type,
        v_college_id,
        v_jurusan_id,
        v_building_id,
        v_post_moderation_status
      from app.posts as p
      where p.id = v_lookup_post_id;
    if not found then
      return null; -- parent was deleted; there is no safe scope to route
    end if;
    if v_post_moderation_status <> 'published' then
      return null; -- vote on a post that is not publicly visible
    end if;
    v_scope_type := v_post_scope_type::text;
    v_post_id := v_lookup_post_id;
    v_event_type := 'vote_changed';
    -- Full parent scope refreshes the current wall card score while post_id
    -- simultaneously refreshes an open modal for the same post.

  else
    return null;
  end if;

  insert into app.realtime_events (event_type, scope_type, college_id, jurusan_id, building_id, post_id)
  values (v_event_type, v_scope_type, v_college_id, v_jurusan_id, v_building_id, v_post_id);

  -- Return value is ignored for AFTER row-level triggers (every trigger
  -- this function backs is AFTER) — returning null unconditionally avoids
  -- ever touching a possibly-unassigned NEW/OLD in the return statement.
  return null;
end;
$$;

comment on function private.emit_realtime_event() is
  'AFTER-trigger signal emitter for app.posts/app.comments/app.post_votes. Only ever inserts a row into app.realtime_events for content that is (or was, at the moment of a public-to-non-public transition) publicly visible per moderation_status; never for pending/flagged/hidden/rejected content that a public browser never had legitimate visibility into.';

-- Explicit revoke, matching the private.* function pattern in
-- 20260830000600_private_helpers_and_triggers.sql line ~140-145 and
-- 20260830185734's private.require_active_user() etc. The project-wide
-- `alter default privileges revoke execute on functions from public, anon,
-- authenticated` (20260830185734_phase3c_privilege_and_identity_hardening.sql)
-- already means this function starts EXECUTE-revoked by default for any
-- role sharing that migration's creator — this statement is kept anyway so
-- the guarantee does not depend on which role happens to apply this
-- migration.
revoke execute on function private.emit_realtime_event() from public, anon, authenticated;

-- 3. Triggers ---------------------------------------------------------------
drop trigger if exists trg_realtime_posts on app.posts;
create trigger trg_realtime_posts
  after insert or update or delete on app.posts
  for each row execute function private.emit_realtime_event();

drop trigger if exists trg_realtime_comments on app.comments;
create trigger trg_realtime_comments
  after insert or update or delete on app.comments
  for each row execute function private.emit_realtime_event();

drop trigger if exists trg_realtime_post_votes on app.post_votes;
create trigger trg_realtime_post_votes
  after insert or update or delete on app.post_votes
  for each row execute function private.emit_realtime_event();

-- 4. Realtime publication ----------------------------------------------------
-- Only the signal table is ever added here. app.posts / app.comments /
-- app.post_votes are intentionally NEVER added to supabase_realtime by this
-- migration — that is the entire point of this design.
alter publication supabase_realtime add table app.realtime_events;

commit;

-- ROLLBACK (manual — run only if this migration needs to be reverted after
-- it has actually been applied; safe to run any time, fully reversible):
--
--   begin;
--   alter publication supabase_realtime drop table app.realtime_events;
--   drop trigger if exists trg_realtime_post_votes on app.post_votes;
--   drop trigger if exists trg_realtime_comments on app.comments;
--   drop trigger if exists trg_realtime_posts on app.posts;
--   drop function if exists private.emit_realtime_event();
--   drop table if exists app.realtime_events;
--   commit;
--
-- RETENTION — P1 TODO, deliberately deferred, not implemented here.
-- app.realtime_events is append-only and only useful for the few seconds
-- after a write. This session checked the full migration history
-- (13 files under EchoWall-Feature-Foundation/supabase/migrations/ and
-- supabase/tests/) for any existing pg_cron / scheduled-cleanup mechanism —
-- none exists; the only extension referenced anywhere is pgtap (test-only,
-- under the `extensions` schema, unrelated to cleanup). Per this round's
-- explicit instruction not to enable a new extension or add server/Edge
-- Function complexity to reach V2.2 validation, retention is left as a P1
-- follow-up: either enable pg_cron later (Supabase Free tier supports it as
-- an installable extension, so this is not a paid-tier blocker) and run
--   delete from app.realtime_events where created_at < now() - interval '1 day';
-- on a schedule, or do it manually/ad hoc until write volume makes that
-- necessary. Not implemented in this migration; does not block V2.2
-- realtime validation.
