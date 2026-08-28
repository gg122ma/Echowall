# EchoWall migration and parity test plan

Status: executable migration/test specification; no implementation, migration, deployment, resource creation, commit, or push is authorized  
Baseline date: 2026-08-29  
Baseline identity: current dirty local **main** worktree at HEAD **ab3ee792a5142f0a499af448cdc0a497da9510d3**, including pre-existing local changes  
Truth order: **CURRENT RUNTIME > CURRENT SOURCE > CURRENT DATA > TESTS > REPORTS > OLD DOCS**

## 1. Release rule

Infrastructure migration passes only when production matches the captured current local behavior for every in-scope feature, except a user-approved **PARITY EXCEPTION**. A test that merely establishes “the page loads” cannot substitute for route, data, authorization, relationship, failure, visual, responsive, keyboard, and cross-document assertions.

No phase may:

- redesign, remove, or silently “fix” current product behavior;
- add ordinary-user edit/delete UI;
- use production LocalStorage/IndexedDB as shared truth;
- expose Supabase secret/service credentials or Cloudinary API secret;
- deploy a frontend that needs a later database migration not already proven compatible;
- advance with a failing RLS bypass, exact artifact, media orphan, Study-private-state, route/base-path, or rollback test.

Severity:

| Severity | Meaning | Release effect |
|---|---|---|
| P0 | secret/data exposure, auth bypass, destructive corruption, unavailable primary site | immediate no-go/rollback |
| P1 | required feature missing, cross-scope leak, broken map↔wall/file path, repeated data loss | no-go |
| P2 | material visual/interaction/accessibility parity difference | no-go unless approved exception |
| P3 | low-impact cosmetic/diagnostic difference | document and schedule; approval by release owner |

## 2. Baseline evidence and gaps

### 2.1 Evidence captured in this planning audit

- index.html and map.html script order, routes, current providers, stores, and current dirty changes inspected;
- 50 unique local script sources are referenced by the two entry documents: 49 first-party plus vendored Leaflet;
- referenced runtime sources passed syntax checking;
- all 13 checked-in test scripts and three validation scripts passed;
- current deterministic seed tests passed: 696 portable-bundle posts plus 67 All KM runtime posts;
- current fresh-browser model identified: 763 frozen runtime posts plus 19 persisted defaults = 782 before user additions;
- Study upload checked-in suite: 74/74, but it uses a two-row fixture and does not prove full manifest/file integrity;
- independent full current-tree Study audit: 2,468 manifest rows, 2,284 publishable, 377 declared/physical/hash-correct files, 367.46 MiB, zero missing/stray;
- current Pages ZIP measured at 5.89 MiB/61 entries and contains zero Study paths; current validator does not inspect that ZIP;
- GUI browser execution was unavailable in this session.

### 2.2 Phase 0 evidence still mandatory

Before implementation, run the current local runtime in a real browser and freeze:

- desktop widths 1440 and 1024; mobile widths 390 and 360; at least current Chrome plus Firefox/Safari-compatible coverage;
- screen recordings/screenshots for every parity-matrix group in EN/BM/ZH and Light/Dark/System where relevant;
- keyboard-only recordings for login/register/profile, post/comment/reply, filters, Study upload, map selection/composer, modal close/focus return;
- fresh, populated, corrupt-store, and legacy-map browser storage fixtures;
- cross-tab/new-tab session and preference behavior;
- exact network waterfall, DOM landmarks, accessible-name/focus order, screenshot dimensions, and key UI copy;
- map.html → index.html Building Detail/Wall → back/return state with 30-minute session TTL;
- current image fixture outputs: SHA-256, dimensions, bytes, format, visual screenshot, crop/fit;
- current Study search/filter/sort order fixtures and every real/unavailable relation fixture;
- current Ask Echo query/answer/action/refusal corpus in three languages;
- current known quirks listed in this document, so a lower-priority report cannot override them.

Record the baseline commit created from the reviewed dirty state only after the user authorizes implementation. Do not substitute the current GitHub Pages ZIP or an old remote branch.

## 3. Test environments and fixtures

### 3.1 Environments

| Environment | Providers | Data | Purpose |
|---|---|---|---|
| local-current | current LocalStorage/IndexedDB providers | frozen current fixtures | parity oracle |
| local-contract | new interfaces with Local providers | identical frozen fixtures | prove provider extraction causes zero change |
| Supabase local/ephemeral CI | Supabase providers, local database/functions/Storage | deterministic test seed | schema/RLS/RPC integration |
| staging | separate Supabase project, Cloudinary staging folder/account, staging Pages/custom origin | non-production seed and test users | full browser/security/failure test |
| production candidate artifact | production public config but no promotion until approved | exact immutable artifact | secret/path/route/asset verification |
| production | production providers | deterministic seed plus real activity | smoke and observation only; no destructive load tests |

### 3.2 Required fixture identities

- anonymous browser;
- ordinary confirmed user A;
- ordinary confirmed user B;
- user with unconfirmed email;
- owner of target post/comment/submission;
- College moderator scoped to college 1;
- College moderator scoped to another college;
- Study reviewer;
- Global admin;
- disabled role assignment;
- trusted Edge Function/test service identity;
- seed authors as display records only, with no Auth account.

Never use a production service/secret key in a browser security test. Direct-bypass tests use the same public/publishable key an attacker can obtain.

### 3.3 Required content fixtures

- all_km, college, jurusan, and building Discussion and Question posts;
- named/anonymous real posts plus read-only and interactive seed policies;
- open/solved questions;
- root comment, one reply, attempted reply-to-reply;
- vote none/up/down/toggle plus two-tab race;
- map-authored anchored building post and ordinary unanchored Building Wall post;
- eligible and ineligible building footprints;
- legacy direct map pin;
- current 377-file Study corpus hashes and a minimized deterministic CI subset;
- paper/scheme reciprocal, current eight asymmetric relationships, unlinked scheme, unavailable record;
- pending/rejected/approved Study submissions and exact/likely duplicate files;
- image orientation/transparency/detail/corrupt/oversize fixtures;
- PDF valid/corrupt/spoof/active-content/oversize/duplicate fixtures.

