# Backend V2 — Authoritative State

This file exists because the V2.4A read-only architecture audit found that
`CLAUDE.md` and `HANDOFF.md` describe Echo Wall as a pure LocalStorage
prototype with no backend, no `package.json`, and no database — accurate
for the pre-V2.2 codebase, but never updated across the V2.2/V2.3/V2.3a/
V2.3b Supabase work that followed. Rather than rewriting those large,
mostly-still-correct legacy docs, this file is the single canonical
reference for the Supabase backend track. **Read this file, in addition to
CLAUDE.md/HANDOFF.md, before starting any Backend V2.x work.**

Never put secrets (service_role keys, DB passwords) in this file or
anywhere in this repo. Only the browser-safe publishable key/project URL
(already public in `config/app-config.js`) belong in tracked files.

## Stage status

| Stage | Status | What it added |
|---|---|---|
| V2.2 | Complete, applied | `app.realtime_events` signal table + trigger + Realtime channel foundation |
| V2.3 | Complete, applied | Supabase-backed Building Wall + Map Post Directly (`app.posts`, `app.post_map_anchors`) |
| V2.3a | Complete | Controlled live E2E validation of V2.3 against production (no schema change) |
| V2.3b | Complete, applied | Building comments + one-level replies (removed the Building exclusion from the existing Community comment model — no new table) |
| V2.4a | Local implementation, not yet applied to production | Building metadata read-model + static fallback (`app.building_metadata`, `api.building_metadata_public`) — read-only, no admin write path yet |
| V2.4b1 | Local implementation, not yet applied to production | Server-side college-scoped Building admin **authorization primitive only** (`app.college_admin_assignments`, `private.has_active_college_admin`, `private.can_manage_building_metadata`) — no write RPC, no role-management RPC, no Admin UI yet |
| V2.4b2 | Local implementation, not yet applied to production | `api.update_building_metadata(...)` — the one authenticated, authorized, audited write RPC for `app.building_metadata`. Full-row save, optimistic concurrency, one `app.audit_events` row per real mutation. No role-management RPC, no Admin UI, no frontend caller yet |
| V2.4b1.1 | Current (local implementation, not yet applied to production) | ACL-only follow-up: explicit `service_role` EXECUTE grant on V2.4b1's two private helpers (no logic/table/RPC change) |
| V2.4c+ | Not started | Admin editor UI, wired to `SupabaseAuthProvider`, calling `api.update_building_metadata` |

## Supabase project

- Project ref: `iavndheqyzphcppfisil`
- Region: `ap-southeast-1`
- Plan: FREE
- Client access is always through the publishable key (`sb_publishable_...`)
  embedded via `window.EchoConfig.community` (`config/app-config.js`) and
  `services/community-supabase-client.js`. **Never** put a `service_role`
  key in any frontend file.

## Applied migration ledger (production-trusted, as of V2.3b)

```
20260902162437_20260902120000_community_realtime_signal.sql
20260903092150_20260903010000_building_comments_and_replies.sql
```

These two files live in **this** repo (`Echowall.git`, branch `backend-v2`,
`supabase/migrations/`). The Supabase CLI renames an applied migration's
timestamp *prefix* to match the ledger's applied version once it lands in
production — the descriptive *suffix* survives verbatim. Any script that
locates a migration file by name should match by suffix (see
`scripts/test-building-comments-migration-static.mjs` and
`scripts/test-building-metadata-migration-static.mjs`), not a hardcoded
full filename, for exactly this reason.

`supabase/migrations/20260905060000_building_metadata_read_model.sql`
(V2.4a),
`supabase/migrations/20260905120000_college_admin_building_permissions.sql`
(V2.4b1), and
`supabase/migrations/20260905150000_building_metadata_update_rpc.sql`
(V2.4b2), and
`supabase/migrations/20260905160000_college_admin_private_helper_acl.sql`
(V2.4b1.1, ACL-only) are **local drafts only** — none is applied to
production. Do not apply any of them without explicit authorization; see
each migration file's own header for full detail.

### Foundational schema lives in a separate repo

The tables the two ledger migrations above build on (`app.posts`,
`app.profiles`, `app.user_roles`, `app.audit_events`,
`app.building_scope_keys`, `app.college_scope_keys`,
`app.jurusan_scope_keys`, `app.media_assets`, `app.study_submissions`, the
`api.*_public` views, RLS/grants, etc. — 13 migrations) are **not** in this
repo. They live in a separate, differently-remoted local repo,
`EchoWall-Feature-Foundation` (remotes `gg122ma/e-wall.git` and
`gg122ma/wall.git`), branch `main`. No single repo currently reproduces the
full production schema from scratch — this is a known gap, not something
V2.4a attempted to fix.

## Canonical table architecture (current, as of V2.4a draft)

