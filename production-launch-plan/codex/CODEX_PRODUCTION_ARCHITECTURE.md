# EchoWall production architecture

Status: implementation plan; no production changes are authorized by this document  
Baseline observed: 2026-08-29, Asia/Singapore  
Baseline repository: current local working tree on branch **main**, HEAD **ab3ee792a5142f0a499af448cdc0a497da9510d3** plus all pre-existing uncommitted changes  
Truth order: **CURRENT RUNTIME > CURRENT SOURCE > CURRENT DATA > TESTS > REPORTS > OLD DOCS**

## 1. Outcome and non-negotiable invariant

Launch EchoWall as a static, vanilla JavaScript application on GitHub Pages. Use Supabase Auth, PostgreSQL, Row Level Security (RLS), the Supabase Data API, narrowly scoped PostgreSQL functions, and Supabase Edge Functions only for privileged or secret-bearing work. Upload compressed user photos directly from the browser to Cloudinary after a trusted Edge Function signs an allow-listed upload. Keep built-in campus knowledge and the initial curated Echo Library catalogue/files static where this is the lowest-parity-risk option. Store all new shared user activity remotely.

The current local latest working tree is the product-parity baseline. Infrastructure work must not alter:

- hash navigation, including the separate map.html document and its return flow;
- Home, Echo Map, Building Detail, Building Wall, Map Direct Posting;
- All KM, College, and Jurusan communities;
- Discussion and Question posts, comments, exactly one reply level, solved/reopen, and voting;
- named and public-anonymous contributions;
- current photo selection, crop/fit, preview, and rendering behavior;
- Echo Library browsing, search, filter, sort, real-file opening, Question/Scheme relationships, honest unavailable states, and Study upload;
- Ask Echo's current bounded local knowledge and building actions;
- English, Bahasa Melayu, Chinese, Light/Dark/System, responsive behavior, and keyboard-critical flows.

The migration may change storage, authorization, synchronization, and deployment. It must not redesign the product. Any unavoidable visible security change is recorded as a **PARITY EXCEPTION** with reason, impact, mitigation, and approval status in the decisions document.

## 2. What was actually verified

### 2.1 Current source and executable evidence

- Both entry documents were inspected. index.html loads the complete application; map.html is a separate Leaflet entry document with its own ordered script set.
- The two entry documents reference 50 unique local JavaScript sources: 49 first-party files plus the vendored Leaflet file. All referenced sources passed syntax checking.
- All 16 checked-in validation/test scripts executed successfully, including portable-path checks, demo seed integrity, Study upload, post-type unification, display counts, community interaction, All KM seed, role/scope, moderation, assist, management, dashboard, college-scope, and audit tests.
- Two syntax failures outside the active runtime were found only in historical checkpoint fragments. They are not loaded by either entry document and are not treated as current product failures.
- A GUI browser was not available to this planning session. Runtime click-through, visual, mobile, keyboard, multiple-tab, and cross-document assertions therefore remain mandatory Phase 0 captures; reports claiming prior browser QA are supporting evidence, not higher-priority truth.
- Existing user changes in the dirty working tree were not altered. The implementation baseline must be frozen from that exact reviewed state, not reconstructed from HEAD or an older GitHub artifact.

### 2.2 Material baseline measurements

| Item | Current measured value | Launch consequence |
|---|---:|---|
| Active runtime JavaScript | 49 files, 4,101,753 bytes / 3.91 MiB raw | No framework or bundler is required merely to deploy |
| Study manifest | 2,468 records, 2,198,190 bytes / 2.10 MiB raw | It is unconditionally loaded by index.html today; preserve initially, then measure route-level loading separately |
| Built-in real Study files | 377 files, 385,308,898 bytes / 367.46 MiB | Fits below the current 1 GiB Pages-site ceiling but consumes material repository, deploy, and bandwidth capacity |
| Built-in file formats | 363 PDF, 8 PPTX, 6 DOCX | Static file parity is broader than PDF; user submissions remain PDF-only |
| Publishable manifest rows | 2,284 | 377 open real files; 1,907 intentionally show unavailable |
| Hidden/import-review rows | 184 | Must not become public merely because they exist in source |
| Runtime bundled seed posts | 763 | Must retain stable display behavior yet never count as genuine adoption |
| Current Pages ZIP | 6,172,172 bytes / 5.89 MiB, 61 entries | It contains no Study implementation or files and is not the parity baseline |
| Repository excluding .git | about 683.18 MiB | An allow-list, not repository-wide upload, is mandatory |

The current workflow triggers on **master** while the active branch is **main**, then unzips the stale portable-demo ZIP. The current portable validator inspects working-tree files, not the deployed ZIP. A passing workflow would therefore not establish production parity.

