/**
 * ADMIN-V2-003 — Unified Admin Dashboard (Overview / Queue / Reports / History).
 *
 * This file adds a Dashboard layer ON TOP of the existing Community/Map/Study
 * moderation panels (app-admin.js / app-study-admin.js) — it does not
 * replace them, and it never re-derives moderation data of its own. Every
 * count, list, and filter below reads through
 * services/moderation-service.js (ModerationService) and
 * services/admin-permission-service.js (AdminPermissionService); this file
 * contains zero permission logic and zero moderation-item storage of its
 * own. Scope-filtering happens once, inside ModerationService's own
 * list/get functions (see ADMIN-V2-002) — every function here that "shows
 * scope-appropriate data" is really just formatting whatever
 * ModerationService already decided this user may see.
 *
 * Two kinds of function live in this file, and it matters which is which:
 *   - PURE HELPERS (no DOM access): adminDashboardVisibleScopes,
 *     adminDashboardModuleForContentType, adminDashboardFilterItems,
 *     adminDashboardSortQueue, adminDashboardGroupReports,
 *     adminDashboardOverviewCounts, adminDashboardContentPreview. These are
 *     loaded and called directly by scripts/test-admin-dashboard.mjs in a
 *     Node vm sandbox with no `document` at all — do not add DOM/`window`-UI
 *     calls inside them.
 *   - RENDER FUNCTIONS (DOM-only, browser-only): everything else
 *     (renderAdminOverview, renderAdminQueueView, renderAdminReportsView,
 *     renderAdminHistoryView, and their event handlers).
 *
 * Load order: after app-admin.js (reuses its `adminState`,
 * `renderAdminNoteRow`-style conventions, `escapeHtml`, `formatDate`) and
 * after services/moderation-service.js / services/admin-permission-service.js.
 */

// --- Pure helpers ----------------------------------------------------------

const ADMIN_DASHBOARD_RESOLVED_STATUSES = Object.freeze(["approved", "rejected", "hidden"]);
const ADMIN_DASHBOARD_ACTIVE_STATUSES = Object.freeze(["pending", "escalated"]);

// contentType -> which existing module workspace (Community/Map/Study tab)
// owns it. Returns null for content types with no live module yet
// (comment/event/review) -- callers must handle null, never guess a module.
function adminDashboardModuleForContentType(contentType) {
  if (contentType === "post") return "community";
  if (contentType === "map_note") return "map";
  if (contentType === "study_resource") return "study";
  return null;
}

// The scope options THIS user is actually allowed to select, derived from
// their real active RoleAssignments (never a hardcoded college list --
// college names/ids come from the canonical `organizations` config, same
// source services/moderation-service.js's resolveKmkOrgId() trusts).
// "all" only appears when it would mean something (Super Admin, or a user
// holding more than one distinct scope) -- a single-scope user is never
// shown a redundant "All" option next to their one real choice.
function adminDashboardVisibleScopes(user) {
  const aps = window.AdminPermissionService;
  if (!aps || !user) return [];
  const isSuper = aps.isSuperAdmin(user);
  const orgList = typeof organizations !== "undefined" && Array.isArray(organizations) ? organizations : [];
  const options = [];
  const seenKeys = new Set();
  function addScope(scopeType, scopeId, label) {
    const key = scopeType + ":" + (scopeId == null ? "" : scopeId);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    options.push({ value: key, scopeType, scopeId: scopeId == null ? null : scopeId, label });
  }
  // Checked via the top-level permission functions, not by matching each
  // RoleAssignment's own scopeType 1:1 -- a single assignment (e.g. the
  // virtual LEGACY_ADMIN grant, scopeType "global") can carry permissions
  // that cross scope-type boundaries (it grants both
  // GLOBAL_COMMUNITY_MODERATE and STUDY_RESOURCE_MODERATE), so deriving
  // "which scopes can this user see" from permission checks is correct;
  // deriving it from assignment.scopeType alone would have hidden Study
  // from a legacy admin who can plainly moderate Study.
  if (isSuper || aps.canModerateGlobalCommunity(user)) addScope("global", null, I18n.t("admin.dash.scopeGlobal"));
  if (isSuper || aps.canModerateStudy(user)) addScope("study", null, I18n.t("admin.dash.scopeStudy"));
  if (isSuper) {
    orgList.forEach(org => addScope("college", org.id, org.name));
  } else {
    aps.getRoleAssignments(user)
      .filter(assignment => assignment.scopeType === "college")
      .forEach(assignment => {
        if (!aps.canModerateCollege(user, assignment.scopeId)) return;
        const org = orgList.find(item => item.id === assignment.scopeId);
        addScope("college", assignment.scopeId, org ? org.name : I18n.t("admin.dash.scopeCollegeFallback", { id: assignment.scopeId }));
      });
  }
  if (isSuper || options.length > 1) {
    options.unshift({ value: "all", scopeType: null, scopeId: null, label: I18n.t("admin.dash.scopeAll") });
  }
  return options;
}

