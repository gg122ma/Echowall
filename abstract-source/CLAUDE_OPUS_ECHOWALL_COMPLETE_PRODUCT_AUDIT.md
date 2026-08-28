# EchoWall — Complete Product Feature Audit

**Author:** Claude Opus 5 (ultracode, maximum effort)
**Audit date:** 2026-08-28
**Audit type:** READ-ONLY. No project file, data file, asset, test, document or configuration was
modified during this audit. The only files created are the four research documents in
`abstract-source/` whose names begin with `CLAUDE_OPUS_`.

> **This document is NOT an Abstract, not an Abstract draft, and not proposed submission wording.**
> It is a factual reference package for whoever later writes the Abstract, Poster, Documentation
> or Video script. It deliberately uses no Background / Objective / Methodology / Result /
> Conclusion structure.

---

## 0. HOW THIS AUDIT WAS PRODUCED, AND WHAT ITS LIMITS ARE

### Source-of-truth priority actually applied

1. Current source code (read directly, file by file)
2. Current real data / manifests / assets on disk (counted programmatically, not estimated)
3. Current automated tests (**all 13 suites were executed** — see §9)
4. Current reports / `HANDOFF.md` / `CHANGELOG.md`
5. Official InnoSTEM 2026 rules PDF (extracted in full)
6. Architecture / recording documents
7. Old KMK-era video analysis documents
8. `README.md` / `ROADMAP.md` — **treated as stale and overridden wherever code disagrees**

### Explicit verification limits

| Area | Status |
|---|---|
| Source code | Read directly. HIGH confidence. |
| Data counts | Re-derived with Node one-liners against the real files. HIGH confidence. |
| Automated tests | Executed in this session; all pass. HIGH confidence. |
| Live browser interaction | **NOT performed in this session.** No Chrome session was driven. Runtime behaviour statements are code-derived, plus corroboration from two prior audits (`video/CODEX_WEBSITE_REALITY_AUDIT.md`, `video/SCRIPT_RESEARCH_CLAUDE.md`) that did run the site. MEDIUM-HIGH confidence. |
| The old KMK competition video (`video/8月1日(1).mp4`, 257 MB) | **NOT watched.** Reconstructed from `video/SCRIPT_RESEARCH_CLAUDE.md`, which frame-sampled it, plus the `CHANGELOG.md` entry dated 2026-08-01. MEDIUM confidence, clearly attributed in the comparison document. |
| Screen-reader / formal accessibility testing | **NOT performed, and none exists in the project.** |
| Mobile device testing | **NOT performed in this session.** |

---

## 1. COMPETITION CONTEXT (extracted from the official rules PDF)

Source: `video/SYARAT PERTANDINGAN MINI InnoSTEM  2026 UPDATED 19 jun 2026 (5).pdf`
(text extracted in full during this audit).

**Competition:** Pertandingan MINI InnoSTEM, part of Karnival STEM dan Keusahawanan Matrikulasi 2026
(KaSKuM 2026), Kolej Matrikulasi Kedah.
**Theme:** *Inovator STEM: Memacu Inovasi, Melestarikan Masa Hadapan*.
**Team:** 3 students + 1 lecturer mentor. Max 50 teams. Judging is conducted **online**.

### Scoring weights (verbatim from the PDF)

| Part | Component | Weight |
|---|---|---:|
| **BAHAGIAN A — PENILAIAN PRODUK (85%)** | Abstrak | **5%** |
| | Dokumentasi | **15%** |
| | Idea | **20%** |
| | Praktikal dan Kebolehgunaan | **20%** |
| | Impak dan Sumbangan | **25%** |
| **BAHAGIAN B — PENILAIAN VIDEO** | Video | **15%** |

### What each criterion explicitly asks for (from the poster-format table, §5.4)

- **Idea** — *Keaslian* (originality), *penghasilan kepada amalan terkini* (application to current
  practice), *kreativiti/inovasi*, *objektif*, *kumpulan sasaran* (target group). New idea **or**
  modified from an existing project — *"Sertakan bukti penambahbaikan jika pernah menyertai
  pertandingan"* (attach evidence of improvement if previously entered).
- **Praktikal dan Kebolehgunaan** — *Mudah dilaksanakan* (easy to implement), *praktikal digunakan*
  (practical in use), *keberkesanan kos* (cost effectiveness), *berpotensi untuk dikomersialkan*
  (commercialization potential). *"Sertakan bukti sokongan"* (attach supporting evidence).
- **Impak dan Sumbangan** — Impact/contribution on *pengguna / unit / jabatan / kolej matrikulasi /
  masyarakat dan alam sekitar*. *"Sertakan bukti bergambar/surat"* (attach photographic evidence or
  letters).

### Other binding rules

- **4.8** — A project previously entered in a competition **and awarded** must show at least
  **30% improvement**. ← Directly relevant; see the OLD KMK vs CURRENT document.
- **4.10** — The idea must be original and never commercialised, displayed, or submitted to any
  manufacturing sector.
- **4.11** — The project must be submitted as a commercial sample **or a model with a prototype
  produced**. EchoWall is a working software prototype, which satisfies this as a model/prototype.
- **4.12 / 4.13** — Abstract, poster, cover page and presentation video due **1 August 2026**; may
  be in Bahasa Melayu **or** English.
- **6.1–6.3** — Video **3–5 minutes**, must contain: cover page per template (1 s), *Idea projek*,
  *Praktikal dan kebolehgunaan*, *Impak dan sumbangan*. Upload to YouTube as **unlisted**.

### What this means for the audit

The three big-weight product criteria (Idea 20 + Praktikal 20 + Impak 25 = **65%**) are all
**evidence-hungry**: two of the three explicitly demand attached supporting evidence. So the most
valuable feature for this competition is not the most technically impressive one — it is the one
that produces a **visible, verifiable, reproducible result** a judge can watch happen.

---

## 2. WHAT ECHOWALL CURRENTLY IS (technical shape)

- A **static front-end web application**: HTML + CSS + vanilla JavaScript, no framework, no
  bundler, no package manager, no `package.json`. Scripts attach to `window` in a fixed load order.
- **Two HTML documents**, not one SPA:
  - `index.html` — hash-routed single-page app (Home, Community, Building, Echo Library, Auth,
    Ask Echo, Admin). Loads **48 `<script>` files**.
  - `map.html` — a separate document for the Echo Map (Leaflet). Navigating Map → Building Detail
    is a **real page load**, not a client-side route change.
- **Map rendering:** Leaflet vendored locally (`assets/vendor/leaflet/`), but base tiles come from
  `https://{s}.tile.openstreetmap.org/...` — **the map requires an internet connection to render
  its base layer**. Building footprints and all building data are local.
- **Fonts:** Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) — also an online
  dependency.
- **Persistence:** browser-local only. `localStorage` for almost everything; `IndexedDB` for
  academic-file uploads; `sessionStorage` for map return state. **There is no server, no database,
  no API, and no cross-device or cross-user synchronisation at runtime.**
- Application JavaScript (excluding data files, vendor and test scripts): **≈14,900 lines**.
- Three UI languages: English, Bahasa Melayu, Chinese — **704 / 705 / 705 keys, zero missing keys**.

---

## 3. CURRENT ROUTE MAP (derived from `app-router.js:5-67` and `render()` at `app-router.js:161-219`)