## 4. Feature-by-feature local → production regression matrix

Every row is required unless “launch scope” is explicitly resolved otherwise.

### 4.0 Home and route shell

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Parity risk |
|---|---|---|---|---|---|---|
| H01 | Home | current section order, navigation cards/actions, content and visual hierarchy at #/ | static Pages shell/provider read adapters | semantic DOM + side-by-side screenshots + click map | same sections/order/actions/routes and approved pixel thresholds | High |
| H02 | Home presentation figures | 1,017 notes, 12 communities, 53 photo notes, Aug 25, 2026; independent from real data | static presentation/seed contract | text/screenshot and analytics comparison | exact visible figures; genuine analytics exclude seed/overrides | High trust |
| H03 | Unknown hash | current router silently renders Home | hash router | navigate several unknown/deep hashes | same Home result/no Pages 404 | Medium |
| H04 | Shared header/nav/auth/theme | persists across all current routes with current focus/menu behavior | static shell + AuthProvider/ThemeService | route sweep desktop/mobile/keyboard | no missing/duplicated handler or script-order error | High |

### 4.1 Auth and profile

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Parity risk |
|---|---|---|---|---|---|---|
| A01 | Register validation | normalized email, display name ≥2, password ≥8; current local signs in immediately | Supabase AuthProvider/profile bootstrap | browser + API boundary | same field errors/copy/order; approved confirmation exception only | High |
| A02 | Register success | account/session created and current UI continues | Supabase signUp, confirmation decision, redirect allow-list | browser email sandbox | exact approved path; profile exists once; no duplicate on refresh | High |
| A03 | Login | accepted prototype credentials become current user; error on bad credentials | signInWithPassword | browser + network failure | same visible modal/flow; safe generic errors | High |
| A04 | Logout | session clears and signed-out UI updates | Supabase signOut/auth event | browser two tabs | current tab immediately signed out; selected scope behavior documented | Medium |
| A05 | Session refresh | prototype session has no expiry and survives reload | Supabase persisted session/refresh token | expire access token, reload/new tab | user remains signed in through valid refresh; expired/revoked becomes clear sign-in state | High |
| A06 | New-tab session | same origin reads current local session | Supabase SDK persistence | sign in, open new tab | second tab resolves same valid user without UI flash beyond baseline threshold | Medium |
| A07 | Profile display/update | display name and optional education fields; onboarding can be skipped | profiles RLS/repository | browser + direct REST | current valid combinations save; other user/role fields cannot be changed | High |
| A08 | Education mapping | 17 institutions/four normalized programmes, statuses and year limits | static directory + profile checks | boundary fixtures | exact current list/legacy mappings and validation | Medium |
| A09 | Password reset | absent locally | Supabase reset/recovery route | email sandbox/deep-link | only approved parity exception; no account enumeration; repo subpath URL works | High |
| A10 | Email confirmation | absent locally/immediate session | Supabase hosted confirmation | signup link staging | decision honored; resend/copy/redirect work; no open redirect | High |
| A11 | Fake/demo authors | display-only records, no credentials | seed provenance | Auth/admin query | zero Auth users created for seed authors | P0 security |
| A12 | Role lookup | client prototype roles today | server role_assignments/capabilities | forge user_metadata/direct REST | only active server assignment grants scope; disabled/other scope denied | P0 |

### 4.2 Community, posts, comments, questions, votes

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Risk |
|---|---|---|---|---|---|---|
| C01 | All KM route | #/community/all is visible and postable despite stale coming_soon metadata | unified posts all_km context | local/prod side-by-side | same route/cards/composer/order/count behavior | High |
| C02 | College route | #/community/:orgId and direct /general; landing currently lists Jurusan, not General link | college context/router | route snapshots | do not add/remove links; direct General remains postable | High |
| C03 | Jurusan route | canonical no-batch route | college+jurusan FK | route/data tests | exact college-major association; legacy hash redirects | High |
| C04 | Legacy wall hash | batch-bearing alias ignores batch and redirects to Jurusan | hash adapter | navigation fixtures | exact canonical replace behavior | Medium |
| C05 | Named post | signed-in author name snapshot visible | publish_post/profile | browser/RLS | one post, exact note styling/content/time; owner internal | High |
| C06 | Anonymous post | public label Anonymous, internal owner retained | masked projection/RLS | user A/user B/anon reads | public cannot infer owner; owner capability still works | P0 |
| C07 | Discussion | no question status/action | posts checks | UI + direct REST | renders current badge/actions; question_status null enforced | Medium |
| C08 | Question open | open question UI/actions | typed fields | UI + DB check | exact visible open state | Medium |
| C09 | Solve | author or permitted moderator only; runtime demo immutable | set_question_status RPC | A/B/mod/seed | authorized transition once; unauthorized/seed refused; returned state authoritative | High |
| C10 | Reopen | same ownership/moderator model | compare-and-set RPC | race two tabs | one valid transition; stale request conflicts/refetches | High |
| C11 | Root comment | signed-in; Community only; ≤500; named/anonymous | comments RLS/trigger | UI + direct REST | visible oldest-first and count updates; Building target rejected | High |
| C12 | One-level reply | reply to root on same post only | FK/trigger | UI and crafted REST | depth 1 succeeds; cross-post/reply-to-reply fails | P0 integrity |
| C13 | Comment anonymity | public Anonymous but internal owner | projection/RLS | A/B/anon/mod | no public owner leak | P0 |
| C14 | Comment ordering | visible published/unhidden, oldest first | query index/order | fixture timestamps | exact stable order with ID tie-break | Medium |
| C15 | No Building comments | current Building notes expose none | DB validation/UI adapter | crafted insert + UI | no control and insert rejected | High |
| C16 | Vote up/down/toggle | current one per browser, signed-out allowed, seed restrictions | vote RPC/unique user row | UI matrix | authenticated behavior/counters exact; approved guest-vote exception shown | High |
| C17 | Vote uniqueness | one viewer intent per post | unique(post,user) | parallel 20 requests | one row; aggregate consistent | P0 integrity |
| C18 | Vote race | current optimistic mutation can fail silently; production must reconcile | transactional RPC/version | injected loss/two tabs | returned/refetched aggregate wins, no double count | High |
| C19 | Read-only runtime seed | comments allowed, vote/solve unavailable | seed interaction policy | UI/direct functions | exact capabilities and fixed counters | High |
| C20 | Interactive stored default seed | current stored defaults votable | seed interaction policy/base score | UI/API | current vote effect preserved without fake vote rows | High |
| C21 | 500-char enforcement | current intended limit; main UI relies on maxlength | DB check + client | paste/programmatic REST 500/501 | 500 accepts, 501 rejects in every composer/API | Medium |
| C22 | Visual note metadata | shape/color/rotation/crop/fit; positions stored but unused | typed DB/projection/CSS | screenshots/data round-trip | same card pixels/auto-grid; do not start using x/y | High visual |
| C23 | Filter/search/sort leakage | current wallState can persist across contexts | UI state unchanged | navigate with active filters | production matches captured current behavior; no infrastructure “fix” | Medium |
| C24 | Display counts | homepage/college/building overrides independent from truth | seed_display/base display contract | snapshots/analytics query | visible values unchanged; analytics exclude them | High trust |
| C25 | Failed publish | current local usually persists immediately | remote idempotency/draft state | offline/500/drop response | approved exception: never false-success; draft + Retry; one server row | High |

