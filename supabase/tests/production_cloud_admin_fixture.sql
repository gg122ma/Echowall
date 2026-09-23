-- Minimal production-compatible schema fixture for isolated Cloud Admin tests.
-- This file is test-only. It is never part of the production migration chain.

create schema if not exists app;
create schema if not exists api;
create schema if not exists private;

grant usage on schema api to anon, authenticated;

alter table auth.users add column if not exists email_confirmed_at timestamptz;
alter table auth.users add column if not exists banned_until timestamptz;

create type app.app_role as enum ('user', 'moderator', 'admin');
create type app.profile_status as enum ('active', 'suspended', 'deleted');
create type app.post_type as enum ('discussion', 'question');
create type app.scope_type as enum ('all_km', 'college', 'jurusan', 'building');
create type app.display_author_mode as enum ('named', 'anonymous');
create type app.moderation_status as enum ('pending', 'published', 'flagged', 'hidden', 'rejected');

create table app.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  status app.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app.app_role not null,
  assigned_by uuid references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (user_id, role),
  constraint user_roles_assignment check (role = 'user'::app.app_role or assigned_by is not null)
);

create table app.posts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id),
  post_type app.post_type not null,
  scope_type app.scope_type not null,
  college_id smallint,
  jurusan_id smallint,
  building_id text,
  content text not null,
  category text not null,
  display_author_mode app.display_author_mode not null,
  display_author_label text,
  moderation_status app.moderation_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references app.posts(id),
  owner_user_id uuid not null references auth.users(id),
  parent_comment_id uuid,
  content text not null,
  display_author_mode app.display_author_mode not null,
  display_author_label text,
  moderation_status app.moderation_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app.profiles enable row level security;
alter table app.user_roles enable row level security;
alter table app.posts enable row level security;
alter table app.comments enable row level security;
alter table app.audit_events enable row level security;

create or replace function private.has_active_role(p_user_id uuid, p_roles app.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from app.user_roles as ur
    where ur.user_id = p_user_id
      and ur.role = any (p_roles)
      and ur.disabled_at is null
  );
$function$;

create or replace function private.require_active_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if not exists (
    select 1
    from app.profiles as p
    join app.user_roles as ur
      on ur.user_id = p.user_id
     and ur.role = 'user'
     and ur.disabled_at is null
    where p.user_id = v_user and p.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Active application profile required.';
  end if;
  return v_user;
end;
$function$;

revoke all on function private.has_active_role(uuid, app.app_role[]) from public, anon, authenticated;
revoke all on function private.require_active_user() from public, anon, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('7beb9f0e-76c5-4c6a-b6b4-06e708bf3644', 'greencucumbertube@gmail.com', now()),
  ('6a6d8ff7-7322-4643-84ef-aee2b5f6534e', 'mzteoh88@gmail.com', now()),
  ('11111111-1111-4111-8111-111111111111', 'student@example.test', now()),
  ('22222222-2222-4222-8222-222222222222', 'disabled-admin@example.test', now());

insert into app.profiles (user_id, display_name) values
  ('7beb9f0e-76c5-4c6a-b6b4-06e708bf3644', 'Primary Admin'),
  ('6a6d8ff7-7322-4643-84ef-aee2b5f6534e', 'Secondary Admin'),
  ('11111111-1111-4111-8111-111111111111', 'Student'),
  ('22222222-2222-4222-8222-222222222222', 'Disabled Admin');

insert into app.user_roles (user_id, role) values
  ('7beb9f0e-76c5-4c6a-b6b4-06e708bf3644', 'user'),
  ('6a6d8ff7-7322-4643-84ef-aee2b5f6534e', 'user'),
  ('11111111-1111-4111-8111-111111111111', 'user'),
  ('22222222-2222-4222-8222-222222222222', 'user');

insert into app.user_roles (user_id, role, assigned_by, disabled_at)
values (
  '22222222-2222-4222-8222-222222222222',
  'admin',
  '7beb9f0e-76c5-4c6a-b6b4-06e708bf3644',
  now()
);

insert into app.posts (
  id, owner_user_id, post_type, scope_type, college_id, jurusan_id, building_id,
  content, category, display_author_mode, moderation_status, created_at
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'discussion', 'all_km', null, null, null, 'Published Community post', 'academic', 'anonymous', 'published', now() - interval '5 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'discussion', 'college', 1, null, null, 'Pending Community post', 'campus_life', 'anonymous', 'pending', now() - interval '4 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'question', 'jurusan', 1, 1, null, 'Flagged Community post', 'academic', 'anonymous', 'flagged', now() - interval '3 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'discussion', 'building', 1, null, 'B_TEST', 'Published Building post', 'campus_life', 'anonymous', 'published', now() - interval '2 minutes'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', 'discussion', 'building', 1, null, 'B_TEST', 'Flagged Map/Building post', 'campus_life', 'anonymous', 'flagged', now() - interval '1 minute');

insert into app.comments (
  id, post_id, owner_user_id, content, display_author_mode, moderation_status, created_at
) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Published Community comment', 'anonymous', 'published', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Flagged Community comment', 'anonymous', 'flagged', now()),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'Pending Building comment', 'anonymous', 'pending', now());
