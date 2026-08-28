# EchoWall Current Product — Complete Feature Audit

> Audit date: 2026-08-28 (Asia/Singapore)  
> Purpose: factual source for future Abstract / Poster / Competition Materials writers.  
> This document is a product audit, **not an Abstract and not proposed competition wording**.

## 0. Executive factual verdict

EchoWall is currently a browser-based campus knowledge prototype that joins four working product surfaces: a detailed KMK campus map, place/building profiles and walls, layered student communities, and a structured academic resource library. A fifth surface, Ask Echo, is a local retrieval-based campus guide rather than a general or advanced AI assistant. The strongest product idea is the continuous loop between a physical place, its factual profile, the student discussion attached to it, and public map notes that return to the same Building Wall.

The current build contains substantial usable functionality, but most contribution, identity, upload, moderation, and engagement state is local to one browser. Large visible post/vote/count totals are seeded or display-only demo data. Eleven non-KMK colleges have community entry points and map framework states, but not populated building maps. Echo Library contains 2,284 publishable metadata records, while only 377 of those records map to real local files; all manifest resources are currently marked `unverified`.

### Count used throughout this audit

- **74 major user-facing or authorized-admin-facing feature units** were identified and itemised below.
- Internal adapters, storage layers, permission engines, and readiness scaffolding are recorded separately as `X` infrastructure and are not included in 74.
- A “feature unit” is a meaningful user outcome or distinct UI behaviour, not every button, helper function, CSS effect, or translation key.

## 1. Evidence rules and audit method

The requested truth hierarchy was applied exactly:

1. Current runtime behaviour that could be executed or simulated.
2. Current source code.
3. Current data files and generated manifests.
4. Current tests and validation scripts.
5. Reports and changelog.
6. Competition rules.
7. Documentation.
8. Old video/script.
9. Roadmap.

Important method notes:

- The route dispatcher was executed in a controlled VM harness against representative hashes, rather than inferred only from documentation.
- Current scripts/tests and JavaScript syntax checks were run; the results are summarised in section 18.
- The competition PDF was text-extracted, rendered to page images, and visually inspected. It is used only for scoring alignment.
- No interactive in-app browser session was available in this environment, so this audit does **not** claim a fresh pixel-level or assistive-technology runtime pass. Source behaviour, executable route checks, automated tests, and existing lower-priority QA reports were cross-checked.
- Existing working-tree changes were treated as current truth and preserved. No website code, Abstract, poster, competition rule, or existing documentation was modified.

## 2. Status and claim-safety legend

| Code | Meaning |
|---|---|
| A | Fully Working in the current prototype |
| B | Working with Prototype Constraints |
| C | Partial |
| D | Framework / Empty Data |
| E | Planned / Not Implemented |
| X | Internal platform infrastructure, not a direct student-facing capability |

Claim safety:

- **YES** — may be described as a current capability without a material qualifier.
- **YES WITH QUALIFIER** — capability is real, but the stated qualifier must accompany it.
- **NO** — should not be presented as a current product capability or real-world result.

“CORE: YES” means it is part of EchoWall’s defining student value. It does not mean the implementation is production-ready.

## 3. Current route map

| Route / entry | Current render/action | Feature | User-facing? | Working? | Data source | Abstract / competition relevance |
|---|---|---|---:|---|---|---|
| `#/` | `renderHome` | Home and capability entry points | Yes | A | Hard-coded UI plus building registry and display counters | Supporting product orientation; counters are not evidence of adoption |
| `map.html` | Leaflet bootstrap in `echomap.js` | Echo Map | Yes | B | KMK registry, map config, hours, footprints, OpenStreetMap tiles | Very high practical/demo relevance; only KMK is fully populated |
| `#/places` | `renderPlaceDirectory` | KMK building directory | Yes | A | `data/campus-building-registry.js`, `data/campus-buildings.js` | High practical relevance |
| `#/place/:id` | `renderPlaceProfile` | Building Detail | Yes | B | Building registry, descriptions, hours, local photos | High practical relevance; hours are schedule-derived |
| `#/place/:id/wall` | `renderBuildingWall` | Building Wall | Yes | B | Stored notes plus runtime seed bundle | Defining idea/impact capability; local and seeded constraints |
| `#/community` | `renderCommunityHub` | Community Hub | Yes | A | Community configuration | High navigation/impact relevance |
| `#/community/all` | `renderCommunityGlobalWall` | All KM Students | Yes | B | 67 runtime seed posts plus local user posts | High cross-college idea/impact relevance; 67 is not adoption |
| `#/community/:org` | `renderCollegeLanding` | College Community landing | Yes | B | 12 configured colleges and 33 jurusan | High scope relevance; most non-KMK walls start empty |
| `#/community/:org/general` | `renderCommunityCollegeGeneralWall` | College General wall | Technically yes | C | Local note service | Direct URL is writable, but no normal landing-page link exposes it |
| `#/community/:org/jurusan/:major` | `renderWall` | Jurusan Community wall | Yes | B | Config, seed bundle, local notes | High practical/impact relevance; only 12/33 are seeded |
| `#/study` | `renderStudyHome` | Echo Library home | Yes | A | Subject definitions and resource manifest | Very high practical/impact relevance |
| `#/study/:jurusan` | `renderStudyJurusan` | Jurusan library | Yes | A/D | Subject/resource data | Three populated programme areas; Computer Science is empty framework |
| `#/study/:jurusan/sem/:semester` | `renderStudySemester` | Semester subject list | Yes | A | Subject/resource data | High usability relevance |
| `#/study/:jurusan/sem/:semester/:subject` | `renderStudySubjectShell` | Resource list | Yes | B | Manifest plus approved local overlays | Core academic access feature |
| `#/study/resource/:id` | `renderStudyResourceDetail` | Resource Detail | Yes | B | Manifest, relationship metadata, mapped file table | Core academic evidence feature |
| `#/study/upload` | `renderStudyUploadShell` | Upload | Yes | B | IndexedDB submission service | Useful contribution workflow; browser-local, PDF-only, approval required |
| `#/org/:org/map` | `renderOrgCampusMap` | College map hand-off | Yes | B/D | Campus map config | KMK full; other 11 are generic framework previews |
| `#/org/:org/buildings` | `renderOrgBuildingRegistry` | College building registry | Yes | B/D | Campus map config/registries | KMK populated; other 11 registries are empty |
| `#/org/:org/building/:id` | `renderOrgBuildingDetail` | Organization building detail | Yes | B/D | Per-college registry | Effective for KMK only at present |
| `#/admin` | Admin renderer | Admin and moderation | Authorized users | B | Local moderation, roles, reports, audit data | Strong platform engineering; lower direct competition value |
| Header auth control | Modal/popover, not a route | Register / Login / Profile | Yes | B | Local auth/profile storage | Supporting usability only; not production identity |
| `#/org/:org` | Redirect | Legacy organization route | Yes via redirect | A | Router mapping | Compatibility only; no selling value |
| `#/wall/:org/:major` and legacy four-part wall form | Redirect | Legacy community wall routes | Yes via redirect | A | Router mapping | Compatibility only; do not emphasise |
| Unknown hashes | Home fallback | Safe fallback | Yes | A | Router | UX support only |
| Internal `renderOrgDetails` | No reachable current route | Dead organization page renderer | No | X | Source only | No claim value |

## 4. Current product capability groups

| Capability group | What exists now | Core? | Factual boundary |
|---|---|---:|---|
| Place-based campus navigation | KMK map, 19 interactive footprints, 13-building focus/search list, fit-campus, previews, profiles, schedule status | Yes | Eleven other college maps are framework states only |
| Place-based knowledge | 32 KMK profiles and walls, descriptions, selected purposes/notes/photos, building-linked discussion | Yes | Coverage depth varies; events contain no current data |
| Place-linked contribution | Exact-footprint “Post Directly,” public map labels, and the same note on its Building Wall | Yes | Local browser persistence; exact placement only for 19 footprints |
| Layered student community | All KM Students, 12 college landings, College General direct routes, 33 jurusan wall routes | Yes | Seed coverage is concentrated in 12 jurusan; all College General walls start empty |
| Community knowledge exchange | Discussion/question posts, comments, one-level replies, solved state, voting, filtering and search | Yes | Building walls have no comment/reply UI; votes are per-browser and seed scores are fabricated demo engagement |
| Academic resource access | Echo Library hierarchy, search/filter/sort, resource details, PSPM/pre-PSPM/year grouping, question–scheme links | Yes | Metadata volume exceeds real downloadable file volume; verification is not complete |
| Academic contribution and review | PDF submission, hash duplicate checks, pending moderation, approval/rejection/verification workflow | Supporting | IndexedDB/browser-local; no shared server workflow |
| Campus knowledge Q&A | Ask Echo local knowledge-base retrieval, place/hours/location guidance and selected building actions | Supporting | It is not generative/general AI; external AI endpoints are not configured |
| Inclusive interface support | EN/BM/Chinese UI, Light/Dark/System themes, responsive layouts, keyboard/ARIA/reduced-motion work | Supporting | No formal WCAG or assistive-technology certification |
| Content quality and governance | Login gates, scoped admin UI, queues, audit, rule-based moderation flags | Supporting infrastructure | Front-end/local enforcement only; no user-facing report action |

## 5. Complete user-facing feature inventory (74)

