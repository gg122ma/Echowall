/**
 * ADMIN-V2-002 — Unified ModerationItem + Report schema.
 *
 * Single storage/query surface for "content that needs moderation review",
 * across every content type Echo Wall has or will have (Community posts,
 * Comments, Building/Event content, Study resources, Map notes). This does
 * NOT replace each module's own content storage (`notes`, `StudyUploadService`,
 * `MapNoteService`, `CommentService`) — a ModerationItem only points at a
 * `contentId` in the owning module; the content body itself is never copied
 * here. Existing per-module moderation storage (Study's own
 * moderationStatus/verificationStatus fields, Community's `isHidden`) is
 * left exactly as-is; this service is an additional, optional index those
 * modules can notify, not a replacement source of truth for them.
 *
 * IMPORTANT — like services/admin-permission-service.js, this is
 * prototype/front-end enforcement only, not a real security boundary.
 * Every read/write below is gated by AdminPermissionService (never a raw
 * `role === "admin"` check or an email whitelist), but that gate itself can
 * be bypassed by calling these functions directly from the browser console.
 * Production moderation reads/writes must be re-authorized server-side
 * (Supabase RLS keyed off `auth.uid()`/a trusted `user_roles`/
 * `moderation_items` table — see docs/BACKEND_INTEGRATION_READINESS.md).
 *
 * Load order: after services/admin-permission-service.js, app-data.js
 * (`notes`/`getRuntimeNotes`), services/community-service.js, and
 * services/map-note-service.js — see CLAUDE.md's script-load-order note.
 */