### 4.3 Media

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Risk |
|---|---|---|---|---|---|---|
| M01 | Wall image selection | JPG/PNG/WebP ≤8 MiB | MediaProvider | file fixture browser | same accept/reject and localized UI |
| M02 | Wall compression | long edge ≤1280, WebP/JPEG, q0.84 loop, 450 KiB target, 517.5 KiB tolerance | browser compressor | golden fixture dimensions/bytes/screenshots | same algorithm/version and acceptable visual delta |
| M03 | Map image selection | source already ≤450 KiB, same three types | map policy | boundary files | exact input cap; approved re-encode exception only |
| M04 | EXIF/orientation | current browser-dependent visible orientation | explicit decode/orient | EXIF 1–8 suite | correct human orientation; no mirrored/rotated result |
| M05 | Crop/fit | scale 1.0–1.8 and cover/contain are display metadata | post_media + existing CSS | screenshot matrix | same visible crop in cards/detail |
| M06 | Signed reservation | not securely complete locally | signer Edge Function | JWT/CORS/param tamper | only authenticated, short-lived, server allow-listed signature |
| M07 | Direct upload | configured path uploads browser→Cloudinary | direct HTTPS | network trace | compressed Blob only; no proxy/original/base64 |
| M08 | Response confirmation | absent locally | confirm Edge Function | response-signature tamper | only verified reserved asset becomes attachable |
| M09 | Photo rendering | secure Cloudinary image and current note UI | media projection/delivery | visual regression/CSP | exact layout; URL host/version valid |
| M10 | Upload failure recovery | local lacks full orphan contract | reservation/idempotency/cleanup | fail signer/upload/confirm/DB individually | draft retained; one row/object; orphan scheduled/deleted |
| M11 | Double publish | current button guards but network unknown | idempotency key | double click/lost response | one post, one media, one anchor if map |
| M12 | No original retention | local source not separately stored | browser compressed master policy | Cloudinary inventory | only compressed master/derivatives exist |
| M13 | Secret absence | Cloudinary secret must never reach browser | Edge secrets/artifact scan | devtools/bundle/history scan | zero matches; signature alone constrained |

### 4.4 Map, places, Building Detail, Building Wall

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Risk |
|---|---|---|---|---|---|---|
| P01 | map.html load | separate document, Leaflet, relative scripts | Pages artifact/base path | staging project URL | loads without root-path/404/CSP errors |
| P02 | Building search/select | current Echo Map search and 19 interactive footprints | static building/footprint version | query/click fixtures | same matches, labels, zoom/selection |
| P03 | Building Detail | description/purpose/hours/notes/events/count/photos or outline fallback; no top-note cards | static data/router | screenshot for photo/no-photo buildings | exact current content/conditional outline |
| P04 | Building Wall | building context sticky wall; no comments | posts context | route/UI/RLS | same posts/composer/actions; comments absent |
| P05 | Map Direct Posting | sign-in, click eligible footprint, compose post | MapNoteRepository/RPC | end-to-end | one anchored building post with exact fields |
| P06 | Same map note on Wall | map-created note immediately appears in Building Wall | one shared post row + anchor | post map, click label/open wall | same post ID/content/media/score, no copied record |
| P07 | Wall post not on map | ordinary Building Wall post has no anchor | anchor one-to-one optional | publish on Wall/refetch map | absent from map, present on Wall |
| P08 | Map label selection | at most five labels, highest score, one per building; click Wall not exact note | derived query/adapter | seeded scores/locations | exact deterministic chosen set/order/link |
| P09 | Footprint eligibility | 19/32 current buildings allow placement | server/client same version | click/crafted RPC in/out polygon | current eligible set; out-of-footprint rejected |
| P10 | Legacy direct pins | read/merge/moderate/export; creation unsupported | compatibility projection/table | legacy fixture | still visible/listed as current; create rejects |
| P11 | map → index link | relative index.html#/place/:id or Wall | base-path resolver | repo subpath/custom-domain simulation | no origin/path escape; correct hash |
| P12 | map return state | echowall_map_return_v1, 30-minute session snapshot | sessionStorage | navigate/back/time travel | center/zoom/selection restored within TTL, expired after |
| P13 | place return source | echowall_place_return_source_v1, 30-minute TTL | sessionStorage | map→detail/wall/back | exact captured return behavior |
| P14 | Building Wall leave behavior | current history.back can leave EchoWall | current router behavior | direct/history fixtures | match baseline; do not redesign during migration |
| P15 | Generic org maps | 11 centers, empty building registries; KMK generic map unavailable | static configs | route matrix | same framework-preview/unavailable output |

