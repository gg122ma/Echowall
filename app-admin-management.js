/**
 * ADMIN-V2-007 — Admin Management (Role Manager UI).
 *
 * Reached as a fourth admin source (`adminState.sourceType === "adminManagement"`),
 * alongside Community/Map/Study — same pattern app-study-admin.js already
 * established (a self-contained panel sharing `adminSidebarNavHtml()`).
 * Every mutation goes through services/admin-permission-service.js's own
 * grantRoleAssignment/setAssignmentStatus/revokeRoleAssignment, passing the
 * real signed-in user as `actor` so those functions self-gate to Super Admin
 * only and produce a real AuditAction (see that file's ADMIN-V2-007
 * comments) — this file itself contains ZERO permission logic beyond the
 * page-level `requireSuperAdminAccess()` gate below, matching every other
 * admin view's "no permission logic of its own" convention.
 *
 * SUPER_ADMIN is never assignable here (grantRoleAssignment itself refuses
 * it) — the bootstrap Super Admin and any legacy-compat account are shown
 * as read-only informational rows, never presented as manageable
 * assignments, per spec section 24/28.
 */

const ADMIN_MGMT_ASSIGNABLE_ROLES = Object.freeze(["GLOBAL_MODERATOR", "COLLEGE_ADMIN", "STUDY_MODERATOR", "CONTENT_REVIEWER"]);
const ADMIN_MGMT_ROLE_SCOPE_TYPE = Object.freeze({
  GLOBAL_MODERATOR: "global",
  COLLEGE_ADMIN: "college",
  STUDY_MODERATOR: "study",
  CONTENT_REVIEWER: "global",
});

function requireSuperAdminAccess() {
  const user = window.AuthService?.getCurrentUser?.();
  if (window.AdminPermissionService?.isSuperAdmin?.(user)) return true;
  if (typeof showToast === "function") showToast(I18n.t("admin.accessDenied"));
  if (typeof getRoute === "function" && getRoute().page === "admin") render();
  return false;
}

function adminMgmtRoleLabel(role) {
  return I18n.t(`admin.mgmt.role.${role}`) || role;
}

function adminMgmtScopeLabel(assignment) {
  if (assignment.scopeType === "college") {
    const org = typeof organizations !== "undefined" ? organizations.find(o => String(o.id) === String(assignment.scopeId)) : null;
    return org ? org.name : `College ${assignment.scopeId}`;
  }
  if (assignment.scopeType === "global") return I18n.t("admin.dash.scopeGlobal");
  if (assignment.scopeType === "study") return I18n.t("admin.dash.scopeStudy");
  return assignment.scopeType;
}

function adminMgmtRoleOptionsHtml(selected) {
  return ADMIN_MGMT_ASSIGNABLE_ROLES.map(role => `<option value="${role}" ${role === selected ? "selected" : ""}>${escapeHtml(adminMgmtRoleLabel(role))}</option>`).join("");
}

function adminMgmtCollegeOptionsHtml() {
  const orgs = typeof organizations !== "undefined" && Array.isArray(organizations) ? organizations : [];
  return orgs.map(org => `<option value="${org.id}">${escapeHtml(org.name)}</option>`).join("");
}

function adminMgmtGrantFormHtml() {
  return `
    <div class="admin-panel admin-mgmt-grant-form">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.mgmt.grantEyebrow")}</p><h2>${I18n.t("admin.mgmt.grantTitle")}</h2></div></div>
      <div class="study-upload-grid">
        <div class="form-group"><label class="form-label">${I18n.t("admin.mgmt.userIdLabel")}</label><input id="admin-mgmt-userid" class="form-input" type="text" placeholder="${escapeHtml(I18n.t("admin.mgmt.userIdPlaceholder"))}" /></div>
        <div class="form-group"><label class="form-label">${I18n.t("admin.mgmt.roleLabel")}</label><select id="admin-mgmt-role" class="form-select" onchange="adminMgmtOnRoleChange()">${adminMgmtRoleOptionsHtml("COLLEGE_ADMIN")}</select></div>
        <div class="form-group" id="admin-mgmt-college-field"><label class="form-label">${I18n.t("admin.mgmt.collegeLabel")}</label><select id="admin-mgmt-scopeid" class="form-select">${adminMgmtCollegeOptionsHtml()}</select></div>
      </div>
      <div class="admin-study-form-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick="adminMgmtGrant()">${I18n.t("admin.mgmt.grantAction")}</button>
      </div>
    </div>`;
}

function adminMgmtOnRoleChange() {
  const role = document.getElementById("admin-mgmt-role")?.value;
  const field = document.getElementById("admin-mgmt-college-field");
  if (field) field.style.display = ADMIN_MGMT_ROLE_SCOPE_TYPE[role] === "college" ? "" : "none";
}