### 2.3 Canonical routes and document transitions

| Current route | Required production behavior |
|---|---|
| #/ | Home |
| #/places | places/building browse |
| #/place/:placeId | Building Detail |
| #/place/:placeId/wall | Building Wall |
| #/community and #/community/all | community landing and All KM |
| #/community/:orgId | college community |
| #/community/:orgId/general | college general |
| #/community/:orgId/jurusan/:majorId | Jurusan community |
| #/study | Echo Library |
| #/study/upload | Study upload |
| #/study/resource/:id | resource detail/open |
| #/study/:jurusan[/sem/:semester[/subjectCode]] | Study browse hierarchy |
| #/org/:orgId/buildings, #/org/:orgId/building/:buildingId, #/org/:orgId/map | existing multi-college routes |
| legacy #/org/:orgId and #/wall/... | redirect to the current canonical community hashes |
| map.html | separate map document; relative link to index.html#/place/:id or Building Wall |

Unknown hashes continue to resolve to Home. Because routing is hash based, GitHub Pages needs no SPA fallback. It does need both entry documents, relative assets that work under a repository subpath, and tests from both the Pages project URL and any future custom domain.

Additional current-runtime facts override stale architecture/report claims:

- Canonical Community is All KM/College General/Jurusan; new posts have no batch. The legacy four-part wall hash ignores its batch segment.
- Static configuration marks Global/College descriptors “coming_soon,” but both are postable at runtime. Production must preserve runtime, not accidentally disable them from that stale flag.
- Current data has 12 colleges and 34 Community majors. The separate profile education directory has 17 institutions and four normalized programmes.
- Current campus data has 32 buildings, but only 19 have map footprints and are eligible for Map Direct Posting.
- A map-authored note appears on its Building Wall because it is one anchored building post. A normal Building-Wall-authored post has no anchor and does not appear on the map.
- Building notes currently have no comments. Building Detail shows description/purpose/hours/notes/events/count/photos or fallback outline and a Wall entry; it does not render highest-scoring note cards, and the outline is only the no-photo fallback. Do not “restore” lower-priority documented behavior during migration.
- Note positionX/positionY are stored but current wall rendering uses a CSS auto-grid and does not consume them.
- The fresh-browser visible set is 763 frozen runtime seed posts plus 19 persisted defaults = 782 notes before user additions. Homepage/college/building display figures are intentional independent overrides, not reliable adoption counts. Home currently shows 1,017 notes, 12 communities, 53 photo notes, and the date Aug 25, 2026; infrastructure migration must not silently replace them with database analytics.
- EN/BM/ZH are selectable, but current source contains incomplete/hard-coded strings. Parity means retaining current output; translation remediation is a separate product task.

### 2.4 Lower-priority evidence discrepancies

| Lower-priority evidence | Conflict with current source/data | Planning treatment |
|---|---|---|
| AGENTS/docs describe Community Batch navigation | canonical new routes/posts have no batch; legacy four-part wall hash ignores it | no production batch column or UI |
| docs/ARCHITECTURE says Building Detail shows highest-scoring notes over an outline | current profile shows no note cards and uses outline only when no photos | preserve current profile |
| docs/DATA_MODEL describes note schema 2 | Community normalization is schema 3; Building remains schema 2 | map current normalized fields, not old document |
| implementation report says 30 buildings/placed notes | current data has 32; only 19 map eligible; wall positions are unused | import 32/19 and keep auto-grid |
| Study report uses roughly 422 MB | independent logical-byte count is 385,308,898 bytes / 367.46 MiB; larger number was filesystem allocation | artifact gate uses logical bytes and exact hashes |
| Study reports cite full real-browser/mobile/full-manifest tests | mobile was explicitly not live-verified; checked-in upload suite uses a two-record fixture; cited 39-test real-data suite is absent | Phase 0 browser capture and persisted full-corpus tests are required |
| portable validator passes | it validates working-tree paths, while Actions deploys a stale ZIP | validate the exact generated Pages artifact |

### 2.5 Existing service/provider seams

