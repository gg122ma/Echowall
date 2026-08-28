# EchoWall — Old KMK Version vs Current Version

**Author:** Claude Opus 5 (ultracode, maximum effort)
**Date:** 2026-08-28
**Companion to:** `CLAUDE_OPUS_ECHOWALL_COMPLETE_PRODUCT_AUDIT.md`

> **Not an Abstract, and not proposed submission wording.** This is the factual comparison a writer
> needs in order to satisfy InnoSTEM rule **4.8** — a project previously entered and awarded must
> demonstrate at least **30% improvement**, with evidence attached.

---

## 1. HOW THE "OLD VERSION" WAS RECONSTRUCTED, AND HOW RELIABLE IT IS

**The old competition video was not watched.** `video/8月1日(1).mp4` is 257 MB (4:51, 1920×1080,
30 fps) and no video analysis was performed in this session. It was reconstructed from three
sources, each marked in the tables below:

| Source | What it gives | Reliability |
|---|---|---|
| `CHANGELOG.md` entry **2026-08-01 — "Refreshed portable demo artifact"** and everything dated before it | The exact code and data state on the day the video is named for (`8月1日` = 1 August) | **CONFIRMED** — this is repository evidence, not recollection |
| `EchoWall-portable-demo-v1.zip` (61 files) — the artefact built for that release | The precise file list of the old product | **CONFIRMED** — inspected directly in this audit |
| `video/SCRIPT_RESEARCH_CLAUDE.md` §2 | A shot-by-shot breakdown of the 4:51 video, produced by densely frame-sampling it with ffmpeg | **HIGH** — an independent prior analysis with timecodes and on-screen text |

Anything not supported by one of these three is marked **INFERRED** or **UNKNOWN**.

### The decisive piece of evidence

The portable ZIP that defined the old release contains **61 files**. Listed in full during this
audit, it has **no** `app-community.js`, **no** `app-study.js`, **no**
`data/study-resource-manifest.js`, **no** `assets/study-files/`, **no**
`data/demo-seed-all-student-km.v1.js`, **no** `data/campus-building-hours.js`, **no**
`data/campus-map-config.js`, **no** `data/campus-building-registry.js`, **no**
`data/demo-display-counts.js`, **no** `services/community-service.js`, **no**
`services/comment-service.js`, **no** `services/permission-service.js`, **no**
`services/moderation-service.js`, **no** `services/admin-permission-service.js`, **no**
`app-admin-dashboard.js`, **no** `app-admin-management.js`, **no** `app-study-admin.js`, **no**
`app-campus-map.js`, **no** `style-study.css`, **no** `style-comments.css`, and only **16** building
photos.

That file list *is* the old product, and it is why the comparison below can be stated with
confidence rather than from memory.

---

## 2. THE DEVELOPMENT TIMELINE (from `CHANGELOG.md` section headers)

| Date | Stage | Relationship to the old video |
|---|---|---|
| 2026-07-13 | **Feature foundation** — building directory/profiles/walls, local auth, anonymous or named publishing, note position, 5 shapes, photo crop/fit, EN/BM/ZH structure, translate toggle, themes, Cloudinary + BISHENG adapters | Old |
| 2026-07-14 → 07-17 | Pustaka preview and functional-zone standard; eight-building map + wall-return acceptance; Kafeteria B/C previews; Seri Palas / Seri Temin / Seri Laka entries; Cafe Admin components | Old |
| 2026-07-20 | Community walls browse by major | Old |
| **2026-07-22** | **KMK assistant launcher and chat panel** (Ask Echo) | Old |
| 2026-07-27 | Building photo priority and accepted profile layout | Old |
| 2026-07-28 | Portable demo bundle (788 notes) | Old |
| 2026-07-29 | Reduced KMK community seed → 696 notes / 73-25-10 | Old |
| **2026-08-01** | **Refreshed portable demo artifact** — 696 notes, 17 walls, 25 deployed JS files, 16 building photos, local rule-based AI fallback verified | ⬅ **THE OLD VERSION BASELINE** |
| **2026-08-20** | Echo Map building card: opening hours + More details entry · **Building Detail: Purpose, Opening Hours, Special Notes, Events, Building Echoes** · **Echo Map multi-college switcher** · building-name alias localisation · mobile photo-first order · viewport-locked desktop layout | **NEW** |
| 2026-08-21 | Non-KMK per-college map calibration (11 colleges) · **COM-V2-001 → 008 (Community V2, complete)** · **STUDY-V2-FOUNDATION-001 → 006 (Study Notes V2)** · Homepage and Community polish 001–005 | **NEW** |
| 2026-08-22 | **STUDY-V2-007 Upload Study Material** · Study Notes V2 final browser acceptance · Community/Echo Map navigation polish | **NEW** |
| 2026-08-23 | **ADMIN-V2-001 → ADMIN-V2-FINAL-QA (11 stages, Admin V2 complete)** · post-type unification · display-count consistency · UI fixes · **Echo Library rename + full seed interactivity + the 67 All KM Students posts** | **NEW** |

