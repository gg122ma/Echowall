# EchoWall production decisions and open questions

Status: launch decision register  
Baseline: current dirty local main worktree, observed 2026-08-29  
Rule: unresolved approval decisions block the phase that depends on them; no implementation should silently choose a visible parity or material security/cost trade-off

## 1. Decision status legend

| Status | Meaning |
|---|---|
| FIXED BY BRIEF | User already specified the constraint; implementation has no discretion |
| RECOMMENDED | Codex architecture choice; user may reject before implementation |
| APPROVAL REQUIRED | Material visible, risk, cost, data, rights, or operational decision |
| IMPLEMENTATION VALIDATION | Direction is chosen but a measured technical gate must pass |
| DEFERRED | Explicitly outside public-launch scope |

## 2. Resolved architecture decisions

| ID | Decision | Status | Rationale / implementation consequence |
|---|---|---|---|
| D01 | Current local runtime is the parity oracle | FIXED BY BRIEF | Freeze the exact dirty state; do not plan from HEAD alone, stale ZIP, old GitHub, tests, or reports |
| D02 | Keep static vanilla JS, hash router, index.html + map.html | FIXED BY BRIEF | No React/Vite/framework migration; hash routes need no SPA fallback |
| D03 | GitHub Pages is frontend only | FIXED BY BRIEF | No server logic/secrets on Pages; relative project-subpath assets and cross-document links required |
| D04 | Supabase owns Auth/shared relational state | FIXED BY BRIEF | Auth, PostgreSQL, explicit grants/RLS; Edge only privileged/secret operations |
| D05 | Use current Supabase publishable key in browser | RECOMMENDED/current docs | Safe only with explicit schema exposure, grants, RLS, function permissions; secret/service credential never browser |
| D06 | One posts table for All KM/College/Jurusan/Building | RECOMMENDED | Context is typed/checked by FK combination; legacy keys derived; removes duplicated business logic |
| D07 | Discussion/Question is post_type; solved is a guarded state | RECOMMENDED | question_status null for Discussion, open/solved for Question; compare-and-set owner/moderator function |
| D08 | Comments use one table with exactly one reply level and Community-only insertion | RECOMMENDED | Parent same post/root enforced by DB; Building comments remain absent |
| D09 | Real anonymous posts/comments retain authenticated ownership but public projections mask it | FIXED BY SECURITY/PARITY | Supports current public “Anonymous,” moderation accountability, and owner actions without identity leak |
| D10 | Map direct note is one canonical building post plus optional one-to-one anchor | RECOMMENDED | Map-created appears on Wall; ordinary Wall-created remains absent from map; labels derived, not copied |
| D11 | Current 19/32 map eligibility and legacy direct-pin read compatibility remain | RECOMMENDED | Do not infer footprints for 13 buildings or enable legacy creation |
| D12 | Cloudinary stores only browser-compressed user photos through signed direct upload | FIXED BY BRIEF | Trusted signer/confirm/delete, no source original, no PostgreSQL base64 |
| D13 | Cloudinary upload response is server-confirmed before attachment | RECOMMENDED | Verify public_id/version response signature; prevents arbitrary URL/fabricated metadata registration |
| D14 | Study launch uses Hybrid C | RECOMMENDED | Sanitized static curated catalogue + current 377 files on Pages; new PDFs in Supabase Storage/metadata in PostgreSQL |
| D15 | Both pending and approved new Study buckets are private | RECOMMENDED | Pending owner/reviewer only; published resource opens via short-lived signed URL; no permanent object URL |
| D16 | IndexedDB can hold only an explicit unsent/resumable Study draft | FIXED BY BRIEF | Production submission/file/status truth is remote |
| D17 | Question/Scheme becomes relation rows while adapter preserves current primary link | RECOMMENDED | Import all observed edges/groups; never guess 56 unlinked schemes |
| D18 | Ask Echo stays bounded/local/static at launch | RECOMMENDED | Current FreeAI local provider/knowledge/building actions; external AI disabled, future secret only via Edge |
| D19 | Language/theme/map-return UI state stays browser-local | RECOMMENDED | EN/BM/ZH, Light/Dark/System, translation cache, 30-minute session state are not shared business data |
| D20 | No Realtime at launch | RECOMMENDED | Current product does not promise live multi-user updates; mutation result/refetch is safer/lower-cost |
| D21 | Seed rows are deterministic/provenance-marked and have no Auth users/fake vote rows | FIXED BY BRIEF | Stable IDs, seed version/source/key/policy, base display values separate, analytics exclude |
| D22 | Admin UI work is deferred; backend contracts are reserved | FIXED BY BRIEF | Role/scope/moderation/audit/Study review/asset delete exist; no Admin design/build in migration |
| D23 | No silent production LocalStorage fallback for shared writes | FIXED BY BRIEF/SECURITY | Outage retains unsent draft and shows Retry; it never claims local success |
| D24 | UI talks only to provider/repository interfaces | FIXED BY BRIEF | Supabase/Cloudinary calls remain outside render/router modules; Local providers retained for regression/dev |
| D25 | Pages artifact is built from an explicit allow-list and tested exactly | RECOMMENDED | Replace stale 5.89 MiB ZIP path; exclude video/checkpoints/reports/private provenance/plans |
| D26 | Repositories paginate all growing data | RECOMMENDED | Posts 25/default, hard 50; comments 20 roots; Study 30; stable cursor pairs |
| D27 | Migrations are expand-first and support one frontend rollback version | RECOMMENDED | No destructive cleanup until public stability; RLS/function prior definitions retained |
| D28 | Do not “correct” stale docs during infrastructure migration | FIXED BY PARITY | Current Building Detail has no top-note cards; x/y is unused; current route/filter quirks remain |

