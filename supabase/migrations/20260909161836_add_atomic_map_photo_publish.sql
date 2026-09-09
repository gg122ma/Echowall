-- Add the missing atomic Map-photo publish path without changing the already
-- applied 20260909151613 migration. The Cloudinary upload happens first;
-- this function then creates the canonical post, its Map anchor, and the
-- attached media row in one database transaction.

create or replace function api.create_map_post_with_media(
  p_post_type app.post_type,
  p_building_id text,
  p_lat numeric,
  p_lng numeric,
  p_content text,
  p_category text,
  p_shape text,
  p_color text,
  p_media_public_id text,
  p_media_secure_url text,
  p_media_bytes integer,
  p_media_width integer,
  p_media_height integer,
  p_media_format text,
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
  from api.create_map_post(
    p_post_type,
    p_building_id,
    p_lat,
    p_lng,
    p_content,
    p_category,
    p_shape,
    p_color,
    p_display_author_mode,
    p_rotation,
    p_position_x,
    p_position_y
  ) as created
  limit 1;

  if v_id is null then
    raise exception using errcode = 'P0001', message = 'The map post could not be created.';
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

revoke all on function api.create_map_post_with_media(
  app.post_type, text, numeric, numeric, text, text, text, text,
  text, text, integer, integer, integer, text,
  app.display_author_mode, smallint, numeric, numeric
) from public, anon, authenticated;

grant execute on function api.create_map_post_with_media(
  app.post_type, text, numeric, numeric, text, text, text, text,
  text, text, integer, integer, integer, text,
  app.display_author_mode, smallint, numeric, numeric
) to authenticated, service_role;

comment on function api.create_map_post_with_media(
  app.post_type, text, numeric, numeric, text, text, text, text,
  text, text, integer, integer, integer, text,
  app.display_author_mode, smallint, numeric, numeric
) is
  'Atomically creates a verified-user Map post, Map anchor, and attached Cloudinary metadata row.';