(function () {
  const ITEMS_KEY = "echo-wall-moderation-items:v1";
  const REPORTS_KEY = "echo-wall-moderation-reports:v1";
  // ADMIN-V2-002A: KMK's orgId used to be hardcoded here as a bare `1`. It
  // is now looked up from the canonical `organizations` config (app-data.js)
  // by name -- the same source echomap.js's own local `KMK_ORG_ID` already
  // trusts -- so a future re-ordering of that array, or a second college
  // gaining a real Map/Building-wall feature, doesn't silently desync this
  // file from the rest of the app. The literal below is a last-resort
  // fallback only, for the (currently nonexistent) case where
  // `organizations` isn't loaded at all.
  const KMK_ORG_ID_FALLBACK = 1;
  function resolveKmkOrgId() {
    if (typeof organizations !== "undefined" && Array.isArray(organizations)) {
      const kmk = organizations.find(org => String(org?.name || "").toUpperCase() === "KMK");
      if (kmk && Number.isInteger(kmk.id)) return kmk.id;
    }
    return KMK_ORG_ID_FALLBACK;
  }

  const CONTENT_TYPES = Object.freeze(["post", "comment", "event", "review", "study_resource", "map_note"]);
  const SOURCES = Object.freeze(["submission", "report", "auto_flag", "admin"]);
  const ITEM_STATUSES = Object.freeze(["pending", "approved", "rejected", "hidden", "escalated"]);
  const ACTIVE_ITEM_STATUSES = new Set(["pending", "escalated"]);
  const SCOPE_TYPES = Object.freeze(["global", "college", "study", "system"]);
  const REPORT_CATEGORIES = Object.freeze(["spam", "harassment", "wrong_info", "copyright", "duplicate", "other"]);
  const REPORT_STATUSES = Object.freeze(["open", "reviewing", "resolved", "dismissed"]);

  // A ModerationItem's status is a small state machine, not a free-form
  // field -- e.g. an already-`approved` item can be retroactively `hidden`,
  // but cannot silently jump to `escalated`; a `rejected` item can be
  // reopened to `pending` for re-review, but not straight to `approved`
  // without passing through pending again. `approved -> rejected` and
  // `hidden -> rejected` (ADMIN-V2-002A) both represent the same real
  // event: a moderator hard-deleted content that had already been reviewed
  // — a legitimate escape hatch outside the normal review flow, not a
  // review-outcome transition, so it's allowed from either prior state.
  const ALLOWED_TRANSITIONS = Object.freeze({
    pending: new Set(["pending", "approved", "rejected", "hidden", "escalated"]),
    escalated: new Set(["escalated", "approved", "rejected", "hidden"]),
    approved: new Set(["approved", "hidden", "rejected"]),
    rejected: new Set(["rejected", "pending"]),
    hidden: new Set(["hidden", "pending", "rejected"]),
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function assertOneOf(value, allowed, label) {
    if (!allowed.includes(value)) throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }

  function randomId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // --- Storage (provider-swappable prototype persistence) -----------------

  function readCollection(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCollection(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // Local prototype persistence is best-effort.
    }
  }

  const LocalModerationProvider = Object.freeze({
    name: "local-prototype",
    items: {
      list: () => readCollection(ITEMS_KEY),
      save: list => writeCollection(ITEMS_KEY, list),
    },
    reports: {
      list: () => readCollection(REPORTS_KEY),
      save: list => writeCollection(REPORTS_KEY, list),
    },
  });

  let activeProvider = LocalModerationProvider;

  function useProvider(provider) {
    if (!provider?.items?.list || !provider?.items?.save || !provider?.reports?.list || !provider?.reports?.save) {
      throw new Error("A moderation provider must implement items.{list,save} and reports.{list,save}.");
    }
    activeProvider = provider;
  }

  // --- ready()/subscribe() (matches the ready/subscribe/useProvider shape
  // every other swappable service in this app already uses) ---------------

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
  // LocalStorage is synchronous, so there is nothing to actually await —
  // ready() exists so a future async backend provider is a drop-in swap for
  // every caller already writing `await ModerationService.ready()`.
  function ready() {
    return Promise.resolve();
  }

  // --- Scope derivation ("尽量从 canonical content object 派生 scope, 不要
  // 信任 UI 自己传来的任意 scope") -----------------------------------------

  function getNotesArray() {
    if (typeof getRuntimeNotes === "function") return getRuntimeNotes();
    if (typeof notes !== "undefined" && Array.isArray(notes)) return notes;
    return [];
  }

  // Returns { scopeType, scopeId } derived from the real content object, or
  // null if this contentType has no canonical adapter yet (comment, event,
  // review — see the file header; these get contract + structural
  // validation only, matching "只完成 contract + adapter, 不要伪造不存在的 UI").
  function resolveContentScope(contentType, contentId) {
    if (contentType === "post") {
      const note = getNotesArray().find(item => String(item?.id) === String(contentId));
      if (!note) return null;
      if (note.contextType === "community" && window.CommunityService) {
        const key = window.CommunityService.getCommunityKeyForNote(note);
        const parsed = key ? window.CommunityService.parseCommunityKey(key) : null;
        if (parsed) {
          return parsed.scope === "global"
            ? { scopeType: "global", scopeId: null }
            : { scopeType: "college", scopeId: parsed.orgId };
        }
      }
      // Building-wall posts (contextType "building") have no orgId of
      // their own in this prototype (KMK's Building Registry predates
      // Community V2's per-college model) — they default to KMK, the only
      // college with a real building wall today. Documented limitation,
      // not a guess: see REPORT_ADMIN-V2-002.md.
      return { scopeType: "college", scopeId: resolveKmkOrgId() };
    }
    if (contentType === "study_resource") {
      return { scopeType: "study", scopeId: null };
    }
    if (contentType === "map_note") {
      // Echo Map is a KMK-only feature today (no other college has a real
      // map/pin system) — every map_note is canonically KMK-scoped. If a
      // second college ever gets a real map/pin system, this needs a real
      // per-note college lookup (map notes carry no orgId of their own);
      // until then this is correct, not a placeholder.
      return { scopeType: "college", scopeId: resolveKmkOrgId() };
    }
    return null; // comment / event / review: no canonical source exists yet
  }

  function resolveAndValidateScope(contentType, contentId, suppliedScopeType, suppliedScopeId) {
    const canonical = resolveContentScope(contentType, contentId);
    if (canonical) {
      if (
        suppliedScopeType != null
        && (suppliedScopeType !== canonical.scopeType || String(suppliedScopeId ?? "") !== String(canonical.scopeId ?? ""))
      ) {
        throw new Error(
          `Scope mismatch: ${contentType} ${contentId} is canonically ${canonical.scopeType}`
          + `${canonical.scopeId != null ? ":" + canonical.scopeId : ""}, but `
          + `${suppliedScopeType}${suppliedScopeId != null ? ":" + suppliedScopeId : ""} was supplied.`
        );
      }
      return canonical;
    }
    // No canonical adapter for this contentType yet -- fall back to
    // structurally validating whatever the caller supplied (still real
    // validation, just not cross-checked against a source of truth that
    // doesn't exist for this contentType).
    assertOneOf(suppliedScopeType, SCOPE_TYPES, "scopeType");
    if (suppliedScopeType === "college" && suppliedScopeId == null) {
      throw new Error("A college-scoped item requires an explicit scopeId.");
    }
    return { scopeType: suppliedScopeType, scopeId: suppliedScopeId == null ? null : suppliedScopeId };
  }

  // --- Permission gate (AdminPermissionService only -- never role==="admin"
  // or an email whitelist) --------------------------------------------------

  // ADMIN-V2-003A: contentType is optional and only changes the answer for
  // "college"-scoped map_note items — every other contentType (including
  // college-scoped posts/comments) keeps the exact prior canModerateCollege
  // check. This is deliberately narrow: a Global Moderator must still never
  // gain college Community moderation (see permission-service.js's
  // canModerateCollege comment) — only Map, which has always shared its own
  // gate with Community moderation via AdminPermissionService.canModerateMap.
  function canAccessScopeForModeration(user, scopeType, scopeId, contentType) {
    const aps = window.AdminPermissionService;
    if (!aps || !user) return false;
    if (aps.isSuperAdmin(user)) return true;
    if (scopeType === "global") return aps.canModerateGlobalCommunity(user);
    if (scopeType === "college") {
      if (contentType === "map_note" && typeof aps.canModerateMap === "function") {
        return aps.canModerateMap(user, scopeId);
      }
      return aps.canModerateCollege(user, scopeId);
    }
    if (scopeType === "study") return aps.canModerateStudy(user);
    return false; // "system" scope: Super Admin only, already covered above.
  }

  // ADMIN-V2-005: a CONTENT_REVIEWER's default permission set (CONTENT_REVIEW
  // only, no GLOBAL/COLLEGE_COMMUNITY_MODERATE or STUDY_RESOURCE_MODERATE)
  // means canAccessScopeForModeration() above always denies them -- by
  // design; they get in ONLY through this second, independent path: an item
  // explicitly assigned to them. This is additive (an `|| `, never a
  // replacement) so a user who ALSO holds a real moderation role keeps that
  // access unchanged -- assignment only ever WIDENS access to one specific
  // item, never narrows a real moderator's existing scope-wide access.
  function canAccessModerationItem(user, item) {
    if (canAccessScopeForModeration(user, item.scopeType, item.scopeId, item.contentType)) return true;
    return Boolean(user && item.assignedTo != null && String(item.assignedTo) === String(user.id));
  }

  // --- ModerationItem CRUD --------------------------------------------------

  function createModerationItem(input = {}) {
    assertOneOf(input.contentType, CONTENT_TYPES, "contentType");
    assertOneOf(input.source, SOURCES, "source");
    const status = input.status || "pending";
    assertOneOf(status, ITEM_STATUSES, "status");
    const contentId = String(input.contentId ?? "");
    if (!contentId) throw new Error("contentId is required.");
    const scope = resolveAndValidateScope(input.contentType, contentId, input.scopeType, input.scopeId);
    const now = nowIso();
    const item = {
      id: randomId("mod"),
      contentType: input.contentType,
      contentId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      reason: input.reason != null ? String(input.reason) : null,
      source: input.source,
      riskScore: Number.isFinite(Number(input.riskScore)) ? Number(input.riskScore) : 0,
      status,
      assignedTo: input.assignedTo != null ? String(input.assignedTo) : null,
      createdAt: now,
      resolvedAt: ["approved", "rejected", "hidden"].includes(status) ? now : null,
      createdBy: input.createdBy != null ? String(input.createdBy) : null,
      updatedAt: now,
    };
    const items = activeProvider.items.list();
    items.push(item);
    activeProvider.items.save(items);
    notify({ type: "item:create", id: item.id });
    return { ...item };
  }

  function getModerationItem(id, user) {
    const item = activeProvider.items.list().find(entry => entry.id === id);
    if (!item) return null;
    return canAccessModerationItem(user, item) ? { ...item } : null;
  }

  function listModerationItems(filters = {}, user) {
    return activeProvider.items.list()
      .filter(item => canAccessModerationItem(user, item))
      .filter(item => !filters.contentType || item.contentType === filters.contentType)
      .filter(item => !filters.status || item.status === filters.status)
      .filter(item => !filters.scopeType || item.scopeType === filters.scopeType)
      .filter(item => filters.scopeId == null || String(item.scopeId) === String(filters.scopeId))
      .map(item => ({ ...item }));
  }

  // The default moderation queue view: active (pending/escalated) items
  // this user can access, unless a specific status filter is requested.
  function getQueueItems(user, filters = {}) {
    const results = listModerationItems(filters, user);
    return filters.status ? results : results.filter(item => ACTIVE_ITEM_STATUSES.has(item.status));
  }

  // ADMIN-V2-005 spec section 15: "如果 assignment UI 尚未适合：至少 Super Admin
  // 可以 assign reviewer from case action" -- deliberately separate from
  // updateModerationStatus() (never touches `status`, so it never fires that
  // function's own reason-required/AuditAction-status-mapping logic, which
  // has no concept of "nothing changed except who's assigned"). Restricted
  // to Super Admin for now (a real Role Manager granting a narrower
  // ADMIN_MANAGE-equivalent is ADMIN-V2-007's job, not this stage's).
  function assignModerationItem(id, assigneeUserId, user) {
    const aps = window.AdminPermissionService;
    if (!aps || !aps.isSuperAdmin(user)) throw new Error("Only a Super Admin can assign a moderation item.");
    const items = activeProvider.items.list();
    const index = items.findIndex(entry => entry.id === id);
    if (index < 0) throw new Error(`ModerationItem not found: ${id}`);
    const current = items[index];
    const now = nowIso();
    const nextAssignedTo = assigneeUserId == null ? null : String(assigneeUserId);
    const updated = { ...current, assignedTo: nextAssignedTo, updatedAt: now };
    // ADMIN-V2-FINAL-CORRECTION: audit-required, audit-first -- see
    // updateModerationStatus's identical comment above. If this throws, the
    // assignment is never committed (`items[index] = updated` below never runs).
    if (!window.AdminAuditService || typeof window.AdminAuditService.createAuditAction !== "function") {
      throw new Error("AdminAuditService is required to perform this assignment.");
    }
    window.AdminAuditService.createAuditAction({
      actorUserId: user?.id,
      actorEmail: user?.email,
      action: nextAssignedTo ? "assign" : "unassign",
      targetType: current.contentType,
      targetId: current.contentId,
      scopeType: current.scopeType,
      scopeId: current.scopeId,
      beforeSnapshot: { assignedTo: current.assignedTo },
      afterSnapshot: { assignedTo: nextAssignedTo },
      reason: null,
    }, user);
    items[index] = updated;
    activeProvider.items.save(items);
    notify({ type: "item:assign", id, assignedTo: nextAssignedTo });
    return { ...updated };
  }

  // ADMIN-V2-004: status -> AuditAction "action" name, for both the reason
  // requirement below and the AuditAction record itself. `pending` covers
  // both "reopen" (from `escalated`) and "restore" (from `hidden`/`rejected`)
  // -- both are the same real event (put the item back up for review) so
  // they share one audit action name.
  const STATUS_TO_ACTION = Object.freeze({
    approved: "approve",
    rejected: "reject",
    hidden: "hide",
    escalated: "escalate",
    pending: "restore",
  });
  // Reject/Hide/Escalate "必须要求 reason" (spec section 7) -- enforced HERE,
  // before any mutation, not just inside AdminAuditService.createAuditAction
  // (defense in depth: even if the audit write is skipped/fails, the status
  // transition itself never happens without a reason).
  const REASON_REQUIRED_STATUSES = new Set(["rejected", "hidden", "escalated"]);

  function updateModerationStatus(id, status, user, extra = {}) {
    assertOneOf(status, ITEM_STATUSES, "status");
    const items = activeProvider.items.list();
    const index = items.findIndex(entry => entry.id === id);
    if (index < 0) throw new Error(`ModerationItem not found: ${id}`);
    const current = items[index];
    if (!canAccessModerationItem(user, current)) throw new Error("Not authorized to update this moderation item.");
    const allowedNext = ALLOWED_TRANSITIONS[current.status];
    if (!allowedNext || !allowedNext.has(status)) {
      throw new Error(`Invalid status transition: ${current.status} -> ${status}`);
    }
    const reason = extra.reason != null ? String(extra.reason).trim() : "";
    if (REASON_REQUIRED_STATUSES.has(status) && status !== current.status && !reason) {
      throw new Error(`A reason is required to set status "${status}".`);
    }
    const now = nowIso();
    const updated = {
      ...current,
      status,
      assignedTo: extra.assignedTo !== undefined ? (extra.assignedTo != null ? String(extra.assignedTo) : null) : current.assignedTo,
      reason: extra.reason !== undefined ? (extra.reason != null ? String(extra.reason) : null) : current.reason,
      resolvedAt: ["approved", "rejected", "hidden"].includes(status) ? now : (status === "pending" || status === "escalated" ? null : current.resolvedAt),
      updatedAt: now,
    };
    // ADMIN-V2-FINAL-CORRECTION: AdminAuditService is now a REQUIRED
    // dependency for this mutation, not an optional best-effort mirror --
    // this call happens BEFORE `items[index] = updated`/`activeProvider.items.save(items)`
    // are ever reached, and is deliberately NOT wrapped in try/catch: if the
    // audit write throws (missing service, or a genuine persistence
    // failure), this function throws too and the ModerationItem's status is
    // NEVER committed. Spec: "如果 audit persistence 无法写：mutation 必须
    // 失败" — content/status changed but AuditAction missing must not be
    // possible.
    if (!window.AdminAuditService || typeof window.AdminAuditService.createAuditAction !== "function") {
      throw new Error("AdminAuditService is required to perform this moderation action.");
    }
    window.AdminAuditService.createAuditAction({
      actorUserId: user?.id,
      actorEmail: user?.email,
      action: STATUS_TO_ACTION[status] || status,
      targetType: current.contentType,
      targetId: current.contentId,
      scopeType: current.scopeType,
      scopeId: current.scopeId,
      beforeSnapshot: { status: current.status, assignedTo: current.assignedTo },
      afterSnapshot: { status: updated.status, assignedTo: updated.assignedTo },
      reason: reason || null,
    }, user);
    // Audit persisted successfully -- only now commit the real mutation.
    items[index] = updated;
    activeProvider.items.save(items);
    notify({ type: "item:status", id, status });
    return { ...updated };
  }

  // --- Report CRUD -----------------------------------------------------------

  // Same content/contentId can accumulate multiple reports (one per
  // reporter, or the same reporter reporting again) without ever creating
  // more than one ACTIVE ModerationItem for it -- "report != delete", and
  // duplicate reports raise priority (riskScore) instead of spawning
  // duplicate queue entries.
  function findActiveModerationItem(contentType, contentId) {
    return activeProvider.items.list().find(item =>
      item.contentType === contentType
      && item.contentId === String(contentId)
      && ACTIVE_ITEM_STATUSES.has(item.status)
    );
  }

  function ensureModerationItemForReport(report) {
    const existing = findActiveModerationItem(report.contentType, report.contentId);
    if (existing) {
      const items = activeProvider.items.list();
      const index = items.findIndex(entry => entry.id === existing.id);
      items[index] = { ...items[index], riskScore: Math.min(100, Number(items[index].riskScore || 0) + 10), updatedAt: nowIso() };
      activeProvider.items.save(items);
      notify({ type: "item:reattach", id: items[index].id });
      return { ...items[index] };
    }
    return createModerationItem({
      contentType: report.contentType,
      contentId: report.contentId,
      scopeType: report.scopeType,
      scopeId: report.scopeId,
      reason: report.category,
      source: "report",
      riskScore: 10,
      status: "pending",
      createdBy: report.reporterUserId,
    });
  }

  // ADMIN-V2-008 — Auto Moderation Assist's write path. Same "never spawn a
  // duplicate active queue case" guarantee as ensureModerationItemForReport
  // above: re-evaluating the same content (e.g. re-running rules after an
  // edit) reuses the existing active item instead of creating a second one.
  // riskScore only ever moves toward the higher of the two readings (an
  // auto-flag NEVER lowers priority a human report already raised, and
  // repeat auto-flag hits raise it further, same spirit as the report
  // dedupe's "+10 per repeat"). Never creates/allows a status other than
  // "pending" -- an auto flag is assistive triage, never a decision (spec
  // section 32: "riskScore high -> 不要自动 permanent delete").
  function ensureAutoFlagModerationItem(input = {}) {
    const contentId = String(input.contentId ?? "");
    const existing = findActiveModerationItem(input.contentType, contentId);
    const riskScore = Number.isFinite(Number(input.riskScore)) ? Number(input.riskScore) : 0;
    if (existing) {
      const items = activeProvider.items.list();
      const index = items.findIndex(entry => entry.id === existing.id);
      items[index] = {
        ...items[index],
        riskScore: Math.min(100, Math.max(Number(items[index].riskScore || 0), riskScore)),
        reason: items[index].reason || input.reason || null,
        updatedAt: nowIso(),
      };
      activeProvider.items.save(items);
      notify({ type: "item:reattach", id: items[index].id });
      return { ...items[index] };
    }
    return createModerationItem({
      contentType: input.contentType,
      contentId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      reason: input.reason || null,
      source: "auto_flag",
      riskScore,
      status: "pending",
      createdBy: null,
    });
  }

  function createReport(input = {}) {
    const reporterUserId = String(input.reporterUserId || "");
    if (!reporterUserId) throw new Error("Sign in before reporting content.");
    assertOneOf(input.contentType, CONTENT_TYPES, "contentType");
    assertOneOf(input.category, REPORT_CATEGORIES, "category");
    const contentId = String(input.contentId ?? "");
    if (!contentId) throw new Error("contentId is required.");
    const scope = resolveAndValidateScope(input.contentType, contentId, input.scopeType, input.scopeId);
    const now = nowIso();
    const report = {
      id: randomId("rpt"),
      reporterUserId,
      contentType: input.contentType,
      contentId,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      category: input.category,
      details: input.details != null ? String(input.details).slice(0, 1000) : "",
      createdAt: now,
      status: "open",
    };
    const reports = activeProvider.reports.list();
    reports.push(report);
    activeProvider.reports.save(reports);
    const moderationItem = ensureModerationItemForReport(report);
    notify({ type: "report:create", id: report.id });
    return { report: { ...report }, moderationItem };
  }

  function getReport(id, user) {
    const report = activeProvider.reports.list().find(entry => entry.id === id);
    if (!report) return null;
    return canAccessScopeForModeration(user, report.scopeType, report.scopeId, report.contentType) ? { ...report } : null;
  }

  function listReports(filters = {}, user) {
    return activeProvider.reports.list()
      .filter(report => canAccessScopeForModeration(user, report.scopeType, report.scopeId, report.contentType))
      .filter(report => !filters.contentType || report.contentType === filters.contentType)
      .filter(report => !filters.contentId || report.contentId === String(filters.contentId))
      .filter(report => !filters.status || report.status === filters.status)
      .map(report => ({ ...report }));
  }

  function updateReportStatus(id, status, user) {
    assertOneOf(status, REPORT_STATUSES, "status");
    const reports = activeProvider.reports.list();
    const index = reports.findIndex(entry => entry.id === id);
    if (index < 0) throw new Error(`Report not found: ${id}`);
    const current = reports[index];
    if (!canAccessScopeForModeration(user, current.scopeType, current.scopeId, current.contentType)) {
      throw new Error("Not authorized to update this report.");
    }
    reports[index] = { ...current, status };
    activeProvider.reports.save(reports);
    notify({ type: "report:status", id, status });
    return { ...reports[index] };
  }

  window.ModerationService = Object.freeze({
    provider: "local-prototype",
    CONTENT_TYPES,
    SOURCES,
    ITEM_STATUSES,
    SCOPE_TYPES,
    REPORT_CATEGORIES,
    REPORT_STATUSES,
    ready,
    subscribe,
    useProvider,
    createModerationItem,
    getModerationItem,
    listModerationItems,
    getQueueItems,
    updateModerationStatus,
    assignModerationItem,
    createReport,
    getReport,
    listReports,
    updateReportStatus,
    ensureModerationItemForReport,
    ensureAutoFlagModerationItem,
    // ADMIN-V2-004: exported so callers that need to compute an
    // AuditAction's scope for content that may not yet have a
    // ModerationItem (e.g. app-admin.js's Community/Map hide/delete) reuse
    // this exact derivation instead of re-implementing it.
    resolveContentScope,
  });
})();