| Current component | Actual boundary | Migration implication |
|---|---|---|
| AuthService | synchronous LocalStorage prototype; labels itself local-prototype but has no useProvider; EchoConfig auth selection is unused | introduce AuthProvider adapter before Supabase |
| CommunityService | community-key/scope helpers and reads, not a durable post repository | retain normalization helpers; route all note I/O through PostRepository |
| global notes/saveNotes | main Community create/read/write and voting mutate a browser-global array/whole LocalStorage store | highest-risk seam; wrap current behavior first |
| EchoNoteStore | focused Building-note façade only | LocalPostRepository must cover both Community and Building |
| CommentService | direct LocalStorage closure, no provider | wrap unchanged before SupabaseCommentRepository |
| MapNoteService | mature async ready/list/create/hide/delete/export/subscribe/useProvider seam | preserve facade; replace production provider and move privileged methods to ModerationGateway |
| StudyUploadService | mature async provider seam over IndexedDB | swap to Supabase StudySubmissionRepository; keep IndexedDB draft-only |
| StudyResourceService | static manifest plus approved local overlay | implement HybridStudyResourceRepository behind matching current methods |
| CloudinaryAdapter | partial signature/direct-upload adapter; blank config returns local data URL | replace with MediaProvider reservation/upload/confirm/lifecycle; local fallback dev-only |
| AdminPermission/Moderation/Audit | swappable synchronous local providers, but browser-controlled and bypassable | no production trust; server roles/RPC/audit contracts only; UI deferred |
| FreeAI/BISHENG/translation adapters | vendor/local adapters rather than authoritative stores | CampusKnowledgeProvider keeps local FreeAI path; external secrets disabled |
| I18n/Theme/preferences | browser-local services | retain as-is except provider-aware loading/error copy |

### 2.6 Exact current browser-store inventory

| Store | Current keys/database | Production disposition |
|---|---|---|
| LocalStorage — notes | echo-wall-notes; echo-wall-notes-backup:v1; echo-wall-schema-version; echo-wall-building-seed:v1 | no shared production authority; explicit legacy export/import decision |
| LocalStorage — identity | echo-wall-users:v1; echo-wall-user-session:v1; echo-wall-role-assignments:v1 | replaced by Supabase Auth/profile/role tables; never import passwords/roles |
| LocalStorage — interaction/admin | echo-wall-comments:v1; echo-wall-moderation-items:v1; echo-wall-moderation-reports:v1; echo-wall-audit-actions:v1 | comments become server rows; local moderation/audit is not trusted/imported |
| LocalStorage — map | echowall_map_note_anchors_v1; legacy echowall_map_notes | optional explicit canonical import; new production map posts are server transactions |
| LocalStorage — preferences | echo-wall-language:v1; echo-wall-theme:v1; echo-wall-translation-cache:v1 | remain browser-local |
| legacy cleanup | echo-wall-admin-session is removed at startup | do not resurrect |
| SessionStorage | echowall_place_return_source_v1 and echowall_map_return_v1, both 30-minute state | remain session-local with exact cross-document tests |
| IndexedDB | echowall-study-uploads-v1, version 1; submissions keyPath id; files keyed by SHA-256 | draft/resume cache only; Supabase Storage/PostgreSQL are production truth |

## 3. Target system context

Browser/UI → provider and repository interfaces → one of:

- static versioned frontend data for campus catalogue, built-in knowledge, translations, and initial curated Study catalogue;
- Supabase Auth for identity/session;
- Supabase Data API under RLS for ordinary row operations;
- PostgreSQL functions for atomic multi-row/state-transition operations;
- Supabase Edge Functions for secret-bearing Cloudinary signing/deletion and future genuinely privileged integrations;
- direct signed browser upload of a compressed image to Cloudinary;
- Supabase Storage for pending and approved new Study files;
- GitHub Actions → deterministic Pages artifact → GitHub Pages.

The browser receives only public configuration: Supabase URL, Supabase publishable key, Cloudinary cloud name, deployment base URL, build/version identifiers, and public feature flags. Supabase secret/service credentials, Cloudinary API secret, and any future AI credential exist only in trusted Edge Function or CI environments and never enter the Pages artifact.

### 3.1 Layer ownership

| Layer | Owns | Must not own |
|---|---|---|
| UI/render/router modules | DOM, current route state, current visible behavior | vendor calls, authorization decisions, secret logic |
| Providers/repositories | typed application operations, error normalization, retry/idempotency boundary | arbitrary HTML rendering |
| Supabase Auth | credentials, user identity, refresh/session lifecycle | public anonymous display name |
| PostgreSQL + RLS | shared metadata, relationships, ownership, policy, durable interaction state | image blobs or browser preferences |
| PostgreSQL functions | atomic publish, vote, solve/reopen, map-post transaction, approval transitions | Cloudinary secret |
| Edge Functions | authenticated secret/privileged operations and rate limiting | ordinary CRUD that RLS already makes safe |
| Cloudinary | compressed user photo object and delivery derivatives | API secret in browser, Study PDFs |
| Supabase Storage | new Study PDF objects and quarantine/publication lifecycle | current user-photo originals |
| GitHub Pages artifact | static application and approved public curated assets only | private provenance, pending submissions, credentials |

### 3.2 Development and fallback strategy

Keep local providers for deterministic development and regression comparison, selected explicitly by environment. Production provider selection is fail-closed:

