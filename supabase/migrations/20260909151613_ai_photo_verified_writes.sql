-- EchoWall AI/photo/auth upgrade (applied migration 20260909151613).
--
-- This migration is intentionally additive/non-destructive:
--   * publishing RPCs now require an active user with an authoritative
--     auth.users.email_confirmed_at value;
--   * the existing reserved app.media_assets table is activated for the
--     unsigned Cloudinary integration; and
--   * posts_public exposes only the small set of attached photo fields the
--     browser needs.
-- Existing posts and users are not rewritten.

create or replace function private.require_verified_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_active_user();
begin
  if not exists (
    select 1
    from auth.users as u
    where u.id = v_user
      and u.email_confirmed_at is not null
  ) then
    raise exception using
      errcode = '42501',
      message = 'Verify your email address before publishing.';
  end if;

  return v_user;
end;
$function$;

revoke all on function private.require_verified_active_user() from public, anon, authenticated;

comment on function private.require_verified_active_user() is
  'Returns the active auth.uid() only when auth.users.email_confirmed_at is set. Used by protected publishing RPCs.';

create or replace function api.create_post(
  p_post_type app.post_type,
  p_scope_type app.scope_type,
  p_content text,
  p_category text,
  p_shape text,
  p_color text,
  p_display_author_mode app.display_author_mode default 'anonymous'::app.display_author_mode,
  p_college_id smallint default null::smallint,
  p_jurusan_id smallint default null::smallint,
  p_building_id text default null::text,
  p_rotation smallint default 0,
  p_position_x numeric default null::numeric,
  p_position_y numeric default null::numeric
)
returns setof api.posts_public
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_verified_active_user();
  v_label text;
  v_id uuid;
begin
  perform private.assert_valid_post_payload(
    p_post_type, p_content, p_category, p_shape, p_color,
    p_rotation, p_position_x, p_position_y
  );

  if p_scope_type is null then
    raise exception using errcode = '22023', message = 'Invalid post scope.';
  end if;

  if p_scope_type = 'all_km' then
    if p_college_id is not null or p_jurusan_id is not null or p_building_id is not null then
      raise exception using errcode = '22023', message = 'Invalid post scope.';
    end if;
  elsif p_scope_type = 'college' then
    if p_college_id is null or p_jurusan_id is not null or p_building_id is not null
       or not exists (
         select 1 from app.college_scope_keys as c where c.college_id = p_college_id
       ) then
      raise exception using errcode = '22023', message = 'Invalid post scope.';
    end if;
  elsif p_scope_type = 'jurusan' then
    if p_college_id is null or p_jurusan_id is null or p_building_id is not null
       or not exists (
         select 1 from app.jurusan_scope_keys as j
         where j.college_id = p_college_id and j.jurusan_id = p_jurusan_id
       ) then
      raise exception using errcode = '22023', message = 'Invalid post scope.';
    end if;
  elsif p_scope_type = 'building' then
    if p_college_id is null or p_jurusan_id is not null or p_building_id is null
       or not exists (
         select 1 from app.building_scope_keys as b
         where b.college_id = p_college_id and b.building_id = p_building_id
       ) then
      raise exception using errcode = '22023', message = 'Invalid post scope.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Invalid post scope.';
  end if;

  if p_display_author_mode is null then
    raise exception using errcode = '22023', message = 'Invalid author presentation mode.';
  end if;

  if p_display_author_mode = 'named' then
    select p.display_name into v_label
    from app.profiles as p
    where p.user_id = v_user and p.status = 'active';

    if v_label is null then
      raise exception using errcode = '22023', message = 'A display name is required for named posting.';
    end if;
  end if;

  insert into app.posts (
    owner_user_id, post_type, scope_type, college_id, jurusan_id, building_id,
    content, category, shape, color, rotation, position_x, position_y,
    display_author_mode, display_author_label, question_status,
    is_seed, seed_base_score, moderation_status
  ) values (
    v_user, p_post_type, p_scope_type, p_college_id, p_jurusan_id, p_building_id,
    pg_catalog.btrim(p_content), p_category, p_shape, p_color, p_rotation, p_position_x, p_position_y,
    p_display_author_mode, v_label,
    case when p_post_type = 'question' then 'open'::app.question_status else null end,
    false, 0, 'published'
  ) returning id into v_id;

  return query select p.* from api.posts_public as p where p.id = v_id;
