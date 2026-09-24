/**
 * Production Cloud Admin boundary.
 *
 * The browser carries only the normal Supabase user session. Every RPC is
 * independently authorized on the server from auth.uid() and app.user_roles.
 * This service intentionally has no LocalStorage provider or fallback path.
 */
(function () {
  const PAGE_SIZE = 25;
  const DEFAULT_QUERY = Object.freeze({ scopeGroup: "community", contentType: "all", status: "all", page: 0, pageSize: PAGE_SIZE });
  const EMPTY_STATE = Object.freeze({
    status: "idle",
    identityId: "",
    context: null,
    stats: null,
    content: Object.freeze([]),
    contentTotal: 0,
    contentQuery: DEFAULT_QUERY,
    contentStatus: "idle",
    contentError: null,
    queue: Object.freeze([]),
    mutationStatus: "idle",
    mutationError: null,
    deleteStatus: "idle",
    deleteImpact: null,
    deleteError: null,
    error: null,
  });

  let state = EMPTY_STATE;
  let loadPromise = null;
  let contentPromise = null;
  let mutationPromise = null;

  function isActive() {
    return window.CommunityDataProvider?.isRemoteRequested?.() === true;
  }

  function currentIdentity() {
    return window.SupabaseAuthProvider?.getCurrentUser?.() || null;
  }

  function publish(nextState) {
    state = Object.freeze(nextState);
    if (typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("echo:cloudadminstate", { detail: { status: state.status } }));
    }
    return state;
  }

  function firstRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data && typeof data === "object" ? data : null;
  }

  function normalizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeStats(row) {
    const source = row || {};
    const group = prefix => Object.freeze({
      postsTotal: normalizeNumber(source[`${prefix}_posts_total`]),
      postsPublished: normalizeNumber(source[`${prefix}_posts_published`]),
      postsPending: normalizeNumber(source[`${prefix}_posts_pending`]),
      postsFlagged: normalizeNumber(source[`${prefix}_posts_flagged`]),
      postsHidden: normalizeNumber(source[`${prefix}_posts_hidden`]),
      postsRejected: normalizeNumber(source[`${prefix}_posts_rejected`]),
      commentsTotal: normalizeNumber(source[`${prefix}_comments_total`]),
      commentsPublished: normalizeNumber(source[`${prefix}_comments_published`]),
      commentsPending: normalizeNumber(source[`${prefix}_comments_pending`]),
      commentsFlagged: normalizeNumber(source[`${prefix}_comments_flagged`]),
      commentsHidden: normalizeNumber(source[`${prefix}_comments_hidden`]),
      commentsRejected: normalizeNumber(source[`${prefix}_comments_rejected`]),
      queueTotal: normalizeNumber(source[`${prefix}_queue_total`]),
    });
    return Object.freeze({
      community: group("community"),
      building: group("building"),
      mapDirectPostsTotal: normalizeNumber(source.map_direct_posts_total),
      postsTotal: normalizeNumber(source.posts_total),
      commentsTotal: normalizeNumber(source.comments_total),
      queueTotal: normalizeNumber(source.queue_total),
      latestContentAt: source.latest_content_at ? String(source.latest_content_at) : null,
    });
  }

  function normalizeContent(row) {
    return Object.freeze({
      contentType: String(row?.content_type || ""),
      contentId: String(row?.content_id || ""),
      postId: String(row?.post_id || ""),
      parentCommentId: row?.parent_comment_id ? String(row.parent_comment_id) : null,
      postType: String(row?.post_type || ""),
      scopeGroup: String(row?.scope_group || (row?.scope_type === "building" ? "building" : "community")),
      scopeType: String(row?.scope_type || ""),
      collegeId: row?.college_id == null ? null : Number(row.college_id),
      jurusanId: row?.jurusan_id == null ? null : Number(row.jurusan_id),
      buildingId: row?.building_id ? String(row.building_id) : null,
      isMapAnchored: row?.is_map_anchored === true,
      anchorLat: row?.anchor_lat == null ? null : Number(row.anchor_lat),
      anchorLng: row?.anchor_lng == null ? null : Number(row.anchor_lng),
      isSeed: row?.is_seed === true,
      mediaCount: normalizeNumber(row?.media_count),
      content: String(row?.content || ""),
      category: String(row?.category || ""),
      authorMode: String(row?.author_mode || "anonymous"),
      authorLabel: row?.author_label ? String(row.author_label) : "",
      moderationStatus: String(row?.moderation_status || ""),
      createdAt: String(row?.created_at || ""),
      updatedAt: row?.updated_at ? String(row.updated_at) : null,
      totalCount: normalizeNumber(row?.total_count),
    });
  }

  function normalizeQuery(query = {}) {
    const scopeGroup = ["community", "building", "all"].includes(query.scopeGroup) ? query.scopeGroup : "community";
    const contentType = ["all", "post", "comment"].includes(query.contentType) ? query.contentType : "all";
    const status = ["all", "published", "pending", "flagged", "hidden", "rejected"].includes(query.status) ? query.status : "all";
    const page = Math.max(0, Math.trunc(Number(query.page) || 0));
    return Object.freeze({ scopeGroup, contentType, status, page, pageSize: PAGE_SIZE });
  }

  function contentParameters(query, queueOnly = false) {
    return {
      p_scope_group: query.scopeGroup,
      p_content_type: query.contentType,
      p_queue_only: queueOnly,
      p_status: query.status === "all" ? null : query.status,
      p_limit: queueOnly ? 100 : query.pageSize,
      p_offset: queueOnly ? 0 : query.page * query.pageSize,
    };
  }

  function normalizeDeleteImpact(row) {
    if (!row) return null;
    return Object.freeze({
      contentType: String(row.content_type || ""),
      contentId: String(row.content_id || ""),
      postId: String(row.post_id || ""),
      scopeGroup: String(row.scope_group || ""),
      scopeType: String(row.scope_type || ""),
      collegeId: row.college_id == null ? null : Number(row.college_id),
      jurusanId: row.jurusan_id == null ? null : Number(row.jurusan_id),
      buildingId: row.building_id ? String(row.building_id) : null,
      isMapAnchored: row.is_map_anchored === true,
      contentExcerpt: String(row.content_excerpt || ""),
      commentsDeleted: normalizeNumber(row.comments_deleted),
      repliesDeleted: normalizeNumber(row.replies_deleted),
      votesDeleted: normalizeNumber(row.votes_deleted),
      mapAnchorsDeleted: normalizeNumber(row.map_anchors_deleted),
      mediaRecords: normalizeNumber(row.media_records),
      deleteBlocked: row.delete_blocked === true,
      blockReason: row.block_reason ? String(row.block_reason) : "",
    });
  }

  function rpcError(result, fallbackMessage) {
    if (!result?.error) return;
    const error = new Error(String(result.error.message || fallbackMessage));
    error.code = String(result.error.code || "");
    error.cause = result.error;
    throw error;
  }

  function publicError(error) {
    const code = String(error?.code || error?.cause?.code || "");
    const denied = code === "42501" || code === "PGRST301" || code === "401" || code === "403";
    const message = denied
      ? "This verified account does not have Cloud Admin permission."
      : String(error?.message || "Cloud Admin data could not be loaded.");
    const result = new Error(message);
    result.code = code;
    return result;
  }

  async function load() {
    if (!isActive()) return state;
    const identity = currentIdentity();
    if (!identity?.id || identity.authIdentityVerified !== true) {
      const error = new Error("A server-verified Supabase session is required for Cloud Admin.");
      error.code = "CLOUD_ADMIN_IDENTITY_UNVERIFIED";
      publish({ ...EMPTY_STATE, status: "error", error });
      throw error;
    }

    if (state.identityId && state.identityId !== String(identity.id)) reset();
    if (loadPromise) return loadPromise;
    if (state.status === "ready" && state.identityId === String(identity.id)) return state;

    const identityId = String(identity.id);
    publish({ ...EMPTY_STATE, status: "loading", identityId });
    loadPromise = (async () => {
      try {
        const client = await window.CommunitySupabaseClient.getClient();
        const contextResult = await client.rpc("admin_get_context");
        rpcError(contextResult, "Cloud Admin permission could not be verified.");
        const contextRow = firstRow(contextResult.data);
        if (!contextRow || String(contextRow.user_id || "") !== identityId) {
          const mismatch = new Error("Cloud Admin identity did not match the verified session.");
          mismatch.code = "CLOUD_ADMIN_IDENTITY_MISMATCH";
          throw mismatch;
        }
        const effectiveRoles = Array.isArray(contextRow.roles) ? contextRow.roles.map(String) : [];
        if (!effectiveRoles.some(role => role === "admin" || role === "moderator")) {
          const denied = new Error("Cloud Admin permission could not be verified.");
          denied.code = "42501";
          throw denied;
        }

        const initialQuery = DEFAULT_QUERY;
        const [statsResult, contentResult, queueResult] = await Promise.all([
          client.rpc("admin_get_managed_content_stats"),
          client.rpc("admin_list_managed_content", contentParameters(initialQuery)),
          client.rpc("admin_list_managed_content", contentParameters({ ...initialQuery, scopeGroup: "all" }, true)),
        ]);
        rpcError(statsResult, "Cloud Admin statistics could not be loaded.");
        rpcError(contentResult, "Cloud Admin Community content could not be loaded.");
        rpcError(queueResult, "Cloud Admin moderation queue could not be loaded.");
        const statsRow = firstRow(statsResult.data);
        if (!statsRow) throw new Error("Cloud Admin statistics returned no authoritative result.");

        if (String(currentIdentity()?.id || "") !== identityId) {
          const changed = new Error("The signed-in account changed while Cloud Admin was loading.");
          changed.code = "CLOUD_ADMIN_IDENTITY_CHANGED";
          throw changed;
        }

        const context = Object.freeze({
          userId: String(contextRow.user_id),
          roles: Object.freeze(effectiveRoles),
        });
        const content = Object.freeze((contentResult.data || []).map(normalizeContent));
        return publish({
          status: "ready",
          identityId,
          context,
          stats: normalizeStats(statsRow),
          content,
          contentTotal: content[0]?.totalCount || 0,
          contentQuery: initialQuery,
          contentStatus: "ready",
          contentError: null,
          queue: Object.freeze((queueResult.data || []).map(normalizeContent)),
          mutationStatus: "idle",
          mutationError: null,
          deleteStatus: "idle",
          deleteImpact: null,
          deleteError: null,
          error: null,
        });
      } catch (error) {
        const safeError = publicError(error);
        publish({ ...EMPTY_STATE, status: "error", identityId, error: safeError });
        throw safeError;
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  }

  async function loadContent(query = state.contentQuery) {
    if (state.status !== "ready") throw new Error("Cloud Admin must finish loading before content can be queried.");
    if (contentPromise) return contentPromise;
    const normalizedQuery = normalizeQuery(query);
    const identityId = state.identityId;
    publish({ ...state, contentStatus: "loading", contentError: null, contentQuery: normalizedQuery });
    contentPromise = (async () => {
      try {
        const client = await window.CommunitySupabaseClient.getClient();
        const result = await client.rpc("admin_list_managed_content", contentParameters(normalizedQuery));
        rpcError(result, "Cloud Admin content could not be loaded.");
        if (String(currentIdentity()?.id || "") !== identityId) throw new Error("The signed-in account changed while Cloud Admin was loading.");
        const content = Object.freeze((result.data || []).map(normalizeContent));
        return publish({
          ...state,
          content,
          contentTotal: content[0]?.totalCount || 0,
          contentQuery: normalizedQuery,
          contentStatus: "ready",
          contentError: null,
        });
      } catch (error) {
        const safeError = publicError(error);
        publish({ ...state, contentStatus: "error", contentError: safeError });
        throw safeError;
      } finally {
        contentPromise = null;
      }
    })();
    return contentPromise;
  }

  async function reloadAfterMutation(query) {
    reset();
    await load();
    if (query.scopeGroup !== "community" || query.contentType !== "all" || query.status !== "all" || query.page !== 0) {
      await loadContent({ ...query, page: 0 });
    }
  }

  async function moderate({ scopeGroup, contentType, contentId, action, reason = null } = {}) {
    if (state.status !== "ready" || !state.context?.roles?.includes("admin")) {
      const denied = new Error("Cloud Admin write permission is required.");
      denied.code = "42501";
      throw denied;
    }
    if (mutationPromise) throw new Error("A moderation action is already in progress.");
    const identityId = state.identityId;
    const refreshQuery = normalizeQuery({ ...state.contentQuery, scopeGroup });
    publish({ ...state, mutationStatus: "loading", mutationError: null });
    mutationPromise = (async () => {
      try {
        const client = await window.CommunitySupabaseClient.getClient();
        const result = await client.rpc("admin_moderate_managed_content", {
          p_scope_group: refreshQuery.scopeGroup,
          p_content_type: String(contentType || ""),
          p_content_id: String(contentId || ""),
          p_action: String(action || ""),
          p_reason: reason == null ? null : String(reason),
        });
        rpcError(result, "Cloud Admin moderation action failed.");
        if (String(currentIdentity()?.id || "") !== identityId) throw new Error("The signed-in account changed during moderation.");
        const mutation = firstRow(result.data);
        await reloadAfterMutation(refreshQuery);
        return mutation;
      } catch (error) {
        const safeError = publicError(error);
        publish({ ...state, mutationStatus: "error", mutationError: safeError });
        throw safeError;
      } finally {
        mutationPromise = null;
      }
    })();
    return mutationPromise;
  }

  async function loadDeleteImpact({ scopeGroup, contentType, contentId } = {}) {
    if (state.status !== "ready" || !state.context?.roles?.includes("admin")) {
      const denied = new Error("Cloud Admin write permission is required.");
      denied.code = "42501";
      throw denied;
    }
    publish({ ...state, deleteStatus: "loading", deleteImpact: null, deleteError: null });
    try {
      const client = await window.CommunitySupabaseClient.getClient();
      const result = await client.rpc("admin_get_delete_impact", {
        p_scope_group: String(scopeGroup || ""),
        p_content_type: String(contentType || ""),
        p_content_id: String(contentId || ""),
      });
      rpcError(result, "Delete impact could not be loaded.");
      const impact = normalizeDeleteImpact(firstRow(result.data));
      if (!impact) throw new Error("Delete impact returned no authoritative result.");
      publish({ ...state, deleteStatus: "ready", deleteImpact: impact, deleteError: null });
      return impact;
    } catch (error) {
      const safeError = publicError(error);
      publish({ ...state, deleteStatus: "error", deleteImpact: null, deleteError: safeError });
      throw safeError;
    }
  }

  function clearDeleteImpact() {
    publish({ ...state, deleteStatus: "idle", deleteImpact: null, deleteError: null });
  }

  async function permanentlyDelete({ scopeGroup, contentType, contentId, reason } = {}) {
    if (state.status !== "ready" || !state.context?.roles?.includes("admin")) {
      const denied = new Error("Cloud Admin write permission is required.");
      denied.code = "42501";
      throw denied;
    }
    if (mutationPromise) throw new Error("A moderation action is already in progress.");
    const identityId = state.identityId;
    const refreshQuery = normalizeQuery({ ...state.contentQuery, scopeGroup });
    publish({ ...state, mutationStatus: "loading", mutationError: null });
    mutationPromise = (async () => {
      try {
        const client = await window.CommunitySupabaseClient.getClient();
        const result = await client.rpc("admin_permanently_delete_content", {
          p_scope_group: refreshQuery.scopeGroup,
          p_content_type: String(contentType || ""),
          p_content_id: String(contentId || ""),
          p_reason: String(reason || ""),
        });
        rpcError(result, "Permanent deletion failed.");
        if (String(currentIdentity()?.id || "") !== identityId) throw new Error("The signed-in account changed during deletion.");
        const mutation = firstRow(result.data);
        window.CommunityDataProvider?.invalidateDeletedContent?.(mutation || {});
        await reloadAfterMutation(refreshQuery);
        return mutation;
      } catch (error) {
        const safeError = publicError(error);
        publish({ ...state, mutationStatus: "error", mutationError: safeError });
        throw safeError;
      } finally {
        mutationPromise = null;
      }
    })();
    return mutationPromise;
  }

  function reset() {
    loadPromise = null;
    contentPromise = null;
    mutationPromise = null;
    state = EMPTY_STATE;
  }

  function retry() {
    reset();
    return load();
  }

  window.addEventListener?.("echo:communityauthchange", reset);

  window.CloudAdminService = Object.freeze({
    provider: "supabase-server-authorized",
    PAGE_SIZE,
    isActive,
    load,
    retry,
    loadContent,
    moderate,
    loadDeleteImpact,
    clearDeleteImpact,
    permanentlyDelete,
    reset,
    getState: () => state,
  });
})();