Exact binary interpretation for the requested field: in the `Core / Supporting` column, **YES** means CORE and **NO** means SUPPORTING (including supporting guardrails and admin surfaces). Every final-column value uses the requested claim-safety scale: **YES**, **YES WITH QUALIFIER**, or **NO**; text in parentheses states the mandatory qualifier.

### 5.1 Home (H01–H03)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H01 | Home | Product home and primary navigation | `index.html`, `app-router.js` | `#/` | Opens map, community, library and place journeys; includes semantic page sections/footer | Current route/config data | Public | None | A | Not a functional dashboard | NO | Practical 6; Demo 6 | YES |
| H02 | Home | Capability/building discovery cards | `app-router.js`, building data | Home cards | Shows capability calls-to-action and the first six building previews | Building registry plus static copy | Public | None | A | Building selection is curated/static, not personalised | NO | Practical 6 | YES |
| H03 | Home | Animated headline statistics | `app-router.js` | Home counters | Displays `1,017` notes, `12` communities, `53` photo notes and static “Aug 25, 2026” latest-memory copy | Hard-coded display copy | Public | None | B | Not computed from current notes, files, accounts, or analytics | NO | Demo 3; evidentiary value 0 | **NO** as usage/impact evidence |

### 5.2 Echo Map (M01–M14)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M01 | Map | KMK interactive campus map | `map.html`, `echomap.js` | `map.html?org=1` / Echo Map | Renders Leaflet map, campus context and interactive KMK layers | KMK map/building config plus OpenStreetMap tiles | Public | Map UI state only | B | Base tiles require network; not an offline map | YES | Idea 8; Practical 10; Demo 10 | YES WITH QUALIFIER |
| M02 | Map | Twelve-college switcher | `echomap.js`, `data/campus-map-config.js` | College selector | Switches among all 12 configured college states | College coordinates/config | Public | Selected state in page/session flow | B | Only KMK has detailed buildings and footprints | NO | Idea 7; Practical 5 | YES WITH QUALIFIER |
| M03 | Map | Other-college map state | Same as M02 | 11 non-KMK selections | Shows generic OSM-centred framework preview and Community link | Coordinates/config; empty registries | Public | None | D | No populated building list, footprint, place wall, or campus dataset | NO | Idea 4; Demo 2 | **NO** as “12 complete campus maps” |
| M04 | Map | Fit Campus | `echomap.js` | Map control | Refits view to the configured campus bounds/centre | Map configuration | Public | None | A | Accuracy follows static configured geometry | NO | Practical 7; Demo 6 | YES |
| M05 | Map | Interactive building footprints | `echomap.js`, building/map data | KMK map polygons | 19 footprints can be focused/clicked and keyboard-activated | Static footprint geometry | Public | Current selection only | A | Covers 19 of 32 building records | YES | Idea 9; Practical 9; Demo 10 | YES WITH QUALIFIER (state count 19) |
| M06 | Map | Building focus list and search | `echomap.js` | Map side panel | Searches/focuses 13 listed KMK buildings | Static focus-target list | Public | Query/session state | A | UI copy says “fourteen”; actual list has 13; other buildings are not listed | YES | Practical 9; Demo 8 | YES WITH QUALIFIER (state count 13) |
| M07 | Map | Building preview and actions | `echomap.js` | Selected footprint/sidebar card | Shows place preview, status, “More Details,” and wall entry | Building registry/hours/display counts | Public | Selected map snapshot in `sessionStorage` | B | Display note count is not a live count | YES | Practical 9; Demo 9 | YES WITH QUALIFIER |
| M08 | Map | Opening-hours and open/closed display | `data/campus-building-hours.js`, `echomap.js` | Preview/profile status | Computes current state from browser time and static weekly/24-hour schedules | 19 configured schedules: 13 weekly, 4 24-hour, 2 unavailable | Public | None | B | Not live operational data; browser clock and static schedules only | YES | Practical 9 | YES WITH QUALIFIER (“schedule-based” only) |
| M09 | Map | Return-to-map context | `echomap.js`, place/router code | Map → details/wall → return | Stores selected building/map view snapshot for continuity | `sessionStorage` | Public | Session only | B | Lost after session/browser reset | NO | Practical 7 | YES WITH QUALIFIER |
| M10 | Map | Public map-note labels | `features/map-note-overlay.js` | Public Notes layer | At close zoom, shows up to five ranked labels, one leading anchor per building; tooltip opens Building Wall | Building notes plus map anchor store | Public to view | `localStorage` | B | Ranking can use seeded/fabricated engagement; max five labels | YES | Idea 9; Demo 10 | YES WITH QUALIFIER |
| M11 | Map | Exact-footprint “Post Directly” placement | `features/map-note-overlay.js` | Click eligible footprint → composer | Starts a building-linked post only when placement falls inside one of 19 polygons | Footprint geometry + note service | Login required | `localStorage` | B | No direct placement for 13 non-footprint buildings or other colleges | YES | Idea 10; Practical 9; Demo 10 | YES WITH QUALIFIER |
| M12 | Map | Map-note composer | `features/map-note-overlay.js` | Map post form | Creates Discussion or Question with text, category, 10 shapes, arbitrary colour, named/anonymous choice | User input + auth profile | Login required | `localStorage` | B | 500-character cap; local-browser identity/persistence | YES | Idea 9; Impact 8 | YES WITH QUALIFIER |
| M13 | Map | Map-note photo | `features/map-note-overlay.js` | Map post form | Accepts optional JPG/PNG/WebP image up to 450 KB as local data | User-selected file | Login required | `localStorage` data URL | B | No crop/compress controls used by main wall composer; local-storage size limits | NO | Practical 6; Demo 7 | YES WITH QUALIFIER |
| M14 | Map | Map note ↔ Building Wall synchronisation | Overlay and note/community services | Publish, marker, tooltip, wall | One publish creates a Building note and an anchor; marker navigation opens the same building’s wall | Unified local note data + anchor store | Login to publish; public to read | `localStorage` | B | Browser-local, not shared/realtime; legacy pin provider cannot create new pins | YES | Idea 10; Impact 9; Demo 10 | YES WITH QUALIFIER |

### 5.3 Places and Building Detail (P01–P07)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P01 | Places | Searchable KMK building directory | `app-place.js`, building registry | `#/places` | Lists and searches 32 current KMK place records | Static registry/data | Public | Query/UI state only | A | KMK only | YES | Practical 9 | YES WITH QUALIFIER (state count 32 and KMK scope) |
| P02 | Places | Building profile | `app-place.js`, building data | `#/place/:id` | Shows name, description, status/hours and actions for all 32 records | Static descriptions/registry/hours | Public | None | B | Information is maintained data, not live facility information | YES | Practical 9; Impact 7 | YES WITH QUALIFIER |
| P03 | Places | Purpose and Special Notes | `data/campus-buildings.js` | Profile sections | Shows purpose for 14 buildings and special notes for 10 | Static content | Public | None | C | Field coverage is uneven across 32 buildings | YES | Practical 7 | YES WITH QUALIFIER (state coverage 14/10) |
| P04 | Places | Building photo gallery | Building data and `assets/buildings/` | Profile Gallery | Displays 18 mapped local photo entries across 10 buildings, with lazy loading/error fallback | Local image assets | Public | Browser cache only | B | 22 buildings have no gallery; not user-contributed gallery | NO | Demo 8; Practical 6 | YES WITH QUALIFIER (state counts 18/10) |
| P05 | Places | Building overview geometry/map context | `app-place.js`, map/building data | Profile overview | Uses available campus geometry/context for building orientation | Static overview geometry for 30 records | Public | None | B | Geometry/context coverage is not uniform; not indoor navigation | NO | Practical 7 | YES WITH QUALIFIER |
| P06 | Places | Current/upcoming Events sections | `app-place.js`, building data | Profile Events | Renders event sections but current data contains zero events | Empty event arrays | Public | None | D | No actual event discovery capability today | NO | Competition 1 | **NO** |
| P07 | Places | Dedicated wall for every building | `app-wall.js`, community/note services | `#/place/:id/wall` | All 32 building profiles can open a scoped Sticky Wall and accept local posts | Static building keys + seed/local note storage | Public read; login publish | `localStorage` | B | Only 8 walls start non-empty; Building walls do not expose comments/replies | YES | Idea 9; Impact 8; Demo 9 | YES WITH QUALIFIER |