- no silent LocalStorage fallback for posts, comments, votes, profiles, media records, Study submissions, moderation, or audit data;
- LocalStorage remains authoritative only for language, theme, harmless UI preferences, and optionally an explicitly marked unsent draft;
- IndexedDB may cache a user-selected Study draft before upload, but never becomes the production source of truth;
- service outages produce a visible retryable error and retain only the local draft that the UI already knows is unsent.

## 4. Current → production state map

“Migration method” describes the implementation path; this planning task performs no migration.

| CURRENT STORE | CURRENT DATA | PRODUCTION STORE | MIGRATION METHOD | PARITY RISK |
|---|---|---|---|---|
| LocalStorage echo-wall-users:v1 | prototype users and SHA-256 password records | Supabase Auth plus profiles | do not import passwords or fake users; real users sign up; optional verified mapping only by explicit user process | High: existing prototype credentials cannot safely carry over |
| LocalStorage echo-wall-user-session:v1 | prototype current-user session | Supabase Auth session managed by supabase-js | AuthProvider swaps implementation; map current UI events to Auth state events | High: confirmation/reset/session expiry differ |
| prototype user record | displayName, email, education status/org/program/start year | auth.users plus profiles | bootstrap profile from signed-up identity; validate on server | Medium |
| authorNickname snapshots | visible author identity | posts/comments.author_display_name | snapshot on create; never dynamically rewrite historical display | Low |
| isAnonymous + authorUserId | public anonymous display with local internal owner | author_id plus is_anonymous; safe public projection masks owner | RLS/view/RPC prevents owner identifier leaking to ordinary readers | High security |
| hard-coded role and local role assignments | prototype global/college/study roles | role_assignments and role_permissions, unexposed helpers | seed only authorized staff after separate approval; never trust user_metadata | High security |
| LocalStorage echo-wall-notes | user and locally seeded posts | posts | normalize through repository; one-time import is optional, explicit, and never automatic | High: local copies conflict with shared server truth |
| runtime JS seed bundle | 696 deterministic seed posts | posts seeded idempotently or versioned read-only static projection | deterministic stable UUID mapping; provenance and interaction policy | High: fake adoption/display counts |
| All KM seed JS | 67 deterministic posts | same unified posts structure | preserve language/type/score/order and stable seed keys | High |
| post.context/communityKey/wallKey | global, college, jurusan, building targeting | posts.context_kind plus nullable college_id, jurusan_id, building_id | derive legacy keys in adapter; database check permits exactly the valid FK combination | High |
| postType | discussion/question | posts.post_type enum/check | direct mapping | Low |
| questionStatus | open/solved | posts.question_status plus solved_at/solved_by | guarded database function for owner/moderator; null for discussion | Medium |
| category/shape/color/rotation/x/y | visual sticky-note metadata | typed columns on posts | preserve accepted values and numeric bounds | Medium visual |
| content/title | body and optional seed title | posts.content/title | preserve 500-character current content rule; validate client and DB | Low |
| imageDataUrl | base64 image in LocalStorage | no production equivalent | new uploads compress then Cloudinary; existing local blobs are not silently uploaded | High; explicit user-controlled import decision |
| imageUrl/publicId/name/crop/fit | local or Cloudinary-like media metadata | post_media plus crop_scale/fit | provider maps current render shape; no base64 in PostgreSQL | Medium visual |
| moderationStatus/isHidden | local publication/moderation flags | publication_status plus visibility_status and moderation fields | map exact visible states; privileged transitions audited | Medium |
| seed engagement counters/userVote | deterministic visible score and local delta | seed_display_score plus real votes rows | no fake vote rows; seed policy controls whether interaction is allowed | High display |
| LocalStorage echo-wall-comments:v1 | root comments and depth-1 replies | comments | repository import only if explicitly approved; database trigger enforces parent same post and parent depth zero | High |
| mutable vote fields in note | per-browser vote and aggregates | votes unique(post_id, user_id), aggregate query/RPC | optimistic UI reconciles authoritative returned counts | High race/auth |
| solve/reopen local mutation | owner/moderator question state | transactional function | compare-and-set expected status; audit moderator actions | Medium race |
| organization arrays | 12 colleges and community IDs | colleges reference table plus static frontend snapshot | deterministic seed; CI verifies static and DB seed IDs agree | Medium |
| major arrays | 34 Community Jurusan records | jurusan reference table plus static snapshot | deterministic seed; FK validation | Medium |
| campus-buildings.js | buildings, aliases, display/map metadata | buildings reference rows plus static map/Ask snapshot | DB rows validate post relations; frontend static remains parity/read path at launch | Medium |
| building hours source | display hours | building_hours plus static snapshot | seed exact localized/display order | Low |
| LocalStorage echowall_map_note_anchors_v1 | place-linked map-post anchors | map_note_anchors one-to-one with post | map direct publish RPC creates post, media link, and anchor atomically | High |
| LocalStorage echowall_map_notes | legacy direct map pins | legacy_map_pins read-only compatibility table or deterministic imported projection | preserve read path; no new writes through legacy API | Medium |
| map label selection | top visible note per building, client dedupe | derived query over visible anchored posts | do not persist a second label record; preserve deterministic selection/order | Medium |
| client footprint check | anchor placed in configured building polygon | static footprint plus server validation in publish operation | validate again server-side; preserve current eligible-building set/version | Medium |
| sessionStorage echowall_map_return_v1 | map center/zoom/selection return | sessionStorage | remain browser-local; version and TTL unchanged | Low |
| sessionStorage echowall_place_return_source_v1 | 30-minute return source | sessionStorage | remain browser-local | Low |
| data/study-subjects.js | 4 programmes, 33 subject rows | static public catalogue plus study_subjects reference rows | deterministic seed and CI equality check; retain null/unavailable names honestly | Low |
| data/study-resource-manifest.js | 2,468 built-in records and import metadata | sanitized public static catalogue; approved metadata mirrored in study_resources where relations/search need server state | generate a public allow-listed projection; private provenance never shipped | High privacy/parity |
| assets/study-files | 377 curated PDF/DOCX/PPTX files | GitHub Pages initially under Hybrid C | copy exact allow-listed files; verify path/hash/magic in exact artifact | High artifact/bandwidth |
| fileUrl mapping | real static resource path | base-path-safe static URL or approved Storage URL | resolver abstracts origin; exact file/hash test | High |
| scalar relatedResourceId/resourceGroupId | Question↔Scheme links | study_resource_relations plus group key | import every edge; keep current first-scheme display until UI intentionally supports many | High relation |
| IndexedDB echowall-study-uploads-v1 submissions/files | local pending/approved metadata and PDF blobs | study_submissions, study_submission_files, Supabase Storage | no automatic public migration; explicit uploader re-submission/import tool only if approved | High data loss expectation |
| duplicate checks | SHA-256 exact and title/year heuristics | unique object SHA plus duplicate-candidate metadata/function | exact hash server authoritative; likely match recomputed at submission/review | Medium |
| local moderation/verification | pending/approved/rejected; unverified/verified source/file | typed submission/resource states plus audit | privileged transition function validates taxonomy and relations anew | High security |
| kmk-knowledge-base.js | bounded local Ask Echo records | versioned static frontend data | remain local for launch; CampusKnowledgeProvider hides implementation | Low |
| campus building actions | Ask Echo links to hash routes | same static provider/action schema | test every action under project path/custom domain | Medium routing |
| future external AI config | empty/unsafe prototype hooks | no launch use; future Edge Function only | keep disabled; never put token in public config | High if enabled |
| echo-wall-language:v1 | EN/BM/ZH | LocalStorage | remain browser-local | Low |
| echo-wall-theme:v1 | Light/Dark/System | LocalStorage plus matchMedia | remain browser-local | Low |
| translation cache | generated translation cache | LocalStorage cache | remain browser-local and non-authoritative | Low |
| moderation and audit LocalStorage | prototype admin-later state | protected moderation/audit tables | no trust in local history; production begins from controlled server seed | High |

