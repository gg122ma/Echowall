-- EchoWall Cloud Admin expansion: Building/Map content and permanent delete.
--
-- All browser access remains RPC-only. The functions below reuse the existing
-- protected Cloud Admin reader/writer guards, expose no app-table privileges,
-- and never require a service-role key in the browser.

create or replace function api.admin_get_managed_content_stats()
returns table (
  community_posts_total bigint,
  community_posts_published bigint,
  community_posts_pending bigint,
  community_posts_flagged bigint,
  community_posts_hidden bigint,
  community_posts_rejected bigint,
  community_comments_total bigint,
  community_comments_published bigint,
  community_comments_pending bigint,
  community_comments_flagged bigint,
  community_comments_hidden bigint,
  community_comments_rejected bigint,
  community_queue_total bigint,
  building_posts_total bigint,
  building_posts_published bigint,
  building_posts_pending bigint,
  building_posts_flagged bigint,
  building_posts_hidden bigint,
  building_posts_rejected bigint,
  building_comments_total bigint,
  building_comments_published bigint,
  building_comments_pending bigint,
  building_comments_flagged bigint,
  building_comments_hidden bigint,
  building_comments_rejected bigint,
  building_queue_total bigint,
  map_direct_posts_total bigint,
  posts_total bigint,
  comments_total bigint,
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
  with classified_posts as (
    select
      p.id,
      p.moderation_status::text as moderation_status,
      p.created_at,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end as scope_group,
      exists (select 1 from app.post_map_anchors as a where a.post_id = p.id) as is_map_anchored
    from app.posts as p
  ),
  classified_comments as (
    select
      c.id,
      c.moderation_status::text as moderation_status,
      c.created_at,
      p.scope_group
    from app.comments as c
    join classified_posts as p on p.id = c.post_id
  ),
  post_counts as (
    select
      pg_catalog.count(*) filter (where scope_group = 'community') as community_total,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'published') as community_published,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'pending') as community_pending,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'flagged') as community_flagged,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'hidden') as community_hidden,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'rejected') as community_rejected,
      pg_catalog.count(*) filter (where scope_group = 'building') as building_total,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'published') as building_published,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'pending') as building_pending,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'flagged') as building_flagged,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'hidden') as building_hidden,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'rejected') as building_rejected,
      pg_catalog.count(*) filter (where is_map_anchored) as map_direct_total,
      pg_catalog.count(*) as total
    from classified_posts
  ),
  comment_counts as (
    select
      pg_catalog.count(*) filter (where scope_group = 'community') as community_total,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'published') as community_published,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'pending') as community_pending,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'flagged') as community_flagged,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'hidden') as community_hidden,
      pg_catalog.count(*) filter (where scope_group = 'community' and moderation_status = 'rejected') as community_rejected,
      pg_catalog.count(*) filter (where scope_group = 'building') as building_total,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'published') as building_published,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'pending') as building_pending,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'flagged') as building_flagged,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'hidden') as building_hidden,
      pg_catalog.count(*) filter (where scope_group = 'building' and moderation_status = 'rejected') as building_rejected,
      pg_catalog.count(*) as total
    from classified_comments
  ),
  latest as (
    select pg_catalog.max(content.created_at) as created_at
    from (
      select p.created_at from classified_posts as p
      union all
      select c.created_at from classified_comments as c
    ) as content
  )
  select
    pc.community_total,
    pc.community_published,
    pc.community_pending,
    pc.community_flagged,
    pc.community_hidden,
    pc.community_rejected,
    cc.community_total,
    cc.community_published,
    cc.community_pending,
    cc.community_flagged,
    cc.community_hidden,
    cc.community_rejected,
    pc.community_pending + pc.community_flagged + cc.community_pending + cc.community_flagged,
    pc.building_total,
    pc.building_published,
    pc.building_pending,
    pc.building_flagged,
    pc.building_hidden,
    pc.building_rejected,
    cc.building_total,
    cc.building_published,
    cc.building_pending,
    cc.building_flagged,
    cc.building_hidden,
    cc.building_rejected,
    pc.building_pending + pc.building_flagged + cc.building_pending + cc.building_flagged,
    pc.map_direct_total,
    pc.total,
    cc.total,
    pc.community_pending + pc.community_flagged + cc.community_pending + cc.community_flagged
      + pc.building_pending + pc.building_flagged + cc.building_pending + cc.building_flagged,
    latest.created_at
  from post_counts as pc
  cross join comment_counts as cc
  cross join latest;