### 5.4 Community (C01–C16)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | Community | Community Hub | `app-community.js`, config | `#/community` | Presents All KM Students plus 12 college community cards | 12-college configuration | Public | None | A | Cards demonstrate available scope, not active membership | YES | Idea 8; Impact 9 | YES |
| C02 | Community | All KM Students wall | `app-community.js`, `app-wall.js` | `#/community/all` | Cross-college Sticky Wall with the full Community interaction model | 67 runtime seed posts plus local posts | Public read; login publish/comment | `localStorage` for user actions | B | 67 is seed content, not 67 real students/posts/adopters | YES | Idea 9; Impact 10; Demo 9 | YES WITH QUALIFIER |
| C03 | Community | Twelve College Community landings | `app-community.js`, config | `#/community/:org` | Shows each college identity, jurusan choices, and map/building actions | Static configuration for 12 colleges | Public | None | B | Non-KMK map/building actions lead to empty framework states | YES | Idea 8; Impact 9 | YES WITH QUALIFIER |
| C04 | Community | College General wall | `app-community.js` | `#/community/:org/general` | Direct routes for 12 writable college-wide walls | Local note service | Public read; login publish | `localStorage` | C | Not linked from normal college landing UI; all 12 start empty | NO | Impact 6 | YES WITH QUALIFIER; do not headline |
| C05 | Community | Thirty-three Jurusan walls | Config, router, wall app | `#/community/:org/jurusan/:major` | Opens a scoped wall for every configured jurusan | 33 configured majors; seed/local note data | Public read; login publish/comment | `localStorage` | B | Only 12/33 have seed content; 21 begin empty | YES | Idea 9; Impact 9 | YES WITH QUALIFIER |
| C06 | Community | Sticky Wall canvas and note detail | `app-wall.js`, styles | All wall routes | Renders positioned coloured/shape notes and an accessible detail modal | Seed/default/user note model | Public | UI state; notes in storage/bundle | B | Seed layout and scores are demo-generated | YES | Idea 8; Demo 9 | YES WITH QUALIFIER |
| C07 | Community | Publish a Community/Building post | `app-wall.js`, `services/community-service.js` | Composer | Validates up to 500 characters and publishes to current wall scope | User input + auth/session | Login required | `localStorage` | B | No server delivery, cross-device sync, or shared account history | YES | Practical 9; Impact 8 | YES WITH QUALIFIER |
| C08 | Community | Discussion and Question post types | `app-wall.js` | Composer/cards/detail | User selects Discussion or Question; questions expose Open/Solved state | User/seed note metadata | Login to create; public read | `localStorage` for user posts | B | Older seed/default records are normalised; Building questions lack comment UI | YES | Idea 9; Impact 9 | YES WITH QUALIFIER |
| C09 | Community | Category, shape and colour expression | `app-wall.js` | Composer/filter/cards | Four categories, ten note shapes and ten colour choices organise/visualise posts | UI constants + user choice | Login to create | `localStorage` | B | Primarily presentation/organisation, not semantic moderation | NO | Idea 6; Demo 8 | YES |
| C10 | Community | Photo note editing | `app-wall.js`, cloud adapter | Main wall composer | Accepts JPG/PNG/WebP up to 8 MB, then locally compresses and supports crop zoom and cover/contain | User file; Cloudinary config or data-URL fallback | Login required | Usually `localStorage` data URL | B | Cloudinary is unconfigured; storage limits; seed media plans contain no real image payloads | NO | Practical 7; Demo 8 | YES WITH QUALIFIER |
| C11 | Community | Named or anonymous posting | `app-wall.js`, auth/profile | Composer/comment/reply | Allows public anonymity or chosen display name while retaining local author ownership metadata | Local profile/user input | Login required | `localStorage` | B | Not cryptographically anonymous; data remains in the same browser | YES | Impact 8 | YES WITH QUALIFIER |
| C12 | Community | Filter, sort and search | `app-wall.js` | Wall toolbar | Filters by category/post type; sorts Hot/New/Unanswered; searches content/author | Rendered wall note data | Public | UI state | B | Hot order can be driven by fabricated seed scores; Unanswered means open question with zero comments | YES | Practical 9 | YES WITH QUALIFIER |
| C13 | Community | Comments on Community posts | `services/comment-service.js`, `app-wall.js` | Community post detail | Adds comments to Community discussions/questions | User input plus runtime/local note reference | Login required; anonymous/name option | `localStorage` | B | Not available on Building Wall posts; no server sync | YES | Impact 9; Demo 9 | YES WITH QUALIFIER |
| C14 | Community | One-level replies | Same as C13 | Comment thread | Adds replies under a comment | User input/local thread data | Login required | `localStorage` | B | Only one reply level; Community posts only | YES | Impact 8; Demo 8 | YES WITH QUALIFIER |
| C15 | Community | Mark solved / reopen | `app-wall.js`, permission service | Question detail | Author or authorised moderator can toggle a user-created question’s solved state | Note author/role metadata | Owner or moderator | `localStorage` | B | Runtime seed questions are read-only for solved-state mutation | YES | Idea 8; Practical 9; Demo 10 | YES WITH QUALIFIER |
| C16 | Community | Voting | `app-wall.js`, note service | Note cards/detail | Toggles one local `userVote` per note/browser and adjusts mutable note score | Stored note state; seeded display score | No login currently | `localStorage` for mutable notes | B | Not per-account, not multi-user; runtime seeds are display-only; current demo scores are fabricated 0–87 | NO | Demo 6; evidence value 0 | YES WITH QUALIFIER (local capability); **NO** for engagement claims |

### 5.5 Echo Library (L01–L15)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L01 | Library | Visible “Echo Library” product | `app-study.js`, locale files | `#/study` | Opens the current academic-resource product under the visible name Echo Library | Current UI/locales | Public | None | A | Old “Study Notes” naming is obsolete | YES | Idea 8; Practical 9 | YES |
| L02 | Library | Jurusan-level browse | `app-study.js`, subjects | Library home/jurusan | Presents four configured programme areas | Subject configuration | Public | None | B | Science, Accounting and Engineering have content; Computer Science has none | YES | Practical 8 | YES WITH QUALIFIER |
| L03 | Library | Semester and Subject Code hierarchy | `app-study.js`, `data/study-subjects.js` | Jurusan → semester → subject | Organises 33 populated subject codes under semesters | Subject definitions/manifest | Public | None | A | Coverage is the curated current dataset, not the whole national curriculum | YES | Practical 10 | YES WITH QUALIFIER |
| L04 | Library | Resource lists and categories | `app-study.js`, manifest/service | Subject page | Lists papers, schemes, practice, notes, summaries and lab resources under category tabs | 2,284 publishable manifest records plus approved local overlays | Public | UI pagination state | B | Category coverage is uneven; no publishable lecturer-note category entries | YES | Practical 10; Impact 9 | YES WITH QUALIFIER (state counts and coverage) |
| L05 | Library | PSPM and Pre/Pra PSPM year grouping | `app-study.js` | Subject/category views | Groups exam/pre-exam resources by available year metadata | Manifest category/year metadata | Public | None | A | Quality follows parsed metadata | YES | Practical 9 | YES |
| L06 | Library | Question ↔ Answer Scheme links | Resource service/detail renderer | Lists/detail | Shows related question/scheme actions when the related target is publishable | Manifest `relatedResourceId` relationships | Public | None | B | Publishable set has 455 related resources; not every paper has a pair; 8 full-manifest links are one-way | YES | Idea 8; Practical 10; Demo 10 | YES WITH QUALIFIER |
| L07 | Library | Metadata, source college and verification display | `app-study.js`, manifest | Cards/detail/filter | Displays subject, type, year, source/source college and verification status where present | Parsed/manual manifest metadata | Public | None | B | All 2,468 records are `unverified`; 550 publishable records lack source college; source labels are inconsistent | YES | Practical 7 | YES WITH QUALIFIER |
| L08 | Library | Global tiered search | `app-study.js`, resource service | Library search | Ranks subject exact, prefix, title, topic and year matches; debounced results | Publishable manifest + approved local submissions | Public | Query state | B | Token/metadata search, not semantic AI; results depend on metadata quality | YES | Practical 10; Demo 9 | YES |
| L09 | Library | Filters, sort and incremental lists | `app-study.js` | Global/subject results | Filters Year/Source/Subtype; sorts Relevant/Newest/Oldest/Title; loads results in pages/batches | Publishable resource records | Public | UI state | A | No server-side search; current dataset size is browser-loaded | YES | Practical 9 | YES |
| L10 | Library | Resource Detail | `app-study.js` | `#/study/resource/:id` | Presents metadata, verification, related resources and file/open state | Manifest and local overlays | Public | None | B | “Unverified” is common and must not be interpreted as validated content | YES | Practical 9; Demo 9 | YES WITH QUALIFIER |
| L11 | Library | Real PDF/DOCX/PPTX mapping | Manifest/service and `study-materials/` assets | Detail Open/Download | Opens 363 PDFs in a new tab and downloads 8 PPTX/6 DOCX files; all 377 current mappings resolve to existing files | 377 mapped local files, about 367.46 MiB | Public | Browser/file handling | A | These are curated demo/library assets, not proof of users or outcomes | YES | Practical 10; Impact 9; Demo 10 | YES WITH QUALIFIER (state counts; no adoption inference) |
| L12 | Library | Honest unavailable state | `app-study.js`, resource service | Cards/detail | Disables file action and states unavailable when no real file mapping exists | File map vs manifest | Public | None | A | 1,907 of 2,284 publishable records have no mapped file | YES | Practical 9 | YES; important honesty feature |
| L13 | Library | PDF upload form | `app-study.js`, submission service | `#/study/upload` | Collects PDF, academic metadata, question/scheme relation and permission confirmation | User input/file | Login required | Form state/IndexedDB | B | PDF only; max 60 MB; no cloud/server submission | NO | Practical 8; Impact 7 | YES WITH QUALIFIER |
| L14 | Library | File validation and duplicate checks | `services/study-submission-service.js` | Upload processing | Checks `%PDF-` signature, SHA-256 exact duplicate; warns on likely metadata duplicate | Browser file APIs, manifest/local records | Login required | IndexedDB | B | Browser capability and local index only; likely duplicate is advisory | NO | Technical 9; Practical 7 | YES WITH QUALIFIER |
| L15 | Library | Pending moderation and approved overlay | Submission/moderation/admin services | Upload → admin → browse | New submission remains non-public until approved; authorised reviewer can approve/edit/reject/verify; approved local item enters browse/search | IndexedDB and local moderation state | Submitter login; reviewer scope for decision | IndexedDB/local storage | B | Workflow is confined to the same browser; no shared reviewer queue or remote persistence | NO | Idea 7; Practical 7; Impact 7 | YES WITH QUALIFIER |