## 5. Core domain decisions

### 5.1 One posts model

Building, All KM, College, and Jurusan content should use one posts table. The differences are context, not different content types. A checked context_kind plus foreign keys prevents impossible combinations:

- all_km: no college, jurusan, or building;
- college: college only;
- jurusan: college and matching jurusan;
- building: building only.

Legacy communityKey and wallKey are adapter-derived strings, not duplicated database truth. This keeps rendering parity while removing divergent business rules. A Jurusan foreign key must also prove that the Jurusan belongs to the supplied college.

Discussion versus Question is a post_type field. question_status is null for Discussion and open or solved for Question. solved_at and solved_by record the transition; a guarded function enforces ownership or moderation authority. It returns the updated post and authoritative counts so the client does not chain unsafe reads/writes.

### 5.2 Exactly one reply level

Comments are one table with nullable parent_comment_id and stored depth 0 or 1. Database enforcement, not only UI, requires:

- a reply parent belongs to the same post;
- the parent has no parent and depth zero;
- root comments have null parent and depth zero;
- replies have depth one;
- publication/visibility rules apply to both.
- the referenced post is a Community post; Building posts reject comments to preserve current behavior.

The UI continues to show only the existing one-level Reply capability. No edit/delete controls are introduced for ordinary users.

### 5.3 Anonymous display with accountable ownership

