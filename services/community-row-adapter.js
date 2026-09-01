/** Converts sanitized api.* rows into the current Community domain shape. */
(function () {
  const UI_ID_STORAGE_KEY = "echo-wall-community-remote-ui-ids:v1";
  const UI_ID_MIN = 1000000000;
  const UI_ID_SPAN = 0x100000000;
  const remoteToUi = new Map();
  const uiToRemote = new Map();

  function identityKey(prefix, value) {
    return `${String(prefix || "remote")}:${String(value || "")}`;
  }

  function loadIdentityCache() {
    try {
      const entries = JSON.parse(localStorage.getItem(UI_ID_STORAGE_KEY) || "[]");
      if (!Array.isArray(entries)) return;
      entries.forEach(entry => {
        const key = String(entry?.[0] || "");
        const id = Number(entry?.[1]);
        if (!key || !Number.isSafeInteger(id) || id < UI_ID_MIN || id >= UI_ID_MIN + UI_ID_SPAN) return;
        if (remoteToUi.has(key) || uiToRemote.has(id)) return;
        remoteToUi.set(key, id);
        uiToRemote.set(id, key);
      });
    } catch {
      // Staging remains usable in privacy modes that deny LocalStorage.
    }
  }

  function persistIdentityCache() {
    try {
      localStorage.setItem(UI_ID_STORAGE_KEY, JSON.stringify([...remoteToUi.entries()]));
    } catch {
      // The in-memory bijection still prevents cross-post action routing.
    }
  }

  function hashUiIdentity(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function stableUiId(prefix, value) {
    const key = identityKey(prefix, value);
    const existing = remoteToUi.get(key);
    if (existing) return existing;
    const start = hashUiIdentity(key);
    for (let offset = 0; offset < UI_ID_SPAN; offset += 1) {
      const id = UI_ID_MIN + ((start + offset) % UI_ID_SPAN);
      const occupant = uiToRemote.get(id);
      if (occupant && occupant !== key) continue;
      remoteToUi.set(key, id);
      uiToRemote.set(id, key);
      persistIdentityCache();
      return id;
    }
    throw new Error("Community remote identity space is exhausted.");
  }

  function scopeFromRow(row) {
    if (row?.scope_type === "all_km") return { communityScope: "global", communityKey: "global:all", orgId: null, majorId: null };
    if (row?.scope_type === "college") return { communityScope: "college", communityKey: `college:${Number(row.college_id)}`, orgId: Number(row.college_id), majorId: null };
    if (row?.scope_type === "jurusan") return { communityScope: "jurusan", communityKey: `jurusan:${Number(row.college_id)}:${Number(row.jurusan_id)}`, orgId: Number(row.college_id), majorId: Number(row.jurusan_id) };
    throw new Error("Community returned an unsupported scope.");
  }

  function postFromRow(row) {
    const scope = scopeFromRow(row);
    const named = row.display_author_mode === "named";
    return Object.freeze({
      id: stableUiId("post", row.id), remoteId: String(row.id), schemaVersion: 4,
      contextType: "community", ...scope, batchId: null, placeId: "",
      postType: row.post_type === "question" ? "question" : "discussion",
      questionStatus: row.post_type === "question" && row.question_status === "solved" ? "solved" : (row.post_type === "question" ? "open" : null),
      canManageQuestion: row.can_manage_question === true,
      category: String(row.category || "academic"), shape: String(row.shape || "rounded"),
      color: String(row.color || "#DBEAFE"), rotation: Number(row.rotation || 0),
      positionX: Number(row.position_x || 10), positionY: Number(row.position_y || 15),
      isAnonymous: !named, authorNickname: named ? String(row.author_label || "") : null,
      authorUserId: "", content: String(row.content || ""), createdAt: String(row.created_at || ""),
      updatedAt: row.updated_at ? String(row.updated_at) : null, moderationStatus: "published",
      upvotes: Number(row.display_score || 0), downvotes: 0, score: Number(row.display_score || 0),
      realVoteScore: Number(row.real_vote_score || 0), userVote: null,
      isSeed: row.is_seed === true, seedSource: row.seed_source || null, seedVersion: row.seed_version || null,
      imageDataUrl: "", imageUrl: "", imagePublicId: "", imageName: "", imageCropScale: 1, imageFit: "cover",
      isRemote: true,
    });
  }

  function commentFromRow(row, post) {
    const named = row.display_author_mode === "named";
    return Object.freeze({
      id: stableUiId("comment", row.id), remoteId: String(row.id),
      postId: post.id, remotePostId: String(row.post_id),
      parentCommentId: row.parent_comment_id ? stableUiId("comment", row.parent_comment_id) : null,
      remoteParentCommentId: row.parent_comment_id ? String(row.parent_comment_id) : null,
      depth: row.parent_comment_id ? 1 : 0,
      isAnonymous: !named, authorNickname: named ? String(row.author_label || "") : null,
      authorUserId: "", content: String(row.content || ""),
      createdAt: String(row.created_at || ""), updatedAt: row.updated_at ? String(row.updated_at) : null,
      moderationStatus: "published", isHidden: false, isRemote: true,
    });
  }

  loadIdentityCache();
  window.CommunityRowAdapter = Object.freeze({
    UI_ID_STORAGE_KEY,
    stableUiId,
    scopeFromRow,
    postFromRow,
    commentFromRow,
  });
})();
