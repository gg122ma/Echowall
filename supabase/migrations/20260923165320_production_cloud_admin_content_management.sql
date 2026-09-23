-- EchoWall Production Cloud Admin: server-authorized content management.
--
-- Bootstrap authority:
--   * greencucumbertube@gmail.com is the original, immutable Super Admin
--     identity already verified by Supabase Auth and the production client.
--   * the owner-approved migration is the root-of-trust event that bootstraps
--     that identity. Its real Auth UUID is retained as assigned_by.
--   * that primary administrator then becomes the recorded assigned_by for
--     mzteoh88@gmail.com.
--   * role-bootstrap audit rows intentionally use a null actor_user_id because
--     the migration, not an interactive user session, executes the inserts;
--     the exact executor/authorization source remains explicit in metadata.
--
-- No browser receives service_role credentials or direct app-table grants.

do $bootstrap_admin_roles$
declare
  v_primary constant uuid := '7beb9f0e-76c5-4c6a-b6b4-06e708bf3644';
  v_secondary constant uuid := '6a6d8ff7-7322-4643-84ef-aee2b5f6534e';
  v_inserted integer := 0;
begin
  if not exists (
    select 1 from auth.users as u
    where u.id = v_primary
      and pg_catalog.lower(u.email) = 'greencucumbertube@gmail.com'
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= pg_catalog.now())
  ) then
    raise exception using errcode = '23503', message = 'Verified primary EchoWall administrator identity was not found.';
  end if;

  if not exists (
    select 1 from auth.users as u
    where u.id = v_secondary
      and pg_catalog.lower(u.email) = 'mzteoh88@gmail.com'
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= pg_catalog.now())
  ) then
    raise exception using errcode = '23503', message = 'Verified secondary EchoWall administrator identity was not found.';
  end if;

  insert into app.user_roles (user_id, role, assigned_by)
  values (v_primary, 'admin'::app.app_role, v_primary)
  on conflict (user_id, role) do nothing;
  get diagnostics v_inserted = row_count;

  if not exists (
    select 1 from app.user_roles as ur
    where ur.user_id = v_primary
      and ur.role = 'admin'::app.app_role
      and ur.disabled_at is null
  ) then
    raise exception using errcode = '23514', message = 'Primary EchoWall administrator role exists but is disabled.';
  end if;

  if v_inserted = 1 then
    insert into app.audit_events (actor_user_id, event_type, target_type, target_id, metadata)
    values (
      null,
      'admin_role_bootstrap',
      'user_role',
      v_primary::text,
      pg_catalog.jsonb_build_object(
        'role', 'admin',
        'assigned_by', v_primary,
        'event_executor', 'owner-approved production migration',
        'authorization_source', 'owner-approved production migration',
        'bootstrap_root', true
      )
    );
  end if;

  insert into app.user_roles (user_id, role, assigned_by)
  values (v_secondary, 'admin'::app.app_role, v_primary)
  on conflict (user_id, role) do nothing;
  get diagnostics v_inserted = row_count;

  if not exists (
    select 1 from app.user_roles as ur
    where ur.user_id = v_secondary
      and ur.role = 'admin'::app.app_role
      and ur.disabled_at is null
  ) then
    raise exception using errcode = '23514', message = 'Secondary EchoWall administrator role exists but is disabled.';
  end if;

  if v_inserted = 1 then
    insert into app.audit_events (actor_user_id, event_type, target_type, target_id, metadata)
    values (
      null,
      'admin_role_grant',
      'user_role',
      v_secondary::text,
      pg_catalog.jsonb_build_object(
        'role', 'admin',
        'assigned_by', v_primary,
        'event_executor', 'owner-approved production migration',
        'authorization_source', 'owner-approved production migration'
      )
    );
  end if;
end;
$bootstrap_admin_roles$;

create or replace function private.require_cloud_admin_writer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := private.require_active_user();
begin
  if not private.has_active_role(v_user, array['admin'::app.app_role]) then
    raise exception using
      errcode = '42501',
      message = 'Cloud Admin write permission is required.';
  end if;
  return v_user;
end;
$function$;

revoke all on function private.require_cloud_admin_writer() from public, anon, authenticated;

comment on function private.require_cloud_admin_writer() is
  'Returns auth.uid() only for an active user with an active protected app.user_roles admin assignment.';

create or replace function api.admin_moderate_community_content(
  p_content_type text,
  p_content_id uuid,
  p_action text,
  p_reason text default null::text
)
returns table (
  content_type text,
  content_id uuid,
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
  v_scope text;
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_updated_at timestamptz;
  v_audit_id bigint;
begin
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
    select p.moderation_status::text, p.scope_type::text
      into v_previous, v_scope
    from app.posts as p
    where p.id = p_content_id
      and p.scope_type in (
        'all_km'::app.scope_type,
        'college'::app.scope_type,
        'jurusan'::app.scope_type
      )
    for update;
  else
    select c.moderation_status::text, p.scope_type::text
      into v_previous, v_scope
    from app.comments as c
    join app.posts as p on p.id = c.post_id
    where c.id = p_content_id
      and p.scope_type in (
        'all_km'::app.scope_type,
        'college'::app.scope_type,
        'jurusan'::app.scope_type
      )
    for update of c;
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'Community content was not found.';
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
      'scope_type', v_scope,
      'reason', v_reason
    )
  )
  returning id into v_audit_id;

  return query
  select p_content_type, p_content_id, v_previous, v_next, v_updated_at, v_audit_id;
end;
$function$;

revoke all on function api.admin_moderate_community_content(text, uuid, text, text) from public, anon;
grant execute on function api.admin_moderate_community_content(text, uuid, text, text) to authenticated;

comment on function api.admin_moderate_community_content(text, uuid, text, text) is
  'Atomically applies an authorized Community moderation transition and appends its audit event.';

notify pgrst, 'reload schema';