### 4.5 Echo Library and Study upload

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Risk |
|---|---|---|---|---|---|---|
| S01 | Browse hierarchy | 4 programmes/33 subject rows; current null/missing subjects honest | static sanitized catalogue | route/snapshot | exact counts, null/unavailable behavior |
| S02 | Publishable catalogue | 2,284/2,468 built-ins visible under current rules | sanitized projection | full manifest comparison | exact public IDs/order/fields excluding private provenance |
| S03 | Search | current exact code, prefix code, title, topic, year priority | HybridStudyRepository | golden query list | exact ordered IDs for static catalogue and deterministic overlay |
| S04 | Filter | category/subtype/year/source college/subject | repository adapter | combinatorial fixture | exact current included IDs/options |
| S05 | Sort | relevant/newest/oldest current rules | adapter/server overlay | stable timestamp/year ties | same IDs/order with deterministic tie-break |
| S06 | Real file open | 377 mapped files: 363 PDF, 8 PPTX, 6 DOCX | Pages static files/base resolver | exact artifact open/hash/magic | every declared file 200, exact SHA/magic/name |
| S07 | Unavailable state | 1,907 publishable rows lack file and show disabled explanation | fileAvailability | UI + link crawl | no broken active link; exact honest state |
| S08 | Question/Scheme | 238 edges, current primary link behavior; eight asymmetric cases | relation rows/adapter | full relation fixture | no dangling/cross-subject edge; current advertised primary preserved |
| S09 | Unlinked scheme | 56 schemes currently unlinked | relation table | resource detail | stays independent; no guessed relationship |
| S10 | Upload auth | signed-in required | Supabase Auth/RLS | anon/auth browser/API | anon cannot create/upload |
| S11 | PDF validation | PDF only, nonempty, ≤60 MiB, %PDF-, SHA-256 | client + server quarantine | boundary/spoof files | same normal UX; server rejects spoof/oversize |
| S12 | Exact duplicate | built-in + submission SHA exact blocks currently | canonical hash/duplicate function | real corpus duplicate | exact identified without second object/public record |
| S13 | Likely duplicate | same subject/type/year compatibility and title overlap ≥0.6 warns/accepts | server heuristic | golden title fixtures | same candidate/warning decision |
| S14 | New submission state | pending and unverified | private bucket + DB | submit in one/two browsers | durable cross-device pending visible only to owner/reviewer |
| S15 | Pending not public | current overlay includes approved only | positive publication RLS | anon search/direct Storage URL | zero metadata/file exposure |
| S16 | Approved publication | approved local upload becomes overlay | protected review/promotion contract | reviewer staging path if launch-enabled | exactly one public resource/file; relation/search updates |
| S17 | Rejected state | not public, reason required | review function/audit | reviewer/owner/anon views | owner sees safe status/reason; public sees nothing |
| S18 | File recovery | IndexedDB currently local/orphan-prone | TUS/private Storage/idempotency | interrupt >6 MiB upload/finalize | resumes same path/submission; cleanup bounded |
| S19 | Built-in privacy | current manifest source exposes private import fields/paths | public projection/artifact scan | scan repo candidate/artifact | no sourceRelativePath, /Users path, warnings, generator private data |
| S20 | IndexedDB authority | current only; production forbidden as truth | provider selection | clear IndexedDB/new browser | server submission remains; clearing cache loses no authoritative state |
| S21 | Manual-review imports | 150 exist but no current consuming UI | private provenance/review later | public projection query | hidden until explicit review; no Admin UI introduced |
| S22 | Static file outage/404 | current real opening expects file | exact artifact gate | remove fixture in candidate | build fails before deploy |

### 4.6 Ask Echo, language, theme, responsive, keyboard

| ID | Feature | Current expected behavior | Production dependency | Test method | Pass criteria | Risk |
|---|---|---|---|---|---|---|
| U01 | Ask Echo local answer | FreeAI local provider wins; bounded top-document retrieval | LocalCampusKnowledgeProvider/static KB | golden prompt corpus | same answer/action/refusal within frozen normalization |
| U02 | Building actions | current Ask Echo actions route to building hashes | base-path router | click every action | exact Building Detail route under repo/custom domain |
| U03 | Boundaries | current forbidden/medical/course rules | local rules | adversarial corpus | same bounded refusal; no external call |
| U04 | No external AI secret | current external config blank | future proxy disabled | network/artifact scan | zero external model request/key at launch |
| U05 | Known Ask inaccuracies | current assistant says sign-in to vote/report although runtime differs | parity baseline | golden prompt | preserve during infrastructure migration; product fix separately approved |
| U06 | EN | selectable with current partial/hardcoded coverage | i18n static/local preference | full route screenshots | same current strings/fallbacks |
| U07 | BM | same | i18n | full route screenshots | same current strings/fallbacks |
| U08 | ZH | same | i18n | full route screenshots/CJK input | same current strings; no unwanted legacy rewrite in remote data |
| U09 | Language persistence | LocalStorage preference | browser-local | reload/new tab | same selected locale behavior |
| U10 | Light | current theme tokens | ThemeService | screenshots | approved pixel/layout thresholds |
| U11 | Dark | current theme tokens | ThemeService | screenshots | same |
| U12 | System | responds to OS media change | matchMedia/local preference | emulate OS switch | live change only in System mode |
| U13 | Mobile/responsive | current layouts at captured widths | static CSS | visual/interaction at 390/360 | no overflow/hidden critical control/new reflow |
| U14 | Keyboard critical flows | current reachable controls/modals | unchanged DOM + provider async state | keyboard-only scripts/manual | focus visible, logical order, escape/close and focus return |
| U15 | Loading/errors | local often immediate; remote adds latency | repository state adapter | 3G/offline/timeout | no duplicate UI/layout redesign; clear aria-live retry states |

