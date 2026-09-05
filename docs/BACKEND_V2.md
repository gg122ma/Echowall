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
| V2.4a | Current (local implementation, not yet applied to production) | Building metadata read-model + static fallback (`app.building_metadata`, `api.building_metadata_public`) — read-only, no admin write path yet |
| V2.4b1+ | Not started | Scoped Admin write authorization (blocked on the `app.user_roles` college-scope gap below) |

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
(V2.4a) is a **local draft only** — not applied to production. Do not apply
it without explicit authorization; see the migration file's own header for
full detail.

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
app.profiles                  user_id uuid PK -> auth.users
app.user_roles                user_id, role app.app_role ('user'|'moderator'|'admin'), no college-scope column
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

## Known architectural gap (flagged by the V2.4A audit, not fixed yet)

`app.user_roles.role` is a flat 3-value enum (`user`/`moderator`/`admin`)
with **no college-scope column**. It cannot express "COLLEGE_ADMIN of
college 1" vs "college 2". A rich, already-correct per-college permission
model (`COLLEGE_BUILDING_MODERATE`, `canModerateCollegeBuilding`, etc.)
already exists in `services/admin-permission-service.js`, but it is bound
to the legacy LocalStorage `AuthService`, not `SupabaseAuthProvider` (which
does not read `app.user_roles` at all today — every Supabase-authenticated
user resolves to `role: "user"` client-side). Any future Building-metadata
**write** RPC (V2.4b1+) needs this gap resolved first; V2.4a has no write
path and does not depend on it.

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
