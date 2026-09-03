-- BACKEND V2.3b — Building Comments + Replies
--
-- STATUS: DRAFT / GENERATED ON backend-v2 BRANCH. NOT APPLIED TO PRODUCTION.
-- Target project: iavndheqyzphcppfisil (ap-southeast-1, FREE plan).
-- Do NOT run this against production Supabase without explicit authorization
-- from the project owner.
--
-- REVISION NOTE (this round) — a trusted production Postgres engine review
-- of the FIRST draft of this file found it could not be applied as written:
-- that draft used `drop view if exists api.comments_public; create view
-- ...`, which fails with 2BP01 ("cannot drop view api.comments_public
-- because other objects depend on it") — api.create_comment and
-- api.create_reply both `returns setof api.comments_public`, making them
-- dependents of the view's row type; `drop ... cascade` would have silently
-- dropped both functions. The engine review also found that a plain
-- `create or replace view api.comments_public` (no drop) fails separately
-- with 42501 ("must be owner of view comments_public"), because the view is
-- owned by echowall_api_viewer, not the migration's executing role
-- (postgres), and echowall_api_viewer has no CREATE privilege on schema api.
-- Section 3 below now uses the engine-verified owner-preserving fix: a
-- temporary, fully self-revoking privilege elevation (grant create on
-- schema api + grant echowall_api_viewer to current_user with set true +
-- set local role) scoped to the single `create or replace view` statement,
-- reproducing the exact pattern 20260830000700_api_views.sql itself already
-- used to create every api.* view originally. No other object in this
-- migration (items 1, 2, 4, 5 below) was affected by this finding or
-- changed in this revision.
--
-- PURPOSE
-- Remove the Building-specific exclusion from the EXISTING canonical comment
-- model (app.comments / api.create_comment / api.create_reply /
-- api.comments_public) so a Building Wall post (app.posts.scope_type =
-- 'building', covering both a plain Building Wall post created via
-- api.create_post and a Map Post Directly created via api.create_map_post —
-- both share the same scope_type) can receive top-level comments and
-- one-level-deep replies, exactly like a Community post already can. This
-- migration creates NO new table, NO new comment/reply model, and NO new
-- Realtime channel/table — it only widens 5 existing objects that today
-- carry an explicit "not for Building" exclusion, confirmed live-current by
-- reading every migration that ever touched them (see the per-object notes
-- below). Every other invariant of the existing comment model (one-level
-- reply nesting, published-parent-post requirement, published-parent-comment
-- requirement, same-post parent_comment_id requirement, active-user
-- requirement, content length/control-character validation, SECURITY
-- DEFINER/INVOKER attributes, search_path, grants) is preserved unchanged.
--
-- AUDIT METHOD — for each object below, this migration reads the CURRENT
-- live-authoritative definition (the last migration, by filename timestamp,
-- that ever defined it — confirmed by grepping every one of the 13 applied
-- migrations under EchoWall-Feature-Foundation/supabase/migrations/ for the
-- object name, not assumed from memory) and reproduces it verbatim except
-- for the single Building-exclusion change called out per object.
--
-- 1) private.validate_comment_thread() — live-current definition is in
--    20260830185742_phase3c_content_and_moderation_hardening.sql (supersedes
--    the original in 20260830000600_private_helpers_and_triggers.sql via
--    `create or replace function`; the trigger binding itself,
--    `comments_validate_thread` on app.comments, created in
--    20260830000600, was never redefined and needs no change here — a
--    `create or replace function` transparently updates its behavior).
--    Removes only the `if v_scope = 'building' then raise ... end if;`
--    block. Preserves: published-parent-post check, published-parent-
--    comment check, same-post parent lookup, one-level-deep reply
--    enforcement, security invoker, set search_path = ''.
--
-- 2) api.create_reply(uuid, text, app.display_author_mode) — live-current
--    definition is in 20260830185742 (only definition site; never
--    redefined again). Removes only the `and p.scope_type <> 'building'`
--    clause from its own independent parent-comment lookup query (this is a
--    SEPARATE Building exclusion from the trigger — api.create_reply reads
--    app.comments/app.posts directly before ever reaching the trigger's
--    INSERT). Preserves: content length/control-character validation,
--    active-user requirement, published-parent-comment + published-parent-
--    post requirement, named-author display-name requirement, return shape,
--    security definer, set search_path = ''.
--    (api.create_comment(uuid, text, app.display_author_mode), also defined
--    in 20260830185742, is confirmed to have NO Building-specific check at
--    all — it relies entirely on the trigger — so it is intentionally left
--    unmodified by this migration.)
--
-- 3) api.comments_public (view) — live-current definition is in
--    20260830000700_api_views.sql (only definition site in all 13
--    migrations; never redefined). Removes only the
--    `and p.scope_type <> 'building'` predicate. Preserves every projected
--    column exactly (id, post_id, parent_comment_id, depth, content,
--    display_author_mode, author_label, created_at, updated_at) — no
--    owner_user_id, no email, no auth identifier is added. The only
--    semantic change is that a published comment/reply whose parent post is
--    a published Building post becomes eligible, matching Community's
--    existing behavior.
--
-- 4) comments_api_public_read (RLS policy on app.comments) — live-current
--    definition is in 20260830000900_rls_and_grants.sql (only definition
--    site; never redefined). This is the RLS policy actually enforced when
--    api.comments_public is queried, because that view is not
--    security_invoker — it runs (for RLS purposes) as its owner role
--    echowall_api_viewer, which is exactly the role this policy targets. The
--    view's own WHERE clause (item 3) and this policy's USING clause both
--    independently exclude Building today; both must change together or the
--    view fix alone would still return zero Building rows. Removes only the
--    `and p.scope_type <> 'building'` clause. Preserves the
--    moderation_status = 'published' requirement and the published-parent-
--    post requirement. Uses drop-then-recreate (matching this project's own
--    existing style for policy changes — see
--    supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql's
--    `drop policy if exists realtime_events_public_read ... create policy
--    ...` pattern) rather than ALTER POLICY, so the full USING clause stays
--    visible in one place instead of split across an ALTER.
--
-- 5) private.emit_realtime_event() — live-current definition is the
--    ALREADY-APPLIED migration
--    supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql
--    (in THIS repo; must never be edited in place). Its `comments` branch
--    gates all three (INSERT/UPDATE/DELETE) visibility checks on
--    `v_post_scope_type <> 'building'`, mirroring api.comments_public's
--    pre-V2.3b behavior "for consistency with what api.comments_public
--    actually shows" (that migration's own header comment, line ~83-87).
--    Now that api.comments_public shows Building comments (item 3), this
--    function must be updated via `create or replace function` in THIS new
--    migration so a Building comment/reply insert/update/delete also emits
--    an `app.realtime_events` row — otherwise Building comments would work
--    but never notify other open Building Wall viewers. Removes only the
--    `and v_post_scope_type <> 'building'` clause from the three comments-
--    branch conditions. Preserves: the entire posts branch (unchanged), the
--    entire post_votes branch (unchanged), the parent-post lookup, the
--    'comment_created'/'comment_updated' event-type logic, the moderation-
--    status gating, security invoker, set search_path = ''. No new event
--    type is introduced — Building comments reuse 'comment_created' /
--    'comment_updated' exactly like Community comments already do. No table
--    other than app.realtime_events is written; no new table is added to
--    the supabase_realtime publication.
--
-- WHAT THIS MIGRATION DOES NOT DO (explicitly out of scope, per instruction)
-- - Does not create app.building_comments / app.building_replies or any new
--   comment/reply table.
-- - Does not create a new Realtime channel, table, or publication entry.
-- - Does not change reply nesting depth (still exactly one level).
-- - Does not add moderator/delete UI or new moderation actions.
-- - Does not touch app.posts, app.post_votes, api.posts_public,
--   api.post_map_anchors_public, api.create_post, api.create_map_post,
--   api.cast_vote, or any Study/Admin/User-management object.
-- - Does not modify supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql
--   in place (that file is redefined logically via `create or replace
--   function`, never edited).

