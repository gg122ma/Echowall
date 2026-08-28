# EchoWall production Supabase schema and RLS contract

Status: implementation plan, not an applied migration  
Assumptions reviewed: 2026-08-29 (Asia/Singapore)  
Scope: PostgreSQL/Supabase Auth, Data API, Storage, row-level security, moderation, audit, and deterministic seed import. This document deliberately does not design or authorize an Admin UI.

## 1. Decision summary

Use three database schemas:

- `app`: canonical tables. It is **not** in Data API Exposed Schemas.
- `api`: the only application schema exposed through the Data API. It contains explicit-column `security_invoker` views and narrowly scoped RPC wrappers. Some safe public views contain caller-relative booleans and are intentionally read-only.
- `private`: authorization helpers, trigger functions, and transactional implementations. It is never exposed.

The browser receives only the Supabase project URL and a publishable key. It authenticates with Supabase Auth and sends the user's JWT. A `service_role` key or secret key must never be present in HTML, JavaScript, source maps, local storage, or a public CI artifact. Seed imports, malware/file validation, retention purges, and role provisioning run from migrations or trusted server-side jobs.

This layout is intentional. A public post needs an internal `author_id` so RLS can enforce ownership, but that UUID must not be returned when the author chose anonymous display. RLS is row-level, not conditional column masking. Therefore `app.posts.author_id` is omitted from `api.posts`; the same rule applies to comment and media ownership. Do not expose `app` later as a shortcut.

Use direct Data API access where an ordinary row-local operation and RLS are sufficient:

- read public/owner projections;
- update the signed-in user's profile;
- optionally create a Community comment or one-level reply through the thin idempotent wrapper described below; no raw author/name fields are accepted.

Use RPCs where a race, multi-table invariant, privileged audit write, or file lifecycle exists:

- publish an ordinary Community or unanchored Building post, with an optional confirmed Cloudinary media reservation;
- publish a map-authored Building post plus one anchor, with an optional confirmed Cloudinary media reservation;
- create a comment/reply idempotently and return the masked projection;
- set/remove a vote;
- solve/reopen a question with compare-and-set authorization;
- register/withdraw a Study submission;
- report content;
- moderate a queue item;
- approve/reject/verify a Study submission.

Cloudinary signing and response confirmation are authenticated Edge Functions because they require the Cloudinary API secret; PostgreSQL stores metadata only and atomically attaches a confirmed reservation during publish. Supabase Storage is used only for Study PDFs.

There is no ordinary launch UPDATE or DELETE path for posts or comments: no UI, grant, policy, or owner RPC. A later product decision may add audited owner methods in a new migration, but v1 exposes only creation, voting, and guarded question-status changes. Role assignments are provisioned only by migration/SQL or a trusted service. There is no browser role-management endpoint or Admin UI in this plan.

## 2. Current-local parity that the migration must preserve

The current browser application was inspected before drafting this contract. Production must preserve these facts while replacing browser trust with database constraints:

- Notes are one unified content concept with `context_type = community | building`.
- Community scopes are exactly `global`, `college`, and `jurusan`:
  - Global: no college and no jurusan.
  - College: a college and no jurusan.
  - Jurusan: a valid college/jurusan pair.
- Post types are exactly `discussion | question`; only questions have `question_status = open | solved`.
- Launch categories are exactly `academic | koko | campus_life | emotional`; do not add an `other` category that the current UI cannot author or render consistently.
- Existing seed rotations occupy integer `-6..6`; the current composer creates only integer `-2..2`. The table preserves `-6..6`, while user publish RPCs enforce integer `-2..2`.
- Comments exist only for Community posts. A comment is either depth 0 or a depth-1 reply to a depth-0 comment on the same post. Building posts have no comments.
- “Anonymous” is display anonymity by an authenticated account. It is not an unauthenticated write and not Supabase anonymous Auth. Production writes require a non-anonymous signed-in Auth user.
- The prototype stores one `userVote` on each note per browser. Production instead enforces one `post_votes` row per `(post_id, user_id)`.
- Old direct map pins are separate legacy records. A new map-authored note is one canonical Building post plus exactly one `map_note_anchors` row. An ordinary Building Wall post has no anchor and therefore never appears on the map.
- The inspected runtime registers 32 buildings, of which exactly 19 currently have an eligible map footprint. Import all 32 catalogue rows, but set the map-authoring gate only on those 19 verified footprint rows; do not infer eligibility merely from a centroid or building name.
- Canonical user-authored posts have no batch concept. The current `batchId` is null/ignored on the canonical route; seed package/source-batch facts belong in seed provenance and are never accepted as post-write input.
- The Study browse hierarchy is Jurusan → Semester → Subject. `source_college` is resource metadata, never the primary Study grouping axis.
- Built-in Study manifest parity is `auto_parsed` public unless rejected/duplicate; `manual_review` is not public. User submissions start pending and become resources only through review.
- Current post seed inputs are:
  - `demo-seed-bundle.v1`: 696 posts across 17 walls, from the 588-post showcase plus 108 KMK Community posts;
  - `echowall-all-student-km-v1`: 67 independent Global/All-KM posts;
  - built-in defaults in `app-data.js`: 14 Community and 5 Building posts.
- The two frozen sources contribute 763 posts (`696 + 67`) and the built-in defaults contribute 19, so a fresh production import expects 782 post rows before real users write. Import by stable seed identity, not by local numeric IDs.
- The 763 frozen runtime rows have `seed_interaction_policy='read_only'`: comments remain available on Community seeds, but voting and solve/reopen are rejected. The 19 persisted defaults have `seed_interaction_policy='interactive'`: votes are allowed; question status still follows the current author-or-moderator rule (the imported defaults have no Auth owner, so an ordinary user cannot solve them).
- Seed engagement currently becomes deterministic display engagement. Production materializes that result as immutable seed base counts, then adds real user votes separately.

The Study source manifest currently contains 2,468 resource metadata rows (`2,318 auto_parsed`, `150 manual_review`), 36 exact duplicates, 238 linked question/scheme pairs, and 377 copied demo files. These counts are import assertions, not permanent product limits.

## 3. Dated Supabase assumptions and authoritative references

These assumptions were checked on 2026-08-29 and must be rechecked immediately before implementation:

