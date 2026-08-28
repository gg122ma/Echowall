# REPORT — STUDY-V2-004: Resource List + Year Grouping

Date: 2026-08-21

## Scope

Subject page (`#/study/:jurusan/sem/:semester/:subjectCode`) now renders real resources from the
real generated manifest, category-tabbed, PSPM/Pre-Pra-PSPM year-grouped, with Question↔Answer
Scheme pairs shown explicitly linked. Resource Detail page (`#/study/resource/:resourceId`) now
shows real metadata with an honestly-disabled "Open file" state. Browse Hierarchy (Jurusan/
Semester/Subject registry), Community, pointer-glow, Echo Map, Building, Admin, Auth: untouched.

## Required fields

- **Subject resources visible**: PASS — verified against real manifest data for SM015 (Sains,
  Semester 1, 138 publishable resources), AA015 and AP015 (Perakaunan/Accountancy, PSPM +
  paired schemes), and a real Engineering subject (Kejuruteraan Awam, EA015). No subject renders
  "coming soon" text when it has ≥1 publishable resource.
- **Real manifest used**: PASS — all counts/titles/years/sources come from the actual 2468-item
  `data/study-resource-manifest.js` via `StudyResourceService.getResourcesForSubjectInContext()`;
  nothing hardcoded. Verified in real browser: SM015 header shows "138 份资料" matching the
  service's own count for that subject.
- **PSPM year grouping**: PASS — newest→oldest, using existing `yearStart`/`yearEnd`/
  `examSessionLabel`, never re-derived from titles. Verified in real browser (SM015 PSPM section:
  2023/2024 before 2022/2023) and in the direct-call test suite across SM015/AA015/AP015/EA015.
- **Question/Scheme pairing**: PASS — verified against 3+ real pairs pulled directly from the
  manifest (including SM015 `study_1e9ead2cfebc2a86f06e` ↔ `study_9f4fc2eecb79cc241d6c`, and
  AA015 `study_172464f41f3375d284a4` ↔ `study_69179490e40ddc3fc1b8`). Real browser: SM015
  Question row shows "有对应答案方案 →" and its own Resource Detail page shows "相关答案方案:
  KMKJ SM015 22_23 ANSWER SCHEME →" resolved via `relatedResourceId`.
- **Paired Scheme duplicate rendering**: Absent — a scheme already shown as a Question's pair is
  excluded from the flat "Other Resources" bucket in the "All" composed view (verified via direct
  test: paired scheme titles do not appear twice). Orphan (unpaired) schemes still render normally
  in "Other Resources"/the Answer Scheme tab.
- **Source College shown as metadata only**: PASS — rendered inline per-resource as
  "来源: KMKJ" / "Source: KMK" style text on both the row and the Detail page, never as a
  section heading or grouping key.
- **No College grouping**: PASS — `getResourceCategory()`/`getResourcesForSubjectInContext()`
  group only by resourceType/resourceSubtype/year; `sourceCollege` is never used as a group key
  anywhere in `app-study.js`.
- **Manual review hidden**: PASS — `getResourcesForSubjectInContext()` (default) and
  `getResourcesForSubject()` both route through `getPublishableResources()`
  (`reviewStatus === "auto_parsed"`), confirmed against a real `manual_review` item pulled from
  the manifest, which does not appear in its subject's list and returns not-found on direct
  `#/study/resource/:id` access.
- **Duplicates hidden**: PASS — confirmed against a real `isDuplicate: true` manifest item, same
  behavior as manual_review (absent from list, not-found on direct link).
- **Resource Detail metadata**: PASS — subject, semester, type, subtype-derived category, year,
  source, verification badge, description (when present), and related Question/Scheme link all
  render from real fields. Verified in real browser for a real PSPM Question resource.
  `sourceRelativePath`/`sourceBatch`/`fileId`/any local filesystem path are never rendered
  (confirmed by reading the render function — only the allow-listed field set is interpolated).