end;
$function$;

create or replace function api.create_map_post(
  p_post_type app.post_type,
  p_building_id text,
  p_lat numeric,
  p_lng numeric,
  p_content text,
  p_category text,
  p_shape text,
  p_color text,
  p_display_author_mode app.display_author_mode default 'anonymous'::app.display_author_mode,
  p_rotation smallint default 0,
  p_position_x numeric default null::numeric,
  p_position_y numeric default null::numeric
)
returns setof api.posts_public
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_verified_active_user();
  v_college smallint;
  v_label text;
  v_id uuid;
begin
  perform private.assert_valid_post_payload(
    p_post_type, p_content, p_category, p_shape, p_color,
    p_rotation, p_position_x, p_position_y
  );

  if p_display_author_mode is null then
    raise exception using errcode = '22023', message = 'Invalid author presentation mode.';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception using errcode = '22023', message = 'Invalid map coordinates.';
  end if;

  select b.college_id into v_college
  from app.building_scope_keys as b
  where b.building_id = p_building_id;

  if not found then
    raise exception using errcode = '23503', message = 'Unknown building ID.';
  end if;

  if p_display_author_mode = 'named' then
    select p.display_name into v_label
    from app.profiles as p
    where p.user_id = v_user and p.status = 'active';

    if v_label is null then
      raise exception using errcode = '22023', message = 'A display name is required for named posting.';
    end if;
  end if;

  insert into app.posts (
    owner_user_id, post_type, scope_type, college_id, building_id,
    content, category, shape, color, rotation, position_x, position_y,
    display_author_mode, display_author_label, question_status,
    is_seed, seed_base_score, moderation_status
  ) values (
    v_user, p_post_type, 'building', v_college, p_building_id,
    pg_catalog.btrim(p_content), p_category, p_shape, p_color, p_rotation, p_position_x, p_position_y,
    p_display_author_mode, v_label,
    case when p_post_type = 'question' then 'open'::app.question_status else null end,
    false, 0, 'published'
  ) returning id into v_id;

  insert into app.post_map_anchors (post_id, building_id, college_id, lat, lng)
  values (v_id, p_building_id, v_college, p_lat, p_lng);

  return query select p.* from api.posts_public as p where p.id = v_id;
end;
$function$;

alter table app.media_assets
  alter column provider set default 'cloudinary';

alter table app.media_assets
  drop constraint media_assets_provider_check,
  add constraint media_assets_provider_check check (provider = 'cloudinary'),
  drop constraint media_assets_secure_url_check,
  add constraint media_assets_secure_url_check check (
    secure_url is null
    or secure_url ~ '^https://res[.]cloudinary[.]com/das8chiyz/image/upload/'
  ),
  add constraint media_assets_format_check check (
    format is null or lower(format) in ('jpg', 'jpeg', 'png', 'webp')
  );

create unique index if not exists media_assets_one_attached_per_post_idx
  on app.media_assets (post_id)
  where status = 'attached';

grant select on table app.media_assets to echowall_api_viewer;

create policy media_assets_api_public_read
  on app.media_assets
  for select
  to echowall_api_viewer
  using (status = 'attached');

create or replace view api.posts_public
with (security_barrier = true)
as
select
  p.id,
  p.post_type,
  p.scope_type,
  p.college_id,
  p.jurusan_id,
  p.building_id,
  p.content,
  p.category,
  p.shape,
  p.color,
  p.rotation,
  p.position_x,
  p.position_y,
  p.display_author_mode,
  case
    when p.display_author_mode = 'anonymous'::app.display_author_mode then 'Anonymous'::text
    else p.display_author_label
  end as author_label,
  p.question_status,
  p.is_seed,
  p.seed_source,
  p.seed_version,
  p.seed_base_score,
  coalesce(v.real_vote_score, 0::bigint) as real_vote_score,
  p.seed_base_score::bigint + coalesce(v.real_vote_score, 0::bigint) as display_score,
  p.created_at,
  p.updated_at,
  coalesce(
    p.post_type = 'question'::app.post_type
      and p.owner_user_id is not null
      and p.owner_user_id = (select auth.uid()),
    false
  ) as can_manage_question,
  m.secure_url as image_url,
  m.external_public_id as image_public_id,
  m.width as image_width,
  m.height as image_height,
  m.bytes as image_bytes,
  m.format as image_format