```
app.college_scope_keys        college_id smallint PK, code text
app.jurusan_scope_keys        jurusan_id smallint PK, college_id FK
app.building_scope_keys       building_id text PK (globally unique today),
                               college_id smallint FK, unique(building_id, college_id)
app.building_metadata         building_id text PK/FK -> building_scope_keys (V2.4a draft, NOT yet applied)
app.college_admin_assignments (user_id, college_id) PK -> auth.users / college_scope_keys (V2.4b1 draft, NOT yet applied; row existence = COLLEGE_ADMIN for that college, no role column)
app.profiles                  user_id uuid PK -> auth.users
app.user_roles                user_id, role app.app_role ('user'|'moderator'|'admin'), GLOBAL only, no college-scope column, UNCHANGED by V2.4b1
app.posts                     scope_type: 'global'|'college'|'jurusan'|'building'
app.post_votes
app.post_map_anchors          Map Post Directly anchors (post_id, lat, lng)
app.comments                  top-level + one-level replies (parent_comment_id), Community AND Building
app.media_assets              reserved for future Cloudinary integration; not used by any frontend code yet
app.study_subject_keys, app.study_submissions
app.audit_events              id/actor_user_id/event_type/target_type/target_id/metadata/created_at — schema exists, ZERO writers so far (no migration has ever inserted into it)
app.realtime_events           the ONLY table in the supabase_realtime publication
```

Sanitized public read views (schema `api`, owned by the dedicated
non-login `echowall_api_viewer` role, `security_barrier = true`, naming
convention `api.<table>_public`):

```
api.posts_public
api.comments_public
api.post_map_anchors_public
api.building_metadata_public   (V2.4a draft — not yet applied)
```

Browser roles (`anon`, `authenticated`) never get direct `SELECT` on an
`app.*` table — only on the matching `api.*_public` view.

## Realtime

- The `supabase_realtime` publication carries **exactly one** table:
  `app.realtime_events`.
- Raw `postgres_changes` subscriptions on `app.posts`/`app.comments`/
  `app.post_votes` are never used.
- `services/community-realtime-service.js` owns the single channel
  (`community-realtime-events`) per app session; it routes each sanitized
  signal row to the right scope/post and triggers an authoritative
  refetch — never a raw cache mutation from the signal payload itself.
- V2.4a's `app.building_metadata` is deliberately **not** added to the
  realtime publication (no write path exists yet to make it meaningful).
- V2.4b1's `app.college_admin_assignments` is likewise never added to the
  realtime publication — it is pure server-side authorization state, never
  broadcast to any client.

## College-scoped Building admin authorization (V2.4b1)

The V2.4A audit flagged that `app.user_roles.role` is a flat 3-value enum
(`user`/`moderator`/`admin`) with no college-scope column, so it cannot
express "COLLEGE_ADMIN of college 1" vs "college 2". V2.4b1 resolves this
**at the authorization-primitive level only** — it does not touch
`app.user_roles` at all.

**Critical security decision — read this before changing anything here:**
a college-scoped admin assignment must NEVER be encoded by inserting
`role = 'admin'` into `app.user_roles` for that user. The existing
`private.has_active_role(p_user_id, p_roles app.app_role[])` helper (used
elsewhere, unchanged, unaffected by V2.4b1) treats `app.user_roles.admin`
as a **GLOBAL** role — any row with `role = 'admin'` there grants that user
admin access to *every* college, everywhere `has_active_role(..., ['admin'])`
is checked. Encoding a per-college assignment that way would be a
privilege escalation, not a scoping mechanism.

Instead, V2.4b1 adds one new, separate, purpose-specific table:

```
app.user_roles                 -> user / moderator / admin — GLOBAL role contract, UNCHANGED
app.college_admin_assignments  -> (user_id, college_id) — COLLEGE-SCOPED COLLEGE_ADMIN contract, new and additive
```

A row in `app.college_admin_assignments` (with `disabled_at is null`)
means exactly "this user is the Building-metadata admin for this one
college" — no role column, because the table's existence is the
assignment. It never implies `admin`, `moderator`, `GLOBAL_MODERATOR`,
`STUDY_MODERATOR`, or `CONTENT_REVIEWER`.

Two new `private.*` SECURITY DEFINER helpers (never exposed through the
`api` schema):

- `private.has_active_college_admin(p_user_id, p_college_id)` — true iff an
  active `app.college_admin_assignments` row matches exactly that user and
  college.
