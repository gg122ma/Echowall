// Retire the former standalone Admin session. Account roles are the only permission source.
function clearLegacyAdminSession() {
  try {
    localStorage.removeItem("echo-wall-admin-session");
  } catch {
    // Storage cleanup must never block account-based access checks or sign-out.
  }
}
clearLegacyAdminSession();

let adminState = {
  search: "",
  category: "all",
  visibility: "all",
  orgId: "all",
  sort: "new",
  // ADMIN-V2-003: "overview" is the new default landing tab -- it is always
  // reachable by anyone who passed the outer canAccessAdminPanel() check
  // (unlike "community"/"map"/"study", which each need their own specific
  // permission), so it also replaces the old "no section assigned" dead
  // end for a plain COLLEGE_ADMIN/CONTENT_REVIEWER.
  sourceType: "overview",
  dashboardScope: "all",
  dashboardStatus: "active",
  dashboardModule: "all",
  dashboardSource: "all",
  // ADMIN-V2-004: Audit view's own filters -- deliberately separate fields
  // from the dashboardScope/etc above so switching a Queue filter never
  // silently changes what Audit shows, and vice versa.
  auditScope: "all",
  auditTargetType: "all",
  auditAction: "all",
  auditActorSearch: "",
  auditDateFrom: "",
  auditDateTo: "",
};

let activeAdminFilter = null;
let activeAdminFilterIndex = -1;
let adminFilterListenersReady = false;

// ADMIN-V2-004 — shared reason-prompt overlay ("统一 Action layer" — every
// Hide/Escalate action across Community/Map/the Dashboard uses this ONE
// modal, rather than each module inventing its own reason-input form the
// way Study's inline adminStudyRejectFormHtml() already does for Reject).
// Restore/Approve/Delete never open this (reason optional/none per spec
// section 7) -- they call their target function directly with reason: null.
let adminReasonPrompt = null; // { title, actionLabel, requireReason, onConfirm(reason) }

function adminOpenReasonPrompt({ title, actionLabel, requireReason = true, onConfirm }) {
  adminReasonPrompt = { title, actionLabel, requireReason, onConfirm };
  render();
}

function adminCloseReasonPrompt() {
  if (!adminReasonPrompt) return;
  adminReasonPrompt = null;
  render();
}

function adminSubmitReasonPrompt() {
  if (!adminReasonPrompt) return;
  const input = document.getElementById("admin-reason-prompt-input");
  const reason = input ? input.value.trim() : "";
  if (adminReasonPrompt.requireReason && !reason) {
    if (typeof showToast === "function") showToast(I18n.t("admin.reason.requiredError"));
    return;
  }
  const { onConfirm } = adminReasonPrompt;
  adminReasonPrompt = null;
  render(); // close the overlay immediately; onConfirm's own mutation (sync or async) re-renders again for the actual data change
  onConfirm(reason || null);
}

function adminReasonPromptHtml() {
  if (!adminReasonPrompt) return "";
  const { title, actionLabel, requireReason } = adminReasonPrompt;
  return `
    <div class="admin-reason-overlay" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="admin-reason-card">
        <h3>${escapeHtml(title)}</h3>
        <label class="form-group">
          <span class="form-label">${I18n.t("admin.reason.label")}${requireReason ? "" : ` (${I18n.t("admin.reason.optionalHint")})`}</span>
          <textarea id="admin-reason-prompt-input" class="form-textarea" placeholder="${escapeHtml(I18n.t("admin.reason.placeholder"))}"></textarea>
        </label>
        <div class="admin-study-form-actions">
          <button type="button" class="btn btn-primary btn-sm admin-danger" onclick="adminSubmitReasonPrompt()">${escapeHtml(actionLabel)}</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="adminCloseReasonPrompt()">${I18n.t("admin.study.cancel")}</button>
        </div>
      </div>
    </div>`;
}
let adminMapNotes = [];
let adminMapNotesStatus = "idle";
let adminMapNotesError = "";
let adminMapNotesUnsubscribe = null;

// ADMIN-V2-001: compatibility wrapper only — AdminPermissionService
// (services/admin-permission-service.js) is the real Role/Scope/Permission
// source of truth. This function now answers "can this user see the admin
// shell at all" (any active RoleAssignment, real or bootstrap/legacy), NOT
// "is this user a global admin" — section-specific actions must check the
// specific AdminPermissionService permission they need (see
// requireCommunityModerationAccess()/requireStudyModerationAccess() below),
// not this generic function.
function isCurrentUserAdmin() {
  const user = window.AuthService?.getCurrentUser?.();
  return Boolean(window.AdminPermissionService?.canAccessAdminPanel?.(user));
}