begin;

-- 1. Comment-thread validation trigger function -----------------------------
-- Verbatim reproduction of the live-current body from
-- 20260830185742_phase3c_content_and_moderation_hardening.sql, minus the
-- Building-exclusion block only.
create or replace function private.validate_comment_thread()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_scope app.scope_type;
  v_post_moderation app.moderation_status;
  v_parent_parent uuid;
  v_parent_moderation app.moderation_status;
begin
  select p.scope_type, p.moderation_status
    into v_scope, v_post_moderation
  from app.posts as p
  where p.id = new.post_id;

  if not found or v_post_moderation <> 'published' then
    raise exception using
      errcode = '42501',
      message = 'Post is not available for interaction.';
  end if;

  -- V2.3b: Building Wall posts (scope_type = 'building') now support
  -- comments exactly like Community posts. The prior unconditional
  -- rejection here has been removed; every other check in this function is
  -- unchanged.

  if new.parent_comment_id is not null then
    select c.parent_comment_id, c.moderation_status
      into v_parent_parent, v_parent_moderation
    from app.comments as c
    where c.id = new.parent_comment_id
      and c.post_id = new.post_id;

    if not found or v_parent_moderation <> 'published' then
      raise exception using
        errcode = '42501',
        message = 'Comment is not available for interaction.';
    end if;

    if v_parent_parent is not null then
      raise exception using
        errcode = '23514',
        message = 'Replies can only be one level deep.';
    end if;
  end if;

  return new;
