# Claude Data / Auth / RLS Review

> Planning only — no schema, RLS policy, or Supabase project created. Cross-reference `CLAUDE_PRODUCTION_ARCHITECTURE_REVIEW.md` for the overall target architecture and `CLAUDE_ARCHITECTURE_DECISIONS.md` for confirmed vs. open decisions.

---

## 1. Logical schema (recommended direction, not final DDL)

### 1.1 `profiles`
`id uuid references auth.users primary key, display_name text, education_org_id text, education_major_id text, education_start_year int, created_at, updated_at`.
Mirrors `auth-service.js`'s current `updateProfile()` fields exactly (education status/org/major/start year were added to the prototype after the July doc — must be carried forward, not dropped). No password data — Supabase Auth owns credentials entirely.

### 1.2 `posts` (unifies community + building notes)
```
id uuid pk default gen_random_uuid()
author_id uuid references auth.users            -- server-set from auth.uid(), never client-supplied
context_type text check (context_type in ('community','building'))
post_type text check (post_type in ('discussion','question'))   -- building posts: null or 'discussion' only
community_scope text check (community_scope in ('global','college','jurusan'))   -- community posts only
org_id text, major_id text                        -- community posts only, validated against static org/major set
place_id text                                       -- building posts only
category text check (category in ('academic','koko','campus_life','emotional'))
content text check (char_length(content) between 1 and 500)
is_anonymous boolean not null
author_nickname text                                -- required if is_anonymous = false, forced null if true (mirror EchoNoteStore validation)
shape text, color text, rotation numeric, position_x numeric, position_y numeric
image_url text, image_public_id text, image_name text, image_crop_scale numeric, image_fit text check (image_fit in ('cover','contain'))
question_status text check (question_status in ('open','solved'))   -- only meaningful when post_type='question'
is_hidden boolean not null default false
is_seed boolean not null default false
seed_source text, seed_version text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

check (
  (context_type = 'community' and place_id is null and community_scope is not null)
  or
  (context_type = 'building' and place_id is not null and community_scope is null and org_id is null and major_id is null)
)
```
`upvotes`/`downvotes`/`score` are **not** stored columns — see §1.3. `imageDataUrl` (Data-URL local fallback) is **deliberately not in the production schema** — see `CLAUDE_MEDIA_STORAGE_STRATEGY.md` on disabling that fallback path in production.

### 1.3 `note_votes`
```
note_id uuid references posts(id) on delete cascade
user_id uuid references auth.users on delete cascade
value smallint check (value in (-1,1))
updated_at timestamptz not null default now()
primary key (note_id, user_id)
```
This is genuinely new — no prototype equivalent exists (confirmed by two independent source passes; only a single unkeyed `userVote` field exists on the note object today). `score` is computed (`sum(value)` via a view or a maintained counter updated transactionally by the vote RPC — see §5). This is the single largest real behavior change in the whole migration, not a mechanical RLS wrap: the client-side toggle/switch/clear logic in `app-wall.js::voteNote()` (same-vote clears, different-vote swaps and adjusts both counters) needs to become one atomic upsert/delete RPC.