## 3. Current facts that must not be reopened as old-document assumptions

- Canonical Community is All KM, College General, and Jurusan. Batch is legacy route data only; new community posts use no batch.
- Global/College configuration says coming_soon, but runtime is postable. Runtime wins.
- Current data: 12 colleges, 34 Community majors, separate profile directory of 17 institutions/four programmes.
- Campus: 32 buildings, 19 map-post eligible.
- Map-authored → Building Wall is required; Building Wall-authored → map is intentionally false unless anchored through Map Direct Posting.
- Building notes have no comments.
- Current Building Detail shows descriptions, purpose, hours, notes, events, display count, photos or fallback outline, and Wall entry; it does not show highest-scoring notes.
- Runtime seed set is 763, plus 19 locally persisted defaults on a fresh browser. Homepage/college/building display counts are independent presentation values.
- Echo Library: 2,468 manifest records, 2,284 currently publishable, 377 real files, 1,907 publishable-unavailable, 184 hidden, and 367.46 MiB of real assets.
- The current Pages workflow is not production truth: it triggers on master while active work is main and deploys a 61-entry ZIP with no Study content.
- Current language coverage is imperfect/hard-coded in places; infrastructure work does not broaden translations.
- Current Ask Echo contains known statements that do not exactly match runtime voting/reporting. Fixing its product content is deferred.

## 4. Parity exception register

### PE01 — prototype credentials are not migrated

**PARITY EXCEPTION**

- Why: local accounts use client-controlled records and unsalted SHA-256 password hashes; importing them would perpetuate insecure credentials and cannot safely establish ownership.
- User impact: prototype users must register a real production account; local session ends at production.
- Mitigation: prelaunch notice, preserve an optional local export, same visible sign-up/profile fields, no fake-author accounts.
- User approval required: **Yes.**

### PE02 — email confirmation

**PARITY EXCEPTION**

- Why: current local registration signs in immediately; hosted Supabase email confirmation is enabled by default and reduces account abuse/typos.
- User impact: registration may pause until the user opens a confirmation link; resend/error/repository-subpath redirects are new.
- Mitigation: keep form/layout, clear EN/BM/ZH confirmation state, resend cooldown, tested deep link, support path.
- User approval required: **Yes. Recommended: enable confirmation for production.**

### PE03 — password reset

**PARITY EXCEPTION**

- Why: current prototype has no recovery; real Auth needs a secure recovery flow.
- User impact: a new “Forgot password” action and recovery state/URL appear.
- Mitigation: reuse existing auth surface, generic non-enumerating response, exact redirect allow-list.
- User approval required: **Yes. Recommended: include at production Auth launch.**