end;
$$;

comment on function private.validate_comment_thread() is
  'Rejects new interaction unless the parent post and reply parent are currently published; existing threads are preserved when moderation later hides a post. V2.3b: Building Wall posts are permitted, matching Community.';

revoke execute on function private.validate_comment_thread() from public, anon, authenticated;
grant execute on function private.validate_comment_thread() to service_role;

-- 2. api.create_reply --------------------------------------------------------
-- Verbatim reproduction of the live-current body from
-- 20260830185742_phase3c_content_and_moderation_hardening.sql, minus the
-- `and p.scope_type <> 'building'` clause in the parent-comment lookup only.
-- api.create_comment(uuid, text, app.display_author_mode) is intentionally
-- NOT redefined here — its live-current body has no Building-specific
-- check, so no change is needed for top-level comments.
create or replace function api.create_reply(
  p_parent_comment_id uuid,
  p_content text,
  p_display_author_mode app.display_author_mode default 'anonymous'
)
returns setof api.comments_public
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.require_active_user();
  v_post uuid;
  v_label text;
  v_id uuid;
begin
  if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_content, ''))) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'Reply content must be 1 to 500 characters.';
  end if;

  if private.has_disallowed_control_characters(p_content, true) then
    raise exception using errcode = '22023', message = 'Reply content contains unsupported control characters.';
  end if;

  if p_display_author_mode is null then
    raise exception using errcode = '22023', message = 'Invalid author presentation mode.';
  end if;

  select c.post_id into v_post
  from app.comments as c
  join app.posts as p on p.id = c.post_id
  where c.id = p_parent_comment_id
    and c.moderation_status = 'published'
    and p.moderation_status = 'published';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Comment is not available for interaction.';
  end if;

  if p_display_author_mode = 'named' then
    select p.display_name into v_label
    from app.profiles as p
    where p.user_id = v_user and p.status = 'active';

    if v_label is null then
      raise exception using errcode = '22023', message = 'A display name is required for named replies.';
    end if;
  end if;

  insert into app.comments (
    post_id, owner_user_id, parent_comment_id, content,
    display_author_mode, display_author_label
  ) values (
    v_post, v_user, p_parent_comment_id, pg_catalog.btrim(p_content),
    p_display_author_mode, v_label
  ) returning id into v_id;

  return query select c.* from api.comments_public as c where c.id = v_id;
end;
$$;

revoke execute on function api.create_reply(uuid, text, app.display_author_mode) from public, anon;
grant execute on function api.create_reply(uuid, text, app.display_author_mode) to authenticated, service_role;