## 5. Security test matrix

All tests run against the final migrations with only the public/publishable key unless “trusted” is specified.

| ID | Attack/control | Procedure | Required result | Gate |
|---|---|---|---|---|
| SEC01 | anon table matrix | SELECT/INSERT/UPDATE/DELETE every exposed table as anon | only documented published reads; no shared writes except explicitly allowed none | P0 |
| SEC02 | owner versus other user | user B crafts filters/body owner ID for A's rows | cannot read private fields or mutate A | P0 |
| SEC03 | profile escalation | update role, email, id, moderation fields/user_metadata | rejected/ignored; capabilities unchanged | P0 |
| SEC04 | moderator scope | college-1 moderator targets college-2/global/study | denied; same-scope allowed only contract action | P0 |
| SEC05 | disabled role | repeat privileged requests after assignment disabled | denied immediately according to token/helper design | P0 |
| SEC06 | direct REST bypass | skip UI and call Data API/RPC with crafted context/status/seed/timestamps | constraints/RLS/functions reject | P0 |
| SEC07 | RLS view/function | query every view; call every exposed function | security_invoker or safe definer; no private columns/bypass | P0 |
| SEC08 | service credential absence | scan source, Git history candidate, JS, source maps, artifact/network | no Supabase secret/service key/database password | P0 |
| SEC09 | Cloudinary secret absence | same scans/devtools/logs | no API secret | P0 |
| SEC10 | upload signature expiry | begin after business expiry and technical replay window | client refuses/Cloudinary rejects; cannot attach | P0 |
| SEC11 | upload replay | reuse signed fields/public_id/file from another tab/user | overwrite false; reservation owner/state prevents attach | P0 |
| SEC12 | upload param tamper | change folder/public_id/tags/context/transform/overwrite | Cloudinary signature fails or confirmation conflicts | P0 |
| SEC13 | response forgery | forge secure_url/version/signature/format/bytes | confirm function rejects | P0 |
| SEC14 | image MIME spoof | renamed executable/SVG/polyglot/corrupt image | magic/decode rejects before signature | P0 |
| SEC15 | oversized/extreme image | >composer limit or pixel cap | rejected; no reservation/object | P1 |
| SEC16 | PDF MIME spoof | fake type/extension but no %PDF-; active content fixture | quarantine/reject; never public | P0 |
| SEC17 | oversized PDF | byte below/at/above configured maximum | boundary exact; no orphan/public metadata | P1 |
| SEC18 | Storage IDOR | user B reads/writes/removes A pending object/path | denied by storage.objects RLS | P0 |
| SEC19 | pending Study exposure | anon/auth queries resources/submissions and guesses URLs | no row/object access | P0 |
| SEC20 | anonymous ownership | compare public post/comment JSON, errors, timing | no author_id/email/join key; moderator protected path can audit | P0 |
| SEC21 | vote uniqueness | concurrent upsert and alternate values | one row/user/post, valid aggregate | P0 |
| SEC22 | seed interaction/analytics | attempt vote/solve seed and run adoption queries | policy exact; analytics excludes seed/base display | P1 |
| SEC23 | comment/reply auth | anon comment, building comment, cross-post parent, depth-2 | all rejected | P0 |
| SEC24 | cross-scope insert | mismatched college/Jurusan/building IDs or fake key | constraint/trigger rejects | P0 |
| SEC25 | solve authorization | other user/direct update vs owner/mod function | only authorized compare-and-set | P0 |
| SEC26 | moderation audit | privileged action without reason/audit or direct status update | impossible; append-only audit present | P0 |
| SEC27 | upload double-submit | same/different idempotency with same draft | one intent/object/post/submission; mismatch conflict | P1 |
| SEC28 | orphan cleanup safety | orphan and attached assets with similar timestamps | only unreferenced expired object deleted | P0 |
| SEC29 | CORS | hostile Origin, null Origin, allowed exact origins/preflight | hostile denied; allowed response exact + Vary | P1 |
| SEC30 | Auth redirect | crafted redirect/open redirect and repo subpath reset | only allow-listed complete URLs | P0 |
| SEC31 | seed Auth accounts | enumerate Auth users under trusted audit | none correspond to demo authors | P1 |
| SEC32 | public Study projection | scan for private source paths/warnings/hashes/reviewer/uploader | none exposed beyond approved contract | P0 privacy |
| SEC33 | secrets in logs | force errors at Auth/Edge/Cloudinary/Storage | JWT/signature/secret/password/content redacted | P0 |
| SEC34 | SQL/query abuse | wildcard/oversized search, cursor tamper, invalid enum/JSON | bounded validation; no error detail leak | P1 |

## 6. Failure and consistency tests