### PE04 — secure session lifecycle

**PARITY EXCEPTION**

- Why: current session has no enforced expiry; Supabase uses expiring access tokens, rotating refresh tokens, and revocation.
- User impact: revoked/expired sessions can require re-login; refresh occurs in background.
- Mitigation: persist/refresh with SDK, retain draft, show sign-in recovery instead of losing form.
- User approval required: **No; production security requirement.**

### PE05 — signed-out voting requires sign-in

**PARITY EXCEPTION**

- Why: current vote is one mutable browser field with no identity. Durable uniqueness/abuse control cannot safely treat it as a real anonymous voter.
- User impact: signed-out users see a sign-in prompt instead of changing a vote; authenticated behavior remains toggle up/down/none.
- Mitigation: return to the same post after sign-in, optimistic authenticated RPC, current count display retained.
- User approval required: **Yes. Recommended: require Auth.**

### PE06 — shared writes do not “succeed locally” during outage

**PARITY EXCEPTION**

- Why: local-only fallback would create different realities, bypass moderation/RLS, and mislead users.
- User impact: posts/comments/votes/uploads need network; outage shows Retry/unsent draft.
- Mitigation: idempotency, status lookup after uncertain result, retain clearly labelled draft.
- User approval required: **No; explicitly required by the brief.**

### PE07 — Map Direct Posting re-encodes its accepted image

**PARITY EXCEPTION**

- Why: current map path passes through an already ≤450 KiB file; production requires browser compression before every user-photo upload.
- User impact: exact pixels/format may differ and high-dimension small files become ≤1,280 px.
- Mitigation: preserve 450 KiB source cap, exact outgoing preview, no enlargement, golden visual fixtures.
- User approval required: **Yes.**

### PE08 — image stability limits and truthful progress copy

**PARITY EXCEPTION**

- Why: extreme decoded dimensions are a memory attack; current “local storage” progress copy becomes false.
- User impact: recommend rejecting >40-megapixel decoded input and changing status to “Preparing photo…”.
- Mitigation: normal 8 MiB input rule unchanged; translated explanation; same controls/final KB feedback.
- User approval required: **Pixel cap no (security); visible copy yes.**

### PE09 — Study 50 MB fallback, only if paid capacity is rejected

**PARITY EXCEPTION**

- Why: current upload accepts exactly 60 MiB while Supabase Free currently caps configurable file size at 50 MB.
- User impact: files in the 50–60 MiB range reject and visible copy changes.
- Mitigation: recommended paid project preserves 62,914,560-byte ceiling and uses TUS above 6 MiB.
- User approval required: **Yes. Preferred decision: paid capacity, so this exception is not activated.**

### PE10 — unsafe/unlicensed curated file quarantine

**PARITY EXCEPTION**

- Why: production cannot publish a file that fails malware, active-content/privacy, or publication-rights review.
- User impact: a currently openable resource becomes honest unavailable.
- Mitigation: keep metadata/relationship, explain unavailable, record file-specific reason privately, replace only with cleared bytes.
- User approval required: **Yes for each affected public file/source batch.**

### PE11 — demonstration-content disclosure

**PARITY EXCEPTION**

- Why: 782 fresh-browser notes and independent counters provide visual richness but must never be represented as real adoption.
- User impact: recommended compact “Demo content” disclosure/accessible label on seeded content or a clear site-level notice.
- Mitigation: preserve card/layout/count values, stable seeds, analytics exclusion; user approves exact minimal copy/placement separately.
- User approval required: **Yes.**

### PE12 — existing Admin prototype has no production privilege

**PARITY EXCEPTION**

- Why: current Admin authorization is browser-editable and cannot be a production security boundary; Admin development is explicitly deferred.
- User impact: a prototype/bootstrap email cannot perform production Admin actions; direct route is denied unless a later server role exists.
- Mitigation: ordinary public UI unaffected; server capability gate and backend contracts remain; Admin resumes after stable declaration.
- User approval required: **No; explicitly required by Admin deferral/security.**

### PE13 — private import provenance is removed from public catalogue

