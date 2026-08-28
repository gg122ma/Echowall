# PRE_STATE — ADMIN-V2-003

Date: 2026-08-23

Full pre-edit copies of every touched file (except `app-study-admin.js`, see below) are in
`before/*.pre` — exact working-tree content immediately before this task started.
`app-admin-dashboard.js` and `scripts/test-admin-dashboard.mjs` are brand-new files — no `.pre`
snapshot exists for them because they did not exist before this task.

## Audit findings (before writing any code)

- **AdminShell**: `app-admin.js`'s `renderAdmin()` was a single big function that (1) gated on
  `isCurrentUserAdmin()`, (2) normalized `adminState.sourceType` to `"community"`/`"study"`/`"none"`
  based on the two existing section-specific permissions, (3) inlined the Community/Map sidebar +
  panel directly, or delegated to `renderAdminStudyPanel()` (a separate file,
  `app-study-admin.js`) which ALSO inlined its own full sidebar copy. There was no Overview/Queue/
  Reports/History concept anywhere — `adminState.sourceType` only ever took 3 real values
  (`"community"`, `"map"`, `"study"`) plus the dead-end `"none"`.
- **`renderAdminNoSectionState()`** existed specifically to handle a signed-in
  `COLLEGE_ADMIN`/`CONTENT_REVIEWER` who passed `canAccessAdminPanel()` but had neither Community
  nor Study permission — a login-page-styled "No sections assigned yet" dead end.
- **Existing moderation actions**: Community (`adminToggleHidden`/`adminDeleteNote`), Map
  (`adminToggleMapHidden`/`adminDeleteMapNote`, hard delete, confirmed via native `confirm()`),
  Study (`adminStudyApprove`/`adminStudySaveAndApprove`/`adminStudyConfirmReject`/
  `adminStudySetVerification`) — all already gated by the ADMIN-V2-001/002 permission functions,
  none touched this stage.
- **Existing stats**: Community/Map panels each computed their own `stats` array inline
  (`Total notes`/`Visible`/`Photo notes`/`Votes` or `Total pins`/`Visible`/`Hidden`/`Coverage`),
  reading `notes`/`adminMapNotes` directly — NOT through ModerationService. These were left
  completely alone; the new Overview's stat cards are separate and additional, reading exclusively
  through `ModerationService`.
- **Mobile CSS**: `style-admin.css` already had `@media (max-width:1100px)` (2-column stats,
  icon-only sidebar) and `@media (max-width:760px)` (horizontal icon-only nav bar, single-column
  filters) breakpoints, reused as-is for every new Dashboard element.
- **`services/moderation-service.js` / `services/admin-permission-service.js`**: read for their
  public API only (`listModerationItems`/`listReports`/`getQueueItems`/`isSuperAdmin`/
  `canModerateGlobalCommunity`/`canModerateCollege`/`canModerateStudy`/`getRoleAssignments`) — not
  modified, per the explicit "don't rewrite these services" instruction.

## Key pre-edit hunks (for readers who don't want to diff full files)

### app-admin.js — `adminState`

```js
let adminState = {
  search: "",
  category: "all",
  visibility: "all",
  orgId: "all",
  sort: "new",
  sourceType: "community",
};
```

### app-admin.js — `renderAdmin()`'s normalization + dispatch

```js
const canCommunitySection = canAccessCommunityModeration();
const canStudySection = canAccessStudyModeration();
if (adminState.sourceType === "study" && !canStudySection) {
  adminState.sourceType = canCommunitySection ? "community" : "none";
} else if (adminState.sourceType !== "study" && !canCommunitySection) {
  adminState.sourceType = canStudySection ? "study" : "none";
}

if (adminState.sourceType === "none") {
  renderAdminNoSectionState(container, user);
  return;
}
```

### app-admin.js — Community/Map sidebar (inline, no shared helper existed)

```js
<aside class="admin-sidebar">
  <nav class="admin-nav" aria-label="Admin sections">
    <button class="admin-nav-item ${!activeIsMap ? "active" : ""}" onclick="adminSetTab('notes')">...
    <button class="admin-nav-item ${activeIsMap ? "active" : ""}" onclick="adminSetTab('map')">...
    ${canStudySection ? `<button ... onclick="adminSetSource('study')">...` : ""}
    <a class="admin-nav-item" href="map.html">...
    <button class="admin-nav-item" onclick="adminExportNotes()">...
  </nav>
  <button class="admin-logout" onclick="adminLogout()">...
</aside>
```

### app-admin.js — `adminSetSource()`

```js
function adminSetSource(sourceType) {
  if (!["community", "map", "study"].includes(sourceType)) return;
  const hasSourceAccess = sourceType === "study" ? requireStudyModerationAccess() : requireCommunityModerationAccess();
  if (!hasSourceAccess) return;
  ...
```

### app-study-admin.js — `renderAdminStudyPanel()`'s sidebar (inline, duplicated copy)

No pre-edit `.pre` file was saved for this file before editing (caught after the fact) — the exact
prior content, verbatim from this session's own earlier read of the file:

```js
function renderAdminStudyPanel(container) {
  const queue = adminStudyQueue();
  const pendingCount = window.StudyUploadService ? StudyUploadService.getCachedSubmissions().filter(item => item.moderationStatus === "pending").length : 0;
  const canCommunitySection = typeof canAccessCommunityModeration === "function" && canAccessCommunityModeration();
  container.innerHTML = `
    <div class="admin-shell page-reveal">
      <aside class="admin-sidebar">
        <nav class="admin-nav" aria-label="Admin sections">
          ${canCommunitySection ? `<button class="admin-nav-item" onclick="adminSetSource('community')"><span>📝</span><span>${I18n.t("admin.sourceCommunity")}</span><b></b></button>` : ""}
          ${canCommunitySection ? `<button class="admin-nav-item" onclick="adminSetSource('map')"><span>🗺️</span><span>${I18n.t("admin.sourceMap")}</span><b></b></button>` : ""}
          <button class="admin-nav-item active" onclick="adminSetSource('study')"><span>📚</span><span>${I18n.t("admin.study.navLabel")}</span><b>${pendingCount}</b></button>
          <a class="admin-nav-item" href="map.html"><span>📍</span><span>Open Echo Map</span><b>↗</b></a>
        </nav>
        <button class="admin-logout" onclick="adminLogout()"><span>↪</span> Sign out</button>
      </aside>
      ... (unchanged main/header/stats/panel body below)
```

### index.html

`app-admin.js` was immediately followed by `app-place.js` — no `app-admin-dashboard.js` script tag
existed anywhere in the file.

### style-admin.css

No `.admin-dashboard-scope`/`.admin-dashboard-filters`/`.admin-dashboard-module-grid`/
`.admin-dashboard-module-card` classes existed.

### scripts/test-admin-dashboard.mjs

Did not exist.