### 5.6 Ask Echo (A01–A05)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Ask Echo | Launcher, panel and suggestions | `services/ai-assistant.js` | Floating launcher/dialog | Opens an ARIA-labelled panel with starter suggestions, input validation and Escape close | Static UI/suggestion copy | Public | Current conversation UI | A | Not a full chat-history/account product | NO | Practical 8; Demo 8 | YES |
| A02 | Ask Echo | Local campus knowledge retrieval | `services/free-ai-adapter.js`, knowledge base | Ask Echo response | Detects query terms, ranks token overlap, selects up to five local records and returns a templated best-match answer | 41 curated knowledge records | Public | None | B | Retrieval/template logic, not a large language model or general reasoning engine | NO | Idea 7; Practical 8 | YES WITH QUALIFIER (“local knowledge-base guide”) |
| A03 | Ask Echo | Building/location/hours/map guidance | AI service + building data | Response/action | Returns available location, hours/rules and selected “View details” action for mapped education/study/sports records | 41 records; 35 hour fields; 12 building IDs | Public | None | B | Static data; no live wayfinding, routing, or live opening feed | NO | Practical 9; Demo 8 | YES WITH QUALIFIER |
| A04 | Ask Echo | Language selection and safety boundaries | AI/free adapter, locales | Query/response | Detects Chinese, Malay keywords or defaults English; refuses out-of-scope/internal/medical-advice requests; falls back to local guidance | Trilingual KB fields and rule templates | Public | None | C | Several boundary messages and labels remain English; detection is heuristic | NO | Practical 7; Impact 6 | YES WITH QUALIFIER |
| A05 | Ask Echo | External AI/service adapter state | FreeAI, Bisheng and config files | Internal send chain | Local adapter is primary; code can fall back, but current OpenRouter token, Bisheng endpoint and translation endpoint are empty | Configuration | Public UI, internal adapters | None | D | No configured Bisheng/OpenRouter-backed runtime and no working translation service | NO | Competition 2 | **NO** as “advanced AI,” “Bisheng-powered,” or live generative AI |

### 5.7 UX, accessibility and media (U01–U05)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| U01 | UX | English, BM and Chinese interface | `i18n/` and locale files | Global language control | Switches UI and document language among EN/BM/ZH; current MS/ZH tables cover all English keys | 704–705 locale keys per language | Public | `localStorage` | B | Some generated/helper/error/Ask Echo strings remain English; content data is not uniformly translated | NO | Practical 9; Impact 9 | YES WITH QUALIFIER |
| U02 | UX | Light, Dark and System themes | Theme/preferences services and CSS | Global theme control | Applies explicit light/dark or OS-following mode and reacts to system changes | CSS tokens + system media query | Public | `localStorage` | B | Visual contrast was not formally WCAG-certified in this audit | NO | Practical 8 | YES |
| U03 | UX | Responsive layouts | Main/wall/study/map/admin CSS | Major screens | Uses mobile/tablet/desktop breakpoints and adapted controls/layouts | CSS/media queries | Public | None | B | No fresh device-matrix visual pass was possible in this session | NO | Practical 9 | YES WITH QUALIFIER |
| U04 | Accessibility | Keyboard, ARIA and reduced motion | HTML, apps and styles | Global/map/walls/dialogs | Includes a main skip link, semantic roles/labels/live regions, focus-visible styles, keyboard note/footprint activation, Escape handling and reduced-motion rules | Markup/CSS/JS behaviours | Public | OS preference for motion | B | `map.html` lacks the main skip link; focus trapping/return is not uniform; no formal WCAG/AT audit | NO | Practical 9; Impact 8 | YES WITH QUALIFIER; no compliance claim |
| U05 | UX | Image/media support and failure handling | Wall/place/study UI, local assets | Posts, galleries, resources | Supports note images, lazy building photos with alt/error handling, and native PDF/download flows | Local/user media | Depends on feature | Local storage/assets/browser | B | Upload limits and browser storage apply; no universal media cloud | NO | Practical 7; Demo 8 | YES WITH QUALIFIER |

### 5.8 Identity and profile (I01–I04)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I01 | Identity | Local registration | `services/auth-service.js`, `auth-ui.js` | Register modal | Validates email, 2–50 character name and 8+ character password; creates local account | User input | Public | `localStorage` | B | No server, email verification, password reset, account recovery, or cross-device account | NO | Practical 5 | YES WITH QUALIFIER (“prototype local account”) |
| I02 | Identity | Login, session and logout | Auth services/UI | Header auth modal/control | Matches local credential hash, stores current local session and gates contribution actions | Local account/session records | Registered local user | `localStorage` | B | Unsalted SHA-256 and client-side session are not production security; no expiry | NO | Practical 6 | YES WITH QUALIFIER (local prototype; not production security) |
| I03 | Identity | Profile | Auth/profile UI | Header profile popover/form | Edits display name, education status, institution, major and start year | User-entered profile | Logged-in user | `localStorage` | B | Browser-local self-asserted information; no verified affiliation | NO | Impact 5 | YES WITH QUALIFIER |
| I04 | Identity | Contribution ownership gates | Auth + permission services | Post/comment/reply/upload/solve | Requires login for most writes and tracks local author identity; reading remains public | Local session/author IDs | Login for listed writes | `localStorage` / IndexedDB | B | Voting currently requires no login; front-end checks are bypassable | NO | Practical 7 | YES WITH QUALIFIER |

### 5.9 Authorized admin interfaces (D01–D05)

| ID | Module | Feature name | Relevant file | Route / UI | Actual behaviour | Data source | Permission | Persistence | Status | Known limitation | Core / Supporting | Competition relevance | Summary safe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D01 | Admin | Scoped admin dashboard | `app-admin.js`, permission services | `#/admin` | Shows overview and tabs according to global/college/study/system role scope; denies unauthorised users | Local role/session/content state | Authorized role | `localStorage` / IndexedDB | B | Client-side/local prototype, not a secure server boundary | NO | Technical 9; Competition 4 | YES WITH QUALIFIER |
| D02 | Admin | Community/Building/Map moderation | Admin/moderation services | Community/Map admin tabs | Searches/filters records; hides/restores/deletes eligible content with reason; supports queues/reviewer assignment and exports current note/map records as JSON | Local notes/map records/moderation state | Relevant moderator scope | `localStorage`; downloaded JSON export | B | Only same-browser data; deletion is irreversible in UI; seeds have special immutability rules | NO | Technical 8; Impact 6 | YES WITH QUALIFIER |
| D03 | Admin | Study moderation and verification | Admin + study services | Study/queue tabs | Reviews pending upload, edits metadata, approves/rejects and changes verification state | IndexedDB submissions/local overlay | Study reviewer/moderator | IndexedDB/local audit | B | No shared remote queue; built-in manifest remains unverified | NO | Technical 9; Practical 6 | YES WITH QUALIFIER |
| D04 | Admin | Reports, history and audit | Admin/audit/moderation services | Reports/History/Audit tabs | Lists service-created reports and action history; filters audit records | Local report/audit stores | Moderator/admin scope | `localStorage` | C | No user-facing Report button creates reports; audit is local and editable by browser owner | NO | Technical 8; Competition 3 | YES WITH QUALIFIER (admin only); **NO** for user-report claim |
| D05 | Admin | Admin/role management | `app-admin.js`, admin permission service | Admin Management tab | Super Admin can grant scoped roles, disable/enable or revoke local admins | Local roles and fixed bootstrap identity | Super Admin | `localStorage` | B | Front-end identity and scope enforcement are not production IAM | NO | Technical 9; Competition 3 | YES WITH QUALIFIER (local prototype; not production IAM) |

**Inventory total: 3 + 14 + 7 + 16 + 15 + 5 + 5 + 4 + 5 = 74.**

Aggregate classification: **A 14 · B 53 · C 4 · D 3 · E 0**. The inventory contains **37 CORE: YES** and **37 CORE: NO** feature units. Eight additional internal/platform items are classified separately as X in section 7.2.

## 6. Module reality audit

### 6.1 Echo Map and Places — exact current coverage

| Measure | Current fact | Interpretation |
|---|---:|---|
| Configured colleges | 12 | The switcher and community identities exist for 12 colleges |
| Fully populated campus map | 1 (KMK) | Do not multiply KMK depth across the other 11 colleges |
| KMK building records/profiles/walls | 32 | All 32 have a description and wall key |
| Interactive map footprints | 19 | These support footprint selection and direct placement |
| Focus/search sidebar buildings | 13 | Current UI copy saying fourteen is wrong |
| Opening-hours configurations | 19 | 13 weekly schedules, 4 static 24-hour states, 2 unavailable |
| Purpose fields | 14 buildings | Partial content coverage |
| Special Notes fields | 10 buildings | Partial content coverage |
| Buildings with local gallery photos | 10 | 18 mapped photo entries/files total |
| Buildings with overview geometry | 30 | Coverage is broader than the 19 interactive footprints but not complete |
| Current/upcoming event records | 0 | Event sections are empty framework |
| Other-college building registry entries | 0 | All 11 non-KMK registries are empty |