| Route / entry | Render function | Module | Purpose | Audience | Status | Primary data source | Persistence | Competition relevance |
|---|---|---|---|---|:---:|---|---|---|
| `index.html` `#/` | `renderHome` | app-router.js:452 | Hero, **hardcoded stat counters**, Community CTA, Echo Library promo, 6 Building Stories cards, Echo Map promo, 3-step "How it works", footer | User | A | `CAMPUS_BUILDINGS` + hardcoded constants | — | Entry frame only. **Stat block is unsafe to quote.** |
| `map.html` | (standalone doc) | echomap.js, features/map-note-overlay.js | Echo Map KMK: footprints, sidebar list + search, preview panel, hours, map posting, college switcher | User | A (needs network for tiles) | `CAMPUS_BUILDINGS`, `CAMPUS_BUILDING_HOURS`, `MapNoteService` | `echowall_map_notes`, `echowall_map_note_anchors_v1` | **Highest** — Idea + Practical |
| `#/places` | `renderPlaceDirectory` | app-place.js:96 | Building Stories directory, 32 buildings, client-side search | User | A | `CAMPUS_BUILDINGS` | — | Medium (overlaps Map) |
| `#/place/:placeId` | `renderPlaceProfile` | app-place.js:187 | Building Detail: gallery, description, Purpose, Opening Hours table, Special Notes, Current Events, Upcoming Events, Building Echoes, Enter Wall | User | A (Events empty) | `CAMPUS_BUILDINGS`, `BuildingHours` | — | **High** — Practical |
| `#/place/:placeId/wall` | `renderBuildingWall` | app-wall.js | Building sticky wall (no comments by design) | User | A | notes store | `echo-wall-notes` | **High** — Idea |
| `#/community` | `renderCommunityHub` | app-community.js:23 | Hub: All KM Students card + 12 College cards | User | A | `organizations` + display counts | — | High |
| `#/community/all` | `renderCommunityGlobalWall` | app-wall.js:204 | All KM Students global wall (67 seeded posts) | User | A | All-KM seed | `echo-wall-notes`, comments store | **Highest** — Practical + Impact |
| `#/community/:orgId` | `renderCollegeLanding` | app-community.js:113 | College landing: Jurusan list + Campus Map / Building Registry buttons | User | A | `organizations`, `majors` | — | Medium |
| `#/community/:orgId/general` | `renderCommunityCollegeGeneralWall` | app-wall.js:218 | College General wall | User | **C** | notes store | `echo-wall-notes` | **Low — orphaned route, see §6** |
| `#/community/:orgId/jurusan/:majorId` | `renderWall` | app-wall.js | Jurusan community wall (34 routes) | User | A | seed bundle + user notes | `echo-wall-notes` | High |
| `#/study` | `renderStudyHome` | app-study.js:631 | **Echo Library** home: global search + 4 jurusan cards + upload CTA | User | A | `StudyResourceService` | — | **Highest** — Practical + Impact |
| `#/study/:jurusan` | `renderStudyJurusan` | app-study.js:669 | Semester picker with real counts | User | A | subject registry | — | High |
| `#/study/:jurusan/sem/:semester` | `renderStudySemester` | app-study.js:706 | Subject list with counts and type badges | User | A | subject registry + manifest | — | High |
| `#/study/:jurusan/sem/:sem/:subjectCode` | `renderStudySubjectShell` | app-study.js:756 | Resource list: category tabs, year grouping, Year/Subtype/Source filters, sort, load-more (15/page) | User | A | manifest | — | High |
| `#/study/resource/:resourceId` | `renderStudyResourceDetail` | app-study.js:819 | 6 metadata fields, verification badge, related question↔scheme link, open/download file or honest unavailable state | User | A | manifest + `assets/study-files/` + IndexedDB | — | **Highest** — Practical |
| `#/study/upload` | `renderStudyUploadShell` | app-study.js:1246 | Upload form: cascading Jurusan→Semester→Subject, type→subtype, related-resource picker, file validation | User (sign-in) | B | form → IndexedDB | `echowall-study-uploads-v1` | Medium |
| `#/admin` | `renderAdmin` | app-admin.js + dashboard + management | Admin/moderation workspace, scope-filtered | Admin only | B | moderation/audit stores | `localStorage` | **Low for the video, high for Documentation** |
| `#/org/:orgId/map` | `renderOrgCampusMap` | app-campus-map.js:174 | Non-KMK campus map (framework preview) | User | **D** | `CAMPUS_MAP_CONFIGS` | — | Do not emphasise |
| `#/org/:orgId/buildings` | `renderOrgBuildingRegistry` | app-campus-buildings.js | Non-KMK building registry | User | **D** (all registries empty) | `CAMPUS_BUILDING_REGISTRY` | — | Do not emphasise |
| `#/org/:orgId/building/:buildingId` | `renderOrgBuildingDetail` | app-campus-buildings.js | Non-KMK building detail | User | **D** (unreachable — no data) | registry | — | Do not emphasise |
| `#/org/:orgId` (legacy) | redirect → `#/community/:orgId` | app-router.js:172 | Backward compatibility | — | X | — | — | None |
| `#/wall/:orgId/:majorId` (legacy) | redirect → `#/community/:orgId/jurusan/:majorId` | app-router.js:167 | Backward compatibility | — | X | — | — | None |
| `#/org/:orgId` full page (`renderOrgDetails`) | `renderOrgDetails` | app-router.js:562 | Legacy org page with major picker | — | X | — | — | None (superseded) |

**Route coverage note:** every branch of `getRoute()` is represented above. `renderOrgDetails` is
still defined and referenced by `route.page === "org"`, but `getRoute()` no longer ever returns
`page: "org"` — bare `#/org/:id` returns `community-college` with `legacy: true`. So
`renderOrgDetails` is **dead code reachable only if the router is changed**.

---

## 4. STATUS TAXONOMY USED

| Code | Meaning |
|:---:|---|
| **A** | Fully working, user-facing, reachable through normal navigation |
| **B** | Working with prototype constraints (browser-local storage, prototype auth, sign-in gate) |
| **C** | Partial — works only on some paths, or for some content, or is not linked from the UI |
| **D** | Framework/UI exists but the data is empty or the surface is a declared preview |
| **E** | Planned / adapter present but not connected / not implemented |
| **X** | Internal / infrastructure, not a user-facing product feature |

Plus two flags on every entry: **CORE / SUPPORTING / INFRA**, and
**COMPETITION SUMMARY SAFE: YES / YES-WITH-QUALIFIER / NO**.

---

## 5. COMPLETE FEATURE INVENTORY

### 5.1 ECHO MAP — place discovery (17 capabilities)

| ID | Feature | Files | Actual behaviour | Status | Core? | Safe? |
|---|---|---|---|:---:|:---:|:---:|
| MAP-01 | Interactive Leaflet campus map | `map.html`, `echomap.js:272` | Leaflet vendored locally; **base tiles fetched live from OpenStreetMap**, maxZoom 20. Campus bounds `[6.42175,100.41585]–[6.42805,100.42265]` | A | CORE | YES-QUAL (needs network) |
| MAP-02 | Fit Campus control | `echomap.js:717,815` | `flyToBounds`/`flyTo` back to the active college view | A | SUPPORTING | YES |
| MAP-03 | Building footprint polygons | `echomap.js:24-206`, `data/campus-buildings.js` | **19** buildings have a `mapFootprint` and `opensPreview:true`, each with its own idle/hover/selected colour and click+keyboard handlers. 30 of 32 buildings additionally carry an `overviewPolygon` used for the bird's-eye SVG | A | CORE | YES |
| MAP-04 | Sidebar building list + search | `map.html:145-149`, `echomap.js:213-227` | **13** featured buildings (`FEATURED_BUILDING_IDS`) listed in the sidebar with live name search. ⚠️ The sidebar's own i18n copy still says **"fourteen focus buildings"** — stale text, does not match code | A | SUPPORTING | YES-QUAL |
| MAP-05 | Building preview panel | `echomap.js:477+` | Emoji, name, localized alias, category, zone, clamped description, note count, up to 5 recent notes, actions | A | CORE | YES |
| MAP-06 | Structured opening hours + open/closed status | `data/campus-building-hours.js`, `window.BuildingHours` | **19** buildings have a machine-readable weekly schedule (`weekly` days 0–6 with open/close/closed, or `24h`). Status computed from the visitor's device clock. Sourced from `KMK_Building_Facility_Source_Summary_EchoWall.docx` — real KMK facility data, not invented | A | CORE | YES-QUAL (static schedule + device clock, not a live feed) |
| MAP-07 | "More details" → Building Detail | `echomap.js`, `app-place.js:232` | Cross-document navigation to `index.html#/place/:id`; sets a `sessionStorage` return hint | A | SUPPORTING | YES |
| MAP-08 | "Enter this building wall" from the map | `app-router.js:117-125` | `navigateToBuildingWall()` resolves canonical id then loads `index.html#/place/:id/wall` | A | CORE | YES |
| MAP-09 | **Map direct posting** | `features/map-note-overlay.js` (781 lines) | Placement mode → click inside a highlighted footprint → "Selected building" + coordinates → compose panel with Message (500 chars), Post Type, Category, Shape, Colour, Photo (≤450 KB), named/anonymous → Publish. Requires sign-in. Composer copy is hardcoded trilingual | B | **CORE** | YES-QUAL (sign-in; scoped to the 19 eligible footprints, not arbitrary coordinates) |
| MAP-10 | Map note markers + show/hide toggle | `features/map-note-overlay.js` | Up to `MAX_PUBLIC_NOTES = 5` public note labels rendered per view, with a toggle control and zoom-based hiding | A | SUPPORTING | YES |
| MAP-11 | **Map note ↔ Building Wall linkage** | `services/map-note-service.js:186-270` | `create()` calls `EchoNoteStore.createPlaceNote()` — the **same store the Building Wall reads** — and separately records a lat/lng anchor. A note posted on the map genuinely appears on that building's wall | A | **CORE** | YES |
| MAP-12 | Map ↔ Building return state | `app-router.js:69-100`, `echomap.js:826+` | `sessionStorage` hint (30-min TTL) so Building Detail's Back button returns to the map instead of the directory | A | SUPPORTING | YES |
| MAP-13 | Multi-college switcher (‹ KMK ›) | `echomap.js:709-806`, `data/campus-map-config.js` | Cycles all **12** colleges in place. KMK keeps the full building experience; the other 11 fly to real GPS coordinates and show the Campus Framework sidebar | B/C | SUPPORTING | **YES-QUAL — see MAP-14** |
| MAP-14 | Non-KMK Campus Framework sidebar | `app-campus-map.js:158-172` | Renders a **"Framework Preview"** badge and the honest line *"Campus structure is ready. Verified building information will be added progressively."* | **D** | SUPPORTING | YES-QUAL (as a framework, never as a working campus) |
| MAP-15 | In-app campus map route | `app-campus-map.js:174` | `#/org/:orgId/map` — same framework page inside `index.html` | D | SUPPORTING | NO |
| MAP-16 | Non-KMK building registry + detail | `app-campus-buildings.js`, `data/campus-building-registry.js` | **All 11 non-KMK registries are literally empty arrays.** The file's own comment says "Framework only — nothing here is fabricated" | **D** | SUPPORTING | **NO** |
| MAP-17 | Map moderation integration | `services/moderation-service.js`, ADMIN-V2-002A | Map notes can be hidden/restored through the unified moderation queue | X | INFRA | YES-QUAL |

