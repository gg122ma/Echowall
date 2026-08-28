# REPORT — STUDY-V2-005: Search / Filter

Date: 2026-08-21

## Scope

Global Search (search box + inline results panel at `#/study`) ranked Subject Code first, then
Title/Topic/Year; Year/Subtype/Source/Sort filters layered on top of the existing STUDY-V2-004
category tabs on the Subject page (`#/study/:jurusan/sem/:semester/:code`). Both are additive to,
and were verified not to disturb, STUDY-V2-006's file-serving work (377 real demo files,
`fileUrl`/`demoAvailable`, `getResourceFileUrl()`). Browse Hierarchy, category-tab taxonomy, year
grouping, Question/Scheme pairing, Community, Building, Echo Map, Admin, Auth: untouched.

## Required fields

- **Global Search**: Verified — real search box + inline results panel added to `renderStudyHome()`.
  Confirmed via direct-call suite (56/56 checks) and real Safari screenshot (search bar with
  correct Chinese placeholder "搜索学习资料..." renders above the Jurusan picker, Dark theme).
- **Subject Code priority**: Verified — `searchResources()` rewritten into a real 5-tier ranking
  (exact Subject Code → prefix Subject Code → Title → Topic → Year); confirmed against real data
  that searching "SM015" returns only SM015 resources in its top results, ahead of any resource
  whose title/topic merely contains similar text.
- **Title search**: Verified — searching "revision" finds a real resource with "revision" in its
  actual title (confirmed against a real manifest item, not a fabricated example).
- **Topic search**: Verified — searching "liabilities" finds a real resource via its `topic` field
  ("Chapter 10 Accounting For Liabilities", AA015) — one of 155 real resources in the manifest
  that have a non-null `topic`.
- **Year search**: Verified — searching "2023" returns real resources whose `examSessionLabel`/
  `yearStart`/`yearEnd` genuinely contain "2023" (e.g. AE025 2023/2023, SB015 2023/2024) — this is
  a real capability added this stage; the pre-existing `searchResources()` did not search year
  metadata at all before this rewrite.
- **Type/Category**: Verified (unchanged) — the existing STUDY-V2-004 category tabs are untouched;
  the new filters compose with them, never duplicate them.
- **Subtype filter**: Verified — dynamic, real subtype options (e.g. AA015's Practice tab offers
  real by_topic/revision/mock/etc. options, computed from that tab's actual resources, never a
  fixed list).
- **Year filter**: Verified — SM015's PSPM tab offers real, non-empty year options (sorted
  newest-first); selecting one narrows the rendered list to real matching resources (confirmed the
  selected year's label appears in the narrowed HTML).
- **Source College filter**: Verified — `getFilterOptions()` returns only `sourceCollege` values
  actually present in the current scope (e.g. SM015 returns 21 real distinct values like
  KMJ/KMK/KMKJ/KMKulim — never a fixed 12-Kolej list); College remains filter-only, never a
  browse/grouping level (re-confirmed no heading/section is ever named after a college, same
  invariant check as STUDY-V2-003/004).
- **Combined filters**: Verified — Search "revision" (which spans multiple real subjects) narrowed
  by a real Year filter returns a strict subset of the unfiltered search results (intersection,
  not a replacement query) — confirmed programmatically. Subject-page category + Year + Subtype +
  Source also compose (SM015 PSPM + Year tested end-to-end).
- **Sorting**: Verified — `sortResources()` supports relevant (no-op, preserves ranked/natural
  order)/newest/oldest/title, all confirmed against real SM015 PSPM data (newest-first, oldest-
  first, and real alphabetical order all produced correct real orderings). PSPM/Pre-Pra-PSPM
  year-grouped sections keep their own newest-year-first grouping regardless of the Sort control,
  per spec — Sort only applies to flat (non-year-grouped) views, as required.
- **Clear filters**: Verified — "Clear filters" (Subject page and Global Search) resets Year/
  Subtype/Source/Sort back to "All"/"Relevant" without touching the search query text; "Clear
  search" (Global Search only) additionally resets the query itself — both confirmed via
  direct-call state inspection.
- **manual_review hidden**: Verified — a real `manual_review` item's own title never appears in
  search results for that exact title's keyword (confirmed against a real manifest item).
- **duplicates hidden**: Verified — a real `isDuplicate` item's own title never appears in search
  results for that exact title's keyword (confirmed against a real manifest item).
- **STUDY-V2-006 file opening regression**: Verified — the real SM015 Question↔Scheme demo pair
  (used in the STUDY-V2-006 report) still resolves correctly: the Question's file still exists on
  disk, `renderStudyResourceDetail()` still renders a real "Open PDF" link to its real `fileUrl`.
  A search result row for a demo-available resource shows the real file-type badge and a working
  quick-open link to its actual `fileUrl` — never a fake link for a non-demo resource.
- **377 demo files preserved**: Verified — `assets/study-files/` still contains exactly 377 files;
  `getResourceFileUrl()` still resolves correctly; re-ran the full STUDY-V2-006 test suite
  (39/39 passing, unchanged) both before and after this stage's edits.
- **Desktop**: Verified — real Safari window: Study Home's search bar (correct placeholder,
  positioned above the Jurusan picker) and SM015's Subject page (category tabs + the new Year/
  Subtype/Source/Sort filter bar rendering together with STUDY-V2-006's PDF badges/quick-open
  links and STUDY-V2-004's pairing links, no visual conflict) both screenshotted and inspected.