The strongest verified Map behaviour is not merely “a map.” It is the joined flow:

`KMK footprint → building preview → factual profile / Building Wall → Post Directly at the footprint → public map label → same Building Wall`

That loop is both technically real and competition-relevant. Its required qualifier is that content and anchors persist only in the current browser, and exact placement is available for 19 footprints rather than all 32 places.

#### Building-status wording boundary

The code calculates open/closed state from a static schedule and the device/browser clock. Suitable wording is **“schedule-based opening status.”** The following are unsupported: live opening status, real-time occupancy, live facility operations, or institution-synchronised hours.

#### Map-note boundaries

- A maximum of five public labels is shown at close zoom, with one leading anchor chosen per building before the overall top five.
- Map-created notes can be Discussion or Question, categorised, shaped, coloured, named or anonymous, and optionally carry a small photo.
- The current public posting path is Building-scoped. It does not create a separate, fully featured private-note layer.
- A legacy direct-pin store can list/hide/delete older pin records, but its current provider throws on `create()`. It is compatibility infrastructure, not a current “drop arbitrary pin anywhere” feature.
- Copy/source references to a private layer are ahead of actual creation/rendering behaviour. Do not claim private map notes.

### 6.2 Community — scope, interaction and writeability

#### Current scope

- 1 All KM Students wall.
- 12 College Community landing pages.
- 12 direct College General wall routes, currently undiscoverable through the standard landing UI.
- 33 Jurusan wall routes.
- 32 Building Wall routes.

#### Empty-browser note reality

After current default loading and runtime-seed activation, an empty browser receives **782 displayed notes**:

| Scope | Displayed notes | Composition |
|---|---:|---|
| Community scopes | 567 | 67 All KM + 500 across 12 seeded jurusan walls |
| Building scopes | 215 | Content across 8 seeded/default building walls |
| Total | 782 | 763 runtime seed + 19 stored default records |

Seed concentration matters:

- Only **12 of 33** jurusan walls have seed content; 21 begin empty but remain writable.
- All **12 College General** walls begin empty but remain writable by direct route.
- Only **8 of 32** Building Walls begin non-empty; 24 begin empty but remain writable.
- “Empty” means no initial content, not that the route or composer is broken.

#### Seed/default/user mutation matrix

| Record class | Read/card/detail | Comment/reply | Vote | Solve/reopen | Edit/delete by ordinary user | Meaning |
|---|---:|---:|---:|---:|---:|---|
| Runtime seed post | Yes | Yes on Community posts | Display only | Read-only | No | Demo content; interaction additions can be stored locally |
| Stored default post | Yes | Yes on Community posts | Yes | Yes where ownership permits | Local rules apply | Prototype starter content stored as mutable note records |
| Real local user post | Yes | Yes on Community posts | Yes | Yes for author/moderator question | Local rules apply | Genuine capability, but only for this browser |

Comments/replies added to a runtime seed post are genuinely writable in `localStorage`; the underlying seed post, its seeded vote display, and its seed solved status remain read-only. This distinction is safe to demonstrate but must not be reported as public multi-user activity.

#### Interaction details and limits

- Community posts support comments and one reply level. Building Wall posts do not expose comments/replies.
- Question cards support Open/Solved state. A local author or authorised moderator can solve/reopen eligible mutable questions.
- “Unanswered” means an open Question with zero comments and is sorted newest first.
- Voting does not currently require login. It records one `userVote` on the note in one browser, not one verified vote per person/account.
- Ordinary users have no current edit/delete control for their own published post; eligible Question owners can only change Open/Solved state. Post/map-note removal is an authorised-admin function.
- Current source assigns deterministic fabricated display scores in the 0–87 range to seed/default demo content. “Hot” order and visible counts can therefore look active without real users.
- Category choices number four; the main composer offers ten shapes and ten colours.
- Main composer photos accept JPG/PNG/WebP up to 8 MB and apply client-side compression/crop/cover controls. With Cloudinary unconfigured, the result is normally a data URL stored locally.
- A Translate action is present, but the configured translation endpoint is empty. It returns an unavailable state, so translation of posts is not a working capability.
- There is **no user-facing Report button** in the current wall/card/detail UI. A report service and admin Reports tab exist internally; they do not establish user reporting.

### 6.3 Echo Library — manifest and real-file truth

#### Visible product identity and hierarchy

The current visible product name is **Echo Library** (`Perpustakaan Echo` in BM; `留声图书馆` in Chinese). The active hierarchy is:

`Jurusan → Semester → Subject Code → Resource List → Resource Detail`

Four programme areas are configured:

| Programme area | Populated subjects | Publishable metadata records | Real mapped files | Current state |
|---|---:|---:|---:|---|
| Science | 19 | 1,626 | 281 | Populated |
| Accounting | 8 | 654 | 92 | Populated |
| Engineering | 6 | 4 | 4 | Mostly manual-review metadata outside publishable set |
| Computer Science | 0 | 0 | 0 | Empty framework |
| **Total** | **33** | **2,284** | **377** | Current truth |

#### Full manifest and publishable set

| Measure | Count |
|---|---:|
| Full manifest records | 2,468 |
| Auto-parsed records | 2,318 |
| Manual-review records | 150 |
| Duplicate-marked records | 36 |
| Publishable metadata records | 2,284 |
| Publishable records with real files | 377 |
| Publishable records without mapped files | 1,907 |
| Verification status | All 2,468 currently `unverified` |

Publishable category distribution:

| Category | Count |
|---|---:|
| Pre/Pra PSPM | 1,589 |
| Answer Scheme | 286 |
| Practice | 137 |
| Student Notes | 137 |
| PSPM | 122 |
| Summary | 11 |
| Lab | 2 |
| **Total** | **2,284** |

Real file mapping:

| File type | Mapped files |
|---|---:|
| PDF | 363 |
| PPTX | 8 |
| DOCX | 6 |
| **Total** | **377** |

All 377 current mappings resolve to existing local files, totalling approximately **367.46 MiB**. PDFs open through the browser; DOCX/PPTX use download behaviour. A real file count is evidence of implemented resource access, **not** evidence of student adoption, downloads, learning impact, or institutional verification.

#### Question/scheme relationships

- The full manifest contains 468 resources with a relationship field: 238 scheme, 227 paper, 2 other and 1 practice records.
- 460 resources form 230 reciprocal pairs; 8 relationships are one-way; there are no dangling target IDs.
- The publishable set exposes 455 related resources (233 schemes and 222 papers), subject to the related target also being publishable.
- A relationship means manifest linking, not an assertion that every question has a scheme or that content correctness was academically verified.

#### Metadata quality limits

- 2,002 publishable records contain a usable year value.
- 550 publishable records lack Source College.
- Source-college values include inconsistent case/annotations inherited from source filenames/metadata.
- All built-in manifest records show `unverified`; the verification UI/workflow exists, but the built-in corpus is not verified.
- Search is a five-tier metadata/token ranking (subject exact, prefix, title, topic, year), not semantic or AI search.

#### Upload reality

The upload capability is real but browser-local:

1. A logged-in user selects a PDF up to 60 MB.
2. The code checks the `%PDF-` signature, required academic metadata and permission acknowledgement.
3. SHA-256 blocks exact duplicates; a likely metadata duplicate is warned rather than automatically rejected.
4. File and record enter IndexedDB as pending and are not publicly browseable.
5. An authorised local Study reviewer can edit, approve, reject or verify.
6. An approved record becomes visible in that same browser’s browse/search overlay.

The submitter sees an inline pending result after upload, but there is no current user-facing “My Submissions” history/status dashboard. It is unsafe to describe this as a cloud repository submission, institutional review system, or shared moderation queue.

### 6.4 Ask Echo — accurate capability name

The most accurate current name is:

> **Local knowledge-base campus guide with retrieval-based Q&A**

It should not automatically be called an advanced AI assistant, generative AI assistant, intelligent agent, or Bisheng-powered chatbot.

Current corpus facts:

- 41 local knowledge records spanning accommodation, activities, administration, course guidance, dining, education, finance, health, mobility, retail, services, sports, study and support.
- All 41 have EN/BM/ZH content fields.
- 35 carry some hours field, although many state that hours are unavailable.
- 12 map to a current building ID and can expose a building-detail action.
- Source-status labels comprise 26 student-guide, 12 pending, 2 partial-dates and 1 student-experience records.

What it can actually do:

- detect Chinese characters, selected Malay terms, or default to English;
- rank local records by token overlap and return a templated best match;
- provide static location, hours, rules and campus guidance when recorded;
- offer a Building Detail action for selected education/study/sports matches;
- decline course/competition/internal-system requests and medical advice;
- fall back to local keyword guidance if an adapter call fails.

What it does not currently do:

- no configured Bisheng endpoint;
- no configured OpenRouter token/provider in runtime;
- no open-domain generative reasoning;
- no live facility or route data;
- no working post-translation endpoint;
- no guaranteed fully localised response labels/boundary messages.