**Not implemented on the map — do not claim:** turn-by-turn navigation, routing, indoor mapping,
GPS positioning of the visitor, offline tiles, arbitrary-coordinate posting.

---

### 5.2 BUILDING / PLACE KNOWLEDGE (11 capabilities)

| ID | Feature | Files | Actual behaviour | Status | Core? | Safe? |
|---|---|---|---|:---:|:---:|:---:|
| BLD-01 | Building Stories directory | `app-place.js:96-124` | All **32** KMK buildings as cards, photo-first ordering, client-side text search, zone label and note count | A | SUPPORTING | YES |
| BLD-02 | Building Detail page | `app-place.js:187-232` | Hero with emoji, localized name, description, then Purpose → Opening Hours → Special Notes → Current Events → Upcoming Events → Building Echoes → Enter Wall | A | CORE | YES |
| BLD-03 | Trilingual building knowledge | `data/campus-buildings.js` | **All 32** buildings carry `description`, `purpose` (14), `specialNotes` (10) and `tags` as `{en, ms, zh}` objects. `hours` text on 31 | A | **CORE** | YES-QUAL (purpose/specialNotes coverage is partial — 14/32 and 10/32) |
| BLD-04 | Photo gallery | `app-place.js:26-95` | **10** buildings have photos, **18** photo files on disk, **4** buildings have a multi-photo gallery with prev/next arrows and an `n / total` live indicator. Photo `src` is validated against a strict path pattern before rendering | A | SUPPORTING | YES-QUAL (not every building has a photo) |
| BLD-05 | Bird's-eye SVG outline fallback | `app-place.js:19-24` | Buildings without photos render their real `overviewPolygon` as an SVG silhouette | A | SUPPORTING | YES |
| BLD-06 | Weekly hours table + today highlight | `app-place.js:141-163` | Full 7-row weekly table, today's row highlighted, plus a status line ("Open now" / "Closed") | A | CORE | YES-QUAL |
| BLD-07 | Current / Upcoming Events | `app-place.js:171-183` | Sections render, filtered by `event.status`. **No building in `data/campus-buildings.js` has an `events` array at all — both sections always show their empty state.** `CHANGELOG.md:1448` confirms this is a display-only data hook with no backend and no submission flow | **D** | SUPPORTING | **NO** |
| BLD-08 | Building Echoes count | `app-place.js:184-186` | Shows a note count — but through `getBuildingDisplayCount()`, the display-override layer (see §7) | B | SUPPORTING | **NO (the number)** |
| BLD-09 | Building Wall | `app-wall.js` | Full sticky wall for a building: post, read, filter, sort, search, vote, note modal | A | **CORE** | YES |
| BLD-10 | Building Wall comments | `services/comment-service.js` | **Deliberately absent.** Comments are Community-post-only, by explicit product design, for both seed and real posts | E (by design) | — | **NO — do not imply building notes can be commented on** |
| BLD-11 | Building reviews / ratings / videos / event submission | — | **NOT IMPLEMENTED.** No review data, no review UI, no rating model, no video sticky, no event submission form anywhere in the codebase. The V2 requirements document listed them; they were not built | **E** | — | **NO — NOT SAFE TO CLAIM** |

---

### 5.3 COMMUNITY (20 capabilities)

