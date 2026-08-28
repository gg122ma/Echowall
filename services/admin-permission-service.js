/**
 * ADMIN-V2-001 — Role / Scope Contract.
 *
 * Single source of truth for "who can moderate what" across Echo Wall.
 * Everything downstream (app-admin.js, app-study-admin.js,
 * services/study-submission-service.js, services/permission-service.js)
 * must ask THIS service, never re-derive an answer from `user.role` or an
 * email whitelist of its own. See CLAUDE.md's script-load-order note —
 * this file loads right after services/auth-service.js.
 *
 * IMPORTANT — this is prototype/front-end enforcement only, not a real
 * security boundary. Every check below can be bypassed by calling app
 * functions directly from the browser console. Production writes still
 * require the write itself to be re-authorized server-side (e.g. Supabase
 * RLS keyed off `auth.uid()`/a trusted `user_roles` table — see
 * docs/BACKEND_INTEGRATION_READINESS.md section 5). This module's contract
 * shape (RoleAssignment: id/userId/role/scopeType/scopeId/permissions/
 * status/grantedBy/grantedAt/updatedAt) is deliberately close to that
 * eventual `user_roles` table so a later backend swap changes the
 * provider only, not any caller.
 *
 * Super Admin bootstrap: SUPER_ADMIN_EMAIL below is the ONLY place in the
 * ENTIRE codebase this project hardcodes the super-admin email (ADMIN-V2-001A
 * removed the duplicate that used to also live in services/auth-service.js's
 * PROTOTYPE_ADMIN_EMAILS). Do not add a second hardcoded check anywhere
 * else — call isSuperAdmin(user) instead. isSuperAdmin() checks `email`
 * only, never `role` — a Super Admin's AuthService-derived `user.role` can
 * be `"user"` and this must still resolve correctly (proven by
 * scripts/test-admin-role-scope.mjs's "independent of legacy role" check).
 *
 * Legacy compatibility: services/auth-service.js's own PROTOTYPE_ADMIN_EMAILS
 * whitelist now contains ONLY the true legacy prototype admin
 * (mzteoh88@gmail.com) — it remains the one source of truth for the
 * pre-existing binary `user.role === "admin"` field other legacy code
 * paths still read, but no longer doubles as a second place the
 * super-admin email is declared. This service does NOT re-declare that
 * whitelist; it detects "legacy admin" purely from `user.role === "admin"`
 * combined with NOT being the super admin email — that second condition is
 * what keeps this forward-compatible even if a future account somehow
 * carried both a legacy `role: "admin"` and the super-admin email. A
 * legacy admin keeps exactly the moderation capability the pre-Admin-V2
 * app already gave every admin (Community + Map + Study moderation) but is
 * explicitly NOT a Super Admin — no ADMIN_MANAGE, no AUDIT_READ_ALL, no
 * college-scope isolation bypass beyond what already existed.
 */