**Everything from 2026-08-20 onward postdates the competition video.** That is roughly two-thirds
of the current feature surface, delivered across **28 documented, individually-reported stages** in
four days of concentrated work.

---

## 3. FULL FEATURE COMPARISON

Legend for the evidence column: **[ZIP]** = proven by the 61-file portable artefact ·
**[CL]** = proven by a dated `CHANGELOG.md` entry · **[VID]** = from the frame-sampled video
analysis in `SCRIPT_RESEARCH_CLAUDE.md` · **[INF]** = inferred.

| Dimension | OLD KMK version (≈ 1 Aug 2026) | CURRENT version (28 Aug 2026) | Evidence |
|---|---|---|---|
| **Product scope** | A place-based sticky-note wall with a campus map and a small community layer | A campus knowledge platform: place knowledge + layered communities with a Q&A workflow + an academic resource library + guided guidance + a governance layer | [ZIP][CL] |
| **Target users** | KMK students | All Malaysian matriculation students, with KMK as the fully built reference campus | [CL] |
| **Campus scope** | KMK only | KMK fully built; 11 further colleges configured with real GPS coordinates and a labelled "Framework Preview" (registries deliberately empty) | [ZIP] no `campus-map-config.js` / `campus-building-registry.js`; [CL] 2026-08-20/21 |
| **Echo Map** | Leaflet map, building footprints, map posting, building preview | Same, plus a **12-college switcher**, per-college calibrated centre/zoom, and a shared Campus Framework sidebar | [CL] 2026-08-20 |
| **Building information** | Name, description, photos, note count | Adds **Purpose**, a **structured weekly opening-hours table with a live open/closed status** (19 buildings, from the college's own facility source document), **Special Notes**, Current/Upcoming Events sections, and Building Echoes | [ZIP] no `campus-building-hours.js`; [CL] 2026-08-20 |
| **Localized building names** | Not present | `localizedAlias` rendered on Building Detail | [CL] 2026-08-20 |
| **Building photos** | 16 files | **18 files across 10 buildings**, 4 with multi-photo galleries and prev/next controls | [ZIP] 16 images listed |
| **Sticky notes** | 10 shapes, 4 categories, colours, rotation, photo crop scale + cover/contain, position | Unchanged — the contribution model was already mature | [ZIP][CL] |
| **Map direct posting** | Present | Present, and the composer now also carries **Post Type** | [VID][CL] |
| **Building Wall** | Present | Present, unchanged in concept | [ZIP][VID] |
| **Community structure** | KMK → Major browsing only | **Community V2**: Hub → All KM Students (global) / 12 College landings / 34 Jurusan walls | [ZIP] no `app-community.js`; [CL] COM-V2-002 |
| **All KM Students** | **Did not exist** | Global cross-college wall with **67** trilingual seeded posts (44 questions / 23 discussions) | [ZIP] no All-KM seed file; [CL] 2026-08-23 |
| **Post types** | Every post identical | **Discussion / Question**, with a formal cross-surface contract unified across Community, Building and Map | [CL] COM-V2-004, post-type unification |
| **Comments** | **Did not exist** | Comments on community posts, persisted, working on seed posts too | [ZIP] no `comment-service.js`; [CL] COM-V2-005 |
| **Replies** | **Did not exist** | One-level replies | [CL] COM-V2-005 |
| **Solved / Unanswered** | **Did not exist** | Question open/solved state, an "Unanswered" sort, author-or-moderator permission | [CL] COM-V2-006/007 |
| **Wall filters** | Category filter and sort | Adds a **Post Type** filter and the **Unanswered** sort | [CL] |
| **Academic resources** | **Did not exist at all** | **Echo Library**: 4 programmes → semesters → 33 subjects → 2,284 browsable records, **377 real files**, **230 reciprocal question↔scheme pairs**, search with relevance ranking, filters, year grouping, upload with SHA-256 duplicate detection and a review lifecycle | [ZIP] no study files whatsoever; [CL] STUDY-V2-* |
| **Ask Echo** | Present — local knowledge base, same three suggested chips | Present, materially unchanged | [VID][CL] 2026-07-22 |
| **Languages** | EN / BM / ZH | EN / BM / ZH, extended across every new surface — **704/705/705 keys, zero missing** | [ZIP] locale files present; measured this audit |
| **Themes** | Light / dark / system | Same, extended to the new Study and Admin surfaces (**241** dark-mode rules total) | [ZIP] |
| **Moderation** | A single prototype admin page gated by an email whitelist | **Admin V2**: 5 roles, 8 permissions, 4 scope types, a unified moderation queue with a status transition matrix, required-reason actions, a full audit trail, rule-based auto-assist, and a Role Manager — with **7 test suites and 472 passing assertions** | [ZIP] only `app-admin.js`; [CL] ADMIN-V2-001…FINAL-QA |
| **Automated tests** | Seed validators only | **13 suites, ≈799 assertions, all passing** | [ZIP]; `scripts/` directory |
| **Registration / profile** | Present (given real screen time in the old video) | Present, plus an education profile (17 institutions, 4 programmes) | [VID][CL] |
| **Homepage** | Hero + stats block reading **658 / 12 / 37** + a full college grid + Building Stories | Hero + stats block reading **1,017 / 12 / 53** + a single Community CTA + Echo Library promo + 6 Building Stories + Echo Map promo + "How it works" | [VID]; `app-router.js:453-456` |
| **Product positioning** | "A digital sticky-note wall for KMK" | "A place-anchored campus knowledge platform for matriculation students" | [ZIP][CL] |
| **Scalability posture** | Single campus | Multi-campus data structures with an explicitly labelled, honest framework state | [CL] |

---

## 4. WHAT DID **NOT** CHANGE (important for honesty)

Rule 4.8 asks for improvement, not reinvention. These carried over unchanged, and should not be
presented as new:

- The core sticky-note contribution model: 10 shapes, 10 colours, 4 categories, rotation, position,
  photo crop scale and cover/contain fit.
- Anonymous vs named publishing.
- The Leaflet map, its footprints, and map direct posting.
- The Building Wall concept.
- Ask Echo, including its three suggested questions and its local knowledge base.
- Three languages and three themes.
- The homepage hero and brand identity (the prior video analysis notes the hero is visually
  identical to the old video's).
- The 696-note demo seed bundle across 17 walls.
- Browser-local storage with no backend.
- The static, framework-free architecture.
- **Both homepage stat blocks are fabricated** — 658/12/37 then, 1,017/12/53 now. This is not an
  improvement; it is an unchanged risk.

---

## 5. TOP 10 MAJOR CHANGES SINCE THE KMK VERSION

1. **Echo Library exists** — an entire academic resource module that had no counterpart before:
   2,468 catalogued records, 2,284 browsable, **377 real files**, 230 question↔scheme pairs.
2. **All KM Students** — a cross-college community scope that did not exist, seeded with 67
   verbatim-transcribed trilingual posts.
3. **Comments and one-level replies** — posts became conversations.
4. **Discussion / Question post types with a Solved state** — the wall gained a workflow.
5. **Building Detail became a real information page** — Purpose, structured weekly hours with live
   open/closed status, Special Notes, Building Echoes.
6. **Community V2 information architecture** — Hub → Global / College / Jurusan replaced
   "KMK → Major" browsing.
7. **Admin V2** — a complete role/scope/permission, moderation-queue, audit-trail and
   auto-assist subsystem replaced a single email-whitelisted admin page.
8. **Multi-college framework** — a 12-college map switcher with real coordinates and an honest
   "Framework Preview" state.
9. **Academic upload with review** — students can submit material, content-hash duplicate detection
   blocks exact repeats, and only approved items appear.
10. **Engineering evidence** — from seed validators only to **13 automated suites and ≈799 passing
    assertions**, plus a per-stage report for every change.

## Compressed to TOP 5 MAJOR PRODUCT EVOLUTIONS

1. **From a note wall to a knowledge system** — Discussion/Question, comments, replies and Solved
   mean a question now has a lifecycle and produces a reusable answer.
2. **From social sharing to academic access** — Echo Library added a whole second reason to use the
   product, one that applies to every student rather than only the socially active ones.
3. **From one campus community to layered scopes** — All KM Students / College / Jurusan.
4. **From a place with a name to a place with knowledge** — buildings gained purpose, real hours,
   live open/closed status and rules.
5. **From a demo to something governable** — role-scoped moderation, an audit trail, a review
   workflow for contributed material, and a real test suite.

---

## 6. WHICH UPGRADES ACTUALLY CHANGED THE PRODUCT'S IDENTITY

Not every change is a repositioning. Three are.

### 6.1 Echo Library changed what EchoWall is *for*
Before, EchoWall was a place to leave and read experience. Its value depended on someone having
already written something you happened to need. Echo Library added a second, deterministic reason
to open the product: *I need the SM015 2023/2024 paper and its answer scheme.* That is a need every
matriculation student has on a schedule, not by chance. It moved EchoWall from a
"nice-to-have social wall" to a "tool with a recurring reason to return".

**Positioning consequence:** EchoWall can no longer be honestly described as "a digital
sticky-note wall". Any description that omits academic resource access now describes the old
product.

### 6.2 Question → Comment → Solved changed what a post *is*
Before, every post was a broadcast. Now a post can be a request, receive attributed answers, and be
marked resolved. That is the difference between a noticeboard and a knowledge base — and it is what
makes the "knowledge continuity between intakes" argument credible rather than aspirational.

**Positioning consequence:** the Impact argument changed from "students can leave messages for the
next intake" to "student questions can accumulate into a searchable, resolved answer base". Much
stronger, and now structurally supported.

### 6.3 Building Detail changed what a *place* is
Before, a building was a label on a map that owned a wall. Now it is an information page — purpose,
this week's actual opening hours, whether it is open right now, and the rules that apply — with the
student wall attached to it. That is what makes the Practical claim ("EchoWall answers questions
students actually have") defensible rather than rhetorical.

**Positioning consequence:** the map is no longer decoration around a wall; place knowledge is a
first-class capability in its own right.

### Changes that did *not* reposition the product
- **Admin V2** — enormous technical work, essential for a real deployment, but it does not change
  what a student experiences.
- **The multi-college switcher** — changes the *ambition* statement, not the delivered product,
  because 11 of 12 registries are empty.
- **Homepage and visual polish** — improves presentation, not identity.
- **Post-type unification and display-count consistency** — correctness and internal consistency
  work.

---

## 7. USING THIS FOR RULE 4.8 ("AT LEAST 30% IMPROVEMENT")

If EchoWall was previously entered and awarded, rule 4.8 requires evidence of ≥30% improvement.
The evidence available in the repository is unusually strong and unusually well dated:

| Evidence type | What is available |
|---|---|
| **Dated change log** | `CHANGELOG.md` — 28 individually documented stages between 2026-08-20 and 2026-08-23, each with what changed, what was verified, and rollback instructions |
| **Per-stage reports** | `reports/` — 13 formal reports (ADMIN-V2-001…008 + FINAL-QA, Community/Map nav polish, Community seed interaction + Echo Library, post-type unification, homepage polish), plus `community v2/reports/` and `study v2/reports/` |
| **Before/after checkpoints** | `checkpoints/`, `community v2/checkpoints/`, `study v2/checkpoints/` — file-level before/after snapshots for the major stages |
| **Artefact comparison** | The old release ZIP (61 files) versus the current tree — the single cleanest proof, since entire modules are simply absent from the old artefact |
| **Automated tests** | From seed validators only → 13 suites, ≈799 assertions, all passing |
| **New data assets** | 377 real academic files + a 2,468-record manifest; 67 new community posts; 19 structured building schedules; 2 new building photos — none of which existed in the old artefact |
| **Code volume** | Old deployed artefact: 25 JavaScript files. Current: 48 scripts loaded by `index.html`, ~14,900 lines of application JavaScript |

**A defensible, conservative framing:** the improvement is not incremental. Two of the current
product's five user-facing modules (Echo Library, Community V2) and the entire governance layer
(Admin V2) did not exist in the version that was previously presented, and this is provable by the
file list of the old release artefact.

**Do not overstate it either.** The old version already had the map, map posting, building walls,
the sticky-note model, Ask Echo, three languages, three themes, registration and the 696-note seed.
The honest statement is *"the previous version's foundation was retained and three major new
capability areas were built on top of it"*, not *"the product was rebuilt"*.

---

## 8. RISKS SPECIFIC TO THE OLD-vs-NEW COMPARISON

1. **The old video is still the only recorded demonstration of the product.** It shows the old
   product. Any current material that reuses old footage will show a product that no longer matches
   the description — in particular, it shows the old homepage stats (658/12/37) and has no Echo
   Library, no All KM Students, and no comments.
2. **The published artefact is the old one** (see the audit document, §8). The GitHub Pages workflow
   unzips `EchoWall-portable-demo-v1.zip` — the ~1 August build — and is configured for a `master`
   branch while the repository is on `main`. **The current product has never been published.**
   Nobody may claim the improved version is live.
3. **Both versions display fabricated statistics.** Presenting "1,017 notes" as growth from
   "658 notes" would be presenting one hardcoded constant as improvement over another.
4. **"12 colleges" is more dangerous now than before.** The old version made no multi-college
   claim. The switcher makes one visually, while 11 of the 12 have no building data at all. If this
   is mentioned, the words "framework" or "designed to support" must appear in the same sentence.
5. **The recording manual and the 2m15s script are both current-version documents** (dated
   2026-07-30 and later, and both explicitly audited against the current code). They are not old
   material and should not be treated as describing the old product.