function requireAdminAccess() {
  if (isCurrentUserAdmin()) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

// ADMIN-V2-005: the college orgIds THIS user can moderate Community for
// (never a hardcoded list — reads the canonical `organizations` config,
// checked against each org via the real AdminPermissionService.canModerateCollege).
// Empty for a global-tier moderator (they don't need this list — see
// canAccessCommunityModeration below) and for anyone with no college
// RoleAssignment at all.
function adminUserCollegeOrgIds(user) {
  const aps = window.AdminPermissionService;
  if (!aps || !user || typeof organizations === "undefined" || !Array.isArray(organizations)) return [];
  return organizations.filter(org => aps.canModerateCollege(user, org.id)).map(org => org.id);
}

// ADMIN-V2-005/FINAL-CORRECTION: Community moderation access has TWO paths —
// canModerateGlobalCommunity(user) (true for Super Admin, legacy admin, AND
// a real GLOBAL_MODERATOR — all three legitimately need to reach this tab to
// moderate the Global/"All KM Students" community), OR a real COLLEGE_ADMIN
// with at least one college RoleAssignment. This function ONLY controls
// whether the Community tab is reachable at all — it never decides WHAT
// data flows through once inside; that is exclusively
// AdminPermissionService.canModerateCommunityContent()'s job, via
// getAdminCommunityNotes()/adminCanModerateNote() below. A real
// GLOBAL_MODERATOR reaching this tab therefore sees/can only touch the
// Global-scoped notes — reaching the tab is not the same as seeing every
// college once inside (that conflation was ADMIN-V2-FINAL-CORRECTION's bug).
function canAccessCommunityModeration() {
  const user = window.AuthService?.getCurrentUser?.();
  const aps = window.AdminPermissionService;
  if (!aps || !user) return false;
  if (aps.canModerateGlobalCommunity(user)) return true;
  return adminUserCollegeOrgIds(user).length > 0;
}

function requireCommunityModerationAccess() {
  if (canAccessCommunityModeration()) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

// ADMIN-V2-005: Map's OWN gate, decoupled from Community's above (Map has
// always been a KMK-only feature — AdminPermissionService.canModerateMap
// already folds in both the global-tier fallback AND a real KMK
// COLLEGE_ADMIN's canModerateCollege fallback, established in ADMIN-V2-003A
// — this is the single source of truth both the tab's visibility AND every
// Map write action below now check). A KMPP-only COLLEGE_ADMIN correctly
// gets false here (their canModerateCollege(user, KMK) is false), so they
// never see the Map tab despite now seeing the Community tab.
function adminResolveKmkOrgId() {
  try {
    return window.ModerationService?.resolveContentScope?.("map_note", "any")?.scopeId ?? null;
  } catch {
    return null;
  }
}

function canAccessMapModeration() {
  const user = window.AuthService?.getCurrentUser?.();
  const aps = window.AdminPermissionService;
  if (!aps || !user || typeof aps.canModerateMap !== "function") return false;
  return aps.canModerateMap(user, adminResolveKmkOrgId());
}

function requireMapModerationAccess() {
  if (canAccessMapModeration()) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

// ADMIN-V2-005 real per-item WRITE scope check -- canAccessCommunityModeration
// above only gates "can this user reach the Community tab AT ALL"; every
// mutation (Hide/Restore/Delete) additionally calls this to verify the
// SPECIFIC note being touched is inside their permitted scope, using the
// exact same canonical derivation ModerationService/AdminAuditService trust
// (never re-guessed from note.orgId directly, and never trusting
// adminState.orgId, which is just a client-side VIEW filter). This is what
// makes a forced console call like `adminToggleHidden(<a KMPP note id>)`
// fail for a KMK-only College Admin, not just the UI hiding the button.
// ADMIN-V2-FINAL-CORRECTION: was `if (canModerateGlobalCommunity(user)) return
// true;` before checking the note's real scope — a real GLOBAL_MODERATOR
// (who DOES hold GLOBAL_COMMUNITY_MODERATE) could therefore hide/delete a
// KMK or KMPP College post directly, in violation of the Permission Matrix
// ("GLOBAL_MODERATOR 不允许: College Community"). Fixed by delegating the
// whole decision to canModerateCommunityContent(), which checks the note's
// ACTUAL resolved scope against the right permission for that scope
// (global vs. that specific college) instead of short-circuiting on a
// permission that only proves global-scope access.
function adminCanModerateNote(user, note) {
  const aps = window.AdminPermissionService;
  if (!aps || !user || !note || typeof aps.canModerateCommunityContent !== "function") return false;
  const scope = adminResolvePostScope(note.id);
  return aps.canModerateCommunityContent(user, scope.scopeType, scope.scopeId);
}

// Study Moderation's own gate — deliberately separate from
// requireAdminAccess() so a Global Moderator or College Admin who can
// reach the admin shell (they hold SOME active RoleAssignment) still
// cannot open or act on the Study tab.
function canAccessStudyModeration() {
  const user = window.AuthService?.getCurrentUser?.();
  return Boolean(window.AdminPermissionService?.canModerateStudy?.(user));
}

function requireStudyModerationAccess() {
  if (canAccessStudyModeration()) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

// ADMIN-V2-003: single shared sidebar for EVERY admin view (the new
// Overview/Queue/Reports/History dashboard views in app-admin-dashboard.js,
// AND the existing Community/Map render below, AND app-study-admin.js's
// renderAdminStudyPanel) -- extracted so navigation is identical no matter
// which view is active, instead of each view maintaining its own copy.
// Overview/Queue/Reports/History are always shown (canAccessAdminPanel()
// already gated the caller); Community/Map/Study links stay conditional on
// their own existing specific permission, unchanged from before.
function adminSidebarNavHtml(user) {
  const active = adminState.sourceType;
  const items = window.ModerationService ? window.ModerationService.listModerationItems({}, user) : [];
  const pendingCount = items.filter(item => item.status === "pending" || item.status === "escalated").length;
  const reportCount = window.ModerationService ? window.ModerationService.listReports({}, user).length : 0;
  const historyCount = items.filter(item => ["approved", "rejected", "hidden"].includes(item.status)).length;
  const dashLink = (source, icon, label, count) =>
    `<button class="admin-nav-item ${active === source ? "active" : ""}" onclick="adminSetSource('${source}')"><span>${icon}</span><span>${escapeHtml(label)}</span><b>${count}</b></button>`;
  const parts = [
    dashLink("overview", "◈", I18n.t("admin.dash.overview"), ""),
    dashLink("queue", "🗂️", I18n.t("admin.dash.queue"), pendingCount),
    dashLink("reports", "🚩", I18n.t("admin.dash.reports"), reportCount),
    dashLink("history", "📜", I18n.t("admin.dash.history"), historyCount),
    dashLink("audit", "🛡️", I18n.t("admin.audit.title"), ""),
  ];
  if (canAccessCommunityModeration()) {
    const communityCount = getAdminCommunityNotes().length;
    parts.push(`<button class="admin-nav-item ${active === "community" ? "active" : ""}" onclick="adminSetSource('community')"><span>📝</span><span>${I18n.t("admin.sourceCommunity")}</span><b>${communityCount}</b></button>`);
  }
  if (canAccessMapModeration()) {
    const mapCount = adminMapNotes.length;
    parts.push(`<button class="admin-nav-item ${active === "map" ? "active" : ""}" onclick="adminSetSource('map')"><span>🗺️</span><span>${I18n.t("admin.sourceMap")}</span><b>${mapCount}</b></button>`);
  }
  if (canAccessStudyModeration()) {
    const pendingStudy = window.StudyUploadService ? StudyUploadService.getCachedSubmissions().filter(r => r.moderationStatus === "pending").length : 0;
    parts.push(`<button class="admin-nav-item ${active === "study" ? "active" : ""}" onclick="adminSetSource('study')"><span>📚</span><span>${I18n.t("admin.study.navLabel")}</span><b>${pendingStudy}</b></button>`);
  }
  if (window.AdminPermissionService?.isSuperAdmin?.(user)) {
    const assignmentCount = window.AdminPermissionService.listAllRoleAssignments().length;
    parts.push(`<button class="admin-nav-item ${active === "adminManagement" ? "active" : ""}" onclick="adminSetSource('adminManagement')"><span>🔑</span><span>${I18n.t("admin.mgmt.navLabel")}</span><b>${assignmentCount}</b></button>`);
  }
  parts.push(`<a class="admin-nav-item" href="map.html"><span>📍</span><span>${I18n.t("admin.dash.openEchoMap")}</span><b>↗</b></a>`);
  return parts.join("");
}

function renderAdmin(container) {
  const user = window.AuthService?.getCurrentUser?.() || null;
  if (!user || !isCurrentUserAdmin()) {
    renderAdminAccessState(container, user);
    return;
  }

  // ADMIN-V2-003: which sections this signed-in admin-panel user can
  // actually see. "overview"/"queue"/"reports"/"history" only need
  // canAccessAdminPanel() (already true here) — they always show
  // scope-appropriate data, even if that data is all zeros. Only
  // "community"/"map"/"study" need their own specific, stricter
  // permission; a stale/forged sourceType pointing at one of those without
  // the right permission falls back to "overview" (always safe), not the
  // old ADMIN-V2-001 "no section assigned" dead end.
  const canCommunitySection = canAccessCommunityModeration();
  const canMapSection = canAccessMapModeration();
  const canStudySection = canAccessStudyModeration();
  const canAdminMgmtSection = Boolean(window.AdminPermissionService?.isSuperAdmin?.(user));
  const isModuleSource = adminState.sourceType === "community" || adminState.sourceType === "map" || adminState.sourceType === "study" || adminState.sourceType === "adminManagement";
  if (isModuleSource) {
    const needsCommunity = adminState.sourceType === "community";
    const needsMap = adminState.sourceType === "map";
    const needsStudy = adminState.sourceType === "study";
    const needsAdminMgmt = adminState.sourceType === "adminManagement";
    if ((needsCommunity && !canCommunitySection) || (needsMap && !canMapSection) || (needsStudy && !canStudySection) || (needsAdminMgmt && !canAdminMgmtSection)) {
      adminState.sourceType = "overview";
    }
  } else if (!["overview", "queue", "reports", "history", "audit"].includes(adminState.sourceType)) {
    adminState.sourceType = "overview";
  }

  if (adminState.sourceType === "overview") return renderAdminOverview(container);
  if (adminState.sourceType === "queue") return renderAdminQueueView(container);
  if (adminState.sourceType === "reports") return renderAdminReportsView(container);
  if (adminState.sourceType === "history") return renderAdminHistoryView(container);
  if (adminState.sourceType === "audit") return renderAdminAuditView(container);
  if (adminState.sourceType === "adminManagement") return renderAdminManagementView(container);

  // STUDY-V2-008: Study Moderation is a third admin source, but its panel
  // shape (metadata edit forms, duplicate flags, verification levels) is
  // different enough from the notes/map source-switch machinery below that
  // reusing it would mean threading a third case through every function in
  // this file. Early-returning to a self-contained renderer (defined in
  // app-study-admin.js, loaded after this file) keeps the existing,
  // already-tested community/map rendering completely untouched — the
  // tradeoff is ~15 duplicated lines of sidebar markup between the two
  // functions, an accepted, deliberate simplification (see
  // study v2/reports/REPORT_STUDY-V2-008.md).
  if (adminState.sourceType === "study") {
    renderAdminStudyPanel(container);
    return;
  }

  const mapNotes = adminMapNotes.slice();

  const communityNotes = getAdminCommunityNotes();
  const visibleNotes = communityNotes.filter(note => !note.isHidden).length;
  const hiddenNotes = communityNotes.filter(note => note.isHidden).length;
  const photoNotes = communityNotes.filter(note => getNoteImageSource(note)).length;
  const totalVotes = communityNotes.reduce((sum, note) => sum + Number(note.upvotes || 0) + Number(note.downvotes || 0), 0);
  const visibleMap = mapNotes.filter(note => !note.isHidden).length;
  const hiddenMap = mapNotes.filter(note => note.isHidden).length;
  const latestNote = communityNotes.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
  const activeIsMap = adminState.sourceType === "map";
  const filteredItems = activeIsMap ? getAdminFilteredMapNotes() : getAdminFilteredNotes();
  const filterDefinitions = getAdminFilterDefinitions(activeIsMap);

  const stats = activeIsMap
    ? [
        ["🗺️", "Total pins", mapNotes.length, "All saved map notes"],
        ["👁️", "Visible", visibleMap, "Displayed on Echo Map"],
        ["🔒", "Hidden", hiddenMap, "Removed from public view"],
        ["📍", "Coverage", "KMK", "Location-based records"],
      ]
    : [
        ["📝", "Total notes", communityNotes.length, "Community records only"],
        ["👁️", "Visible", visibleNotes, "Publicly readable"],
        ["📷", "Photo notes", photoNotes, "Notes with attached media"],
        ["👍", "Votes", totalVotes, "All up and down votes"],
      ];

  container.innerHTML = `
    <div class="admin-shell page-reveal">
      <aside class="admin-sidebar">
        <nav class="admin-nav" aria-label="Admin sections">
          ${adminSidebarNavHtml(user)}
          <button class="admin-nav-item" onclick="adminExportNotes()"><span>⇩</span><span>Export JSON</span><b></b></button>
        </nav>
        <button class="admin-logout" onclick="adminLogout()"><span>↪</span> Sign out</button>
      </aside>

      <main class="admin-main">
        <header class="admin-header">
          <div><p class="eyebrow">Moderation centre</p><h1>${activeIsMap ? "Map Pin Management" : "Content Management"}</h1><p>${activeIsMap ? "Review location-based notes placed around KMK campus." : "Review text and photo notes shared across communities."}</p></div>
          <div class="admin-header-actions"><span class="admin-system-status"><i></i> Prototype online</span><button class="btn btn-outline btn-sm" onclick="navigate('#/')">View website ↗</button></div>
        </header>

        <section class="admin-stats">
          ${stats.map((stat, index) => `<article class="admin-stat" style="--admin-delay:${index * 70}ms"><span class="admin-stat-icon">${stat[0]}</span><div><span>${stat[1]}</span><strong data-admin-count="${typeof stat[2] === "number" ? stat[2] : ""}">${stat[2]}</strong><small>${stat[3]}</small></div></article>`).join("")}
        </section>

        <section class="admin-panel">
          <div class="admin-source-switch" role="tablist" aria-label="${I18n.t("admin.sourceLabel")}">
            ${canAccessCommunityModeration() ? `<button type="button" role="tab" aria-selected="${!activeIsMap}" tabindex="${!activeIsMap ? "0" : "-1"}" class="admin-source-option ${!activeIsMap ? "active" : ""}" onclick="adminSetSource('community')" onkeydown="adminHandleSourceKeydown(event)"><span aria-hidden="true">▤</span>${I18n.t("admin.sourceCommunity")}</button>` : ""}
            ${canAccessMapModeration() ? `<button type="button" role="tab" aria-selected="${activeIsMap}" tabindex="${activeIsMap ? "0" : "-1"}" class="admin-source-option ${activeIsMap ? "active" : ""}" onclick="adminSetSource('map')" onkeydown="adminHandleSourceKeydown(event)"><span aria-hidden="true">⌖</span>${I18n.t("admin.sourceMap")}</button>` : ""}
          </div>
          <div class="admin-panel-header">
            <div><p class="eyebrow">${activeIsMap ? "Location moderation" : "Note moderation"}</p><h2>${activeIsMap ? "KMK map pins" : "Community notes"}</h2><p><span class="match-count">${filteredItems.length}</span> matching records${latestNote && !activeIsMap ? ` · latest ${formatDate(latestNote.createdAt, false)}` : ""}</p></div>
            <div class="admin-actions">
              <button class="btn btn-outline btn-sm" onclick="adminExportNotes()">Export JSON</button>
              ${!activeIsMap && (window.AdminPermissionService?.isSuperAdmin?.(user) || window.AdminPermissionService?.isLegacyAdmin?.(user)) ? `<button class="btn btn-outline btn-sm admin-danger" onclick="adminResetNotes()">Reset demo data</button>` : ""}
            </div>
          </div>

          <div class="admin-filters ${activeIsMap ? "admin-filters-map" : ""}">
            <label class="admin-search"><span>⌕</span><input type="search" placeholder="${activeIsMap ? "Search map pins or authors" : "Search notes or authors"}" value="${escapeHtml(adminState.search)}" oninput="adminSetSearch(event)" /><i class="filter-indicator ${adminState.search ? "active" : ""}">Filtering</i></label>
            ${filterDefinitions.map(renderAdminFilterSelect).join("")}
          </div>

          <div class="admin-note-list">
            ${activeIsMap && adminMapNotesStatus === "loading"
              ? `<div class="admin-empty"><span>◌</span><h3>Loading Map Notes</h3><p>Reading the active Map Note provider.</p></div>`
              : activeIsMap && adminMapNotesStatus === "error"
                ? `<div class="admin-empty"><span>!</span><h3>Map Notes unavailable</h3><p>${escapeHtml(adminMapNotesError)}</p><button class="btn btn-outline btn-sm" type="button" onclick="adminRetryMapNotes()">Retry</button></div>`
                : filteredItems.length ? filteredItems.map(activeIsMap ? renderAdminMapNoteRow : renderAdminNoteRow).join("") : `<div class="admin-empty"><span>🗂️</span><h3>No matching records</h3><p>Try clearing the search or changing a filter.</p></div>`}
          </div>
        </section>
      </main>
    </div>
    ${adminReasonPromptHtml()}`;
  initializeAdminFilters();
  initializeAdminMapNotes(activeIsMap);
}

function renderAdminAccessState(container, user) {
  const signedIn = Boolean(user);
  const title = I18n.t(signedIn ? "admin.accessDenied" : "admin.signInRequired");
  const description = I18n.t(signedIn ? "admin.noAccess" : "admin.signInToContinue");
  const account = signedIn
    ? '<p class="admin-login-description"><strong>' + escapeHtml(user.displayName) + '</strong><br />' + escapeHtml(user.email) + '</p>'
    : '';
  const primaryAction = signedIn
    ? '<button class="btn btn-outline btn-full" type="button" onclick="adminLogout()">' + I18n.t("admin.signOut") + '</button>'
    : '<button class="btn btn-primary btn-full btn-lg" type="button" onclick="AuthUI.open(&quot;login&quot;)">' + I18n.t("admin.signIn") + '</button>';
  container.innerHTML =
    '<div class="admin-login-page page-reveal">' +
      '<section class="admin-login-visual">' +
        '<div class="admin-login-copy"><img src="assets/book-icon.png" alt="Echo Wall" /><p class="eyebrow">' + I18n.t("admin.dashboard") + '</p><h1>' + title + '</h1><p>' + description + '</p></div>' +
        '<div class="admin-login-preview"><span>🛡️ ' + I18n.t("admin.localPrototype") + '</span></div>' +
      '</section>' +
      '<section class="admin-login-panel"><div class="admin-login-card">' +
        '<div class="admin-login-mark">A</div><p class="eyebrow">' + I18n.t("admin.dashboard") + '</p><h2>' + title + '</h2>' +
        '<p class="admin-login-description">' + description + '</p>' + account + primaryAction +
        '<button class="btn btn-ghost btn-full" type="button" onclick="navigate(&quot;#/&quot;)">← ' + I18n.t("admin.returnWebsite") + '</button>' +
      '</div></section>' +
    '</div>';
}

function renderAdminNoteRow(note, index = 0) {
  const isBuildingNote = note.contextType === "building";
  const building = isBuildingNote ? getCampusBuilding(note.placeId) : null;
  const org = organizations.find(item => String(item.id) === String(note.orgId));
  const batch = batches.find(item => String(item.id) === String(note.batchId));
  const major = majors.find(item => String(item.id) === String(note.majorId));
  const author = note.isAnonymous ? "Anonymous" : (note.authorNickname || "User");
  const statusClass = note.isHidden ? "admin-status-hidden" : "admin-status-visible";
  const statusText = note.isHidden ? "Hidden" : "Visible";
  const imageSource = getNoteImageSource(note);
  const noteId = Number(note.id);
  const categoryLabel = { academic: "Academic", koko: "Activities", campus_life: "Campus life", emotional: "Support" }[note.category] || "Other";
  const postTypeLabel = EchoPostTypeContract.normalize(note.postType) === "question"
    ? I18n.t("form.postTypeQuestion")
    : I18n.t("form.postTypeDiscussion");

  return `
    <article class="admin-note-row" style="--admin-row-delay:${Math.min(index * 30, 300)}ms">
      <div class="admin-note-thumb ${imageSource ? "has-image" : ""}">${imageSource ? `<img src="${imageSource}" alt="${escapeHtml(note.imageName || "Attached note photo")}" loading="lazy" />` : `<span>${{ academic:"📚",koko:"🎖️",campus_life:"🏫",emotional:"💛" }[note.category] || "📝"}</span>`}</div>
      <div class="admin-note-main">
        <div class="admin-note-meta"><span class="admin-status ${statusClass}">${statusText}</span><span class="admin-meta-badge">${escapeHtml(postTypeLabel)}</span><span class="admin-meta-badge">${categoryLabel}</span><span>${isBuildingNote ? `🏢 ${escapeHtml(building?.name || note.placeId || "Unknown building")}` : escapeHtml(org?.name || "Unknown")}</span>${!isBuildingNote && batch ? `<span>· ${escapeHtml(batch.label)}</span>` : ""}${!isBuildingNote && major ? `<span>· ${escapeHtml(major.name)}</span>` : ""}</div>
        <p class="admin-note-content">${escapeHtml(note.content || "")}</p>
        <div class="admin-note-foot"><span>By <b>${escapeHtml(author)}</b></span><span>${formatDate(note.createdAt, true)}</span><span>Score <b>${Number(note.score || 0)}</b></span></div>
      </div>
      <div class="admin-note-actions"><button class="btn btn-outline btn-sm" onclick="adminToggleHidden(${noteId})">${note.isHidden ? "Show" : "Hide"}</button><button class="btn btn-outline btn-sm admin-danger" onclick="adminDeleteNote(${noteId})">Delete</button></div>
    </article>`;
}

function renderAdminMapNoteRow(note, index = 0) {
  const author = note.author || "Anonymous";
  const statusClass = note.isHidden ? "admin-status-hidden" : "admin-status-visible";
  const statusText = note.isHidden ? "Hidden" : "Visible";
  const recordKey = String(note.recordKey || "");
  const sourceType = String(note.sourceType || "");
  const markerColor = /^#[0-9a-f]{6}$/i.test(String(note.color || "")) ? note.color : "#8b5e3c";
  const allowedIcons = new Set(["📌", "💬", "❤️", "💡", "🌟"]);
  const markerIcon = allowedIcons.has(note.icon) ? note.icon : "📌";
  const latitude = Number(note.lat);
  const longitude = Number(note.lng);
  const timestamp = Number(note.timestamp);
  const coordinateText = Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "Invalid coordinates";

  return `
    <article class="admin-note-row" data-map-record-key="${escapeHtml(recordKey)}" data-map-source-type="${escapeHtml(sourceType)}" style="--admin-row-delay:${Math.min(index * 30, 300)}ms">
      <div class="admin-note-thumb map-pin-thumb" style="--pin-color:${markerColor}"><span>${markerIcon}</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta"><span class="admin-status ${statusClass}">${statusText}</span><span class="admin-meta-badge">Map pin</span><span>${coordinateText}</span></div>
        <p class="admin-note-content">${escapeHtml(note.text || "")}</p>
        <div class="admin-note-foot"><span>By <b>${escapeHtml(author)}</b></span><span>${Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Unknown date"}</span></div>
      </div>
      <div class="admin-note-actions"><button class="btn btn-outline btn-sm" data-map-record-key="${escapeHtml(recordKey)}" onclick="adminToggleMapHidden(this.dataset.mapRecordKey)">${note.isHidden ? "Show" : "Hide"}</button><button class="btn btn-outline btn-sm admin-danger" data-map-record-key="${escapeHtml(recordKey)}" onclick="adminDeleteMapNote(this.dataset.mapRecordKey)">Delete</button></div>
    </article>`;
}

function initializeAdminAnimations() {
  const counters = document.querySelectorAll("[data-admin-count]");
  counters.forEach(counter => {
    const target = Number(counter.dataset.adminCount || 0);
    if (!Number.isFinite(target) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 650);
      counter.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    counter.textContent = "0";
    requestAnimationFrame(tick);
  });
}

// ADMIN-V2-005: also includes "building" notes (spec section 13's "KMK
// Building moderation" -- these previously had NO admin surface at all
// despite renderAdminNoteRow already having full support for rendering
// them; a real gap, not a deliberate omission, fixed here as the "minimal
// adapter" spec section 15 explicitly allows).
//
// ADMIN-V2-FINAL-CORRECTION: this used to bypass to "return every note" for
// `canModerateGlobalCommunity(user)` -- true for Super Admin AND legacy
// admin AND (incorrectly) a real GLOBAL_MODERATOR, who per the Permission
// Matrix must see Global-scope notes ONLY, never any college's. Fixed by
// delegating per-note to canModerateCommunityContent(user, scope.scopeType,
// scope.scopeId), which resolves each note's REAL canonical scope
// (never note.orgId re-guessed locally) and answers correctly per tier:
// Super Admin/legacy admin -> every note; a real GLOBAL_MODERATOR -> only
// global-scoped notes; a real COLLEGE_ADMIN -> only their own college's.
function getAdminCommunityNotes() {
  const all = Array.isArray(notes) ? notes.filter(note => note?.contextType === "community" || note?.contextType === "building") : [];
  const user = window.AuthService?.getCurrentUser?.();
  const aps = window.AdminPermissionService;
  if (!aps || !user || typeof aps.canModerateCommunityContent !== "function") return [];
  return all.filter(note => {
    const scope = adminResolvePostScope(note.id);
    return aps.canModerateCommunityContent(user, scope.scopeType, scope.scopeId);
  });
}

function initializeAdminMapNotes(activeIsMap) {
  if (!adminMapNotesUnsubscribe && window.MapNoteService) {
    adminMapNotesUnsubscribe = MapNoteService.subscribe(() => {
      if (adminState.sourceType === "map") void loadAdminMapNotes();
      else adminMapNotesStatus = "idle";
    });
  }
  if (activeIsMap && adminMapNotesStatus === "idle") void loadAdminMapNotes();
}

async function loadAdminMapNotes() {
  if (!window.MapNoteService || adminMapNotesStatus === "loading") return;
  adminMapNotesStatus = "loading";
  adminMapNotesError = "";
  if (adminState.sourceType === "map") render();
  try {
    await MapNoteService.ready();
    adminMapNotes = await MapNoteService.list({ visibility:"all", sort:"newest" });
    adminMapNotesStatus = "ready";
  } catch (error) {
    adminMapNotes = [];
    adminMapNotesStatus = "error";
    adminMapNotesError = error instanceof Error ? error.message : "Map Note provider failed.";
  }
  if (adminState.sourceType === "map") render();
}

function adminRetryMapNotes() {
  if (!requireMapModerationAccess() || adminState.sourceType !== "map") return;
  adminMapNotesStatus = "idle";
  void loadAdminMapNotes();
}

function getAdminFilterDefinitions(activeIsMap) {
  const visibility = {
    key: "visibility",
    label: I18n.t("admin.filterVisibility"),
    options: [
      ["all", I18n.t("admin.filterAllVisibility")],
      ["visible", I18n.t("admin.filterVisible")],
      ["hidden", I18n.t("admin.filterHidden")],
    ],
  };
  const sort = {
    key: "sort",
    label: I18n.t("admin.filterSort"),
    options: activeIsMap
      ? [["new", I18n.t("admin.filterNewest")], ["old", I18n.t("admin.filterOldest")]]
      : [["new", I18n.t("admin.filterNewest")], ["hot", I18n.t("admin.filterHighest")], ["low", I18n.t("admin.filterLowest")]],
  };
  if (activeIsMap) return [visibility, sort];
  // ADMIN-V2-005: a real COLLEGE_ADMIN (no global permission) only sees
  // their OWN permitted college(s) in this dropdown -- never a full list
  // they could pick a KMPP filter out of just to look, even though
  // getAdminCommunityNotes()/adminCanModerateNote() would deny the actual
  // data/write either way. This keeps the UI honest about what's reachable.
  const communityUser = window.AuthService?.getCurrentUser?.();
  const communityAps = window.AdminPermissionService;
  // ADMIN-V2-FINAL-CORRECTION: was canModerateGlobalCommunity(user) (also
  // true for a real GLOBAL_MODERATOR, who must NOT see any college's name
  // listed here at all -- spec section 14's "counts 不泄漏" extends to a
  // college picker leaking college identities to a role that can't moderate
  // any of them). Legacy-tier ("sees every college") is now exclusively
  // isSuperAdmin/isLegacyAdmin -- a real GLOBAL_MODERATOR falls through to
  // the college-list branch, which is correctly empty for them (they hold
  // no college RoleAssignment), leaving only "All permitted communities".
  const isLegacyTierCommunity = Boolean(communityAps?.isSuperAdmin?.(communityUser) || communityAps?.isLegacyAdmin?.(communityUser));
  const orgOptions = isLegacyTierCommunity
    ? organizations.map(org => [String(org.id), String(org.name)])
    : organizations.filter(org => adminUserCollegeOrgIds(communityUser).includes(org.id)).map(org => [String(org.id), String(org.name)]);
  return [
    {
      key: "orgId",
      label: I18n.t("admin.filterCommunity"),
      options: [["all", I18n.t("admin.filterAllCommunities")]].concat(orgOptions),
    },
    {
      key: "category",
      label: I18n.t("admin.filterCategory"),
      options: [
        ["all", I18n.t("admin.filterAllCategories")],
        ["academic", I18n.t("admin.filterAcademic")],
        ["koko", I18n.t("admin.filterActivities")],
        ["campus_life", I18n.t("admin.filterCampusLife")],
        ["emotional", I18n.t("admin.filterSupport")],
      ],
    },
    visibility,
    sort,
  ];
}

function renderAdminFilterSelect(definition) {
  const currentValue = String(adminState[definition.key] ?? "all");
  const selected = definition.options.find(option => option[0] === currentValue) || definition.options[0];
  const controlId = `admin-filter-${definition.key}`;
  return `
    <div class="admin-filter-select" data-admin-filter="${escapeHtml(definition.key)}">
      <label class="admin-filter-label" for="${controlId}-trigger">${escapeHtml(definition.label)}</label>
      <select id="${controlId}" class="admin-filter-native" tabindex="-1" aria-hidden="true">
        ${definition.options.map(option => `<option value="${escapeHtml(option[0])}" ${option[0] === selected[0] ? "selected" : ""}>${escapeHtml(option[1])}</option>`).join("")}
      </select>
      <button id="${controlId}-trigger" type="button" class="admin-filter-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="admin-filter-menu" data-admin-filter-trigger="${escapeHtml(definition.key)}">
        <span>${escapeHtml(selected[1])}</span><i aria-hidden="true">⌄</i>
      </button>
    </div>`;
}

function initializeAdminFilters() {
  closeAdminFilterMenu(false);
  document.querySelectorAll("[data-admin-filter-trigger]").forEach(trigger => {
    trigger.addEventListener("click", () => toggleAdminFilterMenu(trigger));
    trigger.addEventListener("keydown", adminFilterTriggerKeydown);
  });
  if (adminFilterListenersReady) return;
  adminFilterListenersReady = true;
  document.addEventListener("pointerdown", event => {
    if (!activeAdminFilter) return;
    const menu = document.getElementById("admin-filter-menu");
    if (!menu?.contains(event.target) && !activeAdminFilter.contains(event.target)) closeAdminFilterMenu(false);
  });
  document.addEventListener("keydown", event => {
    if (!activeAdminFilter) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeAdminFilterMenu(true);
    } else if (event.key === "Tab") {
      closeAdminFilterMenu(false);
    }
  });
  window.addEventListener("resize", () => closeAdminFilterMenu(false));
  window.addEventListener("scroll", () => closeAdminFilterMenu(false), true);
}

function toggleAdminFilterMenu(trigger) {
  if (activeAdminFilter === trigger) {
    closeAdminFilterMenu(true);
    return;
  }
  openAdminFilterMenu(trigger);
}

function openAdminFilterMenu(trigger) {
  closeAdminFilterMenu(false);
  const key = trigger.dataset.adminFilterTrigger;
  const select = document.getElementById(`admin-filter-${key}`);
  if (!select) return;
  const menu = document.createElement("div");
  menu.id = "admin-filter-menu";
  menu.className = "admin-filter-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-labelledby", trigger.id);
  Array.from(select.options).forEach((option, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "admin-filter-option";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option.value === select.value));
    item.dataset.value = option.value;
    item.textContent = option.textContent;
    item.addEventListener("click", () => selectAdminFilterOption(index));
    item.addEventListener("pointermove", () => setAdminFilterActiveIndex(index));
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  activeAdminFilter = trigger;
  activeAdminFilterIndex = Math.max(0, select.selectedIndex);
  trigger.setAttribute("aria-expanded", "true");
  positionAdminFilterMenu();
  setAdminFilterActiveIndex(activeAdminFilterIndex);
  menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function positionAdminFilterMenu() {
  const menu = document.getElementById("admin-filter-menu");
  if (!menu || !activeAdminFilter) return;
  const rect = activeAdminFilter.getBoundingClientRect();
  const margin = 8;
  const width = Math.min(Math.max(rect.width, 190), window.innerWidth - margin * 2);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
  const menuHeight = Math.min(menu.scrollHeight, 270);
  const roomBelow = window.innerHeight - rect.bottom - margin;
  const openAbove = roomBelow < menuHeight && rect.top > roomBelow;
  menu.classList.toggle("opens-up", openAbove);
  menu.style.top = openAbove
    ? `${Math.max(margin, rect.top - menuHeight - 6)}px`
    : `${Math.min(window.innerHeight - menuHeight - margin, rect.bottom + 6)}px`;
}

function adminFilterTriggerKeydown(event) {
  if (!["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const wasOpen = activeAdminFilter === event.currentTarget;
  if (!wasOpen) openAdminFilterMenu(event.currentTarget);
  const menu = document.getElementById("admin-filter-menu");
  const last = Math.max(0, (menu?.children.length || 1) - 1);
  if (event.key === "ArrowDown") setAdminFilterActiveIndex(Math.min(last, activeAdminFilterIndex + 1));
  else if (event.key === "ArrowUp") setAdminFilterActiveIndex(Math.max(0, activeAdminFilterIndex - 1));
  else if (event.key === "Home") setAdminFilterActiveIndex(0);
  else if (event.key === "End") setAdminFilterActiveIndex(last);
  else if (wasOpen) selectAdminFilterOption(activeAdminFilterIndex);
}

function setAdminFilterActiveIndex(index) {
  const options = Array.from(document.querySelectorAll("#admin-filter-menu .admin-filter-option"));
  if (!options.length) return;
  activeAdminFilterIndex = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, optionIndex) => option.classList.toggle("active", optionIndex === activeAdminFilterIndex));
  options[activeAdminFilterIndex].scrollIntoView({ block: "nearest" });
}

function selectAdminFilterOption(index) {
  const trigger = activeAdminFilter;
  const option = document.querySelectorAll("#admin-filter-menu .admin-filter-option")[index];
  const key = trigger?.dataset.adminFilterTrigger;
  const select = key ? document.getElementById(`admin-filter-${key}`) : null;
  if (!trigger || !option || !select) return;
  select.value = option.dataset.value;
  closeAdminFilterMenu(false);
  adminSetFilter(key, select.value);
}

function closeAdminFilterMenu(returnFocus) {
  const trigger = activeAdminFilter;
  document.getElementById("admin-filter-menu")?.remove();
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  activeAdminFilter = null;
  activeAdminFilterIndex = -1;
  if (returnFocus && trigger?.isConnected) trigger.focus();
}

function adminLogout() {
  clearLegacyAdminSession();
  AuthService.signOut();
}

function adminSetTab(tab) {
  adminSetSource(tab === "map" ? "map" : "community");
}

function requireAdminManagementAccess() {
  if (window.AdminPermissionService?.isSuperAdmin?.(window.AuthService?.getCurrentUser?.())) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

function adminSetSource(sourceType) {
  if (!["community", "map", "study", "overview", "queue", "reports", "history", "audit", "adminManagement"].includes(sourceType)) return;
  // ADMIN-V2-001/003: each source has its OWN permission, not just generic
  // admin-panel access — this is what stops a Study Moderator switching
  // into Community/Map, and a Global Moderator/College Admin switching
  // into Study, even though both hold some active RoleAssignment.
  // Overview/Queue/Reports/History only need the generic gate — they
  // always show scope-appropriate (possibly all-zero) data.
  const hasSourceAccess = sourceType === "study" ? requireStudyModerationAccess()
    : sourceType === "map" ? requireMapModerationAccess()
    : sourceType === "community" ? requireCommunityModerationAccess()
    : sourceType === "adminManagement" ? requireAdminManagementAccess()
    : requireAdminAccess();
  if (!hasSourceAccess) return;
  closeAdminFilterMenu(false);
  if (adminState.sourceType === sourceType) return;
  adminState.sourceType = sourceType;
  adminState.search = "";
  adminState.orgId = "all";
  adminState.category = "all";
  adminState.visibility = "all";
  adminState.sort = "new";
  render();
}

function adminHandleSourceKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const sourceType = event.key === "ArrowLeft" || event.key === "Home" ? "community" : "map";
  adminSetSource(sourceType);
  requestAnimationFrame(() => {
    document.querySelector(`.admin-source-option[aria-selected="true"]`)?.focus();
  });
}

function adminSetSearch(e) {
  const hasAccess = adminState.sourceType === "map" ? requireMapModerationAccess() : requireCommunityModerationAccess();
  if (!hasAccess) return;
  adminState.search = e.target.value;

  if (adminState.search) {
    e.target.style.borderColor = "#e67e22";
    e.target.style.backgroundColor = "rgba(255,165,0,0.01)";
  } else {
    e.target.style.borderColor = "";
    e.target.style.backgroundColor = "";
  }

  const listContainer = document.querySelector(".admin-note-list");
  const countLabel = document.querySelector(".match-count");
  const indicator = document.querySelector(".filter-indicator");

  if (adminState.sourceType === "map") {
    if (listContainer) {
      const filteredMapNotes = getAdminFilteredMapNotes();
      if (countLabel) countLabel.textContent = filteredMapNotes.length;
      if (indicator) indicator.style.display = adminState.search ? "inline-block" : "none";
      listContainer.innerHTML = filteredMapNotes.length 
        ? filteredMapNotes.map(renderAdminMapNoteRow).join("") 
        : `<div class="empty-state">No map pins match these filters.</div>`;
    } else {
      render();
    }
    return;
  }

  if (listContainer) {
    const filteredNotes = getAdminFilteredNotes();
    
    if (countLabel) countLabel.textContent = filteredNotes.length;
    if (indicator) indicator.style.display = adminState.search ? "inline-block" : "none";
    
    listContainer.innerHTML = filteredNotes.length 
      ? filteredNotes.map(renderAdminNoteRow).join("") 
      : `<div class="empty-state">No notes match these filters.</div>`;
  } else {
    render();
  }
}

function adminSetFilter(key, value) {
  const hasAccess = adminState.sourceType === "map" ? requireMapModerationAccess() : requireCommunityModerationAccess();
  if (!hasAccess) return;
  const allowedKeys = adminState.sourceType === "map"
    ? ["visibility", "sort"]
    : ["orgId", "category", "visibility", "sort"];
  if (!allowedKeys.includes(key)) return;
  adminState[key] = value;
  render();
}

function getAdminFilteredNotes() {
  if (!canAccessCommunityModeration()) return [];
  let result = getAdminCommunityNotes();
  const q = adminState.search.trim().toLowerCase();

  if (q) {
    result = result.filter(note => {
      const author = note.isAnonymous ? "anonymous" : String(note.authorNickname || "user").toLowerCase();
      const content = String(note.content || "").toLowerCase();
      return content.includes(q) || author.includes(q);
    });
  }
  if (adminState.orgId !== "all") result = result.filter(note => String(note.orgId) === String(adminState.orgId));
  if (adminState.category !== "all") result = result.filter(note => note.category === adminState.category);
  if (adminState.visibility === "visible") result = result.filter(note => !note.isHidden);
  if (adminState.visibility === "hidden") result = result.filter(note => note.isHidden);

  if (adminState.sort === "hot") result.sort((a, b) => (b.score || 0) - (a.score || 0));
  else if (adminState.sort === "low") result.sort((a, b) => (a.score || 0) - (b.score || 0));
  else result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return result;
}

function getAdminFilteredMapNotes() {
  if (!canAccessMapModeration()) return [];
  let mapNotes = adminMapNotes.slice();
  const q = adminState.search.trim().toLowerCase();

  if (q) {
    mapNotes = mapNotes.filter(note => {
      const author = String(note.author || "anonymous").toLowerCase();
      const text = String(note.text || "").toLowerCase();
      return text.includes(q) || author.includes(q);
    });
  }
  if (adminState.visibility === "visible") mapNotes = mapNotes.filter(note => !note.isHidden);
  if (adminState.visibility === "hidden") mapNotes = mapNotes.filter(note => note.isHidden);
  mapNotes.sort((a, b) => adminState.sort === "old" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
  return mapNotes;
}

// ADMIN-V2-004: fires one AuditAction per real Hide/Restore/Delete, scope
// derived via the same ModerationService.resolveContentScope() the Unified
// Queue itself trusts (never re-guessed locally).
//
// ADMIN-V2-FINAL-CORRECTION: AdminAuditService is now a REQUIRED dependency,
// not best-effort -- this throws if it is missing or itself throws. Every
// caller below now invokes this BEFORE committing its mutation (audit-first,
// mirroring services/moderation-service.js's updateModerationStatus), so a
// failed/missing audit leaves the note/pin unchanged instead of silently
// succeeding with no audit trail.
function adminLogAuditAction({ action, targetType, targetId, scopeType, scopeId, beforeSnapshot, afterSnapshot, reason }) {
  const user = window.AuthService?.getCurrentUser?.();
  if (!window.AdminAuditService || typeof window.AdminAuditService.createAuditAction !== "function") {
    throw new Error("AdminAuditService is required to perform this action.");
  }
  window.AdminAuditService.createAuditAction({
    actorUserId: user?.id,
    actorEmail: user?.email,
    action,
    targetType,
    targetId,
    scopeType,
    scopeId,
    beforeSnapshot,
    afterSnapshot,
    reason,
  }, user);
}

function adminResolvePostScope(noteId) {
  const fallback = { scopeType: "global", scopeId: null };
  try {
    return window.ModerationService?.resolveContentScope?.("post", noteId) || fallback;
  } catch {
    return fallback;
  }
}

function adminApplyCommunityHide(note, hidden, reason) {
  const scope = adminResolvePostScope(note.id);
  const before = { isHidden: Boolean(note.isHidden) };
  // ADMIN-V2-FINAL-CORRECTION: audit-first -- if this throws (AdminAuditService
  // missing/failing), note.isHidden is never mutated below.
  try {
    adminLogAuditAction({
      action: hidden ? "hide" : "restore",
      targetType: "post",
      targetId: note.id,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      beforeSnapshot: before,
      afterSnapshot: { isHidden: hidden },
      reason,
    });
  } catch (error) {
    showToast?.(error instanceof Error ? error.message : "Audit logging failed; action cancelled.");
    return;
  }
  note.isHidden = hidden;
  saveNotes();
  render();
  showToast(hidden ? "Note hidden from public wall." : "Note is visible again.");
}

function adminToggleHidden(id) {
  if (!requireCommunityModerationAccess() || adminState.sourceType !== "community") return;
  const note = notes.find(n => n.id === id && (n.contextType === "community" || n.contextType === "building"));
  if (!note) return;
  // ADMIN-V2-005: per-item scope check -- requireCommunityModerationAccess()
  // above only proves this user can reach the tab AT ALL (true for both a
  // global-tier moderator and any real COLLEGE_ADMIN); this is what stops a
  // KMK-only College Admin from hiding a KMPP note by calling
  // adminToggleHidden(<kmpp id>) directly, bypassing the filtered list.
  const user = window.AuthService?.getCurrentUser?.();
  if (!adminCanModerateNote(user, note)) {
    if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
    return;
  }
  if (note.isHidden) {
    adminApplyCommunityHide(note, false, null); // restore -- no reason required
    return;
  }
  adminOpenReasonPrompt({
    title: I18n.t("admin.reason.hideTitle"),
    actionLabel: I18n.t("admin.reason.hideAction"),
    requireReason: true,
    onConfirm: reason => adminApplyCommunityHide(note, true, reason),
  });
}

function requireAdminMapModerationRecord(recordKey) {
  const target = String(recordKey || "");
  if (!target) throw new Error("An explicit Map Note recordKey or sourceType target is required.");
  const matches = adminMapNotes.filter(note => String(note.recordKey || "") === target);
  if (matches.length !== 1) {
    throw new Error(matches.length
      ? "The Map Note recordKey is ambiguous."
      : "The Map Note target no longer exists.");
  }
  return matches[0];
}

function adminResolveMapScope(recordKey) {
  const fallback = { scopeType: "college", scopeId: null };
  try {
    return window.ModerationService?.resolveContentScope?.("map_note", recordKey) || fallback;
  } catch {
    return fallback;
  }
}

async function adminApplyMapHide(note, hidden, reason) {
  const scope = adminResolveMapScope(note.recordKey);
  // ADMIN-V2-FINAL-CORRECTION: audit-first -- if adminLogAuditAction throws,
  // MapNoteService.setHidden below never runs.
  try {
    adminLogAuditAction({
      action: hidden ? "hide" : "restore",
      targetType: "map_note",
      targetId: note.recordKey,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      beforeSnapshot: { isHidden: Boolean(note.isHidden) },
      afterSnapshot: { isHidden: hidden },
      reason,
    });
    await MapNoteService.setHidden(note.recordKey, hidden);
    showToast?.(hidden ? "Map pin hidden from public map." : "Map pin is visible again.");
  } catch (error) {
    showToast?.(error instanceof Error ? error.message : "Map Note update failed.");
  }
}

async function adminToggleMapHidden(recordKey) {
  if (!requireMapModerationAccess() || adminState.sourceType !== "map") return;
  let note;
  try {
    note = requireAdminMapModerationRecord(recordKey);
  } catch (error) {
    showToast?.(error instanceof Error ? error.message : "Map Note update failed.");
    return;
  }
  if (note.isHidden) {
    await adminApplyMapHide(note, false, null); // restore (Show) -- no reason required
    return;
  }
  adminOpenReasonPrompt({
    title: I18n.t("admin.reason.hideTitle"),
    actionLabel: I18n.t("admin.reason.hideAction"),
    requireReason: true,
    onConfirm: reason => adminApplyMapHide(note, true, reason),
  });
}

// ADMIN-V2-004 Delete policy: this remains a HARD, irreversible delete
// (unchanged public semantics -- not silently converted to soft-delete, per
// spec section 8's "不要偷偷改变已有 public semantics"). What changed: the
// native confirm() is replaced by the same reason-prompt overlay used for
// Hide (reason optional here, since only Reject/Hide require one), and the
// deletion now always produces an AuditAction with
// afterSnapshot.irreversible=true BEFORE the content is gone, capturing a
// safe excerpt for later reference.
function adminDeleteNote(id) {
  if (!requireCommunityModerationAccess() || adminState.sourceType !== "community") return;
  const target = notes.find(note => note.id === id && (note.contextType === "community" || note.contextType === "building"));
  if (!target) return;
  const user = window.AuthService?.getCurrentUser?.();
  if (!adminCanModerateNote(user, target)) {
    if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
    return;
  }
  const scope = adminResolvePostScope(target.id);
  adminOpenReasonPrompt({
    title: I18n.t("admin.reason.deleteTitle"),
    actionLabel: I18n.t("admin.reason.deleteAction"),
    requireReason: false,
    onConfirm: reason => {
      // ADMIN-V2-FINAL-CORRECTION hard-delete ordering: capture beforeSnapshot
      // -> ensure the AuditAction is persisted -> only then perform the
      // irreversible delete. If adminLogAuditAction throws, `target` is never
      // removed from `notes`.
      const before = { isHidden: Boolean(target.isHidden), contentExcerpt: String(target.content || "").slice(0, 160) };
      try {
        adminLogAuditAction({
          action: "delete",
          targetType: "post",
          targetId: id,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
          beforeSnapshot: before,
          afterSnapshot: { deleted: true, irreversible: true },
          reason,
        });
      } catch (error) {
        showToast?.(error instanceof Error ? error.message : "Audit logging failed; delete cancelled.");
        return;
      }
      notes = notes.filter(note => note !== target);
      saveNotes();
      render();
      showToast("Note deleted.");
    },
  });
}

// ADMIN-V2-004 Delete policy: unchanged hard-delete semantics (Map notes
// have always been hard-deleted -- see PRE_STATE.md's "Existing Map delete"
// note); the native confirm() is replaced by the reason-prompt overlay
// (reason optional), and every deletion now produces an AuditAction with
// afterSnapshot.irreversible=true before the note is gone.
async function adminDeleteMapNote(recordKey) {
  if (!requireMapModerationAccess() || adminState.sourceType !== "map") return;
  let note;
  try {
    note = requireAdminMapModerationRecord(recordKey);
  } catch (error) {
    showToast?.(error instanceof Error ? error.message : "Map Note deletion failed.");
    return;
  }
  const scope = adminResolveMapScope(note.recordKey);
  adminOpenReasonPrompt({
    title: I18n.t("admin.reason.deleteTitle"),
    actionLabel: I18n.t("admin.reason.deleteAction"),
    requireReason: false,
    onConfirm: async reason => {
      // ADMIN-V2-FINAL-CORRECTION hard-delete ordering: ensure the
      // AuditAction is persisted BEFORE calling MapNoteService.delete, which
      // is irreversible.
      try {
        adminLogAuditAction({
          action: "delete",
          targetType: "map_note",
          targetId: note.recordKey,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
          beforeSnapshot: { isHidden: Boolean(note.isHidden), recordKey: note.recordKey },
          afterSnapshot: { deleted: true, irreversible: true },
          reason,
        });
        await MapNoteService.delete(note.recordKey);
        showToast?.("Map pin permanently deleted.");
      } catch (error) {
        showToast?.(error instanceof Error ? error.message : "Map Note deletion failed.");
      }
    },
  });
}

// ADMIN-V2-005/FINAL-CORRECTION: deliberately restricted to legacy-tier only
// (isSuperAdmin || isLegacyAdmin), NOT canModerateGlobalCommunity (which a
// real GLOBAL_MODERATOR also holds) and NOT the broadened
// canAccessCommunityModeration() every other Community action above uses --
// this wipes ALL colleges' local notes at once (it clears the single shared
// `echo-wall-notes` key), so neither a KMK-only College Admin NOR a real
// (Global-scope-only) GLOBAL_MODERATOR may ever reach it; either would let a
// role destroy college data it cannot even see.
function adminResetNotes() {
  const user = window.AuthService?.getCurrentUser?.();
  const aps = window.AdminPermissionService;
  const isLegacyTier = Boolean(aps?.isSuperAdmin?.(user) || aps?.isLegacyAdmin?.(user));
  if (!isLegacyTier || adminState.sourceType !== "community") {
    if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
    return;
  }
  if (!confirm("Are you sure you want to clear your local storage changes?")) return;
  localStorage.removeItem("echo-wall-notes");
  location.reload();
}

async function adminExportNotes() {
  if (!requireCommunityModerationAccess()) return;
  let exportItems;
  try {
    exportItems = adminState.sourceType === "map"
      ? await MapNoteService.exportData()
      : getAdminCommunityNotes();
  } catch (error) {
    showToast?.(error instanceof Error ? error.message : "Export failed.");
    return;
  }
  const data = JSON.stringify(exportItems, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = adminState.sourceType === "map" ? "echo-wall-map-notes.json" : "echo-wall-community-notes.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