from app.posts as p
left join (
  select pv.post_id, sum(pv.value) as real_vote_score
  from app.post_votes as pv
  group by pv.post_id
) as v on v.post_id = p.id
left join app.media_assets as m
  on m.post_id = p.id
 and m.status = 'attached'
where p.moderation_status = 'published'::app.moderation_status;

alter view api.posts_public owner to echowall_api_viewer;

create or replace function api.create_post_with_media(
  p_post_type app.post_type,
  p_scope_type app.scope_type,
  p_content text,
  p_category text,
  p_shape text,
  p_color text,
  p_display_author_mode app.display_author_mode default 'anonymous'::app.display_author_mode,
  p_college_id smallint default null::smallint,
  p_jurusan_id smallint default null::smallint,
  p_building_id text default null::text,
  p_rotation smallint default 0,
  p_position_x numeric default null::numeric,
  p_position_y numeric default null::numeric,
  p_media_public_id text default null::text,
  p_media_secure_url text default null::text,
  p_media_bytes integer default null::integer,
  p_media_width integer default null::integer,
  p_media_height integer default null::integer,
  p_media_format text default null::text
)
returns setof api.posts_public
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_verified_active_user();
  v_id uuid;
  v_format text := lower(pg_catalog.btrim(coalesce(p_media_format, '')));
begin
  if p_media_public_id is null
     or p_media_public_id !~ '^[A-Za-z0-9/_-]{1,255}$'
     or p_media_secure_url is null
     or p_media_secure_url !~ '^https://res[.]cloudinary[.]com/das8chiyz/image/upload/'
     or p_media_bytes is null or p_media_bytes <= 0
     or p_media_width is null or p_media_width <= 0
     or p_media_height is null or p_media_height <= 0
     or v_format not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception using errcode = '22023', message = 'Invalid uploaded photo metadata.';
  end if;

  select created.id into v_id
  from api.create_post(
    p_post_type,
    p_scope_type,
    p_content,
    p_category,
    p_shape,
    p_color,
    p_display_author_mode,
    p_college_id,
    p_jurusan_id,
    p_building_id,
    p_rotation,
    p_position_x,
    p_position_y
  ) as created
  limit 1;

  if v_id is null then
    raise exception using errcode = 'P0001', message = 'The post could not be created.';
  end if;

  insert into app.media_assets (
    owner_user_id,
    post_id,
    provider,
    external_public_id,
    secure_url,
    bytes,
    width,
    height,
    format,
    status
  ) values (
    v_user,
    v_id,
    'cloudinary',
    p_media_public_id,
    p_media_secure_url,
    p_media_bytes,
    p_media_width,
    p_media_height,
    v_format,
    'attached'
  );

  return query select p.* from api.posts_public as p where p.id = v_id;
end;
$function$;

revoke all on function api.create_post_with_media(
  app.post_type, app.scope_type, text, text, text, text,
  app.display_author_mode, smallint, smallint, text, smallint, numeric, numeric,
  text, text, integer, integer, integer, text
) from public, anon;

grant execute on function api.create_post_with_media(
  app.post_type, app.scope_type, text, text, text, text,
  app.display_author_mode, smallint, smallint, text, smallint, numeric, numeric,
  text, text, integer, integer, integer, text
) to authenticated, service_role;

comment on function api.create_post_with_media(
  app.post_type, app.scope_type, text, text, text, text,
  app.display_author_mode, smallint, smallint, text, smallint, numeric, numeric,
  text, text, integer, integer, integer, text
) is
  'Atomically creates a verified-user post and attaches validated Cloudinary metadata. Cloud upload cleanup remains an application responsibility if this transaction is rejected.';