### 6.5 UX and accessibility boundary

Current positives include complete locale-key coverage relative to English for BM and Chinese, `html lang` updates, persistent language/theme selection, Light/Dark/System mode, responsive CSS, visible focus styles, keyboard activation for notes/map footprints, live/error regions, image alternative/failure handling, dialog labels, Escape handling and reduced-motion rules.

Current limits prevent a compliance claim:

- no formal WCAG conformance audit;
- no completed screen-reader/device assistive-technology test in this audit;
- `map.html` lacks the main skip link used by `index.html`;
- some dynamic messages remain English;
- dialog focus trapping and focus return are not uniform across all overlays;
- responsive source rules exist, but no fresh visual device matrix was available in this session.

Safe wording is “includes multilingual, responsive, keyboard and accessibility-supporting behaviours.” Unsafe wording is “fully accessible,” “WCAG compliant,” or “verified accessible.”

## 7. Supporting platform: user value vs infrastructure

### 7.1 User value layer

The following platform elements directly enable a student outcome:

- local login gates contribution actions;
- profiles provide a display identity or anonymous choice;
- local persistence lets the same browser retain posts, comments, preferences and submissions;
- moderation status prevents a pending academic upload from immediately appearing public;
- language/theme/accessibility controls reduce interface friction.

### 7.2 Platform infrastructure layer (not included in the 74 feature count)

| ID | Infrastructure | Current reality | Status | Technical strength | Competition-summary value |
|---|---|---|---|---:|---:|
| X01 | LocalStorage persistence/migration | Stores auth/session, notes, comments, votes, preferences, map anchors, roles and moderation state; working with browser-local constraints | X | 7/10 | 3/10 |
| X02 | IndexedDB study storage | Stores uploaded PDF blobs, metadata and local review lifecycle; working with browser-local constraints | X | 9/10 | 6/10 |
| X03 | Cloudinary adapter | Adapter/fallback path exists; current cloud name/upload preset are empty, so wall media normally becomes local data URL | X | 5/10 | 1/10 |
| X04 | Translation adapter | Adapter and button path exist; endpoint is empty and UI reports unavailable | X | 3/10 | 1/10 |
| X05 | FreeAI/OpenRouter/Bisheng chain | Local retrieval works; external token/endpoint integrations are unconfigured | X | 7/10 | 4/10 |
| X06 | Permission and scoped-role engine | Global/college/study/system scopes and moderator/admin roles gate UI actions; enforcement is browser-side | X | 9/10 | 3/10 |
| X07 | Moderation, report and audit schema | Unified queues/history/audit and service-level reports exist locally; user report creation is absent | X | 8/10 | 4/10 |
| X08 | Provider/Supabase readiness | Documentation/interfaces anticipate external backends; no current shared production provider is active | X | 4/10 | 0/10 |

### 7.3 Auth and security boundary

Local registration/login is sufficient for a walk-through prototype, not a secure identity claim. Passwords are represented by unsalted SHA-256 hashes in `localStorage`; sessions have no server validation, expiry, email verification, recovery, or cross-device identity. Roles/scopes are enforced in browser JavaScript and can be changed by a user controlling that browser’s storage/source. No competition material should describe this as production authentication, secure IAM, or institution-verified accounts.

### 7.4 Moderation boundary

Rule-based assistance can flag suspicious shortened links, three-or-more links, repeated text, duplicate content, or five-posts-in-ten-minutes flood patterns. Study checks can flag missing metadata/file and exact/likely duplicates. These rules add review signals/queue items only; they do **not** automatically hide, reject, delete, or perform AI judgement. Safe wording is “rule-based moderation assistance and local review workflow,” with a prototype qualifier.

## 8. Demo / reality warnings

| Capability or visible item | Safe factual claim | Unsafe claim |
|---|---|---|
| All KM Students | Supports a cross-college All KM Students wall | “67 real students posted” or “67 real posts” |
| Community scope | Supports 12 college landings and 33 jurusan wall routes | “All 12 colleges are actively using it” |
| Seed interaction | Users can locally comment/reply on Community seed posts | Seed comments/votes prove public adoption |
| Visible scores | Voting UI and local mutable voting exist | 0–87 seed scores are real votes/engagement |
| Homepage `1,017` | A demo headline counter is displayed | 1,017 current real notes/users/interactions |
| Homepage `53` photo notes | A demo headline counter is displayed | 53 verified user photo contributions |
| College card totals | 12 display-only overrides totalling 593 are rendered consistently | 593 real community contributions or members |
| Building card totals | 10 display-only overrides totalling 412 are rendered consistently | Building walls have those real post counts |
| Demo users | Auth storage starts empty; users must register locally | Seed author names are real accounts/students; there are no pre-created demo accounts |
| Privileged identity markers | Two hard-coded email-based privilege paths can apply after a matching local account is registered | The repository contains ready-to-use admin users/passwords; it does not |
| KMK places | 32 KMK records have profiles/walls | All 32 have complete photos, purpose, special notes and footprints |
| Focus list | 13 current focus/search entries | 14 focus buildings, despite current UI copy |
| Opening status | Schedule-based status for configured buildings | Live/realtime opening or occupancy information |
| Other colleges | Map framework/coordinates and community entry exist for 11 other colleges | 12 complete campus maps/building registries |
| Echo Library metadata | 2,284 publishable metadata records | 2,284 downloadable or academically verified files |
| Echo Library files | 377 mapped files exist and open/download | 377 files prove student adoption, downloads or learning results |
| Verification | Verification status/workflow is displayed | Current corpus is verified; all manifest records are `unverified` |
| Computer Science library | Programme shell is configured | Computer Science resources are currently populated |
| Upload | Logged-in users can submit a local PDF for local review | Cloud/shared/institutional upload and review |
| Ask Echo | Local retrieval-based campus knowledge guide | Advanced/generative AI, live AI, or configured Bisheng assistant |
| Translation | Trilingual UI is implemented | Working automatic translation of posts; endpoint is empty |
| Reports | Admin report service/tab exists | Students can currently report a post; no user-facing action exists |
| Moderation | Rule-based flags and local reviewer workflow exist | AI automatically moderates/removes harmful content |
| Cloud/platform | Local browser prototype with adapter scaffolding | Cloud sync, Supabase backend, realtime multi-user collaboration |
| Events | Empty event sections render | Current campus event discovery |
| Accessibility | Includes multiple accessibility-supporting behaviours | WCAG-compliant or formally verified accessibility |
| Impact | The design can support knowledge sharing/access | Proven impact, improved grades, saved time, adoption, reach or outcomes without external evidence |
| Competition file | One InnoSTEM rules PDF is an audit/reference input and is not loaded by the product | The competition PDF is a website feature or usage evidence |

### Explicit claims to avoid

1. “1,017 students/notes/users are active on EchoWall.”
2. “67 real students contributed to All KM Students.”
3. “Seed votes, comments or Hot rankings show real engagement.”
4. “EchoWall has complete maps for all 12 colleges.”
5. “Every KMK building has a footprint/gallery/live hours.”
6. “Echo Library has 2,284 downloadable files.”
7. “Echo Library resources are verified.”
8. “377 real files prove adoption, usage, or learning impact.”
9. “Ask Echo is advanced AI, generative AI, Bisheng-powered, or live-data aware.”
10. “EchoWall uses working cloud storage, Supabase, realtime sync, or production authentication.”
11. “Students can report posts through the current interface.”
12. “AI automatically moderates content.”
13. “EchoWall is WCAG compliant.”
14. “The system has demonstrated impact/results” without separate real evaluation evidence.

## 9. Selling-point analysis grounded in current behaviour

| Rank | Feature | What it actually does | Student problem addressed | Why it matters / is useful | Competition value |
|---:|---|---|---|---|---|
| 1 | Place → Profile → Wall → Map-note loop | Connects a KMK footprint and factual building page to discussion, direct placement, a public label, and the same Building Wall | Campus information and lived knowledge are usually separated from physical location | Makes information contextual and lets future visitors find experience at the place where it matters | Very high Idea, Practical, Impact and Video value |
| 2 | Layered student community | Provides All KM, College and Jurusan scopes instead of one undifferentiated feed | Broad announcements and course-specific needs require different audiences | Supports both cross-college discovery and focused peer knowledge | Very high Idea and Impact value, with empty/seed qualifiers |
| 3 | Echo Library structured access | Browses/searches by programme, semester, subject code, resource type, year and source | Learning files are difficult to find when scattered across chats/folders | Gives students a predictable retrieval path and honest file availability | Very high Practical and Impact value |
| 4 | Question → comment/reply → solved workflow | Lets Community users distinguish questions, discuss them, reply and close a resolved question | Static notes do not show whether help is still needed or answered | Turns a wall into reusable peer knowledge rather than only a visual board | High Practical, Impact and Video value |
| 5 | Real question–scheme/file relationships | Links available papers and schemes and opens 377 real mapped files | Students often search for a paper and its answer separately | Reduces retrieval steps and is directly demonstrable | Very high Practical and Demo value |
| 6 | Direct footprint contribution | Creates a place-linked Discussion/Question from the selected campus footprint | Students may know a place but not the correct forum/category | Removes the decision about where a place-specific post belongs | High Idea and Demo value |
| 7 | Flexible, lower-friction contribution | Offers category, shape, colour, photo and named/anonymous choices | Students express different kinds of practical knowledge and may hesitate to identify themselves publicly | Broadens contribution modes while retaining a scoped destination | Moderate/high Impact value; anonymity requires prototype qualifier |
| 8 | Multilingual, theme and keyboard support | Provides EN/BM/ZH, Light/Dark/System, responsive layouts and multiple keyboard/ARIA behaviours | Interface language, device and interaction preferences can block access | Makes the same core flows usable by a wider student audience | High Practical and Impact value; no WCAG claim |
| 9 | Local campus knowledge guide | Retrieves answers from 41 curated campus records and links selected places | Basic location/hours/rules questions are repeated | Gives quick, bounded guidance without pretending to know everything | Moderate Practical/Demo value; not advanced AI |
| 10 | Pending academic contribution and quality workflow | Validates local PDFs, checks duplicates, withholds pending items and lets scoped reviewers decide | Open contribution needs a basic quality boundary | Demonstrates a credible contribution lifecycle | Moderate Idea/Practical value; shared backend is absent |