| ID | Feature | Files | Actual behaviour | Status | Core? | Safe? |
|---|---|---|---|:---:|:---:|:---:|
| COM-01 | Community Hub | `app-community.js:23-110` | One "All KM Students" card + a 12-card college grid, each with a pointer-following glow effect | A | CORE | YES |
| COM-02 | **All KM Students global wall** | `app-wall.js:204-216` | Cross-college wall at `#/community/all`, scope `global:all`. Seeded with **67** posts | A | **CORE** | YES-QUAL (the 67 posts are seed content) |
| COM-03 | College landing pages | `app-community.js:113-155` | 12 colleges; each shows its Jurusan list plus Campus Map / Building Registry buttons | A | SUPPORTING | YES |
| COM-04 | Jurusan community walls | `app-wall.js` `renderWall` | **34** Jurusan routes exist across the 12 colleges. **12 of the 34** have seeded content | A | CORE | YES-QUAL |
| COM-05 | College General wall | `app-wall.js:218-235` | Fully implemented and renders correctly — but **no link to it exists anywhere in the UI** (verified: zero `navigate('#/community/…/general')` call sites), and **no seed content exists for any `college:N` key**. Reachable only by typing the URL | **C** | SUPPORTING | **NO** |
| COM-06 | Sticky-note visual system | `app-data.js:180-190`, `app-wall.js:4+`, `style-wall.css` | **10 shapes** (rounded, square, rect, circle, envelope, torn, speech, polaroid, ticket, hexagon), **10 colour presets**, per-note rotation, **4 categories** (Academic Advice, Co-curricular Activity, Campus Life, Emotional Support) each with its own 4-colour palette | A | **CORE** | YES |
| COM-07 | Post composer | `index.html` drawer + `app-wall.js:1022-1094` | Post Type, 500-char body with live counter, optional photo (≤8 MB in, client-compressed), crop scale 100–180%, cover/contain fit, category, shape, colour, named/anonymous. Requires sign-in | B | **CORE** | YES-QUAL |
| COM-08 | Discussion / Question post types | `app-data.js:191+`, `app-wall.js:467-469` | `EchoPostTypeContract`: only the exact value `"question"` opts into Question; anything else falls back to Discussion. Question posts carry an Open/Solved badge | A | **CORE** | YES |
| COM-09 | Comments | `services/comment-service.js`, `app-wall.js:578+` | Community posts only. Keyed by post id, persisted in `localStorage`, survives reload. **Works on seed posts too** — the `isDemoSeed` UI gate was removed in the 2026-08-23 stage | B | **CORE** | YES-QUAL (per-browser persistence) |
| COM-10 | One-level replies | `services/comment-service.js` (COM-V2-005) | Reply depth 0/1 only. Same persistence | B | CORE | YES-QUAL |
| COM-11 | Mark Solved / Reopen | `services/permission-service.js:canUserMarkSolved`, `app-wall.js:700-706` | Author **or** a moderator with the right scope. **Seed posts can never be solved by a normal user** — their `authorUserId` is a demo id that never matches a real account. All 44 seeded questions ship as `open` | **C** | CORE | **YES-QUAL — only demonstrable on a post the demo user created** |
| COM-12 | Voting (Agree / Disagree) | `app-wall.js:719-735` | Works on real user posts and older stored defaults. **Blocked for runtime seed posts** (frozen objects — the CHANGELOG calls this a deliberate documented scope decision). **No sign-in is required to vote**, and votes are stored per browser | **C** | SUPPORTING | **YES-QUAL — never demonstrate voting on a seed post** |
| COM-13 | Filters and sort | `app-wall.js:295-320` | Category filter (All + 4), Post-Type filter (All / Discussion / Question — community only), Sort (🔥 Hot / 🕒 New / ❓ Unanswered — Unanswered is community-only and means "open question with zero published comments") | A | SUPPORTING | YES |
| COM-14 | Wall search | `app-wall.js:318` | Live text search within the current wall, with a clear button | A | SUPPORTING | YES |
| COM-15 | Note detail modal | `app-wall.js:660-711` | The modal card takes the note's own shape and colour; shows category badge, question badge, photo, body, author, date, vote row, question actions, comment thread | A | SUPPORTING | YES |
| COM-16 | Per-note Translate button | `app-wall.js:552-576`, `services/translation-service.js` | Button renders on **every** note modal. `EchoConfig.translation.endpoint` is `""`, so the service always throws `TRANSLATION_NOT_CONFIGURED` and the UI shows a "translation unavailable" toast. **The feature never succeeds in the shipped configuration** | **E** | — | **NO — do not claim note translation works** |
| COM-17 | Anonymous / named publishing | `index.html` fieldset, `app-wall.js` | Signed-in users choose per post. Anonymous is the default selection | A | **CORE** | YES |
| COM-18 | User-facing report / flag | — | `ModerationService.createReport()` exists (`services/moderation-service.js:505`) but **has zero call sites outside that file**. There is **no Report button anywhere in the user interface.** ⚠️ Ask Echo's canned reply still says *"Sign in to publish a note, vote, or report content"* — that sentence is inaccurate | **E** | — | **NO** |
| COM-19 | Edit / delete your own post | — | **Not implemented.** No `editNote`/`deleteNote` for ordinary users; removal is an authorised-admin action only | **E** | — | **NO** |
| COM-20 | Legacy route redirects | `app-router.js:55-66,167-176` | `#/org/:id` and `#/wall/...` `history.replaceState` to canonical Community V2 routes | X | INFRA | YES (not worth mentioning) |

---

### 5.4 ECHO LIBRARY — academic resources (14 capabilities)

> **Naming confirmed.** The current user-facing name is **"Echo Library"** in all three languages
> (`i18n/locales/{en,ms,zh}.js` → `study.hub.title`, `study.home.title`, document titles, breadcrumb).
> The internal route is still `#/study` and the internal service is still `StudyResourceService` —
> the 2026-08-23 rename was **display-name-only**. Do not write "Study Notes" in any user-facing text.