Every real contribution is owned internally by the authenticated author_id. is_anonymous affects only the public display projection. Public ordinary reads return the current “Anonymous” label and must not expose author_id, email, role, or a stable pseudonymous join key. The owner can recognize their own content through a separate owner-scoped result flag. Authorized moderators obtain internal ownership only through protected policy/function paths, with an audit record when used for moderation.

### 5.4 Seed and genuine activity

Seed records are content fixtures, never Auth accounts and never fake vote rows. Every seeded row carries is_seed, seed_source, seed_version, seed_key, and an explicit interaction policy. Stable IDs are generated deterministically offline and every relation uses those IDs. Seeding is idempotent and does not overwrite real/user-moderated state.

Preserve current visible seed ordering and counters using seed_display_score/base comment count fields only where necessary. Real analytics exclude is_seed and synthetic base counters. Public disclosure of demonstration content is a launch approval decision because it is ethically preferable but visibly changes parity.

### 5.5 Map posts and labels

Map Direct Posting creates an ordinary building-context post plus one map_note_anchor. A single atomic database function owns that multi-row operation after any photo upload has succeeded. The database validates the building, post context, latitude/longitude range, footprint/config version, user, and idempotency key.

Building Wall reads the same post row, so no synchronization copy exists. The map derives one label per building from eligible, published, visible anchored posts using the same deterministic selection rule as local runtime. A stored “map label” would duplicate post content and is rejected.

Legacy direct pins remain a read-only compatibility source until the Phase 0 fixture proves none are needed or they are imported with stable provenance. The legacy create path remains disabled.

### 5.6 Static versus backend campus knowledge

For launch, keep these versioned and static:

- building geometry, aliases, and bounded Ask Echo action records;
- local Ask Echo knowledge records and refusal/boundary rules;
- EN/BM/ZH strings;
- Study subject/catalogue projection required for current browse behavior;
- the 377 approved curated files under the chosen Hybrid C plan.

Mirror colleges, Jurusan, buildings, hours, and Study subject IDs in PostgreSQL to enforce relational integrity. A CI contract test compares the static version/hash and relational seed. PostgreSQL becomes authoritative for user-created resources and interactions, while the frontend snapshot remains authoritative for current local navigation/offline read behavior during the launch window.

### 5.7 Built-in and user-submitted Study resources

Built-in resources carry source_kind=curated_seed and immutable seed provenance. Approved user submissions create source_kind=user_submission resource rows and relation rows; they do not mutate the built-in manifest. The Study repository overlays approved server resources on the static catalogue and resolves IDs across both namespaces without collisions.

Question/Scheme is many-to-many data even though the current UI advertises one related scheme. Import all 238 observed relation edges into a relation table, retain group membership, and preserve the current “first scheme” presentation rule. Do not discard the additional scheme records. The 56 unlinked schemes stay unlinked/unavailable rather than being guessed.

## 6. Authorization and server-operation boundary

Direct Supabase client plus RLS is sufficient for:

- reading published/visible posts, comments, reference data, and approved resource metadata;
- inserting one user's own draft/published post or root comment/reply when all checks are row-local;
- reading/updating the authenticated user's own profile under a strict column policy;
- reading and creating the user's own Study submission metadata and pending Storage object under a user-scoped path.

Use PostgreSQL functions for:

- vote upsert/remove plus aggregate return;
- solve/reopen compare-and-set authorization;
- atomic post + map anchor + attached-media registration;
- transitions that must validate parent/post/context relationships;
- Study approval/rejection/verification transitions and resource/relation publication;
- future moderation hide/restore/delete when audit and multiple rows must commit together.

Use Edge Functions only for:

- cloudinary-sign-upload;
- cloudinary-delete-asset;
- cleanup/reconciliation jobs that require Cloudinary credentials;
- server-side Study file inspection/copy if PostgreSQL/Storage policy cannot safely complete it;
- future external Ask Echo calls with a third-party secret.

The browser never calls a service-role/secret credential. Future Admin uses the same signed-in Supabase user JWT; database role/scope checks decide privileged access. An Edge Function may use its admin client only after it independently proves the caller's required role/scope and validates the target.

## 7. Realtime launch decision

Realtime is not required to preserve current local behavior. Launch with mutation responses, optimistic UI where already present, route-entry refresh, explicit retry, and optional short polling only if usability evidence demands it.

| Domain | Launch classification | Reason and later gate |
|---|---|---|
| Posts | Not needed | current UI does not promise live remote arrivals; refresh on route entry |
| Comments/replies | Useful, not required | consider only for the currently open post after stable launch |
| Votes | Not needed | optimistic value reconciles with transactional server response; subscription churn adds races |
| Solved/reopen | Useful, not required | refetch after mutation and on focus is sufficient |
| Moderation | Not needed in public UI | Admin is deferred |
| Study submissions/resources | Not needed | state changes are infrequent; explicit refresh/status query |