| ID | Injected condition | Expected durable outcome | Expected UI | Recovery proof |
|---|---|---|---|---|
| F01 | Cloudinary success + confirm/DB outage | reserved/object or uploaded_unattached, no visible post | draft + Retry | retry attaches once; cleanup after grace |
| F02 | post DB commit + response loss | one post/media/anchor under idempotency | “checking status,” then success | owner lookup returns exact row |
| F03 | DB post without media metadata | transaction cannot commit partial | failure, no broken card | invariant query returns zero |
| F04 | signer unavailable | no upload/object/post | prepared preview retained | retry same draft |
| F05 | Cloudinary unavailable/420 | reservation only | rate/upstream message | retry/abandon; expiration cleanup |
| F06 | double click publish/comment | one durable record | one card/comment | unique idempotency row |
| F07 | vote concurrent tabs | one user vote and correct totals | optimistic correction | authoritative RPC/refetch |
| F08 | solve/reopen concurrent owner/mod | one version transition | stale message/refetch | final state/audit coherent |
| F09 | Supabase outage | static campus/curated reads may remain; no shared local success | explicit unavailable/draft | eventual retry, no duplicates |
| F10 | Storage upload completes + finalize lost | one private object, awaiting finalize | recoverable pending | repeat finalize same result |
| F11 | Study intent + partial >6 MiB upload | one TUS partial object/path | resume progress | same offset/path completes |
| F12 | Study approval copy succeeds + DB fails | copied object tracked, resource still nonpublic | remains pending | retry or compensation deletes copy |
| F13 | orphan cleanup job fails | retryable queue, attached unaffected | no public change | backoff/alert then terminal state |
| F14 | broken RLS migration | integration exposure/403 gate fails | no frontend promotion | restore prior policies/migration |
| F15 | bad Pages deployment | smoke/asset/secret test or live alarm | old production retained if prepromotion; otherwise outage banner/status | redeploy known-good commit |
| F16 | stale frontend after schema expand | prior production artifact still works | no error | one-release compatibility suite |
| F17 | corrupted/legacy local storage present on first production visit | preferences/draft handled; no silent shared import | explicit import/ignore decision | server data untouched |
| F18 | auth refresh expires during upload | upload may finish; confirm/publish demands refreshed owner JWT | reauthenticate then recover reservation | no orphan/double post |

## 7. Performance, cost, and capacity gates

### 7.1 Frontend/Pages

- Compute exact uncompressed and compressed artifact bytes and file count.
- Fail if artifact approaches a warning threshold of 800 MiB or the current documented 1 GiB Pages limit.
- Fail if any artifact file exceeds Git/GitHub object policy or if total deployment nears the ten-minute limit in staging rehearsal.
- Verify the exact 377 curated Study files total 385,308,898 logical bytes and match hashes/magic.
- Verify no video, checkpoints, source archives, reports, private import provenance, local planning files, node_modules, .git, or unrelated large asset enters the artifact.
- Capture cold/warm index.html and map.html transfer/parse/interactive timing at desktop and throttled mobile. The current 2.2 MiB raw manifest is a known unconditional index cost; do not optimize it during migration unless a separate approved parity change is needed.
- Track Pages bandwidth. At 367.46 MiB of curated files, roughly 272 complete-corpus download equivalents would consume 100 GiB; ordinary users open subsets, but a crawler can materially affect the soft limit.

### 7.2 Database/query

Seed representative stages at 1×, 10×, and a launch-year projection. Run EXPLAIN (ANALYZE, BUFFERS) in nonproduction for:

- posts by context + visible status + created_at/id;
- posts filtered post_type/category/question_status;
- comments roots by post and replies by parent;
- vote upsert/aggregate;
- owner idempotency lookup;
- map anchors by building/bounds/visible post;
- Study resources by subject/type/year/status and normalized search;
- submissions by owner/status and reviewer queue;
- role assignment/scope helper checks.

Acceptance:

- no sequential scan on growing user tables for standard paginated queries unless proven smaller/faster;
- p95 ordinary read under 500 ms from target region in staging, p95 mutation under 1 s excluding media transfer;
- no unbounded result; page hard max 50;
- FK support indexes and policy predicate indexes present;
- RLS policy plans use stable scalar subqueries/helpers and do not perform per-row network/function work;
- database/index/storage growth dashboard and budget alerts configured.

### 7.3 Media/Storage/Realtime

- Record prepared image p50/p95 bytes, processing time, upload time, delivery bytes, attach conversion, and orphans.
- Guard target 450 KiB, max 529,920 bytes, 1,280 px, signer 10/hour and 30/day/user initially.
- Test 60 MiB Study upload on chosen plan/region and TUS resume above 6 MiB.
- Alert on pending/private Storage object age, approved storage growth, and static Pages file bandwidth.
- Realtime is disabled at launch; confirm zero subscriptions/publications beyond platform defaults. If later enabled, separately cost/load test scoped channels and cleanup.

All pricing/limits are rechecked within seven days of go-live. Current values in architecture/deployment/Study plans are time-sensitive.

## 8. Phased migration plan

### Phase 0 — Freeze current parity baseline

| Item | Plan |
|---|---|
| domains/files touched later | test fixtures, screenshots/video, route/storage manifests, planning/QA outputs only; no product change |
| DB migrations | none |
| configuration | local static server matching production MIME/cache/path; clean browser profiles |
| tests | all current scripts; every Phase 0 manual capture; exact file/hash/store/route inventory; known quirks |
| rollback | not applicable; preserve current worktree and a user-approved baseline commit/tag after implementation authorization |
| go | user signs baseline inventory; current runtime screenshots and storage fixtures complete |
| no-go | browser/manual capture missing, dirty changes not represented, source/runtime conflict unresolved |

### Phase 1 — Provider/contracts while Local providers remain active

| Item | Plan |
|---|---|
| domains/files touched later | new provider/repository modules, config selector, adapters around AuthService/EchoNoteStore/CommentService/MapNoteService/Study services/Cloudinary/Ask Echo; minimal call-site rewiring |
| DB migrations | none |
| configuration | local provider explicit; production provider option defined but not used |
| tests | contract suites; side-by-side domain projections; full screenshots/keyboard/routes; no raw vendor calls in UI |
| rollback | select old/local adapters in dev or revert this phase; no remote data exists |
| go | every parity row that can run locally is unchanged; provider errors/timeouts normalized |
| no-go | render modules contain vendor-specific calls or any current feature changes |

### Phase 2 — Supabase Auth/Profile