This is not a visible parity exception: sourceRelativePath, /Users paths, parser warnings, hashes, and private provenance are not current UI behavior. Removing them from public source/artifact is a P0 privacy gate. The sanitized projection must still reproduce every current public field/order/route.

## 5. Decisions requiring user approval

| ID | Decision due | Recommended choice | Alternative / impact | Blocks |
|---|---|---|---|---|
| U01 | Production canonical origin | Choose final GitHub Pages URL now; add custom domain only with verified DNS/HTTPS and full Auth/CORS tests | changing origin later requires Auth redirects, CORS, canonical links, and retest | Auth staging configuration |
| U02 | Supabase region | Nearest compliant region to Malaysia/Singapore users after data-residency review | farther region increases latency; region move is operationally material | project creation |
| U03 | Supabase plan | Pro or current paid equivalent: ≥60 MiB Storage setting, no inactivity pause, daily backup | Free forces 50 MB exception, capacity/pause/backup work | Study/Auth production |
| U04 | Email confirmation | Enable | Disable preserves immediate local UX but increases abuse/typo risk | Auth UI/redirect copy |
| U05 | Password recovery | Include at Auth launch | defer means production users can be locked out | Auth acceptance |
| U06 | Signed-out vote | Require sign-in | anonymous browser/device identity would require a new abuse/privacy model and still be weak | vote schema/UI |
| U07 | Prototype account/data migration | Re-register; no automatic local user-content import | explicit reviewed import tool is a separate scoped project | launch communication |
| U08 | Seed public treatment | keep for parity, label clearly as demonstration, exclude analytics | empty production loses visual parity; unlabelled content risks fake adoption | seed/UI acceptance |
| U09 | Curated Study rights/safety | approve public hosting only after per-file/source-batch rights and scan evidence | affected file becomes unavailable under PE10 | Pages artifact |
| U10 | Repository visibility/history | clean production source with sanitized catalogue; private repo if budget/plan supports, and remediate already exposed private path history | public existing history can expose provenance even if artifact is clean | repository/release setup |
| U11 | New Study publication at first launch | accept private pending uploads; keep approval/publication disabled until trusted scanner + reviewer operating process exists | launch publication requires scanner resource and authorized operational review before Admin UI | Study Phase S3 |
| U12 | Approved Study file access | private study-approved bucket with five-minute signed URLs | public bucket simpler but permanent guessed URLs bypass hide timing | Study implementation |
| U13 | Study retention | pending orphan 24h; rejected bytes 30d; audit ≥365d, subject to privacy policy | shorter reduces data; longer increases privacy/cost | cleanup jobs/policy |
| U14 | Cloudinary account/plan | production-separated folder/account with budget alerts; upgrade only when measured quota demands | shared dev/prod risks cleanup/cost collisions | media config |
| U15 | Media visible exceptions | approve Map re-encode and neutral progress copy | rejecting conflicts with all-photo compression/true messaging requirement | Media Phase 4 |
| U16 | Observation window | seven days before PUBLIC PRODUCTION STABLE | shorter increases risk before Admin work; longer delays Admin | Phase 8 |
| U17 | Database recovery | Pro daily seven-day backup minimum; decide whether PITR cost is justified | daily backup RPO can approach 24h; Free requires managed off-site dump process | production readiness |
| U18 | Storage/Cloudinary recovery | approve inventory/export/versioning retention and whether independent object backups are required | database backup does not restore deleted Storage objects | disaster recovery |
| U19 | Pages security-header limitation | accept Pages launch with enforce-HTTPS, meta CSP where compatible, strict Edge CORS/RLS, or authorize a custom-domain proxy layer that can add headers | Pages cannot currently set arbitrary CSP/X-Frame-Options/etc.; meta CSP cannot enforce frame-ancestors | security sign-off |
| U20 | Quota/rate values | accept initial image 10/hour, 30/day; Study 20/day/5 concurrent; page limits and retention | tune values may affect legitimate high-volume use/cost | server configuration |

Every approval records decision, owner, timestamp, selected option, affected parity exception, and rollback condition. Silence is not approval.

## 6. Largest parity risks