If enabled later, subscribe only to the active post/wall scope, include updated_at/version in events, deduplicate by row ID and version, reconcile optimistic mutations, remove channels on route change/unload, and treat events as invalidation hints rather than guaranteed delivery.

## 8. ADMIN LATER — BACKEND CONTRACTS REQUIRED NOW

Admin UI development is explicitly out of scope until the public production site is stable. The initial schema and interfaces must nevertheless reserve:

- active/disabled role assignments and global/college/study scope;
- publication and visibility states, including hide, restore, soft-delete, and separately approved hard-delete;
- Study approve/reject/verify state and immutable reviewer/audit metadata;
- moderation reason codes and free-text detail;
- reports/flags only if the current product retains them;
- actor, target, before/after summary, request/correlation ID, timestamp, and scope in append-only audit;
- Cloudinary public_id, asset status, delete request/result, and invalidate/version contract;
- seed/content provenance and analytics exclusion.

There is no client-side service credential and no hard-coded production admin email. No ordinary-user edit/delete UI is added just because a backend policy could support it.

## 9. Performance, cost, and storage guardrails

All provider limits are launch configuration with server-enforced maxima and observability:

| Guardrail | Launch recommendation | Why |
|---|---:|---|
| Community/post page size | 25, hard max 50 | bounds DOM and Data API work |
| Comment root page size | 20 roots plus their first-level replies; hard max 50 roots | preserves grouping while bounding payload |
| Search text | 2–100 characters | prevents accidental full scans |
| Main composer source image | 8 MiB | exact current input limit |
| Map composer source image | 450 KiB | exact current visible limit |
| Image long edge | 1,280 px | exact current main-compressor target |
| Compressed target | 450 KiB, hard acceptance 517.5 KiB only for current algorithm tolerance | preserves current quality/bandwidth balance |
| New Study PDF | 60 MiB if Supabase plan supports it | current parity; use resumable upload above 6 MiB |
| User photo uploads | initially 10 per user/hour and 30/day, configurable | abuse/cost protection; tune from real evidence |
| Posts/comments | conservative per-user and per-IP burst limits at Edge/DB where feasible | spam control without changing normal use |
| Orphan photo grace | 24 hours before deletion attempt | permits network/DB retry |
| Pending Study orphan grace | 24 hours if no submission references it | permits resumable/DB retry |
| Audit retention | minimum 365 days; security events longer per policy | future moderation accountability |
| Operational logs | 30–90 days, redact content/credentials | cost and privacy balance |

The 2.2 MiB raw Study manifest currently loads on every index.html route. It is gzip-friendly (measured Study source bundle about 250 KiB gzip), so do not introduce route lazy-loading during infrastructure migration unless a baseline performance gate fails and user approval classifies the visible timing change. Cache static files with versioned URLs; never cache authenticated Data API responses in a shared service worker.

As of 2026-08-29, GitHub documents a 1 GiB published-site limit and a 100 GiB/month soft bandwidth limit. Supabase Free documents a 50 MiB maximum Storage file-size ceiling and may pause inactive projects; Pro can configure a much higher file maximum. Cloudinary Free currently limits image uploads to 10 MiB and bills by rolling credits. All pricing/limits are time-sensitive and must be rechecked immediately before account selection and again before go-live.

## 10. Availability, consistency, and recovery posture

- The browser creates a UUID client_draft_id/idempotency_key before publish and reuses it across safe retries.
- A successful remote write followed by a lost response is resolved by fetching by owner + idempotency key, not by creating a second row.
- Photo upload and database publish are a saga: uploaded asset first enters uploaded_unattached; successful post transaction changes it to attached. A scheduled trusted cleanup deletes expired unattached assets.
- Study object upload and submission insert use the same deterministic upload ID/object path. A missing row leaves a quarantined orphan eligible for cleanup; a duplicate insert returns the existing submission.
- Vote changes and solve/reopen are single transactional functions with expected version/status. The UI always reconciles returned counts/state.
- Supabase, Cloudinary, or signer outages block only the affected write with a clear retry state; no production shared write silently diverts to LocalStorage.
- A broken RLS migration is a no-go and rolls back database migrations before frontend promotion.
- A bad Pages deployment is recovered by redeploying the known-good commit/artifact; data schema compatibility must span at least one frontend rollback version.

Detailed failure cases, status codes, retry boundaries, and compensation appear in the API, Cloudinary, Study, and migration test documents.

## 11. Low-risk release shape

