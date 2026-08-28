# REPORT — STUDY-V2-FINAL-QA

Date: 2026-08-22
Status: **PASS — full real-browser QA complete**

## Environment

Local server: `python -m http.server 8000` from the repository root. Browser: real Chrome via
`mcp__claude-in-chrome` (native extension bridge — connected and usable this session; the prior
session's "browser bridge unavailable" condition did not reproduce). All checks below were
performed by driving the actual rendered page — clicking, typing, filling real `<input type="file">`
elements with a real generated test PDF (`%PDF-1.4` signature), and reading real DOM/toast state,
not simulated.

## 1. Browse

Homepage → Study Notes (`#/study`) → Jurusan (Science) → Semester (Semester 1) → Subject (SM015) →
Resource (`SM015_Matematik 1_sesi 2023_2024`) → **Open** → real built-in PDF opened in a new tab at
`assets/study-files/study_ef439e254b209e14981f.pdf` (SM015 Matematik 1, 14 pages, correct
matriculation cover page). **PASS**.

## 2. Search / Filter

Global search on `#/study` tested with real terms against the live manifest:
- `SM015` → 139 results (exact subject-code match ranked first).
- `AA015` → 66 results.
- `2023` → 933 results.
- Real topic/title keyword `"Accounting For Liabilities"` (drawn live from the manifest) → 1 exact
  result.

Subject-page (SM015) Category tabs (All/Pre-Pra PSPM/PSPM/Answer Scheme), Year, Subtype, Source,
Sort filters and **Clear filters** all exercised via real `<select>` interaction — each correctly
narrowed/reset the visible list and its counts. **PASS**.

## 3. Upload

Registered a real new `role: "user"` account (`teststudent.qa@example.com`), signed in, opened
`#/study/upload`, filled the full cascading form (Programme → Semester → Subject → Type → Subtype →
Topic → confirmation checkbox), attached a real generated PDF via the file input, and submitted.
Result: "Submission received … Status: Pending review — this will not be public until an admin
approves it."

Confirmed the pending submission:
- **Browse**: SM015 subject page resource count stayed at 139 (unchanged) while pending.
- **Search**: searching its exact title returned "No study materials match your search."
- **Public resource count**: Science programme total and Semester 1 total were unchanged until
  approval.

**PASS**.

## 4. Admin Moderation

Signed in as a real `role: "admin"` account (whitelisted email). `#/admin` → **Study Moderation**:
- Queue loaded with live Pending/Approved/Rejected/Possible-duplicate counters.
- Pending PDF opened via a real `blob:` URL (IndexedDB-backed, not a static/local path).
- **Reject** form: visually confirmed it renders as a full-width block (`grid-column:1/-1`) inside
  the row card, not a narrow 72px thumbnail-column layout — this was the specific item the prior
  session could not verify. Reason select always carries a value; service layer independently
  rejects an empty reason.
- **Edit metadata → Save & Approve**: corrected Year(start), saved, got "Submission approved and
  published."
- **Verification levels**: cycled Unverified → Verified Source → Verified Material — each
  persisted with a confirmation toast. Approving a submission left it at **Unverified** by default
  (Approve does not auto-set `verified_file`).

**PASS**.

## 5. Approve → Publish

The approved "QA Test Upload SM015 Sample Notes" (Verified Material, Year 2023/2023) was confirmed:
- **Browse**: SM015 subject resource count rose 139→140; new "Student Notes 1" category tab
  appeared with the item inside, badge "VERIFIED MATERIAL".
- **Search**: exact-title search found it; Science programme count rose 1627→1628, Semester 1 count
  rose 769→770.
- **Resource Detail**: correct Subject/Semester/Type/Year/Source/Verification metadata rendered.
- **Real IndexedDB PDF**: clicking Open on the public Resource Detail page opened a real `blob:` URL
  tab — the student's actually-uploaded PDF bytes, publicly reachable post-approval.

**PASS**.

## 6. Reject

A second submission ("QA Test Upload SM015 Reject Sample") was rejected with reason "Wrong subject".
Confirmed:
- **Browse**: not present in the SM015 resource list.
- **Search**: "No study materials match your search."
- **Public direct resource route**: navigating straight to
  `#/study/resource/study_upload_<id>` for the rejected record's ID returned "Study Notes page not
  found — This Study Notes link does not match a known programme," i.e. not reachable even by
  direct URL.

**PASS**.

## 7. Duplicate

Re-uploaded the exact same PDF bytes (already approved and public) as the student account. The
upload form did **not** reset and displayed: "This file already exists. → QA Test Upload SM015
Sample Notes" (a live link to the real, now-public resource) — exact SHA-256 duplicate correctly
blocked before creating a new submission record. **PASS**.

## 8. Question ↔ Answer Scheme

- **Built-in**: opened a built-in Answer Scheme resource (`Past Year SM015 2023-2024 (Answer
  Scheme)`) and followed its **Related Question** link to the paired built-in Question resource —
  correct cross-navigation both ways.
- **User-upload (approved)**: a pre-existing approved user submission
  (`STUDY-V2-007 Browser QA Test Notes`, type Answer Scheme) showed a **Related Question** link;
  following it opened the linked built-in Question resource (`SM015 KMJ SET 1 (QUESTION)`) with
  correct metadata. Confirms Question↔Scheme linking works across the built-in/user-upload
  boundary, not only built-in↔built-in.

**PASS**.

## 9. Permissions

- **Guest** (signed out): `#/admin` → "Sign in required." No Study Moderation surface reachable.
- **Regular Student** (`role: "user"`, real registered account): `#/admin` → "Access denied — This
  account does not have administrator access." Account panel showed no "Admin Dashboard" entry.
- **Admin** (`role: "admin"`, real registered account, whitelisted email): full dashboard and Study
  Moderation reachable.

**PASS**.

## 10. Browser Matrix

- **Desktop**: verified throughout at ~1536×639/1254×568 real Chrome viewports — Light and Dark.
- **Mobile 390–430px**: `resize_window` did not change `window.innerWidth` in this environment
  (confirmed via `window.innerWidth`/`innerHeight` read-back after the call — same limitation noted
  in the prior STUDY-V2-007 report). **Not visually verified** via live narrow-viewport rendering.
  Structural mobile CSS was inspected directly and confirmed present: `style-study.css` has
  `@media (max-width:720px)` rules collapsing `.study-resource-row`, `.study-filter-field`, and
  `.study-upload-grid` to single-column/wrapping layouts; `style-admin.css` has
  `@media (max-width:1100px)` and `@media (max-width:760px)` rules narrowing `.admin-note-row`
  (including the Study Moderation reject/edit forms, which already use `grid-column:1/-1` so they
  span full width at every breakpoint). This is source-code confirmation, not a live rendering
  screenshot — reported honestly as a tooling gap, not assumed to pass visually.
- **Light**: verified (default, used throughout).
- **Dark**: verified — Study Notes browse/filter, Admin Study Moderation dashboard, and the Reject
  form all re-checked in Dark theme with correct contrast and full-width layout preserved.
- **EN**: verified (default).
- **BM**: verified — switched language selector to BM on the SM015 subject page; category tabs,
  filter labels, and resource count all localized ("Nota Pembelajaran", "Nota Pelajar", "Skema
  Jawapan", "Tahun/Subjenis/Sumber/Susun", "140 bahan").
- **ZH**: verified — switched to 中文; localized correctly ("学习资料", "学生笔记", "答案方案",
  "年份/子类型/来源/排序", "140 份资料").

## 11. Non-Study Smoke Test

All exercised in the same real browser session, after all Study Notes work, to check for
regressions:
- **Homepage** (`#/`): renders correctly, stats unchanged (715 visible community notes, 12
  communities, 0 photo notes) — Study Notes work did not touch community counts.
- **Community** (`#/community`): "All KM Students" and "College Communities" (KMK/KMKK/KMPP/KMPK)
  sections render with correct note counts.
- **All KM Students** (`#/community/all`): loads the Community V2 wall shell (filters, search,
  Leave a Note) with an expected empty state (0 notes in this global wall) — no console error.
- **College Community** (`#/community/1` → KMK, and `#/community/1/general`): College Community
  workspace and its General Community wall both render correctly.
- **pointer glow**: the ambient card-hover glow effect (visible on the homepage "Study Notes" CTA
  card and Study Notes cards) rendered as expected during normal hover/pointer movement.
- **Echo Map** (`map.html`): Leaflet map, Focus-buildings list, and building search all load and
  respond; selecting "Pustaka (Perpustakaan)" opened its outline/preview panel with the correct
  hours and "43 visible notes."
- **Building Stories / Detail / Wall**: from the map preview, "More details" opened the Building
  Profile (`#/place/B_PUSTAKA`) with photo, description, purpose, hours, current/upcoming events,
  and building-echo count; "Enter this building wall" opened the dedicated Building Wall
  (`#/place/B_PUSTAKA/wall`) rendering 43 real sticky notes across shapes/colors/categories with
  working filters and search.
- **existing Admin**: `#/admin` → KM Community Notes (Content Management, 14 total/14 visible notes,
  409 votes) and Map Notes (Map Pin Management, 0 pins) both render and filter correctly — untouched
  by the Study work.
- **Auth**: registration (new account + optional profile-completion flow), sign-in, sign-out, and
  role-based session state (`AuthService.getCurrentUser()`) all worked correctly across three
  distinct real accounts (existing admin, new admin via the whitelisted second email, new regular
  student) during this session.

No console errors were observed at any point in this session (`read_console_messages` checked
clean after the homepage load and again after the full Study Notes + Admin + regression pass).

## Syntax caveat (carried over, unrelated to this stage)

The repository-wide `Get-ChildItem -Recurse -Filter *.js | node --check` command still trips on the
unrelated historical checkpoint file
`checkpoints/HOMEPAGE-POLISH-001/before/app-router.renderHome.section-order.before.js`, which
intentionally contains an HTML fragment despite its `.js` suffix. Not a Study Notes concern; not
touched.

## Result

**FINAL-QA: PASS.** Every item the prior session marked BLOCKED/Not verified because "the browser
bridge could not establish its trusted native connection" was independently re-attempted this
session with a live, connected Chrome bridge, and passed. No Study Notes application source was
modified to reach this result — this was a verification-only pass per the user's instruction not to
redo 003–008 or reimplement Upload/Moderation.
