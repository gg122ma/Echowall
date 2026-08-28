/**
 * Community V2 (COM-V2-007) — unified permission hooks.
 *
 * Prototype-only: this is front-end gating, NOT a security boundary. Every
 * check here can be bypassed by calling app functions directly from the
 * browser console. Real enforcement requires backend authorization (e.g.
 * Supabase RLS scoped to org_id) — see docs/PRODUCTION_IDENTITY_HOSTING_CONTRACT.md
 * and the Community V2 spec's own "前端权限不是安全边界" note.
 *
 * ADMIN-V2-001: moderation-scope decisions now delegate to
 * services/admin-permission-service.js (AdminPermissionService) — the
 * single Role/Scope/Permission source of truth — instead of this file's
 * own `user.role === "admin"` / `user.moderatesOrgId` stub. Real per-
 * college moderators are now possible via a COLLEGE_ADMIN RoleAssignment;
 * `getUserModerationScope()` is kept for compatibility but only ever
 * reports the FIRST matching scope, since a user can hold several college
 * scopes at once (see AdminPermissionService.canModerateCollege for the
 * real, multi-scope-aware check `canUserModerateCommunity`/
 * `canUserMarkSolved` actually use below).
 */
(function () {
  function canUserPost(user) {
    return Boolean(user);
  }

  function canUserComment(user) {
    return Boolean(user);
  }

  // Compatibility summary only — prefer AdminPermissionService directly
  // for anything scope-sensitive. Returns the FIRST scope this user can
  // moderate, or null. { scope: "global" } -> every community, including
  // global:all. { scope: "college", orgId } -> only that one college.
  function getUserModerationScope(user) {
    if (!user) return null;
    const aps = window.AdminPermissionService;
    if (!aps) return null;
    if (aps.canModerateGlobalCommunity(user)) return { scope: "global" };
    const collegeAssignment = aps.getRoleAssignments(user)
      .find(assignment => assignment.scopeType === aps.SCOPE_TYPES.COLLEGE && aps.canModerateCollege(user, assignment.scopeId));
    if (collegeAssignment) return { scope: "college", orgId: collegeAssignment.scopeId };
    return null;
  }

  // community: a CommunityDescriptor-shaped object ({scope, orgId, ...}) —
  // e.g. from CommunityService.getCommunityByKey(). All KM Students
  // (global:all) can only ever be moderated by a global-scope moderator; a
  // college-scoped moderator is checked against that community's own
  // orgId directly (multi-scope aware — a KMK+KMPP College Admin passes
  // for both, a KMK-only College Admin passes only for KMK).
  function canUserModerateCommunity(user, community) {
    const aps = window.AdminPermissionService;
    if (!aps || !user || !community) return false;
    if (aps.canModerateGlobalCommunity(user)) return true;
    if (community.scope === "global") return false;
    return aps.canModerateCollege(user, community.orgId);
  }

  // Mark Solved / Reopen: the post's own author, or anyone who can
  // moderate the community that post belongs to (global moderator for any
  // post; a college moderator only for posts scoped to their own college —
  // never for global:all posts, which only a global moderator may touch).
  function canUserMarkSolved(user, note) {
    if (!user || !note || note.postType !== "question") return false;
    if (note.authorUserId && String(note.authorUserId) === String(user.id)) return true;
    const aps = window.AdminPermissionService;
    if (!aps) return false;
    if (aps.canModerateGlobalCommunity(user)) return true;
    if (note.communityScope === "global") return false;
    return aps.canModerateCollege(user, note.orgId);
  }

  window.PermissionService = Object.freeze({
    canUserPost,
    canUserComment,
    canUserMarkSolved,
    canUserModerateCommunity,
    getUserModerationScope,
  });
})();