1. Freeze the exact current dirty-tree parity baseline with screenshots/video, route fixtures, storage fixtures, hashes, and test output.
2. Introduce provider/repository contracts while Local implementations remain active; prove zero visual/behavior change.
3. Provision and migrate to Supabase Auth/Profile behind environment selection.
4. Migrate posts/comments/votes/map content using staging data and deterministic seeds.
5. Enable Cloudinary signed compressed-image flow.
6. Add sanitized static Echo Library artifact and remote Study submission overlay.
7. Produce and validate the exact allow-listed Pages artifact in staging.
8. Promote a known commit, observe, and retain rollback compatibility.
9. Declare **PUBLIC PRODUCTION STABLE** only after the acceptance window.
10. Begin Admin as a separate project.

The detailed plan may reorder Cloudinary before shared posts if implementation testing shows a cleaner feature flag boundary. Each phase remains independently reversible; no phase is allowed to mix product redesign with infrastructure migration.

## 12. Architecture go-live acceptance

Production architecture is acceptable only when all are true:

- exact baseline routes and map.html cross-document loops pass under the repository subpath and future-domain simulation;
- every listed feature in the parity matrix passes against current captured behavior;
- the exact Pages artifact, not merely the working tree, passes syntax, asset, link, secret, size, and Study-file checks;
- no Supabase secret/service credential, Cloudinary API secret, private import path, or future AI secret exists in Git history intended for publication, source bundle, config, logs, or artifact;
- all exposed database tables have explicit grants and enabled RLS; anon/auth/owner/other/moderator/service tests pass;
- images are decoded/oriented, resized/compressed before a signed direct Cloudinary upload, and PostgreSQL contains metadata only;
- pending Study objects and metadata are private and cannot appear in the public catalogue;
- seed records are deterministic, provenance-marked, excluded from genuine adoption analytics, and have no fake Auth accounts;
- Admin UI is absent from launch scope while role, moderation, audit, Study-review, and asset-delete contracts exist;
- known-good frontend and compatible database rollback have been rehearsed;
- error paths never pretend a local draft is a successful production write;
- user approvals listed in the decisions document are resolved.

## 13. Current official references and date-sensitive assumptions

Verified against current official documentation on 2026-08-28/29; recheck at implementation and release:

- GitHub Pages custom Actions workflow: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub Pages project paths, custom domains, and limits: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages , https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages , https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub repository and Actions limits: https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits , https://docs.github.com/en/actions/reference/limits
- Supabase API keys and migration to publishable/secret keys: https://supabase.com/docs/guides/getting-started/api-keys , https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Supabase Data API/RLS security: https://supabase.com/docs/guides/api/securing-your-api , https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth passwords, redirect URLs, user data, and sessions: https://supabase.com/docs/guides/auth/passwords , https://supabase.com/docs/guides/auth/redirect-urls , https://supabase.com/docs/guides/auth/managing-user-data , https://supabase.com/docs/guides/auth/sessions
- Supabase Edge Function user auth and CORS: https://supabase.com/docs/guides/functions/auth , https://supabase.com/docs/guides/functions/auth-headers , https://supabase.com/docs/guides/functions/cors
- Supabase Storage access/upload/file limits: https://supabase.com/docs/guides/storage/security/access-control , https://supabase.com/docs/guides/storage/uploads/standard-uploads , https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase Realtime behavior and limits: https://supabase.com/docs/guides/realtime/postgres-changes , https://supabase.com/docs/guides/realtime/limits
- Supabase plan limits/pricing: https://supabase.com/pricing , https://supabase.com/docs/guides/platform/billing-on-supabase
- Cloudinary signed client-side upload and signatures: https://cloudinary.com/documentation/client_side_uploading , https://cloudinary.com/documentation/authentication_signatures , https://cloudinary.com/documentation/image_upload_api_reference
- Cloudinary deletion/invalidation and current plan limits: https://cloudinary.com/documentation/delete_assets , https://cloudinary.com/documentation/invalidate_cached_media_assets_on_the_cdn , https://cloudinary.com/pricing/compare-plans

Important dated assumptions:

- Use current Supabase publishable keys in browsers and secret keys in trusted functions; legacy anon/service_role key names are on a published deprecation path.
- Supabase Data API exposure defaults are changing during 2026. Do not rely on dashboard defaults: explicitly expose only the intended schema, explicitly grant operations, and explicitly enable RLS.
- GitHub's documentation examples and current marketplace major versions are not perfectly synchronized. At implementation, verify maintained action releases, then pin each action to a reviewed full commit SHA.
- Cloudinary accepts a correctly signed timestamp for up to roughly one hour; EchoWall's signer will issue a business-level expiry near 60 seconds and add replay/idempotency controls.
- Pricing, free-plan pause behavior, quotas, upload maxima, and Pages limits are procurement inputs, not timeless architecture facts.