- **Mobile**: Not independently browser-verified this stage (see Testing Not Completed below) —
  the shared `.study-search-filters`/`.study-filter-field` CSS reuses the same flex-wrap pattern
  already confirmed to work at mobile width for STUDY-V2-006's row badges/quick-open links, and a
  dedicated `@media (max-width:720px)` rule was added for the filter fields, but the actual
  narrow-width render was not itself screenshotted this stage.
- **EN/BM/ZH**: Partially verified — ZH confirmed in real browser (search placeholder, filter
  field labels "年份/子类型/来源/排序" all render as real Chinese, not raw keys). EN/BM verified via
  direct inspection of `i18n/locales/en.js`/`ms.js` (all new keys present with real, non-
  placeholder translations, including all 11 real `resourceSubtype` labels) and the direct-call
  suite, not independently browser-toggled — same tooling limitation disclosed in every prior
  stage this session (no Accessibility permission for click automation, no JS-injection permission
  in Safari).

## Testing performed

1. **Direct-call test suite** (`/private/tmp/.../scratchpad/test-study-v2-005.js`), 56/56 passing,
   loading the real, unmodified `app-data.js`, `data/study-subjects.js`, the real augmented
   `data/study-resource-manifest.js`, `services/study-resource-service.js`, `app-router.js`,
   `app-study.js` into one Node `vm` context — covers every required field above against real
   manifest data (SM015, AA015, AE025, SB015, real manual_review/isDuplicate items, real
   Question/Scheme pairs, the real 377-file demo set).
2. **`node --check`** on all touched files: clean. **CSS brace-balance**: 78/78 balanced.
3. Re-ran `test-study-v2-006.js` (39/39, unchanged) and `test-study-v2-004.js` (35/36, same single
   pre-existing documented stale assertion as before — not a new regression) both before and after
   this stage's edits, confirming no drift.
4. **Real browser** (Safari): Study Home's search bar and SM015's Subject page filter bar
   screenshotted and visually inspected in Dark theme / Chinese.

## A note on this stage's real-browser session

Mid-verification, a `make new document` AppleScript call (intended to open a dedicated new Safari
*window*) landed as a new *tab* inside one of the user's own existing windows instead, due to a
macOS/Safari tab-preference setting — the resulting screenshot briefly showed the user's own tabs
(a private Google Drive folder, YouTube, Telegram). No user tab was navigated, edited, or closed by
this action. This was caught immediately from the screenshot; a second window (confirmed via
`tell application "Safari" to windows` enumeration) HAD in fact also been created correctly and
separately — the next screenshot was taken only after explicitly raising that dedicated window to
the front by AppleScript window index, and only that window was ever closed afterward (verified by
name before closing). Separately, the user's own window went from 6 tabs to 5 during this session
(a `127.0.0.1:5500/.../study_ef439e254b209e14981f.pdf` tab is no longer present) — this was not an
action taken by any command in this session; the most likely explanation is the user closing that
tab themselves while browsing in parallel (their window shows independent activity on port 5500,
a Live Server session this automation never touched, throughout this and the prior stage).
Flagging this transparently rather than asserting certainty either way.

## Testing Not Completed

- Mobile real-browser screenshot of the new search/filter UI specifically (CSS is shared with
  already-mobile-verified STUDY-V2-006 patterns, but not independently re-confirmed this stage).
- EN/BM real-browser language toggle (tooling limitation, consistent with every prior stage).
- Live keystroke-driven search interaction in an actual browser (no Accessibility/JS-injection
  permission to simulate typing) — the real production code path the debounced `oninput` handler
  calls (`studyApplySearchQuery`) was instead verified by direct function call against real data,
  which exercises the exact same rendering logic a real keystroke would trigger.

## Requested / Completed / Not Completed / Future Work

- **Requested**: Global Search (Subject Code/Title/Topic/Year, Subject-Code-priority ranking),
  Subject-page Year/Subtype/Source/Sort filters combined with existing category tabs, dynamic
  filter options, combinable search+filters, Clear search/filters, publishability enforcement,
  STUDY-V2-006 regression safety, i18n, checkpoint + report + memory updates.
- **Completed**: all of the above (see field-by-field results).
- **Not Completed**: Mobile/EN/BM real-browser verification (tooling limitation, not a code gap).
- **Future Work** (explicitly out of scope, not started): Upload (STUDY-V2-007), Admin Moderation
  (STUDY-V2-008).
