/**
 * Community V2 registry helpers (COM-V2-001).
 * Reads window.COMMUNITY_DESCRIPTORS (data/community-config.js). Provides the
 * canonical Community Key format so app-wall.js/app-router.js never need to
 * special-case "orgId=0 means Global" style magic values.
 *
 * Key formats:
 *   global:all            -> {scope:"global", orgId:null, majorId:null}
 *   college:{orgId}        -> {scope:"college", orgId, majorId:null}
 *   jurusan:{orgId}:{majorId} -> {scope:"jurusan", orgId, majorId}
 *
 * Must load after data/community-config.js and app-data.js.
 */
(function () {
  function getCommunityKey(scope, orgId, majorId) {
    if (scope === "global") return "global:all";
    if (scope === "college") {
      const canonicalOrgId = Number(orgId);
      return Number.isInteger(canonicalOrgId) && canonicalOrgId > 0 ? `college:${canonicalOrgId}` : "";
    }
    if (scope === "jurusan") {
      const canonicalOrgId = Number(orgId);
      const canonicalMajorId = Number(majorId);
      if (!Number.isInteger(canonicalOrgId) || canonicalOrgId <= 0) return "";
      if (!Number.isInteger(canonicalMajorId) || canonicalMajorId <= 0) return "";
      return `jurusan:${canonicalOrgId}:${canonicalMajorId}`;
    }
    return "";
  }

  function parseCommunityKey(key) {
    const value = String(key || "");
    if (value === "global:all") return { scope: "global", orgId: null, majorId: null };
    const collegeMatch = /^college:(\d+)$/.exec(value);
    if (collegeMatch) return { scope: "college", orgId: Number(collegeMatch[1]), majorId: null };
    const jurusanMatch = /^jurusan:(\d+):(\d+)$/.exec(value);
    if (jurusanMatch) return { scope: "jurusan", orgId: Number(jurusanMatch[1]), majorId: Number(jurusanMatch[2]) };
    return null;
  }

  function isValidCommunityKey(key) {
    return parseCommunityKey(key) !== null;
  }

  function getCommunityByKey(key) {
    const canonicalKey = String(key || "");
    const descriptors = window.COMMUNITY_DESCRIPTORS || [];
    return descriptors.find(descriptor => descriptor.key === canonicalKey) || null;
  }

  function getCommunityFromLegacyContext(orgId, majorId) {
    const key = getCommunityKey("jurusan", orgId, majorId);
    return key ? getCommunityByKey(key) : null;
  }

  // Legacy compatibility: existing community notes/wallKeys use
  // `community:{orgId}:{majorId}`. Maps that legacy format to the V2
  // canonical `jurusan:{orgId}:{majorId}` key without touching stored data.
  function mapLegacyWallKeyToCommunityKey(wallKey) {
    const match = /^community:(\d+):(\d+)$/.exec(String(wallKey || ""));
    if (!match) return "";
    return getCommunityKey("jurusan", Number(match[1]), Number(match[2]));
  }

  // Resolves a note's communityKey, preferring an already-valid stored value
  // (idempotent) and falling back to deriving it from legacy orgId/majorId.
  // Used both by normalizeStoredNote() and directly here for notes that
  // never pass through normalization (e.g. the frozen demo-seed bundle).
  function getCommunityKeyForNote(note) {
    if (!note || note.contextType !== "community") return "";
    if (isValidCommunityKey(note.communityKey)) return note.communityKey;
    return getCommunityKey("jurusan", note.orgId, note.majorId);
  }

  function getCommunityPosts(communityKey) {
    const canonicalKey = String(communityKey || "");
    if (!canonicalKey || typeof getRuntimeNotes !== "function") return [];
    return getRuntimeNotes().filter(note => (
      note
      && note.contextType === "community"
      && !note.isHidden
      && getCommunityKeyForNote(note) === canonicalKey
    ));
  }

  // Comment / Reply storage schema (design only — COM-V2-005 builds the UI).
  // Shape, per the Community V2 spec:
  // {
  //   id, postId, parentCommentId, depth: 0|1,
  //   authorUserId, isAnonymous, authorNickname, content,
  //   moderationStatus: "published"|"pending"|"flagged"|"rejected",
  //   isHidden, createdAt, updatedAt
  // }
  const COMMENT_STORAGE_KEY = "echo-wall-comments:v1";

  window.CommunityService = Object.freeze({
    scopes: Object.freeze({ GLOBAL: "global", COLLEGE: "college", JURUSAN: "jurusan" }),
    getCommunityKey,
    parseCommunityKey,
    isValidCommunityKey,
    getCommunityByKey,
    getCommunityFromLegacyContext,
    mapLegacyWallKeyToCommunityKey,
    getCommunityKeyForNote,
    getCommunityPosts,
    COMMENT_STORAGE_KEY,
  });
})();