| ID | Feature | Files | Actual behaviour | Status | Core? | Safe? |
|---|---|---|---|:---:|:---:|:---:|
| LIB-01 | Echo Library home | `app-study.js:631-662` | Global search bar, upload CTA, **4** jurusan cards with real resource counts | A | **CORE** | YES |
| LIB-02 | Global search with relevance ranking | `app-study.js:462-544`, `services/study-resource-service.js` | Ranks by exact subject code → prefix → title → topic → year. Load-more at 20 per page | A | CORE | YES |
| LIB-03 | Global filters + sort | `app-study.js:500-544` | Year filter, Source-college filter, Sort (relevance preserved as an explicit sort mode) | A | SUPPORTING | YES |
| LIB-04 | Semester picker | `app-study.js:669-704` | Semester 1 / 2 with real subject and resource counts. Deliberately a separate page from the subject list | A | SUPPORTING | YES |
| LIB-05 | Subject list | `app-study.js:706-754` | Subject code, confirmed name (or code alone when the name was never verified), resource count, resource-type badges | A | CORE | YES |
| LIB-06 | Subject resource page | `app-study.js:240-437` | Category tabs, **year grouping for PSPM and Pre/Pra-PSPM**, Year/Subtype/Source filters, sort, load-more at 15 per page. `lecturer_notes`/`student_notes` tabs are hidden but their items still appear under "Other Resources" | A | CORE | YES |
| LIB-07 | Resource detail | `app-study.js:819-885` | Subject · Semester · Type · Year · Source · Verification, optional description, related-resource link, open/download action | A | **CORE** | YES |
| LIB-08 | **Real file opening** | `services/study-resource-service.js`, `assets/study-files/` | **377 real files on disk: 363 PDF, 8 PPTX, 6 DOCX.** Manifest `fileUrl` count is exactly 377 — **zero missing files**. PDFs open in a new tab; other types download. Files are named by `resourceId`, so no original folder path is ever exposed | A | **CORE** | YES |
| LIB-09 | Honest unavailable state | `app-study.js:849-851` | The **1,907** publishable records with no bundled file render a disabled button and an explicit "not included in this demo" note — they are never hidden or faked | A | SUPPORTING | **YES — this honesty is itself a selling point** |
| LIB-10 | **Question ↔ Answer Scheme pairing** | manifest `relatedResourceId`, `app-study.js:833-839` | **230 fully reciprocal pairs** (+ 8 one-way links = the manifest header's 238). **65 pairs have a real openable file on both sides.** The detail page labels the link correctly in each direction ("Related answer scheme" / "Related question") | A | **CORE** | YES-QUAL (quote 230 pairs; 65 fully openable) |
| LIB-11 | Upload / submission | `app-study.js:1246+`, `services/study-submission-service.js` (810 lines) | Cascading Jurusan→Semester→Subject and Type→Subtype selects, related-resource picker, file validation (≤60 MB, signature-checked), **SHA-256 content hashing with exact-duplicate blocking**, stored in IndexedDB `echowall-study-uploads-v1`, created as `moderationStatus:"pending"` / `verificationStatus:"unverified"`. Only `approved` submissions ever surface in the library. Requires sign-in | B | CORE | YES-QUAL (browser-local; no submission-history page for the submitter) |
| LIB-12 | Study moderation | `app-study-admin.js`, ADMIN-V2-006 | Pending uploads reviewed in the admin workspace by a Study Moderator or Super Admin | B | INFRA | YES-QUAL |
| LIB-13 | Computer Science jurusan | `data/study-subjects.js` | Present in the fixed enum with **0 subjects and 0 resources**. The file's own comment says this is deliberate: "its subject list is intentionally empty until a real batch exists, not filled with guesses" | **D** | — | **NO — never present Echo Library as covering all four programmes** |
| LIB-14 | Verification status | manifest | **All 2,468 records are `verificationStatus: "unverified"` and `moderationStatus: "unverified"`.** The UI renders an "Unverified" badge honestly | **D** | — | **NO — never claim resources are verified or lecturer-approved** |

---

### 5.5 ASK ECHO — campus knowledge assistant (11 capabilities)

| ID | Feature | Files | Actual behaviour | Status | Core? | Safe? |
|---|---|---|---|:---:|:---:|:---:|
| AI-01 | Launcher + chat panel | `services/bisheng-adapter.js:mountButton`, `services/ai-assistant.js:184-231` | Floating ✦ launcher, modal chat panel with `role="dialog"`, live region, Escape to close. **Present on `index.html` only — not on `map.html`** | A | CORE | YES |
| AI-02 | Local retrieval engine | `services/free-ai-adapter.js` (500 lines) | Tokenizes the query (with dedicated Chinese character + bigram handling), scores every knowledge-base document by TF-like keyword overlap across title/aliases/tags/content, returns the top matches, then composes a template answer | A | **CORE** | YES-QUAL |
| AI-03 | Knowledge base | `data/kmk-knowledge-base.js` | **41 curated campus documents**, each with `content`/`contentMs`/`contentZh`, `location`/`locationMs`/`locationZh`, `rules`/`rulesMs`/`rulesZh`, `hours`, `aliases`, `tags`, `source` and `dataStatus`. Categories include sports (11), dining (5), accommodation (4), education (4), administrative (3), services, finance, health, mobility, retail, support, activity. **12 documents carry a `buildingId`** that links to a real building profile | A | **CORE** | YES |
| AI-04 | Sourcing policy | `KMK_KNOWLEDGE_BASE.sources` | Explicitly records what is *included* (`school-environment.pdf.pdf` — the real campus source document) and what is *excluded* (the competition-strategy docx and the InnoSTEM rules PDF). `dataStatus` labels each record: 26 `student-guide`, 12 `pending`, 2 `partial-dates`, 1 `student-experience` | A | SUPPORTING | **YES — genuinely strong provenance discipline** |
| AI-05 | Answer actions | `services/free-ai-adapter.js:296-311`, `services/ai-assistant.js:56-73` | Can emit "View details" / "Open building profile" → `#/place/:id`, "Open Echo Map" → `map.html`, "Browse buildings" → `#/places` | A | CORE | YES |
| AI-06 | Suggested questions | `services/ai-assistant.js:202-206` | Three chips, translated into all three languages: "Where is the library?", "Show sports facilities", "Where is the cafeteria?" | A | SUPPORTING | YES |
| AI-07 | **Safety boundary rules** | `services/free-ai-adapter.js:206-241` | Three deterministic guards **before** retrieval: *course/exam-answer* questions are deferred to a verified course knowledge base; *forbidden* topics (InnoSTEM, competition strategy, internal development, repositories, API keys, passwords) are refused; *medical* questions are refused and redirected to the dormitory office / emergency services | A | SUPPORTING | **YES — good responsible-scope story** |
| AI-08 | Language detection | `services/free-ai-adapter.js:99-110` | Detects Chinese by character range and Malay by keyword list; otherwise English. Answers are drawn from the matching localized fields | A | SUPPORTING | YES |
| AI-09 | OpenRouter remote model | `services/free-ai-adapter.js:317-380` | Fully implemented **but disabled**: `EchoConfig.freeAI.provider === "local"` and `openRouterToken === ""` | **E** | — | **NO** |
| AI-10 | BISHENG enterprise bridge | `services/bisheng-adapter.js` | `enabled: true` but `endpoint: ""` → `isConfigured()` returns false → never called | **E** | — | **NO** |
| AI-11 | Re-translating an existing answer | — | Switching language updates the panel's static labels but **not answers already displayed** | **E** | — | NO |

**The single most accurate product description of Ask Echo:**
> **A guided campus knowledge assistant.** It answers questions about KMK places, facilities, hours
> and student services by retrieving from a curated, trilingual, source-attributed local knowledge
> base of 41 records plus 32 building profiles, and can hand the student straight to the matching
> building page or the map. It has explicit refusal boundaries for course answers, medical advice
> and internal/competition topics.

**Overclaims to avoid for Ask Echo:** "AI-powered", "generative AI", "LLM", "ChatGPT-like",
"understands natural language", "learns", "real-time", "connected to the internet",
"BISHENG-powered". None of these are true in the shipped configuration.

---

### 5.6 LANGUAGE / THEME / RESPONSIVE / ACCESSIBILITY (11 capabilities)

| ID | Feature | Evidence | Status | Core? | Safe? |
|---|---|---|:---:|:---:|:---:|
| UX-01 | **Three complete UI languages** | Measured in this audit: EN **704** keys, MS **705**, ZH **705**. **Zero keys missing** from MS or ZH. Only 21 MS values and 9 ZH values are byte-identical to English (proper nouns and brand terms) | A | **CORE** | **YES — this is a fully verified claim** |
| UX-02 | Language persistence + live re-render | `i18n/index.js`, `app-router.js:653` | Saved to `echo-wall-language:v1`; `echo:languagechange` triggers `I18n.apply()` + full route re-render + navbar re-render | A | SUPPORTING | YES |
| UX-03 | Light / Dark / System theme | `services/theme-service.js` (35 lines) + **241 `[data-theme="dark"]` rules** across style-core (122), style-admin (60), style-wall (42), style-study (17). Listens to `prefers-color-scheme` changes while in System mode. Saved to `echo-wall-theme:v1` | A | SUPPORTING | YES |
| UX-04 | Responsive layout | 12 `@media` blocks in `style-core.css` plus dedicated map breakpoints at 980 px and 620 px; the map switches to a stacked layout and moves its floating controls to the bottom on small screens | A | SUPPORTING | YES-QUAL (not device-tested this session) |
| UX-05 | Trilingual campus content | Building descriptions/purpose/notes/tags, Ask Echo knowledge base, map composer copy, and the seeded community content itself (**401 ms / 212 en / 83 zh** in the main bundle; **34 en / 20 ms / 13 zh** in All KM Students) | A | **CORE** | YES |
| UX-06 | Keyboard & ARIA support | Measured: **329** `aria-*` attributes and **73** explicit `role=` values across HTML+JS; **44** `:focus-visible` rules across the four stylesheets; a skip link on `index.html`; `aria-modal`/`aria-live`/`aria-pressed`/`aria-expanded`/`aria-checked` used throughout; footprints are focusable with a focus filter | B | SUPPORTING | **YES-QUAL — say "keyboard and screen-reader affordances", never "accessible" or "WCAG compliant"** |
| UX-07 | Reduced-motion respect | `prefers-reduced-motion` checked in `style-core.css` and in 4 places in `app-router.js` (reveal animations, counters, parallax, pointer glow all disable) | A | SUPPORTING | YES |
| UX-08 | Modal / drawer behaviour | Focus moved into the dialog on open, `overlay-open` body class for scroll lock, Escape and overlay-click to close | A | SUPPORTING | YES |
| UX-09 | Client-side image handling | Canvas compression before storage, live "Photo ready (N KB after compression)" status, preview with remove button, crop-scale slider 100–180%, cover/contain fit picker, per-image error fallback | A | SUPPORTING | YES |
| UX-10 | Route polish | Scroll reset on navigation, `IntersectionObserver` reveal animations, pointer-following glow on hub cards, animated home counters, toast region | A | SUPPORTING | YES |
| UX-11 | Formal accessibility audit / certification | **None exists** | **E** | — | **NO** |

---

### 5.7 AUTH / IDENTITY / MEDIA (7 capabilities)

| ID | Feature | Evidence | Status | Core? | Safe? |
|---|---|---|:---:|:---:|:---:|
| AUTH-01 | Local registration | `services/auth-service.js:119-143` | Email format validation, display name ≤50 chars, duplicate-email rejection, password hashed with **`crypto.subtle.digest("SHA-256", …)`** — client-side, **unsalted**. Stored in `echo-wall-users:v1` | B | INFRA | YES-QUAL — always say "prototype, browser-local, not production security" |
| AUTH-02 | Sign in / out / session | `services/auth-service.js:144+` | Session in `echo-wall-user-session:v1`; `echo:authchange` event re-renders gated routes | B | INFRA | YES-QUAL |
| AUTH-03 | Profile + education profile | `app-data.js:85-115`, `services/auth-ui.js` | Independent profile directory of **17 institutions** and **4 programmes** with legacy-id mapping; status enum `unset / current_student / alumni / non_student`; start-year validation | B | SUPPORTING | YES-QUAL |
| AUTH-04 | Sign-in gating | `services/permission-service.js:canUserPost/canUserComment` | Posting, commenting and uploading require an account. Reading is fully public. **Voting does not require an account** | A | SUPPORTING | YES |
| AUTH-05 | Named vs anonymous identity | throughout | Identity is retained internally (`authorUserId`) while the public display can be anonymous | A | **CORE** | YES |
| AUTH-06 | Cloudinary signed upload adapter | `services/cloudinary-adapter.js`, `config/app-config.js` | `cloudName: ""`, `signatureEndpoint: ""` → **never active**. Photos are stored as compressed base64 in `localStorage` instead | **E** | — | **NO** |
| AUTH-07 | Production auth provider (Supabase or equivalent) | `docs/BACKEND_INTEGRATION_READINESS.md`, ROADMAP F2 | **Not implemented.** Adapter interface exists (`register`, `signIn`, `signOut`, `getCurrentUser`, `isAuthenticated`) so a provider could be swapped in | **E** | — | **NO** |

---

### 5.8 ADMIN / MODERATION (12 capabilities)

> Technically the deepest subsystem in the project. Built across 11 staged tasks on 2026-08-23
> (ADMIN-V2-001 → ADMIN-V2-FINAL-QA), with **7 dedicated test suites and 472 passing assertions**.

| ID | Feature | Evidence | Status | Core? | Safe? |
|---|---|---|:---:|:---:|:---:|
| ADM-01 | Role / scope / permission contract | `services/admin-permission-service.js` (532 lines) | **5 assignable roles** — SUPER_ADMIN, GLOBAL_MODERATOR, COLLEGE_ADMIN, STUDY_MODERATOR, CONTENT_REVIEWER — plus one internal `LEGACY_ADMIN` pseudo-role. **8 permissions**, **4 scope types** (global / college / study / system), active/disabled status, union-across-assignments permission maths, multi-college scope support | B | INFRA | YES-QUAL |
| ADM-02 | Super Admin bootstrap | `services/admin-permission-service.js:47` | A single hardcoded email constant in client-side JS is the only Super Admin. A second Super Admin **cannot** be created through the UI, by design | X | INFRA | YES-QUAL (mention the mechanism, not the address) |
| ADM-03 | Role Manager UI | `app-admin-management.js`, ADMIN-V2-007 | Grant / revoke / disable role assignments, scope-restricted, audit-first | B | INFRA | YES-QUAL |
| ADM-04 | Unified ModerationItem + Report schema | `services/moderation-service.js` (593 lines) | One index across Community posts, Comments, Building/Event content, Study resources and Map notes. **5 item statuses** (pending, approved, rejected, hidden, escalated) governed by an explicit **transition matrix**; **4 report statuses** (open, reviewing, resolved, dismissed). Content bodies are never copied — items only point at a `contentId` | B | INFRA | YES-QUAL |
| ADM-05 | Scope-filtered dashboard + queue | `app-admin-dashboard.js` (750 lines), ADMIN-V2-003/003A | Queue and counts filtered by what the signed-in admin may actually see | B | INFRA | YES-QUAL |
| ADM-06 | Moderation actions with required reasons | ADMIN-V2-004 | Approve / Reject / Hide / Restore, each writing an audit record; reason required | B | INFRA | YES-QUAL |
| ADM-07 | Audit trail | `services/admin-audit-service.js` (240 lines) | Actor, action, target, scope, reason, timestamp; audit-first ordering so a failed action still leaves a record | B | INFRA | YES-QUAL |
| ADM-08 | Auto Moderation Assist | `services/moderation-assist-service.js` (202 lines) | Deterministic rules only — **no external AI call**. Detects shortened/suspicious link domains (8-domain list), posting floods (5 posts in 10 minutes) and repeated identical content (threshold 3). **It can only create a `pending` item for a human to act on — it never hides, rejects or deletes anything.** The file's own header states the principle: automation may assist but must never be presented as replacing human review | B | INFRA | **YES-QUAL — this restraint is a genuine strength; do not upgrade it to "AI moderation"** |
| ADM-09 | Study moderation integration | ADMIN-V2-006, `app-study-admin.js` | Pending uploads flow into the same queue | B | INFRA | YES-QUAL |
| ADM-10 | Map moderation integration | ADMIN-V2-002A | Map notes hide/restore through the same queue | B | INFRA | YES-QUAL |
| ADM-11 | Community hide/restore | `isHidden` on notes | Hidden notes are excluded from every visible-note query | B | INFRA | YES-QUAL |
| ADM-12 | Admin entry hidden from normal navigation | `services/auth-ui.js:530` | The Admin link appears in the account menu **only** for an admin account; otherwise `#/admin` must be typed | X | INFRA | YES |

**Honest security framing (the code says this about itself, in two separate files):**
> *"This is prototype/front-end enforcement only, not a real security boundary… it can be bypassed
> by calling these functions directly from the browser console. Production moderation reads/writes
> must be re-authorized server-side."*
This self-awareness is worth reporting accurately; it is not a defect to hide, but it does mean the
role system must never be described as "secure access control".

---

### 5.9 PLATFORM / STORAGE / ENGINEERING (11 items)

| ID | Item | Reality |
|---|---|---|
| PLT-01 | `localStorage` keys in use | `echo-wall-notes` (posts), `echo-wall-users:v1`, `echo-wall-user-session:v1`, `echo-wall-role-assignments:v1`, `echo-wall-language:v1`, `echo-wall-theme:v1`, `echo-wall-translation-cache:v1`, `echowall_map_notes` (legacy direct pins), `echowall_map_note_anchors_v1`, plus comment, moderation, audit and schema/backup keys |
| PLT-02 | IndexedDB | `echowall-study-uploads-v1` with `submissions` and `files` object stores; ≤60 MB per file |
| PLT-03 | sessionStorage | `echowall_place_return_source_v1` (30-minute TTL) |
| PLT-04 | Static data modules | `campus-buildings.js` (4,705 lines), `study-resource-manifest.js` (2.2 MB), `demo-seed-bundle.v1.js` (807 KB), `demo-seed-all-student-km.v1.js`, `kmk-knowledge-base.js`, `campus-building-hours.js` |
| PLT-05 | Build tooling | **None.** No framework, no bundler, no package manager, no test runner. Node is used only for standalone maintenance and test scripts |
| PLT-06 | Vendored Leaflet | Local copy so the map library itself never needs a CDN |
| PLT-07 | **Deployment** | `.github/workflows/deploy-pages.yml` publishes to GitHub Pages by **unzipping `EchoWall-portable-demo-v1.zip`** — not the repository tree. See §8 for why this matters a great deal |
| PLT-08 | Automated tests | **13 Node suites, all passing.** See §9 |
| PLT-09 | Seed validators | `validate-portable-demo.mjs`, `validate-demo-seed-showcase.mjs`, `validate-demo-seed-pustaka.mjs` assert exact snapshot hashes and counts; the seed import is verified idempotent |
| PLT-10 | XSS discipline | `escapeHtml()` applied to user content throughout; note photo `src` values validated against a strict data-URL / path pattern before rendering |
| PLT-11 | Backend / Supabase / realtime | **Not implemented.** Documented as future work in `docs/BACKEND_INTEGRATION_READINESS.md` and `ROADMAP.md` F2–F5 |

---

## 6. FEATURES THAT EXIST IN CODE BUT ARE NOT REACHABLE OR NOT POPULATED

These are the items most likely to be accidentally overclaimed, because a code search finds them.

| Item | What is actually true |
|---|---|
| **College General wall** (`#/community/:orgId/general`) | Renders correctly. **No UI link exists** — verified across the whole codebase. **No seed content exists** for any `college:N` key. |
| **Building Events** | Both sections render; **no building has an `events` array**; they can only ever show the empty state. No submission flow, no backend. |
| **Per-note translation** | Button always visible; endpoint is empty; the action always fails with a "translation unavailable" toast. |
| **User reporting** | `createReport()` exists in the moderation service; **no caller, no button**. |
| **Non-KMK building registries** | All 11 arrays are empty by deliberate design ("nothing here is fabricated"). |
| **Computer Science jurusan** | In the enum; 0 subjects, 0 resources — deliberately empty. |
| **Cloudinary / BISHENG / OpenRouter / translation endpoint** | Full adapters, zero configuration. None can fire. |
| **`renderOrgDetails`** | Dead code — `getRoute()` can no longer return `page: "org"`. |
| **Building reviews / ratings / video stickies / event submission** | Named in the V2 requirements document; **never implemented**. |
| **Edit / delete your own post** | Not implemented for ordinary users. |

---

## 7. DEMO DATA vs REALITY — THE MOST IMPORTANT SECTION IN THIS AUDIT

Every number below was re-derived directly from the data files during this audit.

### 7.1 The homepage statistics are hardcoded constants

`app-router.js:453-456`:

```js
const homepageVisibleNotesDisplay  = 1017;
const homepageCommunitiesDisplay   = 12;
const homepagePhotoNotesDisplay    = 53;
const homepageLatestMemoryDisplay  = "Aug 25, 2026";
```

These four literals are injected straight into the four stat cards and animated by
`animateHomeCounters()`. **They are not computed from any data.** Live-count helpers
(`getVisibleRuntimeNotes`, `getVisibleCommunityCount`, `getVisiblePhotoNoteCount`,
`getLatestVisibleNote`) exist immediately above them in the same file and are **not used by the
homepage**.

Ground truth in a clean browser: **782** notes total (763 runtime seeds + 19 built-in defaults),
**4** colleges with any seeded community content, and **0** notes with a photo.

### 7.2 College and building "notes count" are a display-override table

`data/demo-display-counts.js` defines `COLLEGE_DISPLAY_COUNTS` (12 entries, total **593**) and
`BUILDING_DISPLAY_COUNTS` (10 entries, total **412**). The file's own header calls this a
"DISPLAY-ONLY override layer". It is wired into the Community Hub cards, College Landing header,
Building Stories grid, Place Directory, Building Detail "Building Echoes", the Echo Map preview
panel and the Building Wall header.

The overrides diverge from reality **in both directions**:

| Building | Number shown | Notes actually seeded |
|---|---:|---:|
| Masjid | **83** | **0** (plus 1 built-in default note) |
| Dewan Mahawangsa | **67** | **0** |
| Serambi | **35** | **0** |
| Kediaman Pengarah | **21** | **0** |
| Astaka | **11** | **0** (plus 1 default) |
| Dewan Kuliah | 59 | 42 |
| Pustaka | 43 | 42 |
| Blok Tutoran dan Makmal | 58 | 42 |
| **Langkasuka** | **17** | **42** ← shown number is *lower* than reality |
| **Seri Jerai** | **18** | **42** ← shown number is *lower* than reality |

`CHANGELOG.md` (2026-08-23, DISPLAY-COUNT-CONSISTENCY) states this outright:
> *"Masjid's Building Wall genuinely renders its 1 real note while the header reads '83'."*

Colleges: only orgs **1 (KMK), 2 (KMKK), 3 (KMPP), 4 (KMPK)** have any seeded community content.
The other 8 colleges show display counts (KMP 24, KMM 17, KMNS 28, KML 10, KMJ 43, KMPH 15,
KMS 48, KMKT 34) with **zero** underlying posts.

### 7.3 The "53 photo notes" claim has no backing data at all

Checked exhaustively:

- `demo-seed-bundle.v1.js` (696 notes): `imageDataUrl` = 0, `imageUrl` = 0.
- `demo-seed-showcase.v1.json` (588 notes): `imageDataUrl` = 0, `imageUrl` = 0.
- `demo-seed-pustaka.v1.json` (42 notes): `imageDataUrl` = 0, `imageUrl` = 0.
- `echo-wall-kmk-community-seed.v1.json` (108 notes): 0.
- All-KM seed (67 posts): 0.

117 notes carry a `mediaRef` field (a planned filename such as
`seri-jerai-cubic-pa-draft-01.webp`), **but `mediaRef` is read by no runtime code whatsoever** —
`getNoteImageSource()` (`app-data.js:269`) reads only `imageUrl` and `imageDataUrl`. The 117
"media plans" describe images that were never shipped.

**Conclusion: zero seeded notes display a photo.** Photo attachment is a real user capability;
there are simply no seeded examples of it. The building photos (18 files) are a different thing —
they are building gallery images, not note photos.

### 7.4 Seed engagement scores are generated, not real

`app-data.js:569-614`: seed vote scores are assigned from a weighted hash of each note's stable
key, drawn from seven buckets spanning **0–87**, plus 19 fixed "anchor" values for visual QA.
They are deterministic, reproducible fiction. Voting is also *disabled* on seed posts, so those
numbers can never change.

### 7.5 The full data table

| Data / number | What it really represents | Safe to claim? |
|---|---|:---:|
| Homepage "1,017 visible notes" | A hardcoded display constant | **NO** |
| Homepage "12 communities" | Coincides with the 12 configured colleges, but is still a hardcoded constant | YES-QUAL — say "12 configured college communities" |
| Homepage "53 photo notes" | A hardcoded constant with **zero** backing data | **NO** |
| Homepage "Latest memory: Aug 25, 2026" | A hardcoded string | **NO** |
| College display counts, total 593 | Display-override table, unrelated to real content | **NO** |
| Building display counts, total 412 | Display-override table, wrong in both directions | **NO** |
| **763 seeded posts** (696 bundle + 67 All-KM) | Curated demonstration content authored for the prototype | YES-QUAL — "seeded demonstration content" |
| **19 built-in default notes** | 14 community + 5 building starter notes in `app-data.js` | YES-QUAL |
| **782 notes visible in a clean browser** | 763 + 19 | YES-QUAL — never "782 student posts" |
| **67 All KM Students posts** | Copied verbatim from `All_Student_KM_67_Community_Posts.docx`. 44 questions / 23 discussions; 34 EN / 20 MS / 13 ZH; **all anonymous**; all `open`; no comments; score 0 | YES-QUAL — **never "67 students contributed"** |
| Seed language split (bundle) | 401 MS / 212 EN / 83 ZH | YES-QUAL |
| Seed identity split (bundle) | 314 anonymous / 382 named — the "names" are content labels, **not accounts** | YES-QUAL |
| **32 KMK buildings** | Real profiles in `data/campus-buildings.js` | **YES** |
| **19 interactive footprints** | `opensPreview: true` + `mapFootprint` | **YES** |
| **13 sidebar focus buildings** | `FEATURED_BUILDING_IDS`. ⚠️ UI copy still says "fourteen" | YES-QUAL |
| **19 buildings with structured weekly hours** | `CAMPUS_BUILDING_HOURS`, sourced from the real KMK facility document | **YES** |
| **18 building photos across 10 buildings** | Real files on disk; 4 buildings have multi-photo galleries | **YES** |
| **14 buildings with Purpose / 10 with Special Notes** | Partial coverage | YES-QUAL |
| **41 Ask Echo knowledge records** | Curated, trilingual, source-attributed; 12 link to a building | **YES** |
| **2,468 manifest records** | Scanned academic-resource metadata (2,318 auto-parsed, 150 manual review, 36 exact SHA-256 duplicates) | YES-QUAL — metadata, not files |
| **2,284 publishable records** | What users can actually see and search | YES-QUAL |
| **377 real files** | 363 PDF + 8 PPTX + 6 DOCX, all present, zero missing | **YES** |
| **1,907 records without a file** | Render an honest disabled state | YES-QUAL |
| **230 reciprocal question↔scheme pairs** (238 links incl. 8 one-way) | Modelled and surfaced in the UI | **YES** |
| **65 pairs with a real file on both sides** | Fully demonstrable end-to-end | **YES** |
| **33 subjects / 4 jurusan** | sains 1,626 + perakaunan 654 + kejuruteraan 4 publishable; **sains_komputer = 0** | YES-QUAL |
| Exam sessions 2006/2007 → 2025/2026 | Real metadata range | YES-QUAL |
| **All 2,468 records "unverified"** | No verification workflow has been run | Must be **disclosed**, never contradicted |
| **12 colleges / 34 Jurusan routes** | Configured routes; 12 of 34 Jurusan walls have content; **11 of 12 colleges have no building data at all** | YES-QUAL — "configured", never "deployed" |
| **704 / 705 / 705 i18n keys, 0 missing** | Measured this audit | **YES** |
| **241 dark-mode CSS rules** | Measured this audit | **YES** |
| **799+ passing test assertions across 13 suites** | Executed this audit | **YES** |

---

## 8. DEPLOYMENT REALITY — A FINDING WITH REAL CONSEQUENCES

`.github/workflows/deploy-pages.yml` does **not** publish the repository. It runs:

```bash
rm -rf _site && mkdir _site
unzip -q EchoWall-portable-demo-v1.zip -d _site
```

Two facts follow, both verified in this audit:

1. **The workflow triggers on `branches: ["master"]`, but the repository's only branch is `main`**
   (`git branch -a` → `* main`, `remotes/origin/main`). The workflow therefore does not fire on
   normal pushes.
2. **The ZIP contains the pre-21-August product.** Its 61 entries were listed in full. It has
   **no** `app-community.js`, **no** `app-study.js`, **no** `data/study-resource-manifest.js`,
   **no** `assets/study-files/`, **no** `data/demo-seed-all-student-km.v1.js`, **no**
   `data/campus-building-hours.js`, **no** `data/demo-display-counts.js`, **no** admin dashboard or
   permission/moderation services, **no** `style-study.css`, and only 16 building photos.

**Therefore: Echo Library, Community V2 (All KM Students, Discussion/Question, comments, replies,
Solved), Admin V2, structured opening hours, the multi-college switcher and the current Building
Detail page have never been published through this pipeline.** The current product runs correctly
when served locally over HTTP (`python -m http.server 8000`), which is how the demo and the video
must be produced.

**Claim consequence:** nobody may write that EchoWall "is live", "is deployed", "is available
online" or "is in use", unless the ZIP is rebuilt, the branch is corrected, and the deployment is
re-verified. Describe it as **a working prototype that runs in any modern browser from a static
file server**.

---

## 9. FEATURE EVIDENCE MATRIX

All 13 test suites were **executed during this audit** (read-only, Node `vm` sandboxes with mocked
storage; `git status` confirmed unchanged afterwards).

| Suite | Result | What it evidences |
|---|---|---|
| `test-admin-role-scope.mjs` | **95 passed, 0 failed** | ADM-01 role/scope/permission contract |
| `test-admin-moderation-schema.mjs` | **120 passed, 0 failed** | ADM-04 ModerationItem/Report schema + transition matrix |
| `test-admin-audit.mjs` | **64 passed, 0 failed** | ADM-07 audit trail |
| `test-admin-college-scope.mjs` | **56 passed, 0 failed** | ADM-05 college scoping + Content Reviewer assigned-only access |
| `test-admin-dashboard.mjs` | **53 passed, 0 failed** | ADM-05 dashboard helpers |
| `test-admin-management.mjs` | **50 passed, 0 failed** | ADM-03 role manager |
| `test-admin-moderation-assist.mjs` | **34 passed, 0 failed** | ADM-08 auto-assist rules |
| `test-community-sticky-wall-fix.mjs` | **111/111 assertions** | COM-06/13/14/15 wall rendering, scroll container, modal scroll lock, filters, search, deterministic 10-colour distribution |
| `test-study-upload.mjs` | **74 passed, 0 failed** | LIB-11/12 upload + moderation storage |
| `test-display-count-consistency.mjs` | **62/62 assertions** | The display-override layer (§7.2) — including that no consumer file redeclares its own table |
| `test-community-seed-interaction.mjs` | **44/44 assertions** | COM-09/10 comments and replies persisting on seed posts |
| `test-all-student-km-seed.mjs` | **36/36 assertions** | COM-02: exactly 67 posts, unique order, idempotent import |
| `test-post-type-unification.mjs` | **PASS** | COM-08 post-type contract across Community, Building, Map, legacy, persistence, invalid fallback, i18n |

**Total: ≈799 counted assertions, 13/13 suites passing.**

⚠️ **Do not translate "tests pass" into "production ready" or "deployed".** These are direct-call
unit suites against services loaded into a Node sandbox. There is no browser test runner, no
end-to-end suite, and no CI test job.

### Independent corroboration available in the repository

- `video/CODEX_WEBSITE_REALITY_AUDIT.md` — a prior audit that **did** run the site over HTTP and
  verified HTTP status codes and file headers for `index.html`, `map.html`, local Leaflet, a
  Pustaka photo, and both SM015 PDFs. Its counts agree with this audit's (2,284 publishable,
  377 files, 460 resources in reciprocal pairs, 19 preview footprints, 41 KB records).