### Top 10 selling points

1. Physical campus places are directly connected to persistent place-specific knowledge and discussion.
2. One community model supports All KM Students, College and Jurusan scopes.
3. Echo Library provides a predictable academic path from jurusan to semester, subject and resource.
4. Community Questions can receive comments/replies and be marked solved.
5. The current library opens/downloads 377 mapped real files and honestly disables unavailable records.
6. Exam questions can link to their answer schemes through manifest relationships.
7. Students can publish directly from an eligible building footprint and see the note on the map and Building Wall.
8. Contributions support Discussion/Question, category, visual style, photo and named/anonymous choices.
9. EN/BM/Chinese, themes, responsive layout and keyboard-supporting behaviours improve practical access.
10. Ask Echo offers bounded, local campus guidance with selected building actions.

### Top 5 primary selling points

1. **Place-linked campus knowledge loop** — map, profile, wall and public map note are one connected flow.
2. **Layered student knowledge communities** — All KM, College and Jurusan scopes serve different information needs.
3. **Structured Echo Library** — course hierarchy, metadata retrieval, question–scheme links and real-file availability.
4. **Reusable peer Q&A** — Discussion/Question, comments, replies and solved state make knowledge easier to reuse.
5. **Practical inclusive access** — three interface languages, responsive/theme options and direct campus guidance.

### Top 3 defining selling points

1. **A campus place can become a shared knowledge point, not just a map marker.**
2. **Student knowledge can move between broad cross-college scope and focused jurusan scope.**
3. **Campus experience and academic resources live in one navigable product, with honest availability states.**

These sentences describe product functions. They are not proposed Abstract language and do not establish real-world outcomes.

## 10. InnoSTEM scoring alignment

Competition source: `video/SYARAT PERTANDINGAN MINI InnoSTEM  2026 UPDATED 19 jun 2026 (5).pdf`. The rubric weights Product at 85% and Video at 15%; within Product it lists Abstract 5%, Documentation 15%, Idea 20%, Practical & Usability 20%, and Impact & Contribution 25%. The rules emphasise originality/improvement, objectives/target group, practical implementation/use/cost, and evidenced contribution to users/college/community/environment. This audit maps capabilities only; it does not alter or draft competition material.

Scores below measure **fit to the criterion**, not proof that judges will award the score and not proof of actual impact.

| Capability | Idea /10 | Practical & Usability /10 | Impact & Contribution /10 | Demo Value /10 | Reason / boundary |
|---|---:|---:|---:|---:|---|
| Place-linked map/profile/wall loop | 10 | 9 | 9 | 10 | Distinct integration and easy visual proof; browser-local/KMK qualifier |
| Direct footprint posting and map labels | 10 | 9 | 8 | 10 | Clear interaction innovation; 19 footprints/max five labels |
| Layered All KM/College/Jurusan community | 9 | 8 | 10 | 9 | Strong target-group structure; seed/empty-scope qualifier |
| Discussion/Question/comment/reply/solved | 8 | 9 | 9 | 10 | Converts contributions into reusable peer help; Community posts only for comments |
| Echo Library hierarchy/search/filter | 8 | 10 | 10 | 10 | Direct academic utility and strong proof path; current corpus limits apply |
| Real file + question/scheme access | 8 | 10 | 9 | 10 | Concrete student task; 377 files, not 2,284 |
| Flexible named/anonymous/photo contribution | 7 | 9 | 8 | 9 | Lowers contribution friction; local and not cryptographically anonymous |
| EN/BM/ZH, theme, responsive/accessibility support | 7 | 9 | 9 | 8 | Broad usability/contribution potential; no compliance evidence |
| Ask Echo local knowledge guide | 7 | 8 | 7 | 8 | Practical bounded lookup; not generative/live AI |
| Upload + review + duplicate checks | 7 | 7 | 7 | 7 | Shows contribution governance; same-browser workflow only |
| Scoped roles, audit and moderation | 6 | 6 | 6 | 6 | Technically credible support; indirect student value and local enforcement |
| Eleven non-KMK map frameworks | 4 | 3 | 4 | 2 | Shows extensibility, not delivered map coverage |

### Top features for Idea

1. Map footprint → linked note → Building Wall → public map label.
2. A single place-based knowledge object shared between navigation and community surfaces.
3. Layered All KM / College / Jurusan information scopes.
4. Question type with comments/replies and a reusable solved state.
5. Question-paper ↔ answer-scheme linking inside course-structured resources.

### Top features for Practical & Usability

1. Search/focus a KMK building, see schedule-based status, then open its profile or wall.
2. Browse/search/filter Echo Library by programme, semester, subject, type, year and source.
3. Open the 377 real mapped files and receive an honest unavailable state for the rest.
4. Comment/reply to a Community question and mark an eligible question solved.
5. Use EN/BM/Chinese, Light/Dark/System, responsive and keyboard-supporting controls.

### Top features for Impact & Contribution

1. All KM Students plus focused College/Jurusan knowledge spaces.
2. Place-linked Building Walls that retain practical knowledge around campus locations.
3. Echo Library academic access and paper–scheme relationships.
4. Peer questions, comments, replies and solved state.
5. Named/anonymous, photo and category choices that lower contribution friction.

Impact language must remain prospective (“supports,” “can help,” “is designed to”) unless a separate evaluation supplies real users, usage, outcomes, feedback, before/after measures or institutional evidence.

### Top features for video proof

1. Publish from a KMK footprint, see the public label, then open the same Building Wall note.
2. Open a Community Question, add a comment/reply and mark it solved with an eligible account.
3. Traverse Echo Library to a paper, open its real file, and follow a related answer scheme.
4. Search/focus a building and show schedule-based status, details, gallery and wall.
5. Switch EN/BM/Chinese and Light/Dark/System on a responsive screen.

Avoid using seeded totals, vote counts, populated seed walls or hard-coded home numbers as “proof.” They prove presentation/interaction, not adoption or impact.

## 11. Technically impressive vs competition valuable

The two rankings are intentionally different. Engineering depth is not automatically student value, and student value does not require the most complex implementation.

### Top 5 technically strong features

| Rank | Feature | Technical /10 | Competition-summary value /10 | Why |
|---:|---|---:|---:|---|
| 1 | Scoped role/permission/admin/audit model | 9 | 3 | Multiple scopes, roles, queues, history and audit; however it is client-side infrastructure |
| 2 | IndexedDB PDF lifecycle with signature/hash/duplicate/moderation | 9 | 6 | Handles blobs and state transitions honestly; shared service is absent |
| 3 | Unified Building note + map-anchor creation/rollback/synchronisation | 9 | 9 | Maintains one user concept across map and wall, with direct visible value |
| 4 | Large manifest search/filter/file map and relationship model | 8.5 | 9 | Supports 2,284 publishable metadata records, real-file checks and paper/scheme relations |
| 5 | Trilingual/theme/keyboard-aware application shell | 8 | 8 | Broad cross-module integration; practical but should not be called certified accessibility |

### Top 5 competition-valuable features

| Rank | Feature | Competition value /10 | Technical /10 | Why |
|---:|---|---:|---:|---|
| 1 | Place-linked map/profile/wall/map-note loop | 10 | 9 | Original, usable, impactful and visually demonstrable |
| 2 | Echo Library hierarchy, real files and scheme links | 10 | 8.5 | Solves a concrete academic retrieval task |
| 3 | Layered All KM/College/Jurusan communities | 9.5 | 7 | Clear target groups and contribution pathway |
| 4 | Community Question/comment/reply/solved workflow | 9 | 8 | Turns peer discussion into reusable answers |
| 5 | Multilingual and practical access controls | 8.5 | 8 | Direct usability/coverage value with visible proof |

Features that are technically respectable but not worth headline emphasis include legacy redirects, the unused legacy pin provider, display-count overrides, local role management detail, adapter scaffolding without endpoints, storage migrations, and framework-only non-KMK registries.

## 12. Major product evolution from the old KMK baseline

Evidence boundary: the old `video/8月1日(1).mp4` file was present and its Windows metadata identified a roughly 4:51 recording, but no working video decoder was available for fresh frame inspection. The comparison therefore uses the accompanying 17-page `video/EchoWall_网站录屏连续流程与详细录制手册_2026_07_30.pdf`, the revised 2:15 script PDF, old scripts, and current code/runtime. Old documentation is used only as a baseline and loses whenever current code differs.