| Rank | Risk | Evidence | Mitigation/gate |
|---:|---|---|---|
| 1 | Baseline visual/runtime evidence is incomplete | GUI browser unavailable in planning; lower-priority reports conflict with source | mandatory Phase 0 real-browser capture before any provider work |
| 2 | Deployment may publish an old subset | current workflow uses master + 5.89 MiB ZIP with zero Study | deterministic allow-list and exact-artifact test/promotion |
| 3 | Local instantaneous mutable arrays become asynchronous shared transactions | posts/comments/votes/solve can race/fail remotely | provider error states, idempotency, compare-and-set, failure injection |
| 4 | Auth cannot be byte-for-byte identical | insecure passwords/indefinite sessions/no reset/confirmation | approved Auth exceptions and recovery/redirect tests |
| 5 | Map relationship is easy to overgeneralize | only map-authored Building posts have anchors | one optional anchor; explicit Wall-only/map-origin regression |
| 6 | Seed richness/counters can be silently redefined | 782 fresh-browser notes; presentation counts independent | deterministic provenance/base display, exact screenshot/count gates |
| 7 | Study catalogue/file scale and relationships | 2,468 rows, 377 files, asymmetric/multiple schemes, 367.46 MiB | sanitized deterministic projection, full hash/relation/artifact suite |
| 8 | Current quirks look like bugs to “fix” | no Building comments/top notes, x/y unused, state leaks, incomplete translations | current-runtime assertion list; separate post-launch product backlog |
| 9 | Photo paths differ | Wall compresses; Map does not; current local fallback/base64 | policy variants under one provider, visual fixtures, approved PE07 |
| 10 | Project subpath/custom domain changes relative navigation | two entry docs + Auth recovery + map return | base URL abstraction and route matrix on both origins |

## 7. Largest security risks

| Rank | Risk | Consequence | Mandatory control |
|---:|---|---|---|
| 1 | Incorrect RLS/grants/function security | cross-user/scope read/write or total outage | explicit grants, every exposed table RLS, public-key bypass suite, reviewed helper functions |
| 2 | Browser trusted credential | full database/media compromise | publishable key only; secret scans of repo/history/artifact/log/network |
| 3 | Anonymous owner leakage | deanonymization | masked public projections; no stable join key; protected moderator audit |
| 4 | Client-controlled current Admin roles | privilege escalation | production server role_assignments and scoped checks; current prototype denied |
| 5 | Untrusted media registration/deletion | malicious URLs, overwrite, orphan cost | signed allow-list, response verification, reservation state, trusted delete/cleanup |
| 6 | Pending/unsafe Study PDF publication | malware/privacy/rights exposure | private quarantine, server/trusted scan and hash, positive publish state |
| 7 | Current manifest private provenance in repo/browser | filesystem username/source disclosure | sanitized public projection and repository-history decision |
| 8 | Demo content presented as adoption | user trust/analytics integrity | provenance, no fake users/votes, analytics exclusion, approved disclosure |
| 9 | Pages cannot set arbitrary security headers | clickjacking/header-hardening gap | U19; meta CSP limitations documented, Edge actions still JWT/RLS protected |
| 10 | Backup only covers database, not deleted objects | incomplete recovery | object inventory/export/versioning and rehearsed recovery |

## 8. Open implementation validations

These do not require product choice unless the measured result forces a new exception.