// Scope-safe by construction: `items`/`reports` must already come from
// ModerationService.listModerationItems()/listReports() (which filter by
// the caller's real permission) -- this function only narrows the VIEW
// (e.g. a multi-college admin picking just "KMK"), it never widens access.
function adminDashboardFilterItems(items, filters = {}) {
  let result = items;
  if (filters.status && filters.status !== "all") {
    result = filters.status === "active"
      ? result.filter(item => ADMIN_DASHBOARD_ACTIVE_STATUSES.includes(item.status))
      : result.filter(item => item.status === filters.status);
  }
  if (filters.module && filters.module !== "all") {
    result = result.filter(item => adminDashboardModuleForContentType(item.contentType) === filters.module);
  }
  if (filters.source && filters.source !== "all") {
    result = result.filter(item => item.source === filters.source);
  }
  if (filters.scope && filters.scope !== "all") {
    const [scopeType, scopeIdRaw] = String(filters.scope).split(":");
    result = result.filter(item => item.scopeType === scopeType && (scopeIdRaw ? String(item.scopeId) === scopeIdRaw : true));
  }
  return result;
}

// Default queue presentation order: escalated before pending before
// anything else, then higher risk first, then newest first. Presentation
// only -- never mutates or re-persists the underlying ModerationItem list.
function adminDashboardSortQueue(items) {
  const statusRank = { escalated: 0, pending: 1 };
  return items.slice().sort((a, b) => {
    const rankA = statusRank[a.status] ?? 2;
    const rankB = statusRank[b.status] ?? 2;
    if (rankA !== rankB) return rankA - rankB;
    const riskDiff = Number(b.riskScore || 0) - Number(a.riskScore || 0);
    if (riskDiff !== 0) return riskDiff;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

// Groups Reports by the content they point at -- "3 reports, 1 queue case"
// (spec section 7): the Reports view shows report-level detail, but must
// never render one row per report as if each were its own queue case.
function adminDashboardGroupReports(reports) {
  const groups = new Map();
  reports.forEach(report => {
    const key = `${report.contentType}:${report.contentId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(report);
  });
  return Array.from(groups.values()).map(group => {
    const sorted = group.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return {
      contentType: sorted[0].contentType,
      contentId: sorted[0].contentId,
      scopeType: sorted[0].scopeType,
      scopeId: sorted[0].scopeId,
      reportCount: sorted.length,
      latestCreatedAt: sorted[0].createdAt,
      openCount: sorted.filter(report => report.status === "open").length,
      reports: sorted,
    };
  }).sort((a, b) => new Date(b.latestCreatedAt || 0) - new Date(a.latestCreatedAt || 0));
}

// Overview counts. Scope-safe by construction: `items`/`reports` are
// exactly what ModerationService already decided this user may see --
// this function does no additional permission filtering itself, it only
// tallies. A Student/Guest/CONTENT_REVIEWER (denied everywhere) correctly
// gets all-zero counts because ModerationService already handed back [].
function adminDashboardOverviewCounts(items, reports) {
  const byModule = { community: 0, map: 0, study: 0 };
  items.forEach(item => {
    const module = adminDashboardModuleForContentType(item.contentType);
    if (module && Object.prototype.hasOwnProperty.call(byModule, module)) byModule[module] += 1;
  });
  return {
    pending: items.filter(item => item.status === "pending").length,
    escalated: items.filter(item => item.status === "escalated").length,
    resolved: items.filter(item => ADMIN_DASHBOARD_RESOLVED_STATUSES.includes(item.status)).length,
    flagged: items.filter(item => item.source === "auto_flag").length,
    reported: reports.length,
    total: items.length,
    byModule,
  };
}

function adminDashboardHistoryItems(items) {
  return items.filter(item => ADMIN_DASHBOARD_RESOLVED_STATUSES.includes(item.status));
}

// Safe, canonical-content-derived preview -- never dumps internal storage
// paths/blob keys/fileIds, and never treats the ModerationItem itself as a
// content duplicate (it only ever points at contentId).
function adminDashboardContentPreview(item) {
  if (!item) return { title: I18n.t("admin.dash.previewUnknown"), detail: "" };
  if (item.contentType === "post") {
    const list = typeof getRuntimeNotes === "function" ? getRuntimeNotes() : (typeof notes !== "undefined" && Array.isArray(notes) ? notes : []);
    const note = list.find(entry => String(entry?.id) === String(item.contentId));
    if (!note) return { title: I18n.t("admin.dash.previewCommunityPost"), detail: I18n.t("admin.dash.previewGone") };
    const kind = note.contextType === "building" ? I18n.t("admin.dash.previewBuildingNote") : I18n.t("admin.dash.previewCommunityPost");
    return { title: kind, detail: String(note.content || "").slice(0, 160) };
  }
  if (item.contentType === "study_resource") {
    const resource = window.StudyResourceService?.getResourceById?.(item.contentId)
      || window.StudyUploadService?.getSubmissionById?.(item.contentId);
    if (!resource) return { title: I18n.t("admin.dash.previewStudyResource"), detail: I18n.t("admin.dash.previewGone") };
    return {
      title: resource.title || I18n.t("admin.dash.previewUntitled"),
      detail: [resource.subjectCode, resource.resourceType, resource.sourceType].filter(Boolean).join(" · "),
    };
  }
  if (item.contentType === "map_note") {
    return { title: I18n.t("admin.dash.previewMapNote"), detail: I18n.t("admin.dash.previewRecord", { id: item.contentId }) };
  }
  return { title: item.contentType, detail: I18n.t("admin.dash.previewRecord", { id: item.contentId }) };
}

// --- Render functions (browser-only) ---------------------------------------

// Shared scope-label formatter for queue/report/history rows -- was three
// separately-duplicated ternaries before ADMIN-V2-003A's i18n pass; kept as
// one function so every row presents scope labels identically.
// Status badge label -- item.status itself stays the raw internal enum
// (used for statusClass lookup, filter values, transitions, etc.); only the
// user-visible text goes through I18n (ADMIN-V2-003A).
const ADMIN_DASHBOARD_STATUS_KEYS = Object.freeze({
  pending: "admin.dash.statusPending",
  escalated: "admin.dash.statusEscalated",
  hidden: "admin.dash.statusHidden",
  approved: "admin.dash.statusApproved",
  rejected: "admin.dash.statusRejected",
});
function adminDashboardStatusLabel(status) {
  const key = ADMIN_DASHBOARD_STATUS_KEYS[status];
  return key ? I18n.t(key) : status;
}

// Module badge label -- same raw-enum-internal/translated-display split as
// adminDashboardStatusLabel above.
const ADMIN_DASHBOARD_MODULE_KEYS = Object.freeze({
  community: "admin.dash.moduleCommunity",
  map: "admin.dash.moduleMap",
  study: "admin.dash.moduleStudy",
  other: "admin.dash.moduleOther",
});
function adminDashboardModuleLabel(module) {
  const key = ADMIN_DASHBOARD_MODULE_KEYS[module];
  return key ? I18n.t(key) : module;
}

// Source badge label -- same raw-enum-internal/translated-display split.
const ADMIN_DASHBOARD_SOURCE_KEYS = Object.freeze({
  submission: "admin.dash.sourceSubmission",
  report: "admin.dash.sourceReport",
  auto_flag: "admin.dash.sourceAutoFlag",
  admin: "admin.dash.sourceAdmin",
});
function adminDashboardSourceLabel(source) {
  const key = ADMIN_DASHBOARD_SOURCE_KEYS[source];
  return key ? I18n.t(key) : source;
}

function adminDashboardScopeLabel(scopeType, scopeId) {
  if (scopeType === "college") {
    const org = typeof organizations !== "undefined" ? organizations.find(item => item.id === scopeId) : null;
    return org ? org.name : I18n.t("admin.dash.scopeCollegeFallback", { id: scopeId });
  }
  if (scopeType === "global") return I18n.t("admin.dash.scopeGlobal");
  if (scopeType === "study") return I18n.t("admin.dash.scopeStudy");
  return I18n.t("admin.dash.scopeSystem");
}

function adminDashboardScopeOptionsHtml(user, currentValue) {
  const options = adminDashboardVisibleScopes(user);
  if (!options.length) return "";
  const selected = options.some(option => option.value === currentValue) ? currentValue : options[0].value;
  if (adminState.dashboardScope !== selected) adminState.dashboardScope = selected;
  return `
    <label class="admin-filter-select admin-dashboard-scope">
      <span class="admin-filter-label">${I18n.t("admin.dash.scope")}</span>
      <select class="form-select" onchange="adminDashboardSetScope(this.value)">
        ${options.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>`;
}

function adminDashboardSetScope(value) {
  if (!requireAdminAccess()) return;
  adminState.dashboardScope = value;
  render();
}

function adminDashboardHeaderHtml(title, description, user) {
  return `
    <header class="admin-header">
      <div><p class="eyebrow">${I18n.t("admin.dashboard")}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>
      <div class="admin-header-actions"><span class="admin-system-status"><i></i> ${I18n.t("admin.dash.prototypeOnline")}</span><button class="btn btn-outline btn-sm" onclick="navigate('#/')">${I18n.t("admin.dash.viewWebsite")}</button></div>
    </header>`;
}

function renderAdminDashboardShell(container, bodyHtml, user, title, description) {
  container.innerHTML = `
    <div class="admin-shell page-reveal">
      <aside class="admin-sidebar">
        <nav class="admin-nav" aria-label="${I18n.t("admin.dash.ariaSections")}">
          ${adminSidebarNavHtml(user)}
        </nav>
        <button class="admin-logout" onclick="adminLogout()"><span>↪</span> ${I18n.t("admin.signOut")}</button>
      </aside>
      <main class="admin-main">
        ${adminDashboardHeaderHtml(title, description, user)}
        ${bodyHtml}
      </main>
    </div>
    ${adminReasonPromptHtml()}`;
}

function renderAdminOverview(container) {
  const user = window.AuthService.getCurrentUser();
  const ms = window.ModerationService;
  const filters = { scope: adminState.dashboardScope };
  const items = ms ? adminDashboardFilterItems(ms.listModerationItems({}, user), { scope: filters.scope }) : [];
  const reports = ms ? ms.listReports({}, user).filter(report => {
    if (!filters.scope || filters.scope === "all") return true;
    const [scopeType, scopeIdRaw] = filters.scope.split(":");
    return report.scopeType === scopeType && (scopeIdRaw ? String(report.scopeId) === scopeIdRaw : true);
  }) : [];
  const counts = adminDashboardOverviewCounts(items, reports);
  const scopeSelector = adminDashboardScopeOptionsHtml(user, adminState.dashboardScope);
  const statCards = [
    ["⏳", I18n.t("admin.dash.statPendingLabel"), counts.pending, I18n.t("admin.dash.statPendingDesc")],
    ["🚩", I18n.t("admin.dash.statReportedLabel"), counts.reported, I18n.t("admin.dash.statReportedDesc")],
    ["🤖", I18n.t("admin.dash.statFlaggedLabel"), counts.flagged, I18n.t("admin.dash.statFlaggedDesc")],
    ["⚠️", I18n.t("admin.dash.statEscalatedLabel"), counts.escalated, I18n.t("admin.dash.statEscalatedDesc")],
    ["✅", I18n.t("admin.dash.statResolvedLabel"), counts.resolved, I18n.t("admin.dash.statResolvedDesc")],
  ];
  const moduleCards = [
    ["📝", I18n.t("admin.dash.moduleCommunity"), counts.byModule.community],
    ["🗺️", I18n.t("admin.dash.moduleMap"), counts.byModule.map],
    ["📚", I18n.t("admin.dash.moduleStudy"), counts.byModule.study],
  ];
  const body = `
    <section class="admin-panel-header"><div>${scopeSelector}</div></section>
    <section class="admin-stats">
      ${statCards.map((stat, index) => `<article class="admin-stat" style="--admin-delay:${index * 70}ms"><span class="admin-stat-icon">${stat[0]}</span><div><span>${escapeHtml(stat[1])}</span><strong>${stat[2]}</strong><small>${escapeHtml(stat[3])}</small></div></article>`).join("")}
    </section>
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.dash.moduleSummaryEyebrow")}</p><h2>${I18n.t("admin.dash.moduleSummaryTitle")}</h2></div></div>
      <div class="admin-dashboard-module-grid">
        ${moduleCards.map(([icon, label, count]) => `<article class="admin-dashboard-module-card"><span class="admin-stat-icon">${icon}</span><div><strong>${count}</strong><small>${escapeHtml(label)}</small></div></article>`).join("")}
      </div>
      ${counts.total === 0 ? `<div class="admin-empty"><span>🗂️</span><h3>${I18n.t("admin.dash.emptyOverviewTitle")}</h3><p>${I18n.t("admin.dash.emptyOverviewDesc")}</p></div>` : ""}
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.dash.overview"), I18n.t("admin.dash.overviewDesc"));
}

function adminDashboardFilterBarHtml(user) {
  const scope = adminDashboardScopeOptionsHtml(user, adminState.dashboardScope);
  const statusOptions = [["active", I18n.t("admin.dash.statusActive")], ["pending", I18n.t("admin.dash.statusPending")], ["escalated", I18n.t("admin.dash.statusEscalated")], ["hidden", I18n.t("admin.dash.statusHidden")], ["approved", I18n.t("admin.dash.statusApproved")], ["rejected", I18n.t("admin.dash.statusRejected")]];
  const moduleOptions = [["all", I18n.t("admin.dash.moduleAll")], ["community", I18n.t("admin.dash.moduleCommunity")], ["map", I18n.t("admin.dash.moduleMap")], ["study", I18n.t("admin.dash.moduleStudy")]];
  const sourceOptions = [["all", I18n.t("admin.dash.sourceAll")], ["submission", I18n.t("admin.dash.sourceSubmission")], ["report", I18n.t("admin.dash.sourceReport")], ["auto_flag", I18n.t("admin.dash.sourceAutoFlag")], ["admin", I18n.t("admin.dash.sourceAdmin")]];
  const select = (label, key, options, current) => `
    <label class="admin-filter-select">
      <span class="admin-filter-label">${escapeHtml(label)}</span>
      <select class="form-select" onchange="adminDashboardSetFilter('${key}', this.value)">
        ${options.map(([value, text]) => `<option value="${value}" ${value === current ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>`;
  return `<div class="admin-filters admin-dashboard-filters">
    ${scope}
    ${select(I18n.t("admin.dash.status"), "dashboardStatus", statusOptions, adminState.dashboardStatus)}
    ${select(I18n.t("admin.dash.module"), "dashboardModule", moduleOptions, adminState.dashboardModule)}
    ${select(I18n.t("admin.dash.source"), "dashboardSource", sourceOptions, adminState.dashboardSource)}
  </div>`;
}

function adminDashboardSetFilter(key, value) {
  if (!requireAdminAccess()) return;
  if (!["dashboardStatus", "dashboardModule", "dashboardSource"].includes(key)) return;
  adminState[key] = value;
  render();
}

function adminDashboardQueueRowHtml(item) {
  const preview = adminDashboardContentPreview(item);
  const module = adminDashboardModuleForContentType(item.contentType) || "other";
  const reportCount = window.ModerationService ? window.ModerationService.listReports({ contentType: item.contentType, contentId: item.contentId }, window.AuthService.getCurrentUser()).length : 0;
  const statusClass = { pending: "admin-status-pending", escalated: "admin-status-hidden", approved: "admin-status-visible", rejected: "admin-status-hidden", hidden: "admin-status-hidden" }[item.status] || "admin-status-pending";
  const scopeLabel = adminDashboardScopeLabel(item.scopeType, item.scopeId);
  return `
    <article class="admin-note-row admin-queue-row">
      <div class="admin-note-thumb"><span>${{ community: "📝", map: "🗺️", study: "📚" }[module] || "🗂️"}</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta">
          <span class="admin-status ${statusClass}">${escapeHtml(adminDashboardStatusLabel(item.status))}</span>
          <span class="admin-meta-badge">${escapeHtml(adminDashboardModuleLabel(module))}</span>
          <span class="admin-meta-badge">${escapeHtml(scopeLabel)}</span>
          <span>${escapeHtml(adminDashboardSourceLabel(item.source))}</span>
          ${Number(item.riskScore) > 0 ? `<span>${escapeHtml(I18n.t("admin.dash.risk", { score: Number(item.riskScore) }))}</span>` : ""}
          ${reportCount ? `<span>${escapeHtml(I18n.t(reportCount === 1 ? "admin.dash.reportCountOne" : "admin.dash.reportCountMany", { count: reportCount }))}</span>` : ""}
        </div>
        <p class="admin-note-content"><strong>${escapeHtml(preview.title)}</strong>${preview.detail ? ` — ${escapeHtml(preview.detail)}` : ""}</p>
        <div class="admin-note-foot"><span>${formatDate(item.createdAt, true)}</span>${item.assignedTo ? `<span>${escapeHtml(I18n.t("admin.dash.assignedTo", { id: item.assignedTo }))}</span>` : ""}</div>
        ${adminDashboardAssignControlHtml(item)}
      </div>
      <div class="admin-note-actions">
        ${module !== "other" ? `<button class="btn btn-outline btn-sm" onclick="adminDashboardReview('${module}')">${I18n.t("admin.dash.review")}</button>` : ""}
        ${item.status === "pending" ? `<button class="btn btn-outline btn-sm admin-danger" onclick="adminDashboardEscalate('${item.id}')">${I18n.t("admin.reason.escalateAction")}</button>` : ""}
      </div>
    </article>`;
}

// ADMIN-V2-005 spec section 15: "至少 Super Admin 可以 assign reviewer from
// case action" — minimal, deliberately no user-picker/directory (none exists
// in this app); a plain userId text field is the smallest thing that
// satisfies the spec without inventing a user-management feature that isn't
// this stage's job (that's closer to ADMIN-V2-007's Admin Management).
function adminDashboardAssignControlHtml(item) {
  const aps = window.AdminPermissionService;
  const user = window.AuthService.getCurrentUser();
  if (!aps || !aps.isSuperAdmin(user)) return "";
  return `
    <div class="admin-assign-control">
      <input type="text" class="form-input" id="admin-assign-input-${item.id}" placeholder="${escapeHtml(I18n.t("admin.dash.assignPlaceholder"))}" value="${escapeHtml(item.assignedTo || "")}" />
      <button type="button" class="btn btn-outline btn-sm" onclick="adminDashboardAssign('${item.id}')">${I18n.t("admin.dash.assignButton")}</button>
      ${item.assignedTo ? `<button type="button" class="btn btn-outline btn-sm" onclick="adminDashboardUnassign('${item.id}')">${I18n.t("admin.dash.unassignButton")}</button>` : ""}
    </div>`;
}

function adminDashboardAssign(itemId) {
  if (!requireAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  const input = document.getElementById(`admin-assign-input-${itemId}`);
  const value = input ? input.value.trim() : "";
  if (!value) return;
  try {
    window.ModerationService.assignModerationItem(itemId, value, user);
  } catch (error) {
    if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Assign failed.");
  }
  render();
}

function adminDashboardUnassign(itemId) {
  if (!requireAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  try {
    window.ModerationService.assignModerationItem(itemId, null, user);
  } catch (error) {
    if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Unassign failed.");
  }
  render();
}

// Wraps the leading count digits of an already-localized "{count} ..."
// string in the decorative <span class="match-count"> the admin CSS styles
// -- keeps the visual treatment without hardcoding English word order (every
// admin.dash.* count string below puts {count} first in en/ms/zh).
function adminDashboardCountHtml(localizedText, count) {
  return String(localizedText).replace(String(count), `<span class="match-count">${count}</span>`);
}

function adminDashboardReview(module) {
  if (!requireAdminAccess()) return;
  if (module === "community" || module === "map") adminSetSource(module);
  else if (module === "study") adminSetSource("study");
}

// ADMIN-V2-004: Escalate is deliberately the ONLY status-changing action the
// Dashboard performs directly against ModerationService.updateModerationStatus.
// Unlike Approve/Reject/Hide, "escalated" has no corresponding real
// content-visibility state in Community/Map/Study, so there is no risk of
// the queue diverging from what the public actually sees (the risk a fake
// Dashboard-level Approve/Reject/Hide button WOULD create, since those
// modules' true moderation actions live in their own workspace, reached via
// "Review"). This is a deliberate scope decision, not an oversight — see
// reports/REPORT_ADMIN-V2-004.md.
function adminDashboardEscalate(itemId) {
  if (!requireAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  adminOpenReasonPrompt({
    title: I18n.t("admin.reason.escalateTitle"),
    actionLabel: I18n.t("admin.reason.escalateAction"),
    requireReason: true,
    onConfirm: reason => {
      try {
        window.ModerationService.updateModerationStatus(itemId, "escalated", user, { reason });
        if (typeof showToast === "function") showToast(I18n.t("admin.reason.escalateAction"));
      } catch (error) {
        if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Escalate failed.");
      }
      render();
    },
  });
}

function renderAdminQueueView(container) {
  const user = window.AuthService.getCurrentUser();
  const ms = window.ModerationService;
  const rawItems = ms ? ms.listModerationItems({}, user) : [];
  const filtered = adminDashboardFilterItems(rawItems, {
    status: adminState.dashboardStatus,
    module: adminState.dashboardModule,
    source: adminState.dashboardSource,
    scope: adminState.dashboardScope,
  });
  const sorted = adminDashboardSortQueue(filtered);
  const body = `
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.dash.queueEyebrow")}</p><h2>${I18n.t("admin.dash.queue")}</h2><p>${adminDashboardCountHtml(escapeHtml(I18n.t("admin.dash.matchingCases", { count: sorted.length })), sorted.length)}</p></div></div>
      ${adminDashboardFilterBarHtml(user)}
      <div class="admin-note-list">
        ${sorted.length ? sorted.map(adminDashboardQueueRowHtml).join("") : `<div class="admin-empty"><span>🗂️</span><h3>${I18n.t("admin.dash.emptyQueueTitle")}</h3><p>${I18n.t("admin.dash.emptyQueueDesc")}</p></div>`}
      </div>
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.dash.queue"), I18n.t("admin.dash.queueDesc"));
}

function adminDashboardReportGroupRowHtml(group) {
  const module = adminDashboardModuleForContentType(group.contentType) || "other";
  const scopeLabel = adminDashboardScopeLabel(group.scopeType, group.scopeId);
  const categoryList = group.reports.map(report => report.category).filter((value, index, all) => all.indexOf(value) === index).join(", ");
  return `
    <article class="admin-note-row admin-queue-row">
      <div class="admin-note-thumb"><span>🚩</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta">
          <span class="admin-meta-badge">${escapeHtml(adminDashboardModuleLabel(module))}</span>
          <span class="admin-meta-badge">${escapeHtml(scopeLabel)}</span>
          <span><strong>${group.reportCount}</strong> ${escapeHtml(I18n.t(group.reportCount === 1 ? "admin.dash.reportWordOne" : "admin.dash.reportWordMany"))}</span>
          ${group.openCount ? `<span>${escapeHtml(I18n.t("admin.dash.openCount", { count: group.openCount }))}</span>` : ""}
        </div>
        <p class="admin-note-content"><strong>${escapeHtml(categoryList)}</strong> — ${escapeHtml(I18n.t("admin.dash.contentRef", { id: String(group.contentId) }))}</p>
        <div class="admin-note-foot"><span>${escapeHtml(I18n.t("admin.dash.latest", { date: formatDate(group.latestCreatedAt, true) }))}</span></div>
      </div>
      <div class="admin-note-actions">${module !== "other" ? `<button class="btn btn-outline btn-sm" onclick="adminDashboardReview('${module}')">${I18n.t("admin.dash.review")}</button>` : ""}</div>
    </article>`;
}

function renderAdminReportsView(container) {
  const user = window.AuthService.getCurrentUser();
  const ms = window.ModerationService;
  const rawReports = ms ? ms.listReports({}, user) : [];
  const scopeFiltered = adminState.dashboardScope && adminState.dashboardScope !== "all"
    ? rawReports.filter(report => {
        const [scopeType, scopeIdRaw] = adminState.dashboardScope.split(":");
        return report.scopeType === scopeType && (scopeIdRaw ? String(report.scopeId) === scopeIdRaw : true);
      })
    : rawReports;
  const groups = adminDashboardGroupReports(scopeFiltered);
  const summaryText = I18n.t("admin.dash.reportsSummary", { reportCount: scopeFiltered.length, caseCount: groups.length });
  const summaryHtml = summaryText
    .replace(String(scopeFiltered.length), `<span class="match-count">${scopeFiltered.length}</span>`)
    .replace(String(groups.length), `<span class="match-count">${groups.length}</span>`);
  const body = `
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.dash.reportsEyebrow")}</p><h2>${I18n.t("admin.dash.reports")}</h2><p>${summaryHtml}</p></div></div>
      <div class="admin-filters admin-dashboard-filters">${adminDashboardScopeOptionsHtml(user, adminState.dashboardScope)}</div>
      <div class="admin-note-list">
        ${groups.length ? groups.map(adminDashboardReportGroupRowHtml).join("") : `<div class="admin-empty"><span>🚩</span><h3>${I18n.t("admin.dash.emptyReportsTitle")}</h3><p>${I18n.t("admin.dash.emptyReportsDesc")}</p></div>`}
      </div>
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.dash.reports"), I18n.t("admin.dash.reportsDesc"));
}

function adminDashboardHistoryRowHtml(item) {
  const preview = adminDashboardContentPreview(item);
  const module = adminDashboardModuleForContentType(item.contentType) || "other";
  const scopeLabel = adminDashboardScopeLabel(item.scopeType, item.scopeId);
  const statusClass = item.status === "approved" ? "admin-status-visible" : "admin-status-hidden";
  return `
    <article class="admin-note-row admin-queue-row">
      <div class="admin-note-thumb"><span>${{ community: "📝", map: "🗺️", study: "📚" }[module] || "🗂️"}</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta">
          <span class="admin-status ${statusClass}">${escapeHtml(adminDashboardStatusLabel(item.status))}</span>
          <span class="admin-meta-badge">${escapeHtml(adminDashboardModuleLabel(module))}</span>
          <span class="admin-meta-badge">${escapeHtml(scopeLabel)}</span>
        </div>
        <p class="admin-note-content"><strong>${escapeHtml(preview.title)}</strong>${preview.detail ? ` — ${escapeHtml(preview.detail)}` : ""}</p>
        <div class="admin-note-foot"><span>${escapeHtml(I18n.t("admin.dash.resolvedAt", { date: item.resolvedAt ? formatDate(item.resolvedAt, true) : "—" }))}</span></div>
      </div>
    </article>`;
}

function renderAdminHistoryView(container) {
  const user = window.AuthService.getCurrentUser();
  const ms = window.ModerationService;
  const rawItems = ms ? ms.listModerationItems({}, user) : [];
  const scoped = adminDashboardFilterItems(rawItems, { scope: adminState.dashboardScope });
  const resolved = adminDashboardHistoryItems(scoped).sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));
  const body = `
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.dash.historyEyebrow")}</p><h2>${I18n.t("admin.dash.history")}</h2><p>${adminDashboardCountHtml(escapeHtml(I18n.t("admin.dash.resolvedCount", { count: resolved.length })), resolved.length)}</p></div></div>
      <div class="admin-filters admin-dashboard-filters">${adminDashboardScopeOptionsHtml(user, adminState.dashboardScope)}</div>
      <div class="admin-note-list">
        ${resolved.length ? resolved.map(adminDashboardHistoryRowHtml).join("") : `<div class="admin-empty"><span>📜</span><h3>${I18n.t("admin.dash.emptyHistoryTitle")}</h3><p>${I18n.t("admin.dash.emptyHistoryDesc")}</p></div>`}
      </div>
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.dash.history"), I18n.t("admin.dash.historyDesc"));
}

// --- Audit (ADMIN-V2-004) ---------------------------------------------------
//
// Reads exclusively through AdminAuditService.listAuditActions(), which
// itself scope-gates (see services/admin-audit-service.js's
// canAccessAuditScope) exactly like ModerationService — this view contains
// zero permission logic of its own, matching every other Dashboard view.

const ADMIN_AUDIT_ACTION_KEYS = Object.freeze({
  approve: "admin.audit.action.approve",
  reject: "admin.audit.action.reject",
  hide: "admin.audit.action.hide",
  restore: "admin.audit.action.restore",
  delete: "admin.audit.action.delete",
  escalate: "admin.audit.action.escalate",
  verify: "admin.audit.action.verify",
  edit_approve: "admin.audit.action.editApprove",
  grant: "admin.audit.action.grant",
  disable: "admin.audit.action.disable",
  enable: "admin.audit.action.enable",
  revoke: "admin.audit.action.revoke",
  assign: "admin.audit.action.assign",
  unassign: "admin.audit.action.unassign",
});
function adminAuditActionLabel(action) {
  const key = ADMIN_AUDIT_ACTION_KEYS[action];
  return key ? I18n.t(key) : action;
}

const ADMIN_AUDIT_TARGET_TYPE_KEYS = Object.freeze({
  post: "admin.audit.target.post",
  map_note: "admin.audit.target.mapNote",
  study_resource: "admin.audit.target.studyResource",
  role_assignment: "admin.audit.target.roleAssignment",
  report: "admin.audit.target.report",
});
function adminAuditTargetTypeLabel(targetType) {
  const key = ADMIN_AUDIT_TARGET_TYPE_KEYS[targetType];
  return key ? I18n.t(key) : targetType;
}

// Same scope-selector pattern as adminDashboardScopeOptionsHtml(), bound to
// adminState.auditScope instead of dashboardScope so the two filters never
// interfere with each other.
function adminAuditScopeOptionsHtml(user) {
  const options = adminDashboardVisibleScopes(user);
  if (!options.length) return "";
  const selected = options.some(option => option.value === adminState.auditScope) ? adminState.auditScope : options[0].value;
  if (adminState.auditScope !== selected) adminState.auditScope = selected;
  return `
    <label class="admin-filter-select admin-dashboard-scope">
      <span class="admin-filter-label">${I18n.t("admin.dash.scope")}</span>
      <select class="form-select" onchange="adminAuditSetFilter('auditScope', this.value)">
        ${options.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>`;
}

function adminAuditFilterBarHtml(user) {
  const targetOptions = [["all", I18n.t("admin.audit.targetAll")], ["post", I18n.t("admin.dash.moduleCommunity")], ["map_note", I18n.t("admin.dash.moduleMap")], ["study_resource", I18n.t("admin.dash.moduleStudy")], ["role_assignment", I18n.t("admin.audit.target.roleAssignment")]];
  const actionOptions = [["all", I18n.t("admin.audit.actionAll")]].concat(
    (window.AdminAuditService ? window.AdminAuditService.ACTIONS : []).map(action => [action, adminAuditActionLabel(action)])
  );
  const select = (label, key, options, current) => `
    <label class="admin-filter-select">
      <span class="admin-filter-label">${escapeHtml(label)}</span>
      <select class="form-select" onchange="adminAuditSetFilter('${key}', this.value)">
        ${options.map(([value, text]) => `<option value="${value}" ${value === current ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>`;
  return `<div class="admin-filters admin-dashboard-filters admin-audit-filters">
    ${adminAuditScopeOptionsHtml(user)}
    ${select(I18n.t("admin.audit.targetType"), "auditTargetType", targetOptions, adminState.auditTargetType)}
    ${select(I18n.t("admin.audit.action"), "auditAction", actionOptions, adminState.auditAction)}
    <label class="admin-filter-select">
      <span class="admin-filter-label">${I18n.t("admin.audit.actor")}</span>
      <input type="search" class="form-input" placeholder="${escapeHtml(I18n.t("admin.audit.actorPlaceholder"))}" value="${escapeHtml(adminState.auditActorSearch)}" oninput="adminAuditSetFilter('auditActorSearch', this.value)" />
    </label>
    <label class="admin-filter-select">
      <span class="admin-filter-label">${I18n.t("admin.audit.dateFrom")}</span>
      <input type="date" class="form-input" value="${escapeHtml(adminState.auditDateFrom)}" onchange="adminAuditSetFilter('auditDateFrom', this.value)" />
    </label>
    <label class="admin-filter-select">
      <span class="admin-filter-label">${I18n.t("admin.audit.dateTo")}</span>
      <input type="date" class="form-input" value="${escapeHtml(adminState.auditDateTo)}" onchange="adminAuditSetFilter('auditDateTo', this.value)" />
    </label>
  </div>`;
}

function adminAuditSetFilter(key, value) {
  if (!requireAdminAccess()) return;
  if (!["auditScope", "auditTargetType", "auditAction", "auditActorSearch", "auditDateFrom", "auditDateTo"].includes(key)) return;
  adminState[key] = value;
  render();
}

// Compact, already-sanitized (see AdminAuditService.sanitizeSnapshot)
// before/after preview -- one line each, safe to render as plain escaped text.
function adminAuditSnapshotText(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "—";
  try {
    return Object.entries(snapshot).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(", ") || "—";
  } catch {
    return "—";
  }
}

function adminAuditRowHtml(record) {
  const scopeLabel = adminDashboardScopeLabel(record.scopeType, record.scopeId);
  return `
    <article class="admin-note-row admin-queue-row admin-audit-row">
      <div class="admin-note-thumb"><span>🛡️</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta">
          <span class="admin-meta-badge">${escapeHtml(adminAuditActionLabel(record.action))}</span>
          <span class="admin-meta-badge">${escapeHtml(adminAuditTargetTypeLabel(record.targetType))}</span>
          <span class="admin-meta-badge">${escapeHtml(scopeLabel)}</span>
          <span>${escapeHtml(record.actorEmail || record.actorUserId)}</span>
        </div>
        <p class="admin-note-content"><strong>${escapeHtml(I18n.t("admin.dash.contentRef", { id: String(record.targetId) }))}</strong>${record.reason ? ` — ${escapeHtml(record.reason)}` : ` — ${escapeHtml(I18n.t("admin.audit.reasonNone"))}`}</p>
        <div class="admin-note-foot">
          <span>${escapeHtml(I18n.t("admin.audit.before"))}: ${escapeHtml(adminAuditSnapshotText(record.beforeSnapshot))}</span>
          <span>${escapeHtml(I18n.t("admin.audit.after"))}: ${escapeHtml(adminAuditSnapshotText(record.afterSnapshot))}</span>
          <span>${formatDate(record.createdAt, true)}</span>
        </div>
      </div>
    </article>`;
}

function renderAdminAuditView(container) {
  const user = window.AuthService.getCurrentUser();
  const service = window.AdminAuditService;
  const scopeFilter = adminState.auditScope && adminState.auditScope !== "all" ? adminState.auditScope.split(":") : null;
  const rawRecords = service ? service.listAuditActions({
    targetType: adminState.auditTargetType !== "all" ? adminState.auditTargetType : undefined,
    action: adminState.auditAction !== "all" ? adminState.auditAction : undefined,
    scopeType: scopeFilter ? scopeFilter[0] : undefined,
    scopeId: scopeFilter && scopeFilter[1] ? scopeFilter[1] : undefined,
    createdAtFrom: adminState.auditDateFrom ? new Date(adminState.auditDateFrom).toISOString() : undefined,
    createdAtTo: adminState.auditDateTo ? new Date(`${adminState.auditDateTo}T23:59:59.999Z`).toISOString() : undefined,
  }, user) : [];
  const search = adminState.auditActorSearch.trim().toLowerCase();
  const records = search
    ? rawRecords.filter(record => String(record.actorEmail || "").toLowerCase().includes(search) || String(record.actorUserId || "").toLowerCase().includes(search))
    : rawRecords;
  const body = `
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.audit.eyebrow")}</p><h2>${I18n.t("admin.audit.title")}</h2><p>${adminDashboardCountHtml(escapeHtml(I18n.t("admin.audit.matchingRecords", { count: records.length })), records.length)}</p></div></div>
      ${adminAuditFilterBarHtml(user)}
      <div class="admin-note-list">
        ${records.length ? records.map(adminAuditRowHtml).join("") : `<div class="admin-empty"><span>🛡️</span><h3>${I18n.t("admin.audit.emptyTitle")}</h3><p>${I18n.t("admin.audit.emptyDesc")}</p></div>`}
      </div>
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.audit.title"), I18n.t("admin.audit.desc"));
}