| Item | Plan |
|---|---|
| domains/files touched later | AuthProvider, ProfileRepository, auth UI adapter, public config, recovery route handling |
| DB migrations | profiles; role/capability reservation; grants/RLS; safe bootstrap trigger |
| configuration | separate local/staging Auth; Site URL and exact redirect allow-list |
| tests | A01–A12, SEC01–SEC05/30/31, refresh/new-tab/email sandbox, all current UI regression |
| data | do not import prototype password hashes or demo authors; explicit user re-registration |
| rollback | staging provider switch; before production no durable dependency. After production, frontend rollback keeps Supabase Auth contract v1 |
| go | confirmation/reset decision approved; profile trigger cannot block signup; role forgery fails |
| no-go | service key/browser, redirect gap, session loop, role stored in user-editable metadata |

### Phase 3 — Supabase Posts/Comments/Votes/Map content

| Item | Plan |
|---|---|
| domains/files touched later | Post/Comment/Vote/Building/Map repositories, result adapters, staging seed/import scripts |
| DB migrations | reference tables; posts/comments/votes/map anchors/legacy pins; provenance; functions; indexes; grants/RLS |
| configuration | Data API exposed schema explicit; Realtime off |
| tests | C01–C25, P01–P15 except remote media, SEC06/07/17/20–26, races/idempotency |
| data | deterministic seeds with stable IDs; no automatic local user-content import; approved explicit import path only |
| rollback | expand-only schema remains; staging provider returns Local for regression. Production promotion waits until full phase; after live, known-good Supabase frontend uses same schema |
| go | one unified context model, Community-only comments, seed counters/provenance, map one-way anchoring, exact direct REST denial |
| no-go | cross-scope rows, duplicate IDs/votes/comments, map/Wall copy, seed analytics pollution |

### Phase 4 — Cloudinary compressed signed-image pipeline

| Item | Plan |
|---|---|
| domains/files touched later | MediaProvider/compressor, Wall/Map composer adapters, Edge signer/confirm/delete, media reservation/cleanup |
| DB migrations | post_media reservation/lifecycle and idempotency/audit support |
| configuration | staging/production cloud names/folders; API secret Edge only; strict origins/rates |
| tests | M01–M13, SEC08–SEC15/27–29/33, F01–F07/F13/F18, mobile memory/orientation/visual |
| rollback | disable photo uploads; retain text posts. Keep v1 confirm/cleanup working; never fall back to production base64 |
| go | compressed direct signed flow, verified response, atomic attach, orphan/delete rehearsal, cost alert |
| no-go | secret/public, source original uploaded, unconfirmed URL attachable, orphan unbounded |

### Phase 5 — Echo Library metadata and remote submissions

| Item | Plan |
|---|---|
| domains/files touched later | sanitized public catalogue generator, Hybrid repositories, Storage upload/finalize/review backend contracts |
| DB migrations | Study subjects/resources/relations/submissions/files, review/audit/duplicate structures and RLS |
| configuration | pending/approved bucket policies, 60 MiB-capable plan decision, TUS, public/signed delivery decision |
| tests | S01–S22, SEC16–SEC19/32, F10–F13, exact 377-file artifact and full 2,468-record projection |
| data | import sanitized metadata and all relations deterministically; no IndexedDB as truth; no hidden/manual publication |
| rollback | static curated catalogue/files remain; disable new submissions; preserve private objects/rows for recovery |
| go | private pending, validated publication, no private paths, exact real/unavailable/relationship behavior |
| no-go | pending URL accessible, stale ZIP/artifact, 60 MiB unsupported without approved exception, private provenance public |

### Phase 6 — GitHub Pages staging and production deployment

| Item | Plan |
|---|---|
| domains/files touched later | GitHub Actions workflow, allow-list artifact script/manifest, public config generator, deployment tests; no framework |
| DB migrations | none new; all compatible migrations already applied/tested |
| configuration | Pages environments; exact production URLs/CORS/Auth redirects; SHA-pinned Actions |
| tests | exact artifact syntax/link/hash/secret/size; full matrix from staging project subpath; map.html; cold/warm; custom-domain simulation |
| rollback | production environment approval blocks promotion; redeploy known-good commit/artifact |
| go | exact artifact—not working tree—passes; main branch/release model matches workflow; rollback rehearsal |
| no-go | missing Study, branch mismatch, root URL, secret/path leak, artifact near limit, unapproved exception |

### Phase 7 — Production observation and rollback window

Recommended duration: seven complete days including a normal usage cycle; user approval required for final duration.

| Item | Plan |
|---|---|
| change policy | no product redesign/Admin; only P0/P1 fixes through same gates |
| checks | synthetic Home/map/Wall/Study/Auth smoke; signer/upload/attach; errors/latency/quota/orphan/pending/security/audit |
| support | documented incident owner, status channel, correlation-ID triage, user-safe drafts/retry guidance |
| rollback | redeploy known-good frontend; disable affected writes; restore compatible RLS/migration only through rehearsed change; database restore is last resort |
| go | zero unresolved P0/P1, error/latency/cost within thresholds, no data leak/loss, backup/restore evidence |
| no-go | repeated orphan/data loss, RLS regressions, Pages instability, quota trend unsustainable |

### Phase 8 — PUBLIC PRODUCTION STABLE

Declare only when:

- every required parity/security row is passed or has signed exception;
- seven-day observation (or approved alternative) meets thresholds;
- daily database backup and independent Storage object inventory/export procedure are confirmed;
- rollback has been rehearsed from the production configuration;
- seed analytics/disclosure and all approval decisions are resolved;
- support/runbook/ownership are accepted.

### Phase 9 — Admin begins as a separate project

Admin UI work begins only after Phase 8. It consumes the reserved ModerationGateway/role/scope/audit/Study review/Cloudinary deletion contracts. It is not bundled into the public migration and cannot be used to waive server authorization tests.

## 9. Migration data rules

### 9.1 Auth/profile

- Never import local unsalted password hashes into Supabase Auth.
- Never create Auth accounts for seed/demo authors.
- Real prototype users re-register. If preserving a profile is important, provide a one-time, user-controlled claim process only after separate identity proof approval.

### 9.2 Local notes/comments/map anchors

