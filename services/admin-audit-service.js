/**
 * ADMIN-V2-004 — Moderation Actions + Audit Trail.
 *
 * Single storage/query surface for "who did what to what, when, and why" —
 * every moderation action across Community/Map/Study/Admin-Management must
 * produce one AuditAction here. This does NOT replace any module's own
 * storage (`notes`, `MapNoteService`, `StudyUploadService`'s own per-record
 * `auditLog`, `services/moderation-service.js`'s ModerationItem) — an
 * AuditAction only points at a `targetId`; it never copies content bytes.
 *
 * IMPORTANT — like services/admin-permission-service.js and
 * services/moderation-service.js, this is prototype/front-end enforcement
 * only, not a real security boundary or an immutable audit log. Every
 * record here lives in LocalStorage and can be edited/deleted by the
 * browser user calling these functions directly from the console.
 * Production requires a server-side, append-only audit table (see
 * docs/BACKEND_INTEGRATION_READINESS.md) — see reports/REPORT_ADMIN-V2-004.md
 * section "Production Security Boundary".
 *
 * Load order: after services/admin-permission-service.js (uses
 * AdminPermissionService for both the reason-required gate and the scope
 * read-gate) — see CLAUDE.md's script-load-order note.
 */
(function () {
  const ACTIONS_KEY = "echo-wall-audit-actions:v1";

  const TARGET_TYPES = Object.freeze(["post", "map_note", "study_resource", "role_assignment", "report"]);
  const SCOPE_TYPES = Object.freeze(["global", "college", "study", "system"]);
  const ACTIONS = Object.freeze([
    "approve", "reject", "hide", "restore", "delete", "escalate", "verify", "edit_approve",
    "grant", "disable", "enable", "revoke", "assign", "unassign",
  ]);
  // Reject/Hide "必须要求 reason" (spec section 7); Escalate is listed as
  // "reason required 或 strongly required" -- made mandatory here too so
  // every priority-raising action is self-explanatory in the Audit view.
  const REASON_REQUIRED_ACTIONS = new Set(["reject", "hide", "escalate"]);

  function nowIso() {
    return new Date().toISOString();
  }

  function randomId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function assertOneOf(value, allowed, label) {
    if (!allowed.includes(value)) throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }

  // --- Snapshot sanitization ("不要把 PDF bytes / Blob / base64 / password /
  // token 写入 Audit", spec section 6) --------------------------------------

  const FORBIDDEN_SNAPSHOT_KEYS = /password|token|secret|blob|base64|filedata|filebytes|pdfbytes/i;
  const MAX_SNAPSHOT_STRING_LENGTH = 300;

  function sanitizeSnapshotValue(value, depth) {
    if (value == null) return value;
    if (depth > 3) return "[truncated: nested too deep]";
    if (typeof value === "string") {
      // A base64/data-URI payload masquerading under an innocuous key name
      // is still rejected on shape, not just key name.
      if (/^data:[^,]+;base64,/.test(value) || (value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value))) {
        return "[omitted: binary-shaped string]";
      }
      return value.length > MAX_SNAPSHOT_STRING_LENGTH ? `${value.slice(0, MAX_SNAPSHOT_STRING_LENGTH)}…` : value;
    }
    if (Array.isArray(value)) return value.slice(0, 20).map(entry => sanitizeSnapshotValue(entry, depth + 1));
    if (typeof value === "object") {
      const clean = {};
      Object.keys(value).slice(0, 40).forEach(key => {
        if (FORBIDDEN_SNAPSHOT_KEYS.test(key)) return;
        clean[key] = sanitizeSnapshotValue(value[key], depth + 1);
      });
      return clean;
    }
    return value; // number/boolean
  }

  function sanitizeSnapshot(snapshot) {
    if (snapshot == null) return null;
    return sanitizeSnapshotValue(snapshot, 0);
  }

  // --- Storage (provider-swappable prototype persistence) -----------------

  function readActionsRaw() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTIONS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ADMIN-V2-FINAL-CORRECTION: deliberately does NOT swallow the write
  // error (e.g. LocalStorage quota exceeded, private-browsing restrictions)
  // -- AdminAuditService is now a REQUIRED dependency for Admin mutations
  // (spec: "如果 audit persistence 无法写：mutation 必须失败"), so
  // createAuditAction() must genuinely throw when persistence fails, not
  // report success while silently writing nothing.
  function writeActionsRaw(list) {
    localStorage.setItem(ACTIONS_KEY, JSON.stringify(list));
  }

  const LocalAuditProvider = Object.freeze({
    name: "local-prototype",
    list: readActionsRaw,
    save: writeActionsRaw,
  });

  let activeProvider = LocalAuditProvider;

  function useProvider(provider) {
    if (!provider || typeof provider.list !== "function" || typeof provider.save !== "function") {
      throw new Error("An AuditAction provider must implement list() and save().");
    }
    activeProvider = provider;
  }

  const listeners = new Set();
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notify(event) {
    listeners.forEach(listener => {
      try { listener(event); } catch { /* one bad listener must not break the others */ }
    });
  }
  function ready() {
    return Promise.resolve();
  }

  // --- Create -----------------------------------------------------------

  // input: { actorUserId, actorEmail?, action, targetType, targetId,
  //          scopeType, scopeId?, beforeSnapshot?, afterSnapshot?, reason? }
  function createAuditAction(input = {}) {
    const actorUserId = input.actorUserId != null ? String(input.actorUserId) : "";
    if (!actorUserId) throw new Error("An AuditAction requires an actorUserId.");
    assertOneOf(input.action, ACTIONS, "action");
    assertOneOf(input.targetType, TARGET_TYPES, "targetType");
    const targetId = String(input.targetId ?? "");
    if (!targetId) throw new Error("targetId is required.");
    assertOneOf(input.scopeType, SCOPE_TYPES, "scopeType");
    if (input.scopeType === "college" && input.scopeId == null) {
      throw new Error("A college-scoped AuditAction requires an explicit scopeId.");
    }
    const reason = input.reason != null ? String(input.reason).trim() : "";
    if (REASON_REQUIRED_ACTIONS.has(input.action) && !reason) {
      throw new Error(`A reason is required for action "${input.action}".`);
    }
    const record = {
      id: randomId("audit"),
      actorUserId,
      actorEmail: input.actorEmail != null ? String(input.actorEmail) : null,
      action: input.action,
      targetType: input.targetType,
      targetId,
      scopeType: input.scopeType,
      scopeId: input.scopeId == null ? null : input.scopeId,
      beforeSnapshot: sanitizeSnapshot(input.beforeSnapshot),
      afterSnapshot: sanitizeSnapshot(input.afterSnapshot),
      reason: reason || null,
      createdAt: nowIso(),
    };
    const list = activeProvider.list();
    list.push(record);
    activeProvider.save(list);
    notify({ type: "action:create", id: record.id });
    return { ...record };
  }

  // --- Read (scope-gated) -------------------------------------------------
  //
  // Mirrors services/moderation-service.js's canAccessScopeForModeration
  // exactly (including the map_note -> canModerateMap special case), PLUS
  // an AUDIT_READ_ALL short-circuit for a future non-Super-Admin grant
  // (spec section 9's "Super Admin: 全平台 Audit" already covered by
  // isSuperAdmin(); this additionally covers any future role explicitly
  // granted AUDIT_READ_ALL without becoming a full Super Admin).

  function canAccessAuditScope(user, scopeType, scopeId, targetType) {
    const aps = window.AdminPermissionService;
    if (!aps || !user) return false;
    if (aps.isSuperAdmin(user)) return true;
    if (aps.hasPermission(user, aps.PERMISSIONS.AUDIT_READ_ALL)) return true;
    if (scopeType === "global") return aps.canModerateGlobalCommunity(user);
    if (scopeType === "college") {
      if (targetType === "map_note" && typeof aps.canModerateMap === "function") {
        return aps.canModerateMap(user, scopeId);
      }
      return aps.canModerateCollege(user, scopeId);
    }
    if (scopeType === "study") return aps.canModerateStudy(user);
    return false; // "system" scope: Super Admin / AUDIT_READ_ALL only, already covered above.
  }

  function canAccessAuditAction(user, record) {
    return canAccessAuditScope(user, record.scopeType, record.scopeId, record.targetType);
  }

  function getAuditAction(id, user) {
    const record = activeProvider.list().find(entry => entry.id === id);
    if (!record) return null;
    return canAccessAuditAction(user, record) ? { ...record } : null;
  }

  // filters: actorUserId, targetType, targetId, scopeType, scopeId, action,
  // createdAtFrom (ISO string, inclusive), createdAtTo (ISO string, inclusive)
  function listAuditActions(filters = {}, user) {
    return activeProvider.list()
      .filter(record => canAccessAuditAction(user, record))
      .filter(record => !filters.actorUserId || record.actorUserId === String(filters.actorUserId))
      .filter(record => !filters.targetType || record.targetType === filters.targetType)
      .filter(record => !filters.targetId || record.targetId === String(filters.targetId))
      .filter(record => !filters.action || record.action === filters.action)
      .filter(record => !filters.scopeType || record.scopeType === filters.scopeType)
      .filter(record => filters.scopeId == null || String(record.scopeId) === String(filters.scopeId))
      .filter(record => !filters.createdAtFrom || record.createdAt >= filters.createdAtFrom)
      .filter(record => !filters.createdAtTo || record.createdAt <= filters.createdAtTo)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map(record => ({ ...record }));
  }

  window.AdminAuditService = Object.freeze({
    provider: "local-prototype",
    TARGET_TYPES,
    SCOPE_TYPES,
    ACTIONS,
    REASON_REQUIRED_ACTIONS,
    ready,
    subscribe,
    useProvider,
    createAuditAction,
    getAuditAction,
    listAuditActions,
    sanitizeSnapshot,
  });
})();