1. Grants and RLS are separate gates. New projects now favor explicit Data API exposure, so every grant below is intentional; never assume a new table is automatically reachable. See [Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), and the [breaking-change changelog](https://supabase.com/changelog?types=breaking-change).
2. Every exposed view must use `security_invoker = true`; ordinary views otherwise use owner privileges and can bypass underlying RLS. This plan requires PostgreSQL 15 or newer. Fail the migration preflight if `current_setting('server_version_num')::int < 150000` rather than silently creating unsafe views. See [RLS: Views](https://supabase.com/docs/guides/database/postgres/row-level-security#views).
3. `auth.uid()` is wrapped in `select` inside policies so it is evaluated once per statement. Authorization is looked up from `app.role_assignments`, not `raw_user_meta_data`. Supabase user metadata is user-editable and must never grant a role.
4. Auth identities are referenced only through the `auth.users` primary key, normally with `on delete cascade` for profiles and `on delete set null` for retained authored content. See [User Management](https://supabase.com/docs/guides/auth/managing-user-data).
5. `SECURITY INVOKER` is the default and preferred function mode. The few `SECURITY DEFINER` functions live only in `private`, have `search_path = ''`, schema-qualify every object, validate `(select auth.uid())`, and have execution revoked by default. See [Database Functions](https://supabase.com/docs/guides/database/functions).
6. Supabase Storage is limited to Study PDFs. Storage objects receive `owner_id` from the JWT; legacy `owner` is deprecated. Storage upload policies and object ownership are described in [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) and [Storage Ownership](https://supabase.com/docs/guides/storage/security/ownership).
7. Database/RLS tests use pgTAP and `supabase test db`; every allow case needs a matching deny case. See [Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) and [Database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
8. User post photos use signed direct Cloudinary uploads, not Supabase Storage. The trusted confirmation function verifies the response signature and persists only allow-listed metadata. Recheck Cloudinary's [client-side upload](https://cloudinary.com/documentation/client_side_uploading), [authentication signature](https://cloudinary.com/documentation/authentication_signatures), [Upload API response](https://cloudinary.com/documentation/image_upload_api_reference), and [response-signature](https://cloudinary.com/documentation/response_signatures) contracts before implementation.

Deployment configuration is a hard gate: Data API Exposed Schemas must contain `api` and must not contain `app` or `private`. If that cannot be guaranteed, move the base tables to a separately owned database or remove all direct table grants and expose RPCs only.

## 4. Identity and authorization model

### User classes

- `anon`: no Auth user. Read-only public catalogue/content access.
- `authenticated`: a permanent signed-in Supabase Auth user. Supabase anonymous Auth sessions also use the Postgres `authenticated` role, so every write policy additionally rejects JWTs whose `is_anonymous` claim is true.
- `owner` / `contributor`: the authenticated UUID recorded internally on a post, comment, file, or submission.
- `college_moderator`: active `role_assignments.role = 'college_moderator'`, scoped to exactly one college. It does not imply Global Community or Study access.
- `study_reviewer`: active Study-scoped role. It does not imply Community/Map access.
- `global_admin`: active System-scoped role. It can moderate every scope and read the complete audit trail, but still uses audited RPCs rather than raw content updates.
- `trusted service`: migrations, database owner, or a server-side `service_role` client. It bypasses RLS, so explicit grants, secret isolation, and audit requirements remain mandatory.

Role changes are read from the database on each authorization check. This avoids stale JWT role claims. If custom access-token claims are later added for UI hints, they are never the authoritative RLS decision.

### Role and permission values

`role_assignments.role`:

- `college_moderator`
- `study_reviewer`
- `global_admin`

`permissions` is an optional narrowing/forward-compatibility array using only:

- `college_community_moderate`
- `college_building_moderate`
- `college_map_moderate`

For `college_moderator`, empty `permissions` means all three college capabilities; a nonempty array narrows that role. `study_reviewer` and `global_admin` must have an empty array in v1 because their role itself is the capability. A permission array never upgrades a role or expands its college scope.

## 5. Canonical table contract

All timestamps are `timestamptz` in UTC. All free-form strings are `text`; limits are `check` constraints. All foreign-key columns are indexed. Identity keys are `bigint generated always as identity`, except catalogue keys that need stable legacy imports use `generated by default as identity`.

### 5.1 Directory and profile tables

#### `app.colleges`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `bigint generated by default as identity` PK | Stable internal college ID; explicit legacy IDs may be imported. |
| `legacy_org_id` | `integer null` unique | Existing `app-data.js` organization ID. |
| `code` | `text not null` unique | Uppercase code such as `KMK`; 2–16 safe characters. |
| `name` | `text not null` | 2–160 characters. |
| `emoji` | `text null` | Display-only, at most 16 characters. |
| `is_active` | `boolean not null default true` | Hides retired directory rows without breaking FKs. |
| `community_enabled` | `boolean not null default true` | Whether Community scopes can be created/read. |
| `building_registry_enabled` | `boolean not null default false` | True only when verified building data exists. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |

Indexes: unique `lower(code)`; partial `(id) where is_active`; the PK covers ID lookups.

#### `app.jurusan`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `bigint generated by default as identity` PK | Stable internal Jurusan ID. |
| `legacy_major_id` | `integer null` unique | Existing major ID when one exists. |
| `college_id` | `bigint not null` FK `colleges(id)` `on delete restrict` | Community owner college. |
| `code` | `text not null` | Stable college-local code. |
| `slug` | `text not null` | Lowercase URL-safe identifier. |
| `name` | `text not null` | 2–120 characters. |
| `is_active` | `boolean not null default true` | Retired rows remain referentially valid. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |

Unique: `(college_id, code)`, `(college_id, slug)`, and `(id, college_id)` for composite FKs. Index: `(college_id, is_active)`.

#### `app.profiles`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `uuid` PK/FK `auth.users(id)` `on delete cascade` | Exactly one profile per Auth user. |
| `display_name` | `text not null default 'User'` | 2–50 characters; display only, never authorization. |
| `education_status` | `text not null default 'unset'` | `unset | current_student | alumni | non_student`. |
| `education_college_id` | `bigint null` FK | Required only for current student/alumni. |
| `education_jurusan_id` | `bigint null` FK | Composite FK with college guarantees the pair. |
| `education_start_year` | `smallint null` | 1980 through current year + 1, checked in write trigger. |
| `avatar_object_path` | `text null` | Private Storage path; never an authorization input. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |

Checks enforce the all-null education tuple for `unset/non_student`, the complete tuple for `current_student/alumni`, and `(education_jurusan_id, education_college_id) → jurusan(id, college_id)`. Profiles are owner-readable/owner-updatable only. Public content carries a display-name snapshot instead of joining public profile data.

### 5.2 Building catalogue

#### `app.buildings`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `text` PK | Existing stable key such as `B_PUSTAKA`. |
| `college_id` | `bigint not null` FK `colleges` `on delete restrict` | Makes Building/Map moderation college-scoped. |
| `name` | `text not null` | Canonical name. |
| `category`, `zone_id`, `emoji` | `text null` | Existing catalogue metadata. |
| `description_i18n`, `purpose_i18n`, `tags_i18n` | `jsonb not null default '{}'` | JSON objects keyed by `en`, `ms`, `zh`; arrays only under tag keys. |
| `floors` | `smallint null` | Positive when known. |
| `photo_manifest` | `jsonb not null default '[]'` | Read-only ordered photo metadata; no secrets. |
| `map_lat`, `map_lng` | `double precision null` | Both null or both valid WGS84 values. |
| `overview_polygon`, `map_footprint` | `jsonb null` | Existing lightweight Leaflet-compatible arrays; validate shape in importer. |
| `hours_mode` | `text not null default 'unavailable'` | `weekly | always_open | unavailable`. |
| `residents_only` | `boolean not null default false` | Applies to always-open residences. |
| `hours_note` | `text null` | Human-readable source note, not status logic. |
| `wall_enabled`, `map_enabled`, `is_published` | `boolean not null default false` | Separate feature/publication gates. `map_enabled` means a verified footprint may receive anchors; it implies a non-null `map_footprint` and is true for exactly 19 rows in the current snapshot. |
| `source_provenance` | `jsonb not null default '{}'` | Static EchoWall-owned snapshot provenance. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |

Unique `(id, college_id)` supports composite post FKs. Checks require `map_enabled = false` or a non-null array-valued `map_footprint`. Indexes: `(college_id, is_published)`, `(zone_id)`, partial `(college_id) where wall_enabled`, and partial `(college_id, id) where map_enabled and is_published`. Import assertions require 32 total building rows and 19 map-enabled rows for the inspected snapshot; these are versioned snapshot facts, not permanent product limits.

#### `app.building_hours`

| Column | Type / default | Contract |
|---|---|---|
| `building_id` | `text` FK `buildings` `on delete cascade` | Parent building. |
| `day_of_week` | `smallint` | `0..6`, Sunday through Saturday, matching current JS. |
| `is_closed` | `boolean not null default false` | Closed days have null times. |
| `opens_at`, `closes_at` | `time null` | Both present and `opens_at < closes_at` for open days. |
| `timezone_name` | `text not null default 'Asia/Kuala_Lumpur'` | Explicit interpretation timezone. |
| `source_note` | `text null` | Verification note. |
| `updated_at` | `timestamptz not null default now()` | Server maintained. |

Primary key `(building_id, day_of_week)`. Buildings with `always_open` or `unavailable` have no weekly rows; migration tests assert that rule.

### 5.3 Seed provenance

#### `app.seed_packages`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `text` PK | Stable package ID. |
| `kind` | `text not null` | `post_bundle | post_defaults | study_manifest | directory_snapshot`. |
| `source_snapshot_ids` | `text[] not null default '{}'` | Upstream snapshot IDs. |
| `source_locator` | `text not null` | Repository-relative source, never an absolute workstation path. |
| `expected_record_count` | `integer not null` | Positive assertion. |
| `content_sha256` | `text not null` | `sha256:` plus 64 lowercase hex characters. |
| `metadata` | `jsonb not null default '{}'` | Counts/version facts only. |
| `sealed_at` | `timestamptz null` | A sealed package is immutable. |
| `created_at` | `timestamptz not null default now()` | Import registration time. |

#### `app.seed_import_runs`

Append-only operational record: `id bigint identity` PK, `package_id` FK, `migration_name text`, `status pending|complete|failed`, `inserted_count/updated_count/skipped_count integer default 0`, `started_at default now()`, `completed_at`, `executed_by uuid null`, `error_summary text null`, `result_sha256 text null`. Index `(package_id, started_at desc)`.

Every imported post/resource stores its package/key/order columns directly, so provenance has real FKs and uniqueness rather than a weak polymorphic target string.

### 5.4 Unified posts, media, comments, votes, and map records

#### `app.posts`

| Column | Type / default | Contract |
|---|---|---|
| `id` | `bigint generated always as identity` PK | Production post ID. |
| `author_id` | `uuid null default auth.uid()` FK `auth.users` `on delete set null` | Internal ownership; omitted from `api.posts`. Null is allowed for seeds/deleted Auth users. |
| `client_request_id` | `uuid null` | Required for user-created rows and null for seeds. Unique with `author_id`; drives unknown-outcome lookup. |
| `request_fingerprint` | `text null` | Server-computed SHA-256 of the canonical publish payload; required for user-created rows and never public. A repeated request ID with a different fingerprint is a conflict. |
| `context_type` | `text not null` | `community | building`. |
| `community_scope` | `text null` | `global | college | jurusan`; null for Building. |
| `college_id` | `bigint null` FK `colleges` | Null only for Global Community. |
| `jurusan_id` | `bigint null` | Composite FK with college. |
| `building_id` | `text null` | Composite FK with college. |
| `post_type` | `text not null default 'discussion'` | `discussion | question`. |
| `question_status` | `text null` | Question only: `open | solved`. |
| `question_solved_at` | `timestamptz null` | Database-derived on an `open -> solved` transition; never client-writable. |
| `title` | `text null` | At most 160 characters; supports All-KM seed titles. |
| `content` | `text not null` | Trimmed, 1–500 characters for current UI parity. |
| `hashtags` | `text[] not null default '{}'` | At most 8, each 1–40 characters. |
| `language` | `text not null default 'und'` | `en | ms | zh | und`. |
| `category` | `text not null default 'academic'` | `academic | koko | campus_life | emotional`. |
| `is_anonymous` | `boolean not null default true` | Display choice only. |
| `author_display_name` | `text null` | Snapshot; null when anonymous, 2–50 otherwise. |
| `shape` | `text not null default 'rounded'` | Current ten-shape enum. |
| `color` | `text not null default '#E5E7EB'` | Six-digit hex. |
| `rotation` | `smallint not null default 0` | Seed-compatible `-6..6`; publish RPC accepts user integers only in `-2..2`. |
| `position_x`, `position_y` | `numeric(5,2) null` | Optional wall placement; current bounds 2–86 and 4–84. |
| `moderation_status` | `text not null default 'published'` | `published | pending | flagged | rejected`. |
| `visibility_status` | `text not null default 'visible'` | `visible | hidden | deleted`. |
| `moderation_reason` | `text null` | Returned only through permitted API projection. |
| `moderated_by` | `uuid null` FK `auth.users` `on delete set null` | Internal; omitted from feed. |
| `moderated_at` | `timestamptz null` | Last moderation action. |
| `seed_package_id` | `text null` FK `seed_packages` `on delete restrict` | Null for user posts. |
| `seed_key` | `text null` unique | Stable source identity. |
| `seed_interaction_policy` | `text null` | Seed-only `read_only | interactive`; null for user posts. Frozen 763 are read-only; 19 defaults are interactive. |
| `seed_source_order`, `seed_display_order` | `integer null` | Positive source and deterministic display order. |
| `seed_upvotes`, `seed_downvotes` | `integer not null default 0` | Immutable imported display baseline. |
| `live_upvotes`, `live_downvotes` | `integer not null default 0` | Trigger-maintained from `post_votes`; never client-writable. |
| `display_upvotes`, `display_downvotes`, `display_score` | generated `integer` | Seed baseline plus live votes. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |
| `deleted_at` | `timestamptz null` | Must agree with `visibility_status = deleted`. |

Scope check is exact:

```text
community/global   -> college_id null, jurusan_id null, building_id null
community/college  -> college_id set,  jurusan_id null, building_id null
community/jurusan  -> college_id set,  jurusan_id set,  building_id null
building/null      -> college_id set,  jurusan_id null, building_id set
```

Additional checks enforce question/status consistency, anonymity/name consistency, nonnegative counters, request/provenance all-or-none identity, and deleted timestamp consistency. There is deliberately no canonical `batch_id`: a source batch, if any, is package/import provenance. Unique `(author_id, client_request_id)` plus the server fingerprint makes publish retry-safe; the publish RPC returns the prior result for an identical replay and raises conflict for a mismatched payload. A composite FK `(jurusan_id, college_id)` prevents cross-college Jurusan posts; `(building_id, college_id)` prevents cross-college Building posts.

Feed indexes (all include `id desc` for keyset pagination):

- Global public: `(created_at desc, id desc)` partial on visible/published Global Community.
- College public: `(college_id, created_at desc, id desc)` partial on visible/published College Community.
- Jurusan public: `(college_id, jurusan_id, created_at desc, id desc)` partial on visible/published Jurusan Community.
- Building public: `(building_id, created_at desc, id desc)` partial on visible/published Building.
- Owner: `(author_id, created_at desc, id desc)`.
- Open questions: `(college_id, jurusan_id, created_at desc)` partial where `post_type='question' and question_status='open'`.
- Search: generated `tsvector` with `simple` configuration over title/content and a GIN index; hashtags have a GIN index.

Never use OFFSET for deep feeds. Cursor is `(created_at, id)`.

#### `app.post_media`

This table is the Cloudinary reservation and metadata ledger; it never stores image bytes or a Supabase Storage path. Exact columns:

| Column | Type / default | Contract |
|---|---|---|
| `id` | `uuid default gen_random_uuid()` PK | Server reservation/media ID. |
| `owner_id` | `uuid null default auth.uid()` FK Auth `on delete set null` | Reservation owner; omitted from public projection. |
| `post_id` | `bigint null` unique FK posts `on delete set null` | Null until atomic publish attachment. Unique enforces the current maximum of one photo per post. |
| `upload_id`, `idempotency_key` | `uuid not null` | Client retry keys; each is unique with owner. |
| `request_fingerprint` | `text not null` | Server SHA-256 over allow-listed reservation inputs. |
| `composer` | `text not null` | `wall | map`. |
| `provider` | `text not null default 'cloudinary'` | Fixed to `cloudinary` in v1. |
| `public_id` | `text not null` unique | Server-chosen opaque Cloudinary ID; never caller-selected. |
| `secure_url` | `text null` | Verified HTTPS URL for the configured Cloudinary cloud/path; no query secret. |
| `provider_version` | `bigint null` | Positive Cloudinary version returned by upload. |
| `asset_id`, `etag` | `text null` | Optional reconciliation identifiers. |
| `width`, `height` | `integer null` | Both positive and at most 1,280 after confirmation. |
| `bytes` | `integer null` | Confirmed compressed size, exactly `1..529920`. |
| `format` | `text null` | `webp | jpg | jpeg`. |
| `crop_scale` | `numeric(3,2) not null default 1` | `1..1.8`; display-only, non-destructive. |
| `fit` | `text not null default 'cover'` | `cover | contain`. |
| `lifecycle_state` | `text not null default 'reserved'` | `reserved | uploaded_unattached | attached | reservation_expired | orphan_candidate | quarantined | delete_pending | delete_failed | deleted`. |
| `reservation_expires_at` | `timestamptz not null` | Short business expiry set by signer (about 60 seconds); never derived from browser time. |
| `confirmed_at`, `attached_at`, `delete_requested_at`, `deleted_at` | `timestamptz null` | Must match lifecycle checks. |
| `attempt_count` | `integer not null default 0` | Nonnegative cleanup/reconciliation attempts. |
| `last_error_code` | `text null` | Bounded code, never secret response text. |
| `correlation_id` | `uuid not null` | Safe operational correlation. |
| `created_at`, `updated_at` | `timestamptz not null default now()` | Server maintained. |

Checks require confirmation metadata as an all-or-none tuple; `uploaded_unattached` requires confirmed metadata and null `post_id`; `attached` requires confirmed metadata, `post_id`, and `attached_at`; terminal deletion states cannot be attached. Unique `(owner_id, upload_id)`, `(owner_id, idempotency_key)`, `public_id`, and `post_id` enforce replay and one-photo parity. Indexes: `(owner_id, created_at desc)`, `(lifecycle_state, updated_at)`, partial `(post_id) where lifecycle_state='attached'`, and partial `(reservation_expires_at) where lifecycle_state='reserved'`.

The authenticated signer creates/reuses `reserved`; the trusted confirmation function verifies Cloudinary's response signature plus host/cloud/path/version/dimensions/format/529,920-byte ceiling and transitions to `uploaded_unattached`; `publish_post`/`publish_map_post` locks and attaches the caller's reservation with the post in one transaction. Public reads require `attached` and a public parent. Orphan/deletion workers use known `public_id`. No browser role can directly insert/update/delete this table, and no Cloudinary signature, API secret, deletion token, base64, or source original is persisted.

#### `app.comments`

`id bigint identity` PK; `post_id bigint not null` FK posts `on delete cascade`; `parent_comment_id bigint null`; generated `depth smallint` (`0` when parent null, otherwise `1`); `author_id uuid null default auth.uid()` FK Auth `on delete set null`; `client_request_id uuid not null`; `request_fingerprint text not null`; `is_anonymous boolean default true`; `author_display_name text null`; `content text not null` 1–500; `moderation_status published|pending|flagged|rejected default published`; `visibility_status visible|hidden|deleted default visible`; `moderation_reason text null`; `moderated_by uuid null`; `moderated_at`, `created_at`, `updated_at`, `deleted_at`.

Unique `(id, post_id)` plus composite self-FK `(parent_comment_id, post_id) → comments(id, post_id) on delete cascade` guarantees same-post parenting. Unique `(author_id, client_request_id)` plus the server payload fingerprint makes retry idempotent. A `before insert` trigger/RPC forces `author_id=auth.uid()`, snapshots `profiles.display_name` only when non-anonymous, otherwise forces the name null, and forces all timestamps/status fields; caller-supplied identity/name/status is never accepted. The shape trigger rejects a parent that itself has a parent and rejects every non-Community target post. This is the authoritative one-level constraint; trusting a supplied numeric `depth` is forbidden. Indexes: `(post_id, created_at, id)`, `(parent_comment_id, created_at, id)`, `(author_id, created_at desc)`, and visible partial `(post_id, created_at, id)`.

#### `app.post_votes`

`post_id bigint` FK posts `on delete cascade`; `user_id uuid default auth.uid()` FK Auth `on delete cascade`; `value smallint` check `value in (-1,1)`; `created_at`, `updated_at`; primary key `(post_id, user_id)`. Index `(user_id, updated_at desc)`. A private trigger adjusts only `posts.live_upvotes/live_downvotes`. The browser calls `api.set_post_vote(post_id, -1|1|null)`; `null` removes the vote. The function locks/upserts/deletes atomically and rejects `seed_interaction_policy='read_only'`. No client can set counters.

#### `app.map_note_anchors`

`post_id bigint` PK; `building_id text not null`; `latitude double precision` `-90..90`; `longitude double precision` `-180..180`; `created_by uuid null default auth.uid()`; `created_at`, `updated_at`. Composite FK `(post_id, building_id) → posts(id, building_id) on delete cascade` makes every anchor belong to the same Building post. The primary key means zero-or-one anchor per post: map-authored Building posts have exactly one; ordinary Building Wall posts have zero. Index `(building_id, created_at desc)`. Creation uses one RPC transaction that locks a published, `wall_enabled`, `map_enabled` building with a verified footprint, then creates the post and anchor together. Map reads start from anchors, so unanchored Building posts cannot leak onto the map.

#### `app.legacy_map_pins`

This is a migration/compatibility table, not a new authoring path: `id bigint identity` PK, `legacy_timestamp bigint null unique`, `college_id bigint not null`, `building_id text null`, `author_display_name text null`, `body text not null` max 500, `latitude/longitude double precision`, `color text null`, `moderation_status published|flagged|rejected`, `visibility_status visible|hidden|deleted`, `seed_package_id`, `seed_key unique`, `created_at`, `updated_at`, `deleted_at`. Index `(college_id, visibility_status, created_at desc)` and `(building_id, created_at desc)`. New direct-pin INSERT is not granted to browser roles. A future migration may convert a pin into a Building post + anchor while retaining a provenance link; do not merge the record types heuristically.

### 5.5 Study tables

#### `app.study_subjects`

`code text` PK (uppercase 2–16); `study_jurusan text not null` (`sains|perakaunan|sains_komputer|kejuruteraan`); `semester smallint` (`1|2`); `name_i18n jsonb not null default '{}'`; `is_active boolean default true`; `created_at`, `updated_at`. Unique `(code, study_jurusan, semester)`. Index `(study_jurusan, semester, is_active, code)`.

#### `app.study_files`

One row is the canonical logical file across quarantine and approval. Exact columns:

- identity/owner: `id bigint identity` PK; `uploaded_by uuid null default auth.uid()` FK Auth `on delete set null`; `upload_id uuid not null`; `original_file_name text not null` max 255 (private metadata only);
- file facts: `extension text not null default 'pdf'` fixed to `pdf`; `mime_type text not null default 'application/pdf'`; `byte_size bigint null` `1..62914560`; `claimed_sha256 text null`; `verified_sha256 text null`; `pdf_header_valid boolean null`;
- quarantine object: `quarantine_bucket_id text null` constrained to `study-submissions`; `quarantine_object_path text null`; `quarantine_object_id uuid null`;
- approved object: `approved_bucket_id text null` constrained to `study-approved`; `approved_object_path text null`; `approved_object_id uuid null`;
- lifecycle: `object_state text not null default 'initiated'` (`initiated|awaiting_upload|awaiting_finalize|pending_scan|clean_quarantine|scan_failed|rejected|publishing|approved|quarantine_cleanup_pending|deleted`); `scan_status text not null default 'pending'` (`pending|clean|rejected|failed`); `scan_detail_code text null`; `scanner_engine_version text null`; `storage_version bigint not null default 1`;
- idempotent finalization: `finalize_request_id uuid null`; `finalize_fingerprint text null`; `finalized_at timestamptz null`;
- lifecycle time: `validated_at`, `approved_at`, `quarantine_cleanup_after`, `deleted_at`, `created_at default now()`, `updated_at default now()`.

All paths are opaque and original-filename-free. Quarantine fields are an all-or-none tuple and must match `study-submissions/{auth.uid()}/{submission_uuid}/{upload_uuid}.pdf`; approved fields are an all-or-none tuple and must match the trusted content-addressed `study-approved/{sha256-prefix}/{verified_sha256}.pdf` convention. Only `object_state='approved'` may have an approved object; approved requires `scan_status='clean'`, a verified hash, valid PDF header, and actual byte size. Unique `(uploaded_by, upload_id)`, unique non-null `(quarantine_bucket_id, quarantine_object_path)`, unique non-null `(approved_bucket_id, approved_object_path)`, unique `(uploaded_by, finalize_request_id)` where finalization exists, and partial unique `verified_sha256 where object_state='approved'`. Indexes cover `(uploaded_by, object_state, created_at desc)`, `(scan_status, object_state, updated_at)`, and cleanup deadlines.

The client cannot declare a file clean. A trusted finalizer verifies actual Storage identity/size/header; a trusted asynchronous worker computes authoritative SHA-256, parses/scans the PDF, and records engine/version evidence. Client hashes are hints only. Approval copies/reuses the verified object into private `study-approved`, commits resource/submission/file/audit state, then makes the quarantine object cleanup-eligible. No ordinary browser can write the approved bucket or receive an object path.

**Why there is no `study_submission_files` junction in v1:** current parity permits exactly one PDF per submission and exactly one canonical file per approved remote resource. `study_submissions.file_id` and `study_resources.file_id` therefore reference the same logical `study_files` row while that row tracks quarantine-to-approved object lifecycle. A junction would duplicate one-to-one metadata and complicate idempotent promotion. Add a junction in a future migration only if multi-file submissions or one submission producing multiple independently downloadable files becomes a real requirement.

#### `app.study_resources`

| Column group | Exact columns |
|---|---|
| Identity | `id bigint identity` PK; `legacy_resource_key text null unique`; `source_submission_id bigint null unique`. |
| Hierarchy | `subject_code text`, `study_jurusan text`, `semester smallint`; composite FK to `study_subjects`. |
| Metadata | `title text` 1–300; `resource_type text` (`notes|answer_scheme|paper|practice|lab|summary|other`); `resource_subtype text null`; `topic text null`; `year_start/year_end smallint null`; `exam_session_label text null`; `language text null` (`en|ms|zh|und`); `description text null`. |
| Source/file | `source_college_id bigint null`; `source_college_label text null`; `source_type text` (`college|user|unknown`); `contributor_id uuid null`; `availability_kind text` (`static|remote|unavailable`); `static_asset_key text null`; `file_id bigint null`. |
| Review | `review_status text` (`auto_parsed|manual_review|human_approved`); `moderation_status text` (`unverified|approved|rejected`); `verification_status text` (`unverified|verified_source|verified_file`); `publication_status text` (`published|hidden|withdrawn`); `parse_warnings text[] default '{}'`. |
| Dedupe/group | `is_duplicate boolean default false`; `duplicate_of_resource_id bigint null`; `resource_group_key text null`. |
| Seed | `seed_package_id text null`; `seed_key text null unique`; `seed_source_order integer null`. |
| Time | `created_at`, `updated_at`, `reviewed_at`; `reviewed_by uuid null`. |

Public visibility predicate is exact:

```sql
publication_status = 'published'
and review_status in ('auto_parsed', 'human_approved')
and moderation_status in ('unverified', 'approved')
and not is_duplicate
```

File checks are exclusive: `static` requires a sanitized relative `static_asset_key` and null `file_id`; `remote` requires a non-null `file_id`, null static key, and an approved clean `study_files` row; `unavailable` requires both null. Approval logic enforces the remote-file invariant in the review RPC/trigger, not by a recursively dependent RLS policy. The 377 curated built-in files remain versioned static Pages assets for launch; their catalogue/provenance rows do not require `study_files` rows. Built-in hashes and source evidence live in `study_resource_provenance`, explicitly representing “static/no Storage object.”

Indexes: `(subject_code, publication_status, year_start desc, id desc)`, `(study_jurusan, semester, subject_code)`, `(file_id)`, `(source_college_id)`, `(contributor_id)`, `(duplicate_of_resource_id)`, `(resource_group_key)`, partial manual-review queue, and a GIN `simple` search vector over subject code/title/topic/exam session.

#### `app.study_resource_relations`

`id bigint identity` PK; `from_resource_id bigint` and `to_resource_id bigint` FKs `on delete cascade`; `relation_type text` (`question_answer|related|duplicate`); `created_by uuid null`; `created_at default now()`; check IDs differ. Unique `(from_resource_id, to_resource_id, relation_type)` plus an expression unique index on `(least(from_resource_id,to_resource_id), greatest(...), relation_type)` prevents duplicate reversed pairs. Index `to_resource_id`.

#### `app.study_submissions`

`id bigint identity` PK; `contributor_id uuid not null default auth.uid()`; `client_request_id uuid not null`; `request_fingerprint text not null`; `version bigint not null default 1`; the same hierarchy/metadata fields as a resource; `file_id bigint not null`; `related_resource_id bigint null`; `duplicate_status none|likely|exact default none`; `duplicate_of_resource_id bigint null`; `permission_confirmed boolean not null`; `permission_confirmed_at timestamptz not null`; `attestation_version text not null`; `file_validation_status pending|clean|rejected default pending`; `moderation_status pending|approved|rejected|withdrawn default pending`; `verification_status unverified|verified_source|verified_file default unverified`; `rejection_reason text null`; `reviewer_id uuid null`; `reviewed_at`; `approved_resource_id bigint null unique`; `created_at`, `updated_at`. Composite subject FK and all relevant resource/file/Auth FKs apply. Unique `(contributor_id, client_request_id)` makes intent creation replay-safe; the stored server fingerprint makes a same-key/different-payload retry a conflict.

Indexes: `(contributor_id, created_at desc)`, moderation queue `(moderation_status, file_validation_status, created_at)`, `(subject_code, moderation_status)`, `(file_id)`, `(reviewer_id)`, `(duplicate_of_resource_id)`.

#### `app.study_resource_provenance`

Private/admin-only: `resource_id bigint` PK/FK; `seed_package_id text null`; `source_batch text null`; `source_relative_path text null`; `source_sha256 text null`; `parser_version text null`; `imported_at default now()`; `metadata jsonb default '{}'`. Absolute source paths are rejected. Ordinary browse APIs never return this table.

### 5.6 Roles, moderation, reports, and audit

#### `app.role_assignments`

`id bigint identity` PK; `user_id uuid not null`; `role text`; `scope_type text`; `scope_college_id bigint null`; `permissions text[] not null default '{}'`; `status active|disabled default active`; `granted_by uuid null`; `granted_at default now()`; `disabled_at null`; `updated_at default now()`. Checks enforce:

- `college_moderator → scope_type='college' and scope_college_id is not null`;
- `study_reviewer → scope_type='study' and scope_college_id is null`;
- `global_admin → scope_type='system' and scope_college_id is null`;
- permission values are distinct and from the fixed three-value allowlist; non-college roles require an empty array.

Unique expression index `(user_id, role, scope_type, coalesce(scope_college_id,0))`; indexes on `(user_id,status)` and `(scope_college_id,status)`. Browser roles have no INSERT/UPDATE/DELETE grant. Users may read their own assignment; a Global Admin may read all. Provisioning remains trusted-service-only.

#### `app.moderation_items`

`id bigint identity` PK; `target_type text` (`post|comment|legacy_map_pin|study_submission|study_resource`); `target_id bigint`; `scope_type text` (`global|college|study|system`); `scope_college_id bigint null`; `source text` (`submission|report|auto_flag|admin`); `reason text null`; `risk_score smallint default 0` (`0..100`); `status text` (`pending|approved|rejected|hidden|escalated`); `assigned_to uuid null`; `created_by uuid null`; `created_at`, `updated_at`; `resolved_at null`; `last_action_id bigint null` FK audit added after audit table creation. Scope checks require a college ID only for college scope. Partial unique index `(target_type,target_id) where status in ('pending','escalated')` guarantees one active case. Queue indexes: `(scope_type,scope_college_id,status,risk_score desc,created_at)`, `(assigned_to,status,created_at)`, and target lookup.

#### `app.content_reports`

`id bigint identity` PK; `reporter_id uuid not null default auth.uid()`; `client_request_id uuid not null`; `request_fingerprint text not null`; `target_type text`; `target_id bigint`; derived `scope_type text`, `scope_college_id bigint null`; `category text` (`spam|harassment|wrong_info|copyright|duplicate|other`); `details text null` max 1,000; `status open|reviewing|resolved|dismissed default open`; `moderation_item_id bigint not null`; `created_at`, `resolved_at`. One active report per `(reporter_id,target_type,target_id)` is enforced by a partial unique index; unique `(reporter_id,client_request_id)` plus fingerprint handles transport replay. Reports are created only through an RPC that derives scope from the target and creates/raises the moderation item in the same transaction.

#### `app.audit_actions`

Append-only: `id bigint identity` PK; `actor_id uuid null`; `actor_email_snapshot text null`; `action text` (`approve|reject|hide|restore|soft_delete|escalate|verify|edit_approve|assign|unassign|grant|disable|enable|revoke|question_solved|question_reopened`); `target_type text` (`post|comment|legacy_map_pin|study_submission|study_resource|role_assignment|report`); `target_id bigint`; `scope_type text`; `scope_college_id bigint null`; `before_snapshot jsonb null`; `after_snapshot jsonb null`; `reason text null`; `client_request_id uuid not null`; `request_fingerprint text not null`; `correlation_id uuid not null`; `created_at default now()`. Reject/hide/escalate require a reason. Snapshot trigger rejects keys/values that look like passwords, tokens, secrets, blobs, data URLs, base64, or file bytes; strings are bounded. Indexes: `(scope_type,scope_college_id,created_at desc)`, `(target_type,target_id,created_at desc)`, `(actor_id,created_at desc)`, unique expression `(coalesce(actor_id,'00000000-0000-0000-0000-000000000000'::uuid),client_request_id)`, and `(correlation_id,action,target_type,target_id)`.

Every privileged RPC computes the request fingerprint server-side, inserts/locks its audit idempotency row before mutation, returns the prior committed result for an identical replay, and rejects a same-key/different-fingerprint replay. Trusted jobs use globally random request UUIDs even when `actor_id` is null.

An unconditional `before update or delete` trigger raises an exception. Even `service_role` receives only SELECT/INSERT, never UPDATE/DELETE. Retention changes require an explicit owner-run migration.

## 6. Table-by-table RLS matrix

Legend: `S(pub)` public rows; `S(own)` owned rows; `S(scope)` assigned moderation scope; `I(own)` signed-in insert; `U(safe)` only API-view columns; `RPC` named audited/atomic function; `M` moderation RPC; `T` trusted service; `—` denied. Moderator/admin cells include the ordinary authenticated privileges unless stated otherwise.

| Table | anon | authenticated non-owner | owner/contributor | college moderator | study reviewer | global admin | trusted service |
|---|---|---|---|---|---|---|---|
| `profiles` | — | — | `S/U(safe)` | own profile only | own profile only | own profile only; no bulk identity browse | `S/I/U/D` |
| `colleges`, `jurusan` | `S(active)` | `S(active)` | same | same | same | `S(all)` | `S/I/U/D` |
| `buildings`, `building_hours` | `S(published)` | `S(published)` | same | `S(all in scope)`, no catalogue mutation | public only | `S(all)` | `S/I/U/D` |
| `seed_packages` | `S(sealed public metadata)` | same | same | same | same | `S(all)` | `S/I/U`; delete denied once referenced |
| `seed_import_runs` | — | — | — | — | — | `S` | `S/I`; no update/delete after completion |
| `posts` | `S(pub)` | `S(pub)`, `I(own)` | `S(own)`, `U(safe)`, soft-delete `RPC` | `S(scope)`, `M`; cannot moderate Global | public only | `S(all)`, `M` | `S/I/U/D` subject to audit/retention |
| `post_media` | `S(clean + public parent)` | same | `S(own parent)`, finalize/remove `RPC` | `S(scope)`, `M` through parent | public only | `S(all)`, `M` | `S/I/U/D` |
| `comments` | `S(pub)` | `S(pub)`, `I(own)` | `S(own)`, `U(safe)`, soft-delete `RPC` | `S(scope)`, `M` | public only | `S(all)`, `M` | `S/I/U/D` |
| `post_votes` | — | `S(own vote)`, set/remove `RPC` | same | no vote-history expansion | same | no vote-history expansion | `S/I/U/D` for abuse/repair jobs |
| `map_note_anchors` | `S(public parent)` | same; create only with Building-post `RPC` | `S(own parent)`, move/remove `RPC` | `S(scope)`, `M` parent | public only | `S(all)`, `M` | `S/I/U/D` |
| `legacy_map_pins` | `S(pub)` | `S(pub)`; no new insert | no special owner path | `S(scope)`, `M` | public only | `S(all)`, `M` | `S/I/U/D` |
| `study_subjects` | `S(active)` | same | same | same | `S(all)` | `S(all)` | `S/I/U/D` |
| `study_resources` | `S(publishable)` | same | same; pending work is in submissions | public only | `S(all)`, review `RPC` | `S(all)`, review `RPC` | `S/I/U/D` |
| `study_resource_relations` | `S(if both resources publishable)` | same | same | public only | `S(all)`, mutate via review `RPC` | same | `S/I/U/D` |
| `study_submissions` | — | — | `S(own)`, register/withdraw `RPC`; no post-submit edit | — | `S(all)`, review `RPC` | `S(all)`, review `RPC` | `S/I/U/D` |
| `study_files` metadata | `S(if linked publishable)` | same | `S(own submission)` | public only | `S(all reviewable)` | `S(all)` | `S/I/U/D` |
| `study_resource_provenance` | — | — | — | — | `S(review scope)` | `S(all)` | `S/I`; sealed source rows immutable |
| `role_assignments` | — | `S(own)` | same | own rows only | own rows only | `S(all)`, no browser mutation | `S/I/U/D` with audit |
| `moderation_items` | — | — | — | `S/M(own college)` | `S/M(study)` | `S/M(all)` | `S/I/U/D` with audit |
| `content_reports` | — | `RPC create`, `S(own)` | same | `S(scope)` | `S(study)` | `S(all)` | `S/I/U/D` |
| `audit_actions` | — | — | — | `S(own college scope)` | `S(study)` | `S(all)` | `S/I`; UPDATE/DELETE always denied |

Physical DELETE is deliberately absent for ordinary owners and moderators. User deletion is a tombstone operation; moderation uses hide/reject/restore; a trusted retention job performs eventual hard deletion according to policy.

## 7. Migration SQL skeleton

This is the migration contract and ordering skeleton. Split it into descriptive Supabase migrations created with `supabase migration new ...`; do not paste all phases into one unreviewable migration. The table specification above is authoritative where a column list below is abbreviated.

### 7.1 Preflight, schemas, and default privilege lockdown

```sql
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'EchoWall API security_invoker views require PostgreSQL 15+';
  end if;
end $$;

create schema if not exists app;
create schema if not exists api;
create schema if not exists private;

revoke all on schema app, private from public, anon, authenticated;
revoke all on schema api from public;
grant usage on schema api to anon, authenticated, service_role;
grant usage on schema app to anon, authenticated, service_role;
grant usage on schema private to authenticated, service_role;

alter default privileges for role postgres in schema app
  revoke select, insert, update, delete, truncate, references, trigger on tables
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app
  revoke usage, select, update on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

revoke create on schema public from public;
```

Dashboard gate after migration: Data API Exposed Schemas = `api` only. If GraphQL is enabled, expose the same surface only; current 2026 changelog says `pg_graphql` may not be enabled automatically, and EchoWall must not depend on it.

### 7.2 Representative executable DDL

```sql
create table app.colleges (
  id bigint generated by default as identity primary key,
  legacy_org_id integer unique,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,16}$'),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  is_active boolean not null default true,
  community_enabled boolean not null default true,
  building_registry_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index colleges_code_ci_uq on app.colleges (lower(code));

create table app.jurusan (
  id bigint generated by default as identity primary key,
  legacy_major_id integer unique,
  college_id bigint not null references app.colleges(id) on delete restrict,
  code text not null check (char_length(btrim(code)) between 1 and 32),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, code), unique (college_id, slug), unique (id, college_id)
);
create index jurusan_college_active_idx on app.jurusan (college_id, is_active);

create table app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User' check (char_length(btrim(display_name)) between 2 and 50),
  education_status text not null default 'unset'
    check (education_status in ('unset','current_student','alumni','non_student')),
  education_college_id bigint references app.colleges(id) on delete set null,
  education_jurusan_id bigint,
  education_start_year smallint check (education_start_year is null or education_start_year >= 1980),
  avatar_object_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (education_jurusan_id, education_college_id)
    references app.jurusan(id, college_id) on delete set null,
  check (
    (education_status in ('unset','non_student') and education_college_id is null
      and education_jurusan_id is null and education_start_year is null)
    or
    (education_status in ('current_student','alumni') and education_college_id is not null
      and education_jurusan_id is not null and education_start_year is not null)
  )
);

create table app.seed_packages (
  id text primary key,
  kind text not null check (kind in ('post_bundle','post_defaults','study_manifest','directory_snapshot')),
  source_snapshot_ids text[] not null default '{}',
  source_locator text not null check (source_locator !~ '(^[A-Za-z]:[\\/]|^/)'),
  expected_record_count integer not null check (expected_record_count > 0),
  content_sha256 text not null check (content_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  sealed_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.buildings (
  id text primary key check (id ~ '^B_[A-Z0-9_]+$'),
  college_id bigint not null references app.colleges(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 180),
  category text, zone_id text, emoji text,
  description_i18n jsonb not null default '{}'::jsonb,
  purpose_i18n jsonb not null default '{}'::jsonb,
  tags_i18n jsonb not null default '{}'::jsonb,
  floors smallint check (floors is null or floors > 0),
  photo_manifest jsonb not null default '[]'::jsonb,
  map_lat double precision, map_lng double precision,
  overview_polygon jsonb, map_footprint jsonb,
  hours_mode text not null default 'unavailable' check (hours_mode in ('weekly','always_open','unavailable')),
  residents_only boolean not null default false,
  hours_note text,
  wall_enabled boolean not null default false,
  map_enabled boolean not null default false,
  is_published boolean not null default false,
  source_provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, college_id),
  check ((map_lat is null and map_lng is null) or
    (map_lat between -90 and 90 and map_lng between -180 and 180)),
  check (not map_enabled or
    (map_footprint is not null and jsonb_typeof(map_footprint)='array')),
  check (jsonb_typeof(description_i18n)='object' and jsonb_typeof(purpose_i18n)='object'
    and jsonb_typeof(tags_i18n)='object' and jsonb_typeof(photo_manifest)='array')
);
create index buildings_college_published_idx on app.buildings(college_id,is_published);
create index buildings_zone_idx on app.buildings(zone_id);
create index buildings_wall_enabled_idx on app.buildings(college_id) where wall_enabled;
create index buildings_map_enabled_idx on app.buildings(college_id,id)
  where map_enabled and is_published;

create table app.building_hours (
  building_id text not null references app.buildings(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  opens_at time, closes_at time,
  timezone_name text not null default 'Asia/Kuala_Lumpur',
  source_note text,
  updated_at timestamptz not null default now(),
  primary key (building_id, day_of_week),
  check ((is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and opens_at < closes_at))
);

create table app.posts (
  id bigint generated always as identity primary key,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  context_type text not null check (context_type in ('community','building')),
  community_scope text check (community_scope in ('global','college','jurusan')),
  college_id bigint references app.colleges(id) on delete restrict,
  jurusan_id bigint,
  building_id text,
  post_type text not null default 'discussion' check (post_type in ('discussion','question')),
  question_status text check (question_status in ('open','solved')),
  question_solved_at timestamptz,
  title text check (title is null or char_length(btrim(title)) between 1 and 160),
  content text not null check (char_length(btrim(content)) between 1 and 500),
  hashtags text[] not null default '{}' check (cardinality(hashtags) <= 8),
  language text not null default 'und' check (language in ('en','ms','zh','und')),
  category text not null default 'academic'
    check (category in ('academic','koko','campus_life','emotional','other')),
  is_anonymous boolean not null default true,
  author_display_name text,
  shape text not null default 'rounded'
    check (shape in ('rounded','square','rect','circle','envelope','torn','speech','polaroid','ticket','hexagon')),
  color text not null default '#E5E7EB' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  rotation numeric(5,2) not null default 0 check (rotation between -15 and 15),
  position_x numeric(5,2) check (position_x is null or position_x between 2 and 86),
  position_y numeric(5,2) check (position_y is null or position_y between 4 and 84),
  moderation_status text not null default 'published'
    check (moderation_status in ('published','pending','flagged','rejected')),
  visibility_status text not null default 'visible'
    check (visibility_status in ('visible','hidden','deleted')),
  moderation_reason text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  seed_package_id text references app.seed_packages(id) on delete restrict,
  seed_key text unique,
  seed_source_order integer check (seed_source_order is null or seed_source_order > 0),
  seed_display_order integer check (seed_display_order is null or seed_display_order > 0),
  seed_upvotes integer not null default 0 check (seed_upvotes >= 0),
  seed_downvotes integer not null default 0 check (seed_downvotes >= 0),
  live_upvotes integer not null default 0 check (live_upvotes >= 0),
  live_downvotes integer not null default 0 check (live_downvotes >= 0),
  display_upvotes integer generated always as (seed_upvotes + live_upvotes) stored,
  display_downvotes integer generated always as (seed_downvotes + live_downvotes) stored,
  display_score integer generated always as
    ((seed_upvotes + live_upvotes) - (seed_downvotes + live_downvotes)) stored,
  search_document tsvector generated always as
    (to_tsvector('simple', coalesce(title,'') || ' ' || content)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, building_id),
  foreign key (jurusan_id, college_id) references app.jurusan(id, college_id) on delete restrict,
  foreign key (building_id, college_id) references app.buildings(id, college_id) on delete restrict,
  check (
    (context_type='community' and community_scope='global' and college_id is null and jurusan_id is null and building_id is null)
    or (context_type='community' and community_scope='college' and college_id is not null and jurusan_id is null and building_id is null)
    or (context_type='community' and community_scope='jurusan' and college_id is not null and jurusan_id is not null and building_id is null)
    or (context_type='building' and community_scope is null and college_id is not null and jurusan_id is null and building_id is not null)
  ),
  check ((post_type='discussion' and question_status is null and question_solved_at is null)
    or (post_type='question' and question_status='open' and question_solved_at is null)
    or (post_type='question' and question_status='solved' and question_solved_at is not null)),
  check ((is_anonymous and author_display_name is null) or
    (not is_anonymous and char_length(btrim(author_display_name)) between 2 and 50)),
  check ((seed_package_id is null and seed_key is null
      and seed_source_order is null and seed_display_order is null and seed_upvotes=0 and seed_downvotes=0)
    or (seed_package_id is not null and seed_key is not null and seed_source_order is not null)),
  check ((visibility_status='deleted') = (deleted_at is not null))
);

create index posts_author_created_idx on app.posts (author_id, created_at desc, id desc);
create index posts_global_feed_idx on app.posts (created_at desc, id desc)
  where context_type='community' and community_scope='global'
    and moderation_status='published' and visibility_status='visible';
create index posts_college_feed_idx on app.posts (college_id, created_at desc, id desc)
  where context_type='community' and community_scope='college'
    and moderation_status='published' and visibility_status='visible';
create index posts_jurusan_feed_idx on app.posts (college_id, jurusan_id, created_at desc, id desc)
  where context_type='community' and community_scope='jurusan'
    and moderation_status='published' and visibility_status='visible';
create index posts_building_feed_idx on app.posts (building_id, created_at desc, id desc)
  where context_type='building' and moderation_status='published' and visibility_status='visible';
create index posts_search_gin_idx on app.posts using gin (search_document);
create index posts_hashtags_gin_idx on app.posts using gin (hashtags);

create table app.post_media (
  id bigint generated always as identity primary key,
  post_id bigint not null references app.posts(id) on delete cascade,
  uploader_id uuid default auth.uid() references auth.users(id) on delete set null,
  bucket_id text not null default 'post-media', object_path text not null,
  display_order smallint not null default 0 check (display_order between 0 and 3),
  media_type text not null default 'image' check (media_type='image'),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  width integer check (width is null or width > 0), height integer check (height is null or height > 0),
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  crop_scale numeric(3,2) not null default 1 check (crop_scale between 1 and 1.8),
  fit text not null default 'cover' check (fit in ('cover','contain')),
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (bucket_id, object_path), unique (post_id, display_order)
);
create index post_media_post_idx on app.post_media(post_id);
create index post_media_uploader_idx on app.post_media(uploader_id);

create table app.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references app.posts(id) on delete cascade,
  parent_comment_id bigint,
  depth smallint generated always as (case when parent_comment_id is null then 0 else 1 end) stored,
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  is_anonymous boolean not null default true,
  author_display_name text,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  moderation_status text not null default 'published'
    check (moderation_status in ('published','pending','flagged','rejected')),
  visibility_status text not null default 'visible'
    check (visibility_status in ('visible','hidden','deleted')),
  moderation_reason text, moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (id, post_id),
  foreign key (parent_comment_id, post_id) references app.comments(id, post_id) on delete cascade,
  check ((is_anonymous and author_display_name is null) or
    (not is_anonymous and char_length(btrim(author_display_name)) between 2 and 50)),
  check ((visibility_status='deleted') = (deleted_at is not null))
);
create index comments_post_thread_idx on app.comments(post_id, created_at, id);
create index comments_parent_idx on app.comments(parent_comment_id, created_at, id);
create index comments_author_idx on app.comments(author_id, created_at desc);

create table app.post_votes (
  post_id bigint not null references app.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_votes_user_idx on app.post_votes(user_id, updated_at desc);

create table app.map_note_anchors (
  post_id bigint primary key,
  building_id text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (post_id, building_id) references app.posts(id, building_id) on delete cascade
);
create index map_note_anchors_building_idx on app.map_note_anchors(building_id, created_at desc);
```

Create the remaining Study/governance tables exactly as specified in section 5. Use named constraints, then create every FK/filter index listed there. PostgreSQL does not support `add constraint if not exists`; later corrective migrations must query `pg_constraint` before adding a missing constraint.

### 7.3 Authorization helpers

```sql
create or replace function private.is_permanent_user()
returns boolean language sql stable security invoker set search_path=''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true'
$$;

create or replace function private.has_active_role(p_role text, p_college_id bigint default null)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from app.role_assignments ra
    where ra.user_id = (select auth.uid()) and ra.status='active' and ra.role=p_role
      and (p_college_id is null or ra.scope_college_id=p_college_id)
  )
$$;

create or replace function private.is_global_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select private.has_active_role('global_admin', null) $$;

create or replace function private.has_college_permission(
  p_college_id bigint, p_permission text
)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.is_global_admin() or (
    p_college_id is not null
    and p_permission in ('college_community_moderate','college_building_moderate','college_map_moderate')
    and exists (
      select 1 from app.role_assignments ra
      where ra.user_id=(select auth.uid()) and ra.status='active'
        and ra.role='college_moderator' and ra.scope_type='college'
        and ra.scope_college_id=p_college_id
        and (cardinality(ra.permissions)=0 or p_permission=any(ra.permissions))
    )
  )
$$;

create or replace function private.can_moderate_college(p_college_id bigint)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.has_college_permission(p_college_id,'college_community_moderate')
    or private.has_college_permission(p_college_id,'college_building_moderate')
    or private.has_college_permission(p_college_id,'college_map_moderate')
$$;

create or replace function private.can_review_study()
returns boolean language sql stable security definer set search_path=''
as $$
  select private.is_global_admin() or exists (
    select 1 from app.role_assignments ra
    where ra.user_id=(select auth.uid()) and ra.status='active'
      and ra.role='study_reviewer' and ra.scope_type='study'
  )
$$;

create or replace function private.can_moderate_post(
  p_context_type text, p_community_scope text, p_college_id bigint
)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.is_global_admin()
    or (p_context_type='community' and p_community_scope in ('college','jurusan')
      and private.has_college_permission(p_college_id,'college_community_moderate'))
    or (p_context_type='building'
      and private.has_college_permission(p_college_id,'college_building_moderate'))
$$;

create or replace function private.can_moderate_target(
  p_target_type text, p_target_id bigint, p_scope_college_id bigint
)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.is_global_admin() or case p_target_type
    when 'post' then exists (
      select 1 from app.posts p
      where p.id=p_target_id and p.college_id=p_scope_college_id
        and private.can_moderate_post(p.context_type,p.community_scope,p.college_id))
    when 'comment' then exists (
      select 1 from app.comments c join app.posts p on p.id=c.post_id
      where c.id=p_target_id and p.college_id=p_scope_college_id
        and private.can_moderate_post(p.context_type,p.community_scope,p.college_id))
    when 'legacy_map_pin' then exists (
      select 1 from app.legacy_map_pins lp
      where lp.id=p_target_id and lp.college_id=p_scope_college_id
        and private.has_college_permission(lp.college_id,'college_map_moderate'))
    when 'report' then exists (
      select 1 from app.content_reports cr
      where cr.id=p_target_id and cr.scope_college_id=p_scope_college_id
        and private.can_moderate_target(cr.target_type,cr.target_id,cr.scope_college_id))
    else false
  end
$$;

revoke execute on function private.has_active_role(text,bigint), private.is_global_admin(),
  private.has_college_permission(bigint,text), private.can_moderate_college(bigint),
  private.can_review_study(), private.can_moderate_post(text,text,bigint),
  private.can_moderate_target(text,bigint,bigint)
from public, anon, service_role;
grant execute on function private.has_active_role(text,bigint), private.is_global_admin(),
  private.has_college_permission(bigint,text), private.can_moderate_college(bigint),
  private.can_review_study(), private.can_moderate_post(text,text,bigint),
  private.can_moderate_target(text,bigint,bigint)
to authenticated;
```

Although authenticated receives EXECUTE for policy helpers, `private` is not exposed, so they are not Data API RPC endpoints. Each helper returns only a Boolean about the current caller and accepts no arbitrary user ID.

### 7.4 RLS policy skeleton

Enable RLS on **every** base table, even though `app` is unexposed:

```sql
alter table app.profiles enable row level security;
alter table app.colleges enable row level security;
alter table app.jurusan enable row level security;
alter table app.buildings enable row level security;
alter table app.building_hours enable row level security;
alter table app.seed_packages enable row level security;
alter table app.seed_import_runs enable row level security;
alter table app.posts enable row level security;
alter table app.post_media enable row level security;
alter table app.comments enable row level security;
alter table app.post_votes enable row level security;
alter table app.map_note_anchors enable row level security;
alter table app.legacy_map_pins enable row level security;
alter table app.study_subjects enable row level security;
alter table app.study_files enable row level security;
alter table app.study_resources enable row level security;
alter table app.study_resource_relations enable row level security;
alter table app.study_submissions enable row level security;
alter table app.study_resource_provenance enable row level security;
alter table app.role_assignments enable row level security;
alter table app.moderation_items enable row level security;
alter table app.content_reports enable row level security;
alter table app.audit_actions enable row level security;
```

Core policies (separate policy per operation; never use `for all`):

```sql
create policy profiles_owner_select on app.profiles for select to authenticated
  using (id=(select auth.uid()));
create policy profiles_owner_update on app.profiles for update to authenticated
  using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy colleges_public_select on app.colleges for select to anon, authenticated
  using (is_active or private.is_global_admin());
create policy jurusan_public_select on app.jurusan for select to anon, authenticated
  using (is_active or private.is_global_admin());
create policy buildings_public_select on app.buildings for select to anon, authenticated
  using (is_published or private.is_global_admin()
    or private.has_college_permission(college_id,'college_building_moderate')
    or private.has_college_permission(college_id,'college_map_moderate'));
create policy building_hours_public_select on app.building_hours for select to anon, authenticated
  using (exists (select 1 from app.buildings b where b.id=building_id));

create policy posts_public_select on app.posts for select to anon, authenticated
  using (moderation_status='published' and visibility_status='visible' and deleted_at is null
    and (
      (context_type='community' and community_scope='global')
      or (context_type='community' and community_scope='college' and exists (
        select 1 from app.colleges c
        where c.id=posts.college_id and c.is_active and c.community_enabled))
      or (context_type='community' and community_scope='jurusan' and exists (
        select 1 from app.jurusan j join app.colleges c on c.id=j.college_id
        where j.id=posts.jurusan_id and j.college_id=posts.college_id
          and j.is_active and c.is_active and c.community_enabled))
      or (context_type='building' and exists (
        select 1 from app.buildings b
        where b.id=posts.building_id and b.college_id=posts.college_id
          and b.is_published and b.wall_enabled))
    ));
create policy posts_owner_select on app.posts for select to authenticated
  using (author_id=(select auth.uid()));
create policy posts_moderator_select on app.posts for select to authenticated
  using (private.can_moderate_post(context_type,community_scope,college_id));

create policy posts_owner_insert on app.posts for insert to authenticated
  with check (
    private.is_permanent_user()
    and author_id=(select auth.uid())
    and seed_package_id is null and seed_key is null
    and moderation_status='published' and visibility_status='visible' and deleted_at is null
    and seed_upvotes=0 and seed_downvotes=0 and live_upvotes=0 and live_downvotes=0
    and (post_type <> 'question' or question_status='open')
    and (
      (context_type='community' and community_scope='global')
      or (context_type='community' and community_scope='college' and exists (
        select 1 from app.colleges c where c.id=college_id and c.is_active and c.community_enabled))
      or (context_type='community' and community_scope='jurusan' and exists (
        select 1 from app.jurusan j join app.colleges c on c.id=j.college_id
        where j.id=jurusan_id and j.college_id=college_id and j.is_active and c.is_active and c.community_enabled))
      or (context_type='building' and exists (
        select 1 from app.buildings b where b.id=building_id and b.college_id=college_id
          and b.is_published and b.wall_enabled))
    )
  );
create policy posts_owner_update on app.posts for update to authenticated
  using (author_id=(select auth.uid()) and seed_package_id is null and deleted_at is null)
  with check (author_id=(select auth.uid()) and seed_package_id is null);
-- No DELETE policy.

create policy post_media_read on app.post_media for select to anon, authenticated
  using (scan_status='clean' and exists (select 1 from app.posts p where p.id=post_id));
create policy post_media_owner_pending_read on app.post_media for select to authenticated
  using (uploader_id=(select auth.uid()));
-- INSERT/UPDATE/DELETE are RPC-only; no policies or direct grants.

create policy comments_public_select on app.comments for select to anon, authenticated
  using (moderation_status='published' and visibility_status='visible' and deleted_at is null
    and exists (select 1 from app.posts p where p.id=post_id and p.context_type='community'));
create policy comments_owner_select on app.comments for select to authenticated
  using (author_id=(select auth.uid()));
create policy comments_moderator_select on app.comments for select to authenticated
  using (exists (select 1 from app.posts p where p.id=post_id
    and private.can_moderate_post(p.context_type,p.community_scope,p.college_id)));
create policy comments_owner_insert on app.comments for insert to authenticated
  with check (private.is_permanent_user() and author_id=(select auth.uid())
    and moderation_status='published' and visibility_status='visible'
    and exists (select 1 from app.posts p where p.id=post_id and p.context_type='community'
      and p.moderation_status='published' and p.visibility_status='visible'));
create policy comments_owner_update on app.comments for update to authenticated
  using (author_id=(select auth.uid()) and deleted_at is null)
  with check (author_id=(select auth.uid()));
-- No DELETE policy.

create policy post_votes_owner_select on app.post_votes for select to authenticated
  using (user_id=(select auth.uid()));
-- Vote mutation is private-function/RPC-only.

create policy anchors_public_select on app.map_note_anchors for select to anon, authenticated
  using (exists (
    select 1 from app.posts p join app.buildings b
      on b.id=p.building_id and b.college_id=p.college_id
    where p.id=map_note_anchors.post_id and b.map_enabled and b.map_footprint is not null));
create policy anchors_moderator_select on app.map_note_anchors for select to authenticated
  using (exists (select 1 from app.buildings b
    where b.id=map_note_anchors.building_id
      and private.has_college_permission(b.college_id,'college_map_moderate')));
create policy legacy_pins_public_select on app.legacy_map_pins for select to anon, authenticated
  using (moderation_status='published' and visibility_status='visible' and deleted_at is null);
create policy legacy_pins_moderator_select on app.legacy_map_pins for select to authenticated
  using (private.has_college_permission(college_id,'college_map_moderate'));

create policy subjects_public_select on app.study_subjects for select to anon, authenticated
  using (is_active or private.can_review_study());
create policy resources_public_select on app.study_resources for select to anon, authenticated
  using (publication_status='published'
    and review_status in ('auto_parsed','human_approved')
    and moderation_status in ('unverified','approved') and not is_duplicate);
create policy resources_reviewer_select on app.study_resources for select to authenticated
  using (private.can_review_study());
create policy relations_public_select on app.study_resource_relations for select to anon, authenticated
  using (exists (select 1 from app.study_resources r where r.id=from_resource_id)
    and exists (select 1 from app.study_resources r where r.id=to_resource_id));
create policy relations_reviewer_select on app.study_resource_relations for select to authenticated
  using (private.can_review_study());

create policy submissions_owner_select on app.study_submissions for select to authenticated
  using (contributor_id=(select auth.uid()));
create policy submissions_reviewer_select on app.study_submissions for select to authenticated
  using (private.can_review_study());
create policy study_files_public_select on app.study_files for select to anon, authenticated
  using (scan_status='clean' and exists (
    select 1 from app.study_resources r where r.file_id=study_files.id));
create policy study_files_owner_select on app.study_files for select to authenticated
  using (uploaded_by=(select auth.uid()));
create policy study_files_reviewer_select on app.study_files for select to authenticated
  using (private.can_review_study());

create policy role_assignments_owner_select on app.role_assignments for select to authenticated
  using (user_id=(select auth.uid()));
create policy role_assignments_admin_select on app.role_assignments for select to authenticated
  using (private.is_global_admin());

create policy moderation_items_scope_select on app.moderation_items for select to authenticated
  using (private.is_global_admin()
    or (scope_type='college'
      and private.can_moderate_target(target_type,target_id,scope_college_id))
    or (scope_type='study' and private.can_review_study()));
create policy reports_owner_select on app.content_reports for select to authenticated
  using (reporter_id=(select auth.uid()));
create policy reports_moderator_select on app.content_reports for select to authenticated
  using (private.is_global_admin()
    or (scope_type='college'
      and private.can_moderate_target(target_type,target_id,scope_college_id))
    or (scope_type='study' and private.can_review_study()));
create policy audit_scope_select on app.audit_actions for select to authenticated
  using (private.is_global_admin()
    or (scope_type='college'
      and private.can_moderate_target(target_type,target_id,scope_college_id))
    or (scope_type='study' and private.can_review_study()));
```

Add equivalent Global Admin read policies to seed/import/provenance tables and sealed public read to `seed_packages`. Do not create authenticated mutation policies for role assignments, moderation items, reports, audit, Study resources/submissions/files, anchors, media, or legacy pins; their RPC/trusted paths are the only mutations.

### 7.5 Comment and vote integrity triggers

```sql
create or replace function private.validate_profile_year()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if new.education_start_year is not null
    and new.education_start_year > extract(year from current_date)::integer + 1 then
    raise exception 'Education start year cannot be later than next year';
  end if;
  return new;
end $$;
revoke execute on function private.validate_profile_year()
  from public, anon, authenticated, service_role;
create trigger profiles_year_biu before insert or update of education_start_year
  on app.profiles for each row execute function private.validate_profile_year();

create or replace function private.normalize_post_question_state()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if new.post_type='discussion' then
    new.question_status := null;
    new.question_solved_at := null;
  else
    new.question_status := coalesce(new.question_status,'open');
    if new.question_status='open' then
      new.question_solved_at := null;
    elsif tg_op='INSERT' then
      new.question_solved_at := coalesce(new.question_solved_at,now());
    elsif old.question_status is distinct from 'solved' then
      new.question_solved_at := now();
    elsif (select auth.uid()) is not null then
      -- Browser owners may edit other safe columns, but cannot rewrite history.
      new.question_solved_at := old.question_solved_at;
    else
      -- Trusted imports/repairs may retain an explicit historical timestamp.
      new.question_solved_at := coalesce(new.question_solved_at,old.question_solved_at,now());
    end if;
  end if;
  return new;
end $$;
revoke execute on function private.normalize_post_question_state()
  from public, anon, authenticated, service_role;
create trigger posts_question_state_biu
  before insert or update of post_type,question_status,question_solved_at
  on app.posts for each row execute function private.normalize_post_question_state();

create or replace function private.enforce_comment_shape()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_parent_parent bigint; v_context text;
begin
  select p.context_type into v_context from app.posts p where p.id=new.post_id;
  if v_context is distinct from 'community' then
    raise exception 'Comments are Community-post-only';
  end if;
  if new.parent_comment_id is not null then
    select c.parent_comment_id into v_parent_parent
      from app.comments c where c.id=new.parent_comment_id and c.post_id=new.post_id;
    if not found then raise exception 'Parent comment does not exist on this post'; end if;
    if v_parent_parent is not null then raise exception 'Replies can only be one level deep'; end if;
  end if;
  return new;
end $$;
revoke execute on function private.enforce_comment_shape() from public, anon, authenticated, service_role;
create trigger comments_shape_biu before insert or update of post_id,parent_comment_id
  on app.comments for each row execute function private.enforce_comment_shape();

create or replace function private.apply_vote_delta()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_post_id bigint; v_up integer := 0; v_down integer := 0;
begin
  v_post_id := coalesce(new.post_id,old.post_id);
  if tg_op in ('UPDATE','DELETE') then
    v_up := v_up - case when old.value=1 then 1 else 0 end;
    v_down := v_down - case when old.value=-1 then 1 else 0 end;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    v_up := v_up + case when new.value=1 then 1 else 0 end;
    v_down := v_down + case when new.value=-1 then 1 else 0 end;
  end if;
  update app.posts set live_upvotes=live_upvotes+v_up, live_downvotes=live_downvotes+v_down
    where id=v_post_id;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke execute on function private.apply_vote_delta() from public, anon, authenticated, service_role;
create trigger post_votes_delta_aiud after insert or update or delete on app.post_votes
  for each row execute function private.apply_vote_delta();
```

Add triggers for updated timestamps, sealed seed-package immutability, Study approval invariants, sanitized audit snapshots, and unconditional audit UPDATE/DELETE rejection. Trigger functions stay private with execution revoked.

### 7.6 API views and explicit grants

The full views must enumerate columns; never use `select *`. Example:

```sql
create or replace view api.posts with (security_invoker=true) as
select id,context_type,community_scope,college_id,jurusan_id,building_id,
  post_type,question_status,question_solved_at,title,content,hashtags,language,category,
  is_anonymous,author_display_name,shape,color,rotation,position_x,position_y,
  moderation_status,visibility_status,moderation_reason,
  seed_package_id,seed_key,seed_source_order,seed_display_order,
  display_upvotes,display_downvotes,display_score,created_at,updated_at,deleted_at
from app.posts;

create or replace view api.comments with (security_invoker=true) as
select id,post_id,parent_comment_id,depth,is_anonymous,author_display_name,content,
  moderation_status,visibility_status,moderation_reason,created_at,updated_at,deleted_at
from app.comments;

create or replace view api.post_media with (security_invoker=true) as
select id,post_id,bucket_id,object_path,display_order,media_type,mime_type,byte_size,
  width,height,alt_text,crop_scale,fit,scan_status,created_at,updated_at
from app.post_media;
```

Create equivalent explicit-column views for profiles, directories, hours, anchors, legacy pins, Study tables, own votes, roles, moderation, reports, and audit. Ordinary views must never expose post/comment `author_id`, media `uploader_id`, `moderated_by`, absolute provenance, or binary/file secrets.

Grant from a clean slate. The following is the minimum operation-level contract; column lists on the updatable base tables must exactly match their API views:

```sql
-- Read facade.
grant select on api.colleges,api.jurusan,api.buildings,api.building_hours,
  api.posts,api.post_media,api.comments,api.map_note_anchors,api.legacy_map_pins,
  api.study_subjects,api.study_resources,api.study_resource_relations,api.study_files,
  api.seed_packages
to anon, authenticated;

grant select on api.profiles,api.post_votes,api.study_submissions,
  api.role_assignments,api.moderation_items,api.content_reports,api.audit_actions
to authenticated;

-- Direct, single-row writes only.
grant update (display_name,education_status,education_college_id,education_jurusan_id,
  education_start_year,avatar_object_path) on app.profiles to authenticated;
grant update (display_name,education_status,education_college_id,education_jurusan_id,
  education_start_year,avatar_object_path) on api.profiles to authenticated;

grant insert (context_type,community_scope,college_id,jurusan_id,building_id,post_type,
  question_status,title,content,hashtags,language,category,is_anonymous,author_display_name,
  shape,color,rotation,position_x,position_y)
on app.posts to authenticated;
grant insert (context_type,community_scope,college_id,jurusan_id,building_id,post_type,
  question_status,title,content,hashtags,language,category,is_anonymous,author_display_name,
  shape,color,rotation,position_x,position_y)
on api.posts to authenticated;
grant update (question_status,title,content,hashtags,language,category,
  is_anonymous,author_display_name,shape,color,rotation,position_x,position_y)
on app.posts to authenticated;
grant update (question_status,title,content,hashtags,language,category,
  is_anonymous,author_display_name,shape,color,rotation,position_x,position_y)
on api.posts to authenticated;

grant insert (post_id,parent_comment_id,is_anonymous,author_display_name,content)
  on app.comments to authenticated;
grant update (is_anonymous,author_display_name,content) on app.comments to authenticated;
grant insert (post_id,parent_comment_id,is_anonymous,author_display_name,content)
  on api.comments to authenticated;
grant update (is_anonymous,author_display_name,content)
  on api.comments to authenticated;

-- SECURITY INVOKER views need underlying SELECT privileges, but app is not exposed.
grant select on app.profiles,app.colleges,app.jurusan,app.buildings,app.building_hours,
  app.seed_packages,app.posts,app.post_media,app.comments,app.post_votes,
  app.map_note_anchors,app.legacy_map_pins,app.study_subjects,app.study_files,
  app.study_resources,app.study_resource_relations,app.study_submissions,
  app.role_assignments,app.moderation_items,app.content_reports,app.audit_actions
to authenticated;
grant select on app.colleges,app.jurusan,app.buildings,app.building_hours,
  app.seed_packages,app.posts,app.post_media,app.comments,app.map_note_anchors,
  app.legacy_map_pins,app.study_subjects,app.study_files,app.study_resources,
  app.study_resource_relations
to anon;

grant usage,select on sequence app.posts_id_seq,app.comments_id_seq to authenticated;

-- Trusted service. Audit remains append-only.
grant select,insert,update,delete on app.colleges,app.jurusan,app.profiles,app.buildings,
  app.building_hours,app.seed_packages,app.seed_import_runs,app.posts,app.post_media,
  app.comments,app.post_votes,app.map_note_anchors,app.legacy_map_pins,
  app.study_subjects,app.study_files,app.study_resources,app.study_resource_relations,
  app.study_submissions,app.study_resource_provenance,app.role_assignments,
  app.moderation_items,app.content_reports
to service_role;
grant select,insert on app.audit_actions to service_role;
revoke update,delete,truncate on app.audit_actions from service_role;
grant usage,select on all sequences in schema app to service_role;
```

Do not grant DELETE on `api.posts` or `api.comments`. Do not grant direct DML on vote/media/anchor/Study/moderation/audit/role views. The RPC grants below are the intended write surface.

### 7.7 RPC pattern and required functions

Public wrappers are `SECURITY INVOKER`; privileged implementations are private and non-exposed. Example vote implementation:

```sql
create or replace function private.set_post_vote_impl(p_post_id bigint,p_value smallint)
returns void language plpgsql security definer set search_path=''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if not private.is_permanent_user() then raise exception 'Authentication required'; end if;
  if p_value is not null and p_value not in (-1,1) then raise exception 'Invalid vote'; end if;
  if not exists (select 1 from app.posts p where p.id=p_post_id
    and p.moderation_status='published' and p.visibility_status='visible' and p.deleted_at is null)
  then raise exception 'Post is not voteable'; end if;

  if p_value is null then
    delete from app.post_votes where post_id=p_post_id and user_id=v_uid;
  else
    insert into app.post_votes(post_id,user_id,value) values (p_post_id,v_uid,p_value)
    on conflict (post_id,user_id) do update set value=excluded.value,updated_at=now()
    where app.post_votes.value is distinct from excluded.value;
  end if;
end $$;

create or replace function api.set_post_vote(p_post_id bigint,p_value smallint)
returns void language sql security invoker set search_path=''
as $$ select private.set_post_vote_impl(p_post_id,p_value) $$;
revoke execute on function private.set_post_vote_impl(bigint,smallint),
  api.set_post_vote(bigint,smallint) from public,anon,service_role;
grant execute on function private.set_post_vote_impl(bigint,smallint),
  api.set_post_vote(bigint,smallint) to authenticated;
```

Implement the remaining RPCs with the same revoke/grant pattern:

| API RPC | Transaction and authorization requirements |
|---|---|
| `api.create_anchored_building_post(post jsonb, building_id text, lat float8, lng float8)` | Require permanent Auth user; lock/read a published `wall_enabled` and `map_enabled` building whose footprint is non-null; verify the coordinate is inside that footprint (or within the documented snap tolerance); insert one Building post with caller ownership and zero protected counters, then exactly one matching anchor; return post ID. Any failure rolls back both. Ordinary direct Building-post inserts remain unanchored. |
| `api.finalize_post_media(post_id bigint,bucket text,path text,metadata jsonb)` | Lock owned post; require fewer than 4 media rows; read `storage.objects` by bucket/path; require `owner_id=auth.uid()::text`; enforce bucket, size, MIME, unique path/order; insert pending media. Trusted scanner alone promotes to clean. |
| `api.remove_post_media(media_id bigint)` | Require parent ownership or moderator role; mark metadata for deletion and enqueue trusted object deletion. Never leave a public row pointing at a deleted object. |
| `api.soft_delete_own_post(post_id bigint)` | Lock owned non-seed row; set `visibility_status='deleted'`, `deleted_at=now()`; do not physically cascade. |
| `api.soft_delete_own_comment(comment_id bigint)` | Same ownership/tombstone rule; preserve replies and replace rendered body with a tombstone at the API layer. |
| `api.register_study_submission(metadata jsonb,bucket text,path text,attestation_version text)` | Require permanent user and attestation; validate active subject and object ownership; insert/reuse `study_files` pending row and submission in one transaction. It must not trust client SHA/MIME. Exact-hash result is completed by trusted validation worker. |
| `api.withdraw_study_submission(submission_id bigint)` | Owner only, status pending, row lock, set withdrawn; never delete reviewed history. |
| `api.report_content(target_type text,target_id bigint,category text,details text)` | Require permanent user; accept only a fixed reportable target-type allowlist, derive target scope from the canonical row; enforce one active report per user/target; create report and upsert one active moderation item atomically. Never accept client-supplied scope. |
| `api.moderate_item(item_id bigint,action text,reason text)` | Private function locks queue item and target in consistent ID order; rechecks caller scope; validates state transition/reason; updates target visibility/moderation; inserts sanitized audit row; updates queue item and `last_action_id`; commit all or none. No external API calls inside transaction. |
| `api.review_study_submission(submission_id bigint,action text,patch jsonb,reason text)` | Study reviewer/global only; lock submission/file; require clean file for approval; validate edited subject metadata; create exactly one resource, relations, and provenance; update submission + moderation item; append audit. Reject requires reason. Unique constraints make retry idempotent. |

Role grant/disable/revoke has no `api` RPC in this release. A trusted provisioning command must update `app.role_assignments` and insert `audit_actions` in one transaction. If a future UI is explicitly approved, add a narrowly scoped audited endpoint then.

### 7.8 Storage buckets and RLS

Create private buckets; never use a public bucket because a hidden/rejected post must make its media inaccessible by URL.

```sql
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('post-media','post-media',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('study-files','study-files',false,62914560,array['application/pdf'])
on conflict (id) do update set public=excluded.public,
  file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_authenticated_upload on storage.objects for insert to authenticated
with check (
  private.is_permanent_user()
  and bucket_id in ('post-media','study-files')
  and owner_id=(select auth.uid())::text
);

create policy storage_owner_pending_read on storage.objects for select to authenticated
using (bucket_id in ('post-media','study-files') and owner_id=(select auth.uid())::text);

create policy storage_public_post_media_read on storage.objects for select to anon,authenticated
using (bucket_id='post-media' and exists (
  select 1 from app.post_media pm join app.posts p on p.id=pm.post_id
  where pm.bucket_id=storage.objects.bucket_id and pm.object_path=storage.objects.name
    and pm.scan_status='clean' and p.moderation_status='published'
    and p.visibility_status='visible' and p.deleted_at is null
));

create policy storage_public_study_file_read on storage.objects for select to anon,authenticated
using (bucket_id='study-files' and exists (
  select 1 from app.study_files sf join app.study_resources r on r.file_id=sf.id
  where sf.bucket_id=storage.objects.bucket_id and sf.object_path=storage.objects.name
    and sf.scan_status='clean' and r.publication_status='published'
    and r.review_status in ('auto_parsed','human_approved')
    and r.moderation_status in ('unverified','approved') and not r.is_duplicate
));

create policy storage_study_reviewer_read on storage.objects for select to authenticated
using (bucket_id='study-files' and private.can_review_study());
```

Do not grant Storage UPDATE/upsert. Each upload uses a new cryptographically random object path that contains no user UUID or original filename. Do not grant ordinary DELETE after an object has a metadata link. Unattached owner objects may be cleaned through a tightly scoped cleanup function; attached deletion is a trusted lifecycle job. Storage service keys stay server-side as required by the official Storage guidance.

## 8. Moderation and audit state transitions

Allowed moderation-item transitions:

```text
pending   -> approved | rejected | hidden | escalated
escalated -> approved | rejected | hidden
approved  -> hidden
hidden    -> pending (restore)
rejected  -> pending (reopen)
```

Same-state updates are idempotent and create no duplicate audit row. Reject, hide, and escalate require a nonblank reason. Moderation derives scope from target rows:

- Global Community post/comment → `global`, no college; Global Admin only in the roles defined here.
- College/Jurusan Community post/comment → `college`, target `college_id`.
- Building post/anchor/legacy pin → `college`, target building/pin college.
- Study submission/resource → `study`.
- Role assignment → `system`.

No RPC accepts a caller-provided scope as truth. Audit insertion occurs before the final target/queue writes in the same PostgreSQL transaction; any failure rolls back the entire action. Snapshots contain bounded metadata/status only—never content file bytes, tokens, passwords, or base64.

## 9. Deterministic seed import

### Package registrations

Register and seal at least:

| Package ID | Expected | Source facts |
|---|---:|---|
| `echowall-portable-demo-v1` | 696 | `demo-seed-bundle.v1`, with its two source snapshot IDs. |
| `echowall-all-student-km-v1` | 67 | Independent Global/All-KM source preserving document order 1–67. |
| `echowall-builtin-defaults-v1` | 19 | 14 Community + 5 Building defaults from `app-data.js`. |
| `echowall-study-manifest-2026-08-21` | 2,468 resources | Generated Study manifest; record exact input checksum and parser version. |

Before importing, calculate SHA-256 over canonical UTF-8 source bytes and compare it with `seed_packages.content_sha256`. The importer runs in a transaction per package and takes an advisory transaction lock derived from package ID so two deploy jobs cannot import concurrently.

### Post mapping

- Upsert only on `seed_key`; never on title/body and never on production ID.
- Bundle key: existing `demoSeedKey`.
- All-KM key: existing `demoSeedKey` and `seedOrder`.
- Built-in key: deterministic `builtin|{context}|legacy-id-{source id}` recorded in a checked import manifest.
- Preserve source text, title, hashtags, language, category, shape, color, rotation, anonymity, author display snapshot, timestamps, context, scope, and question status.
- Resolve legacy organization/major IDs through `colleges.legacy_org_id` and `jurusan.legacy_major_id`; fail on a missing or cross-college mapping.
- Resolve Building IDs exactly; fail rather than inventing a building.
- Imported authors use `author_id=null`; retain only the source author key in package metadata/provenance, never fabricate Auth users.
- Run the current deterministic engagement algorithm once during export/import and persist the final values into `seed_upvotes`, `seed_downvotes`, and `seed_display_order`. Never recompute these from wall row order after launch.
- Real votes begin in `post_votes`; generated display totals add live deltas to the immutable seed baseline.
- Seed rows are not owner-editable because they have no Auth owner. Moderation can hide/reject them; trusted import repair can update them only with a new package checksum/run record.

Assertions after all post packages: 782 distinct `seed_key` values, exact per-package counts, no scope constraint failures, no missing buildings/Jurusan, no duplicate source order within a package/wall, and zero vote rows created for display engagement.

### Study mapping

- `legacy_resource_key` preserves `study_*` IDs.
- `file_id` maps the `sha256:*` content hash to one `study_files` row; 36 exact duplicates point at canonical resources and remain non-public.
- `relatedResourceId` becomes `study_resource_relations`, normally `question_answer`.
- `resourceGroupId` becomes `resource_group_key`.
- `auto_parsed` rows use `review_status='auto_parsed'`; `manual_review` remains hidden from ordinary queries.
- Curated copied files must be byte-rehashed against the manifest before `scan_status='clean'`; a metadata row with no copied object remains valid but cannot be public-downloadable until a file exists.
- `sourceRelativePath`, parser warnings, source batch, and hash live in provenance; absolute workstation roots are never imported.

## 10. Verification gates

Do not launch until all gates pass:

1. `supabase db lint` and database advisors report no missing RLS on `app`, exposed unsafe views/functions, or unindexed foreign keys.
2. `supabase test db` pgTAP tests assert every table, view, grant, policy, constraint, trigger, and function signature.
3. For every table operation, tests cover `anon`, permanent authenticated non-owner, owner, wrong-college moderator, right-college moderator, Study reviewer, Global Admin, and service role.
4. Explicit negative tests include:
   - Supabase anonymous Auth cannot write;
   - an anonymous-display post never exposes `author_id` through `api`;
   - College A moderator cannot read/moderate College B content or Global Community;
   - Study reviewer cannot moderate Community/Map;
   - Global Admin cannot bypass audited moderation by updating an API view;
   - owner cannot alter `author_id`, scope, seed fields, counters, or moderation fields;
   - comments cannot target Building posts, cross posts, or reply to a reply;
   - second vote from the same user updates one row and exact counters;
   - two concurrent vote RPCs and two concurrent Study approvals remain consistent;
   - hidden/rejected media and Study files cannot be downloaded;
   - exact duplicate Study file cannot publish twice;
   - audit write failure rolls back moderation/role/review mutation;
   - no role can update/delete audit rows;
   - no browser role can insert a seed, legacy direct pin, role assignment, or clean-file status.
5. Recalculate vote counters from `post_votes` and compare to every `posts.live_*` value; provide a trusted repair migration/function but no public repair RPC.
6. Validate query plans for the four feed scopes, open questions, comment threads, moderation queues, and Study browse/search. Use keyset pagination and confirm the intended partial/composite indexes are selected.
7. Run the seed assertions in section 9 against a clean local database and a staging clone.
8. Inspect Data API settings and verify `app`/`private` return “schema not exposed”; verify only named `api` functions have EXECUTE grants.
9. Search the built frontend and deployment artifacts for `service_role`, secret-key prefixes, Cloudinary API secret, database passwords, and private provider credentials. The expected result is zero.

## 11. Rollout and rollback boundary

Recommended migration order:

1. schemas/default privileges;
2. catalogues/profiles and Auth profile trigger;
3. content tables/constraints/indexes/triggers;
4. Study tables;
5. roles/moderation/audit;
6. RLS helpers/policies;
7. API views/RPC wrappers/grants;
8. Storage buckets/policies;
9. seed packages/imports;
10. pgTAP and staging verification.

Rollback before user traffic may drop the new `api`, `private`, and `app` objects in reverse dependency order. After real writes begin, rollback is forward-only: disable the new frontend write path, keep Auth/Storage/database intact, export affected rows, and apply corrective migrations. Never drop or truncate posts, submissions, files, moderation, roles, or audit after launch as a routine rollback.

This plan changes no current EchoWall application, test, or data file. It is the implementation contract for a later, separately approved Supabase migration phase.