- `private.can_manage_building_metadata(p_user_id, p_college_id)` — the
  primitive a future V2.4b2 `api.update_building_metadata` RPC will call:
  true iff `private.has_active_role(p_user_id, ARRAY['admin'::app.app_role])`
  (global admin, every college) **or**
  `private.has_active_college_admin(p_user_id, p_college_id)` (that
  college's own admin). `moderator` is deliberately never included — a
  Community/Global moderator has no Building-metadata authority.

Frontend role mapping (documentation only — no UI/backend integration
yet): frontend `SUPER_ADMIN` → future backend global `app.user_roles.admin`;
frontend `COLLEGE_ADMIN` → `app.college_admin_assignments`; frontend
`GLOBAL_MODERATOR`/`STUDY_MODERATOR`/`CONTENT_REVIEWER` → unrelated to
Building-metadata authority.

**Still not implemented** (out of scope for V2.4b1): any RPC to
grant/revoke/disable a `college_admin_assignments` row — role-management
writes need their own audit/admin design and are tracked for a later
stage. No production assignment rows exist yet.

**V2.4b1.1 ACL hardening (resolved):** V2.4b2's own security review found
that neither `private.has_active_college_admin` nor
`private.can_manage_building_metadata` had an explicit `grant execute ...
to service_role` (both already correctly had `revoke execute ... from
public, anon, authenticated`, so this was a missing grant — too
restrictive, never a security hole; V2.4b2's RPC was never affected by it,
since it runs `security definer` owned by the same role that owns these
helpers). `supabase/migrations/20260905160000_college_admin_private_helper_acl.sql`
closes this gap with an explicit, exhaustive revoke-then-grant for both
functions (PUBLIC/anon/authenticated: no execute; service_role: execute) —
no function logic, table, or other object was touched. Local draft, not
yet applied to production.

## Building metadata update RPC (V2.4b2)

`api.update_building_metadata(p_building_id, p_description, p_purpose,
p_special_notes, p_localized_alias, p_hours, p_expected_updated_at default
null)` — the one authenticated mutation entry point for
`app.building_metadata`. `SECURITY DEFINER`, `SET search_path = ''`, ACL
matches this project's established mutation-RPC convention exactly
(`revoke ... from public, anon; grant execute ... to authenticated,
service_role;`, mirrored verbatim from `api.create_post`/`api.create_comment`).

Key contracts (see the migration file's own header for full detail):

- **Authorization**: `private.require_active_user()` for identity, then
  college is derived server-side from `app.building_scope_keys` by
  `p_building_id` — the RPC does **not** accept a `p_college_id` parameter,
  so a caller can never pick an easier scope than the Building actually
  belongs to. Authorized only via `private.can_manage_building_metadata`;
  rejects with SQLSTATE `42501` and a generic message that never reveals
  which college(s) the caller does or doesn't administer.
- **Full-row save, not PATCH**: all five fields are always written from
  the five parameters; a `NULL` parameter is stored as a real `NULL`
  (static fallback), never treated as "leave unchanged". A future Admin UI
  must load the actual override row (not the effective/merged
  presentation) before saving.
- **Optimistic concurrency** on `updated_at`: no existing row requires
  `p_expected_updated_at IS NULL`; an existing row requires it to exactly
  match (checked after `SELECT ... FOR UPDATE` locks the row). Every
  stale/conflict outcome — including the concurrent "two callers both saw
  no row" race, caught as a `23505` unique-violation on the primary key —
  uses the same SQLSTATE `40001` and message ("Building metadata changed.
  Reload and retry."), chosen because `40001` was otherwise unused in this
  project.
- **No-op saves** (all five incoming values `IS NOT DISTINCT FROM` what's
  stored) leave `updated_at`/`updated_by` untouched and write no audit
  event — repeated identical Saves are idempotent.
- **Missing row + all-five-NULL is rejected** (`22023`) rather than
  creating an empty override row, since that would be semantically
  identical to having no row at all.
- **Audit**: exactly one `app.audit_events` row per real mutation, in the
  same transaction as the metadata write (no separate try/catch — an audit
  failure rolls back the mutation too). `event_type =
  'building_metadata_updated'`, `target_type = 'building'`, `target_id =
  p_building_id`, `metadata = {college_id, operation, changed_fields}` —
  `changed_fields` is computed server-side via `IS DISTINCT FROM` and
  contains only field *names*, never any Building content/translation
  text, email, or display name.
- **Returns** `SETOF api.building_metadata_public` only — `updated_by` and
  the audit row are never exposed to the caller.

**Still not implemented** (tracked for later stages): any
`api.grant_college_admin`/`revoke`/`disable` role-management RPC, any
Admin UI, and no frontend code calls this RPC yet (V2.4c will wire the
Admin editor UI to it).

## Branch / freeze rules

- `main` stays frozen at `ab838a7782c1b98fe64bcc01b03e0cb89dc9788e`
  (tag `innostem-2026-production-freeze`). Do not merge `backend-v2` into
  `main` or push to it without explicit authorization.
- All Backend V2.x work happens on `backend-v2`. Do not amend existing
  commits on that branch; each stage is one or more new commits.
- The production GitHub Pages frontend (`https://gg122ma.github.io/Echowall/`,
  repo `gg122ma/Echowall`, branch `main`) is locked to the pre-V2.2 static
  build — verified by `scripts/test-production-url-lock.mjs`. `backend-v2`
  work is tested locally (`scripts/build-pages.mjs` → `dist/pages`, served
  locally) against the **real** production Supabase project, never against
  deployed GitHub Pages.
- Never apply a `backend-v2` migration to production, and never push/merge/
  deploy, without the project owner's explicit, per-round authorization.
