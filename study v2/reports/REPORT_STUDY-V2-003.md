# REPORT_STUDY-V2-003

**Task ID:** STUDY-V2-003 — Browse Hierarchy (Jurusan → Semester → Subject Code)
**Status:** PASS
**Spec:** `study note/02_EchoWall_Study_Notes_V2_详细架构规格书.pdf` (EW-STUDY-V2-001)
**Checkpoint Path:** `study v2/checkpoints/STUDY-V2-003/`

## Pre-change investigation (re-read the real source, not assumed from the prior report)

Confirmed `renderStudyJurusan(container, jurusanId, semesterFilter)` in `app-study.js` was a
single function serving both `#/study/:jurusan` and `#/study/:jurusan/sem/:semester` — when
`semesterFilter` was `null`, it rendered **both** semesters' full subject lists on one page. This
is exactly the "先显示 Semester，不要直接展开所有 Subject" violation this stage fixes. Also
confirmed `app-router.js`'s `getRoute()` mapped both URL shapes to the same `page: "study-jurusan"`
value, and that `data/study-subjects.js`/`data/study-resource-manifest.js` were unchanged since
`STUDY-V2-FOUNDATION-001` (re-verified subject count and manifest header stats).

## Completed

- **Real 3-level Browse Hierarchy**, each level a distinct route + distinct render function:
  - `#/study` → `renderStudyHome` (Jurusan picker, unchanged from `STUDY-V2-FOUNDATION-001`)
  - `#/study/:jurusan` → `renderStudyJurusan` (**new**: Semester picker only — no subjects shown)
  - `#/study/:jurusan/sem/:semester` → `renderStudySemester` (**new**: real Subject Code list)
  - `#/study/:jurusan/sem/:semester/:code` → `renderStudySubjectShell` (unchanged scope, fixed
    back-link)
- **Back-navigation chain fixed**: Subject → Semester → Jurusan → Study Notes, exactly as
  requested (previously Subject linked straight back to Jurusan, skipping Semester).
- **Breadcrumb clarity**: Semester and Subject pages now show a text breadcrumb eyebrow
  ("Study Notes · Sains · Semester 1") in addition to the back button.
- **Semester validation**: `#/study/sains/sem/3` (or any semester other than 1/2) renders a real
  not-found shell, not a crash or blank page.
- **Real, non-fabricated resource-type badges**: subject list items show a "Notes · Papers ·
  Practice"-style tag line computed live from `StudyResourceService.getResourceTypesForSubject()`
  — omitted entirely when a subject has zero publishable resources (never invented).
- **Real empty states**: `sains_komputer` (0 registered subjects in either semester) renders the
  actual "No subjects listed" empty state at both `#/study/sains_komputer/sem/1` and `/sem/2` —
  no fake subjects generated to make the UI look fuller.
- All counts (subject count per semester, resource count per subject/semester) read live from
  `StudyResourceService`, nothing hardcoded.

## Modified Files

- `services/study-resource-service.js` → added `getResourceCountForJurusanSemester()` and
  `getResourceTypesForSubject()` (additive, no existing function changed).
- `app-router.js` → split `#/study/:jurusan` and `#/study/:jurusan/sem/:semester` into distinct
  `study-jurusan`/`study-semester` pages (route table, titles, dispatch — 3 hunks).
- `app-study.js` → split the combined renderer into `renderStudyJurusan()` (Semester picker) +
  new `renderStudySemester()` (Subject list); fixed back-link targets; added breadcrumbs and
  resource-type badges.
- `style-study.css` → new `.study-semester-grid`/`.study-semester-card`/`.study-type-badges` rules.
- `i18n/locales/en.js`/`ms.js`/`zh.js` → new keys for the Semester picker and 7 resourceType
  display labels.

## Files Explicitly Not Touched

`data/study-subjects.js`, `data/study-resource-manifest.js` (data unchanged this stage),
`index.html` (no new files), `app-community.js`, `app-wall.js` (Community V2, pointer glow, All
KM Students, College cards), `echomap.js`, `app-campus-*.js` (Echo Map, Building Stories/Detail/
Wall), `app-admin.js`, Auth services, `style-core.css`/`style-wall.css`/`style-admin.css`/
`style-comments.css`.

## Testing

No browser-automation tool is available in this environment (consistent with every prior stage
this session). Verification used the same direct-function-call method: real Node `vm` execution
of the actual, unmodified `app-data.js`/`data/study-subjects.js`/`data/study-resource-manifest.js`/
`services/study-resource-service.js`/`app-router.js`/`app-study.js` source, real route parsing,
real rendering, real counts read from the actual 2468-item manifest.

