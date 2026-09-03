/** Community + Building + Map repositories. Supabase/PostgREST details terminate here. */
(function () {
  const postCache = new Map();
  const postUiIndex = new Map();
  const commentCache = new Map();
  const commentLoaded = new Set();
  const voteState = new Map();
  const inFlight = new Set();
  // BACKEND V2.3: Building post cache, keyed by "<collegeId>:<buildingId>"
  // (an internal cache key only — never parsed/exposed outside this file;
  // callers always pass collegeId/buildingId as plain arguments, never a
  // serialized string, so there is nothing to keep in sync elsewhere).
  const buildingPostCache = new Map();
  // Map anchor-backed post cache, keyed by collegeId (a Map view is
  // college-wide, not building-specific).
  const mapAnchorCache = new Map();

  function buildingCacheKey(collegeId, buildingId) {
    return `${Number(collegeId)}:${String(buildingId || "")}`;
  }

  function registerUiIndex(post) {
    const uiKey = String(post.id);
    const existing = postUiIndex.get(uiKey);
    if (existing && existing.remoteId !== post.remoteId) {
      throw new Error("Community remote identity collision was blocked.");
    }
    postUiIndex.set(uiKey, post);
  }

  function friendlyError(error, fallback) {
    const code = String(error?.code || "");
    if (code === "COMMUNITY_STAGING_NOT_CONFIGURED") return error;
    if (code === "42501" || Number(error?.status) === 401 || Number(error?.status) === 403) return new Error("Please sign in with an active Community account to continue.");
    if (["22023", "23514"].includes(code)) return new Error("Please check the information you entered and try again.");
    if (code === "23503") return new Error("This Community item is no longer available.");
    if (code === "23505") return new Error("That action has already been completed.");
    return new Error(fallback || "Community is temporarily unavailable. Please try again later.");
  }

  async function once(key, action) {
    if (inFlight.has(key)) throw new Error("That action is already being sent.");
    inFlight.add(key);
    try { return await action(); }
    finally { inFlight.delete(key); }
  }

  function parseScopeKey(key) {
    const parsed = window.CommunityService.parseCommunityKey(key);
    if (!parsed) throw new Error("Choose a valid Community.");
    return parsed;
  }

  function rpcScope(scope) {
    return scope.scope === "global" ? "all_km" : scope.scope;
  }

  async function listPosts(communityKey) {
    const scope = parseScopeKey(communityKey);
    const client = await window.CommunitySupabaseClient.getClient();
    let query = client.from("posts_public").select("*").eq("scope_type", rpcScope(scope));
    if (scope.scope !== "global") query = query.eq("college_id", scope.orgId);
    if (scope.scope === "jurusan") query = query.eq("jurusan_id", scope.majorId);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
    if (error) throw friendlyError(error, "Community posts could not be loaded.");
    const posts = (data || []).map(row => {
      const post = window.CommunityRowAdapter.postFromRow(row);
      return Object.freeze({ ...post, userVote: voteState.get(post.remoteId) || null });
    });
    posts.forEach(registerUiIndex);
    postCache.set(communityKey, Object.freeze(posts));
    return posts;
  }

  // BACKEND V2.3: dispatches the correct authoritative refetch for a post
  // that was already found (setQuestionStatus/castVote act on an existing
  // post object, not a known scope key) — Community posts refetch by
  // communityKey exactly as before; Building posts refetch by the
  // college_id/building_id already carried on the post (scopeFromRow sets
  // orgId=college_id, placeId=building_id for scope_type='building').
  function refetchForPost(post) {
    if (post.contextType === "building") return listBuildingPosts(post.orgId, post.placeId);
    return listPosts(post.communityKey);
  }

  async function createPost(input) {
    if (input.imageDataUrl || input.imageUrl || input.photo) throw new Error("Photo posting is not available in Community staging yet. Remove the photo to continue.");
    const scope = parseScopeKey(input.communityKey);
    return once("create-post", async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc("create_post", {
        p_post_type: input.postType === "question" ? "question" : "discussion",
        p_scope_type: rpcScope(scope), p_content: String(input.content || ""),
        p_category: String(input.category || ""), p_shape: String(input.shape || ""),
        p_color: String(input.color || ""), p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous",
        p_college_id: scope.scope === "global" ? null : scope.orgId,
        p_jurusan_id: scope.scope === "jurusan" ? scope.majorId : null,
        p_building_id: null, p_rotation: Number(input.rotation || 0),
        p_position_x: Number(input.positionX || 10), p_position_y: Number(input.positionY || 15),
      });
      if (error) throw friendlyError(error, "Your note could not be published.");
      await listPosts(input.communityKey);
    });
  }

  // BACKEND V2.3 — Building Wall read/create. Reuses api.create_post exactly
  // as Community does (same RPC, scope_type="building"), never a direct
  // INSERT into app.posts. building_id is passed through verbatim (already
  // the canonical DB key, e.g. "B_PUSTAKA" — see services/community-service.js
  // header comment on why no conversion helper exists).
  async function listBuildingPosts(collegeId, buildingId) {
    const client = await window.CommunitySupabaseClient.getClient();
    const canonicalCollegeId = Number(collegeId);
    const canonicalBuildingId = String(buildingId || "");
    const { data, error } = await client.from("posts_public").select("*")
      .eq("scope_type", "building")
      .eq("college_id", canonicalCollegeId)
      .eq("building_id", canonicalBuildingId)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
    if (error) throw friendlyError(error, "Building Wall posts could not be loaded.");
    const posts = (data || []).map(row => {
      const post = window.CommunityRowAdapter.postFromRow(row);
      return Object.freeze({ ...post, userVote: voteState.get(post.remoteId) || null });
    });
    posts.forEach(registerUiIndex);
    buildingPostCache.set(buildingCacheKey(canonicalCollegeId, canonicalBuildingId), Object.freeze(posts));
    return posts;
  }

  async function createBuildingPost(input) {
    if (input.imageDataUrl || input.imageUrl || input.photo) throw new Error("Photo posting is not available in Community staging yet. Remove the photo to continue.");
    const collegeId = Number(input.collegeId);
    const buildingId = String(input.buildingId || "");
    return once(`create-building-post:${collegeId}:${buildingId}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc("create_post", {
        p_post_type: input.postType === "question" ? "question" : "discussion",
        p_scope_type: "building", p_content: String(input.content || ""),
        p_category: String(input.category || ""), p_shape: String(input.shape || ""),
        p_color: String(input.color || ""), p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous",
        p_college_id: collegeId, p_jurusan_id: null,
        p_building_id: buildingId, p_rotation: Number(input.rotation || 0),
        p_position_x: Number(input.positionX || 10), p_position_y: Number(input.positionY || 15),
      });
      if (error) throw friendlyError(error, "Your note could not be published.");
      await listBuildingPosts(collegeId, buildingId);
    });
  }

  // BACKEND V2.3 — Map Post Directly. Calls api.create_map_post exactly
  // once: that RPC is a single atomic PL/pgSQL transaction that inserts
  // BOTH the canonical app.posts row (scope_type="building") and its
  // app.post_map_anchors row (same post_id) and derives college_id itself
  // from app.building_scope_keys — there is deliberately no second
  // create_post call and no manual anchor insert here, so there is only
  // ever one canonical post/UUID for a Map-created note.
  async function createMapPost(input) {
    if (input.imageDataUrl || input.imageUrl || input.photo) throw new Error("Photo posting is not available in Community staging yet. Remove the photo to continue.");
    const buildingId = String(input.buildingId || "");
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    return once(`create-map-post:${buildingId}:${lat}:${lng}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { data, error } = await client.rpc("create_map_post", {
        p_post_type: input.postType === "question" ? "question" : "discussion",
        p_building_id: buildingId,
        p_lat: lat,
        p_lng: lng,
        p_content: String(input.content || ""),
        p_category: String(input.category || ""),
        p_shape: String(input.shape || ""),
        p_color: String(input.color || ""),
        p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous",
      });
      if (error) throw friendlyError(error, "Your map note could not be published.");
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw friendlyError(null, "Your map note could not be published.");
      const post = window.CommunityRowAdapter.postFromRow(row);
      const frozenPost = Object.freeze({ ...post, userVote: voteState.get(post.remoteId) || null });
      registerUiIndex(frozenPost);
      // Refresh whichever authoritative caches this post can now appear in
      // — the Building Wall for its own building, and the Map anchor list
      // for its college — so both views are correct on the acting device's
      // very next read, without waiting on Realtime.
      await Promise.all([
        listBuildingPosts(frozenPost.orgId, frozenPost.placeId).catch(() => {}),
        listMapAnchors(frozenPost.orgId).catch(() => {}),
      ]);
      return frozenPost;
    });
  }

  // BACKEND V2.3 — Map public read. Composes the two existing sanitized
  // public sources (api.post_map_anchors_public for lat/lng,
  // api.posts_public for content) in this repository layer rather than
  // exposing raw app tables or a new redundant public view — this mirrors
  // the same "signal is an invalidation hint, always refetch via the
  // sanitized read path" principle Realtime already uses.
  async function listMapAnchors(collegeId) {
    const canonicalCollegeId = Number(collegeId);
    const client = await window.CommunitySupabaseClient.getClient();
    const { data: anchors, error: anchorError } = await client.from("post_map_anchors_public").select("*").eq("college_id", canonicalCollegeId);
    if (anchorError) throw friendlyError(anchorError, "Map notes could not be loaded.");
    const postIds = (anchors || []).map(anchor => anchor.post_id);
    if (!postIds.length) {
      mapAnchorCache.set(canonicalCollegeId, Object.freeze([]));
      return [];
    }
    const { data: posts, error: postError } = await client.from("posts_public").select("*").in("id", postIds);
    if (postError) throw friendlyError(postError, "Map notes could not be loaded.");
    const postById = new Map((posts || []).map(row => [row.id, row]));
    const records = (anchors || [])
      .map(anchor => {
        const row = postById.get(anchor.post_id);
        if (!row) return null; // post is no longer published; the anchor's own RLS already hides this case in practice
        const post = window.CommunityRowAdapter.postFromRow(row);
        return Object.freeze({
          ...post,
          userVote: voteState.get(post.remoteId) || null,
          lat: Number(anchor.lat),
          lng: Number(anchor.lng),
        });
      })
      .filter(Boolean);
    records.forEach(registerUiIndex);
    mapAnchorCache.set(canonicalCollegeId, Object.freeze(records));
    return records;
  }

  function findPost(clientId) {
    return postUiIndex.get(String(clientId)) || null;
  }

  async function setQuestionStatus(post, status) {
    return once(`question:${post.remoteId}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc(status === "solved" ? "solve_question" : "reopen_question", { p_post_id: post.remoteId });
      if (error) throw friendlyError(error, "The question status could not be changed.");
      await refetchForPost(post);
    });
  }

  async function listComments(post) {
    const client = await window.CommunitySupabaseClient.getClient();
    const { data, error } = await client.from("comments_public").select("*").eq("post_id", post.remoteId).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (error) throw friendlyError(error, "Comments could not be loaded.");
    const comments = (data || []).map(row => window.CommunityRowAdapter.commentFromRow(row, post));
    commentCache.set(post.remoteId, Object.freeze(comments));
    commentLoaded.add(post.remoteId);
    return comments;
  }

  async function createComment(post, input) {
    const parent = input.parentCommentId ? getComments(post).find(item => Number(item.id) === Number(input.parentCommentId)) : null;
    const operation = parent ? "create_reply" : "create_comment";
    const parameters = parent
      ? { p_parent_comment_id: parent.remoteId, p_content: input.content, p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous" }
      : { p_post_id: post.remoteId, p_content: input.content, p_display_author_mode: input.isAnonymous === false ? "named" : "anonymous" };
    return once(`comment:${post.remoteId}:${parent?.remoteId || "root"}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { error } = await client.rpc(operation, parameters);
      if (error) throw friendlyError(error, "Your comment could not be published.");
      await listComments(post);
    });
  }

  function getComments(post) { return commentCache.get(post?.remoteId) || []; }
  function hasCommentsLoaded(post) { return commentLoaded.has(post?.remoteId); }

  async function castVote(post, value) {
    return once(`vote:${post.remoteId}`, async () => {
      const client = await window.CommunitySupabaseClient.getClient();
      const { data, error } = await client.rpc("cast_vote", { p_post_id: post.remoteId, p_value: value });
      if (error) throw friendlyError(error, "Your vote could not be saved.");
      const result = Array.isArray(data) ? data[0] : data;
      const currentVote = Number(result?.current_vote);
      voteState.set(post.remoteId, currentVote === 1 ? "up" : (currentVote === -1 ? "down" : null));
      await refetchForPost(post);
      return result;
    });
  }

  window.CommunitySupabaseRepositories = Object.freeze({
    posts: Object.freeze({
      list: listPosts, cached: key => postCache.get(key) || [], find: findPost, create: createPost, setQuestionStatus,
      // BACKEND V2.3
      listBuilding: listBuildingPosts,
      cachedBuilding: (collegeId, buildingId) => buildingPostCache.get(buildingCacheKey(collegeId, buildingId)) || [],
      createBuilding: createBuildingPost,
    }),
    comments: Object.freeze({ list: listComments, cached: getComments, isLoaded: hasCommentsLoaded, create: createComment }),
    votes: Object.freeze({ cast: castVote }),
    // BACKEND V2.3 — Map Post Directly
    mapAnchors: Object.freeze({
      list: listMapAnchors,
      cached: collegeId => mapAnchorCache.get(Number(collegeId)) || [],
      create: createMapPost,
    }),
    friendlyError,
  });
})();