function adminMgmtAssignmentRowHtml(assignment) {
  const disabled = assignment.status === "disabled";
  return `
    <article class="admin-note-row admin-mgmt-row">
      <div class="admin-note-thumb"><span>${disabled ? "🚫" : "🛡️"}</span></div>
      <div class="admin-note-main">
        <div class="admin-note-meta">
          <span class="admin-status ${disabled ? "admin-status-hidden" : "admin-status-visible"}">${escapeHtml(disabled ? I18n.t("admin.mgmt.statusDisabled") : I18n.t("admin.mgmt.statusActive"))}</span>
          <span class="admin-meta-badge">${escapeHtml(adminMgmtRoleLabel(assignment.role))}</span>
          <span class="admin-meta-badge">${escapeHtml(adminMgmtScopeLabel(assignment))}</span>
        </div>
        <p class="admin-note-content"><strong>${escapeHtml(assignment.userId)}</strong></p>
        <div class="admin-note-foot"><span>${I18n.t("admin.mgmt.grantedAt")}: ${formatDate(assignment.grantedAt, true)}</span>${assignment.grantedBy ? `<span>${I18n.t("admin.mgmt.grantedBy")}: ${escapeHtml(assignment.grantedBy)}</span>` : ""}</div>
      </div>
      <div class="admin-note-actions">
        ${disabled
          ? `<button type="button" class="btn btn-outline btn-sm" onclick="adminMgmtSetStatus('${assignment.id}','active')">${I18n.t("admin.mgmt.reEnable")}</button>`
          : `<button type="button" class="btn btn-outline btn-sm" onclick="adminMgmtSetStatus('${assignment.id}','disabled')">${I18n.t("admin.mgmt.disable")}</button>`}
        <button type="button" class="btn btn-outline btn-sm admin-danger" onclick="adminMgmtRevoke('${assignment.id}')">${I18n.t("admin.mgmt.revoke")}</button>
      </div>
    </article>`;
}

function adminMgmtBootstrapInfoHtml() {
  const aps = window.AdminPermissionService;
  const superEmail = aps?.SUPER_ADMIN_EMAIL || "";
  return `
    <div class="admin-mgmt-info-note">
      <p><strong>${I18n.t("admin.mgmt.superAdminLabel")}:</strong> ${escapeHtml(superEmail)} — ${I18n.t("admin.mgmt.superAdminNote")}</p>
      <p>${I18n.t("admin.mgmt.legacyNote")}</p>
    </div>`;
}

function renderAdminManagementView(container) {
  const user = window.AuthService.getCurrentUser();
  const aps = window.AdminPermissionService;
  const assignments = aps ? aps.listAllRoleAssignments() : [];
  const body = `
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.mgmt.eyebrow")}</p><h2>${I18n.t("admin.mgmt.title")}</h2><p>${I18n.t("admin.mgmt.desc")}</p></div></div>
      ${adminMgmtBootstrapInfoHtml()}
    </section>
    ${adminMgmtGrantFormHtml()}
    <section class="admin-panel">
      <div class="admin-panel-header"><div><p class="eyebrow">${I18n.t("admin.mgmt.listEyebrow")}</p><h2>${I18n.t("admin.mgmt.listTitle")}</h2><p>${adminDashboardCountHtml(escapeHtml(I18n.t("admin.mgmt.matchingRecords", { count: assignments.length })), assignments.length)}</p></div></div>
      <div class="admin-note-list">
        ${assignments.length ? assignments.map(adminMgmtAssignmentRowHtml).join("") : `<div class="admin-empty"><span>🛡️</span><h3>${I18n.t("admin.mgmt.emptyTitle")}</h3><p>${I18n.t("admin.mgmt.emptyDesc")}</p></div>`}
      </div>
    </section>`;
  renderAdminDashboardShell(container, body, user, I18n.t("admin.mgmt.title"), I18n.t("admin.mgmt.desc"));
}

function adminMgmtGrant() {
  if (!requireSuperAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  const userId = document.getElementById("admin-mgmt-userid")?.value?.trim();
  const role = document.getElementById("admin-mgmt-role")?.value;
  const scopeType = ADMIN_MGMT_ROLE_SCOPE_TYPE[role];
  const scopeIdRaw = document.getElementById("admin-mgmt-scopeid")?.value;
  if (!userId) {
    if (typeof showToast === "function") showToast(I18n.t("admin.mgmt.userIdRequired"));
    return;
  }
  try {
    window.AdminPermissionService.grantRoleAssignment({
      userId,
      role,
      scopeType,
      scopeId: scopeType === "college" ? Number(scopeIdRaw) : null,
      grantedBy: user.id,
      actor: user,
    });
    if (typeof showToast === "function") showToast(I18n.t("admin.mgmt.granted"));
    render();
  } catch (error) {
    if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Grant failed.");
  }
}

function adminMgmtSetStatus(id, status) {
  if (!requireSuperAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  try {
    window.AdminPermissionService.setAssignmentStatus(id, status, user);
    if (typeof showToast === "function") showToast(status === "disabled" ? I18n.t("admin.mgmt.disabled") : I18n.t("admin.mgmt.reEnabled"));
    render();
  } catch (error) {
    if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Update failed.");
  }
}

function adminMgmtRevoke(id) {
  if (!requireSuperAdminAccess()) return;
  const user = window.AuthService.getCurrentUser();
  adminOpenReasonPrompt({
    title: I18n.t("admin.mgmt.revokeTitle"),
    actionLabel: I18n.t("admin.mgmt.revoke"),
    requireReason: false,
    onConfirm: () => {
      try {
        window.AdminPermissionService.revokeRoleAssignment(id, user);
        if (typeof showToast === "function") showToast(I18n.t("admin.mgmt.revoked"));
      } catch (error) {
        if (typeof showToast === "function") showToast(error instanceof Error ? error.message : "Revoke failed.");
      }
      render();
    },
  });
}