- `node --check` on every touched file: **Verified**, all pass. CSS brace balance: **Verified**.
- **31 end-to-end checks, all pass** (`test-study-v2-003.js`, session scratchpad):
  - Route split: `#/study/:jurusan` and `#/study/:jurusan/sem/:semester` are confirmed distinct
    page names (`study-jurusan` vs `study-semester`).
  - Jurusan page shows the two Semester picker links with real per-semester subject+resource
    counts, and does **not** list or route to any subject directly.
  - Semester 1 (sains) shows all 9 real subject codes (SM015/SP015/SC015/SB015/SK015/DP014/
    DB014/DC014/DK014); Semester 2 (sains) shows all 10 (SM025/SP025/SC025/SB025/SK025/DP024/
    DB024/DC024/DK024/DM025) — cross-checked against `data/study-subjects.js` directly.
  - Perakaunan Semester 1 shows AA015/AE015/AM015/AP015; Kejuruteraan Semester 1 shows EB015/
    EE015; Kejuruteraan Semester 2 shows EA025/EB025/EE025/EM025.
  - Sains Komputer (0 real subjects) renders a genuine empty state at both semesters — not a
    not-found page, not fabricated subjects.
  - Subject page shows the exact real resource count (cross-checked directly against
    `StudyResourceService.getResourceCountForSubject('AA015')`).
  - Back-link chain verified structurally: Subject page's back button targets the Semester hash;
    Semester page's back button targets the Jurusan hash; Jurusan page's back button targets
    `#/study`.
  - Invalid routes (`#/study/not-real`, `#/study/sains/sem/3`, `#/study/sains/sem/1/INVALID`) all
    parse without throwing at the router level, and all render a real not-found shell with a
    working way back — never a crash or blank page.
  - No "KMK"/"Kolej"/"college" text anywhere across all 4 hierarchy levels.
  - Regression: Homepage section order (Community → Study Notes → Building Stories) and the
    Community card's pointer-glow layers are unchanged.
- **Full project regression suite rerun** (Community pointer-glow isolation, Homepage-card
  markup, College Landing, Homepage section order — all from prior stages): **all still pass**.
  One stage-specific "app-router.js byte-identical since POLISH-004" assertion from an earlier
  checkpoint's own test now correctly fails, since this stage legitimately added routes to that
  shared file — not a regression, an expected, previously-flagged consequence of Study Notes and
  Community sharing `app-router.js`.

### Acceptance checklist (request section 20)

```
Jurusan browse: Verified
Semester browse: Verified
Subject Code browse: Verified
All 4 Jurusan: Verified (sains, perakaunan, sains_komputer, kejuruteraan all tested)
Semester 1: Verified (sains, perakaunan, kejuruteraan real subjects confirmed)
Semester 2: Verified (sains, kejuruteraan real subjects confirmed)
Subject data from registry: Verified (every code cross-checked against data/study-subjects.js)
No College grouping: Verified (no KMK/Kolej/college text anywhere; sourceCollege never used as
  a browse/query dimension in this stage's code)
Invalid routes: Verified (#/study/not-real, sem/3, invalid subject code — all real not-found
  shells, no crash, no white screen)

Desktop: Not verified — no browser available in this environment
Mobile: Not verified — no browser available in this environment
Light: Not verified — no browser available in this environment
Dark: Not verified — no browser available in this environment
EN: Verified at the data level (all new keys present, node --check passes) — not verified as
  actually rendered in a browser
BM: Verified at the data level — not verified as actually rendered in a browser
ZH: Verified at the data level — not verified as actually rendered in a browser
```

## Remaining Issues

- No real-browser visual verification (Desktop/Mobile/Light/Dark, actual rendered text in all 3
  languages) — environment limitation, consistent with every prior stage this session.
- The Subject page (`#/study/:jurusan/sem/:semester/:subjectCode`) is still an intentional shell
  (resource count + "coming soon" message) — full resource listing is explicitly `STUDY-V2-004`,
  not started.
- The resource-type badge line uses raw `resourceType` values (notes/paper/answer_scheme/
  practice/lab/summary/other) mapped to display labels — it does not yet reflect
  `resourceSubtype` granularity (e.g. distinguishing PSPM from Pre-PSPM); that finer detail is
  more naturally part of `STUDY-V2-004`'s resource list/filtering work.

## Next Step (proposed only, not started, per explicit instruction not to auto-continue)

`STUDY-V2-004` — Resource List + Year Grouping (turn the Subject shell into a real resource list,
with PSPM Question/Scheme pairs surfaced using the `relatedResourceId` links already built in
`STUDY-V2-FOUNDATION-001`).

Stopping here per the request — for the product owner to check the actual Browse UI/UX first.