Automatic import is rejected: browser-local data may be demo, duplicated, tampered, stale, or private. Options requiring explicit user approval:

- no import; preserve/export local archive and begin server activity at launch;
- an authenticated review/import screen later, showing every row before upload and tagging source_kind=legacy_local_import;
- a controlled one-time administrator migration from a known canonical fixture only.

Any importer revalidates context IDs, length/enums, comment parents, anchor footprint, ownership claim, image policy, moderation/provenance, and idempotency. It never carries userVote as identity evidence or imports base64 directly into PostgreSQL.

### 9.3 Seed

- deterministic stable UUID from namespace + seed_source + seed_key;
- one transaction/version; upsert only recognized seed keys;
- preserve relation IDs, order, timestamp, author snapshot, language/type, visible base scores/counts;
- is_seed, seed_source, seed_version, seed_key, interaction_policy;
- no fake vote rows; analytics filters is_seed=false;
- reseed cannot overwrite genuine activity or moderator state without an explicit versioned migration;
- current visible counts remain until an approved product change.

### 9.4 Study

- validate all 2,468 public/private catalogue records and 377 files independently;
- generate a sanitized public projection; private import provenance never enters public Git source or Pages artifact;
- map scalar/group relationships to relation rows without inventing missing pairs;
- new IndexedDB submissions do not silently migrate; uploader re-submits or uses an approved explicit tool;
- content-addressed object reuse and metadata records are separate decisions.

## 10. Rollback and disaster recovery

### 10.1 Frontend

- Every deployment names immutable build SHA/release ID.
- Keep at least the known-good source commit and reproducible artifact manifest; do not depend solely on short artifact retention.
- Rollback means deploy a new Pages deployment from the known-good commit, not mutate live files.
- Smoke both index.html and map.html after rollback.
- Auth/RLS/functions remain compatible with at least one prior frontend release.

### 10.2 Database

- Migrations are small, ordered, reviewed, and expand-first.
- Apply schema/grants/RLS/functions to staging, run bypass tests, take a preproduction logical dump/managed backup checkpoint, then production.
- Never combine destructive column/table removal with the frontend that stops using it. Removal waits at least one stable release.
- Store the exact prior RLS policy/function definitions for a tested rollback migration.
- On failed policy migration, restore policies/functions; do not disable RLS as a shortcut.
- On bad application rows, compensate by idempotency/audit; do not restore an entire database for a narrow logical error.

Supabase currently documents automatic daily backups for Pro/Team/Enterprise, with Pro retaining seven days. Storage objects are not contained in database backups; their metadata is, but deleted objects are not restored. Therefore maintain a separate versioned Storage inventory/export and Cloudinary asset reconciliation. Source: https://supabase.com/docs/guides/platform/backups.

### 10.3 Recovery objectives for approval

Recommended launch targets:

- Pages/static frontend RTO: 30 minutes by known-good redeploy;
- database application rollback RTO: 60 minutes for policy/function rollback;
- database RPO: at most 24 hours with Pro daily backup; PITR is a cost/criticality decision;
- Study/Cloudinary object RPO: no automatic deletion before 24-hour grace, plus inventory/reconciliation; approved object backup policy decision required.

These are recommendations, not promises, until timed rehearsals pass.

## 11. Final go-live acceptance

The release owner signs one evidence packet containing:

- exact baseline and production build SHAs;
- every parity row result and linked screenshot/video/log;
- all RLS/direct REST/security test results;
- exact Pages artifact manifest, size, file hashes, path/link/MIME/magic and secret/private-path scan;
- 377/377 real Study files plus unavailable and relation results;
- Cloudinary compression/sign/confirm/attach/orphan/delete rehearsal;
- Auth register/login/logout/profile/new-tab/refresh/confirmation/reset results;
- map.html/project-subpath/custom-domain simulation and map↔Building Wall relationship results;
- seed row/provenance/analytics result and public disclosure decision;
- plan/quotas/current pricing recheck;
- database and object recovery rehearsal;
- known-good rollback deployment result;
- zero unresolved P0/P1 and approved P2 exceptions only;
- explicit confirmation that Admin UI remains deferred.

## 12. Final self-check traceability

| Required assertion | Evidence location |
|---|---|
| no app code changed by planning | final git status/diff restricted to production-launch-plan/codex Markdown |
| current local is parity baseline | header, Phase 0, baseline packet |
| Pages static frontend only | architecture/deployment plans |
| no Supabase trusted key in client | SEC08/config/artifact gate |
| no Cloudinary API secret in client | SEC09/M13 |
| compression before upload | M02/M03/M07 |
| signed Cloudinary upload | M06–M08 |
| no Postgres base64 | schema constraint/review plus artifact/query test |
| Study separate | S01–S22 and Study plan |
| seed separated | C19/C20/C24, SEC22, migration seed rules |
| Admin UI deferred/contracts reserved | Phase 9 and ModerationGateway tests |
| every external interface documented | API contract acceptance |
| phases have tests/rollback/go-no-go | Section 8 |
| route/base-path covered | P01/P11/P12 and exact artifact |
| production acceptance exists | Section 11 |

## 13. Official references

Verified 2026-08-28/29; recheck within seven days of release:

- GitHub Pages workflow/limits: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages , https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Supabase Auth/session/redirects: https://supabase.com/docs/guides/auth/passwords , https://supabase.com/docs/guides/auth/sessions , https://supabase.com/docs/guides/auth/redirect-urls
- Supabase RLS/Data API: https://supabase.com/docs/guides/database/postgres/row-level-security , https://supabase.com/docs/guides/api/securing-your-api
- Supabase Storage security/uploads: https://supabase.com/docs/guides/storage/security/access-control , https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Cloudinary upload/response signatures/deletion: https://cloudinary.com/documentation/authentication_signatures , https://cloudinary.com/documentation/response_signatures , https://cloudinary.com/documentation/delete_assets