| Dimension | Old KMK documented baseline | Current product | Factual evolution / limit |
|---|---|---|---|
| Map | KMK-centred navigation and place flow | KMK has 19 interactive footprints, 13 focus entries, status/previews and linked walls; 12-college selector exists | Deeper KMK integration; not 12 complete maps |
| Buildings | Selected Pustaka/Masjid and other KMK examples | 32 KMK profiles/walls; partial purposes, notes, photos and geometry | Broader place registry, uneven detail coverage |
| Map posting | Direct post around a selected building/place | Discussion/Question composer, exact footprint placement, public label and Building Wall synchronisation | Stronger linked knowledge loop; local only |
| Sticky notes | Visual wall posts, photos and voting | Adds typed Questions, detail interaction, filters/sorts/search and ownership rules | More structured knowledge; seed vote values remain demo-only |
| Community scope | KMK → Major/Jurusan flow | All KM Students, 12 College landings, 12 direct General routes, 33 Jurusan walls | Major scope expansion; many scopes empty/seeded and College General is hidden |
| Cross-college | Not the primary documented scope | All KM and college identities/routes | Cross-college architecture exists; adoption and full campus data do not |
| All KM Students | Not in early KMK flow | Dedicated global wall with full Community interaction | New global layer; 67 starting posts are seed |
| Question / Comment | Mostly note/vote flow | Discussion/Question, comments, one-level replies, Open/Solved | Major functional upgrade; Building comments absent |
| Academic resources | Not in early flow | Echo Library with course hierarchy/search/relationships | New major product pillar |
| Real learning files | Not a core old flow | 377 verified-existing file mappings across PDF/PPTX/DOCX | Real demo/library evidence; not adoption and corpus remains unverified |
| Ask Echo | Demonstrated assistant entry and campus questions | Local 41-record retrieval-based campus guide with selected building actions | Better bounded description/data; still not advanced/general AI |
| Language | EN/BM/ZH demonstrated | Locale tables integrated across major current UI | Retained/expanded; some dynamic strings remain English |
| Theme | Limited/not central in early flow | Light/Dark/System with persistence and system reaction | Added platform usability |
| Platform support | Local registration/profile | Expanded local auth/profile, upload, roles/scopes, queues, audit and moderation | Technically much deeper; still browser-local, not production backend |

### Major product evolution — concise finding

EchoWall has evolved from a primarily KMK map-and-sticky-wall demonstration into a broader campus knowledge prototype with three connected domains: physical places, layered student communities and academic resources. The largest genuine additions are All KM/College/Jurusan scopes, structured Community Q&A, Echo Library with real-file mapping, and stronger place-to-wall integration. Expansion should not be mistaken for deployment: detailed mapping remains KMK-only, much Community activity is seeded, and identity/storage/moderation remain local to one browser.

## 13. Functional product summaries (descriptive, not Abstract text)

### One-line product definition

EchoWall is a browser-based campus knowledge prototype connecting KMK places, place-linked student communities, structured academic resources, and a bounded local campus guide.

### Three-sentence product definition

EchoWall connects a detailed KMK campus map and building profiles to dedicated place walls, so a note created at an eligible footprint can remain attached to that physical place. It also provides All KM Students, College and Jurusan Community spaces with discussions, questions, comments, replies and solved state, alongside Echo Library’s course-structured metadata and real-file access. Three interface languages, themes, local accounts, PDF contribution/review and a retrieval-based campus guide support these flows within a browser-local prototype.

### 50-word functional summary

EchoWall links campus places, student communities, and academic resources in one browser-based prototype. Students can explore KMK buildings, post place-linked notes, join global, college, or jurusan walls, ask and resolve questions, search Echo Library metadata, open curated files, contribute PDFs for review, and use English, Malay, or Chinese interfaces locally.

### 100-word functional summary

EchoWall is a browser-based prototype connecting campus navigation, place knowledge, student discussion, and academic resources. Its KMK map links building footprints, profiles, schedule-based status, direct map posting, and dedicated Building Walls. Community spaces cover All KM Students, twelve college landings, College General routes, and thirty-three jurusan walls with discussions, questions, comments, replies, solved status, filters, search, photos, and anonymous posting. Echo Library organises metadata by programme, semester, subject, category, year, and source, while opening 377 mapped files. Ask Echo retrieves answers from a local campus knowledge base. Accounts, uploads, moderation, three languages, themes, and accessibility-supporting controls operate locally per browser.

### 200-word functional summary

EchoWall is a browser-based campus knowledge prototype organised around places, communities, and academic resources. On the KMK map, students can search buildings, inspect footprints, view schedule-based opening information, open profiles, and publish a place-linked note that also appears on the matching Building Wall. Building profiles cover thirty-two KMK places, with varying descriptions, purposes, notes, photos, and map geometry. Community navigation provides All KM Students, twelve college landings, direct College General routes, and thirty-three jurusan walls. Community posts support discussions, questions, categories, shapes, colours, photos, named or anonymous identity, filters, search, comments, one-level replies, local voting, and solved status. Echo Library browses resources by programme, semester, subject, category, year, subtype, and source. It exposes 2,284 publishable metadata records, honestly marks unavailable items, and maps 377 records to real PDF, DOCX, or PPTX files. Logged-in users can submit a PDF into a local pending-review workflow. Ask Echo retrieves campus guidance from forty-one local knowledge records and can link selected answers to building details. English, Malay, and Chinese interfaces, Light/Dark/System themes, responsive layouts, keyboard support, local accounts, and scoped moderation complete the prototype. User contributions, sessions, votes, uploads, and admin actions remain local to one browser, while non-KMK maps and datasets remain incomplete.

## 14. Verification record

### Executed checks

- Representative current hashes were dispatched through the route code in a VM harness; canonical, legacy redirect and unknown-fallback paths matched the route map in section 3.
- 73 current executable JavaScript/MJS/CJS source files passed syntax parsing. Two separately stored checkpoint/fragments are not standalone programmes and were not treated as application syntax failures.
- Twelve current test suites completed with 799 explicit passing assertions across admin audit, college scope, dashboard, admin management, moderation assist/schema, role scope, All KM, seed interaction, Sticky Wall, display consistency and Study upload.
- Community post-type unification checks passed.
- Current demo-seed bundle, Pustaka, showcase and portable-demo validators passed.
- Current manifest/file mapping was enumerated directly; all 377 mapped file targets existed.
- The competition PDF’s four pages were extracted/rendered and visually checked.
- Historical reports were treated only as corroboration. For example, `REPORT_ADMIN-V2-FINAL-QA.md` says “1629 real resources”; the current manifest/file enumeration supersedes that stale/ambiguous number with 2,284 publishable metadata records and 377 real mapped files.

### What these checks do not prove

- They do not prove real students used the product.
- They do not validate institutional accuracy of building schedules/resources.
- They do not establish learning, time-saving, community or accessibility outcomes.
- They do not replace a current browser/device/screen-reader acceptance pass.
- They do not turn local storage, seeded content or configured adapters into a production backend.

### Key current source areas

- Entry/routing: `index.html`, `map.html`, `app-router.js`
- Community/walls: `app-community.js`, `app-wall.js`, `services/community-service.js`, `services/comment-service.js`
- Places/map: `app-place.js`, `echomap.js`, `features/map-note-overlay.js`, `data/campus-*`
- Echo Library: `app-study.js`, `data/study-resource-manifest.js`, `data/study-subjects.js`, Study services
- Ask Echo: `services/ai-assistant.js`, `services/free-ai-adapter.js`, `services/bisheng-adapter.js`, `data/kmk-knowledge-base.js`
- Identity/preferences: auth, permission, theme and preferences services; `i18n/`
- Governance: `app-admin.js`, admin/moderation/audit services
- Lower-priority corroboration only: `reports/`, changelog, video scripts/manuals

## 15. Final classification for future writers

### Core capabilities

1. KMK place-based campus navigation and knowledge.
2. Map-to-Building-Wall contribution loop.
3. Layered All KM / College / Jurusan student communities.
4. Structured peer discussion and question resolution.
5. Echo Library academic discovery, relationships and real-file access.

### Supporting capabilities

- Ask Echo local campus guidance.
- Building galleries and static schedule status.
- EN/BM/Chinese, themes, responsive and accessibility-supporting interactions.
- Named/anonymous/photo contribution.
- Local account/profile, PDF submission and content-review workflow.

### Features not worth headline emphasis

- Local role/scope implementation details.
- Legacy route redirects and legacy pin compatibility.
- Home/campus/building display counters.
- Empty College General routes without UI discoverability.
- Empty Events and Computer Science resource frameworks.
- Non-KMK map/building framework screens.
- Unconfigured Cloudinary, Translation, Bisheng, OpenRouter or Supabase readiness.
- Seed score generation, storage migration and internal audit mechanics.

### Overall evidence-safe product statement

The code safely supports describing EchoWall as a working, browser-local prototype with a detailed KMK place/community loop, multi-scope student discussion, and a structured academic library containing a real downloadable subset. It does not support claims of deployment, adoption, outcomes, complete multi-college mapping, verified academic content, live operations, production security/cloud infrastructure, advanced generative AI, or automatic AI moderation.