(function () {
  const SUPER_ADMIN_EMAIL = "greencucumbertube@gmail.com";
  const ROLE_ASSIGNMENTS_KEY = "echo-wall-role-assignments:v1";

  const ROLES = Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    GLOBAL_MODERATOR: "GLOBAL_MODERATOR",
    COLLEGE_ADMIN: "COLLEGE_ADMIN",
    STUDY_MODERATOR: "STUDY_MODERATOR",
    CONTENT_REVIEWER: "CONTENT_REVIEWER",
  });

  // Internal-only pseudo-role. Never assignable via grantRoleAssignment(),
  // never surfaced in a future Role Manager UI (ADMIN-V2-007) — it exists
  // solely so getRoleAssignments() can represent "this email is on the
  // legacy admin whitelist" as one more assignment the rest of this file's
  // permission math already knows how to fold in, instead of a parallel
  // if/else bolted onto every permission check below.
  const LEGACY_ADMIN_PSEUDO_ROLE = "LEGACY_ADMIN";

  const SCOPE_TYPES = Object.freeze({
    GLOBAL: "global",
    COLLEGE: "college",
    STUDY: "study",
    SYSTEM: "system",
  });

  const STATUS = Object.freeze({
    ACTIVE: "active",
    DISABLED: "disabled",
  });

  const PERMISSIONS = Object.freeze({
    ADMIN_MANAGE: "ADMIN_MANAGE",
    AUDIT_READ_ALL: "AUDIT_READ_ALL",
    GLOBAL_COMMUNITY_MODERATE: "GLOBAL_COMMUNITY_MODERATE",
    COLLEGE_COMMUNITY_MODERATE: "COLLEGE_COMMUNITY_MODERATE",
    COLLEGE_BUILDING_MODERATE: "COLLEGE_BUILDING_MODERATE",
    COLLEGE_EVENT_MODERATE: "COLLEGE_EVENT_MODERATE",
    STUDY_RESOURCE_MODERATE: "STUDY_RESOURCE_MODERATE",
    CONTENT_REVIEW: "CONTENT_REVIEW",
  });

  const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

  const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
    [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
    [ROLES.GLOBAL_MODERATOR]: Object.freeze([PERMISSIONS.GLOBAL_COMMUNITY_MODERATE]),
    [ROLES.COLLEGE_ADMIN]: Object.freeze([
      PERMISSIONS.COLLEGE_COMMUNITY_MODERATE,
      PERMISSIONS.COLLEGE_BUILDING_MODERATE,
      PERMISSIONS.COLLEGE_EVENT_MODERATE,
    ]),
    [ROLES.STUDY_MODERATOR]: Object.freeze([PERMISSIONS.STUDY_RESOURCE_MODERATE]),
    [ROLES.CONTENT_REVIEWER]: Object.freeze([PERMISSIONS.CONTENT_REVIEW]),
    // Legacy admin keeps exactly its pre-Admin-V2 real capability: the
    // notes/map admin panel (GLOBAL_COMMUNITY_MODERATE covers both, since
    // app-admin.js has always gated Community and Map with the same single
    // check) and Study moderation. No ADMIN_MANAGE/AUDIT_READ_ALL — those
    // are new Super-Admin-tier capabilities that never existed before.
    [LEGACY_ADMIN_PSEUDO_ROLE]: Object.freeze([
      PERMISSIONS.GLOBAL_COMMUNITY_MODERATE,
      PERMISSIONS.STUDY_RESOURCE_MODERATE,
    ]),
  });

  const ROLE_DEFAULT_SCOPE_TYPE = Object.freeze({
    [ROLES.SUPER_ADMIN]: SCOPE_TYPES.SYSTEM,
    [ROLES.GLOBAL_MODERATOR]: SCOPE_TYPES.GLOBAL,
    [ROLES.COLLEGE_ADMIN]: SCOPE_TYPES.COLLEGE,
    [ROLES.STUDY_MODERATOR]: SCOPE_TYPES.STUDY,
    [ROLES.CONTENT_REVIEWER]: SCOPE_TYPES.GLOBAL,
  });

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function isSuperAdminEmail(email) {
    return normalizeEmail(email) === SUPER_ADMIN_EMAIL;
  }

  function isSuperAdmin(user) {
    return Boolean(user && isSuperAdminEmail(user.email));
  }

  // See the file header comment: this reads the EXISTING role field that
  // services/auth-service.js already computes from its own
  // PROTOTYPE_ADMIN_EMAILS whitelist -- it does not hardcode a second
  // email list.
  function isLegacyAdmin(user) {
    return Boolean(user && user.role === "admin" && !isSuperAdminEmail(user.email));
  }

  // --- Storage (provider-swappable prototype persistence) -----------------

  function readAssignmentsRaw() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ROLE_ASSIGNMENTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAssignmentsRaw(list) {
    try {
      localStorage.setItem(ROLE_ASSIGNMENTS_KEY, JSON.stringify(list));
    } catch {
      // Local prototype persistence is best-effort; in-memory callers still
      // see the assignment for the rest of this page life.
    }
  }

  const LocalRoleAssignmentProvider = Object.freeze({
    name: "local-prototype",
    list: readAssignmentsRaw,
    save: writeAssignmentsRaw,
  });

  let activeProvider = LocalRoleAssignmentProvider;

  // Swap in a future backend-backed provider (e.g. Supabase `user_roles`)
  // without touching any caller of this service. provider must expose
  // list(): RoleAssignment[] and save(list: RoleAssignment[]): void.
  function useProvider(provider) {
    if (!provider || typeof provider.list !== "function" || typeof provider.save !== "function") {
      throw new Error("A RoleAssignment provider must implement list() and save().");
    }
    activeProvider = provider;
  }

  function makeVirtualAssignment(user, role, scopeType, scopeId, grantedBy) {
    return Object.freeze({
      id: `virtual_${role}_${user.id}`,
      userId: user.id,
      role,
      scopeType,
      scopeId: scopeId == null ? null : scopeId,
      permissions: ROLE_DEFAULT_PERMISSIONS[role] || [],
      status: STATUS.ACTIVE,
      grantedBy,
      grantedAt: null,
      updatedAt: null,
      virtual: true,
    });
  }

  function getStoredAssignmentsForUser(userId) {
    if (!userId) return [];
    return activeProvider.list().filter(assignment => assignment && String(assignment.userId) === String(userId));
  }

  // Returns every ACTIVE RoleAssignment this user currently holds --
  // bootstrap (Super Admin), legacy-compat (pre-Admin-V2 whitelist), and
  // real stored assignments, combined. Disabled stored assignments are
  // excluded here so every other function in this file can treat the
  // result as "what this user can use right now" without re-checking
  // status itself.
  function getRoleAssignments(user) {
    if (!user) return [];
    const assignments = [];
    if (isSuperAdmin(user)) {
      assignments.push(makeVirtualAssignment(user, ROLES.SUPER_ADMIN, SCOPE_TYPES.SYSTEM, null, "bootstrap"));
    }
    if (isLegacyAdmin(user)) {
      assignments.push(makeVirtualAssignment(user, LEGACY_ADMIN_PSEUDO_ROLE, SCOPE_TYPES.GLOBAL, null, "legacy-compat"));
    }
    getStoredAssignmentsForUser(user.id)
      .filter(assignment => assignment.status !== STATUS.DISABLED)
      .forEach(assignment => assignments.push(assignment));
    return assignments;
  }

  function permissionsForAssignment(assignment) {
    if (!assignment || assignment.status === STATUS.DISABLED) return [];
    if (Array.isArray(assignment.permissions) && assignment.permissions.length) return assignment.permissions;
    return ROLE_DEFAULT_PERMISSIONS[assignment.role] || [];
  }

  function hasRole(user, role) {
    return getRoleAssignments(user).some(assignment => assignment.role === role);
  }

  // Union across every active assignment -- SUPER_ADMIN always short-
  // circuits true, matching "SUPER_ADMIN -> all permissions" regardless of
  // how PERMISSIONS grows in later Admin V2 stages.
  function hasPermission(user, permission) {
    if (isSuperAdmin(user)) return true;
    return getRoleAssignments(user).some(assignment => permissionsForAssignment(assignment).includes(permission));
  }

  // scopeId === null on an assignment means "every scopeId within that
  // scopeType" (e.g. a GLOBAL_MODERATOR's global assignment, or a
  // STUDY_MODERATOR's study assignment) -- college assignments always
  // carry an explicit scopeId and never implicitly widen.
  function canAccessScope(user, scopeType, scopeId = null) {
    if (isSuperAdmin(user)) return true;
    return getRoleAssignments(user).some(assignment => {
      if (assignment.scopeType !== scopeType) return false;
      if (assignment.scopeId == null) return true;
      return scopeId != null && String(assignment.scopeId) === String(scopeId);
    });
  }

  function canModerateGlobalCommunity(user) {
    return hasPermission(user, PERMISSIONS.GLOBAL_COMMUNITY_MODERATE);
  }

  function canModerateCollegeWithPermission(user, collegeId, permission) {
    if (isSuperAdmin(user)) return true;
    if (collegeId == null) return false;
    return getRoleAssignments(user).some(assignment =>
      assignment.scopeType === SCOPE_TYPES.COLLEGE
      && String(assignment.scopeId) === String(collegeId)
      && permissionsForAssignment(assignment).includes(permission)
    );
  }

  // Deliberately does NOT fall back to canModerateGlobalCommunity(): a
  // Global Moderator moderates global:all only, never an individual
  // college (see ADMIN-V2-001 spec section 8/K -- "Global Moderator 不能
  // 管理 College"). College isolation is real: a KMK College Admin
  // assignment never grants KMPP, and vice versa.
  function canModerateCollege(user, collegeId) {
    return canModerateCollegeWithPermission(user, collegeId, PERMISSIONS.COLLEGE_COMMUNITY_MODERATE);
  }

  function canModerateCollegeBuilding(user, collegeId) {
    return canModerateCollegeWithPermission(user, collegeId, PERMISSIONS.COLLEGE_BUILDING_MODERATE);
  }

  function canModerateCollegeEvent(user, collegeId) {
    return canModerateCollegeWithPermission(user, collegeId, PERMISSIONS.COLLEGE_EVENT_MODERATE);
  }

  function canModerateStudy(user) {
    return hasPermission(user, PERMISSIONS.STUDY_RESOURCE_MODERATE);
  }

  // ADMIN-V2-FINAL-CORRECTION — single source of truth for "can this user
  // moderate Community/Building content at this specific resolved scope",
  // shared by the Old Community workspace (app-admin.js's
  // getAdminCommunityNotes()/adminCanModerateNote()), the Unified Queue
  // (services/moderation-service.js), the Dashboard, and AdminAuditService
  // reads — replaces the earlier (incorrect) practice of using
  // canModerateGlobalCommunity() as a blanket "sees every college too"
  // bypass, which also matched a real GLOBAL_MODERATOR (they legitimately
  // hold GLOBAL_COMMUNITY_MODERATE for the Global/"All KM Students"
  // community, but the Permission Matrix explicitly denies them College
  // Community/Building: "GLOBAL_MODERATOR 不允许: College Community").
  // Semantics:
  //   SUPER_ADMIN      -> true for every scope
  //   LEGACY_ADMIN     -> true for every scope (preserves the documented,
  //                       pre-Admin-V2 "one admin tier, no college
  //                       distinction" compatibility this pseudo-role has
  //                       always represented — NOT extended to a real
  //                       GLOBAL_MODERATOR)
  //   scopeType=global -> canModerateGlobalCommunity(user) (a real
  //                       GLOBAL_MODERATOR passes here, and ONLY here)
  //   scopeType=college -> canModerateCollege(user, scopeId) (a real
  //                       COLLEGE_ADMIN passes only for their own college)
  //   anything else     -> false
  function canModerateCommunityContent(user, scopeType, scopeId) {
    if (isSuperAdmin(user)) return true;
    if (isLegacyAdmin(user)) return true;
    if (scopeType === SCOPE_TYPES.GLOBAL) return canModerateGlobalCommunity(user);
    if (scopeType === SCOPE_TYPES.COLLEGE) return canModerateCollege(user, scopeId);
    return false;
  }

  // ADMIN-V2-003A/FINAL-CORRECTION — single source of truth for "can this
  // user moderate Echo Map notes", shared by the Old Map Admin tab
  // (app-admin.js), services/moderation-service.js's Unified Queue scope
  // gate, and the dashboard (app-admin-dashboard.js).
  //
  // FINAL-CORRECTION: this used to fall back to canModerateGlobalCommunity(user)
  // — true for a real GLOBAL_MODERATOR too, incorrectly granting them KMK
  // Map access the Permission Matrix explicitly denies ("GLOBAL_MODERATOR
  // 不允许: College Map"). Fixed to check isLegacyAdmin(user) directly
  // instead — legacy admin keeps EXACTLY its existing Map compatibility
  // (Map has always been reachable from the Old Map Admin tab via the same
  // gate as Community, which legacy admin passes); a real GLOBAL_MODERATOR
  // now correctly gets false. A real per-college COLLEGE_ADMIN of that
  // orgId still passes via the canModerateCollege fallback, unchanged.
  // Semantics: SUPER_ADMIN -> true; LEGACY_ADMIN -> true (current canonical
  // KMK Map compatibility only); matching COLLEGE_ADMIN -> true;
  // GLOBAL_MODERATOR/STUDY_MODERATOR/Student/Guest -> false.
  function canModerateMap(user, orgId) {
    if (isSuperAdmin(user)) return true;
    if (isLegacyAdmin(user)) return true;
    if (orgId == null) return false;
    return canModerateCollege(user, orgId);
  }

  // The generic "#/admin shell is reachable at all" gate -- true for
  // anyone holding at least one active RoleAssignment (real or virtual/
  // bootstrap), regardless of which specific sections that assignment
  // actually unlocks. Individual sections (Community/Map tabs, Study tab)
  // still gate themselves with the specific permission check above.
  function canAccessAdminPanel(user) {
    return getRoleAssignments(user).length > 0;
  }

  // --- RoleAssignment CRUD (prototype persistence; ADMIN-V2-007 Role
  // Manager UI is built directly on these same functions) -------------------

  // ADMIN-V2-007: SUPER_ADMIN is deliberately NOT assignable through this
  // path (spec section 24: "不要允许 UI 创建第二个 SUPER_ADMIN") -- the
  // ONLY Super Admin is the bootstrap SUPER_ADMIN_EMAIL constant at the top
  // of this file. LEGACY_ADMIN_PSEUDO_ROLE was already excluded (it's a
  // derived, internal-only pseudo-role -- see its own comment above).
  function assertKnownRole(role) {
    if (!ROLE_DEFAULT_PERMISSIONS[role] || role === LEGACY_ADMIN_PSEUDO_ROLE || role === ROLES.SUPER_ADMIN) {
      throw new Error(`Unknown or non-assignable role: ${role}`);
    }
  }

  function assertKnownScopeType(scopeType) {
    if (!Object.values(SCOPE_TYPES).includes(scopeType)) throw new Error(`Unknown scopeType: ${scopeType}`);
  }

  // ADMIN-V2-007 spec section 25: a role may only ever be granted its own
  // natural scope type -- e.g. COLLEGE_ADMIN + scopeType "study" is invalid,
  // not just unusual. Checked even when the caller didn't pass scopeType
  // explicitly (resolvedScopeType still must match) so this can never be
  // silently bypassed by a future caller that starts passing scopeType.
  const ROLE_ALLOWED_SCOPE_TYPES = Object.freeze({
    [ROLES.GLOBAL_MODERATOR]: SCOPE_TYPES.GLOBAL,
    [ROLES.COLLEGE_ADMIN]: SCOPE_TYPES.COLLEGE,
    [ROLES.STUDY_MODERATOR]: SCOPE_TYPES.STUDY,
    [ROLES.CONTENT_REVIEWER]: SCOPE_TYPES.GLOBAL,
  });

  function assertValidRoleScopeCombo(role, scopeType) {
    const allowed = ROLE_ALLOWED_SCOPE_TYPES[role];
    if (allowed && scopeType !== allowed) {
      throw new Error(`Invalid role/scope combination: ${role} must be scopeType "${allowed}", got "${scopeType}".`);
    }
  }

  // ADMIN-V2-007: `actor` is the full calling-user object (optional, kept
  // backward-compatible with every ADMIN-V2-001-era caller that only ever
  // passed `grantedBy` as a raw id) -- when present, creates the unified
  // grant/disable/enable/revoke AuditAction spec section 27 requires,
  // scoped "system" (Super-Admin/AUDIT_READ_ALL-only reads -- role
  // management is never visible in a college/study-scoped Audit view).
  //
  // ADMIN-V2-FINAL-CORRECTION: when `actor` is supplied (a real,
  // Admin-initiated call through app-admin-management.js), audit is now a
  // REQUIRED dependency, not best-effort -- this throws if AdminAuditService
  // is missing or itself throws, and callers below invoke this BEFORE
  // committing their mutation so a failed audit never lets the role change
  // apply anyway. Calls with no `actor` (ADMIN-V2-001-era test fixtures
  // setting up scenarios directly, outside any authenticated request) are
  // unchanged -- they skip audit entirely, exactly as before.
  function logRoleAuditAction(actor, action, targetUserId, before, after) {
    if (!actor) return;
    if (!window.AdminAuditService || typeof window.AdminAuditService.createAuditAction !== "function") {
      throw new Error("AdminAuditService is required to perform this role action.");
    }
    window.AdminAuditService.createAuditAction({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action,
      targetType: "role_assignment",
      targetId: String(targetUserId),
      scopeType: SCOPE_TYPES.SYSTEM,
      scopeId: null,
      beforeSnapshot: before,
      afterSnapshot: after,
      reason: null,
    }, actor);
  }

  // ADMIN-V2-007: when `actor` is supplied, this now self-gates to Super
  // Admin only -- real UI callers (app-admin-management.js) always pass it;
  // omitting it keeps every ADMIN-V2-001-era test fixture call (which sets
  // up scenarios directly, outside any authenticated request) working
  // unchanged, matching this function's existing "data accessor, not a UI
  // entry point" contract for callers that don't supply an actor.
  function grantRoleAssignment({ userId, role, scopeType, scopeId = null, permissions, status, grantedBy = null, actor = null } = {}) {
    if (actor && !isSuperAdmin(actor)) throw new Error("Only a Super Admin can grant a RoleAssignment.");
    if (!userId) throw new Error("userId is required to grant a RoleAssignment.");
    assertKnownRole(role);
    const resolvedScopeType = scopeType || ROLE_DEFAULT_SCOPE_TYPE[role];
    assertKnownScopeType(resolvedScopeType);
    assertValidRoleScopeCombo(role, resolvedScopeType);
    if (resolvedScopeType === SCOPE_TYPES.COLLEGE && scopeId == null) {
      throw new Error("A COLLEGE_ADMIN assignment requires an explicit scopeId (the college's orgId).");
    }
    const now = new Date().toISOString();
    const assignment = {
      id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: String(userId),
      role,
      scopeType: resolvedScopeType,
      scopeId: scopeId == null ? null : scopeId,
      permissions: Array.isArray(permissions) && permissions.length ? permissions.slice() : (ROLE_DEFAULT_PERMISSIONS[role] || []).slice(),
      status: status === STATUS.DISABLED ? STATUS.DISABLED : STATUS.ACTIVE,
      grantedBy: grantedBy == null ? null : String(grantedBy),
      grantedAt: now,
      updatedAt: now,
    };
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- if logRoleAuditAction throws
    // (actor supplied, AdminAuditService missing/failing), the list is never
    // pushed/saved below, so a failed audit leaves no grant behind.
    logRoleAuditAction(actor, "grant", userId, null, { role, scopeType: resolvedScopeType, scopeId: assignment.scopeId, status: assignment.status });
    const list = activeProvider.list();
    list.push(assignment);
    activeProvider.save(list);
    return assignment;
  }

  function setAssignmentStatus(id, status, actor = null) {
    if (actor && !isSuperAdmin(actor)) throw new Error("Only a Super Admin can change a RoleAssignment's status.");
    const normalizedStatus = status === STATUS.DISABLED ? STATUS.DISABLED : STATUS.ACTIVE;
    const list = activeProvider.list();
    const index = list.findIndex(assignment => assignment.id === id);
    if (index < 0) throw new Error(`RoleAssignment not found: ${id}`);
    const before = list[index];
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- see grantRoleAssignment's
    // identical comment above.
    logRoleAuditAction(actor, normalizedStatus === STATUS.DISABLED ? "disable" : "enable", before.userId,
      { role: before.role, status: before.status }, { role: before.role, status: normalizedStatus });
    list[index] = { ...before, status: normalizedStatus, updatedAt: new Date().toISOString() };
    activeProvider.save(list);
    return list[index];
  }

  // ADMIN-V2-007: "Revoke" is a hard, permanent removal of the assignment
  // row -- distinct from "Disable" (reversible via "Re-enable",
  // setAssignmentStatus above). Only ever operates on a REAL stored
  // assignment (never the bootstrap Super Admin or legacy-compat virtual
  // assignments -- those have no row in activeProvider.list() at all, so
  // this naturally throws "not found" for them rather than needing a
  // separate guard).
  function revokeRoleAssignment(id, actor = null) {
    if (actor && !isSuperAdmin(actor)) throw new Error("Only a Super Admin can revoke a RoleAssignment.");
    const list = activeProvider.list();
    const index = list.findIndex(assignment => assignment.id === id);
    if (index < 0) throw new Error(`RoleAssignment not found: ${id}`);
    const removed = list[index];
    // ADMIN-V2-FINAL-CORRECTION: audit-first -- see grantRoleAssignment's
    // identical comment above; the splice below never runs if this throws.
    logRoleAuditAction(actor, "revoke", removed.userId, { role: removed.role, scopeType: removed.scopeType, scopeId: removed.scopeId, status: removed.status }, null);
    list.splice(index, 1);
    activeProvider.save(list);
    return removed;
  }

  // Full read including disabled rows -- intended for a future Role
  // Manager UI (ADMIN-V2-007) and gated by the CALLER's own
  // hasPermission(user, PERMISSIONS.ADMIN_MANAGE) check, not here (this is
  // a data accessor, not a UI entry point).
  function listAllRoleAssignments() {
    return activeProvider.list().slice();
  }

  window.AdminPermissionService = Object.freeze({
    provider: "local-prototype",
    ROLES,
    PERMISSIONS,
    SCOPE_TYPES,
    STATUS,
    SUPER_ADMIN_EMAIL,
    isSuperAdmin,
    isLegacyAdmin,
    getRoleAssignments,
    hasRole,
    hasPermission,
    canAccessScope,
    canAccessAdminPanel,
    canModerateGlobalCommunity,
    canModerateCommunityContent,
    canModerateCollege,
    canModerateCollegeBuilding,
    canModerateCollegeEvent,
    canModerateStudy,
    canModerateMap,
    grantRoleAssignment,
    setAssignmentStatus,
    revokeRoleAssignment,
    listAllRoleAssignments,
    useProvider,
  });
})();