| ID | Validation | Required evidence | Fallback if it fails |
|---|---|---|---|
| T01 | Exact current browser parity | complete Phase 0 packet | stop implementation |
| T02 | Supabase 2026 Data API exposure defaults | staging project explicit exposed schema/grant catalog | configure explicitly; never trust default |
| T03 | Current Edge user-JWT library/pattern | pinned official example and JWT/RLS integration tests | direct verified JWT/header pattern from current docs |
| T04 | Role helper policy performance | EXPLAIN at projected rows and scope tests | indexed role table/security-definer private helper with revoked public execute |
| T05 | Comment parent/context trigger | direct REST cross-post/depth/Building tests | guarded create_comment RPC if a safe row insert is too complex |
| T06 | Footprint server validation | 19 polygon fixtures and boundary precision | versioned trusted Edge/RPC validator; never client-only |
| T07 | Cloudinary signed parameter compatibility | staging signed WebP/JPEG upload with dynamic folder/account settings | reduce parameter set while preserving allow-list/max/overwrite=false |
| T08 | Cloudinary response verification in Deno | official public_id/version signature vectors | signed notification/reconciliation before attach; no unverified attach |
| T09 | 60 MiB server hash/malware scan | benchmark current Edge CPU/wall/memory and selected scanner | async trusted worker; publication remains disabled/pending |
| T10 | Sanitized catalogue generator | exact 2,284 visible IDs/order and zero private fields | block Pages artifact |
| T11 | Current 377-file Pages deploy time/bandwidth | exact artifact staging upload/deploy/open crawl | trigger curated-object-store migration only as separately approved phase |
| T12 | Current GitHub Action releases | maintained release review and full commit SHAs | pin reviewed prior maintained SHA; do not use floating latest |
| T13 | GitHub Pages custom header state | live headers and current official/community staff documentation | U19 decision/proxy authorization |
| T14 | Auth email delivery | DKIM/domain/template, spam/delay, redirect in three languages | do not enable production signup until reliable |
| T15 | Browser image quality/memory | mobile orientation/transparency/high-detail fixture metrics | adjust cap/quality only through documented exception |
| T16 | Query/index targets | p95/load/EXPLAIN at 1×/10×/year projection | add measured partial/composite indexes; no unbounded list |
| T17 | Database + object restore | timed staging restore and inventory reconciliation | revise RTO/RPO/plan before go-live |
| T18 | Current public repo exposure | search current remote/history for private paths/secrets | treat as incident/remediate history; clean production repo |

## 9. Deferred product questions

These are real current issues, but answering them during infrastructure migration would violate parity:

- Should College General become linked from the College landing?
- Should Global/College stale coming_soon metadata become active?
- Should Building Details show ranked notes or always show the bird's-eye outline?
- Should Building Wall posts be placeable/visible on the map later?
- Should Building notes gain comments?
- Should wall filter state reset on context change?
- Should Building Wall Back avoid history.back leaving the site?
- Should x/y note positions be rendered or removed?
- Should Ask Echo correct its vote/report guidance and retain parenthesized information?
- Should hard-coded English/private overlay translations be consolidated?
- Should manual-review Study imports get a reviewer UI?
- Should all multiple schemes be shown rather than only the current primary?
- Should current display counters be replaced with real counts?
- Should ordinary users ever edit/delete their posts/comments?
- Should Realtime be enabled after evidence of need?

They belong to separate user-approved post-launch product work after PUBLIC PRODUCTION STABLE.

## 10. Go-live decision checklist

No launch approval while any is unresolved:

- U01–U20 as applicable to selected scope;
- PE01/02/03/05/07/08-copy/09-if-free/10/11;
- T01, T02, T03, T05–T12, T14–T18;
- publication rights and safety for all actually served Study files;
- exact artifact and rollback evidence;
- zero P0/P1 security/parity defects;
- production support/incident owner and recovery authority;
- explicit declaration that Admin UI remains deferred.

## 11. Date-sensitive official sources

Verified 2026-08-28/29; recheck before implementation/procurement/go-live:

- Supabase API keys/deprecation path: https://supabase.com/docs/guides/getting-started/api-keys , https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Supabase Data API/RLS: https://supabase.com/docs/guides/api/securing-your-api , https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth/redirects/sessions: https://supabase.com/docs/guides/auth/passwords , https://supabase.com/docs/guides/auth/redirect-urls , https://supabase.com/docs/guides/auth/sessions
- Supabase Storage limits/security/uploads: https://supabase.com/docs/guides/storage/uploads/file-limits , https://supabase.com/docs/guides/storage/security/access-control , https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase backup scope: https://supabase.com/docs/guides/platform/backups
- GitHub Pages limits/deployment/custom domain: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits , https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages , https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- GitHub staff response on custom headers (not a formal product guarantee): https://github.com/orgs/community/discussions/54257
- Cloudinary signing/response verification/deletion: https://cloudinary.com/documentation/authentication_signatures , https://cloudinary.com/documentation/response_signatures , https://cloudinary.com/documentation/delete_assets