- `video/SCRIPT_RESEARCH_CLAUDE.md` — a prior audit that drove Chrome and confirmed live behaviour
  of map posting, Building Wall vote increment, Question→Comment→Solved, Echo Library search and
  real PDF opening.
- Two small divergences from the Codex audit, resolved here by direct measurement: Codex reports
  "13 focus buildings" and "33 Jurusan routes"; the code has **13 sidebar focus buildings AND 19
  interactive footprints** (both true, different lists), and **34** Jurusan entries in `majors`.
  Codex also reports Pustaka with 1 photo; the working tree now has **3** (two untracked JPGs added
  after that audit).

---

## 10. KNOWN LIMITATIONS — CONSOLIDATED

### Architectural
1. All user data is browser-local. Nothing is shared between users, devices or browsers.
2. No backend, database, API, authentication server or realtime layer.
3. Front-end permission checks are not a security boundary (the code says so itself).
4. Passwords are hashed client-side with unsalted SHA-256 — prototype only.
5. The map base layer and web fonts require an internet connection.
6. The published GitHub Pages artifact is stale and the workflow branch is misconfigured (§8).

### Content
7. Community activity is seeded; there is no real user activity in the shipped data.
8. Homepage statistics and college/building counts are display constants, not measurements (§7).
9. Zero seeded notes carry a photo.
10. 11 of 12 colleges have no building data; Computer Science has no library resources.
11. All 2,468 library records are `unverified`.
12. 1,907 of 2,284 publishable records have no bundled file.
13. Building Events are always empty.