end;
$function$;

revoke all on function api.admin_get_managed_content_stats() from public, anon, authenticated;
grant execute on function api.admin_get_managed_content_stats() to authenticated;

comment on function api.admin_get_managed_content_stats() is
  'Server-authorized Community and Building/Map counts. Map Direct is the anchored subset of Building posts and is never double-counted.';

create or replace function api.admin_list_managed_content(
  p_scope_group text default 'community'::text,
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
  scope_group text,
  scope_type text,
  college_id smallint,
  jurusan_id smallint,
  building_id text,
  is_map_anchored boolean,
  anchor_lat numeric,
  anchor_lng numeric,
  is_seed boolean,
  content text,
  category text,
  author_mode text,
  author_label text,
  moderation_status text,
  created_at timestamptz,
  updated_at timestamptz,
  media_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_cloud_admin_reader();

  if p_scope_group not in ('community', 'building', 'all') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin scope group.';
  end if;
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
  with managed_posts as (
    select
      p.*,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end as managed_scope_group,
      a.post_id is not null as managed_is_map_anchored,
      a.lat as managed_anchor_lat,
      a.lng as managed_anchor_lng,
      (select pg_catalog.count(*) from app.media_assets as m where m.post_id = p.id) as managed_media_count
    from app.posts as p
    left join app.post_map_anchors as a on a.post_id = p.id
  ),
  content_rows as (
    select
      'post'::text as content_type,
      p.id as content_id,
      p.id as post_id,
      null::uuid as parent_comment_id,
      p.post_type::text as post_type,
      p.managed_scope_group as scope_group,
      p.scope_type::text as scope_type,
      p.college_id,
      p.jurusan_id,
      p.building_id,
      p.managed_is_map_anchored as is_map_anchored,
      p.managed_anchor_lat as anchor_lat,
      p.managed_anchor_lng as anchor_lng,
      p.is_seed,
      p.content,
      p.category,
      p.display_author_mode::text as author_mode,
      p.display_author_label as author_label,
      p.moderation_status::text as moderation_status,
      p.created_at,
      p.updated_at,
      p.managed_media_count as media_count
    from managed_posts as p

    union all

    select
      'comment'::text,
      c.id,
      c.post_id,
      c.parent_comment_id,
      p.post_type::text,
      p.managed_scope_group,
      p.scope_type::text,
      p.college_id,
      p.jurusan_id,
      p.building_id,
      p.managed_is_map_anchored,
      p.managed_anchor_lat,
      p.managed_anchor_lng,
      false,
      c.content,
      p.category,
      c.display_author_mode::text,
      c.display_author_label,
      c.moderation_status::text,
      c.created_at,
      c.updated_at,
      0::bigint
    from app.comments as c
    join managed_posts as p on p.id = c.post_id
  ),
  filtered as (
    select r.*
    from content_rows as r
    where (p_scope_group = 'all' or r.scope_group = p_scope_group)
      and (p_content_type = 'all' or r.content_type = p_content_type)
      and (not p_queue_only or r.moderation_status in ('pending', 'flagged'))
      and (p_status is null or r.moderation_status = p_status)
  )
  select
    r.content_type,
    r.content_id,
    r.post_id,
    r.parent_comment_id,
    r.post_type,
    r.scope_group,
    r.scope_type,
    r.college_id,
    r.jurusan_id,
    r.building_id,
    r.is_map_anchored,
    r.anchor_lat,
    r.anchor_lng,
    r.is_seed,
    r.content,
    r.category,
    r.author_mode,
    r.author_label,
    r.moderation_status,
    r.created_at,
    r.updated_at,
    r.media_count,
    pg_catalog.count(*) over () as total_count
  from filtered as r
  order by r.updated_at desc nulls last, r.created_at desc, r.content_id desc
  limit p_limit
  offset p_offset;
end;
$function$;

revoke all on function api.admin_list_managed_content(text, text, boolean, text, integer, integer) from public, anon, authenticated;
grant execute on function api.admin_list_managed_content(text, text, boolean, text, integer, integer) to authenticated;

comment on function api.admin_list_managed_content(text, text, boolean, text, integer, integer) is
  'Server-authorized, paginated Community or Building/Map post/comment list. Anchored Map posts remain one Building post.';

create or replace function api.admin_moderate_managed_content(
  p_scope_group text,
  p_content_type text,
  p_content_id uuid,
  p_action text,
  p_reason text default null::text
)
returns table (
  content_type text,
  content_id uuid,
  scope_group text,
  previous_status text,
  new_status text,
  updated_at timestamptz,
  audit_event_id bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.require_cloud_admin_writer();
  v_previous text;
  v_next text;
  v_scope_type text;
  v_scope_group text;
  v_building_id text;
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_updated_at timestamptz;
  v_audit_id bigint;
begin
  if p_scope_group not in ('community', 'building') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin scope group.';
  end if;
  if p_content_type not in ('post', 'comment') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin content type.';
  end if;
  if p_content_id is null then
    raise exception using errcode = '22023', message = 'Cloud Admin content ID is required.';
  end if;
  if p_action not in ('approve', 'hide', 'restore', 'reject') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin moderation action.';
  end if;
  if p_action in ('hide', 'reject') and (v_reason is null or pg_catalog.char_length(v_reason) < 5) then
    raise exception using errcode = '22023', message = 'A moderation reason of at least 5 characters is required.';
  end if;
  if v_reason is not null and pg_catalog.char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'Moderation reason must not exceed 500 characters.';
  end if;

  if p_content_type = 'post' then
    select
      p.moderation_status::text,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.building_id
    into v_previous, v_scope_type, v_scope_group, v_building_id
    from app.posts as p
    where p.id = p_content_id
    for update;
  else
    select
      c.moderation_status::text,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.building_id
    into v_previous, v_scope_type, v_scope_group, v_building_id
    from app.comments as c
    join app.posts as p on p.id = c.post_id
    where c.id = p_content_id
    for update of c, p;
  end if;

  if not found or v_scope_group <> p_scope_group then
    raise exception using errcode = 'P0002', message = 'Managed content was not found in the requested scope.';
  end if;

  v_next := case p_action
    when 'approve' then 'published'
    when 'hide' then 'hidden'
    when 'restore' then 'published'
    when 'reject' then 'rejected'
  end;

  if v_previous = v_next then
    raise exception using errcode = '22023', message = 'Content is already in the requested moderation state.';
  end if;
  if p_action = 'approve' and v_previous not in ('pending', 'flagged', 'rejected') then
    raise exception using errcode = '22023', message = 'Approve is allowed only for pending, flagged, or rejected content.';
  end if;
  if p_action = 'hide' and v_previous not in ('published', 'pending', 'flagged') then
    raise exception using errcode = '22023', message = 'Hide is allowed only for published, pending, or flagged content.';
  end if;
  if p_action = 'restore' and v_previous <> 'hidden' then
    raise exception using errcode = '22023', message = 'Restore is allowed only for hidden content.';
  end if;
  if p_action = 'reject' and v_previous not in ('pending', 'flagged') then
    raise exception using errcode = '22023', message = 'Reject is allowed only for pending or flagged content.';
  end if;

  if p_content_type = 'post' then
    update app.posts as p
    set moderation_status = v_next::app.moderation_status,
        updated_at = pg_catalog.now()
    where p.id = p_content_id
    returning p.updated_at into v_updated_at;
  else
    update app.comments as c
    set moderation_status = v_next::app.moderation_status,
        updated_at = pg_catalog.now()
    where c.id = p_content_id
    returning c.updated_at into v_updated_at;
  end if;

  insert into app.audit_events (actor_user_id, event_type, target_type, target_id, metadata)
  values (
    v_actor,
    'admin_content_' || p_action,
    p_content_type,
    p_content_id::text,
    pg_catalog.jsonb_build_object(
      'previous_status', v_previous,
      'new_status', v_next,
      'scope_group', v_scope_group,
      'scope_type', v_scope_type,
      'building_id', v_building_id,
      'reason', v_reason
    )
  )
  returning id into v_audit_id;

  return query
  select p_content_type, p_content_id, v_scope_group, v_previous, v_next, v_updated_at, v_audit_id;
end;
$function$;

revoke all on function api.admin_moderate_managed_content(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function api.admin_moderate_managed_content(text, text, uuid, text, text) to authenticated;

comment on function api.admin_moderate_managed_content(text, text, uuid, text, text) is
  'Atomically applies an authorized Community or Building/Map moderation transition and appends its audit event.';

create or replace function api.admin_get_delete_impact(
  p_scope_group text,
  p_content_type text,
  p_content_id uuid
)
returns table (
  content_type text,
  content_id uuid,
  post_id uuid,
  scope_group text,
  scope_type text,
  college_id smallint,
  jurusan_id smallint,
  building_id text,
  is_map_anchored boolean,
  content_excerpt text,
  comments_deleted bigint,
  replies_deleted bigint,
  votes_deleted bigint,
  map_anchors_deleted bigint,
  media_records bigint,
  delete_blocked boolean,
  block_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_post_id uuid;
  v_scope_type text;
  v_scope_group text;
  v_college_id smallint;
  v_jurusan_id smallint;
  v_building_id text;
  v_content text;
  v_comments bigint := 0;
  v_replies bigint := 0;
  v_votes bigint := 0;
  v_anchors bigint := 0;
  v_media bigint := 0;
  v_active_media bigint := 0;
begin
  perform private.require_cloud_admin_reader();

  if p_scope_group not in ('community', 'building') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin scope group.';
  end if;
  if p_content_type not in ('post', 'comment') or p_content_id is null then
    raise exception using errcode = '22023', message = 'Valid Cloud Admin content type and ID are required.';
  end if;

  if p_content_type = 'post' then
    select
      p.id,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.college_id,
      p.jurusan_id,
      p.building_id,
      p.content
    into v_post_id, v_scope_type, v_scope_group, v_college_id, v_jurusan_id, v_building_id, v_content
    from app.posts as p
    where p.id = p_content_id;
  else
    select
      c.post_id,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.college_id,
      p.jurusan_id,
      p.building_id,
      c.content
    into v_post_id, v_scope_type, v_scope_group, v_college_id, v_jurusan_id, v_building_id, v_content
    from app.comments as c
    join app.posts as p on p.id = c.post_id
    where c.id = p_content_id;
  end if;

  if not found or v_scope_group <> p_scope_group then
    raise exception using errcode = 'P0002', message = 'Managed content was not found in the requested scope.';
  end if;

  if p_content_type = 'post' then
    select pg_catalog.count(*) into v_comments from app.comments as c where c.post_id = v_post_id;
    select pg_catalog.count(*) into v_replies from app.comments as c where c.post_id = v_post_id and c.parent_comment_id is not null;
    select pg_catalog.count(*) into v_votes from app.post_votes as v where v.post_id = v_post_id;
    select pg_catalog.count(*) into v_anchors from app.post_map_anchors as a where a.post_id = v_post_id;
    select
      pg_catalog.count(*),
      pg_catalog.count(*) filter (where m.status <> 'deleted'::app.media_status)
    into v_media, v_active_media
    from app.media_assets as m
    where m.post_id = v_post_id;
  else
    select pg_catalog.count(*) into v_replies from app.comments as c where c.parent_comment_id = p_content_id;
    v_comments := v_replies;
  end if;

  return query
  select
    p_content_type,
    p_content_id,
    v_post_id,
    v_scope_group,
    v_scope_type,
    v_college_id,
    v_jurusan_id,
    v_building_id,
    v_anchors > 0,
    pg_catalog.left(pg_catalog.regexp_replace(v_content, E'[\\n\\r\\t]+', ' ', 'g'), 180),
    v_comments,
    v_replies,
    v_votes,
    v_anchors,
    v_media,
    v_active_media > 0,
    case when v_active_media > 0 then 'Permanent delete is blocked because attached Cloudinary media cannot be removed transactionally by the current trusted backend.' else null end;
end;
$function$;

revoke all on function api.admin_get_delete_impact(text, text, uuid) from public, anon, authenticated;
grant execute on function api.admin_get_delete_impact(text, text, uuid) to authenticated;

comment on function api.admin_get_delete_impact(text, text, uuid) is
  'Returns a safe deletion summary. Posts with non-deleted external Cloudinary media fail closed.';

create or replace function api.admin_permanently_delete_content(
  p_scope_group text,
  p_content_type text,
  p_content_id uuid,
  p_reason text
)
returns table (
  content_type text,
  content_id uuid,
  post_id uuid,
  scope_group text,
  comments_deleted bigint,
  replies_deleted bigint,
  votes_deleted bigint,
  map_anchors_deleted bigint,
  media_records_preserved bigint,
  audit_event_id bigint,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.require_cloud_admin_writer();
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_post_id uuid;
  v_scope_type text;
  v_scope_group text;
  v_college_id smallint;
  v_jurusan_id smallint;
  v_building_id text;
  v_comments bigint := 0;
  v_replies bigint := 0;
  v_votes bigint := 0;
  v_anchors bigint := 0;
  v_media bigint := 0;
  v_active_media bigint := 0;
  v_audit_id bigint;
  v_deleted_at timestamptz := pg_catalog.now();
begin
  if p_scope_group not in ('community', 'building') then
    raise exception using errcode = '22023', message = 'Invalid Cloud Admin scope group.';
  end if;
  if p_content_type not in ('post', 'comment') or p_content_id is null then
    raise exception using errcode = '22023', message = 'Valid Cloud Admin content type and ID are required.';
  end if;
  if v_reason is null or pg_catalog.char_length(v_reason) < 5 then
    raise exception using errcode = '22023', message = 'A deletion reason of at least 5 characters is required.';
  end if;
  if pg_catalog.char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'Deletion reason must not exceed 500 characters.';
  end if;

  if p_content_type = 'post' then
    select
      p.id,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.college_id,
      p.jurusan_id,
      p.building_id
    into v_post_id, v_scope_type, v_scope_group, v_college_id, v_jurusan_id, v_building_id
    from app.posts as p
    where p.id = p_content_id
    for update;
  else
    select
      c.post_id,
      p.scope_type::text,
      case when p.scope_type = 'building'::app.scope_type then 'building' else 'community' end,
      p.college_id,
      p.jurusan_id,
      p.building_id
    into v_post_id, v_scope_type, v_scope_group, v_college_id, v_jurusan_id, v_building_id
    from app.comments as c
    join app.posts as p on p.id = c.post_id
    where c.id = p_content_id
    for update of c, p;
  end if;

  if not found or v_scope_group <> p_scope_group then
    raise exception using errcode = 'P0002', message = 'Managed content was not found in the requested scope.';
  end if;

  if p_content_type = 'post' then
    perform 1 from app.comments as c where c.post_id = v_post_id for update;
    perform 1 from app.post_votes as v where v.post_id = v_post_id for update;
    perform 1 from app.post_map_anchors as a where a.post_id = v_post_id for update;
    perform 1 from app.media_assets as m where m.post_id = v_post_id for update;

    select pg_catalog.count(*) into v_comments from app.comments as c where c.post_id = v_post_id;
    select pg_catalog.count(*) into v_replies from app.comments as c where c.post_id = v_post_id and c.parent_comment_id is not null;
    select pg_catalog.count(*) into v_votes from app.post_votes as v where v.post_id = v_post_id;
    select pg_catalog.count(*) into v_anchors from app.post_map_anchors as a where a.post_id = v_post_id;
    select
      pg_catalog.count(*),
      pg_catalog.count(*) filter (where m.status <> 'deleted'::app.media_status)
    into v_media, v_active_media
    from app.media_assets as m
    where m.post_id = v_post_id;

    if v_active_media > 0 then
      raise exception using
        errcode = '55000',
        message = 'Permanent delete is blocked because attached Cloudinary media cannot be removed transactionally by the current trusted backend.';
    end if;

    delete from app.posts as p where p.id = v_post_id;
  else
    perform 1 from app.comments as c where c.parent_comment_id = p_content_id for update;
    select pg_catalog.count(*) into v_replies from app.comments as c where c.parent_comment_id = p_content_id;
    v_comments := v_replies;
    delete from app.comments as c where c.id = p_content_id;
  end if;

  insert into app.audit_events (actor_user_id, event_type, target_type, target_id, metadata)
  values (
    v_actor,
    'admin_content_permanently_deleted',
    p_content_type,
    p_content_id::text,
    pg_catalog.jsonb_build_object(
      'scope_group', v_scope_group,
      'scope_type', v_scope_type,
      'college_id', v_college_id,
      'jurusan_id', v_jurusan_id,
      'building_id', v_building_id,
      'reason', v_reason,
      'comments_deleted', v_comments,
      'replies_deleted', v_replies,
      'votes_deleted', v_votes,
      'map_anchors_deleted', v_anchors,
      'media_records_preserved', v_media
    )
  )
  returning id into v_audit_id;

  return query
  select
    p_content_type,
    p_content_id,
    v_post_id,
    v_scope_group,
    v_comments,
    v_replies,
    v_votes,
    v_anchors,
    v_media,
    v_audit_id,
    v_deleted_at;
end;
$function$;

revoke all on function api.admin_permanently_delete_content(text, text, uuid, text) from public, anon, authenticated;
grant execute on function api.admin_permanently_delete_content(text, text, uuid, text) to authenticated;

comment on function api.admin_permanently_delete_content(text, text, uuid, text) is
  'Permanently deletes one authorized Community or Building/Map post/comment with dependency counts and an atomic surviving audit event. Active external media blocks deletion.';

notify pgrst, 'reload schema';