-- 3. api.comments_public view -------------------------------------------------
-- ENGINE-VERIFIED FIX (this round): the original draft used
-- `drop view if exists api.comments_public; create view ...`. A trusted
-- production Postgres engine review rejected this with 2BP01 ("cannot drop
-- view api.comments_public because other objects depend on it") —
-- api.create_comment(uuid, text, app.display_author_mode) and
-- api.create_reply(uuid, text, app.display_author_mode) both declare
-- `returns setof api.comments_public`, making them dependents of the view's
-- composite row type. `drop ... cascade` would have silently dropped both
-- functions, which is unacceptable and is never used anywhere in this
-- migration.
--
-- `create or replace view` avoids the dependency break entirely (the row
-- type is preserved across a REPLACE as long as the column list/order/types
-- are unchanged, which they are here — this migration adds no column,
-- removes no column, and reorders nothing). But a plain
-- `create or replace view api.comments_public`, run as this migration's
-- executing role (postgres), still fails with 42501 ("must be owner of view
-- comments_public"): the view's live-current owner is echowall_api_viewer,
-- not postgres (20260830000700_api_views.sql's own header comment: "The
-- views deliberately use a dedicated non-login view owner rather than
-- security_invoker"), and echowall_api_viewer's live-current CREATE
-- privilege on schema api is false (only USAGE is granted).
--
-- Fix: temporarily reproduce the exact privilege-elevation pattern
-- 20260830000700_api_views.sql itself already uses to CREATE every api.*
-- view in the first place (grant create on schema api to
-- echowall_api_viewer; grant echowall_api_viewer to current_user; run the
-- DDL; revoke both) — engine-verified inside a trusted BEGIN/ROLLBACK
-- transaction against production Postgres 17.6 this round, confirmed to
-- leave echowall_api_viewer's CREATE-on-schema-api privilege and
-- postgres's SET-option membership in echowall_api_viewer both back at
-- their pre-migration `false` state after the elevation is revoked. `set
-- local role` (not a bare `set role`) is used so the role change is scoped
-- to this transaction and cannot leak into any later statement even if the
-- explicit `reset role` below were somehow skipped.
grant create on schema api to echowall_api_viewer;
grant echowall_api_viewer to current_user with set true;
set local role echowall_api_viewer;

create or replace view api.comments_public
with (security_barrier = true)
as
select
  c.id,
  c.post_id,
  c.parent_comment_id,
  case when c.parent_comment_id is null then 0 else 1 end as depth,
  c.content,
  c.display_author_mode,
  case when c.display_author_mode = 'anonymous' then 'Anonymous' else c.display_author_label end as author_label,
  c.created_at,
  c.updated_at
from app.comments as c
join app.posts as p on p.id = c.post_id
where c.moderation_status = 'published'
  and p.moderation_status = 'published';

comment on view api.comments_public is 'Sanitized comment projection (Community and Building Wall); never exposes owner_user_id.';
-- Run while still SET LOCAL ROLE echowall_api_viewer (the view's owner), so
-- this GRANT never depends on postgres's own privileges on the view.
-- CREATE OR REPLACE VIEW already preserves existing ACLs when the column
-- list is unchanged (it is, here), so this is redundant-but-explicit,
-- matching this project's own belt-and-suspenders grant style rather than
-- silently relying on that preservation behavior.
grant select on api.comments_public to anon, authenticated;
-- No `alter view ... owner to echowall_api_viewer` is needed here (unlike
-- the original draft): the view is being replaced BY its own existing
-- owner via the role switch above, so ownership never changes hands.

reset role;
revoke set option for echowall_api_viewer from current_user;
revoke create on schema api from echowall_api_viewer;

-- 4. comments_api_public_read RLS policy -------------------------------------
-- Verbatim reproduction of the live-current policy from
-- 20260830000900_rls_and_grants.sql, minus the
-- `and p.scope_type <> 'building'` clause only. Drop-then-recreate matches
-- this project's own existing style for policy changes (see
-- 20260902162437_20260902120000_community_realtime_signal.sql's
-- realtime_events_public_read policy).
drop policy if exists comments_api_public_read on app.comments;
create policy comments_api_public_read on app.comments
  for select to echowall_api_viewer
  using (
    moderation_status = 'published'
    and exists (
      select 1 from app.posts as p
      where p.id = comments.post_id
        and p.moderation_status = 'published'
    )
  );

-- 5. Realtime signal trigger function ----------------------------------------
-- Verbatim reproduction of the live-current (already-applied) body from
-- supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql,
-- minus the `and v_post_scope_type <> 'building'` clause in the three
-- comments-branch conditions only. The posts branch and post_votes branch
-- are byte-identical to the applied migration.
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

    -- V2.3b: Building Wall comments/replies now emit realtime signals
    -- exactly like Community comments, matching api.comments_public no
    -- longer excluding scope_type = 'building'. The prior
    -- `and v_post_scope_type <> 'building'` clause has been removed from
    -- all three branches below; every other condition is unchanged.
    if tg_op = 'DELETE' then
      v_old_public := (old.moderation_status = 'published' and v_post_moderation_status = 'published');
      if not v_old_public then return null; end if;
      v_scope_type  := v_post_scope_type::text;
      v_event_type  := 'comment_updated'; -- minimal event set: a removed comment is expressed the same way as an edited one — client refetches the thread either way
    elsif tg_op = 'INSERT' then
      if not (new.moderation_status = 'published' and v_post_moderation_status = 'published') then
        return null;
      end if;
      v_scope_type := v_post_scope_type::text;
      v_event_type := 'comment_created';
    else -- UPDATE
      v_old_public := (old.moderation_status = 'published' and v_post_moderation_status = 'published');
      v_new_public := (new.moderation_status = 'published' and v_post_moderation_status = 'published');
      if not v_old_public and not v_new_public then return null; end if;
      v_scope_type := v_post_scope_type::text;
      v_event_type := 'comment_updated'; -- covers a public edit and a public->hidden removal alike
    end if;
    -- The parent scope tuple is included because Community/Building cards
    -- display a comment/reply count even when no thread modal is open. It
    -- lets the current wall (Community scope tuple, or Building
    -- college+building_id) refetch without waking unrelated walls; post_id
    -- simultaneously routes the same signal to an open thread.

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

  else
    return null;
  end if;

  insert into app.realtime_events (event_type, scope_type, college_id, jurusan_id, building_id, post_id)
  values (v_event_type, v_scope_type, v_college_id, v_jurusan_id, v_building_id, v_post_id);

  return null;
end;
$$;

comment on function private.emit_realtime_event() is
  'AFTER-trigger signal emitter for app.posts/app.comments/app.post_votes. Only ever inserts a row into app.realtime_events for content that is (or was, at the moment of a public-to-non-public transition) publicly visible per moderation_status; never for pending/flagged/hidden/rejected content that a public browser never had legitimate visibility into. V2.3b: Building Wall comments/replies are included, matching Community.';

revoke execute on function private.emit_realtime_event() from public, anon, authenticated;

commit;

-- ROLLBACK (manual — run only if this migration needs to be reverted after
-- it has actually been applied; restores the exact pre-V2.3b definitions of
-- all 5 objects, byte-for-byte from their respective live-current source
-- migrations cited above):
--
--   begin;
--
--   create or replace function private.validate_comment_thread()
--   returns trigger language plpgsql security invoker set search_path = ''
--   as $$
--   declare
--     v_scope app.scope_type;
--     v_post_moderation app.moderation_status;
--     v_parent_parent uuid;
--     v_parent_moderation app.moderation_status;
--   begin
--     select p.scope_type, p.moderation_status into v_scope, v_post_moderation
--     from app.posts as p where p.id = new.post_id;
--     if not found or v_post_moderation <> 'published' then
--       raise exception using errcode = '42501', message = 'Post is not available for interaction.';
--     end if;
--     if v_scope = 'building' then
--       raise exception using errcode = '23514', message = 'Building Wall posts do not support comments.';
--     end if;
--     if new.parent_comment_id is not null then
--       select c.parent_comment_id, c.moderation_status into v_parent_parent, v_parent_moderation
--       from app.comments as c where c.id = new.parent_comment_id and c.post_id = new.post_id;
--       if not found or v_parent_moderation <> 'published' then
--         raise exception using errcode = '42501', message = 'Comment is not available for interaction.';
--       end if;
--       if v_parent_parent is not null then
--         raise exception using errcode = '23514', message = 'Replies can only be one level deep.';
--       end if;
--     end if;
--     return new;
--   end;
--   $$;
--
--   create or replace function api.create_reply(
--     p_parent_comment_id uuid, p_content text,
--     p_display_author_mode app.display_author_mode default 'anonymous'
--   ) returns setof api.comments_public language plpgsql security definer set search_path = ''
--   as $$
--   declare
--     v_user uuid := private.require_active_user();
--     v_post uuid; v_label text; v_id uuid;
--   begin
--     if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_content, ''))) not between 1 and 500 then
--       raise exception using errcode = '22023', message = 'Reply content must be 1 to 500 characters.';
--     end if;
--     if private.has_disallowed_control_characters(p_content, true) then
--       raise exception using errcode = '22023', message = 'Reply content contains unsupported control characters.';
--     end if;
--     if p_display_author_mode is null then
--       raise exception using errcode = '22023', message = 'Invalid author presentation mode.';
--     end if;
--     select c.post_id into v_post from app.comments as c join app.posts as p on p.id = c.post_id
--     where c.id = p_parent_comment_id and c.moderation_status = 'published'
--       and p.moderation_status = 'published' and p.scope_type <> 'building';
--     if not found then
--       raise exception using errcode = '42501', message = 'Comment is not available for interaction.';
--     end if;
--     if p_display_author_mode = 'named' then
--       select p.display_name into v_label from app.profiles as p where p.user_id = v_user and p.status = 'active';
--       if v_label is null then
--         raise exception using errcode = '22023', message = 'A display name is required for named replies.';
--       end if;
--     end if;
--     insert into app.comments (post_id, owner_user_id, parent_comment_id, content, display_author_mode, display_author_label)
--     values (v_post, v_user, p_parent_comment_id, pg_catalog.btrim(p_content), p_display_author_mode, v_label)
--     returning id into v_id;
--     return query select c.* from api.comments_public as c where c.id = v_id;
--   end;
--   $$;
--
--   -- Same engine-verified owner-preserving wrapper used in section 3 above
--   -- (NEVER drop this view — api.create_comment/api.create_reply both
--   -- `returns setof api.comments_public` and would be dropped by CASCADE).
--   grant create on schema api to echowall_api_viewer;
--   grant echowall_api_viewer to current_user with set true;
--   set local role echowall_api_viewer;
--
--   create or replace view api.comments_public with (security_barrier = true) as
--   select c.id, c.post_id, c.parent_comment_id,
--     case when c.parent_comment_id is null then 0 else 1 end as depth,
--     c.content, c.display_author_mode,
--     case when c.display_author_mode = 'anonymous' then 'Anonymous' else c.display_author_label end as author_label,
--     c.created_at, c.updated_at
--   from app.comments as c join app.posts as p on p.id = c.post_id
--   where c.moderation_status = 'published' and p.moderation_status = 'published' and p.scope_type <> 'building';
--   comment on view api.comments_public is 'Sanitized Community-only comment projection; never exposes owner_user_id.';
--   grant select on api.comments_public to anon, authenticated;
--
--   reset role;
--   revoke set option for echowall_api_viewer from current_user;
--   revoke create on schema api from echowall_api_viewer;
--
--   drop policy if exists comments_api_public_read on app.comments;
--   create policy comments_api_public_read on app.comments for select to echowall_api_viewer
--     using (moderation_status = 'published' and exists (
--       select 1 from app.posts as p where p.id = comments.post_id
--         and p.moderation_status = 'published' and p.scope_type <> 'building'
--     ));
--
--   -- private.emit_realtime_event(): restore by re-running
--   -- supabase/migrations/20260902162437_20260902120000_community_realtime_signal.sql's
--   -- section 2 (create or replace function private.emit_realtime_event())
--   -- verbatim — it is the byte-identical pre-V2.3b source of truth and is
--   -- not duplicated a second time in this rollback block.
--
--   commit;