### 1.4 `comments`
```
id uuid pk default gen_random_uuid()
post_id uuid references posts(id) on delete cascade
parent_comment_id uuid references comments(id) on delete cascade
depth smallint not null check (depth in (0,1))
author_id uuid references auth.users
is_anonymous boolean not null
author_nickname text
content text check (char_length(content) between 1 and 500)
moderation_status text check (moderation_status in ('published','pending','flagged','rejected')) default 'published'
is_hidden boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```
Trigger or RPC guard reproducing `comment-service.js`'s exact rule: `parent_comment_id`'s own `depth` must be `0`, else reject with the same message class the UI already expects ("Replies can only be one level deep."). **Note the confirmed prototype gap:** `moderation_status`/`updated_at` exist in the current schema but nothing ever writes to them after creation — no edit/delete/hide function exists yet in `comment-service.js`. Production should decide (open decision, see `CLAUDE_ARCHITECTURE_DECISIONS.md`) whether to implement comment moderation now (recommended, since `moderation_service.js`'s `CONTENT_TYPES` already lists `"comment"` as a valid type with only a "no live backing UI" gap) or explicitly defer it — either way, don't leave the column silently unused in production without a decision recorded.
`comment_count` is **not** a stored/synced column — the prototype's own `note.commentCount` field is confirmed dead code (written once at creation, never incremented, every real consumer calls `CommentService.getCommentCount()` live). Reproduce as a `count(*)` view or a materialized counter maintained by trigger — do not resurrect a manually-synced integer field, which is exactly the bug class the prototype avoided by design.

### 1.5 `map_note_anchors`
```
note_id uuid references posts(id) on delete cascade primary key
place_id text not null
lat double precision not null
lng double precision not null
created_at timestamptz not null default now()
```
Direct port of `echowall_map_note_anchors_v1`. The `place_id` redundancy against the parent post's `place_id` is intentional — the prototype's own `aggregate()` function only surfaces a map pin when both match, as a defense against stale anchors; keep the same defensive check (`CHECK` or application-level re-validation) in production.

### 1.6 `study_resources` (built-in catalog — read-mostly reference data)
Effectively a structured mirror of the generated `data/study-resource-manifest.js`: `id, jurusan, semester, subject_code, resource_type, resource_subtype, topic, year_start, year_end, exam_session_label, source_college, source_type, file_url (nullable), storage_path (nullable), demo_available boolean, related_resource_id, resource_group_id`. **No `college` grouping/query column beyond `source_college` as inert metadata** — this is a hard, code-enforced product constraint (`data/study-subjects.js`'s own header explicitly forbids ever reintroducing a college-grouped Study query; `study-resource-service.js` repeats the same prohibition). Whether this table is populated by a one-time import of the generated manifest or continues to be the frontend-static JS file is a storage-strategy decision — see `CLAUDE_MEDIA_STORAGE_STRATEGY.md §Study PDF decision`.

### 1.7 `study_submissions`
```
id uuid pk, contributor_id uuid references auth.users
title, jurusan, semester, subject_code, resource_type, resource_subtype, topic, year_start, year_end, exam_session_label, source_college, source_type, description text
related_resource_id uuid, resource_group_id uuid
moderation_status text check (in ('pending','approved','rejected')) default 'pending'
verification_status text check (in ('unverified', ...))
review_status text default 'auto_parsed'
rejection_reason text
file_hash text     -- sha256, server-recomputed and verified, not trusted from client
storage_path text  -- Supabase Storage object path once uploaded
created_at, updated_at
```
Direct port of the confirmed IndexedDB submission shape. `getApprovedResourcesSync()`'s strict `moderation_status = 'approved'` filter becomes the RLS read policy for the public catalog view (§3).

### 1.8 Admin/moderation/audit — the strongest "reuse the prototype design" opportunity

These three tables are near-literal ports of already-shipped prototype object shapes (`RoleAssignment`, `ModerationItem`, `AuditAction`), because the prototype's Admin V2 layer was deliberately designed to mirror a future Supabase schema (confirmed via source: file headers in `admin-permission-service.js`, `moderation-service.js`, `admin-audit-service.js` all state this explicitly).

**`user_roles`**
```
id uuid pk, user_id uuid references auth.users, role text check (role in ('super_admin','global_moderator','college_admin','study_moderator','content_reviewer'))
scope_type text check (in ('global','college','study','system')), scope_id text
permissions text[] , status text check (in ('active','disabled')) default 'active'
granted_by uuid references auth.users, granted_at timestamptz, updated_at timestamptz
```
Note: the prototype's `LEGACY_ADMIN` pseudo-role and the two hardcoded bootstrap emails (`SUPER_ADMIN_EMAIL`, `PROTOTYPE_ADMIN_EMAILS`) must **not** be ported into this table's seed data — see §3.6 (critical finding) and `CLAUDE_ARCHITECTURE_DECISIONS.md` for the required first-admin process.

**`moderation_items`**
```
id uuid pk, content_type text check (in ('post','comment','event','review','study_resource','map_note'))
content_id uuid, scope_type text, scope_id text, reason text, source text check (in ('submission','report','auto_flag','admin'))
risk_score numeric, status text check (in ('pending','approved','rejected','hidden','escalated'))
assigned_to uuid references auth.users, created_by uuid references auth.users
created_at, updated_at, resolved_at
```
State machine (`ALLOWED_TRANSITIONS`, port verbatim from `moderation-service.js`): `pending → approved|rejected|hidden|escalated`; `escalated → approved|rejected|hidden`; `hidden|rejected → pending` (reopen). Enforce via a `CHECK` + trigger or an RPC that validates the transition, not a bare `UPDATE`.

**`moderation_reports`**
```
id uuid pk, reporter_id uuid references auth.users, content_type text, content_id uuid, scope_type text, scope_id text
category text, details text, status text, created_at timestamptz
```
Dedupe logic (`ensureModerationItemForReport`: a repeat report bumps `risk_score` instead of creating a duplicate queue row) should become a `ON CONFLICT`-style upsert or an RPC, not client-side dedup.

**`audit_actions`** (append-only by grant, not just convention)
```
id uuid pk, actor_id uuid references auth.users, actor_email text, action text check (in ('approve','reject','hide','restore','delete','escalate','verify','edit_approve','grant','disable','enable','revoke','assign','unassign'))
target_type text check (in ('post','map_note','study_resource','role_assignment','report'))
target_id uuid, scope_type text, scope_id text
before_snapshot jsonb, after_snapshot jsonb, reason text, created_at timestamptz not null default now()
```
Two things worth preserving exactly from the prototype's design, because they're genuinely good and non-obvious:
1. **Audit-first ordering.** Every real moderation action in the prototype writes the audit record *before* committing the underlying mutation, and the mutation aborts if the audit write fails ("if audit persistence can't write, the mutation must fail" — verbatim design comment, `admin-audit-service.js`). Reproduce this in production as a single transactional RPC per moderation action (write `audit_actions` + the content's visibility/status change in the same transaction), not two separate calls from the client.
2. **Snapshot redaction.** `sanitizeSnapshot()` strips any key matching `/password|token|secret|blob|base64|filedata|filebytes|pdfbytes/i` and truncates/redacts long or base64-shaped string values before storing `before_snapshot`/`after_snapshot`. Reproduce server-side (in the RPC, not client-side) so a malicious client can't bypass redaction by calling the underlying table write directly — this is exactly the kind of check that must move from "JS convention" to "the only path in is the RPC, and RLS blocks direct table writes."
3. Production makes this table **genuinely** append-only: grant `INSERT` only (via the RPC/`SECURITY DEFINER` function), no `UPDATE`/`DELETE` grants to any role including admins — the prototype could only *simulate* append-only in LocalStorage; Postgres can enforce it for real.

### 1.9 Static reference validation (organizations/majors/buildings/jurusan/subjects)

Per `CLAUDE.md`'s existing mandate, these stay frontend-owned static files. The database still needs to reject a `posts.org_id`/`major_id`/`place_id` or `study_submissions.jurusan`/`subject_code` that doesn't correspond to a real static entry. Recommended: a small `CHECK` against a `reference_orgs`/`reference_majors`/`reference_buildings`/`reference_jurusan_subjects` lookup table that is populated once from the existing static JS files and only updated when those files change (not a live-editable copy, not queried by the UI — purely a server-side validation aid). This resolves `docs/BACKEND_INTEGRATION_READINESS.md §5.1`'s previously-open "final mechanism... requires a schema decision."

---

## 2. RLS and grants matrix

RLS enabled on every table above. Roles: `anon`, `authenticated`, and role checks performed via `user_roles` (never `auth.users.raw_app_meta_data` directly from the client, never `user_metadata` — client-editable and therefore not a trust boundary, per current Supabase guidance).

| Table / operation | `anon` | `authenticated` (non-owner) | owner | admin (role-scoped) |
|---|---|---|---|---|
| `posts` read (public projection, no `author_id`) | Allow | Allow | Allow | Allow, incl. hidden |
| `posts` insert | Deny | Allow, `WITH CHECK (author_id = auth.uid())`, server validates context shape | — | Allow (moderation-flagged create, rare) |
| `posts` update content | Deny | Deny | Allow own, only within an explicit edit-window decision (open — see decisions doc) | Deny direct update; hide/reject via `moderation_items` RPC only |
| `posts.question_status` toggle | Deny | Deny | Allow if `post_type='question' and author_id=auth.uid()` | Allow if scope matches (`global` always; `college`/`jurusan` only within their own `org_id`) — mirrors `canUserMarkSolved()` exactly |
| `posts` hide/delete | Deny | Deny | Deny (no self-delete confirmed in current UX — verify with owner) | Allow via `moderation_items`/audit RPC only, scope-checked |
| `note_votes` read | Aggregate only (via view) | Aggregate + own row | Aggregate + own row | Aggregate + own row |
| `note_votes` upsert/delete | Deny | Allow own `(note_id, user_id)` only, via RPC that also updates `posts.score` cache transactionally | — | Decision required: can admins vote? (recommend: yes, no special case, matches current prototype which doesn't exclude admins from voting) |
| `comments` read | Allow published, not hidden | Allow published, not hidden | + own pending/flagged | Allow all |
| `comments` insert | Deny | Allow, `WITH CHECK (author_id = auth.uid())`, depth guard via trigger | — | Allow |
| `comments` hide/moderate | Deny | Deny | Deny | Allow via moderation RPC (**open decision** — prototype has the field but no write path yet) |
| `map_note_anchors` read | Allow (via `posts` join, same visibility as the post) | Allow | Allow | Allow |
| `map_note_anchors` insert | Deny | Allow only alongside a `posts` insert with matching `place_id`, ideally same RPC/transaction | — | Allow |
| `study_resources` read | Allow (built-in catalog is public) | Allow | — | Allow |
| `study_submissions` read | Deny (pending is private) | Own submissions only | Own | Allow (`STUDY_MODERATOR`/`SUPER_ADMIN` scope) |
| `study_submissions` insert | Deny | Allow, `WITH CHECK (contributor_id = auth.uid())` | — | Allow |
| `study_submissions` approve/reject | Deny | Deny | Deny | Allow via RPC only (moderation + audit transactional write) |
| `user_roles` read | Deny | Own row(s) only | — | `AUDIT_READ_ALL`/`ADMIN_MANAGE` scoped |
| `user_roles` write | Deny | Deny | — | `SUPER_ADMIN` only, via a `SECURITY DEFINER` RPC with fixed `search_path`, never direct table grant |
| `moderation_items`/`moderation_reports` | Deny | Deny (create via RPC triggered by report action only, not direct insert) | — | Scope-checked read/update via RPC |
| `audit_actions` | Deny | Deny | — | Insert only via RPC (system-authored); read scoped by `AUDIT_READ_ALL`/matching scope, mirroring `canAccessAuditScope()` |

Additional requirements carried forward from `docs/BACKEND_INTEGRATION_READINESS.md §5.3` (still correct, now extended):
- Public reads must never expose `author_id` for an anonymous post/comment. Use a `security_invoker` view (current Supabase/Postgres guidance — `security_invoker = true` on the view so it inherits the *querying* user's RLS rather than the view owner's) for the public projection, and revoke direct `SELECT` on the base table's `author_id` column from `anon`/`authenticated` where anonymity applies.
- Any `SECURITY DEFINER` function (needed for the vote RPC, the moderation-transition RPC, the audit-write RPC, and the role-grant RPC) **must** pin `SET search_path = ''` and fully qualify every object reference — current Postgres/Supabase guidance flags an unpinned search path as a real privilege-escalation vector (a caller-controlled schema could shadow an unqualified table name). This is not optional hardening; it's the specific mechanism the prototype's own `AdminPermissionService` header worries about when it says "bypassed... from the console" — the production equivalent failure mode is a shadowed function.
- Test every policy as: `anon`, ordinary `authenticated`, owner, a different authenticated user, and each admin scope — explicitly including an attempt to read another user's `author_id` on an anonymous post, overwrite `score`/`upvotes` directly, reassign `author_id`, self-grant a role, and moderate content outside one's scope (e.g., a `college_admin` for KMK attempting to hide a KMPP post — this exact scenario is already a named, tested case in the prototype's `AdminPermissionService`, `canModerateCollegeContent()`).

---

## 3. Supabase Auth parity review

| Concern | Current local UX | Production plan | Parity exception? |
|---|---|---|---|
| Register | Email/password/display-name modal, client SHA-256 hash | Supabase `signUp()`, same modal UI, same fields | No visible change |
| Login | Email/password modal | `signInWithPassword()` | No visible change |
| Logout | Clears `echo-wall-user-session:v1` | `signOut()` | No visible change |
| Session persistence | LocalStorage, **no expiry**, no refresh | Supabase JS auto-refreshes; session eventually expires per token lifetime | **PARITY EXCEPTION** — reason: real security requires token expiry; impact: a user inactive long enough is signed out and must re-auth (current prototype never does this); mitigation: silent refresh keeps normal sessions alive indefinitely in practice, only truly long-idle sessions are affected; user approval needed: no (security-necessary, low visible impact) |
| Profile bootstrap/update | `updateProfile()` writes education fields to the local user record | `profiles` table + Supabase Auth user, same fields, same UI | No visible change |
| Password reset | **Does not exist in the current prototype at all** (confirmed — no reset flow found in `auth-ui.js`) | New: `resetPasswordForEmail()` + redirect page | This is a **net-new capability**, not a parity exception — nothing to preserve, only to add safely (redirect URL must be in the Supabase allowlist and match the final Pages URL) |
| Email confirmation | N/A (no email verification concept in the prototype) | **Open decision** — `docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md §2.3` already flagged this as unresolved in July; still unresolved. Recommend **on** (standard abuse-resistance), but this changes registration UX (a "check your email" state that doesn't exist today) — **PARITY EXCEPTION** if enabled: reason, real accounts need verification; impact, new UI state after registration; mitigation, keep it minimal (one message, no new page); needs user approval: **yes** |
| Auth redirect URLs | N/A (no OAuth/redirect flow exists) | Supabase Site URL + Redirect URL allowlist must be set to the final GitHub Pages project-site URL (pending §0's repo-name discrepancy being resolved) with the exact PKCE callback path | Blocked on the hosting decision in `CLAUDE_ARCHITECTURE_DECISIONS.md` |
| Anonymous/named posting | Client-side toggle, `authorNickname` forced null when anonymous | Same UI; server enforces the same null-when-anonymous rule via `CHECK`, and RLS/view hides `author_id` from public reads regardless of the toggle | No visible change |
| Role lookup | `isCurrentUserAdmin()` → `AdminPermissionService.canAccessAdminPanel()` | Same call shape, backed by `user_roles` RLS-scoped read instead of LocalStorage | No visible change (Admin UI itself deferred anyway) |
| Protected writes | Client-side `PermissionService.canUserPost()` = `Boolean(user)`, explicitly documented as bypassable | RLS `WITH CHECK (author_id = auth.uid())` is the real boundary; client check stays only as UX (fast-fail before a round trip) | No visible change, security posture only |

**Do not migrate seed/demo authors as real users** — confirmed no such migration is planned or needed; seed posts have no real `auth.users` backing today and shouldn't gain one. See §4.

---

## 4. Seed/demo vs. real data

**Confirmed: no `is_seed`/`seed_source`/`seed_version`-style field exists anywhere in the current schema.** Current seed/demo separation relies on three different implicit mechanisms, none of which is a stored provenance field:

1. A strict hash/count-validated activation path for the legacy 696-note bundle (`validatePortableDemoSeedBundle`).
2. `assignDefaultSeedEngagementScores()` in `app-data.js` — recomputes engagement scores by *signature-matching* against a fixed default-note list on every load, explicitly to protect real user posts from ever being mistaken for seed content. This is clever but implicit; production should replace it with an explicit column, not port the signature-matching approach.
3. Seed notes are `Object.freeze()`-d at activation time in the browser, which is *why* voting/solved-toggle silently no-op on them today — a storage-layer side effect, not a deliberate "read-only" product policy. This exact mechanism obviously cannot and should not survive into a real database; production instead needs an explicit `is_seed = true` check in the vote/solved RPCs that rejects the mutation with a clear message (or simply excludes seed rows from the tables those RPCs touch, if seed data is imported as pre-scored, non-interactive display data rather than live rows — this is an **open decision**, see `CLAUDE_ARCHITECTURE_DECISIONS.md`, because the 2026-08-23 change made seed posts *comment/reply/solved-interactive* while leaving *voting* frozen, which is a real, deliberate, and slightly unusual product distinction to decide whether to keep).

**Recommendation:** add `is_seed boolean default false`, `seed_source text`, `seed_version text` to `posts` (and `study_resources`, since the built-in catalog is conceptually seed-equivalent). Requirements per the master task spec, restated as concrete rules:
- Seed import must be idempotent (`ON CONFLICT (seed_source, legacy_id) DO NOTHING` or similar stable-key upsert) so re-running the importer never duplicates rows.
- Seed scores must be visibly distinct or excluded from any future "real engagement" analytics/dashboard.
- No seed `auth.users` accounts — seed posts get a nullable `author_id` (or a single well-known system UUID) plus `legacy_author_label` for display, never a real account.
- `data/demo-display-counts.js`'s hand-authored display numbers (College total 593, Building total 377, homepage's hardcoded 1017/12/53/"Aug 25, 2026") must **not** silently become production analytics — these are marketing-style overrides today, confirmed via source (`app-router.js::renderHome()` hardcodes literals directly). Production should either compute these for real once genuine usage exists, or explicitly gate the override behind an `is_seed`-aware "demo mode" flag that is off in production — this is a concrete, code-level instance of the exact risk the master task's §12 warns about, not a hypothetical one.
- Do not change current visible demo behavior as a side effect of this migration unless necessary — i.e., the seeded homepage/community stats can keep showing curated numbers at launch if the owner wants that, but the *mechanism* must become an explicit, documented "demo copy" setting rather than an implicit hardcoded literal indistinguishable from real data.

---

## 5. Multi-system failure design (vote/comment/moderation specific — see `CLAUDE_INTERFACE_GOVERNANCE.md §Failure design` for the full cross-system list)

- **Vote race / double-click:** the vote RPC must be a single atomic `upsert ... on conflict (note_id, user_id) do update` (toggle/switch/clear logic moved server-side, matching `voteNote()`'s existing same-vote-clears / different-vote-swaps semantics) so two rapid clicks from the same user resolve deterministically rather than double-counting.
- **Comment duplication (double-submit):** client should generate a draft/idempotency key (e.g., a UUID generated client-side and sent with the insert, unique-constrained) so a network retry after a lost response doesn't create two identical comments — no such protection exists in the current prototype (a second `createComment()` call would happily create a duplicate) and should be added in production since server round-trips introduce new duplicate-submit risk that didn't meaningfully exist with synchronous LocalStorage writes.
- **Session refresh mid-post:** since Supabase sessions now expire (unlike the prototype's never-expiring session), a token refresh happening mid-submit must not silently drop the post — the client should await `AuthService.ready()`-equivalent before submit and surface a clear re-auth prompt rather than a generic failure if the refresh fails.
