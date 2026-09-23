-- EchoWall Production Cloud Admin Phase 1A (read-only).
--
-- This migration deliberately adds no role assignments, table grants,
-- moderation writes, or service-role browser access.  Every exposed function
-- verifies the authenticated Supabase user against protected app.user_roles
-- through private.has_active_role() before reading app-owned tables.

create or replace function private.require_cloud_admin_reader()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using
      errcode = '42501',
      message = 'Cloud Admin authentication is required.';
  end if;

  -- Reuse the canonical active-account check before evaluating elevated roles.
  perform private.require_active_user();

  if not private.has_active_role(
    v_user,
    array['admin'::app.app_role, 'moderator'::app.app_role]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Cloud Admin permission is required.';
  end if;

  return v_user;
end;
$function$;

revoke all on function private.require_cloud_admin_reader() from public, anon, authenticated;

comment on function private.require_cloud_admin_reader() is
  'Returns auth.uid() only for an active user with an active protected app.user_roles admin or moderator assignment.';

create or replace function api.admin_get_context()
returns table (
  user_id uuid,
  roles text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_cloud_admin_reader();
begin
  return query
  select
    v_user,
    pg_catalog.array_remove(array[
      case when private.has_active_role(v_user, array['admin'::app.app_role]) then 'admin' end,
      case when private.has_active_role(v_user, array['moderator'::app.app_role]) then 'moderator' end
    ], null)::text[];
end;
$function$;

revoke all on function api.admin_get_context() from public, anon;
grant execute on function api.admin_get_context() to authenticated;

comment on function api.admin_get_context() is
  'Read-only Cloud Admin identity context. Authorization is evaluated from auth.uid() and protected app.user_roles.';

create or replace function api.admin_get_dashboard_stats()
returns table (
  posts_total bigint,
  posts_published bigint,
  posts_pending bigint,
  posts_flagged bigint,
  posts_hidden bigint,
  posts_rejected bigint,
  comments_total bigint,
  comments_published bigint,
  comments_pending bigint,
  comments_flagged bigint,
  comments_hidden bigint,
  comments_rejected bigint,
  queue_total bigint,
  latest_content_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_cloud_admin_reader();

  return query
  with community_posts as (
    select p.id, p.moderation_status, p.created_at
    from app.posts as p
    where p.scope_type in (
      'all_km'::app.scope_type,
      'college'::app.scope_type,
      'jurusan'::app.scope_type
    )
  ),
  community_comments as (
    select c.id, c.moderation_status, c.created_at
    from app.comments as c
    join community_posts as p on p.id = c.post_id
  ),
  post_counts as (
    select
      pg_catalog.count(*) as total,
      pg_catalog.count(*) filter (where moderation_status::text = 'published') as published,
      pg_catalog.count(*) filter (where moderation_status::text = 'pending') as pending,
      pg_catalog.count(*) filter (where moderation_status::text = 'flagged') as flagged,
      pg_catalog.count(*) filter (where moderation_status::text = 'hidden') as hidden,
      pg_catalog.count(*) filter (where moderation_status::text = 'rejected') as rejected
    from community_posts
  ),
  comment_counts as (
    select
      pg_catalog.count(*) as total,
      pg_catalog.count(*) filter (where moderation_status::text = 'published') as published,
      pg_catalog.count(*) filter (where moderation_status::text = 'pending') as pending,
      pg_catalog.count(*) filter (where moderation_status::text = 'flagged') as flagged,
      pg_catalog.count(*) filter (where moderation_status::text = 'hidden') as hidden,
      pg_catalog.count(*) filter (where moderation_status::text = 'rejected') as rejected
    from community_comments
  ),
  latest as (
    select pg_catalog.max(content.created_at) as created_at
    from (
      select p.created_at from community_posts as p
      union all
      select c.created_at from community_comments as c
    ) as content
  )
  select
    pc.total,
    pc.published,
    pc.pending,
    pc.flagged,
    pc.hidden,
    pc.rejected,
    cc.total,
    cc.published,
    cc.pending,
    cc.flagged,
    cc.hidden,
    cc.rejected,
    pc.pending + pc.flagged + cc.pending + cc.flagged,
    latest.created_at
  from post_counts as pc
  cross join comment_counts as cc
  cross join latest;
end;
$function$;

revoke all on function api.admin_get_dashboard_stats() from public, anon;
grant execute on function api.admin_get_dashboard_stats() to authenticated;

comment on function api.admin_get_dashboard_stats() is
  'Read-only Community post/comment counts for Cloud Admin Phase 1A. Building/Map content is intentionally excluded.';

create or replace function api.admin_list_community_content(
  p_content_type text default 'all'::text,
  p_queue_only boolean default false,
  p_status text default null::text,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  content_type text,
  content_id uuid,
  post_id uuid,
  parent_comment_id uuid,
  post_type text,
  scope_type text,
  college_id smallint,
  jurusan_id smallint,
  content text,
  category text,
  author_mode text,
  author_label text,
  moderation_status text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_cloud_admin_reader();

  if p_content_type not in ('all', 'post', 'comment') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin content type.';
  end if;
  if p_status is not null and p_status not in ('published', 'pending', 'flagged', 'hidden', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin moderation status.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Cloud Admin limit must be between 1 and 100.';
  end if;
  if p_offset is null or p_offset < 0 or p_offset > 100000 then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin offset.';
  end if;

  return query
  with community_posts as (
    select p.*
    from app.posts as p
    where p.scope_type in (
      'all_km'::app.scope_type,
      'college'::app.scope_type,
      'jurusan'::app.scope_type
    )
  ),
  content_rows as (
    select
      'post'::text as content_type,
      p.id as content_id,
      p.id as post_id,
      null::uuid as parent_comment_id,
      p.post_type::text,
      p.scope_type::text,
      p.college_id,
      p.jurusan_id,
      p.content,
      p.category,
      p.display_author_mode::text as author_mode,
      p.display_author_label as author_label,
      p.moderation_status::text,
      p.created_at,
      p.updated_at
    from community_posts as p

    union all

    select
      'comment'::text as content_type,
      c.id as content_id,
      c.post_id,
      c.parent_comment_id,
      p.post_type::text,
      p.scope_type::text,
      p.college_id,
      p.jurusan_id,
      c.content,
      p.category,
      c.display_author_mode::text as author_mode,
      c.display_author_label as author_label,
      c.moderation_status::text,
      c.created_at,
      c.updated_at
    from app.comments as c
    join community_posts as p on p.id = c.post_id
  ),
  filtered as (
    select r.*
    from content_rows as r
    where (p_content_type = 'all' or r.content_type = p_content_type)
      and (not p_queue_only or r.moderation_status in ('pending', 'flagged'))
      and (p_status is null or r.moderation_status = p_status)
  )
  select
    r.content_type,
    r.content_id,
    r.post_id,
    r.parent_comment_id,
    r.post_type,
    r.scope_type,
    r.college_id,
    r.jurusan_id,
    r.content,
    r.category,
    r.author_mode,
    r.author_label,
    r.moderation_status,
    r.created_at,
    r.updated_at,
    pg_catalog.count(*) over () as total_count
  from filtered as r
  order by r.updated_at desc nulls last, r.created_at desc, r.content_id desc
  limit p_limit
  offset p_offset;
end;
$function$;

revoke all on function api.admin_list_community_content(text, boolean, text, integer, integer) from public, anon;
grant execute on function api.admin_list_community_content(text, boolean, text, integer, integer) to authenticated;

comment on function api.admin_list_community_content(text, boolean, text, integer, integer) is
  'Read-only protected Community posts/comments list and pending/flagged queue for Cloud Admin Phase 1A.';

notify pgrst, 'reload schema';