### Functional
14. No user-facing report/flag action.
15. No edit or delete of your own post.
16. Per-note translation never succeeds.
17. Seed posts cannot be voted on, and cannot be marked Solved by a normal user.
18. Building notes have no comments (deliberate boundary).
19. Voting requires no account and is per-browser.
20. No submission-history page for a student who uploaded a file.
21. Ask Echo has no conversation memory and no follow-up context.
22. Ask Echo answers already on screen are not re-translated when the language changes.

### Evidence
23. No live browser pass in this audit session.
24. No mobile-device or screen-reader testing has ever been recorded.
25. No user study, no adoption data, no lecturer validation, no measured outcomes exist anywhere in
    the repository. **Every impact statement must therefore be framed as potential.**

---

## 11. FINAL SELF-CHECK

| # | Check | Result |
|---:|---|---|
| 1 | Roadmap treated as completed work? | No — README/ROADMAP explicitly marked stale; F2–F5 recorded as unimplemented. |
| 2 | Demo data treated as real usage? | No — §7 is dedicated to separating them. |
| 3 | Map direct posting covered? | Yes — MAP-09, MAP-11. |
| 4 | Building Wall covered? | Yes — BLD-09, plus the no-comments boundary BLD-10. |
| 5 | All KM Students covered? | Yes — COM-02. |
| 6 | Real community posting covered? | Yes — COM-07. |
| 7 | Comments / replies covered? | Yes — COM-09, COM-10, including seed-post behaviour. |
| 8 | Echo Library covered? | Yes — §5.4, 14 capabilities, name confirmed. |
| 9 | Real PDFs confirmed? | Yes — 377 files counted on disk, matching 377 manifest `fileUrl` values. |
| 10 | Question ↔ Answer Scheme confirmed? | Yes — 230 reciprocal pairs, 65 with files on both sides. |
| 11 | Ask Echo described accurately? | Yes — §5.5, with the exact recommended wording and the overclaim list. |
| 12 | Search separated from core selling points? | Yes — search is SUPPORTING in every module. |
| 13 | Admin technical vs competition value separated? | Yes — §5.8 here, and §7 of the selling-points document. |
| 14 | EN / BM / ZH checked? | Yes — key counts measured; 0 missing. |
| 15 | Light / Dark / System checked? | Yes — 241 dark rules, system listener. |
| 16 | Old KMK version compared? | Yes — see `CLAUDE_OPUS_ECHOWALL_OLD_KMK_VS_CURRENT.md`. |
| 17 | Selling points listed? | Yes — see `CLAUDE_OPUS_ECHOWALL_SELLING_POINTS_AND_COMPETITION_VALUE.md`. |
| 18 | InnoSTEM scoring mapped? | Yes — §1 here and §5–§8 of the selling-points document. |
| 19 | Unsafe claims listed? | Yes — §7, §10, and the writer quick reference. |
| 20 | Did this accidentally become an Abstract? | **No.** No Background/Objective/Methodology/Result/Conclusion structure, no submission prose, no suggested wording. |