- **Actual file/PDF opening**: Not connected yet (by design — out of scope for this stage,
  explicitly deferred to STUDY-V2-006, since the manifest is metadata-only with no served
  `fileUrl`). UI shows a disabled "打开文件"/"Open file" button plus an explanatory note ("File/
  PDF opening will be connected in a later Study Notes stage. The resource's metadata is already
  accurate.") — verified in real browser, correctly localized in Chinese.
- **Desktop**: Verified — real Safari window at ~1460×960, SM015 Subject page and a real
  Resource Detail page both screenshotted and visually inspected.
- **Mobile**: Verified — real Safari window resized to ~420×900; tabs wrap, resource rows stack
  vertically, header/count remain visible, no horizontal overflow observed.
- **Light Mode**: Not verified — the live browser session had Dark theme already active
  (persisted in the user's own localStorage from an earlier session) and the theme toggle
  requires a click; no Accessibility permission is granted for UI automation and Safari's
  "Allow JavaScript from Apple Events" is off, so no in-page click or script injection was
  possible. Only URL navigation + screenshot was available this stage.
- **Dark Mode**: Verified — see Desktop/Mobile screenshots above; all new UI (tabs, year-group
  headings, resource rows, badges, detail grid, disabled file button) renders correctly against
  the dark theme tokens.
- **EN/BM/ZH**: Partially verified — ZH (中文) confirmed in real browser (all new UI text — tabs,
  category labels, "来源"/"未核实"/"相关答案方案"/the file-not-connected note — renders as real
  Chinese translations, not raw keys or English fallback). EN and BM (Bahasa Melayu) were not
  toggled in the real browser this stage (same click-automation limitation as Light Mode); their
  translation completeness was instead confirmed by direct inspection of
  `i18n/locales/en.js`/`ms.js` (all new keys present with real, non-placeholder translations) and
  by the direct-call test suite rendering with each locale loaded.

## Testing performed

1. **Direct-call test suite** (`/private/tmp/.../scratchpad/test-study-v2-004.js`), 36/36 passing,
   loading the real, unmodified `app-data.js`, `data/study-subjects.js`,
   `data/study-resource-manifest.js`, `services/study-resource-service.js`, `app-router.js`,
   `app-study.js` into one Node `vm` context — covers all data-correctness requirements above
   (pairing, year grouping, publishable-only filtering, subject/semester/jurusan context
   verification, category tabs, empty state, no-leak of internal fields) against real manifest
   data for SM015, AA015, AP015, EA015, plus a synthetic zero-resource check.
2. **`node --check`** on all 6 touched files: clean.
3. **CSS brace-balance check** on `style-study.css`: 59/59 balanced.
4. **Real browser** (Safari, dedicated new window, not the user's own tabs): navigated directly to
   `#/study/sains/sem/1/SM015` and to a real Question resource's `#/study/resource/:id`;
   screenshots taken and visually inspected at desktop and mobile widths, in Dark theme, in
   Chinese — see Testing table above for exact coverage/gaps.
5. Re-ran the pre-existing `test-study-v2-003.js` suite: 3 failures, all expected and diagnosed as
   stale assertions from before this stage's intentional UI changes (old `<strong>{count}</strong>`
   markup no longer used; an assertion that no "KMK" text should ever appear, which is now
   correctly false since `sourceCollege` is legitimately shown as per-resource metadata) — not
   regressions in actual behavior.

## A real bug found and fixed this stage

Initial pagination implementation budgeted by "number of year-groups shown," not "number of rows
shown." On real SM015 data (many PSPM/Pre-Pra-PSPM sets across the same year), this rendered 113
of 138 rows on first paint — defeating the stage's explicit performance requirement. Fixed to
budget by cumulative row count instead (include full year-groups until the row budget is spent,
always showing at least one group). Re-verified: SM015 initial render dropped to 50 rows. Noted as
an accepted simplification: the "All" view composes ~2–3 independently-budgeted sections (year-
grouped PSPM, year-grouped Pre-Pra-PSPM, flat Other) rather than sharing one global budget — still
a large, real improvement over the original bug, not a fully unified budget.

## Requested / Completed / Not Completed / Future Work

- **Requested**: Resource List + Year Grouping for the Subject page; Question/Scheme pairing UI;
  category tabs; real Resource Detail metadata with an honest non-fake file-open state;
  performance-safe pagination; full i18n; checkpoint + report + memory updates.
- **Completed**: all of the above (see field-by-field PASS list).
- **Not Completed**: Light Mode / EN / BM real-browser toggle verification (tooling limitation,
  not a code gap — see "Light Mode" and "EN/BM/ZH" rows above).
- **Future Work** (explicitly out of scope this stage, not started): Search/Filter
  (STUDY-V2-005), actual file/PDF serving (STUDY-V2-006).
